# Redis Cache Integration Examples
## Price Analytics Cache Integration

This document shows how to integrate the Redis caching layer with price analytics endpoints.

---

## 📁 **Integration Pattern**

### **Basic Cache Integration Pattern:**

```typescript
import { getPriceAnalyticsCache, getCacheInvalidator } from './server/_core/cache/redis';

export async function getSuburbAnalytics(suburbId: number) {
  // Use cache first, fallback to database
  const cache = getPriceAnalyticsCache();
  return await cache.getSuburbAnalytics(suburbId);
}

export async function updatePropertyPrice(propertyId: number, newPrice: number) {
  // Update database
  await updatePropertyInDatabase(propertyId, newPrice);
  
  // Invalidate relevant cache entries
  const invalidator = getCacheInvalidator();
  await invalidator.invalidate('property_price_update', { propertyId });
}
```

---

## 🔌 **tRPC Router Integration Example**

### **Price Analytics Router with Cache:**

```typescript
import { z } from 'zod';
import { getPriceAnalyticsCache, getCacheInvalidator } from '../_core/cache/redis';

export const priceAnalyticsRouter = createTRPCRouter({
  // Get suburb price analytics (cached)
  getSuburbAnalytics: publicProcedure
    .input(z.object({
      suburbId: z.number(),
    }))
    .query(async ({ input }) => {
      const cache = getPriceAnalyticsCache();
      return await cache.getSuburbAnalytics(input.suburbId);
    }),

  // Get city price analytics (cached)
  getCityAnalytics: publicProcedure
    .input(z.object({
      cityId: z.number(),
    }))
    .query(async ({ input }) => {
      const cache = getPriceAnalyticsCache();
      return await cache.getCityAnalytics(input.cityId);
    }),

  // Get province price analytics (cached)
  getProvinceAnalytics: publicProcedure
    .input(z.object({
      provinceId: z.number(),
    }))
    .query(async ({ input }) => {
      const cache = getPriceAnalyticsCache();
      return await cache.getProvinceAnalytics(input.provinceId);
    }),

  // Batch get multiple location analytics
  getBatchAnalytics: publicProcedure
    .input(z.object({
      locations: z.array(z.object({
        id: z.number(),
        type: z.enum(['suburb', 'city', 'province']),
      })),
    }))
    .query(async ({ input }) => {
      const cache = getPriceAnalyticsCache();
      const results = await Promise.all(
        input.locations.map(async (location) => {
          switch (location.type) {
            case 'suburb':
              return { ...location, data: await cache.getSuburbAnalytics(location.id) };
            case 'city':
              return { ...location, data: await cache.getCityAnalytics(location.id) };
            case 'province':
              return { ...location, data: await cache.getProvinceAnalytics(location.id) };
            default:
              return { ...location, data: null };
          }
        })
      );
      return results;
    }),

  // Update property price (with cache invalidation)
  updatePropertyPrice: agentProcedure
    .input(z.object({
      propertyId: z.number(),
      newPrice: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check permissions
      if (ctx.user.role !== 'agent' && ctx.user.role !== 'agency_admin') {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      // Update in database
      await updatePropertyInDatabase(input.propertyId, input.newPrice, ctx.user.id);

      // Invalidate cache
      const invalidator = getCacheInvalidator();
      await invalidator.invalidate('property_price_update', { 
        propertyId: input.propertyId,
        agentId: ctx.user.id 
      });

      return { success: true };
    }),

  // Get cache statistics (for monitoring)
  getCacheStats: adminProcedure
    .query(async () => {
      const { getCacheHealth } = await import('../_core/cache/redis');
      return await getCacheHealth();
    }),

  // Clear cache (admin only)
  clearCache: adminProcedure
    .mutation(async () => {
      const { getRedisCacheManager } = await import('../_core/cache/redis');
      const cacheManager = getRedisCacheManager();
      await cacheManager.clear();
      return { success: true };
    }),
});
```

---

## 📊 **Database Service Integration**

### **Enhanced Price Analytics Service with Cache:**

