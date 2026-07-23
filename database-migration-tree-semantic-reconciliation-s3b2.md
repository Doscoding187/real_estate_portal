# DBA-S3B-2 — Semantic Reconciliation

## 1. Executive conclusion

Static reconciliation of every legacy `CREATE TABLE` not present by exact name
in the canonical baseline produced **55 unique physical names** from **231
legacy definitions**. The raw distinct-name counts are: archive 2, top-level
`drizzle/*.sql` 44, top-level `drizzle_old/*.sql` 43, nested
`drizzle_old/migrations/*.sql` adds `bundle_attributions` (44 combined), root
`migrations/*.sql` 18, and root SQL 3.

There is one possible canonical omission: `bundle_attributions`. Current
runtime code performs inserts, reads, aggregates, and deletes against that
physical table in `server/services/bundleAttributionService.ts`, yet neither
`drizzle/schema/**`, the canonical inventory, nor the baseline defines it.

All other names have a concrete replacement, compatibility alias, generated
metadata role, or current-source evidence that they are retired/experimental.
No absent name remains unresolved merely because the list was large.

## 2. Resolved distribution aliases

| Historical physical table                 | Source                                                                                                    | Classification              | Canonical physical table and evidence                                                                                                                                                                                                                                              |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `distribution_program_required_documents` | `server/migrations/_archived/pre-canonical-baseline/0038_create_distribution_program_workflow_engine.sql` | 4. Compatibility alias only | `development_required_documents`; `drizzle/schema/distribution.ts` exports `distributionProgramRequiredDocuments = developmentRequiredDocuments`. The old `workflow_id`, document key/label, required/order responsibility is superseded by development-scoped required documents. |
| `distribution_deal_document_statuses`     | same archive file                                                                                         | 4. Compatibility alias only | `distribution_deal_documents`; `drizzle/schema/distribution.ts` exports `distributionDealDocumentStatuses = distributionDealDocuments`. The canonical table retains deal/document/status/received-by lifecycle responsibility.                                                     |

These are obsolete historical physical names, not baseline omissions. The
archive remains temporary evidence only.

## 3. Complete semantic classification matrix

For every row, source means the legacy SQL family: `D` = top-level
`drizzle/*.sql`, `DO` = `drizzle_old/**/*.sql`, `RM` = root `migrations/**/*.sql`,
`R` = root SQL, and `A` = `server/migrations/_archived/**/*.sql`. The extraction
recorded each definition's columns, primary key, foreign keys, and indexes;
common fingerprints are summarized below. Repeated source occurrences are
duplicate historical definitions unless stated divergent.

