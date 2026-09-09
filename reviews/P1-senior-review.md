# P1 senior review — consumer activity integrity

Status: **accepted after correction**  
Review date: 2026-09-09  
Reviewer: `/root` (senior product-architecture review)  
Branch: `feat/database-architecture-takeover`  
Worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-database-architecture`

## Scope and implementation

P1 covers authenticated favorites and recent views, guest activity transfer,
public withdrawal, account isolation, UTC database sessions, and the real
browser journey. The implementation was delivered in `05868f470`; the
senior-review corrections are in `c378e12ce21362cb25047f2ba6c660bf2507cbe4`.
The correction commit is the accepted implementation boundary.

The physical target was the exact task-owned disposable MySQL database:

- fingerprint: `806c61e7e0d23daf1c70942dc80e91884d2778cc31d6c95ebef8a2023ea207ca`
- migration head: `0075_recently_viewed_microsecond_recency.sql`
- model digest: `f6416d31d84609203c96e00f7b2455acd78b3a4d0b2c0d8aaa232a2c44b30328`
- manifest digest: `a9314a64f9e6015e34cbcaa8c6139d9b73a15b67f639aa96e704f476c71103b0`

The target was disposed and recreated under the pre-launch authorization before
the fresh contract run. No remote, hosted, shared, staging, production, or
protected target was accessed.

## Review findings and disposition

The initial implementation was reviewed by reading its diff, tracing each
writer and reader to the canonical schema, and rerunning the physical and
authority gates. Five findings were corrected before acceptance:

1. The concurrency barrier was outside the actual transaction. It now runs
   after `database.transaction` has opened and acquired a real MySQL connection,
   so the race proof covers transaction admission rather than test scheduling.
2. A failed runtime-pool session setup could leave a pool open. The connection
   authority now closes the newly created pool on every setup failure.
3. The browser fixture sent an `INSERT` through a row-only helper, producing an
   invalid insert-id path. Browser writes now use the raw execute helper and
   row reads use the row helper.
4. MySQL's default second precision could collapse rapid recent-view writes.
   Migration `0075` changes `recently_viewed.viewedAt` to `timestamp(6)`, and
   the locked account row allocates strictly increasing database-clock
   microseconds. The migration is admitted under
   `DBX-PRELAUNCH-CONSUMER-ACTIVITY-RECENCY-2026-09-09-Edward`, with SHA-256
   `e205efe19a742dced7bd1e18cf4dd75f4f37074cae62e8373e7e6b9687d30938` and
   parent checksum
   `b0d6cbab8f0ac521d478a371dab62e0e23a7c0e35f8d304a42394eb43cefed14`.
5. Guest transfer left an authenticated favorites query stale on the current
   detail page. Successful transfer now invalidates that query before local
   guest state is cleared; failure keeps the local state and does not
   invalidate.

## Acceptance evidence

| Invariant | Evidence |
| --- | --- |
| Duplicate saves and views converge to one row | Nine-test independent-pool MySQL integration suite |
| Recent-view order survives rapid commits and host timezone differences | Physical microsecond and UTC assertions in the integration suite |
| Guest transfer is atomic, replay-safe, and resolves projection IDs explicitly | Integration suite, guest migration contract, public inventory safety contract |
| Later transfer failure rolls back earlier writes | Injected failure case in the integration suite and client retention test |
| Unavailable or ambiguous public inventory fails closed | Public inventory safety contract and integration cases |
| Account isolation and owner removal after withdrawal hold | Integration suite |
| Real login, transfer, save/remove, and reload behavior holds | Authority-bound Playwright browser test |

The fresh canonical establishment command completed with exit code 0 and plan
ID `0b8448faf4e0955992a0f305`. It applied the manifest from an empty target
through 0075, then passed foundation, reference, scenario, schema congruency,
distribution, and Search-to-Lead readiness. Scenario digest:
`96e652b225d1762cba59da922343bb4e70a1df1e17c23a4c341c161cc75832c8`.

Independent verification also passed:

- P1 integration: 1 file, 9 tests.
- Authority consumer contracts: 2 files, 16 tests.
- Client migration persistence: 1 file, 2 tests.
- Browser: 1 Chrome journey.
- `pnpm check`: no TypeScript errors.
- `pnpm lint:check`: 0 errors and 10,640 warnings.
- `pnpm db:authority:check`: 33 files, 272 tests, utility and lifecycle gates passed.
- Schema inventory, sanity, congruency, migration-manifest, and authority
  status checks passed; status resolved head 0075 and the exact owned target.

`pnpm db:schema:tidb-audit` was not admitted because the existing provider
capability/provenance review is incomplete. This is recorded as a provider
limitation, not as TiDB execution evidence.

## Acceptance limits

The physical concurrency and session-timezone evidence is MySQL-only. TiDB
semantics, broader browser projects, and the remaining domain packets are
outside P1. P2 must replace the lead `deliveryAttempts` JSON authority with a
relational delivery and attempt model and provide its own implementation and
review packet.

Disposition: **P1 accepted; proceed to P2.**
