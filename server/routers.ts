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

export const appRouter = router({
  system: systemRouter,
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
  dev: devRouter, // ⚠️ DEV ONLY - Remove before production

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
          limit: z.number().default(20),
          offset: z.number().default(0),
        }),
      )
      .query(async ({ input }) => {
        return await db.searchProperties(input);
      }),

    featured: publicProcedure
      .input(
        z.object({
          limit: z.number().default(6),
        }),
      )
      .query(async ({ input }) => {
        return await db.getFeaturedProperties(input.limit);
      }),

    getById: publicProcedure
      .input(
        z.object({
          id: z.number(),
        }),
      )
      .query(async ({ input }) => {
        await db.incrementPropertyViews(input.id);
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
          status: z.enum(['available', 'sold', 'rented', 'pending']).optional(),
          levies: z.number().int().optional(),
          ratesAndTaxes: z.number().int().optional(),
          videoUrl: z.string().url().optional(),
          virtualTourUrl: z.string().url().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, amenities, ...updates } = input;

        await db.updateProperty(
          id,
          ctx.user.id,
          {
            ...updates,
            amenities: amenities ? JSON.stringify(amenities) : undefined,
          },
          ctx.user.role,
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
        await db.deleteProperty(input.id, ctx.user.id, ctx.user.role);
        return { success: true };
      }),

    myProperties: protectedProcedure.query(async ({ ctx }) => {
      // Super admin and agency_admin can see all properties, agents see only their own
      const userProperties =
        ctx.user.role === 'super_admin' || ctx.user.role === 'agency_admin'
          ? await db.searchProperties({ limit: 1000 }) // Get all properties for admins
          : await db.getUserProperties(ctx.user.id);

      // Fetch images for each property
      const propertiesWithImages = await Promise.all(
        userProperties.map(async property => {
          const images = await db.getPropertyImages(property.id);
          return {
            ...property,
            primaryImage: images.find(img => img.isPrimary === 1)?.imageUrl || images[0]?.imageUrl,
            imageCount: images.length,
          };
        }),
      );
      return propertiesWithImages;
    }),

    deleteImage: protectedProcedure
      .input(
        z.object({
          imageId: z.number().int().positive(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await db.deletePropertyImage(input.imageId, ctx.user.id);
        return { success: true };
      }),
  }),

  agents: router({
    list: publicProcedure.query(async () => {
      return await db.getAllAgents();
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await db.getAgentById(input.id);
    }),
    featured: publicProcedure.query(async () => {
      return await db.getFeaturedAgents(6);
    }),
  }),

  developments: router({
    list: publicProcedure.query(async () => {
      return await db.getAllDevelopments();
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await db.getDevelopmentById(input.id);
    }),
    featured: publicProcedure.query(async () => {
      return await db.getFeaturedDevelopments(6);
    }),
    properties: publicProcedure
      .input(z.object({ developmentId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDevelopmentProperties(input.developmentId);
      }),
  }),

  services: router({
    list: publicProcedure.query(async () => {
      return await db.getAllServices();
    }),
    byCategory: publicProcedure
      .input(z.object({ category: z.string() }))
      .query(async ({ input }) => {
        return await db.getServicesByCategory(input.category);
      }),
  }),

  reviews: router({
    getByTarget: publicProcedure
      .input(z.object({ reviewType: z.string(), targetId: z.number() }))
      .query(async ({ input }) => {
        return await db.getReviewsByTarget(input.reviewType, input.targetId);
      }),
    create: protectedProcedure
      .input(
        z.object({
          reviewType: z.enum(['agent', 'developer', 'property']),
          targetId: z.number(),
          rating: z.number().min(1).max(5),
          title: z.string().optional(),
          comment: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return await db.createReview({
          userId: ctx.user.id,
          ...input,
        });
      }),
  }),

  leads: router({
    create: publicProcedure
      .input(
        z.object({
          propertyId: z.number().optional(),
          developmentId: z.number().optional(),
          agentId: z.number().optional(),
          name: z.string(),
          email: z.string().email(),
          phone: z.string().optional(),
          message: z.string().optional(),
          leadType: z.enum(['inquiry', 'viewing_request', 'offer', 'callback']).default('inquiry'),
          source: z.string().optional(),
        }),
      )
      .mutation(async ({ input }) => {
        return await db.createLead(input);
      }),
  }),

  explore: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().default(20) }).optional())
      .query(async ({ input }) => {
        return await db.getAllExploreVideos(input?.limit || 20);
      }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const video = await db.getExploreVideoById(input.id);
      if (video) {
        await db.incrementVideoViews(input.id);
      }
      return video;
    }),
  }),

  locations: router({
    list: publicProcedure.query(async () => {
      return await db.getAllLocations();
    }),
    byType: publicProcedure
      .input(z.object({ type: z.enum(['province', 'city', 'suburb', 'neighborhood']) }))
      .query(async ({ input }) => {
        return await db.getLocationsByType(input.type);
      }),
  }),

  upload: router({
    /**
     * Upload property image with automatic resizing
     * Converts to WebP and generates 5 sizes (thumbnail, small, medium, large, original)
     */
    propertyImage: protectedProcedure
      .input(
        z.object({
          propertyId: z.string(),
          filename: z.string().min(1),
          data: z.string(), // base64 encoded image
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { uploadPropertyImage } = await import('./_core/imageUpload');
        const buffer = Buffer.from(input.data, 'base64');
        return await uploadPropertyImage(buffer, input.propertyId, input.filename);
      }),

    /**
     * Delete property images
     */
    deleteImages: protectedProcedure
      .input(
        z.object({
          imageUrls: z.array(z.string()),
        }),
      )
      .mutation(async ({ input }) => {
        const { deletePropertyImages } = await import('./_core/imageUpload');
        await deletePropertyImages(input.imageUrls);
        return { success: true };
      }),
  }),

  favorites: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserFavorites(ctx.user.id);
    }),

    add: protectedProcedure
      .input(
        z.object({
          propertyId: z.number(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await db.addFavorite(ctx.user.id, input.propertyId);
        return { success: true };
      }),

    remove: protectedProcedure
      .input(
        z.object({
          propertyId: z.number(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await db.removeFavorite(ctx.user.id, input.propertyId);
        return { success: true };
      }),

    check: protectedProcedure
      .input(
        z.object({
          propertyId: z.number(),
        }),
      )
      .query(async ({ ctx, input }) => {
        return await db.isFavorite(ctx.user.id, input.propertyId);
      }),
  }),

  prospects: router({
    createProspect: publicProcedure
      .input(
        z.object({
          sessionId: z.string(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          income: z.number().optional(),
          incomeRange: z
            .enum(['under_15k', '15k_25k', '25k_50k', '50k_100k', 'over_100k'])
            .optional(),
          employmentStatus: z
            .enum([
              'employed',
              'self_employed',
              'business_owner',
              'student',
              'retired',
              'unemployed',
            ])
            .optional(),
          combinedIncome: z.number().optional(),
          monthlyExpenses: z.number().optional(),
          monthlyDebts: z.number().optional(),
          dependents: z.number().optional(),
          savingsDeposit: z.number().optional(),
          creditScore: z.number().optional(),
          hasCreditConsent: z.boolean().optional(),
          preferredPropertyType: z
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
          preferredLocation: z.string().optional(),
          maxCommuteTime: z.number().optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const { calculateBuyability } = await import('./_core/buyabilityCalculator');
        const buyabilityResults = calculateBuyability(input);
        return await db.createProspect({
          ...input,
          hasCreditConsent: input.hasCreditConsent ? 1 : 0,
          ...buyabilityResults,
        });
      }),

    updateProspect: publicProcedure
      .input(
        z.object({
          sessionId: z.string(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          income: z.number().optional(),
          incomeRange: z
            .enum(['under_15k', '15k_25k', '25k_50k', '50k_100k', 'over_100k'])
            .optional(),
          employmentStatus: z
            .enum([
              'employed',
              'self_employed',
              'business_owner',
              'student',
              'retired',
              'unemployed',
            ])
            .optional(),
          combinedIncome: z.number().optional(),
          monthlyExpenses: z.number().optional(),
          monthlyDebts: z.number().optional(),
          dependents: z.number().optional(),
          savingsDeposit: z.number().optional(),
          creditScore: z.number().optional(),
          hasCreditConsent: z.boolean().optional(),
          preferredPropertyType: z
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
          preferredLocation: z.string().optional(),
          maxCommuteTime: z.number().optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const { calculateBuyability } = await import('./_core/buyabilityCalculator');
        const buyabilityResults = calculateBuyability(input);
        return await db.updateProspect(input.sessionId, {
          ...input,
          hasCreditConsent: input.hasCreditConsent ? 1 : 0,
          ...buyabilityResults,
        });
      }),

    getProspect: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        return await db.getProspect(input.sessionId);
      }),

    calculateBuyability: publicProcedure
      .input(
        z.object({
          income: z.number().optional(),
          incomeRange: z
            .enum(['under_15k', '15k_25k', '25k_50k', '50k_100k', 'over_100k'])
            .optional(),
          employmentStatus: z
            .enum([
              'employed',
              'self_employed',
              'business_owner',
              'student',
              'retired',
              'unemployed',
            ])
            .optional(),
          combinedIncome: z.number().optional(),
          monthlyExpenses: z.number().optional(),
          monthlyDebts: z.number().optional(),
          dependents: z.number().optional(),
          savingsDeposit: z.number().optional(),
          creditScore: z.number().optional(),
          hasCreditConsent: z.boolean().optional(),
        }),
      )
      .query(async ({ input }) => {
        const { calculateBuyability } = await import('./_core/buyabilityCalculator');
        return calculateBuyability(input);
      }),

    getRecommendedListings: publicProcedure
      .input(
        z.object({
          sessionId: z.string(),
          limit: z.number().default(10),
        }),
      )
      .query(async ({ input }) => {
        const prospect = await db.getProspect(input.sessionId);
        if (!prospect || !prospect.affordabilityMax) {
          return [];
        }
        return await db.getRecommendedProperties(prospect, input.limit);
      }),

    addFavoriteProperty: publicProcedure
      .input(
        z.object({
          sessionId: z.string(),
          propertyId: z.number(),
        }),
      )
      .mutation(async ({ input }) => {
        return await db.addProspectFavorite(input.sessionId, input.propertyId);
      }),

    removeFavoriteProperty: publicProcedure
      .input(
        z.object({
          sessionId: z.string(),
          propertyId: z.number(),
        }),
      )
      .mutation(async ({ input }) => {
        return await db.removeProspectFavorite(input.sessionId, input.propertyId);
      }),

    getFavorites: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        return await db.getProspectFavorites(input.sessionId);
      }),

    scheduleViewing: publicProcedure
      .input(
        z.object({
          sessionId: z.string(),
          propertyId: z.number(),
          scheduledAt: z.string().datetime(),
          notes: z.string().optional(),
          prospectName: z.string().optional(),
          prospectEmail: z.string().email().optional(),
          prospectPhone: z.string().optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const { emailService } = await import('./_core/emailService');
        const viewingId = await db.scheduleViewing(input);

        // Get property and agent info for notification
        const property = await db.getPropertyById(input.propertyId);
        if (property?.agentId) {
          const agent = await db.getAgentById(property.agentId);
          if (agent?.email) {
            // Get prospect data for richer notification
            const prospect = input.sessionId ? await db.getProspect(input.sessionId) : null;

            await emailService.sendViewingNotificationEmail(
              agent.email,
              agent.firstName + ' ' + agent.lastName,
              input.prospectName || 'Anonymous Prospect',
              input.prospectEmail,
              input.prospectPhone,
              property.title,
              property.price.toLocaleString(),
              input.scheduledAt,
              input.notes,
              prospect?.buyabilityScore,
              prospect?.affordabilityMin && prospect?.affordabilityMax
                ? `R${prospect.affordabilityMin.toLocaleString()} - R${prospect.affordabilityMax.toLocaleString()}`
                : undefined,
            );
          }
        }

        return { success: true, viewingId };
      }),

    getScheduledViewings: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        return await db.getScheduledViewings(input.sessionId);
      }),

    updateViewingStatus: publicProcedure
      .input(
        z.object({
          viewingId: z.number(),
          status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']),
        }),
      )
      .mutation(async ({ input }) => {
        return await db.updateViewingStatus(input.viewingId, input.status);
      }),

    trackPropertyView: publicProcedure
      .input(
        z.object({
          sessionId: z.string(),
          propertyId: z.number(),
        }),
      )
      .mutation(async ({ input }) => {
        return await db.trackPropertyView(input.sessionId, input.propertyId);
      }),

    getRecentlyViewed: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        return await db.getRecentlyViewed(input.sessionId);
      }),

    getProspectProgress: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        const prospect = await db.getProspect(input.sessionId);
        if (!prospect) return { progress: 0, badges: [] };

        // Calculate progress based on filled fields
        const fields = [
          prospect.email,
          prospect.phone,
          prospect.income,
          prospect.monthlyExpenses,
          prospect.monthlyDebts,
          prospect.savingsDeposit,
          prospect.preferredPropertyType,
          prospect.preferredLocation,
        ];
        const filledFields = fields.filter(Boolean).length;
        const progress = Math.round((filledFields / fields.length) * 100);

        return {
          progress,
          badges: prospect.badges ? JSON.parse(prospect.badges) : [],
        };
      }),

    updateProfileProgress: publicProcedure
      .input(
        z.object({
          sessionId: z.string(),
          progress: z.number(),
          badges: z.array(z.string()).optional(),
        }),
      )
      .mutation(async ({ input }) => {
        return await db.updateProspectProgress(input.sessionId, input.progress, input.badges);
      }),

    earnBadge: publicProcedure
      .input(
        z.object({
          sessionId: z.string(),
          badge: z.string(),
        }),
      )
      .mutation(async ({ input }) => {
        return await db.earnBadge(input.sessionId, input.badge);
      }),
  }),
});

export type AppRouter = typeof appRouter;
