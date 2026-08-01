## Database change checklist

Complete this section when the change affects schema, database data, migrations,
seeds, fixtures, diagnostics, or database lifecycle:

- [ ] The change is classified as additive, data-transition, or destructive/incompatible.
- [ ] Schema changes use the canonical migration runner, ledger, and Drizzle ownership.
- [ ] Data-transition or backfill work records its owner, target guard, idempotency/restart behaviour, verification, and containment/restore evidence.
- [ ] Destructive changes use expand-and-contract where applicable and include rollback or containment evidence.
- [ ] Local/demo data uses only the guarded canonical local/test lifecycle; no production seed authority was added.
- [ ] `pnpm db:authority:check` passes.

Protocol: `docs/database-authority/database-change-protocol.md`
