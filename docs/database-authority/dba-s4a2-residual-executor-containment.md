# DBA-S4A2 Residual Executor Containment

## Decision

DBA-S4A2 retires the final eight utilities previously classified as deferred schema executors.

None is owned by a package command, CI workflow, or executable application caller. Each conflicts with the canonical migration or diagnostic authority.

## Retired paths

- `generate-hash.ts` is prohibited and must never be executed.
- `scripts/diagnose-location-pages.ts` is prohibited and must never be executed.
- `scripts/integrate-subscription-system.ts` is prohibited and must never be executed.
- `scripts/reproduce_listing_500.ts` is prohibited and must never be executed.
- `scripts/run-google-places-migration.ts` is prohibited and must never be executed.
- `scripts/run-property-results-optimization-migration.ts` is prohibited and must never be executed.
- `scripts/run-tidb-explore-migration.ts` is prohibited and must never be executed.
- `server/scripts/debug-schema.ts` is prohibited and must never be executed.

All eight paths are terminal, prohibited authorities. They must not be restored or repointed.

## Canonical migration authority

The only directly executable SQL migration is:

- `server/migrations/0000_canonical_launch_baseline.sql`

Canonical operational guidance is maintained in `server/migrations/README.md`.

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
