/**
 * Explore Analytics Service
 * Aggregates engagement metrics and generates creator analytics
 * Requirements: 2.3, 8.6, 14.1
 */

import { db } from '../db';
import {
  exploreEngagements,
  exploreDiscoveryVideos,
  exploreContent,
  exploreFeedSessions,
  exploreSavedProperties,
} from '../../drizzle/schema';
import { eq, and, gte, lte, sql, desc, count, SQL } from 'drizzle-orm';

interface VideoAnalytics {
  videoId: number;
  contentId: number;
  totalViews: number;
  uniqueViewers: number;
  totalWatchTime: number;
  averageWatchTime: number;
  completionRate: number;
  completions: number;
  saves: number;
  shares: number;
  clicks: number;
  skips: number;
  engagementRate: number;
  averageEngagementScore: number;
}

interface CreatorAnalytics {
  creatorId: number;
  totalVideos: number;
  totalViews: number;
  totalWatchTime: number;
  averageCompletionRate: number;
  totalSaves: number;
  totalShares: number;
  totalClicks: number;
  engagementRate: number;
  topPerformingVideos: Array<{
    contentId: number;
    title: string;
    views: number;
    completionRate: number;
    engagementScore: number;
  }>;
}

interface SessionAnalytics {
  sessionId: number;
  userId: number;
  duration: number;
  videosViewed: number;
  completions: number;
  saves: number;
  shares: number;
  clicks: number;
  averageWatchTime: number;
  engagementRate: number;
}

interface AggregatedMetrics {
  period: 'day' | 'week' | 'month' | 'all';
  totalViews: number;
  totalUniqueViewers: number;
  totalWatchTime: number;
  averageSessionDuration: number;
  totalSessions: number;
  averageCompletionRate: number;
  totalEngagements: number;
  engagementRate: number;
}

type EngagementRow = {
  engagementType: string;
  watchTime: number | null;
  completed: number | boolean | null;
  userId: number | null;
  contentId: number;
};

type VideoRow = {
  id: number;
  title: string | null;
  videoId: number;
};

type CreatorContentRow = {
  id: number;
};

type SessionRow = {
  sessionStart: string | null;
  sessionEnd: string | null;
  userId: number | null;
};

