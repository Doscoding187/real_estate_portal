# P8 service-lead idempotency review packet

Status: implemented, senior review pending.

- Base commit: `1151907c`
- Final commit: `59e5c114`
- Branch/worktree: `feat/database-architecture-takeover` / `property-listify-database-architecture`
- Target: disposable worktree fingerprint `806c61e7e0d23daf`

## Change

Service-lead fan-out now accepts an optional request identity. The service
derives one when callers omit it, derives one unique request key per provider
obligation, and returns existing lead IDs on a complete replay. Lead creation
and its initial `created` event are committed in one transaction. Migration
0080 adds the request identity column and unique request key. This packet's
implementation and verification were run at head
`0080_service_lead_request_idempotency.sql`; the current takeover head is
`0088_retire_obsolete_billing_families.sql`.

## Verification

- `pnpm check` — passed.
- `pnpm db:migrate:plan` — passed; one pending migration, 2 statements.
- `pnpm db:migrate:apply -- --accepted-old-head=0079_explore_engagement_event_identity.sql --expected-new-head=0080_service_lead_request_idempotency.sql` — applied successfully with verified lock ownership.
- `pnpm db:schema:congruency` — passed; desired and actual digest `69f4bf73e6ac9dc81b2be8b2cc36333e33d7a1ec6917ea392cbcc68466ac73fd`.
- `pnpm schema:inventory:check` and `pnpm schema:sanity` — passed for the packet run; 215 canonical tables and 81 active SQL migrations.
- Migration and authority contract tests — 19 focused tests passed after updating the current-head expectations.

## Physical replay evidence

`pnpm test:authority -- server/__tests__/integration.services-engine-idempotency.test.ts`
passes against the disposable target. Two concurrent service requests with the
same client request ID return the same lead ID, report one idempotent replay,
persist one lead row, and persist exactly one `created` event. The test also
exercises the duplicate-key recovery path when both transactions race before
the uniqueness check becomes visible.

The broader P8 packet remains open for media, demand, and aggregate
rebuildability review.
