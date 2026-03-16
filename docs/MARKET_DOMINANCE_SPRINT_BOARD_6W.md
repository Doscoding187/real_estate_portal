# Market Dominance 3-Sprint Operational Board (6 Weeks)

## Scope
Operational cadence board for executing the dominance roadmap with temporal accountability.

Import artifact:
- `docs/MARKET_DOMINANCE_SPRINT_BOARD_6W.csv`

Validation companion:
- `docs/MARKET_DOMINANCE_TEST_PLAN.md`

## Board Tags
- `NOW`: active in current sprint
- `NEXT`: locked for next sprint
- `LATER`: planned for a later sprint
- `BLOCKED`: dependency not met

## Intake Rule (Non-Negotiable)
No ticket enters a sprint unless it strengthens at least one:
- pricing power
- scarcity
- revenue clarity
- supply lock-in
- demand expansion

## Sprint Calendar
- Sprint 1: Weeks 1-2
- Sprint 2: Weeks 3-4
- Sprint 3: Weeks 5-6

---

## Sprint 1 (Weeks 1-2): Revenue Clarity Lock-In
Goal: demand-aware revenue clarity and leakage visibility.

| Board ID | Linked Ticket | Owner | Tag | Deliverable | Measure / Exit Gate | Dependency |
|---|---|---|---|---|---|---|
| `S1-1` | `P0-1` | Backend Lead | `NOW` | Demand baseline table and ingestion (`opportunities_by_surface_by_region_by_day`) | Unused inventory percent visible per region | None |
| `S1-2` | `P0-1` | Data Lead | `NOW` | Fill-rate and revenue-per-opportunity metrics | Theoretical max revenue quantifiable by region | `S1-1` |
| `S1-3` | `P0-2` | Admin UI Lead | `NOW` | Observability dashboard v1 (surface/region revenue, fill, cap) | Top 3 revenue leakage zones identifiable in <5 min | `S1-1`, `S1-2` |
| `S1-4` | `P0-1` | Backend Lead | `BLOCKED` | Demand-aware simulation integration | Simulation outputs include demand baseline deltas | `S1-1`, `S1-2` |

Sprint 1 checkpoint:
- can quantify unused inventory by region
- can identify top 3 revenue leakage zones
- simulation includes demand-aware data

---

## Sprint 2 (Weeks 3-4): Pricing Levers Activated
Goal: first controlled pricing power test.

| Board ID | Linked Ticket | Owner | Tag | Deliverable | Measure / Exit Gate | Dependency |
|---|---|---|---|---|---|---|
| `S2-1` | `P1-1` | Backend Lead | `NEXT` | CPM floor configuration per region | Floor raised in one controlled region with no system instability | Sprint 1 checkpoint |
| `S2-2` | `P1-1` | Backend Lead | `NEXT` | CPC multipliers and surge toggle | Pre/post fill-rate and revenue deltas captured | `S2-1` |
| `S2-3` | `P1-2` | Ranking Lead | `NEXT` | Performance quality scoring v1 | High-quality rules receive measurable uplift | Sprint 1 checkpoint |
| `S2-4` | `P1-2` | Ranking Lead | `NEXT` | Rank blending integration (`organic + paid + quality`) | No demand collapse after controlled price test | `S2-3`, `S2-1` |

Sprint 2 checkpoint:
- price increase executed in 1 controlled region
- no demand collapse
- fill-rate shift measured and explained

---

## Sprint 3 (Weeks 5-6): Scarcity and Leverage
Goal: move from reactive monetization to ecosystem shaping.

| Board ID | Linked Ticket | Owner | Tag | Deliverable | Measure / Exit Gate | Dependency |
|---|---|---|---|---|---|---|
| `S3-1` | `P1-3` | Backend Lead | `LATER` | Premium slot limits per region | At least one region reaches scarcity threshold | Sprint 2 checkpoint |
| `S3-2` | `P1-3` | Product Lead | `LATER` | Scarcity state messaging ("placement full") | Scarcity state appears only when configured threshold is met | `S3-1` |
| `S3-3` | `P2-1` | Backend Lead | `LATER` | Budget exhaustion forecast | Forecast error tracked and stable over 7 days | Sprint 2 checkpoint |
| `S3-4` | `P2-1` | Backend + Product | `LATER` | Cap-increase suggestion engine | At least one advertiser increases cap after recommendation | `S3-3` |

Sprint 3 checkpoint:
- at least one region shows cap exhaustion
- at least one advertiser increases cap from recommendation
- repeat advertiser rate trend turns upward

---

## Weekly Dominance KPI Review Cadence
Cadence: weekly, fixed 45-minute session.

### Review Inputs
- fill rate by core region
- revenue per opportunity (WoW and MoM trend)
- cap exhaustion distribution
- repeat advertiser rate
- pricing floor experiments and outcomes
- simulation accuracy

### Meeting Output
- decisions made (keep, raise, rollback)
- blocked items and owners
- sprint scope adjustments (if any)
- explicit next-week KPI targets

### 90-Day Executive Targets
- fill rate > 75% in core regions
- revenue per opportunity rising month-over-month
- cap exhaustion visible in top regions
- repeat advertiser rate > 30%
- at least one successful pricing floor increase
- simulation accuracy within 10%
