import { db } from '../db';
import { exploreContent, exploreEngagements } from '../../drizzle/schema';
import { eq, sql, and, count, desc } from 'drizzle-orm';
import type { InteractionType, DeviceType, FeedType } from '../../shared/types';

/**
 * Explore Interaction Service (BOOT-SAFE)
 *
 * Goals:
 * - Never block UI
 * - Never crash backend
 * - Best-effort analytics
 * - Deterministic scoring
 * - Future-proof feed logic
 */

export interface RecordInteractionOptions {
  contentId: number;
  userId?: number;
  sessionId: string;
  interactionType: InteractionType;
  duration?: number;
  feedType: FeedType;
  feedContext?: Record<string, any>;
  deviceType: DeviceType;
  userAgent?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export interface BatchInteractionOptions {
  interactions: RecordInteractionOptions[];
}

export class ExploreInteractionService {
  /**
   * Record a single interaction (best-effort)
   */
  async recordInteraction(options: RecordInteractionOptions): Promise<void> {
    const {
      contentId,
      userId,
      sessionId,
      interactionType,
      duration,
      feedType,
      feedContext,
      deviceType,
      userAgent,
      ipAddress,
      metadata,
    } = options;

    try {
      // 1) Write raw interaction (analytics layer)
      console.log('[ENG_INSERT_ATTEMPT]', {
        contentId,
        interactionType,
        userId: userId ?? null,
        sessionId,
        feedType,
        deviceType,
      });

      await db.insert(exploreEngagements).values({
        contentId,
        userId: userId ?? null,
        sessionId: sessionId ?? '',
        interactionType,
        metadata: {
          duration,
          feedType,
          feedContext,
          deviceType,
          userAgent,
          ipAddress,
          ...metadata,
        },
      });

      console.log('[ENG_INSERT_OK]', { contentId, interactionType });

      // 2) Update aggregated metrics (async, non-blocking)
      this.updateContentMetrics(contentId, interactionType as any, duration).catch(err => {
        console.error('Error updating content metrics:', err);
      });
    } catch (error: any) {
      console.error('[ENG_INSERT_FAIL]', {
        contentId,
        interactionType,
        message: error?.message,
        code: error?.code,
        name: error?.name,
        stack: error?.stack,
      });
      // NEVER throw — analytics must not block UI or crash app
    }
  }

  /**
   * Record multiple interactions in batch (best-effort)
   */
  async recordBatchInteractions(options: BatchInteractionOptions): Promise<void> {
    const { interactions } = options;
    if (!interactions.length) return;

    try {
      const values = interactions.map(i => ({
        contentId: i.contentId,
        userId: i.userId ?? null,
        sessionId: i.sessionId ?? '',
        interactionType: i.interactionType,
        metadata: {
          duration: i.duration,
          feedType: i.feedType,
          feedContext: i.feedContext,
          deviceType: i.deviceType,
          userAgent: i.userAgent,
          ipAddress: i.ipAddress,
          ...i.metadata,
        },
      }));

      await db.insert(exploreEngagements).values(values);

      // Aggregate per content item
      const contentIds = Array.from(new Set(interactions.map(i => i.contentId)));

      for (const contentId of contentIds) {
        const last = interactions.filter(i => i.contentId === contentId).pop();
        this.updateContentMetrics(contentId, (last?.interactionType as any) ?? 'view').catch(
          console.error,
        );
      }
    } catch (error) {
      console.error('Error recording batch interactions:', error);
    }
  }

  /**
   * Save property (favorite)
   */
  async saveProperty(contentId: number, userId: number): Promise<void> {
    return this.recordInteraction({
      contentId,
      userId,
      sessionId: `user-${userId}`,
      interactionType: 'save',
      feedType: 'recommended',
      deviceType: 'mobile',
    });
  }

  /**
   * Share property
   */
  async shareProperty(
    contentId: number,
    userId: number | undefined,
    sessionId: string,
    platform?: string,
  ): Promise<void> {
    return this.recordInteraction({
      contentId,
      userId,
      sessionId,
      interactionType: 'share',
      feedType: 'recommended',
      deviceType: 'mobile',
      metadata: { platform },
    });
  }