```typescript
// services/priceAnalytics.ts
import { getDb } from '../server/_core/db';
import { getPriceAnalyticsCache, getCacheInvalidator } from '../server/_core/cache/redis';

export class PriceAnalyticsService {
  /**
   * Get price analytics with automatic caching
   */
  static async getSuburbAnalytics(suburbId: number) {
    const cache = getPriceAnalyticsCache();
    return await cache.getSuburbAnalytics(suburbId);
  }

  /**
   * Calculate and update price analytics
   */
  static async recalculateAnalytics(locationId: number, locationType: 'suburb' | 'city' | 'province') {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Fetch properties for location
    const properties = await db
      .select()
      .from(drizzle.schema.properties)
      .where(drizzle.schema.sql`
        ${locationType === 'suburb' ? drizzle.schema.properties.suburbId : 
          locationType === 'city' ? drizzle.schema.properties.cityId :
          drizzle.schema.properties.provinceId} = ${locationId}
      `);

    // Calculate analytics
    const analytics = this.calculateAnalytics(properties, locationId, locationType);

    // Update database
    await db
      .insert(drizzle.schema.priceAnalytics)
      .values({
        locationId,
        locationType,
        currentAvgPrice: analytics.avgPrice,
        currentMedianPrice: analytics.medianPrice,
        currentMinPrice: analytics.minPrice,
        currentMaxPrice: analytics.maxPrice,
        totalProperties: properties.length,
        lastUpdated: new Date(),
      })
      .onDuplicateKeyUpdate({
        currentAvgPrice: analytics.avgPrice,
        currentMedianPrice: analytics.medianPrice,
        totalProperties: properties.length,
        lastUpdated: new Date(),
      });

    return analytics;
  }

  /**
   * Handle property update with cache invalidation
   */
  static async handlePropertyUpdate(propertyId: number, changes: any) {
    const db = await getDb();
    
    // Update property in database
    await db
      .update(drizzle.schema.properties)
      .set(changes)
      .where(eq(drizzle.schema.properties.id, propertyId));

    // Get property details for cache invalidation
    const property = await db
      .select()
      .from(drizzle.schema.properties)
      .where(eq(drizzle.schema.properties.id, propertyId))
      .limit(1);

    if (property[0]) {
      // Invalidate related cache entries
      const invalidator = getCacheInvalidator();
      
      // Invalidate location analytics
      if (property[0].suburbId) {
        await invalidator.invalidate('property_updated', {
          type: 'suburb',
          id: property[0].suburbId
        });
      }
      if (property[0].cityId) {
        await invalidator.invalidate('property_updated', {
          type: 'city',
          id: property[0].cityId
        });
      }
      if (property[0].provinceId) {
        await invalidator.invalidate('property_updated', {
          type: 'province',
          id: property[0].provinceId
        });
      }

      // Invalidate search results
      await invalidator.invalidate('property_updated', {
        type: 'search'
      });
    }

    return { success: true };
  }

  /**
   * Calculate analytics from property data
   */
  private static calculateAnalytics(properties: any[], locationId: number, locationType: string) {
    if (properties.length === 0) {
      return {
        avgPrice: 0,
        medianPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        totalProperties: 0
      };
    }

    const prices = properties.map(p => p.price).filter(p => p > 0).sort((a, b) => a - b);
    const totalProperties = properties.length;
    
    return {
      avgPrice: Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length),
      medianPrice: prices.length % 2 === 0 
        ? Math.round((prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2)
        : prices[Math.floor(prices.length / 2)],
      minPrice: prices[0],
      maxPrice: prices[prices.length - 1],
      totalProperties
    };
  }
}
```

---

## 🔄 **Background Jobs Integration**

### **Cache Warming Service:**

