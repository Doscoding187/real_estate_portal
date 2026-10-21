# Gauteng held place review — 2026-10-20

**File:** `data/geography-coverage-v0.1/output/gauteng_held_place_review_v0.1.csv` (720 rows)
**Why it exists:** the 720 places held by the production Place release policy are the only
places in the country whose evidence is OpenStreetMap alone. They are the whole held set, and
they all sit in Gauteng.

## The three dispositions in the file

| `disposition` | Rows | Meaning |
| --- | --- | --- |
| `corroborated` | 17 | A clean-licensed source asserts the name at the point and the municipality agrees. These can be re-sourced and released. |
| `context_unproven` | 6 | A clean-licensed source asserts the name at the point, but the two municipalities differ. A parent-edge question, not a licence question. |
| `unmatched` | 697 | No clean-licensed source names the place. Each is an OpenStreetMap record with a supported type, supported spatial confidence, no boundary conflict, and a single source. |

## Columns

| Column | Meaning |
| --- | --- |
| `name` | The place name as the source records it. |
| `place_type` | The source's native classification: `suburb`, `town`, `village`, `locality`, `neighbourhood`. |
| `administrative_context` | The municipality the place was admitted under. |
| `latitude`, `longitude` | The place's representative point, for a map check. |
| `nearest_licensed_settlement` | The closest GeoNames (CC BY 4.0) settlement, for context. |
| `nearest_distance_km` | How far that nearest licensed settlement is. Every row is within 15 km of one. |
| `source_records` | The OpenStreetMap records the place was admitted from, so the original record can be looked up. |
| `disposition` | Which of the three buckets the place falls in. |

## Regenerating it

The two licensed extracts are free and need no credential:

```sh
curl -sL -o ZA.zip https://download.geonames.org/export/dump/ZA.zip
curl -sL -o admin2Codes.txt https://download.geonames.org/export/dump/admin2Codes.txt
unzip -o ZA.zip ZA.txt

GEONAMES_ZA_PATH=$PWD/ZA.txt \
GEONAMES_ADMIN2_PATH=$PWD/admin2Codes.txt \
node tools/geography-source-evidence/osm-corroboration.mjs \
  --review data/geography-coverage-v0.1/output/gauteng_held_place_review_v0.1.csv
```

## A caution for the reviewer

A place is not retired because its name looks like a map artefact. The admission policy
explicitly refuses to classify a place by name, label, substring or coordinate. The source
records say every one of these is a settlement with a supported type and no boundary conflict.
The only gap is that one source asserts it and no other source corroborates it. So a place in
this file is either a real place that needs a second source, or it stays held — and holding it
is safe, because it is not published and the runtime excludes it.
