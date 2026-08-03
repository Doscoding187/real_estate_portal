# Database Authority continuation packets

These packets consume Database Authority v3. They must not redesign target
resolution, authorization, connection creation, lineage, attempt state,
worktree ownership, readiness semantics, or normalized schema comparison.

## Packet 1 — Complete worktree lifecycle and developer CLI

- **Reasoning:** High.
- **Required outcome:** Add bounded rebuild/replay and ergonomic profile/status
  commands around the existing owned database lifecycle. Adapt browser/E2E
  databases to derived ownership identities and restore their package commands.
- **Why it matters:** Developers need repeatable isolated workflows without
  reviving fixed database names or shell-level DROP/CREATE paths.
- **Implemented dependencies:** `resolveDatabaseAuthority`,
  `authorizeDatabaseOperation`, `expectedDatabaseAcknowledgement`,
  `createOwnedWorktreeDatabase`, `disposeOwnedWorktreeDatabase`, child
  fingerprint propagation, `runSqlMigrations`.
- **Repository areas:** `scripts/databaseAuthorityCli.ts`, `lifecycle.ts`,
  `worktreeProfile.ts`, `local-db.sh`, listing-performance/prospect E2E runners.
- **Critical invariants:** One registered worktree owns one derived database;
  exact target recheck before destruction; profile mode 0600; `listify_local`
  never resolves from a feature worktree; server remains shared.
- **Prohibited shortcuts:** Branch-name-only identity, fixed cross-worktree E2E
  names, raw admin URLs, shell DROP/CREATE, auto-deleting stale profiles.
- **Focused acceptance evidence:** Similar/truncated names differ; branch rename
  preserves ownership; wrong-worktree create/drop fail; replay from empty reaches
  head; E2E cleanup disposes only its owned target.
- **Database boundary:** Disposable local owned targets only. No existing,
  shared, remote, or unclassified database.
- **Mandatory stop:** Profile/physical ownership disagreement, unknown target,
  non-local host/port, or database with unclassified tables/data.
- **Merge order:** First after this tranche; before restoring data/E2E commands.

## Packet 2 — Complete schema-congruency CI execution

- **Reasoning:** High.
- **Required outcome:** Run normalized desired-versus-physical comparison in the
  isolated CI MySQL job on every database-bearing PR, archive sanitized diff
  evidence, and pin provider/tool versions.
- **Why it matters:** Static desired-model agreement does not prove migrations
  construct that model.
- **Implemented dependencies:** `normalizedDesiredSchema`,
  `normalizedPhysicalSchema`, `compareNormalizedSchemas`, runner-control-table
  exclusions, generated inventory digest, authority connection.
- **Repository areas:** `.github/workflows/ci.yml`, `package.json`, congruency
  tests, MySQL/TiDB normalization fixtures.
- **Critical invariants:** No second full schema inventory; comparison comes
  from Drizzle and information_schema; provider differences explicit; output
  contains no URL/credentials.
- **Prohibited shortcuts:** `db:push`, hand-maintained expected tables, ignoring
  categories globally, comparing only table names.
- **Focused acceptance evidence:** Fresh baseline congruent; deliberate type,
  null, default, unique/index, and FK drift fail independently; deterministic
  digest stable across runs.
- **Database boundary:** Fresh isolated CI service and owned disposable local
  databases. No protected target.
- **Mandatory stop:** Unsupported provider metadata cannot be normalized without
  losing meaning, or baseline/model drift requires an authority decision.
- **Merge order:** After Packet 1 if local lifecycle changes CI setup; otherwise
  may follow this tranche directly.

## Packet 3 — Separate reference, foundation, demo, scenario, and test data

- **Reasoning:** High.
- **Required outcome:** Split the retired monolithic seed into operation-specific
  modules with independent manifests/verifiers, bounded transactions, and no
  schema DDL; restore only their approved package commands.
- **Why it matters:** Required application data, demonstrations, browser
  scenarios, and tests have different safety and readiness semantics.
- **Implemented dependencies:** Operation policy entries, resolved context,
  authority SQL connection, child fingerprint, required-data readiness field.
- **Repository areas:** `server/scripts/localDemoSeed.ts`, fixture builders,
  `verifyLocalDemoSeed.ts`, consumer contract, data-version declaration.
