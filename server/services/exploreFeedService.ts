import { db } from "../db";
import {
  exploreShorts,
  exploreUserPreferences,
  listings,
  developments,
} from "../../drizzle/schema";
import { eq, and, desc, sql, or } from "drizzle-orm";
import type { FeedType } from "../../shared/types";
import { cache, CacheKeys, CacheTTL } from "../lib/cache";

/**
 * Explore Feed Service
 * 
 * Handles feed generation logic for the Property Explore Shorts feature.
 * Implements basic recommendation algorithms and feed filtering.
 */

export interface FeedOptions {
  userId?: number;
  limit?: number;
  offset?: number;
  location?: string;
  category?: string;
  agentId?: number;
  developerId?: number;
}

export interface FeedResult {
  shorts: any[];
  feedType: FeedType;
  hasMore: boolean;
  offset: number;
  metadata?: Record<string, any>;
}

/**
 * Transform explore short to include computed fields
 */
function transformShort(short: any) {
  const mediaIds = typeof short.mediaIds === 'string' 
    ? JSON.parse(short.mediaIds) 
    : short.mediaIds;
  
  return {
    ...short,
    primaryMediaUrl: Array.isArray(mediaIds) && mediaIds.length > 0 ? mediaIds[0] : null,
    mediaUrls: Array.isArray(mediaIds) ? mediaIds : [],
  };
}

export class ExploreFeedService {
  /**
   * Get recommended feed for a user
   * Factors in: boost priority, performance score, user preferences
   */
  async getRecommendedFeed(options: FeedOptions): Promise<FeedResult> {
    const { userId, limit = 20, offset = 0 } = options;

    try {
      // Check cache first
      const cacheKey = CacheKeys.recommendedFeed(userId, limit, offset);
      const cached = await cache.get<FeedResult>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get user preferences if authenticated
      let userPrefs = null;
      if (userId) {
        try {
          // Check cache for user preferences
          const prefsCacheKey = CacheKeys.userPreferences(userId);
          userPrefs = await cache.get(prefsCacheKey);
          
          if (!userPrefs) {
            const prefs = await db
              .select()
              .from(exploreUserPreferences)
              .where(eq(exploreUserPreferences.userId, userId))
              .limit(1);
            userPrefs = prefs[0] || null;
            
            // Cache user preferences
            if (userPrefs) {
              await cache.set(prefsCacheKey, userPrefs, CacheTTL.USER_PREFERENCES);
            }
          }
        } catch (error) {
          // Table might not exist yet - gracefully continue without preferences
          console.warn('Could not fetch user preferences:', error);
          userPrefs = null;
        }
      }

      // Build query with boost priority and performance score
      let query = db
        .select()
        .from(exploreShorts)
        .where(eq(exploreShorts.isPublished, 1));

      // Apply user location preference if available
      if (userPrefs?.preferredLocations && userPrefs.preferredLocations.length > 0) {
        // TODO: Filter by preferred locations in Phase 9
      }

      // Order by boost priority, then performance score, then recency
      const shorts = await query
        .orderBy(
          desc(exploreShorts.boostPriority),
          desc(exploreShorts.performanceScore),
          desc(exploreShorts.publishedAt)
        )
        .limit(limit)
        .offset(offset);

      const result: FeedResult = {
        shorts: shorts.map(transformShort),
        feedType: 'recommended',
        hasMore: shorts.length === limit,
        offset: offset + shorts.length,
        metadata: {
          personalized: !!userPrefs,
        },
      };

      // Cache the result
      await cache.set(cacheKey, result, CacheTTL.FEED);

      return result;
    } catch (error) {
      console.error("Error generating recommended feed:", error);
      throw error;
    }
  }

