# Database Manual Utility Authority Audit — S3C1

## Executive conclusion

Gap 3 found no second operational migration runner. `package.json`, CI, startup and deployment retain the Gap 2 command graph: `pnpm db:migrate`, `pnpm db:migrate:test`, and `pnpm db:migrate:local` all reach `server/migrations/runSqlMigrations.ts`; the production ledger remains `sql_migration_history`.

The manual-utility estate is a historical operational toolbox, not a current schema-authority path. The direct static census found 87 files that either contain schema DDL, load a SQL file, address Drizzle metadata, or explicitly direct an operator to a legacy SQL surface. One is a test fixture. Of the remaining 86 manual candidates, none is invoked by CI, server startup, Railway, Docker startup, or an approved package migration command. Ten migration wrappers are already non-functional because they read the removed `drizzle/migrations/**` tree. The appropriate future outcome is retirement or conversion to a bounded diagnostic/data-repair tool, never reintegration into migration authority.

## Method and reachability graph

Static sources inspected: tracked TypeScript, JavaScript, PowerShell and shell utilities; `package.json`; `.github/workflows`; `railway.json`; Docker/Procfile/Makefile; current documentation; Git history; the Gap 2 manifest and reports. No utility was executed, no module was imported, and no environment file was loaded.

| Entry surface | Result |
| --- | --- |
| Package migration commands | Only the approved canonical runner is used. No known manual utility is in `db:migrate`, `db:migrate:test`, or `db:migrate:local`. |
| Package verification/local workflows | `db:verify`, `db:verify:distribution`, local-demo tooling, and local DB lifecycle tooling are explicit non-migration operational tools. They are not callers of temporary legacy SQL. |
| CI workflows | No manual utility or retained temporary SQL execution found. |
| Startup, Railway, Docker, scheduled jobs | No manual utility or temporary legacy SQL execution found. |
| Direct code callers | The 10 missing-`drizzle/migrations` wrappers are self-entrypoint programs only. No production import/caller was found. |
| Documentation callers | Numerous historical/current-looking guides still name root `migrations/`, root SQL, or removed `drizzle/migrations`. They are a Gap 3 documentation correction boundary, not runtime reachability. |

## Known-utility decisions

| Path | Purpose/dependency | Primary class | Future disposition |
| --- | --- | --- | --- |
| `scripts/apply-financial-migration.ts` | Executes `drizzle/0011_add_financial_columns.sql`; tolerates duplicate columns. | D — superseded | Retire with that historical SQL after caller retirement. |
| `scripts/apply-unit-types-migration.ts` | Executes `drizzle/0012_add_unit_types_financial_columns.sql`; tolerates duplicate columns. | D — superseded | Retire with dependent historical SQL. |
| `scripts/fix_snapshot.js` | Mutates `drizzle/meta/0013_snapshot.json` to remove legacy Explore tables. | E — broken/legacy | Retire; generated metadata is not a ledger and must not be hand-repaired. |
| `scripts/run-development-location-migration.ts` | Reads removed `drizzle/migrations/add-development-location-fields.sql`. | E — broken/legacy | Retire. |
| `scripts/run-development-wizard-migration.ts` | Reads three removed `drizzle/migrations/*.sql` files and ignores failures. | E — broken/legacy | Retire. |
| `scripts/run-enhanced-unit-types-migration.ts` | Reads removed `drizzle/migrations/add-enhanced-unit-types.sql`. | E — broken/legacy | Retire. |
| `scripts/run-google-places-monitoring-migration.ts` | Reads removed monitoring SQL and probes resulting tables. | E — broken/legacy | Retire. |
| `scripts/run-location-performance-migration.ts` | Reads removed index SQL and creates/probes indexes. | E — broken/legacy | Retire. |
| `scripts/run-phase-optimization-migration.ts` | Reads removed `drizzle/migrations/add-phase-optimization-fields.sql`. | E — broken/legacy | Retire. |
| `scripts/run-price-insights-indexes.ts` | Reads removed `drizzle/migrations/add-price-insights-indexes.sql`. | E — broken/legacy | Retire. |
| `scripts/run-unit-types-spec-variations-migration.ts` | Reads removed `drizzle/migrations/create-unit-types-spec-variations.sql`. | E — broken/legacy | Retire. |
| `scripts/run-wizard-optimization-migration.ts` | Reads removed `drizzle/migrations/add-wizard-optimization-fields.sql`. | E — broken/legacy | Retire. |
| `scripts/run-wizard-v2-migration.ts` | Reads removed `drizzle/migrations/add-wizard-v2-fields.sql`. | E — broken/legacy | Retire. |
| `scripts/diagnose-location-pages.ts` | Connects directly, emits legacy root-migration instructions, and diagnoses location state. | B — diagnostic | Replace with a read-only, explicitly targeted diagnostic only if the capability remains useful; otherwise retire. |
| `scripts/fix-location-pages.ts` | Alters location tables, backfills slugs, and creates indexes. | D — superseded | Retire; canonical baseline/schema own these structures. |
| `setup-explore-feed.ps1` | Hard-coded Windows path; instructs direct root `migrations/*.sql`, seeds, and starts the app. | E — broken/legacy | Retire. |
| `verify-explore-feed.ts` | Direct MySQL connection; assumes legacy Explore table names and tells users to run root migrations. | E — broken/legacy | Retire. |

