# DBA-S3B-2 — Gap 2 Implementation Report

## Executive authority decision

Property Listify has one operational migration tree: top-level
`server/migrations`, consumed only by
`server/migrations/runSqlMigrations.ts`. Its sole current active SQL file is
`0000_canonical_launch_baseline.sql`; `sql_migration_history` remains the
production ledger. The machine-readable authority manifest and executable
contract make all other SQL and metadata surfaces explicit rather than
operational by implication.

## Exact deleted paths

The following tracked dead-legacy files are deleted. No SQL content was
rewritten; these are the only SQL-file changes in this patch.

- `docker/mysql/init.sql`
- `drizzle_old/0000_bumpy_starfox.sql`
- `drizzle_old/0000_new_marvel_zombies.sql`
- `drizzle_old/0001_broad_dark_beast.sql`
- `drizzle_old/0001_petite_tattoo.sql`
- `drizzle_old/0002_add_property_developer_role.sql`
- `drizzle_old/0002_stormy_kate_bishop.sql`
- `drizzle_old/0003_messy_payback.sql`
- `drizzle_old/0003_slippery_marvel_zombies.sql`
- `drizzle_old/0004_abandoned_lady_bullseye.sql`
- `drizzle_old/0004_material_logan.sql`
- `drizzle_old/0005_colorful_toxin.sql`
- `drizzle_old/0005_dry_maria_hill.sql`
- `drizzle_old/0006_aspiring_shaman.sql`
- `drizzle_old/0006_naive_marvex.sql`
- `drizzle_old/0007_jittery_cloak.sql`
- `drizzle_old/0007_parched_sister_grimm.sql`
- `drizzle_old/0008_add_wizard_fields.sql`
- `drizzle_old/0008_tired_scream.sql`
- `drizzle_old/0009_curly_frog_thor.sql`
- `drizzle_old/0009_hesitant_rachel_grey.sql`
- `drizzle_old/0010_melodic_mordo.sql`
- `drizzle_old/0010_wide_thunderbolts.sql`
- `drizzle_old/0011_add_explore_tables.sql`
- `drizzle_old/0011_add_financial_columns.sql`
- `drizzle_old/0011_cold_bill_hollister.sql`
- `drizzle_old/0012_add_unit_types_financial_columns.sql`
- `drizzle_old/0012_crazy_yellow_claw.sql`
- `drizzle_old/0012_light_captain_cross.sql`
- `drizzle_old/0013_cultured_naoko.sql`
- `drizzle_old/0013_fine_lily_hollister.sql`
- `drizzle_old/0014_cheerful_amazoness.sql`
- `drizzle_old/0014_lame_supreme_intelligence.sql`
- `drizzle_old/0015_chemical_network.sql`
- `drizzle_old/0016_add_missing_unit_types_columns.sql`
- `drizzle_old/0017_add_partnership_tables.sql`
- `drizzle_old/consolidated_missing_tables.sql`
- `drizzle_old/listing-schema.ts`
- `drizzle_old/manual_development_phases.sql`
- `drizzle_old/manual_pricing_migration.sql`
- `drizzle_old/meta/0000_snapshot.json`
- `drizzle_old/meta/0001_snapshot.json`
- `drizzle_old/meta/0002_snapshot.json`
- `drizzle_old/meta/0003_snapshot.json`
- `drizzle_old/meta/0004_snapshot.json`
- `drizzle_old/meta/0005_snapshot.json`
- `drizzle_old/meta/0006_snapshot.json`
- `drizzle_old/meta/0007_snapshot.json`
- `drizzle_old/meta/0008_snapshot.json`
- `drizzle_old/meta/0009_snapshot.json`
- `drizzle_old/meta/0010_snapshot.json`
- `drizzle_old/meta/0011_snapshot.json`
- `drizzle_old/meta/0012_snapshot.json`
- `drizzle_old/meta/0013_snapshot.json`
- `drizzle_old/meta/0014_snapshot.json`
- `drizzle_old/meta/_journal.json`
- `drizzle_old/migrations/.gitkeep`
- `drizzle_old/migrations/20251128_add_developer_approval.sql`
- `drizzle_old/migrations/add-affordability-to-leads.sql`
- `drizzle_old/migrations/add-agency-attribution.sql`
- `drizzle_old/migrations/add-developer-approval-workflow.sql`
- `drizzle_old/migrations/add-developer-subscriptions.sql`
- `drizzle_old/migrations/add-development-location-fields.sql`
- `drizzle_old/migrations/add-enhanced-unit-types.sql`
- `drizzle_old/migrations/add-explore-performance-indexes.sql`
- `drizzle_old/migrations/add-google-places-fields.sql`
- `drizzle_old/migrations/add-kpi-caching-to-developers.sql`
- `drizzle_old/migrations/add-location-performance-indexes.sql`
- `drizzle_old/migrations/add-partner-marketplace-schema.sql`
- `drizzle_old/migrations/add-phase-optimization-fields.sql`
- `drizzle_old/migrations/add-price-insights-indexes.sql`
- `drizzle_old/migrations/add-property-results-optimization-fields.sql`
- `drizzle_old/migrations/add-wizard-optimization-fields.sql`
- `drizzle_old/migrations/add-wizard-v2-fields.sql`
- `drizzle_old/migrations/create-activities-table.sql`
- `drizzle_old/migrations/create-api-usage-monitoring.sql`
- `drizzle_old/migrations/create-explore-discovery-engine.sql`
- `drizzle_old/migrations/create-explore-shorts-tables.sql`
- `drizzle_old/migrations/create-notifications-table.sql`
- `drizzle_old/migrations/create-unit-types-spec-variations.sql`
- `drizzle_old/migrations/create-units-table.sql`
- `drizzle_old/migrations/enhance-developments.sql`
- `drizzle_old/migrations/rollback-agency-attribution.sql`
- `drizzle_old/migrations/rollback-development-wizard.sql`
- `drizzle_old/relations.ts`
- `drizzle_old/schema.ts`
- `server/db/migrations/add-residential-auction-workflow-v1.sql`

