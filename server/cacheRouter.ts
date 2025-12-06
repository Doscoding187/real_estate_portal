/**
 * Cache Monitoring tRPC Router
 * Task 17: Performance Optimization
 * 
 * Provides cache statistics and management endpoints
 */

import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from './_core/trpc';
import { redisCache } from './lib/redis';
import { getCacheStats } from './services/cacheIntegrationService';

export const cacheRouter = router({
  /**
   * Get cache statistics
   */
  getStats: publicProcedure.query(async () => {
    try {
      const stats = await getCacheStats();
      
      return {
        success: true,
        stats: {
          connected: stats.connected,
          totalKeys: stats.keys,
          memory: stats.memory || 'N/A',
          backend: stats.connected ? 'Redis' : 'In-Memory Fallback',
        },
      };
    } catch (error: any) {
      console.error('Error fetching cache stats:', error);
      throw new Error('Failed to fetch cache statistics');
    }
  }),

  /**
   * Clear all cache (admin only)
   */
  clearAll: protectedProcedure.mutation(async ({ ctx }) => {
    // TODO: Add admin role check
    // if (ctx.user.role !== 'admin') {
    //   throw new Error('Unauthorized: Admin access required');
    // }

    try {
      await redisCache.delByPattern('explore:*');
      
      return {
        success: true,
        message: 'Cache cleared successfully',
      };
    } catch (error: any) {
      console.error('Error clearing cache:', error);
      throw new Error('Failed to clear cache');
    }
  }),

  /**
   * Clear specific cache pattern (admin only)
   */
  clearPattern: protectedProcedure
    .input(
      z.object({
        pattern: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Add admin role check
      // if (ctx.user.role !== 'admin') {
      //   throw new Error('Unauthorized: Admin access required');
      // }

      try {
        await redisCache.delByPattern(`explore:${input.pattern}:*`);
        
        return {
          success: true,
          message: `Cache pattern 'explore:${input.pattern}:*' cleared successfully`,
        };
      } catch (error: any) {
        console.error('Error clearing cache pattern:', error);
        throw new Error('Failed to clear cache pattern');
      }
    }),

  /**
   * Health check for cache connection
   */
  health: publicProcedure.query(async () => {
    try {
      const stats = await getCacheStats();
      
      return {
        success: true,
        healthy: true,
        connected: stats.connected,
        backend: stats.connected ? 'Redis' : 'In-Memory Fallback',
      };
    } catch (error) {
      return {
        success: false,
        healthy: false,
        error: 'Cache service unavailable',
      };
    }
  }),
});

export default cacheRouter;
