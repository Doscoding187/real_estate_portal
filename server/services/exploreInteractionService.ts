import { db } from '../db';
import { exploreContent, exploreEngagements } from '../../drizzle/schema';
import { eq, sql, and, count, desc } from 'drizzle-orm';
import type { InteractionType, DeviceType, FeedType } from '../../shared/types';

/**
 * Explore Interaction Service (BOOT-SAFE)
 *
 * Goal right now: keep backend booting even if Explore tables/columns differ.
 *
 * This implementation:
 * - Writes interactions into exploreEngagements (best-effort)
 * - Updates explore_content counters (best-effort, raw SQL)
 * - Never throws for interaction recording (doesn't block UI)
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
      // Write interaction to exploreEngagements (schema now properly typed)
      await db.insert(exploreEngagements).values({
        contentId,
        userId: userId ?? null,
        sessionId: sessionId ?? '',
        interactionType: interactionType,
        metadata: {
          duration,
          feedType,
          feedContext,
          deviceType,
          userAgent,
          ipAddress,
          ...metadata,
        },
        createdAt: new Date(),
      });

      // Update aggregation metrics asynchronously (best-effort)
      this.updateContentMetrics(contentId, interactionType as any, duration).catch(error => {
        console.error('Error updating content metrics:', error);
      });
    } catch (error) {
      console.error('Error recording interaction:', error);
      // DO NOT throw — must not block UI or crash backend due to analytics.
    }
  }

  /**
   * Record multiple interactions in batch (best-effort)
   */
  async recordBatchInteractions(options: BatchInteractionOptions): Promise<void> {
    const { interactions } = options;
    if (interactions.length === 0) return;

    try {
      const values = interactions.map(interaction => ({
        contentId: interaction.contentId,
        userId: interaction.userId ?? null,
        sessionId: interaction.sessionId ?? '',
        interactionType: interaction.interactionType,
        metadata: {
          duration: interaction.duration,
          feedType: interaction.feedType,
          feedContext: interaction.feedContext,
          deviceType: interaction.deviceType,
          userAgent: interaction.userAgent,
          ipAddress: interaction.ipAddress,
          ...interaction.metadata,
        },
        createdAt: new Date(),
      }));

      await db.insert(exploreEngagements).values(values);

      // Update metrics once per unique content item (best-effort)
      const contentIds = Array.from(new Set(interactions.map(i => i.contentId)));
      for (const contentId of contentIds) {
        const itemInteractions = interactions.filter(i => i.contentId === contentId);
        const last = itemInteractions[itemInteractions.length - 1];
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
      // 1) Increment view count if view/impression
      if (interactionType === 'view' || interactionType === 'impression') {
        await db.execute(sql`
          UPDATE explore_content
          SET view_count = view_count + 1
          WHERE id = ${contentId}
        `);
      }

      // 2) Update engagement score
      // Score weights: like=1, comment=2, save=5, share=5, click_cta/contact/whatsapp/book_viewing=10
      let scoreParams = 0;
      switch (interactionType) {
        case 'like':
          scoreParams = 1;
          break;
        case 'comment':
          scoreParams = 2;
          break;
        case 'save':
          scoreParams = 5;
          break;
        case 'share':
          scoreParams = 5;
          break;
        case 'click_cta':
        case 'contact':
        case 'whatsapp':
        case 'book_viewing':
          scoreParams = 10;
          break;
      }

      if (scoreParams > 0) {
        await db.execute(sql`
          UPDATE explore_content
          SET engagement_score = engagement_score + ${scoreParams}
          WHERE id = ${contentId}
        `);
      }
    } catch (error) {
      console.error('Error updating content metrics:', error);
    }
  }

  /**
   * Get interaction statistics for content
   * Aggregates from exploreEngagements + reads counters from exploreContent
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

      if (!content || content.length === 0) {
        throw new Error('Content not found');
      }

      // Aggregate counts from exploreEngagements (best-effort)
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
        // Legacy alias for compatibility
        shortId: contentId,
        viewCount: content[0]?.viewCount ?? 0,
        uniqueViewCount: content[0]?.viewCount ?? 0, // placeholder
        saveCount: saves?.count ?? 0,
        shareCount: shares?.count ?? 0,
        skipCount: skips?.count ?? 0,
        averageWatchTime: 0, // not stored currently
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
