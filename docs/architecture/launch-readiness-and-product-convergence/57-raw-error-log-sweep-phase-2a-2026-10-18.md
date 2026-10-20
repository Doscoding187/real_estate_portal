# Raw-error log sweep, phase 2a: `server/services`

18 October 2026. Second phase of the packet-52 residue sweep, executing the
phased strategy recorded in [packet 55](55-raw-error-log-sweep-phase-1-2026-10-18.md).
This slice covers every second-argument raw-error site in `server/services`.
No behavior change, no schema change.

## Authority and boundary

| Field | Record |
| --- | --- |
| Packet | `RAW-ERROR-LOG-SWEEP-PHASE-2A-2026-10-18` (launch-readiness packet 57) |
| Base | `main` at `fe747c9cb` (contains packet 56 via PR #649) |
| Worktree / branch | `property-listify-error-log-sweep-2a-20261018` / `fix/raw-error-log-sweep-phase2a-20261018` |
| Governing text | Packet 55 "Remaining phases"; founder phased-sweep decision |
| Boundary | Logging payloads only: 49 call sites across 18 service files. Line shape preserved; no reformatting of unrelated lines. |
| Reviewer action | Diff should contain only the substitution plus one import per file; confirm zero remaining sites in `server/services`. |

## Scope

Inventory at `fe747c9cb`: 72 files carry at least one `console.<level>('msg', error|err)`
site. This phase takes the 18 `server/services` files (49 sites); 54 files
remain for later phases (15 `server/scripts`, 9 `server/_core`, 4 `server/routes`,
2 `server/middleware`, 24 root-level routers/lib).

Files: `agentService`, `commercialTermNoticeScheduler`, `contentBadgeService`,
`developmentService`, `exploreAgencyService`, `exploreAnalyticsService`,
`feedRankingService`, `foundingPartnerContentTracker`,
`googlePlacesApiMonitoring`, `googlePlacesService`, `locationInsightsService`,
`locationPagesService`, `locationResolverService`, `partnerSubscriptionService`,
`priceInsightsService`, `publicLeadCaptureService`,
`savedSearchDeliveryScheduler`, `searchDiscoveryService`.

## Transformation

Per site: `console.<level>(<context>, error|err)` →
`console.<level>(<context>, safeErrorSummary(error|err))`, with
`import { safeErrorSummary } from '../_core/safeError';` inserted after the
last top-level import block. Applied as a line-based codemod (no
`eslint --fix`), so the diff is only the substitution and the import — no
collateral formatting churn. An initial codemod pass dropped the outer closing
parenthesis; it was reverted before any commit and the corrected pass verified
by a paren-balance check across all 18 files.

## Validation

- Leftover grep in the slice (excluding `safeErrorSummary`): 0 sites.
- Paren-balance check across all 18 files: balanced.
- `pnpm exec eslint` on changed files: 0 errors (pre-existing warning classes only, including prettier wrap suggestions on newly lengthened lines).
- `pnpm run typecheck`: 290 pre-existing errors, none in the 18 touched files
  (the six slice-name hits are `.example.ts`/`.backup.ts` baseline noise).
- Related suites (12 files: development, explore, places, location pages,
  lead capture, saved-search delivery, search discovery, badges, commercial
  terms): 128 passed, 2 pre-existing skips (plus one skipped suite).
- Two source-text authority contracts asserted the exact raw form and were
  updated to the summarized form (`contract.feed-ranking-authority.test.ts`,
  `contract.price-insights-authority.test.ts`); intent unchanged — errors must
  still be logged with context, never swallowed. Both pass.

## Remaining phases

- Phase 2b: root-level routers and `server/lib` (~24 files) plus `server/routes`
  (4) and `server/middleware` (2).
- Phase 2c: `server/_core` (9) and `server/scripts` (15).
- Second-argument selector joins the ESLint guard once the inventory is zero.

## Register effect

None.
