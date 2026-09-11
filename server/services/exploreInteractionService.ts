import { db } from '../db';
import { exploreContent, exploreEngagements } from '../../drizzle/schema';
import { eq, sql, and, count, desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { InteractionType, DeviceType, FeedType } from '../../shared/types';
import { TRPCError } from '@trpc/server';

function isMissingExploreSchema(error: unknown) {
  const err = error as { code?: string; message?: string; cause?: { code?: string; message?: string } };
  const message = `${err.message || ''} ${err.cause?.message || ''}`;
  const code = err.code || err.cause?.code;
  return code === 'ER_NO_SUCH_TABLE' || /explore_(content|engagements)/i.test(message) && /does not exist|doesn't exist|unknown table/i.test(message);
}

function throwExploreUnavailable(error: unknown): never {
  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: 'Explore engagement storage is unavailable until its canonical schema is established',
    cause: error,
  });
}

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
  eventId?: string;
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
      eventId = randomUUID(),
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
        eventId,
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
      if (isMissingExploreSchema(error)) throwExploreUnavailable(error);
      if (Number(error?.errno) === 1062 || error?.code === 'ER_DUP_ENTRY') return;
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
      // Insert each event independently so one browser replay cannot discard
      // unrelated events in the batch. The unique event identity makes a
      // duplicate a successful no-op, and only newly inserted events update
      // the non-authoritative counters below.
      const insertedInteractions: RecordInteractionOptions[] = [];
      for (const interaction of interactions) {
        try {
          await db.insert(exploreEngagements).values({
            contentId: interaction.contentId,
            eventId: interaction.eventId || randomUUID(),
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
          });
          insertedInteractions.push(interaction);
        } catch (error: any) {
          if (isMissingExploreSchema(error)) throwExploreUnavailable(error);
          if (Number(error?.errno) === 1062 || error?.code === 'ER_DUP_ENTRY') continue;
          console.error('Error recording batch interaction:', error);
        }
      }

      // Aggregate per content item for events that actually committed.
      const contentIds = Array.from(new Set(insertedInteractions.map(i => i.contentId)));

      for (const contentId of contentIds) {
        const last = insertedInteractions.filter(i => i.contentId === contentId).pop();
        this.updateContentMetrics(contentId, (last?.interactionType as any) ?? 'view').catch(
          console.error,
        );
      }
    } catch (error) {
      if (isMissingExploreSchema(error)) throwExploreUnavailable(error);
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

      const [uniqueViews] = await db
        .select({
          count: sql<number>`COUNT(DISTINCT CASE
            WHEN ${exploreEngagements.userId} IS NOT NULL
              THEN CONCAT('user:', ${exploreEngagements.userId})
            ELSE CONCAT('session:', COALESCE(${exploreEngagements.sessionId}, ''))
          END)`,
        })
        .from(exploreEngagements)
        .where(
          and(
            eq(exploreEngagements.contentId, contentId),
            eq(exploreEngagements.interactionType, 'view'),
          ),
        );

      return {
        contentId,

        // legacy alias
        shortId: contentId,

        viewCount: content[0]?.viewCount ?? 0,
        uniqueViewCount: Number(uniqueViews?.count || 0),
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
