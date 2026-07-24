# Database Authority Gap 3 Slice 2 — Diagnostics and Data-Repair Authority Audit

## 1. Executive conclusion

Slice 2 confirms that no manual utility is migration authority. The canonical command graph remains `pnpm db:migrate`, `pnpm db:migrate:test`, and `pnpm db:migrate:local`, all through `server/migrations/runSqlMigrations.ts`; the ledger remains `sql_migration_history`.

The complete reconciliation begins from the prior 324-path broad census: 18 Slice 1-retired paths are absent, 306 remain tracked, and 12 adjacent SQL/local-evidence surfaces bring the traceability ledger to 318 unique paths. Sixteen are trace-only exclusions; 302 are operating or local/test candidates.

Static evidence supports immediate future retirement of direct schema mutators and unowned legacy SQL. It supports retaining only the source-only schema sanity checker and bounded local/demo support as candidates for controlled operation. Retaining any repair, seed, or live-database diagnostic requires explicit ownership and an operating contract; static source cannot establish continuing business need.

`GAP_3_SLICE_2_IMPLEMENTATION_GATE=OPEN_WITH_FOUNDER_DECISIONS`

## 2. Scope and exclusions

This audit covers the manifest direct-candidate set, all manifest repair/diagnostic/local-test allowlists, the deferred utilities with diagnostic/repair/local characteristics, every tracked `scripts/*.sql`, and adjacent local/test SQL. It expanded the boundary through a static scan of tracked `scripts/**` and `server/scripts/**` for database client, SQL, DDL, DML, or target-environment markers.

The complete census contains 318 unique traceability records: 302 operating or local/test candidates and 16 explicit trace-only exclusions. `drizzle/*.sql`, `drizzle/meta/**`, and the broad root `migrations/**` tree remain temporary legacy SQL surfaces for Slice 2E; they are not deleted or reclassified here. Application router query code, schema definitions, the canonical runner, and normal product runtime are excluded except where retained as explicit trace-only evidence.

No repository utility, TypeScript/JavaScript module, SQL, PowerShell, package script, environment file, Docker/MySQL component, migration, seed, repair, diagnostic, or database connection was executed.

## 3. Repository authority and base SHA

The audit worktree branch is `audit/database-authority-diagnostics-data-repair-s3c3`, created clean from `1578b1b41f98f26e82a1a5ce5ab0dc709fd98634` (`main` / `origin/main`). The prior S3C1 reports, Slice 1 implementation report, manifest, and contract were inspected as text. The preserved S3A-5 evidence worktree was not opened, changed, rebased, or cleaned.

## 4. Audit method

Static evidence consisted of Git tracked-file inventory, manifest JSON parsing, package/CI/startup/deployment/document searches, source-line review, literal SQL detection, and a follow-up ORM/API mutation scan. `DDL` means executable schema mutation or a schema-applying SQL artifact. `DML` includes literal SQL and ORM/API writes. `RO` means no write mechanism was proven after both scans. `G+` records only the presence of a possible target-related token and is not proof of an adequate safety guard. `R0` means no direct package or workflow caller was found.

The source line evidence for the highest-risk findings is: `scripts/db-contract-verify.ts:169,344,535,657`; `scripts/schema-sanity-check.mjs:18,106,118,158`; `scripts/quick-db-check.ts:13`; `cleanup-production-data.ts:52,187,233,270,315`; `scripts/localDbWorkflow.ts:36-70,120-127,211-213`; `server/scripts/localDemoSeed.ts:91-132`; and `server/scripts/seed-prod-super-admin.ts:6-64`.

## 5. Quantitative inventory

| Measure | Count | Reconciliation note |
| --- | ---: | --- |
| Manifest direct candidates | 87 | 18 are already retired/absent; 69 source paths remain. |
| Manifest direct controlled-repair candidates | 8 | Six contain schema-capable behavior and cannot remain repairs without replacement; the broader `controlledDataRepairUtilities` allowlist has 16 paths, including eight supplemental repair paths. |
| Manifest direct verification/diagnostic candidates | 7 | Several are actually DDL/test fixtures or lack target controls. |
| Manifest direct test-only candidates | 1 | `scripts/__tests__/localDbWorkflow.test.ts`. |
| Complete traceability ledger | 318 | Prior 324-path census minus 18 Slice 1 retirements plus 12 adjacent SQL/local-evidence surfaces. |
| Operational or local/test candidates | 302 | Genuine utility, script, SQL, or bounded local/test surfaces. |
| Explicit trace-only exclusions | 16 | Catalogued for reconciliation but outside operational utility authority. |
| Recommended schema-mutator retirements | 55 | Source-confirmed DDL, schema application, or legacy schema-execution surfaces. |
| Candidates requiring founder or owner decision | 69 | DML repair, backfill, seed, cleanup, or administrative capabilities. |
| Candidates requiring approved read-only evidence | 148 | Read/debug/check utilities with no approved owner and target contract. |
| Candidates requiring supported-operation replacement | 8 | Current capabilities whose implementation or target contract is incomplete. |
| Candidates retained as local/test-only | 6 | Bounded developer, demo, fixture, and Docker-local support. |
| Recommended dead or redundant retirements | 14 | Uncalled debug, test, example, or superseded operating surfaces. |
| Retained non-executing/read-only diagnostics | 2 | Source-only schema sanity and target-display capabilities. |
| Direct package references to Slice 2 utilities | 13 | Canonical verification, local lifecycle, local demo, and E2E support only. |
| Direct CI references | 0 | CI does not directly invoke an ad-hoc repair or manual schema executor. |
| Direct startup/deployment references | 0 | Release paths reach canonical migration and verification commands only. |
| Current operational documentation instructions to unsafe candidates | 0 | Historical and superseded evidence is not an active authority claim. |

The 318 traceability records reconcile to exactly one final proposed disposition each: 55 `RETIRE_SCHEMA_MUTATOR` + 69 `DEFER_REQUIRES_OWNER_DECISION` + 148 `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` + 8 `REPLACE_WITH_SUPPORTED_OPERATION` + 6 `RETAIN_LOCAL_TEST_ONLY` + 14 `RETIRE_DEAD_OR_REDUNDANT` + 2 `RETAIN_READ_ONLY_DIAGNOSTIC` + 16 `OUT_OF_SCOPE_WITH_REASON` = 318. The 16 out-of-scope records remain in the ledger only for complete reconciliation; the operational/local-test universe is 302.

## 6. Candidate classification summary

### 6.1 Matrix legend and caller graph

`P` is a package command reference; `CI` is a direct workflow reference; `D/S` is deployment/startup. All paths not marked `P` are `R0` in static caller search. Documentation matches were classified through the existing historical/superseded policy; no current operational instruction was found.

| Future disposition | Static operating condition | Caller/owner result | Evidence |
| --- | --- | --- | --- |
| `RETAIN_READ_ONLY_DIAGNOSTIC` | Source-only parsing, no DB client or DML/DDL execution. | Release/schema owner is implicit in existing `schema:sanity` package exposure. | `scripts/schema-sanity-check.mjs:18-32,106-118,158-350`; P. |
| `RETAIN_LOCAL_TEST_ONLY` | Local/test target is explicit; schema application remains delegated to canonical runner, not the utility. | Local developer experience owner; package-local commands only. | `scripts/localDbWorkflow.ts:36-70,120-213`; `server/scripts/localDemoSeed.ts:91-132`; `server/scripts/seed-local-users.ts:10-19`; `docker/mysql-local/init/01-create-local-databases.sql:1-12`. |
| `REPLACE_WITH_SUPPORTED_OPERATION` | Needed verification/local capability but target guard, ownership, or no-write contract is incomplete. | Release engineering/local developer owner must make the supported command explicit. | `scripts/db-contract-verify.ts:169-665`; `scripts/db-verify-distribution-schema.ts:45-63`; package lines 39-79. |
| `RETIRE_SCHEMA_MUTATOR` | Source applies/creates/alters/drops schema, reads legacy SQL to do so, or changes schema as a test fixture. | No current direct caller; canonical baseline/runner supersedes it. | S3C1 audit lines 39-53 and source markers in appendix. |
| `RETIRE_DEAD_OR_REDUNDANT` | Unreferenced legacy SQL or ad-hoc diagnostic duplicated by supported verification. | R0, owner unconfirmed. | Static caller search and S3C1 SQL reconciliation lines 53-67. |
| `DEFER_REQUIRES_OWNER_DECISION` | DML repair/seed/admin capability; need is not provable statically. | Founder must name a product/operations owner. | Repair/seed source evidence in sections 8-10. |
| `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` | RO/debug source but no credible target guard, owner, or production-use case. | Later approved read-only evidence only; not operational approval. | Broad diagnostic ledger below. |
| `OUT_OF_SCOPE_WITH_REASON` | Trace-only historical, configuration, query-example, or ordinary non-utility evidence. | Included in the 318-record reconciliation but excluded from the 302 operational/local-test candidates. | Complete ledger in section 20. |

### 6.2 Current direct-manifest candidates

