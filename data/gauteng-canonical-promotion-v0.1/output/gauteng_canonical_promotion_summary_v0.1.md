# Property Listify Gauteng Canonical Promotion Simulation v0.1

Derived from the completed candidate catalogue; no source artifacts were modified.

## Outcome

- Candidates: **4321**
- Fully auto-promotable: **109**
- Promotable with provisional attributes: **1333**
- Founder-review class: **54**
- Founder review set: **57**
- Candidate only: **2750**
- Rejected/non-independent: **75**
- Promotion without founder review: **1442 (33.37%)**

## Source combinations

| Combination | Candidates |
|---|---:|
| `osm` | 1819 |
| `geonames+nga_gns` | 1316 |
| `geonames` | 605 |
| `geonames+nga_gns+osm` | 175 |
| `geonames+osm` | 142 |
| `geonames+nga_gns+osm+wikidata` | 122 |
| `osm+wikidata` | 53 |
| `geonames+osm+wikidata` | 44 |
| `geoboundaries` | 21 |
| `nga_gns` | 13 |
| `geoboundaries+geonames+nga_gns` | 10 |
| `nga_gns+osm+wikidata` | 1 |

## Candidate types and policy classes

| Type | Total | Auto | Provisional | Review | Candidate | Rejected |
|---|---:|---:|---:|---:|---:|---:|
| `city` | 6 | 0 | 6 | 0 | 0 | 0 |
| `district_municipality` | 8 | 6 | 2 | 0 | 0 | 0 |
| `estate/residential_development_candidate` | 1145 | 0 | 0 | 4 | 1066 | 75 |
| `local_municipality` | 22 | 14 | 8 | 0 | 0 | 0 |
| `locality` | 179 | 5 | 163 | 4 | 7 | 0 |
| `neighbourhood` | 112 | 1 | 37 | 6 | 68 | 0 |
| `other` | 1542 | 0 | 0 | 0 | 1542 | 0 |
| `province` | 2 | 2 | 0 | 0 | 0 | 0 |
| `suburb` | 870 | 51 | 794 | 25 | 0 | 0 |
| `town` | 401 | 28 | 292 | 14 | 67 | 0 |
| `village` | 34 | 2 | 31 | 1 | 0 | 0 |

## Match quality

- Methods: `{"candidate_seed":2189,"direct_cross_identifier":816,"duplicate_name_preserved":1698,"exact_contextual":2723,"fuzzy_string_similarity":1632}`
- Statuses: `{"ambiguous":1638,"conflict":152,"deterministic":813,"high_confidence":2638,"proposed":1632,"single_source":2185}`
- Fuzzy proposals withheld: **1632**

## OSM-only assessment

- Total: **1819**
- By class: `{"candidate_only":1066,"founder_review_required":24,"promotable_with_provisional_attributes":654,"rejected_non_independent":75}`
- By proposed type: `{"estate/residential_development_candidate":1141,"locality":12,"neighbourhood":32,"suburb":608,"town":2,"village":24}`
- OSM-only records with Wikidata tags: **0**; Wikipedia tags: **0**.
- Alias/historic tags: `{"alt_name":35,"official_name":1,"old_name":3}`.
- Recommendation: OSM-only place tags may enter the provisional class only after explicit ODbL attribution/database-strategy approval; OSM-only residential-development objects remain candidates until independently corroborated.

## Estates/developments

- Total: **1145**; OSM-only: **1141**; independently supported: **4**.
- By class: `{"candidate_only":1066,"founder_review_required":4,"rejected_non_independent":75}`.
- Generic/non-independent rejected: **75**.
- Recommendation: Use a higher threshold than suburb/town identity: require a non-OSM corroborating source for promotion, and keep OSM landuse=residential-only objects as candidates unless a named-development policy is approved.

## Duplicate names

- Groups: **292**; candidates in groups: **824**; close same-context candidates requiring collision review: **102**.
- Policy classes: `{"auto_promotable_factual_identity":18,"candidate_only":564,"founder_review_required":36,"promotable_with_provisional_attributes":156,"rejected_non_independent":50}`.
- `roodepoort` (4 interpretations): pl-gp-v01-015d909cf09fef3e402c=other/candidate_only, pl-gp-v01-348fc87a99e803e64cdc=town/promotable_with_provisional_attributes, pl-gp-v01-693ac61bb31a4b5abd33=other/candidate_only, pl-gp-v01-d4b677c3b5e226d41a56=other/candidate_only
- `vanderbijlpark` (3 interpretations): pl-gp-v01-147d5612deb1538d0317=other/candidate_only, pl-gp-v01-63507f28c61c5495c998=other/candidate_only, pl-gp-v01-d7743ed65b55c354d64a=town/promotable_with_provisional_attributes
- `sandton` (2 interpretations): pl-gp-v01-418038409a1c0a00d9bc=locality/promotable_with_provisional_attributes, pl-gp-v01-43d109a4091bf9c2044c=town/candidate_only
- `vaalkop` (6 interpretations): pl-gp-v01-46caec7661968111c91b=other/candidate_only, pl-gp-v01-57eb5cd3edecdfdb6aca=other/candidate_only, pl-gp-v01-5e8dc1dc85c3e910e193=other/candidate_only, pl-gp-v01-63801c3787e991236c34=other/candidate_only, pl-gp-v01-b56e28fc51b2338fb6d7=other/candidate_only, pl-gp-v01-fe0105e01c70b50ef831=other/candidate_only
- `mamelodi` (2 interpretations): pl-gp-v01-ab35c1a038a865ba3e52=estate/residential_development_candidate/candidate_only, pl-gp-v01-e85d170c3b560f058141=town/promotable_with_provisional_attributes

