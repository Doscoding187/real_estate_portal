import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  protectedProcedure,
  publicProcedure,
  router,
  superAdminProcedure,
} from './_core/trpc';
import { requireUser } from './_core/requireUser';
import {
  hasProviderCoverage,
  SERVICE_REQUEST_REPLAY_UNAVAILABLE,
  servicesEngineService,
} from './services/servicesEngineService';
import {
  checkPublicLeadRateLimit,
  getPublicLeadClientIp,
} from './services/publicLeadRateLimitService';
import { getDb } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

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

const sourceSurfaceSchema = z.enum(['directory', 'journey_injection', 'agent_dashboard']);
const leadStatusSchema = z.enum(['new', 'accepted', 'quoted', 'won', 'lost', 'expired']);
const serviceCodeSchema = z.string().trim().min(1).max(80);
const requestKeySchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{16,120}$/);
const serviceRequestContextSchema = z
  .record(z.string().max(64), z.unknown())
  .superRefine((value, ctx) => {
    const allowedKeys = new Set(['sourceDetail', 'reasonKey', 'propertyLinked', 'serviceCode']);
    for (const key of Object.keys(value)) {
      if (!allowedKeys.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: 'Request context is invalid',
        });
      }
    }
    if (JSON.stringify(value).length > 2048) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Request context is too large',
      });
    }
  });
const websiteUrlSchema = z
  .string()
  .trim()
  .url()
  .max(500)
  .refine(value => /^https?:\/\//i.test(value), 'Website URL must use http or https');
async function requireProviderId(userId: number): Promise<number> {
  const provider = await servicesEngineService.getProviderByUserId(userId);
  const providerId = Number(provider?.id || 0);

  if (!providerId) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Provider profile not found. Create your provider identity first.',
    });
  }

  return providerId;
}

async function requireProviderWorkspaceId(userId: number): Promise<number> {
  const providerId = await requireProviderId(userId);
  const profile = await servicesEngineService.getMyProviderProfile(userId);
  if (profile?.isPublished || (await servicesEngineService.hasProviderLeads(providerId))) {
    return providerId;
  }
  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: 'Provider workspace is available after directory publication or an assigned request.',
  });
}

function requireProviderRole(role: string | null | undefined) {
  if (role !== 'service_provider') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Partner access is limited to service provider accounts.',
    });
  }
}

const PROVIDER_REPLACEMENT_VALIDATION_MESSAGES = [
  'At least one service is required',
  'At least one valid coverage area is required',
  'Service prices must use ZAR',
  'Minimum price must not exceed maximum price',
  'Service codes must be unique within a provider profile',
  'Service updates must use unique service IDs',
  'Service not found for this provider',
  'Coverage area updates must use unique location IDs',
  'Coverage area identifiers must be unique',
  'Coverage areas must be unique within a provider profile',
  'Coverage area not found for this provider',
];

function throwProviderReplacementError(error: unknown): never {
  const message = String((error as { message?: unknown })?.message || '');
  if (PROVIDER_REPLACEMENT_VALIDATION_MESSAGES.includes(message)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message });
  }
  throw error;
}

