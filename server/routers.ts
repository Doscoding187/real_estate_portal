import { z } from 'zod';
import { PUBLIC_SEARCH_MAX_PAGE_INDEX } from '../shared/publicSearchPagination';
import { getSessionCookieOptions } from './_core/cookies';
import { authService } from './_core/auth';
import { measureAuthMePhase } from './_core/authMeTiming';
import { COOKIE_NAME } from '../shared/const';
import type { User } from './_core/context';
import { systemRouter } from './_core/systemRouter';
import { protectedProcedure, publicProcedure, router } from './_core/trpc';
import * as db from './db';
import { TRPCError } from '@trpc/server';
import { isPlaceId } from '../drizzle/schema/placeAuthority';
import { adminRouter } from './adminRouter';
import { agencyRouter } from './agencyRouter';
import { canvassingRouter } from './canvassingRouter';
import { userRouter } from './userRouter';
import { invitationRouter } from './invitationRouter';
import { agentRouter } from './agentRouter';
import { aiAgentRouter } from './routers/aiAgentRouter';
import { videoRouter } from './videoRouter';
import { billingRouter } from './billingRouter';
import { locationRouter } from './locationRouter';
import { placeAuthorityRouter } from './placeAuthorityRouter';
import { googleMapsRouter } from './googleMapsRouter';
import { requireUser } from './_core/requireUser';
import { getActiveDistributionIdentityFlags } from './services/distributionIdentityProjection';
import { validatePublicSearchInput } from '../shared/publicSearchValidation';
import { PUBLIC_PROPERTY_TYPES } from '../shared/property-taxonomy';
import {
  COMMERCIAL_PUBLIC_JOURNEY_HANDOFF_MESSAGE,
  COMMERCIAL_INVENTORY_MANAGEMENT_MESSAGE,
  isCommercialMarketingPropertyType,
} from '../shared/commercial-domain';
import {
  resolvePublicPropertyEligibilities,
  resolvePublicPropertyEligibilitiesBySourceListingIds,
  resolvePublicPropertyEligibility,
} from './services/publicPropertyEligibilityService';
import { toPublicPropertyDetailDto, toPublicPropertyImage } from './services/publicPropertyDto';

function getUserId(ctx: { user: { id: number } | null }) {
  return requireUser(ctx).id;
}

function getUser(ctx: { user: { id: number; role?: string } | null }) {
  return requireUser(ctx);
}

function rejectGenericCommercialPropertyWorkflow(propertyType: unknown): void {
  if (!isCommercialMarketingPropertyType(propertyType)) return;
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: COMMERCIAL_INVENTORY_MANAGEMENT_MESSAGE,
  });
}

function rejectGenericCommercialPublicSearch(propertyType: unknown): void {
  if (!isCommercialMarketingPropertyType(propertyType)) return;
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: COMMERCIAL_PUBLIC_JOURNEY_HANDOFF_MESSAGE,
  });
}

function toAuthMeUser(user: User) {
  return {
    id: user.id,
    openId: user.openId,
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    loginMethod: user.loginMethod,
    emailVerified: user.emailVerified,
    role: user.role,
    agencyId: user.agencyId,
    isSubaccount: user.isSubaccount,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastSignedIn: user.lastSignedIn,
  };
}