export class ExploreAnalyticsService {
  /**
   * Get video analytics for a specific video
   * Requirement 8.6: Provide analytics on views, watch time, saves, and click-throughs
   */
  async getVideoAnalytics(
    videoId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<VideoAnalytics> {
    // Get video content ID
    const video = await db
      .select({ contentId: exploreDiscoveryVideos.exploreContentId })
      .from(exploreDiscoveryVideos)
      .where(eq(exploreDiscoveryVideos.id, videoId))
      .limit(1);

    if (!video[0]) {
      throw new Error('Video not found');
    }

    const contentId = video[0].contentId;

    // Build date filter
    const dateFilter: SQL[] = [];
    if (startDate) {
      dateFilter.push(gte(exploreEngagements.createdAt, startDate.toISOString()));
    }
    if (endDate) {
      dateFilter.push(lte(exploreEngagements.createdAt, endDate.toISOString()));
    }

    // Get all engagements for this video
    const engagements = (await db
      .select({
        engagementType: exploreEngagements.engagementType,
        watchTime: exploreEngagements.watchTime,
        completed: exploreEngagements.completed,
        userId: exploreEngagements.userId,
        contentId: exploreEngagements.contentId,
      })
      .from(exploreEngagements)
      .where(
        and(
          eq(exploreEngagements.contentId, contentId),
          ...(dateFilter.length > 0 ? dateFilter : []),
        ),
      )) as EngagementRow[];

    // Calculate metrics
    const views = engagements.filter((e: EngagementRow) => e.engagementType === 'view').length;
    const uniqueViewers = new Set(
      engagements
        .filter((e: EngagementRow) => e.engagementType === 'view')
        .map((e: EngagementRow) => e.userId),
    ).size;
    const completions = engagements.filter((e: EngagementRow) => e.completed).length;
    const saves = engagements.filter((e: EngagementRow) => e.engagementType === 'save').length;
    const shares = engagements.filter((e: EngagementRow) => e.engagementType === 'share').length;
    const clicks = engagements.filter((e: EngagementRow) => e.engagementType === 'click').length;
    const skips = engagements.filter((e: EngagementRow) => e.engagementType === 'skip').length;

    const totalWatchTime = engagements.reduce(
      (sum: number, e: EngagementRow) => sum + (e.watchTime || 0),
      0,
    );
    const averageWatchTime = views > 0 ? totalWatchTime / views : 0;
    const completionRate = views > 0 ? (completions / views) * 100 : 0;

    // Calculate engagement rate (saves + shares + clicks) / views
    const totalEngagements = saves + shares + clicks;
    const engagementRate = views > 0 ? (totalEngagements / views) * 100 : 0;

    // Calculate average engagement score
    const averageEngagementScore = this.calculateEngagementScore({
      views,
      completions,
      saves,
      shares,
      clicks,
      skips,
    });

    return {
      videoId,
      contentId,
      totalViews: views,
      uniqueViewers,
      totalWatchTime,
      averageWatchTime,
      completionRate,
      completions,
      saves,
      shares,
      clicks,
      skips,
      engagementRate,
      averageEngagementScore,
    };
  }

  /**
   * Get creator analytics across all their videos
   * Requirement 8.6: Generate creator analytics
   */
  async getCreatorAnalytics(
    creatorId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<CreatorAnalytics> {
    // Get all creator's videos
    const videos = (await db
      .select({
        id: exploreContent.id,
        title: exploreContent.title,
        videoId: exploreDiscoveryVideos.id,
      })
      .from(exploreContent)
      .innerJoin(
        exploreDiscoveryVideos,
        eq(exploreContent.id, exploreDiscoveryVideos.exploreContentId),
      )
      .where(eq(exploreContent.creatorId, creatorId))) as VideoRow[];

    const totalVideos = videos.length;

    if (totalVideos === 0) {
      return {
        creatorId,
        totalVideos: 0,
        totalViews: 0,
        totalWatchTime: 0,
        averageCompletionRate: 0,
        totalSaves: 0,
        totalShares: 0,
        totalClicks: 0,
        engagementRate: 0,
        topPerformingVideos: [],
      };
    }

    // Get analytics for each video
    const videoAnalytics = await Promise.all(
      videos.map((v: VideoRow) => this.getVideoAnalytics(v.videoId, startDate, endDate)),
    );

    // Aggregate metrics
    const totalViews = videoAnalytics.reduce((sum, v) => sum + v.totalViews, 0);
    const totalWatchTime = videoAnalytics.reduce((sum, v) => sum + v.totalWatchTime, 0);
    const averageCompletionRate =
      videoAnalytics.reduce((sum, v) => sum + v.completionRate, 0) / totalVideos;
    const totalSaves = videoAnalytics.reduce((sum, v) => sum + v.saves, 0);
    const totalShares = videoAnalytics.reduce((sum, v) => sum + v.shares, 0);
    const totalClicks = videoAnalytics.reduce((sum, v) => sum + v.clicks, 0);

    const totalEngagements = totalSaves + totalShares + totalClicks;
    const engagementRate = totalViews > 0 ? (totalEngagements / totalViews) * 100 : 0;

    // Get top performing videos
    const topPerformingVideos = videoAnalytics
      .map((v, index) => ({
        contentId: v.contentId,
        title: videos[index].title,
        views: v.totalViews,
        completionRate: v.completionRate,
        engagementScore: v.averageEngagementScore,
      }))
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 10);

    return {
      creatorId,
      totalVideos,
      totalViews,
      totalWatchTime,
      averageCompletionRate,
      totalSaves,
      totalShares,
      totalClicks,
      engagementRate,
      topPerformingVideos,
    };
  }

  /**
   * Get session analytics
   * Requirement 2.6: Track session duration and interactions
   */
  async getSessionAnalytics(sessionId: number): Promise<SessionAnalytics> {
    // Get session
    const session = await db
      .select()
      .from(exploreFeedSessions)
      .where(eq(exploreFeedSessions.id, sessionId))
      .limit(1);

    if (!session[0]) {
      throw new Error('Session not found');
    }

    const sessionRow = session[0] as SessionRow;

    // Get all engagements for this session
    const engagements = (await db
      .select()
      .from(exploreEngagements)
      .where(eq(exploreEngagements.sessionId, sessionId))) as EngagementRow[];

    // Calculate metrics
    const videosViewed = new Set(
      engagements.filter((e: EngagementRow) => e.engagementType === 'view').map(e => e.contentId),
    ).size;
    const completions = engagements.filter((e: EngagementRow) => e.completed).length;
    const saves = engagements.filter((e: EngagementRow) => e.engagementType === 'save').length;
    const shares = engagements.filter((e: EngagementRow) => e.engagementType === 'share').length;
    const clicks = engagements.filter((e: EngagementRow) => e.engagementType === 'click').length;

    const totalWatchTime = engagements.reduce(
      (sum: number, e: EngagementRow) => sum + (e.watchTime || 0),
      0,
    );
    const averageWatchTime = videosViewed > 0 ? totalWatchTime / videosViewed : 0;

    const totalEngagements = saves + shares + clicks;
    const engagementRate = videosViewed > 0 ? (totalEngagements / videosViewed) * 100 : 0;

    // Calculate session duration
    const sessionStart = sessionRow.sessionStart ? new Date(sessionRow.sessionStart) : null;
    const sessionEnd = sessionRow.sessionEnd ? new Date(sessionRow.sessionEnd) : null;
    const duration =
      sessionStart && sessionEnd ? (sessionEnd.getTime() - sessionStart.getTime()) / 1000 : 0;

    return {
      sessionId,
      userId: sessionRow.userId ?? 0,
      duration,
      videosViewed,
      completions,
      saves,
      shares,
      clicks,
      averageWatchTime,
      engagementRate,
    };
  }

  /**
   * Get aggregated metrics for a period
   * Requirement 8.6: Display engagement metrics
   */
  async getAggregatedMetrics(
    period: 'day' | 'week' | 'month' | 'all',
    creatorId?: number,
  ): Promise<AggregatedMetrics> {
    // Calculate date range
    const now = new Date();
    let startDate: Date | undefined;

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = undefined;
        break;
    }

    // Build query filters
    const filters: SQL[] = [];
    if (startDate) {
      filters.push(gte(exploreEngagements.createdAt, startDate.toISOString()));
    }

    // If creator specified, filter by creator's content
    let contentIds: number[] = [];
    if (creatorId) {
      const creatorContent = (await db
        .select({ id: exploreContent.id })
        .from(exploreContent)
        .where(eq(exploreContent.creatorId, creatorId))) as CreatorContentRow[];
      contentIds = creatorContent.map((c: CreatorContentRow) => c.id);
    }

    // Get engagements
    let engagementsQuery = db.select().from(exploreEngagements);

    if (filters.length > 0) {
      engagementsQuery = engagementsQuery.where(and(...filters));
    }

    const engagements = (await engagementsQuery) as EngagementRow[];

    // Filter by creator if specified
    const filteredEngagements = creatorId
      ? engagements.filter((e: EngagementRow) => contentIds.includes(e.contentId))
      : engagements;

    // Calculate metrics
    const totalViews = filteredEngagements.filter(
      (e: EngagementRow) => e.engagementType === 'view',
    ).length;
    const totalUniqueViewers = new Set(
      filteredEngagements
        .filter((e: EngagementRow) => e.engagementType === 'view')
        .map((e: EngagementRow) => e.userId),
    ).size;
    const totalWatchTime = filteredEngagements.reduce(
      (sum: number, e: EngagementRow) => sum + (e.watchTime || 0),
      0,
    );
    const completions = filteredEngagements.filter((e: EngagementRow) => e.completed).length;
    const averageCompletionRate = totalViews > 0 ? (completions / totalViews) * 100 : 0;

    const saves = filteredEngagements.filter(
      (e: EngagementRow) => e.engagementType === 'save',
    ).length;
    const shares = filteredEngagements.filter(
      (e: EngagementRow) => e.engagementType === 'share',
    ).length;
    const clicks = filteredEngagements.filter(
      (e: EngagementRow) => e.engagementType === 'click',
    ).length;
    const totalEngagements = saves + shares + clicks;
    const engagementRate = totalViews > 0 ? (totalEngagements / totalViews) * 100 : 0;

    // Get session metrics
    let sessionsQuery = db.select().from(exploreFeedSessions);
    if (startDate) {
      // Assuming 'startedAt' is the correct column, using toISOString
      // If startedAt doesn't exist on the table definition, we need to check schema.
      // For now, based on line 295 usage, keeping startedAt but fixing Date.
      sessionsQuery = sessionsQuery.where(
        gte(exploreFeedSessions.sessionStart, startDate.toISOString()),
      );
    }
    const sessions = await sessionsQuery;

    const totalSessions = sessions.length;
    const averageSessionDuration =
      sessions.reduce((sum: number, s: any) => {
        if (s.sessionEnd && s.sessionStart) {
          return (
            sum +
            (new Date(s.sessionEnd).getTime() - new Date(s.sessionStart).getTime()) / 1000
          );
        }
        return sum;
      }, 0) / (totalSessions || 1);

    return {
      period,
      totalViews,
      totalUniqueViewers,
      totalWatchTime,
      averageSessionDuration,
      totalSessions,
      averageCompletionRate,
      totalEngagements,
      engagementRate,
    };
  }