- **Critical invariants:** Reference/foundation data is idempotent and versioned;
  scenario data is disposable; credentials are never logged; schema does not
  change; target ownership is exact.
- **Prohibited shortcuts:** One ambient seed, `LOCAL_SEED_ALLOWED` as authority,
  fixed `listify_local`/`listify_test`, catch-and-continue writes, production
  seed permissions.
- **Focused acceptance evidence:** Each role applies/verifies independently;
  wrong operation/credential/target fails; rollback behavior is truthful;
  readiness reports missing required version distinctly.
- **Database boundary:** Owned disposable worktree or isolated CI target only.
- **Mandatory stop:** Existing/unclassified data, need for production/reference
  backfill, schema DDL, or destructive cleanup outside scenario-owned rows.
- **Merge order:** After Packet 1; before consumer/browser restoration.

## Packet 4 — Consumer drift and compatibility retirement

- **Reasoning:** Medium.
- **Required outcome:** Remove runtime schema guessing, alternate-query retries,
  empty-success fallbacks, and the inline `getDb` unit adapter; inject test
  doubles explicitly and delete compatibility exports when consumers migrate.
- **Why it matters:** Consumers must expose authority/readiness failure rather
  than manufacture successful empty behavior.
- **Implemented dependencies:** Runtime pool authority, layered readiness,
  generated inventory, schema congruency, connection-path inventory.
- **Repository areas:** `server/db-connection.ts`, runtime capability services,
  routers/services with information_schema probes or fallback SQL, test setup.
- **Critical invariants:** No connection creation outside authority; required
  schema failure stays visible; unit doubles cannot appear in integration mode.
- **Prohibited shortcuts:** Catch/retry alternate column names, `return []` on SQL
  errors, broad mocking of authority, adding compatibility columns to schema.
- **Focused acceptance evidence:** Required-schema faults propagate; unit tests
  inject a named double; connection inventory shrinks; runtime smoke passes on
  exact head and fails on drift.
- **Database boundary:** Mocks plus owned disposable targets; read-only protected
  verification only with separate approval.
- **Mandatory stop:** A consumer requires an unresolved product behavior or an
  applied production schema transition.
- **Merge order:** After Packet 2; may run in bounded consumer groups.

## Packet 5 — Legacy utility and historical containment

- **Reasoning:** Medium.
- **Required outcome:** Delete or permanently stub every
  `legacyContainedDirectSources` and legacy target parser; make the raw-driver
  inventory contain only the canonical creator and authorized test fixtures.
- **Why it matters:** Manual scripts remain discoverable bypass hazards even
  when package commands do not reference them.
- **Implemented dependencies:** `connection-path-inventory.json`, residual
  utility authority, canonical diagnostics and CLI.
- **Repository areas:** `scripts/check-*`, debug/list utilities,
  `server/scripts/debug*`, residual manifests and static tests.
- **Critical invariants:** Preserve evidence only when explicitly required;
  replacement diagnostics resolve/authorize first; no sensitive output.
- **Prohibited shortcuts:** Reclassifying mutable scripts as read-only without
  SQL proof, leaving executable imports, moving files to an active directory.
- **Focused acceptance evidence:** Inventory equality guard passes; package and
  direct entrypoint scans show one creator; approved diagnostics still work.
- **Database boundary:** Static analysis and owned disposable/read-only local
  diagnostics only.
- **Mandatory stop:** A script contains business-critical repair semantics or
  evidence that must be preserved under an explicit retention decision.
- **Merge order:** After this tranche; independent of Packet 3 except shared
  seed/verification files.

## Packet 6 — CI matrix and serialized migration merge enforcement

- **Reasoning:** High.
- **Required outcome:** Add manifest-head merge serialization, stale-base
  detection, isolated MySQL/TiDB normalization matrix, attempt/failure contract,
  and required status checks without changing protected rules directly.
- **Why it matters:** Two valid PRs can independently claim the same next
  migration identity.
- **Implemented dependencies:** Manifest digest/parent checks, explicit old/new
  heads, plan digest, static manifest fixtures, congruency command.
- **Repository areas:** CI workflows, PR checks, merge queue documentation,
  branch protection proposal.
- **Critical invariants:** Rebase/replan against current `origin/main`; no
  reservation by PR number; no lexical tie; one expected head.
