import { db } from '../db';
import { exploreContent, listings, developments } from '../../drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { FeedType } from '../../shared/types';
import { cache, CacheKeys, CacheTTL } from '../lib/cache';

/**
 * Explore Feed Service
 *
 * Boot-safe feed generation using exploreContent as the source of videos.
 * NOTE: `exploreShorts` and `exploreUserPreferences` do not exist in the migrated schema exports.
 */

export interface FeedOptions {
  userId?: number;
  limit?: number;
  offset?: number;
  location?: string;
  category?: string;
  agentId?: number;
  developerId?: number;
  agencyId?: number;
  includeAgentContent?: boolean;
}

export interface FeedResult {
  shorts: any[];
  feedType: FeedType;
  hasMore: boolean;
  offset: number;
  metadata?: Record<string, any>;
}

/**
 * Normalize "short" media from exploreContent
 * Keep legacy shape expected by UI/routes.
 */
function transformShort(row: any) {
  const mediaUrls: string[] = [];

  if (row.videoUrl) mediaUrls.push(row.videoUrl);
  if (row.thumbnailUrl) mediaUrls.push(row.thumbnailUrl);

  return {
    ...row,
    primaryMediaUrl: row.videoUrl || row.thumbnailUrl || null,
    mediaUrls,
    // Legacy compatibility fields
    isPublished: row.isActive ? 1 : 0,
    publishedAt: row.createdAt || row.updatedAt || null,
    performanceScore: row.engagementScore ?? 0,
    boostPriority: row.isFeatured ? 1 : 0,
  };
}

export class ExploreFeedService {
  /**
   * Recommended feed (no user personalization yet)
   */
  async getRecommendedFeed(options: FeedOptions): Promise<FeedResult> {
    const { userId, limit = 20, offset = 0 } = options;

    const cacheKey = CacheKeys.recommendedFeed(userId, limit, offset);
    const cached = await cache.get<FeedResult>(cacheKey);
    if (cached) return cached;

    const rows = await db
      .select({
        content: exploreContent,
        qualityScore: listings.qualityScore,
      })
      .from(exploreContent)
      .leftJoin(listings, eq(exploreContent.referenceId, listings.id))
      .where(
        and(
          eq(exploreContent.contentType, 'video' as any),
          eq(exploreContent.isActive, true as any),
        ),
      )
      .orderBy(
        desc(exploreContent.isFeatured),
        sql`(COALESCE(${exploreContent.engagementScore}, 0) * (1 + COALESCE(${listings.qualityScore}, 30) / 100)) DESC`,
        desc(exploreContent.viewCount),
        desc(exploreContent.createdAt),
      )
      .limit(limit)
      .offset(offset);

    const shorts = rows.map(r => r.content);

    const result: FeedResult = {
      shorts: shorts.map(transformShort),
      feedType: 'recommended',
      hasMore: shorts.length === limit,
      offset: offset + shorts.length,
      metadata: {
        personalized: false,
      },
    };

    await cache.set(cacheKey, result, CacheTTL.FEED);
    return result;
  }

  /**
   * Area feed
   */
  async getAreaFeed(options: FeedOptions): Promise<FeedResult> {
    const { location, limit = 20, offset = 0 } = options;

    if (!location) throw new Error('Location required');

    const cacheKey = CacheKeys.areaFeed(location, limit, offset);
    const cached = await cache.get<FeedResult>(cacheKey);
    if (cached) return cached;

    const loc = location.toLowerCase();

    const rows = await db
      .select({
        content: exploreContent,
        listingCity: listings.city,
        listingSuburb: listings.suburb,
        listingProvince: listings.province,
        devCity: developments.city,
        devProvince: developments.province,
      })
      .from(exploreContent)
      .leftJoin(listings, eq(exploreContent.referenceId, listings.id))
      .leftJoin(developments, eq(exploreContent.referenceId, developments.id))
      .where(
        and(
          eq(exploreContent.contentType, 'video' as any),
          eq(exploreContent.isActive, true as any),
          sql`(
            LOWER(COALESCE(${listings.city}, '')) LIKE ${`%${loc}%`}
            OR LOWER(COALESCE(${listings.suburb}, '')) LIKE ${`%${loc}%`}
            OR LOWER(COALESCE(${listings.province}, '')) LIKE ${`%${loc}%`}
            OR LOWER(COALESCE(${developments.city}, '')) LIKE ${`%${loc}%`}
            OR LOWER(COALESCE(${developments.province}, '')) LIKE ${`%${loc}%`}
          )`,
        ),
      )
      .orderBy(desc(exploreContent.isFeatured), desc(exploreContent.engagementScore), desc(exploreContent.createdAt))
      .limit(limit)
      .offset(offset);

    const shorts = rows.map(r => r.content);

    return {
      shorts: shorts.map(transformShort),
      feedType: 'area',
      hasMore: shorts.length === limit,
      offset: offset + shorts.length,
      metadata: { location },
    };
  }

