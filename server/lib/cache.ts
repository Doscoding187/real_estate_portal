/**
 * Simple in-memory cache with TTL support
 *
 * This provides a basic caching layer for the Explore Shorts feature.
 * Can be replaced with Redis in production for distributed caching.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set value in cache with TTL (in seconds)
   */
  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Destroy cache and cleanup
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// Export singleton instance
export const cache = new SimpleCache();

/**
 * Cache key generators for different feed types
 */
export const CacheKeys = {
  recommendedFeed: (userId: number | undefined, limit: number, offset: number) =>
    `feed:recommended:${userId || 'guest'}:${limit}:${offset}`,

  areaFeed: (location: string, limit: number, offset: number) =>
    `feed:area:${location}:${limit}:${offset}`,

  categoryFeed: (category: string, limit: number, offset: number) =>
    `feed:category:${category}:${limit}:${offset}`,

  agentFeed: (agentId: number, limit: number, offset: number) =>
    `feed:agent:${agentId}:${limit}:${offset}`,

  developerFeed: (developerId: number, limit: number, offset: number) =>
    `feed:developer:${developerId}:${limit}:${offset}`,

  agencyFeed: (
    agencyId: number,
    limit: number,
    offset: number,
    includeAgentContent: boolean = true,
  ) => `feed:agency:${agencyId}:${limit}:${offset}:${includeAgentContent}`,

  performanceScore: (contentId: number) => `score:${contentId}`,

  userPreferences: (userId: number) => `prefs:${userId}`,
};

/**
 * Cache TTL constants (in seconds)
 */
export const CacheTTL = {
  FEED: 300, // 5 minutes
  PERFORMANCE_SCORE: 900, // 15 minutes
  USER_PREFERENCES: 3600, // 1 hour
};