- **Prohibited shortcuts:** Auto-renaming migrations after review, trusting
  ledger order, direct protected-rule mutation without approval.
- **Focused acceptance evidence:** Competing-head fixture fails; stale manifest
  digest fails; serialized successor passes; CI job isolation demonstrated.
- **Database boundary:** CI disposable services only.
- **Mandatory stop:** Enabling/changing protected repository rules or merge
  queue policy requires founder/repository approval.
- **Merge order:** After Packet 2; before multiple product migrations merge.

## Packet 7 — `listify_local` recovery

- **Reasoning:** High.
- **Required outcome:** Produce an approval packet and, only after approval,
  choose evidence preservation, export, or disposal/re-establishment for the
  quarantined database. Never make its ledger canonical.
- **Why it matters:** It contains unclassified state and a noncanonical ledger.
- **Implemented dependencies:** Read-only diagnostics, target fingerprint,
  manifest planning refusal, schema congruency, lifecycle boundaries.
- **Repository areas:** No code unless a bounded recovery tool is approved;
  evidence lives outside migration authority.
- **Critical invariants:** Preserve existing state until decision; sanitized
  reads only; no ledger edits; new acceptance database is separately created.
- **Prohibited shortcuts:** Migrating, seeding, resetting, importing, dropping,
  repairing, or using it as clean-main evidence before approval.
- **Focused acceptance evidence:** Exact inventory/head/attempt/schema/data
  report, preservation decision, post-recovery fresh-manifest/congruency proof.
- **Database boundary:** `listify_local` is protected despite being local.
- **Mandatory stop:** Any write or export of durable/unclassified data requires
  the exact protected-operation approval packet.
- **Merge order:** Independent and approval-gated; never block disposable work.

## Packet 8 — Protected production migration and deployment

- **Reasoning:** High.
- **Required outcome:** Bind release planning/application to artifact identity,
  exact protected approval, expected heads, deployment sequencing, observation,
  and forward recovery.
- **Why it matters:** Local/CI proof is not production authorization.
- **Implemented dependencies:** `release-plan`/`release-apply` policy, protected
  approval, exact acknowledgement, manifest/attempt evidence, readiness layers.
- **Repository areas:** release workflow, deployment docs, protected secrets and
  provider configuration (read-only until separately approved).
- **Critical invariants:** TLS verification, least-privilege credentials,
  artifact/plan binding, no startup migration, no seed, no silent retry.
- **Prohibited shortcuts:** Reusing local-owner credentials, implicit approval,
  deployment-time `db:push`, treating disposable proof as release approval.
- **Focused acceptance evidence:** Plan on protected read-only credential;
  dry-run artifact binding; approval mismatch negative tests; post-apply head,
  attempt, schema, consumer, and release readiness.
- **Database boundary:** Production/staging are protected. No access or mutation
  without separate exact approval.
- **Mandatory stop:** Missing backup/containment, unknown data risk, destructive
  contraction, credential change, or target mismatch.
- **Merge order:** After Packets 2 and 6 and an approved real migration.

## Packet 9 — Failure-recovery rehearsal

- **Reasoning:** High.
- **Required outcome:** Define and rehearse reviewed recovery for failed/running
  attempts using a deliberately faulted disposable database; preserve evidence
  and choose forward action from verified physical state.
- **Why it matters:** Blocking attempts are safe only if recovery is explicit
  and operable.
- **Implemented dependencies:** Attempt rows/progress/digests, plan lock/recheck,
  schema congruency, lifecycle replay, readiness incomplete-attempt layer.
- **Repository areas:** New bounded recovery command and tests, operator runbook;
  no generic down framework.
- **Critical invariants:** Never delete evidence, edit history, record partial
  success, or retry ambiguous DDL; physical inspection precedes decision.
- **Prohibited shortcuts:** Marking failed attempts successful, automatic ledger
  repair, unconditional rerun, transaction rollback claims for DDL.
- **Focused acceptance evidence:** Fault after statement/progress boundary;
  normal apply/readiness block; evidence survives process loss; approved forward
  recovery reaches exact head and congruent schema.
- **Database boundary:** Deliberately faulted owned disposable databases only.
- **Mandatory stop:** Recovery would touch existing/shared/protected data or
  requires ledger editing/destructive contraction.
- **Merge order:** After Packet 1; before first high-risk product DDL release.
