/**
 * Explore API Router (STUBBED)
 *
 * V3 Explore tables are not exported from schema:
 * - exploreDiscoveryVideos, exploreNeighbourhoods, exploreCategories
 * - exploreNeighbourhoodFollows, exploreCreatorFollows
 * - exploreSavedProperties, exploreEngagements
 *
 * All V3 endpoints are stubbed to return empty/default values.
 * Legacy V1/V2 endpoints using exploreContent are preserved.
 */

import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { db } from './db';
import { exploreContent, agents, agencies, users } from '../drizzle/schema';
import { eq, and, desc, sql, gte, lte, inArray, like } from 'drizzle-orm';
import { recommendationEngineService } from './services/recommendationEngineService';
import { exploreFeedService } from './services/exploreFeedService';
import { exploreAgencyService } from './services/exploreAgencyService';

/**
 * Helper function to verify agency access
 */
async function verifyAgencyAccess(userId: number, agencyId: number): Promise<void> {
  // Get user details
  const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!userResult[0]) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User not found',
    });
  }

  const user = userResult[0];

  // Super admin can access any agency
  if (user.role === 'super_admin') {
    return;
  }

  // Agency admin must match the agency
  if (user.role === 'agency_admin' && user.agencyId === agencyId) {
    return;
  }

  // Check if user is an agent in the agency
  const agentResult = await db
    .select()
    .from(agents)
    .where(and(eq(agents.userId, userId), eq(agents.agencyId, agencyId)))
    .limit(1);

  if (agentResult[0]) {
    return;
  }

  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'You do not have access to this agency',
  });
}

