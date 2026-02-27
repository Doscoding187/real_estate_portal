# Pilot Release Candidate Report

Date: 2026-02-26

## 0) Release Notes and Risk

### Material user-facing changes

- Distribution/deal/commission transitions now run with atomic transaction boundaries (prevents partial financial state writes).
- Repository compile and Explore module restoration fixes remove Phase 4.5 blockers (`pnpm check`/build stability).
- Pilot-critical dashboards now render truthful KPIs only (real data or explicit `Coming soon`/unavailable states).
- CI runtime now uses `.nvmrc` (`22`) as source of truth for Node setup.

### Top 3 risk areas

1. Live staging environment drift (env vars, auth providers, DB data shape) versus local test setup.
2. Role and permission edge cases in real tenant data across agent/agency/distribution contexts.
3. Performance and caching behavior under real pilot traffic (not fully represented in focused smoke tests).

### Rollback plan

- Revert Phase 5 changes by reverting commits `bf5c70f` and `f4c0df0` if dashboard truthing introduces regressions.
- Revert Phase 4.5 stabilization by reverting `c036224` if compile/runtime behavior regresses unexpectedly.
- Revert Phase 4 transaction hardening by reverting `504243b` only if a critical production regression is proven.
- Safe baseline for this RC stack: commit `e6eab7d` (pre-Phase-4 tip).

## 1) Merge Order and Branch Integrity

Required merge order:

1. `hardening/phase-4-transactions`
2. `hardening/phase-4-5-repo-stabilization`
3. `hardening/phase-5-dashboards-truth`

Current branch tips:

- `hardening/phase-4-transactions` -> `504243b` (`fix: wrap distribution state transitions in atomic transactions`)
- `hardening/phase-4-5-repo-stabilization` -> `c036224` (`stabilize: restore explore compile modules and clear typecheck blockers`)
- `hardening/phase-5-dashboards-truth` -> includes `f4c0df0` plus documentation follow-up commits

Merge-base confirmation:

- `merge-base(phase-4, phase-4.5) = 504243b`
- `merge-base(phase-4.5, phase-5) = c036224`
- `phase-5` is already directly on top of `phase-4.5` (no additional rebase required after Phase 4 + 4.5 merge).

## 2) Node 22 Enforcement

Enforcement status:

- `.nvmrc` added with `22`.
- `docs/DEV_ENV.md` added with local and CI guidance.
- CI updated to use `.nvmrc` directly:
  - `.github/workflows/ci.yml` now uses `actions/setup-node@v4` with `node-version-file: '.nvmrc'` in all jobs.

## 3) Validation Evidence

Commands run on `hardening/phase-5-dashboards-truth`:

- `pnpm check` -> PASS
- `pnpm build` -> PASS
- `pnpm vitest run --silent server/__tests__/smoke.health.test.ts server/__tests__/smoke.superadmin-publishing.test.ts server/services/__tests__/publicLeadCaptureService.routing.test.ts server/__tests__/listingRouter.getLeadsAccess.test.ts server/__tests__/distributionRouter.transactionBoundaries.test.ts client/src/components/dashboard/__tests__/KpiValue.test.tsx` -> PASS (`6` files, `21` tests)

## 4) Staging Smoke Workflow Mapping

Pilot workflow checklist and current evidence:

| Step | Evidence | Status |
| --- | --- | --- |
| Listing creation flow | `server/__tests__/smoke.superadmin-publishing.test.ts` (brand/development create/fetch smoke) | Partial automated coverage |
| Lead capture owner resolution | `server/services/__tests__/publicLeadCaptureService.routing.test.ts` | Automated coverage |
| Listing leads scoping/inbox access | `server/__tests__/listingRouter.getLeadsAccess.test.ts` | Automated coverage |
| Deal stage and commission transactional safety | `server/__tests__/distributionRouter.transactionBoundaries.test.ts` | Automated coverage |
| Dashboard truth-state rendering | `client/src/components/dashboard/__tests__/KpiValue.test.tsx` + Phase 5 code audit | Automated coverage |

Manual staging run still required for full operational SOP:

- listing creation (agent + agency-managed)
- live lead capture
- inbox owner verification
- listing lead visibility in UI and dashboard
- stage transition + commission status transition in live environment
- log/audit verification in staging runtime

### Staging execution log (to fill during live run)

