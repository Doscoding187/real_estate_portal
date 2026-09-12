# Property Listify Database Transition and Launch Master Plan

**Status:** WP0 correction required; G0 is not approved; WP1 is blocked
**Plan version:** 1.1 (correction of 83e9a57f)
**Prepared:** 2026-09-12
**Owner:** Principal architecture / database release authority

This is the complete execution specification for the database transition and
launch programme. It preserves the senior-plan decisions and supplies the
packet, evidence, gate, recovery and reporting controls needed for another
agent to execute them. It does not authorize a protected database mutation.
WP1 and every later work package remain blocked until the corrected WP0 record
is reviewed, G0 is approved, and a named packet is assigned.

Protected release, import, restore, credential, infrastructure, and cutover
operations require the existing Database Authority approval and acknowledgement
paths. No database or infrastructure state was changed for this correction.

## Governing authorities and decisions

The authority chain is repository-native and remains authoritative over this
plan:

| Concern | Authority |
| --- | --- |
| Repository agent boundaries | [`AGENTS.md`](../../../AGENTS.md) |
| Database entry and target authority | [`00-database-authority-agent-entry.md`](../../database-authority/00-database-authority-agent-entry.md) |
| Database policy and compatibility exceptions | [`database-authority-policy.md`](../database-authority-policy.md), [`database-compatibility-exceptions.md`](../database-compatibility-exceptions.md) |
| Change admission and migration operations | [`database-change-protocol.md`](../../database-authority/database-change-protocol.md) |
| Desired model | [`drizzle/schema/`](../../../drizzle/schema/) and [`canonical-model-inventory.json`](../../../drizzle/schema/canonical-model-inventory.json) |
| Active migration membership and lineage | [`server/migrations/manifest.json`](../../../server/migrations/manifest.json), [`migrationManifest.ts`](../../../server/migrations/migrationManifest.ts) |
| Migration application and attempts | [`runSqlMigrations.ts`](../../../server/migrations/runSqlMigrations.ts), `sql_migration_history`, `sql_migration_attempts` |
| Target, connection and readiness authority | `server/_core/databaseAuthority/` |
| TiDB convergence evidence | [`tidb-convergence-audit-2026-09-07.md`](../../database-authority/tidb-convergence-audit-2026-09-07.md) and [`tidb-convergence-review-design.md`](../../database-authority/tidb-convergence-review-design.md) |
| Claim and provenance method | [`06-evidence-sequence-and-provenance-contract.md`](../launch-readiness-and-product-convergence/06-evidence-sequence-and-provenance-contract.md) |
| Launch disposition | [`03-launch-register.md`](../launch-readiness-and-product-convergence/03-launch-register.md), the central launch register |

The central launch register is the sole launch-disposition authority. This
plan may point to it and produce evidence for it; it may not create a parallel
launch finding or silently change a launch decision.

The following decisions are retained from the senior plan:

1. Preserve the canonical Drizzle schema, active migration manifest,
   foreign-key lifecycle semantics, CHECK constraints, migration ledger and
   fail-closed Database Authority controls.
2. Use Azure Database for MySQL Flexible Server as the launch provider only
   after exact engine and constraint-enforcement evidence. Development, CI and
   ordinary staging remain local or isolated CI.
3. Reserve the Azure `propertylistify_database` database as the protected
   production candidate. Use temporary independently restored Azure targets
   for provider-sensitive validation, capacity testing and recovery drills;
   do not create a permanent Azure staging server before launch.
4. Prefer MySQL 8.4 after fresh-chain compatibility proof. MySQL 8.0 requires
   an explicit dated upgrade decision because its Azure standard-support window
   ends in 2026.
5. B1ms is a conditional controlled-launch option. Connectivity evidence alone
   cannot accept it; sustained capacity, CPU-credit, memory, connection,
   latency, storage and recovery thresholds must pass.
6. Runtime, migration, read-only verification, worker and administrative
   credentials are separate identities. Runtime credentials never receive DDL,
   grant or migration-ledger write authority.
7. TiDB is inventoried and classified before transfer. It becomes read-only
   before final capture. Once Azure accepts authoritative writes, TiDB is not a
   switch-back writer.

## Non-negotiable control bindings

### Reviewed-plan-digest binding

Every WP1–WP10 packet must record and bind these identities:

