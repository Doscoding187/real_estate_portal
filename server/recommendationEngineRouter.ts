/**
 * Recommendation Engine Router (tRPC)
 * API endpoints for personalized content recommendations
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 7.3, 7.4
 */

import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import { z } from 'zod';
import {
  generatePersonalizedFeed,
  recordEngagement,
  getUserProfile,
  createFeedSession,
  closeFeedSession,
  type UserContext,
  type EngagementSignal,
} from './services/recommendationEngineService';

export const recommendationEngineRouter = router({
  /**
   * Generate personalized feed
   * Requirements 2.1, 2.6, 7.3, 7.4: Personalized recommendations
   */
  getPersonalizedFeed: protectedProcedure
    .input(
      z.object({
        sessionHistory: z.array(z.number()).default([]),
        location: z
          .object({
            lat: z.number(),
            lng: z.number(),
          })
          .optional(),
        activeFilters: z
          .object({
            propertyTypes: z.array(z.string()).optional(),
            priceRange: z
              .object({
                min: z.number(),
                max: z.number(),
              })
              .optional(),
            lifestyleCategories: z.array(z.string()).optional(),
            locations: z.array(z.string()).optional(),
          })
          .optional(),
        deviceInfo: z
          .object({
            type: z.enum(['mobile', 'tablet', 'desktop']),
            os: z.string().optional(),
            browser: z.string().optional(),
          })
          .optional(),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const context: UserContext = {
        userId: ctx.user.id,
        sessionHistory: input.sessionHistory,
        location: input.location,
        activeFilters: input.activeFilters,
        deviceInfo: input.deviceInfo,
      };

      const recommendations = await generatePersonalizedFeed(context, input.limit);

      return {
        success: true,
        data: recommendations,
      };
    }),

  /**
   * Record engagement signal
   * Requirements 2.3, 2.4: Track completion and skip signals
   */
  recordEngagement: protectedProcedure
    .input(
      z.object({
        contentId: z.number(),
        engagementType: z.enum(['view', 'save', 'share', 'click', 'skip', 'complete']),
        watchTime: z.number().optional(),
        completed: z.boolean().optional(),
        sessionId: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const engagement: EngagementSignal = {
        contentId: input.contentId,
        engagementType: input.engagementType,
        watchTime: input.watchTime,
        completed: input.completed,
        timestamp: new Date(),
      };

      await recordEngagement(ctx.user.id, input.contentId, engagement, input.sessionId);

      return {
        success: true,
        message: 'Engagement recorded successfully',
      };
    }),

  /**
   * Get user profile
   * Requirements 2.6: Access user preferences and engagement history
   */
  getUserProfile: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getUserProfile(ctx.user.id);

    return {
      success: true,
      data: profile,
    };
  }),

  /**
   * Create feed session
   * Requirements 2.6: Track session duration and interactions
   */
  createSession: protectedProcedure
    .input(
      z.object({
        deviceType: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sessionId = await createFeedSession(ctx.user.id, input.deviceType);

      return {
        success: true,
        data: { sessionId },
      };
    }),

  /**
   * Close feed session
   * Requirements 2.6: Track session duration
   */
  closeSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      await closeFeedSession(input.sessionId);

      return {
        success: true,
        message: 'Session closed successfully',
      };
    }),
});
