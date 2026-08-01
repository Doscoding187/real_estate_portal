fatal: path 'scripts/create-verified-user.ts' does not exist in 'HEAD'
fatal: path 'scripts/debug_user_status.ts' does not exist in 'HEAD'
fatal: path 'scripts/generate-location-slugs.ts' does not exist in 'HEAD'
fatal: path 'scripts/migrate-listings-location-id.ts' does not exist in 'HEAD'
fatal: path 'scripts/repro-superadmin-seed.ts' does not exist in 'HEAD'
fatal: path 'scripts/seed.ts' does not exist in 'HEAD'
fatal: path 'scripts/sync-locations-table.ts' does not exist in 'HEAD'
fatal: path 'server/scripts/seed-prod-super-admin.ts' does not exist in 'HEAD'
fatal: path 'server/scripts/seed_super_admin.ts' does not exist in 'HEAD'
fatal: path 'generate-hash.ts' does not exist in 'HEAD'
fatal: path 'scripts/check-db-schema.ts' does not exist in 'HEAD'
fatal: path 'scripts/check-db-status.ts' does not exist in 'HEAD'
fatal: path 'scripts/check-schema.ts' does not exist in 'HEAD'
fatal: path 'scripts/check_prod_data.ts' does not exist in 'HEAD'
fatal: path 'scripts/extract-legacy-location-data.ts' does not exist in 'HEAD'
fatal: path 'scripts/integrate-subscription-system.ts' does not exist in 'HEAD'
fatal: path 'scripts/reproduce_listing_500.ts' does not exist in 'HEAD'
fatal: path 'scripts/run-google-places-migration.ts' does not exist in 'HEAD'
fatal: path 'scripts/run-location-migration.ts' does not exist in 'HEAD'
fatal: path 'scripts/run-property-results-optimization-migration.ts' does not exist in 'HEAD'
fatal: path 'scripts/run-tidb-explore-migration.ts' does not exist in 'HEAD'
fatal: path 'scripts/validate-schema-sync.ts' does not exist in 'HEAD'
fatal: path 'scripts/verify-development-page.ts' does not exist in 'HEAD'
fatal: path 'scripts/verify-location-migration.ts' does not exist in 'HEAD'
fatal: path 'scripts/verify-showings-migration.ts' does not exist in 'HEAD'
fatal: path 'scripts/verify-wizard-e2e.ts' does not exist in 'HEAD'
fatal: path 'server/scripts/debug-schema.ts' does not exist in 'HEAD'
# DBA-S4C2 Residual Utility Containment Addendum

**Status:** canonical residual-utility containment and closure authority

**Scope:** the bounded implementation correction for the S3C3 residual utility
boundary. This addendum does not reopen the migration or schema-authority
programme.

## Decision

The repository had no launch-critical owner for the remaining manually
executable repair, cleanup, account-administration, backfill, or general seed
utilities. The default disposition is retirement. No production seed authority
or production-wide cleanup authority is retained.

The exact machine-readable inventory used by the preventive check is
`docs/database-authority/residual-utility-authority.json`.

Operational migration instructions remain owned by the canonical
[`server/migrations/README.md`](../../server/migrations/README.md). This
addendum governs residual utility containment and does not replace the
canonical migration runner, migration tree, or ledger instructions.

## Owner-decision reconciliation

The 60 owner-decision records present at the start of this correction receive
one traceable disposition:

- **Retired: 59.** These paths are absent and prohibited. A future repair,
  backfill, cleanup, account recovery, or seed capability requires a new named
  owner and operating contract.
- **Retained local/test-only: 1.** The cross-agency prospect-journey fixture
  remains callable only through the guarded disposable E2E runner, with an
  exact loopback target and no schema DDL.

Retired paths:

