# Fordsburg duplicate identity review — 2026-10-28

**Status:** The founder's 2026-10-29 identity-continuity decision below supersedes the 2026-10-28 hold. The runtime retirement is drafted for the next approved release; no production row has been changed.

## Superseding founder decision — 2026-10-29

Retire `pl-place-01-99dcb8ba9d808741e35b258e` from runtime as a duplicate of
the supported Fordsburg suburb `pl-place-01-435b493de124264b676f708f`. Preserve
the allocated identity and its historical source records in the committed
admission package and this review; do not create or reuse a Place ID.

The pre-release retirement step will verify the exact historical row bundle,
move any canonical entity references to the supported suburb, remove this
Place's runtime names, relationship, evidence and external mappings, then
remove the duplicate Place row. The supported suburb's own names, evidence,
mappings and Gauteng/Johannesburg relationships remain its authority. Extra or
changed references stop the step for review. No eligibility flags are changed.

The prior candidate-only decision remains historical context only. Its
"do not merge or retire" conclusion is no longer the active decision.

## Runtime reference disposition

Before deleting the Place row, the governed step checks direct canonical Place
references in `listings`, `properties`, `saved_searches`,
`development_place_assignments`, `explore_content`, `land_parcels`,
`commercial_assets`, `sl_places`, `service_provider_locations`,
`service_leads`, `demand_campaigns`, `seller_prospects`, and
`search_area_member`. It moves each reference to the supported suburb in the
same transaction. A foreign-key or uniqueness conflict stops and rolls back.
There is no direct Place foreign key on `leads` or `developments`; development
locations use `development_place_assignments`.

| Stored data attached to the duplicate | Release treatment |
| --- | --- |
| Listing or other entity reference | Point to the supported suburb; keep the listing/entity itself. |
| `Fordsburg` and `ZAFBG` names | Delete from the duplicate; the suburb's existing preferred `Fordsburg` name remains, and `ZAFBG` is not transferred. |
| Administrative relationship to Gauteng | Delete; keep only the suburb's existing reviewed relationships. |
| GeoNames/NGA source evidence and external mappings | Delete from runtime tables; retain the two source records, attribution, and decision trail in committed admission history. Do not attach them to the suburb. |

Production reference counts are deliberately not asserted in this draft. The
disposable rehearsal seeded one listing and found one reference to remap; the
release plan must report actual production counts after the verified backup.

## Historical decision — 2026-10-28 (superseded)

Keep the supported Fordsburg suburb as the admitted Place. Treat the second
Fordsburg locality as a held candidate with no runtime Place until its identity is
independently supported. Preserve its source records and stable factual ID as
provenance. Do not merge or retire it under this review; the Gauteng membership
plan requires a separate data-quality approval for either action.

