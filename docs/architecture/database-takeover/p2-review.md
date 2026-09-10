# P2 review evidence

P2 replaces the mutable `leads.delivery_attempts` JSON field with relational
`lead_deliveries` and append-only `lead_delivery_attempts`. Capture, routing
correction, publisher delivery, worker claims, recovery, reporting, and
consumer readers use the relational authority. The retained lead delivery
columns are transactional summaries of the current primary custody row.

The disposable worktree target is fingerprint
`806c61e7e0d23daf1c70942dc80e91884d2778cc31d6c95ebef8a2023ea207ca`, at
manifest head `0076_lead_delivery_relational_authority.sql`. Desired and
physical schema digest is
`7e2387a47326e2ee289910c4a64a4336b1a56ec00a0ca1feef3cc08d612061f9`.

Evidence completed:

- `pnpm db:authority:status`
- `pnpm db:authority:check`
- `pnpm db:schema:congruency`
- `pnpm test:authority -- server/__tests__/integration.lead-delivery-authority.test.ts` — 7 tests passed
- focused delivery, capture, correction, audit, conversion, and publisher contracts — 77 tests passed across the reviewed runs
- `pnpm check`
- `pnpm lint:check`
- `git diff --check`

The physical suite proves independent-worker claim serialization, atomic
capture rollback, restart visibility, lease-expiry uncertainty fencing,
provider crash uncertainty, UTC due/retry behavior, and routing supersession.
Expired leases become `unknown` because provider acceptance cannot be ruled out;
ordinary retries and the runnable worker refuse to dispatch them. The worker is
a supervised one-shot entrypoint at `scripts/runLeadDeliveryWorker.ts` and is
invoked by `pnpm lead-delivery:worker`.

The publisher email adapter now passes the delivery idempotency key through to
Resend's provider request options, and the supervised worker dispatches only
claims with that supported contract. Unsupported channels remain explicitly
quarantined as `attention_required`.

Optional agent and Shared Living in-app notification intent is now inserted in
the same capture transaction as the lead and primary delivery obligation;
optional email alerts run only after that durable intent commits.

P2 remains review-open for independent provider crash/replay evidence against
the live adapter and for the final reconciliation and authorization packet.
