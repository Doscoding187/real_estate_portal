// Generated for offline recovery proof from deployed source 68f2c679, cache SHA256 e4ce7664623f61daf648a62c97706ddaf754e76735d6d63042991b43c9b4ca57.
class SimpleCache {
  cache = /* @__PURE__ */ new Map();
  cleanupInterval;
  constructor() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 6e4);
  }
  /**
   * Get value from cache
   */
  async get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }
  /**
   * Set value in cache with TTL (in seconds)
   */
  async set(key, value, ttlSeconds = 300) {
    const expiresAt = Date.now() + ttlSeconds * 1e3;
    this.cache.set(key, { value, expiresAt });
  }
  /**
   * Delete value from cache
   */
  async del(key) {
    this.cache.delete(key);
  }
  /**
   * Clear all cache entries
   */
  async clear() {
    this.cache.clear();
  }
  /**
   * Clean up expired entries
   */
  cleanup() {
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
      keys: Array.from(this.cache.keys())
    };
  }
  /**
   * Destroy cache and cleanup
   */
  destroy() {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}
const cache = new SimpleCache();
const CacheKeys = {
  recommendedFeed: (userId, limit, offset) => `feed:recommended:${userId || "guest"}:${limit}:${offset}`,
  areaFeed: (location, limit, offset) => `feed:area:${location}:${limit}:${offset}`,
  categoryFeed: (category, limit, offset) => `feed:category:${category}:${limit}:${offset}`,
  agentFeed: (agentId, limit, offset) => `feed:agent:${agentId}:${limit}:${offset}`,
  developerFeed: (developerId, limit, offset) => `feed:developer:${developerId}:${limit}:${offset}`,
  agencyFeed: (agencyId, limit, offset, includeAgentContent = true) => `feed:agency:${agencyId}:${limit}:${offset}:${includeAgentContent}`,
  performanceScore: (contentId) => `score:${contentId}`,
  userPreferences: (userId) => `prefs:${userId}`
};
const CacheTTL = {
  FEED: 300,
  // 5 minutes
  PERFORMANCE_SCORE: 900,
  // 15 minutes
  USER_PREFERENCES: 3600
  // 1 hour
};
export {
  CacheKeys,
  CacheTTL,
  cache
};
