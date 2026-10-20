# PII log minimization in lead capture and engagement paths

18 October 2026. Closed the first bounded pass of the server logging audit
opened after the finance runtime lane closed (packet 51): raw client IPs were
being written to lead-capture logs, the engagement batch path logged
authenticated user and session identifiers before every insert, and several
audited catch blocks logged whole `Error` objects whose message or enumerable
fields can embed submitted user input. The fix is deliberately narrow: no
logger framework is introduced, no database column changes, and the ~690
`console.*` call sites across 115 server files are not swept — only the
audited PII-adjacent sites change.

## Authority and boundary

| Field | Record |
| --- | --- |
| Packet | `PII-LOG-MINIMIZATION-2026-10-18` (launch-readiness packet 52) |
| Base | `main` at `703c2d0b7` (PR #644 merge) |
| Worktree / branch | `property-listify-pii-log-minimization-20261018` / `fix/pii-log-minimization-20261018` |
| Precedent | `server/__tests__/analyticsPayloadMinimization.test.ts` (console capture) and `server/__tests__/contract.public-lead-honeypot.test.ts` (public lead-router seams). |
| Boundary | Server process logging only. No schema, migration, retention or product behavior change; the `exploreEngagements.metadata` store of `userAgent`/`ipAddress` is flagged, not changed. |
| Reviewer action | Re-run the focused suites; confirm the three payload shapes and the redaction contract in `safeErrorSummary`. |

## What was built

| File | Change |
| --- | --- |
| `server/_core/safeError.ts` | New summarizer. Reduces any thrown value to `{ name, message, code?, errno?, sqlState? }`; the message has quoted segments and email-like tokens redacted and is capped at 300 characters. Raw `Error` objects are never logged, so enumerable driver fields such as mysql2 `sql`/`sqlMessage` (which embed submitted values) cannot leak. |
| `server/leadsRouter.ts` | Removed `ip` from all three `logLeadEvent` payloads (`honeypot_trigger`, `rate_limit_trigger`, `lead_accepted`). The IP is still used for rate limiting; only the log line no longer carries it. No name/email/phone was ever logged. |
| `server/services/exploreInteractionService.ts` | `[ENG_INSERT_ATTEMPT]` now logs only `contentId`, `interactionType`, `feedType`, `deviceType` — no `userId`, `sessionId`; `[ENG_INSERT_OK]` unchanged. All six raw-error handlers in the service (record, batch metric update, score update, stats, user history, session history) now log `safeErrorSummary`. |
| `server/db.ts` | `[Database] Failed to upsert user` (duplicate-key messages embed the email value) and `[Database] Failed to create listing` (also dropped the follow-up `error.message` line) now log `safeErrorSummary`; `[updateProperty]` location resolution and `[Listings]` cache-invalidation raw errors summarized as well. |
| `server/services/cacheIntegrationService.ts` | `[Cache] Warm-up failed` raw error summarized. |
| `server/services/locationAnalyticsService.ts` | All four raw-error handlers (search tracking, trending score, trending suburbs, similar locations) summarized. |
| `server/__tests__/piiLogMinimization.test.ts` | Six regression tests: honeypot and accepted lead logs carry identifiers but never the client IP or submitted contact fields; the engagement attempt log equals the minimized object and the serialized log calls contain no user/session/UA/network tokens; `safeErrorSummary` redacts quoted segments and emails, keeps only allowed codes, caps the message at 300, and reduces non-Error throws to a stable shape. |

## Audited evidence

Before the change, on base `703c2d0b7`:

- `server/leadsRouter.ts:76-80` `logLeadEvent` emitted `ip` on all three paths.
- `server/services/exploreInteractionService.ts:75-82` `[ENG_INSERT_ATTEMPT]`
  emitted `userId: null`/number plus the session token for every engagement,
  including a 50-item batch insert.
- Raw `Error` values (not just messages) were logged at
  `server/db.ts:570-572`, `server/db.ts:2371-2377`,
  `server/services/cacheIntegrationService.ts:240`,
  `server/services/locationAnalyticsService.ts:573` and the further sites fixed
  above.

## Flagged, not changed

`server/services/exploreInteractionService.ts:90-98` persists `userAgent` and
`ipAddress` into `exploreEngagements.metadata` for authenticated and anonymous
public `discovery.engage` calls when no session id is presented. This is stored
product data, not a log line, so it is a retention/product decision for Edward
and is left untouched. The `[SCORE_DEBUG]` engagement-score log carries only
numeric identifiers and stays.

## Residue

- No logger library exists; the flagged-audit router claims
  (`cataloguePublisherRouter.ts:235`, `agencyRouter.ts:1505-1507`,
  `distributionRouter.ts:3542-3547`) were not independently verified and are
  not changed.
- Raw error logging remains in the wider server tree outside the audited
  files; a full sweep is a separate bounded task.

## Local validation

- `pnpm exec vitest run --config vitest.server.config.ts` on
  `piiLogMinimization`, `contract.public-lead-honeypot`,
  `analyticsPayloadMinimization`, `exploreInteractionService.contract`,
  `cacheRouter.authorization`, `locationAnalytics.property`: 6 files, 48 tests
  passed.
- ESLint on all seven touched files: 0 errors; no warning on a changed line.
- `pnpm run typecheck`: 290 pre-existing errors, identical count on base
  `703c2d0b7`; zero errors reference a touched file.
- No database, migration or runtime behavior change; only log payloads.

## Register effect

None. This is a server hardening pass; no launch-register row, hosted window or
paid opening is implied. The `exploreEngagements.metadata` retention question
is queued as a founder/product decision.
