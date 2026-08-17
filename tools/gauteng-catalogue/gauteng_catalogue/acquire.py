from __future__ import annotations

import html
import json
import re
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import quote, urljoin, urlsplit, urlunsplit

from . import CATALOGUE_VERSION
from .common import (
    atomic_write_bytes,
    download_artifact,
    read_json,
    read_jsonl,
    sha256_bytes,
    sha256_file,
    stable_digest,
    utc_now,
    write_json,
    write_jsonl,
    parse_urlencoded_query,
    http_request,
)
from .config import (
    DATA_ROOT,
    GEOBOUNDARIES_API_BASE,
    GEONAMES_BASE,
    GEOFABRIK_URL,
    LICENSES,
    NGA_DATA_DICTIONARY_URL,
    NGA_DATA_INDEX_URL,
    NGA_LANDING_URL,
    NGA_REFERENCE_URL,
    OUTPUT_ROOT,
    RAW_ROOT,
    WIKIDATA_SPARQL_URL,
    PIPELINE_METADATA,
)


MANIFEST_PATH = OUTPUT_ROOT / f"gauteng_source_manifest_{CATALOGUE_VERSION}.json"


def _empty_manifest() -> dict[str, Any]:
    return {
        **PIPELINE_METADATA,
        "manifest_version": "0.1",
        "generated_at": utc_now(),
        "artifacts": [],
        "acquisition_limitations": [],
    }


def load_manifest() -> dict[str, Any]:
    manifest = read_json(MANIFEST_PATH, None)
    return manifest if isinstance(manifest, dict) else _empty_manifest()


def _artifact_index(manifest: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        str(item.get("artifact_id")): item
        for item in manifest.get("artifacts", [])
        if isinstance(item, dict) and item.get("artifact_id")
    }


def _upsert_artifact(manifest: dict[str, Any], artifact: dict[str, Any]) -> None:
    artifacts = [
        item
        for item in manifest.get("artifacts", [])
        if item.get("artifact_id") != artifact.get("artifact_id")
    ]
    artifacts.append(artifact)
    artifacts.sort(key=lambda item: str(item.get("artifact_id", "")))
    manifest["artifacts"] = artifacts
    manifest["generated_at"] = utc_now()


def _relative(path: Path) -> str:
    return path.relative_to(DATA_ROOT).as_posix()


def _source_meta(source: str) -> dict[str, str]:
    return LICENSES[source]


def _append_limitation(manifest: dict[str, Any], limitation: dict[str, Any]) -> None:
    if limitation not in manifest.setdefault("acquisition_limitations", []):
        manifest["acquisition_limitations"].append(limitation)


def _clear_limitations(manifest: dict[str, Any], *, source: str, artifact: str) -> None:
    manifest["acquisition_limitations"] = [
        item
        for item in manifest.get("acquisition_limitations", [])
        if not (item.get("source") == source and item.get("artifact") == artifact)
    ]


def _artifact(
    *,
    artifact_id: str,
    source: str,
    access_url: str,
    resolved_url: str,
    path: Path,
    retrieved_at: str,
    response_headers: dict[str, str] | None = None,
    source_version: dict[str, Any] | None = None,
    filter_method: str = "not yet extracted",
    record_count_before_filter: int | None = None,
    record_count_after_filter: int | None = None,
    errors_limitations: list[str] | None = None,
) -> dict[str, Any]:
    source_meta = _source_meta(source)
    effective_source_version = dict(source_version or {})
    effective_source_version.setdefault("resolved_url_at_retrieval", resolved_url)
    if response_headers:
        for header_name, version_key in (
            ("last-modified", "http_last_modified"),
            ("etag", "http_etag"),
            ("content-length", "http_content_length"),
        ):
            if response_headers.get(header_name):
                effective_source_version.setdefault(version_key, response_headers[header_name])
    return {
        "artifact_id": artifact_id,
        "source": source,
        "access_url": access_url,
        "resolved_url": resolved_url,
        "filename": path.name,
        "path": _relative(path),
        "retrieved_at": retrieved_at,
        "source_version": effective_source_version,
        "size_bytes": path.stat().st_size if path.exists() else None,
        "sha256": sha256_file(path) if path.exists() else None,
        "licence_class": source_meta["class"],
        "attribution": source_meta["attribution"],
        "geographic_scope": "Gauteng candidate catalogue; source-native scope preserved",
        "filter_method": filter_method,
        "record_count_before_filter": record_count_before_filter,
        "record_count_after_gauteng_filter": record_count_after_filter,
        "errors_limitations": errors_limitations or [],
        "response_headers": response_headers or {},
    }