- Staging URL: `TBD`
- Build/version identifier: `hardening/phase-5-dashboards-truth@HEAD`
- Timestamp (UTC): `2026-02-26T00:00:00Z` (update during run)

Checklist run log:

- [ ] Create listing (agent-managed)
- [ ] Create listing (agency-managed)
- [ ] Capture lead and verify deterministic inbox owner
- [ ] Verify listing lead visibility in listing detail + inbox + relevant dashboard
- [ ] Advance deal stage and validate timeline/event write
- [ ] Update commission status and validate transactionally consistent state
- [ ] Verify logs/audit rows for lead routing, stage transition, commission updates
- [ ] Note any anomalies with screenshots/short notes

## 5) PR Readiness

PRs should be opened in this order:

1. Phase 4 PR from `hardening/phase-4-transactions` (`504243b`)
2. Phase 4.5 PR from `hardening/phase-4-5-repo-stabilization` (`c036224`)
3. Phase 5 PR from `hardening/phase-5-dashboards-truth` (`f4c0df0` + docs updates)

Repository is ready for Pilot RC review with the above ordering.

## 6) Staging API Wiring Unblock (2026-02-27)

Branch scope:

- `hardening/staging-seed-auth-unblock`
- Validation-only infra wiring and secret hygiene (no feature additions)

### Phase 0) Backend Target Confirmation

Health probes (Node `fetch`) against Railway candidates:

```text
GET https://realestateportal-staging.up.railway.app/api/health -> 502 {"status":"error","code":502,"message":"Application failed to respond",...}
GET https://realestateportal-production-8e32.up.railway.app/api/health -> 200 {"ok":true,"env":"production","db":{"ok":true},"cache":{"ok":true,"mode":"memory"},"s3":{"ok":true}}
```

Selected backend for Preview `/api/*` proxy unblock:

- `https://realestateportal-production-8e32.up.railway.app` (currently reachable)

### Phase 1) Vercel Preview 405 Fix

Root-cause confirmed:

- Preview was frontend-only with SPA catch-all, no `/api/*` proxy in `vercel.json`.
- `POST /api/auth/login` on Preview returned `405`.

Fix committed:

- `bfd268f` (`chore: wire preview api proxy and remove vercel env file`)
- `vercel.json` now routes `/api/(.*)` to Railway before SPA fallback.

### Phase 2) Preview Validation Evidence (post-redeploy)

Deployment:

```text
commit: bfd268f595a47f99c936a9b8ec5f7dba46e27167
Vercel status: success
deployment: https://vercel.com/edwards-projects-29c395d1/real-estate-portal/H3N4atzTS1ATewzbpm4Hc6KsU7tV
preview: https://real-estate-portal-h7v9ewutp-edwards-projects-29c395d1.vercel.app
```

Preview endpoint checks (with protection bypass header):

```text
GET  https://real-estate-portal-h7v9ewutp-edwards-projects-29c395d1.vercel.app/api/health
-> 200 application/json
-> {"ok":true,"env":"production","db":{"ok":true},"cache":{"ok":true,"mode":"memory"},"s3":{"ok":true}}

POST https://real-estate-portal-h7v9ewutp-edwards-projects-29c395d1.vercel.app/api/auth/login
-> 401 application/json
-> {"error":"Invalid email or password"}
```

Outcome:

- 405s on Preview `/api/*` are removed.
- API requests now hit backend JSON handlers (expected 200/401 behavior).

### Phase 3) Preview Env State Check

Bundle inspection evidence:

```text
preview JS contains: realestateportal-staging.up.railway.app = true
preview JS contains: realestateportal-production-8e32.up.railway.app = false
```

Implication:

- `VITE_API_URL` in current Preview build appears to point to staging host.
- Staging host health is currently 502, so app-side absolute API calls may still fail even though same-origin `/api/*` proxy now works.

### Phase 4) Security Cleanup

Completed:

- Removed tracked `/.env.vercel` from repository.
- Added `.env.vercel` to `.gitignore`.

Action still required:

- Rotate previously exposed credentials/tokens.

### Phase 5) Infra Auth + Seed + SOP

Current blocker evidence:

```text
vercel whoami -> No existing credentials found
railway whoami -> Unauthorized
railway status -> Unauthorized
DATABASE_URL_NOT_SET
```

Status:

- Cannot run `pnpm seed:staging:accounts` against staging DB from this environment yet.
- Cannot execute full role-login SOP until infra auth and staging DB access are restored.

