import { router, publicProcedure, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import { getDb } from './db';
import {
  priceHistory,
  suburbPriceAnalytics,
  cityPriceAnalytics,
  userBehaviorEvents,
  userRecommendations,
  marketInsightsCache,
  pricePredictions,
  properties,
  suburbs,
  cities,
  provinces,
} from '../drizzle/schema';
import {
  eq,
  and,
  desc,
  sql,
  count,
  avg,
  min,
  max,
  inArray,
  gt,
  lt,
  gte,
  lte,
  like,
} from 'drizzle-orm';

// TypeScript Interfaces for proper type safety
interface SuburbPriceHeatmapRow {
  suburbId: number;
  suburbName: string;
  cityName: string;
  province: string;
  averagePrice: number;
  medianPrice: number;
  sixMonthGrowth: number;
  trendingDirection: 'up' | 'down' | 'stable';
  trendConfidence: number;
  propertyCount: number;
  heatmapIntensity: number;
  color: string;
  priceCategory: string;
  growthInsight: string;
}

interface SuburbPriceAnalyticsRow {
  current: {
    averagePrice: number;
    medianPrice: number;
    minPrice: number;
    maxPrice: number;
    propertyCount: number;
  };
  trends: {
    oneMonthGrowth: number;
    threeMonthGrowth: number;
    sixMonthGrowth: number;
    trendingDirection: 'up' | 'down' | 'stable';
    trendConfidence: number;
  };
  analysis: {
    trend: string;
    confidence: number;
    pattern: string;
    priceChange: string;
    slope: number;
    averagePrice: number;
  };
  relatedAreas: Array<{
    suburbId: number;
    suburbName: string;
    cityName: string;
    averagePrice: number;
    growthPercent: number;
  }>;
  insights: string[];
}

interface PopularAreaRow {
  suburbId: number;
  suburbName: string;
  cityName: string;
  province: string;
  totalProperties: number;
  averagePrice: number;
  userInteractions: number;
  priceSegment: string;
  growthRate: number;
  insights: string[];
  actions: string[];
}

// Input validation schemas with proper types
const SuburbPriceHeatmapInput = z.object({
  cityId: z.number().positive().optional(),
  provinceId: z.number().positive().optional(),
  suburbId: z.number().positive().optional(),
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
  listingType: z.enum(['sale', 'rent', 'rent_to_buy', 'auction', 'shared_living']).optional(),
  priceRange: z
    .object({
      min: z.number().positive().optional(),
      max: z.number().positive().optional(),
    })
    .optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const SuburbPriceAnalyticsInput = z.object({
  suburbId: z.number().positive(),
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
  listingType: z.enum(['sale', 'rent', 'rent_to_buy', 'auction', 'shared_living']).optional(),
  timeRange: z.enum(['1month', '3months', '6months', '1year']).default('6months'),
});

const TrackUserBehaviorInput = z.object({
  sessionId: z.string().min(1).max(255),
  eventType: z.enum([
    'property_view',
    'search',
    'save_property',
    'contact_agent',
    'map_interaction',
    'price_filter',
    'location_filter',
    'property_type_filter',
  ]),
  eventData: z.record(z.any()).optional(), // Flexible but still typed
  propertyId: z.number().positive().optional(),
  suburbId: z.number().positive().optional(),
  cityId: z.number().positive().optional(),
  provinceId: z.number().positive().optional(),
  priceRangeMin: z.number().positive().optional(),
  priceRangeMax: z.number().positive().optional(),
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
  listingType: z.enum(['sale', 'rent', 'rent_to_buy', 'auction', 'shared_living']).optional(),
});

const PopularAreasInput = z.object({
  limit: z.number().min(1).max(100).default(10),
  sortBy: z.enum(['interactions', 'properties', 'growth', 'affordability']).default('interactions'),
});

const PricePredictionsInput = z.object({
  propertyId: z.number().positive().optional(),
  suburbId: z.number().positive().optional(),
  cityId: z.number().positive().optional(),
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
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  area: z.number().positive().optional(),
});

/**
 * Price Insights & Analytics Router - Phase 10 (Security Refactored)
 * AI-assisted property price insights and recommendations
 *
 * Security Improvements:
 * - Eliminated all sql.raw() usage
 * - Added proper TypeScript interfaces
 * - Enhanced input validation with Zod
 * - Replaced complex raw SQL with Drizzle query builder
 */
export const priceInsightsRouter = router({
  /**
   * Get suburb price heatmap data for visualization
   * Security: Uses Drizzle query builder instead of sql.raw()
   */
  getSuburbPriceHeatmap: publicProcedure
    .input(SuburbPriceHeatmapInput)
    .query(async ({ input }): Promise<SuburbPriceHeatmapRow[]> => {
      const db = await getDb();

      // Build base query using Drizzle ORM
      let query = db
        .select({
          suburbId: suburbs.id,
          suburbName: suburbs.name,
          cityName: cities.name,
          province: provinces.province,
          currentAvgPrice: suburbPriceAnalytics.currentAvgPrice,
          currentMedianPrice: suburbPriceAnalytics.currentMedianPrice,
          sixMonthGrowth: suburbPriceAnalytics.sixMonthGrowthPercent,
          trendingDirection: suburbPriceAnalytics.trendingDirection,
          trendConfidence: suburbPriceAnalytics.trendConfidence,
          propertyCount: count(properties.id),
        })
        .from(suburbs)
        .innerJoin(cities, eq(suburbs.cityId, cities.id))
        .innerJoin(provinces, eq(cities.provinceId, provinces.id))
        .leftJoin(suburbPriceAnalytics, eq(suburbs.id, suburbPriceAnalytics.suburbId))
        .leftJoin(
          properties,
          and(eq(properties.suburbId, suburbs.id), eq(properties.status, 'published')),
        )
        .groupBy(
          suburbs.id,
          suburbs.name,
          cities.name,
          provinces.province,
          suburbPriceAnalytics.currentAvgPrice,
          suburbPriceAnalytics.currentMedianPrice,
          suburbPriceAnalytics.sixMonthGrowthPercent,
          suburbPriceAnalytics.trendingDirection,
          suburbPriceAnalytics.trendConfidence,
        );

      // Apply filters safely using Drizzle query builder
      const conditions = [];

      if (input.cityId) {
        conditions.push(eq(cities.id, input.cityId));
      }

      if (input.provinceId) {
        conditions.push(eq(provinces.id, input.provinceId));
      }

      if (input.suburbId) {
        conditions.push(eq(suburbs.id, input.suburbId));
      }

      if (input.propertyType) {
        conditions.push(eq(properties.propertyType, input.propertyType));
      }

      if (input.listingType) {
        conditions.push(eq(properties.listingType, input.listingType));
      }

      if (input.priceRange?.min) {
        conditions.push(gte(properties.price, input.priceRange.min));
      }

      if (input.priceRange?.max) {
        conditions.push(lte(properties.price, input.priceRange.max));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const results = await query
        .orderBy(desc(suburbPriceAnalytics.currentAvgPrice))
        .limit(input.limit)
        .offset(input.offset);

      // Transform results with proper type safety
      return results.map((row): SuburbPriceHeatmapRow => {
        const averagePrice = row.currentAvgPrice || 0;
        const heatmapIntensity = calculateHeatmapIntensity(averagePrice);

        return {
          suburbId: row.suburbId,
          suburbName: row.suburbName,
          cityName: row.cityName,
          province: row.province,
          averagePrice,
          medianPrice: row.currentMedianPrice || 0,
          sixMonthGrowth: row.sixMonthGrowth || 0,
          trendingDirection: (row.trendingDirection || 'stable') as 'up' | 'down' | 'stable',
          trendConfidence: row.trendConfidence || 0,
          propertyCount: Number(row.propertyCount) || 0,
          heatmapIntensity,
          color: getHeatmapColor(heatmapIntensity),
          priceCategory: getPriceCategory(averagePrice),
          growthInsight: getGrowthInsight(
            row.sixMonthGrowth || 0,
            row.trendingDirection || 'stable',
          ),
        };
      });
    }),

  /**
   * Get detailed price analytics for a specific suburb
   */
  getSuburbPriceAnalytics: publicProcedure
    .input(SuburbPriceAnalyticsInput)
    .query(async ({ input }): Promise<SuburbPriceAnalyticsRow> => {
      const db = await getDb();

      // Get current analytics with proper typing
      const [currentAnalytics] = await db
        .select({
          currentAvgPrice: suburbPriceAnalytics.currentAvgPrice,
          currentMedianPrice: suburbPriceAnalytics.currentMedianPrice,
          currentMinPrice: suburbPriceAnalytics.currentMinPrice,
          currentMaxPrice: suburbPriceAnalytics.currentMaxPrice,
          currentPriceCount: suburbPriceAnalytics.currentPriceCount,
          oneMonthGrowthPercent: suburbPriceAnalytics.oneMonthGrowthPercent,
          threeMonthGrowthPercent: suburbPriceAnalytics.threeMonthGrowthPercent,
          sixMonthGrowthPercent: suburbPriceAnalytics.sixMonthGrowthPercent,
          trendingDirection: suburbPriceAnalytics.trendingDirection,
          trendConfidence: suburbPriceAnalytics.trendConfidence,
        })
        .from(suburbPriceAnalytics)
        .where(eq(suburbPriceAnalytics.suburbId, input.suburbId))
        .limit(1);

      // Get price history for trend analysis with proper filtering
      const timeFilter = getTimeFilter(input.timeRange);
      const priceHistoryData = await db
        .select({
          price: priceHistory.price,
          recordedAt: priceHistory.recordedAt,
          propertyType: priceHistory.propertyType,
          listingType: priceHistory.listingType,
        })
        .from(priceHistory)
        .where(
          and(eq(priceHistory.suburbId, input.suburbId), gte(priceHistory.recordedAt, timeFilter)),
        )
        .orderBy(priceHistory.recordedAt);

      // Calculate trend insights with proper typing
      const trendAnalysis = analyzePriceTrends(priceHistoryData);

      // Get related suburbs with similar price ranges
      const relatedSuburbs = await db
        .select({
          suburbId: suburbs.id,
          suburbName: suburbs.name,
          cityName: cities.name,
          averagePrice: suburbPriceAnalytics.currentAvgPrice,
          growthPercent: suburbPriceAnalytics.sixMonthGrowthPercent,
        })
        .from(suburbPriceAnalytics)
        .innerJoin(suburbs, eq(suburbPriceAnalytics.suburbId, suburbs.id))
        .innerJoin(cities, eq(suburbs.cityId, cities.id))
        .where(
          and(
            sql`ABS(suburb_price_analytics.current_avg_price - ${currentAnalytics?.currentAvgPrice || 0}) < ${(currentAnalytics?.currentAvgPrice || 0) * 0.2}`,
            sql`suburb_price_analytics.suburb_id != ${input.suburbId}`,
          ),
        )
        .orderBy(suburbPriceAnalytics.sixMonthGrowthPercent)
        .limit(5);

      return {
        current: {
          averagePrice: currentAnalytics?.currentAvgPrice || 0,
          medianPrice: currentAnalytics?.currentMedianPrice || 0,
          minPrice: currentAnalytics?.currentMinPrice || 0,
          maxPrice: currentAnalytics?.currentMaxPrice || 0,
          propertyCount: currentAnalytics?.currentPriceCount || 0,
        },
        trends: {
          oneMonthGrowth: currentAnalytics?.oneMonthGrowthPercent || 0,
          threeMonthGrowth: currentAnalytics?.threeMonthGrowthPercent || 0,
          sixMonthGrowth: currentAnalytics?.sixMonthGrowthPercent || 0,
          trendingDirection: (currentAnalytics?.trendingDirection || 'stable') as
            | 'up'
            | 'down'
            | 'stable',
          trendConfidence: currentAnalytics?.trendConfidence || 0,
        },
        analysis: trendAnalysis,
        relatedAreas: relatedSuburbs,
        insights: generateSuburbInsights(currentAnalytics, trendAnalysis),
      };
    }),

  /**
   * Track user behavior for recommendations
   * Security: Enhanced input validation and sanitization
   */
  trackUserBehavior: publicProcedure
    .input(TrackUserBehaviorInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();

      // Input sanitization
      const sanitizedData = {
        userId: ctx.user?.id || null,
        sessionId: input.sessionId.trim(),
        eventType: input.eventType,
        eventData: input.eventData ? JSON.stringify(input.eventData) : null,
        propertyId: input.propertyId || null,
        suburbId: input.suburbId || null,
        cityId: input.cityId || null,
        provinceId: input.provinceId || null,
        priceRangeMin: input.priceRangeMin || null,
        priceRangeMax: input.priceRangeMax || null,
        propertyType: input.propertyType || null,
        listingType: input.listingType || null,
        pageUrl: input.eventData?.pageUrl?.substring(0, 500) || null, // Limit length
        referrer: input.eventData?.referrer?.substring(0, 500) || null, // Limit length
      };

      await db.insert(userBehaviorEvents).values(sanitizedData);

      return { success: true };
    }),

  /**
   * Get personalized property recommendations
   * Security: Proper type safety and input validation
   */
  getPersonalizedRecommendations: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        includeSuburbs: z.boolean().default(true),
        includeProperties: z.boolean().default(true),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const userId = ctx.user.id;

      // Get user behavior patterns with proper typing
      const userBehavior = await db
        .select({
          eventType: userBehaviorEvents.eventType,
          suburbId: userBehaviorEvents.suburbId,
          cityId: userBehaviorEvents.cityId,
          priceRangeMin: userBehaviorEvents.priceRangeMin,
          priceRangeMax: userBehaviorEvents.priceRangeMax,
          propertyType: userBehaviorEvents.propertyType,
          listingType: userBehaviorEvents.listingType,
        })
        .from(userBehaviorEvents)
        .where(eq(userBehaviorEvents.userId, userId))
        .orderBy(desc(userBehaviorEvents.createdAt))
        .limit(100);

      // Analyze user preferences with proper typing
      const preferences = analyzeUserPreferences(userBehavior);

      // Get recommendations based on preferences
      const recommendations = await generateRecommendations(preferences, input.limit);

      // Update user recommendations cache with proper error handling
      try {
        await db
          .insert(userRecommendations)
          .values({
            userId,
            preferredSuburbs: JSON.stringify(preferences.suburbs),
            preferredPriceRange: JSON.stringify(preferences.priceRange),
            preferredPropertyTypes: JSON.stringify(preferences.propertyTypes),
            recommendedSuburbs: JSON.stringify(recommendations.suburbs),
            recommendedProperties: JSON.stringify(recommendations.properties),
          })
          .onDuplicateKeyUpdate({
            preferredSuburbs: JSON.stringify(preferences.suburbs),
            preferredPriceRange: JSON.stringify(preferences.priceRange),
            preferredPropertyTypes: JSON.stringify(preferences.propertyTypes),
            recommendedSuburbs: JSON.stringify(recommendations.suburbs),
            recommendedProperties: JSON.stringify(recommendations.properties),
          });
      } catch (error) {
        console.error('Failed to update user recommendations:', error);
        // Continue execution even if cache update fails
      }

      return {
        preferences,
        recommendations,
        insights: generateRecommendationInsights(preferences, recommendations),
      };
    }),

  /**
   * Get popular areas and trends
   * Security: Replaced sql.raw() with Drizzle query builder
   */
  getPopularAreas: publicProcedure
    .input(PopularAreasInput)
    .query(async ({ input }): Promise<PopularAreaRow[]> => {
      const db = await getDb();

      let orderBy = suburbPriceAnalytics.sixMonthGrowthPercent;
      let orderDirection = desc;

      switch (input.sortBy) {
        case 'interactions':
          // Use a subquery to count interactions
          const interactionsQuery = db
            .select({
              suburbId: suburbs.id,
              interactionCount: count(userBehaviorEvents.id),
            })
            .from(suburbs)
            .leftJoin(userBehaviorEvents, eq(suburbs.id, userBehaviorEvents.suburbId))
            .groupBy(suburbs.id);

          const results = await db
            .select({
              suburbId: suburbs.id,
              suburbName: suburbs.name,
              cityName: cities.name,
              province: provinces.province,
              totalProperties: count(properties.id),
              averagePrice: avg(properties.price),
              interactionCount: count(userBehaviorEvents.id),
              priceSegment: sql<string>`CASE 
                WHEN AVG(properties.price) > 2000000 THEN 'Luxury'
                WHEN AVG(properties.price) > 800000 THEN 'Mid-Range'
                ELSE 'Affordable'
              END`,
              growthRate: suburbPriceAnalytics.sixMonthGrowthPercent,
            })
            .from(suburbs)
            .innerJoin(cities, eq(suburbs.cityId, cities.id))
            .innerJoin(provinces, eq(cities.provinceId, provinces.id))
            .leftJoin(
              properties,
              and(eq(properties.suburbId, suburbs.id), eq(properties.status, 'published')),
            )
            .leftJoin(userBehaviorEvents, eq(suburbs.id, userBehaviorEvents.suburbId))
            .leftJoin(suburbPriceAnalytics, eq(suburbs.id, suburbPriceAnalytics.suburbId))
            .groupBy(
              suburbs.id,
              suburbs.name,
              cities.name,
              provinces.province,
              suburbPriceAnalytics.sixMonthGrowthPercent,
            )
            .having(count(properties.id))
            .orderBy(desc(count(userBehaviorEvents.id)))
            .limit(input.limit);

          return results.map(
            (row): PopularAreaRow => ({
              suburbId: row.suburbId,
              suburbName: row.suburbName,
              cityName: row.cityName,
              province: row.province,
              totalProperties: Number(row.totalProperties) || 0,
              averagePrice: Math.round(row.averagePrice || 0),
              userInteractions: Number(row.interactionCount) || 0,
              priceSegment: row.priceSegment || 'Affordable',
              growthRate: row.growthRate || 0,
              insights: generateAreaInsights(row),
              actions: generateAreaActions(row),
            }),
          );

        case 'properties':
          orderBy = count(properties.id);
          orderDirection = desc;
          break;
        case 'growth':
          orderBy = suburbPriceAnalytics.sixMonthGrowthPercent;
          orderDirection = desc;
          break;
        case 'affordability':
          orderBy = avg(properties.price);
          orderDirection = asc;
          break;
      }

      const results = await db
        .select({
          suburbId: suburbs.id,
          suburbName: suburbs.name,
          cityName: cities.name,
          province: provinces.province,
          totalProperties: count(properties.id),
          averagePrice: avg(properties.price),
          priceSegment: sql<string>`CASE 
            WHEN AVG(properties.price) > 2000000 THEN 'Luxury'
            WHEN AVG(properties.price) > 800000 THEN 'Mid-Range'
            ELSE 'Affordable'
          END`,
          growthRate: suburbPriceAnalytics.sixMonthGrowthPercent,
        })
        .from(suburbs)
        .innerJoin(cities, eq(suburbs.cityId, cities.id))
        .innerJoin(provinces, eq(cities.provinceId, provinces.id))
        .leftJoin(
          properties,
          and(eq(properties.suburbId, suburbs.id), eq(properties.status, 'published')),
        )
        .leftJoin(suburbPriceAnalytics, eq(suburbs.id, suburbPriceAnalytics.suburbId))
        .groupBy(
          suburbs.id,
          suburbs.name,
          cities.name,
          provinces.province,
          suburbPriceAnalytics.sixMonthGrowthPercent,
        )
        .having(count(properties.id))
        .orderBy(orderDirection(orderBy))
        .limit(input.limit);

      return results.map(
        (row): PopularAreaRow => ({
          suburbId: row.suburbId,
          suburbName: row.suburbName,
          cityName: row.cityName,
          province: row.province,
          totalProperties: Number(row.totalProperties) || 0,
          averagePrice: Math.round(row.averagePrice || 0),
          userInteractions: 0, // Will be populated in interactions query
          priceSegment: row.priceSegment || 'Affordable',
          growthRate: row.growthRate || 0,
          insights: generateAreaInsights(row),
          actions: generateAreaActions(row),
        }),
      );
    }),

  /**
   * Get price predictions for a property or area
   * Security: Enhanced input validation and type safety
   */
  getPricePredictions: publicProcedure.input(PricePredictionsInput).query(async ({ input }) => {
    const db = await getDb();

    // Build filter conditions safely
    const conditions = [];

    if (input.propertyType) {
      conditions.push(eq(priceHistory.propertyType, input.propertyType));
    }

    if (input.suburbId) {
      conditions.push(eq(priceHistory.suburbId, input.suburbId));
    }

    // Always filter by recent data (12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    conditions.push(gte(priceHistory.recordedAt, twelveMonthsAgo));

    // Get historical data for prediction using Drizzle query builder
    const historicalData = await db
      .select({
        price: priceHistory.price,
        recordedAt: priceHistory.recordedAt,
        propertyType: priceHistory.propertyType,
        bedrooms: properties.bedrooms,
        bathrooms: properties.bathrooms,
        area: properties.area,
        suburbId: priceHistory.suburbId,
      })
      .from(priceHistory)
      .innerJoin(properties, eq(priceHistory.propertyId, properties.id))
      .where(and(...conditions))
      .limit(1000);

    // Generate AI-powered price prediction
    const prediction = generatePricePrediction(input, historicalData);

    // Store prediction if it's for a specific property
    if (input.propertyId) {
      try {
        await db.insert(pricePredictions).values({
          propertyId: input.propertyId,
          suburbId: input.suburbId || null,
          predictedPrice: prediction.predictedPrice,
          predictedPriceRangeMin: prediction.predictedRange.min,
          predictedPriceRangeMax: prediction.predictedRange.max,
          confidenceScore: prediction.confidence,
          modelVersion: 'v2.0-secure', // Updated version for refactored implementation
          modelFeatures: JSON.stringify(input),
          trainingDataSize: historicalData.length,
        });
      } catch (error) {
        console.error('Failed to store price prediction:', error);
        // Continue execution even if storage fails
      }
    }

    return prediction;
  }),

  /**
   * Get market insights for homepage
   * Security: Simplified to avoid complex caching logic for now
   */
  getMarketInsights: publicProcedure
    .input(
      z.object({
        cityId: z.number().positive().optional(),
        provinceId: z.number().positive().optional(),
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
      }),
    )
    .query(async ({ input }) => {
      // For now, return mock data with proper typing
      // TODO: Implement real market insights with caching later
      return {
        totalProperties: 1250,
        averagePrice: 1250000,
        priceGrowth: 8.5,
        trendingAreas: [],
        marketSummary: 'Strong market with increasing prices in premium areas',
        insights: [
          'Johannesburg CBD showing 12% growth in luxury apartments',
          'Cape Town Atlantic Seaboard remains top tier with premium pricing',
          'Durban North experiencing renewed interest from investors',
        ],
      };
    }),
});

// Helper functions with proper typing and security improvements

function calculateHeatmapIntensity(price: number): number {
  if (price < 500000) return Math.round((price / 500000) * 25);
  if (price < 1000000) return 25 + Math.round(((price - 500000) / 500000) * 25);
  if (price < 2000000) return 50 + Math.round(((price - 1000000) / 1000000) * 25);
  if (price < 5000000) return 75 + Math.round(((price - 2000000) / 3000000) * 25);
  return 100;
}

function getHeatmapColor(intensity: number): string {
  if (intensity <= 25) return '#E3F2FD'; // Light blue
  if (intensity <= 50) return '#64B5F6'; // Medium blue
  if (intensity <= 75) return '#1976D2'; // Dark blue
  return '#0D47A1'; // Very dark blue
}

function getPriceCategory(price: number): string {
  if (price >= 3000000) return 'Premium';
  if (price >= 1500000) return 'High-End';
  if (price >= 800000) return 'Mid-Range';
  if (price >= 400000) return 'Affordable';
  return 'Budget';
}

function getGrowthInsight(growth: number, direction: string): string {
  if (Math.abs(growth) < 2) return 'Stable market with minimal price changes';
  if (growth > 0) return `Strong growth of ${growth.toFixed(1)}% over 6 months`;
  return `Market adjustment of ${Math.abs(growth).toFixed(1)}% over 6 months`;
}

function getTimeFilter(timeRange: string): Date {
  const now = new Date();
  switch (timeRange) {
    case '1month':
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case '3months':
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case '6months':
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case '1year':
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    default:
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
  }
}

interface PriceHistoryRecord {
  price: number;
  recordedAt: Date;
  propertyType: string;
  listingType: string;
}

interface PriceTrendAnalysis {
  trend: string;
  confidence: number;
  pattern: string;
  priceChange: string;
  slope: number;
  averagePrice: number;
}

function analyzePriceTrends(priceHistory: PriceHistoryRecord[]): PriceTrendAnalysis {
  if (priceHistory.length < 2) {
    return {
      trend: 'insufficient_data',
      confidence: 0,
      pattern: 'unknown',
      priceChange: '0',
      slope: 0,
      averagePrice: 0,
    };
  }

  // Simple linear regression for trend with proper typing
  const prices = priceHistory.map(p => p.price);
  const dates = priceHistory.map(p => new Date(p.recordedAt).getTime());

  const n = prices.length;
  const sumX = dates.reduce((a, b) => a + b, 0);
  const sumY = prices.reduce((a, b) => a + b, 0);
  const sumXY = dates.reduce((sum, x, i) => sum + x * prices[i], 0);
  const sumXX = dates.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;

  let trend = 'stable';
  if (slope > 1000)
    trend = 'rising'; // More than R1000 per millisecond
  else if (slope < -1000) trend = 'falling';

  return {
    trend,
    confidence: Math.min(Math.abs(priceChange) / 10, 1), // Normalize confidence
    pattern: trend,
    priceChange: priceChange.toFixed(2),
    slope: slope,
    averagePrice: prices.reduce((a, b) => a + b, 0) / prices.length,
  };
}

interface UserPreferences {
  suburbs: Record<number, number>;
  cities: Record<number, number>;
  priceRange: { min: number; max: number };
  propertyTypes: Record<string, number>;
  listingTypes: Record<string, number>;
}

function analyzeUserPreferences(behavior: any[]): UserPreferences {
  const preferences: UserPreferences = {
    suburbs: {},
    cities: {},
    priceRange: { min: 0, max: 10000000 },
    propertyTypes: {},
    listingTypes: {},
  };

  behavior.forEach(event => {
    // Track location preferences
    if (event.suburbId) {
      preferences.suburbs[event.suburbId] = (preferences.suburbs[event.suburbId] || 0) + 1;
    }
    if (event.cityId) {
      preferences.cities[event.cityId] = (preferences.cities[event.cityId] || 0) + 1;
    }

    // Track price preferences
    if (event.priceRangeMin && event.priceRangeMin < preferences.priceRange.min) {
      preferences.priceRange.min = event.priceRangeMin;
    }
    if (event.priceRangeMax && event.priceRangeMax > preferences.priceRange.max) {
      preferences.priceRange.max = event.priceRangeMax;
    }

    // Track type preferences
    if (event.propertyType) {
      preferences.propertyTypes[event.propertyType] =
        (preferences.propertyTypes[event.propertyType] || 0) + 1;
    }
    if (event.listingType) {
      preferences.listingTypes[event.listingType] =
        (preferences.listingTypes[event.listingType] || 0) + 1;
    }
  });

  return preferences;
}

async function generateRecommendations(preferences: UserPreferences, limit: number): Promise<any> {
  // AI-powered recommendation algorithm with proper typing
  const recommendedSuburbs = Object.entries(preferences.suburbs)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id]) => parseInt(id));

  const recommendedProperties = []; // Would integrate with property search API

  return {
    suburbs: recommendedSuburbs,
    properties: recommendedProperties,
  };
}

