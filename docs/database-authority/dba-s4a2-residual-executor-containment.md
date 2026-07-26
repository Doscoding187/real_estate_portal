# DBA-S4A2 Residual Executor Containment

## Decision

DBA-S4A2 retires the final eight utilities previously classified as deferred schema executors.

None is owned by a package command, CI workflow, or executable application caller. Each conflicts with the canonical migration or diagnostic authority.

## Retired paths

- `generate-hash.ts`
- `scripts/diagnose-location-pages.ts`
- `scripts/integrate-subscription-system.ts`
- `scripts/reproduce_listing_500.ts`
- `scripts/run-google-places-migration.ts`
- `scripts/run-property-results-optimization-migration.ts`
- `scripts/run-tidb-explore-migration.ts`
- `server/scripts/debug-schema.ts`

All eight paths are terminal, prohibited authorities. They must not be restored or repointed.

## Canonical migration authority

The only directly executable SQL migration is:

- `server/migrations/0000_canonical_launch_baseline.sql`

All schema changes must pass through the canonical migration runner and ledger.

## Runtime schema capability authority

Live schema probing remains centralized in:

- `server/services/runtimeSchemaCapabilities.ts`

The apparent `server/agencyRouter.ts` probe was a lexical audit false positive caused by ordinary prose, not executable schema inspection.

## Explore authority

Current launch compatibility remains authoritative for:

- `content_topics`
- `explore_shorts`

These tables have active runtime consumers. Their retirement belongs to the separately gated future Explore cutover, not DBA-S4.

## External security boundary

This repository containment does not attest completion of external database credential rotation, super-admin password rotation, session invalidation, or Git-history remediation.
