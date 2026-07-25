# DBA-S3C6B2 — Local Database Lifecycle Authority Audit and Consolidation Plan

## Authority metadata

- Workstream: DBA-S3C6B2
- Audit branch: `audit/database-authority-local-lifecycle-s3c6b2`
- Audit base: `85f6f7c44d24442ed32d832f6a5f0e8807573d1f`
- Base description: merge commit for PR #397
- Audit mode: static, read-only repository and Git-history inspection
- Database connection opened: no
- Environment file loaded: no
- Migration executed: no
- Seed or reset executed: no
- Docker lifecycle executed: no
- Deployment performed: no

## Executive verdict

Property Listify already has the correct foundation for a canonical local
database lifecycle:

1. `scripts/local-db.sh` owns local MySQL infrastructure lifecycle;
2. `docker-compose.local-db.yml` owns the Docker-backed local MySQL service;
3. `docker/mysql-local/init/01-create-local-databases.sql` owns first-start
   creation of the approved local and test databases;
4. `scripts/localDbWorkflow.ts` owns guarded local orchestration;
5. `server/migrations/runSqlMigrations.ts` remains the only schema migration
   executor;
6. `server/scripts/localDemoSeed.ts` remains the guarded demo-fixture authority;
7. supported schema diagnostics remain separate from lifecycle orchestration.

The current problem is not absence of authority. It is residual ambiguity around
that authority.

The audit found four material sources of ambiguity:

- root `docker-compose.yml` defines a second, obsolete MySQL stack;
- the Makefile invokes that obsolete root Compose stack and contains stale
  database credentials and container names;
- `scripts/localDbWorkflow.ts` duplicates schema-contract verification that
  belongs to canonical diagnostics;
- `scripts/local-db.sh` allows unnecessary host, port, directory, password, and
  database-name overrides around destructive local operations.

The correct S3C6B2 direction is therefore **retain, narrow, delegate, and
contract**.

## Audit completion

The read-only evidence capture completed successfully.

Validation markers:

- local shell syntax: passed;
- `package.json` parsing: passed;
- migration authority manifest parsing: passed;
- worktree state unchanged: yes;
- branch divergence from `origin/main`: `0 0`.

Safety markers:

- database connection opened: no;
- environment file loaded: no;
- migration executed: no;
- seed executed: no;
- reset executed: no;
- Docker executed: no;
- deployment performed: no.

`DBA_S3C6B2_READ_ONLY_AUDIT_EVIDENCE=COMPLETE`

## Current lifecycle topology

### 1. Local infrastructure owner

`scripts/local-db.sh` is the current package-reachable infrastructure owner.

It supports:

- start;
- wait;
- status;
- stop;
- destroy;
- listing-performance E2E reset and drop;
- prospect-journey E2E reset and drop.

It selects either:

- Docker mode through `docker-compose.local-db.yml`; or
- native MySQL mode under a local filesystem directory.

This is the correct responsibility for the shell layer: service lifecycle,
database-container initialization, and exact disposable E2E database lifecycle.

### 2. Canonical Docker local service

`docker-compose.local-db.yml` defines the intended Docker-backed local service:

- service: `mysql-local`;
- container: `listify-mysql-local`;
- image: MySQL 8;
- host binding: `127.0.0.1:3307`;
- primary database: `listify_local`;
- initialization directory: `docker/mysql-local/init`;
- named local data volume;
- local health check.

This file is the correct Docker infrastructure authority and should remain.

### 3. Local orchestration owner

`scripts/localDbWorkflow.ts` currently provides:

- exact development-environment checks;
- exact local database target validation;
- destructive reprovision acknowledgement;
- target reporting;
- service startup;
- migration orchestration;
- local database recreation;
- seed orchestration;
- verification.

This is the correct orchestration owner.

However, its current verification implementation hardcodes:

