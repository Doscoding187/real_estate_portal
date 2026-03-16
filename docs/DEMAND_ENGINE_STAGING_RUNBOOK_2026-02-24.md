# Demand Engine Staging Runbook (2026-02-24)

## 1) Deployment Order
1. Deploy backend build that includes:
- `drizzle/schema/demand.ts`
- `server/services/demandEngineService.ts`
- `server/demandRouter.ts`
- `server/agentRouter.ts` demand filter/context wiring
- auth/session hardening (`RequireRole`, `main.tsx`, entitlement fallback)
2. Deploy frontend build with updated leads filters/cards.

## 2) Migration Order (Staging First)
1. Print DB target:
```bash
pnpm db:target:staging
```
2. Apply SQL migrations:
```bash
cross-env NODE_ENV=staging tsx server/migrations/runSqlMigrations.ts
```
3. Run demand schema self-check:
```bash
pnpm migration:sql:selfcheck:demand-engine:safe:staging
```
4. Run demand migration verification:
```bash
pnpm verify:demand-engine:safe:staging
```

## 3) SQL Sanity Checks
```sql
SHOW TABLES LIKE 'demand_%';

SHOW COLUMNS FROM demand_lead_assignments LIKE 'demand_lead_id';
SHOW COLUMNS FROM demand_lead_matches LIKE 'demand_lead_id';

SELECT p.name, e.feature_key, e.value_json
FROM plan_entitlements e
JOIN plans p ON p.id = e.plan_id
WHERE e.feature_key IN ('tier_weight','max_recipients_per_lead','lead_distribution_mode')
ORDER BY p.name, e.feature_key;
```

Expected:
- demand tables exist
- linkage columns exist
- relevant plans have all 3 routing entitlement keys

## 4) First End-to-End Proof (Fast)
### Option A: automated proof script
```bash
pnpm prove:demand-flow --owner-type=agent --owner-id=<AGENT_USER_ID> --city=Rosebank --suburb=Rosebank --province=Gauteng --property-type=house --min-bedrooms=3 --max-price=1500000 --lead-email=proof+<timestamp>@example.com
```

What this script does:
- creates an active proof campaign (unless `--campaign-id` is provided)
- captures a demand lead
- prints demand lead row + assignments + matches + CRM lead rows
- verifies CRM lead `source='demand'`

### Option B: manual flow
1. Create one active campaign matching known listing inventory.
2. Submit `demand.captureLead`.
3. Confirm:
- row in `demand_leads`
- rows in `demand_lead_matches`
- rows in `demand_lead_assignments`
- CRM `leads` rows with `source='demand'`
4. Confirm in UI:
- `/agent/leads`
- Source filter = Demand Engine
- campaign + match-confidence badges and filters

## 5) Hybrid Rules Expected Behavior
- Starter/trial: `tier_weight=1`, `max_recipients_per_lead=3`
- Growth/Pro: `tier_weight=3`, `max_recipients_per_lead=2`
- Elite: `tier_weight=6`, `max_recipients_per_lead=1`

Score used:
`score = tierWeight * fairnessMultiplier * qualityMultiplier`

Where:
- `fairnessMultiplier` reduces score for recent heavy assignment volume
- `qualityMultiplier=1.2` when `profileCompletionScore >= 80`, else `1.0`

## 6) Known Failure Patterns
- No assignments:
  - no matching active listings
  - listing criteria fields not populated
  - no agent subscription/entitlement projection
- Entitlements defaulted:
  - inspect plan + entitlement resolution logs
- Redirect loops:
  - validate only true `UNAUTHORIZED` causes login redirect
