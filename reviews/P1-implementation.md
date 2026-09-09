# P1 implementation packet — consumer activity integrity

Status: **implemented; senior review correction complete**

## Commit and scope

- Base commit: `3d842600953c688c526d74add48eae384cfce129` (P0 baseline)
- Implementation commit: `05868f470` (`test: prove consumer activity persistence under concurrency`)
- Senior-review correction commit: `c378e12ce21362cb25047f2ba6c660bf2507cbe4`
  (`fix: make consumer recency ordering authoritative`)
- Branch: `feat/database-architecture-takeover`
- Worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-database-architecture`
- Scope: physical consumer favorites/recent-view concurrency, guest transfer
  atomicity and replay, public withdrawal behavior, account isolation, UTC
  connection sessions, and real browser save/login/reload behavior.
- Schema/migrations: P1 adds the admitted `0075` precision correction to the
  existing canonical recent-view model. The migration and runtime change are
  reviewed together; no compatibility table or alternate writer was added.

## Selected target and data handling

All physical checks used the task-owned disposable local MySQL target selected
by Database Authority:

- Sanitized URL: `mysql://127.0.0.1:3307/listify_wt_database_architecture_03a7cfff648c`
- Target fingerprint: `806c61e7e0d23daf1c70942dc80e91884d2778cc31d6c95ebef8a2023ea207ca`
- Classification: `disposable-worktree`; ownership: `exact-worktree-owned`
- Migration head: `0075_recently_viewed_microsecond_recency.sql`
- Model digest: `f6416d31d84609203c96e00f7b2455acd78b3a4d0b2c0d8aaa232a2c44b30328`
- Manifest digest: `a9314a64f9e6015e34cbcaa8c6139d9b73a15b67f639aa96e704f476c71103b0`
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
  empty persistence effect cannot recreate the cleared key. Successful
  migration also invalidates the authenticated favorites query so the detail
  page reflects the committed transfer immediately.

## Senior-review correction

The review of the initial implementation found four implementation issues and
one cache issue, all corrected in `c378e12c`: the concurrency barrier was
outside the real transaction, runtime-pool setup could leak a pool when
verification failed, the browser fixture used a row-only helper for an INSERT,
second-precision recent-view timestamps could not preserve rapid committed
ordering, and the authenticated favorites query could remain stale after
transfer. The correction moves
the barrier inside already-open MySQL transactions, closes failed pools,
separates browser `execute` from row reads, and adds migration `0075` plus a
database-clock microsecond allocator under the locked account row. The review
also invalidates the authenticated favorites query after a successful guest
transfer.

Migration `0075_recently_viewed_microsecond_recency.sql` is the single
`MODIFY COLUMN` statement admitted under
`DBX-PRELAUNCH-CONSUMER-ACTIVITY-RECENCY-2026-09-09-Edward`; its SHA-256 is
`e205efe19a742dced7bd1e18cf4dd75f4f37074cae62e8373e7e6b9687d30938`, parent
`0074_retire_legacy_prospects.sql` with checksum
`b0d6cbab8f0ac521d478a371dab62e0e23a7c0e35f8d304a42394eb43cefed14`.

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
| `pnpm test:authority -- server/__tests__/integration.consumer-activity-persistence.test.ts` | PASS — 1 file, 9 tests; independent pools, transaction barriers, rollback and withdrawal evidence | `server/__tests__/integration.consumer-activity-persistence.test.ts` |
| `pnpm test:authority -- server/__tests__/guest-migration.contract.test.ts server/__tests__/contract.public-inventory-authority-safety.test.ts` | PASS — 2 files, 16 tests | existing authority contract suites |
| `pnpm exec vitest run --config vitest.client.config.ts client/src/hooks/__tests__/useGuestDataMigration.persistence.test.tsx` | PASS — 1 file, 2 tests | `client/src/hooks/__tests__/useGuestDataMigration.persistence.test.tsx` |
| `pnpm test:browser:authority -- --config=playwright.consumer-activity.config.ts --reporter=list` | PASS — 1 browser test; real login, guest transfer, immediate save/remove, and reload persistence | `e2e/consumer-activity/persistence.spec.ts` |
| `pnpm db:scenario:prepare` / `pnpm db:scenario:verify` | PASS — scenario v3; 3 eligible properties, 1 development; replay and authorization checks pass | authority scenario output; digest `96e652b225d1762cba59da922343bb4e70a1df1e17c23a4c341c161cc75832c8` |
| `pnpm check` | PASS — TypeScript no errors | terminal completion |
| `pnpm lint:check` | PASS — 0 errors, 10,640 warnings | terminal completion |
| `pnpm schema:inventory:check` | PASS — deterministic/current | terminal completion |
| `pnpm schema:sanity` | PASS — 213 canonical tables, 76 active SQL files | terminal completion |
| `pnpm db:authority:check` | PASS — 33 files, 271 tests; 118 utility surfaces; lifecycle contract passed | terminal completion |
| `git diff --check` | PASS | terminal completion before commit |
| `pnpm db:authority:status` | PASS — target connected, exact-worktree-owned, schema-congruent, head 0075 | terminal completion |
| `pnpm db:authority:consumer-contract` | PASS — fresh exact disposable target; migration plan `0b8448faf4e0955992a0f305`; all canonical establishment, scenario, congruency, distribution, and readiness steps completed | terminal completion; target fingerprint `806c61e7e0d23daf1c70942dc80e91884d2778cc31d6c95ebef8a2023ea207ca` |

The fresh contract disposed and recreated the exact task-owned target, then
applied the complete manifest from an empty schema through 0075. The canonical
scenario and readiness checks were rerun after that establishment. The
pre-launch target is disposable; no live or protected data was accessed.

## Limits and follow-up

- The physical race evidence is for MySQL. TiDB locking and session-timezone
  semantics remain explicitly unverified and belong to P9/provider validation.
- The browser test uses the contained scenario fixture and one desktop Chrome
  project; broader device coverage is outside P1.
- P2 remains responsible for replacing lead delivery JSON with relational
  obligations and attempts. P3–P8 remain open domain packets.

The senior findings and acceptance disposition are recorded in
`reviews/P1-senior-review.md` against correction commit `c378e12c`.