- required tables;
- required columns;
- a `showings.status` enum;
- a listing-performance timestamp definition;
- migration filenames and checksums;
- SQL migration-history state;
- migration lock state;
- demo-user and workspace fixture details.

Those checks create a second schema-contract authority inside the local
lifecycle wrapper.

The local wrapper should orchestrate canonical diagnostics; it should not define
its own schema contract.

### 4. Canonical schema and fixture owners

The correct delegated authorities already exist:

- migration execution:
  `server/migrations/runSqlMigrations.ts`;
- distribution schema verification:
  `scripts/db-verify-distribution-schema.ts`;
- supported full contract verification:
  `scripts/db-contract-verify.ts`;
- local demo seed:
  `server/scripts/localDemoSeed.ts`;
- local demo verification:
  `server/scripts/verifyLocalDemoSeed.ts`.

S3C6B2 must preserve these ownership boundaries.

## Material findings

### Finding 1 — Root Compose is obsolete parallel authority

Root `docker-compose.yml` defines an unrelated MySQL stack with:

- service name `mysql`;
- container name `real-estate-mysql`;
- database `real_estate_portal`;
- user `realestate_user`;
- port `3306`;
- hardcoded root and application credentials;
- Adminer;
- phpMyAdmin;
- a separate `mysql_data` volume.

This stack is not used by `scripts/local-db.sh`, which explicitly invokes
`docker-compose.local-db.yml`.

The root Compose file therefore acts as stale parallel local database authority.
Its generic filename also makes an unqualified `docker compose up` select the
wrong database stack.

**Disposition: retire and prohibit.**

### Finding 2 — The Makefile bypasses canonical local authority

The Makefile currently runs unqualified root Compose commands:

- `docker compose up -d`;
- `docker compose down`;
- `docker compose down -v`;
- `docker compose logs -f`.

These commands select root `docker-compose.yml`, not the canonical local
Compose file.

Its `db-shell` target also references stale values:

- container `propertylistify-mysql`;
- user `propertylistify`;
- database `propertylistify_dev`.

These values match neither the root legacy Compose stack nor the canonical
local stack.

The Makefile already delegates `db-migrate` and `db-seed` to package commands.
That is the correct pattern.

**Disposition: keep only thin package-command aliases; remove all direct
Compose, container-name, credential, and database-name authority.**

### Finding 3 — Local target guards are strong but broader than necessary

`scripts/localDbWorkflow.ts` correctly requires:

- `NODE_ENV=development`;
- non-production/non-staging `APP_ENV`;
- a MySQL URL;
- database name exactly `listify_local`;
- an approved host;
- an explicit destructive reprovision acknowledgement.

However, its approved host list still contains legacy and generic service names:

- `real-estate-mysql`;
- `mysql`;
- `db`.

Only canonical local service names should remain.

**Disposition: narrow approved hosts to canonical local endpoints.**

### Finding 4 — Local shell overrides undermine determinism

`scripts/local-db.sh` permits overrides for:

- host;
- port;
- native data directory;
- root password;
- application password;
- test password;
- E2E database names.

Several of these overrides do not also reconfigure
`docker-compose.local-db.yml`, which uses fixed service values.

The native destroy path executes `rm -rf` against the configurable local
directory. Although quoted, the directory should not be freely operator-defined
for a canonical destructive workflow.

The E2E database-name overrides are immediately checked against exact canonical
names, making those overrides unnecessary.

**Disposition: make host, port, data directory, credentials, and approved
database names exact constants. Retain only the Docker/native mode selector.**

### Finding 5 — Local verification duplicates schema authority

The local workflow directly queries `information_schema`, SQL migration
history, and application fixture tables.

This is useful operational behavior, but the hardcoded schema expectations can
drift independently from:

- the canonical schema inventory;
- canonical SQL migrations;
- supported distribution verification;
- supported database contract verification.

**Disposition: replace local schema assertions with delegation to approved
verification commands.**

