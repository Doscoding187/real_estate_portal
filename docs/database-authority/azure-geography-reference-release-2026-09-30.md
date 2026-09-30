# Azure canonical geography reference release

Status: implementation and read-only planning; no protected apply claimed.

## Authority and scope

The 2026-09-29 fresh Azure transition and canonical-geography integration
instructions authorize this bounded preparation. The source is the existing
foundation plus digest-verified territory catalog integrated from `4356c0f7`.
No new geography source, schema, migration, account, listing or Search Area is
introduced. Missing original Gauteng inputs remain a regeneration blocker;
verified frozen projection use does not claim those inputs were recovered.

The existing `release-reference:*` commands now accept `--adapter=geography`.
Omitting the option still selects commercial reference data. Unknown adapter
names fail before connection. The geography path additionally binds the exact
retained Azure fingerprint
`b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced`.
Other Azure servers, TiDB and generic remote targets remain refused.

## Plan / apply / verify

Use the existing protected credential and approval channels; never put a URL
or secret in this document, shell history or persistent application variables.

```text
pnpm db:release:reference:plan -- --adapter=geography
pnpm db:release:reference:apply -- --adapter=geography --plan-digest=<reviewed-digest> --ack=<authority-issued-ack>
pnpm db:release:reference:verify -- --adapter=geography
```

Plan and verify use only SELECT statements. Apply requires the genuine
operation decision, exact target acknowledgement, distinct migration credential,
accepted full migration history and an exact reviewed plan digest. The digest
binds target, manifest, source index, desired materialized rows and observed
row IDs/values; it does not depend on an operator's worktree label.

Apply obtains a named connection-owned lock, verifies ownership, re-plans in a
transaction, inserts missing rows parent-first, verifies the complete result
before COMMIT, and rolls back on error. A post-COMMIT transport failure or lock
release failure is ambiguous: inspect read-only; never retry blindly.

Run only while ordinary geography writers are closed. The named lock
serializes this release path, not arbitrary SQL from unrelated writers.

## Identity and growth

`canonicalGeographyReleaseRows()` derives the release representation from the
same foundation and catalog as the existing geography adapter. It preserves
reviewed foundation-first values for duplicate governed identities, matching
the existing adapter's insertion order; no additional hand-maintained rows are
introduced. Foundation-only city shorthand resolves through its own unique
foundation entry, not an arbitrary territory member.

Existing rows are matched by full natural-key hierarchy. Their IDs are retained
and used for new child FKs. Repeated execution produces no INSERTs after a ready
plan. Catalog expansion can add missing parents/children without recreating
existing records. Unknown records, duplicate IDs/keys, orphans, and conflicting
names, coordinates, codes, publication status or parent hierarchy fail closed.
No UPDATE, DELETE, TRUNCATE, DDL or migration-ledger mutation is issued.

Identity renames, reparenting, retirement and conflicting corrections require a
separate reconciliation decision. This path does not silently turn those
changes into insertions or overwrite application relationships.

## Evidence and release boundary

Static Database Authority suite: 45 files / 405 tests PASS, including 13 focused
release tests: read-only plan, insert/repeat lifecycle, stable IDs after a new
child, unknown/duplicate/conflicting/orphan data, stale/missing plans,
connection lock mismatch, rollback/lock release, wrong protected targets and
fabricated authorization decisions. These are simulated SQL tests, not proof
of a live Azure transaction. Touched-file lint: zero errors, four existing
`any` warnings. Typecheck and production build PASS after the optional metadata type correction
`fb9c9935`; build retains existing large-chunk warnings.
Physical apply and end-to-end geography journeys remain pending.

A protected apply still follows the repository's reviewed/merged release-source
boundary. This implementation does not claim that the feature branch is the
production artifact. Final cutover requires archive, account/session reset,
application readiness, capacity/recovery and exact release approval evidence.


## Materialization inventory

The integrated catalog plus reviewed foundation derive exactly 1,438 rows:
9 provinces, 340 cities and 1,089 suburbs. This agrees with the existing
canonical adapter's expected materialization counts. The catalog's 1,414
runtime rows are not a substitute for this combined foundation/catalog count.

## Live protected read-only plan

Observed from the Railway backend network path using the existing inspector
credential and strict TLS. MySQL 8.4.9-azure, database
`propertylistify_database`, UTC `+00:00`. The plan makes no database writes.

- Source implementation: `fb9c9935` (extends `88a23b22`).
- Existing geography rows: 0.
- Proposed inserted reference rows: 1438.
- Plan digest: `c1c325e33759e32e6e2abbb68ecf133f4a2cb751b2067c7c1dcc77966cc6ce77`.
- Desired reference digest: `2b3faa45623a24d43abae097d2b07df53040ccd2e6a9a2841f952fb0f3af7b6b`.
- Source index digest: `ad32a26dbaa40d03f63545d5f9af0918cbea2e1d65c8166817b15c52e5d6f8c4`.
- Exact private plan SHA-256: `9350a93d439c039503f0fa6856b493949d05f2cab95449cfce027630195e1db4`.
- Restricted evidence: `~/.local/state/property-listify/azure-geography-release-20260930/plan.json`.
- Production TiDB URL hash comparison remains unchanged.

The temporary diagnostic archive under
`/tmp/pl-geography-authority-fb9c9935` in Railway is not a deployment and contains
no stored database credential. Remove it after completing diagnostic work.

This plan is concrete review evidence, not approval to bypass the reviewed
release-source boundary. Re-plan before any apply if the target or source changes.


## Integration review and physical local proof (2026-09-30)

Review added explicit `verified` status admission for provinces, including a
negative test for retired status. The Database Authority entry and machine
manifest now point to this geography release path; no skill or agent runtime
capability changes were introduced. The static authority gate, model inventory
and lifecycle contract pass; 406 authority tests pass. Typecheck passes and
touched-code lint reports zero errors (three existing `any` warnings).

The exact task-owned disposable local target was created and established
through all 95 canonical migrations, then populated by the existing canonical
geography reference adapter. MySQL 8.0.46 physical inspection agrees with the
new release planner: 9 provinces / 340 cities / 1,089 suburbs, zero pending
rows. Re-running the existing adapter preserved every row ID and full row
value, including timestamps. Schema congruency is unchanged. This proves
physical local materialization and repeat stability; it is not Azure 8.4
protected-apply evidence.

Production Railway has an automatic GitHub deployment trigger on `main` with
`checkSuites=false`. Therefore merging is also a deployment trigger unless the
trigger is first held through a controlled operation. PR preparation and CI
may proceed independently; do not describe an unheld merge as code-only work.

The earlier live plan digest is historical: adding province status changed
the desired reference digest. Generate and review a fresh protected plan
before apply; do not use the earlier digest.
