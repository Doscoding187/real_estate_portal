# Pricing Governance Production Rollout

## Purpose

Safely deploy and activate Pricing/Subscriptions/Governance (migration 0030) with post-migration self-checks, verification scripts, and browser smoke tests. Includes downgrade demotion audit verification.

## Preconditions

- CI green on the release commit:
  - Migration Unit Gate
  - Migration DB Self-Check
  - `pnpm check`
- Backend build includes:
  - `pnpm migration:sql:selfcheck:pricing-governance`
  - `pnpm verify:pricing-governance`
  - migration runner schema assertions for `pricing-governance`
- Staging rollout completed before production.

## Deployment Order (Required)

1. Deploy backend first (staging).
2. Apply DB migration 0030 (staging).
3. Run self-check + verification script (staging).
4. Run browser golden-path smoke (staging).
5. Repeat steps 1-4 for production.

### Staging Commands

```bash
pnpm migration:sql:selfcheck:pricing-governance:safe:staging
pnpm verify:pricing-governance:safe:staging
```

### Production Commands

```bash
pnpm migration:sql:selfcheck:pricing-governance:safe:production
pnpm verify:pricing-governance:safe:production
```

## Step 1 - Deploy Backend (Staging/Prod)

Deploy backend containing:

- pricing/subscription services + enforcement
- downgrade demotion safeguards
- migration runner self-check profiles
- `verify:pricing-governance` tooling

Stop condition: if deploy fails or health checks fail, do not proceed to DB changes.

## Step 2 - Apply DB Migration 0030

Apply:

- `0030_pricing_subscription_governance.sql`

Stop condition: if migration reports an error, do not proceed. Resolve and re-run.

## Step 3 - Run Migration Self-Check

Run:

```bash
pnpm migration:sql:selfcheck:pricing-governance:safe:staging
```

Run on the deployed backend host/container with the matching environment vars loaded (staging for staging runs, production for production runs).

Expected: command exits `0` with `Schema self-check passed`.

Stop condition: any failed assertion blocks rollout.

## Step 4 - Run Verification Script

Run:

```bash
pnpm verify:pricing-governance:safe:staging
```

Run on the deployed backend host/container with the matching environment vars loaded (staging for staging runs, production for production runs).

Expected: exits `0`.
If it fails, it should print actionable missing tables/columns/seeds.

Stop condition: failures block rollout.

## Step 5 - Browser Golden-Path Smoke

Complete these steps in the deployed environment:

### A) Agent Onboarding + Billing

1. Register agent -> verify email -> redirected to onboarding wizard.
2. Save wizard progress -> publish profile.
3. Open billing/settings page:
   - plan, trial status, entitlements visible
   - `activeListings` usage visible
4. Upgrade to a higher plan (for example, Pro).
5. Create more active listings than the Starter limit.
6. Downgrade to Starter:
   - UI warning shows exact demotion impact before confirming
   - success toast shows demoted listing count
   - expected: demoted listings become `draft`; no data is deleted

### B) Enforcement Validation

7. Verify that excess listings were demoted to `draft` (no deletes).
8. Verify listing submit-for-review respects limits.
9. Verify AI endpoints are blocked when `has_ai_insights=false`.
10. Verify agency dashboard endpoints are blocked when `has_team_dashboard=false`.

Stop condition: any mismatch between UI and server behavior blocks rollout.

## Step 6 - Audit Verification (Downgrade Demotion Logging)

Run:

```sql
SELECT id, actor_user_id, action, target_type, target_id, metadata, created_at
FROM managerial_audit_logs
WHERE action = 'subscription_downgrade_listing_demotion'
ORDER BY created_at DESC
LIMIT 20;
```

Expected: recent row exists after downgrade with metadata including demoted count and plan change context.

## Rollback Guidance

- If backend deploy fails before DB migration: rollback by redeploying previous backend.
- If DB migration applied but behavior is wrong:
  - prefer hotfixing backend (migration is additive)
  - avoid reverting schema unless absolutely necessary

## Required Artifacts / Evidence

Before marking rollout complete, capture:

- output of `pnpm migration:sql:selfcheck:pricing-governance`
- output of `pnpm verify:pricing-governance`
- screenshot or notes of billing downgrade warning + toast
- audit SQL query output showing demotion event

## Notes

- Always run staging first.
- Do not run DB changes against prod unless the backend containing self-check tooling is already deployed.

## Common Failures

- missing seed plans: re-run migration, confirm `plans` table populated
- self-check fails due to naming mismatch: verify correct profile targeted
- downgrade demotion not logged: confirm audit insert path in both self-serve and admin override flows
- DB self-check passes but billing UI is empty: confirm plan seed keys match UI expectations, review `pnpm verify:pricing-governance` output, and confirm `plans` + `plan_entitlements` are populated
