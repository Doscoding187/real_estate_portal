# P1 implementation packet — consumer activity integrity

Status: **implemented; senior review pending**

## Commit and scope

- Base commit: `3d842600953c688c526d74add48eae384cfce129` (P0 baseline)
- Implementation commit: `05868f470` (`test: prove consumer activity persistence under concurrency`)
- Branch: `feat/database-architecture-takeover`
- Worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-database-architecture`
- Scope: physical consumer favorites/recent-view concurrency, guest transfer
  atomicity and replay, public withdrawal behavior, account isolation, UTC
  connection sessions, and real browser save/login/reload behavior.
- Schema/migrations: no schema or migration files changed in P1. Existing
  uniqueness and canonical-listing migrations remain the authority.

## Selected target and data handling

All physical checks used the task-owned disposable local MySQL target selected
by Database Authority:

- Sanitized URL: `mysql://127.0.0.1:3307/listify_wt_database_architecture_03a7cfff648c`
- Target fingerprint: `806c61e7e0d23daf1c70942dc80e91884d2778cc31d6c95ebef8a2023ea207ca`
- Classification: `disposable-worktree`; ownership: `exact-worktree-owned`
- Migration head: `0074_retire_legacy_prospects.sql`
- Model digest: `845a2cf0fae772496af2a313e3be11dbec82a1550b1dfaf9c0e43d497e2a653d`
- Provider/dialect: local MySQL

The integration and browser fixtures create unique visitor accounts and remove
their facts in teardown. The duplicate projection used by the ambiguity test
is removed in teardown. No remote, hosted, shared, staging, production, or
quarantined target was accessed.

## Before and after

Before P1, consumer behavior had contract-level coverage but no proof that
independent database sessions serialized the existing transactions, that
timestamps were durable UTC values, or that the live login/reload journey
cleared guest state only after a successful transfer.

After P1:

- Favorite desired state is serialized by the authenticated user row and is
  backed by the existing `(user_id, property_id)` uniqueness constraint.
- Recent activity is serialized by the same account mutex, keyed by the
  canonical authored `listingId`, and ordered by UTC recency plus ID.
- Guest transfer validates all public projection identities before the
  transaction, resolves each to an explicit source listing, locks the account,
  and rolls back all writes if a later write fails.
- Every authority-created MySQL connection establishes `+00:00` for its
  session; runtime pool tests check four simultaneously leased physical
  sockets.
- Public reads re-resolve current eligibility. A private fact admitted before
  withdrawal can remain durable, while withdrawn inventory is hidden from
  public favorites/recent-view responses.
- The browser proof performs real login, guest transfer, removal/save, and
  reload assertions. Guest local storage is cleared only after success and an
  empty persistence effect cannot recreate the cleared key.

## Changed surfaces and ownership

- `server/_core/databaseAuthority/connectionAuthority.ts`: UTC session setup
  for SQL connections, runtime pools, and local lifecycle connections.
- `server/db.ts`: dependency-seamed implementations of the existing favorite
  and listing-view transactions; normal runtime entrypoints still obtain the
  canonical database and call those implementations.
- `server/guestMigrationRouter.ts`: the existing mutation body is exposed as
  `migrateGuestActivity` for physical independent-pool execution; the router
  continues to supply the authenticated user and canonical database.
- `client/src/contexts/GuestActivityContext.tsx`: empty guest state removes the
  storage record and non-empty saves no longer mutate the React state object.
- `server/_core/databaseAuthority/dataAdapters/searchToLeadScenario.ts`:
  stable scenario identities are exported for contained physical fixtures;
  application code does not depend on them.
- `server/__tests__/integration.consumer-activity-persistence.test.ts`: nine
  real-MySQL tests with two independently authorized runtime pools and
  controlled transaction-admission barriers.
- `client/src/hooks/__tests__/useGuestDataMigration.persistence.test.tsx`:
  success/error client retention contract.
