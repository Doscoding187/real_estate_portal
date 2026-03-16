import { db } from '../db';
import { exploreContent, exploreEngagements, interactionEvents, outcomeEvents } from '../../drizzle/schema';
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

export type OutcomeType = 'contactClick' | 'leadSubmitted' | 'viewingRequest' | 'quoteRequest';

export interface RecordOutcomeOptions {
  contentId: number;
  outcomeType: OutcomeType;
  sessionId: string;
  userId?: number;
  metadata?: Record<string, any>;
}

export class ExploreInteractionService {
  private readonly maxEventsPerMinute = (() => {
    const raw = Number(process.env.EXPLORE_INTERACTION_MAX_EVENTS_PER_MINUTE ?? 120);
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 120;
  })();

  private readonly dedupeWindowMs = (() => {
    const raw = Number(process.env.EXPLORE_INTERACTION_DEDUPE_MS ?? 1200);
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1200;
  })();

  private readonly rateWindowMs = 60_000;
  private readonly rateLimiter = new Map<string, { count: number; windowStart: number; lastSeen: number }>();
  private readonly dedupeLimiter = new Map<string, number>();

  private pruneThrottleState(now: number) {
    for (const [key, value] of this.rateLimiter.entries()) {
      if (now - value.lastSeen > this.rateWindowMs * 2) {
        this.rateLimiter.delete(key);
      }
    }

    for (const [key, lastSeen] of this.dedupeLimiter.entries()) {
      if (now - lastSeen > this.dedupeWindowMs * 4) {
        this.dedupeLimiter.delete(key);
      }
    }
  }

  private shouldThrottle(options: RecordInteractionOptions): boolean {
    const now = Date.now();
    this.pruneThrottleState(now);

    const normalizedSession = String(options.sessionId || '').slice(0, 128);
    const sessionKey = normalizedSession || `anon:${options.userId ?? 'guest'}:${options.deviceType}`;
    const rateKey = `${sessionKey}:${options.deviceType}`;
    const current = this.rateLimiter.get(rateKey);

    if (!current || now - current.windowStart > this.rateWindowMs) {
      this.rateLimiter.set(rateKey, {
        count: 1,
        windowStart: now,
        lastSeen: now,
      });
    } else {
      current.count += 1;
      current.lastSeen = now;
      this.rateLimiter.set(rateKey, current);
      if (current.count > this.maxEventsPerMinute) {
        return true;
      }
    }

    const durationBucket =
      typeof options.duration === 'number' && Number.isFinite(options.duration)
        ? Math.max(0, Math.floor(options.duration / 3))
        : 0;
    const dedupeKey = `${sessionKey}:${options.contentId}:${options.interactionType}:${durationBucket}`;
    const lastSeenAt = this.dedupeLimiter.get(dedupeKey);
    if (typeof lastSeenAt === 'number' && now - lastSeenAt < this.dedupeWindowMs) {
      return true;
    }
    this.dedupeLimiter.set(dedupeKey, now);
    return false;
  }

  private shouldThrottleOutcome(options: RecordOutcomeOptions): boolean {
    const now = Date.now();
    this.pruneThrottleState(now);

    const normalizedSession = String(options.sessionId || '').slice(0, 128);
    const sessionKey = normalizedSession || `anon:${options.userId ?? 'guest'}`;
    const rateKey = `outcome:${sessionKey}`;
    const current = this.rateLimiter.get(rateKey);
    const maxOutcomeEventsPerMinute = Math.max(20, Math.floor(this.maxEventsPerMinute / 2));

    if (!current || now - current.windowStart > this.rateWindowMs) {
      this.rateLimiter.set(rateKey, {
        count: 1,
        windowStart: now,
        lastSeen: now,
      });
    } else {
      current.count += 1;
      current.lastSeen = now;
      this.rateLimiter.set(rateKey, current);
      if (current.count > maxOutcomeEventsPerMinute) {
        return true;
      }
    }

    const dedupeKey = `outcome:${sessionKey}:${options.contentId}:${options.outcomeType}`;
    const lastSeenAt = this.dedupeLimiter.get(dedupeKey);
    if (typeof lastSeenAt === 'number' && now - lastSeenAt < this.dedupeWindowMs * 2) {
      return true;
    }

    this.dedupeLimiter.set(dedupeKey, now);
    return false;
  }

  private mapInteractionToIntegrityEvent(interactionType: string):
    | 'impression'
    | 'viewProgress'
    | 'viewComplete'
    | 'like'
    | 'save'
    | 'share'
    | 'profileClick'
    | 'listingOpen'
    | 'contactClick'
    | 'notInterested'
    | 'report' {
    switch (interactionType) {
      case 'impression':
        return 'impression';
      case 'view':
      case 'viewProgress':
        return 'viewProgress';
      case 'viewComplete':
      case 'complete':
        return 'viewComplete';
      case 'like':
        return 'like';
      case 'save':
        return 'save';
      case 'share':
        return 'share';
      case 'profileClick':
        return 'profileClick';
      case 'listingOpen':
        return 'listingOpen';
      case 'contactClick':
      case 'contact':
      case 'whatsapp':
      case 'book_viewing':
      case 'click_cta':
        return 'contactClick';
      case 'notInterested':
      case 'skip':
        return 'notInterested';
      case 'report':
        return 'report';
      default:
        return 'impression';
    }
  }

