# Raw-error log sweep, phase 2b: routers, routes, middleware, lib

18 October 2026. Third phase of the packet-52 residue sweep, executing the
phased strategy from [packet 55](55-raw-error-log-sweep-phase-1-2026-10-18.md)
and continuing [packet 57](57-raw-error-log-sweep-phase-2a-2026-10-18.md).
This slice covers the server root-level routers and `server/lib`,
`server/routes`, `server/middleware`. No behavior change, no schema change.

## Authority and boundary

| Field | Record |
| --- | --- |
| Packet | `RAW-ERROR-LOG-SWEEP-PHASE-2B-2026-10-18` (launch-readiness packet 58) |
| Base | `main` at `f1fbf99d4` (contains packet 57 via PR #650) |
| Worktree / branch | `property-listify-error-log-sweep-2b-20261018` / `fix/raw-error-log-sweep-phase2b-20261018` |
| Governing text | Packet 55 "Remaining phases"; founder phased-sweep decision |
| Boundary | Logging payloads only: 137 call sites across 30 files, plus one source-text contract alignment. No reformatting of unrelated lines. |
| Reviewer action | Diff should contain only substitutions, one import per file, and the single contract-test string update; confirm zero remaining sites in the slice. |

## Scope

30 files: 23 root-level `server/*Router.ts`/`routers.ts` files,
`server/lib/performanceOptimization.ts`, 2 `server/middleware/*` files and
4 `server/routes/*` files. Largest carriers: `marketplaceBundleRouter` (19),
`listingRouter` (14), `onboardingRouter` (13), `partnerSubscriptionRouter` (10).
After this phase the remaining inventory is `server/_core` (9 files) and
`server/scripts` (15 files) — phase 2c.

## Transformation

Per site: `console.<level>(<context>, error|err)` →
`console.<level>(<context>, safeErrorSummary(error|err))`, with one import
per file (`./_core/safeError` at `server/` depth, `../_core/safeError` in
`lib`/`middleware`/`routes`). Line-based codemod without `eslint --fix`, so no
collateral formatting churn. A naive paren-balance check flagged two files
(`partnerAnalyticsRouter`, `priceInsightsRouter`) whose base revisions already
count unbalanced due to parentheses inside strings; ESLint parse and typecheck
confirm both are syntactically sound.

## Contract alignment

`contract.price-insights-authority.test.ts` guarded against the historical
swallow form `console.error('Error fetching heatmap data:', error);\n return []`.
The guard now tracks the summarized form so it keeps its meaning (the code
logs and throws; the assertion fails if the swallow pattern returns).
Other source-text contracts referencing this slice: none (scan of all
`toContain` assertions for `console.error(` raw forms).

## Validation

- Leftover grep in the slice (excluding `safeErrorSummary`): 0 sites.
- `pnpm exec eslint` on changed files: 0 errors (pre-existing warning classes only).
- `pnpm run typecheck`: 290 pre-existing errors, 0 in touched files.
- `contract.price-insights-authority.test.ts`: pass.
- Log-payload suites (`analyticsPayloadMinimization`, `piiLogMinimization`): 11 passed.

## Remaining phases

- Phase 2c: `server/_core` (9 files, import `./safeError` or `../_core/safeError`
  by depth) and `server/scripts` (15 files).
- Second-argument selector joins the ESLint guard once the inventory is zero.

## Register effect

None.
