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
  countPendingAgents,
  countPendingListings,
  countPendingDevelopments,
  getEcosystemStats,
} from './db';
import {
  users,
  agencies,
  agencyJoinRequests,
  // auditLogs,
  properties,
  // platformSettings,
  // commissions,
  // agencySubscriptions,
  // invoices,
  // plans,
  // TODO: Re-enable when revenue center schema is added
  // subscriptionTransactions,
  // advertisingCampaigns,
  // revenueForecasts,
  // failedPayments,
  listings,
  listingMedia,
  agents,
  developments,
  developers,
  developmentApprovalQueue,
} from '../drizzle/schema';
import { eq, desc, asc, and, or, like, sql, type SQL, gte, lte } from 'drizzle-orm';
import { logAudit, AuditActions } from './_core/auditLog';
import { nowAsDbTimestamp } from './utils/dbTypeUtils';
import { developmentService } from './services/developmentService';

/**
 * Admin router - Super admin and agency admin endpoints
 */
export const adminRouter = router({
  /**
   * Super Admin: Get action items (pending counts)
   * Designed for fast polling on the dashboard
   */
  getAdminActionItems: superAdminProcedure.query(
    async (): Promise<{
      pendingAgentApprovals: number;
      pendingListingApprovals: number;
      pendingDevelopmentApprovals: number;
      flaggedItems: number;
    }> => {
      const [agents, listings, developments] = await Promise.all([
        countPendingAgents(),
        countPendingListings(),
        countPendingDevelopments(),
      ]);

      return {
        pendingAgentApprovals: agents,
        pendingListingApprovals: listings,
        pendingDevelopmentApprovals: developments,
        flaggedItems: 0, // Placeholder
      };
    },
  ),

  /**
   * Super Admin: Get Ecosystem Overview Stats
   */
  getEcosystemStats: superAdminProcedure.query(
    async (): Promise<Awaited<ReturnType<typeof getEcosystemStats>>> => {
      return getEcosystemStats();
    },
  ),

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
    .query(
      async ({
        ctx,
        input,
      }): Promise<{
        users: any[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }> => {
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
        const conditions: SQL[] = [];
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
      },
    ),

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
    .query(
      async ({
        ctx,
        input,
      }): Promise<{
        agencies: any[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }> => {
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
      },
    ),

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
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
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
  /*
  // Super Admin: Get audit logs
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
       // ... Implementation commented out due to missing schema
       throw new Error("Feature temporarily unavailable");
    }),
  */

  /**
   * Agency Admin: List subaccounts (agents in their agency)
   */
  listSubaccounts: agencyAdminProcedure.query(async ({ ctx }): Promise<any[]> => {
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
    .query(async ({ ctx, input }): Promise<any[]> => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const agencyId = ctx.user.role === 'super_admin' ? undefined : ctx.user.agencyId;

      if (ctx.user.role === 'agency_admin' && !agencyId) {
        throw new Error('Agency admin must be associated with an agency');
      }

      const conditions: SQL[] = [];
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
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
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
          reviewedAt: nowAsDbTimestamp(),
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
  getAnalytics: superAdminProcedure.query(async (): Promise<any> => {
    return await getPlatformAnalytics();
  }),

  /**
   * Super Admin: Get listing statistics
   */
  getListingStats: superAdminProcedure.query(async (): Promise<any> => {
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
    .query(
      async ({
        ctx,
        input,
      }): Promise<{
        properties: any[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }> => {
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
        const conditions: SQL[] = [];
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

        // Determine sort order
        let orderByClause = [desc(listings.createdAt)];

        // Phase 5: Smart Admin Queues
        // If viewing pending items, sort by Lowest Readiness (Edge cases) and High Value
        if (input.status === 'pending_review' || input.status === 'approved') {
          // Applying smart sort to approved too? Maybe just pending.
          // Wait, listing status enum usage in where clause:
          // 'pending_review' is the status for submitted listings.
        }

        if (input.status === 'pending_review') {
          orderByClause = [
            asc(listings.readinessScore), // Lowest readiness first (Review edge cases)
            desc(listings.askingPrice), // High value items
            desc(listings.createdAt), // Oldest first if tie
          ];
        }

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

              // Scores (Phase 2/3)
              readinessScore: listings.readinessScore,
              qualityScore: listings.qualityScore,
            })
            .from(listings)
            .leftJoin(agents, eq(listings.agentId, agents.id))
            .leftJoin(users, eq(listings.ownerId, users.id))
            .leftJoin(listingMedia, eq(listings.mainMediaId, listingMedia.id))
            .where(where)
            .limit(input.limit)
            .offset(offset)
            .orderBy(...orderByClause),
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
      },
    ),

  /**
   * Super Admin: Get Property Listing Stats (Health Monitor)
   */
  getPropertiesStats: superAdminProcedure.query(async ({ ctx }): Promise<any> => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [stats] = await db
      .select({
        totalInventoryValue: sql<string>`sum(${listings.askingPrice})`,
        newListingsToday: sql<number>`count(case when ${listings.createdAt} >= DATE_SUB(NOW(), INTERVAL 24 HOUR) then 1 end)`,
        pendingApprovals: sql<number>`count(case when ${listings.approvalStatus} = 'pending' then 1 end)`,
        // Quality Metrics
        averageQuality: sql<number>`avg(${listings.qualityScore})`,
        featuredCount: sql<number>`count(case when ${listings.qualityScore} >= 90 then 1 end)`,
        optimizedCount: sql<number>`count(case when ${listings.qualityScore} >= 75 AND ${listings.qualityScore} < 90 then 1 end)`,
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
      // Quality Stats (Phase 6) - Using raw SQL to be safe if Drizzle types lag
      qualityMetrics: {
        averageScore: Number(stats?.averageQuality || 0),
        featuredCount: Number(stats?.featuredCount || 0),
        optimizedCount: Number(stats?.optimizedCount || 0),
      },
    };
  }),

  /**
   * Super Admin: Get Development Approval Analytics (Fast-Track Monitoring)
   */
  getDevelopmentAnalytics: superAdminProcedure.query(async ({ ctx }): Promise<any> => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // 1. Pending Developments
    const [pendingRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(developments)
      .where(eq(developments.approvalStatus, 'pending'));

    // 2. Queue Analytics (Approvals & Rejections)
    // Using raw SQL for efficient aggregation of time differences and conditional counts
    const [queueStats] = await db.execute(sql`
        SELECT
            COUNT(*) as total_processed,
            SUM(CASE WHEN status = 'approved' AND review_notes LIKE 'Auto-approved%' THEN 1 ELSE 0 END) as auto_approved,
            SUM(CASE WHEN status = 'approved' AND (review_notes IS NULL OR review_notes NOT LIKE 'Auto-approved%') THEN 1 ELSE 0 END) as manual_approved,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
            AVG(CASE 
                WHEN status = 'approved' AND (review_notes IS NULL OR review_notes NOT LIKE 'Auto-approved%') 
                THEN TIMESTAMPDIFF(SECOND, submitted_at, reviewed_at) 
                ELSE NULL 
            END) as avg_manual_seconds
        FROM development_approval_queue
        WHERE status IN ('approved', 'rejected')
    `);

    const stats = (queueStats as any)[0] || {};
    const totalProcessed = Number(stats.total_processed || 0);
    const autoApproved = Number(stats.auto_approved || 0);
    const manualApproved = Number(stats.manual_approved || 0);

    // Ratios
    const approvalRate = totalProcessed > 0 ? (autoApproved + manualApproved) / totalProcessed : 0;
    const autoApprovalRate =
      autoApproved + manualApproved > 0 ? autoApproved / (autoApproved + manualApproved) : 0;

    return {
      pendingCount: Number(pendingRes?.count || 0),
      totalProcessed,
      autoApprovedCount: autoApproved,
      manualApprovedCount: manualApproved,
      rejectedCount: Number(stats.rejected || 0),
      avgManualApprovalSeconds: Number(stats.avg_manual_seconds || 0),
      autoApprovalRate,
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
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
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
  /*
  updateSubscription: superAdminProcedure.mutation(async () => { throw new Error("Unavailable"); }),
  getPlatformSettings: superAdminProcedure.query(async () => { throw new Error("Unavailable"); }),
  updatePlatformSetting: superAdminProcedure.mutation(async () => { throw new Error("Unavailable"); }),
  */

  /**
   * Super Admin: Get comprehensive revenue analytics
   */
  /*
  getRevenueAnalytics: superAdminProcedure.query(async () => { throw new Error("Unavailable"); }),
  getCommissionBreakdown: superAdminProcedure.query(async () => { throw new Error("Unavailable"); }),
  getSubscriptionRevenue: superAdminProcedure.query(async () => { throw new Error("Unavailable"); }),
  getRevenueByPeriod: superAdminProcedure.query(async () => { throw new Error("Unavailable"); }),
  getRevenueByCategory: superAdminProcedure.query(async () => { throw new Error("Unavailable"); }),
  getLTVAnalytics: superAdminProcedure.query(async () => { throw new Error("Unavailable"); }),
  getRevenueForecast: superAdminProcedure.query(async () => { throw new Error("Unavailable"); }),
  getFailedPayments: superAdminProcedure.query(async () => { throw new Error("Unavailable"); }),
  */

  /**
   * Super Admin: Get General Platform Analytics
   */
  getGeneralAnalytics: superAdminProcedure.query(async (): Promise<any> => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const results = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ count: sql<number>`count(*)` }).from(agencies),
      db.select({ count: sql<number>`count(*)` }).from(listings),
      db
        .select({ count: sql<number>`count(*)` })
        .from(listings)
        .where(eq(listings.status, 'active')),
      db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.role, 'agent')),
      db.select().from(users).orderBy(desc(users.createdAt)).limit(5),
      db.select().from(listings).orderBy(desc(listings.createdAt)).limit(5),
    ]);

    const [
      totalUsers,
      totalAgencies,
      totalListings,
      activeListings,
      totalAgents,
      recentUsers,
      recentListings,
    ] = results as [
      { count: number }[],
      { count: number }[],
      { count: number }[],
      { count: number }[],
      { count: number }[],
      any[],
      any[],
    ];

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
      },
    };
  }),

  /**
   * Super Admin: Get agents by status for approval
   */
  getPendingAgents: superAdminProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'approved', 'rejected', 'suspended']).optional(),
      }),
    )
    .query(async ({ input }): Promise<any[]> => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const where = input.status ? eq(agents.status, input.status) : undefined;

      const agentsList = await db
        .select({
          id: agents.id,
          userId: agents.userId,
          displayName: agents.displayName,
          phone: agents.phone,
          phoneNumber: agents.phone,
          email: agents.email,
          bio: agents.bio,
          licenseNumber: agents.licenseNumber,
          specializations: agents.specialization,
          status: agents.status,
          rejectionReason: agents.rejectionReason,
          createdAt: agents.createdAt,
          approvedAt: agents.approvedAt,
        })
        .from(agents)
        .where(where)
        .orderBy(desc(agents.createdAt));

      return agentsList;
    }),

  /**
   * Super Admin: Approve agent application
   */
  approveAgent: superAdminProcedure
    .input(
      z.object({
        agentId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await db
        .update(agents)
        .set({
          status: 'approved',
          approvedBy: ctx.user.id,
          approvedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        })
        .where(eq(agents.id, input.agentId));

      await logAudit({
        userId: ctx.user.id,
        action: AuditActions.APPROVE_JOIN_REQUEST,
        targetType: 'agent',
        targetId: input.agentId,
        metadata: { status: 'approved' },
        req: ctx.req,
      });

      return { success: true };
    }),

  /**
   * Super Admin: Reject agent application
   */
  rejectAgent: superAdminProcedure
    .input(
      z.object({
        agentId: z.number(),
        reason: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await db
        .update(agents)
        .set({
          status: 'rejected',
          rejectionReason: input.reason,
          updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        })
        .where(eq(agents.id, input.agentId));

      await logAudit({
        userId: ctx.user.id,
        action: AuditActions.REJECT_JOIN_REQUEST,
        targetType: 'agent',
        targetId: input.agentId,
        metadata: { status: 'rejected', reason: input.reason },
        req: ctx.req,
      });

      return { success: true };
    }),

  /**
   * Admin: List pending developments
   */
  adminListPendingDevelopments: superAdminProcedure.query(async ({ ctx }): Promise<any[]> => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Sort by submittedAt desc
    const pendingDevs = await db
      .select({
        development: developments,
        developer: developers,
        queueEntry: developmentApprovalQueue,
      })
      .from(developmentApprovalQueue)
      .innerJoin(developments, eq(developmentApprovalQueue.developmentId, developments.id))
      .innerJoin(developers, eq(developments.developerId, developers.id))
      .where(eq(developmentApprovalQueue.status, 'pending'))
      .orderBy(desc(developmentApprovalQueue.submittedAt));

    return pendingDevs.map(item => ({
      ...item.development,
      developerName: item.developer.name,
      submittedAt: item.queueEntry.submittedAt,
      queueId: item.queueEntry.id,
    }));
  }),

  /**
   * Admin: Approve development
   */
  adminApproveDevelopment: superAdminProcedure
    .input(
      z.object({
        developmentId: z.number(),
        complianceChecks: z.record(z.boolean()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
      await developmentService.approveDevelopment(
        input.developmentId,
        ctx.user.id,
        input.complianceChecks,
      );

      await logAudit({
        userId: ctx.user.id,
        action: AuditActions.UPDATE_DEVELOPMENT,
        targetType: 'development',
        targetId: input.developmentId,
        metadata: { action: 'approve', compliance: input.complianceChecks },
        req: ctx.req,
      });

      return { success: true };
    }),

  /**
   * Admin: Reject development
   */
  adminRejectDevelopment: superAdminProcedure
    .input(
      z.object({
        developmentId: z.number(),
        reason: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
      await developmentService.rejectDevelopment(input.developmentId, ctx.user.id, input.reason);

      await logAudit({
        userId: ctx.user.id,
        action: AuditActions.UPDATE_DEVELOPMENT,
        targetType: 'development',
        targetId: input.developmentId,
        metadata: { action: 'reject', reason: input.reason },
        req: ctx.req,
      });

      return { success: true };
    }),

  /**
   * Admin: Request changes (Soft Rejection)
   */
  adminRequestChanges: superAdminProcedure
    .input(
      z.object({
        developmentId: z.number(),
        feedback: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
      await developmentService.requestChanges(input.developmentId, ctx.user.id, input.feedback);

      await logAudit({
        userId: ctx.user.id,
        action: AuditActions.UPDATE_DEVELOPMENT,
        targetType: 'development',
        targetId: input.developmentId,
        metadata: { action: 'request_changes', feedback: input.feedback },
        req: ctx.req,
      });

      return { success: true };
    }),

  /**
   * Admin: Get Audit Logs for a Development
   */
  /*
  getDevelopmentAuditLogs: superAdminProcedure.query(async () => { throw new Error("Unavailable"); }),
  */
});
