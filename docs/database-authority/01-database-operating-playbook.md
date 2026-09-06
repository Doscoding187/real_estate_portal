# Database Operating Playbook

**Status:** Database Authority v3 operational companion  
**Owner:** Database and Release Engineering  
**Scope:** Property Listify database-bearing engineering and operations

This playbook converts the Database Authority entry contract into a repeatable
decision sequence. It is deliberately procedural: it does not grant access,
approve a target, replace the manifest, or create a second migration authority.
When this playbook conflicts with `AGENTS.md`, the Agent Entry Contract, the
Authority Manifest, the Database Authority Policy, an approved exception, or
the Database Change Protocol, those authorities win.

## 1. The outcome we are protecting

Property Listify has one canonical database model and one controlled path from
that model to a deployed application:

```text
Drizzle desired model
        ↓
active migration manifest and immutable baseline
        ↓
Database Authority plan/apply and durable ledgers
        ↓
physical MySQL/TiDB schema and declared data roles
        ↓
runtime consumers and readiness checks
```

The live database is a target that must converge to the approved repository
model. It is not a competing design authority merely because it contains older
tables, data, or a successful migration head. Historical SQL, stale fixtures,
and an old production shape are evidence to audit, not instructions to revive.

## 2. The delivery boundary

Code delivery and database release are related but separate control planes:

1. Work in one task-owned feature worktree and branch.
2. Update code, Drizzle models, active migrations, and contracts in that
   workstream when the change requires them.
3. Open a PR and run the required checks against the review commit.
4. Merge the approved PR to `main`. `main` is the code and migration-manifest
   release source.
5. Railway and Vercel deploy the exact merged commit. Record the deployed SHA
   and run application smoke checks.
6. For a protected database, run a separate named release operation. The
   merge, deployment, health endpoint, or container shell does not authorize
   that operation and does not apply its migrations automatically.
7. Verify database state and application readiness independently after the
   release operation.

A read-only plan does not authorize an apply.

In particular:

- `main` is the integration and deployment source; a worktree is not a second
  production source.
- A deployed artifact can be healthy while its database is non-congruent.
- `/api/health` proves process liveness. `/api/readiness` reports layered
  service, target, schema, data-role, and application readiness.
- A production runtime may correctly report that it is not an exact disposable
  worktree. Do not “fix” that diagnostic by changing the target or weakening
  ownership checks.
- Application startup must never migrate, seed, repair, import, restore, or
  converge a protected database.

## 3. The universal state machine

Every database-bearing task has one current phase. Advance only when the
phase's evidence is present:

```text
CLASSIFY
   ↓
RESOLVE TARGET
   ↓
INSPECT AUTHORITY
   ↓
PLAN
   ↓
REVIEW / APPROVE
   ↓
APPLY (only when explicitly authorized)
   ↓
VERIFY
   ↓
HAND OFF
```

The following are not phase transitions: opening TiDB SQL Editor, entering a
container, seeing a green build, seeing a successful deployment, or receiving
a plausible-looking command from a previous conversation.

### Phase 0 — Classify

Choose exactly one primary route before reading broad database files:

| Route | Meaning | Default target/action |
| --- | --- | --- |
| No database | UI, copy, static docs, or code with no database data | Do not initialize or inspect a database |
| Local data | Browser or manual validation needs canonical accounts/data | Owned disposable worktree target only |
| Consumer | Runtime query, service, seed, fixture, API, or schema error | Reconcile consumer to canonical model |
| Schema authority | Model, table, column, relationship, index, constraint, migration, ledger, or exception | Dedicated DB worktree and change protocol |
| Protected release | Staging, production, Railway, TiDB, shared data, or live reference data | Read-only plan until separately approved |
| Incident/recovery | Failed attempt, provider capability mismatch, repair, restore, import, or backfill | Stop; use a named reviewed recovery/exception contract |

Do not turn a consumer failure into a schema change merely to avoid an audit.
Do not turn a release into a local migration because the protected plan is
inconvenient.

### Phase 1 — Resolve the target

Read the entry contract and run:

```sh
pnpm db:authority:status
pnpm db:authority:manifest
pnpm db:authority:context
```

Record only sanitized target information: target class, database name when the
authority reports it, fingerprint/hash, runtime mode, worktree ownership, and
credential class. Never paste a complete credential-bearing URL or a secret
into a ticket, PR, log, screenshot, or chat.

