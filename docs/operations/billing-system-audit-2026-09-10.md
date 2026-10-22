# Billing System Audit - 2026-09-10

Status: canonical manual-EFT billing is implemented; production activation is
configuration-gated and has not been verified against a reachable database.

## Scope

This audit covers the active billing router and service, canonical commercial
catalogue, subscription and invoice models, payment-proof storage, finance
review, launch preflight, routed agency billing workspace, and billing contract
tests.

The governing commercial decision is manual EFT with invoice, proof upload,
finance verification, and canonical subscription activation. A payment
provider is not currently an active billing authority.

## Findings

### Confirmed

- Products come from canonical `plans` rows and benefits/limits come from
  `plan_entitlements`.
- Paid access is granted only by verified billing state and canonical
  `subscriptions`.
- Agency, agent, and developer Launch Access use owner-scoped once-off
  invoices with the `paid_launch_access` term.
- Payment proof is validated for type and size, stored privately, linked to
  the invoice, and recorded in billing audit events.
- Finance review is restricted to `super_admin` and uses transaction locks
  before changing payment, invoice, and subscription state.
- Duplicate invoice requests reuse a matching outstanding invoice.
- Rejected or correction-required proof returns an unpaid invoice to an
  actionable `issued` state.
- The routed agency workspace is the canonical user-facing billing surface.
  It calls `billing.*` procedures and supports invoice issue, EFT details,
  proof upload, cancellation, and reactivation.
- Production preflight requires payable EFT details, private durable proof
  storage, transactional email, production-safe URLs, and an exact protected
  database target.

### Debt and risks

- The repository retains historical Stripe-shaped columns, types, revenue
  projections, and an older subscription router. These are not active paid
  state authorities, but they remain retirement debt and must not be wired
  back into the active flow.
- Unrouted legacy agency billing screens still contain mock proof URLs,
  card-payment controls, and an upgrade TODO. They must remain unreachable;
  deleting or adapting them should be a separate UI-retirement change.
- The recurring agency billing path remains available alongside fixed-term
  Launch Access. Its product, renewal, tax, and cancellation policy must be
  explicitly approved before being exposed as a public offer.
- The current authority-managed local database was unreachable during this
  audit, so database-backed acceptance coverage could not run.

## Production setup checklist

1. Add real EFT account name, bank name, branch code, account number, account
   type, and billing support email through the deployment secret manager.
2. Configure private S3 billing-proof storage with a dedicated bucket or
   prefix, region, credentials, and server-side encryption policy.
3. Configure transactional email with a verified sender and `RESEND_API_KEY`.
4. Provision or validate the protected database through the Database Authority
   release workflow. Do not use `db:push`, ad hoc DDL, or `listify_local`.
5. Release the canonical commercial reference data and verify the Launch Access
   plans and entitlements.
6. Run launch preflight, migration/readiness checks, and the billing
   acceptance suite against the approved target.
7. Perform one controlled end-to-end payment proof test using a non-production
   invoice, then confirm finance approval activates exactly one subscription
   term and sends the expected notifications.

## Evidence

- `pnpm db:authority:status`: passed authority checks; local service/database
  availability was `database-unreachable`.
- Focused billing contracts: 20 passed, 2 database-backed tests skipped.
- `pnpm check`: passed.

## Conclusion

The billing domain is structurally ready for the approved manual-EFT launch
path. It is not production-ready until deployment secrets, private proof
storage, email, canonical commercial reference data, and a reachable
authority-approved database have been verified. Stripe configuration is
removed from the environment templates because it is not an active billing
dependency.
