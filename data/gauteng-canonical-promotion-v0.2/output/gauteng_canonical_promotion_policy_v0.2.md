# Property Listify Gauteng Canonical Promotion Policy v0.2

This policy operates on the existing Gauteng candidate/source artifacts. It
does not create production canonical geography, write a database, create
Search Areas or alter Search.

## Decision model

Property Listify owns the candidate/canonical identity. Source records remain
recoverable evidence with their native IDs, types and licence classes.

Identity promotion and attribute certainty are separate decisions:

1. Direct cross-identifiers are strongest: OSM `wikidata=*`, Wikidata
   GeoNames/OSM identifiers and equivalent exact source identifiers.
2. Exact contextual matches require compatible context and spatial proximity.
   A normalized-name equality by itself never merges or promotes a record.
3. Fuzzy proposals are evidence of a possible relationship only. They remain
   withheld and never increase promotion strength.
4. A Gauteng spatially eligible point/geometry is required. Identity,
   administrative assignment, type and spatial confidence are separate. A
   conflicting source administrative code is a technical/source-verification
   issue and does not create founder review by itself.
5. A duplicate normalized name is not a uniqueness constraint. A same-name
   OSM node plus complementary area representation in the same context and
   within 0.5 km is deterministically grouped as
   one source representation; the weaker candidate is retained as evidence
   under a deterministic representative. Same-name node/node or area/area
   pairs remain separate and non-promotable until source verification.
6. Source-type disagreement does not by itself reject a clear identity. The
   proposed type and all source-native hints remain visible as provisional
   attributes.
7. ODbL is never collapsed into a generic confidence score. OSM-only evidence
   can support a provisional factual identity only with an explicit ODbL
   attribution/database-strategy gate; OSM residential landuse objects do not
   auto-promote as estates.
8. Estate/residential-development candidates use a higher threshold than
   suburb/town identity. OSM place=* evidence is assessed as the factual place
   type, generic/numeric residential labels are rejected, farm-coded records
   are not estates, and named residential landuse remains provisional until
   independently corroborated.

## Promotion classes

| Class | Count | Meaning |
|---|---:|---|
| `auto_promotable_factual_identity` | 109 | Direct/authoritative or at least three-source factual identity, with no material unresolved identity/type/spatial conflict. |
| `promotable_with_provisional_attributes` | 1371 | Identity is sufficiently supported; type, admin context or licence handling remains provisional. |
| `founder_review_required` | 0 | A material same-name identity collision remains after source-representation checks. |
| `candidate_only` | 2740 | Evidence is retained but is below the independent promotion threshold. |
| `rejected_non_independent` | 101 | Generic/non-independent residential object, not an independent named geography. |

`1480` candidates (34.25%) have a promotable factual identity without founder geography review under this simulation. The provisional class still requires its stated attribute/licence gates.

## Formal class versus founder review set

The formal `founder_review_required` promotion class contains 0 candidates. The founder review set contains 3 records: those formal rows plus 3 priority required-probe candidates that remain `candidate_only`. Priority inclusion surfaces a weak or non-independent required probe for founder visibility; it does not change the promotion classification or promote the candidate.

The formal promotion class and the founder review set therefore intentionally
have different counts. The review set is an escalation queue that also keeps
the required property-search probes visible when their evidence is too weak
for promotion; those priority rows are not reclassified to make the totals
match.

Priority required-probe rows:

- `pl-gp-v01-43d109a4091bf9c2044c` — Sandton — remains `candidate_only`; required probe: Sandton.
- `pl-gp-v01-ab35c1a038a865ba3e52` — Mamelodi — remains `candidate_only`; required probe: Mamelodi.
- `pl-gp-v01-bf3bda5e9b73324fb944` — Kyalami — remains `candidate_only`; required probe: Kyalami.

## Licensing

Candidate IDs are Property Listify-owned. Source evidence retains its own
licence. OSM-only and mixed candidates remain explicitly marked `ODBL_1` and
must not be represented as proprietary source data merely because a Property
Listify ID exists.

## Non-promotion rules

Single-source GeoNames/NGA records do not auto-promote solely because the
name looks familiar. `other` source-native features remain candidates because
the observed population is dominated by farms, hotels, stations, terrain,
water and other non-locality features. Fuzzy proposals, duplicate-name
similarity and product-search importance never create geographic truth.