- `e2e/consumer-activity/persistence.spec.ts`,
  `playwright.consumer-activity.config.ts`, and
  `scripts/runPlaywrightUnderDatabaseAuthority.mts`: one authority-bound
  browser journey; child application processes inherit the exact target
  fingerprint and central non-database test settings without printing or
  persisting secrets.

No retired table, API, or parallel persistence authority was reintroduced.

## Decisions and invariants tested

1. Two identical saves leave one row; two identical views leave one row.
2. A view timestamp is interpreted as UTC even when the MySQL server's
   `SYSTEM` timezone is non-UTC.
3. Replaying a guest transfer is idempotent across independent pools.
4. A later favorite-write failure rolls back the earlier recent-view write,
   and the client retains transferable guest values on error.
5. Projection and authored-listing IDs are distinct; ambiguous or unavailable
   projections fail closed.
6. An unrelated account cannot read or remove another account's facts;
   the owner can remove a favorite after the property becomes unavailable.
7. A save/remove race is asserted against completion/commit order only; no
   network-order guarantee is claimed.
8. Public withdrawal is an admission-boundary decision: a fact admitted while
   public may remain private durable history, but current public readers hide
   it after withdrawal.

## Verification record

Commands were run from the implementation worktree. The target fingerprint
printed by the authority runner was `806c61e7e0d23daf1c70942dc80e91884d2778cc31d6c95ebef8a2023ea207ca`.

| Command | Result | Evidence |
| --- | --- | --- |
| `pnpm test:authority -- server/__tests__/integration.consumer-activity-persistence.test.ts` | PASS — 1 file, 9 tests | `server/__tests__/integration.consumer-activity-persistence.test.ts` |
| `pnpm test:authority -- server/__tests__/guest-migration.contract.test.ts server/__tests__/contract.public-inventory-authority-safety.test.ts` | PASS — 2 files, 16 tests | existing authority contract suites |
| `pnpm exec vitest run --config vitest.client.config.ts client/src/hooks/__tests__/useGuestDataMigration.persistence.test.tsx` | PASS — 1 file, 2 tests | `client/src/hooks/__tests__/useGuestDataMigration.persistence.test.tsx` |
| `pnpm test:browser:authority -- --config=playwright.consumer-activity.config.ts` | PASS — 1 browser test | `e2e/consumer-activity/persistence.spec.ts` |
| `pnpm db:scenario:prepare` / `pnpm db:scenario:verify` | PASS — scenario v3; 3 eligible properties, 1 development; replay and authorization checks pass | authority scenario output; digest `96e652b225d1762cba59da922343bb4e70a1df1e17c23a4c341c161cc75832c8` |
| `pnpm check` | PASS — TypeScript no errors | terminal completion |
| `pnpm lint:check` | PASS — 0 errors, 10,608 pre-existing warnings | terminal completion |
| `pnpm schema:inventory:check` | PASS — deterministic/current | terminal completion |
| `pnpm schema:sanity` | PASS — 213 canonical tables, 75 active SQL files | terminal completion |
| `pnpm db:authority:check` | PASS — 33 files, 271 tests; 118 utility surfaces; lifecycle contract passed | terminal completion |
| `git diff --check` | PASS | terminal completion before commit |
| `pnpm db:authority:status` | PASS — target connected, exact-worktree-owned, schema-congruent, head 0074 | terminal completion |

No migration plan/apply or fresh empty-schema contract was needed for this
packet because P1 changes no schema or migration lineage. The P0 fresh-schema
proof through 0074 remains the schema evidence; P1 adds behavior evidence on
that established target.

## Limits and follow-up

- The physical race evidence is for MySQL. TiDB locking and session-timezone
  semantics remain explicitly unverified and belong to P9/provider validation.
- The browser test uses the contained scenario fixture and one desktop Chrome
  project; broader device coverage is outside P1.
- P2 remains responsible for replacing lead delivery JSON with relational
  obligations and attempts. P3–P8 remain open domain packets.

Senior review must inspect commit `05868f470`, re-run the decisive physical and
browser tests, and record findings and disposition in this file or a linked
review record.
