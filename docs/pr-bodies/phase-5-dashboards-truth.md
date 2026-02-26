## What was broken (symptom)

Pilot dashboards contained mock/hardcoded KPI values shown as real metrics, creating trust risk during commercialization.

## Root cause (file + function)

- `client/src/pages/agent/AgentEarnings.tsx` (hardcoded wallet/commission data and mock tables)
- `client/src/pages/admin/OverviewPage.tsx` (hardcoded trend values like `+12%`)
- `client/src/components/developer/AnalyticsPanel.tsx` (mock traffic chart and hardcoded response metric)
- `client/src/pages/AgencyDashboard.tsx` + agency child components (fallback zeros passed as real data)
- `client/src/pages/distribution/DistributionManagerDashboard.tsx` (count cards showed implicit values during loading/error)

## Fix implemented

- Added shared truth-state renderer:
  - `client/src/components/dashboard/KpiValue.tsx`
- Replaced mock KPI surfaces with:
  - real query-backed values, or
  - explicit `Coming soon` / unavailable rendering.
- Reworked Agent Earnings to query `trpc.agent.getMyCommissions` and `trpc.agent.getMyLeads` instead of hardcoded arrays.
- Documented KPI inventory/classification:
  - `docs/DASHBOARD_TRUTH_AUDIT.md`
- Added Pilot RC report:
  - `docs/PILOT_RC_REPORT.md`

## Merge discipline

- Branch: `hardening/phase-5-dashboards-truth`
- Target: `hardening/phase-4-5-repo-stabilization`
- Merge-base confirmation: `merge-base(phase-4.5, phase-5) = c036224`
- Key commits:
  - `f4c0df0` (dashboard truthing + Node baseline alignment)
  - Follow-up docs commits on this branch (`bf5c70f`, `aeb0f5d`, `7693a48`)

## CI / Node baseline note

- CI now uses `.nvmrc` as source of truth:
  - `.github/workflows/ci.yml` uses `node-version-file: '.nvmrc'`
- Added:
  - `.nvmrc` (`22`)
  - `docs/DEV_ENV.md`

## Verification steps

- `pnpm check` -> PASS
- `pnpm build` -> PASS
- `pnpm vitest run --silent server/__tests__/smoke.health.test.ts server/__tests__/smoke.superadmin-publishing.test.ts server/services/__tests__/publicLeadCaptureService.routing.test.ts server/__tests__/listingRouter.getLeadsAccess.test.ts server/__tests__/distributionRouter.transactionBoundaries.test.ts client/src/components/dashboard/__tests__/KpiValue.test.tsx` -> PASS (`6` files, `21` tests)

## Regression coverage added

- `client/src/components/dashboard/__tests__/KpiValue.test.tsx`

## Risks

- Live staging walkthrough still required to validate environment-specific behavior (auth routing, cache behavior, tenant data edge cases).
