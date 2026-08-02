/**
 * Explore API Router (legacy compatibility boundary)
 *
 * V3 Explore tables are not exported from schema:
 * - exploreDiscoveryVideos, exploreNeighbourhoods, exploreCategories
 * - exploreNeighbourhoodFollows, exploreCreatorFollows
 * - exploreSavedProperties, exploreEngagements
 *
 * V3 endpoints that have no canonical persistence are explicitly unavailable;
 * they must not report successful no-op responses. The routed Explore feed
 * uses the discovery domain. Legacy V1/V2 endpoints using exploreContent are
 * retained only where they still have a real implementation.
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
import { requireUser } from './_core/requireUser';

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

function retiredExploreCapability(capability: string): TRPCError {
  return new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: `${capability} is not available in the canonical Explore workflow. Use the discovery router or an approved convergence workstream.`,
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
        const limit = input.limit;
        const offset = Math.max(0, (input.page - 1) * limit);
        const feed = await exploreFeedService.getPersonalizedFeed({
          userId: userId ?? undefined,
          limit,
          offset,
        });
        return { success: true, data: feed };
      } catch (error) {
        console.error('[exploreApiRouter] getFeed error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Legacy Explore feed is unavailable; use discovery.getFeed.',
        });
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
      throw retiredExploreCapability('Explore discovery videos');
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
      throw retiredExploreCapability('Explore neighbourhood follows');
    }),

  /**
   * Get categories - V3 (STUBBED)
   * exploreCategories table not available
   */
  getCategories: publicProcedure.query(async () => {
    throw retiredExploreCapability('Explore category discovery');
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
      throw retiredExploreCapability('Neighbourhood follows');
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
      throw retiredExploreCapability('Neighbourhood follows');
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
      throw retiredExploreCapability('Creator follows');
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
      throw retiredExploreCapability('Creator follows');
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
      throw retiredExploreCapability('Explore property saves');
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
      throw retiredExploreCapability('Explore property saves');
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
      throw retiredExploreCapability('Explore saved properties');
    }),

  /**
   * Get agency feed - stabilization stub
   */
  getAgencyFeed: protectedProcedure
    .input(
      z.object({
        agencyId: z.number().int().optional(),
        includeAgentContent: z.boolean().optional(),
        limit: z.number().int().min(1).max(50).optional(),
        offset: z.number().int().min(0).optional(),
        seed: z.string().optional(),
      }),
    )
    .query(async () => {
      throw retiredExploreCapability('Agency Explore feeds');
    }),

  /**
   * Get video feed - stabilization stub
   */
  getVideoFeed: protectedProcedure
    .input(
      z.object({
        sessionHistory: z.array(z.number()).optional(),
        categoryId: z.number().optional(),
        limit: z.number().int().min(1).max(50).optional(),
        offset: z.number().int().min(0).optional(),
        seed: z.string().optional(),
      }),
    )
    .query(async () => {
      throw retiredExploreCapability('Legacy video feeds');
    }),

  /**
   * Toggle creator follow - stabilization stub
   */
  toggleCreatorFollow: protectedProcedure
    .input(z.object({ creatorId: z.number().int() }))
    .mutation(async () => {
      throw retiredExploreCapability('Creator follows');
    }),

  /**
   * Toggle neighbourhood follow - stabilization stub
   */
  toggleNeighbourhoodFollow: protectedProcedure
    .input(z.object({ neighbourhoodId: z.number().int() }))
    .mutation(async () => {
      throw retiredExploreCapability('Neighbourhood follows');
    }),

  /**
   * Toggle save property - stabilization stub
   */
  toggleSaveProperty: protectedProcedure
    .input(
      z.object({
        contentId: z.number().int(),
        propertyId: z.number().int().optional(),
      }),
    )
    .mutation(async () => {
      throw retiredExploreCapability('Explore property saves');
    }),

  /**
   * Get followed items - stabilization stub
   */
  getFollowedItems: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).optional(),
        })
        .optional(),
    )
    .query(async () => {
      throw retiredExploreCapability('Followed Explore items');
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
      throw retiredExploreCapability('Legacy Explore engagement tracking');
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
        await verifyAgencyAccess(requireUser(ctx).id, input.agencyId);
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
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Legacy Explore recommendations are unavailable; use discovery.getFeed.',
        });
      }
    }),
});