  /**
   * Update content engagement metrics (best-effort)
   */
  private async updateContentMetrics(
    contentId: number,
    interactionType: string,
    _duration?: number,
  ): Promise<void> {
    try {
      /* -----------------------------------
       * 1) View counter
       * ----------------------------------- */
      if (interactionType === 'view' || interactionType === 'impression') {
        await db.execute(sql`
          UPDATE explore_content
          SET view_count = view_count + 1
          WHERE id = ${contentId}
        `);
      }

      /* -----------------------------------
       * 2) Engagement scoring (Phase 1.2 LOCKED)
       * -----------------------------------
       * Intention tiers (TikTok-grade v1):
       *
       * Passive:     view → 1
       * Quality:     complete → 3
       * Light:       like → 2, comment → 3
       * Strong:      save → 5, share → 7
       * Conversion:  click_cta/contact/whatsapp/book_viewing → 10
       */

      let scoreDelta = 0;

      switch (interactionType) {
        case 'view':
          scoreDelta = 1;
          break;
        case 'complete':
          scoreDelta = 3;
          break;
        case 'like':
          scoreDelta = 2;
          break;
        case 'comment':
          scoreDelta = 3;
          break;
        case 'save':
          scoreDelta = 5;
          break;
        case 'share':
          scoreDelta = 7;
          break;
        case 'click_cta':
        case 'contact':
        case 'whatsapp':
        case 'book_viewing':
          scoreDelta = 10;
          break;
        default:
          scoreDelta = 0;
      }

      console.log('[SCORE_DEBUG]', { interactionType, scoreDelta, contentId });

      if (scoreDelta > 0) {
        await db.execute(sql`
          UPDATE explore_content
          SET engagement_score = engagement_score + ${scoreDelta}
          WHERE id = ${contentId}
        `);
      }
    } catch (error) {
      console.error('Error updating content metrics:', error);
    }
  }

  /**
   * Get interaction statistics for content
   */
  async getShortStats(contentId: number): Promise<any> {
    try {
      const content = await db
        .select({
          viewCount: exploreContent.viewCount,
          engagementScore: exploreContent.engagementScore,
        })
        .from(exploreContent)
        .where(eq(exploreContent.id, contentId))
        .limit(1);

      if (!content.length) throw new Error('Content not found');

      const [saves] = await db
        .select({ count: count() })
        .from(exploreEngagements)
        .where(
          and(
            eq(exploreEngagements.contentId, contentId),
            eq(exploreEngagements.interactionType, 'save'),
          ),
        );

      const [shares] = await db
        .select({ count: count() })
        .from(exploreEngagements)
        .where(
          and(
            eq(exploreEngagements.contentId, contentId),
            eq(exploreEngagements.interactionType, 'share'),
          ),
        );

      const [skips] = await db
        .select({ count: count() })
        .from(exploreEngagements)
        .where(
          and(
            eq(exploreEngagements.contentId, contentId),
            eq(exploreEngagements.interactionType, 'skip'),
          ),
        );

      return {
        contentId,

        // legacy alias
        shortId: contentId,

        viewCount: content[0]?.viewCount ?? 0,
        uniqueViewCount: content[0]?.viewCount ?? 0, // placeholder for future dedupe logic
        saveCount: saves?.count ?? 0,
        shareCount: shares?.count ?? 0,
        skipCount: skips?.count ?? 0,
        averageWatchTime: 0, // future metric
        performanceScore: content[0]?.engagementScore ?? 0,
      };
    } catch (error) {
      console.error('Error getting content stats:', error);
      throw error;
    }
  }

  /**
   * Get user interaction history
   */
  async getUserInteractionHistory(userId: number, limit: number = 50): Promise<any[]> {
    try {
      return await db
        .select()
        .from(exploreEngagements)
        .where(eq(exploreEngagements.userId, userId))
        .orderBy(desc(exploreEngagements.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('Error getting user interaction history:', error);
      throw error;
    }
  }

  /**
   * Get session interaction history
   */
  async getSessionInteractionHistory(sessionId: string, limit: number = 50): Promise<any[]> {
    try {
      return await db
        .select()
        .from(exploreEngagements)
        .where(eq(exploreEngagements.sessionId, sessionId))
        .orderBy(desc(exploreEngagements.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('Error getting session interaction history:', error);
      throw error;
    }
  }

  /**
   * Calculate engagement rate
   */
  async calculateEngagementRate(contentId: number): Promise<number> {
    try {
      const stats = await this.getShortStats(contentId);
      if (!stats || stats.viewCount === 0) return 0;

      const engagementRate = ((stats.saveCount + stats.shareCount) / stats.viewCount) * 100;
      return Math.round(engagementRate * 100) / 100;
    } catch {
      return 0;
    }
  }
}

export const exploreInteractionService = new ExploreInteractionService();
