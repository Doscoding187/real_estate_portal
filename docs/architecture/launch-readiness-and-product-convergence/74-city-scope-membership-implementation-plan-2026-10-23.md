# City scope membership implementation plan

**Status:** Canonical admission rebuild committed as `47af2c618`; Phase 3 URL projection and
the application-wide canonical Place cutover are implemented on the feature branch. Edward's
2026-10-27 pre-launch direction retires legacy geography paths without redirects, aliases or
fallbacks. Migrations through 0197 are authored on PR #693 and remain unapplied; Phase 4 database
release remains unauthorized.
**Founder confirmation:** Edward, 2026-10-23, confirmed the 13/48/2 disposition and the
refined 351-edge evidence set.
**Branch:** `feat/canonical-place-geography-phase3-20261027`
**Base:** `origin/main`
**Date:** 2026-10-23 (dry-run evidence added 2026-10-25)
**Target:** disposable worktree target `listify_wt_suburb_first_search_20261022_53581aab324f`
(fingerprint `840e8d36baa6bb48`). It was schema-congruent at migration head 0148 for the
admission rebuild. On 2026-10-27 Database Authority reported expected head 0197 but the local
database was unreachable; migration state and schema congruency could not be evaluated. No
migration was applied for this cutover.

## 1. Decision

The 63 empty City of Johannesburg city scopes resolve as follows:

| Disposition | Count | Action |
| --- | ---: | --- |
| Genuine main places | 13 | Keep as `city`/`town`; attach supported localities |
| Actually localities | 48 | Reclassify out of `metro_city`; attach where a parent exists |
| Duplicate/unsafe city identities | 2 | Keep out of publication and membership |

The supported relationship set is **351 `settlement_within` edges**:

- **312 existing locality scopes**: 246 exact Stats SA sub-place matches plus 66 spatial-only
  matches.
- **39 demoted city scopes** that fall inside one of the 13 retained main places.
- **268 high confidence / 83 medium confidence.**

The remaining **78 children** cannot be attached to a parent in the 63:

- Sandton: 52
- City of Johannesburg NU: 8
- 18 across 13 smaller missing main places

This plan implements the **safe correction first**. It does not create or promote parent scopes,
does not import the 237 unrepresented Stats SA sub places, and does not authorize any search
widening.

## 2. Evidence snapshot

Measured on the disposable target and the 2026 Stats SA/DPME evidence:

| Measure | Value |
| --- | ---: |
| Target `metro_city` scopes under the Johannesburg container | 63 |
| Incoming member edges on those 63 | 0 |
| Properties assigned to those 63 | 0 |
| Published city site paths | 61 |
| City rows without a published site path | 2 |
| Database `publication_eligible = 1` rows | 5 |
| Stats SA 2016 City of Johannesburg main places | 40 |
| Stats SA 2016 City of Johannesburg sub places | 804 |
| Stats SA sub places under the 13 retained main places | 585 |
| Locality scopes under the container | 385 |
| Supported exact sub-place localities | 246 |
| Spatial-only supported localities | 66 |
| Existing children whose parent is outside the 63 | 43 |
| Spatial-only children whose parent is outside the 63 | 26 |
| Duplicate Fordsburg identity hold | 1 |
| Newclare geocode hold | 1 |
| Non-settlement exclusions | 2 |
| Candidate `settlement_within` edges | 351 |
| Pending-parent children | 78 |
| Missing parent main places | 15 |
| Retained main places with zero current candidates | 5 |
| Stats SA sub places under those five | 34 |
| `administratively_contains` edges | 17,655 |
| `settlement_within` edges today | 0 |
| `search_scope_authorized = 1` edges today | 0 |
| `properties` rows | 9 |
| Published `properties` rows | 0 |
| `listings` fixture rows | 8 |
| Published `listings` fixture rows | 5 |
| Properties/listings assigned to the 63 | 0 |

Read-only preflight on the disposable target passed: 63 scopes, 351 resolvable child rows, eight
valid parent names, 0 settlement edges, 0 authorized edges, 17,655 administrative edges, 0
properties or listings assigned to the 63, and no self/duplicate/missing-referent edges.
The `listings` row is a separate fixture table; it is not the `properties` count used for
customer impact and it is not affected by this plan.