## 7) Updated Gate Status

| Validation Item | Result | Evidence |
| --- | --- | --- |
| Preview `/api/*` routing no longer returns 405 | PASS | `/api/health`=200 JSON, `/api/auth/login`=401 JSON |
| Vercel preview redeploy after wiring change | PASS | commit `bfd268f`, Vercel success |
| `.env.vercel` removed from tracked source | PASS | file deleted + `.gitignore` updated |
| Railway staging backend health (`realestateportal-staging`) | FAIL | returns 502 |
| Vercel CLI auth in execution environment | BLOCKED | `vercel whoami` no credentials |
| Railway CLI auth in execution environment | BLOCKED | `railway whoami/status` unauthorized |
| Staging DB seed execution | BLOCKED | missing auth + `DATABASE_URL` |
| Full staging SOP (role logins + flows) | BLOCKED | depends on seed + backend/env access |

## 8) Go / No-Go (Post API Wiring)

- Decision: **NO-GO**
- Rationale:
  - API 405 routing blocker is fixed.
  - Remaining blockers are environment-level: staging backend 502, missing infra auth, unavailable staging DB credentials, and incomplete SOP evidence.

## 9) Infra Auth Recovery Attempt (2026-02-27)

Command evidence from this execution environment:

```text
vercel logout
-> NOTE: Not currently logged in

vercel login
-> device code shown
-> waits for interactive confirmation
-> timed out in this non-interactive agent session

vercel whoami
-> Error: No existing credentials found
```

```text
railway logout
-> Logged out successfully

railway login
-> Cannot login in non-interactive mode

railway login --browserless
-> Cannot login in non-interactive mode

railway whoami
-> Unauthorized
railway status
-> Unauthorized
```

Implication:

- CLI-driven staging env inspection (`DATABASE_URL`, service logs, migration status) is blocked until credentials are provided via:
  - interactive login in a user-attended session, or
  - pre-provisioned `VERCEL_TOKEN` / `RAILWAY_TOKEN` in the execution environment.

## 10) Preview+Prod Validation Pass (No Staging/Seed) - 2026-02-27

Scope constraints for this pass:

- Validation-only.
- No staging seed execution.
- No infra auth attempts.
- No feature work.

Validation target:

- Preview URL: `https://real-estate-portal-h7v9ewutp-edwards-projects-29c395d1.vercel.app`
- Bypass header: `x-vercel-protection-bypass` (configured secret)
- Backend target intent: production Railway

### 10.1 Build Artifact Host Verification (Mixed-Target Check)

Evidence from live Preview bundle inspection (`/assets/index-Cq_2q91e.js`):

```text
FILES_WITH_STAGING=1
STAGING_REF=/assets/index-Cq_2q91e.js
FILES_WITH_PROD=0

VITE_API_URL:"https://realestateportal-staging.up.railway.app"
VITE_DEPLOY_ENV:"staging"
[tRPC] URL = https://realestateportal-staging.up.railway.app/api/trpc
```

Result:

- Preview bundle is **not clean** for Preview+Prod.
- Mixed-target risk remains: app-side calls can still target staging host directly.

### 10.2 Safe Preview+Prod SOP Checks (Read-only / Minimal Risk)

Executed checks:

```text
PREVIEW_ROOT                       -> 200 text/html
PREVIEW_EXPLORE_ROUTE              -> 200 text/html
PREVIEW_LISTING_SEARCH_ROUTE       -> 200 text/html

API_HEALTH                         -> 200 application/json
                                   -> {"ok":true,"env":"production",...}

API_AUTH_LOGIN_INVALID             -> 401 application/json
                                   -> {"error":"Invalid email or password"}

API_EXPLORE_FEED                   -> 500 application/json
                                   -> {"error":"Failed to fetch feed"}

API_EXPLORE_BY_AREA                -> 500 application/json
                                   -> {"error":"Failed to fetch feed"}

API_EXPLORE_HIGHLIGHT_TAGS         -> 200 application/json
                                   -> {"tags":[]}

API_EXPLORE_BY_CATEGORY            -> 501 application/json
                                   -> {"error":"Not implemented","message":"Category feed is not available yet."}
```

Intentional non-execution:

- Contact/lead submission actions were skipped to avoid unintended production writes or notification spam.

### 10.3 Issue Classification (Topology Inventory)

