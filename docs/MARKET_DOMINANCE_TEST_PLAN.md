# Market Dominance Test Plan

## Objective
Validate the full dominance stack before broad rollout:
- funnel correctness
- monetization delivery correctness
- KPI and rollup reliability
- performance under load
- attribution and reconciliation integrity

This plan is aligned to:
- `docs/MARKET_DOMINANCE_SPRINT_BOARD_6W.md`
- `docs/MARKET_DOMINANCE_IMPLEMENTATION_BACKLOG.md`

## Test Environments
- `local`: developer validation and fast feedback.
- `staging`: full integration, seeded data, rollout rehearsal.
- `prod-shadow`: read-only/low-risk monitoring validation.

## Entry and Exit Criteria
- Entry:
  - migrations applied for analytics/rollup/monetization tables.
  - baseline test data seeded for roles, subscriptions, and monetization rules.
  - KPI rollup token configured for controlled recompute tests.
- Exit (go-live gate):
  - all critical suites pass.
  - no unresolved P0 defects.
  - KPI reconciliation variance within tolerance.
  - load test SLOs met.

## Suite A: End-to-End Funnel Tests (Critical)
Purpose: ensure agent/developer/private-seller acquisition funnels behave end to end.

### Coverage
- Advertise landing -> `/get-started` routing.
- Role selection branching:
  - Agent: self-serve primary.
  - Developer: strategy path primary.
  - Private seller: self-serve path.
- Strategy booking persistence and state transitions.
- CTA/event instrumentation per step.

### Existing assets
- Visual and component tests in `client/src/components/advertise/__tests__/`.

### Add/expand
- `tests/e2e/dominance/funnel.agent.spec.ts`
- `tests/e2e/dominance/funnel.developer.spec.ts`
- `tests/e2e/dominance/funnel.private-seller.spec.ts`
- `tests/e2e/dominance/strategy-booking.spec.ts`

### Acceptance
- 100% pass on all three role paths.
- no broken route transitions.
- expected tracking events emitted once per user action.

## Suite B: Monetization Delivery and Attribution (Critical)
Purpose: verify sponsored delivery, caps/pacing guardrails, and attribution chain.

### Coverage
- Rule eligibility:
  - status window, schedule, daily cap, total cap, pacing.
- Feed behavior:
  - sponsored share cap
  - non-consecutive sponsored cards
  - highest-ranked rule resolution for same target
- Attribution:
  - serve -> click -> lead linked by `serveRequestId` / request context.
- Simulation:
  - expected vs actual outputs
  - config-loss interpretation.

### Existing assets
- `server/services/__tests__/monetization.smoke.test.ts`
- `server/services/__tests__/feedGeneration.smoke.test.ts`
- `server/services/__tests__/exploreFeedService.test.ts`

### Add/expand
- `server/services/__tests__/locationMonetizationService.integration.test.ts`
- `server/services/__tests__/locationMonetizationService.pacing.test.ts`
- `server/services/__tests__/feedRankingService.monetization.test.ts`
- `server/services/__tests__/attributionChain.integration.test.ts`

### Acceptance
- no cap or pacing violations in test scenarios.
- no duplicate sponsored amplification beyond configured limits.
- attribution chain consistency >= 99.5% in test dataset.

## Suite C: KPI Rollup and Reconciliation (Critical)
Purpose: ensure board-level KPIs are mathematically correct and reproducible.

### Coverage
- daily rollup determinism (same inputs, same outputs).
- cohort-correct NRR (new-logo isolation).
- weighted totals correctness (no percentage averaging bias).
- API reconciliation:
  - raw tables -> rollups -> `/api/kpi/v1/summary` and funnel endpoints.
- manual recompute authorization and audit behavior.

### Existing assets
- `server/services/kpiRollupService.ts`
- `server/routes/kpi.ts`
- admin KPI and reconciliation surfaces.

### Add/expand
- `server/services/__tests__/kpiRollupService.reconciliation.test.ts`
- `server/services/__tests__/kpiRollupService.cohort-nrr.test.ts`
- `server/routes/__tests__/kpi.summary.integration.test.ts`
- `server/routes/__tests__/kpi.rollup.auth.test.ts`

### Acceptance
- NRR formula verified against cohort fixtures.
- weighted totals match manual calculation.
- reconciliation variance <= 1% for non-financial counts and 0% for financial rollups.

## Suite D: Analytics Pipeline Integrity (High)
Purpose: confirm ingestion-to-dashboard path is reliable.

### Coverage
- event ingestion persistence and dedupe behavior.
- rollup consumption of ingested events.
- admin dashboard data freshness and latency indicators.
- drop-off and path-choice metrics consistency.

### Existing assets
- `server/routes/analytics.ts`
- `client/src/lib/analytics/advertiseTracking.ts`
- `client/src/pages/admin/RevenueCenterPage.tsx`

