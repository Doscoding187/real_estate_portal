# Demand Engine Integration Plan (2026-02-24)

## Goal
Unify dashboard CRM and marketing distribution so campaign demand lands directly in the existing agent leads pipeline.

## Implemented In This Iteration

### Phase 0 hardening
- Auth/session guard hardening:
  - `RequireRole` no longer redirects to `/login` on non-auth (`500`) errors.
  - Global unauthorized redirect now checks tRPC error code (`UNAUTHORIZED`) as well as legacy message.
- Entitlement fallback hardening:
  - `getAgentEntitlementsForUserId` now falls back to a safe projection when pricing/subscription projection fails.

### Phase 1 foundation (backend)
- New demand domain tables:
  - `demand_leads`
  - `demand_campaigns`
  - `demand_lead_matches`
  - `demand_lead_assignments`
  - `demand_unmatched_leads`
- Migration added:
  - `server/migrations/0031_demand_engine_foundation.sql`
  - `server/migrations/0032_demand_routing_entitlements.sql`
- New schema surface:
  - `drizzle/schema/demand.ts`
- New service:
  - `server/services/demandEngineService.ts`
  - Supports campaign creation, campaign listing, campaign lead capture, inventory matching, scoring, assignment, unmatched capture, and in-app notification creation.
- New tRPC router:
  - `server/demandRouter.ts`
  - Mounted as `demand` in `server/routers.ts`.

### Pipeline integration
- `agent.getLeadsPipeline` now supports:
  - `filters.campaignId`
  - `filters.matchConfidence`
- Pipeline response now includes:
  - `campaignId`
  - `campaignName`
  - `matchConfidence`
- Leads UI now supports:
  - Source filters including `campaign_*`
  - Campaign filter
  - Match-confidence filter
  - Campaign and confidence badges on lead cards

## API Surface (New)
- `demand.createCampaign` (protected)
- `demand.listMyCampaigns` (protected)
- `demand.captureLead` (public)
- `demand.myLeadSummary` (agent)

## Scoring Model (Current)
`score = TierWeight * FairnessMultiplier * QualityMultiplier`

Inputs currently used:
- Tier weight from plan entitlement `tier_weight` (fallback by plan name)
- Fairness from recent assignment volume (24h cooldown effect)
- Quality from `agents.profileCompletionScore` (>= 80 gets uplift)

Recipient count is entitlement-driven:
- `max_recipients_per_lead` (fallback: elite 1, pro/growth 2, starter/trial 3)
- Assigned CRM leads are written with `source = "demand"` into the same agent pipeline.

## Remaining Work
- Replace mock analytics/messages sections in `/agent/leads` with API data.
- Add marketing hub campaign tables/views fully backed by `demand.*` procedures.
- Add entitlement gates for:
  - lead exclusivity
  - channel delivery (email/sms/whatsapp)
  - lead volume caps
- Add assignment audit timeline + SLA timers per lead card.
- Add unmatched-demand visibility in dashboard analytics and agent nudges.
- Add tests:
  - capture -> match -> assign happy path
  - no-match path
  - tier/fairness routing behavior
  - notification emission
