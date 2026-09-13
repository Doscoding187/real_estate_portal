# P5 billing authority decision

Status: decision recorded; implementation remains required before P5 can be
accepted.

## Observed model

The canonical billing foundation used by the current agency billing routes is
`subscriptions`, `billing_invoices`, `billing_payments`,
`billing_payment_documents`, and `billing_audit_events`. Its invoice and
payment rows reference the subscription and each other, but ownership is the
polymorphic pair `(owner_type, owner_id)`.

The schema also contains `agency_subscriptions`, `invoices`,
`user_subscriptions`, `subscription_plans`, `subscription_events`, and
`billing_transactions`. These are not interchangeable: they use different
identifiers, statuses, provider fields, and lifecycle assumptions. The source
census shows active consumers in agency, developer, and commercial access
paths, so deleting or merging them by name would be unsafe.

## Decision

Introduce one explicit `billable_accounts` identity owned by the account and
organisation boundary. A billable account has a stable ID, account kind, and
typed foreign keys/constraints for its owning user, agency, or developer
organisation. `subscriptions`, invoices, payments, payment documents, audit
events, and entitlement grants reference that ID; owner snapshots may remain
for historical display but are not authorization keys.

The migration must first establish a complete mapping for every active billing
consumer and reject unmappable rows on the disposable target. Provider event
identity belongs in a dedicated idempotency key unique per provider and event
ID. Monetary amounts remain positive integer minor units with an explicit
three-letter currency. Entitlement validity is derived from recorded period
boundaries and revocation state, never from a denormalized boolean alone.

The existing families remain separate until their product ownership and
lifecycle traces prove they can be retired. The implementation packet must
select the one active authority per product path, migrate readers and writers,
and add negative tests for cross-account access, duplicate/out-of-order events,
expiry, cancellation, and exact totals. No compatibility reads or polymorphic
fallbacks are permitted.

## Alternatives rejected

- Keeping `(owner_type, owner_id)` and relying on application checks leaves
  orphanable billing facts and cannot satisfy database-enforced ownership.
- Adding three nullable typed owner columns to every billing table duplicates
  account identity and permits inconsistent combinations without a central
  billable owner.
- Merging all similarly named subscription and invoice tables now would erase
  distinct provider and product lifecycles before their consumers are traced.

## Open implementation questions

P5 still owns the mapping of developer organisations versus agencies, the
retirement order of the legacy families, webhook/provider event semantics, and
the entitlement publication gate. These questions are implementation work,
not permission to preserve the polymorphic pair as a second authority.