| Identity | Required value |
| --- | --- |
| Source | Exact application commit SHA and tree SHA |
| Migration authority | Accepted old head, expected new head, manifest digest and model-inventory digest |
| Plan | Exact reviewed-plan digest and packet revision |
| Target | Sanitized target class, exact database name, host/port classification and target fingerprint |
| Operation | Named Database Authority operation, credential class and acknowledgement, where required |
| Evidence | Immutable artifact references, command output, timestamps and limitations |

The reviewed-plan digest is calculated from the approved plan and packet inputs.
An implementation agent must stop if the plan text, packet, source SHA,
manifest/model digest, target fingerprint or operation changes after review.
The relevant plan or release command must receive the exact
`--plan-digest=<reviewed-plan-digest>` value and re-resolve the target before a
side effect. Protected apply also requires the exact target acknowledgement.
An old digest or acknowledgement never authorizes a new operation. A changed
digest requires principal review and a new gate decision.

### CHECK and foreign-key enforcement

The fixed 22 canonical CHECK definitions and their dependencies are an
admission requirement. The audit identifies nine CHECKs with FK dependencies
and 12 distinct affected keys. The five affected table families are
`catalogue_publishers`, `development_supersessions`, `land_claims`,
`land_conflict_cases` and `location_provider_mappings`.

Provider admission must prove all of the following on the selected engine and
on a temporary independently restored target:

- the CHECK capability is explicitly enabled and remains enabled;
- metadata contains the exact canonical 22 predicates and names;
- an isolated invalid-write test rejects each predicate, including a valid
  parent where an FK is involved;
- valid writes and required parent deletion/update actions preserve the
  canonical lifecycle semantics;
- fresh creation and historical-head establishment both succeed; and
- normalized physical metadata is congruent with the desired Drizzle model.

Metadata presence alone is insufficient. `INFORMATION_SCHEMA` action names do
not prove whether a restrictive FK action was explicitly authored, and the
TiDB provider has no reliable `ENFORCED` metadata field. A provider failure,
ambiguous action provenance or missing negative-write proof blocks G1/G4 and
must be reported as `Blocked`, with no migration replay, ledger edit, manual
DDL, or constraint-disabling workaround.

### Credential and grant boundaries

The credential packet must define separate identities and least-privilege
grants for:

| Identity | Permitted purpose | Explicit boundary |
| --- | --- | --- |
| Runtime | Application reads and domain DML through the canonical runtime path | No DDL, `GRANT`, account administration, migration-ledger writes, backup administration or target switching |
| Migration | Named migration plan/apply under Database Authority | Never exposed to application runtime, workers or ordinary operators |
| Read-only verifier | Metadata, congruency, backup-restore and readiness evidence | No INSERT/UPDATE/DELETE/DDL, grant or ledger mutation |
| Worker | Declared application job DML and queue/lease operations | No DDL, grants, migration control tables or credential administration |
| Administrative / break-glass | Explicitly approved maintenance or recovery operation | Named actor, exact operation, time bound, audit evidence and revocation; never a default runtime secret |

The packet must include sanitized grant fingerprints and prove that runtime
cannot write `sql_migration_history` or `sql_migration_attempts`. Credentials,
complete URLs, passwords and tokens never appear in plans, logs, screenshots,
reports or commits. Exact target identity is proved by Database Authority, not
by a copied URL or display label.

### Capacity thresholds

These are the governing numerical acceptance thresholds. They are acceptance
criteria, not observed results; measurements remain `Pending` until WP6.
Any change requires principal review and a new plan digest.

| Measure | Required threshold for a B1ms controlled launch |
| --- | --- |
| Load shape | 2x forecast launch concurrency sustained for 60 minutes, followed by 3x forecast for 10 minutes |
| CPU | Average below 70% over the sustained window; no more than 5 consecutive minutes above 85% |
| CPU credits | No depletion and at least 20% of the starting credit balance remaining at test end |
| Memory | Average used below 75%; at least 25% available at every 5-minute sample |
| Connections | Peak below 70% of the provider limit; zero pool-exhaustion events or connection refusals |
| Database/API latency | Read-path p95 ≤ 750 ms and p99 ≤ 1.5 s; write-path p95 ≤ 1 s and p99 ≤ 2 s |
| Errors | Application/database error rate below 1%; zero integrity, authorization or data-loss errors |
| Storage | Used storage below 70% and at least 30% free at test end; no I/O throttling or disk-full warning |
| Recovery during test | Restart or failover readiness within the accepted RTO; no unbounded queue or lease accumulation |

The load model, forecast, query mix and sampling source must be included in
the packet. A failed threshold blocks G5. Capacity may be accepted only on the
measured target and exact release SHA; it cannot be inferred from connectivity,
idle metrics or a different tier.

