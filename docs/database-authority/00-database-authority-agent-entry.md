# Database Authority Agent Entry Contract

**Status:** Database Authority v3 control-plane entry

Read this file before any database-bearing work. The machine-readable pointers
are in `authority-manifest.json`; operation permissions are in
`operation-policy.json`.

## Authority spine

| Concern                            | Authority                                                 |
| ---------------------------------- | --------------------------------------------------------- |
| Immutable target context           | `server/_core/databaseAuthority/context.ts`               |
| Operation policy and decision      | `authorization.ts`, `operation-policy.json`               |
| Connection creation                | `connectionAuthority.ts`                                  |
| Worktree identity and lifecycle    | `worktreeIdentity.ts`, `lifecycle.ts`                     |
| Migration membership and lineage   | `server/migrations/manifest.json`, `migrationManifest.ts` |
| Migration planning and application | `runSqlMigrations.ts`                                     |
| Successful history                 | `sql_migration_history`                                   |
| Durable attempt evidence           | `sql_migration_attempts`                                  |
| Desired schema                     | `drizzle/schema/`                                         |
| Generated model evidence           | `drizzle/schema/canonical-model-inventory.json`           |
| Physical-schema comparison         | `schemaCongruency.ts`                                     |
| Layered readiness                  | `readiness.ts`                                            |
| Local service lifecycle            | `scripts/local-db.sh`, `localServicePaths.ts`             |
| Canonical geography reference data | `dataAdapters/canonicalGeography.ts`                      |
| Isolated Search-to-Lead scenario   | `dataAdapters/searchToLeadScenario.ts`                    |
| Remaining connection paths         | `connection-path-inventory.json`                          |

The credential-bearing URL is private to connection creation. Commands and
reports may emit a sanitized fingerprint and hash, never credentials or a
complete URL.

## Start every database operation

```sh
pnpm db:authority:status
pnpm db:authority:manifest
pnpm db:authority:context
```

Status is read-only. In a feature worktree, central local credentials resolve
to that registered worktree's collision-resistant database identity; they do
not resolve to `listify_local`.

The current `listify_local` is quarantined evidence. It may receive sanitized,
read-only diagnostics only. Runtime mutation, migration, seed, fixture, reset,
rebuild, import, restore, repair, and ledger editing are not authorized.

## Owned local worktree workflow

Start or wait for the one approved native local server, then provision this
worktree's database. The service-only commands never create an application
database, account, migration, or data and never use host port 3306:

```sh
pnpm db:authority:service:start
pnpm db:authority:service:wait
pnpm db:authority:service:status
pnpm db:worktree:create
pnpm db:migrate:plan
pnpm db:migrate:apply -- --accepted-old-head=<head-or-none> --expected-new-head=<manifest-head>
pnpm db:schema:congruency
pnpm db:reference:prepare
pnpm db:scenario:prepare
pnpm db:reference:verify
pnpm db:scenario:verify
pnpm db:readiness -- --purpose=location-discovery
```

Run the sequence stage by stage. The first unexpected result stops the
workflow; preserve sanitized logs and runtime state, and do not retry a failed
migration or repair data manually. After successful feature verification,
re-resolve the context, dispose only the exact owned target with its emitted
acknowledgement, then stop the service through the validated Unix socket:

```sh
pnpm db:authority:context
pnpm db:worktree:ack
pnpm db:worktree:dispose -- --ack=CONFIRM_DATABASE_DISPOSE_<fingerprint-prefix>
pnpm db:authority:service:stop
pnpm db:authority:service:recover
pnpm db:authority:service:status
```

Service shutdown is implemented as `mysqladmin shutdown` over the exact
validated Unix socket. Do not assume a same-user signal is permitted for a
confined `mysqld`; there is no silent TCP, signal, or broad-process fallback.

If an abnormal termination leaves only authority-owned transient runtime
metadata (`mysqld.pid`, `mysql.sock`, or `mysql.sock.lock`), use the governed
`pnpm db:authority:service:recover` command. It classifies the complete bundle,
fails closed on a live or ambiguous service, and removes only those three
exact artifacts after proving the service root, process, port, socket, and lock
state are safe. It never removes the service root, data directory, logs, or
database files. A cleanly stopped service is a recovery no-op.

The native MySQL initialization command owns creation of its data directory.
The service path is derived by `localServicePaths.ts` as
`/var/tmp/property-listify-<uid>/mysql-3307`. The shared `/var/tmp` parent must
remain root-owned and sticky; the UID directory and service directory are
created or reused only when they are exact, non-symlinked, current-user-owned,
and mode `0700`. This is the AppArmor-compatible local path. Do not improvise a
home-directory MySQL datadir or modify AppArmor. A previous home-directory
service path is inactive legacy residue: report it, never adopt it, and never
delete it automatically.

