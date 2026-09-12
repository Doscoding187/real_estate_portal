# Stage 1 local implementation and proof report

**Status:** EVIDENCE PASS — REVIEW PENDING for the bounded local closure
packet. D-009's one fresh local establishment remains accepted as local
evidence. G1, G2, and G3 remain open; no Azure, TiDB, merge, deployment, or
third local target is authorized.

**Plan authority:** [master plan version 1.3, amendment A-01](master-plan.md)
and the [Stage 1 assignment](stage-1-assignment.md).
**Prepared:** 2026-09-12.
**Scope:** local implementation and evidence only. No Azure, TiDB, shared,
remote, protected, or quarantined listify_local target was used.

## Source, ownership, and provenance

| Item | Evidence |
| --- | --- |
| Task branch and worktree | feat/database-transition-stage-1-fresh-establishment at /home/edwardspc/Desktop/Dev/worktrees/property-listify-database-transition-stage-1-fresh-establishment |
| Integration base | origin/main at c2158b5d; tree cbf233163d0a686ee4c7eb92e842bca2327d4535 |
| Assigned candidate | feat/database-architecture-takeover at b05e6569c02be4a47de8583bc9ed6197e528d035; tree 17353abc4a81361cd78db1a97862bbed6f217aae |
| Candidate integration | 4d6b2ca57fb94c970e3516e3db2ce7a39c140eec; tree 17353abc4a81361cd78db1a97862bbed6f217aae |
| WP2 control change | d3084091d57d023e733f158ae8bcf79105de0880; tree 7518a9c97aa6d8b3a0c09327ccfa0fb499591a58 |
| Plan-document merge | 7ed4f463192ff0ac068537364701f97414877c10; tree d90d1778c78bec27e927e1505418ad14aad32547 |
| D-009 decision source | 3991934edf563fd40444b64e5e16bd857140c9a6 |
| Successor task branch / worktree | feat/database-transition-stage-1-fresh-establishment at /home/edwardspc/Desktop/Dev/worktrees/property-listify-database-transition-stage-1-fresh-establishment |
| Successor source | 7a1b2a43daa0e167c1f51f0680759bf6d1228892; tree 769a180b5ff3459e606b4bf2a5c63185b680d1f5 |
| Closure implementation | 4bce622bb4346a3302c066cd9fc7ca91bcf311d1; tree d59778f3558e2ac06c7c3bed5ce06426796358d4 |
| Successor ancestry | `git merge-base --is-ancestor` returned 0 for both candidate integration `4d6b2ca…` and WP2 control `d308409…` |
| Final successor Git status | The bounded closure implementation is committed above, and this report is the accompanying closure artifact. No generated browser artifacts or unrelated files are included. |

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

## Consolidated Stage 1 closure continuation

This continuation records the bounded local work requested after review of the
fresh establishment. It used the same exact successor target and existing
authority-owned service only. It did not apply a migration, recover or resume
an attempt, create a target or identity, grant or revoke a privilege, change a
schema, reset data, or touch the preserved target.

The original D-009 execution record correctly used normalized schema format 1
and digest `59ad0020e367b82288e266a7964a0985463420ab25c24e7b93caa0c51c600e8c`.
The closure change deliberately advances the inventory to format 2 so that a
CHECK's enforced state is part of its canonical fingerprint. Current
congruency on the same target is `true`, has no differences, and reports
matching desired/actual digest
`95f6c6b11056df70c0e1fd5639dcf0e9cb58e0616e01ac6f243564112dd24cea`.
The format change is verification-source evidence; it did not mutate the
established database.

### Enforcement verification and constraint lifecycle

`normalizedPhysicalSchema` now reads MySQL's per-constraint `ENFORCED`
metadata and fails closed if that metadata is absent. TiDB continues to use its
existing `tidb_enable_check_constraint` capability as the provider-level
enforcement input. The canonical digest therefore changes if a physical CHECK
has the same predicate but is disabled.

