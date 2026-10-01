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
| 4 | Western Cape (Province 2) | **admitted and physically proven; not activated** |
| 5 | Remaining seven provinces | not started — depends on the Phase 4 pattern |
| 6 | National authority verification | not started |
| 7 | National consumer handoff | not started |

## Current phase

Phases 1–4 are complete. Western Cape is admitted, reproducible and physically
proven on a disposable target, and **no consumer reads it**. Nothing has been
published, activated, widened or switched.

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

## Phase 4 delivery record — Western Cape

### Source authority built from the acquired evidence

`tools/gauteng-catalogue/territory_source_authority.py`, territory-driven by
`TerritoryConfig`. The source pipeline was **parameterized, not duplicated**:
`TerritoryConfig` supplies province, name tokens, ISO codes and source admin1
code, so no province is named in code. `TerritorySpatialGate` replaced
`GautengSpatialGate` (the old name is retained as an alias), and
`select_territory_feature` replaced `select_gauteng_feature`. All 26 existing
`gauteng-catalogue` tests still pass.

| Artifact | SHA-256 |
| --- | --- |
| `data/za-wc-source-authority-v0.2/za_wc_source_manifest_v0.2.json` | `b3979264d784b4249e5e0692a913feccbac65a8a43ceebb38f56a7a8e3fbd74c` |
| `data/za-wc-source-authority-v0.2/za_wc_source_build_summary_v0.2.json` | `86d4e02846b0da359eeafe78662aa437ed2359bea50c75144512d7fde0cdef4b` |
| `data/za-wc-place-admission-v0.1/za_wc_place_admission_manifest_v0.1.json` | `0582f694539ca294e7aa2d1be2cce95faec908545f328a8d2c42bd3987550c0d` |
| `data/place-admission-territories.v0.1/territory-registry.v0.1.json` | `79e3580c38803fd8e77ed3cb33e9210d50eba75b75e1ab9abaabcd62eddaa4c6` |

Provenance chains unbroken: the source manifest's `source_snapshot_id` is the
acquisition bundle manifest digest
`f16907c92b55431f66496d1ffe0abc453be8e11b855d5ec2f262fceb58a005eb`; the registry
pins the source manifest by digest; the admission manifest records the registry
digest.

### Admission discipline

- Of **14,930** province-coded source records, **1,905** are admitted and
  **13,025** carry an explicit disposition. `1,905 + 13,025 = 14,930`, so
  disposition accounting is **total** against a declared source universe.
- Non-admission is by governed source class, not by name: 6,568 spot features
  (farms, airports, ruins, caves), 3,698 terrain and hydrographic, 2,597
  historical, 96 locality/reserve, 59 vegetation, 5 religious/structural, 2
  populated-place records outside the admitted codes.
- 42 merged groups, **all reviewed**: same normalized name, same admitted
  administrative context, sub-2 km duplicate GeoNames records. One
  `unique_administrative_container_name` merge, where the City of Cape Town ADM2
  and ADM3 records are one referent.
- 1,862 Places, 3,246 names, 1,861 containment edges, 11,062 evidence rows,
  1,905 external mappings, 13,025 disposition ledger rows.
- 1,832 searchable (1,766 `locality`, 65 `metro_city`, 1 `province`), 1,138
  publishable, **30 context-only municipalities with no scope**, 1,167 verified,
  695 provisional. All `permissive_supported`; **zero** OSM-only, so the founder
  ODbL gate is not engaged by this package.

### Administrative context is resolved from geometry

A GeoNames admin code is an assertion, recorded and compared, never treated as
containment proof. An explicit **crosswalk** maps each geoBoundaries polygon to
the admitted administrative identity, because the two sources disagree on
labels: the polygon is `West Coast` and the record is
`West Coast District Municipality`. Without the crosswalk the builder's
name-based parent join would have silently collapsed **five of six** districts
to a province parent. All six resolve; 1,886 of 1,905 identities carry an
`adm2`/`adm3` name that matches an admitted identity; 19 fall outside every
polygon and are queued as code/geometry disagreements.

**Honest limitation.** No geospatial wheel is installed, so selection and
containment run on the pipeline's standard-library ray caster, recorded as
`bounding_box_fallback`. A bounding-box-centre representative point sweeps a
genuine non-convex coastal unit out as readily as it sweeps an out-of-province
neighbour in — `Overstrand` is a real Western Cape municipality that a strict
inner test rejects. Weaker-evidence polygons are therefore retained, and **64
identities depend on that weaker selection test** (0 at ADM2). The number is
reported rather than hidden, and installing a GIS wheel is the owed follow-up.

### Reproducibility

- Source authority rebuilt into a scratch directory from the frozen bundle: all
  four artifact digests identical, and the manifest's `compact_artifacts`
  digests, build-summary counts, governed policy and administrative crosswalk
  all identical. **Byte-reproducible.**
