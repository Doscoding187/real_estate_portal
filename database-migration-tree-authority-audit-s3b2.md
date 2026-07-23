# DBA-S3B-2 — Migration-Tree Authority Audit

## Executive finding

Gap 1's authority is intact: `server/migrations/runSqlMigrations.ts` consumes
only the top-level `server/migrations/0000_canonical_launch_baseline.sql`; the
applied ledger is `sql_migration_history`. No approved package, CI, deployment,
or normal-startup path consumes another SQL migration tree.

This audit does not justify deletion yet. Legacy trees contain schema objects
absent from the canonical baseline, manual TypeScript migration/repair utilities
still read legacy SQL or snapshots, and current-looking guides still present
legacy workflows. The manual utilities are Gap 3 scope. The decision gate is
therefore blocked; no implementation worktree was created.

## Command and reference graph

- `package.json:54`, `:68`, and `:74` resolve `db:migrate`,
  `db:migrate:local`, and `db:migrate:test` to the canonical runner.
- The runner uses non-recursive `readdirSync(migrationsDir)` and only accepts
  top-level SQL; `_archived` is not discovered.
- `docker-compose.local-db.yml:15` mounts only
  `docker/mysql-local/init` read-only. Its SQL creates local/test databases and
  users, not application schema. Gap 1 removed the root-migrations mount.
- No package, CI, deployment, startup, Docker application-service, or
  production-code reference executes `drizzle/*.sql`, `drizzle_old/**`, root
  `migrations/**`, `server/db/migrations/**`, root SQL, or `scripts/*.sql`.

Manual references deferred to Gap 3:

- `scripts/apply-financial-migration.ts` reads
  `drizzle/0011_add_financial_columns.sql`.
- `scripts/apply-unit-types-migration.ts` reads
  `drizzle/0012_add_unit_types_financial_columns.sql`.
- `scripts/fix_snapshot.js` reads `drizzle/meta/0013_snapshot.json`.
- Eleven `scripts/run-*-migration.ts` files reference the non-existent
  `drizzle/migrations/**` path.
- Several manual scripts and PowerShell helpers direct users to root
  `migrations/**`.

## Complete migration-surface classification

Each tracked file in an exact path set below receives the stated single
classification. Counts came from the verified merge tree.

| Exact path set                                                                                                                                                                                               |    Count | Class | Disposition                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------: | ----- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `server/migrations/0000_canonical_launch_baseline.sql`                                                                                                                                                       |        1 | A     | Canonical active baseline; retain.                                                                                                  |
| `server/migrations/runSqlMigrations.ts`, `server/migrations/README.md`                                                                                                                                       |        2 | B     | Canonical runner/documentation; retain.                                                                                             |
| `server/migrations/__tests__/runSqlMigrations.test.ts`                                                                                                                                                       |        1 | E     | Test-only temporary-directory/connection fixture; retain.                                                                           |
| `server/migrations/_archived/**/*.sql`                                                                                                                                                                       |       56 | D     | Historical retained audit evidence; runner excludes it. Retain pending unique-object review.                                        |
| `drizzle/schema.ts`, `drizzle/relations.ts`, `drizzle/schema/**`                                                                                                                                             |       26 | B     | Canonical Drizzle model and inventory, used by runtime/tests/baseline validation; retain.                                           |
| `drizzle/*.sql` (top-level SQL)                                                                                                                                                                              |       45 | H     | Generated/manual legacy SQL. Manual scripts read two files and 44 created tables are absent from baseline; do not delete.           |
| `drizzle/meta/_journal.json`, `drizzle/meta/*_snapshot.json`                                                                                                                                                 |       17 | C     | Generated Drizzle metadata, not production ledger. Retain unchanged pending Gap 3's `fix_snapshot.js` disposition.                  |
| `drizzle_old/*.sql` (top-level)                                                                                                                                                                              |       38 | H     | Superseded generated/manual SQL; 43 created tables absent from baseline. No operational reference, but unique content needs review. |
| `drizzle_old/meta/_journal.json`, `drizzle_old/meta/*_snapshot.json`                                                                                                                                         |       16 | C     | Generated non-operational old metadata; retain pending parent-tree decision.                                                        |
| `drizzle_old/migrations/.gitkeep`, `drizzle_old/migrations/*.sql`                                                                                                                                            |       28 | H     | Historical manual chain, not operationally referenced; retain pending unique-schema review.                                         |
| `drizzle_old/listing-schema.ts`                                                                                                                                                                              |        1 | D     | Historical schema evidence; no active import found.                                                                                 |
| `migrations/*.sql`                                                                                                                                                                                           |       38 | H     | Historical/manual schema, seed, backup and verification SQL; scripts/docs still point here and 18 tables are absent from baseline.  |
| `server/db/migrations/add-residential-auction-workflow-v1.sql`                                                                                                                                               |        1 | D     | Historical auction alteration; semantic counterpart already archived/baselined.                                                     |
| root `*.sql` (11 named root SQL files)                                                                                                                                                                       |       11 | H     | Ad-hoc production/local/manual SQL; three created tables absent from baseline.                                                      |
| `scripts/*.sql`                                                                                                                                                                                              |        7 | H     | Manual diagnose/fix/verify SQL; associated utility disposition belongs to Gap 3.                                                    |
| `server/scripts/init-local-db.sql`                                                                                                                                                                           |        1 | F     | Manual local database-creation example, not invoked by current local workflow or Compose.                                           |
| `server/scripts/sanity_test_seed_cleanup.sql`                                                                                                                                                                |        1 | E     | Human-readable seed-cleanup diagnostic fixture.                                                                                     |
| `server/routes/SELECT id, name, userId.sql`                                                                                                                                                                  |        1 | F     | Saved query text, not schema authority.                                                                                             |
| `docker/mysql-local/init/01-create-local-databases.sql`                                                                                                                                                      |        1 | B     | Approved local/test database-user initializer; no application tables.                                                               |
| `docker/mysql/init.sql`                                                                                                                                                                                      |        1 | F     | Unmounted generic MySQL setup example.                                                                                              |
| `backups/cleanup-backup-2026-01-29T20-02-35-220Z.sql`                                                                                                                                                        |        1 | D     | Empty historical backup artifact; not migration authority.                                                                          |
| canonical migration authority docs (`MIGRATIONS.md`, `server/migrations/README.md`, `docs/SQL_MIGRATION_HISTORY_WORKFLOW.md`, `docs/architecture/database-authority-policy.md`, `scripts/MIGRATION_LOCK.md`) |        5 | F     | Retain; they identify the canonical/archived distinction.                                                                           |
| other guides/reports containing `migrations/`, `drizzle/migrations`, `pnpm db:push`, or `drizzle-kit push`                                                                                                   | multiple | H     | Historical reports are often safe, but current-looking guides conflict and need a selected archival/correction boundary.            |