| Exact paths | Current manifest class | Query type / affected domain | Guard, caller, owner | Proposed disposition |
| --- | --- | --- | --- | --- |
| `add-missing-columns.ts`, `apply-hotfix.ts`, `apply-schema.ts`, `fix_developments_schema.ts`, `fix_locations_schema.ts`, `init-db.ts`, `migrate-schema.ts`, `migrations/setup-database.ps1` | deferred schema executor | DDL; legacy application schema | G-, R0, owner unconfirmed | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/add-developer-columns.ts`, `scripts/add-location-id-column.ts`, `scripts/add-missing-developer-columns.ts`, `scripts/add-portfolio-columns.ts`, `scripts/add-portfolio-defaults.ts`, `scripts/add-remaining-columns.ts`, `scripts/add-remaining-unit-types-columns.ts`, `scripts/add-unit-stock-columns.ts`, `scripts/apply-indexes.ts`, `scripts/apply-pricing-migration.ts`, `scripts/apply-wizard-migration.ts` | deferred schema executor | DDL; developer/location/listing/unit domains | G-, R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/create-development-phases-table.ts`, `scripts/create-listings-tables.ts`, `scripts/debug-create-development.ts`, `scripts/debug_schema.ts`, `scripts/fix-brand-ownership-schema.ts`, `scripts/fix-location-pages.ts`, `scripts/fix-locations-code.ts`, `scripts/fix-provinces-schema.ts`, `scripts/fix_listings_column.ts`, `scripts/fix_schema_drift.ts` | deferred schema executor | DDL/mixed; development/listing/location domains | G-, R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/integrate-subscription-system.ts`, `scripts/manual_migration_listings.ts`, `scripts/run-activities-migration.ts`, `scripts/run-agents-migration.ts`, `scripts/run-developer-migration-step-by-step.ts`, `scripts/run-developer-migration.ts`, `scripts/run-kpi-caching-migration.ts`, `scripts/run-migration.ts`, `scripts/run-notifications-migration.ts`, `scripts/run-tidb-explore-migration.ts`, `server/scripts/apply-approval-schema.ts`, `server/scripts/create-local-db.ts`, `server/scripts/debug-schema.ts`, `server/scripts/verify-fast-track.ts`, `verify-developer-user.ts` | deferred schema executor | DDL/mixed; subscriptions, listings, agents, developer, approval | G-, R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/diagnose-location-pages.ts` | deferred schema executor | Mixed and legacy migration instructions; locations | `DATABASE_URL`, G-, R0 | `REPLACE_WITH_SUPPORTED_OPERATION` only if a read-only location diagnosis is owner-approved; otherwise retire |
| `scripts/run-listing-performance-e2e.ts`, `scripts/run-prospect-journey-e2e.ts` | deferred schema executor | Test DB recreation/DDL fixture | Package-exposed local E2E helpers; target names exist but lifecycle needs containment | `REPLACE_WITH_SUPPORTED_OPERATION` under Slice 2D |
| `scripts/local-db.sh`, `scripts/localDbWorkflow.ts` | deferred schema executor | Local database creation/reset and canonical-runner delegation | P; `localDbWorkflow` has explicit development/APP_ENV/URL/acknowledgement checks | `RETAIN_LOCAL_TEST_ONLY` for workflow; `REPLACE_WITH_SUPPORTED_OPERATION` for shell wrapper until its target guard is contractually checked |
| `scripts/db-contract-verify.ts`, `scripts/db-verify-distribution-schema.ts` | verification / approved verification | SHOW/SELECT only; reads canonical SQL checksums | P and CI-indirect; `DATABASE_URL` required but no explicit target policy | `REPLACE_WITH_SUPPORTED_OPERATION` (retain capability, add target/read-only contract) |
| `scripts/schema-sanity-check.mjs` | verification / approved verification | Repository text parsing only; no connection | P; schema/release owner | `RETAIN_READ_ONLY_DIAGNOSTIC` |
| `scripts/print-db-target.ts` | approved read-only diagnostic | Source-only target display; no DB client, query, or authorization decision | P through `db:target`; release verification capability owner must make output semantics explicit | `RETAIN_READ_ONLY_DIAGNOSTIC` as a non-executing companion to the supported verification capability |
| `scripts/investigate_schema.ts`, `scripts/show-create-table.ts`, `scripts/show-create-unit-types.ts`, `scripts/verify-schema.ts`, `scripts/check-db-schema.ts`, `scripts/check-db-status.ts`, `scripts/check-schema.ts`, `scripts/quick-db-check.ts` | verification / approved diagnostic | SHOW/DESCRIBE/SELECT; `show-create-table.ts` also writes a local output file | G-; R0 except `quick-db-check.ts` loads `.env.production` | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE`; `quick-db-check.ts` is `RETIRE_DEAD_OR_REDUNDANT` |
| `scripts/verify-prospect-journey-security.ts` | verification or diagnostic | DML plus temporary CREATE/DROP INDEX fixture | E2E database URL but no bounded test fixture contract | `RETIRE_SCHEMA_MUTATOR` or replace with owned isolated test fixture |
| `scripts/__tests__/localDbWorkflow.test.ts` | test-only | Test fixture with mocked/local workflow mutations | Not a manual operator entrypoint | `RETAIN_LOCAL_TEST_ONLY` |
| `generate-hash.ts`, `scripts/run-property-results-optimization-migration.ts`, `scripts/reproduce_listing_500.ts`, `scripts/run-google-places-migration.ts` | deferred schema executor | DML/unclear legacy behavior | G-, R0, no current owner | `DEFER_REQUIRES_OWNER_DECISION` for DML; `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` for unclear paths |
| `cleanup-production-data.ts`, `execute-cleanup.ts` | controlled data repair | Broad DML cleanup; backup, dry-run, transaction/rollback present | `DATABASE_URL`; production-oriented; no caller/owner | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/bootstrap-essential-cities.ts`, `scripts/migrate-hero-campaigns.ts`, `scripts/migrate-locations.ts`, `scripts/quick-subscription-integration.ts`, `scripts/seed-location-data.ts`, `scripts/seed-provinces-only.ts` | controlled data repair | Source contains DDL/mixed migration behavior | G-, R0 | `RETIRE_SCHEMA_MUTATOR` |

The 18 manifest retired paths are absent, remain explicitly prohibited, and are not reclassified by Slice 2.

### 6.3 Supplemental repair, seed, and local/test candidates

