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
- The Phase 3 verification target
  `listify_wt_place_authority_slice0_f2af5b9a6482` was re-created from zero for
  the Phase 3 physical proof and **disposed again** afterwards. Do not assume it
  exists.

## Phase status

| Phase | Scope | State |
| --- | --- | --- |
| 0 | Typed Place Authority contract | closed (`52a8ab15`) |
| 1 | Gauteng scope contract repair | **closed** |
| 2 | Executable Place foundation | **closed** |
| 3 | Territory-neutral onboarding proof | **closed** (`ad753b3d` + Phase 3 refactor) |
| 4 | Western Cape (Province 2) | **evidence acquired; canonical source build in progress** |
| 5 | Remaining provinces | not started — depends on Phase 4 |
| 6 | National authority verification | not started |
| 7 | National consumer handoff | not started |

## Current phase

Phases 1, 2 and 3 are complete, closed and physically proven. Phase 4 is now
real work rather than a blocked wait: the governed Western Cape evidence arrived
and the remaining task is building the **canonical v0.2 source authority** from
it, then admitting it through the proven neutral pipeline.

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

## Phase 4 evidence acquisition record

### What arrived

Integration `f9bd8984` carries the reviewed acquisition packet authored on
`docs/geography-source-unblock-20261001` as `617d4847`, with
`docs/architecture/geography-source-acquisition-decision.md` as the governing
decision. The packet was verified offline before and after integration:

- Bundle manifest digest
  `f16907c92b55431f66496d1ffe0abc453be8e11b855d5ec2f262fceb58a005eb`, matching
  the digest the decision records
- `snapshot.py verify` — 16 files and 27,093 source-native records verified
  offline, from frozen local files only
- 7/7 offline integrity tests pass, including that the tooling itself **refuses**
  to treat the bundle as canonical admission

Bundle: `data/za-wc-source-acquisition-v0.1/snapshot-20261001/`.

### Contents and scope

- **14,930** GeoNames records filtered by source admin1 code `ZA.11`,
  cross-validated against Western Cape source identity `1085599` in the
  downloaded admin-code register. Retained national context: 103,212 GeoNames
  records, so missing, unknown and conflicting province codes stay reviewable
  instead of vanishing through a filter.
- **11,889** alternate-name assertions, retaining language, preference,
  historic and validity columns. These are **source assertions, not accepted
  Place names**, and they include non-place tokens.
- **274** geoBoundaries gbOpen boundary features indexed at **national** scope
  (9 ADM1, 52 ADM2, 213 ADM3).

Feature codes in the province-coded GeoNames set: S populated place 7,333;
T city/town 3,698; H historical 2,597; P section 901; L light 305; V vegetation
59; A administrative 32; R religious 5. Admin2 codes present: DC1–DC5 and CPT,
with 3,902 records carrying no admin2. 25 distinct admin3 codes.

### Licence determinations

GeoNames is **CC BY 4.0, attribution required** — not CC0. This corrects D3, which
previously read "GeoNames (CC0/attributed)". The D3 correction is applied in the
v0.5 contract; the newer v0.5 contract content was kept, not replaced by the
integration branch's older copy.

geoBoundaries **gbOpen** ADM1/2/3 declare `boundaryLicense` CC BY 3.0 IGO, source
OCHA ROSEA / Municipal Demarcation Board, distributed by geoBoundaries as
CC BY 4.0. Both notices and the upstream attribution are preserved per record.
gbAuthoritative and gbHumanitarian were not substituted.

### Recorded limitations — these are not optional

- **The boundaries represent 2020.** `boundaryYearRepresented` is `"2020"` for
  ADM1, ADM2 and ADM3, with `sourceDataUpdateDate` 2023-01-19 and `buildDate`
  2023-12-12. This is historical evidence, **not** a current-boundary
  certification. Download freshness, source modification date, geographic
  effective date and review date must stay distinct. A currency review is owed
  before any Western Cape scope is published, and a 2020 boundary must never be
  presented as a 2026-current fact.
- **ADM2/ADM3 are national, not Western Cape.** The packet deliberately did
  **not** assign them to Western Cape and did **not** treat a GeoNames admin
  code as proof of polygon containment. Assigning them requires resolving
  context against actual geometry, and code/geometry disagreements must be
  queued rather than silently resolved.
- **No Place has been minted, adjudicated, published or materialized.** The
  packet is acquired evidence, not the digest-pinned v0.2 canonical source
  authority the admission builder consumes. A registry entry alone cannot
  substitute for that authority.
- **Production ODbL approval remains a separate founder decision.** It does not
  block this engineering. The `osm_only_odbl_provisional` disposable-only gate is
  unchanged, and a `mixed_odbl_supported` label is not production clearance.

### Provenance and reproducibility

Every source record carries `source_native_id`, an `artifact_sha256`, a
`source_locator` (zip member and line), the per-record `licence` block, and
`attribution`. Raw artefact and record links stay resolvable back to the bundle.
The acquisition tooling reproduces and verifies with the Python standard library
only; a new acquisition is a new snapshot with a reviewed diff and never
overwrites an existing or partial bundle.

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

All green after Phase 3, and Phase 3 is now **physically proven** rather than
only statically proven.

### Physical proof on a fresh disposable target

Performed on a target created from zero through the approved lifecycle
(`db:worktree:create` → `migration:apply --accepted-old-head=none
--expected-new-head=0099_…` → `db:places:prepare`), then disposed with
`db:worktree:dispose`. No target was reused to claim a from-zero proof.

