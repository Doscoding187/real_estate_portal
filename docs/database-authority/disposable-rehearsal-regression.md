# Exact Azure disposable rehearsal regression authority

Principal scope: **AZURE MYSQL 8.4 RESTORED-COPY REHEARSAL**, approved 2026-09-28.
Base/source: `a5fa6256f3579b16223586fa579f4ecd28c59ad6`. This correction changes
operation authority only; schema, migration files/checksums and production remain
unchanged. Code review is required before operational use. No live write, Azure
operation, deployment or upgrade is performed by this changeset or its tests.

## Identity and review boundary

The registration is [disposable-rehearsal-authorization.json](disposable-rehearsal-authorization.json).
It binds subscription `384dc69e-9e22-419f-9e3d-83fbac4f58d0`, resource group
`rg-property-listify`, server `pl-azure84-rehearsal-20260928`, database
`propertylistify_database`, port3306 and the exact Azure FQDN. It also binds the
provider, purpose, creation timestamp, 0094 manifest and canonical model digests.
The creation timestamp prevents silent reuse of a subsequently recreated server.

Classification requires BOTH the exact URL identity and an explicit resource-ID /
purpose binding. Unknown hosts and missing/wrong bindings remain shared-remote and
denied. Classification alone grants no operation. The sole admitted operation is
`rehearsal-regression`, with runtime credential class, explicit-caller URL, test
runtime mode, protected approval reference equal to the exact purpose, actor,
fingerprint and the existing exact-target acknowledgement. Using production's
DATABASE_URL fallback cannot qualify. The retained server and TiDB never qualify.

Conservative expiry: **2026-10-05 00:00 UTC**. Revoke on completion or identity
change; a later gate must renew through reviewed principal approval if expired.
Every probe rechecks status/expiry. Editing any registration field requires a new
process/review; existing sessions refuse changed or revoked registrations.

## Execution API and scope

The canonical connection authority now exports `createAuthorityRehearsalSession`.
It accepts only a genuine `rehearsal-regression` decision. Generic SQL connections,
Drizzle runtime pools and generic `test-fixture` still refuse this class. Do not
reroute a production or generic integration suite by changing DATABASE_URL.

Before exposing a probe session, the factory:

1. Authenticates a fresh Azure ARM GET itself using the existing Azure CLI login,
   explicit subscription and exact resource ID; it does not accept caller-supplied
   identity assertions. Verifies Ready, provider, FQDN, region, creation timestamp
   and MySQL8.0/8.4 family. A network runner must have this protected Azure read
   authority available; missing authority fails closed (do not bypass it).
2. Creates two dedicated MySQL connections with explicit host/port/database,
   certificate + hostname verification, TLS>=1.2 and multipleStatements=false.
   No socket/host override or arbitrary URL options are accepted. Verifies selected
   database, Azure MySQL version, live TLS cipher and UTC on both connections.
3. Obtains one named session lock, validates canonical schema/digest and all0094
   migration checksums, and rejects incomplete attempts or triggers.
4. Requires every canonical application table other than `plans` and
   `plan_entitlements` to be empty. This is intentionally stronger than sampled
   source-equivalence counts: populated business tables must be reviewed, never
   cleared to satisfy the gate. Canonical reference data and ledgers are read only.

The returned `run(connection, probe, slots)` accepts only a fixed catalogue in
`rehearsalProbes.ts`, not SQL strings or arbitrary record payloads. Two connections
permit locking/concurrency tests. Each run has at most256 probes and32 synthetic
slots. Numeric identities are reserved1900000000–1900000031, proved absent by the
empty-table preflight. Text identities derive from a random run UUID; emails use
example.test. INSERT/UPDATE/DELETE templates target only those identities.

Permitted catalogue: users/onboarding; topic/content-topic identity; transactional
email delivery/attempt identity and claim update; invalid billable-account CHECK
probe; partner-tier JSON fixture; UTC/engine and CTE/window reads. Transaction
begin/commit/rollback/savepoint controls support committed concurrent fixtures and
rollback tests. Onboarding helper callbacks can use the bounded onboarding probes.
SQL DDL, schema changes, server settings, arbitrary SQL, canonical reference writes,
ledger edits, seeds, DROP and TRUNCATE have no route through this API.

