# Redis Caching Layer Design
## Real Estate Portal Performance Optimization

**Date:** 2025-11-05  
**Version:** 1.0  
**Objective:** Design and implement Redis caching strategy for improved performance

---

## 🎯 **Architecture Overview**

### **Design Principles:**
1. **Performance First:** Reduce database load and improve response times
2. **Fail-Safe:** Graceful degradation when Redis is unavailable
3. **Automatic Invalidation:** Data consistency through smart cache invalidation
4. **Cost Efficient:** Optimal TTL strategies and memory management
5. **Monitoring Ready:** Built-in observability and performance tracking

---

## 🔧 **Connection Strategy**

### **Redis Configuration:**

#### **Development Environment:**
```yaml
# docker-compose.redis.yml (for development)
services:
  redis:
    image: redis:7-alpine
    container_name: real-estate-redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      timeout: 10s
      retries: 3
```

#### **Production Configuration:**
```typescript
// Connection strategy with failover
interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  retryDelayOnFailover: number;
  retryAttempts: number;
  maxRetriesPerRequest: number;
  enableAutoPipelining: boolean;
  lazyConnect: boolean;
}

const redisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  retryAttempts: 3,
  maxRetriesPerRequest: 3,
  enableAutoPipelining: true,
  lazyConnect: true,
};
```

### **Connection Strategy:**
- **Single Instance First:** Start with Redis single instance for simplicity
- **Cluster Migration Path:** Design for easy migration to Redis Cluster
- **Failover Handling:** Automatic retry with exponential backoff
- **Connection Pooling:** Reuse connections efficiently

---

## 🔑 **Key Naming Conventions**

### **Naming Structure:**
```
{namespace}:{resource}:{identifier}:{timestamp?}
```

### **Standard Prefixes:**
```typescript
enum CachePrefixes {
  PRICE_ANALYTICS = 'pa:',           // Price analytics data
  PROPERTY_DATA = 'prop:',           // Property information
  USER_PREFERENCES = 'up:',          // User preferences
  SEARCH_RESULTS = 'search:',        // Search query results
  LOCATION_DATA = 'loc:',            // Location-based data
  STATISTICS = 'stats:',             // Aggregated statistics
  SESSION_DATA = 'session:',         // User session data
  TEMPORARY = 'temp:'                // Temporary cached data
}
```

### **Specific Key Examples:**
```typescript
// Price analytics
'pa:suburb:123:avg_price'           // Average price for suburb 123
'pa:city:456:price_trend'           // Price trend for city 456
'pa:province:789:market_stats'      // Market statistics for province 789

// Property data
'prop:featured_listings'            // Featured properties list
'prop:search:house:johannesburg'    // Search results
'prop:123:full_data'               // Complete property data

// User preferences
'up:user:123:preferences'          // User preference profile
'up:user:123:recommendations'      // Personalized recommendations

// Session and temporary data
'session:abc123:auth'              // Authentication session
'temp:user:123:viewing_list'       // Temporary viewing list
```

---

## ⏱️ **TTL Strategy per Data Type**

### **TTL Guidelines by Data Type:**

```typescript
interface CacheConfig {
  key: string;
  ttl: number; // in seconds
  description: string;
}

const cacheConfigs: CacheConfig[] = [
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
```

### **TTL Strategy Rationale:**
1. **Price Analytics:** Longer TTLs due to lower update frequency
2. **Property Data:** Medium TTLs with periodic refresh
3. **User Preferences:** Longer TTLs with manual invalidation
4. **Search Results:** Short TTLs for freshness
5. **Session Data:** Very short TTLs for security

---

## 🔄 **Invalidation Triggers**

### **Automatic Invalidation Strategy:**

```typescript
interface InvalidationRule {
  trigger: string;           // Database event or action
  keys: string[];           // Redis keys to invalidate
  pattern: string;          // Key pattern for batch invalidation
  strategy: 'exact' | 'pattern' | 'tag';
}

const invalidationRules: InvalidationRule[] = [
  // Price Analytics Invalidation
  {
    trigger: 'property_price_update',
    pattern: 'pa:*:avg_price',
    strategy: 'pattern',
  },
  {
    trigger: 'property_created',
    keys: ['pa:*:market_stats', 'pa:*:price_trend'],
    strategy: 'pattern',
  },
  {
    trigger: 'property_sold',
    keys: ['pa:*:active_listings', 'pa:*:market_stats'],
    strategy: 'pattern',
  },
  
  // Property Data Invalidation
  {
    trigger: 'property_updated',
    keys: ['prop:*:full_data', 'prop:featured_listings'],
    strategy: 'pattern',
  },
  {
    trigger: 'property_created',
    keys: ['prop:featured_listings', 'prop:search:*'],
    strategy: 'pattern',
  },
  
  // User Data Invalidation
  {
    trigger: 'preference_updated',
    keys: ['up:user:*:preferences'],
    strategy: 'tag',
  },
  
  // Search Result Invalidation
  {
    trigger: 'property_updated',
    keys: ['prop:search:*'],
    strategy: 'pattern',
  },
];
```

