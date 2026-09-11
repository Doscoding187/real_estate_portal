# P5 senior review

Status: incomplete; typed ownership is accepted on the exercised foundation
paths, while provider crash/replay and legacy-family retirement evidence remain
open.

Independent verification on the task-owned disposable target:

- `pnpm test:authority -- server/__tests__/billing.foundation.acceptance.integration.test.ts`
  — 2 physical tests passed.
- `pnpm test:authority -- server/__tests__/billing.provider-independent.contract.test.ts server/__tests__/developer.subscription-commercial.contract.test.ts`
  — 14 tests passed.

These tests prove agency EFT proof handling, duplicate approval idempotency,
partial-payment non-activation, rejection/correction behavior, provider
identity handling, entitlement gating, and positive integer minor-unit
validation.

P5 is not accepted because independent
entitlement race evidence and retirement of distinct legacy subscription/
invoice families remain open. Migration 0085 established the
typed `billable_accounts` identity and staged foreign keys on the exact
disposable target; migration 0086 now enforces those five account references as
non-null after active readers, writers, and governed fixtures were migrated. The active manual-EFT billing service
now resolves or transactionally admits the typed account before writing
subscriptions, invoices, payments, payment documents, and audit events.
Plan-access entitlement reads and subscription writes now resolve the same
typed account identity as well.
Database-enforced billable ownership,
duplicate and out-of-order provider event handling, entitlement
expiry/cancellation races, and a verified retirement order are not yet proven.
The remaining cutover design is recorded in
`p5-billing-authority-decision.md` and `p5-billing-consumer-mapping.md`.
The legacy-family disposition and retirement evidence requirements are recorded
in `p5-legacy-family-disposition.md`.

Finding: incomplete evidence, severity high for future integrity. Typed
identity, active manual-EFT writes, account-scoped readers, and non-null
enforcement are implemented. Migration 0087 now provides due-time provider
leases and token-fenced completion; required follow-up is entitlement
expiry/cancellation race tests and an independently
verified retirement order for legacy billing families.