- `add-admin-password.ts`
- `cleanup-production-data.ts`
- `create-basic-user.ts`
- `create-super-admin.ts`
- `create-test-agent-profile.ts`
- `create-test-user.ts`
- `execute-cleanup.ts`
- `fix-typescript-errors.ps1`
- `fix_agent.ts`
- `fix_property_address.ts`
- `scripts/approve-latest-listing.ts`
- `scripts/backfill-location-ids.ts`
- `scripts/backfill_listings_locationid.ts`
- `scripts/check-seed-status.ts`
- `scripts/check-slug.ts`
- `scripts/clean-developer-test-data.ts`
- `scripts/cleanup-brand-profiles.ts`
- `scripts/cleanup_duplicates.ts`
- `scripts/create-platform-agency.ts`
- `scripts/create-test-house.ts`
- `scripts/diagnose-locations.ts`
- `scripts/fix-approval-status.ts`
- `scripts/fix-published-at.ts`
- `scripts/fix-test-house.ts`
- `scripts/insert-essential-locations.ts`
- `scripts/perform-cleanup.ts`
- `scripts/repair_listing_placeid.ts`
- `scripts/reset-developments.ts`
- `scripts/seed-explore-highlight-tags.ts`
- `scripts/seed-hero-campaign.ts`
- `scripts/seed-mock-listing.ts`
- `scripts/seed-platform-brands.ts`
- `scripts/seed-priority-check.ts`
- `scripts/seed-provinces.ts`
- `scripts/seed_price_analytics.ts`
- `scripts/smart_backfill_locations.ts`
- `scripts/update-brand-provinces.ts`
- `scripts/update-price.ts`
- `scripts/verify-bluespace-user.ts`
- `scripts/verify-user.ts`
- `seed-agent-test-data.ts`
- `seed-data.ts`
- `seed-plans.ts`
- `seed-sa-locations.ts`
- `seed-sandton-properties.ts`
- `server/scripts/cleanup-developments.ts`
- `server/scripts/debug_show_seed_columns.ts`
- `server/scripts/fix-unit-data.ts`
- `server/scripts/repair-property-media-mirrors.ts`
- `server/scripts/revert-unit-data.ts`
- `server/scripts/seed-rich-development-content.ts`
- `server/scripts/seedDemoDevelopments.ts`
- `server/scripts/verify_seed_cleanup.ts`
- `set-admin.ts`
- `simple-cleanup.ts`
- `test-agent-integration.mjs`
- `update-agent-status.ts`
- `update-properties-sa.ts`
- `verify-cleanup.ts`

Retained path:

- `scripts/verify-prospect-journey-cross-agency.ts`

Nine additional owner-decision records from the historical ledger were already
absent at the start and remain represented only as prohibited historical
traceability.

## Read-only reconciliation

The 130 read-only-evidence records present at the start are batch-classified as
**read-only evidence, not operational authority**. They have no approved owner
or production-use contract and are not one of the four supported diagnostics.
The exact retained set of 127 paths is listed in the inventory.

The three executable, operational-looking exceptions were individually
inspected and retired because they instructed or exposed the retired cleanup
workflow:

- `database-check.ts`
- `quick-check.ts`
- `scripts/quick-check.ts`

Retained read-only evidence paths:

