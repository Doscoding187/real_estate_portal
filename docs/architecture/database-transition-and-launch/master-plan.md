# Property Listify Database Transition and Launch Master Plan

**Status:** WP0 architect-approved; Stage 1 local implementation assigned under amendment A-01
**Plan version:** 1.3 (A-01: three-stage execution and consolidated review)
**Prepared:** 2026-09-12
**Owner:** Principal architecture / database release authority

This is the complete execution specification for the database transition and
launch programme. It preserves the senior-plan decisions and supplies the
packet, evidence, gate, recovery and reporting controls needed for another
agent to execute them. It does not authorize a protected database mutation.
WP0 at `b673eb42e47b831be19e1998422be11d3303b2d9` received principal-architect
approval in the project conversation. Edward subsequently accepted the proposed
three-stage execution model with “please continue with the recommandations”.
Amendment A-01 below records that direction and the bounded Stage 1 assignment.
It does not claim acceptance of pending launch scope, budget or provider facts.

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

### Document and runner digest binding

The governing document and an executable release plan have separate identities.
Every packet records the master-plan version, packet revision, source SHA/tree,
manifest/model digests, target classification/fingerprint and evidence
references. A material change invalidates the packet review and requires a new
packet revision and gate decision.

The runner-generated release-plan digest is different. A read-only protected
`db:release:plan` derives it from the then-current target, accepted old head,
expected new head, manifest, ledger and operation inputs. At WP0, ordinary
protected apply does **not** yet accept a previously reviewed runner digest;
only specialized recovery paths have that binding. This is a control gap, not a
permission to pass a document digest to an existing command.

WP2 must implement and test an expected runner plan digest for ordinary
protected apply. The runner must compare it with a freshly computed plan before
durable mutation and revalidate it under the migration lock, while retaining
the accepted old head, expected new head, target approval and acknowledgement
checks. Required negative tests are missing/wrong digest, different target,
changed manifest with the same head name, changed ledger/incomplete attempt,
stale plan after another release, invalid acknowledgement and a migration
credential targeting another database.

### CHECK and foreign-key enforcement

Constraint coverage is derived from the selected release revision's canonical
Drizzle model and active manifest. WP1 records the complete release-specific
inventory, affected consumers and FK lifecycle semantics; WP2 implements
physical enforcement verification. The previously observed TiDB inventory of
22 CHECK definitions, nine FK-dependent CHECKs and 12 affected keys is
historical evidence only. It must not be treated as a fixed launch inventory.
The provisional candidate also includes
`billable_accounts_exactly_one_owner`, which must be included when its selected
release revision is admitted.

Provider admission must prove exact predicates, active foreign keys, rejection
of invalid CHECK/orphan writes, deletion/update lifecycle semantics, fresh
establishment, historical-head establishment where applicable, and normalized
physical congruency. Metadata presence alone is insufficient: an unchanged
expression that is unenforced must fail readiness.

Do not add disposable TiDB execution as a launch prerequisite. Existing TiDB
experiments remain historical provider evidence. Local MySQL engine admission,
Azure establishment and Azure enforcement verification are separate packets.
An unproven constraint, lifecycle mismatch or enforcement failure blocks the
relevant gate; it never permits replaying migrations, editing a ledger, manual
DDL or constraint weakening.

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

B1ms is a conditional controlled-launch option. These are proposed acceptance
criteria pending the required evidence and approval, not observed results.
Before testing, record the launch cohort, peak simultaneous sessions, 30- and
90-day growth, request/worker mix, largest tenant, media/event growth and real
hosting-to-database latency. Test at least twice the accepted 90-day data
forecast. Until that forecast exists, use the senior plan's provisional fixture
floor: 10,000 listings, 2,000 users, 100 developments, 50,000 leads and
250,000 activity/provider/delivery events with realistic skew.

