# Raw-error log sweep, phase 1

18 October 2026. First phase of the wider raw-error audit residue recorded in
[packet 52](52-pii-log-minimization-2026-10-18.md). Edward chose a phased sweep
(the "phased sweep" option: fix the worst patterns plus a guard now, sweep the
remaining files in later directory-bounded PRs). Phase 1 removes every
single-argument raw-error dump and every `.catch(console.error)` handler, and
adds an ESLint restriction so new ones cannot appear. No runtime behavior,
schema or configuration change.

## Authority and boundary

| Field | Record |
| --- | --- |
| Packet | `RAW-ERROR-LOG-SWEEP-PHASE-1-2026-10-18` (launch-readiness packet 55) |
| Base | `main` at `6f0ece880` (contains packets 53/54 via PRs #646/#647) |
| Worktree / branch | `property-listify-error-log-sweep-20261018` / `fix/raw-error-log-sweep-phase1-20261018` |
| Governing text | Packet 52 "Residue" section; founder decision in session 18 October 2026 |
| Boundary | Logging payloads and the lint configuration only. Operator scripts keep their diagnostics (context label + summarized error); no behavior change. |
| Reviewer action | Confirm the two selectors fire (probe below), re-run the grep and ESLint checks, and check phase-2 scope against the residue count. |

## Phase-1 scope and findings

The runtime server was already clean after packet 52; the worst remaining
patterns lived in operator scripts and the dev-wizard migration runner:

- 9 single-argument dumps (`console.error(error)` / `console.error(err)`);
- 8 direct `.catch(console.error)` handlers (including two in one file);
- 1 further `.catch(console.error)` found during verification in the same
  file as a fixed dump (`debug-upload.ts`).

17 live sites across 16 files were fixed. Two commented-out example lines
(`contentBadgeService.example.ts`, `feedRankingService.example.ts`) and one
spawned-child script string (`billingProofStorage.localRestart.test.ts:84`,
not linted code) are out of scope.

## What changed

| File | Change |
| --- | --- |
| `eslint.config.js` | Two `no-restricted-syntax` selectors added at the repository's existing `warn` severity for this rule class: (1) single-argument `console.error/warn/log(error|err)`; (2) `.catch(console.error)`. Messages point to `safeErrorSummary`. |
| `server/migrations/devWizardMigrations.ts` | Failure handler now logs `dev-wizard migrations failed: <summary>`; import added. |
| `server/scripts/*` (15 files) | Each raw dump replaced with a context label plus `safeErrorSummary(error)`; each direct catch handler replaced with an arrow handler that logs a labeled summary. `../_core/safeError` imported where needed. `inspect_210008.ts` / `verify_developer_fk_fix.ts` lose their duplicate raw dump (the first line now carries the summary); `debug-upload.ts` keeps its `err.cause` inspection. |

## Guard probe

A throwaway probe file (both patterns, then deleted) produced exactly the two
intended warnings:

- `5:19 Do not log a raw Error object. Use safeErrorSummary(error) ...`
- `8:15 Do not pass console.error directly to .catch() ...`

## Validation

- Zero remaining sites:
  - `grep -rnE "console\.(error|warn|log)\((error|err)\)" server --include="*.ts" | grep -v "\.example\.ts|\.test\.ts"` → empty
  - `grep -rn "catch(console.error)" server --include="*.ts" | grep -v "\.example\.ts|\.test\.ts"` → empty
- `pnpm exec eslint server 2>&1 | grep -cE "Do not log a raw Error|Do not pass console\.error"` → 0 (no existing violations of the new selectors).
- ESLint on all touched files: 0 errors (pre-existing `any`/prettier warnings only).
- `pnpm run typecheck`: only pre-existing errors; the three in
  `debug_dev_fetch.ts` are its broken `../src/*` imports that exist at base and
  are untouched by this change.
- No test suite spawns or imports the touched scripts; no vitest change needed.

## Remaining phases

- ~228 second-argument raw-error sites (`console.error('...', error)`) across
  ~91 server files remain for later, directory-bounded phases; the second-arg
  selector is added only once a phase has zeroed its slice.
- The spawned-child snippet in `billingProofStorage.localRestart.test.ts` stays
  (test-process stderr, not application logging).

## Register effect

None. Logging hardening; no launch-register row changes.
