/**
 * Redis Cache Service for Explore Discovery Engine
 * 
 * Provides distributed caching with automatic fallback to in-memory cache
 * when Redis is unavailable (development/testing).
 * 
 * TTL Configuration (per design spec):
 * - User preferences: 1 hour (3600s)
 * - Feed results: 5 minutes (300s)
 * - Neighbourhood data: 1 day (86400s)
 * - Video metadata: 1 hour (3600s)
 */

import { createClient, RedisClientType } from 'redis';

// Cache TTL constants (in seconds) - from design spec
export const CacheTTL = {
  USER_PREFERENCES: 3600,      // 1 hour
  FEED_RESULTS: 300,           // 5 minutes
  NEIGHBOURHOOD_DATA: 86400,   // 1 day
  VIDEO_METADATA: 3600,        // 1 hour
  PERFORMANCE_SCORE: 900,      // 15 minutes
  CATEGORIES: 86400,           // 1 day
  SIMILAR_PROPERTIES: 1800,    // 30 minutes
  BOOST_CAMPAIGNS: 300,        // 5 minutes
  ANALYTICS: 600,              // 10 minutes
} as const;

// Cache key prefixes for organization
export const CachePrefix = {
  USER_PREFS: 'explore:user:prefs:',
  FEED: 'explore:feed:',
  VIDEO_FEED: 'explore:video:feed:',
  NEIGHBOURHOOD: 'explore:neighbourhood:',
  CATEGORIES: 'explore:categories',
  SIMILAR: 'explore:similar:',
  BOOST: 'explore:boost:',
  ANALYTICS: 'explore:analytics:',
  SESSION: 'explore:session:',
} as const;

class RedisCache {
  private client: RedisClientType | null = null;
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;
  private fallbackCache: Map<string, { value: string; expiresAt: number }> = new Map();

  constructor() {
    this.initializeConnection();
  }

  private async initializeConnection(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      console.log('[Redis] No REDIS_URL configured, using in-memory fallback');
      return;
    }

    try {
      this.client = createClient({ url: redisUrl });
      
      this.client.on('error', (err) => {
        console.error('[Redis] Connection error:', err.message);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('[Redis] Connected successfully');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        console.log('[Redis] Reconnecting...');
      });

      this.connectionPromise = this.client.connect();
      await this.connectionPromise;
    } catch (error) {
      console.error('[Redis] Failed to connect:', error);
      this.client = null;
      this.isConnected = false;
    }
  }


  private async ensureConnected(): Promise<boolean> {
    if (this.connectionPromise) {
      try {
        await this.connectionPromise;
      } catch {
        // Connection failed, use fallback
      }
    }
    return this.isConnected && this.client !== null;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (await this.ensureConnected() && this.client) {
        const value = await this.client.get(key);
        if (value) {
          return JSON.parse(value) as T;
        }
        return null;
      }
      
      // Fallback to in-memory
      return this.getFallback<T>(key);
    } catch (error) {
      console.error('[Redis] Get error:', error);
      return this.getFallback<T>(key);
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(key: string, value: T, ttlSeconds: number = CacheTTL.FEED_RESULTS): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      
      if (await this.ensureConnected() && this.client) {
        await this.client.setEx(key, ttlSeconds, serialized);
        return;
      }
      
      // Fallback to in-memory
      this.setFallback(key, serialized, ttlSeconds);
    } catch (error) {
      console.error('[Redis] Set error:', error);
      this.setFallback(key, JSON.stringify(value), ttlSeconds);
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    try {
      if (await this.ensureConnected() && this.client) {
        await this.client.del(key);
      }
      this.fallbackCache.delete(key);
    } catch (error) {
      console.error('[Redis] Delete error:', error);
      this.fallbackCache.delete(key);
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async delByPattern(pattern: string): Promise<void> {
    try {
      if (await this.ensureConnected() && this.client) {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(keys);
        }
      }
      
      // Also clear from fallback
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      for (const key of this.fallbackCache.keys()) {
        if (regex.test(key)) {
          this.fallbackCache.delete(key);
        }
      }
    } catch (error) {
      console.error('[Redis] Delete by pattern error:', error);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (await this.ensureConnected() && this.client) {
        return (await this.client.exists(key)) === 1;
      }
      return this.fallbackCache.has(key);
    } catch (error) {
      return this.fallbackCache.has(key);
    }
  }

  /**
   * Get remaining TTL for a key
   */
  async ttl(key: string): Promise<number> {
    try {
      if (await this.ensureConnected() && this.client) {
        return await this.client.ttl(key);
      }
      
      const entry = this.fallbackCache.get(key);
      if (entry) {
        return Math.max(0, Math.floor((entry.expiresAt - Date.now()) / 1000));
      }
      return -2; // Key doesn't exist
    } catch (error) {
      return -1;
    }
  }

  // Fallback methods for when Redis is unavailable
  private getFallback<T>(key: string): T | null {
    const entry = this.fallbackCache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.fallbackCache.delete(key);
      return null;
    }
    
    return JSON.parse(entry.value) as T;
  }

  private setFallback(key: string, value: string, ttlSeconds: number): void {
    this.fallbackCache.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds * 1000),
    });
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ connected: boolean; keys: number; memory?: string }> {
    try {
      if (await this.ensureConnected() && this.client) {
        const info = await this.client.info('memory');
        const dbSize = await this.client.dbSize();
        const memMatch = info.match(/used_memory_human:(\S+)/);
        return {
          connected: true,
          keys: dbSize,
          memory: memMatch ? memMatch[1] : 'unknown',
        };
      }
    } catch (error) {
      // Fall through to fallback stats
    }
    
    return {
      connected: false,
      keys: this.fallbackCache.size,
    };
  }

  /**
   * Graceful shutdown
   */
  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}

// Export singleton instance
export const redisCache = new RedisCache();

// Cache key generators for Explore Discovery Engine
export const ExploreCacheKeys = {
  userPreferences: (userId: number) => 
    `${CachePrefix.USER_PREFS}${userId}`,
  
  personalizedFeed: (userId: number | undefined, limit: number, offset: number) =>
    `${CachePrefix.FEED}personalized:${userId || 'guest'}:${limit}:${offset}`,
  
  videoFeed: (category: string | undefined, limit: number, offset: number) =>
    `${CachePrefix.VIDEO_FEED}${category || 'all'}:${limit}:${offset}`,
  
  neighbourhoodDetail: (neighbourhoodId: number) =>
    `${CachePrefix.NEIGHBOURHOOD}detail:${neighbourhoodId}`,
  
  neighbourhoodList: (limit: number, offset: number) =>
    `${CachePrefix.NEIGHBOURHOOD}list:${limit}:${offset}`,
  
  categories: () => CachePrefix.CATEGORIES,
  
  similarProperties: (propertyId: number) =>
    `${CachePrefix.SIMILAR}${propertyId}`,
  
  boostCampaign: (campaignId: number) =>
    `${CachePrefix.BOOST}campaign:${campaignId}`,
  
  creatorAnalytics: (creatorId: number, period: string) =>
    `${CachePrefix.ANALYTICS}creator:${creatorId}:${period}`,
  
  sessionData: (sessionId: string) =>
    `${CachePrefix.SESSION}${sessionId}`,
};

export default redisCache;
