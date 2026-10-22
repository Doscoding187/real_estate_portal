import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from './_core/trpc';
import { requireUser } from './_core/requireUser';
import { servicesEngineService } from './services/servicesEngineService';
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

function requireProviderRole(role: string | null | undefined) {
  if (role !== 'service_provider') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Partner access is limited to service provider accounts.',
    });
  }
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
    const servicesConfigured = Boolean(profile && (profile.services || []).length > 0);
    const locationsConfigured = Boolean(profile && (profile.locations || []).length > 0);

    let onboardingStep = 0;
    if (hasProviderIdentity) onboardingStep = 1;
    if (profileConfigured) onboardingStep = 2;
    if (servicesConfigured) onboardingStep = 3;
    if (locationsConfigured) onboardingStep = 4;

    const dashboardUnlocked = hasProviderIdentity;
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
        headline: input.headline ?? null,
        bio: input.bio ?? null,
        websiteUrl: input.websiteUrl ?? null,
        contactEmail: input.contactEmail ?? null,
        contactPhone: input.contactPhone ?? null,
        metadata: input.metadata ?? null,
      });
    }),

  replaceProviderServices: protectedProcedure
    .input(
      z.object({
        services: z.array(
          z
            .object({
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
      requireProviderRole(user.role);
      const providerId = await requireProviderId(user.id);
      return servicesEngineService.replaceProviderLocations(providerId, input.locations);
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
      const providerId = await requireProviderId(user.id);

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
      }),
    )
    .query(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      requireProviderRole(user.role);
      const providerId = await requireProviderId(user.id);
      return servicesEngineService.listProviderLeads(providerId, input.limit || 50);
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
      const providerId = await requireProviderId(user.id);
      return servicesEngineService.getProviderDashboard(providerId, input.days || 30);
    }),
});