  /**
   * Agent feed (creatorId is a user id in exploreContent; keep this endpoint boot-safe)
   */
  async getAgentFeed(options: FeedOptions): Promise<FeedResult> {
    const { agentId, limit = 20, offset = 0 } = options;
    if (!agentId) throw new Error('Agent ID required');

    const rows = await db
      .select()
      .from(exploreContent)
      .where(
        and(
          eq(exploreContent.contentType, 'video' as any),
          eq(exploreContent.isActive, true as any),
          eq(exploreContent.creatorType, 'agent' as any),
          eq(exploreContent.creatorId, agentId),
        ),
      )
      .orderBy(desc(exploreContent.isFeatured), desc(exploreContent.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      shorts: rows.map(transformShort),
      feedType: 'agent',
      hasMore: rows.length === limit,
      offset: offset + rows.length,
      metadata: { agentId },
    };
  }

  /**
   * Developer feed
   */
  async getDeveloperFeed(options: FeedOptions): Promise<FeedResult> {
    const { developerId, limit = 20, offset = 0 } = options;
    if (!developerId) throw new Error('Developer ID required');

    const rows = await db
      .select()
      .from(exploreContent)
      .where(
        and(
          eq(exploreContent.contentType, 'video' as any),
          eq(exploreContent.isActive, true as any),
          eq(exploreContent.creatorType, 'developer' as any),
          eq(exploreContent.creatorId, developerId),
        ),
      )
      .orderBy(desc(exploreContent.isFeatured), desc(exploreContent.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      shorts: rows.map(transformShort),
      feedType: 'developer',
      hasMore: rows.length === limit,
      offset: offset + rows.length,
      metadata: { developerId },
    };
  }

  /**
   * Agency feed
   */
  async getAgencyFeed(options: FeedOptions): Promise<FeedResult> {
    const { agencyId, limit = 20, offset = 0 } = options;
    if (!agencyId) throw new Error('Agency ID required');

    const rows = await db
      .select()
      .from(exploreContent)
      .where(
        and(
          eq(exploreContent.contentType, 'video' as any),
          eq(exploreContent.isActive, true as any),
          eq(exploreContent.agencyId, agencyId),
        ),
      )
      .orderBy(desc(exploreContent.isFeatured), desc(exploreContent.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      shorts: rows.map(transformShort),
      feedType: 'agency',
      hasMore: rows.length === limit,
      offset: offset + rows.length,
      metadata: { agencyId },
    };
  }

  /**
   * Feed router
   */
  async getFeed(feedType: FeedType, options: FeedOptions): Promise<FeedResult> {
    switch (feedType) {
      case 'recommended':
        return this.getRecommendedFeed(options);
      case 'area':
        return this.getAreaFeed(options);
      case 'agent':
        return this.getAgentFeed(options);
      case 'developer':
        return this.getDeveloperFeed(options);
      case 'agency':
        return this.getAgencyFeed(options);
      default:
        throw new Error(`Unknown feed type: ${feedType}`);
    }
  }

  async getCategories() {
    return [];
  }

  async getTopics() {
    return [];
  }
}

// Singleton
export const exploreFeedService = new ExploreFeedService();

