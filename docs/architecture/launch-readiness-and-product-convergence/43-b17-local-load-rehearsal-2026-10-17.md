# B17 local load rehearsal harness

17 October 2026. Replaces the dead `test:dominance:*` script family with a
bounded, opt-in local read-load rehearsal (`test:load:local`, entry
`scripts/localLoadRehearsal.mts`) and records two bounded executions against
this worktree's disposable database target. B17's hosted 24-hour representative
workload, backup/restore and provider-level recovery remain open; B08–B18, the
paid-opening NO-GO and every owner-blocked item retain their existing
dispositions. This packet grants no release, hosted, commercial or protected
action.

## Authority and boundary

| Field | Record |
| --- | --- |
| Packet | `B17-LOCAL-LOAD-REHEARSAL-2026-10-17` (launch-readiness packet 43) |
| Base | `main` at `70b1d42a4` (contains packet 42) |
| Worktree / branch | `property-listify-b17-local-load-harness-20261017` / `verify/b17-local-load-harness-20261017` |
| Database authority | Version 3; manifest head `0115_non_geographic_place_search_eligibility.sql`; target `mysql://127.0.0.1:3307/listify_wt_b17_local_load_harness_2026101_10c6c28efa9d`; fingerprint `a2b438541a5dc8a1…`; classification `disposable-worktree`; ownership `exact`; scope `runtime-connect` reads |
| Shared local service | Existing `127.0.0.1:3307` service reused without stop or restart (other workstreams hold it); `db:authority:service:start` was idempotent ("already available"). |
| Boundary | Disposable local target and in-process public router reads only. No hosted environment, provider, payment, entitlement activation or production data was accessed. Not production verification, not a release approval, and not the B17 24-hour workload. |
| Reviewer action | Re-provision a disposable target (bootstrap → migration apply → reference → foundation → scenario prepare) and re-run `pnpm test:load:local` with the exact target fingerprint confirmation; or re-run the focused unit suite. |

## Environment provisioning record

1. `pnpm db:authority:service:start` reported the service already available on
   `127.0.0.1:3307`; no stop/start against the shared service was performed.
2. `pnpm db:authority:bootstrap:local` (`worktree:create`, `changed: true`)
   created the worktree-owned database
   `listify_wt_b17_local_load_harness_2026101_10c6c28efa9d`.
3. `pnpm db:migrate:apply --accepted-old-head=none --expected-new-head=0115_non_geographic_place_search_eligibility.sql`
   applied the full chain to the fresh target with fresh-session evidence.
4. `pnpm db:reference:prepare` loaded canonical geography (1,414 rows:
   provinces, cities, suburbs).
5. `pnpm db:foundation:prepare` + `pnpm db:foundation:verify` loaded the
   canonical launch foundation.
6. `pnpm db:scenario:prepare` + `NODE_ENV=test APP_ENV=test pnpm db:scenario:verify`
   provisioned and verified the governed search-to-lead fixtures (property ids
   990001–990009) used as representative public inventory.
7. `pnpm db:authority:status` reports target-connected, manifest-head-ready,
   schema-congruent, canonical-foundation-ready and `Application Readiness:
   ready`.

## What replaced the dead dominance scripts

Every `test:dominance:*` script referenced a file that does not exist in the
tree. The family was removed and replaced by one implemented, bounded command.

| Removed script | Referenced target | State |
| --- | --- | --- |
| `test:dominance:load` | `tests/load/dominance-load.ts` | missing |
| `test:dominance:reconcile` | `scripts/dominance/reconcile-metrics.ts` | missing |
| `test:dominance:report` | `scripts/dominance/run-validation.ts` | missing |
| `test:dominance:server` | four named service test files | three missing |
| `test:dominance:all` | chained missing scripts | dead |

Added: `test:load:local` → `scripts/localLoadRehearsal.mts` (with the pure
`scripts/loadRehearsal/config.ts` support module).

## Harness contract

- Fail-closed refusals: non-test runtime; non-disposable target class; missing
  or mismatched `PROPERTY_LISTIFY_LOAD_REHEARSAL_CONFIRM` fingerprint; values
  outside the bounded ranges (duration 5–300s, target 1–20 rps, concurrency
  1–10); no public-eligible inventory on the target; no typed-geography search
  scenario available.
- Scenarios are read-only in-process public router procedures:
  `property-detail` (`properties.getPublicByIds`), `property-related-feed`
  (`properties.getRelatedPublicInventory`), `search-typed-city` and
  `search-typed-province` (`properties.searchPublicInventory`). Each search
  request carries exactly one geography authority — typed city **or** typed
  province — never a mixed input, per the land consumer journey contract.