## Additional direct schema/legacy utility census

The following static cohorts are exhaustive for the 87 direct candidates. Each listed path has the indicated primary class; package/CI/startup exposure is zero unless explicitly noted above.

| Class | Exact paths | Reason and disposition |
| --- | --- | --- |
| D — superseded schema mutators | `add-missing-columns.ts`, `apply-hotfix.ts`, `apply-schema.ts`, `fix_developments_schema.ts`, `fix_locations_schema.ts`, `init-db.ts`, `migrate-schema.ts`, `scripts/add-developer-columns.ts`, `scripts/add-location-id-column.ts`, `scripts/add-missing-developer-columns.ts`, `scripts/add-portfolio-columns.ts`, `scripts/add-portfolio-defaults.ts`, `scripts/add-remaining-columns.ts`, `scripts/add-remaining-unit-types-columns.ts`, `scripts/add-unit-stock-columns.ts`, `scripts/apply-indexes.ts`, `scripts/apply-pricing-migration.ts`, `scripts/apply-wizard-migration.ts`, `scripts/bootstrap-essential-cities.ts`, `scripts/create-development-phases-table.ts`, `scripts/create-listings-tables.ts`, `scripts/debug_schema.ts`, `scripts/fix-brand-ownership-schema.ts`, `scripts/fix-locations-code.ts`, `scripts/fix-provinces-schema.ts`, `scripts/fix_listings_column.ts`, `scripts/fix_schema_drift.ts`, `scripts/manual_migration_listings.ts`, `scripts/migrate-hero-campaigns.ts`, `scripts/migrate-locations.ts`, `scripts/quick-subscription-integration.ts`, `scripts/run-activities-migration.ts`, `scripts/run-agents-migration.ts`, `scripts/run-developer-migration-step-by-step.ts`, `scripts/run-developer-migration.ts`, `scripts/run-kpi-caching-migration.ts`, `scripts/run-notifications-migration.ts`, `server/scripts/apply-approval-schema.ts`, `server/scripts/create-local-db.ts`, `server/scripts/debug-schema.ts`, `server/scripts/verify-fast-track.ts`, `verify-developer-user.ts` | Direct DDL/repair paths that bypass the canonical runner. Retire or replace only with a controlled, separately approved data-administration tool; no schema mutation authority may remain. |
| B — verification/diagnostic | `scripts/db-contract-verify.ts`, `scripts/schema-sanity-check.mjs`, `scripts/investigate_schema.ts`, `scripts/show-create-table.ts`, `scripts/show-create-unit-types.ts`, `scripts/verify-schema.ts`, `scripts/verify-prospect-journey-security.ts`, `scripts/db-verify-distribution-schema.ts`, `scripts/print-db-target.ts`, `scripts/check-db-schema.ts`, `scripts/check-db-status.ts`, `scripts/check-schema.ts`, `scripts/quick-db-check.ts`, `server/scripts/audit_schema.ts`, `server/scripts/audit_schema_v2.ts`, `server/scripts/check_db-counts.ts`, `server/scripts/check_db_counts.ts`, `server/scripts/quick-check-schema.ts` | Keep only where current package/contract workflow explicitly needs it, with read-only scope and target guard. All others need a separate diagnostic-retention decision. |
| C — data repair/administration | `cleanup-production-data.ts`, `execute-cleanup.ts`, `scripts/cleanup-brand-profiles.ts`, `scripts/cleanup_duplicates.ts`, `scripts/clean-developer-test-data.ts`, `scripts/fix-approval-status.ts`, `scripts/fix-published-at.ts`, `scripts/repair_listing_placeid.ts`, `scripts/repro-superadmin-seed.ts`, `scripts/seed-location-data.ts`, `scripts/seed-provinces-only.ts`, `scripts/seed-provinces.ts`, `scripts/seed-platform-brands.ts`, `server/scripts/fix-unit-data.ts`, `server/scripts/repair-property-media-mirrors.ts`, `server/scripts/revert-unit-data.ts`, `server/scripts/seed-local-users.ts`, `server/scripts/seed-prod-super-admin.ts`, `server/scripts/seed-rich-development-content.ts`, `server/scripts/seedDemoDevelopments.ts`, `server/scripts/seed_super_admin.ts` | Never migration authority. Retain only after explicit target/environment guard, dry-run/confirmation and ownership are designed; otherwise retire. Database necessity is a later evidence question. |
| E — manual/legacy executors besides the named wrappers | `migrations/setup-database.ps1`, `scripts/integrate-subscription-system.ts`, `scripts/push-schema-with-fk-disabled.ts`, `scripts/run-manual-migration.ts`, `scripts/run-migration.ts`, `scripts/run-mission-control-phase1-migrations.ts`, `scripts/run-google-places-migration.ts`, `scripts/run-property-results-optimization-migration.ts`, `scripts/run-tidb-explore-migration.ts`, `scripts/local-db.sh` | Direct execution or legacy/schema tooling. Each must be retired, or—only for the controlled local lifecycle—repointed to the existing canonical local command graph. |
| Test-only, excluded from manual retirement | `scripts/__tests__/localDbWorkflow.test.ts` | Test fixture; it is not a manual production utility. |