## Canonical baseline comparison

Static `CREATE TABLE` extraction found 180 baseline tables. This is a structural
screen only; it does not prove equivalent columns, indexes, foreign keys,
views, triggers, seeds, or data semantics.

| Surface                                | SQL files | Created tables | In baseline | Absent |
| -------------------------------------- | --------: | -------------: | ----------: | -----: |
| canonical baseline                     |         1 |            180 |         180 |      0 |
| canonical archive                      |        56 |             66 |          64 |      2 |
| `drizzle/*.sql`                        |        45 |            147 |         103 |     44 |
| `drizzle_old/*.sql`                    |        38 |            142 |          99 |     43 |
| root `migrations/*.sql`                |        38 |             72 |          54 |     18 |
| root SQL                               |        11 |             14 |          11 |      3 |
| `server/db/migrations/*.sql`           |         1 |              0 |           0 |      0 |
| scripts/Docker/server-script/route SQL |        12 |              0 |           0 |      0 |

`server/migrations/_archived/pre-canonical-baseline/0038_create_distribution_program_workflow_engine.sql`
creates `distribution_program_required_documents` and
`distribution_deal_document_statuses`, neither a baseline table. The canonical
schema aliases those concepts to `development_required_documents` and
`distribution_deal_documents`. This appears to be an intentional replacement,
but senior architecture must confirm it before deleting evidence.

The absent legacy sets include Explore/video, advertising/campaign, payment,
analytics/recommendation, `spec_variations`, caches/backups,
`pending_agent_profiles`, and legacy user-preference tables. Their absence from
the canonical inventory is not proof of a baseline defect; it does prove they
need an explicit obsolete-versus-later-correction decision before deletion.

## Journals, fixtures, and initialization

`drizzle/meta/_journal.json` and `drizzle_old/meta/_journal.json` are generated
Drizzle journals, never consumed by the custom runner, and are not the applied
production ledger. The sole ledger remains `sql_migration_history`.

Runner tests use temporary directories and injected connections; no legacy tree
is a tracked executable test fixture. The Docker-local initializer only creates
`listify_local`, `listify_test`, users, and grants. `docker/mysql/init.sql` and
`server/scripts/init-local-db.sql` are not mounted or invoked by the current
command graph.

## Documentation conflicts

Current-looking guides advertising a non-canonical workflow include
`MIGRATION_GUIDE.md`, `QUICK_START_AUTH.md`, `START_SERVER.md`,
`AUTHENTICATION_SETUP.md`, `PROJECT_DOCUMENTATION.md`, `DATABASE_SETUP_GUIDE.md`,
`DATABASE_MANAGEMENT_OPTIONS.md`, `RAILWAY_EXPLORE_SHORTS_MIGRATION.md`,
`RAILWAY_EXPLORE_SETUP.md`, `EXPLORE_DISCOVERY_MIGRATION_GUIDE.md`, and
`docs/MIGRATION_CHECKLIST.md`. They direct users to `pnpm db:push`,
`drizzle/migrations/**`, or root `migrations/**`.

## Proposed deletion/retention decision

No deletion is proposed in Gap 2 at this point. Candidate future deletion groups
are `drizzle_old/**`, top-level `drizzle/*.sql`, root `migrations/**`, root
ad-hoc SQL, `server/db/migrations/**`, unmounted Docker init SQL, and generated
journals. Git history preserves the content after a safe decision exists.

## Decision gate

`GAP_2_STATUS=AUDIT_BLOCKED`

Minimum evidence required:

1. senior confirmation that the two archived distribution-document tables were
   intentionally replaced by the canonical alias model;
2. senior disposition of the 44/43/18/3 absent legacy table sets as obsolete
   history versus a later canonical-schema-correction backlog;
3. authorization for Gap 3 to retire/redirect manual TypeScript/JavaScript
   utilities that read legacy SQL or journals;
4. a documentation boundary decision: which current-looking guides are corrected
   now versus clearly marked historical.

No canonical baseline rewrite, database execution, or manual-utility change is
required or authorized in this audit. Gap 4 lifecycle proof remains deferred.
