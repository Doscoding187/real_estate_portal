# Gauteng Candidate Catalogue v0.1

This directory contains the isolated, zero-cost research pipeline for the
Property Listify Gauteng Candidate Catalogue v0.1. It produces reviewable
source records, source assertions, reconciliation decisions and candidate
locations. It does not create production geography, Search Areas, migrations,
seeds or application/database records.

## Reproduce

From the repository root, use a disposable environment outside the worktree:

```bash
python3 -m venv /tmp/property-listify-gauteng-catalogue-venv
/tmp/property-listify-gauteng-catalogue-venv/bin/pip install -r tools/gauteng-catalogue/requirements.txt
/tmp/property-listify-gauteng-catalogue-venv/bin/python tools/gauteng-catalogue/run_catalogue.py all
```

If the host Python does not include `venv`/`ensurepip`, install the pinned
dependencies into a disposable directory instead:

```bash
python3 -m pip install --target /tmp/property-listify-gauteng-catalogue-deps -r tools/gauteng-catalogue/requirements.txt
PYTHONPATH=/tmp/property-listify-gauteng-catalogue-deps \
  python3 tools/gauteng-catalogue/run_catalogue.py all
```

`all` acquires the approved source pack, builds a preliminary source-record
layer to discover OSM Wikidata QIDs, acquires a narrow Wikidata query for those
QIDs, then rebuilds the complete catalogue. `--skip-wikidata` is available for
source-failure diagnostics and does not fabricate Wikidata evidence.

Reruns verify existing raw artifacts by SHA-256 before reusing them. Downloaded
files under `data/gauteng-candidate-catalogue-v0.1/raw/` are immutable inputs;
the pipeline never edits them. A `.part` file is used only for safe interrupted
download recovery.

## Data layers

```text
raw source artifacts
  -> source records (native IDs, names, types, payloads and licence)
  -> source assertions (typed evidence linked to source records)
  -> reconciliation matches (deterministic, contextual and review-only fuzzy)
  -> Property Listify candidate locations
```

Candidate IDs use a Property Listify-owned canonical key made from normalized
name, proposed factual type, representative coordinate and administrative
context. They do not use GeoNames IDs, OSM IDs, Wikidata QIDs, NGA UFIs or
geoBoundaries IDs as the primary identity. Every candidate retains source IDs,
source-native classifications, assertion IDs and source licence classes.

The reconciliation order is direct cross-identifiers, exact contextual
matching, then fuzzy proposals. Exact normalized names without compatible type
and spatial context do not merge. Fuzzy similarity is always emitted as
`proposed` and is never silently merged. Duplicate normalized names remain
separate interpretations.

## Approved inputs

- geoBoundaries gbOpen ZAF ADM1/ADM2/ADM3: API metadata is acquired first and
  its current `gjDownloadURL` is followed dynamically. The Gauteng ADM1
  polygon is the spatial gate.
- GeoNames South Africa dump, alternate names, administrative code tables,
  feature codes, hierarchy and readme.
- Geofabrik South Africa OSM PBF. Relevant named OSM place objects and named
  residential-development candidates retain `ODBL_1` provenance.
- Narrow Wikidata SPARQL results for OSM-referenced QIDs, with a bounded
  Gauteng query fallback when no QIDs are discoverable.
- NGA GNS South Africa country file discovered from the official dynamic
  `data.json` index. If the official index or file fails, the limitation is
  recorded and the other approved sources continue.

## Primary outputs

Under `data/gauteng-candidate-catalogue-v0.1/output/`:

- `gauteng_source_manifest_v0.1.json` and `.csv`: URL, resolved URL, source
  version, retrieval time, size, SHA-256, licence, attribution and counts.
- `gauteng_source_records_v0.1.jsonl`: source-native records and spatial-gate
  decisions.
- `gauteng_source_assertions_v0.1.jsonl`: typed evidence linked to source
  records.
- `gauteng_candidate_matches_v0.1.jsonl` and `.csv`: source-to-candidate
  matches, decisions, confidence and conflicts.
- `gauteng_candidate_catalogue_v0.1.jsonl`, `.csv` and `.geojson`: the
  Property Listify-owned candidate layer with recoverable evidence.
