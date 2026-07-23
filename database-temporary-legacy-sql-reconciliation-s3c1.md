# Database Temporary Legacy SQL Reconciliation — S3C1

## Scope and authority

This inventory covers every tracked temporary Gap 3 surface: 45 top-level `drizzle/*.sql` files, 17 `drizzle/meta/**` files, 38 SQL files under root `migrations/**`, 11 root SQL files, and seven `scripts/*.sql` files. It also classifies five adjacent SQL artifacts. The only executable application migration remains `server/migrations/0000_canonical_launch_baseline.sql`; the only ledger remains `sql_migration_history`.

## Quantitative reconciliation

| Surface | Files | Schema statements / unique tables | Current disposition |
| --- | ---: | ---: | --- |
| `drizzle/*.sql` | 45 | 2,767 / 147 | Delete after dependent utility and documentation retirement; preserve Git history. |
| `drizzle/meta/**` | 17 | generated snapshots/journal | Delete after `fix_snapshot.js` and any Drizzle-generation dependency are retired. |
| `migrations/**` | 41 tracked entries (38 SQL) | 126 / 72 across SQL entries | Split: historical schema files delete after caller/doc retirement; read-only/seed/backup examples require bounded retention or replacement. |
| Root `*.sql` | 11 | 35 / 18 | Retire direct-Railway/schema repair SQL; keep only separately approved local/test credential/seed evidence if needed. |
| `scripts/*.sql` | 7 | 20 / 3 | Retain diagnostics as non-migration only; retire schema-repair SQL after callers are gone. |
| Adjacent SQL | 5 | local/test/example/backup | See adjacent classification below. |

The static parser saw 147 unique table identifiers in Drizzle history and 72 in root migrations. Across the 101 retained SQL files, deduplication produced 155 table identifiers and 2,948 `CREATE/ALTER` occurrences: 103 are present by exact name in both the canonical baseline and inventory; the remaining 52 exact-name absences are the already reconciled renamed, merged, replaced, or retired concepts. Legacy-only examples include retired advertising/revenue/Explore experiments, historical backup/version tables, and direct repair scaffolding. No file supplied a current, reachable, semantically compatible canonical omission. This is consistent with the Gap 2 semantic reconciliation and the approved finding that `bundle_attributions` is dead legacy.

## Top-level Drizzle SQL inventory and disposition

All 45 are generated/non-operational history and have no approved runner, CI, startup or deployment caller. `scripts/apply-financial-migration.ts` and `scripts/apply-unit-types-migration.ts` are the only direct callers of two files; they must retire first.

| Cohort | Exact files | Disposition |
| --- | --- | --- |
| Historical baseline snapshots | `0000_bumpy_starfox.sql`, `0000_fuzzy_thunderbolt_ross.sql`, `0000_new_marvel_zombies.sql`, `0001_broad_dark_beast.sql`, `0001_petite_tattoo.sql` | Delete after callers/docs; overlapping historical schema is superseded by canonical baseline. |
| Historical generated increments | `0002_add_property_developer_role.sql`, `0002_stormy_kate_bishop.sql`, `0003_messy_payback.sql`, `0003_slippery_marvel_zombies.sql`, `0004_abandoned_lady_bullseye.sql`, `0004_material_logan.sql`, `0005_colorful_toxin.sql`, `0006_aspiring_shaman.sql`, `0006_naive_marvex.sql`, `0007_jittery_cloak.sql`, `0007_parched_sister_grimm.sql`, `0008_add_wizard_fields.sql`, `0008_tired_scream.sql`, `0009_curly_frog_thor.sql`, `0009_hesitant_rachel_grey.sql`, `0010_melodic_mordo.sql`, `0010_wide_thunderbolts.sql`, `0011_add_explore_tables.sql`, `0011_cold_bill_hollister.sql`, `0012_crazy_yellow_claw.sql`, `0012_light_captain_cross.sql`, `0013_ambiguous_jasper_sitwell.sql`, `0013_cultured_naoko.sql`, `0014_cheerful_amazoness.sql`, `0014_cooing_amphibian.sql`, `0014_shallow_mesmero.sql`, `0015_chemical_network.sql`, `0015_cloudy_romulus.sql`, `0015_icy_hedge_knight.sql`, `0016_add_missing_unit_types_columns.sql`, `0017_add_partnership_tables.sql`, `0018_add_agent_columns.sql`, `0019_remove_unit_type_size_range.sql` | Delete after callers/docs; canonical concepts are represented, renamed, merged, or retired. |
| Directly called historical SQL | `0011_add_financial_columns.sql`, `0012_add_unit_types_financial_columns.sql` | Delete after retiring their two wrappers. |
| Manual/consolidated history | `consolidated_missing_tables.sql`, `manual_development_phases.sql`, `manual_pricing_migration.sql`, `0001_icy_giant_man.sql`, `0005_dry_maria_hill.sql` | Delete after utility/doc retirement. The unique legacy tables are retired experiments or replaced models, not canonical omissions. |

Representative SHA-256 values: `0000_bumpy_starfox.sql` `613cf31878f14f69bbbdd469e357c4bb1d0101f59e00dc5d8a9a53170fdf6bbd`; `0011_add_financial_columns.sql` `affb80ba10cbe1000056f95a207fbb9c0ec04583962393514f1106fd9cded766`; `0012_add_unit_types_financial_columns.sql` `e72b8d43e1524d973ee1b527d5447463b7e6338fc426fba92edecdc070cf1062`; `consolidated_missing_tables.sql` `01e2373222657f79556143039c9d8a50b174221c874b31865bb305d70be15174`. The deterministic per-file hash command is recorded in the implementation plan; every listed file is tracked and unchanged.

## Drizzle metadata

