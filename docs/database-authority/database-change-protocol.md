# Database Change Protocol

**Status:** canonical operating protocol
**Owner:** Database and Release Engineering
**Scope:** Property Listify schema changes and approved data-transition work

This protocol is the one supported way for product development to change the
database. A feature may add or evolve schema through this workflow, but it may
not introduce a new migration runner, schema executor, seed authority, repair
utility, account-administration script, backfill mechanism, or local/test
lifecycle.

## Canonical authority

| Concern | Authority |
| --- | --- |
| Schema ownership | `drizzle/schema/` and `drizzle/schema/canonical-model-inventory.json` |
| Canonical baseline | `server/migrations/0000_canonical_launch_baseline.sql` |
| Migration location | Active SQL files in `server/migrations/`; archived migrations are evidence only |
| Operational migration instructions | [`server/migrations/README.md`](../../server/migrations/README.md) |
| Migration runner | `server/migrations/runSqlMigrations.ts` |
| Migration ledger | `sql_migration_history` |
| Shared/production migration authorization | Database and Release Engineering approval through the canonical `pnpm db:migrate` workflow and target guard |
| Local migration workflow | `pnpm db:migrate:local` through `scripts/localDbWorkflow.ts` / `scripts/local-db.sh` |
| Test migration workflow | `pnpm db:migrate:test` through the disposable test workflow |
| Supported diagnostics | `pnpm db:verify`, `pnpm db:verify:distribution`, `pnpm schema:sanity`, `pnpm db:target` |
| Production seed authority | None; production and shared-environment seeds are prohibited |
| Local/demo seed authority | `pnpm db:seed:local` through guarded `server/scripts/localDemoSeed.ts`; test/demo data must use the canonical local/test lifecycle |
| Exceptional repair/backfill authority | No permanent utility exists. A future operation requires the contract below and a separately approved, bounded implementation |
| Static authority gate | `pnpm db:authority:check` |

The connected diagnostics and migration commands retain their existing target
guards. The static authority gate never loads environment files or connects to
a database.

## Common workflow

1. Classify the change as additive, data-transition, or destructive/incompatible.
2. Update the canonical Drizzle model and canonical model inventory when the
   schema changes.
3. Follow the operational migration instructions in [`server/migrations/README.md`](../../server/migrations/README.md), then add the required migration through the canonical migration authority. Do not use `db:push`, manual DDL, an archived migration, or a second runner.
4. Keep the migration ledger identity/order contract intact.
5. Add focused contract coverage and proportionate verification evidence.
6. Run `pnpm db:authority:check` and record its result in the pull request.
7. Use only the approved local/test workflow for local data and fixtures.

The pull request must state whether it changes schema or data, its change
classification, migration path, transition/repair controls, destructive-change
handling, rollback or containment evidence, and the static-gate result.

## Additive change

Examples include a new table, nullable column, compatible index, or compatible
relationship.

Required evidence is proportionate to the change:

- canonical model and inventory update where applicable;
- one canonical migration with deterministic identity/order;
- focused consumer or schema contract coverage;
- `pnpm db:authority:check` passing.

An additive change does not require a repair utility when existing rows remain
valid. If existing data must be populated, classify the work as a
data-transition change instead.

## Data-transition change

Examples include populating a new field, normalization, moving data between
structures, identifier conversion, and a bounded backfill.

The change requires:

- a named owner and explicit business or incident purpose;
- a fixed, approved target classification and target guard before connection
  creation;
- bounded record selection and a safe dry-run/report-only mode where practical;
- idempotency, checkpointing, or explicit restart behaviour;
- before/after integrity and usage verification;
- containment, restore, or compensating-action evidence;
- explicit approval before writes; and
- retirement of the temporary capability or formal classification as a
  permanent authority after review.

Do not place an ambient-target backfill in the repository as a convenience
script. The exceptional contract below governs any future approved operation.

## Destructive or incompatible change

Examples include dropping a column, deleting records, incompatible type
changes, replacing an active table, or making optional data mandatory.

Use expand-and-contract where applicable:

1. introduce compatible structure;
2. support old and new application behaviour;
3. migrate or backfill safely under the data-transition contract;
4. verify integrity, usage, and restoration evidence;
5. switch canonical reads and writes; and
6. remove the old structure in a later, bounded migration.

Direct destructive data utilities, production-wide cleanup commands, and
account bootstrap scripts are not an alternative to this sequence.

## Exceptional repair/backfill contract

A future production or shared-environment repair is exceptional authority. It
must be separately approved and record all of the following before execution:

- named owner;
- specific incident or business purpose;
- fixed intended target and target classification;
- target guard before connection creation;
- bounded record selection;
- dry-run or report-only mode where practical;
- explicit confirmation immediately before writes;
- idempotency, checkpointing, or restart behaviour;
- audit output that identifies scope and result without secrets;
- before-and-after evidence;
- containment, restore, or compensating action;
- approval policy and approver; and
- post-use retirement or formal permanent-authority classification.

No generic repair runner is authorized by this protocol. A capability that
does not satisfy the contract is retired or prohibited. A future break-glass
recovery operation must be designed as its own named, bounded authority.

## Seeds, diagnostics, and lifecycle boundaries

- Production and shared-environment seed authority is prohibited.
- Local/demo seed data is retained only through the guarded canonical
  local/test lifecycle.
- Disposable E2E fixtures are permitted only with explicit inventory
  classification, isolated targets, and no schema DDL.
- The four supported diagnostic commands remain the only supported diagnostic
  authority. Historical read-only evidence is not an operating instruction.
- Runtime application queries are ordinary consumers, not migration or repair
  authority. They must not expose a manually executable destructive surface.

## Reopening criteria

Database Authority is reopened only for:

- a demonstrated migration-ledger bypass;
- a new unauthorized schema or data-mutation mechanism;
- material change to the database provider or deployment architecture;
- failure of the static enforcement model;
- introduction of a new permanent operational database capability; or
- discovery of a material P0/P1 authority path outside this defined boundary.

Normal migrations, new tables, new columns, compatible relationships, and
ordinary schema evolution do not reopen the programme when they use this
protocol and pass `pnpm db:authority:check`.
