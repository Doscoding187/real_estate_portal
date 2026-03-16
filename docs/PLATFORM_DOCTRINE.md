# Platform Doctrine

Related:
- `docs/MARKET_DOMINANCE_ARCHITECTURE.md`
- `docs/MARKET_DOMINANCE_EXECUTION_MATRIX.md`
- `docs/MARKET_DOMINANCE_IMPLEMENTATION_BACKLOG.md`
- `docs/MARKET_DOMINANCE_SPRINT_BOARD_6W.md`
- `docs/MARKET_DOMINANCE_TEST_PLAN.md`
- `docs/BRANCH_PROTECTION_ENFORCEMENT.md`

## Strategic Positioning
PropertyListify is South Africa's property growth infrastructure: a premium platform combining marketplace access, media distribution, and performance intelligence so agents and developers get predictable business outcomes, buyers make confident decisions, and agencies/partners unlock measurable growth.

External one-liner:
We do not sell listing space. We provide the growth infrastructure behind property demand.

## North Star
Become the default operating system for property growth:
- Daily for agents
- Strategic per cycle for developers and agencies
- Trusted decision layer for buyers
- Demand channel for strategic partners

## Identity by Role
### Agents
- Daily business hub for leads, visibility, CRM-adjacent workflow, and performance reporting
- Experience goal: "I do not need to think about marketing mechanics, I just see outcomes"
- Revenue role: recurring subscription backbone

### Developers
- Strategic marketing partner for project launches and showcase environments
- Experience goal: "I am not posting stock, I am activating demand"
- Revenue role: high ACV and margin expansion via premium packages and add-ons

### Buyers and Users
- Trusted decision layer for search, affordability, qualification, and education
- Experience goal: confidence, clarity, and better choices
- Revenue role: liquidity and trust engine that powers advertiser value

### Agencies
- Intelligence and growth layer for benchmarking, lead flow visibility, and talent insights
- Experience goal: "I can see opportunities and act faster than competitors"
- Revenue role: high-margin information-as-a-service expansion

### Strategic Partners
- Lead and visibility channel through ecosystem integration and directory layers
- Experience goal: attributable business outcomes from platform participation
- Revenue role: secondary recurring and campaign revenue stream

## Revenue Architecture
Hybrid model: predictable subscription base plus outcome-based expansion.

- Subscriptions:
  - Essential (Visibility Layer)
  - Growth (Amplification Layer, default revenue anchor)
  - Ecosystem (Infrastructure Layer)
- Performance add-ons:
  - Media amplification
  - Geographic dominance programs (with trust guardrails)
  - Development launch pushes
  - Sponsored ecosystem placements
- Intelligence products:
  - Agency and developer performance insights
- Partner monetization:
  - Directory placement and integrated campaigns

## Target Revenue Mix
- Agents: 55-65 percent
- Developers: 25-35 percent
- Private sellers: 10-15 percent

Interpretation:
- Agents = stability layer
- Developers = margin and prestige layer
- Private sellers = liquidity enhancer, not primary revenue focus

## Product Decision Filter
Only ship features that improve at least one of:
1. Predictable revenue (`MRR`, `ARPU`, `NRR`)
2. Role-based retention and stickiness
3. Outcome transparency and control
4. Ecosystem leverage across roles

If a feature cannot map to one of the above, it is backlog, not roadmap.

## Core KPI Stack (Profit-First, Raise-Ready)
Primary business metrics:
- Net Revenue Retention (`NRR`)
- Monthly Recurring Revenue (`MRR`) by role
- Average Revenue Per Advertiser (`ARPU`) by role
- Add-on adoption rate
- Upgrade rate (`Essential -> Growth -> Ecosystem`)
- Retention by role and cohort
- Expansion revenue share
- CAC to LTV by role

Funnel metrics:
- Role selection rate
- Time to decision by role
- Path choice split (self-serve vs strategy-assisted)
- Plan preview click-through
- Step drop-off rates

## Metric Definitions (Frozen v1)
Time and aggregation:
- Timezone standard: UTC
- Rollup grain: daily by role (`agent`, `developer`, `private_seller`)
- Source of truth for board-level KPIs: `daily_role_metrics` and `daily_funnel_metrics`

