# Market Dominance Implementation Backlog

## Scope
Ticket-level execution backlog mapped to the 6-layer dominance architecture and `P0/P1/P2` priorities.

Operational board companion:
- `docs/MARKET_DOMINANCE_SPRINT_BOARD_6W.md`

Status keys:
- `done`: implemented in codebase
- `in_progress`: partially implemented
- `todo`: not implemented yet

## P0 (Weeks 1-4): Control and Revenue Clarity

| Ticket | Layer | Owner | Status | Output | Primary Modules / Files | Acceptance Gate | Dependencies |
|---|---|---|---|---|---|---|---|
| `P0-1` Demand baseline instrumentation | Data + Economic Intelligence | Backend + Data | `in_progress` | Surface/region/day opportunities, fill-rate, revenue-per-opportunity inputs | `server/services/locationMonetizationService.ts`, `server/monetizationRouter.ts`, `server/migrations/0010_create_opportunities_by_surface_by_day.sql`, `client/src/pages/admin/LocationMonetizationPage.tsx` | Admin shows unused inventory and theoretical ceiling by region; simulation uses demand baseline | None |
| `P0-2` Monetization observability dashboard | Monetization Core | Backend + Admin UI | `in_progress` | Revenue by surface/region, cap exhaustion view, CTR/lead by surface | `client/src/pages/admin/LocationMonetizationPage.tsx`, `client/src/pages/admin/RevenueCenterPage.tsx`, `server/monetizationRouter.ts`, `server/services/locationMonetizationService.ts` | Top under-monetized regions identifiable instantly; day-over-day variance explainable | `P0-1` |
| `P0-3` Attribution integrity hardening | Data + Persistence | Backend | `todo` | Click dedupe, velocity anomaly detection, self-attribution filtering | `server/services/locationMonetizationService.ts`, `server/monetizationRouter.ts`, `server/routes/analytics.ts`, `server/analyticsRouter.ts`, `server/migrations/0011_click_quality_controls.sql` (new) | Duplicate click inflation blocked; suspicious traffic surfaced in admin | `P0-1` |

## P1 (Weeks 5-8): Pricing Power and Scarcity

| Ticket | Layer | Owner | Status | Output | Primary Modules / Files | Acceptance Gate | Dependencies |
|---|---|---|---|---|---|---|---|
| `P1-1` Dynamic pricing controls | Monetization Core | Backend | `todo` | CPM floors by region, CPC multipliers, surge toggle, admin controls | `server/services/locationMonetizationService.ts`, `server/monetizationRouter.ts`, `client/src/pages/admin/LocationMonetizationPage.tsx`, `server/services/pricingControlService.ts` (new), `server/migrations/0012_dynamic_pricing_rules.sql` (new) | One-region floor increase executed safely; pre/post fill-rate and revenue measured | `P0-1`, `P0-2` |
| `P1-2` Performance quality scoring | Market Control | Backend + Ranking | `todo` | Composite rule quality score; organic/paid/quality blending | `server/services/feedRankingService.ts`, `server/services/exploreFeedService.ts`, `server/services/ruleQualityService.ts` (new), `server/migrations/0013_rule_quality_snapshots.sql` (new) | High-quality rules receive measurable uplift; low-quality rules lose exposure | `P1-1` |
| `P1-3` Scarcity mechanics (soft cap) | Market Control | Backend | `todo` | Premium slot limits, tiered exposure, placement-full states | `server/services/locationMonetizationService.ts`, `server/monetizationRouter.ts`, `client/src/pages/admin/LocationMonetizationPage.tsx`, `client/src/components/location/HeroBillboard.tsx`, `server/migrations/0014_region_scarcity_config.sql` (new) | At least one region hits scarcity threshold; pricing increase tested in-region | `P1-1` |

## P2 (Weeks 9-12): Lock-In and Compounding

| Ticket | Layer | Owner | Status | Output | Primary Modules / Files | Acceptance Gate | Dependencies |
|---|---|---|---|---|---|---|---|
| `P2-1` Budget intelligence layer | Economic Intelligence | Backend | `todo` | Budget exhaustion forecasts, cap-increase recommendations, underdelivery alerts | `server/services/budgetIntelligenceService.ts` (new), `server/services/locationMonetizationService.ts`, `server/monetizationRouter.ts`, `client/src/pages/admin/LocationMonetizationPage.tsx`, `server/migrations/0015_budget_forecast_snapshots.sql` (new) | 20%+ advertisers get optimization suggestions; average cap increases after suggestions | `P1-1`, `P1-2` |
| `P2-2` Supplier lock-in mechanisms | Market Control | Product + Backend | `todo` | Subscription bundles, credit wallet, performance archive | `server/agencyRouter.ts`, `server/partnerRouter.ts`, `server/adminRouter.ts`, `client/src/pages/agency/BillingDashboard.tsx`, `client/src/pages/agency/SubscriptionPage.tsx`, `client/src/pages/agency/AgencyDashboard.tsx`, `server/migrations/0016_credit_wallet_and_bundles.sql` (new) | Repeat advertiser rate >30%; multi-week budget management active | `P2-1` |
| `P2-3` Demand expansion engine | Experience + Data | Growth + SEO | `todo` | Structured region pages, indexable SEO surfaces, internal-link loops | `client/src/lib/seoGenerator.ts`, `client/src/components/seo/MetaControl.tsx`, `client/public/sitemap.xml`, `client/src/App.tsx`, `server/routes/exploreShorts.ts`, `docs/search-fix-walkthrough.md` | Organic traffic and opportunity baseline increase month-over-month | `P0-1` |

## Cross-Cutting Technical Tickets

| Ticket | Priority | Status | Output | Primary Modules / Files | Acceptance Gate |
|---|---|---|---|---|---|
| `OPS-1` Revenue observability and anomaly alerts | `P0` | `todo` | Hourly fill-rate and delivery anomaly detection | `server/services/locationMonetizationService.ts`, `server/services/kpiRollupService.ts`, `server/routes/kpi.ts`, `server/adminRouter.ts` | Monetization outages detected within 5 minutes |
| `OPS-2` Feature flags and rollback safety | `P0` | `todo` | Region-level monetization toggles + kill switches | `server/monetizationRouter.ts`, `server/adminRouter.ts`, `client/src/pages/admin/LocationMonetizationPage.tsx`, `server/migrations/0017_feature_flags.sql` (new) | Any regional monetization rollout can be disabled without deploy |
| `OPS-3` Reconciliation and audit drill-down | `P0` | `in_progress` | Raw-vs-rollup variance by rule/day with operator trace | `client/src/pages/admin/RevenueCenterPage.tsx`, `client/src/pages/admin/LocationMonetizationPage.tsx`, `server/services/locationMonetizationService.ts`, `server/_core/auditLog.ts` | Variance triage possible in one admin screen |
| `OPS-4` Dominance audit log trail | `P1` | `todo` | Forensic trail for pricing, caps, ranking weight and guardrail changes | `server/_core/auditLog.ts`, `server/monetizationRouter.ts`, `server/adminRouter.ts`, `server/migrations/0018_create_dominance_audit_log.sql` (new) | Every monetization policy change records actor, approval context, validation status, and before/after payload |

## Execution Notes
- Keep all monetization changes behind regional controls during rollout.
- For every new metric, define formula and source-of-truth table in `docs/PLATFORM_DOCTRINE.md`.
- No new user-facing growth features should preempt unresolved `P0` tickets.