Run realistic browser/API flows for at least 24 hours of representative traffic
and background work, including two expected peak windows, a 30-minute test at
twice planned peak, cold-cache, restart, retry and backlog-recovery exercises.
The provisional workload is 5 application requests/second sustained and
20/second during peaks; replace it only with a documented forecast before the
test, never afterward to make a failed run pass.

| Measure | Proposed B1ms GO threshold |
| --- | --- |
| Integrity/security | Zero lost accepted writes, duplicate durable outcomes, tenant leaks or enforcement failures |
| Unexpected application errors | <0.1% during normal/peak load; no DB-attributable timeouts |
| Read API latency | p95 ≤750 ms; p99 ≤2 seconds |
| Write API latency | p95 ≤1 second; p99 ≤2 seconds, excluding separately measured external-provider latency |
| Connection acquisition | p95 ≤250 ms; bounded queues; no exhaustion |
| CPU credits | No progressive depletion over the representative daily cycle; ≥30% of measured full balance at the lowest point; recovery before the next peak |
| Memory | Stable usage, p95 below 80%, no OOM/restart or upward leak trend |
| Connections | Aggregate application/worker cap ≤40 with at least 10 operational connections reserved, subject to engine limit and measured memory cost |
| Storage | ≥30% free and ≥90 days forecast headroom after logs and temporary work |
| Workers/backlog | No duplicate effects; normal due work meets its agreed SLO; peak backlog drains within 15 minutes |
| Restart/reconnection | Application recovers within five minutes without manual pool repair or lost accepted work |
| Recovery | The proposed objectives below are demonstrated |

Any threshold change, including a change to backlog criteria, requires
principal review before acceptance. A failure blocks B1ms admission, not
necessarily Azure as a provider; use the smallest General Purpose configuration
that passes and re-test after scaling.

### RPO, RTO and backup policy

The senior plan's proposed launch objectives require evidence and Edward's
acceptance; they are not Azure guarantees:

| Incident | Proposed objective |
| --- | --- |
| Application deployment defect, database intact | Restore a compatible artifact or maintenance service within 30 minutes while preserving database writes |
| Database corruption or unrecoverable in-region instance problem | RPO ≤15 minutes; RTO ≤4 hours |
| Regional failure under the initial non-geo-redundant model | RPO ≤24 hours; RTO ≤24 hours, supported by an independently stored backup and demonstrated provisioning path |
| TiDB-to-Azure transfer | Zero unexplained loss of required records from the frozen source snapshot |

Start with 14-day automated Azure retention. Verify PITR points and freshness;
produce encrypted logical backups on a scheduled basis with freshness below the
regional RPO; retain an independent copy outside the primary region and outside
the application runtime's deletion authority; and retain release metadata,
grants/configuration definitions and recovery instructions independently.
Backup existence is not recovery proof.

WP6 must restore the candidate to a new server, restrict access and rotate or
revoke copied credentials, register/authorize the restored target, validate the
matching application with external effects disabled, create governed known-time
test transactions, perform PITR, exercise connection switching/pool draining/
worker restart, and measure the complete recovery duration. It must separately
restore a logical backup through its approved procedure. A missed objective
blocks G5/G6 unless Edward explicitly accepts a revised objective through a
revised plan.

### Cutover and recovery procedure

The cutover packet must use this sequence and record an abort point after each
stage:

1. Confirm G6 approval, final release SHA/artifacts/configuration, runner plan
   digest, target fingerprint, backups, operators and staffed window.
2. Put the old application into maintenance/read-only mode; stop workers,
   schedulers, imports and administrative writers; revoke TiDB SQL writes;
   handle inbound webhooks through verified retry/durable capture; drain and
   prove stopped transactions.
3. Record the freeze timestamp, capture the final consistent TiDB snapshot,
   import it into the production Azure database and reconcile required records,
   relationships, money, delivery states and media references there.
4. Configure every API/worker process for the approved Azure target and deploy
   pinned artifacts with public writes still closed.
