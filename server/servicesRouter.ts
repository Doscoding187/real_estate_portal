import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, publicProcedure, router, superAdminProcedure } from './_core/trpc';
import { requireUser } from './_core/requireUser';
import {
  SERVICE_PROVIDER_PARTICIPATION_STATUS_VALUES,
  SERVICE_REQUEST_BUDGET_BAND_VALUES,
  SERVICE_REQUEST_TIMELINE_BAND_VALUES,
  SERVICE_JOURNEY_STAGE_VALUES,
  SERVICE_SOURCE_SURFACE_VALUES,
  providerVerifications,
  serviceIntroductions,
  serviceRequests,
} from '../drizzle/schema';
import {
  PROVIDER_VERIFICATION_DIMENSION_VALUES,
  PROVIDER_VERIFICATION_STATUS_VALUES,
} from '../drizzle/schema/services';
import { isTaxonomySlug } from '../shared/services-taxonomy';
import { serviceCatalogService } from './services/serviceCatalogService';
import {
  serviceProvidersService,
  type ServiceAreaInput,
} from './services/serviceProvidersService';
import { serviceRequestsService } from './services/serviceRequestsService';
import { getDb } from './db';
import { and, eq } from 'drizzle-orm';

const taxonomySlugSchema = z.string().trim().min(1).max(120).refine(
  slug => isTaxonomySlug(slug),
  { message: 'Unknown service taxonomy identifier' },
);

const timelineBandSchema = z.enum(SERVICE_REQUEST_TIMELINE_BAND_VALUES);
const budgetBandSchema = z.enum(SERVICE_REQUEST_BUDGET_BAND_VALUES);
const journeyStageSchema = z.enum(SERVICE_JOURNEY_STAGE_VALUES);
const sourceSurfaceSchema = z.enum(SERVICE_SOURCE_SURFACE_VALUES);
const participationStatusSchema = z.enum(SERVICE_PROVIDER_PARTICIPATION_STATUS_VALUES);

async function requireProvider(userId: number) {
  const provider = await serviceProvidersService.getProviderByUserId(userId);
  if (!provider) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Provider identity not found. Create your provider profile first.',
    });
  }
  return provider;
}

function requireProviderRole(role: string | null | undefined) {
  if (role !== 'service_provider') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'This area is limited to service provider accounts.',
    });
  }
}