  /**
   * Update video completion rate in database
   * Requirement 8.6: Calculate video completion rates
   */
  async updateVideoCompletionRate(videoId: number): Promise<void> {
    const analytics = await this.getVideoAnalytics(videoId);

    await db
      .update(exploreDiscoveryVideos)
      .set({
        totalViews: analytics.totalViews,
        completionRate: analytics.completionRate,
      })
      .where(eq(exploreDiscoveryVideos.id, videoId));
  }

  /**
   * Calculate engagement score
   * Used for ranking and recommendations
   */
  private calculateEngagementScore(metrics: {
    views: number;
    completions: number;
    saves: number;
    shares: number;
    clicks: number;
    skips: number;
  }): number {
    if (metrics.views === 0) return 0;

    // Weighted scoring
    const completionScore = (metrics.completions / metrics.views) * 40;
    const saveScore = (metrics.saves / metrics.views) * 30;
    const shareScore = (metrics.shares / metrics.views) * 20;
    const clickScore = (metrics.clicks / metrics.views) * 10;
    const skipPenalty = (metrics.skips / metrics.views) * -20;

    return Math.max(
      0,
      Math.min(100, completionScore + saveScore + shareScore + clickScore + skipPenalty),
    );
  }

  /**
   * Batch update engagement scores for all content
   * Should be run periodically (e.g., hourly)
   */
  async batchUpdateEngagementScores(): Promise<void> {
    // Get all videos
    const videos = await db.select({ id: exploreDiscoveryVideos.id }).from(exploreDiscoveryVideos);

    // Update each video's completion rate and engagement score
    for (const video of videos) {
      try {
        const analytics = await this.getVideoAnalytics(video.id);

        // Update video table
        await db
          .update(exploreDiscoveryVideos)
          .set({
            totalViews: analytics.totalViews,
            completionRate: analytics.completionRate,
          })
          .where(eq(exploreDiscoveryVideos.id, video.id));

        // Update content table
        await db
          .update(exploreContent)
          .set({
            viewCount: analytics.totalViews,
            engagementScore: analytics.averageEngagementScore,
          })
          .where(eq(exploreContent.id, analytics.contentId));
      } catch (error) {
        console.error(`Failed to update analytics for video ${video.id}:`, error);
      }
    }
  }
}

export const exploreAnalyticsService = new ExploreAnalyticsService();
