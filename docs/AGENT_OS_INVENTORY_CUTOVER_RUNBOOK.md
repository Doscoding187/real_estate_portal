# Agent OS Inventory Cutover Runbook

## Scope
This runbook covers the Agent OS inventory bridge rollout that moves scheduling off unresolved legacy `listings` and onto canonical `properties`.

## Preconditions
- Worktree/branch already contains the Agent OS bridge changes.
- Target environment has application code deployed that includes:
  - `properties.sourceListingId`
  - `showings.propertyId`
  - `showings.leadId`
  - `agent_os_allow_legacy_scheduling_inventory`
- Use the admin boundary page at `/admin/agent-inventory-boundary` as the rollout control surface.

## 1. Apply SQL migrations
Run the SQL migration runner for the target environment:

```bash
pnpm migration:sql
```

If you are doing a full production migration flow in this repo, use:

```bash
pnpm db:migrate
```

## Preflight before cutover
Run the explicit preflight before you disable legacy fallback:

```bash
pnpm agent-os:inventory:preflight
```

This checks:
- `DATABASE_URL` is present
- bridge columns exist
- current fallback setting state
- unresolved listing/showing counts

## 2. Backfill the inventory bridge
Run the explicit bridge backfill script:

```bash
pnpm tsx scripts/backfill-agent-os-inventory-bridge.ts
```

This will:
- populate `properties.sourceListingId` where the bridge can be resolved
- populate `showings.propertyId` where a showing can be resolved to a property

## 3. Verify the boundary report
Open:

```text
/admin/agent-inventory-boundary
```

Check:
- `Resolved` is increasing as expected
- `Unresolved` is at an acceptable level
- `Legacy Showings` is trending to zero
- `Fallback Enabled` is still on during validation

## 4. Validate agent workflows before cutover
Validate these flows with real users/test accounts:
- public enquiry on a property-backed listing creates a lead
- listing owner sees the enquiry
- CRM handoff works from listing to pipeline
- booking a showing from CRM works
- booking a showing from calendar works
- newly created showings carry resolved property context

## 5. Disable legacy fallback
When `Unresolved` reaches zero on the boundary page, disable:

- `Allow legacy scheduling inventory fallback`

You can do this directly on `/admin/agent-inventory-boundary`.

## 6. Post-cutover verification
Re-test:
- CRM -> showing booking
- calendar -> showing booking
- existing showings render correctly
- unresolved legacy listings are no longer bookable

## 7. Rollback
If cutover causes blocking operational issues:
- re-enable `Allow legacy scheduling inventory fallback`
- investigate unresolved inventory from the boundary report
- rerun the backfill after data fixes if needed

## Recommended commands

```bash
pnpm agent-os:inventory:preflight
pnpm migration:sql
pnpm tsx scripts/backfill-agent-os-inventory-bridge.ts
npx vitest run server/__tests__/agent.inventory-cutover.test.ts server/__tests__/admin.inventory-boundary.test.ts
```