### RPO, RTO and backup policy

The working launch objectives, pending measured acceptance by Edward and
operations, are:

| Failure scope | RPO target | RTO target |
| --- | ---: | ---: |
| Database/service or zonal failure | ≤ 5 minutes | ≤ 60 minutes |
| Regional failure and provider-region recovery | ≤ 15 minutes | ≤ 4 hours |

These objectives remain `Pending` until the owner decision D-007 is recorded in
the launch register and the corresponding drill is observed. A drill that
misses an objective blocks G5/G6; it does not justify silently relaxing the
target.

The required backup policy is:

- provider-managed automated backup and point-in-time recovery with at least
  35 days of retention, subject to exact provider capability proof;
- an encrypted logical backup at least daily while authoritative writes are
  live, plus one immediately before each migration, final capture and cutover;
- a separately retained weekly full export and a monthly restore drill to a
  temporary isolated target;
- checksum, row-count, schema-congruency and application-readiness evidence
  after each restore drill; and
- retention, access, encryption-key ownership, deletion and cross-region
  placement recorded in the backup packet before production open.

No backup is considered usable until a restore is observed. Backup files and
logs must not contain credentials or personal data beyond the minimum approved
test evidence.

### Cutover and recovery procedure

The cutover packet must use this sequence and record an abort point after each
stage:

1. Confirm G6 approval, exact source/tree, reviewed-plan digest, target
   fingerprint, backup freshness and operator/approver identities.
2. Announce the bounded maintenance window and stop new TiDB writes through the
   governed application/data-owner control. Do not edit migration history.
3. Capture TiDB at the recorded position, produce the approved export, and
   reconcile counts, checksums, identities, foreign keys, CHECK predicates and
   classified exclusions on the temporary restore target.
4. Run final Azure readiness, backup and credential-boundary checks. Keep the
   Azure candidate non-authoritative until the cutover decision is recorded.
5. Apply the exact approved release operation through Database Authority, then
   enable authoritative Azure writes and route the application to that exact
   target.
6. Run layered service, schema, congruency, reference-data, scenario,
   application, API and browser smoke checks. Record the observed result and
   source/target identities before opening launch traffic.
7. Keep TiDB read-only as preserved recovery evidence. Once Azure accepts
   authoritative writes, do not switch back to TiDB. Recover forward from
   Azure backups or a reviewed temporary target if a post-cutover defect occurs.

Before Azure accepts authoritative writes, an aborted cutover may return to
the last verified TiDB position only when the packet proves no authoritative
Azure writes were accepted. After Azure writes exist, recovery is forward-only:
stop or narrow affected traffic, preserve attempts and logs, restore or repair
through a newly approved bounded packet, reconcile data, and reopen only after
the same layered checks pass. Never use an unreviewed rollback import, generic
down migration, ledger edit or old acknowledgement.

## Release-source provenance

The correction worktree is based on the verified remote integration base:

| Item | Recorded value | Status/boundary |
| --- | --- | --- |
| Remote base | `origin/main` | Observed at `c2158b5da27a4fde9e4329e276024e9ade570e4a` |
| Correction parent | `83e9a57f^` | Observed at the same `c2158b5d...` base |
| Base relationship | `git merge-base 83e9a57f origin/main` | Observed equal to `c2158b5d...` |
| Local checkout observed before WP0 | `main` at `ad0c4247439a0bd27ebca17d4fba88dd023760f2` | Historical provenance from the prior WP0 record; not the correction parent |
| Candidate branch inspected | `feat/database-architecture-takeover` at `b05e6569c02be4a47de8583bc9ed6197e528d035` | Recorded prior evidence; admission remains open |
| Candidate migration head | `0090_retire_disconnected_boost_campaigns.sql` | Provisional; not admitted |
| Remote-base migration head | `0065_auth_verification_token_cleanup.sql` | Recorded prior evidence; current manifest must be re-proven in WP1 |
| Correction scope | One documentation file | Verified by the preceding commit diff; final correction scope is recorded after commit |

The candidate retains the existing `0000–0065` migration prefix and adds
`0066–0090`. The intended launch head is provisionally `0090`, subject to the
migration-admission review. No migration is excluded, renumbered, rewritten or
squashed by this record.

The database operating playbook and protected migration-credential work are
already present in the remote-base ancestry. Similarly named branches must not
be merged mechanically. The candidate must be reviewed as one application,
schema, authority and documentation release unit.

