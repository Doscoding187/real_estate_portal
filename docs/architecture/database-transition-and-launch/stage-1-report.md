# Stage 1 local implementation and proof report

**Status:** BLOCKED — a principal-architect recovery decision is required before
the local migration proof can continue.

**Plan authority:** [master plan version 1.3, amendment A-01](master-plan.md)
and the [Stage 1 assignment](stage-1-assignment.md).
**Prepared:** 2026-09-12.
**Scope:** local implementation and evidence only. No Azure, TiDB, shared,
remote, protected, or quarantined listify_local target was used.

## Source, ownership, and provenance

| Item | Evidence |
| --- | --- |
| Task branch and worktree | feat/database-transition-stage-1 at /home/edwardspc/Desktop/Dev/worktrees/property-listify-database-transition-stage-1 |
| Integration base | origin/main at c2158b5d; tree cbf233163d0a686ee4c7eb92e842bca2327d4535 |
| Assigned candidate | feat/database-architecture-takeover at b05e6569c02be4a47de8583bc9ed6197e528d035; tree 17353abc4a81361cd78db1a97862bbed6f217aae |
| Candidate integration | 4d6b2ca57fb94c970e3516e3db2ce7a39c140eec; tree 17353abc4a81361cd78db1a97862bbed6f217aae |
| WP2 control change | d3084091d57d023e733f158ae8bcf79105de0880; tree 7518a9c97aa6d8b3a0c09327ccfa0fb499591a58 |
| Plan-document merge | 7ed4f463192ff0ac068537364701f97414877c10; tree d90d1778c78bec27e927e1505418ad14aad32547 |

The task worktree was clean before this report was added. The master-plan branch
was merged only to place the authoritative plan, assignment, and this report
together; this remains the independent implementation branch required by the
assignment. Final Git status is clean after this report is committed.

## Authority target and preserved failure evidence

The Database Authority resolved an exact, local, disposable worktree target:

| Field | Recorded value |
| --- | --- |
| Target / credential class | disposable-worktree / local-owner |
| Database identity | listify_wt_database_transition_stage_1_d8173f13c5c4 |
| Target fingerprint hash | 5b75c0ec72db92fea58941cbedecf61579a049de9a3f4fccf938969bf5e733dc |
| Worktree ownership | exact; ownership key d8173f13c5c4f84304c26a2d |
| Local service | authority-owned MySQL on 127.0.0.1:3307; service fingerprint 2425e54d0472ee5b308127a7c63380733f077ec7531767d6dba21a2c2a9177f2 |
| Manifest digest / head | a511e70ae06ffbae4027cf02b1de8cc0f586ff7c23cb7cb11a0990606cf728ed / 0090_retire_disconnected_boost_campaigns.sql |

The local service was started and awaited through the authority-owned lifecycle
wrapper, and the owned database was created once. A fresh-chain plan was then
accepted for old head none and the manifest head. The one canonical apply
attempt recorded an incomplete baseline attempt,
c242df81bf9eace7fe132d01-0000. The preceding authority status reported
manifest-head-behind and incomplete-migration-attempt.

Per the assignment, no migration was retried, no database was reset or
recreated, no alternate target was created, and no recovery command was run.
The final read-only lifecycle snapshot returned exit 1 because the authority
service detected a stale PID file at
/var/tmp/property-listify-1000/mysql-3307/mysqld.pid and explicitly preserved
it for review. A subsequent read-only db:migrate:plan could not reconnect, so
it could not re-evaluate the ledger or attempts. This is additional preserved
evidence, not a reason to bypass the incomplete-attempt control.

## WP1 — migration lineage and engine admission

**Package status:** BLOCKED. Static lineage and model checks pass, but the
fresh local chain stopped at the baseline attempt. Consequently, no physical
MySQL 8.0/8.4, CHECK/FK, lifecycle, consumer, concurrency, or historical-head
claim is made here, and no engine/version recommendation is requested.

The active [manifest](../../../server/migrations/manifest.json) contains 91
ordered files from 0000 through 0090; static authority checks confirm the tree,
checksums, and canonical baseline. Migrations 0000–0065 remain physically
unadmitted on this target because the chain did not complete 0000.

The assigned candidate delta has the following individual dispositions. Each
has verified static membership and source presence, but its physical admission
is BLOCKED — fresh chain incomplete.

