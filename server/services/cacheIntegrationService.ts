/**
 * Cache Integration Service
 * Task 17: Performance Optimization
 *
 * Integrates Redis caching into Explore Discovery Engine services
 */

import { redisCache, ExploreCacheKeys, CacheTTL } from '../lib/redis';
import type { InferSelectModel } from 'drizzle-orm';
import {
  exploreContent,
  exploreDiscoveryVideos,
  exploreNeighbourhoods,
  userPreferences,
} from '../../drizzle/schema';

type ExploreContent = InferSelectModel<typeof exploreContent>;
type ExploreDiscoveryVideo = InferSelectModel<typeof exploreDiscoveryVideos>;
type Neighbourhood = InferSelectModel<typeof exploreNeighbourhoods>;
type UserPreferences = InferSelectModel<typeof userPreferences>;

/**
 * Cache wrapper for personalized feed
 */
export async function getCachedPersonalizedFeed(
  userId: number | undefined,
  limit: number,
  offset: number,
  fetchFn: () => Promise<ExploreContent[]>,
): Promise<ExploreContent[]> {
  const cacheKey = ExploreCacheKeys.personalizedFeed(userId, limit, offset);

  // Try cache first
  const cached = await redisCache.get<ExploreContent[]>(cacheKey);
  if (cached) {
    console.log(`[Cache HIT] Personalized feed for user ${userId}`);
    return cached;
  }

  // Cache miss - fetch fresh data
  console.log(`[Cache MISS] Fetching personalized feed for user ${userId}`);
  const data = await fetchFn();

  // Store in cache
  await redisCache.set(cacheKey, data, CacheTTL.FEED_RESULTS);

  return data;
}

/**
 * Cache wrapper for video feed
 */
export async function getCachedVideoFeed(
  category: string | undefined,
  limit: number,
  offset: number,
  fetchFn: () => Promise<ExploreDiscoveryVideo[]>,
): Promise<ExploreDiscoveryVideo[]> {
  const cacheKey = ExploreCacheKeys.videoFeed(category, limit, offset);

  const cached = await redisCache.get<ExploreDiscoveryVideo[]>(cacheKey);
  if (cached) {
    console.log(`[Cache HIT] Video feed for category ${category}`);
    return cached;
  }

  console.log(`[Cache MISS] Fetching video feed for category ${category}`);
  const data = await fetchFn();

  await redisCache.set(cacheKey, data, CacheTTL.FEED_RESULTS);

  return data;
}

/**
 * Cache wrapper for neighbourhood detail
 */
export async function getCachedNeighbourhoodDetail(
  neighbourhoodId: number,
  fetchFn: () => Promise<Neighbourhood | null>,
): Promise<Neighbourhood | null> {
  const cacheKey = ExploreCacheKeys.neighbourhoodDetail(neighbourhoodId);

  const cached = await redisCache.get<Neighbourhood>(cacheKey);
  if (cached) {
    console.log(`[Cache HIT] Neighbourhood ${neighbourhoodId}`);
    return cached;
  }

  console.log(`[Cache MISS] Fetching neighbourhood ${neighbourhoodId}`);
  const data = await fetchFn();

  if (data) {
    await redisCache.set(cacheKey, data, CacheTTL.NEIGHBOURHOOD_DATA);
  }

  return data;
}

/**
 * Cache wrapper for user preferences
 */
export async function getCachedUserPreferences(
  userId: number,
  fetchFn: () => Promise<UserPreferences | null>,
): Promise<UserPreferences | null> {
  const cacheKey = ExploreCacheKeys.userPreferences(userId);

  const cached = await redisCache.get<UserPreferences>(cacheKey);
  if (cached) {
    console.log(`[Cache HIT] User preferences ${userId}`);
    return cached;
  }

  console.log(`[Cache MISS] Fetching user preferences ${userId}`);
  const data = await fetchFn();

  if (data) {
    await redisCache.set(cacheKey, data, CacheTTL.USER_PREFERENCES);
  }

  return data;
}

/**
 * Cache wrapper for similar properties
 */
