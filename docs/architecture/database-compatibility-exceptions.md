# Database Compatibility Exception Register

**Authority:** `docs/architecture/database-authority-policy.md`

## Current approved exceptions

### Exception ID: DBX-PLE-2B-property-taxonomy-enum-expansion

Status: Approved for the PLE-2B implementation slice

Owner: Property Listify senior product engineering

Approved by Edward on: 2026-08-08, through the PLE-2B migration authorization

Business reason: The manual Property Listing Engine must persist the approved
canonical physical types `townhouse`, `cluster_home`, and `plot`. The existing
`listings.propertyType` enum cannot persist those values, while the public
`properties` projection and canonical search already recognize the townhouse and
cluster values. The change is required to prevent the authoring contract from
falling back to arbitrary JSON or losing type identity.

Canonical authority: `listings.propertyType` remains the authored source
authority. `properties.propertyType` remains a derived public read model. The
runtime mapping `land → plot` is explicit and one-way into the public model.

Exact files: `server/migrations/0002_canonical_property_taxonomy.sql`,
`server/migrations/manifest.json`, `drizzle/schema/listings.ts`,
`shared/property-taxonomy.ts`, `server/listingRouter.ts`, `server/db.ts`, and
`server/_core/databaseAuthority/dataAdapters/common.ts`.

Tables and columns: `listings.propertyType`; the public target checked by
congruency is `properties.propertyType`.

Permitted read direction: Existing `land`, `commercial`, and `shared_living`
values remain readable. Historical `land` values map to public `plot` only when
the authored listing is projected.

Permitted write direction: One additive enum expansion on the owned disposable
worktree database, followed by normal runtime writes through the canonical
listing lifecycle. No direct public-property writes or legacy schema writes are
permitted.

Failure and observability behavior: Migration planning must fail closed if the
manifest, target classification, ownership, or schema lineage is inconsistent.
Projection must fail visibly for an unknown source property type rather than
guessing a public value. The migration is applied once through Database
Authority and is not retried or repaired manually.

Automated evidence: Migration manifest validation, Database Authority migration
plan/apply/readiness/congruency checks, taxonomy compatibility tests, projection
mapping tests, and the focused PLE-2B validation suite.

Expiry or objective removal condition: Retire the exception after all active
manual inventory uses the canonical source vocabulary, historical `land` rows
have been safely classified, and the deferred/legacy authoring values have a
separately approved retirement or migration plan.

Removal workstream: PLE final taxonomy and legacy-retirement convergence.

Existing code containing terms such as `legacy`, `compatibility`, `fallback`,
schema probing, alternate query strategies, or dual-model behavior does not
gain approval from historical presence.

Such code remains audit debt until Edward explicitly approves and registers it,
or an approved workstream removes it.

### Exception ID: DBX-TIDB-0001-sequenced-unique-index-replacement

Status: Approved for the bounded production recovery of the 0001 zero-statement failure

Owner: Property Listify senior product engineering

Approved by Edward on: 2026-09-04, through the production cutover recovery authorization

Business reason: TiDB rejected the original search-to-lead migration because its single
`ALTER TABLE` attempted to create a unique index over columns introduced by that same
DDL job. The replacement preserves the canonical model while sequencing the additive
column expansion and unique-index expansion as independently executable statements.

Canonical authority: `drizzle/schema/leads.ts` remains the desired model; the active
replacement migration is the only executable schema authority. The rejected SQL remains
unchanged under the zero-statement evidence archive and is never executed.

Exact files: `server/migrations/0001_public_search_to_lead_reliability_sequenced.sql`,
`server/migrations/manifest.json`,
`server/migrations/_archived/rejected-zero-statement/0001_public_search_to_lead_reliability.sql`,
`server/migrations/recoverRejectedReleaseZeroStatementMigration.ts`, and the protected
release CLI/docs/tests that invoke it.

Tables and columns: `leads.capture_request_id`, `leads.consent_captured_at`,
`leads.consent_version`, `leads.consent_source`, `leads.delivery_status`,
`leads.delivery_attempts`, `leads.delivery_last_attempt_at`,
`leads.delivery_next_attempt_at`, `leads.delivery_last_error`,
`leads.delivery_provider_reference`, and unique index
`leads.uq_leads_capture_request`.

