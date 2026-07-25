# DBA-S3C6A — Residual Database Utility Rooted Authority Audit

## Authority metadata

- Workstream: DBA-S3C6A
- Base: `6a705521146ecd7df658eedd89c2306d9eab0989`
- Canonical base: `origin/main` at `6a705521146ecd7df658eedd89c2306d9eab0989`
- Audit mode: static repository inspection
- Database connection opened: no
- Migration executed: no
- Seed or reset executed: no
- Deployment performed: no

## Executive authority decision

The Database Authority programme still has a residual utility gap, but the
operationally relevant surface is substantially smaller than the historical
318-path census.

S3C6 implementation may proceed as bounded containment work without opening a
database connection.

The governing policy is:

> Database-connected utilities are prohibited by default. A utility may remain
> operational only when it belongs to an explicitly approved diagnostic,
> canonical migration, controlled local/test workflow, or separately authorised
> data-repair capability.

Historical classifications must not override later implementation evidence.
The four diagnostics approved and hardened by DBA-S3C5 remain authoritative and
must not be retired or redesigned in this slice.

## Canonical operational authorities retained

### Canonical migration execution

The only schema-change authority remains:

- `server/migrations/runSqlMigrations.ts`
- exposed through the canonical `db:migrate*` and release command graph

No diagnostic, E2E verifier, seed, Makefile target, shell utility, or
administrative script may create, alter, or drop application schema.

### Supported diagnostics

The following DBA-S3C5 authorities remain approved:

- `pnpm db:verify`
- `pnpm db:verify:ci`
- `pnpm db:verify:distribution`
- `pnpm schema:sanity`
- `pnpm db:target`

Their implementation paths remain:

- `scripts/db-contract-verify.ts`
- `scripts/db-verify-distribution-schema.ts`
- `scripts/schema-sanity-check.mjs`
- `scripts/print-db-target.ts`

The earlier `REPLACE_WITH_SUPPORTED_OPERATION` labels for the first two paths
are superseded by DBA-S3C5.

### Canonical local and test operations

The following previously approved local/test authorities remain:

- `scripts/localDbWorkflow.ts`
- `scripts/__tests__/localDbWorkflow.test.ts`
- `server/scripts/localDemoSeed.ts`
- `server/scripts/seed-local-users.ts`
- `server/scripts/verifyLocalDemoSeed.ts`
- `docker/mysql-local/init/01-create-local-databases.sql`

## Controlled E2E workflow decision

The listing-performance and prospect-journey orchestration capabilities are
legitimate local/test workflows rather than production database utilities.

Retain, subject to explicit contractual classification:

- `scripts/run-listing-performance-e2e.ts`
- `scripts/run-prospect-journey-e2e.ts`
- `scripts/prospectJourneyProcessRunner.ts`
- the exact child verifiers required by those workflows

The retained workflows must:

1. permit only development or test runtime;
2. permit only localhost or loopback database hosts;
3. require exact disposable E2E database names;
4. reject production and staging indicators;
5. provision schema only through `server/migrations/runSqlMigrations.ts`;
6. clean up their disposable database and process resources;
7. never perform DDL inside a verifier;
8. remain prohibited from production package or release command graphs.

## Remaining schema-mutator blocker

`scripts/verify-prospect-journey-security.ts` is still invoked by
`scripts/run-prospect-journey-e2e.ts` and still contains schema mutation.

It may not remain in its current form.

The implementation must preserve its security assertions while removing every
DDL operation. The verifier must consume the canonical migrated disposable E2E
schema and fail when required schema is absent. It must never create or alter
that schema itself.

After correction it may be classified as controlled local/test verification,
not migration or general diagnostic authority.

## Unapproved package entrypoints

The following package commands have no approved database-authority owner and
must be removed with their utility paths unless separate evidence establishes a
current indispensable workflow:

- `test:wizard:e2e` -> `scripts/verify-wizard-e2e.ts`
- `verify` -> `scripts/verify-development-page.ts`
- `verify:showings` -> `scripts/verify-showings-migration.ts`
- `verify:showings:production` -> `scripts/verify-showings-migration.ts`

The production showings command is specifically prohibited because it exposes
an unapproved direct database diagnostic in production mode without the shared
target-guard contract.

## Unsafe Makefile seed authority

The Makefile `db-seed` target currently invokes `scripts/seed.ts`.

That path:

- loads an unrestricted `DATABASE_URL`;
- connects without the shared target guard;
- disables foreign-key checks;
- deletes core users, agencies, developers, developments, phases, and unit
  types;
- inserts fixed demo identities and a fixed password;
- is not the canonical local seed authority.

The implementation must:

1. repoint the Makefile seed target to `pnpm db:seed:local`; and
2. retire `scripts/seed.ts`.

No generic `make db-seed` path may bypass the approved local/test guard.

## Stale validation authority

`scripts/_validation_scripts.json` exposes:

- `scripts/validate-schema-sync.ts`;
- `drizzle-kit check`.

This file is not part of package, CI, Railway, or canonical release execution.
Its schema validator connects directly without the shared target guard, and its
Drizzle command is outside the canonical SQL migration authority.

Retire:

- `scripts/_validation_scripts.json`
- `scripts/validate-schema-sync.ts`

Current schema checks remain `schema:sanity`, canonical migration execution,
and the supported guarded database verifiers.

## Legacy location migration cluster