export const servicesRouter = router({
  catalog: router({
    tree: publicProcedure.query(async () => {
      const nodes = await serviceCatalogService.listActiveNodes();
      return { nodes };
    }),
    node: publicProcedure
      .input(z.object({ slug: z.string().trim().min(1).max(120) }))
      .query(async ({ input }) => serviceCatalogService.getNodeBySlug(input.slug)),
  }),

  providers: router({
    directorySearch: publicProcedure
      .input(        z.object({
          nodeSlug: z.string().trim().max(120).optional(),
          query: z.string().trim().max(160).optional(),
          provinceId: z.number().int().positive().optional(),
          cityId: z.number().int().positive().optional(),
          suburbId: z.number().int().positive().optional(),
          limit: z.number().int().min(1).max(50).optional(),
        }),
      )
      .query(({ input }) => serviceProvidersService.directorySearch(input)),

    getPublicProfile: publicProcedure
      .input(z.object({ idOrSlug: z.string().trim().min(1).max(190) }))
      .query(async ({ input }) => {
        const profile = await serviceProvidersService.getPublicProfileByIdOrSlug(
          input.idOrSlug,
        );
        if (!profile) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
        }
        return profile;
      }),

    myProfile: protectedProcedure.query(async ({ ctx }) => {
      const user = requireUser(ctx);
      requireProviderRole(user.role);
      const provider = await requireProvider(user.id);
      const [verified, verifications] = await Promise.all([
        serviceProvidersService.getVerifiedDimensions(provider.id),
        getDb().then(db => {
          if (!db) throw new Error('Database not available');
          return db
            .select()
            .from(providerVerifications)
            .where(eq(providerVerifications.providerId, provider.id));
        }),
      ]);
      return { provider, verifiedDimensions: verified.map(row => row.dimension), verifications };
    }),

    registerIdentity: protectedProcedure
      .input(
        z.object({
          name: z.string().trim().min(2).max(255),
          about: z.string().trim().max(4000).optional(),
          logoUrl: z.string().trim().max(500).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        requireProviderRole(user.role);
        return serviceProvidersService.ensureProvider({
          ownerUserId: user.id,
          name: input.name,
          about: input.about ?? null,
          logoUrl: input.logoUrl ?? null,
        });
      }),

    updateMyProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().trim().min(2).max(255).optional(),
          about: z.string().trim().max(4000).nullable().optional(),
          websiteUrl: z.string().trim().max(500).nullable().optional(),
          contactEmail: z.string().trim().email().max(320).nullable().optional(),
          contactPhone: z.string().trim().max(50).nullable().optional(),
          primaryTaxonomyNodeSlug: taxonomySlugSchema.nullable().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        requireProviderRole(user.role);
        const provider = await requireProvider(user.id);
        return serviceProvidersService.updateProviderProfile(provider.id, input);
      }),

    replaceMyOfferings: protectedProcedure
      .input(
        z.object({
          offerings: z.array(
            z.object({
              taxonomyNodeSlug: taxonomySlugSchema,
              displayNameOverride: z.string().trim().max(140).nullable().optional(),
              description: z.string().trim().max(2000).nullable().optional(),
              priceMin: z.number().int().min(0).max(100_000_000).nullable().optional(),
              priceMax: z.number().int().min(0).max(100_000_000).nullable().optional(),
              currency: z.string().trim().max(8).nullable().optional(),
              isActive: z.boolean().optional(),
            }),
          ),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        requireProviderRole(user.role);
        const provider = await requireProvider(user.id);
        return serviceProvidersService.replaceOfferings(provider.id, input.offerings);
      }),

    replaceMyServiceAreas: protectedProcedure
      .input(
        z.object({
          areas: z.array(
            z.object({
              coverageType: z.enum(['locality', 'radius', 'province_wide', 'national', 'remote']),
              provinceId: z.number().int().positive().nullable().optional(),
              cityId: z.number().int().positive().nullable().optional(),
              suburbId: z.number().int().positive().nullable().optional(),
              radiusKm: z.number().int().min(1).max(500).nullable().optional(),
              isPrimary: z.boolean().optional(),
            }),
          ),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        requireProviderRole(user.role);
        const provider = await requireProvider(user.id);
        try {
          return await serviceProvidersService.replaceServiceAreas(
            provider.id,
            input.areas as ServiceAreaInput[],
          );
        } catch (error: any) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: String(error?.message || error) });
        }
      }),

    submitForReview: protectedProcedure.mutation(async ({ ctx }) => {
      const user = requireUser(ctx);
      requireProviderRole(user.role);
      const provider = await requireProvider(user.id);
      try {
        return await serviceProvidersService.submitForReview(provider.id);
      } catch (error: any) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: String(error?.message || error) });
      }
    }),

    myIntroductions: protectedProcedure.query(async ({ ctx }) => {
      const user = requireUser(ctx);
      requireProviderRole(user.role);
      return serviceRequestsService.listIntroductionsForProvider(user.id);
    }),

    respondToIntroductions: router({
      respond: protectedProcedure
        .input(
          z.object({
            introductionId: z.number().int().positive(),
            action: z.enum(['viewed', 'accepted', 'declined', 'quote_submitted']),
            note: z.string().trim().max(2000).optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const user = requireUser(ctx);
          try {
            return await serviceRequestsService.respondToIntroduction({
              introductionId: input.introductionId,
              providerUserId: user.id,
              action: input.action,
              note: input.note ?? null,
            });
          } catch (error: any) {
            const message = String(error?.message || '');
            throw new TRPCError({
              code: message === 'Forbidden' ? 'FORBIDDEN' : 'BAD_REQUEST',
              message,
            });
          }
        }),
    }),

    myDashboard: protectedProcedure
      .input(z.object({ days: z.number().int().min(1).max(365).optional() }))
      .query(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        requireProviderRole(user.role);
        const provider = await requireProvider(user.id);
        return serviceRequestsService.getProviderDashboard(provider.id, input.days || 30);
      }),
  }),

  requests: router({
    create: protectedProcedure
      .input(
        z.object({
          taxonomyNodeSlug: taxonomySlugSchema,
          title: z.string().trim().max(200).optional(),
          description: z.string().trim().max(3000).optional(),
          timelineBand: timelineBandSchema.optional(),
          budgetBand: budgetBandSchema.optional(),
          provinceId: z.number().int().positive().optional(),
          cityId: z.number().int().positive().optional(),
          suburbId: z.number().int().positive().optional(),
          locationText: z.string().trim().max(320).optional(),
          propertyId: z.number().int().positive().optional(),
          listingId: z.number().int().positive().optional(),
          developmentId: z.number().int().positive().optional(),
          journeyStage: journeyStageSchema.optional(),
          sourceSurface: sourceSurfaceSchema.default('services_direct'),
          originType: z.string().trim().max(60).optional(),
          originId: z.number().int().positive().optional(),
          reasonCode: z.string().trim().max(80).optional(),
          contextJson: z.record(z.string(), z.unknown()).optional(),
          requestedProviderCount: z.number().int().min(1).max(6).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        try {
          return await serviceRequestsService.createRequest({
            ...input,
            requesterUserId: user.id,
            contextJson: input.contextJson ?? null,
          });
        } catch (error: any) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: String(error?.message || error) });
        }
      }),

    getByReference: publicProcedure
      .input(z.object({ publicReference: z.string().trim().min(4).max(24) }))
      .query(async ({ input }) => {
        const request = await serviceRequestsService.getRequestByReference(
          input.publicReference,
        );
        if (!request) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Request not found' });
        }
        const introductions = await serviceRequestsService.listIntroductionsForRequest(
          request.id,
        );
        const node = await serviceCatalogService.getNodeById(request.taxonomyNodeId);
        return { request, node, introductions };
      }),

    mine: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(50).optional() }))
      .query(async ({ ctx, input }) =>
        serviceRequestsService.listMyRequests(requireUser(ctx).id, input.limit || 20),
      ),

    connectIntroduction: protectedProcedure
      .input(
        z.object({
          publicReference: z.string().trim().min(4).max(24),
          providerId: z.number().int().positive(),
          note: z.string().trim().max(2000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        try {
          return await serviceRequestsService.connectIntroduction({
            publicReference: input.publicReference,
            providerId: input.providerId,
            actorUserId: user.id,
            note: input.note ?? null,
          });
        } catch (error: any) {
          const message = String(error?.message || '');
          throw new TRPCError({
            code: message === 'Forbidden' ? 'FORBIDDEN' : 'BAD_REQUEST',
            message,
          });
        }
      }),

    cancel: protectedProcedure
      .input(z.object({ publicReference: z.string().trim().min(4).max(24) }))
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        try {
          return await serviceRequestsService.cancelRequest({
            publicReference: input.publicReference,
            actorUserId: user.id,
          });
        } catch (error: any) {
          const message = String(error?.message || '');
          throw new TRPCError({
            code: message === 'Forbidden' ? 'FORBIDDEN' : 'BAD_REQUEST',
            message,
          });
        }
      }),

    logTelemetry: publicProcedure
      .input(
        z.object({
          requestId: z.number().int().positive(),
          type: z.enum(['recommendations_shown', 'provider_card_clicked', 'results_empty_shown']),
          providerId: z.number().int().positive().optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .mutation(async ({ input }) => {
        // Anonymous consumer telemetry is acceptable; no PII in payload.
        await serviceRequestsService.recordEvent({
          requestId: input.requestId,
          eventType: input.type,
          actorType: 'consumer',
          payload: {
            ...(input.providerId ? { providerId: input.providerId } : {}),
            ...(input.metadata ?? {}),
          },
        });
        return { ok: true };
      }),
  }),

  admin: router({
    pendingProviders: superAdminProcedure.query(() =>
      serviceProvidersService.listPendingReviewProviders(),
    ),

    setParticipationStatus: superAdminProcedure
      .input(
        z.object({
          providerId: z.number().int().positive(),
          status: participationStatusSchema,
        }),
      )
      .mutation(async ({ input }) => {
        await serviceProvidersService.setParticipationStatus(input.providerId, input.status);
        return { ok: true };
      }),

    setVerification: superAdminProcedure
      .input(
        z.object({
          providerId: z.number().int().positive(),
          dimension: z.enum(PROVIDER_VERIFICATION_DIMENSION_VALUES),
          status: z.enum(PROVIDER_VERIFICATION_STATUS_VALUES),
          notes: z.string().trim().max(2000).nullable().optional(),
          expiresAt: z.string().trim().max(40).nullable().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        try {
          await serviceProvidersService.adminSetVerification({
            providerId: input.providerId,
            dimension: input.dimension,
            status: input.status,
            verifiedByUserId: user.id,
            notes: input.notes ?? null,
            expiresAt: input.expiresAt ?? null,
          });
          return { ok: true };
        } catch (error: any) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: String(error?.message || error) });
        }
      }),

    promoteIntroduction: superAdminProcedure
      .input(
        z.object({
          requestId: z.number().int().positive(),
          providerId: z.number().int().positive(),
          note: z.string().trim().max(2000).nullable().optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const request = await serviceRequestsService.getRequestById(input.requestId);
        if (!request) throw new TRPCError({ code: 'NOT_FOUND', message: 'Request not found' });

        const insertResult = await db.insert(serviceIntroductions).values({
          requestId: input.requestId,
          providerId: input.providerId,
          status: 'introduced',
          source: 'admin_manual',
          note: input.note ?? null,
        });
        const introductionId = Number((insertResult as any)?.[0]?.insertId || 0);

        await serviceRequestsService.recordEvent({
          requestId: input.requestId,
          introductionId,
          eventType: 'introduction_created',
          actorType: 'admin',
          payload: { providerId: input.providerId, source: 'admin_manual' },
        });

        if (request.status === 'open' || request.status === 'routing') {
          await db
            .update(serviceRequests)
            .set({ status: 'introduced' })
            .where(eq(serviceRequests.id, input.requestId));
        }

        return { ok: true, introductionId };
      }),
  }),
});