Permitted read direction: None; this is an additive schema replacement only.

Permitted write direction: The protected release recovery may change only the durable
zero-statement attempt state from `failed` to `failed_replaced` and append its separate
review-evidence row. The replacement DDL then runs through `release:apply`.

Failure and observability behavior: Recovery requires exact protected release approval,
the exact target acknowledgement for apply, the exact failed attempt and failure class,
an unchanged archive checksum, an exact accepted history prefix, and read-only proof that
all rejected columns and the unique index are absent. Any mismatch fails closed; no ledger
history is created for the rejected SQL and no attempt evidence is deleted.

Automated evidence: Release recovery unit tests, migration manifest/checksum tests,
database-authority static/contract tests, and the post-recovery schema-congruency and
readiness checks.

Expiry or objective removal condition: Remove this exception after the production
zero-statement attempt is reviewed, the sequenced replacement reaches the canonical head,
and the release recovery evidence is retained as historical incident evidence.

Removal workstream: Database cutover recovery closure.

### Exception ID: DBX-TIDB-0046-QUOTE-TERMS-RECOVERY-2026-09-04-Edward

Status: Approved for the bounded production recovery of the 0046 zero-statement failure

Owner: Property Listify senior product engineering

Approved by Edward on: 2026-09-04, through the production cutover recovery authorization

Business reason: TiDB rejected the original Commercial Office quote-terms migration
because a single `ALTER TABLE` job tried to place `vat_treatment` after
`pricing_mode` while both columns were being introduced by that same job. The
replacement preserves the canonical model while adding `pricing_mode` and then
`vat_treatment` in independently executable statements.

Canonical authority: `drizzle/schema/commercial.ts` remains the desired model;
the active sequenced replacement is the only executable schema authority. The
rejected SQL remains unchanged under the zero-statement evidence archive and is
never executed.

Exact files: `server/migrations/0046_commercial_office_quote_terms_sequenced.sql`,
`server/migrations/manifest.json`,
`server/migrations/_archived/rejected-zero-statement/0046_commercial_office_quote_terms.sql`,
`server/migrations/recoverRejectedReleaseCommercialQuoteTermsMigration.ts`, and
the protected release CLI/docs/tests that invoke it.

Tables and columns: `commercial_availabilities.pricing_mode` and
`commercial_availabilities.vat_treatment`, anchored after the already-present
`commercial_availabilities.transaction_type` column.

Permitted read direction: None; this is an additive schema replacement only.

Permitted write direction: The protected release recovery may change only the
durable zero-statement attempt state from `failed` to `failed_replaced` and
append its separate review-evidence row. The sequenced replacement DDL then
runs through `release:apply`.

Failure and observability behavior: Recovery requires exact protected release
approval, the exact target acknowledgement for apply, the exact failed attempt
and failure digest, an unchanged archive checksum, an exact successful-history
prefix through `0045_commercial_space_positive_area_integrity.sql`, and
read-only proof that `transaction_type` exists while both replacement columns
are absent. Any mismatch fails closed; no ledger history is created for the
rejected SQL and no attempt evidence is deleted.

Automated evidence: Quote-terms release-recovery unit tests, migration
manifest/checksum tests, database-authority static/contract tests, and the
post-recovery schema-congruency and readiness checks.

Expiry or objective removal condition: Remove this exception after the
production zero-statement attempt is reviewed, the sequenced replacement reaches
the canonical head, and the release recovery evidence is retained as historical
incident evidence.

Removal workstream: Database cutover recovery closure.

### Exception ID: DBX-TIDB-INCREMENTAL-DDL-SEQUENCING-2026-09-04-Edward

Status: Approved for the bounded pre-launch TiDB migration-lineage correction

Owner: Property Listify senior product engineering

Approved by Edward on: 2026-09-04, through the ongoing production-cutover authorization to make the canonical local lineage the production authority

Business reason: The zero-statement `0001` failure exposed a TiDB DDL rule that
also affected ten later, still-unapplied migrations. Each combined newly added
columns with their dependent indexes or foreign-key constraints inside one
`ALTER TABLE` job. The corrected lineage preserves every approved schema object
and sequences its column expansion before its dependent objects can be created.