| Finding | Class | Notes |
| --- | --- | --- |
| Preview bundle still embeds staging host for API/TRPC | A) Preview config regression | Bundle/env drift from intended Preview+Prod target |
| `/api/explore` and `/api/explore/by-area` return 500 via Preview proxy | B) Backend production behavior | Read-path instability for pilot discovery flows |
| `/api/explore/by-category` returns 501 | C) Feature/logic limitation (known) | Explicitly not implemented; expected but must be acknowledged |

## 11) Preview+Prod Gate Decision

- Decision: **NO-GO**
- Reason:
  - Preview is not fully aligned to a single backend target (mixed-target risk persists in compiled bundle).
  - Core read flows for Explore return server errors (`500`) under Preview+Prod checks.
  - Staging remains unavailable (`502`) and staging seed/SOP remains a separate blocked gate.

## 12) Required Next Unblock Before Pilot Gate Re-check

1. Redeploy Preview with compiled env proving:
   - `VITE_API_URL` points to the same intended backend as `/api/*` proxy target.
   - `VITE_DEPLOY_ENV` matches that topology (no guard mismatch).
2. Re-run Preview bundle host scan:
   - no staging host references in active runtime API target paths.
3. Resolve production backend 500s for read-only Explore feed endpoints or explicitly remove those flows from pilot scope.
4. Keep staging seed/SOP as a separate gate once Railway staging health and auth are restored.

## 13) Fresh Preview Re-Validation (After Env + Proxy Alignment) - 2026-02-27

Fresh deployment trigger:

```text
commit pushed: cb818a3e320b6af758761dd5b27600616695da4d
Vercel deployment id: 5nkedCvMp3J7AnSVP9Hv9QVwAFGw
Vercel status: success
Preview URL: https://real-estate-portal-git-hardeni-d1ab93-edwards-projects-29c395d1.vercel.app
```

### 13.1 Preview API checks (same-origin through proxy)

```text
GET  /api/health                         -> 200 JSON {"ok":true,"env":"production",...}
POST /api/auth/login (invalid creds)     -> 401 JSON {"error":"Invalid email or password"}
GET  /api/explore?limit=3&offset=0       -> 500 JSON {"error":"Failed to fetch feed"}
GET  /api/explore/by-area?...            -> 500 JSON {"error":"Failed to fetch feed"}
GET  /api/explore/highlight-tags         -> 200 JSON {"tags":[]}
GET  /api/explore/by-category            -> 501 JSON {"error":"Not implemented",...}
```

### 13.2 Direct absolute API checks (`https://api.propertylistifysa.co.za`)

```text
GET  https://api.propertylistifysa.co.za/api/health                     -> 200 JSON
POST https://api.propertylistifysa.co.za/api/auth/login (invalid creds) -> 401 JSON
GET  https://api.propertylistifysa.co.za/api/explore?...                -> 500 JSON
GET  https://api.propertylistifysa.co.za/api/explore/by-area?...        -> 500 JSON
```

Interpretation:

- Proxy and absolute host now converge on the same backend behavior.
- Remaining `/api/explore*` 500s are backend-side behavior, not preview routing.

### 13.3 Compiled bundle scan (new artifact)

```text
present: VITE_API_URL:"https://api.propertylistifysa.co.za"
present: VITE_DEPLOY_ENV:"preview"
present: [tRPC] URL -> https://api.propertylistifysa.co.za/api/trpc
absent:  VITE_DEPLOY_ENV:"staging"
present: realestateportal-staging.up.railway.app (from static env host allowlist constants)
```

Interpretation:

- Active runtime target is aligned to `api.propertylistifysa.co.za`.
- `staging` deploy env marker is removed from active build config.
- Staging host string is still present in compiled constants (`BACKEND_HOSTS`) as static allowlist metadata.

## 14) Updated Gate Decision (Post Fresh Build)

- Decision: **NO-GO**
- Current blockers:
  1. `GET /api/explore` and `GET /api/explore/by-area` return `500` on the aligned production API host.
  2. If strict artifact policy requires zero staging-host string presence, `BACKEND_HOSTS` constants must be adjusted for preview policy.
- Cleared blockers:
  1. Preview `/api/*` routing no longer returns `405`.
  2. Preview env now resolves active API calls to `https://api.propertylistifysa.co.za`.

## 15) Explore 500 Root-Cause Track (Backend-Only, Minimal Patch) - 2026-02-27

Scope:

