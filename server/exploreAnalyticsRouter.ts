/**
 * Explore Analytics Router (tRPC)
 * API endpoints for analytics and engagement metrics
 * Requirements: 2.3, 8.6, 14.1
 */

import { router, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import { exploreAnalyticsService } from './services/exploreAnalyticsService';

export const exploreAnalyticsRouter = router({
  /**
   * Get video analytics
   * Requirement 8.6: Provide analytics on views, watch time, saves, and click-throughs
   */
  getVideoAnalytics: protectedProcedure
    .input(
      z.object({
        videoId: z.number(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ input }) => {
      const analytics = await exploreAnalyticsService.getVideoAnalytics(
        input.videoId,
        input.startDate,
        input.endDate,
      );

      return {
        success: true,
        data: analytics,
      };
    }),

  /**
   * Get creator analytics
   * Requirement 8.6: Generate creator analytics
   */
  getCreatorAnalytics: protectedProcedure
    .input(
      z.object({
        creatorId: z.number().optional(), // If not provided, use current user
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const creatorId = input.creatorId || ctx.user.id;

      const analytics = await exploreAnalyticsService.getCreatorAnalytics(
        creatorId,
        input.startDate,
        input.endDate,
      );

      return {
        success: true,
        data: analytics,
      };
    }),

  /**
   * Get session analytics
   * Requirement 2.6: Track session duration and interactions
   */
  getSessionAnalytics: protectedProcedure
    .input(
      z.object({
        sessionId: z.number(),
      }),
    )
    .query(async ({ input }) => {
      const analytics = await exploreAnalyticsService.getSessionAnalytics(input.sessionId);

      return {
        success: true,
        data: analytics,
      };
    }),

  /**
   * Get aggregated metrics
   * Requirement 8.6: Display engagement metrics
   */
  getAggregatedMetrics: protectedProcedure
    .input(
      z.object({
        period: z.enum(['day', 'week', 'month', 'all']),
        creatorId: z.number().optional(),
      }),
    )
    .query(async ({ input }) => {
      const metrics = await exploreAnalyticsService.getAggregatedMetrics(
        input.period,
        input.creatorId,
      );

      return {
        success: true,
        data: metrics,
      };
    }),

  /**
   * Get my analytics dashboard
   * Requirement 8.6: Creator analytics dashboard
   */
  getMyAnalyticsDashboard: protectedProcedure
    .input(
      z.object({
        period: z.enum(['day', 'week', 'month', 'all']).default('week'),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get creator analytics
      const creatorAnalytics = await exploreAnalyticsService.getCreatorAnalytics(ctx.user.id);

      // Get aggregated metrics for the period
      const periodMetrics = await exploreAnalyticsService.getAggregatedMetrics(
        input.period,
        ctx.user.id,
      );

      return {
        success: true,
        data: {
          overview: {
            totalVideos: creatorAnalytics.totalVideos,
            totalViews: creatorAnalytics.totalViews,
            totalWatchTime: creatorAnalytics.totalWatchTime,
            averageCompletionRate: creatorAnalytics.averageCompletionRate,
            engagementRate: creatorAnalytics.engagementRate,
          },
          periodMetrics: {
            period: input.period,
            views: periodMetrics.totalViews,
            uniqueViewers: periodMetrics.totalUniqueViewers,
            watchTime: periodMetrics.totalWatchTime,
            sessions: periodMetrics.totalSessions,
            averageSessionDuration: periodMetrics.averageSessionDuration,
            completionRate: periodMetrics.averageCompletionRate,
            engagementRate: periodMetrics.engagementRate,
          },
          topPerformingVideos: creatorAnalytics.topPerformingVideos,
          engagement: {
            saves: creatorAnalytics.totalSaves,
            shares: creatorAnalytics.totalShares,
            clicks: creatorAnalytics.totalClicks,
          },
        },
      };
    }),

  /**
   * Trigger batch update of engagement scores
   * Admin only - should be called periodically
   */
  batchUpdateEngagementScores: protectedProcedure.mutation(async ({ ctx }) => {
    // TODO: Add admin check
    // if (ctx.user.role !== 'admin') {
    //   throw new Error('Unauthorized');
    // }

    await exploreAnalyticsService.batchUpdateEngagementScores();

    return {
      success: true,
      message: 'Engagement scores updated successfully',
    };
  }),
});
