# Raw-error log sweep, phase 2c: `server/_core`, `server/scripts`, and the guard

18 October 2026. Final sweep phase for the runtime server, executing the plan
from [packet 55](55-raw-error-log-sweep-phase-1-2026-10-18.md) and continuing
[packets 57/58](58-raw-error-log-sweep-phase-2b-2026-10-18.md). Two parts:
the `_core`/`scripts` slice, and the second-argument ESLint guard. The guard
immediately exposed a residual shape the line-based inventory had missed
(prettier-wrapped multi-line calls), which this packet also closes for the
runtime server.

## Authority and boundary

| Field | Record |
| --- | --- |
| Packet | `RAW-ERROR-LOG-SWEEP-PHASE-2C-2026-10-18` (launch-readiness packet 59) |
| Base | `main` at `4fc9174ed` (contains packet 58 via PR #651) |
| Worktree / branch | `property-listify-error-log-sweep-2c-20261018` / `fix/raw-error-log-sweep-phase2c-20261018` |
| Governing text | Packet 55 "Remaining phases"; founder phased-sweep decision |
| Boundary | Logging payloads plus one ESLint selector. 35 sites across 26 files (`_core` 9, `server/scripts` 15, runtime multi-line 6 files with 11 sites); no behavior change. |
| Reviewer action | Confirm the selector entry, the probe behavior, zero runtime-server violations, and the residual inventory statement. |

## Part 1: `_core` + `server/scripts` (24 files, 24 sites)

Same transformation as phases 2a/2b; import path `./safeError` /
`../safeError` inside `_core`, `../_core/safeError` from `server/scripts`.
Two scripts (`debug_dev_fetch`, `verify-get-profile`) already carried the
import from phase 1 and were only substituted.

## Part 2: second-argument guard and the residual it exposed

Fifth entry added to the repository's `no-restricted-syntax` block (warn,
matching the existing rule class): `console.<error|warn|log|info>` with a
trailing `error`/`err` identifier argument. Probe file verified both the flag
and the non-flag (a property access such as `error.message` and a
`safeErrorSummary(error)` call are not flagged).

Enabling the guard surfaced 11 prettier-wrapped multi-line calls that the
line-based inventory could not match (the raw error sits on its own line):
`_core/index.ts`, `distributionRouter.ts`, `propertyResultsRouter.ts`,
`locationAnalyticsService.ts`, `locationPagesService.ts` (5),
`propertySearchService.ts` (2). All now summarize with `safeErrorSummary`.
With that, the runtime `server/` tree has zero raw-error console payloads in
every shape the guard can express.

## Residual inventory (accepted, warning-level)

- 46 repo-root `scripts/*.ts` developer utilities (import path
  `../server/_core/safeError`; candidate for an optional phase 2d).
- 13 sites in test files (test-process stderr, not application logging).
- 1 `.example.ts`, 1 `.backup.ts` (non-runtime material).

These produce warnings only; CI stays green.

## Validation

- Leftover line-shape grep across the slice: 0.
- Runtime-server guard scan after fixes: 0 violations.
- `pnpm exec eslint` on changed files: 0 errors.
- `pnpm run typecheck`: 290 pre-existing errors, 0 in touched files.
- Related suites (location pages, analytics, property search, distribution):
  8 files, 67 tests passed.
- Source-text contracts reading the touched files: none assert console forms.

## Register effect

None.
