# Migration reconciliation plan — Place Authority onto the integration head

**Status: PROPOSED FOR REVIEW. Not implemented.**

This document proposes a migration renumbering so that Place Authority can sit on
the current integration head. It is a schema-authority change and therefore needs
review before any code is written. Nothing here has been applied.

- Author: Place Authority geography workstream
- Date: 2026-10-01
- Branch: `feat/place-authority-slice0-decision`
- **Integration head, pinned by commit: `origin/main` = `cbc18c8fd`** ("Merge pull
  request #583: integrated Paid MVP controlled release")
- Authority: `docs/architecture/database-authority-policy.md`,
  `docs/database-authority/database-change-protocol.md`

### Pin the integration commit, and note that "main" is ambiguous here

There are **three** different migration heads reachable in this repository, not two.
Naming one without pinning its commit is how this plan was previously misread.

| Ref | Commit | Migration head | `*.sql` count |
| --- | --- | --- | --- |
| `origin/main` (**the integration base for this plan**) | `cbc18c8fd` | `0094_content_topics_primary_key.sql` | 95 |
| `main` (local, **not** the integration base) | `ad0c42474` | `0065_auth_verification_token_cleanup.sql` | 66 |
| `feat/place-authority-slice0-decision` (this branch) | branch head | `0099_saved_searches_canonical_place_reference_fk.sql` | 100 |

The local `main` branch is **600 commits behind** the cached `origin/main`, so it
stops at `0065` and shares nothing near the Place Authority sequence. Every
reference in this plan to "the integration head" means `origin/main` at
`cbc18c8fd`. If `origin/main` moves, this plan's numbering is void and must be
re-derived: it is a function of `cbc18c8fd`'s head, not of a branch name that will
keep moving underneath it.

## 1. The problem

The two lines agree through `0090` and then claim the same sequence numbers for
different migrations.

| | integration head | this branch |
| --- | --- | --- |
| `expectedHead` | `0094_content_topics_primary_key.sql` | `0099_saved_searches_canonical_place_reference_fk.sql` |
| migration count | 95 | 100 |
| last common migration | `0090_retire_disconnected_boost_campaigns.sql` | same |

This is **not** a merge conflict that can be resolved by taking a side. Sequence
identity is the authority for ordered incremental DDL, so two distinct
migrations cannot share a slot. Integrating Place Authority requires a
**renumbering**, which is what this plan proposes.

## 2. Good news: the two sets are semantically independent

Every integration-head migration in the contested range touches tables Place
Authority does not depend on:

| Migration | Effect | Interacts with Place Authority? |
| --- | --- | --- |
| `0091_transactional_email_deliveries.sql` | `CREATE TABLE transactional_email_deliveries` | no |
| `0092_transactional_email_attempts.sql` | `CREATE TABLE transactional_email_attempts` | no |
| `0093_user_onboarding_state_primary_key.sql` | `ALTER TABLE user_onboarding_state ADD PRIMARY KEY (user_id)` | no |
| `0094_content_topics_primary_key.sql` | `ALTER TABLE content_topics ADD PRIMARY KEY (content_id, topic_id)` | no |

None references `place`, `place_name`, `place_relationship`, `place_evidence`,
`place_external_mapping`, `search_area`, `search_area_member` or
`saved_searches`. So the reconciliation is a pure renumbering with **no semantic
rebase and no DDL rewrite**.

## 3. Proposed mapping

Place Authority renumbers from `0091`–`0099` to `0095`–`0103`, after the
integration head's `0094`.

| Current | Proposed | Effect | Depends on |
| --- | --- | --- | --- |
| `0091_place_authority_place.sql` | `0095_place_authority_place.sql` | `CREATE TABLE place` + 39 CHECK constraints | `provinces`-independent; canonical baseline only |
| `0092_place_authority_place_name.sql` | `0096_place_authority_place_name.sql` | `CREATE TABLE place_name` | `0095` (`place`) |
| `0093_place_authority_place_relationship.sql` | `0097_place_authority_place_relationship.sql` | `CREATE TABLE place_relationship` | `0095` |
| `0094_place_authority_place_evidence.sql` | `0098_place_authority_place_evidence.sql` | `CREATE TABLE place_evidence` | `0095` |
| `0095_place_authority_place_external_mapping.sql` | `0099_place_authority_place_external_mapping.sql` | `CREATE TABLE place_external_mapping` | `0095` |
| `0096_place_authority_search_area.sql` | `0100_place_authority_search_area.sql` | `CREATE TABLE search_area` | `0095` |
| `0097_place_authority_search_area_member.sql` | `0101_place_authority_search_area_member.sql` | `CREATE TABLE search_area_member` | `0100`, `0095` |
| `0098_saved_searches_canonical_place_reference.sql` | `0102_saved_searches_canonical_place_reference.sql` | nullable `saved_searches.place_id varchar(40)` | `0095` width parity |
| `0099_saved_searches_canonical_place_reference_fk.sql` | `0103_saved_searches_canonical_place_reference_fk.sql` | FK `ON DELETE RESTRICT` | `0102`, `0095` |

Dependency order is preserved: the `place` tables come first, `search_area`
before `search_area_member`, and the `saved_searches` column before its foreign
key. `0102` and `0103` remain separate migrations because TiDB refuses a single
`ALTER` that both introduces a column and adds a dependent constraint, and the
canonical manifest requires one statement per incremental DDL migration.

## 4. Checksum consequences

Migration checksums are **content digests of the file body**, so renaming a file
does **not** change its checksum. What does change:

1. `sequence` for all nine migrations.
2. `filename` for all nine.
3. The `parent` / `parentChecksum` chain from `0095` onward, and the `parent` of
   `0095`, which becomes `0094_content_topics_primary_key.sql`.
4. `expectedHead`, becoming
   `0103_saved_searches_canonical_place_reference_fk.sql`.
5. `docs/database-authority/migration-tree-authority.json`, which mirrors the
   manifest.

**No checksum value is invalidated by the renumbering itself.** That matters,
because applied-migration checksums are immutable and must not be rewritten for
history.

## 5. Every affected reference

| File | References | Change needed |
| --- | --- | --- |
| `server/migrations/manifest.json` | 18 | rename 9 entries, re-sequence, rebuild the `parent` chain, update `expectedHead` |
| `server/migrations/manifest.sha256` / manifest digest | 1 | regenerate |
| `docs/database-authority/migration-tree-authority.json` | 18 | mirror the manifest; this file is itself governed authority |
| `server/migrations/__tests__/migrationManifest.test.ts` | 12 | expected head, ordering and parent-chain assertions |
| `server/__tests__/contract.place-authority-foundation.test.ts` | 20 | per-migration filenames and head |
| `server/__tests__/contract.migration-execution-authority.test.ts` | 10 | head and sequence expectations |
| `server/migrations/__tests__/canonicalListingLocationMigration.test.ts` | 1 | head reference |
| `server/migrations/__tests__/manualLocationWithoutCoordinatesMigration.test.ts` | 1 | head reference |
| `server/_core/databaseAuthority/__tests__/dataAdapters.test.ts` | 1 | head reference |
| `docs/architecture/place-authority-national-mission-state.md` | 3 | head and the physical-proof record |
| `docs/architecture/geography-coverage-contract.md` | — | no migration numbers; no change |
| `vitest.database-authority-static.config.ts` | — | lists test files by path, not by number; no change |

## 6. The applied-history hazard — the reason this needs review

The nine Place Authority migrations have already been applied, under their current
names, to at least one database: the disposable target
`listify_wt_place_authority_slice0_f2af5b9a6482`, which has since been disposed.
Applied-migration checksums are immutable, so on any target where the old
`0091`–`0099` Place Authority rows exist in `sql_migration_history`, the
reconciled `0095`–`0103` would be **new migrations attempting to re-create
existing tables**.

Consequences to decide before implementation:

- The reconciliation is safe on a **fresh** target, and on any target that never
  saw the old numbering.
- For a target that did, `CREATE TABLE` will fail rather than silently
  misbehave, which is the correct fail-closed direction, but it must be a
  **deliberate** decision and not discovered during an apply.
- No production, staging, Railway or TiDB target has ever carried the Place
  Authority migrations. This is verifiable and should be confirmed again at
  implementation time.

## 7. What is deliberately not in this plan

- **No consumer activation.** The reconciled schema still reads nothing at
  runtime for Place Authority.
- **No data migration.** Every Place Authority migration is additive; the
  `saved_searches.place_id` column is nullable so no existing row is rewritten.
- **No change to any of the 17,664 Place IDs.** Renaming a migration does not
  touch rows, and identity is content-derived from the admission package, not from
  migration numbering. All nine provinces were proven replaying with `minted=0`
  before this plan was written, and that is the property a renumbering must
  preserve.
- **No geography changes.** This plan is about schema sequence only.

## 8. Proof required before the reconciliation is called done

1. Rebase this branch onto `origin/main` and apply the mapping in one commit.
2. Re-run the Database Authority static gate and `pnpm db:authority:check`.
3. Create a **fresh** owned disposable target, plan and apply the reconciled
   manifest, and record the actual head and target fingerprint.
4. Confirm the reconciled schema is congruent and that the 39 Place Authority
   CHECK constraints are all enforced and not merely declared.
5. Materialize **all nine** admitted provinces against the reconciled schema. Each
   province is proven individually on its own fresh disposable target with explicit
   `--territory` selection: verify, replay as a no-op, confirm Place IDs unchanged.
   This is the per-province proof and it does **not** require combined loading.
6. Re-run the nine territory probes.
7. Separately, run the national **storage** proof
   (`docs/architecture/place-authority-national-coverage-plan.md`): all nine
   packages into one disposable target in a single transaction, with rollback and
   replay. That is a storage question and is deliberately independent of this
   schema reconciliation.
8. Dispose that exact target and record the disposal.

## 9. Review questions

1. Approve the `0095`–`0103` mapping, or require a different placement?
2. Confirm the applied-history hazard in §6 is acceptable, or require that the
   reconciliation only ever lands on a fresh target.
3. Confirm `migration-tree-authority.json` should be updated in the same commit,
   since it is governed authority rather than a generated artifact.
4. Confirm the reconciliation is a single commit on this branch, reviewed before
   any merge to the release line.