The 13 retained main places are Chartwell, Diepsloot, Ennerdale, Farmall, Johannesburg,
Kaalfontein, Lawley, Lenasia, Midrand, Randburg, Roodepoort, Soweto and Tshepisong.

The two holds are `Elandsfontein`
(`pl-place-01-425822ad7a5a8e7ff2e1dc38`) and `Northdene`
(`pl-place-01-5183abe5c5f567234b2d470b`).

The 48 demotions are recorded in
`/tmp/opencode/63-scope-evidence-matrix.csv`; the 351 candidate edges are recorded in
`/tmp/opencode/settlement-within-candidates-v2.csv`.

## 3. Canonical constraints

1. **One relationship vocabulary.** Membership is admitted only as
   `settlement_within`. `administratively_contains` is the municipality edge and must not be
   reused as a town-cluster edge.
2. **No inference.** Membership may not be derived from the municipality container, name
   equality, display text, coordinates alone, market association or search-area membership.
3. **`place_type` owns `search_scope`.** The database derives `search_scope` from `place_type`.
   A city/town row cannot be made a locality by updating the scope column alone. The 48 reviewed
   type changes and 351 membership relationships are now part of the admitted Gauteng v0.2
   package, built from source authority v0.3. The runtime uses canonical Place identity; no
   separate correction writer or ad hoc Place update remains.
4. **One scope per Place.** A Place cannot be both a locality and a main place. Sandton cannot
   remain a searchable locality and also become a city scope without a separate product
   decision.
5. **No search authorization by default.**
   `PLACE_RELATIONSHIP_SEARCH_AUTHORIZED_TYPES` remains empty. Every new edge carries
   `search_scope_authorized = 0`.
6. **Parent quality.** A `settlement_within` parent must be an active, searchable retained main
   place. A held or excluded row cannot be a parent.
7. **Evidence per edge.** Every edge carries a source title, URL, scope, vintage, licence state
   and confidence. The Stats SA/DPME licence state is still `UNVERIFIED`.

## 4. Original data plan (superseded by Phase 2.5)

This section records the reviewed 13/48/2 decision. The implementation now uses the canonical
admission package described in Phase 2.5; these notes are not a separate write procedure.

### 4.1 Reclassify the 48

The admitted package applies the 48 reviewed type corrections: `suburb` for the evidenced suburbs
and neighbourhoods, and `locality` for agricultural holdings, industrial areas and other
non-residential localities. `search_scope` remains derived from `place_type`; the per-row map is
reviewed evidence, never an inference from the proposed parent. Publication and search eligibility
are unchanged.

The reviewed map assigns **41 `suburb`** and **7 `locality`**. The 7 localities are `Althea`,
`Brink’s Vlakfontein`, `Hiltonia`, `Inadan`, `Jackson’s Drift`, `Van Wyksrus` and `Zonnehoeve`.
Twenty-nine of the 41 suburbs have an exact AfriGIS suburb polygon; the other 19 rows are
reviewed without a polygon match (the 7 localities plus 12 residential townships/suburbs).
The type map is carried row-by-row in
`data/gauteng-city-scope-correction-v0.1/place_corrections.jsonl`.

Do not reclassify:

- the 13 retained main places;
- `Elandsfontein` or `Northdene`;
- any row outside the 63.

The 48 former city paths are retired. The pre-launch route policy uses one canonical path per
Place and adds no redirects or aliases.

### 4.2 Add the 351 edges

The admitted package emits these reviewed relationships:

1. 312 edges for existing locality scopes.
2. 39 edges for the demoted scopes, after their type change succeeds.

Every edge:

- uses `relationship_type = 'settlement_within'`;
- uses `search_scope_authorized = 0`;
- points to one of the 13 retained main places;
- carries the evidence fields from the candidate matrix;
- has no self-reference and creates no cycle.

Do not add edges for:

- the 2 city holds;
- the 78 pending-parent children;
- the 2 non-settlement exclusions;
- the 9 demoted rows whose parent is outside the 63.

