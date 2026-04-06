import { router } from './_core/trpc';
import { agentProcedure, publicProcedure } from './_core/trpc';
import { z } from 'zod';
import { getDb, getPlatformSetting } from './db';
import {
  properties,
  listings,
  leads,
  showings,
  commissions,
  offers,
  leadActivities,
  agents,
  propertyImages,
  users,
  notifications,
  analyticsEvents,
} from '../drizzle/schema';
import { eq, and, desc, gte, lte, sql, count, inArray, like, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { EmailService } from './_core/emailService';
import { ENV } from './_core/env';
import { nowAsDbTimestamp, toDbTimestampRequired } from './utils/dbTypeUtils';
import { requireUser } from './_core/requireUser';
import { slugify } from './_core/utils/slug';
import { recordAgentOsEvent } from './services/agentOsEventService';
import { getAgentEntitlementsForUserId } from './services/agentEntitlementService';
import { agentOnboardingService } from './services/agentOnboardingService';
import {
  getRuntimeSchemaCapabilities,
  warnSchemaCapabilityOnce,
} from './services/runtimeSchemaCapabilities';
import {
  getAgentInventorySchedulingOptions,
  getInventoryBridgeSchemaCapabilities,
  resolvePropertiesForListings,
  resolvePropertyForListing,
} from './services/inventoryLinkResolver';
import {
  getShowingsSchemaVariant,
  mapAgentShowingStatusToStorage,
  mapStorageShowingStatusToAgent,
  type AgentShowingStatus,
  type ShowingsSchemaDetails,
  type ShowingsSchemaVariant,
} from './services/showingsSchemaCompatibility';

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
const LIVE_AGENT_LISTING_STATUSES = ['available', 'published'] as const;

function buildAgentPublicSlug(agent: {
  id: number;
  slug?: string | null;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  if (agent.slug) return agent.slug;
  const label = agent.displayName || `${agent.firstName || ''} ${agent.lastName || ''}`.trim();
  const base = slugify(label) || 'agent';
  return `${base}-${agent.id}`;
}

function extractTrailingId(slug: string) {
  const match = slug.match(/-(\d+)$/);
  return match ? Number(match[1]) : null;
}

function parseTextList(value?: string | null) {
  if (!value) return [];
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function stringifyTextList(values?: string[]) {
  if (!values || values.length === 0) return null;
  return values
    .map(item => item.trim())
    .filter(Boolean)
    .join(', ');
}

function buildAgentInventoryConditions(userId: number, agentId: number | null, status?: string) {
  const conditions: SQL[] = [
    agentId
      ? or(eq(properties.agentId, agentId), eq(properties.ownerId, userId))!
      : eq(properties.ownerId, userId),
  ];

  if (status && status !== 'all') {
    if (status === 'active') {
      conditions.push(inArray(properties.status, [...LIVE_AGENT_LISTING_STATUSES]));
    } else {
      conditions.push(eq(properties.status, status as any));
    }
  }

  return conditions;
}

function parseSocialLinks(value?: string | null) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function splitDisplayName(displayName: string) {
  const trimmed = displayName.trim();
  const [firstName, ...rest] = trimmed.split(/\s+/);
  return {
    firstName: firstName || trimmed,
    lastName: rest.join(' '),
  };
}

function toAgentOnboardingResponse(agentRecord: typeof agents.$inferSelect | null) {
  if (!agentRecord) return null;

  return {
    ...agentRecord,
    specializations: parseTextList(agentRecord.specialization),
    propertyTypes: parseTextList(agentRecord.propertyTypes),
    areasServed: parseTextList(agentRecord.areasServed),
    languages: parseTextList(agentRecord.languages),
    socialLinks: parseSocialLinks(agentRecord.socialLinks),
  };
}

type RawAgentShowingRow = {
  id: number | string;
  listingId?: number | string | null;
  propertyId?: number | string | null;
  leadId?: number | string | null;
  agentId?: number | string | null;
  scheduledTime?: string | Date | null;
  scheduledAt?: string | Date | null;
  status?: string | null;
  notes?: string | null;
  feedback?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

function normalizeDbRows(result: any): Array<Record<string, unknown>> {
  if (Array.isArray(result)) {
    if (result.length > 0 && Array.isArray(result[0])) {
      return result[0] as Array<Record<string, unknown>>;
    }
    if (result.length > 0 && typeof result[0] === 'object') {
      return result as Array<Record<string, unknown>>;
    }
  }
  if (result && Array.isArray(result.rows)) {
    return result.rows as Array<Record<string, unknown>>;
  }
  return [];
}

function readCountValue(result: any): number {
  const row = normalizeDbRows(result)[0] || {};
  const value =
    row.count_value ??
    row.count ??
    row.COUNT ??
    row['COUNT(*)'] ??
    row['COUNT(1)'] ??
    Object.values(row)[0];
  const countValue = Number(value ?? 0);
  return Number.isFinite(countValue) ? countValue : 0;
}

function getShowingsDateColumn(variant: ShowingsSchemaVariant) {
  return sql.identifier(variant === 'current' ? 'scheduledTime' : 'scheduledAt');
}

function getShowingsIdColumn(details: ShowingsSchemaDetails, variant: ShowingsSchemaVariant) {
  if (variant === 'current' || (variant === 'hybrid' && details.listingIdColumn)) {
    return sql.identifier('listingId');
  }
  if (details.propertyIdColumn) {
    return sql.identifier('propertyId');
  }
  return sql`NULL`;
}

function getShowingsNotesColumn(details: ShowingsSchemaDetails) {
  return details.notesColumn ? sql.identifier('notes') : sql.identifier('feedback');
}

function normalizeAgentShowingRow(row: RawAgentShowingRow, variant: ShowingsSchemaVariant) {
  const listingIdRaw = row.listingId ?? row.propertyId ?? null;
  const scheduledAt = row.scheduledAt ?? row.scheduledTime ?? null;

  return {
    id: Number(row.id),
    listingId: listingIdRaw === null ? null : Number(listingIdRaw),
    propertyId: row.propertyId == null ? null : Number(row.propertyId),
    leadId: row.leadId == null ? null : Number(row.leadId),
    agentId: row.agentId == null ? null : Number(row.agentId),
    scheduledAt,
    scheduledTime: scheduledAt,
    status: mapStorageShowingStatusToAgent(row.status, variant),
    notes: row.notes ?? row.feedback ?? null,
    createdAt: row.createdAt ?? null,
    updatedAt: row.updatedAt ?? null,
    property: null,
    client: null,
  };
}

async function countAgentShowingsInRange(params: {
  db: any;
  agentId: number;
  startIso: string;
  endIso: string;
  details: ShowingsSchemaDetails;
}) {
  const variant = getShowingsSchemaVariant(params.details);
  if (variant === 'missing') return 0;

  const scheduledColumn = getShowingsDateColumn(variant);
  const result = await params.db.execute(sql`
    SELECT COUNT(*) AS count_value
    FROM showings
    WHERE agentId = ${params.agentId}
      AND ${scheduledColumn} >= ${params.startIso}
      AND ${scheduledColumn} <= ${params.endIso}
  `);

  return readCountValue(result);
}

async function countAgentPendingOffers(params: { db: any; agentId: number }) {
  const strategies = [
    sql`
      SELECT COUNT(*) AS count_value
      FROM offers
      WHERE agentId = ${params.agentId}
        AND status = ${'pending'}
    `,
    sql`
      SELECT COUNT(*) AS count_value
      FROM offers
      WHERE assigned_agent_id = ${params.agentId}
        AND status = ${'pending'}
    `,
    sql`
      SELECT COUNT(*) AS count_value
      FROM offers
      INNER JOIN listings ON offers.listingId = listings.id
      WHERE listings.agentId = ${params.agentId}
        AND offers.status = ${'pending'}
    `,
  ];

  let lastError: unknown;
  for (const statement of strategies) {
    try {
      const result = await params.db.execute(statement);
      return readCountValue(result);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

async function listAgentShowings(params: {
  db: any;
  agentId: number;
  startDate?: string;
  endDate?: string;
  status?: 'all' | AgentShowingStatus;
  details: ShowingsSchemaDetails;
}) {
  const variant = getShowingsSchemaVariant(params.details);
  if (variant === 'missing') return [];

  const scheduledColumn = getShowingsDateColumn(variant);
  const listingColumn = getShowingsIdColumn(params.details, variant);
  const leadColumn = params.details.leadIdColumn ? sql.identifier('leadId') : sql`NULL`;
  const notesColumn = getShowingsNotesColumn(params.details);
  const startCondition = params.startDate
    ? sql` AND ${scheduledColumn} >= ${new Date(params.startDate).toISOString()}`
    : sql``;
  const endCondition = params.endDate
    ? sql` AND ${scheduledColumn} <= ${new Date(params.endDate).toISOString()}`
    : sql``;
  const statusValue =
    params.status && params.status !== 'all'
      ? mapAgentShowingStatusToStorage(params.status, variant)
      : null;
  const statusCondition = statusValue ? sql` AND status = ${statusValue}` : sql``;

  const result = await params.db.execute(sql`
    SELECT
      id,
      ${listingColumn} AS listingId,
      ${params.details.propertyIdColumn ? sql.identifier('propertyId') : sql`NULL`} AS propertyId,
      ${leadColumn} AS leadId,
      agentId,
      ${scheduledColumn} AS scheduledAt,
      status,
      ${notesColumn} AS notes,
      createdAt,
      updatedAt
    FROM showings
    WHERE agentId = ${params.agentId}
    ${startCondition}
    ${endCondition}
    ${statusCondition}
    ORDER BY ${scheduledColumn}
  `);

  return normalizeDbRows(result).map(row =>
    normalizeAgentShowingRow(row as RawAgentShowingRow, variant),
  );
}

/**
 * Agent Router - Dashboard and CRM functionality for agents
 */
export const agentRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb();

    const records = await db
      .select()
      .from(agents)
      .where(eq(agents.status, 'approved'))
      .orderBy(desc(agents.isFeatured), desc(agents.updatedAt));

    return records.map(record => ({
      ...record,
      slug: buildAgentPublicSlug(record),
    }));
  }),

  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = await getDb();

    const [record] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, input.id), eq(agents.status, 'approved')))
      .limit(1);

    if (!record) return null;

    return {
      ...record,
      slug: buildAgentPublicSlug(record),
    };
  }),

  getPublicProfileBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(3) }))
    .query(async ({ input }) => {
      const db = await getDb();

      const [exactMatch] = await db
        .select()
        .from(agents)
        .where(and(eq(agents.slug, input.slug), eq(agents.status, 'approved')))
        .limit(1);

      if (exactMatch) {
        return {
          ...exactMatch,
          slug: buildAgentPublicSlug(exactMatch),
        };
      }

      const fallbackId = extractTrailingId(input.slug);
      if (!fallbackId) return null;

      const [fallbackRecord] = await db
        .select()
        .from(agents)
        .where(and(eq(agents.id, fallbackId), eq(agents.status, 'approved')))
        .limit(1);

      if (!fallbackRecord) return null;

      const fallbackSlug = buildAgentPublicSlug(fallbackRecord);
      if (fallbackSlug !== input.slug) return null;

      return {
        ...fallbackRecord,
        slug: fallbackSlug,
      };
    }),

  getPublicProfileRouteById: publicProcedure
    .input(z.object({ agentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();

      const [record] = await db
        .select({
          id: agents.id,
          slug: agents.slug,
          displayName: agents.displayName,
          firstName: agents.firstName,
          lastName: agents.lastName,
        })
        .from(agents)
        .where(and(eq(agents.id, input.agentId), eq(agents.status, 'approved')))
        .limit(1);

      if (!record) return null;

      return {
        slug: buildAgentPublicSlug(record),
      };
    }),

  /**
   * Get agent's dashboard KPIs
   */
  getDashboardStats: agentProcedure.query(
    async ({
      ctx,
    }): Promise<{
      activeListings: number;
      newLeadsThisWeek: number;
      showingsToday: number;
      offersInProgress: number;
      commissionsPending: number;
    }> => {
      try {
        const db = await getDb();
        const capabilities = await getRuntimeSchemaCapabilities();
        const userId = requireUser(ctx).id;

        // Get agent record from user
        const [agentRecord] = await db
          .select()
          .from(agents)
          .where(eq(agents.userId, userId))
          .limit(1);
        const agentId = agentRecord?.id ?? null;
        // Date calculations
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        const tomorrowDate = new Date(todayDate);
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);

        const today = todayDate.toISOString();
        const tomorrow = tomorrowDate.toISOString();
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        // Active listings count
        const [activeListingsResult] = await db
          .select({ count: count() })
          .from(properties)
          .where(and(...buildAgentInventoryConditions(userId, agentId, 'active')));

        let newLeadsResult: { count: number } | undefined;
        let pendingCommissionsResult: { total: number | null } | undefined;
        let showingsTodayCount = 0;
        let offersInProgressCount = 0;

        if (agentId) {
          [newLeadsResult] = await db
            .select({ count: count() })
            .from(leads)
            .where(and(eq(leads.agentId, agentId), gte(leads.createdAt, weekAgo)));

          showingsTodayCount = capabilities.showingsReady
            ? await countAgentShowingsInRange({
                db,
                agentId,
                startIso: today,
                endIso: tomorrow,
                details: capabilities.showingsDetails,
              })
            : 0;

          offersInProgressCount = await countAgentPendingOffers({
            db,
            agentId,
          });

          [pendingCommissionsResult] = await db
            .select({ total: sql<number>`SUM(${commissions.amount})` })
            .from(commissions)
            .where(and(eq(commissions.agentId, agentId), eq(commissions.status, 'pending')));
        }

        return {
          activeListings: activeListingsResult?.count || 0,
          newLeadsThisWeek: newLeadsResult?.count || 0,
          showingsToday: showingsTodayCount,
          offersInProgress: offersInProgressCount,
          commissionsPending: Number(pendingCommissionsResult?.total || 0),
        };
      } catch (error) {
        console.warn('[agent.getDashboardStats] Returning safe defaults due to error:', error);
        return {
          activeListings: 0,
          newLeadsThisWeek: 0,
          showingsToday: 0,
          offersInProgress: 0,
          commissionsPending: 0,
        };
      }
    },
  ),

  getActivationMilestones: agentProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const userId = requireUser(ctx).id;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const milestoneEvents = [
      'agent_profile_completed',
      'agent_profile_published',
      'agent_listing_created',
      'agent_listing_live',
      'agent_lead_received',
      'agent_lead_stage_updated',
      'agent_crm_action_logged',
      'agent_showing_booked',
      'agent_showing_updated',
      'agent_showing_completed',
      'agent_dashboard_viewed',
      'agent_analytics_viewed',
    ] as const;

    const events = await db
      .select({
        eventType: analyticsEvents.eventType,
        createdAt: analyticsEvents.createdAt,
      })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.userId, userId),
          inArray(analyticsEvents.eventType, milestoneEvents),
        ),
      )
      .orderBy(desc(analyticsEvents.createdAt));

    const firstSeen: Record<string, string | null> = {};
    for (const event of milestoneEvents) {
      firstSeen[event] = null;
    }

    [...events].reverse().forEach(event => {
      if (event.eventType in firstSeen) {
        firstSeen[event.eventType] = event.createdAt;
      }
    });

    const weeklyEvents = events.filter(event => event.createdAt >= weekAgo);
    const weeklyEventTypes = new Set(weeklyEvents.map(event => event.eventType));

    return {
      milestones: firstSeen,
      weeklyActive: {
        core:
          weeklyEventTypes.has('agent_listing_created') ||
          weeklyEventTypes.has('agent_lead_received') ||
          weeklyEventTypes.has('agent_crm_action_logged') ||
          weeklyEventTypes.has('agent_showing_completed') ||
          weeklyEventTypes.has('agent_showing_updated'),
        crm:
          weeklyEventTypes.has('agent_lead_received') ||
          weeklyEventTypes.has('agent_lead_stage_updated') ||
          weeklyEventTypes.has('agent_crm_action_logged'),
        scheduling:
          weeklyEventTypes.has('agent_showing_booked') ||
          weeklyEventTypes.has('agent_showing_updated') ||
          weeklyEventTypes.has('agent_showing_completed'),
        qualified:
          (weeklyEventTypes.has('agent_lead_received') ||
            weeklyEventTypes.has('agent_lead_stage_updated') ||
            weeklyEventTypes.has('agent_crm_action_logged')) &&
          (weeklyEventTypes.has('agent_showing_booked') ||
            weeklyEventTypes.has('agent_showing_updated') ||
            weeklyEventTypes.has('agent_showing_completed')),
      },
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
        .where(eq(agents.userId, requireUser(ctx).id))
        .limit(1);

      if (!agentRecord) {
        throw new Error('Agent profile not found');
      }

      // Build conditions
      const conditions: SQL[] = [eq(leads.agentId, agentRecord.id)];

      if (input.filters?.propertyId) {
        conditions.push(eq(leads.propertyId, input.filters.propertyId));
      }

      if (input.filters?.source) {
        conditions.push(
          or(eq(leads.source, input.filters.source), eq(leads.leadSource, input.filters.source))!,
        );
      }

      if (input.filters?.dateRange?.start) {
        conditions.push(
          gte(leads.createdAt, new Date(input.filters.dateRange.start).toISOString()),
        );
      }

      if (input.filters?.dateRange?.end) {
        conditions.push(lte(leads.createdAt, new Date(input.filters.dateRange.end).toISOString()));
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
        .orderBy(desc(leads.createdAt));

      // Define Output Type
      interface LeadPipelineItem {
        id: number;
        name: string;
        email: string;
        phone: string;
        status: string;
        source: string;
        notes: string | null;
        createdAt: string | Date;
        property: {
          id: number;
          title: string;
          city: string;
          price: number;
        } | null;
      }

      // Group by pipeline stage
      const pipeline: Record<PipelineStage, LeadPipelineItem[]> = {
        new: [],
        contacted: [],
        viewing: [],
        offer: [],
        closed: [],
      };

      leadsList.forEach(({ lead, property }) => {
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
          case 'lost':
            stage = 'closed';
            break;
          default:
            stage = 'new';
        }

        pipeline[stage].push({
          id: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          status: lead.status,
          source: lead.leadSource || lead.source || 'web',
          notes: lead.notes,
          createdAt: lead.createdAt || new Date(),
          property: property
            ? {
                id: property.id,
                title: property.title,
                city: property.city,
                price: Number(property.price),
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
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
      const db = await getDb();

      // Get agent record
      const [agentRecord] = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, requireUser(ctx).id))
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
          updatedAt: nowAsDbTimestamp(),
        })
        .where(eq(leads.id, input.leadId));

      // Log activity
      await db.insert(leadActivities).values({
        leadId: input.leadId,
        userId: requireUser(ctx).id,
        type: 'status_change',
        description: input.notes || `Moved to ${input.targetStage} stage`,
      });

      // Create notification for lead assignment changes
      await db.insert(notifications).values({
        userId: requireUser(ctx).id,
        type: 'lead_assigned',
        title: 'Lead Status Updated',
        content: `Lead "${lead.name}" moved to ${input.targetStage} stage`,
        data: JSON.stringify({ leadId: input.leadId, newStage: input.targetStage }),
        isRead: 0,
      });

      await recordAgentOsEvent({
        userId: requireUser(ctx).id,
        eventType: 'agent_lead_stage_updated',
        eventData: {
          leadId: input.leadId,
          targetStage: input.targetStage,
          leadStatus: newStatus,
        },
        req: ctx.req,
        requestId: ctx.requestId,
      });

      return { success: true };
    }),

  /**
   * Get agent's listings with images
   * Get agent's listings
   */
  getMyListings: agentProcedure
    .input(
      z.object({
        status: z.string().optional(),
        limit: z.number().default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const user = requireUser(ctx);

      // Try to get agent record, but don't fail if it doesn't exist
      const [agentRecord] = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, user.id))
        .limit(1);

      // Build conditions - use agentId if profile exists, otherwise use ownerId
      const conditions = buildAgentInventoryConditions(
        user.id,
        agentRecord?.id ?? null,
        input.status,
      );

      const listings = await db
        .select()
        .from(properties)
        .where(and(...conditions))
        .orderBy(desc(properties.createdAt))
        .limit(input.limit);

      // Fetch primary images
      const listingsWithImages = await Promise.all(
        listings.map(async property => {
          const images = await db
            .select()
            .from(propertyImages)
            .where(eq(propertyImages.propertyId, property.id))
            .orderBy(propertyImages.displayOrder)
            .limit(1);

          const cdnUrl =
            ENV.cloudFrontUrl || `https://${ENV.s3BucketName}.s3.${ENV.awsRegion}.amazonaws.com`;
          const primaryImage =
            images.length > 0
              ? images[0].imageUrl.startsWith('http')
                ? images[0].imageUrl
                : `${cdnUrl}/${images[0].imageUrl}`
              : null;

          return {
            ...property,
            primaryImage,
            imageCount: 0, // TODO: Get actual count
            enquiries: property.enquiries || 0,
          };
        }),
      );

      return listingsWithImages;
    }),

  getShowingListingOptions: agentProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const userId = requireUser(ctx).id;

    const [agentRecord] = await db
      .select({ id: agents.id })
      .from(agents)
      .where(eq(agents.userId, userId))
      .limit(1);

    const allowLegacySetting = await getPlatformSetting(
      'agent_os_allow_legacy_scheduling_inventory',
    );
    let allowLegacyFallback = true;
    if (allowLegacySetting != null) {
      try {
        allowLegacyFallback = Boolean(JSON.parse(String(allowLegacySetting.settingValue)));
      } catch {
        allowLegacyFallback = true;
      }
    }

    return getAgentInventorySchedulingOptions(db, userId, agentRecord?.id ?? null, {
      allowLegacyFallback,
    });
  }),

  /**
   * Archive property
   */
  archiveProperty: agentProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
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
      const isOwner = property.ownerId === requireUser(ctx).id;

      let isAgent = false;
      if (property.agentId) {
        const [agentRecord] = await db
          .select()
          .from(agents)
          .where(and(eq(agents.id, property.agentId), eq(agents.userId, requireUser(ctx).id)))
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
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
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
      const isOwner = property.ownerId === requireUser(ctx).id;

      let isAgent = false;
      if (property.agentId) {
        const [agentRecord] = await db
          .select()
          .from(agents)
          .where(and(eq(agents.id, property.agentId), eq(agents.userId, requireUser(ctx).id)))
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
   * Create agent profile
   */
  createProfile: agentProcedure
    .input(
      z.object({
        displayName: z.string().min(2).max(100),
        phone: z.string().min(10).max(20),
        bio: z.string().max(1000).optional(),
        profilePhoto: z.string().optional(),
        licenseNumber: z.string().optional(),
        specializations: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ success: boolean; agentId: number }> => {
      const db = await getDb();

      // Check if agent profile already exists
      const [existing] = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, requireUser(ctx).id))
        .limit(1);

      if (existing) {
        throw new Error('Agent profile already exists');
      }

      // Create agent profile
      const agentId = await db.createAgentProfile({
        userId: requireUser(ctx).id,
        displayName: input.displayName,
        phone: input.phone,
        bio: input.bio,
        profilePhoto: input.profilePhoto,
        licenseNumber: input.licenseNumber,
        specializations: input.specializations,
      });

      await recordAgentOsEvent({
        userId: requireUser(ctx).id,
        eventType: 'agent_profile_completed',
        eventData: {
          agentId,
          displayName: input.displayName,
          hasBio: Boolean(input.bio),
          hasLicenseNumber: Boolean(input.licenseNumber),
        },
        req: ctx.req,
        requestId: ctx.requestId,
      });

      return { success: true, agentId };
    }),

  getMyProfileOnboarding: agentProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const userId = requireUser(ctx).id;

    const [agentRecord] = await db.select().from(agents).where(eq(agents.userId, userId)).limit(1);

    const entitlements = await getAgentEntitlementsForUserId(userId);

    return {
      agent: toAgentOnboardingResponse(agentRecord || null),
      entitlements,
    };
  }),

  updateMyProfileOnboarding: agentProcedure
    .input(
      z.object({
        displayName: z.string().min(2).max(100),
        phone: z.string().min(7).max(20),
        whatsapp: z.string().max(50).optional(),
        profileImage: z.string().optional(),
        areasServed: z.array(z.string()).optional(),
        focus: z.enum(['sales', 'rentals', 'both']).optional(),
        specializations: z.array(z.string()).optional(),
        propertyTypes: z.array(z.string()).optional(),
        bio: z.string().max(1000).optional(),
        licenseNumber: z.string().max(100).optional(),
        yearsExperience: z.number().min(0).max(80).optional(),
        languages: z.array(z.string()).optional(),
        socialLinks: z
          .object({
            website: z.string().optional(),
            facebook: z.string().optional(),
            instagram: z.string().optional(),
            linkedin: z.string().optional(),
            twitter: z.string().optional(),
          })
          .optional(),
        slug: z.string().max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = requireUser(ctx).id;
      const db = await getDb();
      const result = await agentOnboardingService.saveProfile(userId, input);
      const agentId = result.profile?.id;
      const entitlements = result.entitlements;

      if (agentId && entitlements && entitlements.profileCompletionScore >= 70) {
        const [existingCompletionEvent] = await db
          .select({ id: analyticsEvents.id })
          .from(analyticsEvents)
          .where(
            and(
              eq(analyticsEvents.userId, userId),
              eq(analyticsEvents.eventType, 'agent_profile_completed'),
            ),
          )
          .limit(1);

        if (!existingCompletionEvent) {
          await recordAgentOsEvent({
            userId,
            eventType: 'agent_profile_completed',
            eventData: {
              agentId,
              profileCompletionScore: entitlements.profileCompletionScore,
              profileCompletionFlags: entitlements.profileCompletionFlags,
            },
            req: ctx.req,
            requestId: ctx.requestId,
          });
        }
      }

      return {
        success: result.success,
        agent: result.profile,
        entitlements: result.entitlements,
      };
    }),

  publishProfile: agentProcedure
    .input(
      z
        .object({
          forceSlugRefresh: z.boolean().optional(),
        })
        .optional(),
    )
    .mutation(
      async ({
        ctx,
        input,
      }): Promise<{
        success: boolean;
        agentId: number;
        slug: string;
        isPublic: boolean;
        status: string;
        approvalState: 'live' | 'pending_approval';
      }> => {
        const db = await getDb();
        const userId = requireUser(ctx).id;

        const [agentRecord] = await db
          .select()
          .from(agents)
          .where(eq(agents.userId, userId))
          .limit(1);

        if (!agentRecord) {
          throw new Error('Agent profile not found');
        }

        if (agentRecord.status === 'rejected' || agentRecord.status === 'suspended') {
          throw new Error('This profile cannot be published in its current state');
        }

        let nextSlug =
          input?.forceSlugRefresh || !agentRecord.slug
            ? buildAgentPublicSlug(agentRecord)
            : agentRecord.slug;

        if (!nextSlug) {
          nextSlug = `agent-${agentRecord.id}`;
        }

        let suffix = 1;
        while (true) {
          const [existingSlug] = await db
            .select({ id: agents.id })
            .from(agents)
            .where(and(eq(agents.slug, nextSlug), sql`${agents.id} <> ${agentRecord.id}`))
            .limit(1);

          if (!existingSlug) break;

          suffix += 1;
          nextSlug = `${buildAgentPublicSlug(agentRecord)}-${suffix}`;
        }

        await db
          .update(agents)
          .set({
            slug: nextSlug,
            updatedAt: nowAsDbTimestamp(),
          })
          .where(eq(agents.id, agentRecord.id));

        const isPublic = agentRecord.status === 'approved';

        if (isPublic) {
          const [existingPublishEvent] = await db
            .select({ id: analyticsEvents.id })
            .from(analyticsEvents)
            .where(
              and(
                eq(analyticsEvents.userId, userId),
                eq(analyticsEvents.eventType, 'agent_profile_published'),
              ),
            )
            .limit(1);

          if (!existingPublishEvent) {
            await recordAgentOsEvent({
              userId,
              eventType: 'agent_profile_published',
              eventData: {
                agentId: agentRecord.id,
                slug: nextSlug,
              },
              req: ctx.req,
              requestId: ctx.requestId,
            });
          }
        }

        return {
          success: true,
          agentId: agentRecord.id,
          slug: nextSlug,
          isPublic,
          status: agentRecord.status,
          approvalState: isPublic ? 'live' : 'pending_approval',
        };
      },
    ),

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
      const inventoryBridgeCapabilities = await getInventoryBridgeSchemaCapabilities(db);

      // Get agent record
      const [agentRecord] = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, requireUser(ctx).id))
        .limit(1);

      if (!agentRecord) {
        throw new Error('Agent profile not found');
      }

      // Build query conditions
      const conditions: SQL[] = [eq(leads.agentId, agentRecord.id)];
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

      return leadsList.map(({ lead, property }) => ({
        ...lead,
        property: property
          ? {
              id: property.id,
              title: property.title,
              city: property.city,
              price: Number(property.price),
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
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
      const db = await getDb();

      // Get agent record
      const [agentRecord] = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, requireUser(ctx).id))
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
          updatedAt: nowAsDbTimestamp(),
        })
        .where(eq(leads.id, input.leadId));

      // Log activity
      await db.insert(leadActivities).values({
        leadId: input.leadId,
        userId: requireUser(ctx).id,
        type: 'status_change',
        description: input.notes || `Status changed to ${input.status}`,
      });

      await recordAgentOsEvent({
        userId: requireUser(ctx).id,
        eventType: 'agent_lead_stage_updated',
        eventData: {
          leadId: input.leadId,
          leadStatus: input.status,
          source: 'updateLeadStatus',
        },
        req: ctx.req,
        requestId: ctx.requestId,
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
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
      const db = await getDb();

      // Get agent record
      const [agentRecord] = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, requireUser(ctx).id))
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
        userId: requireUser(ctx).id,
        type:
          input.activityType === 'viewing_scheduled' || input.activityType === 'offer_sent'
            ? 'status_change'
            : input.activityType,
        description: input.description,
      });

      // Update lead's updatedAt
      await db
        .update(leads)
        .set({ updatedAt: nowAsDbTimestamp() })
        .where(eq(leads.id, input.leadId));

      await recordAgentOsEvent({
        userId: requireUser(ctx).id,
        eventType: 'agent_crm_action_logged',
        eventData: {
          leadId: input.leadId,
          activityType: input.activityType,
        },
        req: ctx.req,
        requestId: ctx.requestId,
      });

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
    .query(async ({ ctx, input }): Promise<(typeof leadActivities.$inferSelect)[]> => {
      const db = await getDb();

      const [agentRecord] = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, requireUser(ctx).id))
        .limit(1);

      if (!agentRecord) {
        throw new Error('Agent profile not found');
      }

      const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);

      if (!lead || lead.agentId !== agentRecord.id) {
        throw new Error('Lead not found or unauthorized');
      }

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
        status: z.enum(['all', 'scheduled', 'completed', 'cancelled', 'no_show']).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const capabilities = await getRuntimeSchemaCapabilities();
        if (!capabilities.showingsReady) {
          warnSchemaCapabilityOnce(
            'agent-getMyShowings-schema-not-ready',
            '[agent.getMyShowings] Showings schema not ready. Returning empty showings.',
            capabilities.showingsDetails,
          );
          return [];
        }

        const [agentRecord] = await db
          .select()
          .from(agents)
          .where(eq(agents.userId, requireUser(ctx).id))
          .limit(1);

        if (!agentRecord) {
          return [];
        }

        return await listAgentShowings({
          db,
          agentId: agentRecord.id,
          startDate: input.startDate,
          endDate: input.endDate,
          status: input.status,
          details: capabilities.showingsDetails,
        });
      } catch (error) {
        console.warn('[agent.getMyShowings] Returning empty showings due to error:', error);
        return [];
      }
    }),

  bookShowing: agentProcedure
    .input(
      z.object({
        listingId: z.number(),
        scheduledAt: z.string().min(10),
        durationMinutes: z.number().min(15).max(240).optional(),
        visitorName: z.string().min(2).max(150),
        notes: z.string().max(2000).optional(),
        leadId: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ success: boolean; showingId: number }> => {
      const db = await getDb();
      const userId = requireUser(ctx).id;

      const [agentRecord] = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, userId))
        .limit(1);

      if (!agentRecord) {
        throw new Error('Agent profile not found');
      }

      const [listingRecord] = await db
        .select({
          id: listings.id,
          ownerId: listings.ownerId,
          agentId: listings.agentId,
          title: listings.title,
          address: listings.address,
          city: listings.city,
          province: listings.province,
          status: listings.status,
        })
        .from(listings)
        .where(eq(listings.id, input.listingId))
        .limit(1);

      if (!listingRecord) {
        throw new Error('Listing not found');
      }

      const isOwner = listingRecord.ownerId === userId;
      const isAssignedAgent = listingRecord.agentId === agentRecord.id;
      if (!isOwner && !isAssignedAgent) {
        throw new Error('Not authorized to book showings for this listing');
      }

      const resolvedInventory = await resolvePropertyForListing(db, {
        id: listingRecord.id,
        ownerId: listingRecord.ownerId,
        agentId: listingRecord.agentId ?? null,
        title: listingRecord.title,
        address: listingRecord.address,
        city: listingRecord.city,
        province: listingRecord.province,
        status: listingRecord.status,
      });

      const allowLegacySetting = await getPlatformSetting(
        'agent_os_allow_legacy_scheduling_inventory',
      );
      let allowLegacyFallback = true;
      if (allowLegacySetting != null) {
        try {
          allowLegacyFallback = Boolean(JSON.parse(String(allowLegacySetting.settingValue)));
        } catch {
          allowLegacyFallback = true;
        }
      }

      if (!allowLegacyFallback && resolvedInventory.propertyId == null) {
        throw new Error(
          'This listing is not yet linked to Agent OS inventory. Legacy scheduling fallback is disabled.',
        );
      }

      let leadRecord: typeof leads.$inferSelect | null = null;
      if (input.leadId) {
        const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);

        if (!lead || lead.agentId !== agentRecord.id) {
          throw new Error('Lead not found or unauthorized');
        }

        const persistedLead = lead;
        leadRecord = persistedLead;

        if (
          persistedLead.propertyId != null &&
          resolvedInventory.propertyId != null &&
          Number(persistedLead.propertyId) !== Number(resolvedInventory.propertyId)
        ) {
          throw new Error('Selected listing does not match the lead inventory');
        }
      }

      const capabilities = await getRuntimeSchemaCapabilities();
      const variant = getShowingsSchemaVariant(capabilities.showingsDetails);
      if (variant === 'missing') {
        throw new Error('Showings schema not ready');
      }

      const showingColumns = [
        sql.identifier('listingId'),
        sql.identifier('agentId'),
        sql.identifier('visitorName'),
        getShowingsDateColumn(variant),
        sql.identifier('durationMinutes'),
        sql.identifier('status'),
      ];
      const showingValues = [
        sql`${input.listingId}`,
        sql`${agentRecord.id}`,
        sql`${input.visitorName}`,
        sql`${toDbTimestampRequired(input.scheduledAt)}`,
        sql`${input.durationMinutes ?? 30}`,
        sql`${mapAgentShowingStatusToStorage('scheduled', variant)}`,
      ];

      if (capabilities.showingsDetails.propertyIdColumn) {
        showingColumns.push(sql.identifier('propertyId'));
        showingValues.push(sql`${resolvedInventory.propertyId}`);
      }

      if (capabilities.showingsDetails.leadIdColumn) {
        showingColumns.push(sql.identifier('leadId'));
        showingValues.push(sql`${leadRecord?.id ?? null}`);
      }

      if (capabilities.showingsDetails.notesColumn) {
        showingColumns.push(sql.identifier('notes'));
        showingValues.push(sql`${input.notes || null}`);
      } else {
        showingColumns.push(sql.identifier('feedback'));
        showingValues.push(sql`${input.notes || null}`);
      }

      const insertResult = await db.execute(sql`
        INSERT INTO showings (${sql.join(showingColumns, sql`, `)})
        VALUES (${sql.join(showingValues, sql`, `)})
      `);

      const insertRows = Array.isArray(insertResult) ? insertResult : [insertResult];
      const showingId = Number(
        (insertRows[0] as any)?.insertId ??
          (insertRows[0] as any)?.lastInsertRowid ??
          (insertResult as any)?.insertId,
      );

      if (leadRecord) {
        const persistedLead = leadRecord;

        await db
          .update(leads)
          .set({
            status: 'viewing_scheduled',
            updatedAt: nowAsDbTimestamp(),
          })
          .where(eq(leads.id, persistedLead.id));

        await db.insert(leadActivities).values({
          leadId: persistedLead.id,
          userId,
          type: 'status_change',
          description: `Showing booked for ${new Date(input.scheduledAt).toLocaleString()}`,
        });

        await recordAgentOsEvent({
          userId,
          eventType: 'agent_crm_action_logged',
          eventData: {
            leadId: persistedLead.id,
            activityType: 'viewing_scheduled',
            showingId,
          },
          req: ctx.req,
          requestId: ctx.requestId,
        });
      }

      await recordAgentOsEvent({
        userId,
        eventType: 'agent_showing_booked',
        eventData: {
          showingId,
          listingId: input.listingId,
          propertyId: resolvedInventory.propertyId,
          leadId: input.leadId ?? null,
        },
        req: ctx.req,
        requestId: ctx.requestId,
      });

      return { success: true, showingId };
    }),

  /**
   * Update showing status
   */
  updateShowingStatus: agentProcedure
    .input(
      z.object({
        showingId: z.number(),
        status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
      const db = await getDb();
      const capabilities = await getRuntimeSchemaCapabilities();

      // Get agent record
      const [agentRecord] = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, requireUser(ctx).id))
        .limit(1);

      if (!agentRecord) {
        throw new Error('Agent profile not found');
      }

      const variant = getShowingsSchemaVariant(capabilities.showingsDetails);
      if (variant === 'missing') {
        throw new Error('Showings schema not ready');
      }

      const nextStatus = mapAgentShowingStatusToStorage(input.status, variant);
      const notesAssignment = capabilities.showingsDetails.notesColumn
        ? sql`, notes = ${input.notes ?? null}`
        : sql`, feedback = ${input.notes ?? null}`;
      const result = await db.execute(sql`
        UPDATE showings
        SET status = ${nextStatus},
            updatedAt = ${nowAsDbTimestamp()}
            ${notesAssignment}
        WHERE id = ${input.showingId} AND agentId = ${agentRecord.id}
      `);

      const affectedRows = Number(
        (result as any)?.affectedRows ?? (result as any)?.[0]?.affectedRows ?? 0,
      );
      if (affectedRows === 0) {
        throw new Error('Showing not found or unauthorized');
      }

      await recordAgentOsEvent({
        userId: requireUser(ctx).id,
        eventType:
          input.status === 'completed' ? 'agent_showing_completed' : 'agent_showing_updated',
        eventData: {
          showingId: input.showingId,
          status: input.status,
          hasNotes: Boolean(input.notes),
        },
        req: ctx.req,
        requestId: ctx.requestId,
      });

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
        .where(eq(agents.userId, requireUser(ctx).id))
        .limit(1);

      if (!agentRecord) {
        throw new Error('Agent profile not found');
      }

      // Build conditions
      const conditions: SQL[] = [eq(commissions.agentId, agentRecord.id)];
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
        .where(eq(agents.userId, requireUser(ctx).id))
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
      const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString();

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

      const conditions = [eq(notifications.userId, requireUser(ctx).id)];

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
          and(
            eq(notifications.id, input.notificationId),
            eq(notifications.userId, requireUser(ctx).id),
          ),
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
      .where(eq(notifications.userId, requireUser(ctx).id));

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
      .where(and(eq(notifications.userId, requireUser(ctx).id), eq(notifications.isRead, 0)));

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
        .where(eq(agents.userId, requireUser(ctx).id))
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
        .where(eq(agents.userId, requireUser(ctx).id))
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
      const updateData: any = { ...input.updates, updatedAt: nowAsDbTimestamp() };
      if (input.updates.featured !== undefined) {
        updateData.featured = input.updates.featured ? 1 : 0;
      }

      await db.update(properties).set(updateData).where(eq(properties.id, input.propertyId));

      return { success: true };
    }),
});
