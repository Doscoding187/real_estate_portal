# Explore Performance — Current Code Inventory

> **Code inventory, not a completion claim.** Historical benchmark numbers,
> production-readiness statements and feature-specific migration instructions
> were not independently verified and are intentionally removed.

Verified implementation surfaces:

- `server/lib/redis.ts` contains Redis-backed cache access with TTLs and an
  in-memory fallback.
- `server/domains/discovery/caching/discoveryCache.ts` uses the separate
  `server/lib/cache.ts` adapter for discovery feed caching.
- `server/lib/performanceOptimization.ts` contains request-cache wrapping,
  invalidation helpers, cache headers and responsive-image URL helpers.
- `client/src/components/ui/ProgressiveImage.tsx` implements lazy loading via
  `IntersectionObserver`, a placeholder transition, responsive image support
  and an error fallback.
- `server/domains/discovery/caching/__tests__/discoveryCache.test.ts` provides
  focused cache-key and cache-adapter coverage.

These facts establish code presence, not measured latency, hit rate, CDN
readiness or production deployment status. No database migration, seed,
backfill, repair, manual SQL, benchmark command or deployment procedure is
authorized by this file. Database changes follow the [Database Authority entry
contract](docs/database-authority/00-database-authority-agent-entry.md).