export async function getCachedSimilarProperties(
  propertyId: number,
  fetchFn: () => Promise<any[]>,
): Promise<any[]> {
  const cacheKey = ExploreCacheKeys.similarProperties(propertyId);

  const cached = await redisCache.get<any[]>(cacheKey);
  if (cached) {
    console.log(`[Cache HIT] Similar properties for ${propertyId}`);
    return cached;
  }

  console.log(`[Cache MISS] Fetching similar properties for ${propertyId}`);
  const data = await fetchFn();

  await redisCache.set(cacheKey, data, CacheTTL.SIMILAR_PROPERTIES);

  return data;
}

/**
 * Cache wrapper for categories
 */
export async function getCachedCategories(fetchFn: () => Promise<any[]>): Promise<any[]> {
  const cacheKey = ExploreCacheKeys.categories();

  const cached = await redisCache.get<any[]>(cacheKey);
  if (cached) {
    console.log(`[Cache HIT] Categories`);
    return cached;
  }

  console.log(`[Cache MISS] Fetching categories`);
  const data = await fetchFn();

  await redisCache.set(cacheKey, data, CacheTTL.CATEGORIES);

  return data;
}

/**
 * Invalidate user-specific caches
 */
export async function invalidateUserCache(userId: number): Promise<void> {
  console.log(`[Cache] Invalidating cache for user ${userId}`);

  await Promise.all([
    redisCache.del(ExploreCacheKeys.userPreferences(userId)),
    redisCache.delByPattern(
      `${ExploreCacheKeys.personalizedFeed(userId, 0, 0).split(':').slice(0, -2).join(':')}:*`,
    ),
  ]);
}

/**
 * Invalidate feed caches (when new content is added)
 */
export async function invalidateFeedCaches(): Promise<void> {
  console.log(`[Cache] Invalidating all feed caches`);

  await Promise.all([
    redisCache.delByPattern('explore:feed:*'),
    redisCache.delByPattern('explore:video:feed:*'),
  ]);
}

/**
 * Invalidate neighbourhood cache
 */
export async function invalidateNeighbourhoodCache(neighbourhoodId: number): Promise<void> {
  console.log(`[Cache] Invalidating neighbourhood ${neighbourhoodId}`);

  await redisCache.del(ExploreCacheKeys.neighbourhoodDetail(neighbourhoodId));
}

/**
 * Invalidate similar properties cache
 */
export async function invalidateSimilarPropertiesCache(propertyId: number): Promise<void> {
  console.log(`[Cache] Invalidating similar properties for ${propertyId}`);

  await redisCache.del(ExploreCacheKeys.similarProperties(propertyId));
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  return await redisCache.getStats();
}

/**
 * Warm up cache with frequently accessed data
 */
export async function warmUpCache(
  fetchCategories: () => Promise<any[]>,
  fetchPopularNeighbourhoods: () => Promise<Neighbourhood[]>,
): Promise<void> {
  console.log('[Cache] Warming up cache...');

  try {
    // Cache categories
    const categories = await fetchCategories();
    await redisCache.set(ExploreCacheKeys.categories(), categories, CacheTTL.CATEGORIES);

    // Cache popular neighbourhoods
    const neighbourhoods = await fetchPopularNeighbourhoods();
    for (const neighbourhood of neighbourhoods) {
      await redisCache.set(
        ExploreCacheKeys.neighbourhoodDetail(neighbourhood.id),
        neighbourhood,
        CacheTTL.NEIGHBOURHOOD_DATA,
      );
    }

    console.log('[Cache] Warm-up complete');
  } catch (error) {
    console.error('[Cache] Warm-up failed:', error);
  }
}

export default {
  getCachedPersonalizedFeed,
  getCachedVideoFeed,
  getCachedNeighbourhoodDetail,
  getCachedUserPreferences,
  getCachedSimilarProperties,
  getCachedCategories,
  invalidateUserCache,
  invalidateFeedCaches,
  invalidateNeighbourhoodCache,
  invalidateSimilarPropertiesCache,
  getCacheStats,
  warmUpCache,
};