### Add/expand
- `server/routes/__tests__/analytics.ingestion.integration.test.ts`
- `server/services/__tests__/dailyFunnelMetrics.rollup.test.ts`
- `client/src/pages/admin/__tests__/RevenueCenterPage.data-integrity.test.tsx`

### Acceptance
- no lost critical events under retry patterns.
- dashboard metrics consistent with API outputs.
- freshness lag within configured tolerance.

## Suite E: Load and Performance (Critical for rollout)
Purpose: validate system behavior under realistic traffic and event volume.

### Focus areas
- concurrent feed requests with monetization rules active.
- concurrent analytics event writes.
- KPI summary endpoint under dashboard polling.
- location monetization query paths under regional traffic spikes.

### Add (new load harness)
- `tests/load/README.md`
- `tests/load/feed-load.js` (k6 or Artillery)
- `tests/load/analytics-ingest-load.js`
- `tests/load/kpi-summary-load.js`

### Baseline SLO targets
- p95 feed response < 500ms (staging target).
- p95 analytics ingest < 250ms.
- KPI summary endpoint p95 < 400ms.
- error rate < 1% under planned peak test.

## Suite F: Regression and Integration (High)
Purpose: prevent breakage while shipping pricing/scarcity features.

### Coverage
- strategy flow persistence + CRM handoff.
- monetization admin updates -> runtime behavior.
- geo targeting/ranking behavior by region.
- role flows and dashboard coherence after pricing changes.

### Existing assets
- broad service/unit/property test library in `server/services/__tests__/`.
- role-protection and admin component tests in `client/src/components/__tests__/`.

### Acceptance
- no regressions in existing smoke and contract suites.
- all changed modules have at least one integration test.

## Execution Schedule (6 Weeks)

### Sprint 1 (Weeks 1-2)
- Execute Suites A, B, C (minimum viable coverage).
- Deliver first green baseline with reconciliation report.
- Block progression if KPI or attribution integrity fails.

### Sprint 2 (Weeks 3-4)
- Expand Suite B for pricing controls and quality scoring.
- Run first load cycle (Suite E) against staging.
- Validate regional pricing experiment safety.

### Sprint 3 (Weeks 5-6)
- Stress scarcity and budget-intelligence paths.
- Run full regression (A-F) before controlled rollout expansion.
- Publish final readiness report and residual risk register.

## Command Runbook (Current)
- Type safety:
  - `pnpm check`
- Dominance server validation suites:
  - `pnpm test:dominance:server`
- KPI + monetization reconciliation report:
  - `pnpm test:dominance:reconcile`
- Aggregated dominance validation report:
  - `pnpm test:dominance:report`
- Optional load validation:
  - `pnpm test:dominance:load -- --base-url http://localhost:5000 --duration-sec 30 --concurrency 20`
- Core tests:
  - `pnpm test`
- Integration tests:
  - `pnpm test:integration`
- Visual/E2E:
  - `pnpm test:visual`
- KPI recompute endpoint validation (authorized):
  - `POST /api/kpi/rollup` with `x-kpi-token`

Generated artifacts:
- `test-results/dominance/reconciliation-report.json`
- `test-results/dominance/validation-report.json`
- `test-results/dominance/validation-report.md`
- `test-results/dominance/load-report.json` (when load suite runs)
- `test-results/dominance/gate-report.json`

CI/CD integration:
- GitHub workflow: `.github/workflows/dominance-validation.yml`
- Trigger cadence:
  - PR validation on relevant code/doc changes
  - merge validation on `main` (push)
  - nightly scheduled run at `02:00 UTC`
- Publishes `dominance-validation-artifacts` for audit and investor reporting.
- Branch protection and required checks:
  - `docs/BRANCH_PROTECTION_ENFORCEMENT.md`

## Weekly KPI Test Review Template
- pass/fail by suite (A-F)
- top 5 failing tests and root cause
- attribution consistency rate
- reconciliation variance trend
- load-test SLO compliance
- release recommendation: go / conditional go / no-go

## Go-Live Readiness Decision
- `GO` only if:
  - Suites A/B/C all pass.
  - no unresolved critical defects.
  - reconciliation and attribution meet thresholds.
  - load SLOs pass in staging.
- otherwise `NO-GO` with explicit blocker list and owner assignment.

## Strict Go / No-Go Merge Gate
- `GO`:
  - `pnpm check` green
  - dominance validation workflow green
  - no critical failures in `validation-report.json`
  - reconciliation variance within tolerance
  - no monetization guardrail breach
- `NO-GO`:
  - attribution inconsistency
  - revenue rollup mismatch
  - unexplained delivery simulation variance
  - p95 latency regression above threshold

## Dominance Forensics
- Track monetization control changes in `dominance_audit_log`.
- Required fields per control change:
  - actor and approver identity
  - validation status at change time
  - before and after state snapshot