The broader name/SQL marker scan found 324 tracked database-adjacent scripts. The remaining 237 are query-only check/debug/seed/test helpers that neither read a retained legacy SQL surface nor create schema in their own source. They are recorded individually in Appendix B as B or C; they are not migration authority and are not a reason to retain a migration tree.

## Environment and invocation risk

The legacy executors commonly import `dotenv/config` or `dotenv`, `server/db`, `server/db-connection`, `mysql2`, or Drizzle. They expect `DATABASE_URL`/DB settings and execute statements with weak “already exists” handling. Their static presence therefore creates an unsafe apparent workflow even when unreachable. A future controlled repair utility must declare target selection, read/write mode, dry-run behavior, confirmation, privilege requirements, audit output, and rollback/recovery strategy.

## Documentation reachability

Current-looking documents requiring Gap 3 correction are: `README.md`, `DATABASE_MANAGEMENT_OPTIONS.md`, `DATABASE_SETUP_GUIDE.md`, `DEVELOPMENT_SUBMISSION_GUIDE.md`, `DEVELOPMENT_WIZARD_SCHEMA_COMPLETE.md`, `EXPLORE_DISCOVERY_MIGRATION_GUIDE.md`, `EXPLORE_PAGE_ERRORS_FIX.md`, `FIX_NOW.md`, `LOCATION_PAGES_IMPLEMENTATION_ROADMAP.md`, `PHASE10_IMPLEMENTATION_GUIDE.md`, `PHASE3_4_IMPLEMENTATION_GUIDE.md`, `PHASE5_LOCATION_INTELLIGENCE_GUIDE.md`, `PHASE8_ADVANCED_LOCATION_INTELLIGENCE_GUIDE.md`, `QUICK_FIX_RAILWAY.md`, `RAILWAY_FIX_EXPLORE_TABLES.md`, `RUN_RAILWAY_MIGRATION_NOW.md`, `RUN_TIDB_MIGRATION_NOW.md`, `SUBSCRIPTION_MODULE_DELIVERABLE.md`, `SUBSCRIPTION_SYSTEM_COMPLETE.md`, `TESTING_EXPLORE_FEED.md`, `TASK_1_DATABASE_SCHEMA_COMPLETE.md`, and `UNIT_TYPES_IMPLEMENTATION_COMPLETE.md`.

