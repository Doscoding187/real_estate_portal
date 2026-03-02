import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, publicProcedure, router, superAdminProcedure } from './_core/trpc';
import { requireUser } from './_core/requireUser';
import { servicesEngineService } from './services/servicesEngineService';

const serviceCategorySchema = z.enum([
  'home_improvement',
  'finance_legal',
  'moving',
  'inspection_compliance',
  'insurance',
  'media_marketing',
]);

const intentStageSchema = z.enum([
  'seller_valuation',
  'seller_listing_prep',
  'buyer_saved_property',
  'buyer_offer_intent',
  'buyer_move_ready',
  'developer_listing_wizard',
  'agent_dashboard',
  'general',
]);

const sourceSurfaceSchema = z.enum(['directory', 'explore', 'journey_injection', 'agent_dashboard']);
const leadStatusSchema = z.enum(['new', 'accepted', 'quoted', 'won', 'lost', 'expired']);
const leadInteractionEventTypeSchema = z.enum([
  'recommendations_shown',
  'provider_card_clicked',
  'quote_requested',
  'results_empty_shown',
  'nearby_market_clicked',
]);
const moderationTierSchema = z.enum(['basic', 'verified', 'pro']);
const exploreVerticalSchema = z.enum([
  'walkthroughs',
  'home_improvement',
  'finance_legal',
  'moving_lifestyle',
  'developer_story',
]);
const moderationStatusSchema = z.enum([
  'pending',
  'reviewing',
  'approved',
  'rejected',
  'changes_requested',
]);

async function requireProviderId(userId: number): Promise<string> {
  const provider = await servicesEngineService.getProviderByUserId(userId);
  if (!provider?.id) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Provider profile not found. Create your provider identity first.',
    });
  }
  return String(provider.id);
}

