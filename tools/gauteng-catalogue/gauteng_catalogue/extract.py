from __future__ import annotations

import csv
import json
import re
import zipfile
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable

from . import CATALOGUE_VERSION
from .common import (
    as_float,
    as_int,
    assertion_id,
    normalize_lookup,
    read_json,
    source_record_id,
    utc_now,
    write_jsonl,
)
from .config import (
    LICENSES,
    OSM_PLACE_VALUES,
    OUTPUT_ROOT,
    RAW_ROOT,
    RELEVANT_GEOBOUNDARY_LEVELS,
)
from .geometry import (
    GautengSpatialGate,
    iter_features,
    load_geojson,
    select_gauteng_feature,
    select_gauteng_overlapping_features,
)


SOURCE_RECORDS_PATH = OUTPUT_ROOT / f"gauteng_source_records_{CATALOGUE_VERSION}.jsonl"
SOURCE_ASSERTIONS_PATH = OUTPUT_ROOT / f"gauteng_source_assertions_{CATALOGUE_VERSION}.jsonl"


def _artifact_for(manifest: dict[str, Any], artifact_id: str) -> dict[str, Any]:
    for artifact in manifest.get("artifacts", []):
        if artifact.get("artifact_id") == artifact_id:
            return artifact
    return {}


def _retrieved_at(manifest: dict[str, Any], artifact_ids: Iterable[str]) -> str | None:
    values = [
        _artifact_for(manifest, artifact_id).get("retrieved_at")
        for artifact_id in artifact_ids
        if _artifact_for(manifest, artifact_id).get("retrieved_at")
    ]
    return min(values) if values else None


def _base_record(
    *,
    source: str,
    native_id: str,
    native_classification: dict[str, Any],
    exact_name: str | None,
    aliases: list[str],
    historical_names: list[str],
    latitude: float | None,
    longitude: float | None,
    geometry: dict[str, Any] | None,
    source_admin_context: dict[str, Any],
    source_payload: dict[str, Any],
    source_modification_date: str | None,
    manifest: dict[str, Any],
    artifact_ids: list[str],
    spatial_gate: dict[str, Any],
    cross_identifiers: dict[str, Any] | None = None,
    proposed_type_hints: list[str] | None = None,
) -> dict[str, Any]:
    clean_aliases = sorted(
        {
            str(value).strip()
            for value in aliases
            if str(value or "").strip() and normalize_lookup(value) != normalize_lookup(exact_name)
        }
    )
    clean_historical = sorted({str(value).strip() for value in historical_names if str(value or "").strip()})
    source_meta = LICENSES[source]
    source_id = source_record_id(source, native_id)
    return {
        "source_record_id": source_id,
        "source": source,
        "source_native_id": native_id,
        "source_native_stable_id": native_id,
        "source_native_classification": native_classification,
        "exact_source_name": str(exact_name or "").strip() or None,
        "normalized_lookup_form": normalize_lookup(exact_name),
        "aliases_supplied_by_source": clean_aliases,
        "historical_names_supplied_by_source": clean_historical,
        "latitude": latitude,
        "longitude": longitude,
        "geometry": geometry,
        "source_admin_context": source_admin_context,
        "source_payload": source_payload,
        "source_modification_date": source_modification_date,
        "retrieved_at": _retrieved_at(manifest, artifact_ids),
        "source_artifact_ids": artifact_ids,
        "licence_class": source_meta["class"],
        "attribution": source_meta["attribution"],
        "cross_identifiers": cross_identifiers or {},
        "proposed_type_hints": sorted(set(proposed_type_hints or [])),
        "normalized_evidence": {
            "normalized_lookup_form": normalize_lookup(exact_name),
            "aliases_normalized": sorted({normalize_lookup(value) for value in clean_aliases if normalize_lookup(value)}),
            "historical_names_normalized": sorted(
                {normalize_lookup(value) for value in clean_historical if normalize_lookup(value)}
            ),
        },
        "gauteng_spatial_gate": spatial_gate,
        "catalogue_eligible": bool(spatial_gate.get("catalogue_eligible")),
    }


def _properties_name(properties: dict[str, Any]) -> str | None:
    for key in ("shapeName", "NAME_1", "NAME_2", "NAME_3", "name", "NAME"):
        value = properties.get(key)
        if value:
            return str(value)
    return None


def _boundary_type(level: str, properties: dict[str, Any]) -> tuple[str, list[str], str]:
    name = (_properties_name(properties) or "").casefold()
    if level == "ADM1":
        return "province", ["province"], "geoBoundaries ADM1"
    if level == "ADM2":
        metro_tokens = ("johannesburg", "tshwane", "ekurhuleni", "west rand", "city of")
        if any(token in name for token in metro_tokens) and any(
            token in name for token in ("city", "metropolitan", "metro", "johannesburg", "tshwane", "ekurhuleni")
        ):
            return "metropolitan_municipality", ["ADM2", "metropolitan_municipality"], "ADM2 name indicates a Gauteng metro"
        return "district_municipality", ["ADM2", "district_municipality"], "geoBoundaries ADM2"
    return "local_municipality", ["ADM3", "local_municipality"], "geoBoundaries ADM3"