The resolved context is immutable for the operation. A child command must
inherit and match it. Explicit process targets outrank fallbacks; unknown,
shared, staging, and production targets fail closed without the required
operation approval.

### Target and credential matrix

Use the exact names reported by the authority; do not rename a target based on
its host, branch, or a dashboard label:

| Authority class | Safe default | Typical use |
| --- | --- | --- |
| `clean-main-local` | Read-only local inspection | Clean integration worktree diagnostics |
| `disposable-worktree` | Owned local mutation | Feature migration, role data, and browser validation |
| `disposable-test` | Isolated test mutation | CI/test-owner contract execution |
| `staging` | Protected, approved only | Pre-production release verification |
| `production` | Protected, approved only | Live release, reference data, or convergence |
| `unknown` / `shared-remote` | Deny | Stop and resolve authority; never guess |

Credential class is a permission boundary, not a username suggestion:

| Credential class | Permitted intent |
| --- | --- |
| `read-only` | Inspect, plan, verify, and diagnostics |
| `runtime` | Authorized application runtime connections |
| `local-owner` | Owned disposable local worktree operations |
| `test-owner` | Isolated CI/test target operations |
| `migration` | An explicitly approved migration or protected release apply |
| `lifecycle-admin` | Exact owned-target create, dispose, reset, or rebuild |

If a command asks for a credential class that does not match the operation
policy, stop. Never upgrade a read-only session in place to bypass a refusal,
and never put credentials in source control, screenshots, shell history, or
the evidence packet.

### Operation routing table

| Intent | Read-only phase | Apply/verify path |
| --- | --- | --- |
| Local schema | `db:migrate:plan` | `db:migrate:apply` on the owned disposable target |
| Protected schema | `db:release:plan` | `db:release:apply` with exact approval, digest, and acknowledgement |
| Commercial reference data | `db:release:reference:plan` | `db:release:reference:apply`, then `:verify` |
| Failed migration/recovery | Named recovery `:plan` | Matching named recovery `:apply`; never generic retry |
| Physical/provider convergence | Named capability/convergence `:plan` | Matching bounded `:apply`, then congruency/readiness |
| Local data role | Role `:verify` or read-only readiness | Role `:prepare`, then role `:verify` on an owned disposable target |

The exact command names, acknowledgement format, and exception scope are
owned by `operation-policy.json`, the Authority Manifest, and the Database
Change Protocol. This table routes work; it does not authorize it.

### Phase 2 — Inspect authority

Read only the files needed for the classified route:

- Entry Contract, playbook, and manifest for every database route.
- Database Authority Policy and compatibility exceptions for consumer/schema
  work or any compatibility question.
- Database Change Protocol for migrations, repairs, recovery, or releases.
- The affected canonical Drizzle model, active migration, consumer, and
  focused contract tests.

Do not use an archived migration, generated snapshot, stale fixture, or generic
PostgreSQL/Prisma recommendation as a design decision. If the desired model
cannot be proven, stop and produce an authority audit.

### Phase 3 — Plan

A plan is a read-only claim about a specific target and repository state. It
must expose, as applicable:

- sanitized target fingerprint/hash and target classification;
- current/accepted and expected migration heads;
- ordered pending migrations and checksums;
- durable running, failed, blocked, or recovery attempts;
- provider capability state and physical schema evidence;
- data-role or reference-data differences; and
- an exact plan digest for operations that provide one.

Save the plan output as evidence. A plan does not create schema, data, locks,
history, or approval.

### Phase 4 — Review and approve

Compare the plan to the requested outcome, canonical model, affected consumer,
and preservation/forward-recovery requirements. For protected work, record the
approval reference, actor, exact target fingerprint, operation name, plan
digest, and expected acknowledgement scope.

Approval is never inherited from:

- a PR or a merge to `main`;
- a green CI run or successful deployment;
- an earlier target, shell, or conversation;
- a different credential class or operation; or
- a plan whose target/head/digest has changed.

One-time approval values belong in the operator's current protected session,
not in source control or permanent application configuration unless a separate
authority explicitly requires them. Do not ask a junior operator to invent a
reference, fingerprint, or acknowledgement.

### Phase 5 — Apply

Apply only through the named repository command for the classified operation:

- local disposable migration through the local migration path;
- protected schema release through `db:release:plan`/`db:release:apply`;
- canonical commercial reference data through the `release:reference:*`
  sequence; and
- a reviewed incident through its exact bounded recovery or convergence path.