Canonical authority: The canonical Drizzle models and the active SQL manifest
remain authoritative. This exception changes execution sequencing only; it does
not introduce a legacy schema, alternate runtime query, data fallback, or
parallel migration lineage.

Exact files: `server/migrations/0003_canonical_property_measurements.sql`,
`server/migrations/0004_canonical_listing_location.sql`,
`server/migrations/0011_catalogue_publisher_developments.sql`,
`server/migrations/0012_catalogue_publisher_properties.sql`,
`server/migrations/0013_catalogue_publisher_leads.sql`,
`server/migrations/0014_catalogue_publisher_drafts.sql`,
`server/migrations/0015_catalogue_publisher_distribution_partnerships.sql`,
`server/migrations/0016_catalogue_publisher_distribution_access.sql`,
`server/migrations/0034_listing_lead_association.sql`,
`server/migrations/0050_commercial_asset_physical_location.sql`,
`server/migrations/manifest.json`, and
`server/migrations/migrationManifest.ts`.

Tables and columns: additive measurements on `properties`; geography lifecycle
and canonical location fields on `provinces`, `cities`, `suburbs`, and
`listings`; Catalogue Publisher identifiers on `developments`, `properties`,
`leads`, `development_drafts`, `distribution_brand_partnerships`, and
`distribution_development_access`; `leads.listing_id`; and canonical physical
location fields on `commercial_assets`, with their already-approved indexes and
foreign-key constraints.

Permitted read direction: None; this is SQL execution sequencing only.

Permitted write direction: Only the normal canonical migration runner may
apply the amended, still-unapplied active migrations. No manual TiDB DDL,
ledger editing, schema guessing, or historical migration replay is permitted.

Failure and observability behavior: The manifest validator rejects any future
`ALTER TABLE` statement that introduces columns alongside indexes, keys, or
constraints. If any separately sequenced statement fails, the durable attempt
records its exact progress and blocks ordinary continuation for reviewed
recovery; it is never silently retried.

Automated evidence: TiDB compatibility guard tests, migration-manifest and
lineage validation, release recovery tests, Database Authority static checks,
and the post-release schema-congruency/readiness checks.

Expiry or objective removal condition: This exception has no runtime surface.
Its operational relevance ends once the canonical production target reaches
the manifest head; retain this record with the release evidence to explain why
the historical migration statements are deliberately sequenced.

Removal workstream: Database cutover recovery closure.

### Exception ID: DBX-TIDB-CHECK-CONSTRAINT-CONVERGENCE-2026-09-04-Edward

Status: Approved for the bounded production convergence of CHECK constraints

Owner: Property Listify senior product engineering

Approved by Edward on: 2026-09-04, through the production-cutover authorization
to make the canonical local model the production authority

Business reason: The canonical release was applied to TiDB while the global
`tidb_enable_check_constraint` capability was `OFF`. TiDB accepted the historical
DDL but did not retain the 22 canonical CHECK constraints. The successful
migration history is immutable, so ordinary migration replay or ledger edits
would not be authoritative or safe.

Canonical authority: The Drizzle models, immutable baseline, active migration
manifest, and `sql_migration_history` remain the only schema authority. The
bounded convergence command verifies its fixed 22 definitions directly against
the canonical Drizzle model; it does not create a parallel migration lineage.

Protected target and preservation evidence: Production TiDB database
`listify_property_sa` on `gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000`,
with sanitized fingerprint hash
`68f2582a6dc7af8c54cf6f31a396e8abe4c4030696c923b0ea3b1679ba6f5b5e`.
Before this operation, Edward completed and downloaded TiDB Cloud SQL export
`property-listify-production-pre-cutover-2026-09-04`. The downloaded export is
the retained, out-of-repository preservation artifact; this convergence does
not delete or rewrite application data.

Exact files: `server/migrations/recoverTidbCheckConstraintConvergence.ts`,
`server/_core/databaseAuthority/tidbCheckConstraintCapability.ts`,
`server/_core/databaseAuthority/schemaCongruency.ts`,
`server/_core/databaseAuthority/readiness.ts`,
`server/migrations/runSqlMigrations.ts`,
`scripts/databaseAuthorityCli.ts`, and their focused tests and release
documentation.