`drizzle/meta/0000_snapshot.json` through `0015_snapshot.json` plus `_journal.json` are generated, non-operational history. Their SHA-256 range is anchored by `0000_snapshot.json` `2e48acaed621839ccfcc29a5e2dbd6839e45a9c583e9eb8b1189e5e402b906ae`, `0013_snapshot.json` `48a48a2193c595ef5a8ec9c407052a08e808187468ba9593bdbb2223f5023eae`, `0015_snapshot.json` `589a87014396f5636c4489bb980e3ee848f19be3a88ad0bd6b1209b2c1c75594`, and `_journal.json` `2974afcd9cde7b661d322e8bede8dcfd7fc2123a9394cb03d995f42de39814a2`.

No approved runner reads these files. The only direct mutator found is `scripts/fix_snapshot.js`, which edits snapshot `0013` and must retire. They are not, and must never be described as, the applied production ledger; `sql_migration_history` is the sole ledger. Delete the metadata only after confirming no supported Drizzle generation workflow expects it; source, runtime, CI, custom runner, schema sanity and Gap 2 contracts do not make it migration authority.

## Root migrations inventory and disposition

| Class | Exact files | Disposition |
| --- | --- | --- |
| Historical schema/duplicate creation | `add-missing-developer-columns.sql`, `add_developer_specializations.sql`, `add_portfolio_metrics.sql`, `create-agencies-table.sql`, `create-agent-dashboard-tables.sql`, `create-base-schema.sql`, `create-core-tables.sql`, `create-development-drafts-table.sql`, `create-explore-feed-tables.sql`, `create-invitations-table.sql`, `create-location-hierarchy.sql`, `create-locations-table.sql`, `create-missing-tables.sql`, `create-notifications-table.sql`, `create-price-insights-analytics-schema.sql`, `create-prospect-tables.sql`, `create-saved-searches-table.sql`, `create-subscription-system.sql`, `create-user-preferences-table.sql` | Delete after callers and operational docs are retired; canonical baseline/schema replaces their schema authority. |
| Retired/experimental or conflicting schema | `add-payment-proofs-table.sql`, `add-pending-agent-profiles-table.sql`, `create-optimized-analytics-schema.sql`, `create-revenue-center-tables.sql`, `enhance-mysql-spatial.sql`, `enhance-postgis-integration.sql`, `prospect-tables-workbench.sql` | Delete after documentation and utility callers are retired; old tables/engines are not approved canonical requirements. |
| Data seed/repair/verification | `add-property-images.sql`, `add-sandton-test-properties.sql`, `add-sarb-rate-settings.sql`, `backup-database.sql`, `check-data.sql`, `debug-properties.sql`, `seed-explore-feed-data.sql`, `seed-sample-data.sql`, `verify-setup.sql` | Reclassify outside migration authority. Retain only if future controlled data-diagnostic/seed owners approve; otherwise delete. |
| Unsafe administrative setup | `00-create-database.sql`, `full-database-setup.sql`, `grant-permissions.sql` | Retire or move to an explicitly approved local/admin operational guide; never application migration authority. |

`migrations/MIGRATION-GUIDE.txt`, `migrations/.gitignore`, and `migrations/setup-database.ps1` are non-SQL companions: historical documentation and a broken setup utility. They are candidates for retirement with the tree.

## Root SQL and scripts SQL

| Surface | Files and SHA-256 | Disposition |
| --- | --- | --- |
| Root direct-Railway/schema SQL | `DEVELOPER_APPROVAL_MIGRATION.sql` `61aca557f2e63e2bc9d15fc991298c76baa013fbadaeee93d823610970624315`; `RAILWAY_DIRECT_SQL.sql` `37b0dae10b1ff158e1a5d798f169f178fe375c39eb12a0b3e24e7000cc9238b2`; `RAILWAY_EXPLORE_SHORTS_FIX.sql` `bce8c6fb94b3290ef2d1cc2726607d90da34f52a39a6c8cd2cee9a1ce4360899`; `RAILWAY_MIGRATION_SETUP.sql` `3b7e7f25a62535458196a38177012f7c9e67aba6de28f7ad6132019401f65085`; `add-auth-columns.sql` `23c6dae7c...`; `add-role-based-auth.sql` `106cfebd...`; `fix-developer-database.sql` `2f451ba3...`; `quick-developer-fix.sql` `77f1b49c...` | Retire after correcting direct-Railway and manual SQL guides. |
| Root credentials/test/seed | `create-mysql-user.sql` `f84971fe6710b73a1238295270ed7de9fec8909393f6d0cea88ab66ae06ad30a`; `grant_test_permissions.sql` `9cf100b6985a99605c517cf5dfa4418fe827ab4ef215a01c0c8268b0800b86fc`; `seed-super-admin.sql` `564835e99427f57e3c6f94e875693d9dade9418b033bb4db263dac8bf8b1a86a` | Controlled local/test/admin candidates, not migration authority; retain only with ownership/guardrails. |
| `scripts/*.sql` diagnostics | `debug_schema.sql` `91b15e8158ee3b9e61a2076f2cf942e171d37231de99c4206f0d0a7da0354818`; `manual_schema_verify.sql` `2dc8d5971cb2a37a69895e5e9f56b2cf8dc51dd3ed177a08e33e88ac49534a87`; `verify_unit_types_schema.sql` `66a118abca67036df03e1ce889e880adb3282a76e2a20c92ca30ab6b778f5b98` | Retain only as read-only diagnostics with explicit target safeguards. |
| `scripts/*.sql` schema/data repair | `fix-agents-table.sql` `e4859693d6a2dcd244639aa0c48a681677c9abac98b458f1ad83502f2efad569`; `fix-listings-schema.sql` `8d76de3c687bdb43f4b4c2bb5646cbdcc4b0e19704d46ce69376a1a0379c6295`; `fix_schema_drift.sql` `9227064d84eeaa709359c7574f8c27493a5136ff4f8f47d7dc731464384a7cc4`; `manual_unit_migration.sql` `cca3e9a106f680d55007a90380defc5a0f2e467c0a5729640012a00d81ae5c2c` | Retire after caller/documentation retirement; never executable migration authority. |