The prior record reported an uncommitted Azure target-classification change in
another worktree. This correction did not inspect, modify, move or delete that
worktree. Its exact status, target class and database role remain `Pending` for
the target-admission packet.

## Migration-admission register

The following entries require evidence before the candidate head can become the
release authority:

| Range | Admission evidence required |
| --- | --- |
| `0066–0071` | Deterministic activity cleanup, identities, uniqueness, indexes, ordering and concurrency proof |
| `0072–0075` | No remaining consumers of retired prospect families; recent-view integrity and recency proof |
| `0076–0078` | Relational lead delivery, idempotency, recipient ownership, retry/fencing and retirement reconciliation |
| `0079–0082` | Explore/service idempotency, retention and Pilot/Hidden access containment |
| `0083–0087` | Provider-event identity, retries, leases, crash recovery and billable-account ownership proof |
| `0088–0090` | No active consumers or required business records depend on retired billing, analytics or boost families |

Affected CHECK/FK overlaps, including billable-account, Land-claim,
geography-mapping and audit relationships, require exact MySQL/Azure execution
and deletion-semantics evidence. Local success alone is insufficient provider
admission.

## Decision register

| ID | Decision | Owner | Required evidence | Status |
| --- | --- | --- | --- | --- |
| D-001 | Select one integrated application/schema/authority release SHA | Principal architect | Clean integration, CI and local acceptance on merged SHA | Open |
| D-002 | Admit `0066–0090` and provisional head `0090` | Database authority | Per-range migration and consumer evidence; checksums/lineage intact | Open |
| D-003 | Select MySQL 8.4 or retain 8.0 temporarily | Principal architect | Fresh-chain engine matrix and Azure capability proof | Open |
| D-004 | Register `propertylistify_database` as production candidate | Release authority | Exact resource, host, port, database, fingerprint and operation policy | Open |
| D-005 | Decide whether B1ms passes controlled-launch capacity | Edward + principal architect | Sustained representative load, recovery and availability acceptance | Open |
| D-006 | Classify and transfer TiDB data | Edward + data owner | Sanitized inventory, mapping, reconciliation and archive decision | Open |
| D-007 | Accept recovery objectives and regional-failure posture | Edward + operations | Restore/PITR/logical-backup drill with measured RPO/RTO | Open |
| D-008 | Define Live/Pilot/Hidden launch scope | Edward + product authority | Updated central launch register and journey evidence | Open |

## WP0 evidence record and current authorization

WP0 is correction-only. Its purpose is to preserve the senior plan in the
repository and create a reviewable evidence record. It does not establish a
target, create credentials, initialize a database, run migrations, import
TiDB data or authorize WP1.

### Recorded commands and results

| Command | Result | Evidence boundary |
| --- | --- | --- |
| `git worktree list` | Target path is registered at `/home/edwardspc/Desktop/Dev/worktrees/property-listify-database-transition-master-plan` on `docs/database-transition-master-plan`; the main worktree is separate | Registration and branch isolation observed; this does not prove remote PR state |
| `git status --short --branch` in target | `## docs/database-transition-master-plan...origin/main [ahead 1]` with no status entries | Clean tracked/untracked state observed before correction |
| `git rev-parse origin/main`, `git rev-parse HEAD^`, `git merge-base HEAD origin/main` | All resolve to `c2158b5da27a4fde9e4329e276024e9ade570e4a` before the correction commit | Base identity observed in this worktree |
| `git show --stat 83e9a57f` | One changed file: `master-plan.md`, 131 insertions | Prior commit scope observed; correction scope must be checked again at final HEAD |
| `git show --check 83e9a57f` | Failed: trailing whitespace on lines 3, 4 and 5, plus a new blank line at EOF | Corrected document must pass tracked-commit validation |
| `git diff --check 83e9a57f^ 83e9a57f -- master-plan.md` | Also reports the same defects when the committed paths are named explicitly | The earlier untracked-file check did not validate the document |
| `pnpm db:authority:status` | Blocked before execution: `tsx: not found`; worktree has no `node_modules` | No database initialization or target connection occurred; authority status remains unverified here |

### Outstanding ownership and validation record

The following remain explicitly pending and must not be reported as facts:

- exact Azure resource, host, port, database fingerprint, target class and
  protected-operation acknowledgement (D-004);
- MySQL 8.4 versus temporary MySQL 8.0 selection, Azure engine capability and
  CHECK/FK enforcement (D-003);
- candidate `0066–0090` admission, physical congruency and consumer proof
  (D-002);
