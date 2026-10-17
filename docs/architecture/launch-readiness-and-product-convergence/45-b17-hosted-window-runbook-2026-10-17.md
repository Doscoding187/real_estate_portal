# B17 hosted-window runbook

17 October 2026. Preparation-only operating runbook for the B17 hosted window:
the 24-hour representative capacity run, restart/backlog/object recovery
exercises, monitoring proof and backup/restore drills that the master plan
requires. It makes the window execution-only by fixing entry criteria, roles,
exact commands, capture cadence, abort rules and acceptance mapping in advance.
Nothing here was executed against a hosted environment; no spend, protected or
release action is authorized. B08–B18, the paid-opening NO-GO and every
owner-blocked item retain their existing dispositions.

## Authority and boundary

| Field | Record |
| --- | --- |
| Packet | `B17-HOSTED-WINDOW-RUNBOOK-2026-10-17` (launch-readiness packet 45) |
| Base | `main` at `5145e273a` (contains packets 43/44 via PR #637) |
| Worktree / branch | `property-listify-b17-hosted-window-runbook-20261017` / `verify/b17-hosted-window-runbook-20261017` |
| Governing text | Register B17 row ([03](03-launch-register.md)); plan 24 [B17 section](24-paid-mvp-launch-closure-execution-plan.md) and capacity table; [monitoring and recovery contract](20-monitoring-and-recovery-contract.md); [hosted-parity rehearsal pack](42-hosted-parity-rehearsal-pack-2026-10-17.md); local harness [43](43-b17-local-load-rehearsal-2026-10-17.md)/[44](44-b17-load-rehearsal-metrics-2026-10-17.md) |
| Boundary | Repository document only. No hosted environment, provider, payment, credential, restore, deployment or production data was accessed; no executable contract was added. The window itself remains a protected hosted operation requiring the founder and senior authorizations below. |
| Reviewer action | Check this runbook against plan 24 §B17 and the capacity table; confirm the entry gates and abort rules are complete; no local execution is required or possible beyond link checks. |

## What the window must produce

B17 closes on evidence, not on a healthy probe. The window is complete only
when every row below has captured evidence and the acceptance conditions hold.

| Requirement | Window phase | Acceptance |
| --- | --- | --- |
| 24-hour representative final-application workload | Phase A | Capacity table rows (workload, duration/traffic, integrity/errors, latency, headroom, work/restart) all pass |
| Restart, backlog, worker and object recovery | Phase B | Each exercise recovers inside its stated bound; no lost work, duplicate effect or manual pool repair |
| Monitoring detects real failure with operator response | Phase D | Alert received by the named continuous recipient; response recorded; scheduler/worker attention conditions exercised |
| Actual backup policy, PITR and independent logical restore | Phase C | Measured RPO/RTO against the recovery row; targets reconciled by checksums/counts; isolation boundary proven |

Explicitly out of scope for this packet: B08 admission, B09 data treatment,
B11–B14 functional hosted readiness and B16 exact artifacts are prerequisites
owned by their own gates; this runbook does not execute or substitute them.

## Entry criteria (all required before T0)

1. **Exact accepted candidate**: B16 accepted frontend/API SHAs and the exact
   Database Authority target fingerprint for the hosted candidate are recorded
   and unchanged from the release tuple under test.
2. **Prerequisites from plan 24 §B17**: B08 admitted target, B09
   representative data/transfer treatment, B11–B14 functional hosted
   readiness, Edward-approved workload forecast (or the provisional floor:
   10,000 listings, 2,000 users, 100 developments, 50,000 leads, 250,000
   activity/provider/delivery events with realistic skew) and recovery
   objectives/resource budget.
3. **Founder approvals (F4/F7)**: monitored alert recipient bound; explicit
   in-region and regional RPO/RTO objectives accepted in writing before the
   test; temporary restored-server and independent-backup costs approved;
   restore-region quota/capacity confirmed as actually provisionable; any
   required incremental provider charge disposed under a `FOUNDER SPEND GATE`.
4. **Named operators**: one release/data operator (F1) and one database
   operator for Phase C; senior reviewer available for Phase A close and
   disruptive phases.
5. **Tooling admitted**: `pnpm launch:probe` for continuous checks, plus an
   admitted hosted load driver for Phase A (see below). A missing driver
   blocks Phase A; it cannot be replaced by ad-hoc scripts authored in-window.
6. **Operational readiness**: protected incident log opened for the window;
   staffed coverage confirmed (weekend unattended load is acceptable only with
   alert coverage and the operator on call); abort channel and escalation
   agreed.

### Hosted load driver admission

The packet-43/44 harness is deliberately local-only (it refuses any target
that is not `disposable-worktree`/`disposable-test`) and is calibration, not
the hosted executor. Before T0 the window must admit one hosted load driver in
a separate reviewed record that fixes:

- open-model scheduling, no closed-loop self-throttling;
- profile parity with the calibrated shapes: property detail, related feed,
  typed-city search, typed-province search and an approved representative
  write mix (the local harness's view-counter write is a smoke shape only and
  is not sufficient for hosted write volume);
- provisional rates: 5 requests/s sustained, 20 requests/s peak windows and a
  30-minute 2× planned peak (40/s double-peak interval) unless an accepted
  forecast replaces them before the test;
- a single abort switch and a hard stop at T0+24h;
- no credential, payment or protected-action capability beyond the load paths
  it exercises.

## Roles and protected actions

| Role | Holder | Responsibility |
| --- | --- | --- |
| Founder authority | Edward | Accepts forecast/objectives, approves budget and spend gates, owns alert receipt path, signs the window close |
| Release/data operator | Named by founder (F1) | Runs Phases A–B, captures evidence, executes abort rules |
| Database operator | Named | Executes Phase C restores on separately admitted isolated targets only |
| Senior reviewer | Available | Reviews Phase A close, disruptive outcomes and the final evidence set |

Deployment, credential change, provider configuration, restore and any paid
resource action remain separately authorized protected actions; this runbook
grants none of them. Disruptive restores/restarts run on separate isolated
resources or scheduled test phases so the normal-load run is not contaminated
(plan 24 §B17.5). Never load-test or restore over a customer production
database (plan 24 §B17.6).

## Pre-window preparation (T-2 to T-0)

1. **Identity and readiness readback**: export the exact tuple into
   `LAUNCH_PROBE_FRONTEND_URL`, `LAUNCH_PROBE_API_URL`,
   `LAUNCH_PROBE_FRONTEND_SHA`, `LAUNCH_PROBE_API_SHA`,
   `LAUNCH_PROBE_TARGET_FINGERPRINT`, `LAUNCH_PROBE_ENV` and
   `LAUNCH_PROBE_RELEASE_ID`, then run `pnpm launch:probe`. It compares
   `/version.json`, `/api/version`, `/api/health` and `/api/readiness` and
   requires the expected database target, Redis-backed rate-limit/cache
   health, public S3 configuration and a term-scheduler tick within 45
   minutes. Exit 2 is attention.
2. **Monitoring binding readback**: the continuous check schedule and alert
   recipient must be bound in the protected provider/environment
   configuration — an unscheduled local script or laptop is not continuous
   monitoring ([20](20-monitoring-and-recovery-contract.md)). Record the
   binding and the recipient's acknowledgement.
3. **Backup policy readback**: actual Azure MySQL 14-day retention, current
   PITR window, freshest restore point and the scheduled independent encrypted
   logical copy (freshness younger than the regional RPO, stored outside the
   primary region and runtime deletion authority). Check the Railway Redis
   volume backup tab, schedule and history; any incremental backup charge is a
   `FOUNDER SPEND GATE`.
4. **Worker and scheduler readback**: supervised transactional-email worker
   running, one-shot lead-delivery worker registered on its cron cadence,
   term-scheduler ticking, and the attention surfaces from the monitoring
   contract reachable (`pnpm email:backlog`, lead worker summary/backlog, Lead
   Routing Audit).
5. **Data floor verification**: confirm the forecast dataset (or provisional
   floor) is loaded on the hosted target with reconciled counts; record the
   counts as the baseline for integrity checks.
6. **Capture assets ready**: evidence directory
   `evidence/b17-hosted-window-<YYYY-MM-DD>/` planned, probe history exporter,
   metric snapshot template and the incident log all in place.

## Phase A — 24-hour representative workload

| Item | Procedure |
| --- | --- |
| Start | T0 recorded in UTC in the incident log; probe green; driver profile confirmed | 
| Traffic | Sustained 5 requests/s, two expected peak windows at 20 requests/s, and one 30-minute 2× planned peak (40/s double-peak interval); ≥24h elapsed |
| Background work | Real email worker, lead-delivery cron and term scheduler run normally throughout; their SLOs are part of the run |
| Continuous checks | `pnpm launch:probe` on the bound continuous schedule; history exported at close |
| Metric snapshots | Hourly: per-class latency p50/p95/p99, application error rate, connection-acquisition p95 and pool-exhaustion state, CPU credits/full balance, memory p95, aggregate app/worker connections (limit ≤40 with ≥10 reserved), storage free and forecast headroom, peak backlog and drain time |
| Integrity | Accepted-write ledger vs. driver record; duplicate durable-outcome scan; tenant-isolation sampling; DB-attributable timeout count; zero unexplained loss |
| Abort rules | Stop on any integrity/tenant/enforcement failure, pool exhaustion, sustained unexpected errors >0.1%, CPU-credit floor approaching, or storage below 30%; do not waive — bounded fix plus retest, or a reviewed amendment written before retest |

Phase A acceptance is the plan 24 capacity table, rows workload,
duration/traffic, integrity/errors, latency, resource headroom and
work/restart. Local calibration from packets 43/44 is supporting context only
and is not hosted evidence.

## Phase B — disruptive exercises

Run on separately admitted isolated resources or in scheduled low-load phases;
record start, end and recovery times per exercise.

1. **Controlled API restart**: application reconnects/recovering ≤5 minutes,
   no manual pool repair, no lost work; readiness and exact SHA re-verified.
2. **Redis interruption/recovery**: rate-limit/cache behavior degrades safely,
   sessions behave per contract, recovery re-verifies readiness health.
3. **Email worker restart**: supervised restart; backlog drains; no duplicate
   sends; `unknown` outcomes preserved for reconciliation, never reset to
   force a resend.
4. **Missed lead cron detection**: one skipped run is detected per the
   attention contract on the second miss; custody remains intact; the named
   operator records the response.
5. **Private-object retrieval failure and recovery**: finance review held;
   object preserved; retrieval restored after the provider fix, with the
   controlled read recorded.
6. **Term-scheduler staleness**: stale tick surfaces as a readiness/attention
   condition within 45 minutes and clears after recovery.

## Phase C — backup and restore drills (protected; separate authorization)

1. **PITR restore**: restore to a separately admitted isolated Azure target;
   measure elapsed time against in-region RTO ≤4h and the achieved recovery
   point against RPO ≤15min; reconcile checksums/counts against the recorded
   baseline; record the restored target fingerprint, isolation boundary and
   the disposal of the temporary target.
2. **Independent logical restore**: restore the scheduled encrypted logical
   copy (freshness ≤24h regional RPO) to a second admitted isolated target;
   prove the copy is inaccessible to the primary runtime's deletion authority;
   reconcile and dispose as above.
3. **Redis volume restore**: only if a schedule exists within approved spend;
   otherwise record the gap and the open `FOUNDER SPEND GATE`.
4. Never restore against the protected production database; restores without
   an admission record do not count as evidence.

## Phase D — monitoring proof

1. Export the continuous probe history for the whole window; identity and
   readiness checks must be independent of the monitored application.
2. Induce a controlled failure (for example the Redis interruption or a
   stopped worker) and prove the named recipient received the alert; record
   receipt time and the operator action taken.
3. Exercise the attention conditions: term tick ≥45 minutes stale, two missed
   lead runs, email backlog/permanent failure, proof/custody attention,
   support/reply/bounce ownership.
4. Backup metadata or a single healthy probe cannot close B17; the window
   close requires detection plus demonstrated operator response.

## Evidence capture and closure mapping

Store the window's raw evidence under `evidence/b17-hosted-window-<date>/`
with hashes recorded in the execution packet that follows this runbook, using
the claim labels from the [evidence contract](06-evidence-sequence-and-provenance-contract.md).

| Artifact | Content |
| --- | --- |
| `probe-history` | Continuous check results, exact tuple, failure/alert receipts |
| `metrics` | Hourly snapshot series for the Phase A capture list |
| `workload` | Driver configuration, achieved rates, peak windows, integrity reconciliation |
| `recovery` | Phase B exercise records with measured recovery times |
| `restore` | Phase C target fingerprints, measurements, checksums/counts, isolation boundary, disposal |
| `monitoring` | Alert receipt log and operator response records |
| `incident-log` | UTC timeline, aborts, escalations, decisions |

Publish the execution packet only after senior review confirms: all numerical
criteria in plan 24 section 7 and master-plan G5 pass, zero
integrity/security loss, successful application/object/database recovery,
independent monitoring detected failures, and operator response was
demonstrated. Any missed criterion is a bounded correction and retest, not a
waiver; any forecast/threshold amendment must be written before its test.

## Retained gaps and explicit non-claims

| Item | State |
| --- | --- |
| Hosted execution | Not performed; this packet is preparation only |
| Hosted load driver | Not yet admitted; admission is an entry gate, not a window task |
| Alert recipient and staffing | Bound by founder action F4/F7 before T0 |
| Restore budget and independent backup destination | Founder approval F7; unapproved additions remain `FOUNDER SPEND GATE` |
| B17 register effect | None; B17 stays OPEN until the execution packet is accepted |

## Validation

- Document-only change; no code, config or executable contract was added.
- Content reviewed against register B17 row, plan 24 §B17 and its capacity
  table, the monitoring and recovery contract, and packets 42–44.
- All referenced repository paths and commands (`pnpm launch:probe`,
  `pnpm email:backlog`, `lead-delivery:worker`) were checked to exist at this
  base.

## Register effect

None. This runbook operationalizes B17's hosted closure; it does not execute
it, changes no register record and grants no release, hosted, commercial or
protected action.