The `.kiro/**` specifications, `*_COMPLETE.md` delivery reports, and archived test READMEs are historical/evidence-only references. They must be labelled or archived only when a future documentation pass determines that they are surfaced as current guidance.

## Git-history evidence

The known wrappers were last materially changed between 2025-11-06 and 2026-01-27. The missing-path wrappers date from the 2025 feature implementation sequence; their SQL path was later removed by the Gap 2 authority disposition. `fix_snapshot.js` was last changed on 2026-01-27 but edits generated history rather than a canonical schema model. None has a post-Gap-2 authoritative caller.

## Classification totals

| Metric | Total |
| --- | ---: |
| Direct schema/legacy utility candidates | 87 |
| Manual candidates after excluding one test fixture | 86 |
| A — canonical operational utility | 0 |
| B — verification/diagnostic | 185 (7 direct + 178 query-only) |
| C — data-repair/administrative | 67 (8 direct + 59 query-only) |
| D — superseded schema utility | 55 direct candidates |
| E — broken/non-functional legacy utility | 16 direct candidates |
| F — unresolved canonical utility | 0 |
| Test-only | 1 direct candidate |
| Active package-script references to manual legacy SQL executors | 0 |
| CI references | 0 |
| Startup/deployment references | 0 |
| Missing `drizzle/migrations/**` dependencies | 10 |

## Audit-only conclusion

No manual utility is canonical schema authority. The static evidence supports retiring obsolete utilities first, then deleting their dependent temporary SQL; controlled data repair and diagnostics can be retained only outside migration authority. The detailed legacy-SQL reconciliation and ordered plan are in the companion S3C1 reports.

## Appendix A — direct utility decision matrix

This is the deterministic 87-file direct census used for the totals. `direct caller` is `none found` for every entry except the package-owned contract/local workflow tools already identified above; a file’s self-executing entrypoint is not runtime reachability. `E` means it references a removed legacy SQL surface or directly mutates generated metadata; `D` means a direct DDL/legacy executor superseded by canonical authority.