- `check-all-data.ts`
- `check-db-columns.ts`
- `check-production-db.ts`
- `check-properties.ts`
- `check-real-data.ts`
- `check-super-admins.ts`
- `check-tables.ts`
- `check_db_refs.ts`
- `check_table_schema.ts`
- `debug_properties.ts`
- `diagnose-login-v2.ts`
- `diagnose-login.ts`
- `list-prod-tables.ts`
- `list-users.ts`
- `scripts/check-agent-tables.ts`
- `scripts/check-alberton-listings.ts`
- `scripts/check-bluespace-direct.ts`
- `scripts/check-bluespace-profile.ts`
- `scripts/check-columns.ts`
- `scripts/check-db-ids.ts`
- `scripts/check-developer-columns.ts`
- `scripts/check-developer-profile.ts`
- `scripts/check-developer-status.ts`
- `scripts/check-developers-struct.ts`
- `scripts/check-developers-table.ts`
- `scripts/check-development-columns-direct.ts`
- `scripts/check-development-columns.ts`
- `scripts/check-development-images.ts`
- `scripts/check-development-location.ts`
- `scripts/check-development-phases.ts`
- `scripts/check-location-data.ts`
- `scripts/check-properties-schema.ts`
- `scripts/check-properties.ts`
- `scripts/check-property-data.ts`
- `scripts/check-property-indexes.ts`
- `scripts/check-provinces.ts`
- `scripts/check-published-developments.ts`
- `scripts/check-table-struct.ts`
- `scripts/check-table.ts`
- `scripts/check-triggers.ts`
- `scripts/check-unit-media.ts`
- `scripts/check-unit-types-columns.ts`
- `scripts/check-unit-types.ts`
- `scripts/check-users-schema.ts`
- `scripts/check_city_counts.ts`
- `scripts/check_columns_concise.ts`
- `scripts/check_db_schema.ts`
- `scripts/check_listing_placeids.ts`
- `scripts/check_properties_cols.ts`
- `scripts/check_row_counts.ts`
- `scripts/db-contract-default-normalization.ts`
- `scripts/debug-filtering.ts`
- `scripts/debug-leopards-rest.ts`
- `scripts/debug-listings.ts`
- `scripts/debug-slug-isolated.ts`
- `scripts/debug-slug.ts`
- `scripts/debug-unit-media.ts`
- `scripts/debug_query.ts`
- `scripts/describe-developers-table.ts`
- `scripts/diagnose_placeid_mismatch.ts`
- `scripts/find-column-global.ts`
- `scripts/inspect-listings-table.ts`
- `scripts/inspect_data.ts`
- `scripts/inspect_details.ts`
- `scripts/inspect_properties.ts`
- `scripts/list-all-users.ts`
- `scripts/list-users-debug.ts`
- `scripts/list_listings_columns.ts`
- `scripts/prospectJourneyProcessRunner.ts`
- `scripts/save-table-structs.ts`
- `scripts/test-agent-integration.ts`
- `scripts/test-location-pages.ts`
- `scripts/test-location-service.ts`
- `scripts/test-phase6-stats.ts`
- `scripts/test-published-query.ts`
- `scripts/test-readiness.ts`
- `scripts/test-search-raw.ts`
- `scripts/test-search.ts`
- `scripts/verify-agency-attribution.ts`
- `scripts/verify-db-state.ts`
- `scripts/verify-development-wizard-schema.ts`
- `scripts/verify-login-db.ts`
- `scripts/verify-mission-control-migrations.ts`
- `scripts/verify-platform-agency.ts`
- `scripts/verify-portfolio-fields.ts`
- `scripts/verify-property-results-optimization-migration.ts`
- `scripts/verify-prospect-journey-auth.ts`
- `scripts/verify-trpc-router.ts`
- `scripts/verifyPlanVersioning.ts`
- `scripts/verify_units.ts`
- `server/scripts/audit_schema.ts`
- `server/scripts/audit_schema_v2.ts`
- `server/scripts/check_db-counts.ts`
- `server/scripts/check_db_counts.ts`
- `server/scripts/check_dev_slug.ts`
- `server/scripts/debug-db.ts`
- `server/scripts/debug-hot-selling-data.ts`
- `server/scripts/debug-images.ts`
- `server/scripts/debug_db_connection.ts`
- `server/scripts/debug_dev.ts`
- `server/scripts/debug_dev_fetch.ts`
- `server/scripts/debug_dev_link.ts`
- `server/scripts/debug_show_users_columns.ts`
- `server/scripts/debug_unit_sql.ts`
- `server/scripts/inspect-dev-units.ts`
- `server/scripts/inspect-unit-row.ts`
- `server/scripts/investigate_210008.ts`
- `server/scripts/list_developers.ts`
- `server/scripts/quick-check-schema.ts`
- `server/scripts/show_users_columns.ts`
- `server/scripts/simulate_service_query.ts`
- `server/scripts/verify-approval-workflow.ts`
- `server/scripts/verify-development-validation.ts`
- `server/scripts/verify-get-profile.ts`
- `server/scripts/verify-hot-selling-final.ts`
- `server/scripts/verify-hot-selling.ts`
- `server/scripts/verify-hybrid.ts`
- `server/scripts/verify-id-fix.ts`
- `server/scripts/verify-images-debug.ts`
- `server/scripts/verify-local-db.ts`
- `server/scripts/verify-publish-sanitization.ts`
- `server/scripts/verify_brand_link.ts`
- `server/scripts/verify_brand_link_v2.ts`
- `server/scripts/verify_developer_fk_fix.ts`
- `test-aws-config.ts`
- `test-mysql.ts`
- `test-simple-db.ts`

