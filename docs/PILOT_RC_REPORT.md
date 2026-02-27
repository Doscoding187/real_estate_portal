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
