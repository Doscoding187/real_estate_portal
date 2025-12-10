/**
 * Explore API Router (tRPC)
 * Main API endpoints for the Explore Discovery Engine
 * Requirements: 1.1, 1.2, 2.1, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 7.1, 12.1
 */

import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { db } from './db';
import {
  exploreContent,
  exploreDiscoveryVideos,
  exploreNeighbourhoods,
  exploreCategories,
  exploreNeighbourhoodFollows,
  exploreCreatorFollows,
  exploreSavedProperties,
  exploreEngagements,
} from '../drizzle/schema';
import { eq, and, desc, sql, gte, lte, inArray, like } from 'drizzle-orm';
import { recommendationEngineService } from './services/recommendationEngineService';
import { exploreFeedService } from './services/exploreFeedService';
import { exploreAgencyService } from './services/exploreAgencyService';
import { agents, agencies } from '../drizzle/schema';

/**
 * Helper function to verify agency access
 * Requirements: 3.4, Security
 * 
 * Checks if user has permission to view agency analytics:
 * - User is agency owner (agency_admin role with matching agency)
 * - User is agent in the agency
 * - User is super_admin
 */
async function verifyAgencyAccess(userId: number, agencyId: number): Promise<void> {
  // Import users table
  const { users } = await import('../drizzle/schema');

  // Get user details
  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userResult[0]) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User not found',
    });
  }

  const user = userResult[0];

  // Super admins have access to all agencies
  if (user.role === 'super_admin') {
    return;
  }

  // Check if user is an agent in this agency
  const agentResult = await db
    .select()
    .from(agents)
    .where(
      and(
        eq(agents.userId, userId),
        eq(agents.agencyId, agencyId)
      )
    )
    .limit(1);

  if (agentResult[0]) {
    return;
  }

  // Check if user is agency admin/owner
  const agencyResult = await db
    .select()
    .from(agencies)
    .where(eq(agencies.id, agencyId))
    .limit(1);

  if (agencyResult[0] && agencyResult[0].ownerId === userId) {
    return;
  }

  // No access
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'Access denied to agency analytics',
  });
}