## Adjacent SQL classification

| Path | SHA-256 | Classification and future disposition |
| --- | --- | --- |
| `docker/mysql-local/init/01-create-local-databases.sql` | `6ae5e3e7d3c12af00d51ea4b2bc7957d26d54f4f84e56eb6b7b857ff4b7467dd` | Approved local/test initialization; retain canonical supporting operational artifact. It creates local/test databases/users, not application schema. |
| `server/scripts/sanity_test_seed_cleanup.sql` | `614665478b818e9a03b8631712f33fd419641204c8937fb6b834237802b7aea1` | Test/diagnostic fixture; retain non-migration. |
| `server/scripts/init-local-db.sql` | `ea021fcc88024194754d5b6a192a0253cb78fa1045722bed1159bab70216755f` | Legacy local initialization example; retire or convert to clearly labelled documentation only. |
| `server/routes/SELECT id, name, userId.sql` | `d0710fbe87849a0c0e83e024eff2a72b035d5d6ee2fd0e5c5f8f6908d78230a8` | Query example; retain only as non-migration documentation/example if still referenced. |
| `backups/cleanup-backup-2026-01-29T20-02-35-220Z.sql` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | Empty historical backup artifact; delete after confirming no archival policy requires it. |

## Canonical semantic outcome

Legacy effects fall into six reconciled groups: canonical table/column duplicates; renamed/merged concepts; superseded Explore/advertising/billing/location experiments; generated Drizzle history; seeds/data repair; and read-only diagnostics. No active runtime reachability plus canonical-schema gap was found. In particular, no retained file changes the approved Gap 2 conclusion that `bundle_attributions` is dead legacy.

## Documentation dependencies

The material current-looking documentation references are listed in the utility audit. Historical `.kiro/**`, delivery-complete reports, and implementation summaries are evidence-only unless surfaced by a current index or README. A future documentation slice must remove every instruction to apply root `migrations/**`, root SQL, direct Railway SQL, or removed `drizzle/migrations/**` SQL.

## Appendix A — deterministic retained-surface file inventory

Generated statically from tracked files on `d645e905…`. `effect` lists parsed `CREATE/ALTER TABLE` identifiers and index identifiers; `data` means the file contains an INSERT/UPDATE/DELETE/REPLACE token. A dash means no matching schema identifier, not proof that the file is harmless. Each path has exactly one disposition in the matrix above.

### drizzle/*.sql (45 files)