Always call `end()` in a finally block. It rolls back both sessions, cleans only
reserved fixture keys in child-before-parent order transactionally, and closes
connections/relinquishes the lock. Cleanup failure is visible, not silently retried.
If approval expires/revokes before cleanup, connections close after rollback and
committed fixture residue requires reviewed cleanup; do not extend approval
silently. Reopening with residue fails the empty-table preflight. Do not run other
writers or application deployments against the disposable copy during probes.

This is a bounded probe capability, not permission to run arbitrary application
integration tests that seed, migrate, reset or write references. Such tests must
use the approved catalogue/adapter; additional SQL templates require review.

## Review and static evidence

Focused tests cover exact identity admission; retained Azure, TiDB, other hosts,
wrong subscription/group/database/purpose; TLS/explicit URL requirements;
expiry/revocation; every generic/destructive operation refusal; authentic ARM
failure before SQL; dirty target/incorrect SQL engine/database/TLS refusal; bounded
probe compilation, cleanup and expiry during an open mocked session.

Tests mock ARM and MySQL. They do not claim live runtime/engine proof. Run
`pnpm db:authority:check`, `pnpm check`, `pnpm lint:check`, and `pnpm build`.

REFERENCE-DATA ADMISSION CONFLICT — SOURCE-PRESERVED / OPEN is unchanged.
The additional tax_treatment metadata is not removed, accepted or reseeded here.

Next action, only after this correction passes review: resume the Azure8.4
rehearsal on the exact disposable server, including the approved bounded probes.

## Completed verification — 2026-09-28

- `pnpm db:authority:status`: canonical context resolved; local disposable service
  unavailable, not initialized. No remote access performed.
- `pnpm db:authority:check`: PASS, 41 files / 379 tests, utility classification,
  schema sanity, deterministic inventory and lifecycle checks.
- Focused rehearsal tests: PASS, 37 tests, mocked ARM/MySQL only.
- `pnpm check`: PASS.
- `pnpm lint:check`: PASS, zero errors; repository warnings remain (11257 in the
  full run). Final focused lint: zero errors,12 any-type warnings.
- `pnpm build`: PASS; existing bundle-size advisory remains.
- `git diff --check`: PASS.
- No migration/model files changed; manifest SHA256 remains
  `93d871e6f8760477f460b8821685d71d212374eb86ddd53bc6e2ccfc30608efc`.

Exact changeset files:

- docs/database-authority/disposable-rehearsal-authorization.json
- docs/database-authority/disposable-rehearsal-regression.md
- docs/database-authority/operation-policy.json
- server/_core/databaseAuthority/authorization.ts
- server/_core/databaseAuthority/connectionAuthority.ts
- server/_core/databaseAuthority/context.ts
- server/_core/databaseAuthority/types.ts
- server/_core/databaseAuthority/rehearsalAuthority.ts
- server/_core/databaseAuthority/rehearsalProbes.ts
- server/_core/databaseAuthority/__tests__/rehearsalAuthorization.test.ts
- server/_core/databaseAuthority/__tests__/rehearsalConnection.test.ts

Safety: no live write probes, migrations, Azure resize/upgrade, retained-target
access/change, TiDB write, production DATABASE_URL change or deployment occurred.
No credential or connection string is included. Existing shared-remote/unknown
refusal and production protections remain intact.

## Corridor lifecycle correction — 2026-09-28

The principal authorized bounded engineering corrections and continuation of the
rehearsal. `createAuthorityRehearsalSession(..., 'preflight')` now performs the
same ARM/TLS/UTC/schema/ledger/empty-business-table checks and returns evidence,
but refuses every non-read catalogue probe. Closing a session with no attempted
DML closes its connections without cleanup DML. Once DML is attempted, including
an ambiguous failure, mandatory bounded cleanup remains in force. No protected
classification, fingerprint, purpose, expiry, migration or reference permission
is broadened. Preflight is a mode of the existing exact-target authority, not a
parallel read connection or generic shared-remote exception.