- No staging seed.
- No infra auth dependency.
- No feature additions.
- Backend resiliency patch only for `/api/explore` and `/api/explore/by-area` failure mode.

### 15.1 Reproduction Against Production API Host

```text
GET https://api.propertylistifysa.co.za/api/explore?limit=3&offset=0
-> 500 {"error":"Failed to fetch feed"}
-> x-request-id: 01d2c0d9-b5d9-4f4a-96a3-570558ef39ae

GET https://api.propertylistifysa.co.za/api/explore/by-area?location=Sandton&limit=2&offset=0
-> 500 {"error":"Failed to fetch feed"}
-> x-request-id: ba8e3fee-fd97-49cb-a6ef-72bb43569779
```

### 15.2 Root Cause Classification

Classification: **DB/query-path throw bubbling to route-level 500** in `exploreFeedService`.

Evidence basis:

- Both failing endpoints share `exploreFeedService` query paths:
  - `getRecommendedFeed`
  - `getAreaFeed`
- Existing route handlers convert thrown service errors to generic `500` (`{"error":"Failed to fetch feed"}`).
- No environment/proxy mismatch remains for active target host in this phase.

### 15.3 Minimal Safe Fix Implemented

Files changed:

- `server/services/exploreFeedService.ts`
- `server/services/__tests__/exploreFeedService.fallback.test.ts`

Behavioral change:

- Added defensive `try/catch` around query execution in:
  - `getRecommendedFeed`
  - `getAreaFeed`
- On query failure, service now:
  - logs structured error details,
  - returns deterministic empty feed (`200`-shape payload),
  - sets metadata flags:
    - `degraded: true`
    - `fallbackReason: "query_error"`

Result:

- Prevents hard 500 for read-feed endpoints when underlying data/query path fails.
- Preserves endpoint contract with safe empty-state response.

### 15.4 Regression Coverage Added

New focused test file:

- `server/services/__tests__/exploreFeedService.fallback.test.ts`

Added tests:

1. Recommended feed returns empty fallback when DB query throws.
2. Area feed returns empty fallback when DB query throws.

### 15.5 Verification Evidence (Local)

```text
pnpm check
-> PASS

pnpm vitest run --silent server/services/__tests__/exploreFeedService.fallback.test.ts
-> PASS (1 file, 2 tests)
```

### 15.6 Deployment Recheck Requirement

This patch is validated locally only in this report section.

Post-deploy checks required to close this blocker:

```text
GET  /api/explore                    -> 200 JSON (items may be empty)
GET  /api/explore/by-area?...        -> 200 JSON (items may be empty)
```

If both return 200 post-deploy, Explore read-path blocker can be downgraded from hard NO-GO.

## 16) Deployment Proof Hardening (`/api/health` Build Stamp) - 2026-02-27

Objective:

- Remove deployment ambiguity by exposing a backend build identifier on live health checks.

Implemented:

- `server/_core/health.ts`
  - Added `build.sha` in JSON response (derived from `RAILWAY_GIT_COMMIT_SHA`, `VERCEL_GIT_COMMIT_SHA`, `GITHUB_SHA`, or `SOURCE_VERSION`).
  - Added `build.builtAt` field (optional metadata).
  - Added response header: `x-build-sha`.
- `server/__tests__/smoke.health.test.ts`
  - Asserts `payload.build.sha` and `x-build-sha` header.

Verification (local):

```text
pnpm vitest run --silent server/__tests__/smoke.health.test.ts server/services/__tests__/exploreFeedService.fallback.test.ts
-> PASS (2 files, 3 tests)

pnpm check
-> PASS
```

Post-deploy proof step:

```text
GET https://api.propertylistifysa.co.za/api/health
Expected:
- status: 200
- header x-build-sha = deployed commit SHA
- payload.build.sha = deployed commit SHA
```

Current status:

- Deployment proof mechanism is implemented in code.
- Live verification against `api.propertylistifysa.co.za` still requires deployment of this branch tip.

## 17) Report Path Clarification

There are two report files because there are two separate worktrees:

- `C:\\dev\\real_estate_portal\\.worktrees\\hardening-phase0\\docs\\PILOT_RC_REPORT.md`
- `C:\\dev\\real_estate_portal\\.worktrees\\hardening-staging-auth\\docs\\PILOT_RC_REPORT.md`

Canonical RC report for active unblock track:

- `hardening-staging-auth/docs/PILOT_RC_REPORT.md`