| Exact paths | Static behaviour and target controls | Proposed disposition |
| --- | --- | --- |
| `scripts/cleanup-brand-profiles.ts`, `scripts/cleanup_duplicates.ts`, `scripts/clean-developer-test-data.ts`, `scripts/fix-approval-status.ts`, `scripts/fix-published-at.ts`, `scripts/repair_listing_placeid.ts`, `server/scripts/fix-unit-data.ts`, `server/scripts/repair-property-media-mirrors.ts`, `server/scripts/revert-unit-data.ts`, `server/scripts/cleanup-developments.ts` | DML repair/cleanup; no package/CI caller or confirmed owner; several rely only on `DATABASE_URL` or no target selection. | `DEFER_REQUIRES_OWNER_DECISION` |
| `server/scripts/localDemoSeed.ts`, `server/scripts/verifyLocalDemoSeed.ts`, `server/scripts/seed-local-users.ts`, `docker/mysql-local/init/01-create-local-databases.sql` | Local/test-only; explicit production refusal/local host or local DB name controls, or Docker-local init only. `localDemoSeed` has idempotent cleanup by local-demo identifiers. | `RETAIN_LOCAL_TEST_ONLY` |
| `server/scripts/sanity_test_seed_cleanup.ts`, `server/scripts/sanity_test_seed_cleanup.sql` | Test seed DML and optional-table handling, but no adequate target/owner contract in source. | `REPLACE_WITH_SUPPORTED_OPERATION` under Slice 2D |
| `server/scripts/seed-prod-super-admin.ts` | Explicitly loads `.env.production` and upserts a production admin. No package caller or confirmed owner. | `DEFER_REQUIRES_OWNER_DECISION` with default retirement |
| `scripts/seed-platform-brands.ts`, `scripts/seed-provinces.ts`, `server/scripts/seed-rich-development-content.ts`, `server/scripts/seedDemoDevelopments.ts`, `server/scripts/seed_super_admin.ts` | DML seed; source either lacks adequate target guard or is not package-reachable. | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/debug_schema.sql`, `scripts/manual_schema_verify.sql`, `scripts/verify_unit_types_schema.sql` | Read-only/verification SQL by content; no caller, owner, or target guard. | `RETIRE_DEAD_OR_REDUNDANT` unless an owner adopts a guarded diagnostic |
| `scripts/fix-agents-table.sql`, `scripts/fix-listings-schema.sql`, `scripts/fix_schema_drift.sql`, `scripts/manual_unit_migration.sql` | DDL and/or DML legacy repair SQL; no approved caller. | `RETIRE_SCHEMA_MUTATOR` |
| `server/scripts/init-local-db.sql` | Legacy local init example; no approved caller; not canonical local lifecycle. | `RETIRE_DEAD_OR_REDUNDANT` |
| `backups/cleanup-backup-2026-01-29T20-02-35-220Z.sql` | Historical cleanup backup retained as manifest evidence only; no execution caller or current operating instruction. | `OUT_OF_SCOPE_WITH_REASON` (historical evidence, not an operator utility) |
| `server/routes/SELECT id, name, userId.sql` | Query example, not a utility or executable authority surface. | `OUT_OF_SCOPE_WITH_REASON` |

### 6.4 Abbreviated cohort summary

The grouped rows below provide an abbreviated cohort view. Section 20 is the authoritative one-row-per-path ledger and supersedes any cohort total implied by this section.

| Exact paths | Actual static behaviour / controls | Proposed disposition |
| --- | --- | --- |
| `scripts/check-development-columns-direct.ts`; `scripts/check-property-indexes.ts`; `scripts/migrate-listings-location-id.ts`; `scripts/repro-superadmin-seed.ts`; `scripts/run-location-migration.ts`; `scripts/seed-mock-listing.ts`; `scripts/seed.ts`; `scripts/sync-locations-table.ts`; `scripts/verify-location-migration.ts`; `scripts/verify-trpc-router.ts`; `scripts/verify-wizard-e2e.ts`; `scripts/verifyPlanVersioning.ts`; `server/scripts/sanity_test_seed_cleanup.ts`; `server/scripts/verify-approval-workflow.ts`; `server/scripts/verify-dev-service.ts`; `server/scripts/verify_development_flow.ts` | DDL marker or explicit schema fixture; no direct package/CI/deployment caller except test-like names; no approved migration authority. | `RETIRE_SCHEMA_MUTATOR` or replace with owned local/test fixture where a product test owner proves need. |
| `scripts/backfill-location-ids.ts`; `scripts/backfill_listings_locationid.ts`; `scripts/check-developer-profile.ts`; `scripts/check-developers-table.ts`; `scripts/check-published-developments.ts`; `scripts/check-slug.ts`; `scripts/check-users-schema.ts`; `scripts/debug-db.ts`; `scripts/debug_user_status.ts`; `scripts/diagnose-locations.ts`; `scripts/fix-test-house.ts`; `scripts/list-users-debug.ts`; `scripts/perform-cleanup.ts`; `scripts/seed-explore-highlight-tags.ts`; `scripts/seed-hero-campaign.ts`; `scripts/seed-priority-check.ts`; `scripts/seed_price_analytics.ts`; `scripts/smart_backfill_locations.ts`; `scripts/validate-schema-sync.ts`; `scripts/verify-bluespace-user.ts`; `scripts/verify-mission-control-migrations.ts`; `scripts/verify-prospect-journey-auth.ts`; `scripts/verify-prospect-journey-cross-agency.ts`; `scripts/verify-user.ts`; `server/scripts/cleanup-developments.ts`; `server/scripts/debug_db_connection.ts`; `server/scripts/verify-publish-sanitization.ts`; `server/scripts/verify_seed_cleanup.ts` | DML marker; G-, R0, no current owner. Tables/domains are named by path (locations, listings, users, seeds, prospects, developments). | `DEFER_REQUIRES_OWNER_DECISION`; default retirement where no capability owner accepts an operating contract. |
| `scripts/check-agent-tables.ts`; `scripts/check-alberton-listings.ts`; `scripts/check-bluespace-direct.ts`; `scripts/check-bluespace-profile.ts`; `scripts/check-columns.ts`; `scripts/check-db-ids.ts`; `scripts/check-developer-columns.ts`; `scripts/check-developer-status.ts`; `scripts/check-developers-struct.ts`; `scripts/check-development-columns.ts`; `scripts/check-development-images.ts`; `scripts/check-development-location.ts`; `scripts/check-development-phases.ts`; `scripts/check-location-data.ts`; `scripts/check-properties-schema.ts`; `scripts/check-properties.ts`; `scripts/check-property-data.ts`; `scripts/check-seed-status.ts`; `scripts/check-table-struct.ts`; `scripts/check-table.ts`; `scripts/check-triggers.ts`; `scripts/check-unit-media.ts`; `scripts/check-unit-types-columns.ts`; `scripts/check-unit-types.ts`; `scripts/check_city_counts.ts`; `scripts/check_columns_concise.ts`; `scripts/check_db_schema.ts`; `scripts/check_listing_placeids.ts`; `scripts/check_prod_data.ts`; `scripts/check_properties_cols.ts`; `scripts/check_row_counts.ts`; `scripts/debug-filtering.ts`; `scripts/debug-leopards-rest.ts`; `scripts/debug-listings.ts`; `scripts/debug-slug-isolated.ts`; `scripts/debug-unit-media.ts`; `scripts/diagnose_placeid_mismatch.ts`; `scripts/inspect-listings-table.ts`; `scripts/inspect_data.ts`; `scripts/inspect_details.ts`; `scripts/inspect_properties.ts`; `scripts/quick-check.ts`; `scripts/verify-agency-attribution.ts`; `scripts/verify-db-state.ts`; `scripts/verify-development-wizard-schema.ts`; `scripts/verify-login-db.ts`; `scripts/verify-platform-agency.ts`; `scripts/verify-portfolio-fields.ts`; `scripts/verify-property-results-optimization-migration.ts`; `scripts/verify-showings-migration.ts`; `scripts/verify_units.ts`; `server/scripts/audit_schema.ts`; `server/scripts/audit_schema_v2.ts`; `server/scripts/check_db-counts.ts`; `server/scripts/check_db_counts.ts`; `server/scripts/check_dev_slug.ts`; `server/scripts/debug-db.ts`; `server/scripts/debug-hot-selling-data.ts`; `server/scripts/debug-images.ts`; `server/scripts/debug_dev.ts`; `server/scripts/debug_dev_fetch.ts`; `server/scripts/debug_show_seed_columns.ts`; `server/scripts/debug_show_users_columns.ts`; `server/scripts/debug_unit_sql.ts`; `server/scripts/inspect-dev-units.ts`; `server/scripts/inspect-unit-row.ts`; `server/scripts/quick-check-schema.ts`; `server/scripts/show_users_columns.ts`; `server/scripts/verify-development-validation.ts`; `server/scripts/verify-id-fix.ts`; `server/scripts/verify-images-debug.ts`; `server/scripts/verify-local-db.ts`; `server/scripts/verify_brand_link.ts`; `server/scripts/verify_brand_link_v2.ts`; `server/scripts/verify_developer_fk_fix.ts` | RO marker only, but G-/R0 and no owner. Some read `DATABASE_URL`; none has a static production denylist sufficient for operational approval. | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` (or retire as redundant). |
| `scripts/debug-slug.ts`; `scripts/debug_query.ts`; `scripts/verify-development-page.ts`; `server/scripts/verify-get-profile.ts` | Database-adjacent/unclear source; no trustworthy query classification, caller, owner, or guard. | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |

## 7. Read-only diagnostic findings

Only `scripts/schema-sanity-check.mjs` is proven source-only: it parses the canonical baseline and schema inventory and does not create a connection. `scripts/print-db-target.ts` is a target-display utility rather than a database query; it should be retained only with the release verification capability because it makes no authorization decision itself.

`scripts/db-contract-verify.ts` and `scripts/db-verify-distribution-schema.ts` use SHOW/SELECT and checksum reads, but both open `DATABASE_URL` directly. They are important current package capabilities, yet their source lacks a target policy/owner declaration; Slice 2B should make their read-only intent and target reporting explicit rather than treating them as migration authority. `quick-db-check.ts` is not approvable: it explicitly loads `.env.production`.

The 148 provisional read-only-evidence paths are not approved diagnostics. Their target selection is usually ambient `DATABASE_URL`, imported connection defaults, or another unowned mechanism. Only three are package-referenced, 146 have no adequate guard, and no static evidence establishes a current operational owner. They remain deferred evidence candidates, not implicitly retained tools.

## 8. Data-repair findings

`cleanup-production-data.ts` is the clearest risk: it parses `DATABASE_URL`, can invoke `mysqldump`, has dry-run and transactional rollback, but still issues broad DELETE operations across discovered tables. Those mechanics are not a product owner, production target allowlist, confirmation policy, or approved restoration plan. `execute-cleanup.ts` has the same unresolved operating purpose.

The manifest is materially inaccurate as an operational classification: six of its eight direct `controlled data repair` candidates contain DDL or migration behaviour and must not be retained as repair utilities. The remaining repair/cleanup scripts perform DML without confirmed business ownership, caller, target control, audit log, or restoration contract. None is migration authority.

## 9. Seed and local/test findings

`server/scripts/localDemoSeed.ts` is the strongest retained local/test candidate: it rejects production, requires `LOCAL_SEED_ALLOWED=true`, validates local/Docker host names and rejects production database names. `scripts/localDbWorkflow.ts` similarly requires development mode, rejects production/staging, validates MySQL URL/database naming, and requires a destructive reprovision acknowledgement. Both remain support operations, not schema authority; schema application must remain delegated to the canonical runner.

`server/scripts/seed-local-users.ts` has a localhost check but needs an explicit local/test contract in the future manifest. `server/scripts/seed-prod-super-admin.ts` is a production-writing exception that loads `.env.production`; it cannot be silently retained. The `sanity_test_seed_cleanup` pair creates/deletes data and has no adequate target contract in the source; it needs replacement with a bounded test fixture or retirement.

## 10. SQL findings

The seven tracked `scripts/*.sql` files split into three read-only verification examples and four schema/data repair files. There was no direct script caller, package command, CI job, startup path, deployment command, or current operational guide for any of them. The read-only examples are redundant until an owner adopts them behind target safeguards; the four mutation files are retirement candidates.

Adjacent local/test SQL is not canonical migration authority: Docker local DB init is bounded local/test setup; `server/scripts/init-local-db.sql` is a legacy example; `server/scripts/sanity_test_seed_cleanup.sql` is a test fixture requiring containment; and `server/routes/SELECT id, name, userId.sql` is a query example outside the operational-utility boundary.

## 11. Reference and command graph

Current package exposure is limited to canonical migration commands, `db:verify`, `db:verify:distribution`, `schema:sanity`, `db:target`, the local lifecycle wrapper, local migration through the canonical runner, and local demo seed/verification. CI uses canonical migration/verification commands; deployment/release reaches canonical migration commands only. No direct package, CI, startup, or deployment reference reaches a legacy repair, seed, or manual schema mutator.

`scripts/local-db.sh` and `scripts/localDbWorkflow.ts` are package-reachable local lifecycle support. `server/scripts/localDemoSeed.ts` and `server/scripts/verifyLocalDemoSeed.ts` are package-reachable local/test demo support. The remaining matrix paths are manual-only (`R0`) or historical/documentation text. No current documentation grants a deferred path migration authority.

## 12. Misclassification and coverage gaps

1. The manifest’s direct `controlled data repair` class includes schema-capable utilities (`bootstrap-essential-cities`, hero/location/subscription migration helpers, and location/province seed helpers). This conflicts with Slice 2’s rule that schema mutation is never data repair.
2. The direct diagnostic class includes an E2E security script that INSERTs/UPDATEs and creates/drops an index. It is not an operational read-only diagnostic.
3. Approved diagnostics such as `quick-db-check.ts` load production environment files or lack target guards; their allowlist is not proof of safe operation.
The prior 324-path broad census reconciles to 318 current traceability records: 18 Slice 1-retired paths are absent and 12 adjacent SQL/local-evidence surfaces were added. The manifest remains authoritative for direct migration-executor containment, while section 20 provides the complete Slice 2 operational reconciliation.
5. `scripts/*.sql` has no current caller but remains tracked as executable-looking SQL. That is a later Slice 2E cleanup dependency, not canonical authority.

