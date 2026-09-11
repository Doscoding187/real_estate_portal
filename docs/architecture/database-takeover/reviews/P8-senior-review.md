# P8 senior review

Status: incomplete; exercised durability and tenant controls accepted for
continued work.

Independent authority verification on the disposable target:

- Service-engine request idempotency — 1 physical test passed.
- Demand-routing rollback — 1 physical test passed.
- Listing-media reconciliation and tenant boundary — 3 physical tests passed.

The evidence proves duplicate service requests collapse to one durable lead
and created event, demand routing rolls back its complete graph after an
injected failure, media reservations enforce owner scope, and deletion
invalidates outstanding confirmation tokens.

P8 remains incomplete. Public media rebuild equivalence, aggregate
rebuildability/query plans, and complete analytics retention/abuse controls are
not yet proven. The durable service-lead migration is at manifest head 0080,
with schema congruency verified separately. No retired-table fallback or
schema-error-to-zero reporting path is accepted.

The review found and corrected an active launch path that dynamically imported
`revenueCenterSync.ts`, where revenue and failed-payment tables are placeholder
objects. The path now fails with `PRECONDITION_FAILED` before any activation or
success response; a contract test covers the gate. Replacing the placeholder
module was completed after a caller census found no remaining imports. A
canonical campaign/billing authority remains required before campaign launch is
implemented.

Finding: incomplete evidence, severity medium. Required follow-up is a public
media rebuild comparison, analytics aggregate rebuild proof with bounded query
evidence, and final packet/provider review.