## Type and boundary conflicts

- Type disagreements: **516**; by class: `{"founder_review_required":7,"promotable_with_provisional_attributes":509}`.
- Common type-hint combinations: `{"ADM2|ADM3|district_municipality|local_municipality|metropolitan_municipality":3,"ADM2|district_municipality":2,"ADM3|local_municipality":5,"city|locality|town|village":12,"estate/residential_development_candidate|locality":1,"locality|neighbourhood":2,"locality|neighbourhood|suburb":79,"locality|neighbourhood|suburb|town":7,"locality|neighbourhood|suburb|town|village":95,"locality|neighbourhood|town|village":27,"locality|suburb":14,"locality|suburb|town":2,"locality|suburb|town|village":214,"locality|town|village":25,"suburb|town":19}`.
- Boundary-disagreement source records: **367**; candidate identities: **143**; by class: `{"candidate_only":104,"founder_review_required":18,"promotable_with_provisional_attributes":21}`.
- Boundary recommendation: The spatial gate is authoritative for Gauteng eligibility. An inside point with a stale/conflicting source admin code downgrades administrative confidence; it blocks automatic promotion only when independent identity support is weak.

## Kyalami / Khayalami

- Kyalami: `[{"candidate_location_id":"pl-gp-v01-bf3bda5e9b73324fb944","identity_confidence":"low","promotion_class":"candidate_only","reason":["evidence does not meet the independent identity threshold for factual canonical promotion"],"sources":["geonames"],"unresolved_attributes":[]}]`.
- Khayalami source records: **0**.
- Conclusion: The approved source pack supports Kyalami as a GeoNames-only populated-place/neighbourhood interpretation. It provides no Khayalami source record or alias, so no merge or alias assertion is made.
- Additional evidence required: An approved-source record or founder-supplied authoritative evidence establishing whether Khayalami is an alias, historic name or separate place.

## Required probe re-evaluation

| Probe | Interpretations | Candidate classes / IDs |
|---|---:|---|
| Johannesburg | 1 | pl-gp-v01-482952abc84b2eccf7d2=promotable_with_provisional_attributes (geonames,nga_gns,osm,wikidata) |
| Pretoria | 1 | pl-gp-v01-d55f7cb52192bba95e88=promotable_with_provisional_attributes (geonames,nga_gns,osm,wikidata) |
| Sandton | 2 | pl-gp-v01-418038409a1c0a00d9bc=promotable_with_provisional_attributes (geonames,nga_gns,osm,wikidata); pl-gp-v01-43d109a4091bf9c2044c=candidate_only (nga_gns) |
| Randburg | 1 | pl-gp-v01-3462bd075a8d155a3b22=promotable_with_provisional_attributes (geonames,nga_gns,osm,wikidata) |
| Rosebank | 1 | pl-gp-v01-c53c43d358a6be20e785=promotable_with_provisional_attributes (geonames,osm,wikidata) |
| Bryanston | 1 | pl-gp-v01-e44e12b3b4fdcc03e7c3=promotable_with_provisional_attributes (geonames,nga_gns,osm) |
| Fourways | 1 | pl-gp-v01-5c4c657aecad01c64729=promotable_with_provisional_attributes (geonames,nga_gns,osm) |
| North Riding | 1 | pl-gp-v01-3531b9dc79c239438abe=promotable_with_provisional_attributes (geonames,osm,wikidata) |
| Kyalami | 1 | pl-gp-v01-bf3bda5e9b73324fb944=candidate_only (geonames) |
| Midrand | 2 | pl-gp-v01-0d7688adb9c7af392007=promotable_with_provisional_attributes (geonames,nga_gns,osm,wikidata); pl-gp-v01-455d2715587edce120f0=promotable_with_provisional_attributes (geonames,nga_gns) |
| Centurion | 1 | pl-gp-v01-029159849439c2ea8783=promotable_with_provisional_attributes (geonames,nga_gns,osm,wikidata) |
| Soweto | 1 | pl-gp-v01-47a732ae286c679217fe=promotable_with_provisional_attributes (geonames,nga_gns,osm,wikidata) |
| Mamelodi | 2 | pl-gp-v01-ab35c1a038a865ba3e52=candidate_only (osm); pl-gp-v01-e85d170c3b560f058141=promotable_with_provisional_attributes (geonames,nga_gns,osm) |
| Benoni | 1 | pl-gp-v01-7a1604bd1ce2d85ce2c5=promotable_with_provisional_attributes (geonames,nga_gns,osm,wikidata) |
| Boksburg | 1 | pl-gp-v01-a8de39a1e8953f55235a=promotable_with_provisional_attributes (geonames,nga_gns,osm,wikidata) |
| Kempton Park | 1 | pl-gp-v01-b3eb16318b2cfaa4e685=promotable_with_provisional_attributes (geonames,nga_gns,osm,wikidata) |
| Alberton | 1 | pl-gp-v01-4c21c1f81da64c1c6728=promotable_with_provisional_attributes (geonames,nga_gns,osm,wikidata) |
| Roodepoort | 4 | pl-gp-v01-015d909cf09fef3e402c=candidate_only (geonames,nga_gns); pl-gp-v01-348fc87a99e803e64cdc=promotable_with_provisional_attributes (geonames,nga_gns,osm,wikidata); pl-gp-v01-693ac61bb31a4b5abd33=candidate_only (geonames,nga_gns); pl-gp-v01-d4b677c3b5e226d41a56=candidate_only (geonames,nga_gns) |
| Germiston | 2 | pl-gp-v01-8f4a74eab390f42c84bb=promotable_with_provisional_attributes (geonames,nga_gns,osm,wikidata); pl-gp-v01-a379cb82467606fe3041=candidate_only (geonames,nga_gns) |
| Vereeniging | 3 | pl-gp-v01-52f29a3764eddca6a3bc=candidate_only (geonames,nga_gns); pl-gp-v01-7751b10bef7d63ee8cea=promotable_with_provisional_attributes (geonames,nga_gns,osm,wikidata); pl-gp-v01-7969c3d6f482f94ed839=candidate_only (geonames,nga_gns) |
| Vanderbijlpark | 3 | pl-gp-v01-147d5612deb1538d0317=candidate_only (geonames,nga_gns); pl-gp-v01-63507f28c61c5495c998=candidate_only (geonames,nga_gns); pl-gp-v01-d7743ed65b55c354d64a=promotable_with_provisional_attributes (geonames,nga_gns,osm,wikidata) |