The local workflow may retain:

- exact target validation;
- exact database identity validation where necessary;
- orchestration sequencing;
- reprovision acknowledgement;
- local database creation and destruction;
- command failure propagation.

### Finding 6 — Package aliases blur destructive and non-destructive semantics

The current package surface includes:

- `db:local:start`;
- `db:start:local`;
- `db:migrate:local`;
- `db:migrate:fresh:local`;
- `db:reprovision:local`;
- `db:bootstrap:local`;
- `db:migrate:dev`;
- `db:reset:local`.

Material ambiguities:

- `db:migrate:fresh:local` is only an alias for ordinary migration and does not
  create a fresh database;
- `db:bootstrap:local` aliases destructive reprovision without naming that
  destructive behavior;
- `db:migrate:dev` duplicates `db:migrate:local`;
- `db:reset:local` invokes demo-fixture reset rather than local database
  reprovision;
- `db:start:local` is an orchestration command while `db:local:start` is an
  infrastructure command, but the names do not explain that distinction.

**Disposition: reduce aliases and use names that expose behavior.**

## Approved future-state authority

### Retain

Retain and explicitly govern:

- `scripts/local-db.sh`;
- `docker-compose.local-db.yml`;
- `docker/mysql-local/init/01-create-local-databases.sql`;
- `scripts/localDbWorkflow.ts`;
- `scripts/__tests__/localDbWorkflow.test.ts`;
- canonical local package commands;
- canonical migration runner;
- canonical local seed and seed verifier;
- supported database diagnostics.

### Retire

Retire:

- root `docker-compose.yml`;
- direct Compose execution from the Makefile;
- stale Makefile `db-shell`;
- Makefile `docker-reset`;
- misleading package alias `db:migrate:fresh:local`;
- misleading package alias `db:bootstrap:local`;
- ambiguous package alias `db:migrate:dev`;
- misleading package command `db:reset:local`.

Replace `db:reset:local`, if fixture cleanup remains useful, with a name that
states its actual role, such as:

- `db:demo:reset:local`.

Replace orchestration command `db:start:local` with:

- `db:prepare:local`.

### Delegate

`scripts/localDbWorkflow.ts` should delegate:

- schema migration to `pnpm db:migrate:local`;
- schema verification to `pnpm db:verify:distribution`;
- local demo verification to `pnpm db:verify:local-demo`;
- local seeding to `pnpm db:seed:local`;
- infrastructure startup to `pnpm db:local:start`.

The wrapper must not maintain a parallel list of tables, columns, enum values,
migration checksums, or migration lock expectations.

### Narrow

Narrow local workflow host authority to:

- `localhost`;
- `127.0.0.1`;
- `::1`;
- `host.docker.internal`;
- `listify-mysql-local`.

Narrow shell infrastructure constants to the canonical local topology:

- host: `127.0.0.1`;
- port: `3307`;
- native data directory: `/tmp/listify-mysql-3307`;
- local database: `listify_local`;
- test database: `listify_test`;
- listing-performance E2E database:
  `listify_listing_performance_e2e`;
- prospect-journey E2E database:
  `listify_prospect_journey_e2e`.

Retain `LISTIFY_LOCAL_DB_MODE=auto|docker|native` as the only infrastructure
topology selector.

## Makefile disposition

The Makefile may remain only as a convenience alias layer.

Approved database behavior:

- `docker-up` delegates to `pnpm db:local:start`;
- `docker-down` delegates to `pnpm db:local:stop`;
- `db-migrate` delegates to `pnpm db:migrate:local`;
- `db-seed` delegates to `pnpm db:seed:local`;
- `dev-full` delegates through the canonical non-destructive local preparation
  command before starting the application.

Remove:

- the `DOCKER_COMPOSE` variable;
- unqualified `docker compose` execution;
- `docker-reset`;
- `docker-logs`, unless a governed local package command is introduced;
- `db-shell`, unless a governed local package command is introduced;
- all embedded database credentials and container names.