5. Run approved production readiness and smoke checks with traffic closed.
6. Obtain the explicit go-live GO, then open writes and enable workers in a
   controlled order while observing accepted writes, lead delivery,
   authorization and Live payments where applicable.
7. Keep TiDB read-only for 14 days, reviewing at days 7 and 14.

Before Azure accepts authoritative writes, abort under the reviewed
source-resumption procedure only when the old release is independently safe and
its known constraint limitations are accepted. After Azure accepts writes,
Azure remains authoritative: use a compatible application rollback, forward
correction or Azure recovery. Do not redirect writers to TiDB or invent reverse
synchronization. Never use an unreviewed rollback import, generic down
migration, ledger edit or old acknowledgement.

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

## Live, Pilot and Hidden journey requirements

The central launch register remains the sole disposition authority. WP0 records
the inventory; WP3 proves every Live requirement on the selected release; WP7
reconciles it before cutover. Removing navigation does not make a capability
Hidden: Pilot and Hidden surfaces require enforceable backend access and worker
boundaries.

| Surface | Required evidence if Live |
| --- | --- |
| Registration, verification and authentication/recovery | Role onboarding, duplicate handling, expiry, replay protection, delivery configuration, session/revocation, reset expiry and enumeration resistance |
| Authorization | Direct API denial, membership revocation, cross-tenant reads/writes and administrator boundaries |
| Agents/agencies and developers/developments | Membership/organisation ownership, authored/publication lifecycle, public detail, lead visibility/attribution and deletion protections |
| Listings, locations and Land | Draft/edit/publish/withdraw, media/source-public projection, withdrawn exclusion, canonical identity, one governed geography authority and the public classification allow-list |
| Leads and workers | Consent, custody, recipient/attribution, durable delivery, crash/replay/reconciliation, bounded claims, leases, fencing, retries, idempotency and restart |
| Entitlements, payments and webhooks | Server-side grant/expiry/revocation; provider authenticity, duplicate/out-of-order events, retry, reconciliation and recovery when paid launch is Live |
| Founder/admin | Moderation, publication control, incident visibility, audit and safe operational commands |

Service providers, Explore, paid checkout and incomplete marketplace,
distribution, commission, sponsorship or boost capabilities remain Pilot or
Hidden unless the launch register records their separate evidence and approval.
Pilot features are limited to an approved cohort; Hidden features retain schema,
security and worker isolation requirements.

## WP0 evidence record and current authorization

The historical WP0 correction was documentation-only. Its purpose was to preserve the senior plan in the
repository and create a reviewable evidence record. It does not establish a
target, create credentials, initialize a database, run migrations, import
TiDB data or authorize WP1 at that time. Current assignment is defined by A-01.

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
| Evidence | Reviewed WP0 commit `b673eb42e47b831be19e1998422be11d3303b2d9`, provenance, coverage comparison and principal review in the project conversation |
| Approver | Principal architect approved WP0; Edward directed proceeding with the three-stage recommendation |
| Remaining decisions | Launch dispositions, expenditure and provider/data decisions remain open at their owning gates; dependency-complete status is required before local database work |
| Recovery position | Local candidate work only under A-01; no protected operation or production promotion |
| Current decision | **WP0 architectural approval recorded; Stage 1 assigned. Pending business/operational decisions are not certified by this assignment.** |

## Amendment A-01 — Three-stage execution and consolidated review

**Authority:** Principal-architect recommendation accepted by Edward in the
project conversation following review of commit `b673eb42`. This amendment
changes review cadence and internal dependency handling only. All migration,
security, capacity, recovery, data and launch acceptance criteria remain intact.

