# SQL Migration Authority

`0000_canonical_launch_baseline.sql` is the executable launch bootstrap
authority for a fresh Property Listify database.

It is generated from `drizzle/schema.ts`, sanitized only by removing Drizzle's
`--> statement-breakpoint` markers, and validated against
`drizzle/schema/canonical-model-inventory.json`.

Baseline contract:

- exactly 180 canonical physical tables
- no noncanonical physical tables
- no views
- no data inserts or backfills
- no destructive SQL
- no quoted `CURRENT_TIMESTAMP` literals
- all foreign-key targets resolve within the baseline

Historical pre-baseline SQL is retained under
`_archived/pre-canonical-baseline/` for audit reference only. The custom SQL
runner executes only top-level `.sql` files in this directory.

Future schema changes must be introduced as new top-level incremental SQL
migrations generated from the accepted canonical model authority.

## Operational command authority

`pnpm db:migrate` is the only approved production migration command. It checks
the database target, runs this directory through `runSqlMigrations.ts`, then
performs the distribution schema verification. `pnpm db:migrate:test` is the
CI/test-database wrapper for the same runner; `pnpm db:migrate:local` is the
local-development wrapper for the same runner.

Migration execution is a release operation, not application startup work. Run
`pnpm release:predeploy:production` before a production deployment; hosted and
normal server startup use `pnpm start:prod` and must not create, alter, repair,
or migrate schema.

The runner scans only top-level `NNNN_name.sql` files in this directory. Files
are ordered by numeric prefix and then complete filename. `_archived/` is never
scanned. `sql_migration_history` records the complete filename and SHA-256
checksum after successful execution; changed historical migration content is
rejected.
