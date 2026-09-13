# P5 billing consumer mapping

Status: mapping complete for the current active foundation; migration remains
unimplemented pending review of the proposed `billable_accounts` cutover.

## Canonical foundation currently in use

The active manual-EFT and launch-access foundation is implemented by
`server/services/billingFoundationService.ts` and uses these tables:

- `plans` and `plan_entitlements` — plan catalogue and feature values.
- `subscriptions` — one current subscription per `(owner_type, owner_id)`.
- `billing_invoices` — invoice identity, amount, period, and owner snapshot.
- `billing_payments` — payment evidence and verification state.
- `billing_payment_documents` — private proof attached to a payment and invoice.
- `billing_audit_events` — immutable lifecycle audit records.

The ownership pair is currently a varchar plus integer and has no database
foreign-key authority. The service now admits only `agent`, `agency`, and
`developer` owner types at its typed/runtime boundary.

## Active writer and reader map

| Product path | Current entrypoints | Current owner key | Required billable-account mapping |
| --- | --- | --- | --- |
| Agency launch access / manual EFT | `server/routes/agentOnboarding.ts`, `server/billingRouter.ts`, `server/agencyRouter.ts`, `requestPaidLaunchAccessInvoice`, approval/rejection functions in `billingFoundationService.ts` | `agency.id` | `billable_accounts.account_kind = agency`, FK to `agencies.id` |
| Agent launch access | `server/routes/agentOnboarding.ts`, `requestPaidLaunchAccessInvoice` and owner access helpers in `billingFoundationService.ts` | `users.id` for owner type `agent` | `account_kind = agent`, FK to `users.id`; agent profile is not the billing principal |
| Developer launch access | `server/services/billingFoundationService.ts`, developer subscription and commercial access consumers | `developer_organisations.id` for owner type `developer` | `account_kind = developer`, FK to `developer_organisations.id` |
| Agency billing workspace | `server/billingRouter.ts` and billing procedures in `server/agencyRouter.ts` | agency pair on subscriptions/invoices/payments | Resolve one account row, then authorize through current agency membership |
| Developer/commercial entitlement reads | `server/services/publicDevelopmentEligibility.ts`, `server/services/developerSubscriptionService.ts`, `server/services/commercialCatalogService.ts` | developer subscription owner pair and plan entitlements | Resolve developer account; entitlement validity remains period/revocation based |
| Payment proof upload/review | `server/services/billingProofStorage.ts`, payment-document methods in `billingFoundationService.ts`, billing router | invoice/payment owner snapshot | Derive account through invoice or payment subscription; owner snapshot is display-only |

## Distinct families not yet mapped for retirement

These tables are still separate authorities or compatibility shadows and must
not be merged by name:

- `agency_subscriptions` (Stripe-shaped provider lifecycle).
- `user_subscriptions` and `subscription_plans` (legacy user subscription
  consumers in `server/subscriptionRouter.ts`).
- `invoices`, `subscription_events`, and `billing_transactions` (separate
  historical/provider-shaped families).
- `partner_subscriptions` (partner API in `server/partnerSubscriptionRouter.ts`).

Each family needs an owner/product lifecycle trace before retirement or
conversion. No active foundation reader may silently fall back to one of these
families.

## Cutover requirements

1. Add `billable_accounts` with mutually exclusive typed owner FKs for user,
   agency, and developer organisation, plus a uniqueness constraint per owner.
2. Add a non-null `billable_account_id` FK to every active foundation table;
   retain owner snapshots only where needed for historical display.
3. Establish all account rows before converting any consumer. Abort on an
   unmappable owner or duplicate owner identity.
4. Change billing service queries and authorization to use the account FK.
   Owner type/id may not remain an authorization predicate after cutover.
5. Add provider-event identity with a unique provider/event key before any
   webhook consumer is admitted.
6. Prove cross-account denial, duplicate/out-of-order events, expiry,
   cancellation, and exact monetary totals using independent connections.

This mapping closes the P5 consumer-census deliverable. It does not claim the
schema migration, legacy-family retirement, or provider-specific semantics are
complete.