Tables and columns: The exact 22 canonical CHECK constraints on
`catalogue_publishers`, `commercial_availabilities`,
`commercial_availability_economics`, `commercial_availability_lease_terms`,
`commercial_space_specifications`, `commercial_spaces`,
`development_supersessions`, `land_claims`, `land_conflict_cases`, and
`location_provider_mappings`. No tables, columns, data rows, or migration
history rows are created, removed, or rewritten.

Permitted read direction: The protected plan reads only the canonical migration
head, TiDB's global CHECK capability, the TiDB check-constraint inventory, and
the preflight count of rows violating each exact canonical predicate.

Permitted write direction: After an exact reviewed protected release plan,
apply may set `tidb_enable_check_constraint = ON`, add only a missing listed
canonical CHECK constraint, and append/update one durable convergence attempt
record. It may not mutate application data, alter an existing constraint,
change migration history, or run arbitrary SQL.

Failure and observability behavior: Plan fails closed unless the target is an
approved TiDB staging/production release target at the canonical migration
head, all canonical tables exist, every existing named check has the exact
canonical expression, and no existing row violates a missing check. Apply
requires the exact plan digest, protected approval reference/actor, and release
acknowledgement; it records durable progress under the canonical migration
lock. Any failed or ambiguous DDL leaves durable evidence and blocks ordinary
continuation for a separately reviewed recovery. Normal release application,
schema congruency, and readiness fail closed whenever the TiDB capability is
OFF.

Containment and forward recovery: The plan reports all missing checks and
preflight violations without mutation. Apply holds the canonical migration
lock, creates a durable running attempt before changing the TiDB capability or
adding a check, and records each successful constraint. A failure leaves that
attempt in place and blocks normal continuation; it must be handled by a new,
separately approved recovery rather than retries or manual SQL.

Automated evidence: Capability, schema-congruency, convergence-plan/apply,
failure-path, CLI, manifest-authority, and database-authority static tests;
post-apply `db:schema:congruency`, `db:verify:distribution`, and release
readiness evidence.

Expiry or objective removal condition: Retain the incident evidence after the
one protected production apply. Retire this operational exception once a fresh
TiDB establishment test proves the release flow with CHECK enforcement enabled
before baseline application and no supported target has pending convergence.

Removal workstream: TiDB release-capability admission and cutover closure.

### Exception ID: DBX-PRELAUNCH-CONSUMER-ACTIVITY-INTEGRITY-2026-09-09-Edward

Status: Approved for the pre-launch consumer-activity integrity correction

Owner: Property Listify senior product engineering

Approved by Edward on: 2026-09-09, through the explicit pre-launch database
architecture takeover authorization