export const servicesEngineRouter = router({
  myOnboardingStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = requireUser(ctx);
    requireProviderRole(user.role);

    const provider = await servicesEngineService.getProviderByUserId(user.id);
    const profile = provider?.id ? await servicesEngineService.getMyProviderProfile(user.id) : null;

    const hasProviderIdentity = Boolean(provider?.id);
    const profileConfigured = Boolean(
      profile &&
      String(profile.headline || '').trim() &&
      String(profile.bio || '').trim() &&
      (String(profile.contactEmail || '').trim() || String(profile.contactPhone || '').trim()),
    );
    const servicesConfigured = Boolean(
      profile && (profile.services || []).some(service => service.isActive),
    );
    const locationsConfigured = Boolean(
      profile && (profile.locations || []).some(hasProviderCoverage),
    );
    const hasAssignedRequests = provider?.id
      ? await servicesEngineService.hasProviderLeads(provider.id)
      : false;

    let onboardingStep = 0;
    if (hasProviderIdentity) onboardingStep = 1;
    if (onboardingStep >= 1 && profileConfigured) onboardingStep = 2;
    if (onboardingStep >= 2 && servicesConfigured) onboardingStep = 3;
    if (onboardingStep >= 3 && locationsConfigured) onboardingStep = 4;

    const dashboardUnlocked = Boolean(
      profile?.isPublished || (hasProviderIdentity && hasAssignedRequests),
    );

    const fullFeaturesUnlocked =
      hasProviderIdentity && profileConfigured && servicesConfigured && locationsConfigured;
    const recommendedNextStep = !hasProviderIdentity
      ? '/service/profile'
      : !profileConfigured
        ? '/service/profile'
        : !servicesConfigured
          ? '/service/profile'
          : !locationsConfigured
            ? '/service/profile'
            : '/service/dashboard';

    const db = await getDb();
    if (
      db &&
      (Number(user.onboardingStep || 0) !== onboardingStep ||
        Number(user.onboardingComplete || 0) !== (fullFeaturesUnlocked ? 1 : 0))
    ) {
      await db
        .update(users)
        .set({
          onboardingStep,
          onboardingComplete: fullFeaturesUnlocked ? 1 : 0,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
    }

    return {
      hasProviderIdentity,
      profileConfigured,
      servicesConfigured,
      locationsConfigured,
      onboardingStep,
      dashboardUnlocked,
      hasAssignedRequests,
      fullFeaturesUnlocked,
      recommendedNextStep,
      provider: profile
        ? {
            providerId: profile.providerId,
            companyName: profile.companyName,
            verificationStatus: profile.verificationStatus,
            isPublished: profile.isPublished,
            publicationStatus: profile.publicationStatus,
            subscriptionTier: profile.subscriptionTier,
            subscriptionStatus: profile.subscriptionStatus,
          }
        : null,
    };
  }),

  registerProviderIdentity: protectedProcedure
    .input(
      z.object({
        companyName: z.string().trim().min(2).max(255),
        description: z.string().trim().max(2000).optional(),
        logoUrl: z.string().trim().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      requireProviderRole(user.role);
      return servicesEngineService.upsertProviderIdentity({
        userId: user.id,
        companyName: input.companyName,
        description: input.description || null,
        logoUrl: input.logoUrl || null,
      });
    }),

  upsertProviderProfile: protectedProcedure
    .input(
      z.object({
        headline: z.string().trim().max(180).optional(),
        bio: z.string().trim().max(4000).optional(),
        websiteUrl: websiteUrlSchema.optional(),

        contactEmail: z.string().trim().email().max(320).optional(),
        contactPhone: z.string().trim().max(50).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      requireProviderRole(user.role);
      const providerId = await requireProviderId(user.id);
      return servicesEngineService.upsertProviderProfile(providerId, {
        headline: input.headline,
        bio: input.bio,
        websiteUrl: input.websiteUrl,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        metadata: input.metadata,
      });
    }),

  replaceProviderServices: protectedProcedure
    .input(
      z.object({
        services: z.array(
          z
            .object({
              id: z.number().int().positive().optional(),
              category: serviceCategorySchema,

              code: z.string().trim().min(2).max(80),
              displayName: z.string().trim().min(2).max(140),
              description: z.string().trim().max(2000).optional(),
              minPrice: z.number().int().min(0).optional(),
              maxPrice: z.number().int().min(0).optional(),
              currency: z.literal('ZAR').optional(),

              isActive: z.boolean().optional(),
            })
            .refine(
              data =>
                data.minPrice === undefined ||
                data.maxPrice === undefined ||
                data.minPrice <= data.maxPrice,
              {
                message: 'Minimum price must not exceed maximum price',
                path: ['maxPrice'],
              },
            ),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      requireProviderRole(user.role);
      const providerId = await requireProviderId(user.id);
      try {
        return await servicesEngineService.replaceProviderServices(providerId, input.services);
      } catch (error) {
        throwProviderReplacementError(error);
      }
    }),

  replaceProviderLocations: protectedProcedure
    .input(
      z.object({
        locations: z.array(
          z.object({
            id: z.number().int().positive().optional(),
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
      requireProviderRole(user.role);
      const providerId = await requireProviderId(user.id);
      try {
        return await servicesEngineService.replaceProviderLocations(providerId, input.locations);
      } catch (error) {
        throwProviderReplacementError(error);
      }
    }),

  providerPublicationReadiness: superAdminProcedure
    .input(
      z.object({
        providerId: z.number().int().positive(),
      }),
    )
    .query(async ({ input }) => {
      try {
        return await servicesEngineService.getProviderPublicationReadiness(input.providerId);
      } catch (error: any) {
        if (String(error?.message || '') === 'Provider not found') {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
        }
        throw error;
      }
    }),

  reviewProviderPublication: superAdminProcedure
    .input(
      z.object({
        providerId: z.number().int().positive(),
        decision: z.enum(['publish', 'unpublish', 'reject']),
        notes: z.string().trim().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      try {
        return await servicesEngineService.reviewProviderPublication({
          providerId: input.providerId,
          decision: input.decision,
          actorUserId: user.id,
          notes: input.notes ?? null,
        });
      } catch (error: any) {
        const message = String(error?.message || '');
        if (message === 'Provider not found') {
          throw new TRPCError({ code: 'NOT_FOUND', message });
        }
        if (message === 'A reviewing operator is required') {
          throw new TRPCError({ code: 'FORBIDDEN', message });
        }
        if (message === 'Unsupported publication decision') {
          throw new TRPCError({ code: 'BAD_REQUEST', message });
        }
        if (message.startsWith('Provider is not ready for publication')) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message });
        }
        throw error;
      }
    }),

  directorySearch: publicProcedure
    .input(
      z.object({
        query: z.string().trim().max(160).optional(),
        category: serviceCategorySchema.optional(),
        serviceCode: serviceCodeSchema.optional(),
        province: z.string().trim().max(120).optional(),
        city: z.string().trim().max(120).optional(),
        suburb: z.string().trim().max(120).optional(),
        limit: z.number().int().min(1).max(50).optional(),
      }),
    )
    .query(({ input }) => servicesEngineService.publicDirectorySearch(input)),

  getProviderPublicProfile: publicProcedure
    .input(
      z.object({
        providerId: z.number().int().positive(),
      }),
    )
    .query(({ input }) => servicesEngineService.getProviderPublicProfile(input.providerId)),

  getProviderReviews: publicProcedure
    .input(
      z.object({
        providerId: z.number().int().positive(),
        limit: z.number().int().min(1).max(200).optional(),
      }),
    )
    .query(({ input }) =>
      servicesEngineService.getProviderReviews(input.providerId, input.limit || 50),
    ),

  getLead: protectedProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      try {
        return await servicesEngineService.getServiceLeadForViewer({
          leadId: input.leadId,
          userId: user.id,
          role: user.role || null,
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

  createLeadFromJourney: protectedProcedure
    .input(
      z
        .object({
          requestKey: requestKeySchema,
          providerId: z.number().int().positive(),
          category: serviceCategorySchema,

          sourceSurface: sourceSurfaceSchema,
          intentStage: intentStageSchema,
          propertyId: z.number().int().positive().optional(),
          listingId: z.number().int().positive().optional(),
          developmentId: z.number().int().positive().optional(),
          province: z.string().trim().max(120).optional(),
          city: z.string().trim().max(120).optional(),
          suburb: z.string().trim().max(120).optional(),
          notes: z.string().trim().min(1).max(3000),
          serviceCode: serviceCodeSchema,
          context: serviceRequestContextSchema.optional(),
        })
        .refine(
          data => Boolean(data.suburb?.trim() || data.city?.trim() || data.province?.trim()),
          {
            message: 'A request area is required',
            path: ['city'],
          },
        ),
    )

    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      if (!checkPublicLeadRateLimit(getPublicLeadClientIp(ctx))) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many service requests. Please try again in a minute.',
        });
      }
      try {
        return await servicesEngineService.createLeadFromContext({
          requesterUserId: user.id,
          requesterRole: user.role,
          requestKey: input.requestKey,

          providerId: input.providerId,

          category: input.category,
          sourceSurface: input.sourceSurface,
          intentStage: input.intentStage,
          propertyId: input.propertyId ?? null,
          listingId: input.listingId ?? null,
          developmentId: input.developmentId ?? null,
          province: input.province ?? null,
          city: input.city ?? null,
          suburb: input.suburb ?? null,
          notes: input.notes,
          serviceCode: input.serviceCode,
          context: input.context ?? null,
        });
      } catch (error: any) {
        const message = String(error?.message || '');
        const validationMessages = [
          'Select a provider before submitting a service request',
          'Select a service before submitting a service request',
          'A project description is required',
          'A request area is required',
          'This provider is not currently available',
          'This provider does not offer the selected service',
          'This provider does not list coverage for the selected area',
          'A stable request key is required',
          'Explore is not available for service requests',
          'Agent dashboard attribution requires the agent dashboard surface',
          'Agent dashboard attribution is not available for this account',
          'Developer listing attribution requires a development',
          'Developer listing attribution is not available for this account',
          'Request context is unavailable',

          'Request context is invalid',
          'Request context is too large',
          'Invalid property context',
          'Invalid listing context',
          'Invalid development context',
          'Property and listing context do not match',
          'Property and development context do not match',
          'Listing and development context do not match',
        ];
        if (validationMessages.includes(message)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message });
        }
        if (message === 'Request key has already been used') {
          throw new TRPCError({ code: 'CONFLICT', message });
        }
        if (message === SERVICE_REQUEST_REPLAY_UNAVAILABLE) {
          throw new TRPCError({ code: 'CONFLICT', message });
        }
        throw error;
      }
    }),

  updateMyLeadStatus: protectedProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        status: leadStatusSchema,
        note: z.string().trim().min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      requireProviderRole(user.role);
      const providerId = await requireProviderWorkspaceId(user.id);

      try {
        await servicesEngineService.updateProviderLeadStatus({
          leadId: input.leadId,
          providerId,
          status: input.status,
          actorUserId: user.id,
          note: input.note ?? null,
        });
        return { ok: true };
      } catch (error: any) {
        const message = String(error?.message || '');
        if (message === 'Lead not found for provider') {
          throw new TRPCError({ code: 'NOT_FOUND', message });
        }
        if (
          message === 'Invalid lead status transition' ||
          message === 'A response note is required'
        ) {
          throw new TRPCError({ code: 'BAD_REQUEST', message });
        }
        if (message === 'Lead status is already current') {
          throw new TRPCError({ code: 'CONFLICT', message });
        }
        if (message === 'Lead status changed; refresh and try again') {
          throw new TRPCError({ code: 'CONFLICT', message });
        }
        throw error;
      }
    }),

  myProviderLeads: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).max(10000).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      requireProviderRole(user.role);
      const providerId = await requireProviderWorkspaceId(user.id);
      return servicesEngineService.listProviderLeads(
        providerId,
        input.limit || 50,
        input.offset || 0,
      );
    }),

  myProviderProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = requireUser(ctx);
    requireProviderRole(user.role);
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
      requireProviderRole(user.role);
      const providerId = await requireProviderWorkspaceId(user.id);
      return servicesEngineService.getProviderDashboard(providerId, input.days || 30);
    }),
});