- Admission package `--check` passes byte-identically for both territories with
  **explicit** `--territory` selection.
- Replay of the Western Cape materialization is a verified no-op: identical
  table fingerprints and identical Place-ID set digest
  `1c2cab66659aa5a776feefb40fbe87f4baeac75140c02430722f004ebad3a88e`.
- First build minted 1,862 IDs; every subsequent run `minted=0 reused=1862`.

### Physical proof

On a target created from zero through the approved lifecycle and **disposed**
afterwards:

- Sanitized target `mysql://127.0.0.1:3307/listify_wt_place_authority_slice0_f2af5b9a6482`
- Target fingerprint `0c822b50ba97506e19b3dcbe822b90a05e8bd3ae13346366b8796de7de4a856d`
- Classification `disposable-worktree`; ownership `exact-worktree-owned`;
  credential class `local-owner`; host `127.0.0.1:3307`
- Migration head `0099`; `schema-congruent`; `no-incomplete-attempts`
- Materialized 1,862 Places, 3,246 names, 1,861 relationships, 11,062 evidence
  rows, 1,905 external mappings; content digest
  `cccab2b49cde6022c0bcfa3f34b458b03cc6cfee7e2e062c6cc54dd7ae18e2a6`
- `places:verify --territory=za-wc` passes, **and passes again after the probe**,
  which is the test-pollution check
- Western Cape territory probe **30/30**: containment forest, one parent per
  Place, no self-referential or unevidenced edge, no search widening, no
  municipality promoted into a search tier, every settlement parented, no
  homonym pair collapsed (`nooitgedacht` ×4, `die hoek` ×4, `windhoek` ×3
  preserved), 272 non-Latin searchable names surviving, 5 official and 1,377
  multilingual names retained, 30 context-only Places neither searchable nor
  publishable
- The **default**-territory verify correctly **refuses** against a Western Cape
  loaded target, proving territory selection is real and a Gauteng pass can
  never be reported as Western Cape proof

The local service stopped mid-session with a stale PID file and was restored
through the governed `db:authority:service:recover` path, which removed only the
stale metadata. The target, its ledger and its data survived the bounce intact.

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

All green after Phase 4. Both Phase 3 and Phase 4 are **physically proven**
rather than only statically proven.

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


### Phase 4 gates

- Database Authority static gate **364/364**
- Determinism `--check` byte-identical for **both** territories with explicit
  `--territory` selection
- Territory-neutrality proof green
- Western Cape territory probe **30/30**
- Source authority byte-reproducible from the frozen bundle
- `gauteng-catalogue` unit tests 26/26
- typecheck clean, lint 0 errors, `git diff --check` clean
- Physical proof on a from-zero disposable target, verified again after the
  probe for test pollution, then disposed

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

## Phase 4 review packet

### A fourth real defect: silent multilingual name loss

`place_name` carries `UNIQUE(place_id, name_role, name)` and its text columns are
**`utf8mb4_0900_ai_ci`** — accent-insensitive *and* case-insensitive, and
whitespace-insensitive. The materializer inserts with
`ON DUPLICATE KEY UPDATE`, so any name the target's collation already holds is
**dropped silently, and the load reported success**.

The first Western Cape load proved it: the package held 3,252 names, the target
stored 3,246, and nothing complained. The six lost names were ordinary
multilingual evidence — `Lé Cap`, `Keýptaun`, `Kapské Město`, `Кейптаўн`. For a
South African product this is live multilingual-data loss, and it sat in the
**Gauteng** path too, merely masked there because its names happened not to
collide.

Three fixes, all of them strengthening rather than loosening:

1. The admission builder now deduplicates name assertions on the **target's own
   comparison** instead of exact string equality, so the package is loadable by
   construction. The surviving spelling is chosen deterministically by the
   existing ranked order, never by arrival.
2. Every suppression is recorded in the manifest under
   `collation_suppressed_names`, distinguished as `exact_duplicate_assertion`
   versus `target_collation`, with the kept spelling named. Western Cape records
   88 suppressions: 81 exact duplicate source assertions and **7 genuine
   collation collisions** the target genuinely cannot store.
3. The materializer now **fails closed** if the target does not hold exactly the
   package. The first version of this check compared rows *written this run*,
   which wrongly reported a correct idempotent replay as a defect; it compares
   the **resulting target state** instead.

Gauteng is unaffected in substance: 1 suppressed name, an exact duplicate
assertion, and its admitted rows remain byte-identical with materializer content
digest `d7859a2e7face1dec4e648bac65a0866b82ef1297178232dbaef2541177adf70`.

### Release-boundary dependency — requires a decision I must not take

