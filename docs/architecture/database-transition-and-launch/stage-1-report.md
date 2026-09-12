# Stage 1 local implementation and proof report

**Status:** IN PROGRESS — D-009's one fresh local establishment executed with
local evidence passing; Stage 1 review, gate approval, and the remaining
non-local obligations are still pending.

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
| D-009 decision source | 3991934edf563fd40444b64e5e16bd857140c9a6 |
| Successor task branch / worktree | feat/database-transition-stage-1-fresh-establishment at /home/edwardspc/Desktop/Dev/worktrees/property-listify-database-transition-stage-1-fresh-establishment |
| Successor source | 7a1b2a43daa0e167c1f51f0680759bf6d1228892; tree 769a180b5ff3459e606b4bf2a5c63185b680d1f5 |
| Successor ancestry | `git merge-base --is-ancestor` returned 0 for both candidate integration `4d6b2ca…` and WP2 control `d308409…` |

The original task worktree was clean before this report was added. The
master-plan branch was merged only to place the authoritative plan, assignment,
and this report together; this remains the independent implementation branch
required by the assignment. The D-009 successor is a separate task-owned
worktree that carries that provenance forward; it did not modify the preserved
worktree or its target.

## Historical preserved target and failure evidence

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

At the time of this initial report, no migration was retried, no database was
reset or recreated, no alternate target was created, and no recovery command
had run. The final read-only lifecycle snapshot returned exit 1 because the
authority service detected a stale PID file at
/var/tmp/property-listify-1000/mysql-3307/mysqld.pid and explicitly preserved
it for review. A subsequent read-only db:migrate:plan could not reconnect, so
it could not re-evaluate the ledger or attempts. This is additional preserved
evidence, not a reason to bypass the incomplete-attempt control.

The later, explicitly authorized service-status continuation is recorded in
[the Stage 1 incident continuation](stage-1-incident-continuation.md). It
recovered only safely classified stale local-service metadata, preserved the
same target and attempt, and did not authorize migration recovery, retry,
reset, replacement, manual DDL, or ledger modification.

## D-009 successor fresh establishment — execution record, not recovery

The preserved target above was never resumed, written, seeded, reset, disposed,
or repaired. D-009 instead authorized exactly one authority-derived successor:

| Field | Recorded value |
| --- | --- |
| Target / credential class | disposable-worktree / local-owner |
| Database identity | listify_wt_database_transition_stage_1_fr_4388046192b2 |
| Target fingerprint hash | b121616eb803e0da7351ee3aa767f10d5f7f9c8585d9d3f83f3a41e07a86faf2 |
| Fingerprint separation | Differs from preserved fingerprint 5b75c0ec72db92fea58941cbedecf61579a049de9a3f4fccf938969bf5e733dc |
| Worktree ownership | exact; ownership key 4388046192b23980838607dc |
| Local service | Existing authority-owned MySQL on 127.0.0.1:3307; unchanged fingerprint 2425e54d0472ee5b308127a7c63380733f077ec7531767d6dba21a2c2a9177f2, root, and data directory |
| Fresh precondition | migration ledger and attempt authority missing; schema noncongruent |
| Canonical pre-apply plan | 688db4f891290074be8feddc / 688db4f891290074be8feddc2cb9d1ddea51ad1187a30aced7a12c644743ae15; old head none; 91 pending files; expected head 0090_retire_disconnected_boost_campaigns.sql |
| Governed apply | One apply, 2026-09-12T12:35:27.507Z–2026-09-12T12:38:38.791Z, exit 0; baseline attempt ...-0000 completed 948 statements; all 91 files have successful attempt evidence |
| Final authority state | target-connected; exact-worktree-owned; manifest-head-ready; no-incomplete-attempts; final plan pending [] and lock null |
| Final physical state | congruent true, no differences, desired and actual digest both 59ad0020e367b82288e266a7964a0985463420ab25c24e7b93caa0c51c600e8c |

The equality above means the selected canonical physical inventory is present:
212 application tables, 23 CHECK constraints, and 461 foreign keys. This is an
inference from the normalized actual-to-desired equality, not a claim about
Azure or TiDB. Behavioral proof on the same exact target passed 13/13 through
the authority-wrapped real-MySQL supersession test, including rejected invalid
CHECK shapes, an orphan endpoint write, and a referenced-row deletion under
`ON DELETE RESTRICT`.

Private runner stdout/stderr, timestamps, exit status, and service-log snapshots
are retained under `/var/tmp/property-listify-stage-1-fresh-establishment-4388046192b2`
(directory mode 0700, files mode 0600). Sanitized hashes: apply stdout
`fd486f9fbe18188c4f022bcdba648729cab00ae97722b8ab1ed38e4fb60f3229`, empty
stderr `e3b0c442…b855`, and matching before/after 200617-byte service logs
`df07bf28a98b413ac264b23f7fcbde9e1cf6b02add12a691f361dc62e34285b6`.
The original incident remains linked in
[the incident continuation](stage-1-incident-continuation.md); no raw runner
output or credentials are published here.

## WP1 — migration lineage and engine admission

**Package status:** EVIDENCE PASS — REVIEW PENDING for one fresh local MySQL
chain. The preserved target remains blocked and is not repaired. No MySQL 8.0
or 8.4 engine-version recommendation, Azure admission, historical-head proof,
or G1 approval is requested.

The active [manifest](../../../server/migrations/manifest.json) contains 91
ordered files from 0000 through 0090; static authority checks confirm the tree,
checksums, and canonical baseline. The D-009 successor applied all 91 files to
the accepted manifest head. The statement below about the original target is
historical preserved evidence, not a physical-admission claim about the
successor.

