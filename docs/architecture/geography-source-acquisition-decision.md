# Geography source acquisition and Western Cape handoff

Date: 2026-10-01. Owner: Property Listify product architecture.
Scope: source acquisition and a reviewable Phase 4 continuation. This document
does not replace the geography coverage contract or the existing national
mission state, and does not approve a protected database release.

## Decision and authorization

Edward requested resolution of the geography agent's source-evidence blocker.
That request authorizes the bounded, no-cost public-source acquisition delivered
here. Acquire and evaluate approved evidence sources now; keep the founder's
production ODbL determination separate. Source acquisition, canonical admission,
consumer activation and protected release each need their own evidence.

Use an attribution-licensed foundation for the Western Cape engineering pass:
geoBoundaries gbOpen administrative layers and the GeoNames country and
alternate-name extracts. Preserve unresolved coverage honestly. Acquire optional
additional evidence only under its actual reuse terms. OSM remains a supported
research source under the existing contract; it is not required to start this
pass, and its production gate is unchanged.

This is a product architecture decision about sequencing and provenance. It is
not an assertion that any source is exhaustive or that any commercial or mixed
database has received legal clearance.

## What the supplied evidence proves

The acquired bundle is
`data/za-wc-source-acquisition-v0.1/snapshot-20261001/`. Its manifest pins every
stored file and the original downloaded bytes. Boundaries are losslessly gzip
compressed; metadata preserves the exact revision-pinned upstream URLs, source
version, represented year and licence. GeoNames ZIPs remain original bytes.

`source-records.jsonl.gz` indexes source observations with source-native IDs,
artifact digests, source locators and attribution. GeoNames Western Cape rows
are selected by `ZA.11`, validated against Western Cape source identity
`1085599` in the downloaded admin-code register. Alternate-name rows retain
language, preference, historic and validity-date columns. They are source
assertions, including non-place tokens, and are not yet accepted Place names.

All ADM1/2/3 boundary features are indexed at national source scope. ADM2/3
features have **not** been assigned to Western Cape, and a GeoNames admin code
has **not** been treated as proof of polygon containment. The national country
extract is retained so that missing/unknown/conflicting province codes can be
reviewed instead of disappearing through a filter.

No Place has been minted, adjudicated, published or materialized. The bundle is
acquired evidence, **not** the digest-pinned v0.2 canonical source authority that
the admission builder consumes. Creating that authority is the next substantive
work; a registry entry alone cannot do it.

Reproduce and verify with Python's standard library:

```sh
python3 tools/geography-source-evidence/snapshot.py verify \
  --bundle data/za-wc-source-acquisition-v0.1/snapshot-20261001
python3 tools/geography-source-evidence/snapshot.py acquire \
  --plan data/za-wc-source-acquisition-v0.1/plan.json \
  --bundle /tmp/listify-za-wc-new-snapshot
```

Verification uses only frozen local files. A new acquisition is a new snapshot,
with a new manifest and a reviewed diff; it does not promise byte identity with
a moving upstream feed. Existing and partial bundles are never overwritten.
Archive a failed acquisition separately; do not label it a complete bundle.

The frozen manifest is
`f16907c92b55431f66496d1ffe0abc453be8e11b855d5ec2f262fceb58a005eb`.
It contains 14,930 source-coded Western Cape records, 11,889 linked name
assertions and 274 national boundary features (27,093 observations total).
These are not counts of accepted Places. The package README records verification
commands, scope and attribution.

## Source and licence determinations

| Source                                                              | Intended role                                                   | Verified terms and constraints                                                                                                                                                                         |
| ------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GeoNames                                                            | Settlement/name candidates and source administrative assertions | CC BY 4.0; commercial reuse permitted with attribution. Not CC0. Keep dump readme, source IDs, modifications and name qualifiers.                                                                      |
| geoBoundaries **gbOpen**                                            | Administrative geometry evidence                                | Distribution described as CC BY 4.0; ZAF metadata declares upstream CC BY 3.0 IGO. Preserve both notices and upstream OCHA ROSEA/MDB attribution. Do not substitute gbAuthoritative or gbHumanitarian. |
| MDB/current municipal releases                                      | Statutory boundary currency and classification                  | Prioritize evaluation against the represented year in the snapshot. Require dataset-specific commercial reuse terms or permission before ingestion. Public access is insufficient.                     |
| Official municipal suburb layers, NGI and geographical-name notices | Locality referents, types, approved names and effective dates   | Evaluate dataset-specific permissions and provenance. Do not assume a public GIS endpoint is an open licence.                                                                                          |
| OSM/Geofabrik                                                       | Additional settlement, neighbourhood and estate evidence        | ODbL 1.0; existing disposable-only gate for OSM-only Places stays in force. Preserve derivation of individual fields and relationships.                                                                |
| Commercial providers                                                | Address suggestions and provider observations                   | Provider terms apply; observations do not create canonical public Places.                                                                                                                              |