The native MySQL initialization command owns creation of the data directory.
A successful initialization records a mode-0600 service identity marker
containing only the approved service fingerprint. An existing data path
without both the initialized `mysql` system schema and the matching marker is
treated as preserved partial or foreign state and fails closed; the service
never deletes it automatically. Validate and remove only an exact, empty,
owned residue via an approved cleanup packet before retrying initialization.

Reference and scenario adapters require the exact mode-0600 ownership profile,
the accepted `0001_public_search_to_lead_reliability.sql` migration head, and
the disposable worktree target. They are never part of ordinary service
startup. Replay is explicit:

```sh
pnpm db:reference:verify
pnpm db:scenario:verify
```

Provisioning is idempotent only when its mode-0600 ownership profile exactly
matches the canonical worktree realpath and Git common-directory identity.
Branch names are labels, not ownership.

Disposal requires the exact acknowledgement emitted by:

```sh
pnpm db:worktree:ack
pnpm db:worktree:dispose -- --ack=CONFIRM_DATABASE_DISPOSE_<fingerprint-prefix>
```

Re-resolve the context immediately before disposal. Never copy an
acknowledgement between targets or operations.

## Operation rules

- Resolve once and authorize the named operation before connection creation.
- Explicit caller/process targets outrank worktree, repository, and central
  fallbacks and may not be overwritten.
- A child process must inherit and match the parent fingerprint.
- Unknown and shared-remote targets fail closed.
- Staging and production require an exact operation/fingerprint approval;
  release application also requires an exact acknowledgement.
- Generic migration plan/apply refuses protected targets. Use the explicit
  `db:release:plan` and `db:release:apply` operation paths.
- A caller-supplied connection factory is accepted only after a genuine
  authorization decision and exact selected-database verification.
- Only `connectionAuthority.ts` may create raw active connections.

## Migration rules

- `server/migrations/manifest.json` defines active membership, sequence,
  checksum, parent, statement policy, and expected head.
- Top-level SQL absent from the manifest and manifest entries absent from disk
  both fail.
- Numeric identity must be unique and contiguous. Lineage has one root and one
  head; cycles, missing parents, and lexical tie-breaking fail.
- `0000_canonical_launch_baseline.sql` is immutable.
- Archived SQL is evidence only and can never enter the active plan.
- An ordinary future DDL migration contains one independently verifiable table
  or index expansion. Cross-schema/database lifecycle SQL fails; destructive or
  shape-changing DDL requires the approved exceptional contract.
- Transactional-data migrations contain DML only.
- Apply proves the named-lock owner connection and records that owner with each
  durable attempt.
- Apply refuses before connection unless the accepted old head and expected new
  manifest head are explicit. `none` is valid only for a verified fresh target.
- Plan mode performs no schema, history, attempt, or lock mutation.
- Apply records a durable running attempt before statements. MySQL/TiDB DDL is
  not described as transactionally rolled back.
- Running, failed, or blocked attempts stop ordinary future application until
  an explicitly reviewed recovery workflow exists.
- Never edit a ledger, rewrite an applied migration, delete attempt evidence,
  silently retry ambiguous DDL, or introduce generic down migrations.

No currently unmerged product migration is canonical merely because it exists.
Adding a manifest entry is a serialized authority decision under the Database
Change Protocol.

## Schema and readiness rules

`schema:inventory:check` proves deterministic desired-model evidence.
`db:schema:congruency` compares normalized Drizzle metadata to physical MySQL
metadata and excludes only the two runner control tables.

`/api/health` proves process liveness only. `/api/readiness` separately reports
service availability, exact target ownership, schema migration, schema
congruency, canonical reference data, acceptance scenario data, and application
readiness for the requested runtime. Consumer/API, browser, release, and full
diagnostics remain separate layers. A client object, reachable server, or
coherent ledger alone is not application readiness.

A stale seed, fixture, test helper or runtime query must be reconciled to the canonical schema.
Do not conceal authority failure with schema guessing, alternate queries,
catch-and-retry SQL, or empty-success fallbacks.

## Retired compatibility commands

Legacy fixed-database seed, reset, rebuild, server-destroy, and E2E lifecycle
commands fail before connection. Their replacements are continuation packets,
not permission to invoke source files directly. Compatibility exports remain
only for existing unit contracts and have explicit retirement conditions in
`connection-path-inventory.json`.

## CI and evidence

Run:

```sh
pnpm db:authority:check
pnpm check
pnpm lint:check
pnpm test:ci
pnpm build
```

CI may use fixed `listify_test` only inside an isolated MySQL service job with
`CI=true`, `NODE_ENV=test`, and `APP_ENV=test`. That exception is not valid on a
developer server or across worktrees.

Report the worktree, branch, HEAD, changed files, sanitized target hash/class,
plan heads, attempt state, schema/readiness evidence, database lifecycle
events, tests, and final Git status. State explicitly whether any protected or
remote target was accessed.
