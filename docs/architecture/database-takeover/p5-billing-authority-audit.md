# P5 billing authority audit

Billing currently has a coherent invoice-to-payment foreign-key chain and
unique invoice, payment-reference, and payment-idempotency keys. Monetary
values are stored as integer minor units in plans, invoices, payments, and
most entitlement paths; listing and deal prices remain decimal domain facts and
must not be mixed into billing arithmetic.

The main unresolved integrity gap is subscription and invoice ownership:
`ownerType` plus `ownerId` is polymorphic and cannot be enforced by a foreign
key. The same shape appears in billing audit events. A subscription can
therefore outlive or point at an invalid agency, agent, or developer unless
every writer and reader performs the correct application check.

The design decision and alternatives are recorded in
`p5-billing-authority-decision.md`. It recommends an explicit
`billable_accounts` identity while retaining the current families until their
consumer and lifecycle census proves a safe retirement order.

No partial schema change is admitted. The strongest future model needs an
explicit billable-account identity (or separate typed owner columns with a
database-enforced shape), followed by a migration of subscription, invoice,
payment, audit, and entitlement consumers. Required proof includes duplicate
and out-of-order payment events, exact minor-unit totals, expiry and
cancellation races, and denial of publication after entitlement loss.

The proof submission boundary now requires positive safe integer minor units at
both the router and service layers. Fractional values are rejected instead of
being silently rounded into a different payment amount. Billing acceptance
and launch-access contract suites continue to pass. The authority-run billing
acceptance and provider-independent suites currently pass 10 tests, covering
duplicate approval, partial-payment non-activation, proof-document access, and
provider-independent lifecycle rules. These tests do not remove the
polymorphic-owner modelling gap; an explicit billable-account design remains
the next schema decision.

The billing/provider-independent contract suites were rerun after the 0080
lineage update: `pnpm vitest run
server/__tests__/billing.provider-independent.contract.test.ts
server/__tests__/developer.subscription-commercial.contract.test.ts` passed
14 tests. The suites continue to validate explicit owner scope, provider
identity handling, entitlement gating, and the absence of listing-media
coupling in billing authority. Entitlement race proof remains a P5 review
item.


Fresh authority-run evidence: `pnpm test:authority -- server/__tests__/billing.foundation.acceptance.integration.test.ts` passed both physical billing acceptance tests against the disposable target. The scenarios verify agency EFT activation, duplicate approval idempotency, private proof-document handling, rejection/correction behavior, and partial-payment non-activation.