import { listingRouter } from './listingRouter';
import { uploadRouter } from './uploadRouter';
import { savedSearchRouter } from './savedSearchRouter';
import { guestMigrationRouter } from './guestMigrationRouter';
import { settingsRouter } from './settingsRouter';
import { ENV } from './_core/env';
import { marketingRouter } from './marketingRouter';
import { subscriptionRouter } from './subscriptionRouter';
import { developerRouter } from './developerRouter';
import { exploreRouter } from './exploreRouter';
import { exploreVideoUploadRouter } from './exploreVideoUploadRouter';
import { recommendationEngineRouter } from './recommendationEngineRouter';
import { exploreApiRouter } from './exploreApiRouter';
// import { boostCampaignRouter } from './boostCampaignRouter'; // TODO: Fix syntax errors in this file
import { exploreAnalyticsRouter } from './exploreAnalyticsRouter';
import { analyticsRouter } from './analyticsRouter';
import { similarPropertiesRouter } from './similarPropertiesRouter';
import { cacheRouter } from './cacheRouter';
import { monetizationRouter } from './monetizationRouter';
import { partnerRouter } from './partnerRouter';
import { cataloguePublisherRouter } from './cataloguePublisherRouter';
import { superAdminPublisherRouter } from './superAdminPublisherRouter';
import { reviewsRouter } from './reviewsRouter';
import { leadsRouter } from './leadsRouter';
import { prospectJourneyRouter } from './prospectJourneyRouter';
import { distributionRouter } from './distributionRouter';
import { demandRouter } from './demandRouter';
import { servicesEngineRouter } from './servicesEngineRouter';
import { getAgentEntitlementsForUserId } from './services/agentEntitlementService';
import { discoveryRouter } from './domains/discovery/router';
import { landRouter } from './landRouter';
import { landPublicRouter } from './landPublicRouter';
import { commercialRouter } from './commercialOfficeRouter';
import { sharedLivingRouter } from './sharedLivingRouter';