## Documentation changes

- Updated `MIGRATION_GUIDE.md`, `QUICK_START_AUTH.md`, `START_SERVER.md`,
  `AUTHENTICATION_SETUP.md`, `PROJECT_DOCUMENTATION.md`, and
  `docs/MIGRATION_CHECKLIST.md` to use the canonical command graph.
- Marked `DATABASE_SETUP_GUIDE.md`, `DATABASE_MANAGEMENT_OPTIONS.md`,
  `RAILWAY_EXPLORE_SHORTS_MIGRATION.md`, `RAILWAY_EXPLORE_SETUP.md`, and
  `EXPLORE_DISCOVERY_MIGRATION_GUIDE.md` as superseded historical workflows.
- Updated `server/migrations/README.md` with the manifest, archive,
  temporary-retention, and no-new-tree rules.

## Manifest classifications

`docs/database-authority/migration-tree-authority.json` classifies the
canonical baseline, archived SQL, temporary legacy SQL and Drizzle metadata
pending Gap 3, approved local/test database-user initialization, test and
diagnostic fixtures, and documentation/example SQL. It explicitly prohibits
`drizzle_old/**`, `server/db/migrations/**`, and `docker/mysql/init.sql`.

## Contract behaviour

`server/__tests__/contract.migration-tree-authority.test.ts` reads the
tracked repository and authority manifest. It rejects unclassified SQL,
additional active SQL, prohibited trees, recursive/archive migration discovery,
a Drizzle journal presented as the ledger, Docker root initialization that
applies application schema, non-canonical operational configuration, and
current guidance that presents a legacy command as executable.

## Why drizzle_old is safe to remove

`drizzle_old/**` had no active package, CI, startup, deployment, production
import, or current-test dependency. Its historical tables were reconciled
against the canonical baseline. In particular, `bundle_attributions` is dead
legacy: its raw-SQL service is reachable only through an unmounted legacy
router and assumes an incompatible bundle model. Git history preserves the
removed definitions; none is canonical authority.

## Retained until Gap 3

`drizzle/*.sql`, `drizzle/meta/**`, `migrations/**`, root-level ad-hoc
SQL, and `scripts/*.sql` remain deliberately non-operational because manual
utility dependencies have been mapped but are outside this gap. The archived
`server/migrations/_archived/**` tree remains audit evidence and is never
runner input.

## Deferred application cleanup

This patch intentionally leaves the dead bundle subsystem unchanged:
`server/services/bundleAttributionService.ts`,
`server/services/bundleAttributionService.README.md`,
`server/marketplaceBundleRouter.ts`,
`server/services/marketplaceBundleService.ts`,
`server/services/marketplaceBundleService.README.md`, and
`server/services/__tests__/monetization.smoke.test.ts`.

## Validation record

Validation was performed without a database connection, migration, reset, or
deployment. A temporary read-only `node_modules` symlink to the clean control
worktree was used because this new implementation worktree had no installed
dependencies; it is removed before handoff.

| Command                                                                                                                                                                                                                                                                                                                                   | Exit | Result                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------- |
| `SKIP_DB_INIT=1 pnpm exec vitest run server/__tests__/contract.migration-tree-authority.test.ts server/__tests__/contract.migration-execution-authority.test.ts server/migrations/__tests__/runSqlMigrations.test.ts server/__tests__/launch-safety.contract.test.ts server/__tests__/launch-preflight.contract.test.ts --reporter=basic` | 0    | 30 focused tests passed. Runner stderr is expected negative-test output from in-memory fake connections. |
| `pnpm run schema:sanity`                                                                                                                                                                                                                                                                                                                  | 0    | 180 canonical tables and one active SQL file.                                                            |
| `pnpm run type-check`                                                                                                                                                                                                                                                                                                                     | 0    | Full TypeScript check passed.                                                                            |
| `pnpm exec eslint server/__tests__/contract.migration-tree-authority.test.ts`                                                                                                                                                                                                                                                             | 0    | Zero errors and warnings after scoped formatting.                                                        |
| `pnpm exec prettier --check <all 15 changed or new supported files>`                                                                                                                                                                                                                                                                      | 0    | All files conform.                                                                                       |
| `node -e <parse migration-tree-authority.json>`                                                                                                                                                                                                                                                                                           | 0    | Manifest JSON parsed.                                                                                    |
| `python3 -c <PyYAML parse docker-compose.yml>`                                                                                                                                                                                                                                                                                            | 0    | Static Docker Compose YAML parse passed; Docker was not used.                                            |
| `git diff --check`                                                                                                                                                                                                                                                                                                                        | 0    | No whitespace errors.                                                                                    |
| `pnpm run build`                                                                                                                                                                                                                                                                                                                          | 0    | Vite production build completed.                                                                         |