| Path | SHA-256 | Bytes | Lines | Effect |
| --- | --- | ---: | ---: | --- |
| `drizzle/0000_bumpy_starfox.sql` | `613cf31878f14f69bbbdd469e357c4bb1d0101f59e00dc5d8a9a53170fdf6bbd` | 50329 | 1042 | agencies, agency_branding, agency_join_requests, agency_subscriptions, agent_coverage_areas, agents, analytics_aggregations, audit_logs +44; data |
| `drizzle/0000_fuzzy_thunderbolt_ross.sql` | `01dfa88f8c02d1957b8ff1b6fe5de4e183f8dd3d20c95c38fe4798dae8ea4ae5` | 139699 | 2699 | activities, agencies, agency_branding, agency_join_requests, agency_subscriptions, agent_coverage_areas, agents, amenities +121; idx idx_activities_developer_id, idx_activities_activity_type, idx_activities_created_at +203; data |
| `drizzle/0000_new_marvel_zombies.sql` | `ff645433788a228893018544a5e0d2ae08d0b9b6bc7d12a406112f60106b2772` | 108146 | 2111 | activities, agencies, agency_branding, agency_join_requests, agency_subscriptions, agent_coverage_areas, agents, amenities +97; idx idx_activities_developer_id, idx_activities_activity_type, idx_activities_created_at +156; data |
| `drizzle/0001_broad_dark_beast.sql` | `112bb1d8f0b9c377e867f6392d19d428e399caa80f3bb4a6930409a933cad1a0` | 19767 | 210 | agencies, agency_subscriptions, coupons, email_templates, invitations, invites, invoices, locations +44 |
| `drizzle/0001_icy_giant_man.sql` | `ea24e4ecb1537dad9e31c9beef042b9b1aee16dbb4ca588b6d7cc754645a4616` | 1751 | 22 | development_partnerships; idx dev_brand_idx, brand_dev_idx; data |
| `drizzle/0001_petite_tattoo.sql` | `fdaa1f1670028f48a8f335a36fb6a1cdbad349e1968f1edd36f488f81d6da682` | 13494 | 107 | activities, agencies, agency_branding, agency_join_requests, agency_subscriptions, agent_coverage_areas, agents, amenities +92 |
| `drizzle/0002_add_property_developer_role.sql` | `d4e41a4cdf95f72a25b9967cc0375e71612044a90f14a4bfe61d1da88fed0939` | 142 | 1 | users |
| `drizzle/0002_stormy_kate_bishop.sql` | `2e0a2af755533492dd5a6080a5cbb5ebd5783cd9e98a2bb38a8a74422e1c7cb0` | 87 | 1 | activities |
| `drizzle/0003_messy_payback.sql` | `3dace6db18fbcc84511892e1c4c32ff89a84fe9d730b93140cd8e59d79525b55` | 555 | 10 | —; idx price_idx, status_idx, city_idx +7 |
| `drizzle/0003_slippery_marvel_zombies.sql` | `3a9045251dbccb2aa6171ecf4b29942ceed65d40e3dcf553318e79b08e776da6` | 71 | 1 | activities |
| `drizzle/0004_abandoned_lady_bullseye.sql` | `e4f452200684543349286f1c5e1b074411f036120c13af0faa7dbd91966d5161` | 5981 | 94 | partners, property_clicks, search_analytics, suburb_reviews, developments, saved_searches, developers, listings +1; idx idx_partners_status, idx_partners_category, idx_property_clicks_property +10; data |
| `drizzle/0004_material_logan.sql` | `82402b17c709d2295e8a8ad1525f64ca535383804d2fb888ed14c26b6a3264e5` | 13431 | 176 | listing_settings, saved_searches, listing_analytics, listing_approval_queue, listing_leads, listing_media, listing_viewings, listings +2; idx idx_locations_place_id, idx_locations_name, idx_locations_type; data |
| `drizzle/0005_colorful_toxin.sql` | `3bd7268422bc4c85d6a4f4ad994a2a7e9a564f5bbd3577d54e79dfe4337f9cd8` | 3608 | 48 | developer_brand_profiles, developments, leads, properties; idx idx_brand_profiles_slug, idx_brand_profiles_tier, idx_brand_profiles_visible +2; data |
| `drizzle/0005_dry_maria_hill.sql` | `cd48502708cac78c8f6ddcb82b2e9b3811708c3b005c32712e036fe88dd90bed` | 12913 | 234 | advertising_campaigns, campaign_budgets, campaign_channels, campaign_creatives, campaign_leads, campaign_performance, campaign_schedules, campaign_targeting +5; data |
| `drizzle/0006_aspiring_shaman.sql` | `b49270a390f229247cc9928cce8e970984831d740f35704fa5a56e86f62da417` | 1204 | 8 | development_drafts, developer_brand_profiles, developments; idx idx_dev_drafts_brand_profile_id; data |
| `drizzle/0006_naive_marvex.sql` | `c376d2c6a1fed02f83d6f5b2bec02e04703f2b270d2a5fd36a80b57b2ef7248f` | 508 | 5 | agents; data |
| `drizzle/0007_jittery_cloak.sql` | `9eac09baaa10d98942c4108af1f99c8bc8ea061c73c82af74c1d98d5b36b02b4` | 1119 | 10 | developers; data |
| `drizzle/0007_parched_sister_grimm.sql` | `21f10fd7fcf73408d6627c2dc3f5530d0a0d3478cdbe4d26153ace7501ad8bd0` | 236 | 3 | developments, unit_types |
| `drizzle/0008_add_wizard_fields.sql` | `bbcc0e690a6c71451955ea9e622b245f4967e84af090d50986ef5edde9900ff3` | 396 | 5 | developments, unit_types |
| `drizzle/0008_tired_scream.sql` | `9f84ee8305206186429fa20e18eff1f2d5e341d7b6d5ffba03d7d5e67f58c52c` | 10644 | 165 | activities, developer_notifications, developer_subscription_limits, developer_subscription_usage, developer_subscriptions, development_phases, development_units, developments +2; idx idx_activities_developer_id, idx_activities_type, idx_activities_created_at +9; data |
| `drizzle/0009_curly_frog_thor.sql` | `69d2144c0329a69694bd1f8b328b77d9b100128b67f87fcaf0582c01054e4692` | 9469 | 140 | explore_highlight_tags, explore_interactions, explore_shorts, explore_user_preferences, videoLikes, videos, developers, developments; idx idx_explore_highlight_tags_category, idx_explore_highlight_tags_display_order, idx_explore_interactions_short_id +11; data |
| `drizzle/0009_hesitant_rachel_grey.sql` | `98d7d6e77671c2681c61c3fa8753b8ae1f3c8194490b6698f8591e44ccd488c7` | 13536 | 255 | boost_campaigns, bundle_partners, content_approval_queue, content_quality_scores, content_topics, explore_partners, founding_partners, launch_content_quotas +12; idx idx_boost_status, idx_boost_topic, idx_boost_partner +20; data |
| `drizzle/0010_melodic_mordo.sql` | `ae91cc2602e88797aee2d68cd0c3ef54ac7d463cb8b49331f763a96806f178c7` | 453 | 5 | developments |
| `drizzle/0010_wide_thunderbolts.sql` | `34079351e3bbaa5782d1e45ffc42ccc5c2c7fd69a70e60651c3f4361c001da83` | 122 | 2 | developers |
| `drizzle/0011_add_explore_tables.sql` | `cc0f9dabe25084fdd487b39cc9fe5cbe78f3942929a083135f9847b9e8083526` | 2992 | 64 | explore_categories, explore_topics, explore_neighbourhood_stories, explore_sponsorships, explore_shorts; idx idx_ens_suburb_id, idx_es_target, idx_es_status; data |
| `drizzle/0011_add_financial_columns.sql` | `affb80ba10cbe1000056f95a207fbb9c0ec04583962393514f1106fd9cded766` | 901 | 17 | developments |
| `drizzle/0011_cold_bill_hollister.sql` | `a35d675959003df1c0fc9aa6a843a00931f5f55ea0178a14eea19b7dd219220b` | 5872 | 64 | development_lead_routes, development_partners, developments, unit_types; idx idx_lead_routes_development_id, idx_lead_routes_source_type, idx_lead_routes_lookup +3; data |
| `drizzle/0012_add_unit_types_financial_columns.sql` | `e72b8d43e1524d973ee1b527d5447463b7e6338fc426fba92edecdc070cf1062` | 698 | 14 | unit_types |
| `drizzle/0012_crazy_yellow_claw.sql` | `55ac64327a4dc16074d41145d21d650b931a7db2ce4a12b187ae3462cdb6c18a` | 617 | 5 | developments |
| `drizzle/0012_light_captain_cross.sql` | `d5a1ef002409a2547b534b70714ea3be6cba7e5bb1ad5ce01bdac7d0ec00c698` | 67842 | 930 | boost_credits, development_documents, development_drafts, explore_boost_campaigns, explore_categories, exploreComments, explore_content, explore_creator_follows +52; idx idx_user, unique_user_credits, idx_dev_docs_development_id +123; data |
| `drizzle/0013_ambiguous_jasper_sitwell.sql` | `dc20df5353f4eed4796b387fb9034686ecc79ee8357830648adb8533695c553e` | 929 | 16 | platform_inquiries, developments |
| `drizzle/0013_cultured_naoko.sql` | `d77de85826fec8acbe32c027480fcdcf4ee2d9d123d3b72d957f51a1206de690` | 766 | 17 | hero_campaigns; idx idx_hero_campaigns_slug, idx_hero_campaigns_active, idx_hero_campaigns_dates |
| `drizzle/0014_cheerful_amazoness.sql` | `7422213cb06533cd686ff8dc865cb97205c2033842a2b0d4a899bede2ff2b50f` | 716 | 16 | amenities; idx idx_amenities_location_id, idx_amenities_type; data |
| `drizzle/0014_cooing_amphibian.sql` | `3ae203121385dffed3981f418f5352473c0172f58ebb18e5150657d321417763` | 50057 | 513 | agent_knowledge, agent_memory, agent_tasks, billing_transactions, developments, launch_content_quotas, marketplace_bundles, topics +100; idx idx_agent_knowledge_topic, idx_agent_knowledge_category, idx_agent_knowledge_active +31; data |
| `drizzle/0014_shallow_mesmero.sql` | `33263a16e84d9a3f5b921612bfa591b5a0d34d90d5313f44b3be6d660b54f24e` | 76135 | 833 | agent_knowledge, agent_memory, agent_tasks, billing_transactions, explore_categories, explore_neighbourhood_stories, explore_shorts, explore_sponsorships +121; idx idx_agent_knowledge_topic, idx_agent_knowledge_category, idx_agent_knowledge_active +74; data |
| `drizzle/0015_chemical_network.sql` | `51e9118946d1b27879ef4210dd8726af0ab913bc8bf34dd99cb50d108172dd69` | 1545 | 20 | development_approval_queue, developments; idx idx_dev_approval_status, idx_dev_approval_dev_id; data |
| `drizzle/0015_cloudy_romulus.sql` | `76b01cff502a546fc2c44c75fd54057af9a4249e0aad10148a5749f616b2f408` | 222 | 4 | listings |
| `drizzle/0015_icy_hedge_knight.sql` | `38c5a53aa53c6d943220f1087804c2c01454d2d0a812f66334d49534df868fd1` | 23232 | 375 | development_documents, development_partners, explore_boost_campaigns, explore_creator_follows, explore_discovery_videos, explore_engagements, explore_feed_sessions, explore_neighbourhood_follows +16; idx idx_dev_docs_development_id, idx_dev_docs_unit_type_id, idx_dev_docs_type +49; data |
| `drizzle/0016_add_missing_unit_types_columns.sql` | `8cd865d94bec8dd013a4b06ff3f1a305e9e0bfa91ad3218f129e5e85d13fb997` | 1468 | 41 | unit_types |
| `drizzle/0017_add_partnership_tables.sql` | `eda8362a5dfe26d1c7082c443698d23ab5925be041a0c8978e7562b6d96aa24d` | 2485 | 45 | development_partners, development_lead_routes; data |
| `drizzle/0018_add_agent_columns.sql` | `bb076dd8a2e6543c7ebd8fb5ce1e7410b9e3d3d63025364f8fbba01b0d51aabc` | 344 | 9 | agent_memory, agent_tasks |
| `drizzle/0019_remove_unit_type_size_range.sql` | `a4a2c4ce4dda7782798c365cf10840e08942642692d620fab0aa5dba25f52e96` | 59 | 2 | unit_types |
| `drizzle/consolidated_missing_tables.sql` | `01e2373222657f79556143039c9d8a50b174221c874b31865bb305d70be15174` | 8747 | 218 | unit_types, developer_subscriptions, developer_subscription_limits, developer_subscription_usage, activities, developer_notifications, development_units; data |
| `drizzle/manual_development_phases.sql` | `546be5e5b88718dca397463cb40b25c8fa624415e372e471fbd5cb89a6fc76b5` | 1713 | 41 | development_phases; idx idx_development_phases_development_id, idx_development_phases_status, idx_development_phases_spec_type; data |
| `drizzle/manual_pricing_migration.sql` | `ae911857637cc1d541dde792917131929e7e626bb38298a364934f7d3f9e58ed` | 418 | 6 | developments, unit_types |