| Stage | Assigned scope | Mandatory review boundary |
| --- | --- | --- |
| 1 — Local implementation and proof | WP1, WP2 and local/integration preparation of WP3; WP4 mapping/import preparation using synthetic data only; prepare WP10 runbooks where useful | One consolidated architectural/security/product review before merge/promotion approval and before any Azure mutation |
| 2 — Azure establishment and operational proof | After Stage 1 approval and release-source convergence: WP5, WP6, separately approved TiDB inspection/rehearsal in WP4, and WP7 final cutover preparation | Consolidated G5/G6 review before TiDB freeze or production opening |
| 3 — Cutover and stabilization | After Stage 2 approval and exact operational authorization: WP8, WP9 stabilization, WP10 operational handoff and retirement preparation | G9 review and Edward's deletion approval before TiDB retirement |

Stage 1 is assigned by this amendment; Stages 2 and 3 are not automatically
authorized. The [Stage 1 assignment](stage-1-assignment.md) defines execution.
This documentation turn records the assignment; it does not execute it.

### Internal packet progression

The agent maintains a durable checklist for every packet and criterion. Use
`NOT STARTED`, `IN PROGRESS`, `EVIDENCE PASS — REVIEW PENDING`, or `BLOCKED`.
Only the named reviewer may record `APPROVED`; an agent cannot approve its own
release, engine selection, migration admission or exception.

Inside an assigned stage, a prerequisite previously requiring an intermediate
principal review may be satisfied for reversible implementation preparation by
complete recorded evidence, within the already selected architecture. For
example, successful WP1 evidence permits WP2/WP3 local work without another
conversation. It does not admit the candidate for protected release. Missing
evidence blocks dependent work, while independent in-scope work may continue.

Run tests, investigate failures, fix ordinary implementation defects, reverify
affected checks and continue. A routine test failure or completed packet is
not a reason to return to Edward. A failed/ambiguous migration attempt remains
a stop under the canonical recovery protocol: never retry, reset or edit its
ledger to continue. Preserve that target and escalate the affected work.

Stage 1 ends with a review-ready candidate and G1/G2 evidence plus WP3 local
acceptance evidence. G3 still requires the approved merged `main` SHA and
post-merge validation. A candidate cannot satisfy that requirement by relabeling
its branch. After consolidated review, obtain normal merge authorization and
run affected checks on the actual merged SHA before Stage 2. Existing branch
protection, code review and CI requirements remain mandatory.

G4 evidence is recorded and checked before WP6 begins. Its principal review may
be consolidated at the Stage 2 boundary when establishment succeeds exactly as
approved; unexpected protected state still stops dependent operations. G7's
explicit opening approval and G9's retirement approval remain mandatory.

### Protected operations and early escalation

Stage approval does not supply operational credentials, consent to source-data
access, cloud expenditure, or target-specific mutation approval. An operator
may approve a concrete sequence of exact operations/targets together when the
authority supports it; every operation still needs its own valid plan,
fingerprint, credential, acknowledgement and evidence. An unknown future restore
target cannot inherit another target's approval. No code check is bypassed to
reduce conversational handoffs.

Escalate early only for a required architectural/business decision or an
unresolvable authority/environment blocker: changed migration history or
lifecycle semantics; constraint weakening; broadened privileges; unreconciled
required data; new spending; changed recovery/capacity targets; conflicting
source authority; or failed/ambiguous DDL. Provide the finding, evidence, impact,
options, recommended decision and independent work that can continue.

### Consolidated stage report

Return one report with the exact candidate/source/tree and configuration
identities; per-packet acceptance checklist and durable evidence links;
commands/results and skipped-test dispositions; changed files; local target
and attempt state; security denial tests; decisions still pending; recovery
position; and the concrete next-stage approval request. Do not claim unrun
hosted CI, unmerged code, provider compatibility or launch scope as verified.
Preserve progress in committed evidence so a replacement agent can resume.

## Gate protocol

A-01 governs review timing and preparation dependencies in the table below.
The table's criteria and final approvers remain authoritative; internal
`EVIDENCE PASS — REVIEW PENDING` is not final gate approval.