```typescript
// services/cacheWarming.ts
import { getPriceAnalyticsCache } from '../server/_core/cache/redis';

export class CacheWarmingService {
  /**
   * Warm popular location analytics on startup
   */
  static async warmPopularLocations() {
    const cache = getPriceAnalyticsCache();
    
    try {
      // Get popular suburbs
      const popularSuburbs = await this.getPopularLocations('suburb', 50);
      await Promise.all(
        popularSuburbs.map(suburb => 
          cache.getSuburbAnalytics(suburb.id).catch(err => 
            console.warn(`Failed to warm suburb ${suburb.id}:`, err)
          )
        )
      );

      // Get popular cities
      const popularCities = await this.getPopularLocations('city', 20);
      await Promise.all(
        popularCities.map(city => 
          cache.getCityAnalytics(city.id).catch(err => 
            console.warn(`Failed to warm city ${city.id}:`, err)
          )
        )
      );

      console.log('Cache warming completed');
    } catch (error) {
      console.error('Cache warming failed:', error);
    }
  }

  /**
   * Schedule periodic cache warming
   */
  static scheduleWarming() {
    // Warm cache every 6 hours
    setInterval(() => {
      this.warmPopularLocations();
    }, 6 * 60 * 60 * 1000);

    // Initial warm on startup
    setTimeout(() => {
      this.warmPopularLocations();
    }, 10000); // Wait 10 seconds after startup
  }

  private static async getPopularLocations(type: string, limit: number) {
    // Mock implementation - replace with actual database query
    return Array.from({ length: limit }, (_, i) => ({
      id: i + 1,
      type,
      popularity: Math.random()
    }));
  }
}
```

---

## 🔍 **Error Handling & Monitoring**

### **Cache Health Monitoring:**

```typescript
// monitoring/cacheHealth.ts
import { getCacheHealth } from '../server/_core/cache/redis';

export class CacheHealthMonitor {
  /**
   * Monitor cache health and log warnings
   */
  static startMonitoring() {
    // Check cache health every minute
    setInterval(async () => {
      const health = await getCacheHealth();
      
      // Log health status
      if (health.status === 'unhealthy') {
        console.error('Cache is unhealthy:', health);
        await this.alertCacheFailure(health);
      } else if (health.status === 'degraded') {
        console.warn('Cache is degraded:', health);
      }

      // Check hit rate
      if (health.metrics.hit_rate < 70) {
        console.warn(`Low cache hit rate: ${health.metrics.hit_rate}%`);
      }

      // Check memory usage
      if (health.redis.memory_usage_mb > 1000) {
        console.warn(`High cache memory usage: ${health.redis.memory_usage_mb}MB`);
      }
    }, 60 * 1000); // Every minute
  }

  private static async alertCacheFailure(health: any) {
    // In production, send alerts to monitoring system
    console.error('ALERT: Cache system failure detected');
    
    // Example: Send to monitoring service
    // await monitoringService.sendAlert('cache_failure', health);
  }
}
```

---

## 📋 **Integration Checklist**

### **✅ Before Production:**

- [ ] Install Redis dependencies: `npm install ioredis @types/ioredis`
- [ ] Configure Redis environment variables
- [ ] Initialize cache on server startup
- [ ] Update all price analytics endpoints to use cache
- [ ] Test cache invalidation triggers
- [ ] Set up cache monitoring
- [ ] Test fallback behavior when Redis is down
- [ ] Warm critical data on startup
- [ ] Set up alerts for cache health issues

### **✅ Testing Checklist:**

- [ ] Test cache hit rates (target > 80%)
- [ ] Test cache invalidation (all triggers work)
- [ ] Test fallback mode (no service interruption)
- [ ] Test performance improvement (target > 50% faster)
- [ ] Test Redis connection recovery
- [ ] Test memory usage and eviction policies

---

## 🚀 **Deployment Steps**

1. **Install Dependencies:**
   ```bash
   npm install ioredis @types/ioredis
   ```

2. **Configure Redis:**
   ```bash
   # Start Redis locally
   docker run -d --name redis -p 6379:6379 redis:7-alpine
   
   # Or configure cloud Redis (Redis Cloud, AWS ElastiCache, etc.)
   ```

3. **Environment Variables:**
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=your_password
   REDIS_DB=0
   ```

4. **Initialize in Main Server:**
   ```typescript
   import { initializeCache } from './server/_core/cache/redis';
   
   // On server startup
   await initializeCache();
   ```

5. **Update Endpoints:**
   - Replace database calls with cache-enabled versions
   - Add cache invalidation to data update endpoints
   - Set up monitoring and health checks

The integration ensures seamless caching with automatic fallback and comprehensive monitoring.