- Sanitized target `mysql://127.0.0.1:3307/listify_wt_place_authority_slice0_f2af5b9a6482`
- Target fingerprint hash
  `0c822b50ba97506e19b3dcbe822b90a05e8bd3ae13346366b8796de7de4a856d`
- Target classification `disposable-worktree`; ownership `exact-worktree-owned`
- Migration head `0099_saved_searches_canonical_place_reference_fk.sql`;
  `schema-congruent`
- Materialized **1,466 Places**, 2,476 names, 1,465 relationships, 4,463
  evidence rows, 2,971 external mappings
- Materializer content digest
  `d7859a2e7face1dec4e648bac65a0866b82ef1297178232dbaef2541177adf70`
  — identical to the committed package
- `db:places:verify` **passes**, including *after* the behavioural probe and the
  discovery suite
- Executable Place behavioural probe **40/40**, including a rerun materialization
  that is a byte-identical no-op with no Place ID changed
- Executable discovery suite **36/36**, including "executes every single
  search-eligible Place deterministically" over all 1,436 searchable Places

The target was disposed after the evidence was captured.

### A third real defect found and fixed

`contract.place-executable-foundation.test.ts` **wrote into the canonical
reference data role and never cleaned up.** It imported `afterAll` but declared
no `afterAll`, and three of its tests deliberately call `discoverPlaces` with an
invented term so that discovery records an `unresolved_query` evidence row. Each
run left three `place_evidence` rows behind, so `db:places:verify` failed
afterwards with `place_evidence rows 4466 != expected 4463` — a reference-data
failure that had nothing to do with the admitted package.

This is pre-existing and was invisible while no database was reachable. The fix
records every invented subject through `unresolvableTerm()` and deletes those
rows by canonical primary key in a **file-scoped** `afterAll`. The hook must be
file-scoped rather than suite-scoped: the subjects are created by the
"no-result and ambiguity" suite, so a hook inside any single `describe` runs
before them and cleans up nothing. That was the first attempt, and it was caught
by re-running `db:places:verify` after the suite.

### Static and regression gates

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

## The former external blocker, now the real pending work

**The Phase 4 evidence blocker is discharged.** Governed Western Cape source
evidence now exists in this repository as verified, digest-pinned acquisition
evidence. The old blocker is replaced by the genuine remaining work.

What the blocker was, for the record:

- The only approved, digest-pinned source authority was
  `gauteng-source-authority-v0.2`.
- The Gauteng builder resolved its source from a Gauteng-specific committed path
  and a Gauteng-specific manifest.
- Admitting any other province therefore required building a new **source
  authority** first.

What is still missing is narrower and now entirely internal:

- The evidence is **acquired, not canonical**. It contains no adjudicated
  identity, no factual type and no parent. The admission builder consumes a v0.2
  source authority; the bundle is not one.
- ADM2/ADM3 are national. Western Cape administrative context must be resolved
  against real geometry before any containment edge is asserted.
- The boundaries represent **2020**, so a currency review is owed before any
  Western Cape scope may be published.

The mission still forbids fabricating geographic evidence and forbids creating
a Place to satisfy search. A province cannot be admitted without real evidence —
and the honest consequence is that unresolved, ambiguous and conflicting records
stay unresolved and get queued.

Phases 1, 2 and 3 are closed and proven. Nothing about admitting another
province is an architecture problem any more; what remains is a governed source
build followed by the same proven pipeline.

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

**Build the Western Cape v0.2 canonical source authority from the acquired
evidence, then admit it.** Phase 3 means admitting a province is a registry entry
plus a source authority, not new architecture.

1. Parameterize the source pipeline. `tools/gauteng-catalogue` still hardcodes
   Gauteng paths, scope and pressure names (`config.py` `DATA_ROOT`,
   `"province": "Gauteng"`, `GautengSpatialGate`, `select_gauteng_feature`).
   Reuse it; do not paste a renamed Gauteng catalogue and do not create a
   competing authority.
2. Resolve Western Cape administrative context against **actual geometry** and
   the dated releases, not against source admin codes alone. Retain multipart
   features, holes and CRS84. Queue boundary points, multiple matches,
   code/geometry disagreements and version conflicts. Note that no geospatial
   wheel is installed in this environment, so any point-in-polygon derivation
   runs on the pipeline's standard-library fallback and must be recorded and
   tested as such rather than presented as GIS-grade.
3. Produce the equivalent v0.2 source authority: factual geography, name
   assertions, source links, a disposition for **every** candidate, a build
   summary, and a digest-pinned manifest. Do not classify all points as suburbs,
   all ADM3 records as one municipality type, or all same-name records as one
   referent. Do not force a city parent to complete a search ladder.
4. Review identity continuity and cross-territory boundaries before minting.
   Never merge by normalized name or proximity alone.
5. Add `za-wc` to the admission registry **only after** its source authority is
   pinned. Capture first-build expected counts as a deliberate review diff.
6. Run `tsx tools/place-admission/build-place-admission.mjs --territory za-wc`,
   and run `--check` with explicit territory selection so the default Gauteng
   check is never misreported as Western Cape proof.
7. Through Database Authority, create a fresh exact-owned disposable target,
   plan and apply this branch's manifest, load the Western Cape package with
   explicit territory selection, and verify it independently. Record the actual
   head and fingerprint, a no-op replay, unchanged Place IDs and a byte-identical
   rebuild. Run discovery and pressure probes, then **verify the reference role
   again** to detect test pollution. Dispose only that exact target.

Still forbidden, regardless of how complete the evidence looks: activating
consumers, publishing an SEO scope, inferring a Search Area, widening a search,
or claiming national coverage. The 2020 boundary vintage must be stated wherever
Western Cape geography is presented, and the production ODbL determination
remains founder-owned.
