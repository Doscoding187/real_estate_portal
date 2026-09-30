# Place Authority — National Rollout Mission State

This is the single canonical progress tracker for the national Place Authority
mission. Do not create competing trackers.

A new agent or session resumes by reading, in order:

1. `AGENTS.md`
2. `docs/architecture/geography-coverage-contract.md` (active contract)
3. `docs/architecture/database-authority-policy.md`
4. this file

## Mission objective

Deliver one reproducible, evidence-governed, territory-neutral Place Authority
for South Africa. Preserve factual geographic identity, support canonical search
and discovery, handle names and aliases correctly, support evidenced
relationships without fabricating hierarchy, keep Search Areas separate, admit
provinces through one repeatable pipeline, produce deterministic Place identities
and artifacts, and prove every change physically on authorized disposable
databases. Place Authority remains the only geographic identity source.

## Active contract

- `docs/architecture/geography-coverage-contract.md` **v0.5**
- Sections 0–19 are the delivered record. **Section 20 is the binding scope
  contract**: `province / metro_city / locality` are product search-scope
  *categories*, not mandatory levels of the factual containment hierarchy. The
  only mandatory ancestry requirement for a scope is an evidenced chain to the
  province. A locality does not require a `metro_city` ancestor.

## Branch and worktree

- Worktree: `/home/edwardspc/Desktop/Dev/property-listify-main/.worktrees/property-listify-place-authority-slice0`
- Branch: `feat/place-authority-slice0-decision`
- `main` is `ad0c4247` and is never modified by this mission.
- Sibling worktree `property-listify-gauteng-source-authority-closure` is at
  `4356c0f7` with uncommitted work from another workstream. **Do not touch it.**
  The v0.2 source it holds was copied into this branch and is committed here.

## Phase status

| Phase | Scope | State |
| --- | --- | --- |
| 0 | Typed Place Authority contract | closed (`52a8ab15`) |
| 1 | Gauteng scope contract repair | **closed** |
| 2 | Executable Place foundation | **closed** |
| 3 | Territory-neutral onboarding proof | **closed** (`ad753b3d` + Phase 3 refactor) |
| 4 | Western Cape (Province 2) | **not started — external blocker** |
| 5 | Remaining provinces | not started — depends on Phase 4 |
| 6 | National authority verification | not started |
| 7 | National consumer handoff | not started |

## Current phase

Phases 1, 2 and 3 are complete. Phase 3 removed the last territory-specific
application logic: the admission builder and the Place materializer are both
driven by one committed territory registry, and a synthetic non-Gauteng
territory is admitted through the same code with no new engine.

Phase 4 remains blocked on governed evidence acquisition. See "Hard blocker"
below.

## Phase 3 delivery record — territory neutrality

### What was removed

The Phase 3 audit found territory-specific *application logic* in exactly two
places. Both are gone:

- `tools/place-admission/build-gauteng-admission.mjs` hardcoded `SOURCE_DIR`,
  `OUT_DIR`, `ADMISSION_VERSION`, `REGISTRY_PATH`, `V01_DIR`, the
  `gauteng_`-prefixed artifact filenames, and the frozen v0.1 comparison counts
  (1,480 / 1,414 / 116 / 11 / 8 / 3 / 14).
- `server/_core/databaseAuthority/dataAdapters/canonicalPlaces.ts` hardcoded
  `CANONICAL_PLACES_VERSION`, `PACKAGE_DIR`, `MANIFEST_PATH` and `REGISTRY_PATH`.

It is renamed to `tools/place-admission/build-place-admission.mjs`, names no
province, and accepts `--territory <id>` and `--registry <path>`.

Territory-specific *data* was deliberately left alone.
`server/data/marketIntelligence.ts` and
`dataAdapters/searchToLeadScenario.ts` remain, as does the named pressure-case
list in `tools/place-admission/probe-place-admission.mjs`: that list is evidence
about what happened to specific real referents in the `za-gp` adjudication, so
admitting another province extends the list rather than the machinery.

### The single authority

`shared/placeAdmissionTerritories.ts` is the one schema, validator and loader.
`data/place-admission-territories.v0.1/territory-registry.v0.1.json` is the one
committed registry. A territory entry names its source-authority directory, its
digest-pinned source manifest, its source artifact filenames, its admission
version, its coverage-baseline paths and counts, its package directory, and its
package artifact filenames.

It is deliberately **not** an extension of the Slice 1 projection catalog
(`data/geography-coverage-v0.1/territory-catalog.v0.1.json`). §12.7 requires the
neutrality proof to run without adding fictional rows to the real catalog, which
a single shared file could not satisfy. The two files hold disjoint fields and
disjoint artifacts: one pins frozen runtime projections, the other names the
admission pipeline's inputs and outputs.

Every load fails closed on an unregistered territory, a duplicate territory id or
admission version, a reused filename, a repeated pinned manifest path, a path
escaping the repository root, or a missing expected count.

### Two real defects found and fixed