A read-only evidence path must not be promoted to an operational repair or
diagnostic command by documentation or package wiring.

## Additional current-boundary helpers

The final guard-boundary review found four manually executable `server/`-root
helpers that were outside the 190-record historical ledger: an ambient
database-listing diagnostic, an environment verifier, a guard-failure probe,
and a database-backed reproduction script. None had a package, CI, startup,
deployment, or active operational-documentation caller, and none was
launch-critical. All four are retired and recorded in the explicit inventory:

- `server/check-databases.ts`
- `server/reproduce_500.ts`
- `server/verify-db-env.ts`
- `server/verify-guard-failure.ts`

These additional current-boundary retirements do not change the historical
190-path reconciliation. They close the broader executable boundary that the
preventive guard now scans.

## Other residual groups

- Three replacement authorities remain supported: the guarded connected
  verification commands and local lifecycle shell wrapper. The two E2E
  orchestrators are classified as local/test fixtures rather than duplicated
  under both categories.
- Six local/test lifecycle entries remain: canonical local and test workflow,
  local database initialization, local demo seed, local demo verification, and
  the static lifecycle contract. The ambient-target
  `server/scripts/seed-local-users.ts` utility was retired.
- The cross-agency fixture above and the existing security fixture remain
  explicitly classified as local/test E2E fixtures.
- The two retained diagnostics are `schema:sanity` and `db:target`; connected
  verification remains owned by `db:verify` and `db:verify:distribution`.
- The 16 historical exclusions remain traceability-only.
- The one former schema-mutator candidate retained for E2E remains a guarded
  disposable fixture and has a no-DDL contract.

## Documentation and sensitive material

Active cleanup, account-bootstrap, seed, and backfill instructions were
removed or replaced with canonical local/test lifecycle guidance. The affected
tracked utilities were deleted, which removes their embedded account/password
material without reproducing any value. No replacement credential or generic
repair runner was added.

## Preventive enforcement

`pnpm db:authority:check` is the aggregate non-connected gate. It composes the
static database-authority contracts (including migration identity/order,
production-seed prohibition, retired-reference checks and authority-document
consistency), `pnpm db:authority:utilities`, and `pnpm schema:sanity`.
`pnpm db:authority:utilities` uses `scripts/databaseUtilityAuthorityCheck.ts`.
It scans root executable utility `scripts/` and `server/scripts/`,
package-script entrypoints, and operationally named relocated source; it
excludes explicitly declared runtime/schema and test roots, requires every
database-capable utility surface to be present in the explicit inventory,
rejects returned retired paths, and fails on a new unclassified surface. The
guard and aggregate gate perform no environment loading and create no
connection.

The historical residual population is 190 records (60 owner-decision and 130
read-only-evidence paths). The guard reports 122 current executable
operational surfaces because historical documentation, ordinary runtime query
consumers, migrations, tests, non-capable authority files, and read-only
records without database-capability signals are not executable utility
surfaces. This boundary and the closure count are encoded in
`residual-utility-authority.json`.

## Closeout scope

The S4 closeout statement is corrected: schema/migration authority closure and
residual utility containment are separate boundaries. The historical Gap 3
residual utility defect is closed by this addendum, the explicit inventory,
the database change protocol, and the aggregate CI gate. Canonical migrations,
schema ownership, supported diagnostics, guarded local/test lifecycle, and
production-seed prohibition remain authoritative. Future repair or backfill
requires the exceptional contract in the protocol. Normal schema evolution
does not reopen Database Authority; the protocol defines the explicit
reopening criteria.
