# Market Dominance Architecture

## Purpose
This document formalizes the platform's evolution from feature product to programmable exposure marketplace. It defines the system layers, control loops, and a 90-day execution path focused on monetization leverage.

Execution companion:
- `docs/MARKET_DOMINANCE_EXECUTION_MATRIX.md`

## Strategic Stack
```text
[6] Market Control Layer
    Scarcity | Rank Influence | Supply Lock-In

[5] Economic Intelligence Layer
    Demand Baselines | Revenue per Opportunity | Pricing Signals

[4] Data and Persistence Layer
    Event Integrity | Daily Stats | Attribution | Diagnostics

[3] Monetization Core
    CPM/CPC/CPL | Caps | Pacing | Expected vs Actual

[2] Delivery Engine
    Eligibility | Rule Resolution | Serve/Click Attribution Chain

[1] Experience Layer
    Hero | Banners | Featured Developers | Recommended Agents | Organic Listings
```

## Layer Definitions

### 1) Experience Layer
- Revenue touchpoints: hero billboard, monetized banners, featured developers, recommended agents, location modules, organic listings.
- Event chain: `serve_request -> impression -> click -> lead -> revenue`.
- Risk if isolated: commodity listings experience with weak pricing power.

### 2) Delivery Engine
- Responsibilities: eligibility checks, schedule windows, daily/total cap enforcement, pacing enforcement, conflict resolution.
- Current control: highest-ranked eligible rule per target wins.
- Attribution hardening: chain-safe `serveRequestId` propagation from serve response into click events.

### 3) Monetization Core
- Commercial models: `CPM`, `CPC`, `CPL`.
- Diagnostics: cap utilization, expected-vs-actual delivery, eCPM, eCPL, rule-level CTR and lead rates.
- Canonical simulation:
  - `expected = actual_served + blocked_daily_cap + blocked_total_cap + blocked_pacing`
  - `gap = max(0, expected - actual_served)`

### 4) Data and Persistence Layer
- Persistent telemetry and daily rollups provide deterministic diagnostics.
- Key assets:
  - `analytics_events`
  - `location_targeting_events`
  - `location_targeting_rule_daily_stats`
  - `opportunities_by_surface_by_day`
- Governance outcomes: replay-safe analysis, auditability, and reconciliations.

### 5) Economic Intelligence Layer
- Objective: convert diagnostics into pricing and allocation decisions.
- Required outputs:
  - demand ceiling by surface and region
  - config loss rate vs demand constraints
  - revenue per opportunity slot
  - fill rate and cap exhaustion trends
  - quality-adjusted performance signals

### 6) Market Control Layer
- End-state controls:
  - rank influence blending (`organic + paid + quality`)
  - scarcity architecture (limited premium slots, floor pricing, waitlists)
  - supply lock-in (bundles, credits, performance history, subscription dependence)
- Outcome: the platform controls visibility allocation and unit economics, not only ad placement.

## Compounding Flywheel
1. More demand creates more opportunity slots.
2. More opportunity slots produce better monetization data.
3. Better data improves pricing and allocation decisions.
4. Better pricing increases monetization yield.
5. Higher yield attracts and retains higher-value supply.
6. Stronger supply improves demand quality and repeat usage.
7. Loop repeats with increasing pricing power.

## Current Maturity
- Strong: Delivery Engine, Monetization Core, admin diagnostics, attribution integrity.
- Established: Data and persistence artifacts for deterministic delivery analysis.
- Emerging: Economic intelligence (demand baseline now active, pricing intelligence next).
- Not yet complete: full market control mechanics (dynamic floors, scarcity orchestration, lock-in systemization).

## 90-Day Execution Roadmap

### Phase 1 (Days 1-30): Demand Intelligence and Revenue Clarity
- Goal: identify true monetizable inventory ceiling and configuration leakage.
- Build:
  - surface/region/day demand baseline instrumentation and reporting
  - revenue clarity views by surface and region
  - cap exhaustion and config loss heatmaps
  - click-quality hardening (dedupe, velocity checks, self-click filters)
- Exit criteria:
  - known demand ceiling in core regions
  - known revenue per opportunity by surface
  - known leakage sources by block reason

### Phase 2 (Days 31-60): Pricing Levers and Controlled Scarcity
- Goal: start shaping economics, not only measuring them.
- Build:
  - configurable CPM floors by region
  - CPC/CPL multipliers by performance tier
  - quality-weighted rule scoring
  - soft scarcity controls (max premium slots, full-state signaling)
- Exit criteria:
  - controlled regional price adjustments with measured impact
  - quality-linked allocation in production
  - scarcity controls active in pilot regions

### Phase 3 (Days 61-90): Lock-In and Expansion Pressure
- Goal: make the system self-reinforcing and harder to displace.
- Build:
  - budget exhaustion forecasting and spend recommendations
  - supplier lock-in mechanics (credit wallets, exposure bundles, historical performance value)
  - demand expansion engine (location SEO pages, internal link loops)
- Exit criteria:
  - repeated pricing-floor increases without demand collapse
  - rising repeat advertiser share
  - sustained increase in revenue per opportunity

## Dominance Metrics
- Fill rate in core regions
- Cap exhaustion rate in top-demand regions
- Revenue per opportunity trend (month-over-month)
- Repeat advertiser rate
- Price-floor increase success rate
- Config loss rate and pacing block rate trend

## Operating Discipline
- Prioritize monetization intelligence, pricing control, supply leverage, and demand expansion.
- De-prioritize unrelated surface feature expansion during this 90-day cycle.
- Ship changes behind regional flags with rollback controls and anomaly alerts.
