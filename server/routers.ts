import { z } from 'zod';
import { getSessionCookieOptions } from './_core/cookies';
import { COOKIE_NAME } from '../shared/const';
import { systemRouter } from './_core/systemRouter';
import { protectedProcedure, publicProcedure, router } from './_core/trpc';
import * as db from './db';
import { adminRouter } from './adminRouter';
import { agencyRouter } from './agencyRouter';
import { userRouter } from './userRouter';
import { invitationRouter } from './invitationRouter';
import { agentRouter } from './agentRouter';
import { videoRouter } from './videoRouter';
import { billingRouter } from './billingRouter';
import { locationRouter } from './locationRouter';
import { enhancedLocationRouter } from './enhancedLocationRouter';
import { googleMapsRouter } from './googleMapsRouter';
import { priceInsightsRouter } from './priceInsightsRouter';
import { devRouter } from './devRouter'; // ⚠️ DEV ONLY - Remove before production
import { listingRouter } from './listingRouter';
import { uploadRouter } from './uploadRouter';
import { savedSearchRouter } from './savedSearchRouter';
import { guestMigrationRouter } from './guestMigrationRouter';
import { settingsRouter } from './settingsRouter';
import { marketingRouter } from './marketingRouter';
import { subscriptionRouter } from './subscriptionRouter';
import { developerRouter } from './developerRouter';
import { exploreRouter } from './exploreRouter';
import { exploreVideoUploadRouter } from './exploreVideoUploadRouter';
// import { recommendationEngineRouter } from './recommendationEngineRouter'; // TODO: Fix syntax errors in this file
// import { exploreApiRouter } from './exploreApiRouter'; // TODO: Fix syntax errors in this file
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
import { superAdminPublisherRouter } from './superAdminPublisherRouter';

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
  // recommendationEngine: recommendationEngineRouter, // TODO: Fix syntax errors in this file
  // exploreApi: exploreApiRouter, // TODO: Fix syntax errors in this file  
  // boostCampaign: boostCampaignRouter, // TODO: Fix syntax errors in this file
  exploreAnalytics: exploreAnalyticsRouter,
  similarProperties: similarPropertiesRouter,
  cache: cacheRouter,
  locationPages: locationPagesRouter,
  brandProfile: brandProfileRouter,
  superAdminPublisher: superAdminPublisherRouter,

  propertyResults: propertyResultsRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  properties: router({
    search: publicProcedure
      .input(
        z.object({
          city: z.string().optional(),
          province: z.string().optional(),
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
          minArea: z.number().optional(),
          maxArea: z.number().optional(),
          status: z.enum(['available', 'sold', 'rented', 'pending']).optional(),
          amenities: z.array(z.string()).optional(),
          postedBy: z.array(z.string()).optional(),
          minLat: z.number().optional(),
          maxLat: z.number().optional(),
          minLng: z.number().optional(),
          maxLng: z.number().optional(),
          limit: z.number().default(20),
          offset: z.number().default(0),
        }),
      )
      .query(async ({ input }) => {
        return await db.searchListings(input);
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
          filters: z.object({
            city: z.string().optional(),
            province: z.string().optional(),
            suburb: z.array(z.string()).optional(),
            propertyType: z.string().optional(),
            listingType: z.string().optional(),
            minPrice: z.number().optional(),
            maxPrice: z.number().optional(),
            minBedrooms: z.number().optional(),
            maxBedrooms: z.number().optional(),
          }).optional(),
        }),
      )
      .query(async ({ input }) => {
        try {
          const { propertySearchService } = await import('./services/propertySearchService');
          return await propertySearchService.getFilterCounts(input.filters || {});
        } catch (error) {
          console.error('Error getting filter counts:', error);
          return { total: 0, byType: {}, byBedrooms: {}, byPriceRange: {} };
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
        
        // Try listings table first (new)
        const listing = await db.getListingById(input.id);
        if (listing) {
          const rawImages = await db.getListingMedia(input.id);
          
          // Transform images to include imageUrl for PropertyImageGallery compatibility
          // S3 bucket configuration
          const bucketName = process.env.S3_BUCKET_NAME || 'listify-properties-sa';
          const awsRegion = process.env.AWS_REGION || 'af-south-1';
          const cdnUrl = process.env.CLOUDFRONT_URL || `https://${bucketName}.s3.${awsRegion}.amazonaws.com`;
          
          const images = rawImages.map(img => {
            // If originalUrl is already a full URL, use it; otherwise construct from bucket
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
          
          // Transform listing to match property structure for backward compatibility
          const propertyDetails = listing.propertyDetails as any || {};
          const transformedProperty = {
            ...listing,
            // Map pricing fields
            price: listing.askingPrice || listing.monthlyRent || listing.startingBid || 0,
            listingType: listing.action, // 'sell', 'rent', 'auction'
            transactionType: listing.action,
            // Extract property details from JSON
            bedrooms: propertyDetails.bedrooms || 0,
            bathrooms: propertyDetails.bathrooms || 0,
            area: propertyDetails.erfSizeM2 || propertyDetails.unitSizeM2 || propertyDetails.landSizeM2OrHa || propertyDetails.houseAreaM2 || 0,
            amenities: propertyDetails.amenitiesFeatures || propertyDetails.propertyHighlights || [],
            features: propertyDetails.propertyHighlights || propertyDetails.amenitiesFeatures || [],
            // Map property settings for specs display
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
            },
            // Map location fields
            zipCode: listing.postalCode,
            // Keep original fields
            ownerId: listing.ownerId,
          };
          
          return { property: transformedProperty, images };
        }
        
        // Fallback to properties table (old)
        const property = await db.getPropertyById(input.id);
        const images = await db.getPropertyImages(input.id);
        return { property, images };
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
          ownerId: ctx.user.id,
          status: 'available',
          featured: 0,
          views: 0,
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
        if (!property || property.ownerId !== ctx.user.id) {
          throw new Error('Unauthorized');
        }

        // Update property
        await db.updateProperty(input.id, {
          ...input,
          amenities: input.amenities ? JSON.stringify(input.amenities) : undefined,
          updatedAt: new Date(),
        });

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
        if (!property || property.ownerId !== ctx.user.id) {
          throw new Error('Unauthorized');
        }

        // Delete property
        await db.deleteProperty(input.id);

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
        const existing = await db.isFavorite(ctx.user.id, input.propertyId);
        if (existing) {
          await db.removeFavorite(ctx.user.id, input.propertyId);
          return { favorited: false };
        } else {
          await db.addFavorite(ctx.user.id, input.propertyId);
          return { favorited: true };
        }
      }),

    getFavorites: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserFavorites(ctx.user.id);
    }),
  }),
});

// Export type router type signature
export type AppRouter = typeof appRouter;