## 13. Founder decision register

| Capability | Paths | Product area / likely reason | Default and minimum decision | Later evidence / safe environment | Can static Slice 2 proceed? |
| --- | --- | --- | --- | --- | --- |
| Production-wide cleanup | `cleanup-production-data.ts`, `execute-cleanup.ts`, `scripts/perform-cleanup.ts` | Operations/data hygiene | Retire unless Operations/Data owner accepts a named use case, approver, backup/rollback, and deletion scope. | Approved read-only inventory on disposable/local clone first; production needs separate approval. | Yes, authority containment can proceed. |
| Location/listing backfill and repair | location backfill/sync/repair paths in matrix | Location quality, listing attribution | Retire schema paths; owner must decide whether a DML-only repair capability remains. | Read-only counts/IDs in approved disposable environment. | Yes. |
| Admin/user repair and super-admin seed | approval/user/brand/profile repairs; `seed-prod-super-admin.ts` | Account recovery/admin bootstrap | Default retire production seed; founder must name security owner and break-glass policy. | No DB evidence until security owner approves; local fixture only for implementation tests. | Yes. |
| Local demo and seed fixtures | local workflow/demo/local-user/seed paths | Developer experience and demos | Retain only named local/test flow; owner accepts local host/db-name guard and cleanup contract. | Local disposable DB only, separately approved. | Yes. |
| Broad read/debug/check toolbox | 148 provisional read-only-evidence paths | Historical investigation and ad-hoc verification | Default retire unless an engineering or operations owner names a current capability and accepts a target/read-only contract. | Read-only query review in an approved disposable/local environment. | Yes. |

## 14. Proposed ordered implementation slices

1. **Slice 2A — schema-mutator retirement:** delete or contain the 55 source-confirmed schema-mutator candidates after a final caller and evidence review. This is static-only and requires no database access.
2. **Slice 2B — supported diagnostic hardening:** give `db-contract-verify`, distribution verification, target display, and schema sanity an explicit owner, read-only contract, target reporting/denylist, and contract assertions. Static implementation; database proof is not required for authority containment.
3. **Slice 2C — controlled repair ownership:** implement only founder-approved DML capabilities with confirmation, dry-run, target allowlist, transaction/rollback, audit output, and restoration playbook. Requires owner decisions; later read-only evidence may be needed.
4. **Slice 2D — local/test containment:** narrow local shell/workflow/demo/seed support to disposable targets and ensure production package/deployment cannot reach it. Static hardening first; later local lifecycle evidence needs separate authorization.
5. **Slice 2E — SQL reconciliation:** delete or contain `scripts/*.sql`, `server/scripts/init-local-db.sql`, test SQL, and other now-unreferenced temporary SQL only after callers and operating owners are resolved.

## 15. Validation plan for each implementation slice

| Slice | Static validation | Later runtime/evidence boundary |
| --- | --- | --- |
| 2A | Candidate deletion list, caller search, manifest/contract mutation checks, `git diff --check`. | None. |
| 2B | No-DDL/no-DML source assertions, explicit target-guard tests, package/CI graph. | Optional approved read-only diagnostic proof only. |
| 2C | Owner register, operating-contract review, no migration-authority assertion. | Separate approved read-only inventory; execution needs a separate operation approval. |
| 2D | Package/deployment denylist, local/test target contract, fixture reference graph. | Disposable local DB only, separately authorized. |
| 2E | SQL inventory, checksum/caller/docs graph, manifest and authority-contract assertions. | None for deletion/containment. |

## 16. Restoration and recovery approach

All future static retirements are recoverable by Git revert or restoring a named path from the pre-slice commit. Retiring a utility is not a claim that any live data is repaired. Any accepted DML operation must supply its own backup/export, transaction/rollback, idempotency, and audit-output plan; Git cannot restore changed data.

## 17. Database-dependent questions

Static evidence cannot prove whether a particular production cleanup, place-ID repair, location backfill, admin bootstrap, or legacy seed is still business-critical. The minimum later evidence is an owner-approved, read-only inventory query against a disposable/local approved environment, with the query and target reviewed before connection. No production connection is recommended or authorized by this audit.

## 18. Final implementation gate

`GAP_3_SLICE_2_IMPLEMENTATION_GATE=OPEN_WITH_FOUNDER_DECISIONS`

Static 2A retirement and 2B/2D authority hardening can proceed without database access. Retention or redesign of any DML repair/seed requires founder ownership decisions. Later database evidence is separately gated and does not block safe static retirement.

## 19. Exact file appendix

The audit patch changes only this report and the one exact manifest evidence entry. Source inventory was built from tracked `scripts/**`, `server/scripts/**`, `server/db/**`, manifest allowlists, `scripts/*.sql`, and adjacent local/test SQL. Evidence locations include `package.json:39-79`, `server/migrations/README.md:43-70`, `docs/database-authority/migration-tree-authority.json:1-154`, S3C1 audit lines 39-56 and 100-430, and S3C1 SQL reconciliation lines 53-67 and 215-235.

The report itself is an evidence-only historical document. Any quoted retired command or unsafe utility name is non-operational evidence, never an instruction to execute it.

## 20. Mechanical complete candidate ledger

This appendix is the authoritative path-level ledger for Slice 2. It reconciles the prior 324-path broad census by removing the 18 Slice 1-retired paths and adding 12 adjacent SQL/local-evidence surfaces, producing 318 unique traceability records. Sixteen records are retained only for traceability and are explicitly outside operational utility authority; the remaining 302 records are operating or local/test surfaces.

The ledger records static source evidence only. `DB@`, `DDL@`, `DML@`, and `SQL@` identify the first matching source lines. `G+` records the presence of a possible target-related token and is not, by itself, proof of a sufficient safety guard. `R0` means no direct package or workflow reference was found. Sixteen ORM/API database writers initially missed by literal SQL matching were manually reclassified before this appendix was produced.