No Makefile target may become independent database authority.

## Required contract enforcement

Add a new static authority contract:

- `server/__tests__/contract.database-local-lifecycle-authority.test.ts`

The contract should enforce at least:

1. root `docker-compose.yml` is absent and prohibited;
2. `docker-compose.local-db.yml` remains present;
3. `scripts/local-db.sh` references only the canonical local Compose file;
4. no default unqualified root Compose command remains in the Makefile;
5. no stale Makefile database container, user, password, or database remains;
6. local infrastructure constants remain exact;
7. native destructive deletion remains pinned to the canonical local directory;
8. local workflow approved hosts remain exact;
9. reprovision requires the explicit acknowledgement token;
10. schema application remains delegated to the canonical migration runner;
11. local verification delegates to approved diagnostics;
12. the local workflow contains no hardcoded application schema-contract list;
13. misleading package aliases remain absent;
14. destructive and fixture-reset commands remain semantically distinct;
15. local lifecycle files are classified as approved local/test authority and
    removed from deferred Gap 3 classifications.

Update existing migration authority contracts only where their package-command
expectations change.

## Authority manifest changes

Update `docs/database-authority/migration-tree-authority.json` to:

- classify `scripts/local-db.sh` as approved local/test infrastructure
  lifecycle authority;
- classify `scripts/localDbWorkflow.ts` as approved guarded local orchestration;
- keep `scripts/__tests__/localDbWorkflow.test.ts` test-only;
- keep `docker/mysql-local/init/01-create-local-databases.sql` approved
  local/test initialization;
- add root `docker-compose.yml` to `prohibitedPaths`;
- remove `scripts/local-db.sh` and `scripts/localDbWorkflow.ts` from:
  - `knownManualSchemaExecutorCandidates`;
  - `directSchemaCandidateClasses.deferred schema executor`;
  - `deferredGap3Utilities`;
- document that local database create/drop operations are lifecycle
  provisioning, not schema migration authority.

## Proposed implementation boundary

Expected implementation paths:

- `docker-compose.yml` — delete;
- `Makefile` — narrow to package-command aliases;
- `package.json` — consolidate local lifecycle names and aliases;
- `scripts/local-db.sh` — exact constants and destructive-path hardening;
- `scripts/localDbWorkflow.ts` — delegate verification and narrow hosts;
- `scripts/__tests__/localDbWorkflow.test.ts` — update orchestration contract;
- `docs/database-authority/migration-tree-authority.json` — reclassify authority;
- `server/__tests__/contract.database-local-lifecycle-authority.test.ts` — add;
- `server/__tests__/contract.migration-execution-authority.test.ts` — update
  only if command keys change;
- `server/__tests__/contract.migration-tree-authority.test.ts` — update
  authority expectations;
- this audit report.

No application feature, production deployment, production database, or
canonical SQL migration file belongs in S3C6B2 scope.

## Validation plan

Before any operational local-database test, run static validation only:

- JSON parsing;
- shell syntax;
- TypeScript contract tests in isolated configuration;
- local workflow unit tests with mocked command invocation and connections;
- exact manifest semantic checks;
- package-command boundary checks;
- root Compose absence check;
- Makefile delegation checks;
- `git diff --check`;
- exact staged-scope verification.

Operational Docker/native lifecycle validation requires separate explicit
authorization after the static implementation is reviewed.

## Audit verdict

`DBA_S3C6B2_AUDIT_STATUS=COMPLETE`

`DBA_S3C6B2_IMPLEMENTATION_GATE=OPEN`

The authorized implementation direction is:

> Retain the canonical local lifecycle stack, retire the legacy root Compose
> stack, reduce all wrappers to one-way delegation, narrow destructive
> operations to exact local constants, and prevent the local orchestrator from
> becoming parallel schema authority.