def _download_and_record(
    manifest: dict[str, Any],
    *,
    artifact_id: str,
    source: str,
    access_url: str,
    destination: Path,
    source_version: dict[str, Any] | None = None,
    filter_method: str = "not yet extracted",
) -> dict[str, Any]:
    existing = _artifact_index(manifest).get(artifact_id)
    result = download_artifact(
        access_url,
        destination,
        existing_record=existing,
        expected_sha256=(existing or {}).get("sha256"),
    )
    retrieved_at = (existing or {}).get("retrieved_at") if not result["downloaded"] else utc_now()
    artifact = _artifact(
        artifact_id=artifact_id,
        source=source,
        access_url=access_url,
        resolved_url=result["resolved_url"],
        path=destination,
        retrieved_at=retrieved_at or utc_now(),
        response_headers=result.get("headers"),
        source_version=source_version,
        filter_method=filter_method,
    )
    _upsert_artifact(manifest, artifact)
    return artifact


def _save_http_artifact(
    manifest: dict[str, Any],
    *,
    artifact_id: str,
    source: str,
    access_url: str,
    destination: Path,
    body: bytes,
    resolved_url: str,
    headers: dict[str, str],
    source_version: dict[str, Any] | None = None,
    filter_method: str = "not yet extracted",
    errors_limitations: list[str] | None = None,
) -> dict[str, Any]:
    existing = _artifact_index(manifest).get(artifact_id)
    if existing and destination.exists() and sha256_bytes(body) == existing.get("sha256"):
        retrieved_at = existing.get("retrieved_at") or utc_now()
    else:
        atomic_write_bytes(destination, body)
        retrieved_at = utc_now()
    artifact = _artifact(
        artifact_id=artifact_id,
        source=source,
        access_url=access_url,
        resolved_url=resolved_url,
        path=destination,
        retrieved_at=retrieved_at,
        response_headers=headers,
        source_version=source_version,
        filter_method=filter_method,
        errors_limitations=errors_limitations,
    )
    _upsert_artifact(manifest, artifact)
    return artifact


def acquire_geoboundaries(manifest: dict[str, Any]) -> None:
    source = "geoboundaries"
    for level in ("ADM1", "ADM2", "ADM3"):
        api_url = f"{GEOBOUNDARIES_API_BASE}/{level}/"
        api_path = RAW_ROOT / "geoboundaries" / f"gbopen-zaf-{level}-api.json"
        try:
            body, resolved_url, headers = http_request(api_url, accept="application/json", timeout=90)
            metadata = json.loads(body.decode("utf-8-sig"))
            _save_http_artifact(
                manifest,
                artifact_id=f"geoboundaries:api:{level.lower()}",
                source=source,
                access_url=api_url,
                destination=api_path,
                body=body,
                resolved_url=resolved_url,
                headers=headers,
                source_version={
                    "boundaryID": metadata.get("boundaryID"),
                    "boundaryYearRepresented": metadata.get("boundaryYearRepresented"),
                    "buildDate": metadata.get("buildDate"),
                    "sourceDataUpdateDate": metadata.get("sourceDataUpdateDate"),
                    "boundaryLicense": metadata.get("boundaryLicense"),
                },
            )
            download_url = metadata.get("gjDownloadURL")
            if not isinstance(download_url, str) or not download_url:
                raise ValueError(f"geoBoundaries {level} API response did not expose gjDownloadURL")
            _download_and_record(
                manifest,
                artifact_id=f"geoboundaries:geojson:{level.lower()}",
                source=source,
                access_url=download_url,
                destination=RAW_ROOT / "geoboundaries" / f"geoBoundaries-ZAF-{level}.geojson",
                source_version={
                    "api_url": api_url,
                    "boundaryID": metadata.get("boundaryID"),
                    "boundaryYearRepresented": metadata.get("boundaryYearRepresented"),
                    "buildDate": metadata.get("buildDate"),
                    "sourceDataUpdateDate": metadata.get("sourceDataUpdateDate"),
                    "boundaryLicense": metadata.get("boundaryLicense"),
                },
                filter_method=(
                    "ADM1: select Gauteng feature; ADM2/ADM3: retain features whose geometry "
                    "intersects the Gauteng ADM1 polygon"
                ),
            )
        except Exception as exc:
            _append_limitation(
                manifest,
                {"source": source, "artifact": level, "error": f"{type(exc).__name__}: {exc}"},
            )


