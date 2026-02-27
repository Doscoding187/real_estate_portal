# Dashboard Truth Audit

## Scope

Pilot-critical dashboard surfaces audited in this phase:

- `client/src/pages/AgencyDashboard.tsx`
- `client/src/pages/agent/AgentEarnings.tsx`
- `client/src/pages/admin/OverviewPage.tsx`
- `client/src/components/developer/AnalyticsPanel.tsx`
- `client/src/pages/distribution/DistributionManagerDashboard.tsx`

## Truth Standard

- `REAL`: backed by server query data.
- `MOCK`: hardcoded value or demo data.
- `UNKNOWN`: cannot be verified from source path.
- Fix action:
  - `WIRE`: connect to real query.
  - `REMOVE`: remove fake metric.
  - `LABEL`: show `Coming soon` or unavailable state.

## Agency Dashboard

| KPI | Source | Status | Fix Action | Current State |
| --- | --- | --- | --- | --- |
| Total Listings | `trpc.agency.getDashboardStats` | REAL | WIRE | Real value or unavailable if query not ready |
| Total Sales | `trpc.agency.getDashboardStats` | REAL | WIRE | Real value or unavailable if query not ready |
| Total Leads | `trpc.agency.getDashboardStats` | REAL | WIRE | Real value or unavailable if query not ready |
| Team Agents | `trpc.agency.getDashboardStats` | REAL | WIRE | Real value or unavailable if query not ready |
| Listings/Leads/Sales chart | `trpc.agency.getPerformanceData` | REAL | WIRE | Real chart data only |
| Lead conversion totals/rate | `trpc.agency.getLeadConversionStats` | REAL | WIRE | Real values only |
| Commission totals | `trpc.agency.getCommissionStats` | REAL | WIRE | Real values only |
| Agent leaderboard | `trpc.agency.getAgentLeaderboard` | REAL | WIRE | Real values only |
| Recent leads list | `trpc.agency.getRecentLeads` | REAL | WIRE | Real values only |
| Recent listings list | `trpc.agency.getRecentListings` | REAL | WIRE | Real values only |
| Explore overview metrics | `trpc.exploreAnalytics.getAggregatedMetrics` | REAL | WIRE | Real values when returned; otherwise explicit empty state |

## Agent Earnings

| KPI | Source | Status | Fix Action | Current State |
| --- | --- | --- | --- | --- |
| Wallet Balance | Hardcoded mock | MOCK | LABEL | `Coming soon` |
| Pending Commissions | Hardcoded mock | MOCK | WIRE | Real from `trpc.agent.getMyCommissions` |
| Approved Commissions | Hardcoded mock | MOCK | WIRE | Real from `trpc.agent.getMyCommissions` |
| Paid Commissions | Hardcoded mock | MOCK | WIRE | Real from `trpc.agent.getMyCommissions` |
| Commission list/transactions/bonuses | Hardcoded arrays | MOCK | REMOVE | Removed and replaced with `CommissionTracker` real query UI |
| New Leads | Not shown as real KPI before | UNKNOWN | WIRE | Real from `trpc.agent.getMyLeads` |
| Leads requiring follow-up | Not shown as real KPI before | UNKNOWN | WIRE | Real derived count from `trpc.agent.getMyLeads` |
| Recent Leads list | Not shown as real KPI before | UNKNOWN | WIRE | Real list from `trpc.agent.getMyLeads` |
| Payout automation | Not implemented | UNKNOWN | LABEL | `Coming soon` |

## Super Admin Overview

| KPI | Source | Status | Fix Action | Current State |
| --- | --- | --- | --- | --- |
| Revenue (30d) | `trpc.admin.getAnalytics.monthlyRevenue` | REAL | WIRE | Real value or unavailable |
| Active Users | `trpc.admin.getAnalytics.totalUsers` | REAL | WIRE | Real value or unavailable |
| Active Listings | `trpc.admin.getAnalytics.activeProperties` | REAL | WIRE | Real value or unavailable |
| Active subscriptions | `trpc.admin.getAnalytics.paidSubscriptions` | REAL | WIRE | Real value or unavailable |
| New users (30d) | `trpc.admin.getAnalytics.userGrowth` | REAL | WIRE | Real value or unavailable |
| New listings (30d) | `trpc.admin.getAnalytics.propertyGrowth` | REAL | WIRE | Real value or unavailable |
| Avg quality score | `trpc.admin.getPropertiesStats.qualityMetrics.averageScore` | REAL | WIRE | Real value or unavailable |
| Revenue MoM % | Hardcoded `+12%` | MOCK | LABEL | `Coming soon` |

## Developer Analytics Panel

| KPI | Source | Status | Fix Action | Current State |
| --- | --- | --- | --- | --- |
| Total leads | `trpc.developer.getDashboardKPIs.totalLeads` | REAL | WIRE | Real value |
| Qualified leads | `trpc.developer.getDashboardKPIs.qualifiedLeads` | REAL | WIRE | Real value |
| Marketing score | `trpc.developer.getDashboardKPIs.marketingPerformanceScore` | REAL | WIRE | Real value |
| Units sold / available | `trpc.developer.getDashboardKPIs.unitsSold/unitsAvailable` | REAL | WIRE | Real value |
| Conversion rate | `trpc.developer.getDashboardKPIs.conversionRate` | REAL | WIRE | Real value |
| Affordability match | `trpc.developer.getDashboardKPIs.affordabilityMatchPercent` | REAL | WIRE | Real value |
| Traffic chart (views/clicks by month) | Hardcoded chart dataset | MOCK | LABEL | Replaced with `Coming soon` block |
| Lead response time | Hardcoded `2.4h` and `-5%` | MOCK | LABEL | Replaced with `Coming soon` |

## Distribution Manager Dashboard

| KPI | Source | Status | Fix Action | Current State |
| --- | --- | --- | --- | --- |
| Assignments count | `trpc.distribution.manager.myAssignments` | REAL | WIRE | Real value |
| Open pipeline deals | `trpc.distribution.manager.listPipeline` | REAL | WIRE | Real value or unavailable while loading/error |
| Upcoming viewings | `trpc.distribution.manager.listViewings` | REAL | WIRE | Real value or unavailable while loading/error |
| Validation queue count | `trpc.distribution.manager.listValidationQueue` | REAL | WIRE | Real value or unavailable while loading/error |
| Deal timeline events | `trpc.distribution.manager.dealTimeline` | REAL | WIRE | Real event history only |

## Phase Outcome

- All identified mock KPI numbers in scoped files are now either wired to real queries or explicitly labeled `Coming soon` / unavailable.
- No scoped dashboard now presents hardcoded numeric demo KPIs as factual live metrics.