export const servicesEngineRouter = router({
  leads: router({
    logEvent: protectedProcedure
      .input(
        z.object({
          leadId: z.string().trim().min(1).max(20),
          type: leadInteractionEventTypeSchema,
          providerId: z.string().trim().min(1).max(36).optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        const leadId = Number.parseInt(String(input.leadId), 10);
        if (!Number.isFinite(leadId) || leadId <= 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid lead id' });
        }

        try {
          return await servicesEngineService.logLeadInteractionEvent({
            leadId,
            eventType: input.type,
            actorUserId: user.id,
            actorRole: user.role || null,
            providerId: input.providerId || null,
            metadata: input.metadata || null,
          });
        } catch (error: any) {
          const message = String(error?.message || '');
          if (message === 'Lead not found') {
            throw new TRPCError({ code: 'NOT_FOUND', message });
          }
          if (message === 'Forbidden') {
            throw new TRPCError({ code: 'FORBIDDEN', message });
          }
          throw error;
        }
      }),
  }),

  registerProviderIdentity: protectedProcedure
    .input(
      z.object({
        companyName: z.string().trim().min(2).max(255),
        tierId: z.number().int().positive().optional(),
        description: z.string().trim().max(2000).optional(),
        logoUrl: z.string().trim().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      return servicesEngineService.upsertProviderIdentity({
        userId: user.id,
        companyName: input.companyName,
        tierId: input.tierId,
        description: input.description || null,
        logoUrl: input.logoUrl || null,
      });
    }),

  upsertProviderProfile: protectedProcedure
    .input(
      z.object({
        headline: z.string().trim().max(180).optional(),
        bio: z.string().trim().max(4000).optional(),
        websiteUrl: z.string().trim().max(500).optional(),
        contactEmail: z.string().trim().email().max(320).optional(),
        contactPhone: z.string().trim().max(50).optional(),
        moderationTier: moderationTierSchema.optional(),
        directoryActive: z.boolean().optional(),
        exploreCreatorActive: z.boolean().optional(),
        dashboardActive: z.boolean().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const providerId = await requireProviderId(user.id);
      return servicesEngineService.upsertProviderProfile(providerId, {
        headline: input.headline ?? null,
        bio: input.bio ?? null,
        websiteUrl: input.websiteUrl ?? null,
        contactEmail: input.contactEmail ?? null,
        contactPhone: input.contactPhone ?? null,
        moderationTier: input.moderationTier,
        directoryActive: input.directoryActive,
        exploreCreatorActive: input.exploreCreatorActive,
        dashboardActive: input.dashboardActive,
        metadata: input.metadata ?? null,
      });
    }),

  replaceProviderServices: protectedProcedure
    .input(
      z.object({
        services: z.array(
          z.object({
            category: serviceCategorySchema,
            code: z.string().trim().min(2).max(80),
            displayName: z.string().trim().min(2).max(140),
            description: z.string().trim().max(2000).optional(),
            minPrice: z.number().int().min(0).optional(),
            maxPrice: z.number().int().min(0).optional(),
            currency: z.string().trim().max(8).optional(),
            isActive: z.boolean().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const providerId = await requireProviderId(user.id);
      return servicesEngineService.replaceProviderServices(providerId, input.services);
    }),

  replaceProviderLocations: protectedProcedure
    .input(
      z.object({
        locations: z.array(
          z.object({
            province: z.string().trim().max(120).optional(),
            city: z.string().trim().max(120).optional(),
            suburb: z.string().trim().max(120).optional(),
            countryCode: z.string().trim().max(2).optional(),
            postalCode: z.string().trim().max(20).optional(),
            radiusKm: z.number().int().min(1).max(250).optional(),
            isPrimary: z.boolean().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const providerId = await requireProviderId(user.id);
      return servicesEngineService.replaceProviderLocations(providerId, input.locations);
    }),

  directorySearch: publicProcedure
    .input(
      z.object({
        query: z.string().trim().max(160).optional(),
        category: serviceCategorySchema.optional(),
        province: z.string().trim().max(120).optional(),
        city: z.string().trim().max(120).optional(),
        suburb: z.string().trim().max(120).optional(),
        limit: z.number().int().min(1).max(50).optional(),
      }),
    )
    .query(({ input }) => servicesEngineService.directorySearch(input)),

  getProviderPublicProfile: publicProcedure
    .input(
      z.object({
        providerId: z.string().trim().min(1).max(36),
      }),
    )
    .query(({ input }) => servicesEngineService.getProviderPublicProfile(input.providerId)),

  getProviderReviews: publicProcedure
    .input(
      z.object({
        providerId: z.string().trim().min(1).max(36),
        limit: z.number().int().min(1).max(200).optional(),
      }),
    )
    .query(({ input }) => servicesEngineService.getProviderReviews(input.providerId, input.limit || 50)),

  recommendProviders: publicProcedure
    .input(
      z.object({
        category: serviceCategorySchema,
        intentStage: intentStageSchema,
        sourceSurface: sourceSurfaceSchema,
        province: z.string().trim().max(120).optional(),
        city: z.string().trim().max(120).optional(),
        suburb: z.string().trim().max(120).optional(),
        limit: z.number().int().min(1).max(20).optional(),
      }),
    )
    .query(({ input }) => servicesEngineService.recommendProviders(input)),

  createLeadFromJourney: protectedProcedure
    .input(
      z.object({
        providerId: z.string().trim().min(1).max(36).optional(),
        category: serviceCategorySchema,
        sourceSurface: sourceSurfaceSchema,
        intentStage: intentStageSchema,
        propertyId: z.number().int().positive().optional(),
        listingId: z.number().int().positive().optional(),
        developmentId: z.number().int().positive().optional(),
        province: z.string().trim().max(120).optional(),
        city: z.string().trim().max(120).optional(),
        suburb: z.string().trim().max(120).optional(),
        notes: z.string().trim().max(3000).optional(),
        context: z.record(z.string(), z.unknown()).optional(),
        requestedProviderCount: z.number().int().min(1).max(5).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      return servicesEngineService.createLeadFromContext({
        requesterUserId: user.id,
        providerId: input.providerId || null,
        category: input.category,
        sourceSurface: input.sourceSurface,
        intentStage: input.intentStage,
        propertyId: input.propertyId ?? null,
        listingId: input.listingId ?? null,
        developmentId: input.developmentId ?? null,
        province: input.province ?? null,
        city: input.city ?? null,
        suburb: input.suburb ?? null,
        notes: input.notes ?? null,
        context: input.context ?? null,
        requestedProviderCount: input.requestedProviderCount,
      });
    }),

  updateMyLeadStatus: protectedProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        status: leadStatusSchema,
        note: z.string().trim().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const providerId = await requireProviderId(user.id);
      await servicesEngineService.updateProviderLeadStatus({
        leadId: input.leadId,
        providerId,
        status: input.status,
        actorUserId: user.id,
        note: input.note ?? null,
      });
      return { ok: true };
    }),

  myProviderLeads: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const providerId = await requireProviderId(user.id);
      return servicesEngineService.listProviderLeads(providerId, input.limit || 50);
    }),

  myProviderProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = requireUser(ctx);
    return servicesEngineService.getMyProviderProfile(user.id);
  }),

  myProviderDashboard: protectedProcedure
    .input(
      z.object({
        days: z.number().int().min(1).max(365).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const providerId = await requireProviderId(user.id);
      return servicesEngineService.getProviderDashboard(providerId, input.days || 30);
    }),

  myExploreVideos: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const providerId = await requireProviderId(user.id);
      return servicesEngineService.listMyExploreVideos(providerId, input.limit || 50);
    }),

  submitExploreVideo: protectedProcedure
    .input(
      z.object({
        title: z.string().trim().min(2).max(255),
        description: z.string().trim().max(3000).optional(),
        vertical: exploreVerticalSchema,
        exploreContentId: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const providerId = await requireProviderId(user.id);
      return servicesEngineService.submitExploreVideo({
        providerId,
        title: input.title,
        description: input.description || null,
        vertical: input.vertical,
        exploreContentId: input.exploreContentId ?? null,
        submittedByUserId: user.id,
      });
    }),

  moderationQueue: superAdminProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).optional(),
      }),
    )
    .query(({ input }) => servicesEngineService.listModerationQueue(input.limit || 50)),

  moderateExploreVideo: superAdminProcedure
    .input(
      z.object({
        videoId: z.number().int().positive(),
        moderationStatus: moderationStatusSchema,
        moderationNotes: z.string().trim().max(4000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      await servicesEngineService.moderateExploreVideo({
        videoId: input.videoId,
        moderationStatus: input.moderationStatus,
        reviewedByUserId: user.id,
        moderationNotes: input.moderationNotes || null,
      });
      return { ok: true };
    }),
});
