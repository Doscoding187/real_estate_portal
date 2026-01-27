/**
 * Performance Optimization Utilities
 *
 * Task 21: Add performance optimizations
 * Requirements 5.5, 24.5: Implement Redis caching and performance optimizations
 *
 * This module provides:
 * - Redis caching for API responses and database queries
 * - Request deduplication to prevent duplicate concurrent requests
 * - Cache key generators for location-related data
 * - CDN cache headers for static content
 */

import { redisCache, CacheTTL } from './redis';

// ============================================================================
// Cache Key Generators for Location System
// ============================================================================

export const LocationCacheKeys = {
  // Location statistics (5 minutes TTL)
  locationStats: (locationId: number) => `location:stats:${locationId}`,

  priceStats: (locationId: number) => `location:price:${locationId}`,

  marketActivity: (locationId: number) => `location:market:${locationId}`,

  propertyTypes: (locationId: number) => `location:types:${locationId}`,

  // Location pages (24 hours TTL for static content)
  locationPage: (slug: string) => `location:page:${slug}`,

  locationByPath: (province: string, city?: string, suburb?: string) =>
    `location:path:${province}:${city || ''}:${suburb || ''}`,

  // Trending and recommendations (30 minutes TTL)
  trendingSuburbs: (limit: number) => `location:trending:${limit}`,

  similarLocations: (locationId: number, limit: number) =>
    `location:similar:${locationId}:${limit}`,

  // Location hierarchy (1 hour TTL)
  locationHierarchy: (locationId: number) => `location:hierarchy:${locationId}`,

  locationChildren: (locationId: number) => `location:children:${locationId}`,
};

// ============================================================================
// Cache TTL Configuration for Location System
// ============================================================================

export const LocationCacheTTL = {
  STATISTICS: 300, // 5 minutes - dynamic market data
  STATIC_CONTENT: 86400, // 24 hours - static SEO content
  TRENDING: 1800, // 30 minutes - trending suburbs
  SIMILAR_LOCATIONS: 1800, // 30 minutes - similar locations
  HIERARCHY: 3600, // 1 hour - location hierarchy
  SEARCH_RESULTS: 300, // 5 minutes - search results
} as const;

// ============================================================================
// Request Deduplication
// ============================================================================

/**
 * In-flight request tracker to prevent duplicate concurrent requests
 * When multiple requests for the same data arrive simultaneously,
 * only one actual request is made and all callers receive the same result.
 */
class RequestDeduplicator {
  private inFlightRequests = new Map<string, Promise<any>>();

  /**
   * Execute a function with deduplication
   * If the same key is already being processed, return the existing promise
   *
   * @param key - Unique key for this request
   * @param fn - Function to execute
   * @returns Result of the function
   */
  async deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Check if request is already in flight
    if (this.inFlightRequests.has(key)) {
      return this.inFlightRequests.get(key) as Promise<T>;
    }

    // Start new request
    const promise = fn().finally(() => {
      // Clean up after request completes
      this.inFlightRequests.delete(key);
    });

    this.inFlightRequests.set(key, promise);
    return promise;
  }

  /**
   * Get statistics about in-flight requests
   */
  getStats() {
    return {
      inFlightCount: this.inFlightRequests.size,
      keys: Array.from(this.inFlightRequests.keys()),
    };
  }

  /**
   * Clear all in-flight requests (for testing)
   */
  clear() {
    this.inFlightRequests.clear();
  }
}

export const requestDeduplicator = new RequestDeduplicator();

// ============================================================================
// Cached Function Wrapper
// ============================================================================

/**
 * Wrap a function with Redis caching and request deduplication
 *
 * This provides a complete caching solution:
 * 1. Check Redis cache
 * 2. If miss, deduplicate concurrent requests
 * 3. Execute function once
 * 4. Cache result in Redis
 * 5. Return result to all waiting callers
 *
 * @param cacheKey - Redis cache key
 * @param ttlSeconds - Cache TTL in seconds
 * @param fn - Function to execute on cache miss
 * @returns Cached or fresh result
 */
export async function withCache<T>(
  cacheKey: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  // Try cache first
  const cached = await redisCache.get<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - deduplicate and execute
  const result = await requestDeduplicator.deduplicate(cacheKey, fn);

  // Cache the result (don't await to avoid blocking)
  redisCache.set(cacheKey, result, ttlSeconds).catch(err => {
    console.error(`Failed to cache result for ${cacheKey}:`, err);
  });

  return result;
}

/**
 * Invalidate cache for a specific key or pattern
 *
 * @param keyOrPattern - Cache key or pattern (e.g., "location:stats:*")
 */
export async function invalidateCache(keyOrPattern: string): Promise<void> {
  if (keyOrPattern.includes('*')) {
    await redisCache.delByPattern(keyOrPattern);
  } else {
    await redisCache.del(keyOrPattern);
  }
}

/**
 * Invalidate all location-related caches for a specific location
 * This should be called when a listing is created/updated/deleted
 *
 * @param locationId - Location ID
 */
