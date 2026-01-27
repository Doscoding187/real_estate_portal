/**
 * Redis Cache Implementation
 * Performance optimization caching layer for real estate portal
 */

import Redis from 'ioredis';

// Cache prefixes for key naming
export enum CachePrefixes {
  PRICE_ANALYTICS = 'pa:',
  PROPERTY_DATA = 'prop:',
  USER_PREFERENCES = 'up:',
  SEARCH_RESULTS = 'search:',
  LOCATION_DATA = 'loc:',
  STATISTICS = 'stats:',
  SESSION_DATA = 'session:',
  TEMPORARY = 'temp:',
}

// Cache configuration interface
export interface CacheConfig {
  key: string;
  ttl: number; // in seconds
  description: string;
}

// Cache performance metrics
export interface CacheMetrics {
  hits: number;
  misses: number;
  connectionErrors: number;
  timeoutErrors: number;
  fallbackActivations: number;
  memoryUsage: number;
  keyCount: number;
  evictions: number;
  averageLatency: number;
}

// Cache fallback configuration
export interface CacheFallback {
  strategy: 'database' | 'compute' | 'default';
  timeout: number;
  maxRetries: number;
  logLevel: 'error' | 'warn' | 'info';
}

// Invalidation rule interface
export interface InvalidationRule {
  trigger: string;
  pattern: string;
  strategy: 'exact' | 'pattern' | 'tag';
}

/**
 * Redis Cache Manager
 * Handles Redis connection, caching operations, and fallback strategies
 */
