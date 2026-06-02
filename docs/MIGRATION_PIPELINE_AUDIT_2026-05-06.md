# Migration Pipeline Audit - 2026-05-06

## What broke

`pnpm db:migrate:local` failed before custom SQL migrations ran because it executed `drizzle-kit migrate` against an existing local database. The Drizzle baseline migration starts with `CREATE TABLE activities`, while the local database already had `activities`, causing `ER_TABLE_EXISTS_ERROR`.

This is a drift problem, not a brochure-specific migration problem.

## Current pipeline

- `pnpm db:migrate` runs the custom SQL migration runner and then `db:verify:distribution`.
- `pnpm db:migrate:local` now mirrors that idempotent path for day-to-day local work.
- `pnpm db:migrate:drizzle:local` remains available when we intentionally need to run Drizzle journal migrations on a fresh or correctly baselined database.
- `server/migrations/runSqlMigrations.ts` is the safer path for distribution changes because migrations are written with `CREATE TABLE IF NOT EXISTS`, duplicate-column handling, and schema verification afterward.

## Important runner behavior

The SQL runner filters statements by prefix before execution. Existing migrations use MySQL prepared statements for conditional changes, so the runner must treat `PREPARE`, `EXECUTE`, and `DEALLOCATE` as executable. Otherwise a migration can appear to run while the important dynamic statements are skipped.

The runner now includes those prefixes.

## Working convention

For distribution-network changes:

1. Add schema changes to `server/migrations/*.sql` as idempotent SQL.
2. Update Drizzle schema definitions to match runtime shape.
3. Update `scripts/db-verify-distribution-schema.ts` for required columns or tables.
4. Run `pnpm db:migrate:local`.
5. Run `pnpm run check`.

Use Drizzle generated migrations only when the target database is fresh or explicitly baselined. For existing local/dev/prod databases, prefer the custom SQL runner plus verifier.

