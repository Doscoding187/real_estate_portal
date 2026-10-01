# Western Cape source acquisition v0.1

This package contains acquired source evidence, not admitted Place Authority
data. No record is assigned a canonical Place ID. Admission, current-boundary
review and production activation remain separate operations.

The reproducible acquisition plan is `plan.json`. The frozen bundle is
`snapshot-20261001/`, acquired on 2026-10-01. Its manifest SHA-256 is:

```text
f16907c92b55431f66496d1ffe0abc453be8e11b855d5ec2f262fceb58a005eb
```

| Observation                      | Count and scope                                                            |
| -------------------------------- | -------------------------------------------------------------------------- |
| GeoNames national source rows    | 103,212; original ZA country ZIP retained                                  |
| GeoNames Western Cape rows       | 14,930; source country ZA / admin1 11, **all feature classes**             |
| Linked alternate-name assertions | 11,889; retain language, historic/preferred flags and validity fields      |
| Administrative boundary features | 274 national features: 9 ADM1, 52 ADM2, 213 ADM3; no WC spatial assignment |
| Indexed source observations      | 27,093; no canonical adjudication                                          |

The compressed storage is about 31.5 MB. Full original geometry bytes are
losslessly preserved, not simplified. The original geometry layers represent
2020; retrieval in 2026 does not make those boundaries current.

Every source observation has an artifact ID and digest, original source-native
ID, exact row/feature locator, licence and attribution. Index storage is
`source-records.jsonl.gz`; boundary features are retained in the original
GeoJSON gzip files and indexed by feature position and digest. GeoNames raw
records and ZIPs are unchanged. Names, classifications and codes remain source
assertions; no containment or search scope is inferred here.

GeoNames attribution: GeoNames geographic database,
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/),
[source and terms](https://www.geonames.org/export/). Property Listify filtered
by source province code and indexed observations; the original ZIP/readme are
retained, including separate original name assertions.

Boundary attribution: geoBoundaries gbOpen, William & Mary geoLab;
upstream OCHA ROSEA / South African Municipal Demarcation Board. Preserve
the [gbOpen distribution terms](https://www.geoboundaries.org/api.html),
upstream CC BY 3.0 IGO and all layer metadata notices. Property Listify indexed
features and losslessly compressed the original GeoJSON without changing
coordinates. The represented year and source URL are attached to each layer.

Verify from the repository root, without network or database access:

```sh
python3 tools/geography-source-evidence/snapshot.py verify \
  --bundle data/za-wc-source-acquisition-v0.1/snapshot-20261001
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover \
  -s tools/geography-source-evidence -p 'test_*.py' -v
```

The verifier checks every stored and original-download digest, resolves each
indexed observation back to the downloaded row/feature, and independently
accounts for the full declared source universe. The tests also reject corrupted
raw data, undeclared files, repinned false/omitted observations, canonical IDs
in acquisition records and overwrite attempts.

The [architecture decision](../../docs/architecture/geography-source-acquisition-decision.md)
owns the source rationale, licence findings, quality gates and continuation into
the existing geography agent's workstream. This README is package evidence,
not another national progress tracker.