### drizzle/meta/** (17 files)

| Path | SHA-256 | Bytes | Lines | Effect |
| --- | --- | ---: | ---: | --- |
| `drizzle/meta/0000_snapshot.json` | `2e48acaed621839ccfcc29a5e2dbd6839e45a9c583e9eb8b1189e5e402b906ae` | 411233 | 15136 | —; data |
| `drizzle/meta/0001_snapshot.json` | `249c01c019ba441708afef68efe9e0f1d9acc7adb053cb8d4d891c8c1dc98d52` | 411019 | 15136 | —; data |
| `drizzle/meta/0002_snapshot.json` | `712d28f7fe1e3a9e36df51eec23451c572898e378c32f3481f823600e7116077` | 411009 | 15136 | —; data |
| `drizzle/meta/0003_snapshot.json` | `f9eaf0b1038a9ce2e09c24fa1354e5bb6e07949d693cd02a4a0542660187135c` | 410977 | 15135 | —; data |
| `drizzle/meta/0004_snapshot.json` | `a56e9e3c0b1d79695f130c60ebc5aa5a9d1c6df2056aad02bb62be5aedce63d3` | 427341 | 15750 | —; data |
| `drizzle/meta/0005_snapshot.json` | `d3c06b2fdbc97d3808e25a22ad2de1450302d46ff6a33baf41e7c0c4555f4de6` | 438211 | 16116 | —; data |
| `drizzle/meta/0006_snapshot.json` | `663385e93462a9db52455ee6f7a8dc85a1a45b3e6ea310de7a0c02e3c648b925` | 440357 | 16179 | —; data |
| `drizzle/meta/0007_snapshot.json` | `c13cec37638c2c6251fae97cc71965bf3f65a00408917d60ae50dfb527037b0c` | 440970 | 16202 | —; data |
| `drizzle/meta/0008_snapshot.json` | `562d5f888140ab72b261ed04ae63f1fe2f5cfee460411d0f0c2005a47d0c3518` | 442000 | 16239 | —; data |
| `drizzle/meta/0009_snapshot.json` | `73b4dc9b2e10c165f2ab4211b6585df05495a02e3e9edaa715a9ecce2155297a` | 489538 | 18002 | —; data |
| `drizzle/meta/0010_snapshot.json` | `8869999845dc93054687862b9baf29e407fc6bfede42363446417623273ac55e` | 489555 | 18005 | —; data |
| `drizzle/meta/0011_snapshot.json` | `62e5969549293f0e8d52e1426ee81e98855199b17cf18ef9f6450d52268cec8e` | 503438 | 18479 | —; data |
| `drizzle/meta/0012_snapshot.json` | `7634b1d691d18a6e7dbbebc9e0872cf6bac63b820584eb9b48ab7257e8eb3c2b` | 504650 | 18514 | —; data |
| `drizzle/meta/0013_snapshot.json` | `48a48a2193c595ef5a8ec9c407052a08e808187468ba9593bdbb2223f5023eae` | 487657 | 17882 | —; data |
| `drizzle/meta/0014_snapshot.json` | `f16f65ce44910992cd42f21b6dcffcc6a669abe78708273a80dea67137fe25d5` | 516491 | 19043 | —; data |
| `drizzle/meta/0015_snapshot.json` | `589a87014396f5636c4489bb980e3ee848f19be3a88ad0bd6b1209b2c1c75594` | 516113 | 19029 | —; data |
| `drizzle/meta/_journal.json` | `2974afcd9cde7b661d322e8bede8dcfd7fc2123a9394cb03d995f42de39814a2` | 2398 | 118 | — |