| Evidence | Result |
| --- | --- |
| `pnpm db:schema:congruency` | PASS — 212 tables; 23 physical CHECKs, all 23 enforced; no unenforced identities; desired and actual format-2 digest `95f6…4cea` match. |
| Static negative verifier coverage | PASS — a copied schema with the same `fixture_parents_positive_id` predicate but `enforced: false` is noncongruent; readiness returns `schema-not-congruent`. A MySQL physical fixture with `ENFORCED = NO` is also noncongruent, and missing MySQL enforcement metadata is refused. |
| Selected real-MySQL lifecycle | PASS — `S2_DB_TESTS=1 pnpm test:authority -- server/__tests__/integration.developer-engine-s2-supersession.test.ts --reporter=basic`, 13/13. The test proves `ER_CHECK_CONSTRAINT_VIOLATED`/3819 for `chk_development_supersessions_distinct_endpoints` and `chk_development_supersessions_active_shape`; an otherwise-valid row with a proven absent `-2147483648` parent produces `ER_NO_REFERENCED_ROW_2`/1452 for `fk_development_supersessions_source_development`; duplicate and restrictive-delete cases assert their named MySQL constraints. |
| Billable-account ownership | PASS — `pnpm test:authority -- server/__tests__/integration.billing-billable-account.test.ts --reporter=basic`, 3/3. It selects an agency with an existing canonical agency account, then asserts the otherwise-invalid `account_kind = agent`/`agency_id` row produces `ER_CHECK_CONSTRAINT_VIOLATED`/3819 for `billable_accounts_exactly_one_owner`. |

No ad hoc DDL was issued against the established target. The behavioral writes
above are authority-wrapped integration fixtures with their normal cleanup;
the schema proof itself is metadata-only.

### Local credential and grant evidence — explicit open security decision

The source policy matrix is now covered by an additional static authorization
test: runtime-connect/runtime, migration-apply/migration, and
verification/read-only are allowed; runtime/read-only, migration/runtime, and
verification/lifecycle-admin are denied before a connection opens. This is a
necessary control-plane result, not proof that separate physical credentials
are currently selected locally.

Read-only `SHOW GRANTS` inspection of the actual successor connection profile
found `listify_app@127.0.0.1` has `ALL PRIVILEGES` on this successor target.
The sanitized target-grant fingerprint is
`47fdcf9758b1b7648f394b3d6a0c48012d3d624646194248f79c8a002e32078f`.
That identity can therefore not prove the required runtime denials for DDL,
`GRANT`, or writes to `sql_migration_history` / `sql_migration_attempts`.
Local runtime, migration, and verifier credential classes currently label the
same local URL channel rather than binding three distinct least-privilege
identities.

| Matrix row | Policy evidence | Actual local grant conclusion |
| --- | --- | --- |
| Runtime | Permitted only as the runtime credential class; the wrong read-only class is denied. | **Not admitted** as a least-privilege runtime identity: current local account has target-level `ALL PRIVILEGES`. |
| Migration | Permitted only as the migration/local-owner class; the runtime class is denied. | No distinct physical local migration identity was provisioned or tested. |
| Read-only verifier | Permitted as read-only; lifecycle-admin is denied. | No distinct physical read-only local identity was provisioned or tested. |

No probe was used to exploit the broad grants, and no temporary role recipe was
substituted for the application's real credential binding. Altering the local
lifecycle to create separate identities, revoking the existing broad account,
or defining an alternate permanent grant model is a credential/grant-model
change and remains for principal-architect and security review. This leaves
the physical identity/grant portion of G2 **BLOCKED**, while preserving the
working policy and target evidence.

### Engine admission evidence and recommendation

The authority-guarded successor diagnostics recorded local MySQL
`8.0.46-0ubuntu0.24.04.3` on Linux x86_64 with InnoDB, `utf8mb4`,
`utf8mb4_0900_ai_ci`, `lower_case_table_names=0`, and the recorded strict SQL
mode. The native authority launcher invokes the ambient `mysqld`, so this is
runtime evidence rather than a repository pin. CI is independently pinned to
MySQL `8.0.44` by image digest and is the approved isolated route for the
fresh consumer contract.

