# Redis Deployment Migration Guide
## Step-by-step deployment and migration instructions

**Date:** 2025-11-05  
**Version:** 1.0  
**Objective:** Guide for deploying Redis caching layer to production

---

## 🚀 **Pre-Deployment Checklist**

### **System Requirements:**
- [ ] Node.js 16+ with npm
- [ ] Redis server 6.0+ (local or cloud)
- [ ] Sufficient memory (recommended: 2GB+ for production)
- [ ] Network access to Redis from application servers

### **Application Dependencies:**
- [ ] Install ioredis: `npm install ioredis @types/ioredis`
- [ ] Environment variables configured
- [ ] Database schema updated (user_preferences table ready)

---

## 📋 **Phase 1: Redis Setup**

### **Option A: Local Redis (Development/Testing)**

#### **Docker Setup:**
```bash
# Start Redis container
docker run -d \
  --name real-estate-redis \
  -p 6379:6379 \
  --memory 2g \
  --memory-swap 2g \
  redis:7-alpine \
  --appendonly yes \
  --maxmemory 2gb \
  --maxmemory-policy allkeys-lru

# Verify Redis is running
docker exec real-estate-redis redis-cli ping
```

#### **Manual Installation (Linux/Ubuntu):**
```bash
# Install Redis
sudo apt update
sudo apt install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: maxmemory 2gb
# Set: maxmemory-policy allkeys-lru
# Set: appendonly yes

# Start and enable Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test Redis
redis-cli ping
```

### **Option B: Cloud Redis (Recommended for Production)**

#### **Redis Cloud Setup:**
1. **Create Account:** https://redislabs.com/try-free/
2. **Create Database:** 2GB memory, 1 replica
3. **Configure Security:** Enable AUTH, set strong password
4. **Get Connection String:** Copy connection details

#### **AWS ElastiCache Setup:**
```bash
# AWS CLI commands (requires AWS CLI setup)
aws elasticache create-cache-cluster \
  --cache-cluster-id real-estate-cluster \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1 \
  --cache-subnet-group-name default
```

---

## ⚙️ **Phase 2: Environment Configuration**

### **Environment Variables:**
Add to your `.env` file or environment configuration:

```env
# Redis Configuration
REDIS_HOST=localhost                    # or your-cloud-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_password
REDIS_DB=0

# Cache Configuration
CACHE_ENABLED=true
CACHE_WARMING_ENABLED=true
CACHE_MONITORING_ENABLED=true
```

### **Production Environment Variables:**
```env
# Production Redis (Cloud)
REDIS_HOST=prod-redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=super_secure_prod_password
REDIS_DB=0

# Enhanced Configuration
CACHE_ENABLED=true
CACHE_WARMING_ENABLED=true
CACHE_MONITORING_ENABLED=true
CACHE_LOG_LEVEL=info
CACHE_MAX_MEMORY=2gb
```

---

## 🔄 **Phase 3: Application Integration**

### **Step 1: Install Dependencies**
```bash
# Install Redis client and types
npm install ioredis @types/ioredis

# Verify installation
npm list ioredis
```

### **Step 2: Initialize Cache on Server Startup**

#### **Main Server File (server/index.ts or server.ts):**
```typescript
import { initializeCache } from './server/_core/cache/redis';

async function startServer() {
  try {
    // Initialize Redis cache
    await initializeCache();
    console.log('✅ Redis cache initialized successfully');

    // Start your server
    const server = createServer(app);
    server.listen(process.env.PORT || 3000, () => {
      console.log(`🚀 Server running on port ${process.env.PORT || 3000}`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
```

### **Step 3: Graceful Shutdown**
```typescript
import { shutdownCache } from './server/_core/cache/redis';

process.on('SIGTERM', async () => {
  console.log('📴 Received SIGTERM, shutting down gracefully...');
  await shutdownCache();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📴 Received SIGINT, shutting down gracefully...');
  await shutdownCache();
  process.exit(0);
});
```

---

## 📊 **Phase 4: Price Analytics Integration**

### **Step 1: Update Existing Endpoints**

#### **Before (Direct Database Query):**
```typescript
// Old implementation
export async function getSuburbAnalytics(suburbId: number) {
  const db = await getDb();
  const analytics = await db
    .select()
    .from(priceAnalytics)
    .where(eq(priceAnalytics.suburbId, suburbId))
    .limit(1);
  return analytics[0];
}
```

#### **After (Cached Implementation):**
```typescript
// New cached implementation
export async function getSuburbAnalytics(suburbId: number) {
  const cache = getPriceAnalyticsCache();
  return await cache.getSuburbAnalytics(suburbId);
}
```

### **Step 2: Add Cache Invalidation to Updates**

#### **Property Update Endpoint:**
```typescript
export async function updatePropertyPrice(propertyId: number, newPrice: number) {
  // Update database first
  await updatePropertyInDatabase(propertyId, newPrice);
  
  // Invalidate cache
  const invalidator = getCacheInvalidator();
  await invalidator.invalidate('property_price_update', { propertyId });
  
  return { success: true };
}
```

---

## 🧪 **Phase 5: Testing & Validation**

### **Step 1: Unit Tests**
```typescript
// tests/cache/redis.test.ts
import { initializeCache, getPriceAnalyticsCache } from '../../server/_core/cache/redis';

describe('Redis Cache', () => {
  beforeAll(async () => {
    await initializeCache();
  });

  it('should cache and retrieve suburb analytics', async () => {
    const cache = getPriceAnalyticsCache();
    const result = await cache.getSuburbAnalytics(123);
    
    expect(result).toBeDefined();
    expect(result.suburbId).toBe(123);
  });

  it('should handle Redis unavailability gracefully', async () => {
    // Test fallback behavior
    const cache = getPriceAnalyticsCache();
    const result = await cache.getSuburbAnalytics(999);
    
    expect(result).toBeDefined();
  });
});
```

