# 61 — First-Customer Journey Dry-Run (Consumer Lane)

**Date:** 2026-10-18
**Worktree:** `worktrees/property-listify-journey-audit-20261018` (branch
`audit/journey-audit-20261018`, base `origin/main` = `769007486`)
**Type:** Local audit record. No product code, schema, migration, or register
change in this packet.

## Purpose

The launch-resume queue (B08–B18, mailboxes, storage binding, B17 window)
waits on the hosted environment. The recommended non-blocked work is
first-customer journey dry-runs. This packet records the first dry-run: a real
(un-mocked) consumer journey executed against canonical data on a governed
disposable database, plus the environment and test-suite findings discovered
while doing it.

## Environment

The founder's live preview (`property-listify-distribution-referrer-opportunity-discovery-20261018`,
frontend 3009, backend 5000) was used first and is left untouched. It cannot
execute a data-backed search journey: its disposable worktree database carries
schema but no canonical reference data, so `location.searchLocations` returns
`[]` for every query and the hero search shows `No locations found`.

For the dry-run, the audit worktree was provisioned through the documented
local sequence (`docs/local-development-setup.md`) on its own owned disposable
target:

```
pnpm db:authority:status
pnpm db:authority:manifest            # expectedHead 0115_non_geographic_place_search_eligibility.sql
pnpm db:authority:service:start / :wait / :status
pnpm db:worktree:create               # listify_wt_journey_audit_20261018_10d7385ee56e
pnpm db:migrate:plan / :apply -- --accepted-old-head=none --expected-new-head=0115_...
pnpm db:schema:congruency             # congruent
pnpm db:reference:prepare / :verify   # 1414 rows, 1089 suburbs
pnpm db:foundation:prepare / :verify  # Launch Access plan
pnpm db:scenario:prepare              # property 990001, listings 990007-990009, development 990001
NODE_ENV=test APP_ENV=test pnpm db:scenario:verify   # test-runtime guard
pnpm db:readiness -- --purpose=database              # ready
pnpm db:readiness -- --purpose=location-discovery    # ready
```

Integrated stack (same shape Playwright uses), on a non-conflicting port:

```
SKIP_FRONTEND=false PORT=5010 pnpm exec tsx watch server/_core/start.ts
```

**Constraint discovered:** the browser client resolves its API base from
`VITE_API_URL` supplied by the machine-local environment
(`~/.config/property-listify/local.env`, value `http://localhost:5000`), and
that file is contractual and must not be edited. Vite serves it from
`.env.local`, so an alternate-port preview cannot retarget the client by
process env alone. The audit therefore shimmed `localhost:5000` API calls to
`localhost:5010` inside Playwright (`route.fulfill` against
`context.request.fetch`, which also bypasses the backend's absent CORS
headers for that origin). No configuration or environment file was changed.

## Journey executed

Real data, no API mocking, Desktop 1440×900 and Mobile 390×844:

| Step | Result |
| --- | --- |
| Home → Buy → type `Sandton` | 4 suggestions (canonical catalog) |
| Select suburb suggestion | `suburb:1`, canonical path `/gauteng/johannesburg/sandton` |
| Submit hero search | `/property-for-sale?locationId=suburb%3A1&...&suburb=sandton` |
| Results page | "1 verified listing", scenario listing card rendered |
| Open detail `/property/990003` | photos, price, buyer checks, listed-by, enquiry controls |
| Send enquiry form → submit | `Enquiry received` confirmation + toast |

Console errors 0, page errors 0, HTTP 4xx/5xx 0 in both viewports. The only
failed request was a Google Static Maps image (`ERR_BLOCKED_BY_ORB`) because
the local Google key has no billing — see F5.

Supporting lane: `e2e/provincial-discovery.spec.ts` passed **21/21** against
the founder's preview, confirming province-level discovery behaviour (including
the no-reference-coverage unavailability contract).

## Findings

**F1 — Preview database has no canonical reference data (environment, medium).**
Any worktree preview shows an unusable hero location search until
`db:reference:prepare` runs for that worktree's disposable target. The founder's
active preview is in this state now. The fix is one governed sequence (above);
no product defect.

**F2 — Mobile results page shows two visible "Filters" buttons (UX, medium).**
On 390px the results header control and the fixed bottom action bar both render
a button labelled exactly `Filters`; both are visible simultaneously
(verified via `isVisible()` and bounding boxes). The paired e2e locator now
hits strict-mode ambiguity. Recommend one affordance, or distinct labels.

**F3 — ~154px dead space above results on mobile (layout, low/medium).**
Between the header and the breadcrumb row, the SRP container carries `pt-44`
(11rem) on small viewports (`md:pt-24` above 768px). On mobile this renders
~154px of empty space with no element inside it. Verify against header
clearance intent and reduce if the header is not fixed.

**F4 — Playwright specs have drifted from the shipped contracts (test debt, high confidence impact).**
No CI workflow runs Playwright, so drift accumulated silently:
- `e2e/routing/search-routing.spec.ts` (Jan 2026) expects
  `/property-for-sale/{province}` SEO pages; routing moved to validated neutral
  geography (`/{province}`) in Aug 2026 (`eade5bd1c`). 11/11 fail.
- `e2e/routing/seo-guardrails.spec.ts`, `nav-seo-architecture.spec.ts` encode
  the same superseded URL family.
- `e2e/buy/buy-journey.fixture.spec.ts` (Aug 2026) predates the intentional
  `HomeAreaPicker` clarification flow for broad city selections (blocking the
  desktop path) and the mobile dual-Filters reality (F2). The underlying
  product journey passes when the flow is followed.
- `e2e/prospect/prospect-journey.spec.ts` and
  `e2e/consumer-activity/persistence.spec.ts` correctly refuse to run against a
  shared database ("requires its exact disposable database" /
  "test-fixture is not allowed for clean-main-local"); they are usable only
  with a dedicated test-runtime target.

Recommendation: one bounded test-debt pass to reconcile or retire the stale
routing/buy specs and wire a local e2e lane (even if not CI-blocking).

**F5 — Local Google key lacks billing (environment, low).** Static map imagery
is blocked locally (`BillingNotEnabledMapError`); cosmetic for dry-runs, but it
affects local visual review of map surfaces.

## Audiences not covered in this pass

Agent / agency / developer paid acceptance suites (`e2e/b04`, `b05`, `b06`,
`ple`) drive `http://localhost:5000` directly and create their own fixtures
through Database Authority on a test-runtime target; they were not run here to
avoid touching the founder's preview backend and database. They remain the
governed acceptance path for those journeys.

## Evidence

- `/tmp/opencode/journey-real/` — desktop screenshots `01-home` … `10-enquiry-confirmation`,
  `report.json` (steps, console errors, failed requests).
- `/tmp/opencode/journey-mobile/` — mobile screenshots, `report.json`
  (overflow 0px, dual Filters evidence).
- `/tmp/opencode/buy-desktop-run.log`, `/tmp/opencode/buy-mobile-run.log`,
  `/tmp/opencode/consumer-run.log` — stale-spec triage logs.
- Reproduction config: `playwright.audit.config.ts` (system Chrome, no
  webServer management, BASE_URL override).
