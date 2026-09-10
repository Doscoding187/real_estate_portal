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

No partial schema change is admitted. The strongest future model needs an
explicit billable-account identity (or separate typed owner columns with a
database-enforced shape), followed by a migration of subscription, invoice,
payment, audit, and entitlement consumers. Required proof includes duplicate
and out-of-order payment events, exact minor-unit totals, expiry and
cancellation races, and denial of publication after entitlement loss.