### 4.3 Keep the exceptions isolated

| Row | Treatment |
| --- | --- |
| `Elandsfontein` city | Keep `metro_city`; preserve `publication_eligible = 0`; no membership |
| `Northdene` city | Keep `metro_city`; preserve `publication_eligible = 1`; no membership |
| Duplicate `Fordsburg` locality | Hold; merge/retire only under separate data-quality approval |
| `Newclare` | Hold; geocode repair required |
| `Lion Park` wildlife reserve | Exclude from settlement hierarchy |
| `Diepsloot Natuurreservaat` | Exclude from settlement hierarchy |

The correct `Fordsburg` suburb remains supported under Johannesburg and is already in the 351.

## 5. Parent-scope work is blocked

The recommendation to add Sandton and City of Johannesburg NU is **not a simple insert** and is
deferred from this plan.

### Sandton

Sandton is currently a `suburb` with `search_scope = 'locality'`
(`pl-place-01-dee61758ef3bda7cd1a258ad`). Promoting it to `town`/`city` would remove it from
locality search and change its customer-facing role. Keeping it as a locality means its 52 Stats
SA children cannot use it as a main-place parent without a new model decision.

**Recommendation:** keep Sandton as a locality and leave the 52 children pending until the
product decides whether Sandton is a city target, a locality, or a Search Area.

### City of Johannesburg NU

No active preferred name for `City of Johannesburg NU` exists in the target Place Authority.
Creating it requires a new canonical Place and governed source admission, not a scope update.

**Recommendation:** defer; leave its 8 children pending.

### Lenasia South and the smaller parents

`Lenasia South` exists only as an OSM-only suburb with publication ineligible. Making it a main
place would require the ODbL gate and a type decision. The 18 children across the 13 smaller
main places remain pending.

**Recommendation:** defer all parent creation/promotion to a separate authority slice.

## 6. Phase plan

### Phase 0 — Freeze

- Record the target fingerprint and the exact SHA256 of the 63-row evidence matrix and the
  351-row candidate matrix.
- Snapshot the 63 Place IDs, current `place_type`, `search_scope`, publication and search flags.
- Record the current relationship, property and authorization counts.
- Confirm no unrelated worktree changes.

### Phase 1 — Preflight, read-only

- Assert 63 rows, 0 incoming member edges, 0 properties.
- Assert 13/48/2 disposition and 351 edge candidates.
- Assert every parent is one of the 13.
- Assert no candidate is a hold, exclusion or pending-parent row.
- Assert `settlement_within = 0` and `search_scope_authorized = 0`.
- Assert `administratively_contains = 17,655` and is untouched.
- Resolve every child and parent Place ID; fail closed on any missing referent.
- Produce a dry-run report with 48 type changes and 351 edge inserts, zero writes.

### Phase 1.5 — Governed write-path decision (resolved)

At the time of the original plan, no existing named Database Authority command could perform the
correction:

- `db:places:prepare` loads a digest-pinned admission package and refuses to change an existing
  Place's identity fields, including `place_type`;
- `db:places:release-preview:prepare` only inserts rows that are pending from the admitted
  package and rejects stored rows whose admitted values drift;
- the then-current Gauteng v0.1 package recorded all 63 rows as `town` or `city` with
  `search_scope = 'metro_city'`.

The decision initially selected a reviewed overlay, then changed to a deterministic canonical
package rebuild in Phase 2.5. The v0.3 source authority and v0.2 admission package are now the
only executable correction path; the temporary overlay writer was removed in Phase 2.6.

The original options were:

1. a reviewed, digest-pinned correction package and adapter with preview/apply/verify commands
   registered in the data-role manifest (recommended); or
2. a governed rebuild of the Gauteng admission package from a corrected source admission,
   followed by the normal release-preview path.

A one-off `UPDATE` script is not an acceptable path, even inside a rollback transaction.

**Decision history:** Option 1 was initially implemented as a reviewed overlay. After validation,
Phase 2.5 made the corrections part of canonical admission, and Phase 2.6 removed the temporary
writer. The v0.1 correction artifacts remain the audited source for deterministic derivation;
`data/gauteng-source-authority-v0.3/` and
`data/gauteng-place-admission-v0.2/` are the current admitted authority. The source CSV/GeoJSON
evidence is referenced by SHA-256 in the manifest but is not copied into the repository while the
Stats SA/DPME licensing review is unverified.

