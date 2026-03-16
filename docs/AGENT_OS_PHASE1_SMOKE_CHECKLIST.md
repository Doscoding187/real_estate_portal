# Agent OS Phase 1 Smoke Checklist

## Goal
Verify the deployed Agent OS Phase 1 flow after merge/deploy.

## Admin checks
- Open `/admin/agent-os-readiness`
- Open `/admin/agent-inventory-boundary`
- Confirm `agent_os_allow_legacy_scheduling_inventory` is disabled
- Confirm inventory boundary shows no unexpected unresolved legacy inventory

## Public identity checks
- Open `/agents/:slug` for a published agent
- Confirm public profile renders real data
- Open legacy `/agent/profile/:agentId`
- Confirm it resolves/redirects to the canonical slug route
- Confirm unpublished agent profiles are not public

## Listing and enquiry checks
- Create or use an active agent listing
- Submit a public enquiry
- Confirm the listing owner sees the enquiry in listing management
- Confirm the same enquiry appears in the canonical CRM pipeline

## CRM checks
- Open `/agent/leads`
- Confirm lead source is visible
- Open lead detail
- Add a note/activity
- Move the lead stage and confirm it persists after refresh

## Scheduling checks
- Book a showing from CRM
- Confirm the showing appears on `/agent/calendar`
- Update the showing status
- Confirm the status persists after refresh
- Confirm unresolved legacy inventory is not bookable once cutover is disabled

## Analytics and activation checks
- Open `/agent/analytics`
- Confirm only real metrics are shown
- Confirm activation progress renders
- Confirm the publish CTA works for eligible unpublished agents

## Regression checks
- Confirm no mock public profile content is visible
- Confirm no fake analytics cards remain
- Confirm no mock lead route is the primary CRM path
- Confirm no scheduling flow depends on legacy-only inventory

## Test commands
Run the focused cutover tests:

```bash
npx vitest run server/__tests__/agent.inventory-cutover.test.ts server/__tests__/admin.inventory-boundary.test.ts
```
