import { z } from 'zod';
import { getSessionCookieOptions } from './_core/cookies';
import { COOKIE_NAME } from '../shared/const';
import { OWNERSHIP_TYPES, STRUCTURAL_TYPES, FLOOR_TYPES } from '../shared/db-enums';
import { systemRouter } from './_core/systemRouter';
import { protectedProcedure, publicProcedure, router } from './_core/trpc';
import * as db from './db';
import { getDb } from './db-connection';
import { developments, developers, developerBrandProfiles, agents, agencies } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { adminRouter } from './adminRouter';
import { agencyRouter } from './agencyRouter';
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
import { devRouter } from './devRouter';
import { requireUser } from './_core/requireUser'; // ⚠️ DEV ONLY - Remove before production

function getUserId(ctx: { user: { id: number } | null }) {
  return requireUser(ctx).id;
}

function getUser(ctx: { user: { id: number; role?: string } | null }) {
  return requireUser(ctx);
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
import { brandProfileRouter } from './brandProfileRouter';
import { brandEmulatorRouter } from './brandEmulatorRouter';
import { superAdminPublisherRouter } from './superAdminPublisherRouter';
import { favoritesRouter } from './favoritesRouter';
import { reviewsRouter } from './reviewsRouter';
import { leadsRouter } from './leadsRouter';
import { distributionRouter } from './distributionRouter';
import { demandRouter } from './demandRouter';
import { servicesEngineRouter } from './servicesEngineRouter';
import { getAgentEntitlementsForUserId } from './services/agentEntitlementService';
import { discoveryRouter } from './domains/discovery/router';

export const appRouter = router({
  system: systemRouter,
  // ... other routers
  analytics: analyticsRouter,
  monetization: monetizationRouter,
  partners: partnerRouter,
  admin: adminRouter,
  agency: agencyRouter,
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
  dev: devRouter, // ⚠️ DEV ONLY - Remove before production
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
  brandProfile: brandProfileRouter,
  brandEmulator: brandEmulatorRouter,
  superAdminPublisher: superAdminPublisherRouter,
  favorites: favoritesRouter,
  reviews: reviewsRouter,
  leads: leadsRouter,
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
      try {
        entitlements = await getAgentEntitlementsForUserId(user.id);
      } catch (error) {
        console.warn('[Auth.me] Entitlement projection failed; returning base user context.', {
          userId: user.id,
          code: (error as any)?.code,
          message: (error as any)?.message,
        });
      }
      const currentPlan = entitlements?.currentPlan || null;
      const trialStatus = entitlements?.trialStatusDetail || {
        status: entitlements?.trialStatus || 'none',
        trialEndsAt: entitlements?.trialEndsAt || null,
        daysRemaining: null,
      };
      return {
        ...user,
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
        const { propertySearchService } = await import('./services/propertySearchService');

        // Map input to PropertyFilters
        const filters: any = {
          city: input.city,
          province: input.province,
          suburb: input.suburb, // Now supported
          locations: input.locations, // Multi-location support
          propertyType: input.propertyType ? [input.propertyType as any] : undefined, // Service expects array
          listingType: input.listingType as any,
          minPrice: input.minPrice,
          maxPrice: input.maxPrice,
          minBedrooms: input.minBedrooms,
          maxBedrooms: input.maxBedrooms,
          minBathrooms: input.minBathrooms,
          minErfSize: input.minArea, // Map area to erfSize/floorSize as generic size filter
          maxErfSize: input.maxArea,
          status: input.status ? [input.status as any] : undefined, // Service expects array
          amenities: input.amenities, // Note: Service might need update if it processes amenities differently, but looks okay
          // postedBy handling might differ or need explicit mapping if service supports it
          bounds:
            input.minLat && input.maxLat && input.minLng && input.maxLng
              ? {
                  south: input.minLat,
                  north: input.maxLat,
                  west: input.minLng,
                  east: input.maxLng,
                }
              : undefined,
        };

        const page = Math.floor(input.offset / input.limit) + 1;

        // Use the service
        // We defaults/fallbacks are handled inside service or here
        const propertyResults = await propertySearchService.searchProperties(
          filters,
          (input.sortOption as any) || 'date_desc',
          page,
          input.limit,
        );

        if (!input.includeDevelopments) {
          return propertyResults;
        }

        const { developmentService } = await import('./services/developmentService');
        const nearbyDevelopments = await developmentService.listPublicDevelopments({
          province: input.province,
          city: input.city,
          limit: Math.min(input.limit, 6),
        });

        const filteredDevelopments =
          input.suburb && input.suburb.length > 0
            ? nearbyDevelopments.filter((dev: any) => {
                const devSuburb = String(dev.suburb || '').toLowerCase();
                if (!devSuburb) return false;
                return input.suburb!.some(suburb => devSuburb.includes(suburb.toLowerCase()));
              })
            : nearbyDevelopments;

        return {
          ...propertyResults,
          developments: {
            items: filteredDevelopments.map((dev: any) => ({
              id: Number(dev.id),
              name: dev.name,
              slug: dev.slug || null,
              description: dev.description || null,
              city: dev.city,
              suburb: dev.suburb || null,
              province: dev.province,
              priceFrom: dev.priceFrom ?? null,
              priceTo: dev.priceTo ?? null,
              status: dev.status ?? null,
              isFeatured: dev.isFeatured ?? false,
              rating: dev.rating ?? null,
              highlights: Array.isArray(dev.highlights) ? dev.highlights : [],
              builderName: dev.builderName ?? null,
              builderLogoUrl: dev.builderLogoUrl ?? null,
              configurations: Array.isArray(dev.configurations) ? dev.configurations : [],
              images: Array.isArray(dev.images) ? dev.images : [],
              developerBrandProfileId: dev.developerBrandProfileId ?? null,
            })),
            total: filteredDevelopments.length,
          },
        };
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
            developerBrandProfileId: dev.developerBrandProfileId ?? null,
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
        const { developmentDerivedListingService } = await import(
          './services/developmentDerivedListingService'
        );

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

    featured: publicProcedure
      .input(
        z.object({
          limit: z.number().default(6),
        }),
      )
      .query(async ({ input }) => {
        return await db.getFeaturedListings(input.limit);
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
              propertyType: z.string().optional(),
              listingType: z.string().optional(),
              listingSource: z.enum(['manual', 'development']).optional(),
              minPrice: z.number().optional(),
              maxPrice: z.number().optional(),
              minBedrooms: z.number().optional(),
              maxBedrooms: z.number().optional(),
            })
            .optional(),
        }),
      )
      .query(async ({ input }) => {
        try {
          const { propertySearchService } = await import('./services/propertySearchService');
          const { developmentDerivedListingService } = await import(
            './services/developmentDerivedListingService'
          );
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
            return await propertySearchService.getFilterCounts(normalizedFilters);
          }

          if (filters.listingSource === 'development') {
            return await developmentDerivedListingService.getFilterCounts(normalizedFilters);
          }

          const [manualCounts, developmentCounts] = await Promise.all([
            propertySearchService.getFilterCounts(normalizedFilters),
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
            priceRangeMap.set(item.range, (priceRangeMap.get(item.range) || 0) + Number(item.count || 0));
          });

          return {
            total: Number(manualCounts.total || 0) + Number(developmentCounts.total || 0),
            byType: mergeCountMaps(manualCounts.byType, developmentCounts.byType),
            byBedrooms: mergeCountMaps(manualCounts.byBedrooms, developmentCounts.byBedrooms),
            byLocation: Array.from(locationMap.values())
              .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
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

    // getAll - Same as search but with city/propertyType filtering
    getAll: publicProcedure
      .input(
        z.object({
          limit: z.number().default(20),
          offset: z.number().default(0),
          city: z.string().optional(),
          propertyType: z.string().optional(),
        }),
      )
      .query(async ({ input }) => {
        return await db.searchListings({
          city: input.city,
          propertyType: input.propertyType as any,
          limit: input.limit,
          offset: input.offset,
        });
      }),

    getById: publicProcedure
      .input(
        z.object({
          id: z.number(),
        }),
      )
      .query(async ({ input }) => {
        await db.incrementPropertyViews(input.id);

        const drizzleDb = await getDb();

        // Try listings table first (new)
        const listing = await db.getListingById(input.id);
        if (listing) {
          const rawImages = await db.getListingMedia(input.id);

          const bucketName = process.env.S3_BUCKET_NAME || 'listify-properties-sa';
          const awsRegion = process.env.AWS_REGION || 'af-south-1';
          const cdnUrl =
            process.env.CLOUDFRONT_URL || `https://${bucketName}.s3.${awsRegion}.amazonaws.com`;

          const images = rawImages.map(img => {
            const imageUrl = img.originalUrl.startsWith('http')
              ? img.originalUrl
              : `${cdnUrl}/${img.originalUrl}`;
            return {
              id: img.id,
              imageUrl,
              isPrimary: img.isPrimary,
              displayOrder: img.displayOrder,
            };
          });

          const propertyDetails = (listing.propertyDetails as any) || {};
          const resolvedDevelopmentId = Number(
            propertyDetails.developmentId || (listing as any).developmentId || 0,
          );
          const resolvedAgentId = Number((listing as any).agentId || 0);

          let development: any = null;
          let developerBrand: any = null;
          let agent: any = null;

          if (drizzleDb && Number.isFinite(resolvedAgentId) && resolvedAgentId > 0) {
            const [agentRow] = await drizzleDb
              .select({
                id: agents.id,
                firstName: agents.firstName,
                lastName: agents.lastName,
                displayName: agents.displayName,
                profileImage: agents.profileImage,
                phone: agents.phone,
                whatsapp: agents.whatsapp,
                email: agents.email,
                agencyId: agencies.id,
                agencyName: agencies.name,
              })
              .from(agents)
              .leftJoin(agencies, eq(agents.agencyId, agencies.id))
              .where(eq(agents.id, resolvedAgentId))
              .limit(1);

            if (agentRow) {
              const name =
                String(agentRow.displayName || '').trim() ||
                [agentRow.firstName, agentRow.lastName].filter(Boolean).join(' ').trim();
              agent = {
                id: String(agentRow.id),
                name: name || 'Agent',
                agency: String(agentRow.agencyName || ''),
                phone: String(agentRow.phone || ''),
                whatsapp: String(agentRow.whatsapp || ''),
                email: String(agentRow.email || ''),
                image: agentRow.profileImage || undefined,
                agencyId: agentRow.agencyId ? Number(agentRow.agencyId) : undefined,
              };
            }
          }

          if (drizzleDb && Number.isFinite(resolvedDevelopmentId) && resolvedDevelopmentId > 0) {
            const [dev] = await drizzleDb
              .select({
                id: developments.id,
                name: developments.name,
                slug: developments.slug,
                developerId: developments.developerId,
                developerBrandProfileId: developments.developerBrandProfileId,
                developerName: developers.name,
              })
              .from(developments)
              .leftJoin(developers, eq(developments.developerId, developers.id))
              .where(eq(developments.id, resolvedDevelopmentId))
              .limit(1);

            if (dev) {
              development = {
                id: Number(dev.id),
                name: dev.name,
                slug: dev.slug || null,
                developerId: dev.developerId ?? null,
                developerName: dev.developerName ?? null,
              };

              const resolvedBrandProfileId = Number(
                propertyDetails.developerBrandProfileId || dev.developerBrandProfileId || 0,
              );

              if (Number.isFinite(resolvedBrandProfileId) && resolvedBrandProfileId > 0) {
                const [brand] = await drizzleDb
                  .select({
                    id: developerBrandProfiles.id,
                    brandName: developerBrandProfiles.brandName,
                    slug: developerBrandProfiles.slug,
                    logoUrl: developerBrandProfiles.logoUrl,
                    about: developerBrandProfiles.about,
                    headOfficeLocation: developerBrandProfiles.headOfficeLocation,
                    websiteUrl: developerBrandProfiles.websiteUrl,
                    publicContactEmail: developerBrandProfiles.publicContactEmail,
                    brandTier: developerBrandProfiles.brandTier,
                    propertyFocus: developerBrandProfiles.propertyFocus,
                  })
                  .from(developerBrandProfiles)
                  .where(eq(developerBrandProfiles.id, resolvedBrandProfileId))
                  .limit(1);

                if (brand) {
                  developerBrand = brand as any;
                }
              }
            }
          } else if (drizzleDb) {
            const resolvedBrandProfileId = Number(propertyDetails.developerBrandProfileId || 0);
            if (Number.isFinite(resolvedBrandProfileId) && resolvedBrandProfileId > 0) {
              const [brand] = await drizzleDb
                .select({
                  id: developerBrandProfiles.id,
                  brandName: developerBrandProfiles.brandName,
                  slug: developerBrandProfiles.slug,
                  logoUrl: developerBrandProfiles.logoUrl,
                  about: developerBrandProfiles.about,
                  headOfficeLocation: developerBrandProfiles.headOfficeLocation,
                  websiteUrl: developerBrandProfiles.websiteUrl,
                  publicContactEmail: developerBrandProfiles.publicContactEmail,
                  brandTier: developerBrandProfiles.brandTier,
                  propertyFocus: developerBrandProfiles.propertyFocus,
                })
                .from(developerBrandProfiles)
                .where(eq(developerBrandProfiles.id, resolvedBrandProfileId))
                .limit(1);

              if (brand) {
                developerBrand = brand as any;
              }
            }
          }

          const transformedProperty = {
            ...listing,
            price: listing.askingPrice || listing.monthlyRent || listing.startingBid || 0,
            listingType: listing.action,
            transactionType: listing.action,
            bedrooms: propertyDetails.bedrooms || 0,
            bathrooms: propertyDetails.bathrooms || 0,
            area:
              propertyDetails.erfSizeM2 ||
              propertyDetails.unitSizeM2 ||
              propertyDetails.landSizeM2OrHa ||
              propertyDetails.houseAreaM2 ||
              0,
            amenities:
              propertyDetails.amenitiesFeatures || propertyDetails.propertyHighlights || [],
            features: propertyDetails.propertyHighlights || propertyDetails.amenitiesFeatures || [],
            propertySettings: {
              ownershipType: propertyDetails.ownershipType,
              powerBackup: propertyDetails.powerBackup,
              securityFeatures: propertyDetails.securityFeatures,
              waterSupply: propertyDetails.waterSupply,
              internetAccess: propertyDetails.internetAccess,
              flooring: propertyDetails.flooring,
              parkingType: propertyDetails.parkingType,
              petFriendly: propertyDetails.petFriendly,
              electricitySupply: propertyDetails.electricitySupply,
              additionalRooms: propertyDetails.additionalRooms,
              developmentName: propertyDetails.developmentName,
            },
            zipCode: listing.postalCode,
            ownerId: listing.ownerId,
            listingSource: 'manual',
            listerType: agent?.agency ? 'agency' : agent ? 'agent' : 'private',
            developmentId:
              Number.isFinite(resolvedDevelopmentId) && resolvedDevelopmentId > 0
                ? resolvedDevelopmentId
                : undefined,
            development: development || undefined,
            developerBrand: developerBrand || undefined,
            agent: agent || undefined,
          };

          return { property: transformedProperty, images };
        }

        // Fallback to properties table (old)
        const property = await db.getPropertyById(input.id);
        const rawImages = await db.getPropertyImages(input.id);

        const bucketName = ENV.s3BucketName || 'listify-properties-sa';
        const awsRegion = ENV.awsRegion || 'eu-north-1';
        const cdnUrl = ENV.cloudFrontUrl || `https://${bucketName}.s3.${awsRegion}.amazonaws.com`;

        const images = rawImages.map(img => ({
          ...img,
          imageUrl: img.imageUrl.startsWith('http') ? img.imageUrl : `${cdnUrl}/${img.imageUrl}`,
          url: img.imageUrl.startsWith('http') ? img.imageUrl : `${cdnUrl}/${img.imageUrl}`,
        }));

        let amenities: string[] = [];
        try {
          if (typeof property.amenities === 'string' && !property.amenities.startsWith('[')) {
            amenities.push(property.amenities);
          } else if (typeof property.amenities === 'string') {
            amenities = [...amenities, ...JSON.parse(property.amenities)];
          }

          if (property.propertySettings) {
            const settings =
              typeof property.propertySettings === 'string'
                ? JSON.parse(property.propertySettings)
                : property.propertySettings;

            if (settings.propertyHighlights && Array.isArray(settings.propertyHighlights)) {
              amenities = [...amenities, ...settings.propertyHighlights];
            }
          }
        } catch (e) {
          console.error('Failed to parse legacy amenities', e);
        }

        const uniqueAmenities = Array.from(new Set(amenities));

        let development: any = null;
        let developerBrand: any = null;
        let agent: any = null;

        if (drizzleDb) {
          const resolvedDevelopmentId = Number((property as any).developmentId || 0);
          const resolvedBrandProfileIdCandidate = Number(
            (property as any).developerBrandProfileId || 0,
          );
          const resolvedAgentId = Number((property as any).agentId || 0);

          if (Number.isFinite(resolvedAgentId) && resolvedAgentId > 0) {
            const [agentRow] = await drizzleDb
              .select({
                id: agents.id,
                firstName: agents.firstName,
                lastName: agents.lastName,
                displayName: agents.displayName,
                profileImage: agents.profileImage,
                phone: agents.phone,
                whatsapp: agents.whatsapp,
                email: agents.email,
                agencyId: agencies.id,
                agencyName: agencies.name,
              })
              .from(agents)
              .leftJoin(agencies, eq(agents.agencyId, agencies.id))
              .where(eq(agents.id, resolvedAgentId))
              .limit(1);

            if (agentRow) {
              const name =
                String(agentRow.displayName || '').trim() ||
                [agentRow.firstName, agentRow.lastName].filter(Boolean).join(' ').trim();
              agent = {
                id: String(agentRow.id),
                name: name || 'Agent',
                agency: String(agentRow.agencyName || ''),
                phone: String(agentRow.phone || ''),
                whatsapp: String(agentRow.whatsapp || ''),
                email: String(agentRow.email || ''),
                image: agentRow.profileImage || undefined,
                agencyId: agentRow.agencyId ? Number(agentRow.agencyId) : undefined,
              };
            }
          }

          if (Number.isFinite(resolvedDevelopmentId) && resolvedDevelopmentId > 0) {
            const [dev] = await drizzleDb
              .select({
                id: developments.id,
                name: developments.name,
                slug: developments.slug,
                developerId: developments.developerId,
                developerBrandProfileId: developments.developerBrandProfileId,
                developerName: developers.name,
              })
              .from(developments)
              .leftJoin(developers, eq(developments.developerId, developers.id))
              .where(eq(developments.id, resolvedDevelopmentId))
              .limit(1);

            if (dev) {
              development = {
                id: Number(dev.id),
                name: dev.name,
                slug: dev.slug || null,
                developerId: dev.developerId ?? null,
                developerName: dev.developerName ?? null,
              };
            }

            const resolvedBrandProfileId = Number(
              resolvedBrandProfileIdCandidate || dev?.developerBrandProfileId || 0,
            );
            if (Number.isFinite(resolvedBrandProfileId) && resolvedBrandProfileId > 0) {
              const [brand] = await drizzleDb
                .select({
                  id: developerBrandProfiles.id,
                  brandName: developerBrandProfiles.brandName,
                  slug: developerBrandProfiles.slug,
                  logoUrl: developerBrandProfiles.logoUrl,
                  about: developerBrandProfiles.about,
                  headOfficeLocation: developerBrandProfiles.headOfficeLocation,
                  websiteUrl: developerBrandProfiles.websiteUrl,
                  publicContactEmail: developerBrandProfiles.publicContactEmail,
                  brandTier: developerBrandProfiles.brandTier,
                  propertyFocus: developerBrandProfiles.propertyFocus,
                })
                .from(developerBrandProfiles)
                .where(eq(developerBrandProfiles.id, resolvedBrandProfileId))
                .limit(1);

              if (brand) {
                developerBrand = brand as any;
              }
            }
          } else if (
            Number.isFinite(resolvedBrandProfileIdCandidate) &&
            resolvedBrandProfileIdCandidate > 0
          ) {
            const [brand] = await drizzleDb
              .select({
                id: developerBrandProfiles.id,
                brandName: developerBrandProfiles.brandName,
                slug: developerBrandProfiles.slug,
                logoUrl: developerBrandProfiles.logoUrl,
                about: developerBrandProfiles.about,
                headOfficeLocation: developerBrandProfiles.headOfficeLocation,
                websiteUrl: developerBrandProfiles.websiteUrl,
                publicContactEmail: developerBrandProfiles.publicContactEmail,
                brandTier: developerBrandProfiles.brandTier,
                propertyFocus: developerBrandProfiles.propertyFocus,
              })
              .from(developerBrandProfiles)
              .where(eq(developerBrandProfiles.id, resolvedBrandProfileIdCandidate))
              .limit(1);

            if (brand) {
              developerBrand = brand as any;
            }
          }
        }

        return {
          property: {
            ...property,
            amenities: uniqueAmenities,
            listingSource: 'manual',
            listerType: agent?.agency ? 'agency' : agent ? 'agent' : 'private',
            development: development || undefined,
            developerBrand: developerBrand || undefined,
            agent: agent || undefined,
          },
          images,
        };
      }),

    getImages: publicProcedure
      .input(
        z.object({
          propertyId: z.number(),
        }),
      )
      .query(async ({ input }) => {
        return await db.getPropertyImages(input.propertyId);
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
      .mutation(async ({ ctx, input }) => {
        const { images, ...propertyData } = input;

        // Create property
        const propertyId = await db.createProperty({
          ...propertyData,
          amenities: input.amenities ? JSON.stringify(input.amenities) : null,
          ownerId: getUserId(ctx),
          status: 'available',
          featured: 0,
          views: 0,
          enquiries: 0,
          transactionType: input.listingType === 'rent' ? 'rent' : 'sale',
        });

        // Create property images
        for (let i = 0; i < images.length; i++) {
          await db.createPropertyImage({
            propertyId: Number(propertyId),
            imageUrl: images[i],
            isPrimary: i === 0 ? 1 : 0,
            displayOrder: i,
          });
        }

        return { success: true, propertyId: Number(propertyId) };
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

        // Delete property
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
});

// Export type router type signature
export type AppRouter = typeof appRouter;
