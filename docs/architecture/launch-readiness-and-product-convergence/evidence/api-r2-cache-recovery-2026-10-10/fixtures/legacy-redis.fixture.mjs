// Generated for offline recovery proof from deployed source 68f2c679, RedisCache SHA256 a89f18df2905a5b748f2b6a26d3f97e04d3378080c519a4cc54f4340398b61a4.
import { createClient } from "redis";
const CacheTTL = {
  USER_PREFERENCES: 3600,
  // 1 hour
  FEED_RESULTS: 300,
  // 5 minutes
  NEIGHBOURHOOD_DATA: 86400,
  // 1 day
  VIDEO_METADATA: 3600,
  // 1 hour
  PERFORMANCE_SCORE: 900,
  // 15 minutes
  CATEGORIES: 86400,
  // 1 day
  SIMILAR_PROPERTIES: 1800,
  // 30 minutes
  BOOST_CAMPAIGNS: 300,
  // 5 minutes
  ANALYTICS: 600
  // 10 minutes
};
const CachePrefix = {
  USER_PREFS: "explore:user:prefs:",
  FEED: "explore:feed:",
  VIDEO_FEED: "explore:video:feed:",
  NEIGHBOURHOOD: "explore:neighbourhood:",
  CATEGORIES: "explore:categories",
  SIMILAR: "explore:similar:",
  BOOST: "explore:boost:",
  ANALYTICS: "explore:analytics:",
  SESSION: "explore:session:"
};
class RedisCache {
  client = null;
  isConnected = false;
  connectionPromise = null;
  fallbackCache = /* @__PURE__ */ new Map();
  constructor() {
    this.initializeConnection();
  }
  async initializeConnection() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.log("[Redis] No REDIS_URL configured, using in-memory fallback");
      return;
    }
    try {
      this.client = createClient({ url: redisUrl });
      this.client.on("error", (err) => {
        console.error("[Redis] Connection error:", err.message);
        this.isConnected = false;
      });
      this.client.on("connect", () => {
        console.log("[Redis] Connected successfully");
        this.isConnected = true;
      });
      this.client.on("reconnecting", () => {
        console.log("[Redis] Reconnecting...");
      });
      this.connectionPromise = this.client.connect().then(() => void 0);
      await this.connectionPromise;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Redis] Failed to connect:", message);
      this.client = null;
      this.isConnected = false;
    }
  }
  async ensureConnected() {
    if (this.connectionPromise) {
      try {
        await this.connectionPromise;
      } catch {
      }
    }
    return this.isConnected && this.client !== null;
  }
  /**
   * Get value from cache
   */
  async get(key) {
    try {
      if (await this.ensureConnected() && this.client) {
        const value = await this.client.get(key);
        if (value) {
          return JSON.parse(value);
        }
        return null;
      }
      return this.getFallback(key);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Redis] Get error:", message);
      return this.getFallback(key);
    }
  }
  /**
   * Set value in cache with TTL
   */
  async set(key, value, ttlSeconds = CacheTTL.FEED_RESULTS) {
    try {
      const serialized = JSON.stringify(value);
      if (await this.ensureConnected() && this.client) {
        await this.client.setEx(key, ttlSeconds, serialized);
        return;
      }
      this.setFallback(key, serialized, ttlSeconds);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Redis] Set error:", message);
      this.setFallback(key, JSON.stringify(value), ttlSeconds);
    }
  }
  /**
   * Delete value from cache
   */
  async del(key) {
    try {
      if (await this.ensureConnected() && this.client) {
        await this.client.del(key);
      }
      this.fallbackCache.delete(key);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Redis] Delete error:", message);
      this.fallbackCache.delete(key);
    }
  }
  /**
   * Delete multiple keys by pattern
   */
  async delByPattern(pattern) {
    try {
      if (await this.ensureConnected() && this.client) {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(keys);
        }
      }
      const regex = new RegExp(pattern.replace(/\*/g, ".*"));
      for (const key of this.fallbackCache.keys()) {
        if (regex.test(key)) {
          this.fallbackCache.delete(key);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Redis] Delete by pattern error:", message);
    }
  }
  /**
   * Check if key exists
   */
  async exists(key) {
    try {
      if (await this.ensureConnected() && this.client) {
        return await this.client.exists(key) === 1;
      }
      return this.fallbackCache.has(key);
    } catch (error) {
      return this.fallbackCache.has(key);
    }
  }
  /**
   * Get remaining TTL for a key
   */
  async ttl(key) {
    try {
      if (await this.ensureConnected() && this.client) {
        return await this.client.ttl(key);
      }
      const entry = this.fallbackCache.get(key);
      if (entry) {
        return Math.max(0, Math.floor((entry.expiresAt - Date.now()) / 1e3));
      }
      return -2;
    } catch (error) {
      return -1;
    }
  }
  // Fallback methods for when Redis is unavailable
  getFallback(key) {
    const entry = this.fallbackCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.fallbackCache.delete(key);
      return null;
    }
    return JSON.parse(entry.value);
  }
  setFallback(key, value, ttlSeconds) {
    this.fallbackCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1e3
    });
  }
  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      if (await this.ensureConnected() && this.client) {
        const info = await this.client.info("memory");
        const dbSize = await this.client.dbSize();
        const memMatch = info.match(/used_memory_human:(\S+)/);
        return {
          connected: true,
          keys: dbSize,
          memory: memMatch ? memMatch[1] : "unknown"
        };
      }
    } catch (error) {
    }
    return {
      connected: false,
      keys: this.fallbackCache.size
    };
  }
  /**
   * Graceful shutdown
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}
const redisCache = new RedisCache();
const ExploreCacheKeys = {
  userPreferences: (userId) => `${CachePrefix.USER_PREFS}${userId}`,
  personalizedFeed: (userId, limit, offset) => `${CachePrefix.FEED}personalized:${userId || "guest"}:${limit}:${offset}`,
  videoFeed: (category, limit, offset) => `${CachePrefix.VIDEO_FEED}${category || "all"}:${limit}:${offset}`,
  neighbourhoodDetail: (neighbourhoodId) => `${CachePrefix.NEIGHBOURHOOD}detail:${neighbourhoodId}`,
  neighbourhoodList: (limit, offset) => `${CachePrefix.NEIGHBOURHOOD}list:${limit}:${offset}`,
  categories: () => CachePrefix.CATEGORIES,
  similarProperties: (propertyId) => `${CachePrefix.SIMILAR}${propertyId}`,
  boostCampaign: (campaignId) => `${CachePrefix.BOOST}campaign:${campaignId}`,
  creatorAnalytics: (creatorId, period) => `${CachePrefix.ANALYTICS}creator:${creatorId}:${period}`,
  sessionData: (sessionId) => `${CachePrefix.SESSION}${sessionId}`
};
var stdin_default = redisCache;
export {
  CachePrefix,
  CacheTTL,
  ExploreCacheKeys,
  stdin_default as default,
  redisCache
};
