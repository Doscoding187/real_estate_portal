# City scope membership implementation plan

**Status:** Implemented and dry-run verified on the disposable target (2026-10-25). Review,
commit, Phase 3 URL work and the canonical admission-package rebuild remain unauthorized.
**Founder confirmation:** Edward, 2026-10-23, confirmed the 13/48/2 disposition and the
refined 351-edge evidence set.
**Branch:** `feat/suburb-first-search-ux-20261022`
**Base:** `origin/main`
**Date:** 2026-10-23 (dry-run evidence added 2026-10-25)
**Target:** disposable worktree target `listify_wt_suburb_first_search_20261022_53581aab324f`
(fingerprint `840e8d36baa6bb48`, manifest head `0148`, schema congruent)

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
   A city/town row cannot be made a locality by updating the scope column alone; the Place type
   must change through a governed admission correction. No application code may run an ad hoc
   `UPDATE` against the Place Authority. The current `canonical-places` materializer loads an
   admitted package and **refuses identity-field drift**, and `place-release` only inserts
   pending package rows. A correction adapter or a rebuilt admission package is therefore a
   prerequisite for Phase 2.
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

## 4. Safe implementation now

### 4.1 Reclassify the 48

Change only the 48 confirmed non-main-place rows. Use `suburb` where the evidence classifies the
row as a suburb or neighbourhood, and `locality` where it is an agricultural holding, industrial
area or other non-residential locality. The adapter sets `search_scope = 'locality'` in the same
statement; `chk_place_search_scope_derived_from_type` enforces the derivation. The per-row type
map is an implementation artifact and must be reviewed; it is not inferred from the proposed
parent. Do not change `publication_eligible` or `search_eligible` in this phase.

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

The 48 published paths remain customer-visible. Each needs a locality URL or a redirect before
the city row disappears; no path may 404.

### 4.2 Add the 351 edges

Insert in this order:

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

### Phase 1.5 — Establish a governed write path (blocker)

No existing named Database Authority command can perform this correction:

- `db:places:prepare` loads a digest-pinned admission package and refuses to change an existing
  Place's identity fields, including `place_type`;
- `db:places:release-preview:prepare` only inserts rows that are pending from the admitted
  package and rejects stored rows whose admitted values drift;
- the Gauteng package currently records all 63 rows as `town` or `city` with
  `search_scope = 'metro_city'`.

Phase 2 therefore requires one of:

1. a reviewed, digest-pinned correction package and adapter with preview/apply/verify commands
   registered in the data-role manifest (recommended); or
2. a governed rebuild of the Gauteng admission package from a corrected source admission,
   followed by the normal release-preview path.

A one-off `UPDATE` script is not an acceptable path, even inside a rollback transaction.

**Selected: option 1.** The reviewed overlays are:
`data/gauteng-city-scope-correction-v0.1/` and
`server/_core/databaseAuthority/dataAdapters/placeScopeCorrection.ts`, registered as
`reference.places-scope-correction`. The adapter is deliberately an overlay: it reports
`canonicalAdmissionCompatible: false` and `canonicalPackageRebuildRequired: true` after apply,
because the committed admission package still asserts all 63 rows as `town`/`city`.
The source CSV/GeoJSON evidence is referenced by SHA-256 in the manifest but is not copied into
the repository while the Stats SA/DPME licensing review is unverified.

### Phase 2 — Disposable-target dry run

Requires explicit database write approval for the disposable target, not production, **and a
governed write path from Phase 1.5**.

- Begin one transaction.
- Reclassify the 48; verify derived scopes and publication flags.
- Insert the 312 existing-locality edges.
- Insert the 39 demoted-scope edges.
- Re-run all preflight and post-write assertions.
- Roll back or leave the disposable target in the approved dry-run state.
- Do not authorize search scope, do not change `administratively_contains`, do not modify
  properties.

**Dry-run evidence (2026-10-25, disposable target, prior approval).** The overlay package
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

### Phase 3 — Projection and URL handling

Separate repository change after the dry run passes.

- Map each of the 48 published city paths to its locality path.
- Add redirects/aliases for every demoted path.
- Keep the 13 retained city paths unchanged.
- Decide the destination for the 9 demoted rows whose parent is outside the 63; do not invent a
  parent.
- Confirm no city page remains for a demoted row and no locality page is orphaned.

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

The data assertions below were proven on the disposable target. The URL, search-behavior and
contract-suite items are Phase 3/4 gates and remain open; the dry run does not claim them.

- 48 rows now have `search_scope = 'locality'`; 0 of them retain `metro_city`.
- 13 retained rows still have `search_scope = 'metro_city'`.
- 2 holds remain `metro_city` and edge-free; publication flags are preserved
  (`Northdene` is `publication_eligible = 1`, `Elandsfontein` is 0).
- 351 `settlement_within` edges exist, all with `search_scope_authorized = 0`.
- 0 edges point to a non-retained parent.
- 0 edges point to a held, excluded or pending-parent row.
- 17,655 `administratively_contains` edges remain unchanged.
- 0 property assignments and 0 published properties changed.
- **Open (Phase 3):** every demoted published path resolves to a 200 locality page or a
  reviewed redirect.
- **Open (Phase 4):** locality search still returns the same localities; no city-scoped
  property search is authorized, and no authorization flag is added.
- **Open (Phase 3/4):** contract tests for scope derivation, relationship vocabulary, no-self,
  no-duplicate, no-authorization and publication continuity pass.

## 8. Rollback

- The digest-pinned package is the rollback record: each correction carries its full
  `expected_identity`, and each edge carries its exact child/parent/type key.
- The v0.1 adapter does not expose an automatic rollback command. The disposable target was
  intentionally left corrected under the approved dry-run decision.
- A future rollback must reverse the edge inserts and type changes in one governed transaction,
  using the package identities and keys; it must not delete a Place or property assignment.
- Keep the candidate evidence, dry-run output and package digest as the audit trail.
- A failed parent/child referent aborts the whole transaction; no partial membership set.

## 9. Open decisions

| Decision | Recommendation |
| --- | --- |
| Governing write path for 48 type changes + 351 edges | **Selected:** reviewed correction adapter/package v0.1; no ad hoc SQL |
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
