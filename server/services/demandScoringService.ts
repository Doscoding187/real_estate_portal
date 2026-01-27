import { db } from '../db';
import { developments, locationAnalyticsEvents } from '../../drizzle/schema';
import { sql, eq, and, desc, gt } from 'drizzle-orm';

/**
 * Service to calculate demand scores and identify hot-selling developments
 * Based on analytics data (views, inquiries) + recent activity
 */
export class DemandScoringService {
  /**
   * Run a batch update of demand scores for all active developments
   * Recommended to run this via cron every 1-4 hours
   */
  static async updateAllScores() {
    console.log('[DemandScoring] Starting batch update...');

    // 1. Get stats gathered from analytics events in the last 7 days
    const stats = await db
      .select({
        developmentId: locationAnalyticsEvents.developmentId,
        viewCount: sql<number>`count(case when ${locationAnalyticsEvents.eventType} = 'development_view' then 1 end)`,
        inquiryCount: sql<number>`count(case when ${locationAnalyticsEvents.eventType} = 'inquiry_submit' then 1 end)`,
      })
      .from(locationAnalyticsEvents)
      .where(
        and(
          sql`${locationAnalyticsEvents.createdAt} > NOW() - INTERVAL 7 DAY`,
          sql`${locationAnalyticsEvents.developmentId} IS NOT NULL`,
        ),
      )
      .groupBy(locationAnalyticsEvents.developmentId);

    // 2. Update each development
    for (const stat of stats) {
      if (!stat.developmentId) continue;

      const score = this.calculateScore(stat.viewCount, stat.inquiryCount);
      const isHot = score > 80; // Threshold for "Hot"
      const isHighDemand = score > 50; // Threshold for "High Demand"

      await db
        .update(developments)
        .set({
          demandScore: score,
          isHotSelling: isHot ? 1 : 0,
          isHighDemand: isHighDemand ? 1 : 0,
          views: stat.viewCount, // Sync total views (or use incremental)
          inquiriesCount: stat.inquiryCount,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(developments.id, stat.developmentId));
    }

    console.log(`[DemandScoring] Updated scores for ${stats.length} developments.`);
  }

  /**
   * Calculate score (0-100)
   * Formula: (Views * 0.5) + (Inquiries * 5.0)
   * Cap at 100
   */
  private static calculateScore(views: number, inquiries: number): number {
    const rawScore = views * 0.5 + inquiries * 5.0;
    return Math.min(Math.round(rawScore), 100);
  }
}
