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

Demand campaign listing and agent lead-summary queries were also returning
empty/default success values when capability probing found the schema absent or
when reads failed. Those paths now fail with `PRECONDITION_FAILED` and let
unexpected read errors surface; a focused authority contract and TypeScript
check pass. Demand rollback and broader lifecycle evidence remain part of the
incomplete P8/P9 review.

The disabled suburb-review mutation also returned a nominal `{ success: false }`
payload from a public route. It now fails with `PRECONDITION_FAILED` before
acknowledging a write; its declared response shape remains for generated client
types. A focused location-insights authority contract and TypeScript check
pass. Review storage and read-path authority remain unimplemented.

Price insights also contained runtime schema guessing between camelCase and
snake_case location columns, plus query-error responses that fabricated empty
tabs, aggregates, or heatmaps. The router now uses the canonical physical
columns and fails with `PRECONDITION_FAILED` for unavailable reads. Its focused
authority contract and TypeScript check pass; query-plan evidence remains open.

The price-insights service micromarket query also swallowed database errors as
an empty result. It now propagates the error to the router's explicit
`PRECONDITION_FAILED` boundary, with the authority contract covering the
behavior.

Distribution partner terms had an unregistered compatibility path that probed
`brochure_config_json`, retried the query without that canonical field, and
served partial terms. The fallback and readiness probe are removed; the
canonical field is now part of the single query authority. Distribution schema
guard and authority contracts pass with TypeScript validation.

Agency and super-admin dashboard analytics also converted database failures
into zero-valued success data. Those authenticated reads now fail explicitly
with `PRECONDITION_FAILED`; missing agency membership is rejected with
`FORBIDDEN`. The dashboard authority contract, agency workspace smoke, and
TypeScript check pass.
