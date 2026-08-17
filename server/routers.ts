import { z } from 'zod';
import { PUBLIC_SEARCH_MAX_PAGE_INDEX } from '../shared/publicSearchPagination';
import { getSessionCookieOptions } from './_core/cookies';
import { COOKIE_NAME } from '../shared/const';
import type { User } from './_core/context';
import { OWNERSHIP_TYPES, STRUCTURAL_TYPES, FLOOR_TYPES } from '../shared/db-enums';
import { systemRouter } from './_core/systemRouter';
import { protectedProcedure, publicProcedure, router } from './_core/trpc';
import * as db from './db';
import { TRPCError } from '@trpc/server';
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
import { enhancedLocationRouter } from './enhancedLocationRouter';
import { googleMapsRouter } from './googleMapsRouter';
import { priceInsightsRouter } from './priceInsightsRouter';
import { requireUser } from './_core/requireUser';
import { getActiveDistributionIdentityFlags } from './services/distributionIdentityProjection';
import { validatePublicSearchInput } from '../shared/publicSearchValidation';
import { PUBLIC_PROPERTY_TYPES } from '../shared/property-taxonomy';
import {
  resolvePublicPropertyEligibilities,
  resolvePublicPropertyEligibility,
} from './services/publicPropertyEligibilityService';
import { toPublicPropertyDetailDto, toPublicPropertyImage } from './services/publicPropertyDto';

function getUserId(ctx: { user: { id: number } | null }) {
  return requireUser(ctx).id;
}

