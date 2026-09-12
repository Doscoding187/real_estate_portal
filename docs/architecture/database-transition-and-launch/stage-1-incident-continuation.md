# Stage 1 incident continuation — service recovery and attempt inspection

**Status:** SERVICE RECOVERY COMPLETE; MIGRATION RECOVERY BLOCKED.

**Date:** 2026-09-12.

**Scope:** This is a continuation of the initial [Stage 1 report](stage-1-report.md),
not a migration recovery. It records one authorized recovery of safely
classified stale local-service metadata and read-only inspection of the
preserved migration attempt. No migration was retried; no database or service
root was recreated; no alternate target, reset, manual DDL, ledger edit,
security change, or recovery-apply command was used.

## Outcome

The existing authority-owned MySQL service is available again on its existing
local root and data directory. The exact worktree target remains connected but
not ready: its canonical migration ledger is empty, its preserved baseline
attempt is still `running`, and its physical schema is not congruent.

The local-service incident is most consistent with stale runtime metadata left
after a prior service termination. The migration interruption itself has no
retained original error output, so its cause remains unknown. The two events
must not be treated as causally linked without further evidence.

## Exact authority and preservation boundary

| Field | Evidence |
| --- | --- |
| Database | `listify_wt_database_transition_stage_1_d8173f13c5c4` |
| Target fingerprint hash | `5b75c0ec72db92fea58941cbedecf61579a049de9a3f4fccf938969bf5e733dc` |
| Classification / credential | `disposable-worktree` / `local-owner` |
| Worktree ownership | Exact; key `d8173f13c5c4f84304c26a2d` |
| Service fingerprint | `2425e54d0472ee5b308127a7c63380733f077ec7531767d6dba21a2c2a9177f2` |
| Existing service root | `/var/tmp/property-listify-1000/mysql-3307` |
| Existing data directory | `/var/tmp/property-listify-1000/mysql-3307/data` |
| Root / data metadata before recovery | Both owned by UID/GID 1000, mode `0700`, inodes `2148735` / `2250230` |
| Root / data metadata after recovery | The same paths, ownership, modes, and inodes; no replacement was initialized |
| Identity marker | Mode `0600`; matched the service fingerprint before recovery and remained present afterward |

Before recovery, `pnpm db:authority:service:status` stopped on a stale PID
file rather than operating on it. The preserved `mysqld.pid` and socket-lock
files both contained PID `10917`; their shared SHA-256 was
`59ec3ef3e0481d6188bb624c89a190dfd0e5c18ebd3d138233e12c6302e1e62f`.
There was no `/proc/10917`, no listener on TCP port 3307, and no Unix-socket
listener. The existing socket artifact was a socket with mode `0777`; the PID
and lock artifacts had modes `0640` and `0600` respectively. This is the
sanitized evidence evaluated by the governed service-recovery safeguard.

The pre-recovery MySQL error-log prefix was preserved before service startup:

| Log evidence | Value |
| --- | --- |
| Original byte length | `199425` |
| Original SHA-256 | `925766b47031e3d65e7fff8918d8d8fca60497c9a9029ac8d13cedb659c3690f` |
| Original mtime | 2026-09-11 21:48:06 local time |
| Post-start verification | The first `199425` bytes still hash to the same value |

Its retained tail contained normal MySQL startup, InnoDB initialization, XA
crash recovery completion, and `ready for connections` on 2026-09-11. It did
not contain the preserved attempt ID, a migration failure message, or an error
entry for the 2026-09-12 attempt window.

## Governed recovery chronology

1. `pnpm db:authority:service:recover` ran exactly once. It classified the
   state as `safely recoverable stale metadata` and reported that it removed
   only the exact stale PID, socket, and lock artifacts. It did not remove the
   service root, data directory, database, log, or identity marker.
2. The canonical `service:start`, `service:wait`, and `service:status`
   commands then succeeded in order. Status reported `Service state:
   available` on `127.0.0.1:3307` using the same service root and fingerprint.
3. The legacy home-service path was reported as inactive residue. It was not
   adopted or deleted.
4. `db:authority:status` and `db:authority:context` re-resolved the exact
   target and fingerprint above. They reported `target-connected`,
   `exact-worktree-owned`, `manifest-head-behind`,
   `incomplete-migration-attempt`, and `schema-not-congruent`.

This was service-metadata recovery only. It is not a migration recovery and
does not alter the preserved attempt.

## Read-only attempt and ledger evidence

All values below were collected through the existing authority-guarded
read-only diagnostics path with the exact database and fingerprint asserted
before connection. A final read-only preservation check returned the same
attempt fields and ledger count after all inspection.