The following paths form an obsolete self-referencing migration and repair
cluster rather than a current execution root:

- `scripts/run-location-migration.ts`
- `scripts/extract-legacy-location-data.ts`
- `scripts/generate-location-slugs.ts`
- `scripts/sync-locations-table.ts`
- `scripts/migrate-listings-location-id.ts`
- `scripts/verify-location-migration.ts`

The cluster predates the canonical baseline and migration authority, performs
direct database writes, preserves legacy compatibility assumptions, and has no
approved package, CI, release, or deployment owner.

Default disposition: retire the complete cluster.

Any future location backfill must be designed as a new, separately approved,
target-guarded data-repair operation based on current database evidence.

## Dead and redundant retirement set

The following previously classified retirement candidates remain tracked and
have no approved operational caller:

- `scripts/debug-create-development.ts`
- `scripts/debug-db.ts`
- `scripts/debug_schema.sql`
- `scripts/manual_schema_verify.sql`
- `scripts/repro-500.ts`
- `scripts/test-persistence.ts`
- `scripts/validate-phase4.ts`
- `scripts/verify_unit_types_schema.sql`
- `server/scripts/init-local-db.sql`
- `server/scripts/simulate-save.ts`
- `server/scripts/verify-dev-service.ts`
- `server/scripts/verify_development_flow.ts`
- `verify_fix.ts`

Default disposition: delete all 13 paths.

## Unrooted production repair and administration utilities

References printed by one legacy utility to another do not establish approved
operational reachability.

This includes, among others:

- `cleanup-production-data.ts`
- `database-check.ts`
- `quick-check.ts`
- `simple-cleanup.ts`
- `execute-cleanup.ts`
- `verify-cleanup.ts`
- `create-test-user.ts`
- `diagnose-login.ts`

These paths must not be hardened into production authority merely because they
reference each other or are described by historical documentation.

Default disposition: retire the unrooted cluster unless a later bounded review
proves a current business requirement and supplies explicit ownership, target
validation, dry-run behaviour, confirmation controls, audit logging, and
approved database evidence.

## Local database lifecycle boundary

The repository currently exposes both:

- `scripts/localDbWorkflow.ts`; and
- `scripts/local-db.sh`.

The TypeScript workflow is the approved canonical local database authority.
The shell script currently provides lower-level start, stop, destroy, and
disposable E2E database operations.

S3C6 must eliminate parallel public authority by choosing one of these bounded
designs:

1. extend `localDbWorkflow.ts` to own every public local/E2E lifecycle command
   and retire direct package exposure of `scripts/local-db.sh`; or
2. retain `scripts/local-db.sh` only as a private implementation dependency
   behind `localDbWorkflow.ts`, with no independent authority or undocumented
   invocation surface.

Direct production use of either local lifecycle implementation is prohibited.

## Root Docker and Makefile reconciliation

The root `docker-compose.yml` and Makefile still describe a legacy local MySQL
stack with independent names, credentials, reset behaviour, and direct shell
access.

They must not remain a parallel database authority.

A later S3C6 implementation slice must either:

- repoint all supported Makefile database operations to canonical `pnpm`
  commands and retire the legacy root Compose database stack; or
- retire the database-related Makefile and root Compose surfaces entirely.

No root Docker or Makefile command may initialize, reset, migrate, seed, or
connect to a database outside the canonical local command graph.

## Implementation slices

### DBA-S3C6B1 — Immediate operational containment

1. Remove the four unapproved package command entries.
2. Delete their three obsolete verifier paths.
3. Repoint Makefile `db-seed` to `pnpm db:seed:local`.
4. Delete `scripts/seed.ts`.
5. Delete the stale validation registry and validator.
6. Delete the complete legacy location migration cluster.
7. Delete the 13 dead/redundant paths.
8. Remove DDL from `scripts/verify-prospect-journey-security.ts`.
9. Update authority manifests and contracts.
10. Add regression checks preventing these entrypoints from returning.

### DBA-S3C6B2 — Local lifecycle authority consolidation

1. Reconcile `scripts/localDbWorkflow.ts` and `scripts/local-db.sh`.
2. Remove parallel public command authority.
3. Reconcile or retire root `docker-compose.yml`.
4. Repoint or retire database-related Makefile targets.
5. Contractually enforce local-only and exact disposable-database boundaries.

### DBA-S3C6B3 — Residual unrooted utility retirement

1. Reconcile the remaining historical diagnostic and owner-decision census.
2. Retire unrooted one-off debug, repair, seed, and admin utilities by default.
3. Retain only paths with a current owner and explicit safety contract.
4. Establish a residual database-utility registry or equivalent executable
   authority contract.
5. Prohibit new database-connected scripts unless explicitly classified.

## Validation boundary

Permitted validation:

- Git boundary and reference checks;
- JSON parsing;
- TypeScript checking;
- targeted lint and formatting;
- static source contracts;
- isolated Vitest authority tests with external environment isolation;
- network-blocked executable tests that do not load normal repository setup.

Prohibited without separate authorisation:

- live database connections;
- migration execution;
- seed or reset execution;
- Docker lifecycle execution;
- production environment loading;
- deployment;
- data repair.

## Audit verdict

`DBA_S3C6A_STATUS=COMPLETE`

`DBA_S3C6_IMPLEMENTATION_GATE=OPEN`

The next authorised action is DBA-S3C6B1 immediate operational containment.