- B1ms load result against every numerical threshold (D-005);
- backup retention/placement, measured primary and regional RPO/RTO, and
  recovery drill results (D-007);
- TiDB inventory, classification, capture position, mapping, reconciliation,
  owner and archive decision (D-006); and
- Live/Pilot/Hidden launch scope and central-register journey evidence (D-008).

The missing dependency cache is a validation limitation, not an architecture
decision. The `pnpm db:authority:status` result must be rerun in an environment
with the repository dependencies available before database work begins. No
remote, protected or shared target was accessed by this correction.

### G0 disposition

| Field | Current record |
| --- | --- |
| Evidence | This corrected plan, WP0 provenance table, authority links, exact base/branch identity and final tracked-file checks |
| Approver | Principal architect, after reviewing the corrected commit and coverage checklist |
| Blockers | G0 review not yet granted; authority status command remains dependency-blocked; all pending decisions above |
| Recovery position | Remain in WP0 correction; preserve this branch and evidence; do not assign or start WP1 |
| Current decision | **G0 not approved. WP1 is not authorized.** |

## Gate protocol

Every gate packet must use the authority evidence record fields: claim,
mechanism, sequence, evidence, boundary, owner, status and next gate. A gate
is complete only when its evidence is tied to the exact reviewed-plan digest,
source/tree, target fingerprint and relevant manifest/model digest.

| Gate | Required evidence | Approver | Blockers | Recovery position |
| --- | --- | --- | --- | --- |
| G0 scope/provenance | Corrected WP0 record; exact branch/base; authority links; WP0 provenance commands; digest candidate; coverage checklist; no mutation evidence | Principal architect | Incomplete specification, unverified provenance, validation defect, mixed worktree or missing owner | Return to WP0 correction; WP1 remains unassigned |
| G1 migration/engine admission | Per-range `0066–0090` lineage/checksum/consumer packet; fresh-chain MySQL matrix; provider CHECK/FK proof; 22-check negative writes; model/physical congruency | Principal architect + database authority | Any lineage ambiguity, unsupported SQL, failed CHECK/FK proof, failed fresh creation or unresolved failed attempt | Stop; preserve logs/attempts; use only a reviewed recovery packet; no replay or ledger edit |
| G2 authority/security controls | Target admission, exact fingerprint, role grants, credential separation, operation policy, secret-handling and break-glass records | Principal architect + security/release authority | Unknown/shared target, runtime DDL/grant/ledger access, secret exposure or missing acknowledgement | Do not connect or provision; revoke/quarantine unaccepted credentials and return to G2 packet |
| G3 integrated release acceptance | One integrated release SHA; CI and supported checks; fresh local schema/readiness; consumer, API and application acceptance; launch-register linkage | Principal architect | Source drift, failed checks, stale schema consumer, readiness failure or unresolved launch finding | Keep candidate unpromoted; repair in a new bounded packet and invalidate the old digest |
| G4 Azure establishment | Approved temporary/production-candidate resource classification; exact engine/version; empty/fresh-chain and restored-head proof; network, backup and readiness evidence | Release authority + database authority | Wrong target, engine mismatch, permission failure, CHECK enforcement gap or permanent staging drift | Dispose only exact owned temporary target through its acknowledgement; preserve evidence; no production apply |
| G5 recovery/capacity proof | Backup policy evidence; observed restore/PITR; measured RPO/RTO; B1ms thresholds; representative load; alerting and runbook rehearsal | Edward + principal architect + operations | Any threshold miss, unobserved restore, RPO/RTO miss, data loss, throttling or incomplete telemetry | B1ms not accepted; resize/rework packet or hold launch; retain last verified target |
| G6 cutover approval | Final capture/export reconciliation; TiDB read-only proof; fresh backup; exact change packet; abort points; operator/approver record; smoke plan | Edward + release authority | Unreconciled data, stale backup, writes still open, changed digest, missing recovery position or pending launch decision | Abort before Azure writes; retain TiDB authority. After Azure writes, forward recovery only |
| G7 production open | Azure authoritative-write proof; layered readiness; application/API/browser smoke; launch-register decision and exact deployed SHA | Edward + product/release authority | Readiness or smoke failure, target mismatch, scope mismatch or unresolved L0/L1 issue | Keep traffic closed or narrow it; recover forward under approved packet |
| G8 stabilization | 72-hour monitored evidence, error/latency/capacity/backup review, incident disposition and no unexplained integrity drift | Principal architect + operations | Alert breach, integrity mismatch, recovery incident or missing telemetry | Re-enter incident recovery; do not declare stable or retire TiDB |
| G9 TiDB retirement | Accepted Azure history and backups; archive/export retention; TiDB writer revocation; dependency inventory; final launch-register and evidence closure | Edward + data owner + release authority | Unresolved retention/ownership, active consumer, missing restore evidence or recovery dependency | Retain TiDB read-only and defer retirement; no deletion |

