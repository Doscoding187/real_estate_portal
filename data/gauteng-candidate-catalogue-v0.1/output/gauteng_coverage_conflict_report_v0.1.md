# Property Listify Gauteng Candidate Catalogue v0.1

This is a source-backed research catalogue, not production geography and not Search Areas.

## Summary

- Candidates: **4321**
- Multi-source candidates: **1863**
- Single-source candidates: **2458**
- OSM-only candidates: **1819**
- Ambiguous/conflicting candidates: **1339**
- Fuzzy proposals withheld from merge: **1632**

## Required property-search probes

| Probe | Found | Interpretations | Types | Sources | Review |
|---|---:|---:|---|---|---|
| Johannesburg | yes | 1 | city | geonames, nga_gns, osm, wikidata | needs_review |
| Pretoria | yes | 1 | city | geonames, nga_gns, osm, wikidata | needs_review |
| Sandton | yes | 2 | locality, town | geonames, nga_gns, osm, wikidata | needs_review |
| Randburg | yes | 1 | city | geonames, nga_gns, osm, wikidata | needs_review |
| Rosebank | yes | 1 | town | geonames, osm, wikidata | needs_review |
| Bryanston | yes | 1 | suburb | geonames, nga_gns, osm | needs_review |
| Fourways | yes | 1 | town | geonames, nga_gns, osm | needs_review |
| North Riding | yes | 1 | town | geonames, osm, wikidata | needs_review |
| Kyalami | yes | 1 | neighbourhood | geonames | needs_review |
| Midrand | yes | 2 | locality, town | geonames, nga_gns, osm, wikidata | needs_review |
| Centurion | yes | 1 | town | geonames, nga_gns, osm, wikidata | needs_review |
| Soweto | yes | 1 | city | geonames, nga_gns, osm, wikidata | needs_review |
| Mamelodi | yes | 2 | estate/residential_development_candidate, town | geonames, nga_gns, osm | needs_review |
| Benoni | yes | 1 | town | geonames, nga_gns, osm, wikidata | needs_review |
| Boksburg | yes | 1 | town | geonames, nga_gns, osm, wikidata | needs_review |
| Kempton Park | yes | 1 | town | geonames, nga_gns, osm, wikidata | needs_review |
| Alberton | yes | 1 | town | geonames, nga_gns, osm, wikidata | needs_review |
| Roodepoort | yes | 4 | other, town | geonames, nga_gns, osm, wikidata | needs_review |
| Germiston | yes | 2 | other, town | geonames, nga_gns, osm, wikidata | needs_review |
| Vereeniging | yes | 3 | city, other | geonames, nga_gns, osm, wikidata | needs_review |
| Vanderbijlpark | yes | 3 | other, town | geonames, nga_gns, osm, wikidata | needs_review |

## Important edge cases

- Kyalami/Khayalami interpretation: **one_form_found_other_missing**.
- Duplicate normalized-name groups retained: **292**.
- Source-type disagreements retained for review: **516**.
- Residential-development candidates (not verified geography): **1145**.
- Boundary/admin disagreements: **367**.
- Source artifact count discrepancies retained: **1**.

## Licence boundary

Candidate IDs are Property Listify-owned. Source evidence remains attached to its source licence, including explicit ODbL provenance for OSM evidence and OSM-only candidates.

## Reconciliation invariant

Direct cross-identifiers are stronger than contextual matches. Exact names require compatible type and spatial context. Fuzzy similarity is review-only and never silently merges records.
