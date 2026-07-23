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

## Migration-tree authority

`docs/database-authority/migration-tree-authority.json` is the
machine-readable classification of every tracked migration-related SQL or
metadata surface. It distinguishes canonical active SQL from archived evidence,
approved local/test database-user initialization, diagnostics, and legacy
surfaces retained temporarily until Gap 3 retires or repoints their manual
utility callers.

Only top-level `server/migrations/*.sql` may become new executable
migrations. Do not create another migration tree, make `_archived/`
executable, or present Drizzle journals as the applied production ledger.
`_archived/` remains historical evidence and is never scanned.

## Manual utility boundary

Manual schema-migration wrappers, direct schema-repair scripts, snapshot
mutators, and direct SQL setup guides are prohibited migration authority. Only
`server/migrations/runSqlMigrations.ts` may execute canonical migration SQL.
Read-only diagnostics, controlled data-repair tools, and local/test fixtures
are separate operational categories; none may replace `pnpm db:migrate`,
`pnpm db:migrate:test`, or `pnpm db:migrate:local`.

Do not run a database repair without explicit environment, owner, approval,
and data-safety controls. Temporary legacy SQL and Drizzle metadata remain
tracked during Gap 3 while their callers are retired; Slice 1 removes callers
before any dependent SQL is considered for deletion.

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