def extract_geoboundaries(manifest: dict[str, Any]) -> tuple[GautengSpatialGate, list[dict[str, Any]], dict[str, int]]:
    paths = {
        level: RAW_ROOT / "geoboundaries" / f"geoBoundaries-ZAF-{level}.geojson"
        for level in RELEVANT_GEOBOUNDARY_LEVELS
    }
    collections = {level: load_geojson(path) for level, path in paths.items() if path.exists()}
    if "ADM1" not in collections:
        raise FileNotFoundError("Gauteng ADM1 geoBoundaries artifact is not available")
    adm1_features = list(iter_features(collections["ADM1"]))
    province_feature = select_gauteng_feature(adm1_features)
    context_features = {
        level: select_gauteng_overlapping_features(iter_features(collections[level]), GautengSpatialGate(province_feature))
        if level in collections
        else []
        for level in ("ADM2", "ADM3")
    }
    gate = GautengSpatialGate(province_feature, context_features)

    records: list[dict[str, Any]] = []
    before_counts: dict[str, int] = {}
    after_counts: dict[str, int] = {}
    for level in RELEVANT_GEOBOUNDARY_LEVELS:
        features = list(iter_features(collections[level])) if level in collections else []
        before_counts[level] = len(features)
        selected = [province_feature] if level == "ADM1" else context_features.get(level, [])
        after_counts[level] = len(selected)
        artifact_id = f"geoboundaries:geojson:{level.lower()}"
        api_metadata = read_json(RAW_ROOT / "geoboundaries" / f"gbopen-zaf-{level}-api.json", {}) or {}
        for feature_index, feature in enumerate(selected):
            properties = feature.get("properties") or {}
            native_id = str(
                next(
                    (
                        properties.get(key)
                        for key in ("shapeID", "shapeISO", "shapeName", "GID_1", "GID_2", "GID_3")
                        if properties.get(key)
                    ),
                    f"{level.lower()}-{feature_index}",
                )
            )
            name = _properties_name(properties)
            proposed_type, type_hints, reason = _boundary_type(level, properties)
            point = gate.representative_point(feature.get("geometry"))
            spatial_status = gate.geometry_status(feature.get("geometry"))
            record = _base_record(
                source="geoboundaries",
                native_id=f"{level.lower()}:{native_id}",
                native_classification={
                    "boundary_level": level,
                    "boundary_canonical": api_metadata.get("boundaryCanonical"),
                    "boundary_type": api_metadata.get("boundaryType"),
                    "boundary_source": api_metadata.get("boundarySource"),
                    "properties": properties,
                },
                exact_name=name,
                aliases=[
                    str(properties.get(key))
                    for key in ("shapeName", "NAME_1", "NAME_2", "NAME_3", "shapeISO")
                    if properties.get(key) and str(properties.get(key)) != str(name or "")
                ],
                historical_names=[],
                latitude=point[0] if point else None,
                longitude=point[1] if point else None,
                geometry=feature.get("geometry"),
                source_admin_context={
                    "boundary_level": level,
                    "properties": properties,
                    "api_metadata": {
                        "boundaryID": api_metadata.get("boundaryID"),
                        "boundaryYearRepresented": api_metadata.get("boundaryYearRepresented"),
                    },
                },
                source_payload={"feature_index": feature_index, "properties": properties},
                source_modification_date=str(api_metadata.get("sourceDataUpdateDate") or api_metadata.get("buildDate") or "") or None,
                manifest=manifest,
                artifact_ids=[artifact_id, f"geoboundaries:api:{level.lower()}"],
                spatial_gate={
                    "status": spatial_status,
                    "province_source": "geoBoundaries ADM1",
                    "catalogue_eligible": spatial_status in {"intersects", "inside"},
                    "validation_method": "geometry intersection with Gauteng ADM1 polygon",
                },
                cross_identifiers={"geoboundaries": [native_id]},
                proposed_type_hints=type_hints,
            )
            record["classification_reason"] = reason
            record["proposed_type"] = proposed_type
            records.append(record)
    return gate, records, {**{f"before_{key}": value for key, value in before_counts.items()}, **{f"after_{key}": value for key, value in after_counts.items()}}


def _zip_member(zip_file: zipfile.ZipFile, preferred: Iterable[str]) -> str:
    members = zip_file.namelist()
    lower = {member.casefold(): member for member in members}
    for candidate in preferred:
        if candidate.casefold() in lower:
            return lower[candidate.casefold()]
    text_members = [member for member in members if not member.endswith("/") and member.casefold().endswith((".txt", ".tsv"))]
    if not text_members:
        raise ValueError(f"No text member in {zip_file.filename}")
    return sorted(text_members, key=lambda value: ("readme" in value.casefold(), value))[0]


def _iter_zip_lines(path: Path, preferred: Iterable[str]) -> Iterable[str]:
    with zipfile.ZipFile(path) as archive:
        member = _zip_member(archive, preferred)
        with archive.open(member) as raw:
            for line in raw.read().decode("utf-8-sig", errors="replace").splitlines():
                yield line