| Field | Observed value |
| --- | --- |
| Attempt ID | `c242df81bf9eace7fe132d01-0000` |
| Attempt state | `running` |
| Plan digest | `c242df81bf9eace7fe132d0113b76b9128e15fc7a3b58c7c4888e23abcb6351d` |
| Attempt target fingerprint | `5b75c0ec72db92fea58941cbedecf61579a049de9a3f4fccf938969bf5e733dc` |
| Migration | `0000_canonical_launch_baseline.sql` |
| Migration checksum | `19362611af5751c60bbb6e041e9f456c09aa1cc8ef77f9f5c62fbc92fa8e8e88` |
| Accepted old head | `null` |
| Expected new head | `0090_retire_disconnected_boost_campaigns.sql` |
| Started / finished | `2026-09-12T10:24:28.115Z` / `null` |
| Completed statement count | `490` of the baseline's `948` parsed statements |
| Last-statement digest | `d4fc9244d904b775dd4dd68f6c27e259787641d43a0807814c3f281f3c30c351` |
| Failure class / digest | `null` / `null` |
| Successful ledger count / head | `0` / `null` |
| Manifest digest / expected head | `a511e70ae06ffbae4027cf02b1de8cc0f586ff7c23cb7cb11a0990606cf728ed` / `0090_retire_disconnected_boost_campaigns.sql` |

Both runner-control tables physically exist as InnoDB tables:
`sql_migration_attempts` and `sql_migration_history`. The latter has no
successful rows, so there is no successful ledger head.

No raw original error output was recovered. The durable attempt schema stores
only a normalized failure class and digest after its failure handler runs; both
fields are null here because the row remains `running`. The preserved MySQL
error-log prefix has no matching entry, its service-root file inventory has no
dedicated runner-output artifact, and `performance_schema.error_log` was not
available. The absence of a failure class or digest is not used to infer an
error cause.

`pnpm db:migrate:plan` correctly remains blocked by this exact incomplete
attempt. No ordinary migration plan or apply can continue.

## Physical-state comparison

The last-statement digest matches parsed baseline statement 490 exactly:

```sql
ALTER TABLE `service_leads`
  ADD CONSTRAINT `service_leads_property_id_properties_id_fk`
  FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`)
  ON DELETE SET NULL ON UPDATE NO ACTION