Every gate packet must use the authority evidence record fields: claim,
mechanism, sequence, evidence, boundary, owner, status and next gate. A gate
is complete only when its evidence is tied to the packet revision, source/tree,
target fingerprint and relevant manifest/model digest. Where a protected runner
plan exists, its separately generated plan digest must also be recorded.

| Gate | Required evidence | Approver | Blockers | Recovery position |
| --- | --- | --- | --- | --- |
| G0 scope and inventory | Adopted plan; verified base/candidate; launch dispositions; TiDB inventory plan; owners and budget | Edward + principal architect | Incomplete scope, provenance, owner, budget or launch-disposition record | No database transition has occurred; return to WP0 |
| G1 migration/engine admission | Per-migration dispositions; exact-engine local proof; lifecycle invariants; engine selection | Principal architect | Lineage ambiguity, unsupported historical step, failed local CHECK/FK proof or unresolved consumer/data disposition | Azure remains untouched; preserve evidence and escalate the architecture decision |
| G2 authority/security readiness | Reviewed runner-digest binding, enforcement checks, target admission, identity/grant tests and protected operational routes | Principal architect + security reviewer | Any silent authority broadening, wrong target/credential, unenforced constraint or incomplete-attempt bypass | No protected establishment yet; correct WP2 |
| G3 integrated release acceptance | Approved merged SHA; required CI/local tests; Live journeys pass; skipped tests dispositioned; release artifacts identified | Principal architect + Edward for product scope | Source drift, failed checks, missing Live evidence or unresolved launch disposition | Existing TiDB remains source if still active |
| G4 Azure establishment | Exact approved plan applied once; correct head; no incomplete attempts; congruent enforced schema; launch data verified | Authorized release operator; principal architect reviews result | Target/engine mismatch, plan/acknowledgement failure, incomplete attempt, enforcement failure or invalid launch data | Candidate remains closed; preserve and recover failure evidence |
| G5 recovery/capacity/security proof | Azure restore, PITR, logical recovery, hosting connectivity, rotation, browser/load evidence and B1ms decision | Mandatory principal architect + Edward | Restore, security, capacity, threshold, telemetry or recovery-objective failure | Production remains closed; temporary targets remain isolated |
| G6 final cutover readiness | Final release record; import rehearsal; writer census; freeze/reconciliation plan; rollback-compatible artifact or maintenance fallback; staffed window | Mandatory principal architect + Edward | Stale release/configuration, incomplete rehearsal, unknown writer, missing final import/reconciliation or recovery position | TiDB remains available under existing controls |
| G7 open production | Source frozen; final import reconciled; all services target Azure; production readiness and smoke pass | Edward's explicit go-live approval | Failed reconciliation, target mismatch, readiness/smoke failure or unapproved Live scope | Azure becomes sole authority only once writes open |
| G8 stabilization acceptance | Live journey evidence; alerts operated; backups current; no unexplained data mismatch; actual capacity within envelope | Release owner; principal architect for deviations | Integrity mismatch, alert/backup failure, capacity breach or unresolved incident | Azure rollback/recovery only |
| G9 TiDB retirement | 14-day retention satisfied; archive retrievable; no dependencies; reconciliation and recovery accepted | Edward following principal-architect closure review | Open incident/reconciliation, inaccessible archive, active dependency or recovery concern | Azure and independent archives remain recovery authorities; defer deletion |

## Work packages WP0–WP10

Every packet reports its master-plan and packet revision, source SHA/tree,
changed files, target class/fingerprint, credential class, manifest/model and
runner-plan digests where applicable, command/test results, durable evidence,
current safe state, remaining recovery options, requested gate and required
approver. Packet assignment never authorizes a protected mutation.

### WP0 — Establish the governing release record

**Prerequisites and work:** None beyond the task-owned clean worktree. Record
remote `main`, candidate ancestry and dirty-worktree findings; commit this plan,
the decision/migration records, Live/Pilot/Hidden inventory, and operator,
cost and recovery owners.

