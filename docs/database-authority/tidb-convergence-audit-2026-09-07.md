# Database convergence investigation — 2026-09-07

Status: investigation and implementation in progress. This record does not
authorize production operations or declare production ready.

## Evidence and architectural decision

The intended application schema is the modular Drizzle model. The active,
checksummed migration manifest is its executable history; physical metadata is
evidence against which the intended model must be verified. Neither a green
migration ledger nor a live process substitutes for physical congruency.
Keep this existing authority spine. A new ORM or a second migration runner is
not justified by the evidence collected so far.

The current 66-migration chain was executed from an empty, newly owned local
database on MySQL 8.0.46. It reached `0065_auth_verification_token_cleanup.sql`
with no incomplete attempts. Physical congruency returned no differences:
desired and actual digest both
`ab209b83c69d0667c6a63aa4c53dd46fb3e208e7ee18ca4568acd7f5c8343722`.
The static authority gate passed 33 files / 271 tests and reported 216 canonical
tables and 118 classified utility surfaces.

Local verification target: disposable-worktree, fingerprint
`7df1511cb91b7b64f1c035bd9a9e89d23dc4298317420433cd6afdc7d3556dc9`.
No production connection or mutation was performed during this investigation.
The quarantined `listify_local` was not modified. Governed service recovery
removed only stale transient PID/socket/lock artifacts before service start.

Geography preparation verified 9 provinces, 340 cities, and 1,089 suburbs.
Commercial foundation verified the three Launch Access products. Distribution
schema verification passed. The real Search-to-Lead scenario verified search,
detail, lead custody, duplicate replay, conflicting replay, rental isolation,
negative visibility cases, and owner/unrelated-user authorization.
The layered `db:readiness -- --purpose=search-to-lead` check returned
`applicationReady: true` for this disposable target.

The supplied CSV `results-2026-09-06-233105.csv` contains 13 PRESENT FK rows on
TiDB 8.5.3. It resolves the apparent omissions in the earlier pasted display.
Do not claim those FKs are missing based on that display. The CSV is historical
operator evidence, not a fresh protected snapshot.

## Root causes confirmed

1. Provider admission was incomplete. Existing convergence counts violating
   rows and validates CHECK expressions, but does not establish that TiDB can
   create those checks alongside the table's FK actions. The production attempt
   enabled CHECK support and then failed on the first CHECK, leaving a durable
   failed attempt and the capability enabled.
2. MySQL-only CI establishes MySQL reproducibility, not TiDB DDL compatibility.
   The current workflow provisions MySQL 8.0.44; local reproduction used 8.0.46.
3. Runtime initialization raced. Multiple concurrent `getDb()` calls could each
   create a pool and overwrite the stored pool reference. The new shared
   initialization promise and reset generation prevent that leak/race.
4. Metadata query failures were reported as absent schema objects. Connection
   or permission errors now propagate, rather than being cached as missing
   tables/columns. Existing startup handling can distinguish a probe failure.
   Counts now require the selected `count_value` alias and a nonnegative safe
   integer. Missing rows, nulls, unrelated fields and malformed values fail
   explicitly; a valid zero remains evidence that an object is absent.

The failed CHECK attempt is
`release-tidb-check-constraints-dca9b06396ad831ec1c218396150fa17`, with zero
completed checks and error
`ER_CHECK_CONSTRAINT_CLAUSE_USING_FK_REFER_ACTION_COLUMN`. Zero completed checks
does not mean zero side effects: the global setting changed to ON.

## Complete CHECK/FK interaction scope

The offline `pnpm db:schema:tidb-audit` derives all 22 checks from Drizzle and
reports nine checks with FK dependencies. It performs no connection or writes.
Its deduplicated `foreignKeyImpacts` output identifies 12 distinct affected
keys and every CHECK depending on each. Eight restrictive keys need explicit
action review, two Land claim keys need a lifecycle decision, and two Land
conflict keys have omitted actions in historical SQL and need physical
provenance verification. The unrelated verified-actor FK is not included.
Exit 1 means structural admission is unresolved, not that the audit crashed.
This is a conservative diagnostic, not a complete SQL parser or proof that all
remaining TiDB features are supported.