| Path | Prior class/cohort | Static mode and source evidence | Environment/guard signal | Caller graph | Final proposed disposition |
| --- | --- | --- | --- | --- | --- |
| `ALL_DEVELOPER_COMPONENTS.tsx` | B — verification/diagnostic | read; SQL@333,384,389 | env: -; G- | R0/R0 | `OUT_OF_SCOPE_WITH_REASON` |
| `add-admin-password.ts` | B — verification/diagnostic | read; DB@8,9,10; SQL@33,41 | env: -; G+ localhost | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `add-missing-columns.ts` | D | schema; DB@6; DDL@23,38,53 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `apply-hotfix.ts` | D | schema; DB@3,4; DDL@19 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `apply-schema.ts` | D | schema; DB@1,14,22; DDL@24,25 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `backups/cleanup-backup-2026-01-29T20-02-35-220Z.sql` | historical backup supplementary | none/unclear; no direct DB mechanism proven | env: -; G- | R0/R0 | `OUT_OF_SCOPE_WITH_REASON` |
| `check-all-data.ts` | B — verification/diagnostic | read; DB@2,12,15; SQL@49,63 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `check-db-columns.ts` | B — verification/diagnostic | read; DB@6,7; SQL@22 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `check-production-db.ts` | B — verification/diagnostic | read; DB@2,11,14; SQL@51,66 | env: DATABASE_URL; G+ production | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `check-properties.ts` | B — verification/diagnostic | read; DB@1,2; SQL@12 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `check-real-data.ts` | B — verification/diagnostic | read; DB@1,11,12; SQL@19,24,30 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `check-super-admins.ts` | B — verification/diagnostic | read; DB@2,3,4; SQL@18,32 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `check-tables.ts` | B — verification/diagnostic | read; DB@6; SQL@23,27,28 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `check_db_refs.ts` | B — verification/diagnostic | read; DB@3,4,5; SQL@15,25,28 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `check_table_schema.ts` | B — verification/diagnostic | read; DB@2,3; SQL@18,32 | env: DB_NAME; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `cleanup-production-data.ts` | C | data; DB@5,34,52; DML@315,320,353 | env: DATABASE_URL; G+ production | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `create-basic-user.ts` | C — data-repair/administrative | data; DB@6; DML@32 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `create-super-admin.ts` | C — data-repair/administrative | read; DB@6,7,8; SQL@2,3,31 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `create-test-agent-profile.ts` | C — data-repair/administrative | read; DB@2,3,4; SQL@7,24,43 | env: -; G+ localhost | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `create-test-user.ts` | C — data-repair/administrative | read; DB@8,62,63; SQL@2,3,18 | env: DATABASE_URL; G+ localhost | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `database-check.ts` | B — verification/diagnostic | read; DB@2,11,12; SQL@41,45,55 | env: DATABASE_URL; G+ production | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `debug_properties.ts` | B — verification/diagnostic | read; DB@3,4,5; SQL@12,28,32 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `diagnose-login-v2.ts` | B — verification/diagnostic | read; DB@2,3,4; SQL@17,24 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `diagnose-login.ts` | B — verification/diagnostic | read; DB@7,8,19; SQL@42,46,48 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `docker/mysql-local/init/01-create-local-databases.sql` | local SQL supplementary | schema; DDL@1,2 | env: -; G- | R0/R0 | `RETAIN_LOCAL_TEST_ONLY` |
| `eslint.config.js` | B — verification/diagnostic | read; DB@120,126 | env: -; G- | R0/R0 | `OUT_OF_SCOPE_WITH_REASON` |
| `execute-cleanup.ts` | C | data; DB@2,13,18; DML@93,96 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `fix-typescript-errors.ps1` | C — data-repair/administrative | read; DB@1 | env: -; G+ production | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `fix_agent.ts` | C — data-repair/administrative | read; DB@4,5,6; SQL@19,28,31 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `fix_developments_schema.ts` | D | schema; DB@2,3; DDL@35 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `fix_locations_schema.ts` | D | schema; DB@2,3; DDL@17,24,32 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `fix_property_address.ts` | C — data-repair/administrative | read; DB@3,4,5; SQL@12,18 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `generate-hash.ts` | D | none/unclear; no direct DB mechanism proven | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `init-db.ts` | D | schema; DB@3; DDL@24,44,65 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `list-prod-tables.ts` | B — verification/diagnostic | read; DB@1,3,5; SQL@21 | env: DATABASE_URL; G+ production | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `list-users.ts` | B — verification/diagnostic | read; DB@2,3; SQL@15 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `migrate-schema.ts` | D | schema; DB@1,2,5; DDL@13,26,30 | env: DATABASE_URL; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `migrations/setup-database.ps1` | D | schema; DB@19,20,22; DDL@38 | env: -; G+ localhost | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `playwright.listing-performance.config.ts` | B — verification/diagnostic | read; DB@8 | env: DATABASE_URL; G+ localhost | R0/R0 | `OUT_OF_SCOPE_WITH_REASON` |
| `playwright.prospect-journey.config.ts` | B — verification/diagnostic | read; DB@6 | env: DATABASE_URL; G+ localhost | R0/R0 | `OUT_OF_SCOPE_WITH_REASON` |
| `quick-check.ts` | B — verification/diagnostic | read; DB@12,13,14; SQL@32 | env: DATABASE_URL; G+ production | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/__tests__/localDbWorkflow.test.ts` | test-only | read; DB@16,40,44; SQL@4,22,38 | env: APP_ENV,DATABASE_URL,NODE_ENV; G+ 127.0.0.1,production,staging,APP_ENV,NODE_ENV | R0/R0 | `RETAIN_LOCAL_TEST_ONLY` |
| `scripts/add-developer-columns.ts` | D | schema; DB@1,7,8; DDL@41,55,66 | env: DATABASE_URL; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/add-location-id-column.ts` | D | schema; DB@1,7,8; DDL@27,35,44 | env: DATABASE_URL; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/add-missing-developer-columns.ts` | D | schema; DB@1,7,8; DDL@34,45,55 | env: DATABASE_URL; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/add-portfolio-columns.ts` | D | schema; DB@2,3; DDL@27,39,51 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/add-portfolio-defaults.ts` | D | schema; DB@2,3; DDL@13 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/add-remaining-columns.ts` | D | schema; DB@2; DDL@14,15,16 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/add-remaining-unit-types-columns.ts` | D | schema; DB@2; DDL@14,15,16 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/add-unit-stock-columns.ts` | D | schema; DB@1; DDL@14,29 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/apply-indexes.ts` | D | schema; DB@2,3; DDL@14,15,16 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/apply-pricing-migration.ts` | D | schema; DB@1,2; DDL@11,12,13 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/apply-wizard-migration.ts` | D | schema; DB@2,3; DDL@13,25,37 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/approve-latest-listing.ts` | C — data-repair/administrative | read; DB@2,3,4; SQL@16 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/backfill-location-ids.ts` | C — data-repair/administrative | read; DB@10,11,12; SQL@25,41,43 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/backfill_listings_locationid.ts` | C — data-repair/administrative | read; DB@3,4,12; SQL@11,15,23 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/bootstrap-essential-cities.ts` | C | schema; DB@9,10; DDL@20,37; DML@90,139 | env: -; G+ localhost | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/brandEmulatorDemo.ts` | B — verification/diagnostic | read; SQL@15,128,150 | env: -; G+ localhost | R0/R0 | `OUT_OF_SCOPE_WITH_REASON` |
| `scripts/check-agent-tables.ts` | B — verification/diagnostic | read; DB@2,8,13; SQL@13,18,24 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-alberton-listings.ts` | B — verification/diagnostic | read; DB@1,2,3; SQL@11,34 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-bluespace-direct.ts` | B — verification/diagnostic | read; DB@1,7,8; SQL@19,39 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-bluespace-profile.ts` | B — verification/diagnostic | read; DB@1,14,15; SQL@13,31 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-columns.ts` | B — verification/diagnostic | read; DB@2; SQL@14 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-db-ids.ts` | B — verification/diagnostic | read; DB@5,6,7; SQL@17,21 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-db-schema.ts` | B — verification/diagnostic | read; DB@1,2; SQL@16,22 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-db-status.ts` | B — verification/diagnostic | read; DB@7,13,17; SQL@17,22,26 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-developer-columns.ts` | B — verification/diagnostic | read; DB@1,7,8; SQL@18 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-developer-profile.ts` | B — verification/diagnostic | read; DB@6,15,16; SQL@24,35,54 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-developer-status.ts` | B — verification/diagnostic | read; DB@2,3; SQL@15,29 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-developers-struct.ts` | B — verification/diagnostic | read; DB@2,8; SQL@9 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-developers-table.ts` | B — verification/diagnostic | read; DB@1,7,8; SQL@16,25 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-development-columns-direct.ts` | B — verification/diagnostic | read; DB@1,13,14; SQL@12,24,46 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-development-columns.ts` | B — verification/diagnostic | read; DB@1; SQL@11,33 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-development-images.ts` | B — verification/diagnostic | read; DB@1,2,3; SQL@15 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-development-location.ts` | B — verification/diagnostic | read; DB@8,13,25; SQL@30,65,78 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-development-phases.ts` | B — verification/diagnostic | read; DB@1; SQL@15,22,30 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-location-data.ts` | B — verification/diagnostic | read; DB@2,3,4; SQL@28,32 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-properties-schema.ts` | B — verification/diagnostic | read; DB@2,8,9; SQL@14 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-properties.ts` | B — verification/diagnostic | read; DB@2,3,4; SQL@15 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-property-data.ts` | B — verification/diagnostic | read; DB@2,3,4; SQL@15 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-property-indexes.ts` | B — verification/diagnostic | read; DB@1,13,14; SQL@12,24 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-provinces.ts` | B — verification/diagnostic | read; DB@2,3; SQL@7 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-published-developments.ts` | B — verification/diagnostic | read; DB@1,2,3; SQL@15,33,52 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-schema.ts` | B — verification/diagnostic | read; DB@5,6; SQL@17 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-seed-status.ts` | C — data-repair/administrative | read; DB@2,3,5; SQL@16 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/check-slug.ts` | B — verification/diagnostic | read; DB@2,3,4; SQL@16,46 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/check-table-struct.ts` | B — verification/diagnostic | read; DB@2,7; SQL@8 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-table.ts` | B — verification/diagnostic | read; DB@2,3; SQL@10 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-triggers.ts` | B — verification/diagnostic | read; DB@2,7; SQL@8 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-ts-nocheck-allowlist.mjs` | B — verification/diagnostic | none/unclear; no direct DB mechanism proven | env: -; G- | P/R0 | `OUT_OF_SCOPE_WITH_REASON` |
| `scripts/check-unit-media.ts` | B — verification/diagnostic | read; DB@8,13,25; SQL@31 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-unit-types-columns.ts` | B — verification/diagnostic | read; DB@2; SQL@14 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-unit-types.ts` | B — verification/diagnostic | read; DB@8,13,25; SQL@31,45,55 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check-users-schema.ts` | B — verification/diagnostic | read; DB@1,7,8; SQL@16,25 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check_city_counts.ts` | B — verification/diagnostic | read; DB@1,2,3; SQL@10 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check_columns_concise.ts` | B — verification/diagnostic | read; DB@3,4; SQL@11,20 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check_db_schema.ts` | B — verification/diagnostic | read; DB@3,4; SQL@10,15,21 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check_listing_placeids.ts` | B — verification/diagnostic | read; DB@3,4; SQL@12,25,30 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check_prod_data.ts` | B — verification/diagnostic | read; DB@2,5; SQL@21,33 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check_properties_cols.ts` | B — verification/diagnostic | read; DB@3,4; SQL@11,20 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/check_row_counts.ts` | B — verification/diagnostic | read; DB@3,4; SQL@10,14,21 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/clean-developer-test-data.ts` | C — data-repair/administrative | data; DB@6,15,16; DML@103,111,121 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/cleanup-brand-profiles.ts` | C — data-repair/administrative | read; DB@13,18,30; SQL@6,37,51 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/cleanup_duplicates.ts` | C — data-repair/administrative | data; DB@3,4; DML@14 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/create-development-phases-table.ts` | D | schema; DB@1; DDL@26,55,59 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/create-listings-tables.ts` | D | schema; DB@2,3; DDL@15,68,97 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/create-platform-agency.ts` | C — data-repair/administrative | data; DB@11,16,28; DML@45,95,126 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/create-test-house.ts` | C — data-repair/administrative | read; DB@2,3,4; SQL@36,37,68 | env: -; G+ localhost | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/create-verified-user.ts` | C — data-repair/administrative | data; DB@1,8,9; DML@29,49,55 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/db-contract-default-normalization.ts` | B — verification/diagnostic | read; DB@2,4 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/db-contract-verify.ts` | B | read; DB@5,13,27; SQL@160,169,190 | env: DATABASE_URL; G- | P/R0 | `REPLACE_WITH_SUPPORTED_OPERATION` |
| `scripts/db-verify-distribution-schema.ts` | B — verification/diagnostic | read; DB@2,7,45; SQL@55,63 | env: DATABASE_URL; G- | P/R0 | `REPLACE_WITH_SUPPORTED_OPERATION` |
| `scripts/debug-create-development.ts` | D | read; DB@6,7,8; SQL@2,82,95 | env: -; G- | R0/R0 | `RETIRE_DEAD_OR_REDUNDANT` |
| `scripts/debug-db.ts` | B — verification/diagnostic | read; DB@3,4,5; SQL@12,20,21 | env: -; G- | R0/R0 | `RETIRE_DEAD_OR_REDUNDANT` |
| `scripts/debug-filtering.ts` | B — verification/diagnostic | read; DB@3,4,5; SQL@23,39,56 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/debug-leopards-rest.ts` | B — verification/diagnostic | read; DB@2,3,4; SQL@12,39 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/debug-listings.ts` | B — verification/diagnostic | read; DB@2,3,4; SQL@23,39,53 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/debug-slug-isolated.ts` | B — verification/diagnostic | read; DB@2,3,4; SQL@41 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/debug-slug.ts` | B — verification/diagnostic | read; DB@16,17,23 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/debug-unit-media.ts` | B — verification/diagnostic | read; DB@2,3,4; SQL@13 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/debug_query.ts` | B — verification/diagnostic | read; DB@3,4 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/debug_schema.sql` | SQL supplementary | read; SQL@4 | env: -; G- | R0/R0 | `RETIRE_DEAD_OR_REDUNDANT` |
| `scripts/debug_schema.ts` | D | schema; DB@1,4,25; DDL@26 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/debug_user_status.ts` | B — verification/diagnostic | read; DB@4,5,6; SQL@19,34,39 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/describe-developers-table.ts` | B — verification/diagnostic | read; DB@6,14,15; SQL@2,3,23 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/diagnose-location-pages.ts` | D | schema; DB@1,2,3; DDL@106,107,108; DML@110,111,112 | env: DATABASE_URL; G- | R0/R0 | `REPLACE_WITH_SUPPORTED_OPERATION` |
| `scripts/diagnose-locations.ts` | B — verification/diagnostic | data; DB@6,7; DML@43 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/diagnose_placeid_mismatch.ts` | B — verification/diagnostic | read; DB@3,4; SQL@12 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/extract-legacy-location-data.ts` | B — verification/diagnostic | read; DB@9,10,11; SQL@3,73,93 | env: DATABASE_URL,NODE_ENV; G+ production,NODE_ENV | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/extract-lovable-components.mjs` | B — verification/diagnostic | read; SQL@75 | env: -; G- | P/R0 | `OUT_OF_SCOPE_WITH_REASON` |
| `scripts/find-column-global.ts` | B — verification/diagnostic | read; DB@2,7; SQL@9 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/fix-agents-table.sql` | SQL supplementary | schema; DDL@4,7,10 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/fix-approval-status.ts` | C — data-repair/administrative | read; DB@2,3,4; SQL@16,40 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/fix-brand-ownership-schema.ts` | D | schema; DB@12,17,18; DDL@52,85 | env: DATABASE_URL; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/fix-listings-schema.sql` | SQL supplementary | schema; DB@2; DDL@4,7,10 | env: -; G+ production | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/fix-location-pages.ts` | D | schema; DB@1,2,3; DDL@31,42,53; DML@65,68,71 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/fix-locations-code.ts` | D | schema; DB@2,3; DDL@12,13,20 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/fix-provinces-schema.ts` | D | schema; DB@1,2,7; DDL@21,29,37 | env: DATABASE_URL; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/fix-published-at.ts` | C — data-repair/administrative | read; DB@2,3,4; SQL@16,40 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/fix-test-house.ts` | C — data-repair/administrative | read; DB@2,3,4; SQL@15,17,22 | env: -; G+ localhost | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/fix_listings_column.ts` | D | schema; DB@3,4; DDL@13,25,28 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/fix_schema_drift.sql` | SQL supplementary | schema; DDL@8,31,39 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/fix_schema_drift.ts` | D | schema; DB@2,3; DDL@28,36 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/generate-location-slugs.ts` | B — verification/diagnostic | read; DB@9,10,11; SQL@3,83,94 | env: DATABASE_URL,NODE_ENV; G+ production,NODE_ENV | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/generate-sitemap.ts` | B — verification/diagnostic | none/unclear; no direct DB mechanism proven | env: -; G- | R0/R0 | `OUT_OF_SCOPE_WITH_REASON` |
| `scripts/insert-essential-locations.ts` | C — data-repair/administrative | data; DB@8,9; DML@42,88 | env: -; G+ localhost | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/inspect-listings-table.ts` | B — verification/diagnostic | read; DB@2,3; SQL@14,24 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/inspect-schema-exports.ts` | B — verification/diagnostic | read; DB@2 | env: -; G- | R0/R0 | `OUT_OF_SCOPE_WITH_REASON` |
| `scripts/inspect_data.ts` | B — verification/diagnostic | read; DB@3,4; SQL@11,17 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/inspect_details.ts` | B — verification/diagnostic | read; DB@3,4; SQL@11 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/inspect_properties.ts` | B — verification/diagnostic | read; DB@3,4; SQL@12 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/integrate-subscription-system.ts` | D | read; DB@8,14,16; SQL@45,65,88 | env: DATABASE_URL; G+ localhost | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/investigate_schema.ts` | B | schema; DB@2,3; DDL@23 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/list-all-users.ts` | B — verification/diagnostic | read; DB@6,14,15; SQL@23,33 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/list-users-debug.ts` | B — verification/diagnostic | read; DB@1,7,8; SQL@16,25 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/list_listings_columns.ts` | B — verification/diagnostic | read; DB@3,4; SQL@9 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/local-db.sh` | D | schema; DB@9,11,67; DDL@95,96,97 | env: -; G+ localhost,127.0.0.1 | P/R0 | `REPLACE_WITH_SUPPORTED_OPERATION` |
| `scripts/localDbWorkflow.ts` | D | schema; DB@6,16,17; DDL@126,127 | env: APP_ENV,DATABASE_URL,NODE_ENV; G+ localhost,127.0.0.1,production,staging,APP_ENV,NODE_ENV | P/R0 | `RETAIN_LOCAL_TEST_ONLY` |
| `scripts/manual_migration_listings.ts` | D | schema; DB@3,4; DDL@13,25,36 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/manual_schema_verify.sql` | SQL supplementary | read; DB@2; SQL@7,27,38 | env: -; G- | R0/R0 | `RETIRE_DEAD_OR_REDUNDANT` |
| `scripts/manual_unit_migration.sql` | SQL supplementary | schema; DDL@12,16,20; DML@71,72,73 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/migrate-hero-campaigns.ts` | C | schema; DB@2,3,19; DDL@21 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/migrate-listings-location-id.ts` | B — verification/diagnostic | read; DB@9,10,11; SQL@3,39,53 | env: DATABASE_URL,NODE_ENV; G+ production,NODE_ENV | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/migrate-locations.ts` | C | schema; DB@3,4; DDL@11,13,30 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/perform-cleanup.ts` | C — data-repair/administrative | data; DB@13,18,30; DML@38,41,43 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/print-db-target.ts` | B — verification/diagnostic | read; DB@16,18,26 | env: APP_ENV,DATABASE_URL,NODE_ENV; G+ localhost,127.0.0.1,production,APP_ENV,NODE_ENV | P/R0 | `RETAIN_READ_ONLY_DIAGNOSTIC` |
| `scripts/process-lovable-components.mjs` | B — verification/diagnostic | none/unclear; no direct DB mechanism proven | env: -; G- | P/R0 | `OUT_OF_SCOPE_WITH_REASON` |
| `scripts/prospectJourneyProcessRunner.ts` | B — verification/diagnostic | read; DB@33,40 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/quick-check.ts` | B — verification/diagnostic | read; DB@6,7; SQL@15,20 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/quick-db-check.ts` | B — verification/diagnostic | read; DB@16,17,18; SQL@28,35 | env: -; G+ production | R0/R0 | `RETIRE_DEAD_OR_REDUNDANT` |
| `scripts/quick-subscription-integration.ts` | C | schema; DB@4,8; DDL@45,77,122; DML@229,238,247 | env: -; G+ localhost | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/repair_listing_placeid.ts` | C — data-repair/administrative | read; DB@3,4; SQL@13,23,35 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/repro-500.ts` | B — verification/diagnostic | read; DB@6,7,43; SQL@43 | env: -; G- | R0/R0 | `RETIRE_DEAD_OR_REDUNDANT` |
| `scripts/repro-superadmin-seed.ts` | C — data-repair/administrative | read; DB@2,4,5; SQL@21,28,35 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/reproduce_listing_500.ts` | D | read; DB@1,3 | env: -; G+ production | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/reset-developments.ts` | C — data-repair/administrative | read; DB@2,3,4; SQL@15,17,19 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/run-activities-migration.ts` | D | schema; DB@6,14,15; DDL@49,51,71 | env: DATABASE_URL; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/run-agents-migration.ts` | D | schema; DB@2,3; DDL@19,20,21 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/run-developer-migration-step-by-step.ts` | D | schema; DB@6,14,15; DDL@56,80,96 | env: DATABASE_URL; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/run-developer-migration.ts` | D | schema; DB@6,14,15; DDL@50,65,79 | env: DATABASE_URL; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/run-google-places-migration.ts` | D | read; DB@1,12 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/run-kpi-caching-migration.ts` | D | schema; DB@5,13,14; DDL@51,58,63 | env: DATABASE_URL; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/run-listing-performance-e2e.ts` | D | read; DB@5,21,23; SQL@41,61,70 | env: APP_ENV,DATABASE_URL,LOCAL_SEED_ALLOWED,NODE_ENV; G+ LOCAL_SEED_ALLOWED,localhost,127.0.0.1,production,staging,APP_ENV,NODE_ENV | P/R0 | `REPLACE_WITH_SUPPORTED_OPERATION` |
| `scripts/run-location-migration.ts` | B — verification/diagnostic | read; SQL@3 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/run-migration.ts` | D | schema; DB@2,3,14; DDL@16,17,18 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/run-notifications-migration.ts` | D | schema; DB@5,13,14; DDL@51,72,75 | env: DATABASE_URL; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/run-property-results-optimization-migration.ts` | D | read; DB@1,32; SQL@57 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/run-prospect-journey-e2e.ts` | D | read; DB@6,18,20; SQL@78,82,95 | env: APP_ENV,DATABASE_URL,LOCAL_SEED_ALLOWED,NODE_ENV; G+ LOCAL_SEED_ALLOWED,localhost,127.0.0.1,production,staging,APP_ENV,NODE_ENV | P/R0 | `REPLACE_WITH_SUPPORTED_OPERATION` |
| `scripts/run-tidb-explore-migration.ts` | D | read; DB@9,17,19; SQL@30,56,58 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/save-table-structs.ts` | B — verification/diagnostic | read; DB@2,8; SQL@9,12 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/schema-sanity-check.mjs` | B | schema; DB@12,80,147; DDL@439 | env: -; G- | P/R0 | `RETAIN_READ_ONLY_DIAGNOSTIC` |
| `scripts/seed-explore-highlight-tags.ts` | C — data-repair/administrative | data; DB@1,2,3; DML@204 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/seed-hero-campaign.ts` | C — data-repair/administrative | data; DB@2,3; DML@16,22 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/seed-location-data.ts` | C | schema; DB@1,2,18; DDL@75,76,84; DML@78,80,82 | env: DATABASE_URL; G+ localhost | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/seed-mock-listing.ts` | C — data-repair/administrative | read; DB@2,3,5; SQL@26,35,38 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/seed-platform-brands.ts` | C — data-repair/administrative | read; DB@392,393; SQL@406 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/seed-priority-check.ts` | C — data-repair/administrative | data; DB@2,3; DML@16,22 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/seed-provinces-only.ts` | C | schema; DB@9,10; DDL@20; DML@56 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/seed-provinces.ts` | C — data-repair/administrative | read; DB@3,4,5; SQL@24,28 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/seed.ts` | C — data-repair/administrative | read; DB@2,3,5; SQL@35,36,37 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/seed_price_analytics.ts` | C — data-repair/administrative | data; DB@3,4; DML@22,61 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/show-create-table.ts` | B | schema; DB@2,8; DDL@10,12 | env: DATABASE_URL; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/show-create-unit-types.ts` | B | schema; DB@2,3; DDL@19 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/smart_backfill_locations.ts` | C — data-repair/administrative | data; DB@3,4; DML@47,82 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/sync-locations-table.ts` | B — verification/diagnostic | read; DB@9,10,11; SQL@3,53,59 | env: DATABASE_URL,NODE_ENV; G+ production,NODE_ENV | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/test-agent-integration.ts` | B — verification/diagnostic | read; DB@62; SQL@27,38 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/test-location-pages.ts` | B — verification/diagnostic | read; DB@1,2,3; SQL@12,18,24 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/test-location-service.ts` | B — verification/diagnostic | read; DB@1,2,10; SQL@30,41,52 | env: DATABASE_URL; G+ localhost | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/test-persistence.ts` | B — verification/diagnostic | read; DB@3,4,5; SQL@13,40,41 | env: -; G- | R0/R0 | `RETIRE_DEAD_OR_REDUNDANT` |
| `scripts/test-phase6-stats.ts` | B — verification/diagnostic | read; DB@3,4,5; SQL@18 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/test-published-query.ts` | B — verification/diagnostic | read; DB@1,2,3; SQL@15,48 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/test-readiness.ts` | B — verification/diagnostic | read; DB@2,4,5 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/test-search-raw.ts` | B — verification/diagnostic | read; DB@2,3,4; SQL@19,26,33 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/test-search.ts` | B — verification/diagnostic | read; DB@2,3,4; SQL@20,40 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/update-brand-provinces.ts` | C — data-repair/administrative | read; DB@10,27,39; SQL@2,6,45 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/update-price.ts` | C — data-repair/administrative | read; DB@2,3,4; SQL@15,16 | env: -; G+ localhost | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/validate-phase4.ts` | B — verification/diagnostic | read; DB@4,5,6; SQL@49,52,59 | env: -; G- | R0/R0 | `RETIRE_DEAD_OR_REDUNDANT` |
| `scripts/validate-schema-sync.ts` | B — verification/diagnostic | read; DB@2,3,4; SQL@32,93 | env: -; G+ production | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/verify-agency-attribution.ts` | B — verification/diagnostic | read; DB@2,3; SQL@13,28,44 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/verify-bluespace-user.ts` | B — verification/diagnostic | data; DB@6,15,16; DML@48 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/verify-db-state.ts` | B — verification/diagnostic | read; DB@6,7,8; SQL@18,26,32 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/verify-development-page.ts` | B — verification/diagnostic | read; DB@15,38 | env: DATABASE_URL; G- | P/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/verify-development-wizard-schema.ts` | B — verification/diagnostic | read; DB@1,4,12; SQL@31,36,50 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/verify-location-migration.ts` | B — verification/diagnostic | read; DB@9,10,11; SQL@3,45,53 | env: DATABASE_URL,NODE_ENV; G+ production,NODE_ENV | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/verify-login-db.ts` | B — verification/diagnostic | read; DB@3,4; SQL@14 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/verify-login-endpoint.ts` | B — verification/diagnostic | none/unclear; no direct DB mechanism proven | env: -; G+ localhost | R0/R0 | `OUT_OF_SCOPE_WITH_REASON` |
| `scripts/verify-mission-control-migrations.ts` | B — verification/diagnostic | read; DB@5,13,14; SQL@22,37,45 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/verify-platform-agency.ts` | B — verification/diagnostic | read; DB@8,13,25; SQL@30,45 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/verify-portfolio-fields.ts` | B — verification/diagnostic | read; DB@2,3,4; SQL@18 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/verify-property-results-optimization-migration.ts` | B — verification/diagnostic | read; DB@1; SQL@25,57,97 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/verify-prospect-journey-auth.ts` | B — verification/diagnostic | read; DB@8,17,28; SQL@79,84,159 | env: DATABASE_URL; G+ localhost,127.0.0.1 | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/verify-prospect-journey-cross-agency.ts` | B — verification/diagnostic | data; DB@5,8,18; DML@63,69,75 | env: DATABASE_URL; G+ localhost,127.0.0.1 | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/verify-prospect-journey-security.ts` | B | schema; DB@4,9,15; DDL@18,157; DML@71,77,86 | env: DATABASE_URL; G+ localhost,127.0.0.1 | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/verify-schema.ts` | B | schema; DB@3,4,18; DDL@21 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `scripts/verify-showings-migration.ts` | B — verification/diagnostic | read; DB@3,32,33; SQL@41,50,60 | env: DATABASE_URL,NODE_ENV; G+ production,staging,NODE_ENV | P/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/verify-trpc-router.ts` | B — verification/diagnostic | read; SQL@24 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/verify-user.ts` | B — verification/diagnostic | data; DB@1,10,11; DML@29 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `scripts/verify-wizard-e2e.ts` | B — verification/diagnostic | read; DB@2,3,5; SQL@43,45,56 | env: -; G- | P/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/verifyPlanVersioning.ts` | B — verification/diagnostic | read; DB@4,5,6; SQL@21,33,61 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `scripts/verify_unit_types_schema.sql` | SQL supplementary | read; SQL@7,10,21 | env: -; G- | R0/R0 | `RETIRE_DEAD_OR_REDUNDANT` |
| `scripts/verify_units.ts` | B — verification/diagnostic | read; DB@10,11,12; SQL@26,29,34 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `seed-agent-test-data.ts` | C — data-repair/administrative | read; DB@1,2,14; SQL@43,45,60 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `seed-data.ts` | C — data-repair/administrative | read; DB@2,3,4; SQL@14,26,27 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `seed-plans.ts` | C — data-repair/administrative | read; DB@1,2,3; SQL@6,126,128 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `seed-sa-locations.ts` | C — data-repair/administrative | read; DB@1,2,3; SQL@27,28,29 | env: DATABASE_URL,NODE_ENV; G+ production,NODE_ENV | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `seed-sandton-properties.ts` | C — data-repair/administrative | read; DB@1,2; SQL@8,9,19 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `server/routes/SELECT id, name, userId.sql` | query example supplementary | read; SQL@1,3 | env: -; G- | R0/R0 | `OUT_OF_SCOPE_WITH_REASON` |
| `server/scripts/apply-approval-schema.ts` | D | schema; DB@3; DDL@15,30 | env: -; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `server/scripts/audit_schema.ts` | B — verification/diagnostic | read; DB@2,16; SQL@13 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/audit_schema_v2.ts` | B — verification/diagnostic | read; DB@2,15; SQL@13 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/check_db-counts.ts` | B — verification/diagnostic | read; DB@2; SQL@6,7,8 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/check_db_counts.ts` | B — verification/diagnostic | read; DB@7; SQL@51,52,53 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/check_dev_slug.ts` | B — verification/diagnostic | read; DB@3,4,5; SQL@16 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/cleanup-developments.ts` | C — data-repair/administrative | read; DB@3,9,10; SQL@23,25,27 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `server/scripts/create-local-db.ts` | D | schema; DB@7,10,12; DDL@32,33 | env: DATABASE_URL; G+ localhost | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `server/scripts/debug-db.ts` | B — verification/diagnostic | read; DB@3,9,14; SQL@22 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/debug-hot-selling-data.ts` | B — verification/diagnostic | read; DB@7,13,14; SQL@30 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/debug-images.ts` | B — verification/diagnostic | read; DB@11,12,13; SQL@25 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/debug-schema.ts` | D | read; DB@2; SQL@12,13,15 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/debug_db_connection.ts` | B — verification/diagnostic | read; DB@1,8,10; SQL@19,22 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/debug_dev.ts` | B — verification/diagnostic | read; DB@1,2,3; SQL@15,33 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/debug_dev_fetch.ts` | B — verification/diagnostic | read; DB@2,3 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/debug_dev_link.ts` | B — verification/diagnostic | read; DB@10; SQL@26,36 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/debug_show_seed_columns.ts` | C — data-repair/administrative | read; DB@3,13; SQL@10,12 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `server/scripts/debug_show_users_columns.ts` | B — verification/diagnostic | read; DB@7; SQL@22 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/debug_unit_sql.ts` | B — verification/diagnostic | read; DB@12,27; SQL@19,21 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/fix-unit-data.ts` | C — data-repair/administrative | read; DB@5,6,7; SQL@17 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `server/scripts/init-local-db.sql` | legacy local SQL supplementary | schema; DDL@1 | env: -; G- | R0/R0 | `RETIRE_DEAD_OR_REDUNDANT` |
| `server/scripts/inspect-dev-units.ts` | B — verification/diagnostic | read; DB@6,7,8; SQL@23,37,38 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/inspect-unit-row.ts` | B — verification/diagnostic | read; DB@5,6,7; SQL@19 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/investigate_210008.ts` | B — verification/diagnostic | read; DB@13,14,15; SQL@29,31,50 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/list_developers.ts` | B — verification/diagnostic | read; DB@2,3,12; SQL@21 | env: DATABASE_URL; G+ production | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/localDemoSeed.ts` | C — data-repair/administrative | data; DB@4,36,37; DML@223,370,392 | env: APP_ENV,DATABASE_URL,LOCAL_SEED_ALLOWED,NODE_ENV; G+ LOCAL_SEED_ALLOWED,localhost,127.0.0.1,production,APP_ENV,NODE_ENV | P/R0 | `RETAIN_LOCAL_TEST_ONLY` |
| `server/scripts/quick-check-schema.ts` | B — verification/diagnostic | read; DB@6,7,29; SQL@17,18,19 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/repair-property-media-mirrors.ts` | C — data-repair/administrative | read; DB@2,3; SQL@14 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `server/scripts/revert-unit-data.ts` | B — verification/diagnostic | read; DB@5,6,7; SQL@17 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `server/scripts/sanity_test_seed_cleanup.sql` | test SQL supplementary | data; DB@2; DML@11,21,29 | env: -; G- | R0/R0 | `REPLACE_WITH_SUPPORTED_OPERATION` |
| `server/scripts/sanity_test_seed_cleanup.ts` | C — data-repair/administrative | data; DB@4,14,28; DML@89,96,103 | env: DATABASE_URL; G- | R0/R0 | `REPLACE_WITH_SUPPORTED_OPERATION` |
| `server/scripts/seed-local-users.ts` | C — data-repair/administrative | data; DB@3,10,12; DML@43,53,60 | env: DATABASE_URL; G+ localhost | R0/R0 | `RETAIN_LOCAL_TEST_ONLY` |
| `server/scripts/seed-prod-super-admin.ts` | C — data-repair/administrative | data; DB@3,10,12; DML@57 | env: DATABASE_URL; G+ localhost,127.0.0.1,production | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `server/scripts/seed-rich-development-content.ts` | C — data-repair/administrative | read; DB@4,6,7; SQL@58,98,108 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `server/scripts/seedDemoDevelopments.ts` | C — data-repair/administrative | read; DB@3,4,5; SQL@1463,1473,1481 | env: DATABASE_URL; G+ localhost,production | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `server/scripts/seed_super_admin.ts` | C — data-repair/administrative | data; DB@7; DML@45 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `server/scripts/show_users_columns.ts` | B — verification/diagnostic | read; DB@7,16; SQL@17 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/simulate-save.ts` | B — verification/diagnostic | read; DB@6,7,8; SQL@17,19,71 | env: -; G- | R0/R0 | `RETIRE_DEAD_OR_REDUNDANT` |
| `server/scripts/simulate_service_query.ts` | B — verification/diagnostic | read; DB@3,10,11; SQL@41,69,75 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/verify-approval-workflow.ts` | B — verification/diagnostic | read; DB@5,6,12; SQL@24,30,35 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/verify-dev-service.ts` | B — verification/diagnostic | read; DB@10,11,18; SQL@31,36,70 | env: -; G- | R0/R0 | `RETIRE_DEAD_OR_REDUNDANT` |
| `server/scripts/verify-development-validation.ts` | B — verification/diagnostic | read; DB@6,7 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/verify-fast-track.ts` | D | schema; DB@5,6,11; DDL@31 | env: DATABASE_URL; G- | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `server/scripts/verify-get-profile.ts` | B — verification/diagnostic | read; DB@4,20,23 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/verify-hot-selling-final.ts` | B — verification/diagnostic | none/unclear; no direct DB mechanism proven | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/verify-hot-selling.ts` | B — verification/diagnostic | read; DB@13 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/verify-hybrid.ts` | B — verification/diagnostic | none/unclear; no direct DB mechanism proven | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/verify-id-fix.ts` | B — verification/diagnostic | read; DB@7,8,9; SQL@37 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/verify-images-debug.ts` | B — verification/diagnostic | read; DB@7,13,14; SQL@36 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/verify-local-db.ts` | B — verification/diagnostic | read; DB@9; SQL@21 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/verify-publish-sanitization.ts` | B — verification/diagnostic | read; SQL@11,16,19 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/verifyLocalDemoSeed.ts` | C — data-repair/administrative | read; DB@3,28,42; SQL@49,81,91 | env: NODE_ENV; G+ NODE_ENV | P/R0 | `RETAIN_LOCAL_TEST_ONLY` |
| `server/scripts/verify_brand_link.ts` | B — verification/diagnostic | read; DB@8,9; SQL@19 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/verify_brand_link_v2.ts` | B — verification/diagnostic | read; DB@10,16,17; SQL@30,34 | env: DATABASE_URL,DB_HOST; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/verify_developer_fk_fix.ts` | B — verification/diagnostic | read; DB@13,14,15; SQL@28,31,56 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `server/scripts/verify_development_flow.ts` | B — verification/diagnostic | read; DB@6,7; SQL@27,31,49 | env: -; G- | R0/R0 | `RETIRE_DEAD_OR_REDUNDANT` |
| `server/scripts/verify_seed_cleanup.ts` | C — data-repair/administrative | read; DB@11,25,28; SQL@6,54,63 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `set-admin.ts` | C — data-repair/administrative | read; DB@8,9,10; SQL@23,35,45 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `simple-cleanup.ts` | C — data-repair/administrative | read; DB@2,12,17; SQL@33,38,40 | env: DATABASE_URL; G+ production | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `test-agent-integration.mjs` | B — verification/diagnostic | data; DB@1,4,18; DML@19,35,51 | env: -; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `test-aws-config.ts` | B — verification/diagnostic | read; SQL@32 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `test-mysql.ts` | B — verification/diagnostic | read; DB@1,5,6; SQL@17 | env: -; G+ localhost | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `test-simple-db.ts` | B — verification/diagnostic | read; DB@6,7,8; SQL@27,49 | env: -; G- | R0/R0 | `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE` |
| `trigger_fix.js` | B — verification/diagnostic | none/unclear; no direct DB mechanism proven | env: -; G+ localhost | R0/R0 | `OUT_OF_SCOPE_WITH_REASON` |
| `update-agent-status.ts` | C — data-repair/administrative | data; DB@2,8,9; DML@30 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `update-properties-sa.ts` | C — data-repair/administrative | read; DB@1,2,3; SQL@22,27 | env: DATABASE_URL; G- | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `verify-cleanup.ts` | C — data-repair/administrative | data; DB@3,28,32; DML@214 | env: DATABASE_URL; G+ localhost | R0/R0 | `DEFER_REQUIRES_OWNER_DECISION` |
| `verify-developer-user.ts` | D | schema; DB@7,14; DDL@13; DML@56 | env: -; G+ localhost | R0/R0 | `RETIRE_SCHEMA_MUTATOR` |
| `verify_fix.ts` | B — verification/diagnostic | read; DB@2,3,4; SQL@16,17,27 | env: -; G- | R0/R0 | `RETIRE_DEAD_OR_REDUNDANT` |
| `verify_stats.ts` | B — verification/diagnostic | none/unclear; no direct DB mechanism proven | env: -; G- | R0/R0 | `OUT_OF_SCOPE_WITH_REASON` |
| `vitest.setup.ts` | B — verification/diagnostic | read; DB@9,10,15; SQL@56,65,85 | env: DATABASE_URL,NODE_ENV; G+ NODE_ENV | R0/R0 | `OUT_OF_SCOPE_WITH_REASON` |

### 20.1 Mechanical reconciliation

- Prior broad census: **324** unique paths.
- Slice 1-retired paths absent from the current tree: **18**.
- Still-tracked paths from the prior census: **306**.
- Adjacent SQL/local-evidence paths not present in that census: **12**.
- Final traceability ledger: **318** unique paths.
- Explicit trace-only exclusions: **16**.
- Operational or local/test candidates: **302**.

### 20.2 Final proposed disposition totals

- `DEFER_REQUIRES_APPROVED_READ_ONLY_EVIDENCE`: **148**
- `DEFER_REQUIRES_OWNER_DECISION`: **69**
- `OUT_OF_SCOPE_WITH_REASON`: **16**
- `REPLACE_WITH_SUPPORTED_OPERATION`: **8**
- `RETAIN_LOCAL_TEST_ONLY`: **6**
- `RETAIN_READ_ONLY_DIAGNOSTIC`: **2**
- `RETIRE_DEAD_OR_REDUNDANT`: **14**
- `RETIRE_SCHEMA_MUTATOR`: **55**
- Total: **318**

### 20.3 Read-only classification correction

The earlier 164-path read-only-evidence population was corrected after an ORM/API mutation scan. Sixteen paths contained genuine database writes that literal SQL matching had missed. Seven were moved to owner-decision review and nine were moved to dead/redundant retirement, leaving **148** paths requiring approved read-only evidence.