def _geonames_supporting_lookups() -> tuple[dict[str, str], dict[str, str], dict[str, str], dict[str, list[dict[str, Any]]]]:
    admin1: dict[str, str] = {}
    admin2: dict[str, str] = {}
    feature_codes: dict[str, str] = {}
    alternate_names: dict[str, list[dict[str, Any]]] = defaultdict(list)
    admin1_path = RAW_ROOT / "geonames" / "admin1CodesASCII.txt"
    if admin1_path.exists():
        with admin1_path.open("r", encoding="utf-8", errors="replace") as handle:
            for line in handle:
                parts = line.rstrip("\n").split("\t")
                if len(parts) >= 2:
                    admin1[parts[0]] = parts[1]
    admin2_path = RAW_ROOT / "geonames" / "admin2Codes.txt"
    if admin2_path.exists():
        with admin2_path.open("r", encoding="utf-8", errors="replace") as handle:
            for line in handle:
                parts = line.rstrip("\n").split("\t")
                if len(parts) >= 2:
                    admin2[parts[0]] = parts[1]
    feature_path = RAW_ROOT / "geonames" / "featureCodes_en.txt"
    if feature_path.exists():
        with feature_path.open("r", encoding="utf-8", errors="replace") as handle:
            for line in handle:
                parts = line.rstrip("\n").split("\t")
                if len(parts) >= 2:
                    feature_codes[parts[0]] = parts[1]
    alternate_path = RAW_ROOT / "geonames" / "ZA.zip"
    if (RAW_ROOT / "geonames" / "alternatenames").exists():
        alternate_path = RAW_ROOT / "geonames" / "alternatenames"
    alternate_zip = RAW_ROOT / "geonames" / "ZA.zip"
    alternate_source = RAW_ROOT / "geonames" / "alternatenames" / "ZA.zip"
    if alternate_source.exists():
        for line in _iter_zip_lines(alternate_source, ("alternateNames-ZA.txt", "alternatenames-ZA.txt")):
            parts = line.split("\t")
            if len(parts) < 4 or not parts[0].strip().isdigit():
                continue
            record = {
                "alternate_name_id": parts[0],
                "geonameid": parts[1],
                "language": parts[2] or None,
                "name": parts[3],
                "is_preferred": parts[4] if len(parts) > 4 else None,
                "is_short": parts[5] if len(parts) > 5 else None,
                "is_colloquial": parts[6] if len(parts) > 6 else None,
                "is_historic": parts[7] if len(parts) > 7 else None,
                "from": parts[8] if len(parts) > 8 else None,
                "to": parts[9] if len(parts) > 9 else None,
                "comment": parts[10] if len(parts) > 10 else None,
            }
            alternate_names[parts[1]].append(record)
    del alternate_path, alternate_zip
    return admin1, admin2, feature_codes, alternate_names


def _geonames_hierarchy() -> dict[str, list[dict[str, str]]]:
    result: dict[str, list[dict[str, str]]] = defaultdict(list)
    path = RAW_ROOT / "geonames" / "hierarchy.zip"
    if not path.exists():
        return result
    for line in _iter_zip_lines(path, ("hierarchy.txt",)):
        parts = line.split("\t")
        if len(parts) >= 3 and parts[0].isdigit() and parts[1].isdigit():
            result[parts[1]].append({"parent_id": parts[0], "child_id": parts[1], "type": parts[2]})
    return result


def extract_geonames(manifest: dict[str, Any], gate: GautengSpatialGate) -> tuple[list[dict[str, Any]], dict[str, int]]:
    path = RAW_ROOT / "geonames" / "ZA.zip"
    if not path.exists():
        return [], {"before": 0, "after": 0}
    admin1, admin2, feature_codes, alternate_names = _geonames_supporting_lookups()
    hierarchy = _geonames_hierarchy()
    records: list[dict[str, Any]] = []
    before = 0
    selected = 0
    for line in _iter_zip_lines(path, ("ZA.txt",)):
        fields = line.split("\t")
        if len(fields) < 19 or not fields[0].strip().isdigit():
            continue
        before += 1
        geoname_id = fields[0]
        name = fields[1]
        ascii_name = fields[2]
        latitude = as_float(fields[4])
        longitude = as_float(fields[5])
        feature_class = fields[6]
        feature_code = fields[7]
        country_code = fields[8]
        admin1_code = fields[10]
        admin2_code = fields[11]
        modification_date = fields[18] or None
        point_status = gate.point_status(latitude, longitude)
        if point_status == "inside" and admin1_code == "06":
            gate_status = "inside"
            eligible = True
        elif point_status == "inside":
            gate_status = "inside_admin_code_conflict"
            eligible = True
        elif point_status == "missing_coordinate" and admin1_code == "06":
            gate_status = "admin_code_says_gauteng_missing_coordinate"
            eligible = False
        elif admin1_code == "06":
            gate_status = "admin_code_says_gauteng_point_outside"
            eligible = False
        else:
            continue
        selected += 1
        alternate_rows = alternate_names.get(geoname_id, [])
        aliases = [ascii_name]
        historical_names: list[str] = []
        alias_details: list[dict[str, Any]] = []
        for alternate in alternate_rows:
            alternate_name = str(alternate.get("name") or "").strip()
            if not alternate_name:
                continue
            alias_details.append(alternate)
            if str(alternate.get("is_historic") or "") == "1" or alternate.get("to"):
                historical_names.append(alternate_name)
            else:
                aliases.append(alternate_name)
        record = _base_record(
            source="geonames",
            native_id=geoname_id,
            native_classification={
                "feature_class": feature_class,
                "feature_code": feature_code,
                "feature_description": feature_codes.get(f"{feature_class}.{feature_code}"),
                "country_code": country_code,
            },
            exact_name=name,
            aliases=aliases,
            historical_names=historical_names,
            latitude=latitude,
            longitude=longitude,
            geometry=None,
            source_admin_context={
                "admin1_code": admin1_code,
                "admin1_name": admin1.get(f"ZA.{admin1_code}"),
                "admin2_code": admin2_code,
                "admin2_name": admin2.get(f"ZA.{admin1_code}.{admin2_code}"),
                "admin3_code": fields[12],
                "admin4_code": fields[13],
                "hierarchy": hierarchy.get(geoname_id, []),
            },
            source_payload={
                "raw_fields": fields[:19],
                "alternate_names": alias_details,
                "population": as_int(fields[14]),
                "elevation": as_int(fields[15]),
                "dem": as_int(fields[16]),
                "timezone": fields[17],
            },
            source_modification_date=modification_date,
            manifest=manifest,
            artifact_ids=[
                "geonames:ZA.zip",
                "geonames:alternatenames:ZA.zip",
                "geonames:admin1CodesASCII.txt",
                "geonames:admin2Codes.txt",
                "geonames:featureCodes_en.txt",
                "geonames:hierarchy.zip",
            ],
            spatial_gate={
                "status": gate_status,
                "catalogue_eligible": eligible,
                "source_admin1_code": admin1_code,
                "spatial_validation": point_status,
                "validation_method": "GeoNames admin1 filter plus Gauteng ADM1 point-in-polygon gate",
            },
            cross_identifiers={"geonames": [geoname_id]},
            proposed_type_hints=_geonames_type_hints(feature_class, feature_code),
        )
        records.append(record)
    return records, {
        "before": before,
        "after": selected,
        "alternate_name_rows": sum(len(value) for value in alternate_names.values()),
        "admin1_rows": len(admin1),
        "admin2_rows": len(admin2),
        "feature_code_rows": len(feature_codes),
        "hierarchy_rows": sum(len(value) for value in hierarchy.values()),
    }