| Table | Checks with FK dependencies | Decision required |
| --- | ---: | --- |
| catalogue_publishers | 1 | Preserve restrictive organisation ownership; prove omitted-action DDL |
| development_supersessions | 5 | Preserve source/replacement/actor references and historical audit |
| land_claims | 1 | Resolve CASCADE versus persistent claim/evidence lifecycle |
| land_conflict_cases | 1 | Prove FK actions were omitted, as active migration 0030 specifies |
| location_provider_mappings | 1 | Preserve restrictive geography references; prove omitted-action DDL |

TiDB source at commit `ac41d7e3c8fcc7ffdb97311e2996cc9fb178e4c9`,
`pkg/table/constraint.go`, rejects a CHECK dependency when FK OnDelete or
OnUpdate is nonzero, including explicitly authored restrictive actions.
The provider documents omitted actions as NO ACTION and NO ACTION as equivalent
to RESTRICT. Effective INFORMATION_SCHEMA action names alone do not prove
whether an action was explicitly authored.

Sources:
- https://github.com/pingcap/tidb/blob/ac41d7e3c8fcc7ffdb97311e2996cc9fb178e4c9/pkg/table/constraint.go
- https://docs.pingcap.com/tidb/stable/foreign-key/
- https://docs.pingcap.com/tidbcloud/constraints

## Direct TiDB 8.5.3 experiment

The official linux/amd64 archive was verified against the versioned TiUP
metadata with SHA-256
`cee71bf941aa36c5f9141cc37f51c63378374539a6eed5eaa6129c4ed7e8ebe4`
(96,357,102 bytes). The executable reports v8.5.3, source commit
`dc2548aac79a712265e831cff2a3a896bc0a5a38`.

A temporary standalone unistore process bound only to loopback port 4001 and
a task-owned Unix socket. The SQL experiment used only the newly created
`property_listify_provider_probe` database, with synthetic parent/child tables;
it did not connect to an application database or use application credentials.
This is a bounded engine experiment under the authorized disposable validation
scope, not an alternative application migration runner.

Observed results with CHECK capability ON:

| Experiment | Observed result |
| --- | --- |
| Add CHECK with explicit ON DELETE RESTRICT | Rejected, error 3823 |
| Add CHECK with explicit ON DELETE NO ACTION | Rejected, error 3823 |
| Add CHECK with explicit ON DELETE CASCADE | Rejected, error 3823 |
| Add CHECK with FK actions omitted | Accepted |
| Insert invalid CHECK value with a valid parent | Rejected, error 3819 |
| Delete referenced parent with actions omitted | Rejected, error 1451 |
| Update referenced parent's key with actions omitted | Rejected, error 1451 |
| Fresh CREATE containing omitted-action FK and CHECK | Accepted |
| Replace explicit restrictive FK with omitted actions, then add CHECK | Accepted; synthetic child row preserved |

The metadata reports NO ACTION for both explicit and omitted actions. SHOW
CREATE TABLE preserves the distinction. Also, this TiDB version has no
`ENFORCED` column in INFORMATION_SCHEMA.TABLE_CONSTRAINTS or CHECK_CONSTRAINTS;
the first exploratory query requesting it failed with error 1054. The probe
then inspected the actual metadata shape and verified enforcement behavior
with rejected writes. Do not use the probe client's exit code as the test
result: the negative-case batch deliberately continued through expected SQL
errors, which are individually recorded above.

The TiDB-specific `information_schema.TIDB_CHECK_CONSTRAINTS` view likewise
exposes clause, name, table, and table ID but no enforcement flag. The
convergence verifier must therefore require capability `ON`, exact metadata,
and an isolated negative-write proof in its disposable-provider gate; metadata
presence alone is insufficient evidence of enforcement.

These results prove the narrow DDL and restrictive-action premise. They do
not prove the complete 216-table checkpoint, historical convergence, fault
recovery, Cloud permissions, or distributed TiKV behavior. The complete design
and remaining proof requirements are in `tidb-convergence-review-design.md`.

