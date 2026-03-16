# Distribution Migration Validation Notes

Date: 2026-02-18

## Current Status

- Clean-room validation for split migrations `0011` to `0021` passes.
- Legacy databases can still contain pre-split index names and legacy columns (notably `distribution_deals.lead_id`).
- Reconciliation migration `0022_alter_distribution_reconciliation.sql` is required to normalize existing environments.

## Why Reconciliation Is Required

`CREATE TABLE IF NOT EXISTS` does not reconcile already-existing tables. Existing environments may therefore keep:

- Old index names (for example `idx_distribution_deal_agent` instead of `idx_distribution_deals_agent`)
- Legacy columns (for example `distribution_deals.lead_id`)
- Legacy FK/index naming that differs from current split migration expectations

## Runner Behavior

`server/migrations/runSqlMigrations.ts` now supports:

- Local MySQL URLs (`mysql://...`) for dev/test
- TiDB serverless URLs for production workflows
- Precheck warnings for known distribution schema drift before migration execution
- Per-statement idempotent skips for known duplicate/drop-not-found cases

## Recommended Execution Order

1. Run SQL migrations including `0022` in dev/test.
2. Verify `distribution_*` indexes and FKs in target environment.
3. Promote the same migration set to staging and production.

## Drift Precheck Scope

The precheck currently flags:

- Presence of `distribution_deals.lead_id`
- Known legacy index names from pre-split schema versions

If precheck reports legacy artifacts, keep moving forward with migration run; `0022` is designed to reconcile those artifacts.
