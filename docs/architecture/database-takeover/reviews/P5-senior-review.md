# P5 senior review

Status: incomplete; typed ownership, provider crash/replay fencing, and
obsolete-family retirement are accepted on the exercised disposable target.
Entitlement expiry/cancellation evidence remains open.

Independent verification on the task-owned disposable target:

- `pnpm test:authority -- server/__tests__/billing.foundation.acceptance.integration.test.ts`
  — 2 physical tests passed.
- `pnpm test:authority -- server/__tests__/billing.provider-independent.contract.test.ts server/__tests__/developer.subscription-commercial.contract.test.ts`
  — 14 tests passed.
- `pnpm test:authority -- server/__tests__/integration.billing-provider-event-identity.test.ts`
  — 4 physical tests passed, covering duplicate identity, claim fencing,
  retry recovery, and bounded exhaustion.
- `pnpm test:authority -- server/__tests__/integration.agency-principal-bootstrap.test.ts`
  — 4 physical tests passed, including concurrent checkout reuse and checkout
  racing finance approval without duplicate invoices.

These tests prove agency EFT proof handling, duplicate approval idempotency,
partial-payment non-activation, rejection/correction behavior, provider
identity handling, entitlement gating, and positive integer minor-unit
validation.

P5 is not accepted because independent entitlement expiry/cancellation race
evidence remains open. Migration 0085 established the
typed `billable_accounts` identity and staged foreign keys on the exact
disposable target; migration 0086 now enforces those five account references as
non-null after active readers, writers, and governed fixtures were migrated. The active manual-EFT billing service
now resolves or transactionally admits the typed account before writing
subscriptions, invoices, payments, payment documents, and audit events.
Plan-access entitlement reads and subscription writes now resolve the same
typed account identity as well.
Database-enforced billable ownership and provider-event identity/lease fencing
are now exercised on the disposable target. Entitlement expiry/cancellation
races and a verified retirement order for the distinct legacy billing families
are not yet proven.
The remaining cutover design is recorded in
`p5-billing-authority-decision.md` and `p5-billing-consumer-mapping.md`.
The legacy-family disposition and retirement evidence requirements are recorded
in `p5-legacy-family-disposition.md`.

Finding: incomplete evidence, severity high for future integrity. Typed
identity, active manual-EFT writes, account-scoped readers, non-null
enforcement, provider leases, and obsolete-family retirement are implemented.
Required follow-up is entitlement expiry/cancellation race testing.