def acquire_geonames(manifest: dict[str, Any]) -> None:
    files = (
        "ZA.zip",
        "alternatenames/ZA.zip",
        "admin1CodesASCII.txt",
        "admin2Codes.txt",
        "featureCodes_en.txt",
        "hierarchy.zip",
        "readme.txt",
    )
    for relative_url in files:
        url = f"{GEONAMES_BASE}/{relative_url}"
        filename = Path(relative_url).name
        artifact_id = f"geonames:{relative_url.replace('/', ':')}"
        destination = RAW_ROOT / "geonames" / relative_url
        try:
            _download_and_record(
                manifest,
                artifact_id=artifact_id,
                source="geonames",
                access_url=url,
                destination=destination,
                source_version={"reference": "HTTP Last-Modified/ETag returned at retrieval"},
                filter_method=(
                    "ZA.zip: country_code=ZA, admin1_code=06, then Gauteng polygon gate; "
                    "supporting files parsed as lookup/evidence inputs"
                ),
            )
        except Exception as exc:
            _append_limitation(
                manifest,
                {"source": "geonames", "artifact": filename, "error": f"{type(exc).__name__}: {exc}"},
            )


def acquire_osm(manifest: dict[str, Any]) -> None:
    _download_and_record(
        manifest,
        artifact_id="osm:geofabrik:south-africa-latest-pbf",
        source="osm",
        access_url=GEOFABRIK_URL,
        destination=RAW_ROOT / "osm" / "south-africa-latest.osm.pbf",
        source_version={"geofabrik_access_url": GEOFABRIK_URL, "resolved_filename_is_date_versioned": True},
        filter_method=(
            "PBF streaming extraction; named Gauteng place values and named residential "
            "landuse/residential candidates; Gauteng geometry gate"
        ),
    )


def acquire_nga(manifest: dict[str, Any]) -> None:
    source = "nga_gns"
    _clear_limitations(manifest, source=source, artifact="South Africa country file")
    try:
        landing_body, landing_resolved, landing_headers = http_request(
            NGA_LANDING_URL, accept="text/html,*/*", timeout=90
        )
        _save_http_artifact(
            manifest,
            artifact_id="nga_gns:landing",
            source=source,
            access_url=NGA_LANDING_URL,
            destination=RAW_ROOT / "nga-gns" / "GNSData-index.html",
            body=landing_body,
            resolved_url=landing_resolved,
            headers=landing_headers,
            source_version={"discovery_page": True},
        )

        index_body, index_resolved, index_headers = http_request(
            NGA_DATA_INDEX_URL, accept="application/json,*/*", timeout=90
        )
        _save_http_artifact(
            manifest,
            artifact_id="nga_gns:data-index",
            source=source,
            access_url=NGA_DATA_INDEX_URL,
            destination=RAW_ROOT / "nga-gns" / "data.json",
            body=index_body,
            resolved_url=index_resolved,
            headers=index_headers,
            source_version={"discovery_page": True},
        )

        index_data = json.loads(index_body.decode("utf-8-sig"))
        row = str(index_data.get("ZAF", ""))
        match = re.search(r"href=['\"]([^'\"]+South Africa\.zip)['\"]", html.unescape(row), re.I)
        if not match:
            raise RuntimeError(
                "Official NGA data index was reachable but did not expose a South Africa ZIP href. "
                "No guessed ZIP URL was used."
            )
        discovered_href = html.unescape(match.group(1))
        discovered_url = urljoin(index_resolved, discovered_href)
        parsed_url = urlsplit(discovered_url)
        country_url = urlunsplit(
            (
                parsed_url.scheme,
                parsed_url.netloc,
                quote(parsed_url.path, safe="/%:@+~!$&'()*;,=-._"),
                parsed_url.query,
                parsed_url.fragment,
            )
        )
        date_match = re.search(r"<td>(\d{4}-\d{2}-\d{2})</td>", html.unescape(row))
        count_match = re.search(r"<td[^>]*>\s*(\d+)\s*</td>", html.unescape(row), re.I)
        source_version = {
            "country_code": "ZAF",
            "index_reference_date": date_match.group(1) if date_match else None,
            "official_record_count": int(count_match.group(1)) if count_match else None,
            "country_index_row": html.unescape(row),
        }
        _download_and_record(
            manifest,
            artifact_id="nga_gns:country:zaf",
            source=source,
            access_url=country_url,
            destination=RAW_ROOT / "nga-gns" / "South Africa.zip",
            source_version=source_version,
            filter_method="official South Africa country file; then coordinate gate against Gauteng polygon",
        )
    except Exception as exc:
        _append_limitation(
            manifest,
            {
                "source": source,
                "artifact": "South Africa country file",
                "error": f"{type(exc).__name__}: {exc}",
            },
        )

    for artifact_id, url, filename in (
        ("nga_gns:reference", NGA_REFERENCE_URL, "reference.html"),
        ("nga_gns:data-dictionary", NGA_DATA_DICTIONARY_URL, "GNS_Data_Dictionary.pdf"),
    ):
        try:
            _download_and_record(
                manifest,
                artifact_id=artifact_id,
                source=source,
                access_url=url,
                destination=RAW_ROOT / "nga-gns" / filename,
                source_version={"reference_document": True},
                filter_method="reference document; no catalogue rows",
            )
        except Exception as exc:
            _append_limitation(
                manifest,
                {"source": source, "artifact": filename, "error": f"{type(exc).__name__}: {exc}"},
            )


