# Fordsburg duplicate identity review — 2026-10-28

**Status:** Evidence review complete; admission correction requires an upstream source-authority disposition update.

## Recommendation

Keep the supported Fordsburg suburb as the admitted Place. Treat the second
Fordsburg locality as a held candidate with no runtime Place until its identity is
independently supported. Preserve its source records and stable factual ID as
provenance. Do not merge or retire it under this review; the Gauteng membership
plan requires a separate data-quality approval for either action.

This applies the existing quarantine recommendation in the [Gauteng city-scope
membership plan](launch-readiness-and-product-convergence/74-city-scope-membership-implementation-plan-2026-10-23.md#L523)
and the fail-closed identity rules in the [Geography Coverage Contract](geography-coverage-contract.md#L363).

## Evidence

The current `gauteng-place-admission-v0.2` package contains two active, searchable
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

The admission builder only merges settlement identities with the same normalized
name and admitted administrative context when their points are within 15 km
([builder policy](../../tools/place-admission/README.md#L68)). At 19.3 km, these
records are intentionally left separate. Its schema 0.2 reviewed overlays support
type corrections and settlement membership, not identity demotion
([overlay contract](../../tools/place-admission/README.md#L86)). The held
disposition must therefore be made in the governed source-admission inputs: keep
the source identity and evidence in the candidate disposition, remove it from the
factual-geography input, then regenerate a new versioned source and admission
package. A one-row edit to generated admission files would be overwritten by the
next deterministic build.

The admission ledger currently records the locality as
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

## Disposition boundary

To carry the hold into a new admitted package:

1. Keep `pl-place-01-435b493de124264b676f708f` and its supported suburb type.
2. Keep its reviewed `settlement_within` edge to Johannesburg unchanged.
3. Record `pl-geo-v01-za-gp-cdaee93a6835fd8f1544` as candidate-only in the
   governed source disposition and exclude it from factual geography, producing
   no public Place row, searchable name, or parent edge.
4. Retain its GeoNames and NGA GNS evidence and mappings for later research.
5. Do not reuse or silently reassign either existing stable ID. Any later merge
   or retirement needs its own reviewed data-quality decision.

This review does not change the admission package or database. Database Authority
resolved the exact target as a disposable worktree, but its MySQL service is
unavailable; no materialization or database verification was attempted. The next
workstream should issue a new versioned source-authority snapshot and admission
package from the reviewed disposition, update the territory registry's pinned
digests, and verify the exact prepared Place set on the owned disposable target.
Protected release and publication remain gated by the existing licensing and
release approvals.
