# Referrer Search Assessment Migration Review

**Phase:** verify; local disposable-worktree rehearsal completed  
**Change class:** additive schema  
**Worktree:** `property-listify-referrer-search-assessment-20261026`  
**Base:** `origin/main` at `0265866908a2026e25ef3aa8cf6d82145588d4f3`

## Migration lineage

- Current head on the reviewed base: `0152_service_provider_review_reports_reporter_created_index.sql`.
- New migration: `0153_distribution_referrer_search_assessments.sql`.
- Parent checksum: `aae6172f4bca9f11d5ff681cc7ed40649f515f2460b4ff0faa18f3828797f13d`.
- New migration checksum: `717d90efef495747e013a3ae883e07d2486ee526985924737e514b8679f957f7`.
- Policy: one additive `CREATE TABLE` statement in the active serialized migration manifest.
- Expected head: `0153_distribution_referrer_search_assessments.sql`.
- Manifest review: `pnpm db:authority:manifest` confirmed the base head before authoring and the contiguous 0153 child afterward.

## Model and consumers

The table stores only search mode, browse filters, matching-policy version, selected Developer projection snapshots, and account ownership. It has no prospect identity, income, contact details, or check-fit assumptions. Anonymous continuity values are stored as SHA-256 hashes. Account ownership references `users.id` with `ON DELETE CASCADE`; the unique token index prevents duplicate anonymous records for one token; the owner/update index supports the signed-in dashboard list.

The server reloads selected facts through `listPublicDistributionOpportunities`, which consumes `DevelopmentSalesProjection`, and rejects selected developments that are no longer public and marketable in the chosen mode. Runtime consumers are the public save, authenticated save/claim, and account list procedures in `server/distributionRouter.ts`. The financial authority remains `distribution_prospect_check_fits`.

## Preconditions, postconditions, and recovery

- Preconditions: the reviewed manifest parent is 0152; the Drizzle model and canonical inventory include the new table exactly once; the SQL is one DDL statement. The canonical worktree creator provisioned an exact, fresh `disposable-worktree` target before apply.
- Postconditions: the canonical migration runner completed the fresh baseline and migration chain through 0153; the ledger reports `manifest-head-ready` with no incomplete attempt; a fresh plan has no pending migrations; physical schema congruency passes with identical desired and actual digests. The referrer preview role fixture prepared and verified the referrer-only account against this schema.
- Target classes: local `disposable-worktree` for owned migration rehearsal; `disposable-test` for isolated CI; protected `staging` and `production` only through their exact release plan/apply workflows.
- Forward recovery: apply only through the canonical migration runner. If statement execution or ledger completion is ambiguous, preserve the attempt and stop; use the matching reviewed recovery path. Do not rerun the `CREATE TABLE`, manually drop the table, or use schema push.

## Current verification state

Manifest validation, generated model inventory, TypeScript checking, focused static/unit contracts, and `git diff --check` pass. The exact local target is a `disposable-worktree`; the migration apply, fresh no-pending plan, schema congruency, and referrer preview/activity fixture verifiers pass there. A rollback-only database smoke verified anonymous save, account claim, owned list, and owned update against a real Developer projection without retaining its assessment row. A browser smoke then verified public browse selection, anonymous save, account login, dashboard claim/list, and cleared browser token with no page errors. It retained one owned sample shortlist for local dashboard inspection. No protected database was targeted; the isolated CI contract remains pending on PR checks.