  /**
   * Get area-based feed
   * Filters properties by location (city, suburb, or province)
   */
  async getAreaFeed(options: FeedOptions): Promise<FeedResult> {
    const { location, limit = 20, offset = 0 } = options;

    if (!location) {
      throw new Error("Location parameter required for area feed");
    }

    try {
      // Check cache first
      const cacheKey = CacheKeys.areaFeed(location, limit, offset);
      const cached = await cache.get<FeedResult>(cacheKey);
      if (cached) {
        return cached;
      }

      // Query with location filtering via JOIN
      const result = await db.execute(sql`
        SELECT es.* 
        FROM explore_shorts es
        LEFT JOIN listings l ON es.listing_id = l.id
        LEFT JOIN developments d ON es.development_id = d.id
        WHERE es.is_published = 1
        AND (
          l.city LIKE ${`%${location}%`} 
          OR l.suburb LIKE ${`%${location}%`}
          OR l.province LIKE ${`%${location}%`}
          OR d.city LIKE ${`%${location}%`}
          OR d.province LIKE ${`%${location}%`}
        )
        ORDER BY es.boost_priority DESC, es.performance_score DESC, es.published_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);

      const feedResult: FeedResult = {
        shorts: result.rows.map(transformShort),
        feedType: 'area',
        hasMore: result.rows.length === limit,
        offset: offset + result.rows.length,
        metadata: {
          location,
        },
      };

      // Cache the result
      await cache.set(cacheKey, feedResult, CacheTTL.FEED);

      return feedResult;
    } catch (error) {
      console.error("Error generating area feed:", error);
      throw error;
    }
  }

  /**
   * Get category-based feed
   * Filters properties by predefined categories
   */
  async getCategoryFeed(options: FeedOptions): Promise<FeedResult> {
    const { category, limit = 20, offset = 0 } = options;

    if (!category) {
      throw new Error("Category parameter required for category feed");
    }

    try {
      // Category to highlight tag mapping
      const categoryMap: Record<string, string[]> = {
        'luxury_homes': ['luxury', 'high_end', 'premium', 'modern_finishes'],
        'student_rentals': ['student', 'university', 'close_to_schools'],
        'apartments_under_1m': ['affordable', 'budget', 'negotiable'],
        'large_yard_homes': ['large_yard', 'garden', 'pool'],
        'new_developments': ['new_development', 'under_construction'],
        'move_in_ready': ['ready_to_move', 'move_in_ready'],
        'pet_friendly': ['pet_friendly'],
        'secure_estate': ['secure_estate'],
        'off_grid': ['off_grid_ready'],
      };

      const tags = categoryMap[category] || [];

      // Query shorts matching category tags
      let query = db
        .select()
        .from(exploreShorts)
        .where(eq(exploreShorts.isPublished, 1));

      // Filter by highlights if tags exist
      if (tags.length > 0) {
        // Use raw SQL for JSON array matching
        const result = await db.execute(sql`
          SELECT * FROM explore_shorts
          WHERE is_published = 1
          AND highlights IS NOT NULL
          AND (
            ${sql.join(
              tags.map(tag => sql`JSON_CONTAINS(highlights, JSON_QUOTE(${tag}))`),
              sql` OR `
            )}
          )
          ORDER BY boost_priority DESC, performance_score DESC, published_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `);

        return {
          shorts: result.rows.map(transformShort),
          feedType: 'category',
          hasMore: result.rows.length === limit,
          offset: offset + result.rows.length,
          metadata: {
            category,
            tags,
          },
        };
      }

      // Fallback to all shorts if no tags
      const shorts = await query
        .orderBy(
          desc(exploreShorts.boostPriority),
          desc(exploreShorts.performanceScore),
          desc(exploreShorts.publishedAt)
        )
        .limit(limit)
        .offset(offset);

      return {
        shorts: shorts.map(transformShort),
        feedType: 'category',
        hasMore: shorts.length === limit,
        offset: offset + shorts.length,
        metadata: {
          category,
        },
      };
    } catch (error) {
      console.error("Error generating category feed:", error);
      throw error;
    }
  }

  /**
   * Get agent-specific feed
   * Shows all properties from a specific agent
   */
  async getAgentFeed(options: FeedOptions): Promise<FeedResult> {
    const { agentId, limit = 20, offset = 0 } = options;

    if (!agentId) {
      throw new Error("Agent ID required for agent feed");
    }

    try {
      const shorts = await db
        .select()
        .from(exploreShorts)
        .where(
          and(
            eq(exploreShorts.agentId, agentId),
            eq(exploreShorts.isPublished, 1)
          )
        )
        .orderBy(
          desc(exploreShorts.isFeatured),
          desc(exploreShorts.publishedAt)
        )
        .limit(limit)
        .offset(offset);

      return {
        shorts: shorts.map(transformShort),
        feedType: 'agent',
        hasMore: shorts.length === limit,
        offset: offset + shorts.length,
        metadata: {
          agentId,
        },
      };
    } catch (error) {
      console.error("Error generating agent feed:", error);
      throw error;
    }
  }

  /**
   * Get developer-specific feed
   * Shows all properties from a specific developer
   */
  async getDeveloperFeed(options: FeedOptions): Promise<FeedResult> {
    const { developerId, limit = 20, offset = 0 } = options;

    if (!developerId) {
      throw new Error("Developer ID required for developer feed");
    }

    try {
      const shorts = await db
        .select()
        .from(exploreShorts)
        .where(
          and(
            eq(exploreShorts.developerId, developerId),
            eq(exploreShorts.isPublished, 1)
          )
        )
        .orderBy(
          desc(exploreShorts.isFeatured),
          desc(exploreShorts.publishedAt)
        )
        .limit(limit)
        .offset(offset);

      return {
        shorts: shorts.map(transformShort),
        feedType: 'developer',
        hasMore: shorts.length === limit,
        offset: offset + shorts.length,
        metadata: {
          developerId,
        },
      };
    } catch (error) {
      console.error("Error generating developer feed:", error);
      throw error;
    }
  }

  /**
   * Get feed by type
   * Convenience method to route to appropriate feed generator
   */
  async getFeed(feedType: FeedType, options: FeedOptions): Promise<FeedResult> {
    switch (feedType) {
      case 'recommended':
        return this.getRecommendedFeed(options);
      case 'area':
        return this.getAreaFeed(options);
      case 'category':
        return this.getCategoryFeed(options);
      case 'agent':
        return this.getAgentFeed(options);
      case 'developer':
        return this.getDeveloperFeed(options);
      default:
        throw new Error(`Unknown feed type: ${feedType}`);
    }
  }
}

// Export singleton instance
export const exploreFeedService = new ExploreFeedService();
