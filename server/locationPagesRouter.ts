import { router, publicProcedure } from './_core/trpc';
import { z } from 'zod';
import { locationPagesService } from './services/locationPagesService.improved';
import { getDb } from './db';
import { heroCampaigns } from '../drizzle/schema';
import { and, eq, lte, gte, or, isNull, inArray } from 'drizzle-orm';
import { buildCampaignSlugHierarchy } from '@shared/locationCampaigns';

/**
 * Location Pages Router
 *
 * Provides endpoints for location page data with Google Places integration.
 * Implements Requirements 24.1-24.5 and 28.1-28.5:
 * - Server-side rendering with static + dynamic content
 * - ISR caching (24 hours for static, 5 minutes for dynamic)
 * - Merge static SEO content with dynamic market statistics
 */
export const locationPagesRouter = router({
  /**
   * Get province data (legacy method - dynamic only)
   */
  getProvinceData: publicProcedure
    .input(
      z.object({
        provinceSlug: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return await locationPagesService.getProvinceData(input.provinceSlug);
    }),

  /**
   * Get city data (legacy method - dynamic only)
   */
  getCityData: publicProcedure
    .input(
      z.object({
        provinceSlug: z.string(),
        citySlug: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return await locationPagesService.getCityData(input.provinceSlug, input.citySlug);
    }),

  /**
   * Get suburb data (legacy method - dynamic only)
   */
  getSuburbData: publicProcedure
    .input(
      z.object({
        provinceSlug: z.string(),
        citySlug: z.string(),
        suburbSlug: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return await locationPagesService.getSuburbData(
        input.provinceSlug,
        input.citySlug,
        input.suburbSlug,
      );
    }),

  /**
   * Get enhanced province data with Google Places integration
   * Requirements 24.1-24.5, 28.1-28.5: Merge static + dynamic content
   *
   * Returns:
   * - Static SEO content from locations table (80%, cached 24 hours)
   * - Dynamic market statistics from listings (20%, cached 5 minutes)
   */
  getEnhancedProvinceData: publicProcedure
    .input(
      z.object({
        provinceSlug: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return await locationPagesService.getEnhancedProvinceData(input.provinceSlug);
    }),

  /**
   * Get enhanced city data with Google Places integration
   * Requirements 24.1-24.5, 28.1-28.5: Merge static + dynamic content
   */
  getEnhancedCityData: publicProcedure
    .input(
      z.object({
        provinceSlug: z.string(),
        citySlug: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return await locationPagesService.getEnhancedCityData(input.provinceSlug, input.citySlug);
    }),

  /**
   * Get enhanced suburb data with Google Places integration
   * Requirements 24.1-24.5, 28.1-28.5: Merge static + dynamic content
   */
  getEnhancedSuburbData: publicProcedure
    .input(
      z.object({
        provinceSlug: z.string(),
        citySlug: z.string(),
        suburbSlug: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return await locationPagesService.getEnhancedSuburbData(
        input.provinceSlug,
        input.citySlug,
        input.suburbSlug,
      );
    }),

  /**
   * Get location by path (supports slug-based lookups)
   * Requirements 24.1, 28.1: Fetch static content from locations table
   */
  getLocationByPath: publicProcedure
    .input(
      z.object({
        province: z.string(),
        city: z.string().optional(),
        suburb: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      return await locationPagesService.getLocationByPath(input.province, input.city, input.suburb);
    }),

  /**
   * Invalidate location cache
   * Requirements 24.4: Invalidate cached statistics when listings change
   *
   * This should be called when a listing is created, updated, or deleted
   */
  invalidateLocationCache: publicProcedure
    .input(
      z.object({
        locationId: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      await locationPagesService.invalidateLocationCache(input.locationId);
      return { success: true };
    }),

  /**
   * Get trending suburbs
   * Requirements 21.4-21.5: Display top 10 trending suburbs with statistics
   *
   * Returns suburbs ranked by search activity with market statistics
   */
  getTrendingSuburbs: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(10),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const { locationAnalyticsService } = await import('./services/locationAnalyticsService');
      return await locationAnalyticsService.getTrendingSuburbs(input?.limit || 10);
    }),

  getPopularCities: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(24).default(12),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      return await locationPagesService.getPopularCities(input?.limit || 12);
    }),

  /**
   * Get similar locations
   * Requirements 22.1-22.5: Display up to 5 similar locations with statistics
   *
   * Returns locations similar to the target based on:
   * - Price bracket (±20%)
   * - Property type distribution
   * - Listing density
   * - Proximity (prioritizes same city)
   */
  getSimilarLocations: publicProcedure
    .input(
      z.object({
        locationId: z.number(),
        limit: z.number().min(1).max(10).default(5),
      }),
    )
    .query(async ({ input }) => {
      const { locationAnalyticsService } = await import('./services/locationAnalyticsService');
      return await locationAnalyticsService.getSimilarLocations(input.locationId, input.limit);
    }),

  /**
   * Get active hero campaign for a location
   * Filters by target slug and date range
   */
  getHeroCampaign: publicProcedure
    .input(
      z.object({
        locationSlug: z.string(),
        fallbacks: z.array(z.string()).optional().default([]),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      const today = new Date();

      const resolvedTargetSlugs = buildCampaignSlugHierarchy(input.locationSlug, input.fallbacks);

      try {
        const resolvedCampaigns = await db
          .select()
          .from(heroCampaigns)
          .where(
            and(
              inArray(heroCampaigns.targetSlug, resolvedTargetSlugs),
              eq(heroCampaigns.isActive, 1),
              or(
                isNull(heroCampaigns.startDate),
                lte(heroCampaigns.startDate, today.toISOString()),
              ),
              or(
                isNull(heroCampaigns.endDate),
                gte(heroCampaigns.endDate, today.toISOString()),
              ),
            ),
          );

        if (resolvedCampaigns.length === 0) {
          return null;
        }

        for (const slug of resolvedTargetSlugs) {
          const match = resolvedCampaigns.find(c => c.targetSlug === slug);
          if (match) {
            return {
              ...match,
              imageUrl: match.backgroundImageUrl,
              landingPageUrl: match.ctaLink,
              altText: match.title,
            };
          }
        }

        return null;
      } catch (error) {
        console.warn('[locationPages.getHeroCampaign] Falling back to null due to query error', {
          locationSlug: input.locationSlug,
          requestedFallbacks: input.fallbacks,
          resolvedHierarchy: resolvedTargetSlugs,
          error,
        });
        return null;
      }

    }),

  /**
   * Submit a resident review for a suburb
   */
  submitReview: publicProcedure
    .input(
      z.object({
        suburbId: z.number(),
        rating: z.number().min(1).max(5),
        userType: z.enum(['resident', 'tenant', 'landlord', 'visitor']),
        pros: z.string(),
        cons: z.string(),
        comment: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { locationInsightsService } = await import('./services/locationInsightsService');
      return await locationInsightsService.submitReview({
        suburbId: input.suburbId,
        userId: 1, // TODO: Get actual user ID from context/session
        rating: input.rating,
        userType: input.userType as any,
        pros: input.pros,
        cons: input.cons,
        comment: input.comment,
      });
    }),
});