```

The following statement 491 adds
`service_leads_listing_id_listings_id_fk`. Read-only `information_schema`
inspection found both constraints physically present, with the expected
`SET NULL` / `NO ACTION` rules.

This matters because the runner executes a statement before incrementing and
persisting its progress record. The immutable baseline is an establishment
migration, not a transactional-data migration. Therefore, a committed DDL can
exist just before the corresponding progress update fails or the runner loses
its connection. The physical presence of statement 491 means the recorded
count of 490 is not a safe physical boundary. It is consistent with a DDL
commit just before progress recording, but it does not prove that explanation
or identify the underlying interruption.

The canonical physical-schema diagnostic reported:

| Inventory | Expected / actual |
| --- | --- |
| Schema digest | `59ad0020e367b82288e266a7964a0985463420ab25c24e7b93caa0c51c600e8c` / `2c54d8940267a143a21a1066be31fa7721aa3f737ddd47814ffbee3a16eca32b` |
| Congruency / differences | `false` / `610` |
| Application tables | `212` desired / `180` physical |
| Physical columns / indexes / foreign keys / checks | `2585` / `222` / `311` / `0` |
| Physical object-census digest | `81872a5c37b16b476cbea8c3954ed2bf7906e4cfa4276f2ac171486451b019db` |

The object-census digest is SHA-256 over the sorted physical rows
`{name, columns, indexes, foreignKeys, checks}`. It identifies the full
read-only object census without writing to the target.

The physical schema is missing these expected application tables:

`billable_accounts`, `billing_provider_events`, `bundle_attributions`,
`catalogue_publishers`, `commercial_assets`, `commercial_availabilities`,
`commercial_availability_economics`, `commercial_availability_lease_terms`,
`commercial_availability_listing_links`, `commercial_lead_contexts`,
`commercial_space_specifications`, `commercial_spaces`,
`developer_organisation_memberships`, `developer_organisations`,
`development_supersessions`, `land_assertion_evidence`, `land_asset_parcels`,
`land_assets`, `land_claims`, `land_conflict_cases`,
`land_evidence_access_audit`, `land_evidence_documents`,
`land_listing_links`, `land_marketing_authorities`, `land_parcels`,
`land_review_cases`, `land_review_events`, `land_verification_assertions`,
`land_verification_events`, `lead_deliveries`, `lead_delivery_attempts`,
`location_provider_mappings`, `sl_lead_contexts`, `sl_messages`,
`sl_moderation_queue`, `sl_place_household`, `sl_places`,
`sl_space_availability`, `sl_space_specifications`, `sl_spaces`, and
`sl_verifications`.

It has these extra physical application tables relative to the current
canonical model:

`agency_subscriptions`, `analytics_aggregations`, `billing_transactions`,
`boost_campaigns`, `invoices`, `partner_leads`, `prospect_favorites`,
`prospects`, and `scheduled_viewings`.

The 180 actual application table names in the census are:

```text
activities, affordability_assessments, affordability_match_snapshots, agencies,
agency_agent_memberships, agency_branding, agency_commission_settlement_payments,
agency_commission_settlements, agency_deal_offer_versions, agency_deals,
agency_join_requests, agency_listing_performance_activity,
agency_listing_performance_reviews, agency_subscriptions,
agency_transaction_activity, agency_transaction_conditions,
agency_transaction_documents, agency_transaction_milestones,
agency_transaction_parties, agency_transactions, agent_coverage_areas,
agent_knowledge, agent_memory, agent_tasks, agents, amenities,
analytics_aggregations, analytics_events, application_requirements, audit_logs,
billing_audit_events, billing_invoices, billing_payment_documents,
billing_payments, billing_transactions, boost_campaigns, boost_credits,
bundle_partners, cities, city_price_analytics, commissions,
content_approval_queue, content_quality_scores, content_topics, coupons,
deal_requirement_statuses, demand_campaigns, demand_lead_assignments,
demand_lead_matches, demand_leads, demand_unmatched_leads,
developer_brand_profiles, developer_notifications, developer_subscription_limits,
developer_subscription_usage, developer_subscriptions, developers,
development_approval_queue, development_documents, development_drafts,
development_lead_routes, development_manager_assignments, development_phases,
development_required_documents, development_units, developments,
distribution_agent_access, distribution_agent_tiers,
distribution_brand_partnerships, distribution_commission_entries,
distribution_commission_ledger, distribution_commission_overrides,
distribution_deal_bank_outcomes, distribution_deal_documents,
distribution_deal_events, distribution_deals, distribution_development_access,
distribution_identities, distribution_program_workflow_steps,
distribution_program_workflows, distribution_programs,
distribution_referrer_applications, distribution_viewing_validations,
distribution_viewings, email_templates, explore_content,
explore_discovery_videos, explore_engagements, explore_feed_sessions,
explore_partners, explore_shorts, favorites, founding_partners,
google_places_api_alerts, google_places_api_config,
google_places_api_daily_summary, google_places_api_logs, hero_campaigns,
invitations, invites, invoices, launch_content_quotas, launch_metrics,
launch_phases, lead_activities, leads, listing_analytics,
listing_approval_queue, listing_leads, listing_media, listing_settings,
listing_viewings, listings, location_search_cache, location_searches,
locations, managerial_audit_logs, market_insights_cache, marketplace_bundles,
notifications, offers, partner_leads, partner_subscriptions, partner_tiers,
partners, payment_methods, plan_entitlements, plans, platform_settings,
platform_team_registrations, price_analytics, price_history,
price_predictions, properties, propertyImages, property_similarity_index,
prospect_action_attributions, prospect_action_claim_tokens, prospect_favorites,
prospect_identities, prospects, provinces, qualification_pack_exports,
recent_searches, recently_viewed, referral_assessments, referral_documents,
referral_matches, referrals, reviews, saved_search_delivery_history,
saved_searches, scheduled_viewings, seller_mandate_comparables,
seller_mandate_operations, seller_prospect_activities, seller_prospects,
service_explore_videos, service_lead_events, service_leads,
service_provider_locations, service_provider_profiles,
service_provider_reviews, service_provider_services,
service_provider_subscriptions, services, showings, subscription_events,
subscription_plans, subscription_usage, subscriptions, suburb_price_analytics,
suburbs, topics, unit_types, user_onboarding_state, user_subscriptions, users,
video_likes, videos
```

## Finding and recovery proposal

The service recovery was justified: the safeguarded command independently
classified the absent process/listeners and matching stale artifacts as safely
recoverable, then restored availability without replacing the root or data
directory. That is the supported likely cause of the service-status incident:
stale metadata after an abnormal prior service end.

The migration attempt is different. A normal runner failure would try to mark
the attempt `failed`; this record is still `running`, has no failure evidence,
and has no retained raw error. The physical state shows work beyond the durable
progress count may exist. It supports an interrupted execution path but cannot
distinguish a client/process interruption, a server interruption, or a SQL
failure after pre-existing physical DDL. No root cause is asserted from the
last-statement or failure digests.

The concrete next step is a principal-architect-approved, named recovery
**plan** for this exact partially applied baseline attempt. It must bind the
attempt ID, target fingerprint, migration checksum, manifest digest, physical
object census, and retained-log result above. Before any recovery apply, that
plan must reconcile every affected baseline object against physical state—not
use `490` as a rollback or resume boundary—and define how the original attempt
will remain immutable and linked to any new recovery evidence.

There is no applicable generic recovery command today: the existing named
zero-statement recovery is for a different, explicitly rejected migration and
requires a failed zero-statement attempt. It cannot authorize this `running`,
490-statement baseline attempt. Until a reviewed, bounded replacement exists,
the required position is to preserve this target and attempt unchanged. Do not
retry, reset, recreate, manually alter the schema, edit the ledger, or use an
alternate database to continue Stage 1.