  private mapInteractionToLegacyEvent(interactionType: string): string {
    switch (interactionType) {
      case 'viewProgress':
        return 'impression';
      case 'viewComplete':
        return 'complete';
      case 'profileClick':
      case 'listingOpen':
      case 'contactClick':
        return 'click_cta';
      case 'notInterested':
        return 'skip';
      case 'report':
        return 'comment';
      default:
        return interactionType;
    }
  }

  private async insertInteractionEvent(params: {
    contentId: number;
    viewerUserId?: number;
    sessionId: string;
    interactionType: InteractionType;
    duration?: number;
  }) {
    try {
      const { contentId, viewerUserId, sessionId, interactionType, duration } = params;
      const integrityEventType = this.mapInteractionToIntegrityEvent(interactionType);
      const content = await db
        .select({ actorId: exploreContent.actorId })
        .from(exploreContent)
        .where(eq(exploreContent.id, contentId))
        .limit(1);

      await db.insert(interactionEvents).values({
        contentId,
        actorId: content[0]?.actorId ?? null,
        viewerUserId: viewerUserId ?? null,
        eventType: integrityEventType,
        watchMs: typeof duration === 'number' ? Math.max(0, Math.round(duration * 1000)) : null,
        sessionId: sessionId || '',
      });
    } catch (error) {
      console.warn('[ExploreInteraction] interaction_events insert skipped:', (error as any)?.message);
    }
  }

  private async insertOutcomeEvent(params: RecordOutcomeOptions) {
    try {
      const { contentId, userId, sessionId, outcomeType, metadata } = params;
      const content = await db
        .select({ actorId: exploreContent.actorId })
        .from(exploreContent)
        .where(eq(exploreContent.id, contentId))
        .limit(1);

      await db.insert(outcomeEvents).values({
        contentId,
        actorId: content[0]?.actorId ?? null,
        viewerUserId: userId ?? null,
        outcomeType,
        sessionId: sessionId || '',
        metadata: metadata ?? null,
      });
    } catch (error) {
      console.warn('[ExploreInteraction] outcome_events insert skipped:', (error as any)?.message);
    }
  }

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

    if (!Number.isFinite(contentId) || contentId <= 0) {
      return;
    }

    if (this.shouldThrottle(options)) {
      return;
    }

    try {
      const legacyInteractionType = this.mapInteractionToLegacyEvent(interactionType);

      // 1) Write raw interaction (analytics layer)
      console.log('[ENG_INSERT_ATTEMPT]', {
        contentId,
        interactionType,
        legacyInteractionType,
        userId: userId ?? null,
        sessionId,
        feedType,
        deviceType,
      });

      await this.insertInteractionEvent({
        contentId,
        viewerUserId: userId,
        sessionId,
        interactionType,
        duration,
      });

      await db.insert(exploreEngagements).values({
        contentId,
        userId: userId ?? null,
        sessionId: sessionId ?? '',
        interactionType: legacyInteractionType as any,
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
      this.updateContentMetrics(contentId, legacyInteractionType as any, duration).catch(err => {
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
    const acceptedInteractions = interactions.filter(interaction => {
      if (!Number.isFinite(interaction.contentId) || interaction.contentId <= 0) return false;
      return !this.shouldThrottle(interaction);
    });
    if (!acceptedInteractions.length) return;

    try {
      const values = acceptedInteractions.map(i => ({
        legacyInteractionType: this.mapInteractionToLegacyEvent(i.interactionType),
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

      await Promise.allSettled(
        acceptedInteractions.map(i =>
          this.insertInteractionEvent({
            contentId: i.contentId,
            viewerUserId: i.userId,
            sessionId: i.sessionId ?? '',
            interactionType: i.interactionType,
            duration: i.duration,
          }),
        ),
      );

      await db.insert(exploreEngagements).values(
        values.map(value => ({
          contentId: value.contentId,
          userId: value.userId,
          sessionId: value.sessionId,
          interactionType: value.legacyInteractionType as any,
          metadata: value.metadata,
        })),
      );

      // Aggregate per content item
      const contentIds = Array.from(new Set(acceptedInteractions.map(i => i.contentId)));

      for (const contentId of contentIds) {
        const last = acceptedInteractions.filter(i => i.contentId === contentId).pop();
        const legacyType = this.mapInteractionToLegacyEvent((last?.interactionType as any) ?? 'view');
        this.updateContentMetrics(contentId, legacyType as any).catch(console.error);
      }
    } catch (error) {
      console.error('Error recording batch interactions:', error);
    }
  }

  async recordOutcome(options: RecordOutcomeOptions): Promise<void> {
    const { contentId } = options;
    if (!Number.isFinite(contentId) || contentId <= 0) {
      return;
    }
    if (this.shouldThrottleOutcome(options)) {
      return;
    }

    await this.insertOutcomeEvent(options);
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