| Unique legacy table(s)                                                                                                                                                                                                                                                                                                                                                                                                                                              | Source family / significant definition fingerprint                                                                                                                      | Classification and current evidence                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bundle_attributions`                                                                                                                                                                                                                                                                                                                                                                                                                                               | DO; UUID PK, `bundle_id`, partner/user/content/lead IDs, event type, attribution indexes and FKs to `marketplace_bundles`/`explore_partners`                            | 7. Possible canonical omission. `server/services/bundleAttributionService.ts` inserts, aggregates, and deletes it. No canonical model or baseline table exists.                                                                                                                                                                    |
| `distribution_program_required_documents`, `distribution_deal_document_statuses`                                                                                                                                                                                                                                                                                                                                                                                    | A; integer PKs, workflow/deal FK, document key, required/received state, unique composite keys                                                                          | 4. Compatibility alias only; resolved above.                                                                                                                                                                                                                                                                                       |
| `geocoding_cache`                                                                                                                                                                                                                                                                                                                                                                                                                                                   | RM; address/place ID, coordinates, expiry, unique address and expiry index                                                                                              | 1. Renamed to canonical `location_search_cache`; both provide cached location lookup rather than application-domain authority.                                                                                                                                                                                                     |
| `payment_proofs`                                                                                                                                                                                                                                                                                                                                                                                                                                                    | D, DO, RM; invoice/subscription/agency/user references, amount, proof URL, verification status                                                                          | 3. Replaced by canonical `billing_payment_documents`, `billing_payments`, and `billing_invoices`.                                                                                                                                                                                                                                  |
| `failed_payments`, `subscription_transactions`, `revenue_forecasts`                                                                                                                                                                                                                                                                                                                                                                                                 | D, DO, RM; subscription/invoice/payment state, amount/currency, retry or forecast data                                                                                  | 3. Replaced by provider-independent canonical billing: `billing_payments`, `billing_transactions`, `billing_invoices`, and billing audit records.                                                                                                                                                                                  |
| `advertising_campaigns`, `marketing_campaigns`, `campaign_budgets`, `campaign_channels`, `campaign_creatives`, `campaign_leads`, `campaign_performance`, `campaign_schedules`, `campaign_targeting`                                                                                                                                                                                                                                                                 | D, DO, RM; campaign PKs with advertiser/owner, budget, schedule, targeting, creative, lead and performance columns                                                      | 3. Replaced by canonical `demand_campaigns`, `boost_campaigns`, `hero_campaigns`, `content_approval_queue`, `listing_analytics`, and demand lead tables. No current source references any old physical campaign table.                                                                                                             |
| `exploreComments`, `exploreFollows`, `exploreLikes`, `exploreVideoViews`, `exploreVideos`, `explore_boost_campaigns`, `explore_categories`, `explore_creator_follows`, `explore_highlight_tags`, `explore_interactions`, `explore_neighbourhood_follows`, `explore_neighbourhood_stories`, `explore_neighbourhoods`, `explore_saved_properties`, `explore_sponsorships`, `explore_topics`, `explore_user_preferences`, `explore_user_preferences_new`, `videoLikes` | D, DO, RM, R; legacy video/content IDs, user IDs, engagement event fields, tags/topics/categories, preferences, boosts and counters; mostly integer/camel-case variants | 3. Replaced by newer canonical Explore model: `explore_content`, `explore_discovery_videos`, `explore_engagements`, `explore_feed_sessions`, `explore_partners`, `explore_shorts`, plus canonical listing/prospect models. Current hits are snapshots, historical scripts, or manual utilities, not runtime physical-table access. |
| `property_clicks`, `search_analytics`, `suburb_reviews`, `user_behavior_events`, `user_preferences`, `user_recommendations`, `location_analytics_events`, `location_targeting`                                                                                                                                                                                                                                                                                      | D, DO, RM; event/user/location/property IDs, JSON filters/preferences, counters, and analytics indexes                                                                  | 3. Replaced by canonical `analytics_events`, `listing_analytics`, `location_search_cache`, `location_searches`, `prospect_favorites`, `price_analytics`, and `market_insights_cache`. No current physical-table requirement found.                                                                                                 |
| `development_partners`, `development_partnerships`                                                                                                                                                                                                                                                                                                                                                                                                                  | D, DO; development/brand FK pairs, partner role, visibility, ordering, unique pair constraints                                                                          | 5. Intentionally retired legacy/experiment. `server/services/partnershipService.ts` explicitly says `development_partners table not available yet` and returns no-op values; current partnership authority is canonical distribution/marketplace models.                                                                           |
| `nearby_amenities`                                                                                                                                                                                                                                                                                                                                                                                                                                                  | RM; amenity type/name, coordinates/spatial data, rating and location indexes                                                                                            | 5. Intentionally retired legacy/experiment. `server/enhancedLocationRouter.ts` says a real implementation _would_ query it; no query occurs. Canonical `amenities`/location model remains.                                                                                                                                         |
| `pending_agent_profiles`                                                                                                                                                                                                                                                                                                                                                                                                                                            | RM; user FK, agent profile fields, unique user profile                                                                                                                  | 5. Intentionally retired legacy/experiment. `server/_core/auth.ts` states registration and verification must not depend on this legacy staging table.                                                                                                                                                                              |
| `platform_inquiries`                                                                                                                                                                                                                                                                                                                                                                                                                                                | D, DO; contact/user type, intent, message and status                                                                                                                    | 5. Intentionally retired legacy/experiment. No current runtime physical-table access or canonical inventory entry.                                                                                                                                                                                                                 |
| `spec_variations`                                                                                                                                                                                                                                                                                                                                                                                                                                                   | D, DO; unit-type FK, name/price, overrides/media JSON, active/order fields                                                                                              | 5. Intentionally retired legacy unit-type experiment. No current schema symbol/runtime physical-table access.                                                                                                                                                                                                                      |
| `analytics_aggregations_backup`, `city_price_analytics_backup`, `market_insights_cache_backup`, `price_analytics_backup`, `schema_version`                                                                                                                                                                                                                                                                                                                          | RM; `CREATE TABLE AS` backup copies or a simple version ledger                                                                                                          | 6. Generated/tooling metadata mistaken for domain schema. Canonical analytics tables and `sql_migration_history` supersede them.                                                                                                                                                                                                   |

### Definition and duplicate evidence

The SQL extraction captured all source paths per table. Repeated definitions are
particularly dense in `drizzle` and `drizzle_old`; `exploreVideos`, the Explore
engagement family, campaign tables, `user_preferences`, and `development_partners`
appear in several generated chains. Definitions are divergent where historical
revisions changed camelCase/snake_case names, integer versus UUID IDs, or added
later fields/indexes. Those are evolution records, not competing current schema.

The complete source sets include, for example:

- `bundle_attributions`: `drizzle_old/migrations/add-partner-marketplace-schema.sql`;
- the two distribution aliases: archive `0038_create_distribution_program_workflow_engine.sql`;
- root-only backup/version tables: `migrations/create-optimized-analytics-schema.sql`;
- `pending_agent_profiles`: `migrations/add-pending-agent-profiles-table.sql`;
- `nearby_amenities` and `geocoding_cache`: `migrations/enhance-mysql-spatial.sql` and `migrations/enhance-postgis-integration.sql`;
- root Explore tables: `RAILWAY_DIRECT_SQL.sql` and `RAILWAY_EXPLORE_SHORTS_FIX.sql`;
- all other duplicated entries: the SQL chains named in the prior audit report's
  inventory under `drizzle/`, `drizzle_old/`, and `migrations/`.

## 4. Possible canonical omissions

| Table                 | Exact current evidence                                                                                                                                       | Required later action                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `bundle_attributions` | `server/services/bundleAttributionService.ts:97-100`, `:114-118`, `:137-140`, `:177-178`, `:218-220`, `:270-271`, `:399`, and `:407` execute SQL against it. | Create a separately approved canonical-schema correction; do not add it to the baseline in Gap 2. |

There are no other possible canonical omissions. `development_partners`,
`nearby_amenities`, and `pending_agent_profiles` have explicit current comments
that they are unavailable, hypothetical, or legacy-only rather than required.

## 5. Manual utility dependency matrix (Gap 3 boundary)

| Utility                                                                                                                   | Legacy dependency                                                      | Package/CI/startup reference | Gap 3 disposition                      |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------- | -------------------------------------- |
| `scripts/apply-financial-migration.ts`                                                                                    | `drizzle/0011_add_financial_columns.sql`                               | none                         | retire                                 |
| `scripts/apply-unit-types-migration.ts`                                                                                   | `drizzle/0012_add_unit_types_financial_columns.sql`                    | none                         | retire                                 |
| `scripts/fix_snapshot.js`                                                                                                 | `drizzle/meta/0013_snapshot.json`                                      | none                         | retire                                 |
| `scripts/run-development-location-migration.ts`                                                                           | nonexistent `drizzle/migrations/add-development-location-fields.sql`   | none                         | retire                                 |
| `scripts/run-development-wizard-migration.ts`                                                                             | nonexistent `drizzle/migrations/**`                                    | none                         | retire                                 |
| `scripts/run-enhanced-unit-types-migration.ts`                                                                            | nonexistent `drizzle/migrations/add-enhanced-unit-types.sql`           | none                         | retire                                 |
| `scripts/run-google-places-monitoring-migration.ts`                                                                       | nonexistent `drizzle/migrations/create-api-usage-monitoring.sql`       | none                         | retire                                 |
| `scripts/run-location-performance-migration.ts`                                                                           | nonexistent `drizzle/migrations/add-location-performance-indexes.sql`  | none                         | retire                                 |
| `scripts/run-phase-optimization-migration.ts`                                                                             | nonexistent `drizzle/migrations/add-phase-optimization-fields.sql`     | none                         | retire                                 |
| `scripts/run-price-insights-indexes.ts`                                                                                   | nonexistent `drizzle/migrations/add-price-insights-indexes.sql`        | none                         | retire                                 |
| `scripts/run-unit-types-spec-variations-migration.ts`                                                                     | nonexistent `drizzle/migrations/create-unit-types-spec-variations.sql` | none                         | retire                                 |
| `scripts/run-wizard-optimization-migration.ts`                                                                            | nonexistent `drizzle/migrations/add-wizard-optimization-fields.sql`    | none                         | retire                                 |
| `scripts/run-wizard-v2-migration.ts`                                                                                      | nonexistent `drizzle/migrations/add-wizard-v2-fields.sql`              | none                         | retire                                 |
| `scripts/diagnose-location-pages.ts`, `scripts/fix-location-pages.ts`, `setup-explore-feed.ps1`, `verify-explore-feed.ts` | root `migrations/**` instructions                                      | none                         | repoint to canonical command or retire |

No manual utility currently reads `drizzle_old/**`, root-level SQL, or
`scripts/*.sql` by path. Those files are retained temporarily as historical
evidence until the Gap 3 retirement/repoint patch lands.

## 6. Documentation authority matrix

| Current-looking document                                                                                  | Legacy instruction                      | Proposed Gap 2 disposition                    |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------- |
| `MIGRATION_GUIDE.md`                                                                                      | `pnpm db:push`                          | mark superseded                               |
| `QUICK_START_AUTH.md`, `START_SERVER.md`, `AUTHENTICATION_SETUP.md`, `PROJECT_DOCUMENTATION.md`           | `pnpm db:push`                          | update to canonical workflow                  |
| `DATABASE_SETUP_GUIDE.md`, `DATABASE_MANAGEMENT_OPTIONS.md`                                               | root `migrations/**`/manual SQL         | mark superseded                               |
| `RAILWAY_EXPLORE_SHORTS_MIGRATION.md`, `RAILWAY_EXPLORE_SETUP.md`, `EXPLORE_DISCOVERY_MIGRATION_GUIDE.md` | `drizzle/migrations/**`/manual SQL      | move to historical archive or mark superseded |
| `docs/MIGRATION_CHECKLIST.md`                                                                             | `pnpm db:push`, `drizzle/migrations/**` | update to canonical workflow                  |
| historical completion reports and dated audits                                                            | legacy path mentions as history         | retain unchanged when clearly historical      |

## 7. Final tree-level disposition

| Tree                          | Disposition                                                                                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/migrations/_archived` | retain temporarily until the semantic archive decision and later evidence-retention review; never executable                                          |
| `drizzle/*.sql`               | retain temporarily until Gap 3 dependency removal, then delete after Gap 3                                                                            |
| `drizzle/meta/**`             | retain temporarily until Gap 3 removes `fix_snapshot.js`, then delete after Gap 3                                                                     |
| `drizzle_old/**`              | retain temporarily while `bundle_attributions` canonical correction and historical-deletion decision are made; delete after Gap 3/omission correction |
| root `migrations/**`          | retain temporarily until Gap 3 repoints/retires manual instructions, then delete after Gap 3                                                          |
| `server/db/migrations/**`     | delete in Gap 2 once the `bundle_attributions` correction scope is separated and archive retention is approved                                        |
| root `*.sql`                  | retain temporarily pending documentation supersession and legacy Explore evidence decision; delete after Gap 3                                        |
| `scripts/*.sql`               | retain temporarily until Gap 3 manual-utility review, then delete after Gap 3                                                                         |
| Docker initialization SQL     | retain permanently: `docker/mysql-local/init/01-create-local-databases.sql`; `docker/mysql/init.sql` may delete in Gap 2                              |
| test/diagnostic SQL fixtures  | retain permanently: `server/scripts/sanity_test_seed_cleanup.sql`; retain temporary historical diagnostics otherwise                                  |

## 8. Proposed Gap 2 implementation boundary (not implemented)

After approval of the standalone `bundle_attributions` correction and the
temporary-retention rule, a Gap 2 patch may:

1. add a migration-tree authority manifest/contract that classifies retained
   trees, disallows new active SQL outside top-level `server/migrations`, and
   forbids journals as applied ledgers;
2. correct or prominently supersede the eleven current-looking documents listed
   above;
3. delete `server/db/migrations/add-residential-auction-workflow-v1.sql` and
   unmounted `docker/mysql/init.sql` only after senior confirmation;
4. retain all SQL read by the utility matrix until Gap 3 completes.

No baseline change, legacy-tree deletion, manual utility modification, database
operation, or implementation worktree is authorized in this reconciliation.

## 9. Decision gate, risks, and deferred work

`GAP_2_RECONCILIATION=PASS`

The semantic blocker is resolved: every absent table has a classification and
the one canonical omission has exact current runtime evidence. Gap 2 still
requires founder/senior-architect approval of the proposed temporary retention,
documentation patch boundary, and separate `bundle_attributions` schema
correction before implementation begins.

Gap 3 owns utility retirement/repointing. Gap 4 owns database lifecycle proof.
No database was opened; static reconciliation does not prove deployed data
compatibility.
