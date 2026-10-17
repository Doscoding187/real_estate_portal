# B17 local load rehearsal metrics extension

17 October 2026. Extends the packet-43 rehearsal harness with the two rows it
deliberately left out — write latency and connection-acquisition p95 — by adding
a self-cleaning write scenario (`property-detail-view`) and a pool-lease
observer, then records a pilot and an official bounded execution against this
worktree's disposable database target. B17's hosted 24-hour representative
workload, backup/restore and provider-level recovery remain open; B08–B18, the
paid-opening NO-GO and every owner-blocked item retain their existing
dispositions. This packet grants no release, hosted, commercial or protected
action.

## Authority and boundary

| Field | Record |
| --- | --- |
| Packet | `B17-LOCAL-LOAD-REHEARSAL-METRICS-2026-10-17` (launch-readiness packet 44) |
| Base | `main` at `04fc0a401` (contains packet 43, merged as PR #636) |
| Worktree / branch | `property-listify-b17-load-rehearsal-metrics-20261017` / `verify/b17-load-rehearsal-metrics-20261017` |
| Database authority | Version 3; manifest head `0115_non_geographic_place_search_eligibility.sql`; target `mysql://127.0.0.1:3307/listify_wt_b17_load_rehearsal_metrics_202_b1747eeec861`; fingerprint `9d420a2d33cd03f9…`; classification `disposable-worktree`; ownership `exact`; scope `runtime-connect` reads plus one snapshot-restored view-counter write |
| Shared local service | Existing `127.0.0.1:3307` service reused without stop or restart (other workstreams hold it); `db:authority:service:start` was idempotent ("already available"). |
| Boundary | Disposable local target and in-process public router procedures only. No hosted environment, provider, payment, entitlement activation or production data was accessed. Not production verification, not a release approval, and not the B17 24-hour workload. |
| Reviewer action | Re-provision a disposable target (bootstrap → migration apply → reference → foundation → scenario prepare) and re-run `pnpm test:load:local` with the exact target fingerprint confirmation; or re-run the focused unit suites. |

## Environment provisioning record

1. `pnpm db:authority:service:start` reported the service already available on
   `127.0.0.1:3307`; no stop/start against the shared service was performed.
2. `pnpm db:authority:bootstrap:local` (`worktree:create`, `changed: true`)
   created the worktree-owned database
   `listify_wt_b17_load_rehearsal_metrics_202_b1747eeec861`.
3. `pnpm db:migrate:apply --accepted-old-head=none --expected-new-head=0115_non_geographic_place_search_eligibility.sql`
   applied the full chain to the fresh target with fresh-session evidence.
4. `pnpm db:reference:prepare` loaded canonical geography (1,414 rows).
5. `pnpm db:foundation:prepare` + `pnpm db:foundation:verify` loaded the
   canonical launch foundation.
6. `pnpm db:scenario:prepare` + `NODE_ENV=test APP_ENV=test pnpm db:scenario:verify`
   provisioned and verified the governed fixtures (property ids 990001–990009).
7. `pnpm db:authority:status` reports target-connected, manifest-head-ready,
   schema-congruent, canonical-foundation-ready and `Application Readiness:
   ready`.

## What this extension adds

- **Write scenario `property-detail-view`**: calls the public
  `properties.getById` procedure, which increments the property view counter
  (`properties.views`, an `int NOT NULL` column). The harness snapshots the
  target row's `views` value before the workload and restores it afterwards;
  `cleanup` (`snapshotRows`, `restoredViews`, `error`) is recorded in evidence
  and any cleanup failure fails the verdict.
- **Connection-lease observation**: `observePoolLeases` wraps a mysql2-style
  pool's `getConnection` — capturing real lease acquisition latency including
  queue wait — and restores it when detached. It resolves the inner callback
  pool when handed a `mysql2/promise` pool, because promise pools delegate both
  `getConnection` and the implicit acquisition inside `query`/`execute`
  (`drizzle-orm/mysql2` executes prepared statements through the query path) to
  that inner pool. Observation is attached after `getDb()` and detached after
  the workload; it changes no SQL or pool configuration.
- **Thresholds**: read unchanged (error ≤0.1%, p95 ≤750ms, p99 ≤2s), write
  (p95 ≤1s, p99 ≤2s) and connection-lease (p95 ≤250ms) are the master-plan
  rows from packets 24/27 that packet 43 recorded as out of scope.
- **Evidence schema v2**: `thresholds` now covers `read`/`write`/
  `connectionLease`; each scenario row carries its `kind`; a top-level
  `connectionLease` block and a `cleanup` block are added, and the verdict
  aggregates scenario, lease and cleanup failures.
- Fail-closed refusals, bounds (duration 5–300s, rps 1–20, concurrency 1–10),
  fingerprint confirmation, exit codes (`0` pass, `2` threshold breach,
  `1` refusal/error), explicit pool shutdown and the `.mts` ignored-extension
  convention are unchanged from packet 43.

## Executed evidence

| Run | Window | Target rps | Achieved | Requests | Errors |
| --- | --- | --- | --- | --- | --- |
| Pilot | 19.83s | 5 | 5.04 | 100 | 0 |
| Official | 59.82s | 5 | 5.01 | 300 | 0 |

Per-scenario, official 60s run:

| Scenario | Kind | n | errors | p50 | p95 | p99 | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `property-detail` | read | 60 | 0 | 10.79ms | 27.12ms | 76.80ms | PASS |
| `property-related-feed` | read | 60 | 0 | 32.87ms | 47.90ms | 73.07ms | PASS |
| `property-detail-view` | write | 60 | 0 | 24.79ms | 37.81ms | 39.56ms | PASS |
| `search-typed-city` | read | 60 | 0 | 27.01ms | 43.27ms | 70.76ms | PASS |
| `search-typed-province` | read | 60 | 0 | 26.83ms | 43.40ms | 71.53ms | PASS |
| `connection-lease` | lease | 4,140 | 0 | 0.02ms | 0.56ms | 1.52ms | PASS |

Lease maximum observed: 7.17ms (threshold is p95 ≤250ms). Cleanup for the
official run: `snapshotRows: 1`, `restoredViews: true`, `error: null`.

Artifacts:

- `evidence/b17-load-rehearsal-metrics-2026-10-17/rehearsal-60s-5rps.json`
  (sha256 `f6b8cde717a25c60074511d41bd5ec119c955d8c0f817956bb639c553af3af87`)
- `evidence/b17-load-rehearsal-metrics-2026-10-17/pilot-20s-5rps.json`
  (sha256 `f3ef5020387f45c07cccd1c961b5303b87b41f817ba33c8afcfa78a2ac0133db`)

## Changes

| File | Change |
| --- | --- |
| `server/_core/databaseAuthority/poolLeaseObservation.ts` | New lease observer: resolves the inner callback pool of promise-style pools, wraps `getConnection` for both call styles, restores on detach. |
| `server/_core/databaseAuthority/__tests__/poolLeaseObservation.test.ts` | 4 unit tests: callback/promise styles, error flagging, promise-pool inner resolution, restore. |
| `server/db-connection.ts` | `observeAuthorityPoolLease(listener)` export over the active authorized pool (throws before initialization; observation only). |
| `scripts/loadRehearsal/config.ts` | Write and connection-lease thresholds; `ScenarioKind`; kind-aware threshold evaluation; lease evaluation. |
| `scripts/localLoadRehearsal.mts` | Write scenario with view snapshot/restore; lease observer attach/detach; evidence v2 (thresholds/lease/cleanup/verdict); cleanup is part of the verdict. |
| `scripts/__tests__/loadRehearsal.config.test.ts` | 13 tests (extended for write/lease thresholds and kind-aware evaluation). |
| `docs/.../evidence/b17-load-rehearsal-metrics-2026-10-17/*.json` | Raw evidence artifacts for both runs. |

## Findings and retained gaps

| Finding | Disposition |
| --- | --- |
| First wiring of the lease observer produced `connection-lease: n=0` and exit `2` even though sql ran | Root cause: drizzle executes prepared statements through the promise pool's `query`/`execute`, whose acquisition happens on the inner callback pool; the observer now resolves that inner pool. Fixed, re-verified, and protected by a unit test. |
| Write latency is now measured locally: write p95 37.81ms, p99 39.56ms at 5 rps | Closes packet 43's "write latency not measured" gap for the local bounded rehearsal; the hosted 24-hour workload remains the gate. |
| Connection-acquisition p95 is now measured locally: lease p95 0.56ms, max 7.17ms with an idle pool | Closes packet 43's "connection-acquisition p95 not measured" gap locally; queue-contention behaviour under sustained/exhausted concurrency remains hosted evidence. |
| The write scenario mutates a public view counter | Self-cleaning by snapshot/restore inside the harness; cleanup success is recorded in evidence and fails the verdict when it does not restore. |
| Master-plan thresholds smoke-pass locally at 5 rps on all three classes | Supporting local signal only; the B17 24-hour representative workload remains the gate. |
| Resource headroom, restart/backlog drain, backup/restore, provider-level recovery | Unchanged: packet 42 covers restart/backlog locally; the rest are hosted/manual. |

## Validation

- Focused unit suites: 17 tests passed (13 config + 4 lease observation).
- `pnpm test:db-authority:static`: 66 files / 778 tests passed (grew by the new
  `poolLeaseObservation.test.ts` suite; previously 65 files / 774 tests).
- `pnpm check`: clean.
- `eslint` on every changed TypeScript file: 0 errors, 0 new warnings
  (`server/db-connection.ts` retains only its 28 pre-existing warnings; the
  `.mts` entry follows the ignored-extension convention of the existing
  authority runner scripts).
- Real-path lease probe: a bounded `db.execute` against the authorized pool
  recorded a lease sample through the observer after the fix (0 samples before).

## Register effect

None. B17 remains OPEN: the hosted 24-hour representative workload,
backup/restore and provider-level recovery still require hosted/manual
execution. B08–B18, the paid-opening NO-GO and LRC-SUPPORT-001 are unchanged.
This packet extends the local rehearsable surface with write-latency and
connection-lease metrics and records local smoke evidence only.