Static integrity checks also proved the active set contains only
`0000_canonical_launch_baseline.sql`; `drizzle_old/**`,
`server/db/migrations/**`, and `docker/mysql/init.sql` are absent; the
canonical baseline and lockfile retain their original hashes; and retained
Gap 3 SQL/manual utilities plus dead bundle application files are unchanged.

The initial direct Vitest invocation before the temporary dependency symlink
returned exit 254 because `vitest` was unavailable in the new worktree. It
did not run tests or open a database. All recorded test validation above used
`SKIP_DB_INIT=1`; with no `DATABASE_URL`, the test harness uses its
in-process mock rather than a network connection.

## Scope confirmation

- Canonical baseline: unchanged.
- Canonical Drizzle schema and inventory: unchanged.
- `pnpm-lock.yaml`: unchanged.
- Manual database utilities: unchanged.
- Application services, routers, frontend, CI, Railway, and Docker Compose:
  unchanged.
- Database operations: none.

## Senior-review correction gate

Senior review found two concrete contract defects in the initial uncommitted
patch:

1. repository inventory considered only tracked files, so a non-ignored
   untracked SQL surface could evade review;
2. broad manifest globs could classify a future SQL file without an explicit
   authority decision.

The manifest now uses exact `approvedFiles` allowlists for every retained
broad surface. The only deliberate future-file allowance is the narrow,
non-operational `server/__tests__/fixtures/migration-tree-authority/**`
contract-fixture location. The contract now inventories
`git ls-files --cached --others --exclude-standard`, rejects unclassified
working-tree SQL and Drizzle metadata, validates broad-glob allowlists, detects
current-looking inline legacy documentation commands, and rejects a
non-canonical operational runner.

## Adversarial contract validation

Every temporary mutation was removed immediately after its test; no mutation
artifact remains.

| Mutation                                                                             | Contract result                                                                 | Cleanup                                                                           |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Untracked `unexpected-authority-test.sql` at repository root                         | Failed, exit 1: unclassified migration-related surface.                         | File deleted.                                                                     |
| Untracked `alternate-migrations/0001_test.sql`                                       | Failed, exit 1: unclassified migration-related surface.                         | File and temporary directory removed.                                             |
| Recreated `docker/mysql/init.sql` with `CREATE TABLE`                                | Failed, exit 1: unclassified/prohibited migration-related surface.              | File and empty `docker/mysql` directory removed.                                  |
| Recreated `drizzle_old/reintroduced.sql`                                             | Failed, exit 1: unclassified migration-related surface.                         | File and empty `drizzle_old` directory removed.                                   |
| Added an inline approved `pnpm drizzle-kit push` instruction to the canonical README | Failed, exit 1: operational legacy instruction.                                 | README restored byte-for-byte.                                                    |
| Temporarily enabled recursive runner discovery                                       | Failed, exit 1: top-level discovery assertion rejected recursive `readdirSync`. | Runner restored byte-for-byte.                                                    |
| Added a fixture below the narrowly allowlisted authority-contract fixture directory  | Passed, exit 0.                                                                 | Fixture and created subdirectory removed; pre-existing parent directory retained. |

## Base reconciliation

- Previous reviewed base: `e6aa5ae0597d49f2605a2d02255f0fd329331167`.
- Refreshed base: `b3d1f14d633ef3b7297a3d905a04b2c84bce97b6`.
- Intervening change: PR #386, a five-file commercial-value-proposition
  architecture documentation-only merge.
- Overlap result: none. None of the five incoming documentation paths is in
  the Gap 2 patch, and no incoming change affects migration authority.
- Preservation method: named `--include-untracked` safety stash
  `dba-s3b2-base-reconciliation-safety`, followed by a fast-forward to
  `origin/main` and conflict-free stash application.
- Stash result: restoration returned the approved 99 tracked changes, three
  approved untracked files, 87 deletions, and 12 modifications; the named
  safety stash was then dropped without touching pre-existing entries.
- Refreshed validation: the 30 focused migration/launch tests, migration-tree
  contract, Gap 1 execution contract, migration-runner tests, launch contracts,
  schema sanity, type-check, scoped ESLint, scoped Prettier, manifest JSON,
  Docker Compose YAML, diff integrity, and Vite production build all passed.
  The build emitted only Vite's existing chunk-size warning.
- Final SHA-256 integrity values are recorded in the reconciliation handoff
  generated from this finalized report. A report cannot safely embed its own
  final SHA-256 because adding that value would change the report bytes.