function getUser(ctx: { user: { id: number; role?: string } | null }) {
  return requireUser(ctx);
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
import { locationPagesRouter } from './locationPagesRouter';
import { propertyResultsRouter } from './propertyResultsRouter';
import { monetizationRouter } from './monetizationRouter';
import { partnerRouter } from './partnerRouter';
import { cataloguePublisherRouter } from './cataloguePublisherRouter';
import { superAdminPublisherRouter } from './superAdminPublisherRouter';
import { favoritesRouter } from './favoritesRouter';
import { reviewsRouter } from './reviewsRouter';
import { leadsRouter } from './leadsRouter';
import { prospectJourneyRouter } from './prospectJourneyRouter';
import { distributionRouter } from './distributionRouter';
import { demandRouter } from './demandRouter';
import { servicesEngineRouter } from './servicesEngineRouter';
import { getAgentEntitlementsForUserId } from './services/agentEntitlementService';
import { discoveryRouter } from './domains/discovery/router';

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
  enhancedLocation: enhancedLocationRouter,
  googleMaps: googleMapsRouter,
  priceInsights: priceInsightsRouter,
  listing: listingRouter,
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
  locationPages: locationPagesRouter,
  cataloguePublisher: cataloguePublisherRouter,
  superAdminPublisher: superAdminPublisherRouter,
  favorites: favoritesRouter,
  reviews: reviewsRouter,
  leads: leadsRouter,
  prospectJourney: prospectJourneyRouter,
  distribution: distributionRouter,
  demand: demandRouter,
  servicesEngine: servicesEngineRouter,
  discovery: discoveryRouter,

  propertyResults: propertyResultsRouter,

  auth: router({
    me: publicProcedure.query(async opts => {
      const user = opts.ctx.user;
      if (!user) return null;
      let entitlements: Awaited<ReturnType<typeof getAgentEntitlementsForUserId>> | null = null;
      let identityFlags = { hasManagerIdentity: false, hasReferrerIdentity: false };
      try {
        entitlements = await getAgentEntitlementsForUserId(user.id);
      } catch (error) {
        console.warn('[Auth.me] Entitlement projection failed; returning base user context.', {
          userId: user.id,
          code: (error as any)?.code,
          message: (error as any)?.message,
        });
      }
      try {
        identityFlags = await getActiveDistributionIdentityFlags(user.id);
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
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
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
    search: publicProcedure
      .input(
        z.object({
          city: z.string().optional(),
          province: z.string().optional(),
          suburb: z.array(z.string()).optional(), // Added support for suburb array
          locations: z.array(z.string()).optional(), // Multi-location support
          propertyType: z
            .enum([
              'apartment',
              'house',
              'villa',
              'plot',
              'commercial',
              'townhouse',
              'cluster_home',
              'farm',
              'shared_living',
            ])
            .optional(),
          listingType: z
            .enum(['sale', 'rent', 'rent_to_buy', 'auction', 'shared_living'])
            .optional(),
          minPrice: z.number().optional(),
          maxPrice: z.number().optional(),
          minBedrooms: z.number().optional(),
          maxBedrooms: z.number().optional(),
          minBathrooms: z.number().optional(), // Added
          minArea: z.number().optional(),
          maxArea: z.number().optional(),
          minErfSize: z.number().nonnegative().optional(),
          maxErfSize: z.number().nonnegative().optional(),
          minFloorSize: z.number().nonnegative().optional(),
          maxFloorSize: z.number().nonnegative().optional(),
          minLandSize: z.number().nonnegative().optional(),
          maxLandSize: z.number().nonnegative().optional(),
          status: z.enum(['available', 'sold', 'rented', 'pending']).optional(),
          ownershipType: z.array(z.enum(OWNERSHIP_TYPES)).optional(),
          structuralType: z.array(z.enum(STRUCTURAL_TYPES)).optional(),
          floors: z.array(z.enum(FLOOR_TYPES)).optional(),
          amenities: z.array(z.string()).optional(),
          postedBy: z.array(z.string()).optional(),
          minLat: z.number().optional(),
          maxLat: z.number().optional(),
          minLng: z.number().optional(),
          maxLng: z.number().optional(),
          limit: z.number().default(20),
          offset: z.number().default(0),
          sortOption: z
            .enum(['price_asc', 'price_desc', 'date_desc', 'date_asc', 'suburb_asc', 'suburb_desc'])
            .optional(), // Added sort option support
          includeDevelopments: z.boolean().optional(),
        }),
      )
      .query(async ({ input }) => {
        // Compatibility edge only. First-party callers use
        // searchPublicInventory; this procedure translates legacy offset
        // state into that canonical authority and contains no search policy.
        const listingType =
          input.listingType === 'sale' || input.listingType === 'rent'
            ? input.listingType
            : undefined;
        if (!listingType) {
          return {
            properties: [],
            cards: [],
            total: 0,
            page: 1,
            pageSize: input.limit,
            hasMore: false,
            ...(input.includeDevelopments ? { developments: { items: [], total: 0 } } : {}),
          };
        }

        const { publicSearchService } = await import('./services/publicSearchService');
        const result = await publicSearchService.searchInventory({
          province: input.province,
          city: input.city,
          suburb: input.suburb,
          locations: input.locations,
          propertyType: input.propertyType,
          listingType,
          listingSource: input.includeDevelopments ? undefined : 'manual',
          minPrice: input.minPrice,
          maxPrice: input.maxPrice,
          minBedrooms: input.minBedrooms,
          maxBedrooms: input.maxBedrooms,
          minBathrooms: input.minBathrooms,
          minArea: input.minArea,
          maxArea: input.maxArea,
          minErfSize: input.minErfSize,
          maxErfSize: input.maxErfSize,
          minFloorSize: input.minFloorSize,
          maxFloorSize: input.maxFloorSize,
          minLandSize: input.minLandSize,
          maxLandSize: input.maxLandSize,
          minLat: input.minLat,
          maxLat: input.maxLat,
          minLng: input.minLng,
          maxLng: input.maxLng,
          sortOption:
            input.sortOption === 'suburb_asc' || input.sortOption === 'suburb_desc'
              ? 'relevance'
              : input.sortOption,
          page: Math.floor(input.offset / input.limit),
          pageSize: input.limit,
        });
        const propertyCards = result.cards.filter(card => card.kind === 'property');
        const developmentCards = result.cards.filter(card => card.kind === 'development');

        return {
          properties: propertyCards,
          cards: propertyCards,
          total: result.sourceCounts.manual,
          page: result.page + 1,
          pageSize: result.pageSize,
          hasMore: result.hasMore,
          ...(input.includeDevelopments
            ? {
                developments: {
                  items: developmentCards.map(card => ({
                    ...card,
                    id: Number(card.developmentId || card.development?.id || card.id),
                    name: card.development?.name || card.title,
                    slug: card.development?.slug || null,
                  })),
                  total: result.sourceCounts.development,
                },
              }
            : {}),
        };
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
            province: z.string().trim().max(120).optional(),
            city: z.string().trim().max(120).optional(),
            suburb: z.array(z.string().trim().max(120)).max(10).optional(),
            locations: z.array(z.string().trim().max(120)).max(10).optional(),
            locationId: z.string().trim().max(128).optional(),
            factualLocationId: z.string().trim().max(128).optional(),
            locationIds: z.array(z.string().trim().max(128)).max(10).optional(),
            searchAreaId: z.string().trim().max(120).optional(),
            searchAreaIds: z.array(z.string().trim().max(120)).max(10).optional(),
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
          .superRefine((input, context) => {
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
        z.object({
          province: z.string().optional(),
          city: z.string().optional(),
          suburb: z.array(z.string()).optional(),
          limit: z.number().default(20),
          offset: z.number().default(0),
        }),
      )
      .query(async ({ input }) => {
        const { developmentService } = await import('./services/developmentService');
        const safeLimit = Math.max(1, Math.min(input.limit, 50));
        const cappedOffset = Math.max(0, input.offset);
        const poolLimit = Math.min(200, cappedOffset + safeLimit);

        const allResults = await developmentService.listPublicDevelopments({
          province: input.province,
          city: input.city,
          limit: poolLimit,
        });

        const filteredResults =
          input.suburb && input.suburb.length > 0
            ? allResults.filter((dev: any) => {
                const devSuburb = String(dev.suburb || '').toLowerCase();
                if (!devSuburb) return false;
                return input.suburb!.some(suburb => devSuburb.includes(suburb.toLowerCase()));
              })
            : allResults;

        const paged = filteredResults.slice(cappedOffset, cappedOffset + safeLimit);

        return {
          items: paged.map((dev: any) => ({
            id: Number(dev.id),
            name: dev.name,
            slug: dev.slug || null,
            city: dev.city,
            suburb: dev.suburb || null,
            province: dev.province,
            priceFrom: dev.priceFrom ?? null,
            priceTo: dev.priceTo ?? null,
            images: Array.isArray(dev.images) ? dev.images : [],
            cataloguePublisherId: dev.cataloguePublisherId ?? null,
          })),
          total: filteredResults.length,
          limit: safeLimit,
          offset: cappedOffset,
        };
      }),

    searchDevelopmentListings: publicProcedure
      .input(
        z.object({
          province: z.string().optional(),
          city: z.string().optional(),
          suburb: z.array(z.string()).optional(),
          locations: z.array(z.string()).optional(),
          propertyType: z
            .enum(['house', 'apartment', 'townhouse', 'plot', 'commercial'])
            .optional(),
          listingType: z.enum(['sale', 'rent']).optional(),
          minPrice: z.number().optional(),
          maxPrice: z.number().optional(),
          minBedrooms: z.number().optional(),
          maxBedrooms: z.number().optional(),
          minBathrooms: z.number().optional(),
          limit: z.number().default(20),
          offset: z.number().default(0),
          sortOption: z
            .enum(['price_asc', 'price_desc', 'date_desc', 'date_asc', 'suburb_asc', 'suburb_desc'])
            .optional(),
        }),
      )
      .query(async ({ input }) => {
        const { developmentDerivedListingService } =
          await import('./services/developmentDerivedListingService');

        const filters = {
          province: input.province,
          city: input.city,
          suburb: input.suburb,
          locations: input.locations,
          propertyType: input.propertyType ? [input.propertyType as any] : undefined,
          listingType: input.listingType as any,
          minPrice: input.minPrice,
          maxPrice: input.maxPrice,
          minBedrooms: input.minBedrooms,
          maxBedrooms: input.maxBedrooms,
          minBathrooms: input.minBathrooms,
        };

        const page = Math.floor(input.offset / input.limit) + 1;

        return await developmentDerivedListingService.searchListings(
          filters,
          (input.sortOption as any) || 'date_desc',
          page,
          input.limit,
        );
      }),

    // Get filter counts for search refinement
    getFilterCounts: publicProcedure
      .input(
        z.object({
          filters: z
            .object({
              city: z.string().optional(),
              province: z.string().optional(),
              suburb: z.array(z.string()).optional(),
              locations: z.array(z.string()).optional(),
              propertyType: z.string().optional(),
              listingType: z.string().optional(),
              listingSource: z.enum(['manual', 'development']).optional(),
              minPrice: z.number().optional(),
              maxPrice: z.number().optional(),
              minBedrooms: z.number().optional(),
              maxBedrooms: z.number().optional(),
              locationId: z.string().optional(),
            })
            .optional(),
        }),
      )
      .query(async ({ input }) => {
        try {
          const { propertySearchService } = await import('./services/propertySearchService');
          const { developmentDerivedListingService } =
            await import('./services/developmentDerivedListingService');
          const filters = input.filters || {};
          const normalizedFilters = {
            ...filters,
            propertyType:
              typeof filters.propertyType === 'string'
                ? [filters.propertyType as any]
                : filters.propertyType,
            listingType: filters.listingType as any,
          };

          if (filters.listingSource === 'manual') {
            return await propertySearchService.getFilterCounts(normalizedFilters, {
              publicOnly: true,
            });
          }

          if (filters.listingSource === 'development') {
            return await developmentDerivedListingService.getFilterCounts(normalizedFilters);
          }

          const [manualCounts, developmentCounts] = await Promise.all([
            propertySearchService.getFilterCounts(normalizedFilters, { publicOnly: true }),
            developmentDerivedListingService.getFilterCounts(normalizedFilters),
          ]);

          const mergeCountMaps = (
            left: Record<string, number>,
            right: Record<string, number>,
          ): Record<string, number> => {
            const merged = { ...left };
            Object.entries(right).forEach(([key, value]) => {
              merged[key] = (merged[key] || 0) + Number(value || 0);
            });
            return merged;
          };

          const locationMap = new Map<string, { name: string; slug: string; count: number }>();
          [...manualCounts.byLocation, ...developmentCounts.byLocation].forEach(item => {
            const existing = locationMap.get(item.slug);
            if (existing) {
              existing.count += Number(item.count || 0);
            } else {
              locationMap.set(item.slug, {
                name: item.name,
                slug: item.slug,
                count: Number(item.count || 0),
              });
            }
          });

          const priceRangeMap = new Map<string, number>();
          [...manualCounts.byPriceRange, ...developmentCounts.byPriceRange].forEach(item => {
            priceRangeMap.set(
              item.range,
              (priceRangeMap.get(item.range) || 0) + Number(item.count || 0),
            );
          });

          return {
            total: Number(manualCounts.total || 0) + Number(developmentCounts.total || 0),
            byType: mergeCountMaps(manualCounts.byType, developmentCounts.byType),
            byBedrooms: mergeCountMaps(manualCounts.byBedrooms, developmentCounts.byBedrooms),
            byLocation: Array.from(locationMap.values())
              .sort(
                (left, right) => right.count - left.count || left.name.localeCompare(right.name),
              )
              .slice(0, 12),
            byPropertyType: mergeCountMaps(
              manualCounts.byPropertyType,
              developmentCounts.byPropertyType,
            ),
            byPriceRange: Array.from(priceRangeMap.entries()).map(([range, count]) => ({
              range,
              count,
            })),
          };
        } catch (error) {
          console.error('Error getting filter counts:', error);
          return {
            total: 0,
            byType: {},
            byBedrooms: {},
            byLocation: [],
            byPropertyType: {},
            byPriceRange: [],
          };
        }
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

        const positiveId = (value: unknown) => {
          const id = Number(value || 0);
          return Number.isSafeInteger(id) && id > 0 ? id : null;
        };
        const suburbId = positiveId(property.suburbId);
        const cityId = positiveId(property.cityId);
        const provinceId = positiveId(property.provinceId);
        const locationId = suburbId
          ? `suburb:${suburbId}`
          : cityId
            ? `city:${cityId}`
            : provinceId
              ? `province:${provinceId}`
              : undefined;
        const propertyType = String(property.propertyType || '');

        const { publicSearchService } = await import('./services/publicSearchService');
        const result = await publicSearchService.searchInventory({
          listingType,
          listingSource: 'manual',
          ...(locationId
            ? { locationId }
            : {
                province: String(property.province || '') || undefined,
                city: String(property.city || '') || undefined,
              }),
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

    // Property Management (CRUD) - Protected
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(5, 'Title must be at least 5 characters').max(255),
          description: z.string().min(10, 'Description must be at least 10 characters'),
          propertyType: z.enum([
            'apartment',
            'house',
            'villa',
            'plot',
            'commercial',
            'townhouse',
            'cluster_home',
            'farm',
            'shared_living',
          ]),
          listingType: z.enum(['sale', 'rent', 'rent_to_buy', 'auction', 'shared_living']),
          price: z.number().positive('Price must be positive'),
          bedrooms: z.number().int().positive().optional(),
          bathrooms: z.number().int().positive().optional(),
          area: z.number().positive('Area must be positive'),
          address: z.string().min(5, 'Address must be at least 5 characters'),
          city: z.string().min(2, 'City must be at least 2 characters'),
          province: z.string().min(2, 'Province must be at least 2 characters'),
          zipCode: z.string().optional(),
          latitude: z.string().optional(),
          longitude: z.string().optional(),
          amenities: z.array(z.string()).optional(),
          yearBuilt: z.number().int().positive().optional(),
          levies: z.number().int().optional(),
          ratesAndTaxes: z.number().int().optional(),
          videoUrl: z.string().url().optional(),
          virtualTourUrl: z.string().url().optional(),
          agentId: z.number().int().optional(),
          developmentId: z.number().int().optional(),
          images: z.array(z.string()).min(1, 'At least one image is required'), // Array of image URLs
        }),
      )
      .mutation(async () => {
        // Keep this procedure name and input contract temporarily for legacy
        // callers, but retire its direct-to-publication behavior. Listings
        // must now use the canonical review and approval workflow.
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message:
            'Direct property creation has been retired. Use the canonical listing workflow for review and publication.',
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          title: z.string().min(5).max(255).optional(),
          description: z.string().min(10).optional(),
          propertyType: z
            .enum([
              'apartment',
              'house',
              'villa',
              'plot',
              'commercial',
              'townhouse',
              'cluster_home',
              'farm',
              'shared_living',
            ])
            .optional(),
          listingType: z
            .enum(['sale', 'rent', 'rent_to_buy', 'auction', 'shared_living'])
            .optional(),
          price: z.number().positive().optional(),
          bedrooms: z.number().int().positive().optional(),
          bathrooms: z.number().int().positive().optional(),
          area: z.number().positive().optional(),
          address: z.string().min(5).optional(),
          city: z.string().min(2).optional(),
          province: z.string().min(2).optional(),
          zipCode: z.string().optional(),
          latitude: z.string().optional(),
          longitude: z.string().optional(),
          amenities: z.array(z.string()).optional(),
          yearBuilt: z.number().int().positive().optional(),
          levies: z.number().int().optional(),
          ratesAndTaxes: z.number().int().optional(),
          videoUrl: z.string().url().optional(),
          virtualTourUrl: z.string().url().optional(),
          agentId: z.number().int().optional(),
          developmentId: z.number().int().optional(),
          status: z.enum(['available', 'sold', 'rented', 'pending']).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // Verify ownership
        const property = await db.getPropertyById(input.id);
        const user = getUser(ctx);
        if (!property || property.ownerId !== user.id) {
          throw new Error('Unauthorized');
        }

        if (property.sourceListingId != null) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message:
              'Listing-backed public properties are read-only. Update the source listing through the canonical listing workflow.',
          });
        }

        // Update property
        await db.updateProperty(
          input.id,
          user.id,
          {
            ...input,
            amenities: input.amenities ? JSON.stringify(input.amenities) : undefined,
            updatedAt: new Date().toISOString(),
          },
          user.role ?? undefined,
        );

        return { success: true };
      }),

    delete: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // Verify ownership
        const property = await db.getPropertyById(input.id);
        const user = getUser(ctx);
        if (!property || property.ownerId !== user.id) {
          throw new Error('Unauthorized');
        }

        if (property.sourceListingId != null) {
          // A public property is a projection of its authored listing. Preserve
          // the source and durable history by routing removal through the
          // canonical archive lifecycle instead of deleting the projection.
          await db.archiveListing(Number(property.sourceListingId));
          return { success: true, status: 'archived' as const };
        }

        // Unlinked historical properties retain their legacy deletion path.
        await db.deleteProperty(input.id, user.id, user.role ?? undefined);

        return { success: true };
      }),

    // Favorites
    toggleFavorite: protectedProcedure
      .input(
        z.object({
          propertyId: z.number().int().positive(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const existing = await db.isFavorite(getUserId(ctx), input.propertyId);
        if (existing) {
          await db.removeFavorite(getUserId(ctx), input.propertyId);
          return { favorited: false };
        } else {
          await db.addFavorite(getUserId(ctx), input.propertyId);
          return { favorited: true };
        }
      }),

    getFavorites: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserFavorites(getUserId(ctx));
    }),
  }),
} satisfies Parameters<typeof router>[0];

export const appRouter = router(appRouterConfig);

// Export type router type signature
export type AppRouter = typeof appRouter;