## Work packages WP0–WP10

The work packages are serialized. A later package may prepare read-only
evidence while its predecessor is under review only when the assigned packet
explicitly permits that preparation; it may not perform the predecessor's
approval or side effect.

### WP0 — Correct and admit the governing plan

**Prerequisites:** Task-owned clean worktree, recorded parent/base, senior-plan
decisions available, no protected target operation.

**Execution:** Correct this record; preserve the decision and migration
registers; link canonical authorities and the central launch register; record
provenance, ownership, validation limits, controls, gates and recovery
positions; repair tracked-file whitespace; commit documentation only.

**Acceptance:** This plan is committed on the task-owned branch; G0 has an
actionable evidence/approver/blocker/recovery record; all WP0 fields are
present; current status explicitly says G0 is not approved and WP1 is blocked;
`git show --check <corrected-commit>` passes; final status is clean.

**Failure handling:** Stop at documentation. Do not install dependencies,
initialize a database, touch another worktree, run a migration, alter
credentials or contact a protected target. Report the failed check and remain
in WP0.

**Report:** Corrected commit SHA/tree, changed-file list, base/parent, command
results, limitations, coverage checklist and G0 disposition.

### WP1 — Migration lineage and engine admission

**Prerequisites:** G0 approved by the principal architect and a named WP1
packet with a new reviewed-plan digest; dependency-complete authority status.

**Execution:** Validate manifest membership, contiguous identity, parent and
checksum lineage; review `0066–0090` by range; run the structural TiDB audit;
exercise fresh and historical chains on disposable MySQL/TiDB targets; prove
the 22 CHECKs, FK actions, failed-attempt recovery position and consumer
compatibility. Prefer MySQL 8.4 after proof; record any dated 8.0 decision.

**Acceptance:** One admitted expected head, intact checksums, no unresolved
failed/running attempt, exact engine capability proof, fresh creation,
historical establishment, physical congruency and per-range evidence all pass.

**Failure handling:** Stop at the first unexpected result. Preserve sanitized
logs and durable attempt evidence; do not retry ambiguous DDL, edit ledgers,
rewrite applied SQL, execute archived SQL or weaken constraints.

**Report:** Old/new heads, manifest/model/plan digests, target fingerprints,
per-range findings, CHECK/FK results, attempt state, engine matrix,
limitations and G1 recommendation.

### WP2 — Target, credential and security authority

**Prerequisites:** G1 approval; exact target-admission packet; approved owner
and operation; no unknown or shared remote target.

**Execution:** Classify the Azure candidate and temporary targets; resolve
exact target identity through Database Authority; create or reference separate
credential identities; verify grants, rotation, secret storage, network
boundaries, audit logs and break-glass expiry.

**Acceptance:** Exact target fingerprint and database role are recorded; each
credential passes its boundary; runtime lacks DDL, grant and ledger writes;
read-only verification is demonstrably read-only; protected acknowledgement
and approval references are present.

**Failure handling:** Fail closed before connection or provisioning. Do not
guess a target from a hostname, reuse a runtime secret, broaden grants or use
the old plan digest. Quarantine/revoke unaccepted credentials through the
approved owner and report the exact blocker.

**Report:** Sanitized target class/fingerprint, grant fingerprints, credential
classes, operation/acknowledgement references, secret-exposure check and G2
recommendation.

### WP3 — Integrated release and application acceptance

**Prerequisites:** G1 and G2 approval; one candidate release SHA; central launch
register linkage; disposable local target available through authority.

**Execution:** Test the application, canonical schema, migration runner,
readiness layers, consumers, API and acceptance scenario as one release unit.
Run the supported repository checks and record their exact source identity.

**Acceptance:** D-001 selects one SHA; checks and build pass; fresh local
schema is congruent; readiness and Search-to-Lead/application contracts pass;
no launch-register blocker is unowned; candidate tree equals the reviewed tree.

**Failure handling:** Keep the candidate unpromoted. Repair only in a new
bounded packet; invalidate the old plan digest when source or model changes.
Do not hide a schema failure with fallback queries or stale fixtures.

**Report:** Candidate SHA/tree, check identities/results, schema/readiness
evidence, launch-register references, known limitations and G3 recommendation.

