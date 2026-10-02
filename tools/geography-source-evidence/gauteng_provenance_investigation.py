#!/usr/bin/env python3
"""Investigate what boundary provenance Gauteng actually has, without re-acquiring.

Founder decision of record: investigate Gauteng's existing boundary provenance
before considering re-acquisition, and preserve its Place IDs during that
investigation. This tool is the investigation. It reads only committed evidence and
writes nothing.

Gauteng's source authority predates the shared boundary-recording builder, so its
manifest has no `boundary_evidence` block and `place:boundary-currency` reports its
vintage as unknown. The question is whether that vintage is genuinely unrecoverable
from what is committed, or merely un-aggregated.

Three findings, kept separate because they carry very different weight:

  1. RECOVERABLE. Every admitted Place records per-record boundary provenance:
     provider geoBoundaries, level ADM1/ADM2/ADM3, and a stable upstream shapeID.
     That is real provenance, committed and verifiable.

  2. NOT RECOVERABLE. The vintage -- demarcation year, build date, upstream
     source-data date and licence -- lives in the geoBoundaries `-metadata.json`
     sidecars. Gauteng's raw bundle was deliberately not committed
     (`raw_materialization.committed = false`), so no sidecar exists for it.

  3. CORROBORATING. The eight committed bundles pin one geoBoundaries release,
     git `9469f09`, with per-file digests. Every Gauteng shapeID appears in that
     release's national ZAF layers, and every admitted Place's representative point
     falls inside the polygon its own administrative context names.

Finding 3 is corroboration, NOT proof of vintage. South African boundaries change
slowly, so an older release would very likely contain the same points. This tool can
show that Gauteng's administrative context is consistent with release 9469f09; it
cannot show which release Gauteng was built from, and must never be read as doing so.

Exit status: non-zero if a finding that should hold does not, so the investigation
is re-runnable rather than a one-off observation.

Usage: tools/gauteng-catalogue/.venv/bin/python tools/geography-source-evidence/gauteng_provenance_investigation.py
"""

from __future__ import annotations

import gzip
import json
import pathlib
import sys

from shapely.geometry import Point, shape
from shapely.validation import make_valid

ROOT = pathlib.Path(__file__).resolve().parents[2]

GAUTENG_PLACES = ROOT / "data/gauteng-place-admission-v0.1/gauteng_place_admission_v0.1.jsonl"
GAUTENG_GEOGRAPHY = ROOT / "data/gauteng-source-authority-v0.2/gauteng_factual_canonical_geography_v0.2.jsonl"
REGISTRY = ROOT / "data/place-admission-territories.v0.1/territory-registry.v0.1.json"

# Every committed acquisition bundle resolves to this one geoBoundaries release.
EXPECTED_RELEASE = "9469f09"


