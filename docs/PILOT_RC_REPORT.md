# Pilot Release Candidate Report

Date: 2026-02-26

## 1) Merge Order and Branch Integrity

Required merge order:

1. `hardening/phase-4-transactions`
2. `hardening/phase-4-5-repo-stabilization`
3. `hardening/phase-5-dashboards-truth`

Current branch tips:

- `hardening/phase-4-transactions` -> `504243b` (`fix: wrap distribution state transitions in atomic transactions`)
- `hardening/phase-4-5-repo-stabilization` -> `c036224` (`stabilize: restore explore compile modules and clear typecheck blockers`)
- `hardening/phase-5-dashboards-truth` -> `f4c0df0` (`hardening: truth dashboard KPIs and align CI with Node baseline`)

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

## 5) PR Readiness

PRs should be opened in this order:

1. Phase 4 PR from `hardening/phase-4-transactions` (`504243b`)
2. Phase 4.5 PR from `hardening/phase-4-5-repo-stabilization` (`c036224`)
3. Phase 5 PR from `hardening/phase-5-dashboards-truth` (`f4c0df0`)

Repository is ready for Pilot RC review with the above ordering.