This applies the existing quarantine recommendation in the [Gauteng city-scope
membership plan](launch-readiness-and-product-convergence/74-city-scope-membership-implementation-plan-2026-10-23.md#L523)
and the fail-closed identity rules in the [Geography Coverage Contract](geography-coverage-contract.md#L363).

## Evidence recorded for the 2026-10-28 hold

Before this hold, `gauteng-place-admission-v0.2` contained two active, searchable
Places with the preferred name `Fordsburg`:

| Record | Supported suburb | Outlying locality (proposed hold) |
| --- | --- | --- |
| Place ID | `pl-place-01-435b493de124264b676f708f` | `pl-place-01-99dcb8ba9d808741e35b258e` |
| Factual identity | `pl-geo-v01-za-gp-936e54828376d972dcf8` | `pl-geo-v01-za-gp-cdaee93a6835fd8f1544` |
| Type | `suburb` | `locality` (provisional; source disagreement) |
| Point | `-26.2027778, 28.0194446` | `-26.25, 27.8333315` |
| Admission | `active`, `search_eligible=1`, `publication_eligible=0` | `active`, `search_eligible=1`, `publication_eligible=0` |
| Source records | NGA GNS + OSM `node/262706280` (`place=suburb`) | GeoNames `1004001` + NGA GNS `-1228611:-1798335:90891` (both `PPLX`) |
| Relationship evidence | Exact Stats SA 2016 sub-place record to Johannesburg | Administrative context only; no `settlement_within` edge |

The two representative points are about **19.3 km** apart. Distance and name
equality alone do not establish whether these records represent the same place.
The locality candidate has moderate identity confidence, no direct cross-identifier,
three withheld fuzzy proposals, two ambiguous source matches, and an unresolved
candidate type. Its admitted public name is still marked active and searchable in
v0.2, even though the implementation plan calls this identity a hold.

At the time of the hold, the admission builder merged settlement identities with
the same normalized name and admitted administrative context only when their
points were within 15 km
([builder policy](../../tools/place-admission/README.md#L68)). At 19.3 km, these
records are intentionally left separate. Its schema 0.2 reviewed overlays support
type corrections and settlement membership, not identity demotion
([overlay contract](../../tools/place-admission/README.md#L86)). Implementing
that then-proposed hold required a governed source-admission input change: keep
the source identity and evidence in the candidate disposition, remove it from
the factual-geography input, then regenerate a versioned source and admission
package. A one-row edit to generated admission files would have been overwritten
by the next deterministic build.

The v0.2 admission ledger recorded the locality as
`admitted_as_place_primary` with `human_review_required=false`. A different
Fordsburg candidate (`pl-geo-v01-za-gp-6ceb7ec8390662dad3c8`) is already
quarantined because it lacks a bounded factual type; that row is not the admitted
locality reviewed here.

Repository evidence:

- The admitted rows, names, and relationships are in
  `data/gauteng-place-admission-v0.2/` (Place rows 361 and 871; preferred-name
  rows 604 and 1450; relationship rows 442 and 1091).
- The source identities and their classifications are in
  `data/gauteng-source-authority-v0.3/gauteng_factual_canonical_geography_v0.2.jsonl`
  (rows 857 and 1190), with the locality disposition at row 3472.
- The plan says to hold the duplicate and retain the supported suburb in the 351
  reviewed membership edges ([plan lines 176–185](launch-readiness-and-product-convergence/74-city-scope-membership-implementation-plan-2026-10-23.md#L176)).
- The coverage contract requires ambiguous or natural-key-colliding candidates
  that fail admission gates to remain out of runtime; ambiguity is a first-class
  result and must not be collapsed ([contract lines 335–389](geography-coverage-contract.md#L335)).

## Historical applied hold — 2026-10-28 (superseded)

On 2026-10-28, the hold was recorded in `data/gauteng-source-authority-v0.4/`
and built into `data/gauteng-place-admission-v0.3/`. Source-authority v0.2/v0.3
and admission v0.2 were left unchanged. The v0.4 derivation pinned its v0.3
input manifest and the reviewed v0.2 admission evidence, and carried a separate
reviewed identity-hold artifact with the prior candidate, its two original
source-link records and licensing attribution, and the previous admitted rows.

That historical source disposition marked `pl-geo-v01-za-gp-cdaee93a6835fd8f1544`
`candidate_only`, required human review, and flagged it for a priority probe. It
was absent from factual geography, public names, source links, Place rows,
relationships, and external mappings. Its former Place ID,
`pl-place-01-99dcb8ba9d808741e35b258e`, remains allocated but is not admitted.
At that time, no identity was merged or retired. The founder's 2026-10-29
decision above supersedes that disposition for runtime release.

The supported suburb remains `pl-place-01-435b493de124264b676f708f`, with its
reviewed `settlement_within` edge to Johannesburg unchanged. Fordsburg now has
exactly one searchable Gauteng result.

## Historical verification — 2026-10-28

- Source derivation check passed byte-for-byte; all eight compact source
  artifacts verify against source-authority v0.4's manifest.
- Place admission build and `--check` passed: 1,487 source identities, 1,465
  Places, 2,474 names, 1,815 relationships, 4,462 evidence rows, 2,969 external
  mappings, 4,350 disposition rows, and 1,433 executable Places. The old Place
  allocation is the sole reserved allocation outside the admitted Place set.
- The national URL projection rebuilt and passed its reproducibility check.
- Focused admission and canonical-place transaction suites passed. The
  database-backed Place admission probe passed all 42 checks, including its
  Fordsburg query (one result).
- Database Authority applied the migration manifest through
  `0197_drop_seller_prospects_province.sql` to the exact owned
  `disposable-worktree` target. Physical schema congruency passed with all 40
  check constraints enforced.
- National Place preparation and verification passed: all nine provinces were
  complete with zero identity drift. Gauteng stored 1,465 Places, 2,474 names,
  1,815 relationships, 4,462 evidence rows, and 2,969 external mappings; its
  package digest was `5864072963d11d97b29887efbb403a1bddcbf2b389c912ae935a4364ed72485c`.
- The exact owned disposable database was created, prepared, verified, then
  disposed through Database Authority. Place preparation did not activate a
  consumer or perform publication. No protected database or geography release
  was changed.

The earlier licensing review gate is superseded by the founder's standing rule
that licensing is not a launch blocker. Keep attribution in the existing source
fields; this retirement does not add a licensing gate.
