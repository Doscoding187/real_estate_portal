import { router } from './_core/trpc';
import { agentProcedure } from './_core/trpc';
import { z } from 'zod';
import { getDb } from './db';
import {
  properties,
  leads,
  showings,
  commissions,
  offers,
  leadActivities,
  agents,
  propertyImages,
  users,
  notifications,
} from '../drizzle/schema';
import { eq, and, desc, gte, lte, sql, count, inArray, like } from 'drizzle-orm';
import { EmailService } from './_core/emailService';

// Pipeline stages for Kanban board
const PIPELINE_STAGES = ['new', 'contacted', 'viewing', 'offer', 'closed'] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

// Notification types
const NOTIFICATION_TYPES = [
  'lead_assigned',
  'offer_received',
  'showing_scheduled',
  'system_alert',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/**
 * Agent Router - Dashboard and CRM functionality for agents
 */
export const agentRouter = router({
  /**
   * Get agent's dashboard KPIs
   */
  getDashboardStats: agentProcedure.query(async ({ ctx }) => {
    const db = await getDb();

    // Get agent record from user
    const [agentRecord] = await db
      .select()
      .from(agents)
      .where(eq(agents.userId, ctx.user.id))
      .limit(1);

    if (!agentRecord) {
      throw new Error('Agent profile not found');
    }

    const agentId = agentRecord.id;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const today = new Date(now.setHours(0, 0, 0, 0));
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    // Active listings count
    const [activeListingsResult] = await db
      .select({ count: count() })
      .from(properties)
      .where(and(eq(properties.agentId, agentId), eq(properties.status, 'available')));

    // New leads this week
    const [newLeadsResult] = await db
      .select({ count: count() })
      .from(leads)
      .where(and(eq(leads.agentId, agentId), gte(leads.createdAt, weekAgo)));

    // Showings today
    const [showingsTodayResult] = await db
      .select({ count: count() })
      .from(showings)
      .where(
        and(
          eq(showings.agentId, agentId),
          gte(showings.scheduledAt, today),
          lte(showings.scheduledAt, tomorrow),
        ),
      );

    // Offers in progress
    const [offersInProgressResult] = await db
      .select({ count: count() })
      .from(offers)
      .where(and(eq(offers.agentId, agentId), eq(offers.status, 'pending')));

    // Pending commissions sum
    const [pendingCommissionsResult] = await db
      .select({ total: sql<number>`SUM(${commissions.amount})` })
      .from(commissions)
      .where(and(eq(commissions.agentId, agentId), eq(commissions.status, 'pending')));

    return {
      activeListings: activeListingsResult?.count || 0,
      newLeadsThisWeek: newLeadsResult?.count || 0,
      showingsToday: showingsTodayResult?.count || 0,
      offersInProgress: offersInProgressResult?.count || 0,
      commissionsPending: pendingCommissionsResult?.total || 0,
    };
  }),

  /**
   * Get leads pipeline for Kanban board
   */
  getLeadsPipeline: agentProcedure
    .input(
      z.object({
        filters: z
          .object({
            propertyId: z.number().optional(),
            source: z.string().optional(),
            dateRange: z
              .object({
                start: z.string().optional(),
                end: z.string().optional(),
              })
              .optional(),
          })
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();

      // Get agent record
      const [agentRecord] = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, ctx.user.id))
        .limit(1);

      if (!agentRecord) {
        throw new Error('Agent profile not found');
      }

      // Build conditions
      const conditions = [eq(leads.agentId, agentRecord.id)];

      if (input.filters?.propertyId) {
        conditions.push(eq(leads.propertyId, input.filters.propertyId));
      }

      if (input.filters?.source) {
        conditions.push(eq(leads.source, input.filters.source));
      }

      if (input.filters?.dateRange?.start) {
        conditions.push(gte(leads.createdAt, new Date(input.filters.dateRange.start)));
      }

      if (input.filters?.dateRange?.end) {
        conditions.push(lte(leads.createdAt, new Date(input.filters.dateRange.end)));
      }

      // Get all leads for this agent
      const leadsList = await db
        .select({
          lead: leads,
          property: properties,
        })
        .from(leads)
        .leftJoin(properties, eq(leads.propertyId, properties.id))
        .where(and(...conditions))
        .orderBy(leads.createdAt);

      // Group by pipeline stage
      const pipeline: Record<PipelineStage, any[]> = {
        new: [],
        contacted: [],
        viewing: [],
        offer: [],
        closed: [],
      };

      leadsList.forEach(({ lead, property }: { lead: any; property: any }) => {
        // Map lead status to pipeline stage
        let stage: PipelineStage = 'new';
        switch (lead.status) {
          case 'new':
            stage = 'new';
            break;
          case 'contacted':
          case 'qualified':
            stage = 'contacted';
            break;
          case 'viewing_scheduled':
            stage = 'viewing';
            break;
          case 'offer_sent':
          case 'converted':
            stage = 'offer';
            break;
          case 'closed':
            stage = 'closed';
            break;
          default:
            stage = 'new';
        }

        pipeline[stage].push({
          ...lead,
          property: property
            ? {
                id: property.id,
                title: property.title,
                city: property.city,
                price: property.price,
              }
            : null,
        });
      });

      return pipeline;
    }),

  /**
   * Move lead to different pipeline stage
   */
  moveLeadToStage: agentProcedure
    .input(
      z.object({
        leadId: z.number(),
        targetStage: z.enum(['new', 'contacted', 'viewing', 'offer', 'closed']),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();

      // Get agent record
      const [agentRecord] = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, ctx.user.id))
        .limit(1);

      if (!agentRecord) {
        throw new Error('Agent profile not found');
      }

      // Verify lead belongs to agent
      const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);

      if (!lead || lead.agentId !== agentRecord.id) {
        throw new Error('Lead not found or unauthorized');
      }

      // Map pipeline stage to lead status
      let newStatus = 'new';
      switch (input.targetStage) {
        case 'new':
          newStatus = 'new';
          break;
        case 'contacted':
          newStatus = 'contacted';
          break;
        case 'viewing':
          newStatus = 'viewing_scheduled';
          break;
        case 'offer':
          newStatus = 'offer_sent';
          break;
        case 'closed':
          newStatus = 'closed';
          break;
      }

      // Update lead status
      await db
        .update(leads)
        .set({
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, input.leadId));

      // Log activity
      await db.insert(leadActivities).values({
        leadId: input.leadId,
        agentId: agentRecord.id,
        activityType: 'status_change',
        description: input.notes || `Moved to ${input.targetStage} stage`,
      });

      // Create notification for lead assignment changes
      await db.insert(notifications).values({
        userId: ctx.user.id,
        type: 'lead_assigned',
        title: 'Lead Status Updated',
        content: `Lead "${lead.name}" moved to ${input.targetStage} stage`,
        data: JSON.stringify({ leadId: input.leadId, newStage: input.targetStage }),
      });

      return { success: true };
    }),

  /**
   * Get agent's listings with images
   */
  getMyListings: agentProcedure
    .input(
      z.object({
        status: z
          .enum(['all', 'available', 'sold', 'rented', 'pending', 'draft', 'published', 'archived'])
          .optional(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();

      // Get agent record
      const [agentRecord] = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, ctx.user.id))
        .limit(1);

      if (!agentRecord) {
        throw new Error('Agent profile not found');
      }

      // Build query conditions
      const conditions: any[] = [
        sql`(${properties.agentId} = ${agentRecord.id} OR ${properties.ownerId} = ${ctx.user.id})`
      ];
      if (input.status && input.status !== 'all') {
        conditions.push(eq(properties.status, input.status as any));
      }

      // Fetch properties
      const listings = await db
        .select()
        .from(properties)
        .where(and(...conditions))
        .orderBy(desc(properties.createdAt))
        .limit(input.limit);

      // Fetch primary images
      const listingsWithImages = await Promise.all(
        listings.map(async (property) => {
          const images = await db
            .select()
            .from(propertyImages)
            .where(eq(propertyImages.propertyId, property.id))
            .orderBy(propertyImages.displayOrder)
            .limit(1);

          const cdnUrl = ENV.cloudFrontUrl || `https://${ENV.s3BucketName}.s3.${ENV.awsRegion}.amazonaws.com`;
          const primaryImage = images.length > 0 
            ? (images[0].imageUrl.startsWith('http') ? images[0].imageUrl : `${cdnUrl}/${images[0].imageUrl}`)
            : null;

          return {
            ...property,
            primaryImage,
            imageCount: 0, // TODO: Get actual count
            enquiries: property.enquiries || 0,
          };
        })
      );

      return listingsWithImages;
    }),

  /**
   * Archive property
   */
  archiveProperty: agentProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      // Verify ownership - check both ownerId and agentId
      const [property] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, input.id))
        .limit(1);

      if (!property) {
        throw new Error('Property not found');
      }

      // Check if user owns this property (either as owner or as agent)
      const isOwner = property.ownerId === ctx.user.id;
      
      let isAgent = false;
      if (property.agentId) {
        const [agentRecord] = await db
          .select()
          .from(agents)
          .where(and(eq(agents.id, property.agentId), eq(agents.userId, ctx.user.id)))
          .limit(1);
        isAgent = !!agentRecord;
      }

      if (!isOwner && !isAgent) {
        throw new Error('Not authorized to archive this property');
      }

      await db.update(properties).set({ status: 'archived' }).where(eq(properties.id, input.id));
      return { success: true };
    }),

  /**
   * Delete property
   */
  deleteProperty: agentProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      // Verify ownership - check both ownerId and agentId
      const [property] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, input.id))
        .limit(1);

      if (!property) {
        throw new Error('Property not found');
      }

      // Check if user owns this property (either as owner or as agent)
      const isOwner = property.ownerId === ctx.user.id;
      
      let isAgent = false;
      if (property.agentId) {
        const [agentRecord] = await db
          .select()
          .from(agents)
          .where(and(eq(agents.id, property.agentId), eq(agents.userId, ctx.user.id)))
          .limit(1);
        isAgent = !!agentRecord;
      }

      if (!isOwner && !isAgent) {
        throw new Error('Not authorized to delete this property');
      }

      await db.delete(properties).where(eq(properties.id, input.id));
      return { success: true };
    }),

  /**
   * Get agent's leads with filtering
   */
  getMyLeads: agentProcedure
    .input(
      z.object({
        status: z
          .enum([
            'all',
            'new',
            'contacted',
            'qualified',
            'converted',
            'closed',
            'viewing_scheduled',
            'offer_sent',
            'lost',
          ])
          .optional(),
        limit: z.number().optional().default(100),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();

      // Get agent record
      const [agentRecord] = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, ctx.user.id))
        .limit(1);

      if (!agentRecord) {
        throw new Error('Agent profile not found');
      }

      // Build query conditions
      const conditions = [eq(leads.agentId, agentRecord.id)];
      if (input.status && input.status !== 'all') {
        conditions.push(eq(leads.status, input.status as any));
      }

      // Fetch leads with associated property info
      const leadsList = await db
        .select({
          lead: leads,
          property: properties,
        })
        .from(leads)
        .leftJoin(properties, eq(leads.propertyId, properties.id))
        .where(and(...conditions))
        .orderBy(desc(leads.createdAt))
        .limit(input.limit);

      return leadsList.map(({ lead, property }: { lead: any; property: any }) => ({
        ...lead,
        property: property
          ? {
              id: property.id,
              title: property.title,
              city: property.city,
              price: property.price,
            }
          : null,
      }));
    }),

  /**
   * Update lead status
   */
  updateLeadStatus: agentProcedure
    .input(
      z.object({
        leadId: z.number(),
        status: z.enum([
          'new',
          'contacted',
          'qualified',
          'converted',
          'closed',
          'viewing_scheduled',
          'offer_sent',
          'lost',
        ]),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();

      // Get agent record
      const [agentRecord] = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, ctx.user.id))
        .limit(1);

      if (!agentRecord) {
        throw new Error('Agent profile not found');
      }

      // Verify lead belongs to agent
      const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);

      if (!lead || lead.agentId !== agentRecord.id) {
        throw new Error('Lead not found or unauthorized');
      }

      // Update lead status
      await db
        .update(leads)
        .set({
          status: input.status,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, input.leadId));

      // Log activity
      await db.insert(leadActivities).values({
        leadId: input.leadId,
        agentId: agentRecord.id,
        activityType: 'status_change',
        description: input.notes || `Status changed to ${input.status}`,
      });

      return { success: true };
    }),

  /**
   * Add lead activity/note
   */
  addLeadActivity: agentProcedure
    .input(
      z.object({
        leadId: z.number(),
        activityType: z.enum([
          'call',
          'email',
          'meeting',
          'note',
          'status_change',
          'viewing_scheduled',
          'offer_sent',
        ]),
        description: z.string(),
        metadata: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();

      // Get agent record
      const [agentRecord] = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, ctx.user.id))
        .limit(1);

      if (!agentRecord) {
        throw new Error('Agent profile not found');
      }

      // Verify lead belongs to agent
      const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);

      if (!lead || lead.agentId !== agentRecord.id) {
        throw new Error('Lead not found or unauthorized');
      }

      // Add activity
      await db.insert(leadActivities).values({
        leadId: input.leadId,
        agentId: agentRecord.id,
        activityType: input.activityType,
        description: input.description,
        metadata: input.metadata,
      });

      // Update lead's updatedAt
      await db.update(leads).set({ updatedAt: new Date() }).where(eq(leads.id, input.leadId));

      return { success: true };
    }),

  /**
   * Get lead activities
   */
  getLeadActivities: agentProcedure
    .input(
      z.object({
        leadId: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();

      const activities = await db
        .select()
        .from(leadActivities)
        .where(eq(leadActivities.leadId, input.leadId))
        .orderBy(desc(leadActivities.createdAt));

      return activities;
    }),

  /**
   * Get agent's showings/calendar
   */
  getMyShowings: agentProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z.enum(['all', 'requested', 'confirmed', 'completed', 'cancelled']).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();

      // Get agent record
      const [agentRecord] = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, ctx.user.id))
        .limit(1);

      if (!agentRecord) {
        throw new Error('Agent profile not found');
      }

      // Build conditions
      const conditions = [eq(showings.agentId, agentRecord.id)];

      if (input.startDate) {
        conditions.push(gte(showings.scheduledAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(showings.scheduledAt, new Date(input.endDate)));
      }
      if (input.status && input.status !== 'all') {
        conditions.push(eq(showings.status, input.status as any));
      }

      // Fetch showings with property and lead info
      const showingsList = await db
        .select({
          showing: showings,
          property: properties,
          lead: leads,
        })
        .from(showings)
        .leftJoin(properties, eq(showings.propertyId, properties.id))
        .leftJoin(leads, eq(showings.leadId, leads.id))
        .where(and(...conditions))
        .orderBy(showings.scheduledAt);

      return showingsList.map(
        ({ showing, property, lead }: { showing: any; property: any; lead: any }) => ({
          ...showing,
          property: property
            ? {
                id: property.id,
                title: property.title,
                address: property.address,
                city: property.city,
              }
            : null,
          client: lead
            ? {
                name: lead.name,
                email: lead.email,
                phone: lead.phone,
              }
            : null,
        }),
      );
    }),

  /**
   * Update showing status
   */
  updateShowingStatus: agentProcedure
    .input(
      z.object({
        showingId: z.number(),
        status: z.enum(['requested', 'confirmed', 'completed', 'cancelled']),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();

      // Get agent record
      const [agentRecord] = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, ctx.user.id))
        .limit(1);

      if (!agentRecord) {
        throw new Error('Agent profile not found');
      }

      // Update showing
      await db
        .update(showings)
        .set({
          status: input.status,
          notes: input.notes || showings.notes,
          updatedAt: new Date(),
        })
        .where(and(eq(showings.id, input.showingId), eq(showings.agentId, agentRecord.id)));

      return { success: true };
    }),

  /**
   * Get agent's commissions
   */
  getMyCommissions: agentProcedure
    .input(
      z.object({
        status: z.enum(['all', 'pending', 'approved', 'paid', 'cancelled']).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();

      // Get agent record
      const [agentRecord] = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, ctx.user.id))
        .limit(1);

      if (!agentRecord) {
        throw new Error('Agent profile not found');
      }

      // Build conditions
      const conditions = [eq(commissions.agentId, agentRecord.id)];
      if (input.status && input.status !== 'all') {
        conditions.push(eq(commissions.status, input.status as any));
      }

      // Fetch commissions with property info
      const commissionsList = await db
        .select({
          commission: commissions,
          property: properties,
          lead: leads,
        })
        .from(commissions)
        .leftJoin(properties, eq(commissions.propertyId, properties.id))
        .leftJoin(leads, eq(commissions.leadId, leads.id))
        .where(and(...conditions))
        .orderBy(desc(commissions.createdAt));

      return commissionsList.map(
        ({ commission, property, lead }: { commission: any; property: any; lead: any }) => ({
          ...commission,
          property: property
            ? {
                id: property.id,
                title: property.title,
              }
            : null,
          client: lead
            ? {
                name: lead.name,
              }
            : null,
        }),
      );
    }),

  /**
   * Get performance analytics
   */
  getPerformanceAnalytics: agentProcedure
    .input(
      z.object({
        period: z.enum(['week', 'month', 'quarter', 'year']).optional().default('month'),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();

      // Get agent record
      const [agentRecord] = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, ctx.user.id))
        .limit(1);

      if (!agentRecord) {
        throw new Error('Agent profile not found');
      }

      const now = new Date();
      const periodDays = {
        week: 7,
        month: 30,
        quarter: 90,
        year: 365,
      }[input.period];
      const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

      // Leads contacted
      const [leadsContactedResult] = await db
        .select({ count: count() })
        .from(leads)
        .where(and(eq(leads.agentId, agentRecord.id), gte(leads.createdAt, startDate)));

      // Properties sold/rented
      const [propertiesClosedResult] = await db
        .select({ count: count() })
        .from(properties)
        .where(
          and(
            eq(properties.agentId, agentRecord.id),
            sql`${properties.status} IN ('sold', 'rented')`,
            gte(properties.updatedAt, startDate),
          ),
        );

      // Conversion rate (leads -> converted)
      const [totalLeadsResult] = await db
        .select({ count: count() })
        .from(leads)
        .where(and(eq(leads.agentId, agentRecord.id), gte(leads.createdAt, startDate)));

      const [convertedLeadsResult] = await db
        .select({ count: count() })
        .from(leads)
        .where(
          and(
            eq(leads.agentId, agentRecord.id),
            eq(leads.status, 'converted'),
            gte(leads.createdAt, startDate),
          ),
        );

      const totalLeads = totalLeadsResult?.count || 0;
      const convertedLeads = convertedLeadsResult?.count || 0;
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

      return {
        leadsContacted: leadsContactedResult?.count || 0,
        propertiesClosed: propertiesClosedResult?.count || 0,
        conversionRate: Math.round(conversionRate * 10) / 10,
        totalLeads,
        convertedLeads,
      };
    }),

  /**
   * Get notifications for the current agent
   */
  getNotifications: agentProcedure
    .input(
      z.object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
        unreadOnly: z.boolean().optional().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();

      const conditions = [eq(notifications.userId, ctx.user.id)];

      if (input.unreadOnly) {
        conditions.push(eq(notifications.isRead, 0));
      }

      const notificationsList = await db
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return notificationsList;
    }),

  /**
   * Mark notification as read
   */
  markNotificationAsRead: agentProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();

      await db
        .update(notifications)
        .set({ isRead: 1, readAt: new Date() })
        .where(
          and(eq(notifications.id, input.notificationId), eq(notifications.userId, ctx.user.id)),
        );

      return { success: true };
    }),

  /**
   * Mark all notifications as read
   */
  markAllNotificationsAsRead: agentProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();

    await db
      .update(notifications)
      .set({ isRead: 1, readAt: new Date() })
      .where(eq(notifications.userId, ctx.user.id));

    return { success: true };
  }),

  /**
   * Get unread notifications count
   */
  getUnreadNotificationCount: agentProcedure.query(async ({ ctx }) => {
    const db = await getDb();

    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, ctx.user.id), eq(notifications.isRead, 0)));

    return { count: result?.count || 0 };
  }),

  /**
   * Export commissions to CSV
   */
  exportCommissionsCSV: agentProcedure
    .input(
      z.object({
        status: z.enum(['all', 'pending', 'approved', 'paid', 'cancelled']).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();

      // Get agent record
      const [agentRecord] = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, ctx.user.id))
        .limit(1);

      if (!agentRecord) {
        throw new Error('Agent profile not found');
      }

      // Build conditions
      const conditions = [eq(commissions.agentId, agentRecord.id)];
      if (input.status && input.status !== 'all') {
        conditions.push(eq(commissions.status, input.status as any));
      }

      // Fetch commissions with property and lead info
      const commissionsList = await db
        .select({
          commission: commissions,
          property: properties,
          lead: leads,
        })
        .from(commissions)
        .leftJoin(properties, eq(commissions.propertyId, properties.id))
        .leftJoin(leads, eq(commissions.leadId, leads.id))
        .where(and(...conditions))
        .orderBy(desc(commissions.createdAt));

      // Generate CSV content
      const csvHeaders = [
        'Property',
        'Client',
        'Sale Price',
        'Commission %',
        'Amount',
        'Status',
        'Transaction Type',
        'Created Date',
        'Payout Date',
      ];

      const csvRows = commissionsList.map(({ commission, property, lead }) => [
        property?.title || 'N/A',
        lead?.name || 'N/A',
        commission.amount ? `R${(commission.amount / 100).toFixed(2)}` : 'N/A',
        commission.percentage ? `${(commission.percentage / 100).toFixed(2)}%` : 'N/A',
        commission.amount ? `R${(commission.amount / 100).toFixed(2)}` : 'N/A',
        commission.status,
        commission.transactionType,
        new Date(commission.createdAt).toLocaleDateString(),
        commission.payoutDate ? new Date(commission.payoutDate).toLocaleDateString() : 'N/A',
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      return {
        filename: `commissions-${input.status || 'all'}-${new Date().toISOString().split('T')[0]}.csv`,
        content: csvContent,
      };
    }),

  /**
   * Quick update property
   */
  quickUpdateProperty: agentProcedure
    .input(
      z.object({
        propertyId: z.number(),
        updates: z.object({
          price: z.number().optional(),
          status: z
            .enum(['available', 'sold', 'rented', 'pending', 'draft', 'published', 'archived'])
            .optional(),
          featured: z.boolean().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();

      // Get agent record
      const [agentRecord] = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, ctx.user.id))
        .limit(1);

      if (!agentRecord) {
        throw new Error('Agent profile not found');
      }

      // Verify property belongs to agent
      const [property] = await db
        .select()
        .from(properties)
        .where(and(eq(properties.id, input.propertyId), eq(properties.agentId, agentRecord.id)))
        .limit(1);

      if (!property) {
        throw new Error('Property not found or unauthorized');
      }

      // Update property
      const updateData: any = { ...input.updates, updatedAt: new Date() };
      if (input.updates.featured !== undefined) {
        updateData.featured = input.updates.featured ? 1 : 0;
      }

      await db.update(properties).set(updateData).where(eq(properties.id, input.propertyId));

      return { success: true };
    }),
});