Use the exact accepted head, expected head, plan digest, approval evidence, and
acknowledgement emitted for that operation. Do not hand-author provider DDL,
edit a ledger, execute archived SQL, or use a generic retry/down-migration
pattern. MySQL/TiDB DDL is not described as transactionally rolled back.

### Phase 6 — Verify

Verification must answer the same question as the change, plus its downstream
consumer question. Select the smallest sufficient set:

| Change | Minimum evidence |
| --- | --- |
| Consumer-only | Focused consumer contract/test and canonical query review |
| Local schema | Migration plan/apply, schema congruency, relevant role verifier, readiness |
| Protected migration | Release plan/apply result, no blocked attempt, fresh plan/verify, congruency, readiness |
| Commercial reference data | `release:reference:verify` plus application/readiness smoke |
| Provider convergence | Capability state, bounded plan/apply evidence, per-object verification, congruency |
| Deployment | Exact merged SHA, hosting deployment result, `/api/health`, then relevant readiness/consumer smoke |

Do not substitute a liveness result for a schema result, or a schema result for
a data-role or application result.

### Phase 7 — Hand off

Report the evidence packet in the PR or incident record. Include blockers and
the next authorized phase; do not leave a future operator to infer whether a
plan was applied.

## 4. Local disposable recipe

Use this route only for a task-owned local worktree. The current
`listify_local` database is quarantined evidence and is not a scratch target.
The authority-owned service uses the approved UID-bound path and port; host
MySQL on port `3306` is unrelated.

Run one stage at a time:

```sh
pnpm db:authority:status
pnpm db:authority:service:start
pnpm db:authority:service:wait
pnpm db:authority:service:status
pnpm db:worktree:create
pnpm db:migrate:plan
pnpm db:migrate:apply -- --accepted-old-head=<head-or-none> --expected-new-head=<manifest-head>
pnpm db:schema:congruency
pnpm db:reference:prepare
pnpm db:foundation:prepare
pnpm db:scenario:prepare
pnpm db:reference:verify
pnpm db:foundation:verify
pnpm db:scenario:verify
pnpm db:readiness -- --purpose=<purpose>
```

The exact worktree identity and target must be re-resolved before disposal:

```sh
pnpm db:authority:context
pnpm db:worktree:ack
pnpm db:worktree:dispose -- --ack=CONFIRM_DATABASE_DISPOSE_<fingerprint-prefix>
pnpm db:authority:service:stop
pnpm db:authority:service:recover
pnpm db:authority:service:status
```

If any stage reports a foreign target, failed attempt, ambiguous service,
non-congruent schema, or unexpected ownership, stop and preserve sanitized
evidence. Do not reset, rebuild, or retry by changing the database name.

## 5. Consumer and schema recipe

### Consumer-only change

1. Identify the failing route and the canonical model it should consume.
2. Check the active manifest and physical evidence only as far as needed to
   distinguish a stale consumer from a real missing schema requirement.
3. Remove alternate-query, schema-guessing, empty-success, and retired-model
   behavior in the approved workstream.
4. Add focused positive and negative coverage against the canonical shape.
5. Run the fresh-schema consumer contract and report the target/evidence.

### Schema-authority change

1. Create a dedicated database-authority worktree and branch from the current
   integration base.
2. Define the desired Drizzle model and the smallest approved future-state
   transition before writing SQL.
3. Choose the next migration sequence only through a current manifest review.
4. Declare parent/checksum, statement policy, target classes, preconditions,
   postconditions, consumer evidence, and forward-recovery behavior.
5. Keep additive DDL independently verifiable. For TiDB, sequence newly added
   columns before dependent indexes, keys, or constraints.
6. Run static manifest, model-inventory, authority, and focused contract gates.
7. Open a PR. Do not apply a protected target from the feature worktree.

An unapplied migration is not production truth because it exists on a branch.
An applied migration is not permission to alter its checksum or rewrite its
history.

## 6. Protected release recipe

Use this only after the code PR is merged and the intended deployment commit is
known. The operator should have preservation evidence (for example, a verified
TiDB export or backup) before any approved live mutation.

### Read-only preparation

1. Confirm the intended merged commit and active migration manifest head.
2. Resolve the protected context and confirm the sanitized fingerprint/hash.
3. Use the named release plan command with the explicit accepted old head and
   expected new head.
4. Inspect pending order, checksums, attempt ledger state, provider capability,
   and schema/data evidence.
