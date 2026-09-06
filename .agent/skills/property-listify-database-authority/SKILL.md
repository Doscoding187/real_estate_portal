---
name: property-listify-database-authority
description: Route Property Listify database-bearing work through the canonical authority, target controls, planning, release, verification, and handoff workflow. Use for schema, migrations, runtime queries, data roles, database services, database tests, or protected database releases; do not use for frontend-only work.
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
metadata:
  owner: property-listify
  version: 1.1.0
  status: active
  risk_tier: instruction-only
  provenance: original
---

# Property Listify Database Authority

> **This is a registered Tier 0 operating guide. It does not authorize a
> connection, a credential, a migration, a data write, or a release.
> Repository-native authority always wins.**

Use this skill for schema and migration work, missing tables or columns,
database-backed runtime queries, seeds and fixtures, local database setup,
browser validation requiring seeded data, schema-consumer drift,
migration-ledger verification, database contract tests, database incidents, or
database authority and compatibility questions. Do not use for frontend-only
styling, components, copy, or visual work that does not require database data.

## One operating flow

Every database-bearing task follows this order:

```text
classify → resolve target → inspect authority → plan → review → apply → verify → handoff
```

Do not skip forward because a branch merged, a deployment completed, a console
is open, or a command appears familiar. A database change is complete only
when its required evidence says it is complete.

## Authority order

```text
User instruction and AGENTS.md
        ↓
Database Authority Agent Entry Contract
        ↓
Database Operating Playbook and Authority Manifest
        ↓
Database Authority Policy, exception register, and change protocol
        ↓
Canonical migrations and Drizzle models
        ↓
This skill’s activation instructions
        ↓
Generic database skills and assumptions
```

Read and obey these repository authorities; do not copy, replace, or weaken
them:

- `docs/database-authority/00-database-authority-agent-entry.md`
- `docs/database-authority/01-database-operating-playbook.md`
- `docs/database-authority/authority-manifest.json`
- `docs/database-authority/operation-policy.json`
- `docs/architecture/database-authority-policy.md`
- `docs/architecture/database-compatibility-exceptions.md`
- `docs/database-authority/database-change-protocol.md`

Archived migrations are historical evidence only. Generic PostgreSQL, Prisma,
or schema-design advice never overrides Property Listify’s MySQL/TiDB, Drizzle,
manifest, and migration-led authority.

## Start with a short routing record

Before editing or running a database-bearing command, state this internally or
in the working update:

```text
Task outcome:
Classification:
Target class: disposable local | isolated CI | protected release | no database
Current phase: inspect | plan | review | apply | verify
Canonical sources to inspect:
Required evidence before completion:
```

If any field is unknown, the task is in **inspect**, not **apply**.

## Credential channels are part of the authority boundary

`DATABASE_CREDENTIAL_CLASS` declares the intended permission class; it does
not choose a username, grant privileges, or turn a runtime credential into a
migration credential. The connection authority is the only component allowed
to select the credential URL.

For a `staging` or `production` operation using the `migration` credential
class, the authority requires `DATABASE_MIGRATION_URL` in the current process
environment. That URL must:

- use the approved MySQL/TiDB target with the identical host, port, and
  database fingerprint as `DATABASE_URL`;
- use a distinct non-empty database username and password from the runtime
  URL; and
- satisfy the protected TLS and certificate-verification policy.

`DATABASE_MIGRATION_URL` is an ephemeral operator/release input. Do not put it
in a repository file, `.env`/`.env.production`, a screenshot, shell history,
CI log, or persistent Railway service variable. Enter it with a hidden prompt
when the named release command requires it, and close the protected shell when
the operation and evidence capture are complete. A missing, malformed,
different-target, or same-user value is a deliberate fail-closed result. Do
not work around it by relabelling `DATABASE_CREDENTIAL_CLASS`, copying the
runtime URL, or using a provider SQL console.

## Classify the task once

Choose the narrowest category. Do not combine categories to obtain broader
permission.

1. **Database-independent work** — styling, frontend components, copy, visual
   refinement, or unrelated static documentation. Do not inspect migrations,
   Drizzle schema, or database audits. Do not initialize or bootstrap a database.

2. **Local-data workflow** — browser validation requiring seeded accounts,
   listings, developments, agents, buyers, or authenticated dashboards. Follow
   the local recipe in the operating playbook. `pnpm db:authority:bootstrap:local`
   may be used only after target/status checks; never reconstruct credentials or
   `DATABASE_URL` manually.

3. **Database consumer work** — runtime query, service, repository, seed,
   fixture, helper, database-backed API, or missing-table/column failure. Read
   the affected consumer, its focused test, the matching canonical Drizzle
   model, and an active migration only when needed. Repair a stale consumer;
   never recreate a retired schema to make a test pass.

4. **Schema-authority work** — table, column, relationship, index, constraint,
   migration runner, baseline, ledger, canonical Drizzle model, or approved
   compatibility exception. Use a dedicated database-authority branch/worktree.
   Read the policy, exception register, and change protocol before authoring
   anything. Never use ad hoc DDL, `db:push`, or mix this work into an unrelated
   feature PR.