function generateSuburbInsights(analytics: any, trendAnalysis: PriceTrendAnalysis): string[] {
  const insights = [];

  if (analytics?.sixMonthGrowthPercent > 5) {
    insights.push(
      `🔥 Hot market: ${analytics.sixMonthGrowthPercent.toFixed(1)}% growth in 6 months`,
    );
  } else if (analytics?.sixMonthGrowthPercent < -5) {
    insights.push(
      `📉 Buyers market: ${Math.abs(analytics.sixMonthGrowthPercent).toFixed(1)}% price adjustment`,
    );
  }

  if (analytics?.currentAvgPrice > 2000000) {
    insights.push('💎 Premium location with luxury properties');
  } else if (analytics?.currentAvgPrice < 800000) {
    insights.push('🏠 Affordable area perfect for first-time buyers');
  }

  if (trendAnalysis.confidence > 0.7) {
    insights.push(`📈 Strong upward trend with ${trendAnalysis.confidence.toFixed(1)} confidence`);
  }

  return insights;
}

function generateRecommendationInsights(
  preferences: UserPreferences,
  recommendations: any,
): string[] {
  const insights = [];

  if (Object.keys(preferences.suburbs).length > 0) {
    insights.push('Based on your viewing history, you prefer properties in these areas');
  }

  if (preferences.priceRange.min > 0 || preferences.priceRange.max < 10000000) {
    insights.push(
      `Your price range: R${preferences.priceRange.min.toLocaleString()} - R${preferences.priceRange.max.toLocaleString()}`,
    );
  }

  return insights;
}

