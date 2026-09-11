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

P5 is not accepted because the current model still uses polymorphic
`(owner_type, owner_id)` keys and contains multiple subscription/invoice
families with distinct lifecycle semantics. Database-enforced billable
ownership, duplicate and out-of-order provider event handling, entitlement
expiry/cancellation races, and a verified retirement order are not yet proven.
The recommended `billable_accounts` design is recorded in
`p5-billing-authority-decision.md`; no schema migration is admitted until the
consumer mapping is complete.

Finding: incomplete evidence, severity high for future integrity. Required
follow-up is implementation of the billable-account identity, migration of
all active readers/writers, and independent physical race/event tests.
