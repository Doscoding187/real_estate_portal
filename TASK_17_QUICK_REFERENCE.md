# Retired Task 17 Quick Reference

> **Historical quick reference retired.** Its Redis credentials, deployment
> setup, cache commands, and feature-specific migration instructions are not
> operational authority. Git history retains the historical reference.

Current cache implementation evidence is in
[`server/lib/redis.ts`](server/lib/redis.ts) and
[`server/services/cacheIntegrationService.ts`](server/services/cacheIntegrationService.ts).
Current authorization for cache administration is defined by the active
`server/cacheRouter.ts` implementation and its tests. Deployment, environment,
database, and rollback procedures require their current approved authorities.
