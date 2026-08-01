# Agent OS Inventory Boundary — Current Code Reference

> **Current code map — not a cutover runbook.** The historical version mixed
> migration, backfill, feature-flag and rollback commands with unverified
> completion claims. Those instructions are retired.

The current, independently verifiable boundary is:

- The admin route registry exposes `/admin/agent-os-readiness` and
  `/admin/agent-inventory-boundary` in
  `client/src/pages/admin/adminRouteRegistry.tsx`.
- `client/src/pages/admin/AgentInventoryBoundaryPage.tsx` presents the
  linkage report and states that a schedulable listing must resolve to one
  canonical property through `properties.sourceListingId`.
- `server/adminRouter.ts` provides
  `getAgentInventoryBoundaryReport` and protects it with
  `superAdminProcedure`.
- `server/__tests__/agent.inventory-cutover.test.ts` covers the booking
  boundary, including rejection when no canonical property exists.
- `server/__tests__/admin.inventory-boundary.test.ts` covers the admin report
  and settings contract.

The focused smoke checklist is
[`AGENT_OS_PHASE1_SMOKE_CHECKLIST.md`](AGENT_OS_PHASE1_SMOKE_CHECKLIST.md).
It is validation guidance only; it does not authorize database changes or a
production cutover. Any data transition, backfill, migration, flag change or
rollback requires a separately approved operating contract and the canonical
[Database Authority entry contract](database-authority/00-database-authority-agent-entry.md).