## Founder review set

- Count: **57**.
- Formal `founder_review_required` class count: **54**.
- Priority required-probe additions: **3**; these remain `candidate_only` and are not promoted.
- Categories: `{"ambiguous_identity_or_duplicate":33,"boundary_admin_identity":18,"estate_or_development_promotion":3,"important_probe_weak_evidence":3}`.
- Distinction: The formal `founder_review_required` promotion class contains 54 candidates. The founder review set contains 57 records: those formal rows plus 3 priority required-probe candidates that remain `candidate_only`. Priority inclusion surfaces a weak or non-independent required probe for founder visibility; it does not change the promotion classification or promote the candidate.
- Priority rows: `pl-gp-v01-43d109a4091bf9c2044c` Sandton (candidate_only); `pl-gp-v01-ab35c1a038a865ba3e52` Mamelodi (candidate_only); `pl-gp-v01-bf3bda5e9b73324fb944` Kyalami (candidate_only).
- These rows are limited to close identity collisions, weak boundary cases, independently corroborated estate/development promotion decisions, and required probes whose evidence remains weak. Type disagreement alone is not escalated when identity is strong.

## Reproducibility and scope

The simulation reads the existing candidate, match, source-record and assertion artifacts and writes only derived outputs. It performs no network acquisition, database operation, Search Area creation or product change.

Artifacts:
- `promotion_simulation_jsonl`: `/home/edwardspc/Desktop/Dev/listify-gauteng-canonical-promotion/data/gauteng-canonical-promotion-v0.1/output/gauteng_canonical_promotion_simulation_v0.1.jsonl`
- `promotion_simulation_csv`: `/home/edwardspc/Desktop/Dev/listify-gauteng-canonical-promotion/data/gauteng-canonical-promotion-v0.1/output/gauteng_canonical_promotion_simulation_v0.1.csv`
- `founder_review_jsonl`: `/home/edwardspc/Desktop/Dev/listify-gauteng-canonical-promotion/data/gauteng-canonical-promotion-v0.1/output/gauteng_founder_review_set_v0.1.jsonl`
- `founder_review_csv`: `/home/edwardspc/Desktop/Dev/listify-gauteng-canonical-promotion/data/gauteng-canonical-promotion-v0.1/output/gauteng_founder_review_set_v0.1.csv`
- `policy_document`: `/home/edwardspc/Desktop/Dev/listify-gauteng-canonical-promotion/data/gauteng-canonical-promotion-v0.1/output/gauteng_canonical_promotion_policy_v0.1.md`
- `summary_json`: `/home/edwardspc/Desktop/Dev/listify-gauteng-canonical-promotion/data/gauteng-canonical-promotion-v0.1/output/gauteng_canonical_promotion_summary_v0.1.json`
- `summary_markdown`: `/home/edwardspc/Desktop/Dev/listify-gauteng-canonical-promotion/data/gauteng-canonical-promotion-v0.1/output/gauteng_canonical_promotion_summary_v0.1.md`
