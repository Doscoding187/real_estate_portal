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
success response; a contract test covers the gate. The placeholder module and
the companion boost integration were removed in commits `7aec6eb2` and
`aee4fdac`, and the typed marketing router gates were consolidated in
`5cf3c477`. A canonical campaign/billing authority remains required before
campaign launch is implemented.

Finding: incomplete evidence, severity medium. Required follow-up is a public
media rebuild comparison, analytics aggregate rebuild proof with bounded query
evidence, and final packet/provider review.

On 2026-09-11, the remaining disabled monetized-placement procedures were
closed explicitly: `getAllRules`, `getHeroAd`, and `getFeaturedDevelopers` now
fail with `PRECONDITION_FAILED` until a canonical placement authority is
approved. They no longer return fabricated empty/null success values. The
admitted `getRecommendedAgents` resolver remains live and is covered by the
agents-serving-location contract (7 tests passed).

The same review found `getAggregatedMetrics` converting a missing Explore
analytics table into zero-valued success data. That schema-error fallback now
fails with `PRECONDITION_FAILED`, covered by the Explore analytics authority
contract. Aggregate rebuildability and query-plan evidence remain open.
