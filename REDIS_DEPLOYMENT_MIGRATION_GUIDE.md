# Redis and Cache Implementation Note

> **Current code reference — not a deployment runbook.** This file replaces a
> historical Redis setup guide whose environment, deployment, rollback and
> database instructions were not independently verified.

The independently verified implementation is:

- `server/lib/redis.ts` owns the `redisCache` singleton, `CacheTTL` values and
  Explore cache-key builders. It reads `REDIS_URL` at runtime and falls back to
  an in-memory cache when Redis is absent or unavailable.
- `server/lib/cache.ts` provides a separate in-memory TTL cache. The current
  discovery cache adapter at
  `server/domains/discovery/caching/discoveryCache.ts` uses that adapter, so
  Redis and discovery-cache authority are not assumed to be interchangeable.
- `server/lib/performanceOptimization.ts` provides cache wrapping,
  invalidation, cache headers and image URL helpers. These are code surfaces,
  not proof of a production performance result.
- `server/routes/cacheMonitoring.ts` exposes cache statistics and clearing
  routes, but its source still contains a TODO for admin authentication on
  clearing routes. It is not an approved operational control surface.

No Redis credentials, environment values, deployment commands, manual SQL,
feature-specific migrations, seeds, repairs or rollback commands belong here.
Database changes follow the [Database Authority entry contract](docs/database-authority/00-database-authority-agent-entry.md),
[Database Change Protocol](docs/database-authority/database-change-protocol.md),
and [canonical migration README](server/migrations/README.md). Any future
Redis deployment procedure must be rebuilt from the validated deployment
authority and current runtime configuration.