Business reason: \`recently_viewed.listingId\` was nullable even though a recent
view has no valid meaning without its authored-listing subject. The existing
rows could also contain duplicate user/listing facts. The correction removes
those ambiguous rows and enforces the one durable subject required by the
consumer activity model before launch.

Canonical authority: \`drizzle/schema/leads.ts\` defines one non-null authored
listing subject for each recent-view row. \`server/migrations/0068\` through
\`0071\` are the only active migration path to that model. The public property is
resolved from its canonical \`sourceListingId\`; no display-text or alternate
subject fallback is permitted.

Exact files: \`server/migrations/0068_recently_viewed_activity_cleanup.sql\`,
\`server/migrations/0069_recently_viewed_listing_required.sql\`,
\`server/migrations/0070_recently_viewed_user_listing_unique.sql\`,
\`server/migrations/0071_recently_viewed_user_recency_index.sql\`,
\`server/migrations/manifest.json\`, \`drizzle/schema/leads.ts\`, and the
authenticated consumer-activity service and contract tests.

Tables and columns: \`recently_viewed.listingId\`, unique index
\`uq_recently_viewed_user_listing\`, and recency index
\`idx_recently_viewed_user_viewed_at\`.

Permitted read direction: Consumer recent-view reads resolve only
\`recently_viewed.listingId\` to a public property whose \`sourceListingId\` is the
same canonical listing. Rows with no listing subject are not readable facts.

Permitted write direction: The canonical migration runner may delete
subjectless and duplicate pre-launch activity rows, make \`listingId\` required,
and add the exact named indexes. Runtime writes may only set the current view
time for one authenticated user/listing fact. No manual SQL, legacy session
fallback, or alternate activity subject is permitted.

Failure and observability behavior: Planning and apply fail closed if the
manifest lineage, migration target, or ownership is inconsistent. Cleanup
precedes the non-null and unique constraints; a DDL failure leaves the durable
migration attempt record for investigation. The authenticated service
validates the public-property to authored-listing mapping before writing.

Automated evidence: Migration manifest and migration-tree validation,
consumer-activity service tests, static public-inventory contract tests,
schema-congruency, and a fresh canonical consumer-contract run.

Expiry or objective removal condition: This record has no runtime fallback.
Retire the exceptional migration classification after the fresh canonical
establishment and consumer-contract evidence reaches \`0071\`; retain the
historical record with the immutable lineage.

Removal workstream: Pre-launch consumer activity integrity closure.

+### Exception ID: DBX-PRELAUNCH-LEGACY-CONSUMER-PROFILE-RETIREMENT-2026-09-09-Edward

Status: Approved for the pre-launch retirement of disconnected consumer-profile tables

Owner: Property Listify senior product engineering

Approved by Edward on: 2026-09-09, through the explicit pre-launch database architecture takeover authorization

Business reason: The CRM-era `prospects`, `prospect_favorites`, and `scheduled_viewings` tables have no reachable runtime consumer. They duplicate the canonical authenticated consumer facts, prospect identities, and showing workflow while permitting ambiguous ownership and subject relationships. Pre-launch data preservation is not a design requirement.

Canonical authority: `drizzle/schema/` contains the active `favorites`, `recently_viewed`, `prospect_identities`, and `showings` models. The active migration lineage is `0072` through `0074`; no runtime fallback or parallel table authority is permitted.

Exact files: `drizzle/schema/leads.ts`, `server/db.ts`, `drizzle/relations.ts` (removed), `server/migrations/0072_retire_legacy_prospect_favorites.sql`, `server/migrations/0073_retire_legacy_scheduled_viewings.sql`, `server/migrations/0074_retire_legacy_prospects.sql`, `server/migrations/manifest.json`, and the migration-tree and contract evidence.

Tables and columns: `prospect_favorites` (all columns), `scheduled_viewings` (all columns), and `prospects` (all columns). The task-owned disposable target was measured at zero rows in each table before contraction.

Permitted read direction: None after migration 0074. Consumer saved inventory reads `favorites`, recent activity reads `recently_viewed`, private prospect identity reads `prospect_identities`, and scheduling reads the canonical `showings` workflow.

Permitted write direction: Only the canonical migration runner may drop these three tables in child-before-parent order. Runtime code must not recreate, read, write, or fall back to them. The exceptional operation is authorized for the task-owned disposable pre-launch target; no hosted or protected target is included.

Failure and observability behavior: Manifest validation proves the exact parent chain, checksums, and approval reference. Apply uses the canonical lock, owner connection, durable attempt ledger, and exact expected head. A failed or ambiguous DDL attempt remains recorded and blocks continuation; it is not retried with alternate SQL.

Automated evidence: Static reachability audit, TypeScript and lint checks, migration-manifest tests, schema inventory generation, schema congruency, disposable-target readiness, and a fresh canonical consumer-contract run at migration 0074.

Expiry or objective removal condition: The destructive classification is complete once the fresh canonical establishment and consumer-contract evidence reaches `0074_retire_legacy_prospects.sql`. Retain this record as immutable historical evidence; no runtime compatibility exception is created.

Removal workstream: Pre-launch legacy consumer-profile retirement.

## Required exception record

Every approved exception must contain:

```text
Exception ID:
Status:
Owner:
Approved by Edward on:
Business reason:
Canonical authority:
Exact files:
Tables and columns:
Permitted read direction:
Permitted write direction:
Failure and observability behavior:
Automated evidence:
Expiry or objective removal condition:
Removal workstream:
```

An incomplete or unregistered exception has no architectural authority.
