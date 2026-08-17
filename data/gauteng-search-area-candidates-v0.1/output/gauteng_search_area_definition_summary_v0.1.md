# Gauteng Search Area definition summary v0.1

Status: non-production candidate authority; approved for later integration review.

This pack defines exactly six Property Listify-owned Search Area identities. A Search Area is a market identity that references factual canonical locations; it is not a substitute for factual geography.

## Definitions

| Search Area | PL ID | Active | Core | Strongly supported | Active overlap | Same-name factual collision | Geography gaps |
|---|---|---:|---:|---:|---:|---|---:|
| Johannesburg North | pl-sa-gp-3b36a49ecb943c88402b07fd | 12 | 7 | 5 | 0 | yes | 3 |
| Johannesburg South | pl-sa-gp-9314684a28ff63402832b8df | 12 | 8 | 4 | 1 | no | 4 |
| East Rand | pl-sa-gp-20f043e9ba8ece627365f5ad | 9 | 6 | 3 | 1 | yes | 3 |
| Pretoria East | pl-sa-gp-3aa01dbdcd93c28e0aef9119 | 11 | 9 | 2 | 0 | no | 6 |
| Midrand | pl-sa-gp-01da060bb6c5807438a654e9 | 9 | 6 | 3 | 0 | yes | 2 |
| Centurion | pl-sa-gp-35163d1b6013797932cd94c1 | 9 | 5 | 4 | 0 | yes | 1 |

Active memberships total 62: 41 core and 21 strongly supported. The six-area slice retains 43 deferred evidence rows; the full copied research evidence remains available and is not replaced by the active projection.

## Active membership policy

Only core and strongly_supported evidence enters the active v0.1 projection. supported, fringe, disputed, unresolved and excluded evidence remains preserved and non-active.

Full active membership: gauteng_search_area_active_memberships_v0.1.jsonl.
Full research evidence copy: gauteng_search_area_membership_evidence_v0.1.jsonl.

Full-research evidence state counts: core=69, disputed=9, excluded=1, fringe=1, strongly_supported=29, supported=48, unresolved=31.

## Contexts, anchors and relationships

Contexts are factual/administrative context only and are not Search Area parents. Parent relationships are intentionally unset for MVP; future graph edges must remain acyclic where nesting is introduced.

| Search Area | Contexts | Optional anchor | Aliases |
|---|---|---|---|
| Johannesburg North | City of Johannesburg, Gauteng | Sandton | northern Johannesburg; Johannesburg northern suburbs; North Johannesburg |
| Johannesburg South | City of Johannesburg, Ekurhuleni, Midvaal, Sedibeng, Gauteng | Glenvista | southern Johannesburg; Johannesburg southern suburbs |
| East Rand | Ekurhuleni, City of Johannesburg, Gauteng | none (multi-centred/collision-safe) | Ekurhuleni property market; eastern Johannesburg property market |
| Pretoria East | City of Tshwane, Gauteng | Menlyn | eastern Pretoria; Pretoria eastern suburbs |
| Midrand | City of Johannesburg, Ekurhuleni, Gauteng | none (multi-centred/collision-safe) | Midrand area; greater Midrand |
| Centurion | City of Tshwane, Ekurhuleni, Gauteng | none (multi-centred/collision-safe) | Centurion area; greater Centurion |

## Active overlap

- Alberton (pl-gp-v01-4c21c1f81da64c1c6728) is active in Johannesburg South, East Rand. This expected overlap reflects real market geography and creates no material identity ambiguity.
- Research-observed market relationships without a shared active canonical ID remain recorded in the overlap report; they do not force uncertain membership into v0.1.

## Same-name factual/Search Area collisions

- Johannesburg North Search Area (pl-sa-gp-3b36a49ecb943c88402b07fd) remains distinct from factual identity pl-gp-v01-c1d935cbc90ea639eb87 (Johannesburg North); disambiguation is required.
- East Rand Search Area (pl-sa-gp-20f043e9ba8ece627365f5ad) remains distinct from factual identity pl-gp-v01-85224ee50069c93dae3e (East Rand); disambiguation is required.
- Midrand Search Area (pl-sa-gp-01da060bb6c5807438a654e9) remains distinct from factual identity pl-gp-v01-0d7688adb9c7af392007 (Midrand), pl-gp-v01-455d2715587edce120f0 (Midrand); disambiguation is required.
- Centurion Search Area (pl-sa-gp-35163d1b6013797932cd94c1) remains distinct from factual identity pl-gp-v01-029159849439c2ea8783 (Centurion); disambiguation is required.

## Geography gaps

- Johannesburg North: Dainfern, Kya Sands, Lonehill.
- Johannesburg South: Brackendowns, Liefde en Vrede, New Redruth, Southdale.
- East Rand: Greenstone, Greenstone Hill, Tembisa.
- Pretoria East: Equestria, Moreleta Park, Olympus AH, Silver Lakes, Six Fountains, Woodhill.
- Midrand: Kyalami, Waterfall.
- Centurion: Highveld.
The gap-link artifact carries all 23 recorded candidates, including 4 that belong only to deferred Search Area candidates. Gap names never become active canonical memberships from market evidence alone.

## Closed governance invariants

- Johannesburg East, Vaal, Pretoria Old East and Pretoria Far East have no active definition.
- The East Rand boundary does not import ambiguous Johannesburg East membership.
- If Vaal is introduced later, Vaal Triangle defaults to an alias of the Gauteng Vaal Search Area unless stronger evidence disproves that rule; no Vaal membership is active here.
- Pretoria East retains the researched Old East, Far East and North East relationship evidence without defining any of those later concepts in active v0.1.
- Kyalami remains non-active and policy-blocked: one eventual factual identity, consumer name Kyalami, corrected/official name Khayalami, and related Kyalami-family places remain separate. No Search Area workaround is used.
- Search Area IDs are stable across future membership-definition versions; a future canonical promotion changes membership version, not identity.

## Artifact set

- gauteng_search_area_definitions_v0.1.json
- gauteng_search_area_active_memberships_v0.1.jsonl
- gauteng_search_area_membership_evidence_v0.1.jsonl
- gauteng_search_area_identity_collisions_v0.1.json
- gauteng_search_area_overlap_report_v0.1.json
- gauteng_search_area_geography_gap_links_v0.1.json
- gauteng_search_area_definition_summary_v0.1.md

No production registry, Search engine, UI, route, database schema, migration, seed, or shared production data is modified by this pack.