export const exploreApiRouter = router({
  /**
   * Get personalized feed with mixed content
   * Requirements 2.1, 7.1, 12.1: Personalized feed generation with mixed content types
   */
  getFeed: protectedProcedure
    .input(
      z.object({
        sessionHistory: z.array(z.number()).default([]),
        location: z
          .object({
            lat: z.number(),
            lng: z.number(),
          })
          .optional(),
        categoryId: z.number().optional(),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get user profile for boost targeting
      const userProfile = await recommendationEngineService.getUserProfile(ctx.user.id);
      
      // Get personalized recommendations
      const recommendations = await recommendationEngineService.generatePersonalizedFeed(
        {
          userId: ctx.user.id,
          sessionHistory: input.sessionHistory,
          location: input.location,
        },
        input.limit + input.offset,
      );

      // Inject boosted content (Requirement 9.2, 9.3, 9.6)
      const feedWithBoosts = await recommendationEngineService.injectBoostedContent(
        recommendations,
        userProfile
      );

      // Apply pagination
      const paginatedResults = feedWithBoosts.slice(input.offset, input.offset + input.limit);

      return {
        success: true,
        data: {
          items: paginatedResults,
          total: feedWithBoosts.length,
          hasMore: feedWithBoosts.length > input.offset + input.limit,
        },
      };
    }),

  /**
   * Get video feed with filtering
   * Requirements 1.1, 1.2: Full-screen vertical videos with swipe navigation
   */
  getVideoFeed: protectedProcedure
    .input(
      z.object({
        sessionHistory: z.array(z.number()).default([]),
        categoryId: z.number().optional(),
        neighbourhoodId: z.number().optional(),
        creatorId: z.number().optional(),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Build query
      let query = db
        .select({
          id: exploreContent.id,
          title: exploreContent.title,
          description: exploreContent.description,
          thumbnailUrl: exploreContent.thumbnailUrl,
          videoUrl: exploreContent.videoUrl,
          creatorId: exploreContent.creatorId,
          tags: exploreContent.tags,
          lifestyleCategories: exploreContent.lifestyleCategories,
          priceMin: exploreContent.priceMin,
          priceMax: exploreContent.priceMax,
          viewCount: exploreContent.viewCount,
          engagementScore: exploreContent.engagementScore,
          createdAt: exploreContent.createdAt,
          videoId: exploreDiscoveryVideos.id,
          duration: exploreDiscoveryVideos.duration,
          propertyId: exploreDiscoveryVideos.propertyId,
          developmentId: exploreDiscoveryVideos.developmentId,
          totalViews: exploreDiscoveryVideos.totalViews,
          completionRate: exploreDiscoveryVideos.completionRate,
        })
        .from(exploreContent)
        .innerJoin(
          exploreDiscoveryVideos,
          eq(exploreContent.id, exploreDiscoveryVideos.exploreContentId),
        )
        .where(eq(exploreContent.isActive, 1));

      // Apply filters
      if (input.categoryId) {
        query = query.where(
          sql`JSON_CONTAINS(${exploreContent.lifestyleCategories}, JSON_ARRAY(${input.categoryId}))`,
        );
      }

      if (input.creatorId) {
        query = query.where(eq(exploreContent.creatorId, input.creatorId));
      }

      // Exclude session history
      if (input.sessionHistory.length > 0) {
        query = query.where(sql`${exploreContent.id} NOT IN (${input.sessionHistory.join(',')})`);
      }

      // Order by engagement score and recency
      query = query.orderBy(desc(exploreContent.engagementScore), desc(exploreContent.createdAt));

      // Apply pagination
      query = query.limit(input.limit).offset(input.offset);

      const videos = await query;

      return {
        success: true,
        data: {
          videos,
          hasMore: videos.length === input.limit,
        },
      };
    }),

  /**
   * Get all neighbourhoods
   * Requirements 5.1: Neighbourhood discovery
   */
  getNeighbourhoods: publicProcedure
    .input(
      z.object({
        city: z.string().optional(),
        province: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ input }) => {
      let query = db.select().from(exploreNeighbourhoods);

      // Apply filters
      if (input.city) {
        query = query.where(eq(exploreNeighbourhoods.city, input.city));
      }

      if (input.province) {
        query = query.where(eq(exploreNeighbourhoods.province, input.province));
      }

      // Order by follower count
      query = query.orderBy(desc(exploreNeighbourhoods.followerCount));

      // Apply pagination
      query = query.limit(input.limit).offset(input.offset);

      const neighbourhoods = await query;

      return {
        success: true,
        data: {
          neighbourhoods,
          hasMore: neighbourhoods.length === input.limit,
        },
      };
    }),

  /**
   * Get neighbourhood detail
   * Requirements 5.1, 5.2, 5.3, 5.4, 5.5: Neighbourhood detail page
   */
  getNeighbourhoodDetail: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .query(async ({ input }) => {
      const neighbourhood = await db
        .select()
        .from(exploreNeighbourhoods)
        .where(eq(exploreNeighbourhoods.id, input.id))
        .limit(1);

      if (!neighbourhood[0]) {
        throw new Error('Neighbourhood not found');
      }

      // Get videos for this neighbourhood
      const videos = await db
        .select()
        .from(exploreContent)
        .where(
          and(
            eq(exploreContent.contentType, 'video'),
            eq(exploreContent.isActive, 1),
            // Filter by location proximity (simplified - in production use spatial query)
          ),
        )
        .limit(10);

      return {
        success: true,
        data: {
          neighbourhood: neighbourhood[0],
          videos,
        },
      };
    }),

  /**
   * Follow/unfollow neighbourhood
   * Requirements 5.6, 13.1: Neighbourhood following
   */
  toggleNeighbourhoodFollow: protectedProcedure
    .input(
      z.object({
        neighbourhoodId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if already following
      const existing = await db
        .select()
        .from(exploreNeighbourhoodFollows)
        .where(
          and(
            eq(exploreNeighbourhoodFollows.userId, ctx.user.id),
            eq(exploreNeighbourhoodFollows.neighbourhoodId, input.neighbourhoodId),
          ),
        )
        .limit(1);

      if (existing[0]) {
        // Unfollow
        await db
          .delete(exploreNeighbourhoodFollows)
          .where(
            and(
              eq(exploreNeighbourhoodFollows.userId, ctx.user.id),
              eq(exploreNeighbourhoodFollows.neighbourhoodId, input.neighbourhoodId),
            ),
          );

        // Decrement follower count
        await db
          .update(exploreNeighbourhoods)
          .set({
            followerCount: sql`${exploreNeighbourhoods.followerCount} - 1`,
          })
          .where(eq(exploreNeighbourhoods.id, input.neighbourhoodId));

        return {
          success: true,
          following: false,
        };
      } else {
        // Follow
        await db.insert(exploreNeighbourhoodFollows).values({
          userId: ctx.user.id,
          neighbourhoodId: input.neighbourhoodId,
        });

        // Increment follower count
        await db
          .update(exploreNeighbourhoods)
          .set({
            followerCount: sql`${exploreNeighbourhoods.followerCount} + 1`,
          })
          .where(eq(exploreNeighbourhoods.id, input.neighbourhoodId));

        return {
          success: true,
          following: true,
        };
      }
    }),

  /**
   * Get all lifestyle categories
   * Requirements 4.1: Display lifestyle categories
   */
  getCategories: publicProcedure.query(async () => {
    const categories = await db
      .select()
      .from(exploreCategories)
      .where(eq(exploreCategories.isActive, 1))
      .orderBy(exploreCategories.displayOrder);

    return {
      success: true,
      data: categories,
    };
  }),

  /**
   * Get content by category
   * Requirements 4.2, 4.3: Category filtering
   */
  getContentByCategory: publicProcedure
    .input(
      z.object({
        categoryId: z.number(),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ input }) => {
      // Get category
      const category = await db
        .select()
        .from(exploreCategories)
        .where(eq(exploreCategories.id, input.categoryId))
        .limit(1);

      if (!category[0]) {
        throw new Error('Category not found');
      }

      // Get content matching category
      const content = await db
        .select()
        .from(exploreContent)
        .where(
          and(
            eq(exploreContent.isActive, 1),
            sql`JSON_CONTAINS(${exploreContent.lifestyleCategories}, JSON_ARRAY(${category[0].name}))`,
          ),
        )
        .orderBy(desc(exploreContent.engagementScore))
        .limit(input.limit)
        .offset(input.offset);

      return {
        success: true,
        data: {
          category: category[0],
          content,
          hasMore: content.length === input.limit,
        },
      };
    }),

  /**
   * Follow/unfollow creator
   * Requirements 13.2, 13.5: Creator following
   */
  toggleCreatorFollow: protectedProcedure
    .input(
      z.object({
        creatorId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if already following
      const existing = await db
        .select()
        .from(exploreCreatorFollows)
        .where(
          and(
            eq(exploreCreatorFollows.userId, ctx.user.id),
            eq(exploreCreatorFollows.creatorId, input.creatorId),
          ),
        )
        .limit(1);

      if (existing[0]) {
        // Unfollow
        await db
          .delete(exploreCreatorFollows)
          .where(
            and(
              eq(exploreCreatorFollows.userId, ctx.user.id),
              eq(exploreCreatorFollows.creatorId, input.creatorId),
            ),
          );

        return {
          success: true,
          following: false,
        };
      } else {
        // Follow
        await db.insert(exploreCreatorFollows).values({
          userId: ctx.user.id,
          creatorId: input.creatorId,
        });

        // TODO: Send notification to creator (Requirement 13.5)

        return {
          success: true,
          following: true,
        };
      }
    }),

  /**
   * Save/unsave property
   * Requirements 14.1, 14.2: Save functionality
   */
  toggleSaveProperty: protectedProcedure
    .input(
      z.object({
        contentId: z.number(),
        collectionName: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if already saved
      const existing = await db
        .select()
        .from(exploreSavedProperties)
        .where(
          and(
            eq(exploreSavedProperties.userId, ctx.user.id),
            eq(exploreSavedProperties.contentId, input.contentId),
          ),
        )
        .limit(1);

      if (existing[0]) {
        // Unsave
        await db
          .delete(exploreSavedProperties)
          .where(
            and(
              eq(exploreSavedProperties.userId, ctx.user.id),
              eq(exploreSavedProperties.contentId, input.contentId),
            ),
          );

        return {
          success: true,
          saved: false,
        };
      } else {
        // Save
        await db.insert(exploreSavedProperties).values({
          userId: ctx.user.id,
          contentId: input.contentId,
          collectionName: input.collectionName || 'Default',
          notes: input.notes || null,
        });

        return {
          success: true,
          saved: true,
        };
      }
    }),

  /**
   * Get saved properties
   * Requirements 14.3: View saved items
   */
  getSavedProperties: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const saved = await db
        .select({
          id: exploreSavedProperties.id,
          contentId: exploreSavedProperties.contentId,
          collectionName: exploreSavedProperties.collectionName,
          notes: exploreSavedProperties.notes,
          savedAt: exploreSavedProperties.createdAt,
          content: exploreContent,
        })
        .from(exploreSavedProperties)
        .innerJoin(exploreContent, eq(exploreSavedProperties.contentId, exploreContent.id))
        .where(eq(exploreSavedProperties.userId, ctx.user.id))
        .orderBy(desc(exploreSavedProperties.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return {
        success: true,
        data: {
          saved,
          hasMore: saved.length === input.limit,
        },
      };
    }),

  /**
   * Get followed neighbourhoods and creators
   * Requirements 13.3: Display followed items
   */
  getFollowedItems: protectedProcedure.query(async ({ ctx }) => {
    // Get followed neighbourhoods
    const neighbourhoods = await db
      .select({
        id: exploreNeighbourhoodFollows.id,
        neighbourhoodId: exploreNeighbourhoodFollows.neighbourhoodId,
        followedAt: exploreNeighbourhoodFollows.createdAt,
        neighbourhood: exploreNeighbourhoods,
      })
      .from(exploreNeighbourhoodFollows)
      .innerJoin(
        exploreNeighbourhoods,
        eq(exploreNeighbourhoodFollows.neighbourhoodId, exploreNeighbourhoods.id),
      )
      .where(eq(exploreNeighbourhoodFollows.userId, ctx.user.id))
      .orderBy(desc(exploreNeighbourhoodFollows.createdAt));

    // Get followed creators
    const creators = await db
      .select()
      .from(exploreCreatorFollows)
      .where(eq(exploreCreatorFollows.userId, ctx.user.id))
      .orderBy(desc(exploreCreatorFollows.createdAt));

    return {
      success: true,
      data: {
        neighbourhoods,
        creators,
      },
    };
  }),

  /**
   * Record engagement (batch)
   * Requirements 2.3, 8.6: Engagement tracking
   */
  recordEngagementBatch: protectedProcedure
    .input(
      z.object({
        engagements: z.array(
          z.object({
            contentId: z.number(),
            engagementType: z.enum(['view', 'save', 'share', 'click', 'skip', 'complete']),
            watchTime: z.number().optional(),
            completed: z.boolean().optional(),
            sessionId: z.number().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Insert all engagements
      const values = input.engagements.map((eng) => ({
        userId: ctx.user.id,
        contentId: eng.contentId,
        engagementType: eng.engagementType,
        watchTime: eng.watchTime || null,
        completed: eng.completed || false,
        sessionId: eng.sessionId || null,
      }));

      await db.insert(exploreEngagements).values(values);

      return {
        success: true,
        message: `Recorded ${input.engagements.length} engagements`,
      };
    }),

  /**
   * Get agency feed
   * Requirements 8.1, 8.2, 8.3: Agency feed endpoint
   * 
   * Returns all published content attributed to a specific agency.
   * Supports pagination and optional inclusion of agent content.
   */
  getAgencyFeed: publicProcedure
    .input(
      z.object({
        agencyId: z.number(),
        includeAgentContent: z.boolean().default(true),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      try {
        // Call exploreFeedService.getAgencyFeed
        const feed = await exploreFeedService.getAgencyFeed({
          agencyId: input.agencyId,
          includeAgentContent: input.includeAgentContent,
          limit: input.limit,
          offset: input.offset,
        });

        return {
          success: true,
          data: feed,
        };
      } catch (error) {
        // Handle errors with appropriate status codes
        if (error instanceof Error) {
          if (error.message.includes('not found')) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Agency not found',
            });
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message,
          });
        }
        throw error;
      }
    }),

  /**
   * Get agency analytics
   * Requirements 3.1, 3.2, 3.3, 3.4, 8.1: Agency analytics endpoint
   * 
   * Returns comprehensive analytics for an agency including:
   * - Total content count and views
   * - Engagement metrics
   * - Agent breakdown
   * - Top performing content
   * 
   * Requires authentication and agency access permission.
   */
  getAgencyAnalytics: protectedProcedure
    .input(
      z.object({
        agencyId: z.number(),
        timeRange: z.enum(['7d', '30d', '90d', 'all']).default('30d'),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Verify user has access to agency analytics
        await verifyAgencyAccess(ctx.user.id, input.agencyId);

        // Call exploreAgencyService.getAgencyMetrics
        const metrics = await exploreAgencyService.getAgencyMetrics(input.agencyId);

        return {
          success: true,
          data: metrics,
        };
      } catch (error) {
        // Re-throw TRPCError as-is
        if (error instanceof TRPCError) {
          throw error;
        }
        // Handle other errors
        if (error instanceof Error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message,
          });
        }
        throw error;
      }
    }),

  /**
   * Get feed by type
   * Requirements 2.1, 7.2, 7.3: Generic feed endpoint with type routing
   * 
   * Routes to appropriate feed generator based on feedType.
   * Supports: recommended, area, category, agent, developer, agency
   * Maintains backward compatibility with existing feed types.
   */
  getFeedByType: publicProcedure
    .input(
      z.object({
        feedType: z.enum(['recommended', 'area', 'category', 'agent', 'developer', 'agency']),
        userId: z.number().optional(),
        location: z.string().optional(),
        category: z.string().optional(),
        agentId: z.number().optional(),
        developerId: z.number().optional(),
        agencyId: z.number().optional(),
        includeAgentContent: z.boolean().default(true),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      try {
        // Validate required parameters based on feed type
        if (input.feedType === 'agency' && !input.agencyId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Agency ID required for agency feed',
          });
        }

        if (input.feedType === 'area' && !input.location) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Location required for area feed',
          });
        }

        if (input.feedType === 'category' && !input.category) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Category required for category feed',
          });
        }

        if (input.feedType === 'agent' && !input.agentId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Agent ID required for agent feed',
          });
        }

        if (input.feedType === 'developer' && !input.developerId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Developer ID required for developer feed',
          });
        }

        // Route to appropriate service method
        const feed = await exploreFeedService.getFeed(input.feedType, {
          userId: input.userId,
          location: input.location,
          category: input.category,
          agentId: input.agentId,
          developerId: input.developerId,
          agencyId: input.agencyId,
          includeAgentContent: input.includeAgentContent,
          limit: input.limit,
          offset: input.offset,
        });

        return {
          success: true,
          data: feed,
        };
      } catch (error) {
        // Re-throw TRPCError as-is
        if (error instanceof TRPCError) {
          throw error;
        }
        // Handle other errors
        if (error instanceof Error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message,
          });
        }
        throw error;
      }
    }),
});
