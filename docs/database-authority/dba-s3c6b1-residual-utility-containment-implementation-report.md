# DBA-S3C6B1 — Residual Database Utility Containment Implementation Report

## Authority metadata

- Workstream: DBA-S3C6B1
- Implementation commit: `e13017ffb5821a738dd59436a013b0ddeafadfba`
- Approved parent: `cfd3d6984a32f7ec09c3c257dce925fa8ef7ddc0`
- Commit subject: `chore(database): contain residual utility authority`
- Branch: `feat/database-authority-residual-utility-containment-s3c6b1`
- Database connection opened: no
- Migration executed: no
- Seed or reset executed: no
- Docker lifecycle executed: no
- Deployment performed: no

## Executive outcome

DBA-S3C6B1 immediate operational containment is complete.

The implementation changed 31 paths:

- 5 modified;
- 25 deleted;
- 1 added.

It removed obsolete database utilities, closed unauthorized command surfaces,
redirected local seeding to canonical guarded authority, corrected the residual
utility manifest, and added an executable regression contract.

## Package and Makefile containment

The following package commands were removed:

- `test:wizard:e2e`;
- `verify`;
- `verify:showings`;
- `verify:showings:production`.

The Makefile `db-seed` target now delegates to:

```text
pnpm db:seed:local
```

The unrestricted `scripts/seed.ts` utility was retired.

## Controlled E2E authority

Focused source and Git-history inspection confirmed that
`scripts/verify-prospect-journey-security.ts` contains fixture DML but no
executed schema DDL.

It remains authorized only as controlled local/test verification because it:

- requires the exact `listify_prospect_journey_e2e` database;
- requires localhost or a loopback host;
- runs through the guarded prospect-journey E2E harness;
- consumes schema created by `server/migrations/runSqlMigrations.ts`;
- remains outside supported production diagnostic authority.

## Authority manifest reconciliation

`docs/database-authority/migration-tree-authority.json` now:

- prohibits all 25 retired paths;
- records four obsolete diagnostics as retired;
- classifies retained E2E harnesses as local/test fixtures;
- removes retained E2E paths from schema-executor candidate classes;
- removes retired SQL files from the temporary SQL allowlist;
- removes the obsolete `server/scripts/init-local-db.sql` classification.

The manifest update preserved the existing source layout and produced a bounded,
reviewable semantic diff.

## Retired paths

- `scripts/_validation_scripts.json`
- `scripts/debug-create-development.ts`
- `scripts/debug-db.ts`
- `scripts/debug_schema.sql`
- `scripts/extract-legacy-location-data.ts`
- `scripts/generate-location-slugs.ts`
- `scripts/manual_schema_verify.sql`
- `scripts/migrate-listings-location-id.ts`
- `scripts/repro-500.ts`
- `scripts/run-location-migration.ts`
- `scripts/seed.ts`
- `scripts/sync-locations-table.ts`
- `scripts/test-persistence.ts`
- `scripts/validate-phase4.ts`
- `scripts/validate-schema-sync.ts`
- `scripts/verify-development-page.ts`
- `scripts/verify-location-migration.ts`
- `scripts/verify-showings-migration.ts`
- `scripts/verify-wizard-e2e.ts`
- `scripts/verify_unit_types_schema.sql`
- `server/scripts/init-local-db.sql`
- `server/scripts/simulate-save.ts`
- `server/scripts/verify-dev-service.ts`
- `server/scripts/verify_development_flow.ts`
- `verify_fix.ts`

## Regression authority

The new contract is:

- `server/__tests__/contract.database-residual-utility-authority.test.ts`

It enforces:

- absence of unauthorized package commands;
- canonical guarded Makefile seeding;
- continued absence and prohibition of all retired paths;
- retirement of obsolete diagnostics;
- local/test-only classification of retained E2E utilities;
- a no-DDL boundary for the prospect security verifier.

The migration-tree authority contract was also updated to remove the retired
showings verifier from its diagnostic allowlist.

## Validation results

Static validation passed for:

- JSON parsing;
- authority-manifest semantics;
- package and Makefile command boundaries;
- retired-path absence;
- staged and committed scope;
- Git whitespace validation.

Isolated authority tests:

- test files: 2 passed;
- tests: 10 passed;
- exit code: 0;
- temporary dependency link removed: yes.

Validated test log:

- path: `/home/edwardspc/Desktop/dba-s3c6b1-authority-test-output.txt`;
- SHA-256: `3294b7da9dbf89922f6ab836d3bc2fb57573d65b9f452018681aa436ed1236a1`.

## Commit verification

- Commit: `e13017ffb5821a738dd59436a013b0ddeafadfba`
- Parent: `cfd3d6984a32f7ec09c3c257dce925fa8ef7ddc0`
- Modified paths: 5
- Deleted paths: 25
- Added paths: 1
- Total paths: 31
- Post-commit worktree: clean

## Remaining Database Authority work

The remaining sequence is:

1. DBA-S3C6B2 — local lifecycle authority consolidation;
2. DBA-S3C6B3 — residual unrooted utility retirement;
3. DBA-S4 — final Database Authority closure audit.

DBA-S3C6B2 must reconcile:

- `scripts/localDbWorkflow.ts`;
- `scripts/local-db.sh`;
- root `docker-compose.yml`;
- remaining database-related Makefile targets;
- exact local and disposable-database lifecycle contracts.

## Implementation verdict

`DBA_S3C6B1_STATUS=COMPLETE`

`DBA_S3C6B2_GATE=OPEN`

The next authorized workstream is DBA-S3C6B2 local lifecycle authority
consolidation.