### WP4 — Azure establishment and provider validation

**Prerequisites:** G3 approval; D-003/D-004 packet assignment; G2 target and
credential evidence; temporary-target permission.

**Execution:** Establish only the exact approved Azure target class. Validate
engine/version, database identity, network path, backup capability, fresh-chain
creation, restored candidate chain, CHECK/FK enforcement, congruency and
readiness. Keep the protected production candidate non-authoritative.

**Acceptance:** G4 packet proves the selected engine and target, all provider
controls, fresh and restored chains, exact target ownership and no permanent
staging drift. No production writes are implied by a successful temporary
validation.

**Failure handling:** Preserve the target and sanitized evidence; stop before
the next stage. Do not alter provider settings as a workaround, replay
migrations or promote a temporary target.

**Report:** Provider/version/capability evidence, target fingerprint, schema
and readiness results, backup capability, side effects, limitations and G4
recommendation.

### WP5 — Backup, restore and recovery proof

**Prerequisites:** G4 approval; backup policy and retention owner; approved
temporary restore target; exact release and plan digests.

**Execution:** Exercise provider PITR, encrypted logical backup, weekly-export
restore and the cutover pre-backup. Measure restore completeness, integrity,
RPO, RTO, operator sequence, logging and abort/recovery behavior.

**Acceptance:** Every restore is observed and passes schema, checksum, count,
readiness and scenario checks. Primary RPO ≤5 minutes/RTO ≤60 minutes and
regional RPO ≤15 minutes/RTO ≤4 hours are measured or explicitly blocked;
backup retention and access controls are accepted by D-007 owners.

**Failure handling:** Do not claim backup readiness from a successful backup
creation. Preserve failed restore artifacts and remain at G5; no cutover or
capacity acceptance follows a missed objective.

**Report:** Backup type/retention, restore target fingerprint, measured RPO/RTO,
checks, timestamps, data-integrity result, operator/approver and limitations.

### WP6 — Capacity, observability and B1ms decision

**Prerequisites:** G4 and WP5 evidence; D-005 assignment; representative load
model; telemetry and alerting on the exact target.

**Execution:** Run the specified 2x/3x load profile and measure every capacity
threshold, including CPU credits, memory, connections, latency, errors,
storage, queue behavior and recovery during load.

**Acceptance:** All numerical thresholds pass for the exact SHA and target;
alerts fire at the planned boundaries; no integrity or authorization errors;
B1ms is accepted only by D-005 owners. A different tier requires a new packet.

**Failure handling:** Block G5/G6, preserve telemetry, and either resize or
prepare a new capacity plan. Never infer acceptance from idle connectivity or
discard an outlier without an owner decision.

**Report:** Workload, query mix, source/target identity, raw metric artifact
references, threshold table, incidents, recommendation and limitations.

### WP7 — TiDB inventory, transfer rehearsal and reconciliation

**Prerequisites:** G1–G5 evidence; D-006 owner assignment; approved TiDB
read-only/inventory operation and temporary restore target.

**Execution:** Inventory and classify TiDB data, owners, exclusions, CHECK/FK
state, capture position and dependencies. Rehearse export/import on the
temporary target; reconcile canonical identities, counts, checksums, foreign
keys, classifications and application scenarios. Define archive and retention.

**Acceptance:** D-006 accepts the mapping, exclusions, reconciliation and
archive decision; TiDB can be placed read-only; no unsupported or unknown data
is silently imported; final capture and cutover packet is reproducible.

**Failure handling:** Stop transfer, preserve source and temporary evidence,
and retain TiDB as authoritative until G6. No destructive cleanup or production
import is allowed.

**Report:** Sanitized inventory, owner decisions, capture position, mapping,
reconciliation, excluded-data treatment, target fingerprints and G6 inputs.

### WP8 — Final capture and cutover approval

**Prerequisites:** G5 pass; WP7 reconciliation; D-008 launch scope; fresh
backup; approved maintenance window; exact cutover/recovery packet.

**Execution:** Run the seven-stage cutover procedure above, stop TiDB writes,
capture and reconcile, keep Azure non-authoritative through preflight, obtain
G6 approval, then make Azure authoritative and run layered smoke checks.

**Acceptance:** G6 approvers sign the exact digest; final capture is complete;
Azure accepts authoritative writes only after approval; TiDB is read-only;
layered readiness and smoke evidence support G7.

**Failure handling:** Abort before Azure writes when any preflight fails. After
Azure writes, use forward recovery only. Preserve all attempts, backups and
logs; do not switch back to TiDB as a writer.

