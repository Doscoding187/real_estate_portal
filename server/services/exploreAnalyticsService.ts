/**
 * Explore Analytics Service
 * Aggregates engagement metrics and generates creator analytics
 * Works with MySQL/TiDB using Drizzle ORM
 */

import { db } from '../db';
import {
  exploreContent,
  exploreEngagements,
  exploreDiscoveryVideos,
  exploreFeedSessions,
} from '../../drizzle/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

interface VideoAnalytics {
  videoId: string;
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
    title: string | null;
    views: number;
    completionRate: number;
    engagementScore: number;
  }>;
}

interface SessionAnalytics {
  sessionId: string;
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

type EngagementRow = {
  interactionType: string;
  metadata?: any;
  userId: number | null;
  contentId: number;
};

type VideoRow = {
  id: number;
  title: string | null;
};

type SessionRow = {
  createdAt: Date | string | null;
  userId: number | null;
};

type AggregatedMetricsPeriod = 'day' | 'week' | 'month' | 'all';

interface AggregatedMetrics {
  totalViews: number;
  totalUniqueViewers: number;
  totalWatchTime: number;
  totalSessions: number;
  averageSessionDuration: number;
  averageCompletionRate: number;
  engagementRate: number;
}

function getPeriodStart(period: AggregatedMetricsPeriod): Date | undefined {
  const now = new Date();

  if (period === 'day') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  if (period === 'week') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return start;
  }

  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return undefined;
}

function isMissingExploreAnalyticsSchema(error: unknown) {
  const err = error as {
    code?: string;
    message?: string;
    cause?: { code?: string; message?: string };
  };
  const message = `${err.message || ''} ${err.cause?.message || ''}`;
  const code = err.code || err.cause?.code;

  return (
    code === 'ER_NO_SUCH_TABLE' ||
    (message.includes('explore_engagements') && message.includes("doesn't exist"))
  );
}