| Path | Class | Static evidence | Direct caller/exposure | Future disposition |
| --- | --- | --- | --- | --- |
| `add-missing-columns.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `apply-hotfix.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `apply-schema.ts` | D | DDL, SQL file, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `cleanup-production-data.ts` | C | SQL file, DB call | none found outside manual invocation | separate controlled data repair or retire |
| `execute-cleanup.ts` | C | SQL file, DB call | none found outside manual invocation | separate controlled data repair or retire |
| `fix_developments_schema.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `fix_locations_schema.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `generate-hash.ts` | D | SQL file | none found outside manual invocation | retire/repoint; no schema authority |
| `init-db.ts` | D | DDL | none found outside manual invocation | retire/repoint; no schema authority |
| `migrate-schema.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `migrations/setup-database.ps1` | D | DDL, SQL file | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/__tests__/localDbWorkflow.test.ts` | test-only | legacy path/meta, DB call | none found outside manual invocation | retain test-only |
| `scripts/add-developer-columns.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/add-location-id-column.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/add-missing-developer-columns.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/add-portfolio-columns.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/add-portfolio-defaults.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/add-remaining-columns.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/add-remaining-unit-types-columns.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/add-unit-stock-columns.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/apply-financial-migration.ts` | D | SQL file, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/apply-indexes.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/apply-pricing-migration.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/apply-unit-types-migration.ts` | D | SQL file, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/apply-wizard-migration.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/bootstrap-essential-cities.ts` | C | DDL, DB call | none found outside manual invocation | separate controlled data repair or retire |
| `scripts/create-development-phases-table.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/create-listings-tables.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/db-contract-verify.ts` | B | SQL file, DB call | none found outside manual invocation | retain only as bounded diagnostic/contract |
| `scripts/debug-create-development.ts` | D | SQL file | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/debug_schema.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/diagnose-location-pages.ts` | D | DDL, SQL file, legacy path/meta, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/fix-brand-ownership-schema.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/fix-location-pages.ts` | D | DDL, SQL file, legacy path/meta, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/fix-locations-code.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/fix-provinces-schema.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/fix_listings_column.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/fix_schema_drift.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/fix_snapshot.js` | E | legacy path/meta | none found outside manual invocation | retire broken/legacy executor |
| `scripts/integrate-subscription-system.ts` | D | SQL file, legacy path/meta, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/investigate_schema.ts` | B | DDL, DB call | none found outside manual invocation | retain only as bounded diagnostic/contract |
| `scripts/local-db.sh` | D | DDL | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/localDbWorkflow.ts` | D | DDL, legacy path/meta, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/manual_migration_listings.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/migrate-hero-campaigns.ts` | C | DDL, DB call | none found outside manual invocation | separate controlled data repair or retire |
| `scripts/migrate-locations.ts` | C | DDL, DB call | none found outside manual invocation | separate controlled data repair or retire |
| `scripts/push-schema-with-fk-disabled.ts` | E | legacy path/meta, DB call | none found outside manual invocation | retire broken/legacy executor |
| `scripts/quick-subscription-integration.ts` | C | DDL, DB call | none found outside manual invocation | separate controlled data repair or retire |
| `scripts/reproduce_listing_500.ts` | D | SQL file | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/run-activities-migration.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/run-agents-migration.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/run-developer-migration-step-by-step.ts` | D | DDL, SQL file, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/run-developer-migration.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/run-development-location-migration.ts` | E | SQL file, legacy path/meta, DB call | none found outside manual invocation | retire broken/legacy executor |
| `scripts/run-development-wizard-migration.ts` | E | SQL file, legacy path/meta, DB call | none found outside manual invocation | retire broken/legacy executor |
| `scripts/run-enhanced-unit-types-migration.ts` | E | SQL file, legacy path/meta, DB call | none found outside manual invocation | retire broken/legacy executor |
| `scripts/run-google-places-migration.ts` | D | SQL file, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/run-google-places-monitoring-migration.ts` | E | DDL, SQL file, legacy path/meta, DB call | none found outside manual invocation | retire broken/legacy executor |
| `scripts/run-kpi-caching-migration.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/run-listing-performance-e2e.ts` | D | SQL file, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/run-location-performance-migration.ts` | E | DDL, SQL file, legacy path/meta, DB call | none found outside manual invocation | retire broken/legacy executor |
| `scripts/run-manual-migration.ts` | E | SQL file, DB call | none found outside manual invocation | retire broken/legacy executor |
| `scripts/run-migration.ts` | D | DDL, SQL file, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/run-mission-control-phase1-migrations.ts` | E | DDL, SQL file, legacy path/meta, DB call | none found outside manual invocation | retire broken/legacy executor |
| `scripts/run-notifications-migration.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/run-phase-optimization-migration.ts` | E | SQL file, legacy path/meta, DB call | none found outside manual invocation | retire broken/legacy executor |
| `scripts/run-price-insights-indexes.ts` | E | SQL file, legacy path/meta, DB call | none found outside manual invocation | retire broken/legacy executor |
| `scripts/run-property-results-optimization-migration.ts` | D | SQL file, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/run-prospect-journey-e2e.ts` | D | SQL file, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/run-tidb-explore-migration.ts` | D | SQL file, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `scripts/run-unit-types-spec-variations-migration.ts` | E | SQL file, legacy path/meta, DB call | none found outside manual invocation | retire broken/legacy executor |
| `scripts/run-wizard-optimization-migration.ts` | E | SQL file, legacy path/meta, DB call | none found outside manual invocation | retire broken/legacy executor |
| `scripts/run-wizard-v2-migration.ts` | E | SQL file, legacy path/meta, DB call | none found outside manual invocation | retire broken/legacy executor |
| `scripts/schema-sanity-check.mjs` | B | DDL, SQL file | none found outside manual invocation | retain only as bounded diagnostic/contract |
| `scripts/seed-location-data.ts` | C | DDL, SQL file, legacy path/meta, DB call | none found outside manual invocation | separate controlled data repair or retire |
| `scripts/seed-provinces-only.ts` | C | DDL, DB call | none found outside manual invocation | separate controlled data repair or retire |
| `scripts/show-create-table.ts` | B | DDL, DB call | none found outside manual invocation | retain only as bounded diagnostic/contract |
| `scripts/show-create-unit-types.ts` | B | DDL, DB call | none found outside manual invocation | retain only as bounded diagnostic/contract |
| `scripts/verify-prospect-journey-security.ts` | B | DDL, DB call | none found outside manual invocation | retain only as bounded diagnostic/contract |
| `scripts/verify-schema.ts` | B | DDL, DB call | none found outside manual invocation | retain only as bounded diagnostic/contract |
| `server/scripts/apply-approval-schema.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `server/scripts/create-local-db.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `server/scripts/debug-schema.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `server/scripts/verify-fast-track.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `setup-explore-feed.ps1` | E | DDL, SQL file, legacy path/meta | none found outside manual invocation | retire broken/legacy executor |
| `verify-developer-user.ts` | D | DDL, DB call | none found outside manual invocation | retire/repoint; no schema authority |
| `verify-explore-feed.ts` | E | SQL file, legacy path/meta, DB call | none found outside manual invocation | retire broken/legacy executor |

## Appendix B — query-only and data-operation utility matrix

The broad static scan identified 324 database-adjacent manual candidates. Appendix A covers the 87 that directly declare DDL, load SQL, or address legacy metadata. This appendix records the remaining 237: they do not retain a temporary legacy SQL surface, but are still manual query/seed/diagnostic tools. They have no package migration, CI, startup, or deployment authority. The classification is deliberately conservative: read/check/verify/debug tools are B; seed, cleanup, repair, backfill and data-write tools are C. None is a canonical schema utility.

| Path | Primary class | Future disposition |
| --- | --- | --- |
| `ALL_DEVELOPER_COMPONENTS.tsx` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `add-admin-password.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `check-all-data.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `check-db-columns.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `check-production-db.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `check-properties.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `check-real-data.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `check-super-admins.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `check-tables.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `check_db_refs.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `check_table_schema.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `create-basic-user.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `create-super-admin.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `create-test-agent-profile.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `create-test-user.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `database-check.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `debug_properties.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `diagnose-login-v2.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `diagnose-login.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `eslint.config.js` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `fix-typescript-errors.ps1` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `fix_agent.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `fix_property_address.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `list-prod-tables.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `list-users.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `playwright.listing-performance.config.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `playwright.prospect-journey.config.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `quick-check.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/approve-latest-listing.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/backfill-location-ids.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/backfill_listings_locationid.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/brandEmulatorDemo.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-agent-tables.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-alberton-listings.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-bluespace-direct.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-bluespace-profile.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-columns.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-db-ids.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-db-schema.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-db-status.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-developer-columns.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-developer-profile.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-developer-status.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-developers-struct.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-developers-table.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-development-columns-direct.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-development-columns.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-development-images.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-development-location.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-development-phases.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-location-data.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-properties-schema.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-properties.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-property-data.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-property-indexes.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-provinces.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-published-developments.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-schema.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-seed-status.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/check-slug.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-table-struct.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-table.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-triggers.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-ts-nocheck-allowlist.mjs` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-unit-media.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-unit-types-columns.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-unit-types.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check-users-schema.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check_city_counts.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check_columns_concise.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check_db_schema.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check_listing_placeids.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check_prod_data.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check_properties_cols.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/check_row_counts.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/clean-developer-test-data.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/cleanup-brand-profiles.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/cleanup_duplicates.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/create-platform-agency.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/create-test-house.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/create-verified-user.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/db-contract-default-normalization.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/db-verify-distribution-schema.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/debug-db.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/debug-filtering.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/debug-leopards-rest.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/debug-listings.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/debug-slug-isolated.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/debug-slug.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/debug-unit-media.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/debug_query.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/debug_user_status.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/describe-developers-table.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/diagnose-locations.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/diagnose_placeid_mismatch.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/extract-legacy-location-data.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/extract-lovable-components.mjs` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/find-column-global.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/fix-approval-status.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/fix-published-at.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/fix-test-house.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/generate-location-slugs.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/generate-sitemap.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/insert-essential-locations.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/inspect-listings-table.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/inspect-schema-exports.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/inspect_data.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/inspect_details.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/inspect_properties.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/list-all-users.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/list-users-debug.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/list_listings_columns.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/migrate-listings-location-id.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/perform-cleanup.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/print-db-target.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/process-lovable-components.mjs` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/prospectJourneyProcessRunner.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/quick-check.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/quick-db-check.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/repair_listing_placeid.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/repro-500.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/repro-superadmin-seed.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/reset-developments.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/run-location-migration.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/save-table-structs.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/seed-explore-highlight-tags.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/seed-hero-campaign.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/seed-mock-listing.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/seed-platform-brands.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/seed-priority-check.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/seed-provinces.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/seed.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/seed_price_analytics.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/smart_backfill_locations.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/sync-locations-table.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/test-agent-integration.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/test-location-pages.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/test-location-service.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/test-persistence.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/test-phase6-stats.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/test-published-query.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/test-readiness.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/test-search-raw.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/test-search.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/update-brand-provinces.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/update-price.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `scripts/validate-phase4.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/validate-schema-sync.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/verify-agency-attribution.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/verify-bluespace-user.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/verify-db-state.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/verify-development-page.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/verify-development-wizard-schema.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/verify-location-migration.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/verify-login-db.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/verify-login-endpoint.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/verify-mission-control-migrations.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/verify-platform-agency.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/verify-portfolio-fields.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/verify-property-results-optimization-migration.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/verify-prospect-journey-auth.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/verify-prospect-journey-cross-agency.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/verify-showings-migration.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/verify-trpc-router.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/verify-user.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/verify-wizard-e2e.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/verifyPlanVersioning.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `scripts/verify_units.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `seed-agent-test-data.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `seed-data.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `seed-plans.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `seed-sa-locations.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `seed-sandton-properties.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `server/scripts/audit_schema.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/audit_schema_v2.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/check_db-counts.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/check_db_counts.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/check_dev_slug.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/cleanup-developments.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `server/scripts/debug-db.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/debug-hot-selling-data.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/debug-images.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/debug_db_connection.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/debug_dev.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/debug_dev_fetch.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/debug_dev_link.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/debug_show_seed_columns.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `server/scripts/debug_show_users_columns.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/debug_unit_sql.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/fix-unit-data.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `server/scripts/inspect-dev-units.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/inspect-unit-row.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/investigate_210008.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/list_developers.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/localDemoSeed.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `server/scripts/quick-check-schema.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/repair-property-media-mirrors.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `server/scripts/revert-unit-data.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/sanity_test_seed_cleanup.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `server/scripts/seed-local-users.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `server/scripts/seed-prod-super-admin.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `server/scripts/seed-rich-development-content.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `server/scripts/seedDemoDevelopments.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `server/scripts/seed_super_admin.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `server/scripts/show_users_columns.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/simulate-save.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/simulate_service_query.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/verify-approval-workflow.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/verify-dev-service.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/verify-development-validation.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/verify-get-profile.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/verify-hot-selling-final.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/verify-hot-selling.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/verify-hybrid.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/verify-id-fix.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/verify-images-debug.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/verify-local-db.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/verify-publish-sanitization.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/verifyLocalDemoSeed.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `server/scripts/verify_brand_link.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/verify_brand_link_v2.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/verify_developer_fk_fix.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/verify_development_flow.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `server/scripts/verify_seed_cleanup.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `set-admin.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `simple-cleanup.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `test-agent-integration.mjs` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `test-aws-config.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `test-mysql.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `test-simple-db.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `trigger_fix.js` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `update-agent-status.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `update-properties-sa.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `verify-cleanup.ts` | C — data-repair/administrative | retain only as controlled data repair/admin or retire |
| `verify_fix.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `verify_stats.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
| `vitest.setup.ts` | B — verification/diagnostic | retain only as bounded diagnostic or retire |
