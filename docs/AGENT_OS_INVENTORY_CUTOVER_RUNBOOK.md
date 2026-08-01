# Agent OS Inventory Cutover

> **Historical runbook retired.** This document no longer authorizes
> migrations, backfills, rollback commands, feature flags, production changes,
> or direct database operations. Git history retains the former runbook.

The current inventory boundary is defined by the implementation and tests,
including:

- [`server/services/inventoryLinkResolver.ts`](../server/services/inventoryLinkResolver.ts);
- [`server/__tests__/agent.inventory-cutover.test.ts`](../server/__tests__/agent.inventory-cutover.test.ts); and
- [`server/__tests__/admin.inventory-boundary.test.ts`](../server/__tests__/admin.inventory-boundary.test.ts).

Any future inventory cutover, backfill, fallback change, or schema transition
requires a separately approved product and Database Authority workstream.
