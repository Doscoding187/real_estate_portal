import { z } from 'zod';
import {
  router,
  superAdminProcedure,
  agencyAdminProcedure,
  publicProcedure,
  protectedProcedure,
} from './_core/trpc';
import { agencies, users, plans, agencyBranding, invitations } from '../drizzle/schema';
import { eq, like, or, desc, and } from 'drizzle-orm';
import {
  getDb,
  getAgencyDashboardStats,
  getAgencyPerformanceData,
  getAgencyRecentLeads,
  getAgencyRecentListings,
  getAgencyAgents,
  getLeadConversionStats,
  getAgencyCommissionStats,
  getAgentPerformanceLeaderboard,
} from './db';
import { logAudit } from './_core/auditLog';

/**
 * Agency Router - Manages real estate agencies
 * Super admins can create and manage all agencies
 * Agency admins can only view/update their own agency
 */

// Validation schemas
const createAgencySchema = z.object({
  name: z.string().min(2, 'Agency name must be at least 2 characters'),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  logo: z.string().url().optional(),
  website: z.string().url().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
});

const updateAgencySchema = createAgencySchema.partial().extend({
  id: z.number(),
});

const agencyFiltersSchema = z.object({
  search: z.string().optional(),
  province: z.string().optional(),
  subscriptionPlan: z.enum(['free', 'basic', 'premium', 'enterprise']).optional(),
  isVerified: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export const agencyRouter = router({
  /**
   * Create agency during onboarding (authenticated users only)
   */
  createOnboarding: protectedProcedure
    .input(
      z.object({
        basicInfo: z.object({
          name: z.string().min(2, 'Agency name must be at least 2 characters'),
          description: z.string().min(10, 'Description must be at least 10 characters'),
          email: z.string().email('Invalid email address'),
          phone: z.string().optional(),
          website: z.string().url().optional().or(z.literal('')),
          address: z.string().min(5, 'Address must be at least 5 characters'),
          city: z.string().min(2, 'City is required'),
          province: z.string().min(2, 'Province is required'),
        }),
        branding: z.object({
          logoUrl: z.string().optional(),
          primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
          secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
          tagline: z.string().max(100, 'Tagline must be less than 100 characters').optional(),
          companyName: z.string().min(2, 'Company name is required'),
        }),
        teamEmails: z.array(z.string().email()).optional().default([]),
        planId: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // 1. Validate plan exists and is active
      const [plan] = await db.select().from(plans).where(eq(plans.id, input.planId)).limit(1);

      if (!plan || !plan.isActive) {
        throw new Error('Selected plan is not available');
      }

      // 2. Check if agency name or email already exists
      const existing = await db
        .select()
        .from(agencies)
        .where(
          or(eq(agencies.name, input.basicInfo.name), eq(agencies.email, input.basicInfo.email)),
        )
        .limit(1);

      if (existing.length > 0) {
        throw new Error('Agency name or email already registered');
      }

      // 3. Generate slug from name
      const slug = input.basicInfo.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Check slug uniqueness
      const [slugExists] = await db.select().from(agencies).where(eq(agencies.slug, slug)).limit(1);
      const finalSlug = slugExists ? `${slug}-${Date.now()}` : slug;

      // 4. Create agency with pending_payment status
      const [agencyResult] = await db.insert(agencies).values({
        name: input.basicInfo.name,
        slug: finalSlug,
        description: input.basicInfo.description,
        email: input.basicInfo.email,
        phone: input.basicInfo.phone || null,
        website: input.basicInfo.website || null,
        address: input.basicInfo.address,
        city: input.basicInfo.city,
        province: input.basicInfo.province,
        logo: input.branding.logoUrl || null,
        subscriptionPlan: 'free',
        subscriptionStatus: 'pending_payment', // Will be updated to 'active' after payment
        isVerified: 0,
      });

      const agencyId = Number(agencyResult.insertId);

      // 5. Create agency branding record
      await db.insert(agencyBranding).values({
        agencyId,
        primaryColor: input.branding.primaryColor,
        secondaryColor: input.branding.secondaryColor,
        companyName: input.branding.companyName,
        tagline: input.branding.tagline || null,
        logoUrl: input.branding.logoUrl || null,
        isEnabled: 1,
      });

      // 6. Update user to be agency_admin of this agency
      await db
        .update(users)
        .set({
          agencyId,
          role: 'agency_admin',
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id));

      // 7. Store team invitations (will be sent after payment)
      if (input.teamEmails && input.teamEmails.length > 0) {
        const invitationValues = input.teamEmails.map(email => ({
          agencyId,
          email,
          invitedBy: ctx.user.id,
          role: 'agent',
          token: `invite-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          status: 'pending' as const,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        }));

        await db.insert(invitations).values(invitationValues);
      }

      // 8. Audit log
      await logAudit({
        userId: ctx.user.id,
        action: 'agency.create_onboarding',
        targetType: 'agency',
        targetId: agencyId,
        metadata: { planId: input.planId },
        req: ctx.req,
      });

      return { agencyId, slug: finalSlug };
    }),

  /**
  /**
   * Create a new agency (Super Admin only)
   */
  create: superAdminProcedure.input(createAgencySchema).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    // Check if slug already exists
    const existing = await db.select().from(agencies).where(eq(agencies.slug, input.slug)).limit(1);
    if (existing.length > 0) {
      throw new Error('An agency with this slug already exists');
    }

    // Create agency
    const [result] = await db.insert(agencies).values({
      name: input.name,
      slug: input.slug,
      description: input.description || null,
      logo: input.logo || null,
      website: input.website || null,
      email: input.email || null,
      phone: input.phone || null,
      address: input.address || null,
      city: input.city || null,
      province: input.province || null,
      subscriptionPlan: 'free',
      subscriptionStatus: 'trial',
      isVerified: 0,
    });

    // Audit log
    await logAudit({
      userId: ctx.user.id,
      action: 'agency.create',
      targetType: 'agency',
      targetId: Number(result.insertId),
      req: ctx.req,
    });

    // Fetch and return the created agency
    const [agency] = await db
      .select()
      .from(agencies)
      .where(eq(agencies.id, Number(result.insertId)));
    return agency;
  }),

  /**
   * Get all agencies with filters (Super Admin only)
   */
  list: superAdminProcedure.input(agencyFiltersSchema).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    let query = db.select().from(agencies);

    // Apply filters
    const conditions = [];

    if (input.search) {
      conditions.push(
        or(
          like(agencies.name, `%${input.search}%`),
          like(agencies.email, `%${input.search}%`),
          like(agencies.city, `%${input.search}%`),
        ),
      );
    }

    if (input.province) {
      conditions.push(eq(agencies.province, input.province));
    }

    if (input.subscriptionPlan) {
      conditions.push(eq(agencies.subscriptionPlan, input.subscriptionPlan));
    }

    if (input.isVerified !== undefined) {
      conditions.push(eq(agencies.isVerified, input.isVerified ? 1 : 0));
    }

    if (conditions.length > 0) {
      query = query.where(or(...conditions));
    }

    const results = await query
      .orderBy(desc(agencies.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    // Get total count
    const [{ count }] = await db.select({ count: agencies.id }).from(agencies);

    return {
      agencies: results,
      total: Number(count) || 0,
      limit: input.limit,
      offset: input.offset,
    };
  }),

  /**
   * Get agency by ID (Public - for display)
   */
  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const [agency] = await db.select().from(agencies).where(eq(agencies.id, input.id)).limit(1);

    if (!agency) {
      throw new Error('Agency not found');
    }

    return agency;
  }),

  /**
   * Get agency by slug (Public - for display)
   */
  getBySlug: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const [agency] = await db.select().from(agencies).where(eq(agencies.slug, input.slug)).limit(1);

    if (!agency) {
      throw new Error('Agency not found');
    }

    return agency;
  }),

  /**
   * Update agency (Super Admin or Agency Admin for their own agency)
   */
  update: agencyAdminProcedure.input(updateAgencySchema).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const { id, ...updateData } = input;

    // Get the agency
    const [agency] = await db.select().from(agencies).where(eq(agencies.id, id)).limit(1);
    if (!agency) {
      throw new Error('Agency not found');
    }

    // Authorization check: super_admin can update any, agency_admin only their own
    if (ctx.user.role !== 'super_admin') {
      if (!ctx.user.agencyId || ctx.user.agencyId !== id) {
        throw new Error('You can only update your own agency');
      }
    }

    // Update agency
    await db
      .update(agencies)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(agencies.id, id));

    // Audit log
    await logAudit({
      userId: ctx.user.id,
      action: 'agency.update',
      targetType: 'agency',
      targetId: id,
      req: ctx.req,
    });

    // Return updated agency
    const [updated] = await db.select().from(agencies).where(eq(agencies.id, id));
    return updated;
  }),

  /**
   * Delete agency (Super Admin only)
   */
  delete: superAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // Check if agency exists
      const [agency] = await db.select().from(agencies).where(eq(agencies.id, input.id)).limit(1);
      if (!agency) {
        throw new Error('Agency not found');
      }

      // Delete agency (cascade will handle related records)
      await db.delete(agencies).where(eq(agencies.id, input.id));

      // Audit log
      await logAudit({
        userId: ctx.user.id,
        action: 'agency.delete',
        targetType: 'agency',
        targetId: input.id,
        req: ctx.req,
      });

      return { success: true };
    }),

  /**
   * Verify agency (Super Admin only)
   */
  verify: superAdminProcedure
    .input(z.object({ id: z.number(), isVerified: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      await db
        .update(agencies)
        .set({
          isVerified: input.isVerified ? 1 : 0,
          updatedAt: new Date(),
        })
        .where(eq(agencies.id, input.id));

      // Audit log
      await logAudit({
        userId: ctx.user.id,
        action: input.isVerified ? 'agency.verify' : 'agency.unverify',
        targetType: 'agency',
        targetId: input.id,
        req: ctx.req,
      });

      const [updated] = await db.select().from(agencies).where(eq(agencies.id, input.id));
      return updated;
    }),

  /**
   * Get agency dashboard statistics
   */
  getDashboardStats: agencyAdminProcedure.query(async ({ ctx }) => {
    if (!ctx.user.agencyId) {
      throw new Error('You must be part of an agency');
    }
    return await getAgencyDashboardStats(ctx.user.agencyId);
  }),

  /**
   * Get agency performance data for charts
   */
  getPerformanceData: agencyAdminProcedure
    .input(z.object({ months: z.number().default(6) }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user.agencyId) {
        throw new Error('You must be part of an agency');
      }
      return await getAgencyPerformanceData(ctx.user.agencyId, input?.months || 6);
    }),

  /**
   * Get recent leads for agency dashboard
   */
  getRecentLeads: agencyAdminProcedure
    .input(z.object({ limit: z.number().default(5) }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user.agencyId) {
        throw new Error('You must be part of an agency');
      }
      return await getAgencyRecentLeads(ctx.user.agencyId, input?.limit || 5);
    }),

  /**
   * Get recent listings for agency dashboard
   */
  getRecentListings: agencyAdminProcedure
    .input(z.object({ limit: z.number().default(5) }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user.agencyId) {
        throw new Error('You must be part of an agency');
      }
      return await getAgencyRecentListings(ctx.user.agencyId, input?.limit || 5);
    }),

  /**
   * Get all agents in the agency (for management)
   */
  listAgents: agencyAdminProcedure.query(async ({ ctx }) => {
    if (!ctx.user.agencyId) {
      throw new Error('You must be part of an agency');
    }
    return await getAgencyAgents(ctx.user.agencyId);
  }),

  /**
   * Update agent role within agency
   */
  updateAgentRole: agencyAdminProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(['agent', 'agency_admin']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // Verify the user is in the same agency
      const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!user || user.agencyId !== ctx.user.agencyId) {
        throw new Error('User not found in your agency');
      }

      // Prevent changing your own role if you're the last admin
      if (user.id === ctx.user.id && input.role !== 'agency_admin') {
        const agencyAdmins = await db
          .select()
          .from(users)
          .where(and(eq(users.agencyId, ctx.user.agencyId!), eq(users.role, 'agency_admin')));
        if (agencyAdmins.length === 1) {
          throw new Error('Cannot demote the last agency admin');
        }
      }

      await db
        .update(users)
        .set({
          role: input.role,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.userId));

      await logAudit({
        userId: ctx.user.id,
        action: 'agency.agent_role_update',
        targetType: 'user',
        targetId: input.userId,
        metadata: { newRole: input.role },
        req: ctx.req,
      });

      return { success: true };
    }),

  /**
   * Remove agent from agency
   */
  removeAgent: agencyAdminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // Verify the user is in the same agency
      const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!user || user.agencyId !== ctx.user.agencyId) {
        throw new Error('User not found in your agency');
      }

      // Prevent removing yourself
      if (user.id === ctx.user.id) {
        throw new Error('Cannot remove yourself from the agency');
      }

      // Remove agency association
      await db
        .update(users)
        .set({
          agencyId: null,
          isSubaccount: 0,
          role: 'visitor', // Reset to default role
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.userId));

      await logAudit({
        userId: ctx.user.id,
        action: 'agency.agent_removed',
        targetType: 'user',
        targetId: input.userId,
        req: ctx.req,
      });

      return { success: true };
    }),

  /**
   * Get lead conversion statistics
   */
  getLeadConversionStats: agencyAdminProcedure
    .input(z.object({ months: z.number().default(6) }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user.agencyId) {
        throw new Error('You must be part of an agency');
      }
      return await getLeadConversionStats(ctx.user.agencyId, input?.months || 6);
    }),

  /**
   * Get commission and earnings statistics
   */
  getCommissionStats: agencyAdminProcedure
    .input(z.object({ months: z.number().default(6) }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user.agencyId) {
        throw new Error('You must be part of an agency');
      }
      return await getAgencyCommissionStats(ctx.user.agencyId, input?.months || 6);
    }),

  /**
   * Get agent performance leaderboard
   */
  getAgentLeaderboard: agencyAdminProcedure
    .input(z.object({ months: z.number().default(3) }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user.agencyId) {
        throw new Error('You must be part of an agency');
      }
      return await getAgentPerformanceLeaderboard(ctx.user.agencyId, input?.months || 3);
    }),
});
