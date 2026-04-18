import { z } from 'zod';
import { publicProcedure, router } from './_core/trpc';
import { priceInsightsService } from './services/priceInsightsService';
import { getDb } from './db';
import { sql } from 'drizzle-orm';

const LevelSchema = z.enum(['national', 'province', 'city']);

function extractRows(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result)) {
    if (result.length === 0) return [];
    if (Array.isArray(result[0])) return result[0] as any[];
    return result as any[];
  }
  if (Array.isArray((result as any).rows)) return (result as any).rows;
  return [];
}

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
      const db = await getDb();
      if (!db) {
        return {
          tabs: [],
          summariesByTabId: {},
          topChildrenByTabId: {},
        };
      }

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
          tabs = extractRows(result);
        }

        if (level === 'province') {
          // Province level -> tabs are Cities in that province
          try {
            const result = await db.execute(sql`
              SELECT id, name
              FROM cities
              WHERE provinceId = ${parentId}
              ORDER BY name ASC
            `);
            tabs = extractRows(result);
          } catch {
            const result = await db.execute(sql`
              SELECT id, name
              FROM cities
              WHERE province_id = ${parentId}
              ORDER BY name ASC
            `);
            tabs = extractRows(result);
          }
        }

        if (level === 'city') {
          // City level -> tabs are Suburbs in that city
          try {
            const result = await db.execute(sql`
              SELECT id, name
              FROM suburbs
              WHERE cityId = ${parentId}
              ORDER BY name ASC
            `);
            tabs = extractRows(result);
          } catch {
            const result = await db.execute(sql`
              SELECT id, name
              FROM suburbs
              WHERE city_id = ${parentId}
              ORDER BY name ASC
            `);
            tabs = extractRows(result);
          }
        }
      } catch (error) {
        console.error('Error fetching tabs:', error);
        // Return empty structure on error to prevent UI crash
        return { tabs: [], summariesByTabId: {}, topChildrenByTabId: {} };
      }

      // 2 & 3) Fetch Summaries and Top Children using Live Data
      try {
        const { summariesByTabId, topChildrenByTabId } = await priceInsightsService.getHierarchyAggregations(level, parentId);
        
        return {
          tabs,
          summariesByTabId,
          topChildrenByTabId,
        };
      } catch (error) {
         console.error('Error fetching aggregation insights:', error);
         return {
          tabs,
          summariesByTabId: {},
          topChildrenByTabId: {},
        };
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
      try {
        const results = await priceInsightsService.getSuburbPriceHeatmap(input);
        return results.map(r => ({
          ...r,
          sixMonthGrowth: 0,
          trendConfidence: r.confidence,
          growthInsight: 'Live metrics aggregation mode active'
        }));
      } catch (error) {
        console.error('Error fetching heatmap data:', error);
        return [];
      }
    }),
});
