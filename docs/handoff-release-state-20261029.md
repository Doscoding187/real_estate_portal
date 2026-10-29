# Release state handoff — 2026-10-29

Read-only update after Production deployment `0b7ae664e3d0748bfab2b571c9488b4abf174eb2`. No deploy, merge, settings change, or database access/write was performed.

## PRs and maintenance mode

- **#706:** merged; Land canonical Place assignment is present, while Land remains deferred behind its launch-state guard. Do not enable the launch flag as part of unrelated work.
- **#707:** last founder decision was to hold it; verify current PR state before acting. Sale/Rent guide must not roll child listings into parent search.
- **#708:** merged to `main` as `0b7ae664`; Production deployment is `READY`. Deployment summary detects one Routing Middleware bundle.
- Founder/browser report: the client-side `MaintenancePage` works for open tabs. Code shows `MaintenancePage` sets Helmet `robots=noindex, nofollow, noarchive`; `ApiAvailabilityBoundary` unmounts it on recovery, removing its Helmet entry.
- Public HTML GET: apex redirected `307`, final page returned `200`, `x-vercel-cache: HIT`, and `x-vercel-id`; no `x-maintenance-gate`, `Retry-After`, or `X-Robots-Tag`, and no edge `503` observed.
- Middleware is detected, but no invocation/result for `/` was available. Deployment logs show the Edge runtime deprecation warning; no `@vercel/functions` build error was found. Runtime error summary had no errors; the 1-hour log query was rejected for Hobby retention, the 30-minute query had no function logs, and observability query returned `400`. Treat invocation count/outcome as unknown, not zero.
- Production envs read by Vercel: `VITE_API_URL=https://api.propertylistifysa.co.za`, `VITE_DEPLOY_ENV=production`; no Production `PUBLIC_API_ORIGIN`. The configured Ignored Build Step, Production Branch setting, and “Automatically expose System Environment Variables” setting were not returned; deployment source branch was `main`. No settings were changed.
- Open, unproven edge-gate hypotheses: legacy `vercel.ts` route configuration/order; deprecated Edge runtime; cache behavior (`x-vercel-cache: HIT`). System exposure of `VERCEL_ENV` is also unconfirmed; the middleware production gate depends on `VERCEL_ENV=production`.

## Blockers and next steps

- **B08 — OPEN, Azure DB admission:** reconcile the fresh Azure MySQL schema/migration head and canonical Place data plan; prepare a fresh protected plan for independent review. Apply and verify only under a separate explicit approval. Do not use the stale plan as approval.
- **B09 — OPEN, TiDB retirement/archive:** stop/freeze legacy writers, create and independently verify the final archive and recovery custody, then invalidate old sessions. Do not import legacy business/account rows.
- **B12 — OPEN, hosted runtime:** after Railway payment/restoration, verify API/worker artifacts, Azure schema and readiness, TLS/origins/cookies/Redis, and buyer/agent flows. Load Place tables only through the approved B08 sequence; run listing/search smoke checks before a separately approved release.
- DB evidence last recorded in repo: migration head `0096_user_founder_authority_unique.sql`; current `main` expects `0197_drop_seller_prospects_province.sql`. This gap is not live-verified; resolve under B08 before a DB release.
- Stale TiDB current-state claims to reconcile: `docs/b12-hosted-runtime-contract.md`, `docs/architecture/launch-readiness-and-product-convergence/03-launch-register.md` (B12 row), and `docs/search-discovery-engine.md`. Treat dated archive/transition records as history, not instructions to restore TiDB as a writer.
- **No release action is authorized by this handoff.** Recheck Railway and Vercel state when the founder resumes B08/B09/B12.
