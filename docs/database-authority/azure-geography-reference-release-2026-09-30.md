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
`any` warnings. Physical apply and end-to-end geography journeys remain pending.

A protected apply still follows the repository's reviewed/merged release-source
boundary. This implementation does not claim that the feature branch is the
production artifact. Final cutover requires archive, account/session reset,
application readiness, capacity/recovery and exact release approval evidence.