## Proposed forward repair, requiring executable proof

Use one bounded operation under the existing connection authority, migration
lock, plan digest, and durable attempt ledger. Do not reuse the failed v1
attempt as permission to retry it. The operation must inventory the entire
schema, all CHECK dependencies, FK definitions, orphan counts, invalid predicate
counts, capability state, canonical history, and the exact failed attempt.
Every DDL transition needs a precondition, postcondition and checkpoint; any
failure must preserve both historical and new attempt evidence.

For restrictive relationships, candidate repair is redefinition with omitted
actions after proving referential semantics stay restrictive. For land claims,
the domain service retains withdrawn declarations for review; cascading away
claims also cascades into verification assertions/events. Prefer retaining
claim-bearing parents, but audit deletion consumers and test that lifecycle
before changing the canonical FK contract. Never silently turn CASCADE into
RESTRICT as a syntax workaround.

Fresh TiDB creation must also work. Adding a final corrective migration alone
cannot solve an earlier CREATE TABLE rejected by TiDB with CHECK enforcement
enabled. A reviewed provider execution representation, or a versioned new
establishment contract retaining old lineage evidence, must resolve that path.
Do not edit applied SQL checksums or disable constraints to conceal this defect.

Before production approval, require an actual disposable TiDB reproduction of
both fresh creation and the historical head with CHECKs absent/capability ON,
with FK deletion behavior, CHECK rejection behavior, preserved row counts,
schema congruency and application contracts verified. Current local MySQL
results are insufficient for that approval.

## Remaining work and release assessment

Launch blockers: complete and test the TiDB forward repair and fresh creation
path; resolve the existing durable failed attempt through reviewed code;
verify all 22 enforced checks and complete physical congruency on production.
Production has not been repaired by this branch and is not yet certified ready.

Further investigation: full raw SQL consumer coverage, actual TiDB transaction
and metadata semantics, and production data-role readiness. Historical files
already fenced by utility/manifest controls need not be deleted for launch.

The broad default `tsc --noEmit` invocation reports many errors across the
repository (including an implicit old compilation target). The supported
`pnpm check` uses `tsconfig.check.json`; record its result separately. Do not
report the broad invocation as passed or attribute all errors to this change.
The supported `pnpm check` completed successfully (exit 0).

## Latest review handoff

The static authority gate was rerun after the FK impact inventory change:
33 files / 271 tests passed, 118 utilities were classified, schema sanity
passed for 216 tables / 66 migrations, and generated inventory remained current.
The metadata diagnostic and distribution-readiness tests passed (16 tests),
including valid-zero and malformed-count cases. The structural audit tests
passed (3 tests), including deduplication and exclusion of the verified actor.
The focused regression set passed 19 tests (connection initialization, metadata
probe failure handling, and structural admission). The supported `pnpm check`
and `pnpm lint:check` commands exited successfully. The full `pnpm test:ci`
run passed 558 test files / 3,920 tests, with 41 files / 206 tests skipped;
its existing UI warnings did not produce failures.

Do not mistake these passing tests for an implemented production repair.
The audit is an offline diagnostic; its assertion is not yet an apply gate.
The review design is still a proposal, and no checkpoint format, corrective
migration, or protected recovery executor has been activated on this branch.

The next implementation sequence is:

1. Make the pinned TiDB experiment a repeatable repository test harness with
   exact expected SQL errors, engine digest verification and a disposable-only
   target boundary. Preserve the already observed results as fixtures/evidence.
2. Implement the chosen establishment checkpoint and forward transition under
   the existing manifest/runner, including immutable receipts and explicit
   lineage recognition. Align the affected desired FK definitions in the same
   change. Test fresh MySQL/TiDB creation and the historical failure state.
3. Exercise interruption after every DDL boundary, data-preservation checks,
   FK/CHECK rejection, and application consumers. Only then prepare a new
   protected plan for operator review. The old v1 acknowledgement is not an
   approval for this new operation.

This sequence is outstanding implementation work, not an instruction to run
manual production SQL or retry the existing failed attempt.