1. **The committed admission manifest pointed at a file that does not exist.**
   `outputs.parent_evidence_classification` recorded
   `gauteng_parent_evidence_classification_v0.1.json`, while the builder wrote
   and git tracked `gauteng_parent_evidence_classification.v0.1.json`. Nothing
   had ever checked a manifest path against the filesystem. The builder now
   refuses to finish if any path its manifest advertises does not exist.
2. **The manifest embedded per-run counters.** `ids_minted_this_run` and
   `ids_reused_this_run` were written into a committed artifact, so
   `--check` could never pass after any run that minted an ID. This was
   invisible for `za-gp` only because its Place-ID registry was already complete,
   so every run was `minted=0 reused=1466`. The first territory to be admitted
   from scratch would have hit it immediately. The per-run counters are now
   reported on stdout; the manifest keeps only cumulative registry state.

### The neutrality proof

`pnpm place:admission:territory-neutrality`
(`tools/place-admission/prove-territory-neutrality.mjs`) writes a synthetic
province, two municipalities and three suburbs into a throwaway directory and
drives the real builder and the real materializer against it. It asserts that
the package is digest-pinned, that regeneration is byte-identical and mints no
IDs, that the unchanged materializer loads it, that an unregistered territory is
refused, and that the real registry and the real projection catalog are
byte-unchanged. Nothing fictional is committed.

## Authoritative digests

Admission territory registry
`property-listify-place-admission-territories-v0.1`:

- `data/place-admission-territories.v0.1/territory-registry.v0.1.json`
  `85046d6b0d2c883f53328bbd9322277ea7fa3db4f8db1f9281d24831fc1fac02`

Gauteng source authority `gauteng-source-authority-v0.2`:

- Source snapshot `14666e91befd11e1aea6b220c520678fbafbfc2c12383392e29c9e727fa0a06e`
- Source manifest
  `334b2a6be8a575b677ade9668e61203574f80231a88d63a39fdd64b5d806bf7b`
- Geography `7bba9cc217b207466916647cb674d637366eb45ed0c7c01b88c62c625e91884e`
- Names `b5021e21df8728416e0bb7d0f7858c824cb9bca4bd382b8f98cbbeed285d79fd`
- Source links `23559b7fd42c139aefbad4174fca3eadcfc7f9e717c5fa86b6d2b5888612dba7`
- Candidate dispositions `73212b62fb2999ae2d785b5c338bc6774e949c49b08de67252a1b6e245348943`

Admitted Place package `gauteng-place-admission-v0.1`:

- Admission manifest
  `3ea71455b1b54f6f682632b9e1017bd7fae4d097fac20a1f92617f0939d14cea`
- Materializer content digest
  `d7859a2e7face1dec4e648bac65a0866b82ef1297178232dbaef2541177adf70`
  (**unchanged by Phase 3**, which proves the admitted rows are byte-identical)
- 1,488 source identities, **1,466 admitted Places**, 22 merged groups
- 2,476 names, 1,465 `administratively_contains` edges, 4,463 evidence rows,
  2,971 external mappings, 4,350 disposition ledger rows
- **1,436 searchable** (1,096 locality, 339 metro_city, 1 province),
  **69 publishable**, 30 context-only municipalities with no scope
- 89 verified, 1,377 provisional, 720 OSM-only
- Regeneration is deterministic and `minted=0 reused=1466`; Place IDs are never
  remapped.

## Database and migration head

- Migration head: `0099_saved_searches_canonical_place_reference_fk.sql`
- 100 migrations `0000 → 0099`; 39 Place Authority CHECK constraints, all
  enforced; 219 canonical tables.
- `0098` adds the nullable `saved_searches.place_id` column; `0099` adds its
  `ON DELETE RESTRICT` foreign key. They are separate migrations because TiDB
  refuses a single `ALTER` that both introduces a column and adds a dependent
  constraint, and the canonical manifest requires one statement per incremental
  DDL migration.

## Test status

All green after Phase 3:

- Database Authority static gate **364/364** (was 352/352; +12 from the new
  territory-neutrality contract suite)
- **Territory-neutrality proof** — a synthetic non-Gauteng territory admitted
  through the same builder and materializer, package byte-identical across
  regeneration, `minted=0`
- Admission determinism check passes (`place:admission:check`)
- Geography coverage probes **1705/1705**
- Location authority regression **44/44** (5 files)
- Listing lifecycle + SEO/slug/place-id property regressions **116/116**
- typecheck clean, lint 0 errors, build clean, `git diff --check` clean

The Database-backed suites — the executable Place behavioural probe and
`contract.place-executable-foundation` — were **not** re-run, because the
worktree's disposable target was disposed after the Phase 1/2 gate and the
local service is currently unreachable (`db:authority:status` reports
`Service Availability: database-unreachable`). `contract.place-executable-foundation`
fails 18/36 in this environment **identically at `ad753b3d` with Phase 3 stashed**,
so it is an environment regression, not a Phase 3 regression. Re-run both on a
freshly created disposable target before relying on them.

Physical proof is always performed on a freshly created, owned, disposable
target and the target is disposed afterwards. Never reuse a target to claim a
from-zero proof. The Phase 1 and 2 proof target
`listify_wt_place_authority_slice0_f2af5b9a6482` was disposed after the gate.

