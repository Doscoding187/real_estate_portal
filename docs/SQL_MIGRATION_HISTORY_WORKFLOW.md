# SQL Migration History Workflow

`server/migrations/runSqlMigrations.ts` is the canonical runner for the hand-authored SQL migration stream. Drizzle's `__drizzle_migrations` journal is a separate history; neither runner treats the other journal as evidence that its own migrations ran.

## Normal commands

- `pnpm db:migrate:local` prints the guarded local target, runs only unapplied custom SQL files, then runs the distribution schema verifier.
- `pnpm db:migrate:fresh:local` first applies Drizzle's journal to an empty or Drizzle-baselined database, then runs the custom SQL stream.
- `pnpm db:migrate:test` runs Drizzle and custom SQL against the guarded `listify_test` target.
- `pnpm db:migrate:drizzle:local` runs only Drizzle and is for a fresh or explicitly Drizzle-baselined database.
- `pnpm migration:sql` is the production custom-SQL command; `pnpm db:migrate` wraps it with target reporting and verification.

The custom runner serializes callers with MySQL/TiDB `GET_LOCK`, creates `sql_migration_history`, sorts by numeric prefix then filename, and records the numeric prefix, file-stem identity, filename, SHA-256 checksum, timestamp, duration and runtime environment only after all statements succeed. The repository has historical duplicate numeric prefixes, so the full filename is the unique migration identity and the filename tie-breaker is deterministic. Malformed filenames fail before migration SQL runs. A changed checksum for an applied filename is a hard error; checksums use the exact UTF-8 file content (including its line endings), and are never normalized or silently updated. Errors are rethrown so the direct command exits non-zero.

Ledger rows identify their application mode. Normal execution records `executed`. An explicit baseline records `baseline_verified` with one UUID batch identifier and its requested target version; it never claims the SQL was executed. Existing ledgers receive these audit columns idempotently.

MySQL DDL can implicitly commit, so a multi-statement migration is not rollback-atomic. If a statement fails, the ledger row is not written and the operator must inspect the partial schema effect before retrying; do not assume the runner rolled the DDL back.

## Existing databases without custom history

The normal runner never infers that a migration ran merely from the current schema. This prevents the historical 0061 migration from being replayed against a database whose `lead_activities.type` data no longer matches its old transform.

Use an explicit baseline only after confirming the target is a disposable guarded local/test database and inspecting the schema:

```bash
pnpm db:migrate:baseline:local -- --baseline-through=0071
```

Baseline mode requires an empty custom ledger and is permitted only with `NODE_ENV=development` or `test`; staging and production baseline attempts fail. For every file through the supplied boundary it checks structural schema witnesses (created tables, added columns, indexes and foreign keys) and then validates the cumulative target profile before writing any row. This two-phase operation means a failed witness leaves no partial baseline ledger. The subsequent ledger-only writes use one transaction; an insert failure rolls the batch back and reports an error for operator inspection.

Target profiles model legitimate supersession instead of accepting arbitrary drift. For example, exact 0061 verification requires the historical five-value `lead_activities.type` enum. A target at or after 0068 accepts that 0061 state only because committed 0068 is verified and the profile requires the exact six-value enum including `contact_attempt`; unknown values and invalid data fail. Likewise, 0063's exact `showings.status` lifecycle supersedes the earlier 0052 enum only for targets at or after 0063. Profiles use exact definitions and data invariants, not generic supersets.

The 0071 profile requires the 0071 performance-review table, the cumulative enum/data invariants, and absence of the 0072 `contact_date` column. It is intentionally evaluated using the active migration directory, so product migrations remain owned by their feature branch. Baseline mode is deliberately not part of the normal path, and the local wrapper prints the target without credentials before it can run.

For a fresh disposable database, apply the Drizzle stream then run the custom stream, schema verifier, and the custom stream a second time to prove a no-op. For an effective 0071 database, verify the 0071 effects and that `contact_date` is absent before baselining through 0071. Then run the normal command. It must apply only 0072, record its checksum, create the expected column, and make the next run a no-op.

## 0061 incident diagnosis

The failing file is `0061_reconcile_agency_workspace_schema.sql`. Its legacy dynamic backfill changes `lead_activities.type` from `activityType`, then the file modifies `type` to the five-value enum `note`, `call`, `email`, `meeting`, `status_change`. The old runner had no custom ledger and replayed it on every command. If existing `lead_activities.type` values are outside that enum, the `MODIFY COLUMN` fails before later migrations—including 0072—are reached.

Do not edit 0061 to make it replayable. Inspect `SHOW CREATE TABLE lead_activities` and the distinct `type` values on the guarded target, baseline only when the historical effects are verified, and repair inconsistent data/schema through a separately reviewed forward migration.