Operational definitions:
- Active account: distinct subscribed account with active or grace-like status at day end
- New subscriptions: distinct accounts with subscription start events in-day
- Churned accounts: distinct accounts with cancellation events in-day
- MRR: normalized recurring subscription revenue snapshot at day end (yearly plans normalized to monthly)
- ARPU: `MRR / active_accounts` at day end
- NRR: `(MRR_end / MRR_start) * 100` for the measured period
- Retention rate: `max(0, (start_active - churned_accounts) / start_active) * 100`
- Expansion revenue: completed in-period upgrade/conversion transactions
- Add-on revenue: completed in-period add-on transactions
- Add-on adoption rate: distinct add-on buyers in period / active accounts at period end

Funnel definitions:
- Role selected: `funnel_step` events with `action=role_selected`
- Strategy clicked: `funnel_step` events with `action=path_selected` and `path=strategy_call`
- Strategy booked: `funnel_step` events with `action in (qualification_submitted, calendar_loaded)`
- Avg decision latency: average `durationMs` for `action=path_selected` events

## UX and Messaging Principles
- Invisible marketing, visible outcomes
- One clear primary action per acquisition flow
- Positioning language over commodity language

Prefer:
- "Position your inventory"
- "Activate buyer demand"
- "Control your visibility layer"
- "Build development authority"

Avoid:
- Generic "boost listing" framing without outcome context
- Portal-like comparison-table experience that commoditizes pricing

## Category Commitment
PropertyListify is Category C:
Marketplace plus Media plus Infrastructure.

Execution implications:
- Do not optimize for vanity traffic
- Optimize for retention, expansion, and monetization quality
- Keep premium trust intact while adding performance layers
- Build control-center product surfaces, not CMS-feeling surfaces

## Guardrails for High-Margin Layers
Geographic dominance and similar levers should launch only when trust and retention baselines are stable.

Minimum launch discipline:
- Controlled market rollout
- Clear sponsored labeling
- Relevance and quality signals in ranking
- Inventory and pacing caps
- Ongoing quality monitoring

### Geographic Dominance Guardrails (Frozen v1)
- Eligibility gates:
  - Rule status must be `active`
  - Current time must be inside `start_date/end_date` window (when present)
  - `daily_impression_cap` and `total_impression_cap` must not be exceeded
  - `pacing_minutes` must be respected from last served timestamp
- Boost formula:
  - `uplift = min(0.35, 0.05 + ranking/333)`
  - `geo_boost_multiplier = 1 + uplift`
  - `adjusted_score = base_score * geo_boost_multiplier`
- Feed fairness limits:
  - Sponsored share cap: max `20%` of visible feed cards
  - Adjacency cap: no consecutive sponsored cards
  - If a sponsored card breaches caps, revert to organic score by removing geo multiplier
- Mandatory disclosure:
  - Every paid dominance placement must render `Sponsored` label
- Telemetry:
  - Server-side `served` events logged on ranking output
  - Client click path logs `click` events with `rule_id`, context, and location scope

### Delivery Simulation Model (Admin v1)
- Expected impressions:
  - `expected = actual_served + blocked_daily_cap + blocked_total_cap + blocked_pacing`
- Delivery gap:
  - `gap = max(0, expected - actual_served)`
- Cap utilization (windowed):
  - `cap_utilization = actual_served / (daily_impression_cap * days_in_range)` when daily cap exists
- Quality metrics:
  - `CTR = clicks / actual_served`
  - `Qualified Lead Rate = leads / actual_served`
  - `Click-to-Lead Rate = leads / clicks`
- Economics (metadata-driven):
  - `revenue = (impressions/1000 * cpm) + (clicks * cpc) + (leads * cpl)`
  - `eCPM = revenue / (impressions/1000)`
  - `eCPL = revenue / leads`

### Demand Baseline Model (Surface v1)
- Source artifact: `opportunities_by_surface_by_day`
- Purpose:
  - Separate demand constraints from configuration constraints
  - Quantify monetizable inventory ceiling before pricing changes
- Core terms:
  - `demand_ceiling_slots = opportunity_slots`
  - `inventory_ceiling_slots = opportunity_slots - unfilled_slots`
  - `config_unlocked_ceiling_slots = inventory_ceiling_slots`
  - `delivery_rate = served_slots / demand_ceiling_slots`
  - `inventory_fill_rate = served_slots / inventory_ceiling_slots`
  - `config_loss_rate = blocked_config_slots / demand_ceiling_slots`

## Operating Rule
Every page, funnel, and dashboard must answer:
"How does this increase advertiser outcomes, platform trust, and recurring expansion revenue?"

If it does not, it does not ship.