export async function invalidateLocationCache(locationId: number): Promise<void> {
  await Promise.all([
    invalidateCache(LocationCacheKeys.locationStats(locationId)),
    invalidateCache(LocationCacheKeys.priceStats(locationId)),
    invalidateCache(LocationCacheKeys.marketActivity(locationId)),
    invalidateCache(LocationCacheKeys.propertyTypes(locationId)),
    invalidateCache(
      `${LocationCacheKeys.similarLocations(locationId, 0).split(':').slice(0, -1).join(':')}:*`,
    ),
  ]);
}

// ============================================================================
// CDN Cache Headers
// ============================================================================

/**
 * Cache control headers for different content types
 */
export const CacheHeaders = {
  /**
   * Static content (images, CSS, JS) - 1 year
   */
  static: {
    'Cache-Control': 'public, max-age=31536000, immutable',
    Vary: 'Accept-Encoding',
  },

  /**
   * Location pages - 5 minutes with stale-while-revalidate
   * Allows serving stale content while fetching fresh data
   */
  locationPage: {
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    Vary: 'Accept-Encoding',
  },

  /**
   * API responses - 5 minutes
   */
  api: {
    'Cache-Control': 'public, max-age=300',
    Vary: 'Accept-Encoding',
  },

  /**
   * Dynamic content - no cache
   */
  dynamic: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  },

  /**
   * Images with optimization - 1 week
   */
  images: {
    'Cache-Control': 'public, max-age=604800',
    Vary: 'Accept-Encoding, Accept',
  },
};

/**
 * Apply cache headers to Express response
 *
 * @param res - Express response object
 * @param type - Cache type
 */
export function applyCacheHeaders(res: any, type: keyof typeof CacheHeaders): void {
  const headers = CacheHeaders[type];
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
}

// ============================================================================
// Image Optimization Utilities
// ============================================================================

/**
 * Generate srcset for responsive images
 *
 * @param baseUrl - Base image URL
 * @param widths - Array of widths to generate
 * @returns srcset string
 */
export function generateSrcSet(baseUrl: string, widths: number[]): string {
  return widths.map(width => `${baseUrl}?w=${width} ${width}w`).join(', ');
}

/**
 * Generate WebP source element attributes
 *
 * @param baseUrl - Base image URL
 * @param widths - Array of widths
 * @returns Object with srcSet and type
 */
export function generateWebPSource(
  baseUrl: string,
  widths: number[],
): {
  srcSet: string;
  type: string;
} {
  return {
    srcSet: widths.map(width => `${baseUrl}?w=${width}&format=webp ${width}w`).join(', '),
    type: 'image/webp',
  };
}

/**
 * Standard responsive image widths
 */
export const RESPONSIVE_WIDTHS = [320, 640, 768, 1024, 1280, 1536, 1920];

/**
 * Image loading strategies
 */
export const ImageLoadingStrategy = {
  EAGER: 'eager', // Load immediately (above fold)
  LAZY: 'lazy', // Load when near viewport (below fold)
  AUTO: 'auto', // Browser decides
} as const;

/**
 * Get recommended loading strategy based on position
 *
 * @param position - Image position (0-based index)
 * @returns Loading strategy
 */
export function getImageLoadingStrategy(position: number): string {
  // First 2 images load eagerly (above fold)
  // Rest load lazily
  return position < 2 ? ImageLoadingStrategy.EAGER : ImageLoadingStrategy.LAZY;
}

// ============================================================================
// Performance Monitoring
// ============================================================================

/**
 * Simple performance timer
 */
export class PerformanceTimer {
  private startTime: number;
  private marks: Map<string, number> = new Map();

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Mark a point in time
   */
  mark(name: string): void {
    this.marks.set(name, Date.now() - this.startTime);
  }

  /**
   * Get duration since start or since a mark
   */
  getDuration(fromMark?: string): number {
    const now = Date.now() - this.startTime;
    if (fromMark) {
      const markTime = this.marks.get(fromMark);
      return markTime !== undefined ? now - markTime : 0;
    }
    return now;
  }

  /**
   * Get all marks
   */
  getMarks(): Record<string, number> {
    return Object.fromEntries(this.marks);
  }

  /**
   * Log performance summary
   */
  log(label: string): void {
    const total = this.getDuration();
    const marks = this.getMarks();
    console.log(`[Performance] ${label}: ${total}ms`, marks);
  }
}

/**
 * Measure async function execution time
 *
 * @param label - Label for logging
 * @param fn - Function to measure
 * @returns Function result
 */
export async function measurePerformance<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const timer = new PerformanceTimer();
  try {
    const result = await fn();
    timer.log(label);
    return result;
  } catch (error) {
    timer.log(`${label} (error)`);
    throw error;
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  LocationCacheKeys,
  LocationCacheTTL,
  requestDeduplicator,
  withCache,
  invalidateCache,
  invalidateLocationCache,
  CacheHeaders,
  applyCacheHeaders,
  generateSrcSet,
  generateWebPSource,
  RESPONSIVE_WIDTHS,
  ImageLoadingStrategy,
  getImageLoadingStrategy,
  PerformanceTimer,
  measurePerformance,
};
