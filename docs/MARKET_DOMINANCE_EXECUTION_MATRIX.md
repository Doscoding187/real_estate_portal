# Market Dominance Execution Matrix

## Scope
Execution matrix aligned to the 6-layer dominance stack.  
Priority model:
- `P0`: non-negotiable control infrastructure
- `P1`: pricing and leverage mechanics
- `P2`: ecosystem compounding

Implementation companion:
- `docs/MARKET_DOMINANCE_IMPLEMENTATION_BACKLOG.md`
- `docs/MARKET_DOMINANCE_SPRINT_BOARD_6W.md`

---

## P0 (Weeks 1-4): Control and Revenue Clarity

### P0-1 Demand Baseline Instrumentation
- Layer: Data and Economic Intelligence
- Owner: Backend and Data
- Output:
  - `opportunities_by_surface_by_region_by_day`
  - fill-rate metric
  - revenue-per-opportunity metric
- Acceptance gate:
  - admin can see unused inventory percent
  - platform can quantify theoretical max revenue per region
  - simulation includes demand baseline inputs

### P0-2 Monetization Observability Dashboard
- Layer: Monetization Core
- Owner: Backend and Admin UI
- Output:
  - revenue by surface
  - revenue by region
  - cap exhaustion heatmap
  - CTR and lead rate by surface
- Acceptance gate:
  - top 3 under-monetized regions identifiable instantly
  - day-over-day revenue variance explainable from diagnostics

### P0-3 Attribution Integrity Hardening
- Layer: Data and Persistence
- Owner: Backend
- Output:
  - click dedupe window
  - rapid-fire anomaly detection
  - self-attribution filtering
- Acceptance gate:
  - no duplicate click inflation in reporting
  - suspicious activity flags visible in admin workflows
  - revenue reporting confidence is audit-defensible

### P0 Success Condition
- The team can explain exactly where revenue is generated and where revenue is leaking.

---

## P1 (Weeks 5-8): Pricing Power and Scarcity

### P1-1 Dynamic Pricing Controls
- Layer: Monetization Core
- Owner: Backend
- Output:
  - CPM floors per region
  - CPC multipliers
  - surge toggle
  - admin-configurable pricing levers
- Acceptance gate:
  - one-region floor increase is deployed safely
  - fill rate and revenue delta are measured pre/post change

### P1-2 Performance Quality Scoring
- Layer: Market Control
- Owner: Backend and Ranking
- Output:
  - composite rule quality score
  - ranking blend (`organic + paid + quality`)
  - quality-based boost/suppression behavior
- Acceptance gate:
  - high-performing rules gain measurable exposure lift
  - low-quality rules lose relative exposure share

### P1-3 Scarcity Mechanics (Soft Cap Model)
- Layer: Market Control
- Owner: Backend
- Output:
  - premium slot limits per region
  - tiered exposure levels
  - "placement full" state
- Acceptance gate:
  - at least one region reaches scarcity threshold
  - pricing increase is tested in that region

### P1 Success Condition
- Pricing can be increased without destabilizing demand.

---

## P2 (Weeks 9-12): Lock-In and Compounding

### P2-1 Budget Intelligence Layer
- Layer: Economic Intelligence
- Owner: Backend
- Output:
  - budget exhaustion forecasts
  - automated "increase cap" suggestions
  - underdelivery alerts
- Acceptance gate:
  - 20%+ of advertisers receive optimization suggestions
  - average cap increases measurably after recommendations

### P2-2 Supplier Lock-In Mechanisms
- Layer: Market Control
- Owner: Product and Backend
- Output:
  - subscription bundles
  - credit wallet system
  - performance archive dashboard
- Acceptance gate:
  - repeat advertiser rate exceeds 30%
  - advertisers actively manage multi-week budgets

### P2-3 Demand Expansion Engine
- Layer: Experience and Data
- Owner: Growth and SEO
- Output:
  - structured region landing pages
  - indexed SEO surfaces
  - internal-link authority loops
- Acceptance gate:
  - organic traffic grows month-over-month
  - opportunity baseline increases month-over-month

### P2 Success Condition
- Revenue growth is driven by system compounding, not manual intervention.

---

## Operating Discipline
Every ticket must answer:
1. Which dominance layer does this strengthen?
2. Does this increase control or only complexity?
3. Does this improve pricing power?
4. Does this increase lock-in?

If it does not strengthen a layer, it is backlog noise.

---

## Executive Dominance KPI Targets (90-Day)
- fill rate greater than 75% in core regions
- revenue per opportunity rising month-over-month
- cap exhaustion visible and monitored in top regions
- repeat advertiser rate greater than 30%
- at least one successful pricing-floor increase
- simulation accuracy within 10%

Meeting these gates indicates transition from experimentation to controlled exposure allocation.