def _query_for_qids(qids: list[str]) -> str:
    normalized_qids = [qid if qid.upper().startswith("Q") else f"Q{qid}" for qid in qids]
    values = " ".join(f"wd:{qid}" for qid in normalized_qids)
    return f"""
SELECT DISTINCT ?item ?itemLabel ?itemDescription ?alias ?coordinate ?parent ?geonames ?osmRelation ?officialName ?instance WHERE {{
  VALUES ?item {{ {values} }}
  OPTIONAL {{ ?item rdfs:label ?itemLabel . FILTER(LANG(?itemLabel) = "en") }}
  OPTIONAL {{ ?item schema:description ?itemDescription . FILTER(LANG(?itemDescription) = "en") }}
  OPTIONAL {{ ?item skos:altLabel ?alias . FILTER(LANG(?alias) = "en") }}
  OPTIONAL {{ ?item wdt:P625 ?coordinate }}
  OPTIONAL {{ ?item wdt:P131 ?parent }}
  OPTIONAL {{ ?item wdt:P1566 ?geonames }}
  OPTIONAL {{ ?item wdt:P402 ?osmRelation }}
  OPTIONAL {{ ?item wdt:P1448 ?officialName . FILTER(LANG(?officialName) = "en") }}
  OPTIONAL {{ ?item wdt:P31 ?instance }}
}}
""".strip()


def _fallback_gauteng_query() -> str:
    return """
SELECT DISTINCT ?item ?itemLabel ?itemDescription ?alias ?coordinate ?parent ?geonames ?osmRelation ?officialName ?instance WHERE {
  ?item wdt:P625 ?coordinate .
  ?item wdt:P17 wd:Q258 .
  FILTER(geof:latitude(?coordinate) >= -27.6 && geof:latitude(?coordinate) <= -25.0)
  FILTER(geof:longitude(?coordinate) >= 27.0 && geof:longitude(?coordinate) <= 29.6)
  OPTIONAL { ?item rdfs:label ?itemLabel . FILTER(LANG(?itemLabel) = "en") }
  OPTIONAL { ?item schema:description ?itemDescription . FILTER(LANG(?itemDescription) = "en") }
  OPTIONAL { ?item skos:altLabel ?alias . FILTER(LANG(?alias) = "en") }
  OPTIONAL { ?item wdt:P131 ?parent }
  OPTIONAL { ?item wdt:P1566 ?geonames }
  OPTIONAL { ?item wdt:P402 ?osmRelation }
  OPTIONAL { ?item wdt:P1448 ?officialName . FILTER(LANG(?officialName) = "en") }
  OPTIONAL { ?item wdt:P31 ?instance }
}
LIMIT 5000
""".strip()


def _binding_value(binding: dict[str, Any], key: str) -> str | None:
    value = binding.get(key, {}).get("value")
    return str(value) if value is not None else None