- `gauteng_coverage_conflict_report_v0.1.json` and `.md`: required probe
  coverage, duplicate-name/type/boundary conflicts, Kyalami/Khayalami and
  residential-development findings.
- `gauteng_catalogue_run_v0.1.json`: run metadata and scope safeguards.

The JSON/JSONL outputs are the machine-readable authority for this experiment;
CSV and Markdown are review projections.

The local Git checkpoint retains the source manifest, run metadata and concise
Markdown coverage report. The full source-record, assertion, match, candidate,
coverage JSON and GeoJSON projections remain ignored local artifacts because
they are deterministically reproducible from the checked-in tooling and
checksummed raw inputs.

## Tests

```bash
python3 -m unittest discover -s tools/gauteng-catalogue/tests -p 'test_*.py'
```

The focused tests use synthetic records and do not contact external services
or any database.

## Canonical promotion simulation v0.2

The promotion policy is a derived, read-only layer over an existing catalogue;
it does not reacquire sources or mutate candidate/source artifacts. From this
worktree, point `--catalogue-root` at the completed catalogue data root and
write derived outputs locally:

```bash
PYTHONPATH=tools/gauteng-catalogue \
  python3 tools/gauteng-catalogue/run_promotion.py \
  --catalogue-root /home/edwardspc/Desktop/Dev/listify-gauteng-geography-catalogue/data/gauteng-candidate-catalogue-v0.1 \
  --output-root data/gauteng-canonical-promotion-v0.2/output \
  --baseline-output-root /home/edwardspc/Desktop/Dev/listify-gauteng-canonical-promotion/data/gauteng-canonical-promotion-v0.1/output
```

The v0.2 output contains the machine-readable promotion simulation, bounded
founder review set, v0.1-to-v0.2 comparison, policy document and summary
report. The catalogue root is treated as read-only; no database, Search Area or
product operation is performed.

## Factual canonical geography v0.1

The factual canonical layer is a derived, non-production authority over the
accepted v0.2 promotion simulation. It retains the Property Listify candidate
ID as the stable canonical ID, while source-native IDs remain evidence only.
Candidate, source-record, assertion and match artifacts are read-only inputs;
candidate-only and rejected rows are retained in that layer and are not copied
into canonical geography.

With the completed local catalogue and promotion outputs available, run:

```bash
PYTHONPATH=tools/gauteng-catalogue \
  python3 tools/gauteng-catalogue/run_canonical.py \
  --candidate-root /home/edwardspc/Desktop/Dev/listify-gauteng-geography-catalogue/data/gauteng-candidate-catalogue-v0.1 \
  --promotion-output-root /home/edwardspc/Desktop/Dev/listify-gauteng-founder-review-refinement/data/gauteng-canonical-promotion-v0.2/output \
  --output-root data/gauteng-factual-canonical-v0.1/output
```

Primary local outputs are:

- `gauteng_factual_canonical_geography_v0.1.jsonl`: one accepted factual
  identity per row, with provisional attributes explicitly marked.
- `gauteng_factual_canonical_names_v0.1.jsonl`: searchable name assertions
  with preferred, official, alias and historical roles. Source-supplied
  identifier-like labels such as QIDs, compact source codes and URLs remain
  traceable but are marked non-searchable.
- `gauteng_factual_canonical_source_links_v0.1.jsonl`: canonical-to-source
  evidence links, assertions, match evidence and licence classes.
- `gauteng_factual_canonical_summary_v0.1.json` and `.md`: counts, licence
  distributions, duplicate safety, probes and scope safeguards.
- `gauteng_factual_canonical_kyalami_evidence_v0.1.json`: separate official
  evidence and commercial-reuse gate; it is not silently added to the source
  evidence store.

The output directory is intentionally ignored for large reproducible JSONL
projections. The summary, report and Kyalami gate are lightweight review
artifacts. OSM-only rows are explicitly classified as
`osm_only_odbl_provisional`; assigning a Property Listify ID does not remove
ODbL obligations. This workstream does not write application geography,
databases, migrations, Search Areas or product code.