5. If the plan is not exactly the reviewed plan, stop. Do not “make it fit.”

### Apply gate

1. Obtain explicit approval for this operation and exact target.
2. Generate or copy the acknowledgement for this operation only.
3. Set the process credential class required by the command; read-only is for
   inspection/plan/verify, migration is for an approved apply. Never put a
   password or full URL in the command transcript.
4. Apply once with the exact plan digest and acknowledgement.
5. If the command fails, stop. Preserve its durable attempt ID and failure
   digest and route to the named recovery contract.

### Post-apply

1. Re-plan or run the operation verifier and prove the expected head/state.
2. Run schema congruency and the relevant data-role verifiers.
3. Check `/api/readiness`; investigate each failing layer separately.
4. Confirm the deployed artifact SHA and run API/consumer smoke checks.
5. Record the complete evidence packet and leave no one-time approval values
   as accidental permanent application variables.

## 7. Recovery and incident routing

| Signal | Correct response | Forbidden response |
| --- | --- | --- |
| Failed/running/blocked attempt | Preserve ID/digest; use named reviewed recovery | Retry or edit the ledger |
| Zero-statement rejected migration | Archive evidence unchanged; use bounded replacement recovery | Replay archived SQL or recreate the database |
| TiDB capability disabled | Plan provider convergence and count violations | Pretend migration history proves physical enforcement |
| Missing physical object after successful head | Audit schema congruency and approved exception | Add manual object in SQL Editor |
| Unknown/remote target | Stop and obtain exact operation/fingerprint approval | Guess from host, branch, or old variables |
| Data mismatch or import/restore request | Use the exceptional repair/backfill contract | Copy live data into a worktree or overwrite live data |
| Runtime/schema disagreement | Reconcile consumer to canonical model | Add fallback queries or empty defaults |

The two reviewed TiDB zero-statement recoveries and the CHECK-constraint
convergence are named exceptions, not examples of a generic repair facility.
Use the exact commands and scope in the Database Change Protocol and current
manifest; never generalize their acknowledgement or target to another incident.

## 8. TiDB-specific operating rules

- TiDB is reached through the repository's MySQL-compatible connection
  authority; platform selection is not a per-task design choice.
- Provider capability is part of physical readiness. A successful migration head
  does not prove that a disabled TiDB capability retained every intended
  constraint.
- `tidb_enable_check_constraint` must be checked by the named convergence
  operation when the canonical contract requires enforced CHECK metadata.
- Newly introduced columns and their dependent indexes, keys, and constraints
  are separate independently verifiable transitions.
- TiDB DDL failures are durable evidence. Do not assume an ordinary rollback.
- TiDB Cloud export/backup output is preservation evidence, not permission to
  import, replace, or merge a target.
- TiDB SQL Editor is suitable only for documented read-only evidence checks in
  an approved investigation. It is never the canonical schema, data, or ledger
  executor.

## 9. The junior operator stop list

Stop and hand off to the senior database authority when:

- the target class, fingerprint, owner, or credential class is unknown;
- a command asks for a permanent secret or a complete connection URL;
- a plan contains an unexpected migration, checksum, head, or provider state;
- any attempt is failed, running, blocked, or ambiguous;
- a proposed fix says to retry, edit a ledger, replay archived SQL, or use
  manual DDL;
- a generic guide chooses PostgreSQL, Prisma, a second runner, or a second
  database without repository authority;
- a test can be made green only by adding retired columns or fallback queries;
- readiness is false and the failing layer has not been identified; or
- the requested action would mutate shared/protected data without a named
  approval and a preservation/forward-recovery plan.

A stop is a successful safety outcome. Attach the sanitized evidence and wait
for the authority decision; do not fill the gap with assumptions.

## 10. Standard decision record

Copy this structure into a PR, release record, or incident note:

```text
Outcome:
Classification and current phase:
Task-owned worktree/branch and reviewed commit:
Canonical authorities read:
Target class, database name, and sanitized fingerprint/hash:
Credential class and operation:
Accepted/actual head and expected head:
Plan ID/digest and attempt/recovery ID:
Approval reference/actor and acknowledgement scope:
Physical schema, capability, and data-role evidence:
Files changed and stale behavior removed:
Verification commands and results:
Deployment SHA and smoke/readiness result:
Protected access or data mutation performed:
Remaining blocker or next authorized phase:
```

The record must say “not applicable” for fields that genuinely do not apply;
do not omit them and leave an unsafe assumption for the next operator.