Primary references checked for this review:

- [GeoNames dump licence and row formats](https://download.geonames.org/export/dump/readme.txt)
  and [commercial-use terms](https://www.geonames.org/export/).
- [geoBoundaries API and distribution distinctions](https://www.geoboundaries.org/api.html)
  and [ZAF ADM1 upstream metadata](https://www.geoboundaries.org/api/current/gbOpen/ZAF/ADM1/).
- [CC BY 4.0 terms](https://creativecommons.org/licenses/by/4.0/): retain
  attribution, licence links and modification notices.
- [OSM copyright and ODbL obligations](https://www.openstreetmap.org/copyright).
- [MDB boundary redetermination](https://www.demarcation.org.za/about-boundary-redetermination/)
  and [Cape Town's official suburb layer](https://citymaps.capetown.gov.za/agsext/rest/services/Theme_Based/Political_Administrative_Boundaries/MapServer/4)
  are research leads, not acquired or licence-approved datasets.

The geoBoundaries represented year is historical evidence, not a 2026-current
boundary certification. Data download freshness, source modification date,
geographic effective date and review date must remain distinct.

## Production ODbL decision remains founder-owned

Recommend preparing a separately publishable geography reference dataset, with
explicit ODbL treatment for whatever derives from OSM, while keeping listings,
private addresses, contacts and commercial events in their own domain stores.
This recommendation is a proposed design for review; separate tables or opaque
Place IDs alone do not establish legal database independence.

For a production determination, Edward needs a reviewed record covering actual
derivation, the database/derivative-database boundary, attribution surfaces,
public-use/API/export obligations, the supported data-offer mechanism, licence
compatibility and treatment of proprietary data. Review names, coordinates,
geometry, types, relationships and aliases, including mixed-source rows.

The existing adapter gates `osm_only_odbl_provisional`. A
`mixed_odbl_supported` label is not itself production clearance. Finding a
matching GeoNames identity does not remove obligations from a copied OSM alias
or coordinate. Any independently sourced release must prove independent
provenance for every included assertion; dropping a label or an external mapping
cannot erase derivation. Audit this before protected release, without silently
changing the Gauteng package or weakening the current gate.

## Existing geography agent's exact continuation

The inspected branch is `feat/place-authority-slice0-decision`, commit
`0c3f3abf`. Its national mission state remains the single progress tracker.
This acquisition workstream started from integration `ad0c4247`; it does not
contain that branch's Place migrations or admission engine. Integrate this
reviewed packet into the geography branch through a deliberate Git change and
resolve the small D3 licence correction against its newer contract. Do not
replace its v0.5 contract with the integration branch's older version.

1. Verify the supplied bundle offline. Record its manifest digest, acquisition
   scope and limitations in the existing mission state. Replace the broad
   external acquisition blocker with the real pending canonical-source build.
   Phases 1–3 stay closed; Phase 4 is in evidence preparation, not completed.
2. Reconcile the active contract's Province 2 prerequisites with Phase 3
   evidence. Record explicit satisfaction or remaining gaps; this packet does
   not override those prerequisites or authorize consumer convergence.
3. Inspect the existing Gauteng source-processing pipeline before adapting it.
   `tools/gauteng-catalogue/gauteng_catalogue/config.py` still hardcodes Gauteng
   paths, scope and pressure names. The neutral **admission** engine is proven;
   real second-province source extraction/adjudication is not yet proven neutral.
   Parameterize the existing source pipeline where necessary. Do not create a
   competing authority, paste a renamed Gauteng catalogue or execute unreviewed
   agent-framework commands.
4. Produce the equivalent v0.2 source authority: factual geography, name
   assertions, source links, every candidate's disposition, source build summary
   and manifest. Include evidence for each included field and relationship.
   Keep raw artefact and record links resolvable back to this bundle. Do not
   classify all points as suburbs, all ADM3 records as a fixed municipality type,
   or all same-name records as one referent.
5. Resolve Western Cape administrative context against the actual geometry and
   dated releases. Use established geospatial tooling, retaining multipart
   features, holes and source CRS. Queue boundary points, multiple matches,
   code/geometry disagreements and version conflicts. A representative point
   may support administrative context; it does not prove a settlement boundary
   or membership of a city. Do not force a city parent to complete a search ladder.
6. Review identity continuity and cross-territory boundaries before minting.
   Check persistent source/native mappings and the existing registry. Never
   merge by normalized name or proximity alone. Preserve renames, distinctions,
   language tags and ambiguous homonyms; merges/splits require recorded decisions.
7. Add `za-wc` to the existing admission registry only after its source authority
   is pinned. Capture first-build expected counts as a deliberate review diff.
   Run the same builder with `--territory za-wc`; run checks with explicit
   territory selection so the default Gauteng check is not misreported as WC proof.
8. Through Database Authority, create a fresh exact-owned disposable target,
   plan and apply the reviewed geography branch's manifest, load the WC package
   with explicit territory selection, and independently verify it. Record the
   actual head/fingerprint, no-op replay, unchanged IDs and byte-identical rebuild.
   Run discovery and pressure probes, then verify the reference role **again**
   to detect test pollution. Dispose only that exact target through its lifecycle.

The source build and WC admission may continue without clearing the production
ODbL gate. Do not activate consumers, publish an SEO scope, infer a Search Area,
widen a search or claim national coverage as a consequence of this acquisition.

## Quality requirements for a national platform

These are proposed operating acceptance targets for the source/admission work,
not claims that the current platform meets them:

| Dimension                | Gate or measure                                                                                                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Provenance and licensing | 100% of admitted assertions trace to pinned source evidence and obligations; zero unknown-licence admissions.                                                                                                            |
| Safety                   | Zero unexplained identity merges, fabricated parents, mixed Land authorities or implicit query widening.                                                                                                                 |
| Completeness             | 100% candidate disposition accounting against a declared source universe; independent municipality/locality and rural coverage reconciliation. Report source gaps separately from rejected records.                      |
| Identity continuity      | Zero unintended ID churn across unchanged input, rename, type and boundary updates; reviewed merge/split records.                                                                                                        |
| Reproducibility          | Frozen inputs regenerate byte-identically; replay is a verified no-op; every admission has fresh-target physical proof.                                                                                                  |
| Names and discovery      | Test accepted official, local-language, historic and transliterated names; exact miss and ambiguity stay explicit. Include municipality/city distinctions and homonyms.                                                  |
| Geometry                 | Validate CRS, polygon validity, holes, multipart/island cases, border cases, conflicting vintages and evidence-backed administrative chains. Geometry repair produces a reviewed derivative.                             |
| Freshness                | Monthly source-version review and queue triage; quarterly full snapshot reconciliation; fast-path review of gazetted boundary/name changes. Retain observed/effective dates.                                             |
| Service quality          | Benchmark on realistic national volume; propose p95 discovery ≤200 ms server-side, publish test conditions and establish a baseline before promising it.                                                                 |
| Feedback                 | Persist unresolved demand through existing evidence/queue authority, triage weekly, measure unique accepted-name recall and unresolved-query rates by territory. Demand prioritizes research; it never proves geography. |

Western Cape pressure probes should include evidenced metro/city distinctions,
townships and informal areas, rural towns/localities, multilingual/historic
names, border cases and same-name referents. Cape Town, Khayelitsha, Mitchells
Plain, Stellenbosch, Paarl, Worcester, George, Knysna and Beaufort West are
research/probe prompts only: require accepted evidence before expecting an
executable result. Keep absence and ambiguity probes alongside positive cases.

National rollout follows one repeatable pipeline with territory manifests,
per-province evidence review and cross-province reconciliation. A large row
count or a green default-territory suite is insufficient for national acceptance.

## Delivery boundary

This work contains acquisition tooling, a source snapshot, a licence correction
and the architecture handoff. It changes no migration, canonical schema, runtime
query, admitted Place package, production licence gate or consumer. Database
status was inspected on the task-owned worktree; the service was unreachable,
and no database was created or mutated. Physical admission proof belongs to
the geography agent's next source/admission change.
