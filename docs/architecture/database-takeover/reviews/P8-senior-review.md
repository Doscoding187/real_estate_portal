# P8 senior review

Status: incomplete; exercised durability and tenant controls accepted for
continued work.

Independent authority verification on the disposable target:

- Service-engine request idempotency — 1 physical test passed.
- Demand-routing rollback — 1 physical test passed.
- Listing-media reconciliation and tenant boundary — 3 physical tests passed.
- Current P8 durability/query rerun — 6 physical tests passed across media
  reconciliation, tenant deletion invalidation, Explore analytics query plans,
  service idempotency, and demand-routing rollback.

The evidence proves duplicate service requests collapse to one durable lead
and created event, demand routing rolls back its complete graph after an
injected failure, media reservations enforce owner scope, and deletion
invalidates outstanding confirmation tokens.

P8 remains incomplete. Public media rebuild equivalence, aggregate
rebuildability/query plans, and complete analytics retention/abuse controls are
not yet proven. The durable service-lead migration is at manifest head 0080,
with schema congruency verified separately in the historical P8 run. The
current takeover target is at manifest head 0088. No retired-table fallback or
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

The required-documents service also retried legacy column shapes and converted
missing tables into zero counts or empty document lists. Those fallbacks are
removed; canonical reads now propagate errors, while the mutation boundary
continues to translate missing schema into `PRECONDITION_FAILED`. Updated
service and distribution guard tests pass.

Required-document reads no longer retry legacy columns or convert missing tables
into empty/zero success data. Canonical reads propagate errors, while the
mutation boundary retains explicit `PRECONDITION_FAILED` handling. Updated
service and distribution guard tests pass.

Distribution access lookups no longer convert missing canonical tables into
absent rows. This prevents an upsert from creating records against an unknown
schema authority; missing-schema errors now propagate. Access-policy and
repository authority contracts pass with TypeScript validation.

Distribution access repository lookups now propagate missing-schema errors
instead of treating an unavailable table as an absent row. This prevents an
upsert from creating a new record against an unknown authority. Access-policy
and repository authority tests pass.

Distribution access status handling now uses the canonical enum values directly.
Legacy aliases are no longer normalized on reads or retried on writes, so stale
status values cannot silently cross the state-machine authority. The repository
contract and TypeScript checks pass; the provider integration suite was skipped
in this shell because no disposable `DATABASE_URL` was configured.

The exact disposable target was re-resolved on 2026-09-11 and the provider-backed
`distributionPartnerReferralSubmission.integration.test.ts` was rerun under
`pnpm test:authority`; all 8 tests passed against the MySQL target. This closes
the earlier unconfigured-shell limitation for the distribution access status
change, while TiDB/provider admission remains separately open.

Additional provider-backed distribution evidence passed on the same target:
partner-program terms (3 tests) and manager checklist (11 tests), 14 tests
combined under `pnpm test:authority`. These validate canonical field reads and
status/access lifecycle consumers.

The brand onboarding preset reader no longer converts a missing canonical preset
column into a valid `null` preset. Reads now propagate schema errors, while the
write path retains its explicit unavailable response. Updated preset service
tests and TypeScript validation pass.

Distribution access writes now require canonical lifecycle timestamp columns;
retry loops that dropped `included_at`, `excluded_at`, or `paused_at` after an
unknown-column error were removed. Canonical status/access tests and TypeScript
validation pass.

The listing-media tenant-boundary suite now also proves that a confirmation
token issued before listing reassignment is rejected by the live router after
custody changes. The disposable-target run passed 3 tests covering unrelated
reservation denial, deletion invalidation, and reassignment invalidation.
Public media rebuild equivalence remains open.

The distribution access policy no longer synthesizes legacy partnership/access
states from catalogue visibility or program presence. Only persisted canonical
partnership and development-access rows establish authority; the legacy fallback
reason codes are no longer emitted. Provider-backed referral and program-terms
suites passed 11 tests, with TypeScript validation passing.

The distribution catalogue listing endpoint no longer retries with a widened
fallback query after an empty result. Publisher, publication, and search
conditions are applied once by the canonical query, preventing silent scope
changes. Schema-guard and distribution authority contracts pass.

Distribution router reads no longer fall back from a missing primary manager to
an arbitrary active manager, or from a missing current agent tier to historical
rows. Current assignment and tier records are authoritative. Provider-backed
manager-checklist and referral suites passed 19 tests, with TypeScript passing.

The disconnected `analytics_aggregations` table had no active readers or
writers and contained zero rows on the exact disposable target. Migration 0089
retires it, removes its Drizzle authority, and records canonical event facts as
the replacement source for rebuildable aggregates. Inventory and schema checks
were regenerated; aggregate rebuild implementation and query-plan evidence
for retained projections remain open.

Location-page database reads were tightened: failures in public eligibility,
province city/development inventory, and suburb price analytics now propagate
instead of returning empty or null success data. Hierarchy and location-insights
authority tests passed 9 tests with TypeScript validation passing.

Explore recommended and area feeds no longer serve empty degraded success data
when a canonical query fails. Missing-schema errors retain the explicit
precondition boundary and other failures propagate. The fallback contract and
Explore authority tests pass 5 tests with TypeScript validation passing.

The remaining province trending-suburb query and suburb preview projection
handlers now propagate failures instead of returning empty success sections.
Location hierarchy tests passed 8 tests with TypeScript validation passing.

Partner analytics tier benchmarks and boost ROI stubs no longer return empty
success arrays. They now fail explicitly until canonical benchmark, campaign,
and billing attribution authorities are approved. The monetization smoke suite
passed 36 tests with TypeScript validation passing.

Location insights no longer emit fabricated mock pros/cons when the AI provider
is missing or fails. The service now reports an explicit unavailable error;
the location authority and hierarchy tests passed 9 tests with TypeScript
validation passing.

The similar-properties history endpoint no longer returns an empty successful
feed while its recent-view ranking workflow is unimplemented. It now fails with
an explicit precondition, protected by a new authority contract test; the
TypeScript check passed.

The similar-properties service now resolves Explore media through
`explore_content.reference_id` (the canonical property identity), fixing a
silent ID-domain mismatch. Its log-only engagement and default refined-weight
stubs now fail explicitly until a canonical engagement authority exists. The
similar-properties authority contract passed 2 tests with TypeScript
validation passing.