| Migration | Intent |
| --- | --- |
| 0066_favorites_user_property_deduplicate.sql | Remove duplicate favorites before uniqueness admission. |
| 0067_favorites_user_property_unique.sql | Add favorite owner/property uniqueness. |
| 0068_recently_viewed_activity_cleanup.sql | Clean invalid or duplicate recent-view activity. |
| 0069_recently_viewed_listing_required.sql | Require the canonical listing subject. |
| 0070_recently_viewed_user_listing_unique.sql | Add recent-view user/listing uniqueness. |
| 0071_recently_viewed_user_recency_index.sql | Add user/recency lookup index. |
| 0072_retire_legacy_prospect_favorites.sql | Retire legacy prospect favorites. |
| 0073_retire_legacy_scheduled_viewings.sql | Retire legacy scheduled viewings. |
| 0074_retire_legacy_prospects.sql | Retire legacy prospects. |
| 0075_recently_viewed_microsecond_recency.sql | Preserve sub-second recency ordering. |
| 0076_lead_delivery_relational_authority.sql | Add relational delivery and attempt authority. |
| 0077_bundle_attribution_relational_authority.sql | Add bundle-attribution relation. |
| 0078_retire_unreachable_partner_leads.sql | Retire unreachable partner-lead storage. |
| 0079_explore_engagement_event_identity.sql | Add idempotent engagement-event identity. |
| 0080_service_lead_request_idempotency.sql | Add idempotent service-lead request identity. |
| 0081_explore_analytics_query_index.sql | Add engagement aggregate lookup index. |
| 0082_explore_engagement_retention_indexes.sql | Add engagement retention/review indexes. |
| 0083_billing_provider_event_identity.sql | Add durable billing provider-event identity. |
| 0084_billing_provider_event_retry_budget.sql | Add bounded billing retry fields. |
| 0085_billing_billable_accounts.sql | Add typed billable-account ownership and its check/FKs. |
| 0086_billing_billable_accounts_not_null.sql | Tighten admitted billable-account nullability. |
| 0087_billing_provider_event_leases.sql | Add billing provider-event leases. |
| 0088_retire_obsolete_billing_families.sql | Retire obsolete billing families. |
| 0089_retire_disconnected_analytics_aggregations.sql | Retire disconnected analytics aggregations. |
| 0090_retire_disconnected_boost_campaigns.sql | Retire disconnected boost campaigns. |

### Static constraint inventory

The canonical desired schema was deterministically derived by
[normalizedDesiredSchema](../../../server/_core/databaseAuthority/schemaCongruency.ts)
from the Drizzle exports. Its structural digest is
59ad0020e367b82288e266a7964a0985463420ab25c24e7b93caa0c51c600e8c, with
212 application tables, 23 CHECK constraints, and 461 foreign keys. The
generated [canonical model inventory](../../../drizzle/schema/canonical-model-inventory.json)
is current. The normalized schema generator is the complete machine-readable
foreign-key inventory for that digest; physical inventory and enforcement
remain unproven while the local attempt is blocked.

The 23 static CHECK identities are:

| Table | CHECK identities |
| --- | --- |
| billable_accounts | billable_accounts_exactly_one_owner |
| catalogue_publishers | chk_catalogue_publishers_authority_shape; chk_catalogue_publishers_platform_source |
| commercial_availabilities | chk_commercial_availabilities_freshness_order; chk_commercial_availabilities_positive_claim_provenance |
| commercial_availability_economics | chk_commercial_availability_economics_range; chk_commercial_availability_economics_value_state |
| commercial_availability_lease_terms | chk_commercial_lease_terms_nonnegative |
| commercial_space_specifications | chk_commercial_space_specifications_boolean; chk_commercial_space_specifications_value_state |
| commercial_spaces | chk_commercial_spaces_positive_areas |
| development_supersessions | chk_development_supersessions_activation_order; chk_development_supersessions_activation_triplet; chk_development_supersessions_active_shape; chk_development_supersessions_distinct_endpoints; chk_development_supersessions_reversal_order; chk_development_supersessions_reversed_shape; chk_development_supersessions_source_path; chk_development_supersessions_verification_note; chk_development_supersessions_verified_shape |
| land_claims | chk_land_claims_one_subject |
| land_conflict_cases | chk_land_conflict_case_candidate |
| location_provider_mappings | location_provider_mappings_exactly_one_target |

The master plan's MySQL 8.4 preference remains a proposal, not a Stage 1 engine
admission. G1 is not requested.

## WP2 — release control and target-security gaps

