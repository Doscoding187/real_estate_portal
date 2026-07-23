# DBA-S3B-1 — Gap 1 Implementation Report

## Scope

This uncommitted review patch makes the repository migration command graph
explicit. It does not alter migration SQL, execute a database operation, or
classify/retire migration trees and manual database utilities.

## Authority decision

- Production command: `pnpm db:migrate`.
- CI/test command: `pnpm db:migrate:test`.
- Runner: `server/migrations/runSqlMigrations.ts`.
- Active SQL directory: top-level `server/migrations`.
- Ledger: `sql_migration_history`.

## Changes

- Removed hosted/default startup migration execution.
- Replaced Makefile's Drizzle push path with the canonical local wrapper.
- Removed Docker's legacy root-migrations auto-execution mount.
- Removed intermediate package scripts that exposed the runner outside the
  approved `db:migrate*` commands.
- Added a focused executable authority contract and updated migration guidance.
- Marked the obsolete root `MIGRATIONS.md` as superseded and directed all
  readers to the canonical migration guide.

## Exact file boundary

Modified tracked files:

- `Makefile`
- `docker-compose.yml`
- `package.json`
- `railway.json`
- `scripts/start-production.ts`
- `server/__tests__/launch-preflight.contract.test.ts`
- `server/__tests__/launch-safety.contract.test.ts`
- `server/migrations/README.md`
- `MIGRATIONS.md`

New, untracked review files:

- `server/__tests__/contract.migration-execution-authority.test.ts`
- this implementation report

No migration SQL, lockfile, application-domain, or frontend file changed.

## Strengthened authority contract

`contract.migration-execution-authority.test.ts` now reads the real package
manifest, every tracked workflow YAML file, the startup/deployment graph, the
canonical runner source, and the migration filesystem.

The exhaustive operational package allowlist is:

- `db:migrate`
- `db:migrate:test`
- `db:migrate:local`
- `db:migrate:fresh:local`
- `db:migrate:dev`
- `db:start:local`
- `db:reprovision:local`
- `db:bootstrap:local`
- `release:predeploy:production`

The explicit test-only allowlist is the Listing Performance and Prospect
Journey E2E commands. Any other package script resolving to migration SQL,
schema push, Drizzle migration, a manual migration utility, or a migration
runner fails the contract. The contract requires exactly one operational runner
identity: `server/migrations/runSqlMigrations.ts`.

Every `.github/workflows/*.yml` and `.yaml` file is enumerated. The only
allowed CI migration invocation is `pnpm db:migrate:test`. Startup coverage
includes all start package scripts, Railway, server startup modules,
`scripts/start-production.ts`, Docker/Procfile candidates, and other root
deployment configuration. Archive proof verifies top-level discovery, forbids
recursive runner discovery, confirms archived SQL exists but is absent from the
active file list, and retains ledger/checksum/lock/baseline guards.

## Database operations

No database connection was opened and no migration, reset, deployment, or
production configuration change was performed.

## Validation

- Focused Vitest with `SKIP_DB_INIT=1`: passed, 26 tests.
- Strengthened authority contract alone with `SKIP_DB_INIT=1`: passed, 4 tests.
- `pnpm run schema:sanity`: passed; 180 canonical tables and one active SQL file.
- `pnpm run type-check`: passed.
- Targeted ESLint: passed with zero errors.
- Prettier check for every supported changed/new Gap 1 file: passed.
- `package.json` and `railway.json` JSON parsing: passed.
- `docker-compose.yml` PyYAML parsing: passed.
- `git diff --check`: passed.
- Exhaustive package/workflow/startup graph checks: passed.
- `OPERATIONAL_PACKAGE_MIGRATION_RUNNER_COUNT=1`.
- Proof of no changed or untracked SQL and no `pnpm-lock.yaml` change: passed.

Docker was not installed, so Docker Compose runtime validation was not run.
This is a warning only; YAML parsing and the scoped Prettier check passed.