export const exploreApiRouter = router({
  /**
   * Get personalized feed - V1/V2 (preserved)
   */
  getFeed: publicProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(10),
      }),
    )
    .query(async ({ input, ctx }) => {
      try {
        const userId = ctx.user?.id;
        const feed = await exploreFeedService.getPersonalizedFeed(
          userId || null,
          input.page,
          input.limit,
        );
        return { success: true, data: feed };
      } catch (error) {
        console.error('[exploreApiRouter] getFeed error:', error);
        return { success: true, data: { items: [], hasMore: false } };
      }
    }),

  /**
   * Get discovery videos - V3 (STUBBED)
   * exploreDiscoveryVideos table not available
   */
  getDiscoveryVideos: publicProcedure
    .input(
      z.object({
        categoryId: z.number().optional(),
        neighbourhoodId: z.number().optional(),
        limit: z.number().default(20),
        cursor: z.number().optional(),
      }),
    )
    .query(async () => {
      // STUB: V3 tables not available
      console.debug(
        '[exploreApiRouter] getDiscoveryVideos called but disabled (V3 tables not exported)',
      );
      return { success: true, data: { items: [], nextCursor: null } };
    }),

  /**
   * Get neighbourhoods - V3 (STUBBED)
   * exploreNeighbourhoods table not available
   */
  getNeighbourhoods: publicProcedure
    .input(
      z.object({
        city: z.string().optional(),
        province: z.string().optional(),
        limit: z.number().default(20),
      }),
    )
    .query(async () => {
      // STUB: V3 tables not available
      console.debug(
        '[exploreApiRouter] getNeighbourhoods called but disabled (V3 tables not exported)',
      );
      return { success: true, data: [] };
    }),

  /**
   * Get categories - V3 (STUBBED)
   * exploreCategories table not available
   */
  getCategories: publicProcedure.query(async () => {
    // STUB: V3 tables not available
    console.debug('[exploreApiRouter] getCategories called but disabled (V3 tables not exported)');
    return { success: true, data: [] };
  }),

  /**
   * Follow neighbourhood - V3 (STUBBED)
   * exploreNeighbourhoodFollows table not available
   */
  followNeighbourhood: protectedProcedure
    .input(
      z.object({
        neighbourhoodId: z.number(),
      }),
    )
    .mutation(async () => {
      // STUB: V3 tables not available
      console.debug(
        '[exploreApiRouter] followNeighbourhood called but disabled (V3 tables not exported)',
      );
      return { success: false, message: 'Feature temporarily disabled' };
    }),

  /**
   * Unfollow neighbourhood - V3 (STUBBED)
   */
  unfollowNeighbourhood: protectedProcedure
    .input(
      z.object({
        neighbourhoodId: z.number(),
      }),
    )
    .mutation(async () => {
      console.debug(
        '[exploreApiRouter] unfollowNeighbourhood called but disabled (V3 tables not exported)',
      );
      return { success: false, message: 'Feature temporarily disabled' };
    }),

  /**
   * Follow creator - V3 (STUBBED)
   * exploreCreatorFollows table not available
   */
  followCreator: protectedProcedure
    .input(
      z.object({
        creatorId: z.number(),
        creatorType: z.enum(['user', 'agent', 'developer', 'agency']),
      }),
    )
    .mutation(async () => {
      console.debug(
        '[exploreApiRouter] followCreator called but disabled (V3 tables not exported)',
      );
      return { success: false, message: 'Feature temporarily disabled' };
    }),

  /**
   * Unfollow creator - V3 (STUBBED)
   */
  unfollowCreator: protectedProcedure
    .input(
      z.object({
        creatorId: z.number(),
        creatorType: z.enum(['user', 'agent', 'developer', 'agency']),
      }),
    )
    .mutation(async () => {
      console.debug(
        '[exploreApiRouter] unfollowCreator called but disabled (V3 tables not exported)',
      );
      return { success: false, message: 'Feature temporarily disabled' };
    }),

  /**
   * Save property - V3 (STUBBED)
   * exploreSavedProperties table not available
   */
  saveProperty: protectedProcedure
    .input(
      z.object({
        contentId: z.number(),
      }),
    )
    .mutation(async () => {
      console.debug('[exploreApiRouter] saveProperty called but disabled (V3 tables not exported)');
      return { success: false, message: 'Feature temporarily disabled' };
    }),

  /**
   * Unsave property - V3 (STUBBED)
   */
  unsaveProperty: protectedProcedure
    .input(
      z.object({
        contentId: z.number(),
      }),
    )
    .mutation(async () => {
      console.debug(
        '[exploreApiRouter] unsaveProperty called but disabled (V3 tables not exported)',
      );
      return { success: false, message: 'Feature temporarily disabled' };
    }),

  /**
   * Get saved properties - V3 (STUBBED)
   */
  getSavedProperties: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        cursor: z.number().optional(),
      }),
    )
    .query(async () => {
      console.debug(
        '[exploreApiRouter] getSavedProperties called but disabled (V3 tables not exported)',
      );
      return { success: true, data: { items: [], nextCursor: null } };
    }),

  /**
   * Track engagement - V3 (STUBBED)
   * exploreEngagements table not available
   */
  trackEngagement: publicProcedure
    .input(
      z.object({
        contentId: z.number(),
        engagementType: z.enum(['view', 'like', 'share', 'save', 'click']),
        metadata: z.record(z.any()).optional(),
      }),
    )
    .mutation(async () => {
      console.debug(
        '[exploreApiRouter] trackEngagement called but disabled (V3 tables not exported)',
      );
      return { success: true };
    }),

  /**
   * Get agency analytics - V1/V2 (preserved)
   */
  getAgencyAnalytics: protectedProcedure
    .input(
      z.object({
        agencyId: z.number(),
        dateRange: z.enum(['7d', '30d', '90d', 'all']).default('30d'),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        await verifyAgencyAccess(ctx.user.id, input.agencyId);
        const analytics = await exploreAgencyService.getAgencyAnalytics(
          input.agencyId,
          input.dateRange,
        );
        return { success: true, data: analytics };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('[exploreApiRouter] getAgencyAnalytics error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get agency analytics',
        });
      }
    }),

  /**
   * Get recommendations - V1/V2 (preserved)
   */
  getRecommendations: publicProcedure
    .input(
      z.object({
        limit: z.number().default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.user?.id;
        const recommendations = await recommendationEngineService.getRecommendations(
          userId || null,
          input.limit,
        );
        return { success: true, data: recommendations };
      } catch (error) {
        console.error('[exploreApiRouter] getRecommendations error:', error);
        return { success: true, data: [] };
      }
    }),
});