## Unresolved research backlog

These are governed research cases. They are **not** admission defects and must
never be closed by manufacturing a Place:

- Kyalami / Khayalami — quarantined candidate, no accepted source identity
- Sky City — absent from the approved source
- Eden Park, Azaadville — quarantined candidates
- `Reiger Park` (two words) — quarantined; the admitted spelling is `Reigerpark`
- `Broadacres` exact — covered by the admitted `Broadacres AH`
- Missing estates, newly proclaimed extensions, new precincts generally
- Metropolitan-municipality classification: three source records carry
  `proposed_type_hints` naming `metropolitan_municipality` (City of Johannesburg,
  City of Tshwane, Ekurhuleni). They remain `local_municipality` Places. This is a
  Place-classification question requiring its own evidence, deliberately not
  resolved to satisfy a search scope.

The gate for these is **zero unexplained or unsafe admission**, not zero
outstanding research cases.

## Unsupported broad-scope expansion

Exact Place execution is proven. Broad expansion is **not**, and must fail
closed:

- A `metro_city` Place does not expand to every Place in its municipality.
- `Johannesburg` does not expand to all City of Johannesburg localities.
- `Soweto` does not expand to its constituent or market localities.
- Every `search_scope_authorized` flag is 0; `market_association` is
  non-expanding; no generic relationship traversal exists.

Expansion requires explicit governed semantics (evidenced settlement membership,
a governed executable-scope membership projection, or a Search Area).

## Production-only blockers

- **Founder ODbL gate.** 720 OSM-only Places are admitted but may be materialized
  only on a disposable target until the gate clears. The materializer refuses any
  non-disposable target that holds them. This blocks production activation only,
  not engineering.
- No consumer has been switched to Place Authority. Runtime convergence is a
  separate, bounded Phase 7 handoff.

## Hard blocker

**Phase 4 requires governed source evidence for provinces other than Gauteng,
and that evidence does not exist in this repository.**

- The only approved, digest-pinned source authority is
  `gauteng-source-authority-v0.2`.
- The Gauteng builder resolves its source from a Gauteng-specific committed path
  and a Gauteng-specific manifest.
- Admitting any other province therefore requires first building a new
  **source authority**: acquire geoBoundaries/GeoNames/OSM extracts for that
  territory, record provenance and licence classification per record, adjudicate a
  candidate catalogue, and pin it by digest. This is evidence acquisition, not
  application engineering.
- The mission forbids fabricating geographic evidence, and forbids creating a
  Place to satisfy search. A province cannot be admitted without real evidence.

This is an **EXTERNAL BLOCKER**: progress requires obtaining and governing
territory source extracts that are not present and that this mission is not
authorized to synthesize.

Phases 1, 2 and 3 are closed and proven. Phase 3 removed the last
territory-specific application logic, so nothing about admitting another
province is an engineering problem any more. Phases 4 and 5 are blocked only by
the evidence gap above.

## Resolved decisions that must not be reopened silently

1. Place identity is typed and authoritative; the three-level runtime projection
   is a consumer concern, not identity.
2. `province / metro_city / locality` are search-scope categories, not mandatory
   ancestry levels (contract §20.1).
3. A locality does not require a `metro_city` ancestor (§20.2).
4. Municipalities stay factual/context Places and are never re-typed as cities
   (§20.3).
5. `metro_city` is not redefined to mean municipality; the vocabulary is not
   renamed (§20.3).
6. No metropolitan-municipality Place type is introduced to complete a search
   ladder (§20.3).
7. Exact execution and broad expansion are separate capabilities (§20.4).
8. Containment reads child to parent: `from_place_id` is the child,
   `to_place_id` is the parent.

## Exact next action

**Phase 4, Western Cape, gated on governed evidence.** No engineering work
remains unblocked; admitting a province is now a registry entry plus evidence,
not new architecture.

1. Acquire governed Western Cape source evidence and build the equivalent
   source authority, following the documented v0.2 shape: geoBoundaries /
   GeoNames / OSM extracts for the territory, provenance and licence
   classification recorded per record, an adjudicated candidate catalogue, and a
   digest-pinned manifest. This requires an authorized territory extract and a
   licence/provenance determination.
2. Add a `za-wc` entry to
   `data/place-admission-territories.v0.1/territory-registry.v0.1.json` naming
   that source authority, its admission version, its package directory and its
   artifact filenames. Seed `expected_counts` from the first build's manifest
   and review them as a deliberate diff.
3. Run `tsx tools/place-admission/build-place-admission.mjs --territory za-wc`
   and prove it on a freshly created disposable target.
4. If evidence cannot be obtained, stop and report the blocker with Phases 1–3
   closed and committed.

When a province is admitted, also extend the named pressure-case list in
`tools/place-admission/probe-place-admission.mjs` with that territory's real
referents. That list is evidence, and evidence is per territory.

Do not begin consumer convergence, do not switch any runtime, and do not activate
a Search Area.