### Phase 2 — Disposable-target dry run (completed 2026-10-25)

The initial overlay was exercised on the disposable target under the approval recorded below. This
is historical evidence; the overlay writer has since been retired.

- One bounded transaction reclassified the 48 and verified derived scopes and publication flags.
- It inserted the 312 existing-locality edges and 39 demoted-scope edges.
- The preflight and post-write assertions were re-run; the authorized disposable target was left
  in the corrected dry-run state.
- No search scope was authorized, `administratively_contains` was unchanged, and no property was
  modified.

**Initial overlay dry-run evidence (2026-10-25, disposable target, prior approval).** The overlay package
digest is `36efde72f920b9c990aadfa8c81ce2069b4c8cf962f6678772dd411f680910e2`; the adapter
digest is `14f142d7e6c86ec658f24ada33cd5fcb887b59d2d00aa28a3e061b439a955335`.
Pre-apply plan digest `e48a4805dc34cafc7fcf44a0f948b202c0017d714ed6dde21b826819191e8569`
reported 48 pending corrections and 351 pending edges. Apply committed 48 corrections and 351
edges; post-apply plan digest
`15b0038f5aa6224635277b2ffb08a2eef34ee64f33e366c05fad96dd4532579b` reported 48 applied,
351 observed, 0 pending. `db:places:scope-correction:verify` passed with 41 `suburb` + 7
`locality`, 351 `settlement_within`, 0 authorized, 17,655 unchanged
`administratively_contains`, and 0 property/listing assignments. A second apply with the
post-apply digest wrote 0 corrections and 0 edges, proving the replay is idempotent. An
independent post-write query confirmed 48 corrections, 41/7 type counts, 351 edges, 0 authorized
edges, 17,655 administrative edges, 0 property/listing assignments, 13 retained, 2 held and 0
problems; a separate edge query confirmed 351 distinct locality children under 8 active
city/town parents. The target was left in the corrected dry-run state.