def acquire_wikidata(manifest: dict[str, Any], qids: Iterable[str] = ()) -> list[Path]:
    source = "wikidata"
    normalized_qids = sorted({qid[1:] if qid.startswith("Q") else qid for qid in qids if re.fullmatch(r"Q?\d+", qid, re.I)})
    batches: list[list[str]] = [normalized_qids[index : index + 80] for index in range(0, len(normalized_qids), 80)]
    if not batches:
        batches = [[]]
    query_paths: list[Path] = []
    for batch_number, batch in enumerate(batches, 1):
        query = _query_for_qids(batch) if batch else _fallback_gauteng_query()
        artifact_id = f"wikidata:sparql:{batch_number:03d}"
        filename = f"wikidata-query-{batch_number:03d}.json"
        path = RAW_ROOT / "wikidata" / filename
        query_digest = stable_digest(query, 20)
        existing = _artifact_index(manifest).get(artifact_id)
        _clear_limitations(manifest, source=source, artifact=f"sparql batch {batch_number}")
        if (
            existing
            and existing.get("source_version", {}).get("query_digest") == query_digest
            and path.exists()
            and sha256_file(path) == existing.get("sha256")
        ):
            query_paths.append(path)
            write_json(MANIFEST_PATH, manifest)
            continue
        try:
            body, resolved_url, headers = parse_urlencoded_query(WIKIDATA_SPARQL_URL, query)
            try:
                parsed = json.loads(body.decode("utf-8"))
            except json.JSONDecodeError as exc:
                raise RuntimeError(f"Wikidata returned non-JSON response: {body[:240]!r}") from exc
            _save_http_artifact(
                manifest,
                artifact_id=artifact_id,
                source=source,
                access_url=WIKIDATA_SPARQL_URL,
                destination=path,
                body=body,
                resolved_url=resolved_url,
                headers=headers,
                source_version={
                    "query_digest": query_digest,
                    "query_scope": "OSM-referenced QIDs" if batch else "Gauteng bounding-box fallback",
                    "qids": [f"Q{qid}" for qid in batch],
                },
                filter_method="SPARQL result parsed as source assertions; coordinate gate reapplied",
            )
            query_paths.append(path)
        except Exception as exc:
            _append_limitation(
                manifest,
                {
                    "source": source,
                    "artifact": f"sparql batch {batch_number}",
                    "error": f"{type(exc).__name__}: {exc}",
                },
            )
        write_json(MANIFEST_PATH, manifest)
    return query_paths


def qids_from_source_records(source_records_path: Path) -> list[str]:
    qids: set[str] = set()
    for record in read_jsonl(source_records_path):
        if record.get("source") != "osm":
            continue
        for key, value in (record.get("cross_identifiers") or {}).items():
            if key in {"wikidata", "wikidata_qid"}:
                values = value if isinstance(value, list) else [value]
                for candidate in values:
                    match = re.search(r"\bQ\d+\b", str(candidate), re.I)
                    if match:
                        qids.add(match.group(0).upper())
    return sorted(qids)


def acquire_base_sources() -> dict[str, Any]:
    RAW_ROOT.mkdir(parents=True, exist_ok=True)
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    manifest = load_manifest()
    for source, acquire in (
        ("geoboundaries", acquire_geoboundaries),
        ("geonames", acquire_geonames),
        ("osm", acquire_osm),
        ("nga_gns", acquire_nga),
    ):
        try:
            acquire(manifest)
        except Exception as exc:
            _append_limitation(
                manifest,
                {
                    "source": source,
                    "artifact": "base acquisition",
                    "error": f"{type(exc).__name__}: {exc}",
                },
            )
        finally:
            # Checkpoint after each approved source. Raw artifacts are still
            # immutable inputs; this only makes interrupted acquisition
            # resumable and keeps completed source metadata durable.
            write_json(MANIFEST_PATH, manifest)
    write_json(MANIFEST_PATH, manifest)
    return manifest


def acquire_all_sources(source_records_path: Path | None = None) -> dict[str, Any]:
    manifest = acquire_base_sources()
    if source_records_path and source_records_path.exists():
        qids = qids_from_source_records(source_records_path)
    else:
        qids = []
    acquire_wikidata(manifest, qids)
    write_json(MANIFEST_PATH, manifest)
    return manifest
