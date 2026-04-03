import { z } from 'zod';
import { protectedProcedure, router, superAdminProcedure } from './_core/trpc';
import { userOnboardingState, users } from '../drizzle/schema';
import { eq, like, or, desc, and, isNull } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { getDb } from './db';
import { logAudit } from './_core/auditLog';

/**
 * User Management Router - Super Admin only
 * Manages users, roles, and agency assignments
 */

// Validation schemas
const userFiltersSchema = z.object({
  search: z.string().optional(),
  role: z
    .enum([
      'visitor',
      'agent',
      'agency_admin',
      'property_developer',
      'service_provider',
      'super_admin',
    ])
    .optional(),
  agencyId: z.number().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const updateUserRoleSchema = z.object({
  userId: z.number(),
  role: z.enum([
    'visitor',
    'agent',
    'agency_admin',
    'property_developer',
    'service_provider',
    'super_admin',
  ]),
});

const assignToAgencySchema = z.object({
  userId: z.number(),
  agencyId: z.number().nullable(),
  isSubaccount: z.boolean().default(false),
});

const consumerIntentSchema = z.enum(['buyer', 'seller', 'both']);

const sellerPlanningInputsSchema = z.object({
  goal: z.enum(['upgrade', 'downsize', 'sell_investment', 'test_market', 'relocating']).optional(),
  timeline: z.enum(['0_30_days', '1_3_months', '3_6_months', '6_months_plus']).optional(),
  readiness: z.enum(['needs_work', 'good_condition', 'launch_ready']).optional(),
});

const consumerDashboardPreferencesSchema = z.object({
  intent: consumerIntentSchema.default('buyer'),
});

const updateConsumerDashboardStateSchema = z.object({
  preferences: consumerDashboardPreferencesSchema.optional(),
  sellerPlanning: sellerPlanningInputsSchema.optional(),
});

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return null;
}

export const userRouter = router({
  getConsumerDashboardState: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const userId = Number(ctx.user.id);
    let [state] = await db
      .select()
      .from(userOnboardingState)
      .where(eq(userOnboardingState.userId, userId))
      .limit(1);

    if (!state) {
      await db.insert(userOnboardingState).values({
        userId,
        isFirstSession: 1,
        welcomeOverlayShown: 0,
        welcomeOverlayDismissed: 0,
        suggestedTopics: [],
        tooltipsShown: [],
        contentViewCount: 0,
        saveCount: 0,
        partnerEngagementCount: 0,
        featuresUnlocked: [],
        consumerDashboardPreferences: { intent: 'buyer' },
        sellerPlanningInputs: null,
      });

      [state] = await db
        .select()
        .from(userOnboardingState)
        .where(eq(userOnboardingState.userId, userId))
        .limit(1);
    }

    const preferences = consumerDashboardPreferencesSchema.parse(
      parseJsonRecord(state?.consumerDashboardPreferences) || { intent: 'buyer' },
    );
    const sellerPlanning = sellerPlanningInputsSchema
      .partial()
      .parse(parseJsonRecord(state?.sellerPlanningInputs) || {});

    return {
      preferences,
      sellerPlanning,
      updatedAt: state?.updatedAt || null,
    };
  }),

  updateConsumerDashboardState: protectedProcedure
    .input(updateConsumerDashboardStateSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      const userId = Number(ctx.user.id);
      let [state] = await db
        .select()
        .from(userOnboardingState)
        .where(eq(userOnboardingState.userId, userId))
        .limit(1);

      if (!state) {
        await db.insert(userOnboardingState).values({
          userId,
          isFirstSession: 1,
          welcomeOverlayShown: 0,
          welcomeOverlayDismissed: 0,
          suggestedTopics: [],
          tooltipsShown: [],
          contentViewCount: 0,
          saveCount: 0,
          partnerEngagementCount: 0,
          featuresUnlocked: [],
          consumerDashboardPreferences: { intent: 'buyer' },
          sellerPlanningInputs: null,
        });

        [state] = await db
          .select()
          .from(userOnboardingState)
          .where(eq(userOnboardingState.userId, userId))
          .limit(1);
      }

      const currentPreferences = consumerDashboardPreferencesSchema.parse(
        parseJsonRecord(state?.consumerDashboardPreferences) || { intent: 'buyer' },
      );
      const currentSellerPlanning = sellerPlanningInputsSchema
        .partial()
        .parse(parseJsonRecord(state?.sellerPlanningInputs) || {});

      const nextPreferences = input.preferences
        ? { ...currentPreferences, ...input.preferences }
        : currentPreferences;
      const nextSellerPlanning = input.sellerPlanning
        ? { ...currentSellerPlanning, ...input.sellerPlanning }
        : currentSellerPlanning;

      await db
        .update(userOnboardingState)
        .set({
          consumerDashboardPreferences: nextPreferences,
          sellerPlanningInputs:
            Object.keys(nextSellerPlanning).length > 0 ? nextSellerPlanning : null,
        })
        .where(eq(userOnboardingState.userId, userId));

      return {
        preferences: nextPreferences,
        sellerPlanning: nextSellerPlanning,
      };
    }),

  /**
   * Get all users with filters (Super Admin only)
   */
  list: superAdminProcedure.input(userFiltersSchema).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    let query = db.select().from(users);

    // Apply filters
    const conditions: SQL[] = [];

    const search = input.search?.trim();
    if (search) {
      conditions.push(
        or(
          like(users.email, `%${search}%`),
          like(users.name, `%${search}%`),
          like(users.firstName, `%${search}%`),
          like(users.lastName, `%${search}%`),
        )!,
      );
    }

    if (input.role) {
      conditions.push(eq(users.role, input.role));
    }

    if (input.agencyId !== undefined) {
      if (input.agencyId === null) {
        conditions.push(isNull(users.agencyId));
      } else {
        conditions.push(eq(users.agencyId, input.agencyId));
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(users.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    // Get total count for pagination
    const allUsers = await db.select().from(users);
    const total = allUsers.length;

    return {
      users: results,
      total,
      limit: input.limit,
      offset: input.offset,
    };
  }),

  /**
   * Get user by ID (Super Admin only)
   */
  getById: superAdminProcedure.input(z.object({ userId: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }),

  /**
   * Update user role (Super Admin only)
   */
  updateRole: superAdminProcedure.input(updateUserRoleSchema).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    // Get the user
    const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    // Prevent demoting the last super admin
    if (user.role === 'super_admin' && input.role !== 'super_admin') {
      const superAdmins = await db.select().from(users).where(eq(users.role, 'super_admin'));

      if (superAdmins.length === 1) {
        throw new Error('Cannot demote the last super admin');
      }
    }

    // Update role
    await db
      .update(users)
      .set({
        role: input.role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, input.userId));

    // Audit log
    await logAudit({
      userId: ctx.user.id,
      action: 'user.update_role',
      targetType: 'user',
      targetId: input.userId,
      metadata: {
        oldRole: user.role,
        newRole: input.role,
      },
      req: ctx.req,
    });

    const [updated] = await db.select().from(users).where(eq(users.id, input.userId));
    return updated;
  }),

  /**
   * Assign user to agency (Super Admin only)
   */
  assignToAgency: superAdminProcedure
    .input(assignToAgencySchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // Get the user
      const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);

      if (!user) {
        throw new Error('User not found');
      }

      // Update agency assignment
      await db
        .update(users)
        .set({
          agencyId: input.agencyId,
          isSubaccount: input.agencyId ? (input.isSubaccount ? 1 : 0) : 0,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.userId));

      // Audit log
      await logAudit({
        userId: ctx.user.id,
        action: input.agencyId ? 'user.assign_agency' : 'user.remove_agency',
        targetType: 'user',
        targetId: input.userId,
        metadata: {
          agencyId: input.agencyId,
          isSubaccount: input.isSubaccount,
        },
        req: ctx.req,
      });

      const [updated] = await db.select().from(users).where(eq(users.id, input.userId));
      return updated;
    }),

  /**
   * Delete user (Super Admin only)
   */
  delete: superAdminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // Get the user
      const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);

      if (!user) {
        throw new Error('User not found');
      }

      // Prevent deleting yourself
      if (user.id === ctx.user.id) {
        throw new Error('Cannot delete your own account');
      }

      // Prevent deleting the last super admin
      if (user.role === 'super_admin') {
        const superAdmins = await db.select().from(users).where(eq(users.role, 'super_admin'));

        if (superAdmins.length === 1) {
          throw new Error('Cannot delete the last super admin');
        }
      }

      // Delete user
      await db.delete(users).where(eq(users.id, input.userId));

      // Audit log
      await logAudit({
        userId: ctx.user.id,
        action: 'user.delete',
        targetType: 'user',
        targetId: input.userId,
        metadata: {
          email: user.email,
          role: user.role,
        },
        req: ctx.req,
      });

      return { success: true };
    }),

  /**
   * Get user statistics
   */
  stats: superAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const allUsers = await db.select().from(users);

    const stats = {
      total: allUsers.length,
      byRole: {
        super_admin: allUsers.filter((u: any) => u.role === 'super_admin').length,
        agency_admin: allUsers.filter((u: any) => u.role === 'agency_admin').length,
        agent: allUsers.filter((u: any) => u.role === 'agent').length,
        property_developer: allUsers.filter((u: any) => u.role === 'property_developer').length,
        service_provider: allUsers.filter((u: any) => u.role === 'service_provider').length,
        visitor: allUsers.filter((u: any) => u.role === 'visitor').length,
      },
      withAgency: allUsers.filter((u: any) => u.agencyId !== null).length,
      subaccounts: allUsers.filter((u: any) => u.isSubaccount === 1).length,
    };

    return stats;
  }),
});