def _geonames_type_hints(feature_class: str, feature_code: str) -> list[str]:
    if feature_class == "A":
        return {
            "ADM1": ["province"],
            "ADM2": ["district_municipality"],
            "ADM3": ["local_municipality"],
            "ADM4": ["locality"],
        }.get(feature_code, ["other"])
    if feature_class == "P":
        if feature_code in {"PPLC", "PPLA", "PPLA2", "PPLA3", "PPLA4"}:
            return ["city", "town"]
        if feature_code in {"PPLX", "PPLQ", "PPLW"}:
            return ["locality", "neighbourhood"]
        if feature_code in {"PPL", "PPLS"}:
            return ["locality", "village", "town"]
        return ["locality"]
    if feature_class == "L":
        return ["locality"]
    return ["other"]


def _safe_osm_timestamp(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _osm_coordinates(nodes: Iterable[Any]) -> list[list[float]]:
    coordinates: list[list[float]] = []
    for node in nodes:
        try:
            location = node.location
            if hasattr(location, "valid") and not location.valid():
                continue
            lon = float(location.lon)
            lat = float(location.lat)
            if -180 <= lon <= 180 and -90 <= lat <= 90:
                coordinates.append([lon, lat])
        except (AttributeError, TypeError, ValueError):
            continue
    return coordinates


def _osm_geometry(coordinates: list[list[float]]) -> dict[str, Any] | None:
    if len(coordinates) < 2:
        return None
    if len(coordinates) >= 4 and coordinates[0] == coordinates[-1]:
        return {"type": "Polygon", "coordinates": [coordinates]}
    return {"type": "LineString", "coordinates": coordinates}


def _osm_relevant(tags: dict[str, str]) -> tuple[bool, str, list[str]]:
    place = str(tags.get("place") or "").casefold()
    landuse = str(tags.get("landuse") or "").casefold()
    residential = str(tags.get("residential") or "").casefold()
    name = tags.get("name") or tags.get("official_name")
    if not name:
        return False, "", []
    if place in OSM_PLACE_VALUES:
        return True, place, ["osm_place"]
    if landuse == "residential" or residential in {"estate", "residential", "apartments", "housing"}:
        return True, "estate/residential_development_candidate", ["named_residential_development_candidate"]
    return False, "", []


def _osm_record(
    obj: Any,
    element_type: str,
    tags: dict[str, str],
    gate: GautengSpatialGate,
    manifest: dict[str, Any],
    coordinates: list[list[float]],
    total_relevant: int,
) -> dict[str, Any] | None:
    relevant, native_place, relevance_hints = _osm_relevant(tags)
    if not relevant:
        return None
    geometry = _osm_geometry(coordinates)
    if element_type == "node" and coordinates:
        latitude, longitude = coordinates[0][1], coordinates[0][0]
        spatial_status = gate.point_status(latitude, longitude)
    elif geometry:
        spatial_status = gate.geometry_status(geometry)
        representative = gate.representative_point(geometry)
        latitude, longitude = (representative if representative else (None, None))
    else:
        latitude, longitude = None, None
        spatial_status = "missing_coordinate"
    if spatial_status == "outside":
        return None
    eligible = spatial_status in {"inside", "intersects"}
    native_id = f"{element_type}/{getattr(obj, 'id', 'unknown')}"
    name = str(tags.get("name") or tags.get("official_name") or "").strip()
    aliases = [tags.get(key, "") for key in ("official_name", "alt_name", "short_name", "name:en")]
    historical = [tags.get(key, "") for key in ("old_name", "old_name:en", "historic_name")]
    cross_identifiers: dict[str, Any] = {"osm": [native_id]}
    if tags.get("wikidata"):
        cross_identifiers["wikidata"] = [value for value in re.split(r"[;,]", tags["wikidata"]) if value.strip()]
        cross_identifiers["wikidata_qid"] = cross_identifiers["wikidata"]
    if tags.get("wikipedia"):
        cross_identifiers["wikipedia"] = [tags["wikipedia"]]
    if tags.get("ref"):
        cross_identifiers["ref"] = [tags["ref"]]
    record = _base_record(
        source="osm",
        native_id=native_id,
        native_classification={
            "element_type": element_type,
            "place": tags.get("place"),
            "boundary": tags.get("boundary"),
            "admin_level": tags.get("admin_level"),
            "landuse": tags.get("landuse"),
            "residential": tags.get("residential"),
        },
        exact_name=name,
        aliases=aliases,
        historical_names=historical,
        latitude=latitude,
        longitude=longitude,
        geometry=geometry,
        source_admin_context={
            key: tags.get(key)
            for key in ("addr:province", "addr:city", "addr:suburb", "is_in", "is_in:city", "is_in:province")
            if tags.get(key)
        },
        source_payload={
            "tags": tags,
            "version": getattr(obj, "version", None),
            "timestamp": _safe_osm_timestamp(getattr(obj, "timestamp", None)),
            "changeset": getattr(obj, "changeset", None),
            "uid": getattr(obj, "uid", None),
            "user": getattr(obj, "user", None),
        },
        source_modification_date=_safe_osm_timestamp(getattr(obj, "timestamp", None)),
        manifest=manifest,
        artifact_ids=["osm:geofabrik:south-africa-latest-pbf"],
        spatial_gate={
            "status": spatial_status,
            "catalogue_eligible": eligible,
            "validation_method": "OSM geometry/representative point against Gauteng ADM1 polygon",
        },
        cross_identifiers=cross_identifiers,
        proposed_type_hints=_osm_type_hints(native_place, tags) + relevance_hints,
    )
    record["is_development_candidate"] = native_place == "estate/residential_development_candidate"
    record["source_payload"]["relevant_object_count_seen"] = total_relevant
    return record


def _osm_type_hints(native_place: str, tags: dict[str, str]) -> list[str]:
    if native_place == "estate/residential_development_candidate":
        return ["estate/residential_development_candidate"]
    if native_place in {"city", "town", "village", "suburb", "neighbourhood", "quarter", "locality", "hamlet"}:
        return ["neighbourhood" if native_place == "quarter" else native_place]
    return ["other"]


def extract_osm(manifest: dict[str, Any], gate: GautengSpatialGate) -> tuple[list[dict[str, Any]], dict[str, int], list[str]]:
    path = RAW_ROOT / "osm" / "south-africa-latest.osm.pbf"
    if not path.exists():
        return [], {"before_relevant": 0, "after_gauteng": 0, "objects": 0}, ["OSM PBF artifact is absent"]
    try:
        import osmium  # type: ignore
    except ImportError:
        return [], {"before_relevant": 0, "after_gauteng": 0, "objects": 0}, ["pyosmium is not installed; OSM extraction was not run"]

    records: list[dict[str, Any]] = []
    counters = {"nodes": 0, "ways": 0, "relations": 0, "before_relevant": 0, "after_gauteng": 0}

    class Handler(osmium.SimpleHandler):  # type: ignore[misc]
        def _handle(self, obj: Any, element_type: str, coordinates: list[list[float]]) -> None:
            counters[f"{element_type}s"] += 1
            try:
                tags = {str(key): str(value) for key, value in obj.tags}
            except (TypeError, ValueError):
                tags = {
                    str(getattr(tag, "k")): str(getattr(tag, "v"))
                    for tag in obj.tags
                    if getattr(tag, "k", None) is not None
                }
            relevant, _, _ = _osm_relevant(tags)
            if not relevant:
                return
            counters["before_relevant"] += 1
            record = _osm_record(obj, element_type, tags, gate, manifest, coordinates, counters["before_relevant"])
            if record and record.get("catalogue_eligible"):
                records.append(record)
                counters["after_gauteng"] += 1

        def node(self, node: Any) -> None:
            try:
                coordinates = [[float(node.location.lon), float(node.location.lat)]] if node.location.valid() else []
            except (AttributeError, TypeError, ValueError):
                coordinates = []
            self._handle(node, "node", coordinates)

        def way(self, way: Any) -> None:
            self._handle(way, "way", _osm_coordinates(way.nodes))

        def relation(self, relation: Any) -> None:
            self._handle(relation, "relation", [])

    try:
        handler = Handler()
        handler.apply_file(str(path), locations=True)
    except Exception as exc:
        return records, counters, [f"OSM PBF parse failed after partial processing: {type(exc).__name__}: {exc}"]
    counters["objects"] = counters["nodes"] + counters["ways"] + counters["relations"]
    return records, counters, []


def _wikidata_binding_value(binding: dict[str, Any], key: str) -> str | None:
    value = binding.get(key, {}).get("value")
    return str(value) if value is not None else None


def _qid(value: str | None) -> str | None:
    if not value:
        return None
    match = re.search(r"(?:^|[/#])Q?(\d+)$", value, re.I)
    return f"Q{match.group(1)}" if match else None


def _wikidata_type_hints(instances: list[str]) -> list[str]:
    mapping = {
        "Q515": "city",
        "Q3957": "town",
        "Q532": "village",
        "Q486972": "locality",
        "Q13221722": "suburb",
        "Q123705": "neighbourhood",
        "Q702842": "quarter",
        "Q82794": "administrative_territorial_entity",
    }
    hints = [mapping[value.rsplit("/", 1)[-1]] for value in instances if value.rsplit("/", 1)[-1] in mapping]
    return hints or ["other"]


def extract_wikidata(
    manifest: dict[str, Any],
    gate: GautengSpatialGate,
    known_geonames_ids: set[str],
) -> tuple[list[dict[str, Any]], dict[str, int]]:
    records_by_qid: dict[str, dict[str, Any]] = {}
    before = 0
    files = sorted((RAW_ROOT / "wikidata").glob("wikidata-query-*.json"))
    for path in files:
        data = read_json(path, {}) or {}
        bindings = ((data.get("results") or {}).get("bindings") or []) if isinstance(data, dict) else []
        before += len(bindings)
        artifact_id = f"wikidata:sparql:{path.stem.rsplit('-', 1)[-1]}"
        for binding in bindings:
            item_url = _wikidata_binding_value(binding, "item")
            qid = _qid(item_url)
            if not qid:
                continue
            item = records_by_qid.setdefault(
                qid,
                {
                    "qid": qid,
                    "labels": [],
                    "aliases": [],
                    "descriptions": [],
                    "coordinates": [],
                    "parents": [],
                    "geonames": [],
                    "osm_relations": [],
                    "official_names": [],
                    "instances": [],
                    "artifact_ids": set(),
                    "bindings": [],
                },
            )
            item["artifact_ids"].add(artifact_id)
            item["bindings"].append(binding)
            for field, destination in (
                ("itemLabel", "labels"),
                ("alias", "aliases"),
                ("itemDescription", "descriptions"),
                ("coordinate", "coordinates"),
                ("parent", "parents"),
                ("geonames", "geonames"),
                ("osmRelation", "osm_relations"),
                ("officialName", "official_names"),
                ("instance", "instances"),
            ):
                value = _wikidata_binding_value(binding, field)
                if value and value not in item[destination]:
                    item[destination].append(value)

    records: list[dict[str, Any]] = []
    eligible_count = 0
    counts_by_artifact: dict[str, dict[str, int]] = {}
    for path in files:
        artifact_id = f"wikidata:sparql:{path.stem.rsplit('-', 1)[-1]}"
        data = read_json(path, {}) or {}
        bindings = ((data.get("results") or {}).get("bindings") or []) if isinstance(data, dict) else []
        counts_by_artifact[artifact_id] = {"before": len(bindings), "after": 0}
    for qid, item in sorted(records_by_qid.items()):
        label = next(iter(item["labels"]), None)
        aliases = item["official_names"] + item["aliases"] + item["labels"][1:]
        coordinates: list[tuple[float, float]] = []
        for value in item["coordinates"]:
            match = re.search(r"Point\(([-0-9.]+)\s+([-0-9.]+)\)", value)
            if match:
                coordinates.append((float(match.group(2)), float(match.group(1))))
        latitude, longitude = coordinates[0] if coordinates else (None, None)
        point_status = gate.point_status(latitude, longitude)
        geonames_ids = [value.rsplit("/", 1)[-1] for value in item["geonames"]]
        cross_inherited = bool(set(geonames_ids) & known_geonames_ids)
        eligible = point_status == "inside" or (point_status == "missing_coordinate" and cross_inherited)
        if not eligible:
            continue
        eligible_count += 1
        record = _base_record(
            source="wikidata",
            native_id=qid,
            native_classification={
                "instance_of": item["instances"],
                "description": item["descriptions"],
            },
            exact_name=label,
            aliases=aliases,
            historical_names=[],
            latitude=latitude,
            longitude=longitude,
            geometry=None,
            source_admin_context={"parents": item["parents"]},
            source_payload={
                "bindings": item["bindings"],
                "labels": item["labels"],
                "descriptions": item["descriptions"],
                "official_names": item["official_names"],
                "instances": item["instances"],
            },
            source_modification_date=None,
            manifest=manifest,
            artifact_ids=sorted(item["artifact_ids"]),
            spatial_gate={
                "status": "inside" if point_status == "inside" else "inherited_geonames_spatial_context",
                "catalogue_eligible": True,
                "spatial_validation": point_status,
                "validation_method": "Wikidata coordinate gate; missing coordinate may inherit only through a matched Gauteng GeoNames ID",
            },
            cross_identifiers={
                "wikidata": [qid],
                "geonames": geonames_ids,
                "osm_relation": [value.rsplit("/", 1)[-1] for value in item["osm_relations"]],
            },
            proposed_type_hints=_wikidata_type_hints(item["instances"]),
        )
        records.append(record)
        for artifact_id in item["artifact_ids"]:
            counts_by_artifact.setdefault(artifact_id, {"before": 0, "after": 0})["after"] += 1
    return records, {
        "before_bindings": before,
        "unique_items": len(records_by_qid),
        "after_gauteng": eligible_count,
        "by_artifact": counts_by_artifact,
    }


def _gns_field(row: dict[str, str], *names: str) -> str | None:
    normalized = {key.strip().casefold(): value for key, value in row.items()}
    for name in names:
        value = normalized.get(name.casefold())
        if value:
            return value.strip()
    return None


def extract_nga(manifest: dict[str, Any], gate: GautengSpatialGate) -> tuple[list[dict[str, Any]], dict[str, int], list[str]]:
    path = RAW_ROOT / "nga-gns" / "South Africa.zip"
    if not path.exists():
        return [], {"before": 0, "after_gauteng": 0}, ["NGA South Africa country file was not acquired"]
    records: list[dict[str, Any]] = []
    before = 0
    selected = 0
    limitations: list[str] = []
    try:
        with zipfile.ZipFile(path) as archive:
            members = [member for member in archive.namelist() if not member.endswith("/")]
            data_members = [member for member in members if member.casefold().endswith((".txt", ".tsv", ".csv"))]
            if not data_members:
                raise ValueError("NGA country ZIP contains no delimited data member")
            member = max(data_members, key=lambda value: archive.getinfo(value).file_size)
            with archive.open(member) as raw:
                text = raw.read().decode("utf-8-sig", errors="replace")
            rows = csv.DictReader(text.splitlines(), delimiter="\t")
            if not rows.fieldnames:
                raise ValueError("NGA country data did not expose a header row")
            for row in rows:
                before += 1
                row = {str(key): str(value or "") for key, value in row.items()}
                name = _gns_field(
                    row,
                    "FULL_NAME_ND",
                    "FULL_NM_ND",
                    "FULL_NAME",
                    "NAME",
                    "NAME_ND",
                    "SORT_NAME",
                )
                latitude = as_float(_gns_field(row, "LAT", "LATITUDE", "LAT_DEC", "LAT_DD"))
                longitude = as_float(_gns_field(row, "LONG", "LON", "LONGITUDE", "LONG_DEC", "LONG_DD"))
                point_status = gate.point_status(latitude, longitude)
                if point_status != "inside":
                    continue
                selected += 1
                ufi = _gns_field(row, "UFI") or f"row-{before}"
                uni = _gns_field(row, "UNI") or ""
                historic_marker = _gns_field(
                    row,
                    "DATE_TO",
                    "TERMINATION_DATE",
                    "TERM_DT_F",
                    "TERM_DT_N",
                )
                aliases = [
                    value
                    for value in (
                        _gns_field(row, "FULL_NAME_RO", "FULL_NM_RO"),
                        _gns_field(row, "SHORT_NAME"),
                        _gns_field(row, "SORT_NAME"),
                    )
                    if value
                ]
                historical = [name] if _gns_field(row, "DATE_TO", "TERMINATION_DATE", "TERM_DT_F", "TERM_DT_N") else []
                feature_class = _gns_field(row, "FC", "FEATURE_CLASS")
                designation = _gns_field(row, "DSG", "DESIG_CD", "FEATURE_DESIGNATION")
                source_modification = _gns_field(
                    row,
                    "DATE_FROM",
                    "EFFECTIVE_DATE",
                    "EFCTV_DT",
                    "MODIFY_DATE",
                    "MOD_DT_FT",
                    "MOD_DT_NM",
                )
                record = _base_record(
                    source="nga_gns",
                    native_id=f"{ufi}:{uni}:{before}",
                    native_classification={
                        "ufi": ufi,
                        "uni": uni,
                        "feature_class": feature_class,
                        "designation": designation,
                        "name_rank": _gns_field(row, "NAME_RANK"),
                        "language": _gns_field(row, "LANGUAGE", "LANG", "LANG_CD"),
                        "script": _gns_field(row, "SCRIPT", "SCRIPT_CD"),
                    },
                    exact_name=name,
                    aliases=aliases,
                    historical_names=historical,
                    latitude=latitude,
                    longitude=longitude,
                    geometry=None,
                    source_admin_context={
                        key: _gns_field(row, key)
                        for key in (
                            "CC1",
                            "CC_FT",
                            "ADM1",
                            "ADM2",
                            "ADM3",
                            "ADM4",
                        )
                        if _gns_field(row, key)
                    },
                    source_payload={"zip_member": member, "raw_fields": row, "historic_marker": historic_marker},
                    source_modification_date=source_modification,
                    manifest=manifest,
                    artifact_ids=["nga_gns:country:zaf"],
                    spatial_gate={
                        "status": "inside",
                        "catalogue_eligible": True,
                        "validation_method": "NGA country record coordinate against Gauteng ADM1 polygon",
                    },
                    cross_identifiers={"nga_ufi": [ufi], "nga_uni": [uni] if uni else []},
                    proposed_type_hints=_gns_type_hints(feature_class, designation),
                )
                records.append(record)
    except Exception as exc:
        limitations.append(f"NGA parse failed: {type(exc).__name__}: {exc}")
    return records, {"before": before, "after_gauteng": selected}, limitations


def _gns_type_hints(feature_class: str | None, designation: str | None) -> list[str]:
    feature = (feature_class or "").casefold()
    designation_code = (designation or "").casefold()
    combined = f"{feature} {designation_code}"
    if "populated" in combined or feature == "p" or designation_code.startswith("ppl"):
        return ["locality", "town", "village"]
    if "administr" in combined or feature == "a":
        return ["administrative_territorial_entity"]
    if feature == "l" or designation_code in {"lcty", "pcl", "ppla"}:
        return ["locality"]
    return ["other"]


def _write_assertions(records: list[dict[str, Any]]) -> int:
    assertions: list[dict[str, Any]] = []
    for record in records:
        source_id = record["source_record_id"]
        base = {
            "source_record_id": source_id,
            "source": record["source"],
            "licence_class": record["licence_class"],
            "attribution": record["attribution"],
            "retrieved_at": record.get("retrieved_at"),
        }
        values: list[tuple[str, Any]] = [
            ("exact_name", record.get("exact_source_name")),
            ("normalized_lookup_form", record.get("normalized_lookup_form")),
            ("source_native_classification", record.get("source_native_classification")),
            ("source_admin_context", record.get("source_admin_context")),
            ("spatial_gate", record.get("gauteng_spatial_gate")),
            ("source_modification_date", record.get("source_modification_date")),
        ]
        for alias in record.get("aliases_supplied_by_source", []):
            values.append(("alias", alias))
        for historical_name in record.get("historical_names_supplied_by_source", []):
            values.append(("historical_name", historical_name))
        for key, identifiers in (record.get("cross_identifiers") or {}).items():
            values.append((f"cross_identifier:{key}", identifiers))
        if record.get("latitude") is not None and record.get("longitude") is not None:
            values.append(("coordinate", {"latitude": record["latitude"], "longitude": record["longitude"]}))
        if record.get("geometry") is not None:
            values.append(("geometry", record["geometry"]))
        for assertion_type, value in values:
            if value is None or value == "" or value == [] or value == {}:
                continue
            assertions.append(
                {
                    **base,
                    "assertion_id": assertion_id(source_id, assertion_type, value),
                    "assertion_type": assertion_type,
                    "value": value,
                    "evidence_reference": {
                        "source_native_id": record["source_native_id"],
                        "source_artifact_ids": record.get("source_artifact_ids", []),
                    },
                }
            )
    return write_jsonl(SOURCE_ASSERTIONS_PATH, assertions, sort_key="assertion_id")


def _update_manifest_counts(manifest: dict[str, Any], counts: dict[str, dict[str, int | None]]) -> None:
    for artifact in manifest.get("artifacts", []):
        stats = counts.get(str(artifact.get("artifact_id")))
        if not stats:
            continue
        if "before" in stats:
            artifact["record_count_before_filter"] = stats["before"]
        if "after" in stats:
            artifact["record_count_after_gauteng_filter"] = stats["after"]
        if "relevant_named_objects" in stats:
            artifact["record_count_after_relevance_filter"] = stats["relevant_named_objects"]
        if "errors" in stats:
            # Counts are produced by the current extraction pass. Replace any
            # stale limitation from an earlier retry rather than carrying it
            # into a successful rebuild.
            artifact["errors_limitations"] = list(stats["errors"] or [])


def build_source_records(manifest: dict[str, Any], include_wikidata: bool = True) -> dict[str, Any]:
    gate, boundary_records, boundary_counts = extract_geoboundaries(manifest)
    geonames_records, geonames_counts = extract_geonames(manifest, gate)
    osm_records, osm_counts, osm_errors = extract_osm(manifest, gate)
    known_geonames_ids = {record["source_native_id"] for record in geonames_records}
    wikidata_records, wikidata_counts = (
        extract_wikidata(manifest, gate, known_geonames_ids) if include_wikidata else ([], {})
    )
    nga_records, nga_counts, nga_errors = extract_nga(manifest, gate)
    records = boundary_records + geonames_records + osm_records + wikidata_records + nga_records
    records.sort(key=lambda record: record["source_record_id"])
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    record_count = write_jsonl(SOURCE_RECORDS_PATH, records, sort_key="source_record_id")
    assertion_count = _write_assertions(records)

    counts: dict[str, dict[str, int | None]] = {
        "geoboundaries:geojson:adm1": {"before": boundary_counts.get("before_ADM1"), "after": boundary_counts.get("after_ADM1")},
        "geoboundaries:geojson:adm2": {"before": boundary_counts.get("before_ADM2"), "after": boundary_counts.get("after_ADM2")},
        "geoboundaries:geojson:adm3": {"before": boundary_counts.get("before_ADM3"), "after": boundary_counts.get("after_ADM3")},
        "geonames:ZA.zip": {"before": geonames_counts.get("before"), "after": geonames_counts.get("after")},
        "geonames:alternatenames:ZA.zip": {"before": geonames_counts.get("alternate_name_rows")},
        "geonames:admin1CodesASCII.txt": {"before": geonames_counts.get("admin1_rows")},
        "geonames:admin2Codes.txt": {"before": geonames_counts.get("admin2_rows")},
        "geonames:featureCodes_en.txt": {"before": geonames_counts.get("feature_code_rows")},
        "geonames:hierarchy.zip": {"before": geonames_counts.get("hierarchy_rows")},
        "osm:geofabrik:south-africa-latest-pbf": {
            "before": osm_counts.get("objects"),
            "after": osm_counts.get("after_gauteng"),
            "relevant_named_objects": osm_counts.get("before_relevant"),
            "errors": osm_errors,
        },
        "nga_gns:country:zaf": {
            "before": nga_counts.get("before"),
            "after": nga_counts.get("after_gauteng"),
            "errors": nga_errors,
        },
    }
    if include_wikidata:
        counts.update(
            {
                artifact_id: {
                    "before": stats.get("before", 0),
                    "after": stats.get("after", 0),
                    "errors": [],
                }
                for artifact_id, stats in wikidata_counts.get("by_artifact", {}).items()
            }
        )
    _update_manifest_counts(manifest, counts)
    return {
        "gate": gate,
        "records": records,
        "counts": {
            "source_records": record_count,
            "source_assertions": assertion_count,
            "by_source": {
                source: sum(1 for record in records if record["source"] == source)
                for source in sorted({record["source"] for record in records})
            },
            "geoboundaries": boundary_counts,
            "geonames": geonames_counts,
            "osm": osm_counts,
            "wikidata": wikidata_counts,
            "nga_gns": nga_counts,
        },
        "errors": osm_errors + nga_errors,
    }
