# B17 hosted load driver candidate

17 October 2026. Builds the hosted load driver that the packet-45 runbook
requires as entry criterion 5, validates it locally against a loopback tRPC
stub, and records it as a candidate for a separate window admission decision.
This packet does **not** admit the driver and does not open any hosted window;
B08–B18, the paid-opening NO-GO and every owner-blocked item retain their
existing dispositions.

## Authority and boundary

| Field | Record |
| --- | --- |
| Packet | `B17-HOSTED-LOAD-DRIVER-CANDIDATE-2026-10-17` (launch-readiness packet 48) |
| Base | `main` at `a2d71801d` (contains packet 47 via PR #640) |
| Worktree / branch | `property-listify-b17-hosted-load-driver-20261017` / `verify/b17-hosted-load-driver-20261017` |
| Boundary | Local files and loopback-only smoke against a throwaway protocol stub served by the repository's own `@trpc/server` version. No hosted target, database, provider, credential, payment or protected action was accessed or changed. |
| Reviewer action | Review the scheduling math tests and the gates in `config.ts`; re-run the focused suite and `pnpm test:load:hosted` against a stub to reproduce the smoke evidence. |

## What was built

| File | Change |
| --- | --- |
| `scripts/hostedLoadDriver/schedule.ts` | Pure rate-plan math: `planSegments` (boundary splitting, max-rate overlap rule), `rateAtOffset`, `cumulativeRequests`, `totalScheduledRequests`, `dueTimeForIndex` (exact piecewise-linear inverse). Bounds constant: 40 rps maximum, 24-hour hard cap, 15-second request timeout. `PROVISIONAL_RATE_PLAN` encodes the runbook's provisional rates. |
| `scripts/hostedLoadDriver/config.ts` | Flag/env parsing and refusals: `--target` origin-only, https required (loopback http only with `--allow-insecure-local`), `PROPERTY_LISTIFY_HOSTED_LOAD_CONFIRM`/`--confirm-host` must equal the resolved target host, bounded duration and in-flight cap, scenario allow-list, optional replacement `--rate-plan` file. |
| `scripts/hostedLoadDriver/scenarios.ts` | HTTP tRPC client (`httpLink`, one request per scheduled unit, `credentials: 'omit'`, per-request 15s timeout) and the calibrated profile: property detail, related feed, typed-city search, typed-province search, plus the view-counter smoke write gated behind `--enable-smoke-write`. Discovery reads public cards and public details only; each search carries exactly one geography authority. |
| `scripts/hostedLoadDriver/driver.ts` | Open-model scheduler: requests are dispatched at their scheduled due times and never re-timed by completions; an in-flight cap exists only as a hard safety valve and every drop is recorded. Abort switch via `--abort-file` plus SIGINT/SIGTERM, hard stop at the duration ceiling, bounded settle window, 0600 evidence JSON, exit codes 0 pass / 2 threshold breach / 3 aborted / 1 refusal. |
| `scripts/hostedLoadDriver/run.mts` | CLI entrypoint; refuses to run without the confirmation host match. |
| `scripts/hostedLoadDriver/__tests__/` | 30 tests: schedule segmentation, rates, cumulative integration, due-time inversion across window boundaries, monotonicity, plan validation, plan-file parsing, config defaults/refusals/bounds/confirm gate. |
| `package.json` | `test:load:hosted` script. |

## Runbook admission-spec mapping

| Packet-45 requirement | Candidate status |
| --- | --- |
| Open-model scheduling, no closed-loop self-throttling | Satisfied: wall-clock due times from the rate plan; the in-flight cap is a hard safety valve whose drops are recorded in evidence and fail the run. |
| Profile parity: detail, related feed, typed-city search, typed-province search | Satisfied for the four read shapes; validated against the same router procedures and input shapes as the packet-43/44 harness. |
| Approved representative write mix | **Open.** Only the view-counter smoke write exists; it is disabled by default, increments real public view counters irreversibly on hosted targets, and must not be enabled until the window admission records the approved write mix. |
| Provisional rates (5/s sustained, 20/s peak windows, 30-min 2× 40/s peak) | Encoded as `PROVISIONAL_RATE_PLAN` (two 15-minute 20/s peaks at 6h/18h, 30-minute 40/s double-peak at 12h) unless an accepted forecast replaces them; `--rate-plan` loads a validated replacement. |
| Single abort switch and hard stop at T0+24h | Satisfied: `--abort-file` and SIGINT/SIGTERM stop dispatch immediately (exit 3); duration is hard-capped at 86,400 seconds. |
| No credential, payment or protected-action capability | Satisfied: public read procedures only; cookies/credentials omitted; no mutation input is produced anywhere in the driver. |

## Safety gates

- The driver refuses to start unless `PROPERTY_LISTIFY_HOSTED_LOAD_CONFIRM`
  (or `--confirm-host`) exactly matches the resolved target host.
- https targets only; plain http is confined to explicit loopback use for
  local smoke.
- Targets must be bare origins: no credentials, path or query.
- Rate, duration and in-flight bounds are enforced from a fixed constant; a
  replacement plan cannot exceed 40 rps.
- Evidence is written 0600 and self-labels as
  `hosted-load-driver-run-not-an-admitted-window`.

## Local validation

- Focused suite: 30 tests passed (`vitest.server.config.ts`, server project).
- `pnpm check`: clean. ESLint on the new files: 0 errors, 0 warnings.
- Loopback smoke against a throwaway `@trpc/server` stub on the repository's
  installed tRPC version (not committed):
  - 10s at the provisional 5 rps sustained profile, all four read scenarios:
    50/50 dispatched, 0 errors, exit 0, evidence mode 0600.
  - Pre-existing abort file: zero traffic dispatched, `exit 3`, abort reason
    recorded in evidence.
  - Mismatched confirmation: `exit 1` refusal, no traffic.
  - `--enable-smoke-write` run: write scenario included; without the flag the
    scenario is refused, and without the flag plus an admission decision the
    write path stays unreachable.
- This validates scheduling, wire format, gates, evidence and exit codes. It
  does not validate hosted application behaviour; that parity evidence remains
  the packet-43/44 local harness and the future admitted window itself.

## Open items before admission

1. An approved representative hosted write mix, or an explicit decision that
   the window runs read-only plus the smoke write only.
2. An accepted B17 forecast, or written confirmation that the provisional
   rates are the accepted plan.
3. Named operators (F1/DB), incident log and abort channel per runbook entry
   criterion 6; static-egress/B08 target admission (D5) still gates the
   window itself, not this driver.
4. Window admission must be recorded as a separate reviewed decision; this
   packet is only the candidate.

## Validation commands

- `pnpm exec vitest run --no-cache --config vitest.server.config.ts scripts/hostedLoadDriver/__tests__/schedule.test.ts scripts/hostedLoadDriver/__tests__/config.test.ts`
- `pnpm test:load:hosted` with `--target`, confirmation host and flags as
  above (loopback stub only until the window is admitted).

## Register effect

None. B17's entry criterion 5 now has a concrete candidate on the branch, but
the driver is not admitted, no hosted window is open, and B08–B18 remain
unchanged and held.