5. **Protected release or recovery** — staging, production, Railway, or TiDB
   target; live reference data; release migration; provider capability; failed
   attempt; import, restore, repair, or convergence. Treat it as protected even
   when a browser console or container shell is available. A read-only plan is
   not approval to apply.

## Mandatory startup for categories 2–5

1. Read the Agent Entry Contract and the Database Operating Playbook.
2. Run `pnpm db:authority:status`.
3. For a database consumer or schema change, also read the policy and
   compatibility exception register before editing.
4. Resolve the approved command, operation, target class, credential class,
   and manifest head through repository authority. Do not derive them from a
   pasted connection command or a remembered environment variable.
5. Stop before a remote, unknown, production, staging, Railway, or TiDB target
   without explicit operation/fingerprint approval; unsafe permissions;
   conflicting local configuration; missing required values; or disagreeing
   authority files. Never print secrets or complete credential-bearing URLs.

The manifest owns approved and destructive command lists. Use its commands.
Prohibit `db:push`, schema push, unapproved generation, manual DDL, archived
migration execution, remote access, and destructive local commands without the
required acknowledgement.

## Keep code delivery and database release separate

- A feature worktree produces a reviewable PR.
- Passing review and merging to `main` makes the code and migration manifest
  the repository release candidate.
- Railway and Vercel deploy an exact merged commit. A successful deployment
  proves only that that artifact started or served its defined health checks.
- A protected database release is a separate, named operation. It requires its
  own read-only plan, review, protected-target approval, exact acknowledgement,
  and post-apply verification.
- Application startup must never silently establish, migrate, seed, repair, or
  converge a protected database.

Do not describe a merge, deployment, or health endpoint as proof that a schema
is current. Do not describe a successful migration head as proof that every
provider capability, physical constraint, reference-data role, and readiness
layer is current.

## Planning and applying

**Inspect before changing.** Read the smallest authority set that can answer
the question. Do not read the whole repository, every migration, or archived
migrations unless the entry contract requires an audit.

**Plan before review.** A plan must identify the sanitized target
classification and fingerprint, old and expected heads, ordered pending work,
durable attempt state, and plan digest where the operation supplies one. A
plan performs no schema or data mutation.

**Review before apply.** For protected work, review the plan output against the
requested operation and preserve the plan digest. Explicit human approval is
operation- and target-specific; it is never inherited from a PR, merge,
previous session, or different target.

**Apply once through the named authority.** Use the exact plan digest and exact
acknowledgement emitted by the named release path. Never hand-author SQL in a
provider console, edit migration ledgers, replay archived SQL, or silently
retry an ambiguous action.

**Verify independently.** Re-run the correct plan or verifier, then use the
schema, distribution, reference-data, readiness, consumer, and deployment
checks required by the task. A liveness endpoint and a schema-congruency result
answer different questions.

## Failure rules

Stop and preserve sanitized evidence when any command reports a failed,
running, blocked, incomplete, foreign, unknown, or non-congruent state.

- Never retry a failed migration or provider DDL just because it made zero
  visible progress.
- Never repair a ledger row, delete attempt evidence, or import data to make a
  dashboard look healthy.
- A zero-statement rejected migration can proceed only through its explicitly
  reviewed named recovery path in the change protocol.
- A TiDB capability mismatch or missing CHECK constraint is a provider
  convergence incident, not permission to replay history or weaken a model.
- If canonical authority and runtime code disagree, stop product work long
  enough to audit and reconcile the consumer to the canonical model.

## Local safety and data roles

The current `listify_local` is quarantined evidence. A feature worktree gets
its own authority-derived disposable target. Fixed `listify_test` is only for
isolated CI. System MySQL on host port `3306` is not a substitute for the
authority-owned local service.

Reference, foundation, scenario, demo, and fixture data are separate declared
roles. Service start does not seed them. A local browser journey is not ready
until the relevant role verifier and application readiness succeed. Do not
promote a disposable scenario into shared or production data.

## Completion evidence

Return a concise evidence packet:

Always report a sanitized target classification and fingerprint hash; never
include a secret or complete credential-bearing URL.

```text
Task and classification:
Worktree, branch, and reviewed commit:
Canonical sources used:
Sanitized target classification and fingerprint hash:
Plan/attempt/recovery state and exact head:
Approval and acknowledgement scope, if protected:
Files changed and stale behavior removed:
Verification commands and real results:
Deployment artifact and smoke result, if applicable:
Protected access, data mutation, or remaining blocker:
```

For database-independent work, say only that database initialization was not
required when relevant. For a blocked protected operation, hand off the plan
and stop condition; do not invent a workaround.

## Token discipline

- Start from the routing record and manifest, not broad repository search.
- Load only the affected consumer/model/migration and focused tests.
- Reuse a recent, valid sanitized plan only for explanation; re-plan before an
  apply if target state or session boundaries could have changed.
- Do not expand one incident into a speculative schema rewrite.
- Do not load generic database references unless canonical authority leaves a
  real unanswered question.
