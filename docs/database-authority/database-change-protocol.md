# Database Change Protocol

**Status:** canonical Database Authority v3 protocol
**Owner:** Database and Release Engineering

This is the supported path for schema and durable data changes. Product work
may consume it but may not add another runner, connection authority, target
guard, ledger, seed executor, repair framework, or lifecycle mechanism.
Operational migration details are in `server/migrations/README.md`.

**Supported database provider:** MySQL only. The application code uses the
MySQL dialect and mysql2 driver; its intended hosted database is Azure Database
for MySQL. Azure SQL Database is a different SQL Server product and is not an
application target. TiDB support, command paths, capability checks, and
recovery tooling are retired. Historical TiDB records remain evidence only and
do not establish current production cutover status.

## Canonical authorities

| Concern                       | Authority                                              |
| ----------------------------- | ------------------------------------------------------ |
| Desired model                 | `drizzle/schema/`                                      |
| Generated desired evidence    | `drizzle/schema/canonical-model-inventory.json`        |
| Immutable baseline            | `server/migrations/0000_canonical_launch_baseline.sql` |
| Active lineage                | `server/migrations/manifest.json`                      |
| Manifest validation           | `server/migrations/migrationManifest.ts`               |
| Plan/apply and attempt state  | `server/migrations/runSqlMigrations.ts`                |
| Target, operation, connection | `server/_core/databaseAuthority/`                      |
| Operation matrix              | `docs/database-authority/operation-policy.json`        |
| Static gate                   | `pnpm db:authority:check`                              |

The migration ledger reports successful application; it never decides
repository membership or order. Durable attempt evidence is separate.

## Change admission

Before authoring SQL:

1. classify the work as additive schema, transactional data transition,
   exceptional recovery, or destructive/incompatible;
2. prove the current worktree identity and disposable target;
3. update the Drizzle desired model where physical application schema changes;
4. choose the next sequence only through a serialized manifest review against
   current `origin/main`—never by branch age, PR number, filenames elsewhere,
   or a database ledger;
5. declare the parent filename and checksum, statement policy, expected head,
   target classes, and consumer evidence; and
6. run the manifest and generated-inventory gates before database application.

No feature-specific migration is added merely to exercise this protocol.

## Additive incremental DDL

A normal incremental DDL entry must:

- have a strict four-digit lowercase filename identity;
- be the one next contiguous numeric sequence;
- contain exactly one independently verifiable DDL statement;
- remain inside the selected database and use the ordinary expansion subset;
- use the canonical MySQL dialect and avoid provider fallback or schema guessing;
- have a manifest checksum and exact parent checksum;
- include focused precondition, postcondition, and consumer evidence; and
- preserve forward recovery if application becomes ambiguous.

The active manifest and runner target MySQL. TiDB-specific syntax guards,
physical inventory fallbacks, CHECK capability probes, and convergence
operations have been removed. Do not add a second provider path or use a
provider console as a schema authority. CHECK constraints are verified through
MySQL's canonical `information_schema` metadata, and launch-critical business
transitions must also be enforced by their domain command authority.

Do not claim transactional rollback for MySQL DDL. Do not combine several DDL
transitions in one file to simulate atomicity. Database/schema lifecycle,
cross-schema references, and ordinary destructive/shape-changing DDL fail
manifest validation; route approved exceptions through the exceptional
contract.

## Transactional data transition

A manifest entry classified `transactional-data` contains DML only. It must
have bounded selection, deterministic/idempotent behavior, integrity checks,
and explicit restart semantics. Large or operational backfills do not belong
in ordinary migrations; they require the exceptional contract below.

## Planning and application

`pnpm db:migrate:plan` reports the authorized target hash, accepted old head,
ordered pending set, expected new head, manifest digest, and plan digest without
creating locks or control tables.

`pnpm db:migrate:apply` with explicit `--accepted-old-head=<head-or-none>` and
`--expected-new-head=<manifest-head>` refuses implicit heads, re-resolves and
authorizes the same target, takes the manifest lock, proves its owner
connection, rechecks the plan, creates durable
control tables when needed, records a running attempt with that lock owner,
applies each statement, records progress, then records success. A
failed/running/blocked attempt prevents normal continuation.

### Failed migration attempts

