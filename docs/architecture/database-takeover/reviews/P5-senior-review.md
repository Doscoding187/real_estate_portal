# P5 senior review

Status: incomplete; current billing foundation behavior is accepted only for
the exercised agency flow.

Independent verification on the task-owned disposable target:

- `pnpm test:authority -- server/__tests__/billing.foundation.acceptance.integration.test.ts`
  — 2 physical tests passed.
- `pnpm test:authority -- server/__tests__/billing.provider-independent.contract.test.ts server/__tests__/developer.subscription-commercial.contract.test.ts`
  — 14 tests passed.

These tests prove agency EFT proof handling, duplicate approval idempotency,
partial-payment non-activation, rejection/correction behavior, provider
identity handling, entitlement gating, and positive integer minor-unit
validation.

P5 is not accepted because active consumers still authorize through the
polymorphic `(owner_type, owner_id)` pair and multiple subscription/invoice
families retain distinct lifecycle semantics. Migration 0085 now establishes
the typed `billable_accounts` identity and staged foreign keys on the exact
disposable target, but its transitional columns remain nullable until all
active readers and writers are migrated. The active manual-EFT billing service
now resolves or transactionally admits the typed account before writing
subscriptions, invoices, payments, payment documents, and audit events.
Database-enforced billable ownership,
duplicate and out-of-order provider event handling, entitlement
expiry/cancellation races, and a verified retirement order are not yet proven.
The remaining cutover design is recorded in
`p5-billing-authority-decision.md` and `p5-billing-consumer-mapping.md`.

Finding: incomplete evidence, severity high for future integrity. The typed
identity and active manual-EFT writes are now implemented; required follow-up
is migration of all remaining readers/writers, non-null enforcement after that
cutover, and independent physical race/event tests.