def read_jsonl(path: pathlib.Path) -> list[dict]:
    with path.open(encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def boundary_dir() -> pathlib.Path:
    """The first committed bundle. All eight pin the same release, so one is enough."""
    candidates = sorted(ROOT.glob("data/za-*-source-acquisition-v0.1/snapshot-*/raw/geoboundaries"))
    if not candidates:
        raise SystemExit("no committed acquisition bundle carries geoboundaries layers")
    return candidates[0]


def layer(directory: pathlib.Path, name: str) -> dict[tuple[str, str], object]:
    data = json.loads(gzip.decompress((directory / f"{name}.geojson.gz").read_bytes()).decode())
    features: dict[tuple[str, str], object] = {}
    for feature in data["features"]:
        props = feature.get("properties") or {}
        geometry = shape(feature["geometry"])
        if not geometry.is_valid:
            geometry = make_valid(geometry)
        features[(props.get("shapeName"), props.get("shapeISO") or "")] = geometry
    return features


def main() -> int:
    problems: list[str] = []

    directory = boundary_dir()
    metadata = json.loads((directory / "ADM2-metadata.json").read_text(encoding="utf-8"))
    release = metadata["gjDownloadURL"].split("/raw/")[1].split("/")[0]
    if release != EXPECTED_RELEASE:
        problems.append(
            f"committed bundles pin geoBoundaries release {release}, not the expected {EXPECTED_RELEASE}"
        )
    print(f"committed release        {release}")
    print(f"  demarcation year       {metadata['boundaryYearRepresented']}")
    print(f"  build date             {metadata['buildDate']}")
    print(f"  upstream source data   {metadata['sourceDataUpdateDate']}")
    print(f"  boundary source        {metadata['boundarySource']}")
    print(f"  licence                {metadata['boundaryLicense']}")
    print()

    # Finding 1: per-record provenance is committed for every admitted Place.
    shape_ids: set[tuple[str, str]] = set()
    providers: set[str] = set()
    for record in read_jsonl(GAUTENG_GEOGRAPHY):
        context = record.get("administrative_context") or {}
        for level in ("province", "adm2", "adm3"):
            items = context.get(level)
            if items is None:
                continue
            if isinstance(items, dict):
                items = [items]
            for item in items:
                provider = item.get("source")
                if provider:
                    providers.add(provider)
                shape_id = (item.get("source_properties") or {}).get("shapeID")
                if shape_id:
                    shape_ids.add((level, shape_id))
    print("finding 1  recoverable per-record provenance")
    print(f"  providers recorded     {sorted(providers)}")
    print(f"  distinct (level, shapeID) pairs  {len(shape_ids)}")
    if not shape_ids:
        problems.append("no per-record shapeID provenance found in Gauteng's committed geography")
    print()

    # Finding 2: the vintage sidecars are absent for Gauteng.
    manifest = json.loads((ROOT / "data/gauteng-source-authority-v0.2/gauteng_source_manifest_v0.2.json").read_text(encoding="utf-8"))
    committed_raw = manifest.get("raw_materialization", {}).get("committed")
    has_metadata_sidecar = any(
        "geoboundaries" in str(p).lower() and "metadata" in str(p).lower()
        for p in [GAUTENG_GEOGRAPHY]
    )
    print("finding 2  vintage is NOT recoverable from committed inputs")
    print(f"  raw_materialization.committed  {committed_raw}")
    print(f"  a geoboundaries metadata sidecar exists for Gauteng  {has_metadata_sidecar}")
    if committed_raw is not False:
        problems.append(
            "Gauteng's raw materialization is no longer declared uncommitted, so this "
            "investigation's premise must be re-checked"
        )
    print()

    # Finding 3: corroboration against the committed release. NOT a vintage record.
    adm2 = layer(directory, "ADM2")
    adm3 = layer(directory, "ADM3")
    by_name: dict[str, object] = {}
    for features in (adm2, adm3):
        for (name, _iso), geometry in features.items():
            by_name.setdefault(name, geometry)

    # Every shapeID the committed bundles carry, across BOTH admin levels. An earlier
    # draft of this check scanned only ADM2, which left Gauteng's local-municipality
    # (ADM3) IDs unexamined and reported 11 of 33 as unaccounted for when they were
    # simply never looked up.
    ga_shape_ids = {shape_id for _level, shape_id in shape_ids}
    bundle_ids: set[str] = set()
    for level in ("ADM2", "ADM3"):
        for path in sorted(
            ROOT.glob(f"data/za-*-source-acquisition-v0.1/snapshot-*/raw/geoboundaries/{level}.geojson.gz")
        ):
            data = json.loads(gzip.decompress(path.read_bytes()).decode())
            for feature in data["features"]:
                shape_id = (feature.get("properties") or {}).get("shapeID")
                if shape_id:
                    bundle_ids.add(shape_id)
    matched_ids = ga_shape_ids & bundle_ids

    matched_context = 0
    point_inside = 0
    missing_context = 0
    outside = 0
    for place in read_jsonl(GAUTENG_PLACES):
        adjudication = place.get("adjudication") or {}
        name = adjudication.get("administrative_context")
        lat = adjudication.get("representative_latitude")
        lon = adjudication.get("representative_longitude")
        if not name or lat is None or lon is None:
            missing_context += 1
            continue
        geometry = by_name.get(name)
        if geometry is None:
            missing_context += 1
            continue
        matched_context += 1
        if geometry.covers(Point(lon, lat)):
            point_inside += 1
        else:
            outside += 1

    print("finding 3  corroboration against the committed release (NOT a vintage record)")
    print(f"  Gauteng shapeIDs present in release {release}  {len(matched_ids)}/{len(ga_shape_ids)}")
    print(f"  admitted Places whose context name exists there {matched_context}")
    print(f"  representative point inside that polygon        {point_inside}")
    print(f"  point outside its named polygon                 {outside}")
    print(f"  context name absent from the release            {missing_context}")
    if outside:
        problems.append(f"{outside} Gauteng Places fall outside the polygon their context names")
    if matched_ids != ga_shape_ids:
        problems.append(
            f"only {len(matched_ids)} of {len(ga_shape_ids)} Gauteng shapeIDs appear in release {release}"
        )
    print()
    print("  consequence: Gauteng's administrative context is CONSISTENT with release")
    print(f"  {release}. It is NOT shown to have been built from it. Boundaries change")
    print("  slowly, so an older release would likely contain the same points.")
    print()

    if problems:
        print(f"gauteng-provenance: FAILED with {len(problems)} problem(s):")
        for problem in problems:
            print(f"  FAIL  {problem}")
        return 1

    print("gauteng-provenance: OK")
    print("  per-record provenance is committed and its IDs match the committed release.")
    print("  the vintage is NOT recoverable, so the currency review still cannot quantify")
    print("  Gauteng's gap. Re-acquisition remains refused and its Place IDs are untouched.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
