import { z } from 'zod';
import { publicProcedure, router } from './_core/trpc';
import { priceInsightsService } from './services/priceInsightsService';
import { db } from './db';
import { sql } from 'drizzle-orm';

const LevelSchema = z.enum(['national', 'province', 'city']);

export const priceInsightsRouter = router({
  /**
   * Existing endpoint for city insights
   */
  getAllCityInsights: publicProcedure.query(async () => {
    try {
      const insights = await priceInsightsService.getAllCityInsights();
      return insights;
    } catch (error) {
      console.error('Error fetching price insights:', error);
      throw new Error('Failed to fetch price insights');
    }
  }),

  /**
   * New hierarchical endpoint
   */
  getHierarchy: publicProcedure
    .input(
      z.object({
        level: LevelSchema,
        parentId: z.number().optional(),
      }),
    )
    .query(async ({ input }) => {
      const { level, parentId } = input;

      // Basic Guard
      if (level !== 'national' && typeof parentId !== 'number') {
        return {
          tabs: [],
          summariesByTabId: {},
          topChildrenByTabId: {},
        };
      }

      // 1) Fetch Tabs (Entities for the current level)
      let tabs: Array<{ id: number; name: string }> = [];

      try {
        if (level === 'national') {
          // National level -> tabs are Provinces
          const result = await db.execute(sql`
            SELECT id, name
            FROM provinces
            ORDER BY name ASC
          `);
          tabs = (result[0] as any[]) || [];
        }

        if (level === 'province') {
          // Province level -> tabs are Cities in that province
          const result = await db.execute(sql`
            SELECT id, name
            FROM cities
            WHERE provinceId = ${parentId}
            ORDER BY name ASC
          `);
          tabs = (result[0] as any[]) || [];
        }

        if (level === 'city') {
          // City level -> tabs are Suburbs in that city
          const result = await db.execute(sql`
            SELECT id, name
            FROM suburbs
            WHERE cityId = ${parentId}
            ORDER BY name ASC
          `);
          tabs = (result[0] as any[]) || [];
        }
      } catch (error) {
        console.error('Error fetching tabs:', error);
        // Return empty structure on error to prevent UI crash
        return { tabs: [], summariesByTabId: {}, topChildrenByTabId: {} };
      }

      // 2) Fetch Summaries for each Tab
      const summariesByTabId: Record<
        string,
        { medianPrice: number | null; avgPrice: number | null; listingCount: number | null }
      > = {};

      try {
        if (tabs.length > 0) {
          if (level === 'national') {
            // National level summary: Aggregate city_price_analytics grouped by provinceId
            const result = await db.execute(sql`
              SELECT
                provinceId AS id,
                AVG(currentAvgPrice) AS avg_price,
                AVG(currentMedianPrice) AS median_price,
                SUM(activeListings) AS listing_count
              FROM city_price_analytics
              GROUP BY provinceId
            `);
            const rows = (result[0] as any[]) || [];

            for (const row of rows) {
              summariesByTabId[String(row.id)] = {
                medianPrice: row.median_price != null ? Number(row.median_price) : null,
                avgPrice: row.avg_price != null ? Number(row.avg_price) : null,
                listingCount: row.listing_count != null ? Number(row.listing_count) : null,
              };
            }
          }

          if (level === 'province') {
            // Province level summary: Direct selection from city_price_analytics for specific cities
            const result = await db.execute(sql`
              SELECT
                cityId AS id,
                currentAvgPrice AS avg_price,
                currentMedianPrice AS median_price,
                activeListings AS listing_count
              FROM city_price_analytics
              WHERE provinceId = ${parentId}
            `);
            const rows = (result[0] as any[]) || [];

            for (const row of rows) {
              summariesByTabId[String(row.id)] = {
                medianPrice: row.median_price != null ? Number(row.median_price) : null,
                avgPrice: row.avg_price != null ? Number(row.avg_price) : null,
                listingCount: row.listing_count != null ? Number(row.listing_count) : null,
              };
            }
          }

          if (level === 'city') {
            // City level summary: Direct selection from suburb_price_analytics for specific suburbs
            const result = await db.execute(sql`
              SELECT
                suburbId AS id,
                currentAvgPrice AS avg_price,
                currentMedianPrice AS median_price,
                currentPriceCount AS listing_count
              FROM suburb_price_analytics
              WHERE cityId = ${parentId}
            `);
            const rows = (result[0] as any[]) || [];

            for (const row of rows) {
              summariesByTabId[String(row.id)] = {
                medianPrice: row.median_price != null ? Number(row.median_price) : null,
                avgPrice: row.avg_price != null ? Number(row.avg_price) : null,
                listingCount: row.listing_count != null ? Number(row.listing_count) : null,
              };
            }
          }
        }
      } catch (error) {
        console.error('Error fetching summaries:', error);
        // Continue with partial data
      }

      // 3) Fetch Top Children (Explore) for each Tab
      const topChildrenByTabId: Record<
        string,
        Array<{ id: number; name: string; medianPrice: number | null }>
      > = {};

      try {
        if (level === 'national') {
          // National level -> Show top Cities for each Province
          // We join city_price_analytics with cities
          const result = await db.execute(sql`
            SELECT * FROM (
              SELECT
                c.id,
                c.name,
                cpa.provinceId AS tab_id,
                cpa.currentMedianPrice AS median_price,
                ROW_NUMBER() OVER (
                  PARTITION BY cpa.provinceId
                  ORDER BY cpa.currentMedianPrice DESC
                ) AS rn
              FROM city_price_analytics cpa
              JOIN cities c ON c.id = cpa.cityId
              WHERE cpa.currentMedianPrice IS NOT NULL
            ) t
            WHERE t.rn <= 5
          `);
          const rows = (result[0] as any[]) || [];

          for (const row of rows) {
            const key = String(row.tab_id);
            if (!topChildrenByTabId[key]) topChildrenByTabId[key] = [];

            topChildrenByTabId[key].push({
              id: Number(row.id),
              name: row.name,
              medianPrice: row.median_price != null ? Number(row.median_price) : null,
            });
          }
        }

        if (level === 'province') {
          // Province level -> Show top Suburbs for each City
          // We join suburb_price_analytics with suburbs
          const result = await db.execute(sql`
            SELECT * FROM (
              SELECT
                s.id,
                s.name,
                spa.cityId AS tab_id,
                spa.currentMedianPrice AS median_price,
                ROW_NUMBER() OVER (
                  PARTITION BY spa.cityId
                  ORDER BY spa.currentMedianPrice DESC
                ) AS rn
              FROM suburb_price_analytics spa
              JOIN suburbs s ON s.id = spa.suburbId
              WHERE spa.provinceId = ${parentId}
                AND spa.currentMedianPrice IS NOT NULL
            ) t
            WHERE t.rn <= 5
          `);
          const rows = (result[0] as any[]) || [];

          for (const row of rows) {
            const key = String(row.tab_id);
            if (!topChildrenByTabId[key]) topChildrenByTabId[key] = [];

            topChildrenByTabId[key].push({
              id: Number(row.id),
              name: row.name,
              medianPrice: row.median_price != null ? Number(row.median_price) : null,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching top children:', error);
        // Continue
      }

      return {
        tabs,
        summariesByTabId,
        topChildrenByTabId,
      };
    }),

  /**
   * Endpoint for rich heatmap and chart data
   */
  getSuburbPriceHeatmap: publicProcedure
    .input(
      z.object({
        cityId: z.number().optional(),
        provinceId: z.number().optional(),
        propertyType: z.string().optional(),
        listingType: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }),
    )
    .query(async ({ input }) => {
      const { cityId, provinceId, limit } = input;

      try {
        // Base query to fetch suburb analytics with location details
        // Note: propertyType and listingType filters are placeholders
        // as the current schema aggregates these into the main analytics table
        // or would require a more complex join if they were separate.
        // For now, we return the main aggregated stats.

        let whereClause = sql`spa.currentMedianPrice IS NOT NULL`;

        if (cityId) {
          whereClause = sql`${whereClause} AND spa.cityId = ${cityId}`;
        } else if (provinceId) {
          whereClause = sql`${whereClause} AND spa.provinceId = ${provinceId}`;
        }

        // If neither is strictly selected, we might want to limit to a default province (e.g., Gauteng)
        // or just return top suburbs nationally.
        // Let's default to not filtering further if nothing provided (National View).

        const result = await db.execute(sql`
          SELECT
            spa.suburbId,
            s.name as suburbName,
            c.name as cityName,
            p.name as provinceName,
            spa.currentAvgPrice,
            spa.currentMedianPrice,
            spa.sixMonthGrowthPercent,
            spa.trendingDirection,
            spa.trendConfidence,
            spa.currentPriceCount as propertyCount
          FROM suburb_price_analytics spa
          JOIN suburbs s ON s.id = spa.suburbId
          JOIN cities c ON c.id = spa.cityId
          JOIN provinces p ON p.id = spa.provinceId
          WHERE ${whereClause}
          ORDER BY spa.currentMedianPrice DESC
          LIMIT ${limit}
        `);

        const rows = (result[0] as any[]) || [];

        return rows.map(row => {
          const medianPrice = Number(row.currentMedianPrice || 0);
          const growth = Number(row.sixMonthGrowthPercent || 0);

          // logical categorization
          let priceCategory = 'Mid-Range';
          if (medianPrice < 1000000) priceCategory = 'Budget';
          else if (medianPrice < 2000000) priceCategory = 'Affordable';
          else if (medianPrice < 4000000) priceCategory = 'Mid-Range';
          else if (medianPrice < 8000000) priceCategory = 'High-End';
          else priceCategory = 'Premium';

          // Color logic for heatmap
          let color = '#F59E0B'; // Amber default
          if (priceCategory === 'Budget') color = '#10B981';
          if (priceCategory === 'Affordable') color = '#34D399';
          if (priceCategory === 'High-End') color = '#EF4444';
          if (priceCategory === 'Premium') color = '#7C2D12';

          return {
            suburbId: Number(row.suburbId),
            suburbName: row.suburbName as string,
            cityName: row.cityName as string,
            province: row.provinceName as string,
            averagePrice: Number(row.currentAvgPrice || 0),
            medianPrice: medianPrice,
            sixMonthGrowth: growth,
            trendingDirection: (row.trendingDirection || 'stable') as 'up' | 'down' | 'stable',
            trendConfidence: Number(row.trendConfidence || 0),
            propertyCount: Number(row.propertyCount || 0),
            heatmapIntensity: medianPrice, // simplified intensity
            color: color,
            priceCategory: priceCategory,
            growthInsight:
              growth > 5 ? 'Strong growth area' : growth < -2 ? 'Cooling market' : 'Stable market',
          };
        });
      } catch (error) {
        console.error('Error fetching heatmap data:', error);
        return [];
      }
    }),

  /**
   * Endpoint for rich heatmap and chart data
   */
  getSuburbPriceHeatmap: publicProcedure
    .input(
      z.object({
        cityId: z.number().optional(),
        provinceId: z.number().optional(),
        propertyType: z.string().optional(),
        listingType: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }),
    )
    .query(async ({ input }) => {
      const { cityId, provinceId, limit } = input;

      try {
        // Base query to fetch suburb analytics with location details
        // Note: propertyType and listingType filters are placeholders
        // as the current schema aggregates these into the main analytics table
        // or would require a more complex join if they were separate.
        // For now, we return the main aggregated stats.

        let whereClause = sql`spa.currentMedianPrice IS NOT NULL`;

        if (cityId) {
          whereClause = sql`${whereClause} AND spa.cityId = ${cityId}`;
        } else if (provinceId) {
          whereClause = sql`${whereClause} AND spa.provinceId = ${provinceId}`;
        }

        // If neither is strictly selected, we might want to limit to a default province (e.g., Gauteng)
        // or just return top suburbs nationally.
        // Let's default to not filtering further if nothing provided (National View).

        const result = await db.execute(sql`
          SELECT
            spa.suburbId,
            s.name as suburbName,
            c.name as cityName,
            p.name as provinceName,
            spa.currentAvgPrice,
            spa.currentMedianPrice,
            spa.sixMonthGrowthPercent,
            spa.trendingDirection,
            spa.trendConfidence,
            spa.currentPriceCount as propertyCount
          FROM suburb_price_analytics spa
          JOIN suburbs s ON s.id = spa.suburbId
          JOIN cities c ON c.id = spa.cityId
          JOIN provinces p ON p.id = spa.provinceId
          WHERE ${whereClause}
          ORDER BY spa.currentMedianPrice DESC
          LIMIT ${limit}
        `);

        const rows = (result[0] as any[]) || [];

        return rows.map(row => {
          const medianPrice = Number(row.currentMedianPrice || 0);
          const growth = Number(row.sixMonthGrowthPercent || 0);

          // logical categorization
          let priceCategory = 'Mid-Range';
          if (medianPrice < 1000000) priceCategory = 'Budget';
          else if (medianPrice < 2000000) priceCategory = 'Affordable';
          else if (medianPrice < 4000000) priceCategory = 'Mid-Range';
          else if (medianPrice < 8000000) priceCategory = 'High-End';
          else priceCategory = 'Premium';

          // Color logic for heatmap
          let color = '#F59E0B'; // Amber default
          if (priceCategory === 'Budget') color = '#10B981';
          if (priceCategory === 'Affordable') color = '#34D399';
          if (priceCategory === 'High-End') color = '#EF4444';
          if (priceCategory === 'Premium') color = '#7C2D12';

          return {
            suburbId: Number(row.suburbId),
            suburbName: row.suburbName as string,
            cityName: row.cityName as string,
            province: row.provinceName as string,
            averagePrice: Number(row.currentAvgPrice || 0),
            medianPrice: medianPrice,
            sixMonthGrowth: growth,
            trendingDirection: (row.trendingDirection || 'stable') as 'up' | 'down' | 'stable',
            trendConfidence: Number(row.trendConfidence || 0),
            propertyCount: Number(row.propertyCount || 0),
            heatmapIntensity: medianPrice, // simplified intensity
            color: color,
            priceCategory: priceCategory,
            growthInsight:
              growth > 5 ? 'Strong growth area' : growth < -2 ? 'Cooling market' : 'Stable market',
          };
        });
      } catch (error) {
        console.error('Error fetching heatmap data:', error);
        return [];
      }
    }),
});