`origin/main` (the accepted launch release) declares
`expectedHead = 0094_content_topics_primary_key.sql` with 95 migrations. This
branch declares `expectedHead = 0099_saved_searches_canonical_place_reference_fk.sql`
with 100.

They agree through `0090` and then **nine different migrations occupy the same
slots**:

| Sequence | `origin/main` | this branch |
| --- | --- | --- |
| 0091 | `transactional_email_deliveries` | `place_authority_place` |
| 0092 | `transactional_email_attempts` | `place_authority_place_name` |
| 0093 | `user_onboarding_state_primary_key` | `place_authority_place_relationship` |
| 0094 | `content_topics_primary_key` | `place_authority_place_evidence` |
| 0095–0099 | — | `place_authority_*`, `saved_searches_canonical_place_reference*` |

This is **not a merge conflict that can be resolved by taking a side.** It is a
migration renumber/rebase, which is schema-authority work requiring its own
review under `docs/architecture/database-authority-policy.md` and the change
protocol. Two consequences:

- The disposable target used here carries a **divergent history** from the
  release line. It is valid evidence for *this* branch and must never be
  presented as evidence about the release schema.
- Integrating Place Authority into the release line needs a reviewed renumber
  plan first. That plan is a separate, approved piece of work.

Nothing in this work was merged, pushed, deployed, or applied to a release,
staging, production, Railway, TiDB or Azure target. Every database operation
was `127.0.0.1:3307`, credential class `local-owner`, on an owned disposable
worktree target, disposed afterwards.

### Still owed, and deliberately not done

- **No consumer reads Western Cape.** `placeDiscoveryService` and every search
  path remain Gauteng-scoped. Consumer convergence is Phase 7 and is not
  authorized.
- **The 2020 boundary vintage is not a currency certification.** No Western Cape
  scope may be published on it without a currency review.
- **No geospatial wheel is installed.** 64 identities depend on the weaker
  bounding-box selection test. Installing a proper wheel and re-deriving is owed.
- **The `gauteng-source-authority-v0.2` producer is still not committed.** It
  exists only as uncommitted work in the sibling worktree this mission is told
  not to touch, so the Gauteng v0.2 source authority is committed data with no
  committed generator. Western Cape does not repeat that: its source authority is
  reproducible from committed code.
- **The production ODbL determination stays founder-owned.** Western Cape has no
  OSM-derived rows, so nothing here is blocked by it, and `permissive_supported`
  is not a claim of obligation-free use: GeoNames CC BY 4.0 attribution and the
  geoBoundaries CC BY 3.0 IGO upstream notice are recorded per identity.

## The former external blocker, now closed

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

**Phase 4 is complete. Phase 5 needs a decision that is not mine to take.**

**Seven** provinces remain. South Africa has nine; Gauteng and Western Cape are
admitted. The remainder is Eastern Cape, Free State, Limpopo, Mpumalanga,
Northern Cape, North West and KwaZulu-Natal. The machinery is now proven
territory-neutral: a province is a registry entry plus a governed source
authority, admitted by the same builder and materialized by the same adapter.
For each province:

1. Acquire governed source evidence on the pattern of
   `data/za-wc-source-acquisition-v0.1`, recorded in a snapshot manifest with
   per-record provenance and licence classification, and verified offline.
2. Build the v0.2 source authority with
   `tools/gauteng-catalogue/run_source_authority.py --territory <id>`.
3. Add the registry entry, build with `--territory <id>`, and prove it on a fresh
   disposable target with explicit territory selection, then dispose it.

Before that sequence can start, three things need owner decisions or external
input, and none is mine to take:

- **The migration renumber plan.** `origin/main` is at
  `0094_content_topics_primary_key` and this branch claims `0091`–`0099` for
   Place Authority. Integrating them is a reviewed rebase, not a merge. Until
   that plan exists, the two histories must not be conflated and this branch's
  target is evidence only about this branch.
- **The 2020 boundary currency review**, before any province's scope is
  published.
- **The founder ODbL determination**, before any OSM-derived Place may reach a
  non-disposable target.

Engineering work that is unblocked and does not need any of those:

- Install a geospatial wheel and re-derive both territories' administrative
  context, so the 64 identities relying on the weaker bounding-box selection
  test are re-proven on real geometry.
- Commit a generator for `gauteng-source-authority-v0.2`, or record formally that
  the Gauteng v0.2 source authority is unreproducible from committed code.
- Extend the Western Cape pressure-case list with further real referents as
  coverage questions are triaged.

Still forbidden, regardless of how complete the evidence looks: activating
consumers, publishing an SEO scope, inferring a Search Area, widening a search,
or claiming national coverage. The 2020 boundary vintage must be stated wherever
Western Cape geography is presented, and no consumer currently reads any of it.