**Acceptance/report:** G0 has no implicit scope or ownership field, all
provenance and validation limits are durable, `git show --check` passes and the
report requests G0 only.

**Failure handling:** Resolve documentary/source conflicts before database work.
No database mutation is needed.

### WP1 — Admit migration lineage and engine

**Prerequisites:** G0 and a clean candidate worktree.

**Work:** Audit candidate migrations, historical applications and consumers;
prove CHECK/FK and deletion semantics on isolated local MySQL 8.0/8.4 as
needed; establish the selected engine or return a concrete blocker. Derive the
complete selected-revision constraint inventory, including billable-account
ownership where the candidate contains it.

**Acceptance/report:** A migration-by-migration disposition table, intact
manifest/inventory evidence, fresh establishment, lifecycle/concurrency tests,
consumer contract and engine evidence support G1.

**Failure handling:** No Azure experimentation compensates for missing local
proof. An unexecutable historical step requires architectural escalation; do
not rewrite, renumber, omit or weaken migrations/constraints.

### WP2 — Close release-control and target-security gaps

**Prerequisites:** G0 and WP1's admitted design for affected semantics.

**Work:** Implement and test ordinary protected-apply binding to the reviewed
runner plan digest; physical CHECK/FK enforcement verification; exact
production/restored-target admission; target/credential denial tests; credential
separation; and bounded protected routes for required data and smoke activity.
Use the existing control plane, never a second runner.

**Acceptance/report:** Static authority checks and independent negative tests
prove missing/wrong digest, wrong target/credential, unenforced CHECK,
incomplete-attempt refusal, read-only-plan nonmutation and protected-seed
refusal. Request G2 with changed authority files and test evidence.

**Failure handling:** Stop any route that silently broadens authority and retain
existing controls until replacement behavior is proven.

### WP3 — Integrate and prove the release locally

**Prerequisites:** G1 and G2.

**Work:** Integrate the approved candidate into one release, close Live-scope
findings, enforce Pilot/Hidden backend boundaries, run local acceptance and
required CI checks, obtain review and rerun on the merged SHA.

**Acceptance/report:** G3 identifies one approved SHA/tree and artifacts;
required Live journeys pass, skipped tests are dispositioned, schema/readiness
and application contracts pass, and the central launch register links every
remaining launch decision.

**Failure handling:** Correct the candidate; do not deploy a partially
integrated branch. Material source changes invalidate affected evidence.

### WP4 — Classify TiDB data and prepare transfer

**Prerequisites:** G0, admitted target model and explicit approved read access
before TiDB inspection.

**Work:** Inventory tables, counts, owners, sensitivity, external/media and
financial references, writers and timestamps. Classify required business data,
approved reference data, disposable data and historical/audit evidence. Build
a bounded import with source snapshot/target fingerprint, versioned mappings,
deterministic IDs, parent-before-child order, checkpoints, replay, rejected-row
quarantine and owner-approved exclusions. Rehearse interruption, replay and
constraint rejection; define archive, freeze and final-reconciliation runbook.

**Acceptance/report:** Required rows reconcile without unexplained loss,
reconciliation is repeatable, exclusions have business-owner approval and the
report provides the WP8 final-transfer inputs.

**Failure handling:** Quarantine rejected records and stop; do not import the
TiDB schema/ledger, silently drop data or disable constraints.

### WP5 — Govern and establish the Azure production candidate

**Prerequisites:** G3, Azure engine admission, WP2 controls and concrete
infrastructure/release approvals.

**Work:** Verify resource/engine/settings; introduce separated identities;
configure narrow access and 14-day automated backups; register production;
apply the canonical schema once through the protected path; verify enforcement,
ledger/attempts, data roles and read-only readiness; provision approved launch
data. Public ingress and workers remain closed.