**Recommendation for principal decision D-003:** select MySQL 8.4 for the
launch candidate, subject to a clean 8.4 fresh-chain, constraint/lifecycle and
readiness run plus Azure capability admission. Retain 8.0.46 only as evidence
that this local chain works on 8.0; it is not Azure admission. Microsoft lists
MySQL 8.0 community retirement as 2026-04-30 and Azure standard-support end as
2026-12-31, while MySQL's 8.4 guidance requires an upgrade checker, application
testing, and a rehearsed upgrade before production use. See [Azure's version
support policy](https://learn.microsoft.com/en-us/azure/mysql/concepts-version-policy)
and [MySQL's upgrade best practices](https://dev.mysql.com/doc/refman/8.4/en/upgrade-best-practices.html).

The bounded source review found no active migration-SQL uses of obsolete auth
plugins, obsolete SQL modes, `YEAR(2)`, old replication syntax, or
`VALUES(column)` upserts. It did find three runtime `VALUES(column)` upsert
review candidates in `server/services/qualityScoringService.ts`, `server/db.ts`,
and `server/services/marketplaceBundleService.ts`; they are compatibility
review items, not observed failures. The dormant alternate Compose files still
specify floating `mysql:8.0` and `mysql_native_password`; they require an
explicit 8.4 disposition and are not changed in this packet.

### Consumer-contract route and D-008 acceptance map

The existing successor is deliberately no longer fresh. A local
`pnpm db:authority:consumer-contract` invocation correctly refused before
mutation because tables already exist. The approved isolated route remains
`.github/workflows/ci.yml`: it provisions clean `listify_test` on the pinned
MySQL service and runs `pnpm db:authority:consumer-contract`. No third local
target was created or repurposed. The fresh consumer-contract result is thus a
required CI artifact, not a claim supplied by this populated successor.

The central launch register has not resolved D-008, so the following is an
evidence map, not a Live declaration:

| Journey family | Local evidence in this packet | Dependency / remaining decision |
| --- | --- | --- |
| Registration, authentication, recovery | None newly rerun as a fresh consumer contract. | D-008 must say whether it is Live; then its complete journey evidence and CI result are required. |
| Authorization | Search-to-Lead scenario verifies representative agent, agency, developer, platform, and unrelated-user visibility boundaries. | Not a blanket Live authorization claim; required scope and journey set depend on D-008. |
| Agents, agencies, developers, developments | S2 lifecycle (13/13) verifies custody, publication/supersession, idempotency and restrictive deletion. | D-008 determines which surfaces are Live and what additional consumer evidence is required. |
| Listings, locations, Land | Canonical geography/reference, Search-to-Lead scenario, distribution verification, and readiness pass locally. | Any Live Land scope still requires its canonical consumer journey evidence and D-008 disposition. |
| Leads and workers | Scenario proves local lead custody, idempotency and selected delivery facts. | Worker/recovery requirements and Live scope remain open under D-008. |
| Entitlements, payments, webhooks | Foundation and typed billable-account ownership pass locally. | Paid-launch/provider journey, reconciliation and Live/Pilot/Hidden status remain D-008-dependent. |
| Founder/admin | No complete Live founder/admin journey is claimed. | D-008 and central register must identify the required scope and evidence. |

Service providers, Explore, paid checkout, marketplace, distribution,
commission, sponsorship, and boost remain Pilot/Hidden unless the central
register records a separate approved scope and backend-boundary evidence.

### Release checks and closure result

The six fatal `no-useless-catch` findings in `server/services/topicsService.ts`
were removed without changing SQL or return behavior. The bounded correction is
separately reviewable with the authority and constraint changes. `pnpm
lint:check` now exits 0 with zero errors (the repository's existing warning
baseline remains warnings and is not represented as a passed error).

| Check | Result |
| --- | --- |
| `pnpm db:authority:check` | PASS — 33 files, 277 tests; utility, schema inventory, and lifecycle checks passed. |
| Focused CHECK/readiness/context tests | PASS — schema congruency 18/18, readiness 10/10, context authorization 21/21. |
| `pnpm check` | PASS. |
| `pnpm lint:check` | PASS (exit 0). |
| Current `pnpm db:authority:status` | PASS — exact successor ownership, head 0090, no incomplete attempt, schema congruent. |
| Current `pnpm db:readiness -- --purpose=search-to-lead` | PASS — application-ready for the requested local scenario. |

**Closure disposition:** the fresh-chain, physical CHECK/FK, selected
constraint-lifecycle, authority-policy, lint, and local scenario evidence is
ready for consolidated review. G1 remains open for D-002/D-003 migration and
engine admission, including a fresh 8.4/CI consumer result. G2 remains open
because the actual local identity/grant matrix is not least-privilege. G3
remains open for D-008, approved merged SHA, CI artifacts, and the declared
Live journeys. Stage 2 remains blocked; no Azure or TiDB operation is requested.

## WP1 — migration lineage and engine admission

**Package status:** EVIDENCE PASS — REVIEW PENDING for one fresh local MySQL
8.0 chain and the selected physical constraints. The preserved target remains
blocked and is not repaired. The closure packet recommends MySQL 8.4 subject to
its separate fresh-chain/provider evidence; it does not request Azure admission,
historical-head proof, D-002/D-003 approval, or G1 approval.

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
from the Drizzle exports. Its format-2 structural digest is
95f6c6b11056df70c0e1fd5639dcf0e9cb58e0616e01ac6f243564112dd24cea, with
212 application tables, 23 CHECK constraints, and 461 foreign keys. The
generated [canonical model inventory](../../../drizzle/schema/canonical-model-inventory.json)
is current. The normalized schema generator is the complete machine-readable
foreign-key inventory for that digest. The successor's final normalized physical
schema has the identical digest with no differences and all 23 physical CHECKs
reported as enforced. The focused real-MySQL tests supply behavioral named
CHECK, orphan-FK, billable-account, and restrictive-delete rejection evidence.
This does not substitute for Azure/TiDB provider admission.

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

**Package status:** PARTIAL EVIDENCE — REVIEW PENDING for the local control and
physical-enforcement subset. G2 is not requested: the closure inspection shows
the current local account is not a least-privilege runtime identity, so the
physical identity/grant packet remains blocked pending the required
principal/security credential-model decision.

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

The successor evidence now includes 24 runner tests, 21 context-authorization
tests, the 277-test static authority gate, physical CHECK/FK rejection and
lifecycle proof, target-backed data-role preparation, readiness, and local
smoke journeys. The closure adds fail-closed CHECK-enforcement inventory and
negative readiness coverage, but does not claim a physical local
runtime/migration/verifier separation where the inspected current grant is
broader than the required runtime boundary. The original first enforcement-test run failed only because
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

The fresh-schema consumer-contract harness was invoked locally and correctly
refused before mutation because this established successor contains tables. Its
approved clean route is the pinned CI MySQL service, not another local target.
No existing local evidence closes every centrally classified Live journey while
D-008 remains open. These limits are not waived; G3 is not requested.

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
| final `pnpm db:schema:congruency` / `pnpm db:verify:ci` | PASS | No normalized differences; 88/88 contract checks; complete checksummed ledger/attempt evidence. Current closure rerun uses format-2 digest `95f6…4cea` and reports all 23 physical CHECKs enforced. |
| `S2_DB_TESTS=1 pnpm test:authority -- server/__tests__/integration.developer-engine-s2-supersession.test.ts` | PASS | 13/13 real-MySQL checks with named MySQL CHECK/FK/unique/restrictive-delete assertions; test uses the exact owned target and cleanup. |
| `pnpm test:authority -- server/__tests__/integration.billing-billable-account.test.ts` | PASS | 3/3, including the named `billable_accounts_exactly_one_owner` CHECK violation against an existing canonical agency account. |
| `pnpm db:reference:prepare` / `verify`; `pnpm db:foundation:prepare` / `verify` | PASS | Canonical geography and Launch Access foundation admitted through owned-target adapters. |
| `pnpm db:scenario:prepare` / `verify`; `pnpm db:verify:distribution`; `pnpm db:readiness -- --purpose=search-to-lead` | PASS | Search-to-Lead scenario and required data roles ready; readiness application-ready. |
| `pnpm test:authority -- server/__tests__/integration.launch-readiness-walkthrough.test.ts` | PASS | 11/11 local agency journey tests. |
| `pnpm test:browser:authority -- e2e/consumer-activity/persistence.spec.ts --project='Desktop Chrome' --retries=0` | PASS | 1/1 scoped browser persistence journey on the exact target. |
| `pnpm db:authority:check`; focused runner/context tests | PASS | Static authority gate 277/277; runner test 24/24; context-authorization test 21/21. |
| `pnpm check` / `pnpm build` | PASS | TypeScript check and Vite production build passed. |
| `pnpm lint:check` | PASS, exit 0 | Six `no-useless-catch` errors were removed through the bounded `topicsService.ts` correction; the pre-existing warning baseline remains warnings. |

## Recovery position and Stage 2 preparation packet

D-009 has been consumed successfully. The preserved target remains operationally
quarantined with its `running` attempt and unknown cause; the successor did not
repair, resume, copy, reset, dispose, or alter it. A future repair proposal for
the preserved target would still require a separately reviewed object-by-object
plan. No third target or automatic retry is authorized.

Stage 1 is not complete and requests no gate approval. The consolidated review
must disposition the local fresh-chain evidence alongside these remaining
items:

1. G1 migration/engine admission: D-002/D-003, a fresh MySQL 8.4 chain and
   provider capability evidence, the CI fresh consumer-contract artifact, and
   any required historical-head evidence. The local 8.0 result is not engine
   admission.
2. G2 protected credential/grant separation, including a reviewed identity
   model that proves runtime cannot issue DDL, GRANT, or migration-ledger
   writes. The current local `ALL PRIVILEGES` observation blocks that portion.
3. D-008 Live/Pilot/Hidden product disposition, the full required journey set,
   hosted CI, and post-merge validation on the approved merged SHA for G3.

Stage 2 remains unrequested and unauthorized. Its future preparation packet
still requires explicit Azure resource/budget/target authority and approved
source-data access, mapping, reconciliation ownership, and TiDB scope. No
future target fingerprint, approval metadata, provider compatibility, or
source-data result is invented here.
