#!/usr/bin/env python3
"""Freeze source-native evidence; never adjudicate, mint Places or write a database.

Python standard library only. Acquisition uses HTTPS; verification is offline.
An existing bundle is immutable: acquire a new directory for a new snapshot.
"""
import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path
import re
from datetime import datetime, timezone
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
import zipfile


ALLOWED_HOSTS = {
    "www.geoboundaries.org", "download.geonames.org", "www.geonames.org",
    "github.com", "raw.githubusercontent.com", "media.githubusercontent.com",
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def encode(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()


def jsonl(rows):
    return b"".join((json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n").encode() for row in rows)


def approved_url(url):
    parsed = urlsplit(url)
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS or parsed.username or parsed.password:
        raise ValueError("Source URL is outside the approved HTTPS hosts")
    return url


def acquire(plan_path, root, frozen=None):
    plan_bytes = plan_path.read_bytes()
    plan = json.loads(plan_bytes)
    # Refuse existing bundles, including partial ones. Preserve failed acquisition.
    root.mkdir(parents=True, exist_ok=False)
    artifacts = []
    outputs = []
    records = []
    frozen_artifacts = {}
    if frozen:
        for line in (frozen / "acquisition-log.jsonl").read_text().splitlines():
            entry = json.loads(line)
            if entry["artifact_id"] in frozen_artifacts:
                raise ValueError("Duplicate frozen download")
            frozen_artifacts[entry["artifact_id"]] = entry

    def store(relative, data, collection):
        destination = root / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(data)
        collection.append({"path": relative, "sha256": digest(data), "size_bytes": len(data)})

    store("acquisition-plan.json", plan_bytes, outputs)

    def download(artifact_id, url, relative, licence, compressed=False):
        if frozen:
            entry = frozen_artifacts[artifact_id]
            if entry["access_url"] != url or entry["path"] != relative or entry["licence"] != licence:
                raise ValueError("Frozen source differs from reviewed acquisition plan")
            approved_url(entry["resolved_url"])
            source_path = frozen / relative
            if source_path.is_symlink() or not source_path.resolve().is_relative_to(frozen.resolve()):
                raise ValueError("Frozen source escapes bundle")
            stored = source_path.read_bytes()
            if digest(stored) != entry["sha256"] or len(stored) != entry["size_bytes"]:
                raise ValueError("Frozen source checksum/size mismatch")
            data = gzip.decompress(stored) if compressed else stored
            if digest(data) != entry["download_sha256"] or len(data) != entry["download_size_bytes"]:
                raise ValueError("Frozen original download checksum/size mismatch")
            store(relative, stored, artifacts)
            artifacts[-1].update(entry)
            with (root / "acquisition-log.jsonl").open("ab") as log:
                log.write(jsonl([entry]))
            print(f"reused verified frozen source {artifact_id}", flush=True)
            return data, artifacts[-1]
        request = Request(approved_url(url), headers={"User-Agent": "PropertyListify-SourceEvidence/0.1"})
        with urlopen(request, timeout=60) as response:
            approved_url(response.url)
            # Bounded acquisition; an unexpected large response fails before admission.
            data = response.read(80 * 1024 * 1024 + 1)
            if len(data) > 80 * 1024 * 1024:
                raise ValueError(f"Oversized source: {artifact_id}")
            metadata = {
                "artifact_id": artifact_id, "access_url": url, "resolved_url": response.url,
                "retrieved_at": datetime.now(timezone.utc).isoformat(),
                "response_headers": {k.lower(): v for k, v in response.headers.items()
                                     if k.lower() in {"etag", "last-modified", "content-type", "content-length"}},
                "download_sha256": digest(data), "download_size_bytes": len(data),
                "licence": licence, "storage_encoding": "gzip" if compressed else "identity",
            }
        stored = gzip.compress(data, mtime=0) if compressed else data
        store(relative, stored, artifacts)
        artifacts[-1].update(metadata)
        # Keep successful-download provenance even if a later source fails.
        with (root / "acquisition-log.jsonl").open("ab") as log:
            log.write(jsonl([artifacts[-1]]))
        print(f"acquired {artifact_id}: {len(data)} bytes", flush=True)
        return data, artifacts[-1]

    def provenance(artifact, native_id, locator):
        return {
            "artifact_id": artifact["artifact_id"], "artifact_sha256": artifact["sha256"],
            "source_native_id": native_id, "source_locator": locator,
            "licence": artifact["licence"], "attribution": artifact["licence"]["attribution"],
            "disposition": "unadjudicated_source_evidence", "place_id": None,
        }

    for level in plan["boundary_levels"]:
        url = f'https://www.geoboundaries.org/api/current/gbOpen/{plan["country_iso3"]}/{level}/'
        data, meta_artifact = download(f"geoboundaries:metadata:{level}", url,
                                      f"raw/geoboundaries/{level}-metadata.json", plan["licences"]["geoboundaries"])
        meta = json.loads(data)
        if meta["boundaryISO"] != plan["country_iso3"] or meta["boundaryType"] != level:
            raise ValueError("Boundary metadata country/level mismatch")
        if meta["boundaryLicense"] != plan["licences"]["geoboundaries"]["upstream_name"]:
            raise ValueError("Upstream licence changed: review before acquiring geometry")
        geometry_url = meta["gjDownloadURL"]
        # Use the content endpoint at the identical pinned Git revision, not a moving branch.
        match = re.fullmatch(r"https://github.com/wmgeolab/geoBoundaries/raw/([0-9a-f]{7,40})/(.+)", geometry_url)
        if not match:
            raise ValueError("Expected a revision-pinned geoBoundaries geometry URL")
        geometry_url = f"https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/{match[1]}/{match[2]}"
        licence = {**plan["licences"]["geoboundaries"], "upstream_source": meta["boundarySource"],
                   "upstream_licence_source": meta["licenseSource"]}
        data, artifact = download(f"geoboundaries:geometry:{level}", geometry_url,
                                  f"raw/geoboundaries/{level}.geojson.gz", licence, compressed=True)
        features = json.loads(data)["features"]
        if len(features) != int(meta["admUnitCount"]):
            raise ValueError("Boundary feature count disagrees with metadata")
        artifact["source_version"] = {key: meta[key] for key in
                                      ["boundaryID", "boundaryYearRepresented", "buildDate", "sourceDataUpdateDate"]}
        artifact["advertised_geometry_url"] = meta["gjDownloadURL"]
        artifact["metadata_artifact_sha256"] = meta_artifact["sha256"]
        for index, feature in enumerate(features):
            properties = feature["properties"]
            native_id = properties.get("shapeID")
            if not native_id:
                raise ValueError("Boundary feature has no source-native shapeID")
            records.append({**provenance(artifact, native_id, {"feature_index": index}),
                            "source": "geoboundaries", "source_native_properties": properties,
                            "source_feature_sha256": digest(encode(feature)),
                            "scope": "national_source_layer_unfiltered", "boundary_level": level})

    geonames = {}
    for item in plan["geonames_artifacts"]:
        data, artifact = download(f'geonames:{item["id"]}', item["url"],
                                  f'raw/geonames/{item["filename"]}', plan["licences"]["geonames"])
        geonames[item["id"]] = (data, artifact)

    if "Creative Commons Attribution 4.0 License" not in geonames["licence-readme"][0].decode():
        raise ValueError("GeoNames licence declaration changed; review required")

    codes, codes_artifact = geonames["admin1-codes"]
    matches = [line.split("\t") for line in codes.decode().splitlines()
               if line.split("\t")[0] == plan["geonames_admin1_code"]]
    if len(matches) != 1 or matches[0][1] != plan["province_name"] or matches[0][3] != plan["province_geoname_id"]:
        raise ValueError("Province code/name/native identity mismatch")

    data, artifact = geonames["country"]
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        country_bytes = archive.read(f'{plan["country_iso2"]}.txt')
    ids = set()
    country_count = 0
    for line_number, line in enumerate(country_bytes.decode().splitlines(), 1):
        columns = line.split("\t")
        if len(columns) != 19:
            raise ValueError("Unexpected GeoNames country row shape")
        country_count += 1
        if columns[10] == plan["geonames_admin1_code"].split(".")[1] and columns[8] == plan["country_iso2"]:
            if columns[0] in ids:
                raise ValueError("Duplicate source-native GeoNames ID")
            ids.add(columns[0])
            records.append({**provenance(artifact, columns[0], {"zip_member": f'{plan["country_iso2"]}.txt', "line": line_number}),
                            "source": "geonames", "source_native_row": line,
                            "source_native_columns": columns, "source_record_sha256": digest(line.encode()),
                            "scope": "source_asserted_province_code_not_spatially_adjudicated",
                            "province_code_evidence_sha256": codes_artifact["sha256"]})
    if plan["province_geoname_id"] not in ids:
        raise ValueError("Province identity missing from country extract")

    data, artifact = geonames["alternate-names"]
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        member = f'{plan["country_iso2"]}.txt'
        if set(archive.namelist()) != {"readme.txt", member}:
            raise ValueError("Unexpected alternate-name archive members")
        if "Creative Commons Attribution 4.0 License" not in archive.read("readme.txt").decode():
            raise ValueError("Alternate-name licence declaration changed")
        aliases = archive.read(member).decode().splitlines()
    alias_count = 0
    for line_number, line in enumerate(aliases, 1):
        columns = line.split("\t")
        if len(columns) != 10:
            raise ValueError("Expected V2 alternate names including validity dates")
        if columns[1] in ids:
            alias_count += 1
            records.append({**provenance(artifact, columns[0], {"zip_member": member, "line": line_number}),
                            "source": "geonames_alternate_name", "geoname_id": columns[1],
                            "source_native_row": line, "source_native_columns": columns,
                            "source_record_sha256": digest(line.encode()),
                            "scope": "linked_to_source_asserted_province_record"})

    store("source-records.jsonl.gz", gzip.compress(jsonl(records), mtime=0), outputs)
    store("acquisition-log.jsonl", (root / "acquisition-log.jsonl").read_bytes(), outputs)
    manifest = {
        "schema_version": "0.1", "bundle_kind": "acquired_evidence_not_admitted_authority",
        "territory_id": plan["territory_id"], "artifacts": artifacts, "outputs": outputs,
        "counts": {"national_geonames_records": country_count, "province_geonames_records": len(ids),
                   "province_alternate_name_assertions": alias_count, "all_source_records": len(records)},
        "limitations": [
            "Source-native observations only; no canonical identity, factual type or parent has been adjudicated.",
            "ADM2/ADM3 layers are national; Western Cape spatial selection and current-boundary review are pending.",
            "GeoNames filtering preserves source admin1 assertions; border/conflicting/00 records require review.",
            "No OSM data acquired; ODbL founder production gate remains unchanged.",
            "This is not a complete province catalogue or the v0.2 source-authority manifest expected by admission.",
        ],
    }
    manifest_bytes = encode(manifest)
    (root / "manifest.json").write_bytes(manifest_bytes)
    (root / "manifest.sha256").write_text(digest(manifest_bytes) + "\n")
    verify(root)
    print(json.dumps(manifest["counts"], sort_keys=True), flush=True)


def verify(root):
    manifest_bytes = (root / "manifest.json").read_bytes()
    if digest(manifest_bytes) != (root / "manifest.sha256").read_text().strip():
        raise ValueError("Manifest checksum mismatch")
    manifest = json.loads(manifest_bytes)
    entries = manifest["artifacts"] + manifest["outputs"]
    declared = {"manifest.json", "manifest.sha256"}
    for entry in entries:
        relative = entry["path"]
        if relative in declared:
            raise ValueError("Repeated evidence path")
        path = root / relative
        if not path.resolve().is_relative_to(root.resolve()) or path.is_symlink():
            raise ValueError("Evidence path escapes bundle or is a symlink")
        data = path.read_bytes()
        if len(data) != entry["size_bytes"] or digest(data) != entry["sha256"]:
            raise ValueError(f"Artifact checksum/size mismatch: {relative}")
        if "download_sha256" in entry:
            original = gzip.decompress(data) if entry["storage_encoding"] == "gzip" else data
            if digest(original) != entry["download_sha256"] or len(original) != entry["download_size_bytes"]:
                raise ValueError(f"Original download checksum/size mismatch: {relative}")
        declared.add(relative)
    actual = {path.relative_to(root).as_posix() for path in root.rglob("*") if path.is_file()}
    if actual != declared:
        raise ValueError("Evidence bundle has undeclared or missing files")
    artifacts = {entry["artifact_id"]: entry for entry in manifest["artifacts"]}
    seen = set()
    source_cache = {}
    for line in gzip.decompress((root / "source-records.jsonl.gz").read_bytes()).decode().splitlines():
        record = json.loads(line)
        artifact = artifacts[record["artifact_id"]]
        identity = (record["artifact_id"], record["source_native_id"])
        if identity in seen or record["artifact_sha256"] != artifact["sha256"] or record["licence"] != artifact["licence"]:
            raise ValueError("Invalid or repeated record provenance")
        if record["place_id"] is not None or record["disposition"] != "unadjudicated_source_evidence":
            raise ValueError("Acquisition bundle must not assert canonical admission")
        if artifact["artifact_id"] not in source_cache:
            data = (root / artifact["path"]).read_bytes()
            if record["source"] == "geoboundaries":
                source_cache[artifact["artifact_id"]] = json.loads(gzip.decompress(data))["features"]
            else:
                with zipfile.ZipFile(io.BytesIO(data)) as archive:
                    source_cache[artifact["artifact_id"]] = archive.read(record["source_locator"]["zip_member"]).decode().splitlines()
        source = source_cache[artifact["artifact_id"]]
        if record["source"] == "geoboundaries":
            feature = source[record["source_locator"]["feature_index"]]
            if (feature["properties"] != record["source_native_properties"] or
                    feature["properties"]["shapeID"] != record["source_native_id"] or
                    digest(encode(feature)) != record["source_feature_sha256"]):
                raise ValueError("Boundary observation disagrees with downloaded feature")
        else:
            native_row = source[record["source_locator"]["line"] - 1]
            columns = native_row.split("\t")
            if (native_row != record["source_native_row"] or columns != record["source_native_columns"] or
                    columns[0] != record["source_native_id"] or
                    digest(native_row.encode()) != record["source_record_sha256"]):
                raise ValueError("GeoNames observation disagrees with downloaded row")
        seen.add(identity)
    if len(seen) != manifest["counts"]["all_source_records"]:
        raise ValueError("Record count mismatch")
    # Independently account for the complete declared source universe. Re-pinning
    # an incomplete index must not conceal omitted observations.
    plan = json.loads((root / "acquisition-plan.json").read_bytes())
    with zipfile.ZipFile(root / artifacts["geonames:country"]["path"]) as archive:
        country_lines = archive.read(f'{plan["country_iso2"]}.txt').decode().splitlines()
    province_ids = {columns[0] for columns in (line.split("\t") for line in country_lines)
                    if columns[8] == plan["country_iso2"] and
                    columns[10] == plan["geonames_admin1_code"].split(".")[1]}
    expected = {("geonames:country", native_id) for native_id in province_ids}
    with zipfile.ZipFile(root / artifacts["geonames:alternate-names"]["path"]) as archive:
        alias_lines = archive.read(f'{plan["country_iso2"]}.txt').decode().splitlines()
    alias_ids = {columns[0] for columns in (line.split("\t") for line in alias_lines) if columns[1] in province_ids}
    expected.update(("geonames:alternate-names", native_id) for native_id in alias_ids)
    for level in plan["boundary_levels"]:
        artifact_id = f"geoboundaries:geometry:{level}"
        features = json.loads(gzip.decompress((root / artifacts[artifact_id]["path"]).read_bytes()))["features"]
        expected.update((artifact_id, feature["properties"]["shapeID"]) for feature in features)
    if seen != expected:
        raise ValueError("Indexed records disagree with complete declared source universe")
    if (manifest["counts"]["national_geonames_records"] != len(country_lines) or
            manifest["counts"]["province_geonames_records"] != len(province_ids) or
            manifest["counts"]["province_alternate_name_assertions"] != len(alias_ids)):
        raise ValueError("Manifest scope counts disagree with original source")
    print(f"verified {len(entries)} files and {len(seen)} source-native records offline", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=["acquire", "verify"])
    parser.add_argument("--bundle", required=True, type=Path)
    parser.add_argument("--plan", type=Path)
    parser.add_argument("--from-bundle", type=Path, help="Re-index verified frozen downloads without network access")
    args = parser.parse_args()
    if args.operation == "acquire":
        if not args.plan:
            parser.error("acquire requires --plan")
        acquire(args.plan, args.bundle, args.from_bundle)
    else:
        verify(args.bundle)
