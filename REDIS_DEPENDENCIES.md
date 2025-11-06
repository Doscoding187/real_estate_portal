# Redis Dependencies Setup

## Required npm packages

To use the Redis caching layer, install these dependencies:

```bash
npm install ioredis @types/ioredis
```

## Development Setup

1. **Install dependencies:**
   ```bash
   npm install ioredis @types/ioredis
   ```

2. **Environment variables:**
   Add to your `.env` file:
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=
   REDIS_DB=0
   ```

3. **Docker Redis (optional):**
   ```bash
   docker run -d --name redis -p 6379:6379 redis:7-alpine
   ```

## Integration Steps

1. **Import the cache services:**
   ```typescript
   import { initializeCache, getPriceAnalyticsCache } from './server/_core/cache/redis';
   ```

2. **Initialize on server startup:**
   ```typescript
   // In your main server file
   await initializeCache();
   ```

3. **Use in price analytics:**
   ```typescript
   const analytics = await getPriceAnalyticsCache().getSuburbAnalytics(123);
   ```

## Fallback Mode

The cache automatically falls back to direct database queries if Redis is unavailable, ensuring no service interruption.