`db:places:verify` is not a valid post-check for this target: it is the single-territory Gauteng
verifier, while the target holds the national package (17,664 Places versus the Gauteng
package's 1,466). It also cannot accept the correction overlay until the admission package is
rebuilt.

### Phase 2.5 — Canonical package rebuild (executed 2026-10-25)

The rebuild removed the overlay's forward-only delta by making the corrections part of the
admitted data, through governed artifacts rather than edits to committed data:

- `tools/place-admission/derive-source-authority-v0.3.mjs` (one-time, deterministic) derived
  `data/gauteng-source-authority-v0.3/`: the four v0.2 source artifacts carried byte-identically
  (verified digests), plus `gauteng_factual_canonical_reviewed_type_corrections_v0.3.jsonl`
  (48 rows) and `gauteng_factual_canonical_reviewed_settlement_membership_v0.3.jsonl` (351 rows)
  reproduced from the reviewed correction package, plus a v0.3 manifest digest-pinning all six
  artifacts. The v0.2 factual manifest itself is never modified.
- Registry `schema_version` bumped `0.1 → 0.2`; the file moved to
  `data/place-admission-territories.v0.2/territory-registry.v0.2.json` (parallel Authorities
  are not kept). Schema 0.2 adds two optional source-artifact keys
  (`reviewed_type_corrections`, `reviewed_settlement_membership`) that only a territory carrying
  reviewed-correction artifacts may declare; unknown keys are refused fail-closed.
- `za-gp` moved to the v0.3 source authority and a new package
  `data/gauteng-place-admission-v0.2/`; its `expected_counts.relationships` is 1,816
  (1,465 administrative + 351 reviewed membership). The other eight provinces are untouched and
  declare no correction artifacts.
- The builder gained a fail-closed reviewed-correction overlay: type corrections override the
  source-classification type choice (a discordant outcome aborts the build; a correction that
  contradicts the governed scope asserts it explicitly), membership rows emit `settlement_within`
  edges with `search_scope_authorized = 0`, `basis = reviewed_settlement_membership` and the
  row's evidence string (Stats SA sub place / main place provenance), and a post-type
  reconciliation pass refuses any correction that does not land on its anchor Place. No Place
  was minted, merged or demoted by the rebuild (`minted=0, reused=1466`).
- `pnpm place:admission:build` (za-gp) and `pnpm place:admission:check` (byte-identical replay,
  both flags) pass with counts identities 1,488 / places 1,466 / names 2,476 / relationships
  1,816 / evidence 4,463 / mappings 2,971 / ledger 4,350.
- The national verifier's containment-forest check now filters `administratively_contains`
  (reviewed membership is an attestation, not containment); the national collision-surface
  tool got the same parentage filter. `db:places:verify-national` passes: 9/9 provinces
  complete, identity drift 0, expected == stored (places 17,664; names 26,425; relationships
  18,006; evidence 79,925; external mappings 19,792), containment edges 17,655.
- The disposable target was re-materialized (`db:places:prepare-national`), then its 48
  stale `place_evidence` note strings — the notes encode the admitted type, and the
  insert-only materializer cannot rewrite existing rows — were refreshed to the v0.2 canonical
  text by an authorized one-time repair restricted to a disposable target and refusing any
  non-`note` column drift.
- `db:places:release-preview:verify` passed (`readyForDataRelease: true`, 0 pending rows,
  161,812 existing rows). At that time, the temporary scope-correction verifier also passed with
  `canonicalAdmissionCompatible: true` / `canonicalPackageRebuildRequired: false` (351 edges
  observed, 0 pending, unchanged invariants); that writer and command were retired in Phase 2.6.
- The behaviour probe (`place:admission:probe`) is now registry-derived rather than hard-coded
  (expected counts come from the registry; the national row-counts are the sum across
  territories; pressure cases are scoped to the probed package; the rerun no-op uses
  `places:prepare-national`) and passes 41/41 against the corrected target.
- Contract suites passed at rebuild time: `contract.place-admission.test.ts` (35, including new
  settlement and reviewed-correction assertions),
  `contract.place-admission-territory-neutrality.test.ts` (19), and the database-authority suite
  set (42 files / 409 tests). The temporary adapter test was removed with its writer in Phase 2.6.
- The correction package remains untouched (its digest is `36efde72f920b9c990aadfa8c81ce2069b4c8cf962f6678772dd411f680910e2`)
  and continues to function as the reviewed decision record; the v0.3 source authority is its
  digest-verified reproduction inside the admitted data.

### Phase 2.6 — Retire the temporary correction writer (2026-10-27)

The Gauteng v0.2 admission package now carries the reviewed type and settlement membership
corrections. The one-shot `placeScopeCorrection` database adapter, its preview/apply/verify CLI
commands, its data-role registration, and its adapter tests were removed so the same reviewed
correction has one executable path: the canonical admission package and normal Place release
workflow. The v0.1 correction artifacts remain the audited source for deterministic v0.3
derivation. No database write was made during this retirement.

### Phase 3 — Projection and URL handling

The founder's 2026-10-27 pre-launch direction supersedes the earlier redirect/alias recommendation: this is
pre-launch, and the app uses one path generated from the admitted Place Authority. Former paths
are retired without redirects or aliases. The 13 retained city routes remain unchanged.

#### Phase 3 implementation (2026-10-26)

- Added `data/place-url-projection-national-v0.1.json`, deterministically built from all nine
  packages named by the active territory registry. It contains one exact route for each of 14,808
  active, searchable Places and pins the registry, package manifests and relevant package files.
- The route policy uses the province and Place name for province/city scopes. A locality uses its
  reviewed `settlement_within` parent when available, otherwise admitted municipality context, and
  otherwise a province `/localities/` namespace. Municipality path context does not grant search
  scope. Collisions receive a stable Place-ID suffix.
- Replaced the published-place registry search fallback with Place Authority search results joined
  to the canonical URL projection. Search no longer reads old published labels, runtime handles or
  legacy geography tables to form a Place URL.
- Replaced the province/city/suburb URL handlers with exact path resolution through
  `placeAuthority.resolveCanonicalUrl`. A path absent from the projection returns not found; the
  route does not normalize, redirect or alias it.
- Confirmed all 48 demoted Places are `locality` paths and none of their former one-segment Gauteng
  city paths exists in the projection. The 13 retained city paths remain `/gauteng/<place>`.
- Removed the old published-place registry artifact, builder, URL verifier and city-scope analysis
  script. The URL compatibility exception is retired; the separate DBX for remaining runtime
  projection readers is outside this route change.
- Added projection checks for unique paths and IDs, exact lookup, the 13 retained routes, the 48
  retired routes, and all 351 reviewed settlement contexts.
- Referral distribution now filters opportunities by exact `canonicalPlaceId`; development city,
  suburb and province snapshots are display-only and do not participate in matching.
- Removed the remaining neighborhood follow/detail cache and mock neighborhood list; Explore’s
  active feed uses the canonical Place selector and exact Place identity for area scoping. Explore
  video submissions copy canonical Place identity from their linked listing/development and no
  longer write a separate coordinate-based location assignment.
- Removed the numeric location contract and duplicate city/suburb/province state from listing
  authoring. Confirmed wizard state now requires the selected Place object for geographic identity;
  provider observations cannot populate a parallel hierarchy. Retired the unused draft adapter
  that serialized free-text geography and the unused database verifier that attempted a
  `locationId` development write.
- Removed stale test calls to the deleted `properties.search` compatibility route and tests for the
  retired `location.getFeaturedListings` route. Detail continuation now verifies an exact
  `canonicalPlaceId`; database lifecycle fixtures no longer select or assert retired numeric
  geography columns. The orphan Similar Locations component, which constructed URLs from display
  names, is deleted.
- Aligned active location controls with their route contracts. Buy, Rent, Developments, Commercial
  and the ListingNavbar use one canonical Place; choosing a new Place replaces the current one.
  Land and Shared Living retain sibling OR selections through canonical Place IDs. Buy/Rent cannot
  submit a multi-Place selection, and the neutral resolver prompts the user to remove extra Places.
  `LocationAutosuggest` selects only Place Authority results with projected paths. Commercial
  rejects retired text and numeric geography and resolves an initial selection only by
  `canonicalPlaceId`.
- Removed two unreferenced location entry components that used map geocoding or Google Places:
  `LocationPicker` and `GoogleLocationAutocomplete`. No application or test imports remained.
- Removed free-text geography from the Explore desktop and mobile filter panels, both Explore
  filter stores, and filter persistence. Old saved text is discarded when state is rehydrated.
  The unreferenced `useFilterUrlSync` hook, its tests and examples, and stale filter examples were
  deleted; typed query text cannot create an Explore location scope. Focused state and panel tests
  confirm the geography boundary in desktop and mobile filters.
- Changed the referral opportunity browse filter to select one canonical Place and match its
  exact `canonicalPlaceId`; the separate development-name search no longer matches city or
  province labels, and candidates without canonical Place identity fail closed. Removed the
  disconnected campaign wizard's raw city/province targeting controls while campaign procedures
  remain blocked until a canonical campaign authority exists. Referral check-fit behavior was not
  changed.

### Phase 4 — Release

Not authorized by this plan. A database release requires the Database Authority workflow, a
separate approval and its own verification.

## 7. Validation

### Pre-write

- 63 exact scopes; 13 retained; 48 demoted; 2 held.
- 385 locality statuses: 246 supported, 66 spatial-only, 43 parent-outside, 26
  spatial-parent-outside, 1 duplicate hold, 1 geocode hold, 2 non-settlement exclusions.
- 351 candidates: 268 high, 83 medium.
- 78 pending: 52 Sandton, 8 NU, 18 smaller.
- 0 `settlement_within`; 0 authorized; 17,655 administrative edges.
- No self-edge, duplicate edge, cycle or missing referent.

### Post-write

The data assertions below were proven on the disposable target during the admission rebuild.
Application-wide source checks on 2026-10-27 are recorded separately below; no migration apply or
database write was performed for the application cutover.

- 48 rows now have `search_scope = 'locality'`; 0 of them retain `metro_city`.
- 13 retained rows still have `search_scope = 'metro_city'`.
- 2 holds remain `metro_city` and edge-free; publication flags are preserved
  (`Northdene` is `publication_eligible = 1`, `Elandsfontein` is 0).
- 351 `settlement_within` edges exist, all with `search_scope_authorized = 0`.
- 0 edges point to a non-retained parent.
- 0 edges point to a held, excluded or pending-parent row.
- 17,655 `administratively_contains` edges remain unchanged.
- 0 property assignments and 0 published properties changed.
- **Complete (Phase 3):** every active searchable Place has one exact canonical URL; demoted legacy
  city paths have no route or redirect.
- **Open (Phase 4):** locality search still returns the same localities; no city-scoped
  property search is authorized, and no authorization flag is added.

### Application cutover verification (2026-10-27)

- `pnpm place:admission:check` passes for za-gp: 1,466 Places.
- `pnpm place:urls:check` reproduces all 14,808 active Place routes, including 787 stable collision
  suffixes.
- The focused canonical-search and consumer suite passes: 10 files / 91 tests. The frontend
  production build also passes.
- Additional focused canonical listing and wizard validation passes: 7 files / 160 tests across
  canonical assignment, listing lifecycle, detail continuation, location authoring and draft
  persistence. `pnpm build:frontend` passes after removing duplicate wizard geography state.
- Active Place selection controls pass 7 focused files / 55 tests, covering canonical discovery,
  single-Place transactional handoff, Commercial's rejection of retired geography, and supported
  Land/Shared Living contracts. `pnpm build:frontend` passes; Vite reports its existing large
  vendor chunk warning.
- `pnpm place:boundary-currency:check` finds no unsupported claims across the nine provinces; it
  does not prove boundary currency. Gauteng still has no recorded boundary provenance.
- `pnpm db:authority:status` reports expected head 0197, but the disposable target is
  `database-unreachable`; migration state and schema congruency are unevaluated. The canonical
  migrations have not been applied.
- Full-repository typecheck and the complete contract suite remain unverified for this cutover.
  Full-repository TypeScript checking previously exceeded the worktree's available memory; the
  focused consumer typecheck passed.

## 8. Rollback

- The digest-pinned package is the rollback record: each correction carries its full
  `expected_identity`, and each edge carries its exact child/parent/type key.
- The temporary v0.1 adapter was retired; the correction package and v0.3 authority remain the
  audit and deterministic rebuild record. Any future database rollback requires the Database
  Authority workflow and a separately approved migration or data operation.
- Keep the candidate evidence, dry-run output and package digest as the audit trail.
- A failed parent/child referent aborts the whole transaction; no partial membership set.

## 9. Open decisions

| Decision | Recommendation |
| --- | --- |
| Governing write path for 48 type changes + 351 edges | **Selected:** Gauteng v0.2 canonical admission package built from reviewed v0.3 artifacts; temporary writer retired |
| Sandton: locality, city target or Search Area | Keep locality; defer its 52 children |
| City of Johannesburg NU | Defer; requires a new canonical Place |
| Lenasia South / smaller parents | Defer; 18 children remain pending |
| 5 empty main places and 34 Stats SA sub places | Import only reviewed base sub places, not every extension |
| Leaked/lost 237 sub places under the 13 | Do not import wholesale; product granularity decision |
| Fordsburg duplicate | Quarantine; merge/retire separately |
| Newclare | Repair geocode before any edge |
| Lion Park and Diepsloot Nature Reserve | Keep out of settlement hierarchy |
| Stats SA/DPME licensing | Block publication until reviewer sign-off |

## 10. Acceptance

This plan is complete when:

- the 13/48/2 disposition is recorded;
- 351 candidate edges are reproduced exactly from the evidence;
- the 78 pending children and 15 missing parents are visible, not silently omitted;
- no database write has occurred outside an approved disposable-target dry run;
- no `search_scope_authorized` flag is set;
- the Sandton/NU/Lenasia South model conflict is recorded as a decision, not hidden as an
  implementation detail.

**No database or production change is authorized by this document.**