**Acceptance/report:** G4 records exact target, TLS, grants, runner digest and
heads, enforcement, congruency, launch data and all side effects.

**Failure handling:** Preserve attempt and physical evidence. Use reviewed
recovery only; never reset the candidate automatically.

### WP6 — Prove cloud operation, recovery and capacity

**Prerequisites:** G4 plus approved temporary-resource budget and restore
operations.

**Work:** Restore the candidate independently; isolate credentials/network/
external effects; validate hosting/browser paths; run the full 24-hour capacity
protocol and backlog exercises; perform timed PITR and logical restore; test
rotation and application reconnection; recommend B1ms GO or an upgrade.

**Acceptance/report:** G5 includes restored-target admission, enforcement,
duplicate-effect and alert tests, raw capacity artifacts, measured recovery
objectives and the B1ms decision against the governing thresholds.

**Failure handling:** Keep production closed. Stop destructive work on an
unexpected target; preserve failed restore evidence. Code fixes return through
integration and affected validation; scaling requires re-test.

### WP7 — Assemble final launch approval

**Prerequisites:** G5 and WP4 acceptance.

**Work:** Confirm final SHA/artifacts/configuration, reconcile all gates,
operator access and current backups; record source freeze, import, webhook,
smoke, compatible application rollback/recovery and staffed-window steps;
verify every Live journey, Pilot/Hidden boundary and budget.

**Acceptance/report:** A final launch packet with no stale SHA/digest/target
reference, complete writer census and import rehearsal supports G6 after
mandatory principal review and Edward's operational approval.

**Failure handling:** Correct the packet or return to its affected phase. A
proposed launch date does not authorize a source freeze.

### WP8 — Freeze, transfer and open production

**Prerequisites:** G6 and an approved staffed cutover window.

**Work:** Close/revoke every TiDB writer, capture the final source, import and
reconcile it in production Azure, confirm the Azure target in every process,
deploy pinned artifacts with public writes closed, run smoke checks, obtain
explicit GO, then open writes and enable workers in controlled order.

**Acceptance/report:** G7 records zero source writers, final reconciliation,
readiness, direct API authorization, real lead delivery and Live payment checks
where applicable.

**Failure handling:** Before Azure writes, use the reviewed source-resumption
procedure. After Azure writes, preserve Azure authority and invoke compatible
application rollback or Azure recovery; never switch writers to TiDB.

### WP9 — Stabilize and retire TiDB

**Prerequisites:** G7.

**Work:** Monitor actual workload, CPU credits, errors, jobs, backups and Live
journeys; compare reconciliation totals; resolve incidents; verify archive
retrieval and dependencies; retain TiDB read-only for 14 days with day-7 and
day-14 reviews; then retire TiDB and temporary resources only after approval.

**Acceptance/report:** G8 then G9 prove alert operation, current recovery
points, no unexplained discrepancy, no active TiDB configuration/dependency and
accepted archive/recovery evidence.

**Failure handling:** Extend retention. Do not retire source evidence while
reconciliation, incident or recovery questions remain open.

### WP10 — Establish normal operating cadence

**Prerequisites:** G8; TiDB retirement may finish alongside documentation.

**Work:** Assign weekly capacity/storage/slow-query/credit/cost review; monthly
restore verification and alert review; quarterly full application
reconnection/recovery exercise and credential-access review; credential
rotation, engine maintenance, release procedures, alert owners, budget triggers
and incident records.

**Acceptance/report:** Named owners and tested procedures show that each future
release uses the canonical path. Report the operational calendar, evidence
locations, open risks and any G9/retirement dependency.

**Failure handling:** Escalate unowned alerts, stale backups, unsupported-engine
exposure or repeated recovery failure to principal review.

## Senior-plan correction comparison