- Thresholds are the master-plan read thresholds (packets 24/27): error rate
  ≤0.1%, read p95 ≤750ms, read p99 ≤2s. Write latency, connection-acquisition
  p95 ≤250ms, resource headroom and the 24-hour workload are deliberately out
  of scope for this bounded local rehearsal.
- Output: machine-readable evidence JSON (optional `--evidence-out`, written
  mode `0600`); exit `0` pass, `2` threshold breach, `1` refusal/error; the
  authority pool is shut down explicitly after the run.
- Guard behaviour verified: missing confirmation, mismatched confirmation and
  `--rps 50` each exited `1` with the designed refusal message.

## Executed evidence

| Run | Window | Target rps | Achieved | Requests | Errors |
| --- | --- | --- | --- | --- | --- |
| Pilot | 19.82s | 5 | 5.04 | 100 | 0 |
| Official | 59.83s | 5 | 5.01 | 300 | 0 |

Per-scenario, official 60s run:

| Scenario | n | errors | p50 | p95 | p99 | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| `property-detail` | 75 | 0 | 12.68ms | 24.53ms | 35.63ms | PASS |
| `property-related-feed` | 75 | 0 | 34.49ms | 64.02ms | 89.52ms | PASS |
| `search-typed-city` | 75 | 0 | 32.04ms | 49.08ms | 51.05ms | PASS |
| `search-typed-province` | 75 | 0 | 27.90ms | 59.42ms | 145.41ms | PASS |

Artifacts:

- `evidence/b17-local-load-rehearsal-2026-10-17/rehearsal-60s-5rps.json`
  (sha256 `3424c3385596cbfe1ea53db9a273ca74427757796781b1cbfb3c4955680a9a05`)
- `evidence/b17-local-load-rehearsal-2026-10-17/pilot-20s-5rps.json`
  (sha256 `34b3f4f328cb23aa0e77c6df45eef3350f911e0887cd090830bfccc2be079ec6`)

## Changes

| File | Change |
| --- | --- |
| `package.json` | Removed five dead `test:dominance:*` scripts; added `test:load:local`. |
| `scripts/localLoadRehearsal.mts` | New bounded, opt-in rehearsal entry: authority guard, inventory discovery, warmup validity checks, open-model scheduler, evidence output, explicit shutdown. |
| `scripts/loadRehearsal/config.ts` | Pure support module: bounds, fingerprint confirmation, nearest-rank percentiles, threshold evaluation, refusal contract. |
| `scripts/__tests__/loadRehearsal.config.test.ts` | 11 unit tests for bounds/refusals/percentiles/thresholds/argument separators. |
| `docs/.../evidence/b17-local-load-rehearsal-2026-10-17/*.json` | Raw evidence artifacts for both runs. |

## Findings and retained gaps

| Finding | Disposition |
| --- | --- |
| The `test:dominance:*` family was entirely dead, including a service suite naming three nonexistent test files | Removed as stale compatibility debris; replaced by an implemented harness and a protected unit contract. |
| No locally executable capacity rehearsal existed, so B17 load tooling would have to be built during a hosted window | Harness now exists; the hosted window executes rather than authors tooling. |
| A fresh disposable target has no public inventory, so "load testing" could silently measure empty reads | Warmup requires at least one typed-geography search to return public cards; the harness refuses otherwise. Discovery additionally validates every detail id through the public projection. |
| Master-plan read thresholds smoke-pass locally at 5 rps | Supporting local signal only; the B17 24-hour representative workload remains the gate. |
| Write latency, connection-acquisition p95 ≤250ms and resource headroom are not measured by this harness | Retained gap; left to the hosted workload evidence or a future harness extension. |
| Restart/backlog drain | Multi-run drain and retry backoff already evidenced in packet 42; the shared local service was again deliberately not stopped (change isolation). |
| Backup/restore and provider-level recovery | Hosted/manual; unchanged. |

## Validation

- `npx vitest run scripts/__tests__/loadRehearsal.config.test.ts`: 11 tests
  passed.
- `pnpm test:db-authority:static`: 65 files / 774 tests passed (unchanged; the
  harness unit suite runs in the default server project through
  `scripts/**/*.test.ts` in `vitest.server.config.ts`).
- `pnpm check`: clean.
- `pnpm lint`: 0 errors (repository baseline warnings only; the new TypeScript
  files introduce none, and the `.mts` entry follows the ignored-extension
  convention of the existing authority runner scripts).
- Refusal-path checks: missing confirmation, mismatched confirmation and
  out-of-bounds rps all refused with exit `1` before any workload ran.

## Register effect

None. B17 remains OPEN: the hosted 24-hour representative workload,
backup/restore and provider-level recovery still require hosted/manual
execution. B08–B18, the paid-opening NO-GO and LRC-SUPPORT-001 are unchanged.
This packet replaces a dead local script reference with an executable bounded
rehearsal and records local smoke evidence only.