export class RedisCacheManager {
  private redis: Redis | null = null;
  private isConnected = false;
  private fallbackMode = false;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    connectionErrors: 0,
    timeoutErrors: 0,
    fallbackActivations: 0,
    memoryUsage: 0,
    keyCount: 0,
    evictions: 0,
    averageLatency: 0,
  };

  // Cache configuration
  private cacheConfigs: CacheConfig[] = [
    // Price Analytics (Low frequency updates)
    { key: 'pa:*:avg_price', ttl: 24 * 3600, description: 'Average prices - 24 hours' },
    { key: 'pa:*:price_trend', ttl: 12 * 3600, description: 'Price trends - 12 hours' },
    { key: 'pa:*:market_stats', ttl: 6 * 3600, description: 'Market statistics - 6 hours' },
    { key: 'pa:*:growth_metrics', ttl: 6 * 3600, description: 'Growth metrics - 6 hours' },

    // Property Data (Medium frequency updates)
    { key: 'prop:featured_listings', ttl: 2 * 3600, description: 'Featured properties - 2 hours' },
    { key: 'prop:*:full_data', ttl: 1 * 3600, description: 'Property details - 1 hour' },
    { key: 'prop:search:*', ttl: 30 * 60, description: 'Search results - 30 minutes' },

    // User Preferences (High importance, lower TTL)
    { key: 'up:user:*:preferences', ttl: 7 * 24 * 3600, description: 'User preferences - 7 days' },
    { key: 'up:user:*:recommendations', ttl: 1 * 3600, description: 'Recommendations - 1 hour' },

    // Location Data (Relatively static)
    { key: 'loc:*:suburbs', ttl: 24 * 7 * 24 * 3600, description: 'Suburb data - 1 week' },
    { key: 'loc:*:cities', ttl: 24 * 7 * 24 * 3600, description: 'City data - 1 week' },

    // Session Data (Short-lived)
    { key: 'session:*', ttl: 30 * 60, description: 'User sessions - 30 minutes' },

    // Temporary Data (Very short-lived)
    { key: 'temp:*', ttl: 15 * 60, description: 'Temporary data - 15 minutes' },
  ];

  constructor() {
    try {
      this.initializeRedis();
    } catch (error) {
      console.warn('Redis initialization failed, running in fallback mode:', error);
      this.fallbackMode = true;
    }
  }

  /**
   * Initialize Redis connection
   */
  private initializeRedis(): void {
    if (!process.env.REDIS_HOST) {
      console.warn('REDIS_HOST not configured, skipping Redis initialization');
      this.fallbackMode = true;
      this.redis = null; // Explicitly set to null
      this.isConnected = false;
      return;
    }

    const config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      retryAttempts: 3,
      maxRetriesPerRequest: 3,
      enableAutoPipelining: true,
      lazyConnect: true,
      connectTimeout: 5000,
      commandTimeout: 2000,
    };

    this.redis = new Redis(config);

    // Handle connection events
    this.redis.on('connect', () => {
      console.log('Redis: Connected successfully');
      this.isConnected = true;
      this.fallbackMode = false;
    });

    this.redis.on('error', error => {
      console.error('Redis: Connection error:', error);
      this.handleRedisFailure(error);
    });

    this.redis.on('close', () => {
      console.warn('Redis: Connection closed');
      this.isConnected = false;
    });

    this.redis.on('reconnecting', (delay, retry) => {
      console.log(`Redis: Reconnecting in ${delay}ms (attempt ${retry})`);
    });

    this.redis.on('end', () => {
      console.log('Redis: Connection ended');
      this.isConnected = false;
    });
  }

  /**
   * Handle Redis failure and switch to fallback mode
   */
  private handleRedisFailure(error: Error): void {
    this.metrics.connectionErrors++;
    this.fallbackMode = true;
    this.isConnected = false;

    console.error('Redis cache unavailable, switching to fallback mode:', error.message);

    // Attempt reconnection after delay
    setTimeout(() => {
      this.checkRedisConnection();
    }, 5000);
  }

  /**
   * Check Redis connection and attempt reconnection
   */
  private async checkRedisConnection(): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.ping();
      this.isConnected = true;
      this.fallbackMode = false;
      console.log('Redis: Connection restored');
    } catch (error) {
      console.error('Redis: Reconnection failed:', error.message);
      setTimeout(() => {
        this.checkRedisConnection();
      }, 10000);
    }
  }

  /**
   * Get TTL for a specific cache key
   */
  private getTTLForKey(key: string): number {
    const config = this.cacheConfigs.find(c => this.matchesKeyPattern(key, c.key));
    return config?.ttl || 3600; // Default 1 hour
  }

  /**
   * Check if key matches pattern
   */
  private matchesKeyPattern(key: string, pattern: string): boolean {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(key);
    }
    return key === pattern;
  }

  /**
   * Get value from cache with fallback
   */
  async get<T>(key: string, fetchFn: () => Promise<T>, fallback?: CacheFallback): Promise<T> {
    const startTime = Date.now();

    try {
      // Try cache first if not in fallback mode
      if (!this.fallbackMode && this.redis && this.isConnected) {
        const cached = await this.redis.get(key);
        if (cached) {
          this.metrics.hits++;
          const latency = Date.now() - startTime;
          this.updateAverageLatency(latency);
          return JSON.parse(cached);
        }
        this.metrics.misses++;
      }

      // Cache miss or Redis unavailable, fetch from source
      const result = await this.fetchWithTimeout(fetchFn, fallback?.timeout || 5000);

      // Cache the result if Redis is available
      if (this.redis && !this.fallbackMode && this.isConnected && result) {
        const ttl = this.getTTLForKey(key);
        await this.set(key, result, ttl);
      }

      return result;
    } catch (error) {
      this.metrics.timeoutErrors++;

      // If Redis operation fails, log and use fallback
      if (error instanceof Error && error.message.includes('redis')) {
        this.handleRedisFailure(error);
      }

      // Use direct fetch as fallback
      const result = await fetchFn();

      if (this.fallbackMode) {
        this.metrics.fallbackActivations++;
      }

      return result;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (this.fallbackMode || !this.redis || !this.isConnected) {
      return; // Skip caching if Redis is unavailable
    }

    try {
      const serialized = JSON.stringify(value);
      const finalTTL = ttl || this.getTTLForKey(key);

      if (finalTTL > 0) {
        await this.redis.setex(key, finalTTL, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      console.error('Redis: Set operation failed:', error);
      this.metrics.connectionErrors++;
    }
  }

  /**
   * Delete specific keys from cache
   */
  async del(key: string | string[]): Promise<void> {
    if (this.fallbackMode || !this.redis || !this.isConnected) {
      return;
    }

    try {
      if (Array.isArray(key)) {
        await this.redis.del(...key);
      } else {
        await this.redis.del(key);
      }
    } catch (error) {
      console.error('Redis: Delete operation failed:', error);
      this.metrics.connectionErrors++;
    }
  }

  /**
   * Delete keys matching pattern
   */
  async delPattern(pattern: string): Promise<void> {
    if (this.fallbackMode || !this.redis || !this.isConnected) {
      return;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Redis: Pattern delete operation failed:', error);
      this.metrics.connectionErrors++;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    if (this.fallbackMode || !this.redis || !this.isConnected) {
      return false;
    }

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis: Exists operation failed:', error);
      this.metrics.connectionErrors++;
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheMetrics> {
    try {
      if (this.redis && this.isConnected) {
        const info = await this.redis.info('memory');
        const dbSize = await this.redis.dbSize();

        this.metrics.memoryUsage = this.parseMemoryUsage(info);
        this.metrics.keyCount = dbSize;
      }

      return { ...this.metrics };
    } catch (error) {
      console.error('Redis: Stats collection failed:', error);
      return { ...this.metrics };
    }
  }

  /**
   * Clear all cache data
   */
  async clear(): Promise<void> {
    if (this.fallbackMode || !this.redis || !this.isConnected) {
      return;
    }

    try {
      await this.redis.flushall();
    } catch (error) {
      console.error('Redis: Clear operation failed:', error);
      this.metrics.connectionErrors++;
    }
  }

  /**
   * Gracefully close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch (error) {
        console.error('Redis: Close operation failed:', error);
        await this.redis.disconnect();
      }
    }
  }

  /**
   * Update average latency metric
   */
  private updateAverageLatency(latency: number): void {
    const currentAvg = this.metrics.averageLatency;
    const totalRequests = this.metrics.hits + this.metrics.misses;
    this.metrics.averageLatency = Math.round(
      (currentAvg * (totalRequests - 1) + latency) / totalRequests,
    );
  }

  /**
   * Parse memory usage from Redis INFO command
   */
  private parseMemoryUsage(info: string): number {
    const match = info.match(/used_memory_human:(\S+)/);
    if (match) {
      const memoryStr = match[1];
      if (memoryStr.includes('M')) {
        return parseFloat(memoryStr.replace('M', '')) * 1024 * 1024;
      } else if (memoryStr.includes('G')) {
        return parseFloat(memoryStr.replace('G', '')) * 1024 * 1024 * 1024;
      }
    }
    return 0;
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout<T>(fetchFn: () => Promise<T>, timeout: number): Promise<T> {
    return await Promise.race([
      fetchFn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Cache fetch timeout')), timeout),
      ),
    ]);
  }
}

/**
 * Price Analytics Cache Service
 * Specialized cache for price analytics data
 */
export class PriceAnalyticsCache {
  private cacheManager: RedisCacheManager;

  constructor(cacheManager: RedisCacheManager) {
    this.cacheManager = cacheManager;
  }

  /**
   * Get suburb price analytics from cache
   */
  async getSuburbAnalytics(suburbId: number): Promise<any> {
    const cacheKey = `${CachePrefixes.PRICE_ANALYTICS}suburb:${suburbId}:analytics`;

    return await this.cacheManager.get(
      cacheKey,
      async () => {
        // Simulated database fetch - replace with actual database query
        console.log(`Fetching suburb analytics for ID: ${suburbId} from database`);
        return {
          suburbId,
          currentAvgPrice: Math.floor(Math.random() * 2000000) + 500000,
          currentMedianPrice: Math.floor(Math.random() * 1800000) + 400000,
          priceGrowthPercent: Math.floor(Math.random() * 20) - 5,
          totalProperties: Math.floor(Math.random() * 500) + 100,
          lastUpdated: new Date().toISOString(),
        };
      },
      {
        strategy: 'database',
        timeout: 5000,
        maxRetries: 3,
        logLevel: 'warn',
      },
    );
  }

  /**
   * Get city price analytics from cache
   */
  async getCityAnalytics(cityId: number): Promise<any> {
    const cacheKey = `${CachePrefixes.PRICE_ANALYTICS}city:${cityId}:analytics`;

    return await this.cacheManager.get(
      cacheKey,
      async () => {
        console.log(`Fetching city analytics for ID: ${cityId} from database`);
        return {
          cityId,
          currentAvgPrice: Math.floor(Math.random() * 2500000) + 800000,
          currentMedianPrice: Math.floor(Math.random() * 2200000) + 600000,
          priceGrowthPercent: Math.floor(Math.random() * 25) - 8,
          totalProperties: Math.floor(Math.random() * 2000) + 500,
          lastUpdated: new Date().toISOString(),
        };
      },
      {
        strategy: 'database',
        timeout: 5000,
        maxRetries: 3,
        logLevel: 'warn',
      },
    );
  }

  /**
   * Get province price analytics from cache
   */
  async getProvinceAnalytics(provinceId: number): Promise<any> {
    const cacheKey = `${CachePrefixes.PRICE_ANALYTICS}province:${provinceId}:analytics`;

    return await this.cacheManager.get(
      cacheKey,
      async () => {
        console.log(`Fetching province analytics for ID: ${provinceId} from database`);
        return {
          provinceId,
          currentAvgPrice: Math.floor(Math.random() * 3000000) + 1000000,
          currentMedianPrice: Math.floor(Math.random() * 2800000) + 800000,
          priceGrowthPercent: Math.floor(Math.random() * 30) - 10,
          totalProperties: Math.floor(Math.random() * 5000) + 1000,
          lastUpdated: new Date().toISOString(),
        };
      },
      {
        strategy: 'database',
        timeout: 5000,
        maxRetries: 3,
        logLevel: 'warn',
      },
    );
  }

  /**
   * Invalidate price analytics cache for location
   */
  async invalidateLocationAnalytics(locationId: number, locationType: string): Promise<void> {
    const pattern = `${CachePrefixes.PRICE_ANALYTICS}${locationType}:${locationId}:*`;
    await this.cacheManager.delPattern(pattern);
  }

  /**
   * Invalidate all price analytics cache
   */
  async invalidateAllPriceAnalytics(): Promise<void> {
    await this.cacheManager.delPattern(`${CachePrefixes.PRICE_ANALYTICS}*`);
  }
}

/**
 * Cache Invalidator Service
 * Handles automatic cache invalidation based on data changes
 */
export class CacheInvalidator {
  private cacheManager: RedisCacheManager;

  constructor(cacheManager: RedisCacheManager) {
    this.cacheManager = cacheManager;
  }

  /**
   * Invalidate cache based on trigger and context
   */
  async invalidate(trigger: string, context: any): Promise<void> {
    const rules: InvalidationRule[] = [
      // Price Analytics Invalidation
      {
        trigger: 'property_price_update',
        pattern: `${CachePrefixes.PRICE_ANALYTICS}*:avg_price`,
        strategy: 'pattern',
      },
      {
        trigger: 'property_created',
        pattern: `${CachePrefixes.PRICE_ANALYTICS}*:market_stats`,
        strategy: 'pattern',
      },
      {
        trigger: 'property_sold',
        pattern: `${CachePrefixes.PRICE_ANALYTICS}*:active_listings`,
        strategy: 'pattern',
      },

      // Property Data Invalidation
      {
        trigger: 'property_updated',
        pattern: `${CachePrefixes.PROPERTY_DATA}*:full_data`,
        strategy: 'pattern',
      },
      {
        trigger: 'property_created',
        pattern: `${CachePrefixes.PROPERTY_DATA}featured_listings`,
        strategy: 'exact',
      },

      // Search Result Invalidation
      {
        trigger: 'property_updated',
        pattern: `${CachePrefixes.PROPERTY_DATA}search:*`,
        strategy: 'pattern',
      },
    ];

    const rule = rules.find(r => r.trigger === trigger);
    if (!rule) return;

    switch (rule.strategy) {
      case 'exact':
        await this.cacheManager.del(rule.pattern);
        break;
      case 'pattern':
        await this.cacheManager.delPattern(rule.pattern);
        break;
      case 'tag':
        await this.invalidateByTag(context);
        break;
    }

    console.log(`Cache invalidated for trigger: ${trigger}`);
  }

  /**
   * Invalidate cache by tag
   */
  private async invalidateByTag(context: any): Promise<void> {
    if (context.userId) {
      await this.cacheManager.delPattern(
        `${CachePrefixes.USER_PREFERENCES}user:${context.userId}:*`,
      );
    }
  }
}

/**
 * Global cache instances
 */
let redisCacheManager: RedisCacheManager | null = null;
let priceAnalyticsCache: PriceAnalyticsCache | null = null;
let cacheInvalidator: CacheInvalidator | null = null;

/**
 * Initialize cache services
 */
export async function initializeCache(): Promise<void> {
  redisCacheManager = new RedisCacheManager();
  priceAnalyticsCache = new PriceAnalyticsCache(redisCacheManager);
  cacheInvalidator = new CacheInvalidator(redisCacheManager);

  console.log('Redis cache services initialized');
}

/**
 * Get cache instances
 */
export function getRedisCacheManager(): RedisCacheManager {
  if (!redisCacheManager) {
    throw new Error('Cache not initialized. Call initializeCache() first.');
  }
  return redisCacheManager;
}

export function getPriceAnalyticsCache(): PriceAnalyticsCache {
  if (!priceAnalyticsCache) {
    throw new Error('Cache not initialized. Call initializeCache() first.');
  }
  return priceAnalyticsCache;
}

export function getCacheInvalidator(): CacheInvalidator {
  if (!cacheInvalidator) {
    throw new Error('Cache not initialized. Call initializeCache() first.');
  }
  return cacheInvalidator;
}

/**
 * Health check endpoint data
 */
export async function getCacheHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  redis: {
    connected: boolean;
    response_time_ms: number;
    memory_usage_mb: number;
  };
  metrics: {
    hit_rate: number;
    cache_size: number;
    fallback_mode: boolean;
  };
}> {
  const manager = getRedisCacheManager();
  const stats = await manager.getStats();

  const totalRequests = stats.hits + stats.misses;
  const hitRate = totalRequests > 0 ? stats.hits / totalRequests : 0;

  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (manager['fallbackMode']) status = 'degraded';
  if (stats.connectionErrors > 10) status = 'unhealthy';

  return {
    status,
    redis: {
      connected: manager['isConnected'],
      response_time_ms: stats.averageLatency,
      memory_usage_mb: Math.round(stats.memoryUsage / (1024 * 1024)),
    },
    metrics: {
      hit_rate: Math.round(hitRate * 100),
      cache_size: stats.keyCount,
      fallback_mode: manager['fallbackMode'],
    },
  };
}

/**
 * Shutdown cache services
 */
export async function shutdownCache(): Promise<void> {
  if (redisCacheManager) {
    await redisCacheManager.close();
    console.log('Redis cache services shutdown');
  }
}
