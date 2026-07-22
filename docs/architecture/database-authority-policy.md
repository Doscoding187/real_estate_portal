# Property Listify Database Authority Policy

**Status:** Canonical repository authority

This policy applies to schemas, SQL migrations, runtime queries, services,
scripts, seeds, fixtures, tests, CI, and agent-authored database changes.

## Operating context

Property Listify is pre-launch. Historical migrations, experimental schemas,
test data, stale fixtures, and retired runtime models are not compatibility
requirements merely because they exist.

The best approved future-state architecture takes precedence.

## Canonical authority chain

Database work must reconcile:

1. modular Drizzle definitions under `drizzle/schema/`;
2. `drizzle/schema/canonical-model-inventory.json`;
3. active SQL migrations under `server/migrations/`;
4. `server/migrations/0000_canonical_launch_baseline.sql`;
5. the SQL migration runner and `sql_migration_history`;
6. runtime services and queries; and
7. executable database contracts and integration tests.

Archived migrations, generated snapshots, one-off scripts, stale fixtures, and
legacy runtime paths do not override this authority chain.

## Canonical-first rule

When code conflicts with canonical authority:

1. audit the intended domain model;
2. identify the canonical identity, relationships, lifecycle, and ownership;
3. align runtime code, fixtures, tests, and documentation;
4. remove stale compatibility behavior inside the approved workstream; and
5. validate the resulting authority end to end.

Do not make a failing test green by recreating a retired schema, adding unused
compatibility columns, weakening constraints, or teaching runtime code to guess
which schema it encountered.

## Prohibited database patterns

Without an explicitly approved and registered exception, do not add or retain
inside an approved workstream:

- runtime schema guessing;
- catch-and-retry SQL for alternate table or column names;
- `information_schema` probing used to select a schema version;
- multiple query strategies whose purpose is schema compatibility;
- dual writes to competing canonical and legacy models;
- fallback reads that treat retired storage as source of truth;
- parallel migration runners or migration ledgers;
- fixtures or seeds that write retired columns or relationships; or
- broad error handling that hides database-authority defects behind defaults.

## Compatibility exceptions

A database compatibility exception exists only when Edward explicitly approves
it and it is recorded in:

`docs/architecture/database-compatibility-exceptions.md`

Every exception must identify its owner, exact files and database objects,
business reason, permitted read/write direction, automated evidence, failure
behavior, and expiry or objective removal condition.

Unregistered compatibility code has no architectural authority.

## Migration rules

- The canonical baseline remains the first active SQL migration.
- Future schema changes use ordered incremental SQL migrations.
- Applied migration checksums are immutable.
- Archived migrations are historical evidence only.
- Runtime code must not compensate for an unapplied migration.
- Database migration, reset, establishment, or deployment requires explicit
  operational approval.

## Runtime and fixture rules

Runtime queries must use the canonical model directly. A schema error must fail
visibly and trigger an authority investigation.

Database-backed tests must use canonical identities, relationships, foreign
keys, and lifecycle states. Cleanup must use canonical primary keys and respect
foreign-key order.

## Stop condition

When the correct canonical model cannot be proven, stop implementation and
produce an authority audit. Do not invent compatibility behavior to continue.