**Report:** Window, operators, approvals, capture/export hashes, reconciliation,
target/source identities, write-authority transition, smoke evidence and
recovery position.

### WP9 — Production open and stabilization

**Prerequisites:** G6 approval; successful cutover; G7 launch-register decision;
exact deployed source/tree and target fingerprint.

**Execution:** Open the approved Live/Pilot/Hidden scope, monitor layered
readiness, errors, latency, capacity, backups, integrity and user journeys for
72 hours, and reconcile incidents against the launch register.

**Acceptance:** G7 production-open and G8 stabilization evidence are complete;
no unexplained integrity drift or threshold breach remains; incidents have
owners and recovery decisions; backups and operational alerts remain healthy.

**Failure handling:** Narrow or close traffic, preserve Azure authoritative
state, and execute the approved forward-recovery packet. Do not promote a
different SHA or switch writers without a new gate decision.

**Report:** Deployed SHA/tree, target fingerprint, scope, 72-hour telemetry,
incidents, smoke results, launch-register status and remaining limitations.

### WP10 — TiDB retirement and programme closure

**Prerequisites:** G8 approval; accepted Azure backups and recovery evidence;
data-owner/archive decision; no active TiDB consumer or writer dependency.

**Execution:** Revoke TiDB writer access, preserve the approved read-only
archive/export for its retention period, verify dependency removal, close
launch-register records and record final source, target, backup and recovery
identities. Dispose of temporary targets only through exact Database Authority
acknowledgements.

**Acceptance:** G9 approvers confirm retention, ownership, recovery usability,
writer revocation, no active dependency, clean authority evidence and closure
of D-001–D-008 or explicit residual owners/expiry conditions.

**Failure handling:** Retain TiDB read-only and defer retirement. Do not delete
data, branches, backups or targets while ownership, recovery or retention is
unresolved.

**Report:** Final target/source identities, revocations, archive/retention
references, dependency search, disposal acknowledgements, open risks and final
launch-register disposition.

## Change-control boundary

Implementation agents may, within an assigned packet, perform read-only
inspection; write documentation and evidence records; run approved static,
unit, contract and disposable-target validation; prepare migration plans; and
prepare reversible, reviewable code changes. They may not treat a plan as an
approval, select a provider workaround, change acceptance thresholds, broaden
credential grants, create a protected target, execute protected migration or
import, alter backup retention, switch authoritative writers, delete evidence,
edit migration history or retire TiDB.

Principal review is required for the integrated release SHA, migration-head
admission, engine/version choice, CHECK/FK representation, target class and
identity, credential/grant model, threshold or RPO/RTO changes, provider
workarounds, compatibility exceptions, protected apply/restore/import,
cutover, production open, regional-failure posture and TiDB retirement.

The current task has one permitted action: WP0 correction in the task-owned
documentation worktree. WP1 is not authorized before G0 approval and named
packet assignment. The handoff below is a blocker statement, not permission.

## Gate sequence and handoff

The governing sequence is:

`G0 scope/provenance → G1 migration/engine admission → G2 authority/security
controls → G3 integrated release acceptance → G4 Azure establishment → G5
recovery/capacity proof → G6 cutover approval → G7 production open → G8
stabilization → G9 TiDB retirement`

WP0 establishes the corrected record only. No Azure migration or TiDB import is
authorized by completing WP0. The next possible packet is WP1 migration-lineage
and engine admission, but it may be assigned only after the principal architect
approves G0 on the corrected commit. Every packet must report evidence,
approver, blockers and recovery position for its gate.

## WP0 acceptance and final handoff

WP0 is accepted only when all of the following are true:

- this complete specification is committed on the task-owned branch based on
  the verified remote `main` SHA;
- the source, candidate, migration-head and branch relationship are recorded;
- WP0–WP10 prerequisites, acceptance criteria, failure handling and reporting
  requirements are present;
- reviewed-plan-digest binding, CHECK enforcement, grants, thresholds, RPO/RTO,
  backup policy and cutover/recovery controls are explicit;
- every gate names evidence, approver, blockers and recovery position;
- pending facts and ownership decisions are marked `Pending`;
- no migration, schema, authority code, credential, Azure or TiDB state was
  changed; and
- tracked-file checks pass and final Git status is clean after commit.

The corrected commit is a reviewable WP0 deliverable. It does not claim G0
approval, assign WP1, or certify any database, provider, backup, capacity,
recovery, cutover or launch state.