### migrations/** (41 files)

| Path | SHA-256 | Bytes | Lines | Effect |
| --- | --- | ---: | ---: | --- |
| `migrations/.gitignore` | `bba5a9aeb2a777bf713b24fcd74230da4be4d57af090c0d8e29601ad5e74c981` | 86 | 6 | — |
| `migrations/00-create-database.sql` | `a182e55ad6f59c095a0f26cbb2490b6c9639773547101750269315314bb71041` | 493 | 16 | — |
| `migrations/MIGRATION-GUIDE.txt` | `4c5a9b97e7ff35c3b6cd75ffd14039c2145850980f0486e0011dd3af3b56440a` | 9440 | 302 | —; data |
| `migrations/add-missing-developer-columns.sql` | `6d50b5eac3c0f1ef5d5454d4ad0cf9578cef869ea2173b31d0efc50540f80d55` | 1057 | 16 | developers; idx IF |
| `migrations/add-payment-proofs-table.sql` | `e45dc152b19452241813e342021009671bbf9122e99c6c6bb5a7e7923bed4716` | 1803 | 40 | payment_proofs; data |
| `migrations/add-pending-agent-profiles-table.sql` | `2d24439c932065e7b3a134324ddac48803e1a531ad71a9a0d082ae31c4a5dfdc` | 647 | 16 | pending_agent_profiles; data |
| `migrations/add-property-images.sql` | `5efb0783048bea7d8676ae496fea49a5f96b3fb457a098b1017c3ce64d2bbd4f` | 2989 | 55 | —; data |
| `migrations/add-sandton-test-properties.sql` | `25b9b703384fec02883a42f367f0b41f79ba79804ea6525211701449121a4c52` | 3943 | 158 | —; data |
| `migrations/add-sarb-rate-settings.sql` | `9d3a50bc5428576fb35fcf12b3458110ec720c789fe5e00127e09205f7cac527` | 1396 | 45 | —; data |
| `migrations/add_developer_specializations.sql` | `5e1125190064169684c29346a4639bd39a66ad66cd80c5190e2b6331d937fdb9` | 419 | 11 | developers; data |
| `migrations/add_portfolio_metrics.sql` | `47e4bd2b31c87b404647f5881205bc20a2177f496fede328a12c67f2dc287d99` | 204 | 5 | developers |
| `migrations/backup-database.sql` | `0848f6a3769b8ca46097c0d258d7f647890102ec8bff3231b80de322a470a309` | 2946 | 100 | — |
| `migrations/check-data.sql` | `e320abb407a211d7df31df785615594b3097801f3edd1ad5826ece63306a7748` | 470 | 15 | — |
| `migrations/create-agencies-table.sql` | `395697dbdf714bbd5acf6d2383910186c04f102156e552abd68d14bf76c096ca` | 1107 | 31 | agencies; idx idx_agencies_slug, idx_agencies_location, idx_agencies_subscription; data |
| `migrations/create-agent-dashboard-tables.sql` | `22d7912fc7b53a3b22732c944ac416dc58b572d014a6f5d14175001f22b4b085` | 3249 | 74 | commissions, lead_activities, offers, leads, showings; data |
| `migrations/create-base-schema.sql` | `3096e72cee32da9d536cc006a94889b8b3968993ff95f872fa4f66c8cc062c41` | 10604 | 275 | users, agencies, agents, developers, developments, properties, propertyImages, favorites +2; data |
| `migrations/create-core-tables.sql` | `d3f8c56176072ea89b30fb9ab5f22a168a2c48b3fc606d14d13f1b51fe9cf8a0` | 8129 | 216 | developers, agents, developments, services, reviews, locations, exploreVideos, properties; data |
| `migrations/create-development-drafts-table.sql` | `0c5fd4e38a3cd4def4e6a945e0bb473a93bbad262870edaba32196f96c76f693` | 1124 | 17 | development_drafts; data |
| `migrations/create-explore-feed-tables.sql` | `e4daa9394da5d4b7f6b71386b752e817982db4d0ff97c554aee0a470706004d4` | 10179 | 245 | videos, videoLikes, provinces, cities, suburbs, notifications, email_templates, location_search_cache +2; data |
| `migrations/create-invitations-table.sql` | `311441a34eba21cb9d3d60c5612e7595a00900532da95b22d057b036c3d40e29` | 1074 | 26 | invitations; data |
| `migrations/create-location-hierarchy.sql` | `e3655fa3d9566755eaa4ad75d3b93c9b81c6474a90207aa436d64fe27c014e17` | 7188 | 173 | provinces, cities, suburbs, location_search_cache, agent_coverage_areas, properties; data |
| `migrations/create-locations-table.sql` | `ddac3d5941b005b2cbf90cdf9d6d75f24a11107df265f14877015318359aceb8` | 878 | 23 | locations; idx on, idx_locations_place_id, idx_locations_name +1; data |
| `migrations/create-missing-tables.sql` | `5807416063b5bec32bbda1aa73e87de4d63753c438afd06345dc34b5fe6024d6` | 8163 | 208 | agency_branding, plans, agency_subscriptions, invoices, payment_methods, coupons, audit_logs, agency_join_requests +1; data |
| `migrations/create-notifications-table.sql` | `8bd4b5fb3b1e577e9909c32bdfb832fde34efd4a5201e8317bfcd6bf20482683` | 1491 | 36 | notifications, email_templates; data |
| `migrations/create-optimized-analytics-schema.sql` | `019b5886d272a275d6228bf6ac476ab2a200dd961cef1c82e0c022c83bc523a4` | 15053 | 419 | price_analytics_backup, city_price_analytics_backup, market_insights_cache_backup, analytics_aggregations_backup, price_analytics, user_preferences, schema_version, user_recommendations +1; idx idx_user_behavior_optimized, idx_session_behavior_optimized, idx_location_behavior_optimized +4; data |
| `migrations/create-price-insights-analytics-schema.sql` | `537adfda3643334220cdee3121ada304cf6c52ad963d23b63a49a0f137969893` | 14248 | 348 | price_history, suburb_price_analytics, city_price_analytics, user_behavior_events, user_recommendations, market_insights_cache, price_predictions, property_similarity_index +1; idx idx_price_history_composite, idx_user_behavior_recent, idx_property_similarity_recent; data |
| `migrations/create-prospect-tables.sql` | `79b75dde92cd16b045247727e553ba1b467ae8903fdbfc0dd61e68ea34bf68ac` | 9009 | 197 | prospects, prospect_favorites, scheduled_viewings, recently_viewed; idx IF; data |
| `migrations/create-revenue-center-tables.sql` | `257fc879fb833f673151ce9864ed442f077157333cfd5216a5b02d73b939cb3d` | 6422 | 137 | subscription_transactions, advertising_campaigns, revenue_forecasts, failed_payments; data |
| `migrations/create-saved-searches-table.sql` | `3ea19439eeefe7128067b276949522a88035e9bd7eef288690a32afdc22e1892` | 458 | 11 | saved_searches; data |
| `migrations/create-subscription-system.sql` | `38da7a1678a7e56897f6006d4ebe4b5fd45da1c9fd503184c7257627c32d380a` | 14499 | 326 | subscription_plans, user_subscriptions, subscription_usage, billing_transactions, subscription_events, boost_credits; data |
| `migrations/create-user-preferences-table.sql` | `7caf4306ba00c399f69019c2ed9b9fde665a59378b68241adcf6e732f3127e0c` | 3666 | 101 | user_preferences; idx idx_user_preferences_location, idx_user_preferences_price, idx_user_preferences_bedrooms +1; data |
| `migrations/debug-properties.sql` | `dcf54c86d93d7b0b7ddeb922d9a473f510cfda0718f27233dca9afe095600c6a` | 482 | 19 | — |
| `migrations/enhance-mysql-spatial.sql` | `e07613e78ced35dbad80990bc13528f34b6d89217fa39af00a301faddace6e82` | 5655 | 97 | nearby_amenities, geocoding_cache, saved_searches, provinces, cities, suburbs, properties; idx IF; data |
| `migrations/enhance-postgis-integration.sql` | `33278d8e85eef72f98cc1975361b5a38b8611121c9d69c1205dfd4f47cb11685` | 8749 | 178 | nearby_amenities, geocoding_cache, saved_searches, provinces, cities, suburbs, properties; idx IF; data |
| `migrations/full-database-setup.sql` | `a0af5b5af5ed2ffd85218541dd291788fa9e7b1aad99a81437b3b05f9b9f653b` | 2651 | 78 | — |
| `migrations/grant-permissions.sql` | `5aeea9ea25c64fd1775e0b4a0785ef57744cc204b55dafbb7fd188f7e10af1bb` | 210 | 5 | — |
| `migrations/prospect-tables-workbench.sql` | `b08e65ac1fa9b19c9bd9cd458a47087f030ed054e87984f30045b1f46b46c4dc` | 9242 | 202 | prospects, prospect_favorites, scheduled_viewings, recently_viewed; idx IF; data |
| `migrations/seed-explore-feed-data.sql` | `fb0fa4d7e1221f601e1b9697699807c625d9a74330c88738170561c40eb2d91a` | 8615 | 218 | —; data |
| `migrations/seed-sample-data.sql` | `2842fa6219bee1173f61cceeb2468d7fce73d6eeef90e5217d792b39fb550b69` | 2144 | 58 | — |
| `migrations/setup-database.ps1` | `f14064f93e49164a4e894d10620f12fa0aebfa09c4a29dd20b71e7c2dfdea211` | 10435 | 264 | — |
| `migrations/verify-setup.sql` | `3f9d6c5598a5464e385b27bb823e8dadf987114e08161d44a2f6c3e593c21d47` | 705 | 29 | — |