| Senior requirement | Document location | Proposed deviation |
| --- | --- | --- |
| 24-hour representative traffic, two peak windows, 30-minute 2× peak and backlog recovery | [Capacity thresholds](#capacity-thresholds) and WP6 | None |
| `<0.1%` unexpected application errors; credits recover before next peak and remain ≥30% at their low point; backlog drains within 15 minutes | [Capacity thresholds](#capacity-thresholds) | None |
| Proposed in-region recovery RPO ≤15 minutes/RTO ≤4 hours; regional RPO/RTO ≤24 hours; 14-day automated retention | [RPO, RTO and backup policy](#rpo-rto-and-backup-policy) and WP6 | None |
| Document/packet identity remains separate from runner-generated release plan digest; ordinary protected apply binding must be implemented and tested | [Document and runner digest binding](#document-and-runner-digest-binding) and WP2 | None |
| Constraint coverage derives from the selected revision; historical TiDB counts are not the current inventory; billable-account ownership is included | [CHECK and foreign-key enforcement](#check-and-foreign-key-enforcement) and WP1/WP2 | None |
| Local engine admission precedes Azure establishment; disposable TiDB execution is not a launch prerequisite | G1/G4 and WP1/WP5 | None |
| WP2 release controls, WP4 TiDB data, WP10 normal operating cadence | WP2, WP4 and WP10 | None |
| Final production import/reconciliation occurs after writer freeze and before services/writes open | [Cutover and recovery procedure](#cutover-and-recovery-procedure) and WP8 | None |
| Azure-authoritative recovery permits compatible application rollback; TiDB does not resume as a writer | [Cutover and recovery procedure](#cutover-and-recovery-procedure) and WP8 | None |
| TiDB remains read-only for 14 days, reviewed at days 7 and 14 | [Cutover and recovery procedure](#cutover-and-recovery-procedure) and WP9 | None |
| Live/Pilot/Hidden journey disposition has explicit backend/worker boundaries | [Live, Pilot and Hidden journey requirements](#live-pilot-and-hidden-journey-requirements) and WP3/WP7 | None |

The table above records the version 1.2 technical corrections. A-01 is the
separately accepted review-cadence amendment; it changes none of those technical
criteria. A future
deviation must be recorded in this table, marked `Proposed — unapproved`, and
returned for principal review before the dependent packet proceeds.

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

Current implementation assignment is Stage 1 under A-01 and its linked
assignment. Broader packet execution does not enlarge protected-operation or
architectural-change authority.

## Gate sequence and handoff

The governing sequence is:

`G0 scope/inventory → G1 migration/engine admission → G2 authority/security
controls → G3 integrated release acceptance → G4 Azure establishment → G5
recovery/capacity proof → G6 cutover approval → G7 production open → G8
stabilization → G9 TiDB retirement`

WP0 approval and A-01 permit Stage 1 local execution, starting with WP1 and
continuing through the assigned preparation when evidence permits. No Azure
migration or TiDB import is authorized. Every packet still reports evidence,
approver, blockers and recovery position; return the consolidated stage report
at the mandatory boundary or escalate an exceptional decision earlier.

## WP0 acceptance and final handoff

WP0 is accepted only when all of the following are true:

- this complete specification is committed on the task-owned branch based on
  the verified remote `main` SHA;
- the source, candidate, migration-head and branch relationship are recorded;
- WP0–WP10 prerequisites, acceptance criteria, failure handling and reporting
  requirements are present;
- separate packet-version and runner-plan-digest binding, CHECK enforcement,
  grants, thresholds, RPO/RTO,
  backup policy and cutover/recovery controls are explicit;
- every gate names evidence, approver, blockers and recovery position;
- pending facts and ownership decisions are marked `Pending`;
- no migration, schema, authority code, credential, Azure or TiDB state was
  changed; and
- tracked-file checks pass and final Git status is clean after commit.

The version 1.2 deliverable was approved at `b673eb42`; A-01 records the subsequent
Stage 1 assignment. Neither approval certifies any database, provider, backup,
capacity, recovery, cutover or launch state.
