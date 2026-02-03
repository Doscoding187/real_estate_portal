/**
 * Explore Analytics Service
 * Aggregates engagement metrics and generates creator analytics
 * Works with MySQL/TiDB using Drizzle ORM
 */

import { db } from '../db';
import {
  exploreDiscoveryVideos,
  exploreContent,
  exploreEngagements,
  exploreFeedSessions,
  exploreSavedProperties,
} from '../../drizzle/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

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
    title: string | null;
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
};

type SessionRow = {
  sessionStart: string | null;
  sessionEnd: string | null;
  userId: number | null;
};

export class ExploreAnalyticsService {
  /** Get analytics for a specific video */
  async getVideoAnalytics(
    videoId: number,
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
    const views = engagements.filter(e => e.engagementType === 'view').length;
    const uniqueViewers = new Set(
      engagements.filter(e => e.engagementType === 'view').map(e => e.userId),
    ).size;
    const completions = engagements.filter(e => e.completed).length;
    const saves = engagements.filter(e => e.engagementType === 'save').length;
    const shares = engagements.filter(e => e.engagementType === 'share').length;
    const clicks = engagements.filter(e => e.engagementType === 'click').length;
    const skips = engagements.filter(e => e.engagementType === 'skip').length;

    const totalWatchTime = engagements.reduce((sum, e) => sum + (e.watchTime || 0), 0);
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
      discoveryVideoId: number | null;
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
  async getSessionAnalytics(sessionId: number): Promise<SessionAnalytics> {
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
      engagements.filter(e => e.engagementType === 'view').map(e => e.contentId),
    ).size;
    const completions = engagements.filter(e => e.completed).length;
    const saves = engagements.filter(e => e.engagementType === 'save').length;
    const shares = engagements.filter(e => e.engagementType === 'share').length;
    const clicks = engagements.filter(e => e.engagementType === 'click').length;
    const totalWatchTime = engagements.reduce((sum, e) => sum + (e.watchTime || 0), 0);
    const averageWatchTime = videosViewed ? totalWatchTime / videosViewed : 0;
    const engagementRate = videosViewed ? ((saves + shares + clicks) / videosViewed) * 100 : 0;

    const sessionStart = session[0].sessionStart ? new Date(session[0].sessionStart) : null;
    const sessionEnd = session[0].sessionEnd ? new Date(session[0].sessionEnd) : null;
    const duration =
      sessionStart && sessionEnd ? (sessionEnd.getTime() - sessionStart.getTime()) / 1000 : 0;

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
            type: exploreEngagements.engagementType,
            completed: exploreEngagements.completed,
          })
          .from(exploreEngagements)
          .where(eq(exploreEngagements.contentId, content.id));

        // 3. Calculate metrics
        const views = engagements.filter(e => e.type === 'view').length;
        const completions = engagements.filter(e => e.completed).length;
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
            completed: exploreEngagements.completed,
            type: exploreEngagements.engagementType,
          })
          .from(exploreEngagements)
          .where(
            and(
              eq(exploreEngagements.contentId, video.contentId),
              eq(exploreEngagements.engagementType, 'view'),
            ),
          );

        const totalViews = engagements.length;
        const completions = engagements.filter(e => e.completed).length;
        const rate = totalViews > 0 ? (completions / totalViews) * 100 : 0;

        await db
          .update(exploreDiscoveryVideos)
          .set({
            completionRate: sql`${rate.toFixed(2)}`,
            totalViews: totalViews,
          })
          .where(eq(exploreDiscoveryVideos.id, video.id));
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
}

export const exploreAnalyticsService = new ExploreAnalyticsService();
