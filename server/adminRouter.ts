import { z } from 'zod';
import { router, superAdminProcedure, agencyAdminProcedure } from './_core/trpc';
import {
  getDb,
  getPlatformAnalytics,
  getListingStats,
  updateProperty,
  getPlatformSetting,
  setPlatformSetting,
  getAllPlatformSettings,
} from './db';
import {
  users,
  agencies,
  agencyJoinRequests,
  auditLogs,
  properties,
  platformSettings,
} from '../drizzle/schema';
import { eq, desc, and, or, like, sql } from 'drizzle-orm';
import { logAudit, AuditActions } from './_core/auditLog';

/**
 * Admin router - Super admin and agency admin endpoints
 */
export const adminRouter = router({
  /**
   * Super Admin: List all users with pagination and filters
   */
  listUsers: superAdminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(50),
        role: z.enum(['visitor', 'agent', 'agency_admin', 'super_admin']).optional(),
        agencyId: z.number().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Log audit
      await logAudit({
        userId: ctx.user.id,
        action: AuditActions.VIEW_ALL_USERS,
        metadata: { filters: input },
        req: ctx.req,
      });

      const offset = (input.page - 1) * input.limit;

      // Build where conditions
      const conditions: any[] = [];
      if (input.role) conditions.push(eq(users.role, input.role));
      if (input.agencyId) conditions.push(eq(users.agencyId, input.agencyId));
      if (input.search) {
        conditions.push(
          or(
            like(users.email, `%${input.search}%`),
            like(users.firstName, `%${input.search}%`),
            like(users.lastName, `%${input.search}%`),
          ),
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [usersList, totalResult] = await Promise.all([
        db
          .select()
          .from(users)
          .where(where)
          .limit(input.limit)
          .offset(offset)
          .orderBy(desc(users.createdAt)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(where),
      ]);

      const total = Number(totalResult[0]?.count || 0);

      return {
        users: usersList.map(u => ({
          ...u,
          passwordHash: undefined, // Never expose password hash
        })),
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
      };
    }),

  /**
   * Super Admin: List all agencies
   */
  listAgencies: superAdminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(50),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await logAudit({
        userId: ctx.user.id,
        action: AuditActions.VIEW_ALL_AGENCIES,
        metadata: { filters: input },
        req: ctx.req,
      });

      const offset = (input.page - 1) * input.limit;

      const where = input.search
        ? or(like(agencies.name, `%${input.search}%`), like(agencies.city, `%${input.search}%`))
        : undefined;

      const [agenciesList, totalResult] = await Promise.all([
        db
          .select()
          .from(agencies)
          .where(where)
          .limit(input.limit)
          .offset(offset)
          .orderBy(desc(agencies.createdAt)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(agencies)
          .where(where),
      ]);

      const total = Number(totalResult[0]?.count || 0);

      return {
        agencies: agenciesList,
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
      };
    }),

  /**
   * Super Admin: Update user role
   */
  updateUserRole: superAdminProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(['visitor', 'agent', 'agency_admin', 'super_admin']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));

      await logAudit({
        userId: ctx.user.id,
        action: AuditActions.UPDATE_USER_ROLE,
        targetType: 'user',
        targetId: input.userId,
        metadata: { newRole: input.role },
        req: ctx.req,
      });

      return { success: true };
    }),

  /**
   * Super Admin: Get audit logs
   */
  getAuditLogs: superAdminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(50),
        userId: z.number().optional(),
        action: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const offset = (input.page - 1) * input.limit;

      const conditions: any[] = [];
      if (input.userId) conditions.push(eq(auditLogs.userId, input.userId));
      if (input.action) conditions.push(eq(auditLogs.action, input.action));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [logs, totalResult] = await Promise.all([
        db
          .select()
          .from(auditLogs)
          .where(where)
          .limit(input.limit)
          .offset(offset)
          .orderBy(desc(auditLogs.createdAt)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(auditLogs)
          .where(where),
      ]);

      const total = Number(totalResult[0]?.count || 0);

      return {
        logs,
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
      };
    }),

  /**
   * Agency Admin: List subaccounts (agents in their agency)
   */
  listSubaccounts: agencyAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Super admin can view all, agency admin only their agency
    const agencyId = ctx.user.role === 'super_admin' ? undefined : ctx.user.agencyId;

    if (ctx.user.role === 'agency_admin' && !agencyId) {
      throw new Error('Agency admin must be associated with an agency');
    }

    const subaccounts = await db
      .select()
      .from(users)
      .where(and(eq(users.isSubaccount, 1), agencyId ? eq(users.agencyId, agencyId) : undefined))
      .orderBy(desc(users.createdAt));

    return subaccounts.map(u => ({
      ...u,
      passwordHash: undefined,
    }));
  }),

  /**
   * Agency Admin: List join requests for their agency
   */
  listJoinRequests: agencyAdminProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const agencyId = ctx.user.role === 'super_admin' ? undefined : ctx.user.agencyId;

      if (ctx.user.role === 'agency_admin' && !agencyId) {
        throw new Error('Agency admin must be associated with an agency');
      }

      const conditions: any[] = [];
      if (agencyId) conditions.push(eq(agencyJoinRequests.agencyId, agencyId));
      if (input.status) conditions.push(eq(agencyJoinRequests.status, input.status));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const requests = await db
        .select()
        .from(agencyJoinRequests)
        .where(where)
        .orderBy(desc(agencyJoinRequests.createdAt));

      return requests;
    }),

  /**
   * Agency Admin: Approve/reject join request
   */
  reviewJoinRequest: agencyAdminProcedure
    .input(
      z.object({
        requestId: z.number(),
        status: z.enum(['approved', 'rejected']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Get the request
      const [request] = await db
        .select()
        .from(agencyJoinRequests)
        .where(eq(agencyJoinRequests.id, input.requestId))
        .limit(1);

      if (!request) {
        throw new Error('Join request not found');
      }

      // Verify agency ownership (unless super_admin)
      if (ctx.user.role === 'agency_admin' && request.agencyId !== ctx.user.agencyId) {
        throw new Error('Unauthorized: Can only review requests for your own agency');
      }

      // Update request status
      await db
        .update(agencyJoinRequests)
        .set({
          status: input.status,
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        })
        .where(eq(agencyJoinRequests.id, input.requestId));

      // If approved, link user to agency as subaccount
      if (input.status === 'approved') {
        await db
          .update(users)
          .set({
            agencyId: request.agencyId,
            isSubaccount: 1,
          })
          .where(eq(users.id, request.userId));
      }

      await logAudit({
        userId: ctx.user.id,
        action:
          input.status === 'approved'
            ? AuditActions.APPROVE_JOIN_REQUEST
            : AuditActions.REJECT_JOIN_REQUEST,
        targetType: 'join_request',
        targetId: input.requestId,
        metadata: { userId: request.userId, agencyId: request.agencyId },
        req: ctx.req,
      });

      return { success: true };
    }),

  /**
   * Super Admin: Get platform analytics
   */
  getAnalytics: superAdminProcedure.query(async () => {
    return await getPlatformAnalytics();
  }),

  /**
   * Super Admin: Get listing statistics
   */
  getListingStats: superAdminProcedure.query(async () => {
    return await getListingStats();
  }),

  /**
   * Super Admin: List properties for oversight (Super Admin only)
   */
  listProperties: superAdminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(50),
        status: z
          .enum(['available', 'sold', 'rented', 'pending', 'draft', 'published', 'archived'])
          .optional(),
        agencyId: z.number().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await logAudit({
        userId: ctx.user.id,
        action: AuditActions.VIEW_ALL_PROPERTIES,
        metadata: { filters: input },
        req: ctx.req,
      });

      const offset = (input.page - 1) * input.limit;

      // Build where conditions
      const conditions: any[] = [];
      if (input.status) conditions.push(eq(properties.status, input.status));
      if (input.agencyId) {
        // Join with agents to filter by agency
        conditions.push(
          sql`EXISTS (SELECT 1 FROM agents WHERE agents.id = properties.agentId AND agents.agencyId = ${input.agencyId})`,
        );
      }
      if (input.search) {
        conditions.push(
          or(
            like(properties.title, `%${input.search}%`),
            like(properties.address, `%${input.search}%`),
            like(properties.city, `%${input.search}%`),
          ),
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [propertiesList, totalResult] = await Promise.all([
        db
          .select({
            id: properties.id,
            title: properties.title,
            price: properties.price,
            status: properties.status,
            city: properties.city,
            createdAt: properties.createdAt,
            ownerId: properties.ownerId,
            agentId: properties.agentId,
            featured: properties.featured,
          })
          .from(properties)
          .where(where)
          .limit(input.limit)
          .offset(offset)
          .orderBy(desc(properties.createdAt)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(properties)
          .where(where),
      ]);

      const total = Number(totalResult[0]?.count || 0);

      return {
        properties: propertiesList,
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
      };
    }),

  /**
   * Super Admin: Moderate property listing (approve/reject)
   */
  moderateProperty: superAdminProcedure
    .input(
      z.object({
        propertyId: z.number(),
        action: z.enum(['approve', 'reject', 'archive']),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      let newStatus: string;
      switch (input.action) {
        case 'approve':
          newStatus = 'available';
          break;
        case 'reject':
          newStatus = 'archived';
          break;
        case 'archive':
          newStatus = 'archived';
          break;
        default:
          throw new Error('Invalid action');
      }

      await updateProperty(
        input.propertyId,
        ctx.user.id,
        { status: newStatus as any },
        ctx.user.role,
      );

      await logAudit({
        userId: ctx.user.id,
        action:
          input.action === 'approve' ? AuditActions.APPROVE_PROPERTY : AuditActions.REJECT_PROPERTY,
        targetType: 'property',
        targetId: input.propertyId,
        metadata: { reason: input.reason, newStatus },
        req: ctx.req,
      });

      return { success: true };
    }),

  /**
   * Super Admin: Update subscription plan
   */
  updateSubscription: superAdminProcedure
    .input(
      z.object({
        agencyId: z.number(),
        plan: z.enum(['free', 'basic', 'premium', 'enterprise']),
        status: z.enum(['trial', 'active', 'suspended', 'cancelled']).optional(),
        expiry: z.string().datetime().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const updateData: any = {
        subscriptionPlan: input.plan,
        updatedAt: new Date(),
      };

      if (input.status) updateData.subscriptionStatus = input.status;
      if (input.expiry) updateData.subscriptionExpiry = new Date(input.expiry);

      await db.update(agencies).set(updateData).where(eq(agencies.id, input.agencyId));

      await logAudit({
        userId: ctx.user.id,
        action: AuditActions.UPDATE_SUBSCRIPTION,
        targetType: 'agency',
        targetId: input.agencyId,
        metadata: { newPlan: input.plan, newStatus: input.status },
        req: ctx.req,
      });

      return { success: true };
    }),

  /**
   * Super Admin: Get platform settings
   */
  getPlatformSettings: superAdminProcedure.query(async () => {
    return await getAllPlatformSettings();
  }),

  /**
   * Super Admin: Update platform setting
   */
  updatePlatformSetting: superAdminProcedure
    .input(
      z.object({
        key: z.string(),
        value: z.any(),
        description: z.string().optional(),
        category: z.enum(['pricing', 'features', 'notifications', 'limits', 'other']).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await setPlatformSetting(input.key, input.value, ctx.user.id);

      // If additional metadata provided, update those fields too
      const db = await getDb();
      if (db && (input.description || input.category)) {
        const updateData: any = {};
        if (input.description) updateData.description = input.description;
        if (input.category) updateData.category = input.category;

        await db
          .update(platformSettings)
          .set(updateData)
          .where(eq(platformSettings.key, input.key));
      }

      await logAudit({
        userId: ctx.user.id,
        action: 'update_platform_setting',
        targetType: 'platform_setting',
        targetId: undefined,
        metadata: { key: input.key, value: input.value },
        req: ctx.req,
      });

      return { success: true };
    }),
});