### **Step 2: Integration Tests**
```typescript
// tests/integration/cache-integration.test.ts
describe('Cache Integration', () => {
  it('should improve performance with caching', async () => {
    const startTime = Date.now();
    
    // First request (cache miss)
    const result1 = await getSuburbAnalytics(456);
    const firstRequestTime = Date.now() - startTime;
    
    const startTime2 = Date.now();
    
    // Second request (cache hit)
    const result2 = await getSuburbAnalytics(456);
    const secondRequestTime = Date.now() - startTime2;
    
    expect(secondRequestTime).toBeLessThan(firstRequestTime * 0.5);
  });
});
```

### **Step 3: Performance Testing**
```bash
# Load test with cache
ab -n 1000 -c 10 http://localhost:3000/api/analytics/suburb/123

# Expected results:
# - First requests: ~200-500ms (cache miss)
# - Subsequent requests: ~10-50ms (cache hit)
# - Cache hit rate: > 80%
```

---

## 📈 **Phase 6: Monitoring Setup**

### **Health Check Endpoint:**
```typescript
// routes/health.ts
import { getCacheHealth } from '../server/_core/cache/redis';

router.get('/cache', async (req, res) => {
  try {
    const health = await getCacheHealth();
    res.json({
      status: 'healthy',
      cache: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

### **Monitoring Dashboard Integration:**
```typescript
// monitoring/metrics.ts
import { getRedisCacheManager } from '../server/_core/cache/redis';

export async function collectCacheMetrics() {
  const manager = getRedisCacheManager();
  const stats = await manager.getStats();
  
  return {
    cache_hit_rate: (stats.hits / (stats.hits + stats.misses)) * 100,
    memory_usage_mb: Math.round(stats.memoryUsage / (1024 * 1024)),
    total_keys: stats.keyCount,
    connection_errors: stats.connectionErrors,
    average_latency_ms: stats.averageLatency
  };
}
```

---

## 🚨 **Phase 7: Rollback Plan**

### **Quick Rollback (if issues):**

#### **1. Disable Cache (Immediate):**
```typescript
// Emergency: Disable cache temporarily
const CACHE_ENABLED = process.env.CACHE_ENABLED === 'true'; // Set to false

class RedisCacheManager {
  constructor() {
    if (!CACHE_ENABLED) {
      this.fallbackMode = true; // Force fallback mode
    }
    // ... rest of constructor
  }
}
```

#### **2. Environment Variable Rollback:**
```bash
# Set in production environment
export CACHE_ENABLED=false
export CACHE_WARMING_ENABLED=false

# Restart application
pm2 restart all
```

#### **3. Database Rollback:**
```sql
-- If needed, clear all cache-related data
TRUNCATE TABLE user_preferences;
```

### **Full Rollback Steps:**
1. **Set environment variable:** `CACHE_ENABLED=false`
2. **Restart application:** `pm2 restart all`
3. **Monitor application:** Ensure no cache-related errors
4. **Verify performance:** May be slower but should work
5. **Investigate issues:** Review logs and metrics
6. **Fix and re-enable:** Once issues resolved

---

## 📋 **Deployment Checklist**

### **Pre-Deployment:**
- [ ] Redis server installed and configured
- [ ] Dependencies installed: `npm install ioredis @types/ioredis`
- [ ] Environment variables configured
- [ ] Database schema updated
- [ ] Integration tests passing
- [ ] Performance baseline established

### **Deployment:**
- [ ] Deploy application code
- [ ] Start Redis server
- [ ] Initialize cache on startup
- [ ] Verify Redis connection
- [ ] Test basic cache operations
- [ ] Monitor initial cache performance

### **Post-Deployment:**
- [ ] Monitor cache hit rates (target > 80%)
- [ ] Monitor memory usage (target < 80% of allocated)
- [ ] Monitor response times (target > 50% improvement)
- [ ] Set up alerts for cache health issues
- [ ] Schedule cache warming jobs
- [ ] Document any issues encountered

---

## 🎯 **Success Metrics**

### **Performance Targets:**
- **Cache Hit Rate:** > 80% within first week
- **Response Time Improvement:** > 50% for cached endpoints
- **Database Load Reduction:** > 60% fewer queries
- **Memory Usage:** < 80% of allocated Redis memory

### **Reliability Targets:**
- **Cache Availability:** > 99.9% uptime
- **Graceful Degradation:** < 100ms overhead during failures
- **Auto-Recovery:** < 30 seconds to reconnect after Redis restart
- **Zero Data Loss:** Cache rebuilds automatically

### **Monitoring Alerts:**
- Hit rate drops below 70%
- Memory usage exceeds 90%
- Connection errors exceed 5/minute
- Cache unavailable for more than 2 minutes

---

## 🔧 **Troubleshooting Common Issues**

### **Redis Connection Issues:**
```bash
# Check Redis status
docker exec real-estate-redis redis-cli ping
# Should return: PONG

# Check Redis logs
docker logs real-estate-redis

# Test connection from application
redis-cli -h localhost -p 6379 ping
```

### **Memory Issues:**
```bash
# Monitor Redis memory usage
docker exec real-estate-redis redis-cli info memory

# Clear cache if needed
docker exec real-estate-redis redis-cli FLUSHALL

# Check memory policy
docker exec real-estate-redis redis-cli config get maxmemory-policy
```

### **Performance Issues:**
```bash
# Monitor cache hit rate
# Check application logs for cache statistics

# Clear problematic cache entries
# Use cache invalidation patterns
```

This migration guide ensures a smooth deployment with proper rollback procedures and monitoring.