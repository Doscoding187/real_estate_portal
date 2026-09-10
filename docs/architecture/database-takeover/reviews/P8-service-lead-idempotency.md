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
0080 adds the nullable historical-compatible column and unique request key;
the current head is `0080_service_lead_request_idempotency.sql`.

## Verification

- `pnpm check` — passed.
- `pnpm db:migrate:plan` — passed; one pending migration, 2 statements.
- `pnpm db:migrate:apply -- --accepted-old-head=0079_explore_engagement_event_identity.sql --expected-new-head=0080_service_lead_request_idempotency.sql` — applied successfully with verified lock ownership.
- `pnpm db:schema:congruency` — passed; desired and actual digest `69f4bf73e6ac9dc81b2be8b2cc36333e33d7a1ec6917ea392cbcc68466ac73fd`.
- `pnpm schema:inventory:check` and `pnpm schema:sanity` — passed; 215 canonical tables and 81 active SQL migrations.
- Migration and authority contract tests — 19 focused tests passed after updating the current-head expectations.

## Remaining evidence

The service-specific physical replay test is still required: two independent
requests with the same client request ID should produce one lead per provider,
one event per lead, and identical returned IDs. The current packet proves the
database constraint and transactional implementation but does not claim that
physical replay behavior until that integration test is added.