### **Invalidation Implementation:**
```typescript
class CacheInvalidator {
  async invalidate(trigger: string, context: any): Promise<void> {
    const rule = invalidationRules.find(r => r.trigger === trigger);
    if (!rule) return;
    
    switch (rule.strategy) {
      case 'exact':
        await this.redis.del(...rule.keys);
        break;
      case 'pattern':
        await this.invalidatePattern(rule.pattern);
        break;
      case 'tag':
        await this.invalidateByTag(context);
        break;
    }
  }
  
  private async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

---

## 🔄 **Fallback Behavior**

### **When Redis is Unavailable:**

```typescript
interface CacheFallback {
  strategy: 'database' | 'compute' | 'default';
  timeout: number;
  maxRetries: number;
  logLevel: 'error' | 'warn' | 'info';
}

class CacheManager {
  private isRedisAvailable = true;
  private fallbackMode = false;
  
  async get<T>(key: string, fetchFn: () => Promise<T>, fallback: CacheFallback): Promise<T> {
    try {
      // Try cache first
      if (!this.fallbackMode) {
        const cached = await this.redis.get(key);
        if (cached) {
          return JSON.parse(cached);
        }
      }
      
      // Cache miss or Redis unavailable, fetch from source
      const result = await this.fetchWithTimeout(fetchFn, fallback.timeout);
      
      // Cache the result if Redis is available
      if (!this.fallbackMode && result) {
        await this.set(key, result, this.getTTLForKey(key));
      }
      
      return result;
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.message.includes('redis')) {
        this.handleRedisFailure(error);
      }
      
      // Fallback to direct database/API call
      return await fetchFn();
    }
  }
  
  private async fetchWithTimeout<T>(fetchFn: () => Promise<T>, timeout: number): Promise<T> {
    return await Promise.race([
      fetchFn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Cache fetch timeout')), timeout)
      ),
    ]);
  }
  
  private handleRedisFailure(error: Error): void {
    this.fallbackMode = true;
    this.logRedisFailure(error);
    
    // Attempt to reconnect after delay
    setTimeout(() => {
      this.checkRedisConnection();
    }, 5000);
  }
}
```

### **Graceful Degradation Strategy:**
1. **Detect Failure:** Monitor Redis connection health
2. **Switch to Fallback:** Use direct database queries
3. **Log Events:** Record failures for monitoring
4. **Auto-Recovery:** Attempt reconnection with backoff
5. **Alert System:** Notify when Redis is down for extended periods

---

## 📊 **Monitoring Approach**

### **Metrics to Track:**

```typescript
interface CacheMetrics {
  // Performance metrics
  hitRate: number;           // Cache hit percentage
  missRate: number;          // Cache miss percentage
  averageLatency: number;    // Average cache response time
  
  // Reliability metrics
  connectionErrors: number;  // Redis connection failures
  timeoutErrors: number;     // Cache operation timeouts
  fallbackActivations: number; // Number of times fallback used
  
  // Resource metrics
  memoryUsage: number;       // Redis memory consumption
  keyCount: number;          // Total cached keys
  evictions: number;         // Number of keys evicted
  
  // Business metrics
  queriesSaved: number;      // Database queries avoided
  responseTimeImprovement: number; // Performance gain
}

class CacheMonitor {
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    connectionErrors: 0,
    timeoutErrors: 0,
    fallbackActivations: 0,
    memoryUsage: 0,
    keyCount: 0,
    evictions: 0,
  };
  
  async recordHit(key: string): Promise<void> {
    this.metrics.hits++;
    this.calculateHitRate();
  }
  
  async recordMiss(key: string): Promise<void> {
    this.metrics.misses++;
    this.calculateHitRate();
  }
  
  async collectRedisInfo(): Promise<void> {
    const info = await this.redis.info();
    this.metrics.memoryUsage = this.parseMemoryUsage(info);
    this.metrics.keyCount = await this.redis.dbSize();
  }
  
  generateReport(): CacheMetrics {
    return {
      ...this.metrics,
      hitRate: this.calculateHitRate(),
      missRate: 1 - this.calculateHitRate(),
      averageLatency: this.calculateAverageLatency(),
    };
  }
}
```

### **Health Check Endpoints:**
```typescript
// GET /api/health/cache
{
  "status": "healthy" | "degraded" | "unhealthy",
  "redis": {
    "connected": boolean,
    "response_time_ms": number,
    "memory_usage_mb": number,
  },
  "metrics": {
    "hit_rate": number,
    "cache_size": number,
    "fallback_mode": boolean,
  },
  "last_updated": "2025-11-05T08:40:58Z"
}
```

### **Alerting Rules:**
- **Hit Rate < 70%:** Investigate cache efficiency
- **Memory Usage > 80%:** Consider memory expansion
- **Connection Errors > 5/min:** Redis infrastructure issue
- **Fallback Mode Active > 10min:** Critical Redis failure

---

## 🚀 **Cache Warming Strategies**

### **Proactive Cache Population:**

```typescript
class CacheWarmer {
  async warmCriticalData(): Promise<void> {
    // Warm essential data on service startup
    await Promise.all([
      this.warmPriceAnalytics(),
      this.warmFeaturedProperties(),
      this.warmPopularSearches(),
      this.warmLocationData(),
    ]);
  }
  