A failed, running, or blocked attempt stops ordinary continuation. No standing
generic recovery command is available. Preserve the sanitized attempt ID,
failure evidence, exact target fingerprint, and accepted migration head; do not
retry, edit ledgers, replay archived SQL, or recreate a target to clear the
failure. Any recovery requires a new, separately reviewed MySQL-only incident
contract and explicit approval before execution. The historical TiDB recovery
records remain in the exception register, but their code and commands are
retired.

Generic migration commands accept only local disposable or quarantined
read-only plan targets. Protected targets use `pnpm db:release:plan` and
`pnpm db:release:apply`; the latter requires the exact reviewed plan digest and
target acknowledgement in addition to protected approval evidence. The runner
compares the digest with a fresh plan before durable mutation and repeats the
comparison after acquiring the migration lock.

Never:

- Do not use `db:push` or manual DDL as canonical authority;
- rewrite an applied SQL file or its manifest checksum;
- add/remove/edit ledger rows;
- delete or disguise attempt evidence;
- silently retry ambiguous DDL;
- execute archived SQL; or
- introduce generic down migrations.

## Destructive or incompatible change

Use expand-and-contract:

1. add compatible structure;
2. support old and new behavior;
3. transition data under a separately accepted plan;
4. prove integrity, usage, and restoration/forward-recovery evidence;
5. switch canonical reads and writes; and
6. contract in a later explicitly approved migration.

Destructive contraction is protected work and requires a separate approval
packet before the operation, even if its code can be prepared independently.

## Pre-adoption migration correction

**Approval reference:** `PLACE-S1-PREADOPTION-MIGRATION-AMENDMENT-2026-09-25-Edward`
(Place Authority Slice 1 closure review).

A migration may be **amended in place before adoption** only when all of the
following are true, and every condition must be demonstrable:

1. it exists only on an unmerged task branch;
2. no persistent, shared, or protected environment has adopted it;
3. every target that applied it was explicitly disposable and has since been
   destroyed;
4. the branch is still establishing the initial canonical migration series for
   its authority; and
5. the amendment is a correctness repair, not a behavioural change, and is
   recorded in the owning authority contract.

This is not a licence to rewrite history. It defines when history begins.

**Once a migration is merged, or adopted by any persistent or shared
environment, it is immutable.** Every subsequent correction requires a new
governed migration and any approval reference that migration kind demands under
this protocol.

Applied at Place Authority migrations 0091–0097: the series was unmerged and
unadopted, the only target that applied it was a disposable worktree database
that was destroyed, and the corrections removed a column that duplicated typed
relationship authority, removed two relationship types that duplicated
authority held elsewhere, added the invariant that makes search scope derived
rather than independent, and corrected a column width that could not store a
compliant governed identity.

## Exceptional repair/backfill contract

No generic repair runner exists. A bounded repair, recovery, import, export,
restore, or backfill requires all of:

- owner and incident/business purpose;
- exact operation and sanitized fingerprint;
- target class, database name, host, and port;
- approval reference and actor;
- bounded record selection and dry-run evidence;
- idempotency, checkpointing, or explicit restart behavior;
- expected mutation and data at risk;
- preservation/backup requirement;
- containment and forward-recovery plan;
- before/after integrity proof; and
- mandatory retirement or formal admission after use.

This is the protocol's **Exceptional repair/backfill contract**. Code readiness
does not grant operation approval.

## Local, test, seed, and fixture boundaries

- The current `listify_local` is quarantined and cannot be mutated.
- A feature worktree uses its owned `listify_wt_<slug>_<hash>` database on the
  approved local server.
- Fixed `listify_test` is permitted only inside an isolated CI service job.
- Data roles (reference, foundation, demo, scenario, test fixture) remain
  separate operations. Until their v3 adapters land, legacy mutation commands
  fail closed.
- Production/shared seeds are prohibited.
- Fixtures contain no schema DDL.

## Required pull-request evidence

State:

- manifest old/new head and lineage;
- schema/data classification;
- target classes and credential class;
- plan and attempt evidence;
- focused negative and positive tests;
- desired/physical congruency result;
- readiness and consumer result;
- destructive/repair handling;
- disposable databases created/faulted/disposed;
- protected targets accessed; and
- `pnpm db:authority:check` plus CI-equivalent results.

## Reopening criteria

Reopen senior architecture only for a connection/authorization bypass, lineage
ambiguity, ledger/attempt corruption model, provider change, new permanent
database capability, failure of worktree ownership, or material P0/P1 finding.
Ordinary migrations that consume these interfaces do not reopen architecture.