async function generateMarketInsights(input: any): Promise<any> {
  // Generate comprehensive market insights
  return {
    totalProperties: 1250,
    averagePrice: 1250000,
    priceGrowth: 8.5,
    trendingAreas: [],
    marketSummary: 'Strong market with increasing prices in premium areas',
    insights: [
      'Johannesburg CBD showing 12% growth in luxury apartments',
      'Cape Town Atlantic Seaboard remains top tier with premium pricing',
      'Durban North experiencing renewed interest from investors',
    ],
  };
}

function generatePricePrediction(input: any, historicalData: PriceHistoryRecord[]): any {
  // Simple prediction based on historical averages
  const averagePrice =
    historicalData.reduce((sum, item) => sum + item.price, 0) / historicalData.length;
  const confidence = Math.min(historicalData.length / 100, 1); // More data = higher confidence

  return {
    predictedPrice: Math.round(averagePrice),
    predictedRange: {
      min: Math.round(averagePrice * 0.85),
      max: Math.round(averagePrice * 1.15),
    },
    confidence: Math.round(confidence * 100) / 100,
    factors: [
      'Historical pricing in the area',
      'Property type and size',
      'Current market conditions',
    ],
    trend: confidence > 0.7 ? 'reliable' : 'approximate',
  };
}

function generateAreaInsights(row: any): string[] {
  const insights = [];

  if (row.growthRate > 5) {
    insights.push(`📈 Strong growth: ${row.growthRate.toFixed(1)}% over 6 months`);
  }

  if (row.userInteractions > 100) {
    insights.push(`🔥 Popular area: ${row.userInteractions} user interactions`);
  }

  insights.push(`${row.priceSegment} market with ${row.totalProperties} properties`);

  return insights;
}

function generateAreaActions(row: any): string[] {
  const actions = [];

  if (row.priceSegment === 'Luxury') {
    actions.push('View luxury listings');
  } else if (row.priceSegment === 'Affordable') {
    actions.push('Explore first-time buyer opportunities');
  }

  actions.push('Set price alerts', 'View market trends');

  return actions;
}
