# Property Listify Gauteng Factual Canonical Geography v0.1

This is a derived, non-production factual authority. It does not write
application geography, Search Areas, databases or product code.

## Canonical result

- Factual canonical identities: **1480**.
- Auto-promoted: **109**.
- Provisional attributes: **1371**.
- Candidate-only retained outside canonical: **2740**.
- Rejected/non-independent retained outside canonical: **101**.
- Difference from expected 1,480 accepted identities: **0**.
- Unresolved type: **516**; administrative uncertainty: **39**; spatial/boundary uncertainty: **39**/**39**.
- Name assertions: **2526**; identifier-like source labels retained but non-searchable: **536**.
- Canonical types: `{"city":6,"district_municipality":8,"estate/residential_development_candidate":2,"local_municipality":22,"locality":171,"neighbourhood":41,"province":2,"suburb":860,"town":334,"village":34}`.

## Licensing

- Classification: `{"mixed_odbl_supported":534,"osm_only_odbl_provisional":668,"permissive_supported":278}`.
- `ODBL_1` evidence remains explicitly attributable and is not represented as proprietary source data.
- OSM-only provisional identities remain subject to a production ODbL database-strategy gate.

## Kyalami / Khayalami

- Machine decision: **candidate_only_until_commercial_reuse_gate**.
- Official evidence supports Khayalami as the corrected spelling from Kyalami and therefore one intended factual identity.
- The official material was not ingested into the reusable evidence store because commercial persistence/derivative-use permission was not established.
- Preferred consumer name remains `Kyalami`; official/corrected name remains `Khayalami` in the founder policy gate.
- Kyalami-family places remain separate candidate interpretations unless separately evidenced.

## Sandton / Mamelodi

- Strong Sandton proceeds; the weak NGA-only interpretation remains candidate-only.
- Strong Mamelodi proceeds; the extra OSM residential-development interpretation remains candidate-only.

## Duplicate safety

- Canonical duplicate-name groups: **38**.
- Canonical records in duplicate-name groups: **80**.
- Aliases are name assertions and never create canonical records.
- Source-representation secondary rows and candidate/rejected rows remain outside the canonical layer.

## Required probes

| Probe | Canonical? | Canonical IDs | Extra candidate interpretations |
|---|---|---|---|
| Johannesburg | yes | `pl-gp-v01-482952abc84b2eccf7d2` | `—` |
| Pretoria | yes | `pl-gp-v01-d55f7cb52192bba95e88` | `—` |
| Sandton | yes | `pl-gp-v01-418038409a1c0a00d9bc` | `pl-gp-v01-43d109a4091bf9c2044c` |
| Randburg | yes | `pl-gp-v01-3462bd075a8d155a3b22` | `—` |
| Rosebank | yes | `pl-gp-v01-c53c43d358a6be20e785` | `—` |
| Bryanston | yes | `pl-gp-v01-e44e12b3b4fdcc03e7c3` | `—` |
| Fourways | yes | `pl-gp-v01-5c4c657aecad01c64729` | `—` |
| North Riding | yes | `pl-gp-v01-3531b9dc79c239438abe` | `—` |
| Kyalami | no | `—` | `pl-gp-v01-bf3bda5e9b73324fb944` |
| Midrand | yes | `pl-gp-v01-0d7688adb9c7af392007, pl-gp-v01-455d2715587edce120f0` | `—` |
| Centurion | yes | `pl-gp-v01-029159849439c2ea8783` | `—` |
| Soweto | yes | `pl-gp-v01-47a732ae286c679217fe` | `—` |
| Mamelodi | yes | `pl-gp-v01-e85d170c3b560f058141` | `pl-gp-v01-ab35c1a038a865ba3e52` |
| Benoni | yes | `pl-gp-v01-7a1604bd1ce2d85ce2c5` | `—` |
| Boksburg | yes | `pl-gp-v01-a8de39a1e8953f55235a` | `—` |
| Kempton Park | yes | `pl-gp-v01-b3eb16318b2cfaa4e685` | `—` |
| Alberton | yes | `pl-gp-v01-4c21c1f81da64c1c6728` | `—` |
| Roodepoort | yes | `pl-gp-v01-348fc87a99e803e64cdc` | `pl-gp-v01-015d909cf09fef3e402c, pl-gp-v01-693ac61bb31a4b5abd33, pl-gp-v01-d4b677c3b5e226d41a56` |
| Germiston | yes | `pl-gp-v01-8f4a74eab390f42c84bb` | `pl-gp-v01-a379cb82467606fe3041` |
| Vereeniging | yes | `pl-gp-v01-7751b10bef7d63ee8cea` | `pl-gp-v01-52f29a3764eddca6a3bc, pl-gp-v01-7969c3d6f482f94ed839` |
| Vanderbijlpark | yes | `pl-gp-v01-d7743ed65b55c354d64a` | `pl-gp-v01-147d5612deb1538d0317, pl-gp-v01-63507f28c61c5495c998` |

## Output artifacts

- `canonical_geography_jsonl`: `gauteng_factual_canonical_geography_v0.1.jsonl`
- `canonical_names_jsonl`: `gauteng_factual_canonical_names_v0.1.jsonl`
- `canonical_source_links_jsonl`: `gauteng_factual_canonical_source_links_v0.1.jsonl`
- `canonical_summary_json`: `gauteng_factual_canonical_summary_v0.1.json`
- `canonical_summary_markdown`: `gauteng_factual_canonical_summary_v0.1.md`
- `kyalami_evidence_json`: `gauteng_factual_canonical_kyalami_evidence_v0.1.json`

## Reproducibility

The canonical layer is derived from the accepted v0.2 simulation and
the read-only candidate/source/assertion/match artifacts. Stable
Property Listify candidate IDs are retained as canonical IDs; provider
IDs remain evidence only.
