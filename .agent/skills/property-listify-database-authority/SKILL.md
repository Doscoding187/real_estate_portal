---
name: property-listify-database-authority
description: Property Listify operating guide for schema and migration work, missing tables or columns, database-backed runtime queries, seeds and fixtures, local database setup, browser validation requiring seeded data, schema-consumer drift, migration-ledger verification, database contract tests, and database authority or compatibility questions. Do not use for frontend-only styling, components, copy, or visual work that does not require database data.
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# Property Listify Database Authority

> **This skill is an operating guide, not the database authority. Repository-native authority always wins.**

## Precedence

```text
Repository AGENTS.md
        ↓
Database Authority Agent Entry Contract
        ↓
Authority Manifest
        ↓
Canonical migrations and Drizzle models
        ↓
This skill’s operating instructions
        ↓
Generic database skills and assumptions
```

Use these repository authorities; do not copy or replace them:

- `docs/database-authority/00-database-authority-agent-entry.md`
- `docs/database-authority/authority-manifest.json`
- `docs/database-authority/index.md`
- `docs/architecture/database-authority-policy.md`
- `docs/architecture/database-compatibility-exceptions.md`

Archived migrations are historical evidence only. Generic PostgreSQL, Prisma,
or schema-design advice never overrides Property Listify’s MySQL/TiDB, Drizzle,
and migration-led authority.

## Classify the task

Choose exactly one category before reading database files.

1. **Database-independent work** — styling, frontend components, copy, visual
   refinement, or unrelated static documentation. Do not inspect migrations,
   Drizzle schema, or database audits. Do not initialize or bootstrap a database.

2. **Local-data workflow** — browser validation requiring seeded accounts,
   listings, developments, agents, buyers, or authenticated dashboards. Run:

   ```sh
   pnpm db:authority:status
   pnpm db:authority:bootstrap:local
   ```

   Then continue product validation. Do not reconstruct credentials or
   `DATABASE_URL` manually.

3. **Database consumer work** — runtime query, service, repository, seed,
   fixture, helper, database-backed API, or missing-table/column failure. Read
   only the Entry Contract, manifest, affected consumer and tests, matching
   canonical Drizzle model, and matching active migration when required.
   Reconcile a stale consumer to canonical schema; never restore retired schema.

4. **Schema-authority work** — table, column, relationship, index, constraint,
   migration runner, baseline, ledger, canonical Drizzle model, or approved
   compatibility exception. Use a dedicated database-authority branch/worktree;
   read policy and exception register; run the full migration-authority review.
   Never use ad hoc DDL, `db:push`, or mix this work into an unrelated feature PR.

## Startup for categories 2–4

1. Read the Entry Contract.
2. Run `pnpm db:authority:status`.
3. Confirm manifest validation, authority paths, approved target classification,
   and safe local-environment state where applicable.
4. Stop before database work for a remote, unknown, production, staging,
   Railway, or TiDB target without explicit approval; unsafe permissions;
   conflicting `.env.local`; missing/placeholder required values; or disagreeing
   authority files. Never print secrets or complete credential-bearing URLs.

The manifest owns approved and destructive command lists. Use its commands;
the normal authority workflows include `pnpm db:authority:bootstrap:local`,
`pnpm db:authority:consumer-contract`, and `pnpm db:verify:ci`. Prohibit
`db:push`, schema push, unapproved generation, manual DDL, archived migration
execution, remote access, and destructive local commands without acknowledgement.

## Consumer-drift procedure

For an unknown table, column, enum, or relationship: identify the consumer;
read its matching canonical Drizzle model; read the active migration only if
needed; then decide whether the consumer is stale. Repair a stale consumer,
add focused coverage, and run the fresh-schema consumer contract. If a genuine
schema requirement exists, stop unrelated work and open a dedicated
schema-authority workstream. Never revive retired fields from archived migrations.

## Local environment

Local configuration is owned by `~/.config/property-listify/local.env`; each
worktree should have the ignored link `.env.local -> ~/.config/property-listify/local.env`.
Use bootstrap to establish or validate it. Do not reveal values, recreate
passwords, copy remote credentials, overwrite a normal `.env.local`, or weaken
the `0600` requirement.

## Local Runtime

Inspect the Database Authority status, manifest, and context before any
database-bearing command. Treat service start as potentially mutating: it may
establish or initialize the authority-owned runtime directory even though it
does not create an application database. Obtain the required approval before
database creation, migrations, reference/scenario writes, disposal, or other
destructive cleanup.

System MySQL on host port `3306` is unrelated and prohibited. The local
Database Authority service uses only `127.0.0.1:3307` and the authority-derived
AppArmor-compatible runtime directory
`/var/tmp/property-listify-<uid>/mysql-3307`. Do not improvise a
home-directory MySQL datadir, and do not modify or disable AppArmor. Service
readiness, database readiness, schema readiness, canonical reference-data
readiness, scenario-data readiness, and application readiness are separate
claims. If the first runtime stage or any later stage fails, stop the sequence
and preserve the service, target, and sanitized logs as evidence; do not retry
migrations, edit ledgers, or repair data manually. Machine-local security
changes require separate founder authorization. AppArmor may mediate signals
independently of ordinary UID ownership: never assume a same-user shell can
signal a confined `mysqld`. Canonical shutdown uses the exact validated Unix
socket and `mysqladmin shutdown`; signal or privileged fallback requires
separate founder authorization. A first shutdown failure preserves evidence
and stops the workflow.

Adapter SQL control statements must use the driver's supported transaction or
non-prepared query path. Keep parameterized data statements on prepared
execution, and require real-MySQL protocol proof before declaring a new data
adapter runtime-ready.

## Token discipline

- Do not read the whole repository, every migration, or archived migrations.
- Use the manifest to locate authority and the affected consumer/model only.
- Do not reread detailed DBA audits when the Entry Contract resolves the task.
- Expand scope only after authority validation fails or schema-authority work is real.
- Do not load generic database references unless repository authority leaves a real question.

## Evidence output

For database execution return: task classification; authority contract used;
sanitized target classification; files inspected and changed; commands; tests
and results; consumer/schema conclusion; confirmation no remote target or secret
was exposed; whether schema authority changed; and any blocker or next action.

For database-independent work, state only that database initialization was not
required when relevant.
