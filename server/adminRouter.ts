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
  commissions,
  agencySubscriptions,
  invoices,
  plans,
  subscriptionTransactions,
  advertisingCampaigns,
  revenueForecasts,
  failedPayments,
  listings,
  listingMedia,
  agents,
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
          .enum([
            'draft',
            'pending_review',
            'approved',
            'published',
            'rejected',
            'archived',
            'sold',
            'rented',
          ])
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
      if (input.status) conditions.push(eq(listings.status, input.status));
      if (input.agencyId) {
        conditions.push(eq(listings.agencyId, input.agencyId));
      }
      if (input.search) {
        conditions.push(
          or(
            like(listings.title, `%${input.search}%`),
            like(listings.address, `%${input.search}%`),
            like(listings.city, `%${input.search}%`),
            like(listings.slug, `%${input.search}%`),
          ),
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [listingsList, totalResult] = await Promise.all([
        db
          .select({
            id: listings.id,
            title: listings.title,
            askingPrice: listings.askingPrice,
            monthlyRent: listings.monthlyRent,
            status: listings.status,
            approvalStatus: listings.approvalStatus,
            city: listings.city,
            createdAt: listings.createdAt,
            propertyDetails: listings.propertyDetails,
            action: listings.action,
            
            // Agent Info
            agent: {
              id: agents.id,
              firstName: agents.firstName,
              lastName: agents.lastName,
              profileImage: agents.profileImage,
              isVerified: agents.isVerified,
            },

            // Owner Info (fallback)
            owner: {
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email,
            },

            // Media
            thumbnail: listingMedia.thumbnailUrl,
            mediaType: listingMedia.mediaType,
          })
          .from(listings)
          .leftJoin(agents, eq(listings.agentId, agents.id))
          .leftJoin(users, eq(listings.ownerId, users.id))
          .leftJoin(listingMedia, eq(listings.mainMediaId, listingMedia.id))
          .where(where)
          .limit(input.limit)
          .offset(offset)
          .orderBy(desc(listings.createdAt)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(listings)
          .where(where),
      ]);

      const total = Number(totalResult[0]?.count || 0);

      return {
        properties: listingsList.map(l => ({
          ...l,
          // Normalize price for display
          price: l.action === 'rent' ? Number(l.monthlyRent) : Number(l.askingPrice),
          // Calculate Vibe Score (Mock for now, can be enhanced)
          vibeScore: Math.floor(Math.random() * 30) + 70, // Random 70-100 for demo
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
   * Super Admin: Get Property Listing Stats (Health Monitor)
   */
  getPropertiesStats: superAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [stats] = await db
      .select({
        totalInventoryValue: sql<string>`sum(${listings.askingPrice})`,
        newListingsToday: sql<number>`count(case when ${listings.createdAt} >= DATE_SUB(NOW(), INTERVAL 24 HOUR) then 1 end)`,
        pendingApprovals: sql<number>`count(case when ${listings.approvalStatus} = 'pending' then 1 end)`,
      })
      .from(listings)
      .where(eq(listings.status, 'published')); // Only count published for inventory value? Or all?
      // Let's count all active listings for inventory value
    
    // Actually, let's do a separate query for pending approvals to be safe on where clause
    const [pendingResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(listings)
      .where(eq(listings.approvalStatus, 'pending'));

    return {
      totalInventoryValue: Number(stats?.totalInventoryValue || 0),
      newListingsToday: Number(stats?.newListingsToday || 0),
      pendingApprovals: Number(pendingResult?.count || 0),
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

  /**
   * Super Admin: Get comprehensive revenue analytics
   */
  getRevenueAnalytics: superAdminProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional(),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const startDate = input?.startDate ? new Date(input.startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Default: 90 days ago
      const endDate = input?.endDate ? new Date(input.endDate) : new Date();

      // Get commission revenue
      const [commissionStats] = await db.execute(sql`
        SELECT
          COUNT(*) as totalCommissions,
          SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paidCommissions,
          SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pendingCommissions,
          SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approvedCommissions,
          SUM(amount) as totalCommissionAmount,
          AVG(CASE WHEN status = 'paid' THEN amount ELSE NULL END) as avgCommission
        FROM ${commissions}
        WHERE ${commissions.createdAt} >= ${startDate} AND ${commissions.createdAt} <= ${endDate}
      `);

      // Get subscription revenue
      const [subscriptionStats] = await db.execute(sql`
        SELECT
          COUNT(DISTINCT ${agencySubscriptions.agencyId}) as activeSubscriptions,
          COUNT(CASE WHEN ${agencySubscriptions.status} = 'active' THEN 1 END) as currentlyActive,
          COUNT(CASE WHEN ${agencySubscriptions.status} = 'trialing' THEN 1 END) as trialing
        FROM ${agencySubscriptions}
        WHERE ${agencySubscriptions.currentPeriodStart} >= ${startDate} 
          AND ${agencySubscriptions.currentPeriodStart} <= ${endDate}
      `);

      // Get invoice revenue
      const [invoiceStats] = await db.execute(sql`
        SELECT
          COUNT(*) as totalInvoices,
          SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paidInvoices,
          SUM(CASE WHEN status = 'open' THEN amount ELSE 0 END) as openInvoices,
          SUM(amount) as totalInvoiceAmount
        FROM ${invoices}
        WHERE ${invoices.createdAt} >= ${startDate} AND ${invoices.createdAt} <= ${endDate}
      `);

      const commRow = (commissionStats as any)[0];
      const subsRow = (subscriptionStats as any)[0];
      const invRow = (invoiceStats as any)[0];

      const totalRevenue = Number(commRow.paidCommissions || 0) + Number(invRow.paidInvoices || 0);
      const pendingRevenue = Number(commRow.pendingCommissions || 0) + Number(invRow.openInvoices || 0);

      return {
        totalRevenue: totalRevenue / 100, // Convert cents to currency
        pendingRevenue: pendingRevenue / 100,
        commissionRevenue: Number(commRow.paidCommissions || 0) / 100,
        subscriptionRevenue: Number(invRow.paidInvoices || 0) / 100,
        totalCommissions: Number(commRow.totalCommissions || 0),
        paidCommissions: Number(commRow.paidCommissions || 0) / 100,
        pendingCommissions: Number(commRow.pendingCommissions || 0) / 100,
        approvedCommissions: Number(commRow.approvedCommissions || 0) / 100,
        avgCommission: Number(commRow.avgCommission || 0) / 100,
        activeSubscriptions: Number(subsRow.activeSubscriptions || 0),
        currentlyActive: Number(subsRow.currentlyActive || 0),
        trialing: Number(subsRow.trialing || 0),
        totalInvoices: Number(invRow.totalInvoices || 0),
        paidInvoices: Number(invRow.paidInvoices || 0) / 100,
        openInvoices: Number(invRow.openInvoices || 0) / 100,
      };
    }),

  /**
   * Super Admin: Get commission breakdown
   */
  getCommissionBreakdown: superAdminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(50),
        status: z.enum(['pending', 'approved', 'paid', 'cancelled']).optional(),
        transactionType: z.enum(['sale', 'rent', 'referral', 'other']).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const offset = (input.page - 1) * input.limit;
      const conditions: any[] = [];

      if (input.status) conditions.push(eq(commissions.status, input.status));
      if (input.transactionType) conditions.push(eq(commissions.transactionType, input.transactionType));
      if (input.startDate) conditions.push(gte(commissions.createdAt, new Date(input.startDate)));
      if (input.endDate) conditions.push(lte(commissions.createdAt, new Date(input.endDate)));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [commissionsList, totalResult] = await Promise.all([
        db
          .select({
            id: commissions.id,
            amount: commissions.amount,
            percentage: commissions.percentage,
            status: commissions.status,
            transactionType: commissions.transactionType,
            description: commissions.description,
            payoutDate: commissions.payoutDate,
            paymentReference: commissions.paymentReference,
            createdAt: commissions.createdAt,
            agent: {
              id: agents.id,
              firstName: agents.firstName,
              lastName: agents.lastName,
              displayName: agents.displayName,
            },
            property: {
              id: properties.id,
              title: properties.title,
              address: properties.address,
            },
          })
          .from(commissions)
          .leftJoin(agents, eq(commissions.agentId, agents.id))
          .leftJoin(properties, eq(commissions.propertyId, properties.id))
          .where(where)
          .limit(input.limit)
          .offset(offset)
          .orderBy(desc(commissions.createdAt)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(commissions)
          .where(where),
      ]);

      const total = Number(totalResult[0]?.count || 0);

      return {
        commissions: commissionsList.map(c => ({
          ...c,
          amount: Number(c.amount) / 100, // Convert cents to currency
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
   * Super Admin: Get subscription revenue analytics
   */
  getSubscriptionRevenue: superAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Get subscription breakdown by plan
    const subscriptionsByPlan = await db
      .select({
        planId: agencySubscriptions.planId,
        planName: plans.name,
        count: sql<number>`count(*)`,
        status: agencySubscriptions.status,
      })
      .from(agencySubscriptions)
      .leftJoin(plans, eq(agencySubscriptions.planId, plans.id))
      .groupBy(agencySubscriptions.planId, agencySubscriptions.status, plans.name);

    // Get MRR (Monthly Recurring Revenue)
    const [mrrResult] = await db.execute(sql`
      SELECT 
        SUM(${plans.price}) as monthlyRecurringRevenue
      FROM ${agencySubscriptions}
      LEFT JOIN ${plans} ON ${agencySubscriptions.planId} = ${plans.id}
      WHERE ${agencySubscriptions.status} = 'active'
        AND ${plans.interval} = 'month'
    `);

    const mrrRow = (mrrResult as any)[0];

    return {
      subscriptionsByPlan,
      monthlyRecurringRevenue: Number(mrrRow?.monthlyRecurringRevenue || 0) / 100,
    };
  }),

  /**
   * Super Admin: Get revenue by period (for charts)
   */
  getRevenueByPeriod: superAdminProcedure
    .input(
      z.object({
        period: z.enum(['daily', 'weekly', 'monthly']).default('monthly'),
        months: z.number().default(6),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const monthsAgo = new Date();
      monthsAgo.setMonth(monthsAgo.getMonth() - input.months);

      // Get commission revenue by period
      const commissionRevenue = await db.execute(sql`
        SELECT 
          DATE_FORMAT(${commissions.createdAt}, '%Y-%m') as period,
          SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as revenue,
          COUNT(*) as count
        FROM ${commissions}
        WHERE ${commissions.createdAt} >= ${monthsAgo}
        GROUP BY DATE_FORMAT(${commissions.createdAt}, '%Y-%m')
        ORDER BY period ASC
      `);

      // Get invoice revenue by period
      const invoiceRevenue = await db.execute(sql`
        SELECT 
          DATE_FORMAT(${invoices.createdAt}, '%Y-%m') as period,
          SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as revenue,
          COUNT(*) as count
        FROM ${invoices}
        WHERE ${invoices.createdAt} >= ${monthsAgo}
        GROUP BY DATE_FORMAT(${invoices.createdAt}, '%Y-%m')
        ORDER BY period ASC
      `);

      // Combine and format data
      const periodMap = new Map();
      
      (commissionRevenue as any[]).forEach(row => {
        periodMap.set(row.period, {
          period: row.period,
          commissionRevenue: Number(row.revenue || 0) / 100,
          commissionCount: Number(row.count || 0),
          subscriptionRevenue: 0,
          subscriptionCount: 0,
        });
      });

      (invoiceRevenue as any[]).forEach(row => {
        const existing = periodMap.get(row.period) || {
          period: row.period,
          commissionRevenue: 0,
          commissionCount: 0,
          subscriptionRevenue: 0,
          subscriptionCount: 0,
        };
        existing.subscriptionRevenue = Number(row.revenue || 0) / 100;
        existing.subscriptionCount = Number(row.count || 0);
        periodMap.set(row.period, existing);
      });

      const revenueData = Array.from(periodMap.values()).map(item => ({
        ...item,
        totalRevenue: item.commissionRevenue + item.subscriptionRevenue,
      }));

      return revenueData;
    }),

  /**
   * Super Admin: Get revenue breakdown by category
   */
  getRevenueByCategory: superAdminProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Use subscriptionTransactions for accurate categorization
      const revenueByCategory = await db.execute(sql`
        SELECT 
          revenueCategory,
          SUM(amount) as totalRevenue,
          COUNT(*) as transactionCount
        FROM ${subscriptionTransactions}
        WHERE status = 'completed'
        ${input.startDate ? sql`AND createdAt >= ${input.startDate}` : sql``}
        ${input.endDate ? sql`AND createdAt <= ${input.endDate}` : sql``}
        GROUP BY revenueCategory
      `);

      // Get Ad revenue
      const adRevenue = await db.execute(sql`
        SELECT 
          SUM(spentAmount) as totalRevenue,
          COUNT(*) as campaignCount
        FROM ${advertisingCampaigns}
        WHERE status = 'active' OR status = 'completed'
        ${input.startDate ? sql`AND createdAt >= ${input.startDate}` : sql``}
        ${input.endDate ? sql`AND createdAt <= ${input.endDate}` : sql``}
      `);

      return {
        subscriptions: (revenueByCategory as any[]).map(row => ({
          category: row.revenueCategory,
          revenue: Number(row.totalRevenue || 0) / 100,
          count: Number(row.transactionCount || 0),
        })),
        advertising: {
          revenue: Number((adRevenue as any)[0]?.totalRevenue || 0) / 100,
          count: Number((adRevenue as any)[0]?.campaignCount || 0),
        }
      };
    }),

  /**
   * Super Admin: Get LTV Analytics
   */
  getLTVAnalytics: superAdminProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Calculate Average Revenue Per User (ARPU)
      // Total Revenue / Total Paying Users
      
      const totalRevenueResult = await db.execute(sql`
        SELECT SUM(amount) as total FROM ${subscriptionTransactions} WHERE status = 'completed'
      `);
      
      const totalPayingUsersResult = await db.execute(sql`
        SELECT COUNT(DISTINCT agencyId) as count FROM ${agencySubscriptions} WHERE status = 'active'
      `);

      const totalRevenue = Number((totalRevenueResult as any)[0]?.total || 0) / 100;
      const totalUsers = Number((totalPayingUsersResult as any)[0]?.count || 1); // Avoid div by zero

      const arpu = totalRevenue / totalUsers;

      // Calculate Churn Rate (simplified)
      // Cancelled Subscriptions / Total Subscriptions
      const churnResult = await db.execute(sql`
        SELECT 
          COUNT(CASE WHEN status = 'canceled' THEN 1 END) as cancelled,
          COUNT(*) as total
        FROM ${agencySubscriptions}
      `);

      const cancelled = Number((churnResult as any)[0]?.cancelled || 0);
      const totalSubs = Number((churnResult as any)[0]?.total || 1);
      const churnRate = (cancelled / totalSubs) * 100;

      // Estimated LTV = ARPU / Churn Rate (monthly)
      // This is a very basic approximation
      const ltv = churnRate > 0 ? arpu / (churnRate / 100) : 0;

      return {
        arpu,
        churnRate,
        ltv,
        totalRevenue,
        activeSubscribers: totalUsers,
      };
    }),

  /**
   * Super Admin: Get Revenue Forecast
   */
  getRevenueForecast: superAdminProcedure
    .input(z.object({
      period: z.enum(['30_days', '90_days', 'quarter', 'year']).default('30_days'),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Get latest forecast from database
      const [forecast] = await db
        .select()
        .from(revenueForecasts)
        .where(eq(revenueForecasts.forecastPeriod, input.period))
        .orderBy(desc(revenueForecasts.createdAt))
        .limit(1);

      if (forecast) {
        return {
          ...forecast,
          predictedAmount: Number(forecast.predictedAmount) / 100,
          confidenceScore: Number(forecast.confidenceScore),
        };
      }

      // If no forecast exists, generate a simple one on the fly (fallback)
      // Linear projection based on last 3 months
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const recentRevenue = await db.execute(sql`
        SELECT SUM(amount) as total 
        FROM ${subscriptionTransactions} 
        WHERE status = 'completed' 
        AND createdAt >= ${threeMonthsAgo}
      `);

      const totalRecent = Number((recentRevenue as any)[0]?.total || 0) / 100;
      const monthlyAverage = totalRecent / 3;
      
      let multiplier = 1;
      if (input.period === '90_days' || input.period === 'quarter') multiplier = 3;
      if (input.period === 'year') multiplier = 12;

      return {
        forecastPeriod: input.period,
        predictedAmount: monthlyAverage * multiplier,
        confidenceScore: 0.7, // Moderate confidence for simple projection
        methodology: 'linear_projection_fallback',
        createdAt: new Date(),
      };
    }),

  /**
   * Super Admin: Get Failed Payments
   */
  getFailedPayments: superAdminProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const offset = (input.page - 1) * input.limit;

      const [failures, totalResult] = await Promise.all([
        db
          .select({
            payment: failedPayments,
            agency: agencies,
          })
          .from(failedPayments)
          .leftJoin(agencies, eq(failedPayments.agencyId, agencies.id))
          .limit(input.limit)
          .offset(offset)
          .orderBy(desc(failedPayments.createdAt)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(failedPayments),
      ]);

      return {
        failures: failures.map(f => ({
          ...f.payment,
          amount: Number(f.payment.amount) / 100,
          agencyName: f.agency?.name || 'Unknown',
        })),
        total: Number(totalResult[0]?.count || 0),
      };
    }),

  /**
   * Super Admin: Get General Platform Analytics
   */
  getGeneralAnalytics: superAdminProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [
        totalUsers,
        totalAgencies,
        totalListings,
        activeListings,
        totalAgents,
        recentUsers,
        recentListings
      ] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(users),
        db.select({ count: sql<number>`count(*)` }).from(agencies),
        db.select({ count: sql<number>`count(*)` }).from(listings),
        db.select({ count: sql<number>`count(*)` }).from(listings).where(eq(listings.status, 'active')),
        db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, 'agent')),
        db.select().from(users).orderBy(desc(users.createdAt)).limit(5),
        db.select().from(listings).orderBy(desc(listings.createdAt)).limit(5)
      ]);

      return {
        counts: {
          users: Number(totalUsers[0]?.count || 0),
          agencies: Number(totalAgencies[0]?.count || 0),
          listings: Number(totalListings[0]?.count || 0),
          activeListings: Number(activeListings[0]?.count || 0),
          agents: Number(totalAgents[0]?.count || 0),
        },
        recentActivity: {
          users: recentUsers,
          listings: recentListings,
        }
      };
    }),
});