**Package status:** BLOCKED overall. The runner-digest control is EVIDENCE PASS
— REVIEW PENDING; physical enforcement and target-backed smoke evidence are
blocked by the preserved local failure.

The bounded code change makes ordinary protected release:apply require
--plan-digest in the authority CLI. The runner requires a 64-character digest
before it opens a connection, compares it to a freshly built plan before any
durable mutation, then rereads state and recomputes/rechecks it under the
migration lock. Existing explicit old/new head, target authorization, migration
credential, and acknowledgement checks remain in place. The change is limited
to the existing control plane:

- [runSqlMigrations.ts](../../../server/migrations/runSqlMigrations.ts)
- [databaseAuthorityCli.ts](../../../scripts/databaseAuthorityCli.ts)
- [runSqlMigrations.test.ts](../../../server/migrations/__tests__/runSqlMigrations.test.ts)
- the corresponding authority and migration-operation documentation.

The focused runner test proves missing and wrong digests, unchanged-head
manifest drift, state change after lock acquisition, and an incomplete attempt
appearing after review all refuse before migration DDL. The static authority
suite includes the existing exact-target, invalid-acknowledgement, and wrong
migration-credential denial coverage. No grant, identity, target, or security
model was broadened.

Unrun WP2 evidence is explicitly blocked: physical CHECK/FK rejection and
lifecycle proof, local protected-data/smoke preparation, and target-backed
readiness/congruency. G2 is not requested.

## WP3 — integrated local acceptance

**Package status:** BLOCKED. The static release candidate builds and its
authority controls pass, but no database-backed consumer contract, readiness,
congruency, browser, or Live/Pilot/Hidden journey was run after the incomplete
attempt. The central launch register was not changed, no product scope was
declared Live, and no hosted CI or merged-SHA evidence is claimed.

Skipped until a reviewed recovery outcome includes authority-wrapped consumer
contract and physical checks, data-role preparation, readiness and congruency,
and browser acceptance. These are not waived; G3 is not requested.

## Commands and observed results

All checks below ran on the task branch's local worktree. PASS means only the
stated command succeeded; it is not gate approval.

| Command | Result | Notes |
| --- | --- | --- |
| pnpm db:authority:check | PASS | Database authority static gate passed; 91 active migrations, 212 canonical tables, and deterministic inventory confirmed. |
| pnpm schema:inventory:check | PASS | Canonical model inventory deterministic and current. |
| pnpm vitest run --no-cache server/migrations/__tests__/runSqlMigrations.test.ts --reporter=basic | PASS | 1 file, 24 tests. |
| pnpm check | PASS | TypeScript check passed. |
| pnpm lint:check | PASS | ESLint passed. |
| pnpm build | PASS | Vite production build completed; it reported existing large-chunk advisory warnings only. |
| git diff --check | PASS | No whitespace errors before the WP2 commit. |
| pnpm db:authority:status | PASS (diagnostic) | Resolved the exact owned target but reported it database-unreachable at the final snapshot. |
| pnpm db:authority:service:status | BLOCKED, exit 1 | Stale PID evidence preserved for review; no recovery run. |
| pnpm db:migrate:plan | BLOCKED, exit 1 | Cannot reconnect to the preserved target; no retry attempted. |

## Recovery position and Stage 2 preparation packet

This is the required stopping point. The senior decision needed is whether the
stale local-service evidence and recorded incomplete attempt may be inspected
and recovered through the existing reviewed recovery path. No recovery apply,
reset, service-recovery command, alternate disposable target, or migration
history change is authorized by this report.

If the principal architect authorizes the next local operation, it must first
preserve and review the attempt evidence through the authority path, then use a
reviewed recovery plan before any apply. A new target must not be used to hide
this attempt. Only after that decision can the outstanding local MySQL engine,
physical enforcement, lifecycle, consumer, and browser evidence be resumed.

Stage 2 remains unrequested and unauthorized. Its future preparation packet
needs, at minimum:

1. Principal-architect decisions on this recovery, G1 engine admission, and G2
   enforcement/control review.
2. Security review of separated identities and grant evidence once a permitted
   protected target is in scope.
3. Edward's disposition of remaining Live/Pilot/Hidden product choices and
   approval of any Azure budget/target request.
4. Explicit approved source-data access and reconciliation ownership before any
   TiDB inventory or import work.

No future target fingerprint, approval metadata, provider compatibility, or
source-data result is invented here.
