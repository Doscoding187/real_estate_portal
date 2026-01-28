import { db } from '../db';
import { exploreShorts, exploreInteractions } from '../../drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import type { InteractionType, DeviceType, FeedType } from '../../shared/types';

/**
 * Explore Interaction Service
 *
 * Handles tracking and recording of user interactions with property shorts.
 * Supports both authenticated and guest users.
 */

export interface RecordInteractionOptions {
  shortId: number;
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
   * Record a single interaction
   */
  async recordInteraction(options: RecordInteractionOptions): Promise<void> {
    const {
      shortId,
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
      // Insert interaction record
      await db.insert(exploreInteractions).values({
        shortId,
        userId: userId || null,
        sessionId,
        interactionType,
        duration: duration || null,
        feedType,
        feedContext: feedContext ? JSON.stringify(feedContext) : null,
        deviceType,
        userAgent: userAgent || null,
        ipAddress: ipAddress || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      });

      // Update short metrics asynchronously (don't wait)
      this.updateShortMetrics(shortId, interactionType, duration).catch(error => {
        console.error('Error updating short metrics:', error);
      });
    } catch (error) {
      console.error('Error recording interaction:', error);
      throw error;
    }
  }

  /**
   * Record multiple interactions in batch
   * Optimized for high-volume interaction tracking
   */
  async recordBatchInteractions(options: BatchInteractionOptions): Promise<void> {
    const { interactions } = options;

    if (interactions.length === 0) {
      return;
    }

    try {
      // Prepare batch insert values
      const values = interactions.map(interaction => ({
        shortId: interaction.shortId,
        userId: interaction.userId || null,
        sessionId: interaction.sessionId,
        interactionType: interaction.interactionType,
        duration: interaction.duration || null,
        feedType: interaction.feedType,
        feedContext: interaction.feedContext ? JSON.stringify(interaction.feedContext) : null,
        deviceType: interaction.deviceType,
        userAgent: interaction.userAgent || null,
        ipAddress: interaction.ipAddress || null,
        metadata: interaction.metadata ? JSON.stringify(interaction.metadata) : null,
      }));

      // Batch insert
      await db.insert(exploreInteractions).values(values);

      // Update metrics for all affected shorts
      const shortIds = [...new Set(interactions.map(i => i.shortId))];
      for (const shortId of shortIds) {
        const shortInteractions = interactions.filter(i => i.shortId === shortId);
        for (const interaction of shortInteractions) {
          this.updateShortMetrics(shortId, interaction.interactionType, interaction.duration).catch(
            error => {
              console.error('Error updating short metrics:', error);
            },
          );
        }
      }
    } catch (error) {
      console.error('Error recording batch interactions:', error);
      throw error;
    }
  }

  /**
   * Save property to favorites
   */
  async saveProperty(shortId: number, userId: number): Promise<void> {
    try {
      // Record save interaction
      await this.recordInteraction({
        shortId,
        userId,
        sessionId: `user-${userId}`,
        interactionType: 'save',
        feedType: 'recommended',
        deviceType: 'mobile',
      });

      // TODO: Add to favorites table in Phase 7
    } catch (error) {
      console.error('Error saving property:', error);
      throw error;
    }
  }

  /**
   * Record property share
   */
  async shareProperty(
    shortId: number,
    userId: number | undefined,
    sessionId: string,
    platform?: string,
  ): Promise<void> {
    try {
      await this.recordInteraction({
        shortId,
        userId,
        sessionId,
        interactionType: 'share',
        feedType: 'recommended',
        deviceType: 'mobile',
        metadata: { platform },
      });
    } catch (error) {
      console.error('Error recording share:', error);
      throw error;
    }
  }

  /**
   * Update short engagement metrics
   * Called asynchronously after recording interactions
   */
  private async updateShortMetrics(
    shortId: number,
    interactionType: InteractionType,
    duration?: number,
  ): Promise<void> {
    try {
      // Map interaction types to metric fields
      const metricUpdates: Record<string, string> = {
        impression: 'view_count',
        view: 'view_count',
        skip: 'skip_count',
        save: 'save_count',
        share: 'share_count',
      };

      const field = metricUpdates[interactionType];

      if (field) {
        // Increment the appropriate counter
        await db.execute(sql`
          UPDATE explore_shorts 
          SET ${sql.raw(field)} = ${sql.raw(field)} + 1
          WHERE id = ${shortId}
        `);
      }

      // Update average watch time for view interactions
      if (interactionType === 'view' && duration) {
        await db.execute(sql`
          UPDATE explore_shorts 
          SET average_watch_time = (
            (average_watch_time * view_count + ${duration}) / (view_count + 1)
          )
          WHERE id = ${shortId}
        `);
      }

      // Update unique view count (simplified - in production, use session tracking)
      if (interactionType === 'impression') {
        await db.execute(sql`
          UPDATE explore_shorts 
          SET unique_view_count = unique_view_count + 1
          WHERE id = ${shortId}
        `);
      }
    } catch (error) {
      console.error('Error updating short metrics:', error);
      // Don't throw - this is a background operation
    }
  }

  /**
   * Get interaction statistics for a short
   */
  async getShortStats(shortId: number): Promise<any> {
    try {
      const short = await db
        .select()
        .from(exploreShorts)
        .where(eq(exploreShorts.id, shortId))
        .limit(1);

      if (short.length === 0) {
        throw new Error('Short not found');
      }

      return {
        shortId,
        viewCount: short[0].viewCount,
        uniqueViewCount: short[0].uniqueViewCount,
        saveCount: short[0].saveCount,
        shareCount: short[0].shareCount,
        skipCount: short[0].skipCount,
        averageWatchTime: short[0].averageWatchTime,
        performanceScore: short[0].performanceScore,
      };
    } catch (error) {
      console.error('Error getting short stats:', error);
      throw error;
    }
  }

  /**
   * Get user interaction history
   */
  async getUserInteractionHistory(userId: number, limit: number = 50): Promise<any[]> {
    try {
      const interactions = await db
        .select()
        .from(exploreInteractions)
        .where(eq(exploreInteractions.userId, userId))
        .orderBy(sql`timestamp DESC`)
        .limit(limit);

      return interactions;
    } catch (error) {
      console.error('Error getting user interaction history:', error);
      throw error;
    }
  }

  /**
   * Get session interaction history (for guest users)
   */
  async getSessionInteractionHistory(sessionId: string, limit: number = 50): Promise<any[]> {
    try {
      const interactions = await db
        .select()
        .from(exploreInteractions)
        .where(eq(exploreInteractions.sessionId, sessionId))
        .orderBy(sql`timestamp DESC`)
        .limit(limit);

      return interactions;
    } catch (error) {
      console.error('Error getting session interaction history:', error);
      throw error;
    }
  }

  /**
   * Calculate engagement rate for a short
   */
  async calculateEngagementRate(shortId: number): Promise<number> {
    try {
      const short = await db
        .select()
        .from(exploreShorts)
        .where(eq(exploreShorts.id, shortId))
        .limit(1);

      if (short.length === 0) {
        return 0;
      }

      const { viewCount, saveCount, shareCount } = short[0];

      if (viewCount === 0) {
        return 0;
      }

      // Engagement rate = (saves + shares) / views * 100
      const engagementRate = ((saveCount + shareCount) / viewCount) * 100;
      return Math.round(engagementRate * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      console.error('Error calculating engagement rate:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const exploreInteractionService = new ExploreInteractionService();
