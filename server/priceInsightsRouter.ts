import { publicProcedure, router } from './_core/trpc';
import { priceInsightsService } from './services/priceInsightsService';

/**
 * Price Insights tRPC Router
 *
 * Provides API endpoints for property price insights and market analytics
 */

export const priceInsightsRouter = router({
  /**
   * Get price insights for all cities with sufficient listings
   * Returns aggregated statistics including median prices, price distributions,
   * average price per m², and micromarket comparisons
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
});