### root-level *.sql (11 files)

| Path | SHA-256 | Bytes | Lines | Effect |
| --- | --- | ---: | ---: | --- |
| `DEVELOPER_APPROVAL_MIGRATION.sql` | `61aca557f2e63e2bc9d15fc991298c76baa013fbadaeee93d823610970624315` | 650 | 13 | developers; idx IF |
| `RAILWAY_DIRECT_SQL.sql` | `37b0dae10b1ff158e1a5d798f169f178fe375c39eb12a0b3e24e7000cc9238b2` | 3919 | 103 | explore_shorts, explore_interactions, explore_highlight_tags, explore_user_preferences; data |
| `RAILWAY_EXPLORE_SHORTS_FIX.sql` | `bce8c6fb94b3290ef2d1cc2726607d90da34f52a39a6c8cd2cee9a1ce4360899` | 5251 | 152 | explore_shorts, explore_interactions, explore_highlight_tags, explore_user_preferences; idx IF; data |
| `RAILWAY_MIGRATION_SETUP.sql` | `3b7e7f25a62535458196a38177012f7c9e67aba6de28f7ad6132019401f65085` | 9512 | 184 | developer_subscriptions, developer_subscription_limits, developer_subscription_usage, development_phases, development_units, developers, developments, leads; idx IF; data |
| `add-auth-columns.sql` | `23c6dae7fcd1470c1585cfca6dc24380664cb1851eef5681964f9dae6dbf0f92` | 599 | 20 | users; data |
| `add-role-based-auth.sql` | `106cfebd55964d71799ead5fe8b777a7be2332d892117f841f02b55000220a5b` | 5478 | 139 | invites, agency_join_requests, audit_logs, leads, showings, users, agencies; idx idx_users_role, idx_users_agency, idx_users_email +1; data |
| `create-mysql-user.sql` | `f84971fe6710b73a1238295270ed7de9fec8909393f6d0cea88ab66ae06ad30a` | 424 | 13 | — |
| `fix-developer-database.sql` | `2f451ba3d35875bcb0ab3898b9d2910810af6de42342995165bd5ae9eec7481f` | 2377 | 45 | developers; idx IF |
| `grant_test_permissions.sql` | `9cf100b6985a99605c517cf5dfa4418fe827ab4ef215a01c0c8268b0800b86fc` | 125 | 3 | — |
| `quick-developer-fix.sql` | `77f1b49cc7a03b57df1b8f22c8accade247dad131c647852ea3eb0626237715a` | 522 | 14 | developers; idx for, idx_developers_last_kpi_calculation |
| `seed-super-admin.sql` | `564835e99427f57e3c6f94e875693d9dade9418b033bb4db263dac8bf8b1a86a` | 1132 | 28 | —; data |