const appRouterConfig = {
  system: systemRouter,
  // ... other routers
  analytics: analyticsRouter,
  monetization: monetizationRouter,
  partners: partnerRouter,
  admin: adminRouter,
  agency: agencyRouter,
  canvassing: canvassingRouter,
  user: userRouter,
  invitation: invitationRouter,
  agent: agentRouter,
  aiAgent: aiAgentRouter,
  video: videoRouter,
  billing: billingRouter,
  location: locationRouter,
  // Slice 3: internal executable Place Authority boundary. Not a public switch.
  placeAuthority: placeAuthorityRouter,
  googleMaps: googleMapsRouter,
  listing: listingRouter,
  land: landRouter,
  landPublic: landPublicRouter,
  commercial: commercialRouter,
  sharedLiving: sharedLivingRouter,
  upload: uploadRouter,
  settings: settingsRouter,
  savedSearch: savedSearchRouter,
  guestMigration: guestMigrationRouter,
  marketing: marketingRouter,
  subscription: subscriptionRouter,
  developer: developerRouter,
  explore: exploreRouter,
  exploreVideoUpload: exploreVideoUploadRouter,
  recommendationEngine: recommendationEngineRouter,
  exploreApi: exploreApiRouter,
  // boostCampaign: boostCampaignRouter, // TODO: Fix syntax errors in this file
  exploreAnalytics: exploreAnalyticsRouter,
  similarProperties: similarPropertiesRouter,
  cache: cacheRouter,
  cataloguePublisher: cataloguePublisherRouter,
  superAdminPublisher: superAdminPublisherRouter,
  reviews: reviewsRouter,
  leads: leadsRouter,
  prospectJourney: prospectJourneyRouter,
  distribution: distributionRouter,
  demand: demandRouter,
  servicesEngine: servicesEngineRouter,
  discovery: discoveryRouter,

  auth: router({
    me: publicProcedure.query(async opts => {
      const user = opts.ctx.user;
      if (!user) return null;
      let entitlements: Awaited<ReturnType<typeof getAgentEntitlementsForUserId>> | null = null;
      let identityFlags = { hasManagerIdentity: false, hasReferrerIdentity: false };
      try {
        entitlements = await measureAuthMePhase('entitlements', () =>
          getAgentEntitlementsForUserId(user.id),
        );
      } catch (error) {
        console.warn('[Auth.me] Entitlement projection failed; returning base user context.', {
          userId: user.id,
          code: (error as any)?.code,
          message: (error as any)?.message,
        });
      }
      try {
        identityFlags = await measureAuthMePhase('distribution-identities', () =>
          getActiveDistributionIdentityFlags(user.id),
        );
      } catch (error) {
        const identityError = error as { code?: unknown; message?: unknown };
        // Keep the durable session projection available, but never infer identity access when the
        // canonical active-identity query is unavailable.
        console.warn('[Auth.me] Distribution identity projection failed; returning false flags.', {
          userId: user.id,
          code: identityError.code,
          message: identityError.message,
        });
      }
      const currentPlan = entitlements?.currentPlan || null;
      const trialStatus = entitlements?.trialStatusDetail || {
        status: entitlements?.trialStatus || 'none',
        trialEndsAt: entitlements?.trialEndsAt || null,
        daysRemaining: null,
      };
      return {
        ...toAuthMeUser(user),
        ...identityFlags,
        entitlements,
        current_plan: currentPlan,
        trial_status: trialStatus,
        currentPlan,
        trialStatus,
      };
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      try {
        await authService.revokeSessionFromCookieHeader(ctx.req.headers.cookie);
      } catch (error) {
        console.error('[Auth] Logout session revocation failed', {
          requestId: ctx.requestId,
          code: (error as { code?: string })?.code || null,
          name: error instanceof Error ? error.name : null,
        });
        throw new TRPCError({
          code: 'SERVICE_UNAVAILABLE',
          message: 'Secure logout is temporarily unavailable. Please retry shortly.',
        });
      }
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  properties: router({
    myProperties: publicProcedure.query(async () => {
      return [] as any[];
    }),
    guideAreas: publicProcedure
      .input(
        z
          .object({
            canonicalPlaceId: z
              .string()
              .trim()
              .max(40)
              .refine(isPlaceId, 'Choose an approved canonical Place'),
            listingType: z.enum(['sale', 'rent']),
          })
          .strict(),
      )
      .query(async ({ input }) => {
        const { publicPropertyGuideAreas } = await import('./services/publicPropertyGuideService');
        return publicPropertyGuideAreas(input.canonicalPlaceId, input.listingType);
      }),
    /**
     * Canonical public inventory authority. Property and approved-development
     * inventory are fetched and paginated here before the browser receives a
     * page, so the client cannot blend independently paginated sources.
     */
    searchPublicInventory: publicProcedure
      .input(
        z
          .object({
            canonicalPlaceId: z
              .string()
              .trim()
              .max(40)
              .refine(isPlaceId, 'Choose an approved canonical Place')
              .optional(),
            propertyType: z.enum(PUBLIC_PROPERTY_TYPES).optional(),
            listingType: z.enum(['sale', 'rent']).optional(),
            listingSource: z.enum(['manual', 'development']).optional(),
            minPrice: z.number().nonnegative().optional(),
            maxPrice: z.number().nonnegative().optional(),
            minBedrooms: z.number().nonnegative().optional(),
            maxBedrooms: z.number().nonnegative().optional(),
            minBathrooms: z.number().nonnegative().optional(),
            maxBathrooms: z.number().nonnegative().optional(),
            minArea: z.number().nonnegative().optional(),
            maxArea: z.number().nonnegative().optional(),
            minFloorSize: z.number().nonnegative().optional(),
            maxFloorSize: z.number().nonnegative().optional(),
            minErfSize: z.number().nonnegative().optional(),
            maxErfSize: z.number().nonnegative().optional(),
            minLandSize: z.number().nonnegative().optional(),
            maxLandSize: z.number().nonnegative().optional(),
            minLat: z.number().optional(),
            maxLat: z.number().optional(),
            minLng: z.number().optional(),
            maxLng: z.number().optional(),
            sortOption: z
              .enum(['relevance', 'price_asc', 'price_desc', 'date_desc', 'date_asc'])
              .default('relevance'),
            page: z.number().int().min(0).max(PUBLIC_SEARCH_MAX_PAGE_INDEX).default(0),
            pageSize: z.number().int().min(1).max(50).default(12),
          })
          .strict()
          .superRefine((input, context) => {
            if (isCommercialMarketingPropertyType(input.propertyType)) {
              context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['propertyType'],
                message: COMMERCIAL_PUBLIC_JOURNEY_HANDOFF_MESSAGE,
              });
            }
            const issue = validatePublicSearchInput(input);
            if (!issue) return;

            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: [issue.path],
              message: issue.message,
            });
          }),
      )
      .query(async ({ input }) => {
        const { publicSearchService } = await import('./services/publicSearchService');
        return await publicSearchService.searchInventory(input);
      }),

    searchDevelopments: publicProcedure
      .input(
        z
          .object({
            canonicalPlaceId: z
              .string()
              .trim()
              .refine(isPlaceId, 'Choose an approved canonical Place')
              .optional(),
            developmentType: z.enum(['residential', 'commercial', 'mixed_use', 'land']).optional(),
            developmentStatus: z.enum(['launching-soon', 'selling', 'sold-out']).optional(),
            transactionType: z.enum(['for_sale', 'for_rent']).optional(),
            minPrice: z.number().min(0).optional(),
            maxPrice: z.number().min(0).optional(),
            minBedrooms: z.number().min(0).optional(),
            maxBedrooms: z.number().min(0).optional(),
            availability: z.enum(['available', 'sold_out']).optional(),
            sortOption: z
              .enum(['relevance', 'price_asc', 'price_desc', 'date_desc', 'date_asc'])
              .optional(),
            page: z.number().int().min(0).max(PUBLIC_SEARCH_MAX_PAGE_INDEX).optional(),
            pageSize: z.number().int().min(1).max(50).optional(),
          })
          .strict()
          .superRefine((input, context) => {
            if (isCommercialMarketingPropertyType(input.developmentType)) {
              context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['developmentType'],
                message: COMMERCIAL_PUBLIC_JOURNEY_HANDOFF_MESSAGE,
              });
            }
          })
          .superRefine((input, context) => {
            if (
              input.minPrice !== undefined &&
              input.maxPrice !== undefined &&
              input.minPrice > input.maxPrice
            ) {
              context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['maxPrice'],
                message: 'Maximum price must be greater than or equal to minimum price.',
              });
            }
            if (
              input.minBedrooms !== undefined &&
              input.maxBedrooms !== undefined &&
              input.minBedrooms > input.maxBedrooms
            ) {
              context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['maxBedrooms'],
                message: 'Maximum bedrooms must be greater than or equal to minimum bedrooms.',
              });
            }
          }),
      )
      .query(async ({ input }) => {
        rejectGenericCommercialPublicSearch(input.developmentType);
        const { publicDevelopmentSearchService } =
          await import('./services/publicDevelopmentSearchService');
        return publicDevelopmentSearchService.search(input);
      }),

    getById: publicProcedure
      .input(
        z.object({
          id: z.number(),
        }),
      )
      .query(async ({ input }) => {
        const publicResolution = await resolvePublicPropertyEligibility(input.id);
        if (!publicResolution) {
          return { property: null, images: [] };
        }

        await db.incrementPropertyViews(input.id);
        return toPublicPropertyDetailDto(publicResolution);
      }),

    getPublicByIds: publicProcedure
      .input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(4) }))
      .query(async ({ input }) => {
        const uniqueIds = Array.from(new Set(input.ids));
        const resolutionMap = await resolvePublicPropertyEligibilities(uniqueIds);
        const resolutions = uniqueIds.map(propertyId => resolutionMap.get(propertyId) || null);

        // Comparison is a Buy decision surface. Keep it on the same approved
        // public projection and explicit sale universe as the public search
        // and detail routes; never fall back to legacy inventory search.
        return resolutions
          .filter(
            (resolution): resolution is NonNullable<typeof resolution> =>
              resolution !== null &&
              String(resolution.property.listingType).toLowerCase() === 'sale',
          )
          .map(toPublicPropertyDetailDto);
      }),

    /**
     * Detail continuation is a constrained view of the canonical public search
     * authority. The opened property supplies transaction, type and geography;
     * the browser cannot widen the feed or reconstruct publication rules.
     */
    getRelatedPublicInventory: publicProcedure
      .input(z.object({ propertyId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const current = await resolvePublicPropertyEligibility(input.propertyId);
        if (!current) return [];

        const property = current.property;
        const listingType = String(property.listingType).toLowerCase();
        if (listingType !== 'sale' && listingType !== 'rent') return [];
        const canonicalPlaceId = property.canonicalPlaceId;
        if (!isPlaceId(canonicalPlaceId)) return [];
        const propertyType = String(property.propertyType || '');

        const { publicSearchService } = await import('./services/publicSearchService');
        const result = await publicSearchService.searchInventory({
          listingType,
          listingSource: 'manual',
          canonicalPlaceId,
          ...((PUBLIC_PROPERTY_TYPES as readonly string[]).includes(propertyType)
            ? { propertyType }
            : {}),
          sortOption: 'relevance',
          page: 0,
          pageSize: 12,
        });

        return result.cards
          .filter(
            card =>
              card.kind === 'property' && Number(card.propertyId || card.id) !== input.propertyId,
          )
          .slice(0, 6);
      }),

    getImages: publicProcedure
      .input(
        z.object({
          propertyId: z.number(),
        }),
      )
      .query(async ({ input }) => {
        const publicProperty = await resolvePublicPropertyEligibility(input.propertyId);
        return publicProperty?.images.map(toPublicPropertyImage) || [];
      }),

    // Consumer saved inventory. The command carries desired state so retries
    // and reordered network requests cannot invert a user's choice.
    setFavorite: protectedProcedure
      .input(
        z.object({
          propertyId: z.number().int().positive(),
          saved: z.boolean(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (input.saved) {
          const publicResolution = await resolvePublicPropertyEligibility(input.propertyId);
          if (!publicResolution) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Property is not currently available in the public inventory.',
            });
          }
          rejectGenericCommercialPublicSearch(publicResolution.property.propertyType);
        }

        return await db.setUserFavoriteFact(getUserId(ctx), input.propertyId, input.saved);
      }),

    recordView: protectedProcedure
      .input(z.object({ propertyId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const publicResolution = await resolvePublicPropertyEligibility(input.propertyId);
        if (!publicResolution) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Property is not currently available in the public inventory.',
          });
        }
        rejectGenericCommercialPublicSearch(publicResolution.property.propertyType);
        const listingId = Number(publicResolution.sourceListingId);
        if (!Number.isSafeInteger(listingId) || listingId <= 0) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Public property has no canonical authored listing.',
          });
        }
        const result = await db.recordUserListingViewFact(getUserId(ctx), listingId);
        return { propertyId: input.propertyId, recorded: true, viewedAt: result.viewedAt };
      }),

    getFavorites: protectedProcedure.query(async ({ ctx }) => {
      const facts = await db.getUserFavoriteFacts(getUserId(ctx));
      const resolutions = await resolvePublicPropertyEligibilities(
        facts.map(fact => Number(fact.propertyId)),
      );
      return facts.flatMap(fact => {
        const propertyId = Number(fact.propertyId);
        const resolution = resolutions.get(propertyId);
        if (!resolution) return [];
        return [{ ...fact, property: toPublicPropertyDetailDto(resolution).property }];
      });
    }),

    getRecentlyViewed: protectedProcedure.query(async ({ ctx }) => {
      const facts = await db.getUserRecentViewFacts(getUserId(ctx), 50);
      const resolutions = await resolvePublicPropertyEligibilitiesBySourceListingIds(
        facts.map(fact => Number(fact.listingId)),
      );
      return facts
        .flatMap(fact => {
          const listingId = Number(fact.listingId);
          const resolution = resolutions.get(listingId);
          if (!resolution) return [];
          return [
            {
              id: fact.id,
              propertyId: Number(resolution.property.id),
              listingId,
              property: toPublicPropertyDetailDto(resolution).property,
              viewedAt: fact.viewedAt,
            },
          ];
        })
        .slice(0, 10);
    }),
  }),
} satisfies Parameters<typeof router>[0];

export const appRouter = router(appRouterConfig);

// Export type router type signature
export type AppRouter = typeof appRouter;
