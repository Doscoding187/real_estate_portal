import { router, agentProcedure, publicProcedure } from './_core/trpc';
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
  demandCampaigns,
  demandLeadAssignments,
  demandLeadMatches,
} from '../drizzle/schema';
import { eq, and, desc, gte, lte, sql, count, inArray, like, or, ne } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { EmailService } from './_core/emailService';
import { ENV } from './_core/env';
import { nowAsDbTimestamp } from './utils/dbTypeUtils';
import { requireUser } from './_core/requireUser';
import {
  calculateAgentProfileCompletion,
  getAgentEntitlementsForUserId,
} from './services/agentEntitlementService';
import { getRuntimeSchemaCapabilities, warnSchemaCapabilityOnce } from './services/runtimeSchemaCapabilities';

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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function splitCsv(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function parseSocialLinks(value: string | null | undefined): Record<string, string> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') {
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>)
          .filter(([, item]) => typeof item === 'string')
          .map(([key, item]) => [key, String(item)]),
      );
    }
  } catch {
    // no-op
  }
  return {};
}

function parseFlags(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(item => String(item)) : [];
  } catch {
    return [];
  }
}

/**
 * Agent Router - Dashboard and CRM functionality for agents
 */
export const agentRouter = router({
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

        // Get agent record from user
        const [agentRecord] = await db
          .select()
          .from(agents)
          .where(eq(agents.userId, requireUser(ctx).id))
          .limit(1);

        if (!agentRecord) {
          // Return empty stats if no agent profile found
          return {
            activeListings: 0,
            newLeadsThisWeek: 0,
            showingsToday: 0,
            offersInProgress: 0,
            commissionsPending: 0,
          };
        }

        const agentId = agentRecord.id;
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
              gte(showings.scheduledTime, today),
              lte(showings.scheduledTime, tomorrow),
            ),
          );

        // Offers in progress
        const [offersInProgressResult] = await db
          .select({ count: count() })
          .from(offers)
          .where(and(eq((offers as any).agentId, agentId), eq(offers.status, 'pending')));

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
            campaignId: z.number().optional(),
            matchConfidence: z.enum(['high', 'medium', 'low']).optional(),
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
      interface LeadPipelineItem {
        id: number;
        name: string;
        email: string;
        phone: string | null;
        status: string;
        source: string | null;
        notes: string | null;
        createdAt: string | Date;
        campaignId: number | null;
        campaignName: string | null;
        matchConfidence: 'high' | 'medium' | 'low' | null;
        property: {
          id: number;
          title: string;
          city: string;
          price: number;
        } | null;
      }

      const emptyPipeline = (): Record<PipelineStage, LeadPipelineItem[]> => ({
        new: [],
        contacted: [],
        viewing: [],
        offer: [],
        closed: [],
      });

      const mapRowsToPipeline = (
        rows: Array<{
          leadId: number;
          leadName: string;
          leadEmail: string;
          leadPhone: string | null;
          leadStatus: string;
          leadSource: string | null;
          leadNotes: string | null;
          leadCreatedAt: string | Date | null;
          propertyId: number | null;
          propertyTitle: string | null;
          propertyCity: string | null;
          propertyPrice: number | string | null;
          campaignId: number | null;
          campaignName: string | null;
          matchConfidence: 'high' | 'medium' | 'low' | null;
        }>,
      ) => {
        const pipeline = emptyPipeline();

        rows.forEach(row => {
          let stage: PipelineStage = 'new';
          switch (row.leadStatus) {
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
            id: row.leadId,
            name: row.leadName,
            email: row.leadEmail,
            phone: row.leadPhone,
            status: row.leadStatus,
            source: row.leadSource,
            notes: row.leadNotes,
            createdAt: row.leadCreatedAt || new Date(),
            campaignId: row.campaignId ? Number(row.campaignId) : null,
            campaignName: row.campaignName ? String(row.campaignName) : null,
            matchConfidence: (row.matchConfidence as 'high' | 'medium' | 'low' | null) || null,
            property: row.propertyId
              ? {
                  id: row.propertyId,
                  title: row.propertyTitle || 'Untitled Property',
                  city: row.propertyCity || '',
                  price: Number(row.propertyPrice || 0),
                }
              : null,
          });
        });

        return pipeline;
      };

      try {
        const db = await getDb();
        const capabilities = await getRuntimeSchemaCapabilities();
        const demandEngineReady = capabilities.demandEngineReady;
        if (!demandEngineReady) {
          warnSchemaCapabilityOnce(
            'agent-getLeadsPipeline-demand-not-ready',
            '[agent.getLeadsPipeline] Demand tables not fully ready; returning pipeline without demand metadata.',
            capabilities.demandEngineDetails,
          );
        }

        const [agentRecord] = await db
          .select()
          .from(agents)
          .where(eq(agents.userId, requireUser(ctx).id))
          .limit(1);

        if (!agentRecord) {
          return emptyPipeline();
        }

        const conditions: SQL[] = [eq(leads.agentId, agentRecord.id)];

        if (input.filters?.propertyId) {
          conditions.push(eq(leads.propertyId, input.filters.propertyId));
        }

        if (input.filters?.source) {
          conditions.push(eq(leads.source, input.filters.source));
        }

        if (input.filters?.campaignId && demandEngineReady) {
          conditions.push(eq(demandLeadAssignments.campaignId, Number(input.filters.campaignId)));
        }

        if (input.filters?.matchConfidence && demandEngineReady) {
          conditions.push(eq(demandLeadMatches.confidence, input.filters.matchConfidence));
        }

        if (!demandEngineReady && (input.filters?.campaignId || input.filters?.matchConfidence)) {
          warnSchemaCapabilityOnce(
            'agent-getLeadsPipeline-demand-filter-ignored',
            '[agent.getLeadsPipeline] Ignoring demand-specific filters because demand schema is not ready.',
          );
        }

        if (input.filters?.dateRange?.start) {
          conditions.push(gte(leads.createdAt, new Date(input.filters.dateRange.start).toISOString()));
        }

        if (input.filters?.dateRange?.end) {
          conditions.push(lte(leads.createdAt, new Date(input.filters.dateRange.end).toISOString()));
        }

        if (demandEngineReady) {
          const rows = await db
            .select({
              leadId: leads.id,
              leadName: leads.name,
              leadEmail: leads.email,
              leadPhone: leads.phone,
              leadStatus: leads.status,
              leadSource: leads.source,
              leadNotes: leads.notes,
              leadCreatedAt: leads.createdAt,
              propertyId: properties.id,
              propertyTitle: properties.title,
              propertyCity: properties.city,
              propertyPrice: properties.price,
              campaignId: demandLeadAssignments.campaignId,
              campaignName: demandCampaigns.name,
              matchConfidence: demandLeadMatches.confidence,
            })
            .from(leads)
            .leftJoin(properties, eq(leads.propertyId, properties.id))
            .leftJoin(demandLeadAssignments, eq(demandLeadAssignments.leadId, leads.id))
            .leftJoin(demandCampaigns, eq(demandCampaigns.id, demandLeadAssignments.campaignId))
            .leftJoin(demandLeadMatches, eq(demandLeadMatches.leadId, leads.id))
            .where(and(...conditions))
            .orderBy(desc(leads.createdAt));

          return mapRowsToPipeline(rows as any);
        }

        const rowsWithoutDemand = await db
          .select({
            leadId: leads.id,
            leadName: leads.name,
            leadEmail: leads.email,
            leadPhone: leads.phone,
            leadStatus: leads.status,
            leadSource: leads.source,
            leadNotes: leads.notes,
            leadCreatedAt: leads.createdAt,
            propertyId: properties.id,
            propertyTitle: properties.title,
            propertyCity: properties.city,
            propertyPrice: properties.price,
            campaignId: sql<number | null>`NULL`,
            campaignName: sql<string | null>`NULL`,
            matchConfidence: sql<'high' | 'medium' | 'low' | null>`NULL`,
          })
          .from(leads)
          .leftJoin(properties, eq(leads.propertyId, properties.id))
          .where(and(...conditions))
          .orderBy(desc(leads.createdAt));

        return mapRowsToPipeline(rowsWithoutDemand as any);
      } catch (error) {
        console.warn('[agent.getLeadsPipeline] Returning empty pipeline due to error:', error);
        return emptyPipeline();
      }
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
        agentId: agentRecord.id,
        activityType: 'status_change',
        description: input.notes || `Moved to ${input.targetStage} stage`,
      });

      // Create notification for lead assignment changes
      await db.insert(notifications).values({
        userId: requireUser(ctx).id,
        type: 'lead_assigned',
        title: 'Lead Status Updated',
        content: `Lead "${lead.name}" moved to ${input.targetStage} stage`,
        data: JSON.stringify({ leadId: input.leadId, newStage: input.targetStage }),
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
      const conditions: SQL[] = [];

      if (agentRecord) {
        // User has agent profile - query by agentId OR ownerId
        conditions.push(
          or(eq(properties.agentId, agentRecord.id), eq(properties.ownerId, user.id))!,
        );
      } else {
        // No agent profile - query by ownerId only
        conditions.push(eq(properties.ownerId, user.id));
      }

      if (input.status && input.status !== 'all') {
        conditions.push(eq(properties.status, input.status as any));
      }

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
        phone: z.string().min(10).max(20).optional(),
        phoneNumber: z.string().min(10).max(20).optional(),
        bio: z.string().max(1000).optional(),
        profilePhoto: z.string().optional(),
        licenseNumber: z.string().optional(),
        specializations: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ success: boolean; agentId: number }> => {
      const db = await getDb();
      const normalizedPhone = input.phone || input.phoneNumber;
      if (!normalizedPhone) {
        throw new Error('Phone number is required');
      }

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
        phone: normalizedPhone,
        bio: input.bio,
        profilePhoto: input.profilePhoto,
        licenseNumber: input.licenseNumber,
        specializations: input.specializations,
      });

      return { success: true, agentId };
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
        agentId: agentRecord.id,
        activityType: input.activityType,
        description: input.description,
        metadata: input.metadata,
      });

      // Update lead's updatedAt
      await db
        .update(leads)
        .set({ updatedAt: nowAsDbTimestamp() })
        .where(eq(leads.id, input.leadId));

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

        const conditions: SQL[] = [eq(showings.agentId, agentRecord.id)];

        if (input.startDate) {
          conditions.push(gte(showings.scheduledTime, new Date(input.startDate).toISOString()));
        }
        if (input.endDate) {
          conditions.push(lte(showings.scheduledTime, new Date(input.endDate).toISOString()));
        }
        if (input.status && input.status !== 'all') {
          conditions.push(eq(showings.status, input.status as any));
        }

        const showingsList = await db
          .select({
            showing: showings,
          })
          .from(showings)
          .where(and(...conditions))
          .orderBy(showings.scheduledTime);

        return showingsList.map(({ showing }) => ({
          ...showing,
          property: null,
          client: null,
        }));
      } catch (error) {
        console.warn('[agent.getMyShowings] Returning empty showings due to error:', error);
        return [];
      }
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

      // Update showing
      await db
        .update(showings)
        .set({
          status: input.status,
          updatedAt: nowAsDbTimestamp(),
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

  /**
   * Agent onboarding/profile wizard: fetch current profile state.
   */
  getMyProfileOnboarding: agentProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const user = requireUser(ctx);

    const [agentRecord] = await db
      .select()
      .from(agents)
      .where(eq(agents.userId, user.id))
      .limit(1);

    const entitlements = await getAgentEntitlementsForUserId(user.id);
    const completion = calculateAgentProfileCompletion(agentRecord || null);

    return {
      agent: agentRecord
        ? {
            id: agentRecord.id,
            displayName: agentRecord.displayName || `${agentRecord.firstName} ${agentRecord.lastName}`.trim(),
            phone: agentRecord.phone || '',
            whatsapp: agentRecord.whatsapp || '',
            bio: agentRecord.bio || '',
            profileImage: agentRecord.profileImage || '',
            licenseNumber: agentRecord.licenseNumber || '',
            yearsExperience: agentRecord.yearsExperience || 0,
            areasServed: splitCsv(agentRecord.areasServed),
            specializations: splitCsv(agentRecord.specialization),
            propertyTypes: splitCsv(agentRecord.propertyTypes),
            languages: splitCsv(agentRecord.languages),
            focus: agentRecord.focus || null,
            socialLinks: parseSocialLinks(agentRecord.socialLinks),
            slug: agentRecord.slug || '',
            profileCompletionScore: agentRecord.profileCompletionScore ?? completion.score,
            profileCompletionFlags: parseFlags(agentRecord.profileCompletionFlags),
          }
        : null,
      entitlements,
      recommendedNextStep:
        completion.score >= 80 ? 'publish_profile' : 'complete_profile',
    };
  }),

  /**
   * Agent onboarding/profile wizard: save progress.
   */
  updateMyProfileOnboarding: agentProcedure
    .input(
      z.object({
        displayName: z.string().min(2).max(120).optional(),
        phone: z.string().min(7).max(30).optional(),
        whatsapp: z.string().max(30).optional(),
        bio: z.string().max(2000).optional(),
        profileImage: z.string().max(1200).optional(),
        licenseNumber: z.string().max(100).optional(),
        yearsExperience: z.number().int().min(0).max(80).optional(),
        focus: z.enum(['sales', 'rentals', 'both']).optional(),
        areasServed: z.array(z.string().min(1)).optional(),
        specializations: z.array(z.string().min(1)).optional(),
        propertyTypes: z.array(z.string().min(1)).optional(),
        languages: z.array(z.string().min(1)).optional(),
        socialLinks: z.record(z.string(), z.string()).optional(),
        slug: z.string().min(3).max(120).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const user = requireUser(ctx);

      let [agentRecord] = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, user.id))
        .limit(1);

      if (!agentRecord) {
        const fallbackDisplayName =
          input.displayName?.trim() || user.name || user.email?.split('@')[0] || 'Agent';
        const fallbackPhone = input.phone || input.whatsapp || '';
        if (!fallbackPhone) {
          throw new Error('Phone number is required to create an agent profile');
        }

        await db.createAgentProfile({
          userId: user.id,
          displayName: fallbackDisplayName,
          phone: fallbackPhone,
        });

        [agentRecord] = await db
          .select()
          .from(agents)
          .where(eq(agents.userId, user.id))
          .limit(1);
      }

      if (!agentRecord) throw new Error('Agent profile not found');

      let normalizedSlug: string | undefined;
      if (typeof input.slug === 'string') {
        normalizedSlug = slugify(input.slug);
        if (normalizedSlug.length < 3) {
          throw new Error('Profile slug must be at least 3 URL-safe characters');
        }

        const [slugConflict] = await db
          .select({ id: agents.id })
          .from(agents)
          .where(and(eq(agents.slug, normalizedSlug), ne(agents.id, agentRecord.id)))
          .limit(1);

        if (slugConflict) {
          throw new Error('This profile URL is already taken');
        }
      }

      const updates: Record<string, unknown> = {
        updatedAt: nowAsDbTimestamp(),
      };

      if (input.displayName !== undefined) {
        const displayName = input.displayName.trim();
        updates.displayName = displayName;
        const [firstNameRaw, ...rest] = displayName.split(/\s+/).filter(Boolean);
        updates.firstName = firstNameRaw || displayName;
        updates.lastName = rest.join(' ') || '-';
      }
      if (input.phone !== undefined) updates.phone = input.phone;
      if (input.whatsapp !== undefined) updates.whatsapp = input.whatsapp;
      if (input.bio !== undefined) updates.bio = input.bio;
      if (input.profileImage !== undefined) updates.profileImage = input.profileImage;
      if (input.licenseNumber !== undefined) updates.licenseNumber = input.licenseNumber;
      if (input.yearsExperience !== undefined) updates.yearsExperience = input.yearsExperience;
      if (input.focus !== undefined) updates.focus = input.focus;
      if (input.areasServed !== undefined) updates.areasServed = input.areasServed.join(', ');
      if (input.specializations !== undefined) {
        updates.specialization = input.specializations.join(', ');
      }
      if (input.propertyTypes !== undefined) updates.propertyTypes = input.propertyTypes.join(', ');
      if (input.languages !== undefined) updates.languages = input.languages.join(', ');
      if (input.socialLinks !== undefined) updates.socialLinks = JSON.stringify(input.socialLinks);
      if (normalizedSlug !== undefined) updates.slug = normalizedSlug;

      await db.update(agents).set(updates).where(eq(agents.id, agentRecord.id));

      const [updatedAgent] = await db
        .select()
        .from(agents)
        .where(eq(agents.id, agentRecord.id))
        .limit(1);

      const completion = calculateAgentProfileCompletion(updatedAgent || null);
      await db
        .update(agents)
        .set({
          profileCompletionScore: completion.score,
          profileCompletionFlags: JSON.stringify(completion.flags),
          updatedAt: nowAsDbTimestamp(),
        })
        .where(eq(agents.id, agentRecord.id));

      const entitlements = await getAgentEntitlementsForUserId(user.id);

      return {
        success: true,
        profileCompletionScore: completion.score,
        profileCompletionFlags: completion.flags,
        slug: (updatedAgent?.slug || normalizedSlug || '') as string,
        entitlements,
      };
    }),

  /**
   * Publish/shareable profile URL generation.
   */
  publishMyProfile: agentProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    const user = requireUser(ctx);

    const [agentRecord] = await db
      .select()
      .from(agents)
      .where(eq(agents.userId, user.id))
      .limit(1);

    if (!agentRecord) {
      throw new Error('Agent profile not found');
    }

    const completion = calculateAgentProfileCompletion(agentRecord);
    let slug = agentRecord.slug;

    if (!slug) {
      const base = slugify(agentRecord.displayName || `${agentRecord.firstName} ${agentRecord.lastName}`);
      slug = `${base || 'agent'}-${agentRecord.id}`;
    }

    await db
      .update(agents)
      .set({
        slug,
        profileCompletionScore: completion.score,
        profileCompletionFlags: JSON.stringify(completion.flags),
        status: 'approved',
        approvedAt: agentRecord.approvedAt || nowAsDbTimestamp(),
        updatedAt: nowAsDbTimestamp(),
      })
      .where(eq(agents.id, agentRecord.id));

    const entitlements = await getAgentEntitlementsForUserId(user.id);

    return {
      success: true,
      slug,
      publicUrl: `${ENV.appUrl}/agents/${slug}`,
      profileCompletionScore: completion.score,
      canAppearInDirectory: Boolean(entitlements?.canAppearInDirectory),
    };
  }),

  /**
   * Public directory listing. Visibility is gated by profile readiness.
   */
  list: publicProcedure.query(async () => {
    const db = await getDb();

    const records = await db
      .select({
        id: agents.id,
        slug: agents.slug,
        firstName: agents.firstName,
        lastName: agents.lastName,
        displayName: agents.displayName,
        bio: agents.bio,
        profileImage: agents.profileImage,
        phone: agents.phone,
        email: agents.email,
        specialization: agents.specialization,
        areasServed: agents.areasServed,
        yearsExperience: agents.yearsExperience,
        rating: agents.rating,
        reviewCount: agents.reviewCount,
        totalSales: agents.totalSales,
        profileCompletionScore: agents.profileCompletionScore,
        profileCompletionFlags: agents.profileCompletionFlags,
        status: agents.status,
        isVerified: agents.isVerified,
      })
      .from(agents)
      .where(eq(agents.status, 'approved'))
      .orderBy(desc(agents.isFeatured), desc(agents.updatedAt))
      .limit(200);

    return records.filter(record => {
      const completion = calculateAgentProfileCompletion(record as any);
      return completion.score >= 80 && completion.hasPhoto && completion.hasAreas && Boolean(record.slug);
    });
  }),

  /**
   * Public profile by slug (/agents/:slug).
   */
  getPublicProfileBySlug: publicProcedure
    .input(
      z.object({
        slug: z.string().min(3),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();

      const [record] = await db
        .select({
          id: agents.id,
          userId: agents.userId,
          slug: agents.slug,
          firstName: agents.firstName,
          lastName: agents.lastName,
          displayName: agents.displayName,
          bio: agents.bio,
          profileImage: agents.profileImage,
          phone: agents.phone,
          email: agents.email,
          whatsapp: agents.whatsapp,
          specialization: agents.specialization,
          focus: agents.focus,
          propertyTypes: agents.propertyTypes,
          areasServed: agents.areasServed,
          languages: agents.languages,
          yearsExperience: agents.yearsExperience,
          licenseNumber: agents.licenseNumber,
          socialLinks: agents.socialLinks,
          rating: agents.rating,
          reviewCount: agents.reviewCount,
          totalSales: agents.totalSales,
          profileCompletionScore: agents.profileCompletionScore,
          profileCompletionFlags: agents.profileCompletionFlags,
          status: agents.status,
          isVerified: agents.isVerified,
          userEmail: users.email,
        })
        .from(agents)
        .leftJoin(users, eq(users.id, agents.userId))
        .where(eq(agents.slug, input.slug))
        .limit(1);

      if (!record || record.status === 'suspended') {
        throw new Error('Agent profile not found');
      }

      const listingsPreview = await db
        .select({
          id: properties.id,
          title: properties.title,
          city: properties.city,
          province: properties.province,
          price: properties.price,
          status: properties.status,
          createdAt: properties.createdAt,
        })
        .from(properties)
        .where(
          and(
            eq(properties.agentId, record.id),
            inArray(properties.status, ['available', 'published', 'approved'] as any),
          ),
        )
        .orderBy(desc(properties.createdAt))
        .limit(12);

      return {
        id: record.id,
        slug: record.slug,
        displayName: record.displayName || `${record.firstName} ${record.lastName}`.trim(),
        firstName: record.firstName,
        lastName: record.lastName,
        bio: record.bio || '',
        profileImage: record.profileImage || '',
        phone: record.phone || '',
        email: record.email || record.userEmail || '',
        whatsapp: record.whatsapp || '',
        specializations: splitCsv(record.specialization),
        focus: record.focus || null,
        propertyTypes: splitCsv(record.propertyTypes),
        areasServed: splitCsv(record.areasServed),
        languages: splitCsv(record.languages),
        yearsExperience: record.yearsExperience || 0,
        licenseNumber: record.licenseNumber || '',
        socialLinks: parseSocialLinks(record.socialLinks),
        rating: record.rating || 0,
        reviewCount: record.reviewCount || 0,
        totalSales: record.totalSales || 0,
        isVerified: record.isVerified === 1,
        listingsPreview,
      };
    }),
});