export class ExploreAnalyticsService {
  /** Get analytics for a specific video */
  async getVideoAnalytics(
    videoId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<VideoAnalytics> {
    // Get contentId for this video
    const video = await db
      .select({ contentId: exploreDiscoveryVideos.exploreContentId })
      .from(exploreDiscoveryVideos)
      .where(eq(exploreDiscoveryVideos.id, videoId))
      .limit(1);

    if (!video[0]) throw new Error('Video not found');
    const contentId = video[0].contentId;

    // Build date filter
    const filters: any[] = [eq(exploreEngagements.contentId, contentId)];
    if (startDate) filters.push(gte(exploreEngagements.createdAt, startDate));
    if (endDate) filters.push(lte(exploreEngagements.createdAt, endDate));

    // Fetch engagements
    const engagements = (await db
      .select()
      .from(exploreEngagements)
      .where(and(...filters))) as EngagementRow[];

    // Metrics
    const views = engagements.filter(e => e.interactionType === 'view').length;
    const uniqueViewers = new Set(
      engagements.filter(e => e.interactionType === 'view').map(e => e.userId),
    ).size;
    const completions = engagements.filter(e => e.interactionType === 'complete').length;
    const saves = engagements.filter(e => e.interactionType === 'save').length;
    const shares = engagements.filter(e => e.interactionType === 'share').length;
    const clicks = engagements.filter(e => e.interactionType === 'click').length;
    const skips = engagements.filter(e => e.interactionType === 'skip').length;

    const totalWatchTime = engagements.reduce((sum, e) => {
      const watchTime =
        typeof e.metadata?.watchTime === 'number' ? (e.metadata.watchTime as number) : 0;
      return sum + watchTime;
    }, 0);
    const averageWatchTime = views ? totalWatchTime / views : 0;
    const completionRate = views ? (completions / views) * 100 : 0;
    const engagementRate = views ? ((saves + shares + clicks) / views) * 100 : 0;
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

  /** Get analytics for a creator across all videos */
  async getCreatorAnalytics(
    creatorId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<CreatorAnalytics> {
    // All creator's videos
    const videos = (await db
      .select({
        id: exploreContent.id,
        title: exploreContent.title,
        discoveryVideoId: exploreDiscoveryVideos.id,
      })
      .from(exploreContent)
      .leftJoin(
        exploreDiscoveryVideos,
        eq(exploreDiscoveryVideos.exploreContentId, exploreContent.id),
      )
      .where(eq(exploreContent.creatorId, creatorId))) as {
      id: number;
      title: string | null;
      discoveryVideoId: string | null;
    }[];

    const totalVideos = videos.length;
    if (!totalVideos)
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

    // Filter out videos that might not have a discovery video linked (if that's possible)
    // or just process those that do.
    const validVideos = videos.filter(v => v.discoveryVideoId !== null);

    // Analytics for each video
    const videoAnalytics = await Promise.all(
      validVideos.map(v => this.getVideoAnalytics(v.discoveryVideoId!, startDate, endDate)),
    );

    const totalViews = videoAnalytics.reduce((sum, v) => sum + v.totalViews, 0);
    const totalWatchTime = videoAnalytics.reduce((sum, v) => sum + v.totalWatchTime, 0);
    const averageCompletionRate =
      validVideos.length > 0
        ? videoAnalytics.reduce((sum, v) => sum + v.completionRate, 0) / validVideos.length
        : 0;
    const totalSaves = videoAnalytics.reduce((sum, v) => sum + v.saves, 0);
    const totalShares = videoAnalytics.reduce((sum, v) => sum + v.shares, 0);
    const totalClicks = videoAnalytics.reduce((sum, v) => sum + v.clicks, 0);
    const engagementRate = totalViews
      ? ((totalSaves + totalShares + totalClicks) / totalViews) * 100
      : 0;

    const topPerformingVideos = videoAnalytics
      .map((v, i) => ({
        contentId: v.contentId,
        title: validVideos[i].title,
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

  /** Get session analytics */
  async getSessionAnalytics(sessionId: string): Promise<SessionAnalytics> {
    if (!sessionId || typeof sessionId !== 'string') {
      return {
        sessionId,
        userId: 0,
        duration: 0,
        videosViewed: 0,
        completions: 0,
        saves: 0,
        shares: 0,
        clicks: 0,
        averageWatchTime: 0,
        engagementRate: 0,
      };
    }

    const session = (await db
      .select()
      .from(exploreFeedSessions)
      .where(eq(exploreFeedSessions.id, sessionId))
      .limit(1)) as SessionRow[];

    if (!session[0]) throw new Error('Session not found');

    const engagements = (await db
      .select()
      .from(exploreEngagements)
      .where(eq(exploreEngagements.sessionId, sessionId))) as EngagementRow[];

    const videosViewed = new Set(
      engagements.filter(e => e.interactionType === 'view').map(e => e.contentId),
    ).size;
    const completions = engagements.filter(e => e.interactionType === 'complete').length;
    const saves = engagements.filter(e => e.interactionType === 'save').length;
    const shares = engagements.filter(e => e.interactionType === 'share').length;
    const clicks = engagements.filter(e => e.interactionType === 'click').length;
    const totalWatchTime = engagements.reduce((sum, e) => {
      const watchTime =
        typeof e.metadata?.watchTime === 'number' ? (e.metadata.watchTime as number) : 0;
      return sum + watchTime;
    }, 0);
    const averageWatchTime = videosViewed ? totalWatchTime / videosViewed : 0;
    const engagementRate = videosViewed ? ((saves + shares + clicks) / videosViewed) * 100 : 0;

    const sessionStart = session[0].createdAt ? new Date(session[0].createdAt) : null;
    const duration = sessionStart ? 0 : 0;

    return {
      sessionId,
      userId: session[0].userId ?? 0,
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
   * Batch update engagement scores for all content
   * Run this as a scheduled job (e.g. cron)
   */
  async batchUpdateEngagementScores() {
    console.log('[Analytics] Starting batch engagement score update...');

    // 1. Get all content IDs
    const contentList = await db.select({ id: exploreContent.id }).from(exploreContent);

    for (const content of contentList) {
      try {
        // 2. Fetch all engagements for this content
        const engagements = await db
          .select({
            type: exploreEngagements.interactionType,
          })
          .from(exploreEngagements)
          .where(eq(exploreEngagements.contentId, content.id));

        // 3. Calculate metrics
        const views = engagements.filter(e => e.type === 'view').length;
        const completions = engagements.filter(e => e.type === 'complete').length;
        const saves = engagements.filter(e => e.type === 'save').length;
        const shares = engagements.filter(e => e.type === 'share').length;
        const clicks = engagements.filter(e => e.type === 'click').length;
        const skips = engagements.filter(e => e.type === 'skip').length;

        // 4. Calculate score
        const score = this.calculateEngagementScore({
          views,
          completions,
          saves,
          shares,
          clicks,
          skips,
        });

        // 5. Update content table
        // Note: score passed as string because decimal mapping in Drizzle often expects string for precision
        await db
          .update(exploreContent)
          .set({ engagementScore: sql`${score.toFixed(2)}` })
          .where(eq(exploreContent.id, content.id));
      } catch (err) {
        console.error(`[Analytics] Failed to update score for content ${content.id}:`, err);
      }
    }

    console.log('[Analytics] Finished batch engagement score update.');
  }

  /**
   * Update video completion rates
   * Run this as a scheduled job
   */
  async updateVideoCompletionRate() {
    console.log('[Analytics] Starting video completion rate update...');

    const videos = await db
      .select({
        id: exploreDiscoveryVideos.id,
        contentId: exploreDiscoveryVideos.exploreContentId,
      })
      .from(exploreDiscoveryVideos);

    for (const video of videos) {
      try {
        // Get view stats
        const engagements = await db
          .select({
            type: exploreEngagements.interactionType,
          })
          .from(exploreEngagements)
          .where(eq(exploreEngagements.contentId, video.contentId));

        const totalViews = engagements.filter(e => e.type === 'view').length;
        const completions = engagements.filter(e => e.type === 'complete').length;
        const rate = totalViews > 0 ? (completions / totalViews) * 100 : 0;

        console.debug(
          `[Analytics] Completion rate for video ${video.id}: ${rate.toFixed(2)}% (${totalViews} views)`,
        );
      } catch (err) {
        console.error(`[Analytics] Failed to update completion rate for video ${video.id}:`, err);
      }
    }

    console.log('[Analytics] Finished video completion rate update.');
  }

  /** Calculate engagement score for ranking */
  private calculateEngagementScore(metrics: {
    views: number;
    completions: number;
    saves: number;
    shares: number;
    clicks: number;
    skips: number;
  }): number {
    if (!metrics.views) return 0;
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

  async getAggregatedMetrics(
    period: AggregatedMetricsPeriod = 'all',
    creatorId?: number,
  ): Promise<AggregatedMetrics> {
    const startDate = getPeriodStart(period);
    const filters: any[] = [];

    if (startDate) filters.push(gte(exploreEngagements.createdAt, startDate));
    if (creatorId) filters.push(eq(exploreContent.creatorId, creatorId));

    const baseQuery = db
      .select({
        totalViews: sql<number>`SUM(CASE WHEN ${exploreEngagements.interactionType} = 'view' THEN 1 ELSE 0 END)`,
        totalUniqueViewers: sql<number>`COUNT(DISTINCT CASE WHEN ${exploreEngagements.interactionType} = 'view' THEN CASE WHEN ${exploreEngagements.userId} IS NOT NULL THEN CONCAT('user:', ${exploreEngagements.userId}) WHEN NULLIF(${exploreEngagements.sessionId}, '') IS NOT NULL THEN CONCAT('session:', ${exploreEngagements.sessionId}) ELSE CONCAT('anonymous:', ${exploreEngagements.contentId}) END END)`,
        totalCompletions: sql<number>`SUM(CASE WHEN ${exploreEngagements.interactionType} = 'complete' THEN 1 ELSE 0 END)`,
        totalSaves: sql<number>`SUM(CASE WHEN ${exploreEngagements.interactionType} = 'save' THEN 1 ELSE 0 END)`,
        totalShares: sql<number>`SUM(CASE WHEN ${exploreEngagements.interactionType} = 'share' THEN 1 ELSE 0 END)`,
        totalClicks: sql<number>`SUM(CASE WHEN ${exploreEngagements.interactionType} IN ('click_cta', 'contact', 'whatsapp', 'book_viewing') THEN 1 ELSE 0 END)`,
        totalSessions: sql<number>`COUNT(DISTINCT NULLIF(${exploreEngagements.sessionId}, ''))`,
        totalWatchTime: sql<number>`SUM(COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(${exploreEngagements.metadata}, '$.watchTime')) AS DECIMAL(20,6)), CAST(JSON_UNQUOTE(JSON_EXTRACT(${exploreEngagements.metadata}, '$.duration')) AS DECIMAL(20,6)), 0))`,
      })
      .from(exploreEngagements)
      .innerJoin(exploreContent, eq(exploreContent.id, exploreEngagements.contentId));

    let rows: Array<{
      totalViews: number | string | null;
      totalUniqueViewers: number | string | null;
      totalCompletions: number | string | null;
      totalSaves: number | string | null;
      totalShares: number | string | null;
      totalClicks: number | string | null;
      totalSessions: number | string | null;
      totalWatchTime: number | string | null;
    }>;
    try {
      rows = (await (filters.length ? baseQuery.where(and(...filters)) : baseQuery)) as typeof rows;
    } catch (error) {
      if (isMissingExploreAnalyticsSchema(error)) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Explore analytics is unavailable until its canonical schema is established',
          cause: error,
        });
      }
      throw error;
    }
    const aggregate = rows[0] ?? {
      totalViews: 0,
      totalUniqueViewers: 0,
      totalCompletions: 0,
      totalSaves: 0,
      totalShares: 0,
      totalClicks: 0,
      totalSessions: 0,
      totalWatchTime: 0,
    };
    const totalViews = Number(aggregate.totalViews || 0);
    const totalUniqueViewers = Number(aggregate.totalUniqueViewers || 0);
    const totalCompletions = Number(aggregate.totalCompletions || 0);
    const totalSaves = Number(aggregate.totalSaves || 0);
    const totalShares = Number(aggregate.totalShares || 0);
    const totalClicks = Number(aggregate.totalClicks || 0);
    const totalSessions = Number(aggregate.totalSessions || 0);
    const totalWatchTime = Number(aggregate.totalWatchTime || 0);

    return {
      totalViews,
      totalUniqueViewers,
      totalWatchTime,
      totalSessions,
      averageSessionDuration: totalSessions ? totalWatchTime / totalSessions : 0,
      averageCompletionRate: totalViews ? (totalCompletions / totalViews) * 100 : 0,
      engagementRate: totalViews ? ((totalSaves + totalShares + totalClicks) / totalViews) * 100 : 0,
    };
  }
}

export const exploreAnalyticsService = new ExploreAnalyticsService();
