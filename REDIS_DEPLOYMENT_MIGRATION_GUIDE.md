# Redis and Cache Operational Context

> **Historical guide retired.** This file no longer authorizes Redis
> provisioning, deployment, environment configuration, package installation,
> database changes, or cache repairs. The former commands and credential
> examples were removed; Git history retains the historical guide.

The current cache implementation is represented by:

- [`server/lib/redis.ts`](server/lib/redis.ts), including its guarded Redis
  client and local in-memory fallback;
- [`server/services/cacheIntegrationService.ts`](server/services/cacheIntegrationService.ts),
  which owns cache usage for supported services; and
- [`server/cacheRouter.ts`](server/cacheRouter.ts), whose administrative
  operations are subject to the current authorization implementation.

Redis deployment and environment configuration require an approved deployment
workstream and the current environment authority. They must not be inferred
from this historical document.
