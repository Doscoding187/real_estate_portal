# Database Change Protocol

**Status:** canonical Database Authority v3 protocol
**Owner:** Database and Release Engineering

This is the supported path for schema and durable data changes. Product work
may consume it but may not add another runner, connection authority, target
guard, ledger, seed executor, repair framework, or lifecycle mechanism.
Operational migration details are in `server/migrations/README.md`.

## Canonical authorities

| Concern | Authority |
| --- | --- |
| Desired model | `drizzle/schema/` |
| Generated desired evidence | `drizzle/schema/canonical-model-inventory.json` |
| Immutable baseline | `server/migrations/0000_canonical_launch_baseline.sql` |
| Active lineage | `server/migrations/manifest.json` |
| Manifest validation | `server/migrations/migrationManifest.ts` |
| Plan/apply and attempt state | `server/migrations/runSqlMigrations.ts` |
| Target, operation, connection | `server/_core/databaseAuthority/` |
| Operation matrix | `docs/database-authority/operation-policy.json` |
| Static gate | `pnpm db:authority:check` |

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
- use supported MySQL/TiDB syntax and explicit provider normalization;
- have a manifest checksum and exact parent checksum;
- include focused precondition, postcondition, and consumer evidence; and
- preserve forward recovery if application becomes ambiguous.

Do not claim transactional rollback for MySQL/TiDB DDL. Do not combine several
DDL transitions in one file to simulate atomicity. Database/schema lifecycle,
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

Generic migration commands accept only local disposable or quarantined
read-only plan targets. Protected targets use `pnpm db:release:plan` and
`pnpm db:release:apply`; the latter requires the exact target acknowledgement
in addition to protected approval evidence.

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
