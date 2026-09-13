# P5 legacy billing-family disposition

Status: disposition recorded; retirement remains a separate implementation packet.

The canonical Launch Access authority is the typed-account foundation:
`plans`, `plan_entitlements`, `subscriptions`, `billing_invoices`,
`billing_payments`, `billing_payment_documents`, `billing_audit_events`, and
`billing_provider_events`. No commercial agent, agency, or developer access
decision may read another billing family.

## Families with active non-commercial consumers

`user_subscriptions`, `subscription_plans`, and `subscription_events` remain
behind `subscriptionService` and `subscriptionRouter` for older trial and
rental-oriented categories. The router rejects agent, agency, and developer
commercial operations, and paid upgrades are disabled. These tables are a
separate legacy lifecycle, not a second Launch Access authority.

`partner_subscriptions` remains owned by the partner API and is keyed to
`partners`. Its tier, status, and partner-specific renewal semantics are not
interchangeable with a billable account. It requires an independent partner
packet before conversion or retirement.

`agency_subscriptions`, `invoices`, and `billing_transactions` are historical
or provider-shaped families. The active billing foundation deliberately does
not write them. They may be removed only after a reachability audit proves no
runtime route, job, report, or external reconciliation depends on them.

## Required retirement evidence

Before removing a family, record all imports, raw SQL references, scheduled
jobs, provider callbacks, and operational reports. Prove that the family has no
rows required by the pre-launch target plan, remove its consumers in one
coherent change, and add a negative contract that prevents new writes. A
conversion is allowed only when its lifecycle and ownership facts have a
written mapping to the canonical authority; name similarity is not sufficient.

This disposition does not authorize compatibility reads, dual writes, schema
guessing, or a backfill into `billable_accounts`.

## Reachability audit, 2026-09-11

The runtime census on `feat/database-architecture-takeover` found these active
legacy consumers:

- `subscriptionService.ts` and `subscriptionRouter.ts` read and write
  `user_subscriptions`, `subscription_plans`, and `subscription_events` for
  the retained non-commercial lifecycle. Agent, agency, and developer
  commercial operations are rejected before those calls.
- `partnerSubscriptionService.ts` and `partnerSubscriptionRouter.ts` read and
  write `partner_subscriptions`, whose owner is the `partners` table.

The census found no runtime read or write for `agency_subscriptions`,
`billing_transactions`, or the historical `invoices` table. The only remaining
references are the canonical baseline declarations, a negative governance
assertion, and disposable fixture cleanup. The unused `agencySubscriptions`
and `invoices` imports were removed from `adminRouter.ts` in commit
`8fa8c820`.

Read-only verification on the exact task-owned disposable target returned zero
rows in each of the seven legacy families (`agency_subscriptions`,
`billing_transactions`, `invoices`, `user_subscriptions`,
`subscription_plans`, `subscription_events`, and `partner_subscriptions`).
This supports pre-launch retirement planning; it does not authorize dropping
the retained non-commercial or partner families without their own ownership
review.

This is reachability evidence for the next retirement packet; it is not itself
permission to drop the historical tables. That packet must still verify target
row counts, scheduled jobs, provider callbacks, reports, and external
reconciliation before removing them and must add a negative write contract.