The assigned candidate delta has the following individual dispositions. Each
has verified static membership and source presence and is represented by a
successful per-migration attempt on the D-009 successor; no conclusion is drawn
about repairability of the preserved partial target.

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
foreign-key inventory for that digest. The successor's final normalized physical
schema has the identical digest with no differences, and the focused real-MySQL
test supplies behavioral CHECK, orphan-FK, and restrictive-delete rejection
evidence. This does not substitute for Azure/TiDB provider admission.

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

**Package status:** EVIDENCE PASS — REVIEW PENDING for the local control and
physical-proof subset. G2 is not requested: protected identity/grant evidence,
target admission, and principal/security review remain separate obligations.

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

The successor evidence now includes 24 runner tests, 20 context-authorization
tests, the 272-test static authority gate, physical CHECK/FK rejection and
lifecycle proof, target-backed data-role preparation, readiness, and local
smoke journeys. The original first enforcement-test run failed only because
the required Launch Access foundation was not yet prepared; it did not create a
migration attempt. After canonical reference/foundation preparation, the test
passed. The scenario adapter defect discovered during preparation was fixed at
`7a1b2a43` so it creates typed accounts at the first scenario billing fact; its
governed rerun and verification passed. G2 remains review pending.

## WP3 — integrated local acceptance

**Package status:** IN PROGRESS. The successor passed canonical reference,
foundation, and Search-to-Lead scenario verification; Search-to-Lead readiness;
the 11-test authority-wrapped agency walkthrough; and the scoped P1 browser
persistence journey. This is local acceptance evidence only. The central launch
register was not changed, no product scope was declared Live, and no hosted CI
or merged-SHA evidence is claimed.

The fresh-schema consumer-contract harness was intentionally not run after
application because it requires an empty target and would invoke a fresh
migration test. No existing local evidence closes every centrally classified
Live journey while D-008 remains open. These limits are not waived; G3 is not
requested.

## Commands and observed results

The first table is the historical pre-D-009 run on the preserved worktree.
PASS means only the stated command succeeded; it is not gate approval. The
second table is the current successor record and supersedes only the matching
validation claims.

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

### D-009 successor commands and observed results

| Command | Result | Notes |
| --- | --- | --- |
| canonical `db:worktree:create` | PASS | Created the one authority-derived successor target; no hand-selected name or copied profile. |
| `pnpm db:migrate:plan` before apply | PASS | Fresh plan `688db4…ae15`; old head none, 91 pending files, expected head 0090. |
| `pnpm db:migrate:apply -- --accepted-old-head=none --expected-new-head=0090_retire_disconnected_boost_campaigns.sql` | PASS | One governed apply, exit 0, 2026-09-12T12:35:27.507Z–12:38:38.791Z. |
| final `pnpm db:authority:status` / `pnpm db:migrate:plan` | PASS | Exact successor ownership; head ready; no incomplete attempts; no pending files or lock. |
| final `pnpm db:schema:congruency` / `pnpm db:verify:ci` | PASS | No normalized differences; 88/88 contract checks; complete checksummed ledger/attempt evidence. |
| `S2_DB_TESTS=1 pnpm test:authority -- server/__tests__/integration.developer-engine-s2-supersession.test.ts` | PASS | 13/13 real-MySQL checks, including CHECK rejection, orphan endpoint rejection, and restrictive FK deletion; test uses the exact owned target and cleanup. |
| `pnpm db:reference:prepare` / `verify`; `pnpm db:foundation:prepare` / `verify` | PASS | Canonical geography and Launch Access foundation admitted through owned-target adapters. |
| `pnpm db:scenario:prepare` / `verify`; `pnpm db:verify:distribution`; `pnpm db:readiness -- --purpose=search-to-lead` | PASS | Search-to-Lead scenario and required data roles ready; readiness application-ready. |
| `pnpm test:authority -- server/__tests__/integration.launch-readiness-walkthrough.test.ts` | PASS | 11/11 local agency journey tests. |
| `pnpm test:browser:authority -- e2e/consumer-activity/persistence.spec.ts --project='Desktop Chrome' --retries=0` | PASS | 1/1 scoped browser persistence journey on the exact target. |
| `pnpm db:authority:check`; focused runner/context tests | PASS | Static authority gate 272/272; runner test 24/24; context-authorization test 20/20. |
| `pnpm check` / `pnpm build` | PASS | TypeScript check and Vite production build passed. |
| `pnpm lint:check` | BLOCKED, exit 1 | Six existing `no-useless-catch` errors in unrelated `server/services/topicsService.ts`; 11241 existing warnings. This workstream did not alter that file. |

## Recovery position and Stage 2 preparation packet

D-009 has been consumed successfully. The preserved target remains operationally
quarantined with its `running` attempt and unknown cause; the successor did not
repair, resume, copy, reset, dispose, or alter it. A future repair proposal for
the preserved target would still require a separately reviewed object-by-object
plan. No third target or automatic retry is authorized.

Stage 1 is not complete and requests no gate approval. The consolidated review
must disposition the local fresh-chain evidence alongside these remaining
items:

1. The repository-wide lint baseline: six unrelated fatal errors in
   `server/services/topicsService.ts` and its existing warning volume.
2. G1 engine/version selection and any required MySQL 8.0/8.4 compatibility or
   historical-head evidence; the local service result is not engine admission.
3. G2 protected credential/grant separation, protected target admission, and
   principal/security review of the runner controls and local enforcement proof.
4. D-008 Live/Pilot/Hidden product disposition, the full required journey set,
   hosted CI, and post-merge validation on the approved merged SHA for G3.

Stage 2 remains unrequested and unauthorized. Its future preparation packet
still requires explicit Azure resource/budget/target authority and approved
source-data access, mapping, reconciliation ownership, and TiDB scope. No
future target fingerprint, approval metadata, provider compatibility, or
source-data result is invented here.