### scripts/*.sql (7 files)

| Path | SHA-256 | Bytes | Lines | Effect |
| --- | --- | ---: | ---: | --- |
| `scripts/debug_schema.sql` | `91b15e8158ee3b9e61a2076f2cf942e171d37231de99c4206f0d0a7da0354818` | 74 | 4 | — |
| `scripts/fix-agents-table.sql` | `e4859693d6a2dcd244639aa0c48a681677c9abac98b458f1ad83502f2efad569` | 608 | 19 | agents; data |
| `scripts/fix-listings-schema.sql` | `8d76de3c687bdb43f4b4c2bb5646cbdcc4b0e19704d46ce69376a1a0379c6295` | 606 | 17 | listings |
| `scripts/fix_schema_drift.sql` | `9227064d84eeaa709359c7574f8c27493a5136ff4f8f47d7dc731464384a7cc4` | 1712 | 83 | developments; data |
| `scripts/manual_schema_verify.sql` | `2dc8d5971cb2a37a69895e5e9f56b2cf8dc51dd3ed177a08e33e88ac49534a87` | 1229 | 38 | — |
| `scripts/manual_unit_migration.sql` | `cca3e9a106f680d55007a90380defc5a0f2e467c0a5729640012a00d81ae5c2c` | 3172 | 80 | developments; data |
| `scripts/verify_unit_types_schema.sql` | `66a118abca67036df03e1ce889e880adb3282a76e2a20c92ca30ab6b778f5b98` | 595 | 21 | — |

### adjacent (5 files)

| Path | SHA-256 | Bytes | Lines | Effect |
| --- | --- | ---: | ---: | --- |
| `backups/cleanup-backup-2026-01-29T20-02-35-220Z.sql` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | 0 | 0 | — |
| `docker/mysql-local/init/01-create-local-databases.sql` | `6ae5e3e7d3c12af00d51ea4b2bc7957d26d54f4f84e56eb6b7b857ff4b7467dd` | 536 | 12 | — |
| `server/routes/SELECT id, name, userId.sql` | `d0710fbe87849a0c0e83e024eff2a72b035d5d6ee2fd0e5c5f8f6908d78230a8` | 133 | 7 | — |
| `server/scripts/init-local-db.sql` | `ea021fcc88024194754d5b6a192a0253cb78fa1045722bed1159bab70216755f` | 148 | 5 | — |
| `server/scripts/sanity_test_seed_cleanup.sql` | `614665478b818e9a03b8631712f33fd419641204c8937fb6b834237802b7aea1` | 1979 | 59 | —; data |