  private async warmPriceAnalytics(): Promise<void> {
    // Load most popular location analytics
    const popularLocations = await this.getPopularLocations(100);
    
    for (const location of popularLocations) {
      const analytics = await this.fetchPriceAnalytics(location);
      await this.setCache(`pa:${location.type}:${location.id}:*`, analytics, this.getTTLForKey('pa'));
    }
  }
  
  private async warmFeaturedProperties(): Promise<void> {
    const featured = await this.getFeaturedProperties();
    await this.setCache('prop:featured_listings', featured, 2 * 3600);
  }
  
  private async warmPopularSearches(): Promise<void> {
    const popularSearches = await this.getPopularSearches(50);
    
    for (const search of popularSearches) {
      const results = await this.performSearch(search);
      await this.setCache(`prop:search:${search.hash}`, results, 30 * 60);
    }
  }
}
```

### **Intelligent Warming:**
- **Popular Data First:** Warm most-accessed data
- **Schedule-Based:** Warm data during low-traffic periods
- **Event-Driven:** Pre-warm data when patterns are detected

---

## 🔧 **Integration with Price Analytics**

### **Cache-Enabled Price Analytics:**

```typescript
class PriceAnalyticsCache {
  async getSuburbAnalytics(suburbId: number): Promise<PriceAnalytics> {
    const cacheKey = `pa:suburb:${suburbId}:analytics`;
    
    return await this.cache.get(cacheKey, async () => {
      // Fetch from database
      const analytics = await this.db.priceAnalytics
        .where('locationId', suburbId)
        .where('locationType', 'suburb')
        .first();
      
      // Transform and enrich data if needed
      return this.enrichAnalyticsData(analytics);
    }, {
      strategy: 'database',
      timeout: 5000,
      maxRetries: 3,
      logLevel: 'warn'
    });
  }
  
  async updatePropertyPrice(propertyId: number, newPrice: number): Promise<void> {
    // Update database first
    await this.db.propertyPrices.update(propertyId, { price: newPrice });
    
    // Invalidate related cache entries
    await this.invalidateByPattern(`pa:*:analytics`);
    
    // Update price analytics for location
    await this.recalculateLocationAnalytics(propertyId);
  }
  
  private async recalculateLocationAnalytics(propertyId: number): Promise<void> {
    const property = await this.db.properties.findById(propertyId);
    if (!property) return;
    
    const analytics = await this.calculateAnalytics(property.locationId);
    const cacheKey = `pa:${property.locationType}:${property.locationId}:analytics`;
    
    await this.cache.set(cacheKey, analytics, this.getTTLForKey('pa'));
  }
}
```

---

## 📈 **Performance Considerations**

### **Optimization Strategies:**

1. **Pipeline Operations:** Use Redis pipeline for batch operations
2. **Compression:** Compress large data structures
3. **Connection Pooling:** Reuse connections efficiently
4. **Memory Management:** Implement LRU eviction policies
5. **Network Optimization:** Use persistent connections

### **Memory Sizing Guidelines:**
```yaml
# Redis memory sizing based on expected usage
memory_sizing:
  development: 512MB
  staging: 2GB
  production:
    small_scale: 4GB    # < 100k daily users
    medium_scale: 8GB   # 100k - 1M daily users
    large_scale: 16GB   # > 1M daily users
```

---

## 🎯 **Implementation Roadmap**

### **Phase 1: Core Implementation (Week 1)**
1. ✅ Redis connection setup with failover
2. ✅ Basic cache wrapper implementation
3. ✅ TTL strategy implementation
4. ✅ Price analytics cache integration
5. ✅ Basic monitoring and metrics

### **Phase 2: Advanced Features (Week 2)**
1. 🔄 Automatic invalidation triggers
2. 🔄 Advanced monitoring and alerting
3. 🔄 Cache warming strategies
4. 🔄 Performance optimization
5. 🔄 Documentation and runbooks

### **Phase 3: Production Readiness (Future)**
1. ⏳ Redis Cluster for high availability
2. ⏳ Distributed caching across multiple servers
3. ⏳ Advanced analytics and reporting
4. ⏳ Cost optimization strategies

---

## 📋 **Success Criteria**

### **Performance Targets:**
- **Cache Hit Rate:** > 80% for price analytics
- **Response Time Improvement:** > 50% faster queries
- **Database Load Reduction:** > 60% fewer direct queries
- **Redis Availability:** > 99.9% uptime

### **Reliability Targets:**
- **Graceful Degradation:** < 100ms overhead during failures
- **Automatic Recovery:** < 30 seconds to reconnect
- **Zero Data Loss:** Cache rebuilds automatically
- **Monitoring Coverage:** 100% of cache operations tracked

This architecture provides a robust, scalable caching layer that significantly improves performance while maintaining reliability and observability.