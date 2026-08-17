from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable

from .common import haversine_km, normalize_lookup, read_jsonl, write_csv, write_json, write_jsonl


PROMOTION_POLICY_VERSION = "0.2.0"
PROMOTION_OUTPUT_VERSION = "v0.2"
DUPLICATE_REVIEW_DISTANCE_KM = 0.5

AUTO_PROMOTABLE = "auto_promotable_factual_identity"
PROVISIONAL_ATTRIBUTES = "promotable_with_provisional_attributes"
FOUNDER_REVIEW = "founder_review_required"
CANDIDATE_ONLY = "candidate_only"
REJECTED = "rejected_non_independent"

PROMOTION_CLASSES = (
    AUTO_PROMOTABLE,
    PROVISIONAL_ATTRIBUTES,
    FOUNDER_REVIEW,
    CANDIDATE_ONLY,
    REJECTED,
)

FACTUAL_GEOGRAPHY_TYPES = {
    "province",
    "metropolitan_municipality",
    "district_municipality",
    "local_municipality",
    "city",
    "town",
    "township",
    "suburb",
    "neighbourhood",
    "locality",
    "village",
}
ADMINISTRATIVE_TYPES = {
    "province",
    "metropolitan_municipality",
    "district_municipality",
    "local_municipality",
}
OSM_PLACE_TYPES = {
    "city",
    "town",
    "village",
    "suburb",
    "quarter",
    "neighbourhood",
    "locality",
    "hamlet",
}
OSM_AREA_ELEMENT_TYPES = {"way", "relation"}
SOURCE_REPRESENTATION_PLACE_PRIORITY = {
    "city": 7,
    "town": 6,
    "village": 5,
    "suburb": 4,
    "quarter": 3,
    "neighbourhood": 2,
    "locality": 1,
    "hamlet": 0,
}
FARM_FEATURE_CODES = {"FRM", "FRMQ", "FRMS"}
DEVELOPMENT_RESIDENTIAL_VALUES = {
    "apartments",
    "complex",
    "condominium",
    "duplex",
    "gated",
    "sectional_title",
    "single_family",
    "terrace",
    "townhouse",
    "urban",
}

# These labels occur on OSM landuse=residential objects without an OSM place
# classification. They describe an object or land-use category, not an
# independently named geographic identity. The list is intentionally narrow.
GENERIC_OSM_RESIDENTIAL_NAMES = {
    "flower garden",
    "home",
    "house",
    "informal settlement",
    "open lot",
    "residential",
    "residential area",
    "tennis court",
}

REQUIRED_PROBES = (
    "Johannesburg",
    "Pretoria",
    "Sandton",
    "Randburg",
    "Rosebank",
    "Bryanston",
    "Fourways",
    "North Riding",
    "Kyalami",
    "Midrand",
    "Centurion",
    "Soweto",
    "Mamelodi",
    "Benoni",
    "Boksburg",
    "Kempton Park",
    "Alberton",
    "Roodepoort",
    "Germiston",
    "Vereeniging",
    "Vanderbijlpark",
)


def _read_required_jsonl(root: Path, filename: str) -> list[dict[str, Any]]:
    path = root / filename
    if not path.is_file():
        raise FileNotFoundError(f"Required catalogue artifact is missing: {path}")
    return list(read_jsonl(path))


def load_catalogue_inputs(catalogue_root: Path) -> dict[str, Any]:
    """Load existing catalogue artifacts without writing to their source root."""

    output_root = catalogue_root / "output"
    candidates = _read_required_jsonl(output_root, "gauteng_candidate_catalogue_v0.1.jsonl")
    matches = _read_required_jsonl(output_root, "gauteng_candidate_matches_v0.1.jsonl")
    source_records = _read_required_jsonl(output_root, "gauteng_source_records_v0.1.jsonl")
    assertions = _read_required_jsonl(output_root, "gauteng_source_assertions_v0.1.jsonl")
    coverage = json.loads((output_root / "gauteng_coverage_conflict_report_v0.1.json").read_text(encoding="utf-8"))
    run_metadata = json.loads((output_root / "gauteng_catalogue_run_v0.1.json").read_text(encoding="utf-8"))
    return {
        "catalogue_root": catalogue_root,
        "output_root": output_root,
        "candidates": candidates,
        "matches": matches,
        "source_records": source_records,
        "assertions": assertions,
        "coverage": coverage,
        "run_metadata": run_metadata,
    }


def _context_signature(candidate: dict[str, Any]) -> tuple[tuple[str, str], ...]:
    context = candidate.get("administrative_context") or {}
    values: list[tuple[str, str]] = []
    for level in ("province", "adm2", "adm3"):
        value = context.get(level)
        if isinstance(value, dict):
            values.append((level, str(value.get("name") or "").casefold()))
        elif isinstance(value, list):
            for item in value:
                if isinstance(item, dict):
                    values.append((level, str(item.get("name") or "").casefold()))
    return tuple(values)


def _osm_record_features(record: dict[str, Any]) -> dict[str, Any]:
    classification = record.get("source_native_classification") or {}
    tags = (record.get("source_payload") or {}).get("tags") or {}
    return {
        "source_record_id": record.get("source_record_id"),
        "source_native_id": record.get("source_native_id"),
        "element_type": classification.get("element_type") or record.get("element_type"),
        "place": classification.get("place") or tags.get("place"),
        "landuse": classification.get("landuse") or tags.get("landuse"),
        "residential": classification.get("residential") or tags.get("residential"),
        "boundary": classification.get("boundary") or tags.get("boundary"),
        "wikidata": tags.get("wikidata"),
        "wikipedia": tags.get("wikipedia"),
    }


def _candidate_osm_objects(
    candidate: dict[str, Any],
    source_records_by_id: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    return [
        _osm_record_features(record)
        for source_id in candidate.get("source_ids", [])
        for record in [source_records_by_id.get(source_id.get("source_record_id"))]
        if record and record.get("source") == "osm"
    ]


def _source_representation_evidence(
    left: dict[str, Any],
    right: dict[str, Any],
    source_records_by_id: dict[str, dict[str, Any]],
) -> dict[str, Any] | None:
    """Detect a bounded OSM node/area representation pair.

    This is deliberately narrower than same-name proximity. A node and a way
    (or relation) with the same source name/context and complementary place or
    residential-area tags are treated as likely representations of one mapped
    place. Two nodes, two areas, or two independent source records do not pass
    this test and remain separate interpretations.
    """

    left_objects = _candidate_osm_objects(left, source_records_by_id)
    right_objects = _candidate_osm_objects(right, source_records_by_id)
    for left_object in left_objects:
        for right_object in right_objects:
            element_types = {left_object.get("element_type"), right_object.get("element_type")}
            if not ("node" in element_types and element_types.intersection(OSM_AREA_ELEMENT_TYPES)):
                continue
            place_values = {
                str(value)
                for value in (left_object.get("place"), right_object.get("place"))
                if value
            }
            area_values = {
                str(value)
                for value in (left_object.get("landuse"), right_object.get("boundary"))
                if value
            }
            if not place_values and not area_values:
                continue
            if not (place_values.intersection(OSM_PLACE_TYPES) or "residential" in area_values):
                continue
            return {
                "source_record_id_a": left_object["source_record_id"],
                "source_record_id_b": right_object["source_record_id"],
                "source_native_id_a": left_object["source_native_id"],
                "source_native_id_b": right_object["source_native_id"],
                "element_type_a": left_object["element_type"],
                "element_type_b": right_object["element_type"],
                "place_values": sorted(place_values),
                "area_values": sorted(area_values),
                "method": "osm_node_area_same_name_context",
                "reason": "same OSM name/context has complementary point and area representations",
            }
    return None


def _representation_priority(
    candidate: dict[str, Any],
    source_records_by_id: dict[str, dict[str, Any]],
) -> tuple[Any, ...]:
    objects = _candidate_osm_objects(candidate, source_records_by_id)
    place_priority = max(
        (SOURCE_REPRESENTATION_PLACE_PRIORITY.get(str(item.get("place")), -1) for item in objects),
        default=-1,
    )
    direct = any(
        edge.get("match_method") == "direct_cross_identifier"
        for edge in candidate.get("reconciliation_edges", [])
    )
    non_osm_source = any(source != "osm" for source in candidate.get("source_names", []))
    factual_type = candidate.get("candidate_type") in FACTUAL_GEOGRAPHY_TYPES
    # Sort ascending so the final candidate ID tie-break is deterministic.
    return (
        -int(direct),
        -int(non_osm_source),
        -int(candidate.get("source_count", 0)),
        -int(factual_type),
        -place_priority,
        -len(candidate.get("source_ids", [])),
        str(candidate.get("candidate_location_id")),
    )


def _duplicate_analysis(
    candidates: list[dict[str, Any]],
    source_records_by_id: dict[str, dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    by_name: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for candidate in candidates:
        by_name[str(candidate.get("normalized_name") or "")].append(candidate)

    analysis: dict[str, dict[str, Any]] = {}
    for normalized_name, group in by_name.items():
        group = sorted(group, key=lambda row: str(row.get("candidate_location_id")))
        group_ids = [str(row["candidate_location_id"]) for row in group]
        close_pairs: list[dict[str, Any]] = []
        representation_pairs: list[dict[str, Any]] = []
        close_candidate_ids: set[str] = set()
        identity_collision_ids: set[str] = set()
        for index, left in enumerate(group):
            for right in group[index + 1 :]:
                if _context_signature(left) != _context_signature(right):
                    continue
                distance = haversine_km(
                    left.get("representative_latitude"),
                    left.get("representative_longitude"),
                    right.get("representative_latitude"),
                    right.get("representative_longitude"),
                )
                if distance is not None and distance <= DUPLICATE_REVIEW_DISTANCE_KM:
                    close_candidate_ids.update(
                        {str(left["candidate_location_id"]), str(right["candidate_location_id"])}
                    )
                    pair = {
                        "candidate_location_id_a": left["candidate_location_id"],
                        "candidate_location_id_b": right["candidate_location_id"],
                        "distance_km": round(distance, 3),
                    }
                    close_pairs.append(pair)
                    representation = _source_representation_evidence(
                        left,
                        right,
                        source_records_by_id,
                    )
                    if representation:
                        representation_pairs.append({**pair, "evidence": representation})
                    else:
                        identity_collision_ids.update(
                            {str(left["candidate_location_id"]), str(right["candidate_location_id"])}
                        )

        representation_parent = {str(candidate["candidate_location_id"]): str(candidate["candidate_location_id"]) for candidate in group}

        def find(candidate_id: str) -> str:
            parent = representation_parent[candidate_id]
            while parent != representation_parent[parent]:
                representation_parent[parent] = representation_parent[representation_parent[parent]]
                parent = representation_parent[parent]
            return parent

        def union(left_id: str, right_id: str) -> None:
            left_root = find(left_id)
            right_root = find(right_id)
            if left_root != right_root:
                representation_parent[right_root] = left_root

        for pair in representation_pairs:
            union(str(pair["candidate_location_id_a"]), str(pair["candidate_location_id_b"]))

        representation_components: dict[str, list[str]] = defaultdict(list)
        for candidate in group:
            candidate_id = str(candidate["candidate_location_id"])
            if any(
                candidate_id in {str(pair["candidate_location_id_a"]), str(pair["candidate_location_id_b"])}
                for pair in representation_pairs
            ):
                representation_components[find(candidate_id)].append(candidate_id)
        representation_roles: dict[str, dict[str, Any]] = {}
        for component_ids in representation_components.values():
            component_candidates = [
                candidate for candidate in group if str(candidate["candidate_location_id"]) in component_ids
            ]
            primary = sorted(
                component_candidates,
                key=lambda candidate: _representation_priority(candidate, source_records_by_id),
            )[0]
            primary_id = str(primary["candidate_location_id"])
            component_pairs = [
                pair
                for pair in representation_pairs
                if str(pair["candidate_location_id_a"]) in component_ids
                and str(pair["candidate_location_id_b"]) in component_ids
            ]
            for candidate_id in component_ids:
                representation_roles[candidate_id] = {
                    "role": "primary" if candidate_id == primary_id else "secondary",
                    "representative_candidate_id": primary_id,
                    "evidence": component_pairs,
                }

        for candidate in group:
            candidate_id = str(candidate["candidate_location_id"])
            representation = representation_roles.get(candidate_id)
            identity_collision = candidate_id in identity_collision_ids
            if representation and representation["role"] == "secondary":
                duplicate_name_action = "source_representation_duplicate"
            elif identity_collision:
                duplicate_name_action = "identity_collision_review"
            elif representation:
                duplicate_name_action = "source_representation_primary"
            else:
                duplicate_name_action = "preserve_separate" if len(group) > 1 else "not_applicable"
            analysis[candidate_id] = {
                "normalized_name_group_size": len(group),
                "normalized_name_group_candidate_ids": group_ids,
                "duplicate_name_action": duplicate_name_action,
                "close_same_context_pairs": close_pairs,
                "close_same_context": candidate_id in close_candidate_ids,
                "identity_collision": identity_collision,
                "source_representation_pairs": representation_pairs,
                "source_representation": representation or {
                    "role": "none",
                    "representative_candidate_id": None,
                    "evidence": [],
                },
            }
    return analysis


def _source_features(
    candidate: dict[str, Any],
    source_records_by_id: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    records = [
        source_records_by_id[source_id["source_record_id"]]
        for source_id in candidate.get("source_ids", [])
        if source_id.get("source_record_id") in source_records_by_id
    ]
    osm_place_values: set[str] = set()
    osm_landuse_values: set[str] = set()
    osm_residential_values: set[str] = set()
    osm_identifier_tags: Counter[str] = Counter()
    osm_alias_tags: Counter[str] = Counter()
    geonames_feature_classes: Counter[str] = Counter()
    geonames_feature_codes: Counter[str] = Counter()
    spatial_statuses: Counter[str] = Counter()
    osm_element_types: Counter[str] = Counter()
    osm_boundary_values: Counter[str] = Counter()
    non_osm_classifications: list[dict[str, Any]] = []
    sources = sorted({str(record.get("source")) for record in records if record.get("source")})

    for record in records:
        gate = record.get("gauteng_spatial_gate") or {}
        if gate.get("status"):
            spatial_statuses[str(gate["status"])] += 1
        if record.get("source") == "osm":
            classification = record.get("source_native_classification") or {}
            tags = (record.get("source_payload") or {}).get("tags") or {}
            place = classification.get("place") or tags.get("place")
            landuse = classification.get("landuse") or tags.get("landuse")
            residential = classification.get("residential") or tags.get("residential")
            element_type = classification.get("element_type") or record.get("element_type")
            if place:
                osm_place_values.add(str(place))
            if landuse:
                osm_landuse_values.add(str(landuse))
            if residential:
                osm_residential_values.add(str(residential))
            if element_type:
                osm_element_types[str(element_type)] += 1
            boundary = classification.get("boundary") or tags.get("boundary")
            if boundary:
                osm_boundary_values[str(boundary)] += 1
            for key in ("wikidata", "wikipedia"):
                if tags.get(key):
                    osm_identifier_tags[key] += 1
            for key in ("alt_name", "official_name", "old_name"):
                if tags.get(key):
                    osm_alias_tags[key] += 1
        if record.get("source") == "geonames":
            classification = record.get("source_native_classification") or {}
            if classification.get("feature_class"):
                geonames_feature_classes[str(classification["feature_class"])] += 1
            if classification.get("feature_code"):
                geonames_feature_codes[str(classification["feature_code"])] += 1
        if record.get("source") != "osm":
            classification = record.get("source_native_classification") or {}
            non_osm_classifications.append(
                {
                    "source": record.get("source"),
                    "feature_class": classification.get("feature_class"),
                    "feature_code": classification.get("feature_code"),
                    "designation": classification.get("designation"),
                    "proposed_type_hints": record.get("proposed_type_hints", []),
                }
            )

    clear_osm_place = bool(osm_place_values.intersection(OSM_PLACE_TYPES))
    source_count = len(sources)
    return {
        "records": records,
        "sources": sources,
        "source_count": source_count,
        "osm_place_values": sorted(osm_place_values),
        "osm_landuse_values": sorted(osm_landuse_values),
        "osm_residential_values": sorted(osm_residential_values),
        "osm_identifier_tags": dict(sorted(osm_identifier_tags.items())),
        "osm_alias_tags": dict(sorted(osm_alias_tags.items())),
        "geonames_feature_classes": dict(sorted(geonames_feature_classes.items())),
        "geonames_feature_codes": dict(sorted(geonames_feature_codes.items())),
        "spatial_statuses": dict(sorted(spatial_statuses.items())),
        "osm_element_types": dict(sorted(osm_element_types.items())),
        "osm_boundary_values": dict(sorted(osm_boundary_values.items())),
        "non_osm_classifications": non_osm_classifications,
        "non_osm_is_farm": any(
            item.get("feature_class") == "S"
            and (item.get("feature_code") in FARM_FEATURE_CODES or item.get("designation") in FARM_FEATURE_CODES)
            for item in non_osm_classifications
        ),
        "has_osm_place": clear_osm_place,
        "has_non_osm_source": any(source != "osm" for source in sources),
        "record_count": len(records),
    }


def _match_features(
    candidate: dict[str, Any],
    matches_by_candidate: dict[str, list[dict[str, Any]]],
) -> dict[str, Any]:
    candidate_id = str(candidate["candidate_location_id"])
    matches = matches_by_candidate.get(candidate_id, [])
    edges = candidate.get("reconciliation_edges") or []
    methods = Counter(str(edge.get("match_method")) for edge in edges if edge.get("match_method"))
    statuses = Counter(str(match.get("match_status")) for match in matches if match.get("match_status"))
    conflict_reasons = sorted(
        {
            str(reason)
            for match in matches
            for reason in match.get("conflict_reason", [])
            if reason
        }
    )
    direct = methods.get("direct_cross_identifier", 0) > 0
    exact = methods.get("exact_contextual", 0) > 0
    fuzzy_proposals = sum(1 for match in matches if match.get("match_method") == "fuzzy_string_similarity")
    boundary_conflict = bool(candidate.get("conflicts")) or "inside_admin_code_conflict" in conflict_reasons
    material_identity_conflict = any(
        reason not in {"inside_admin_code_conflict", "source_native_type_disagreement_preserved"}
        for reason in conflict_reasons
    )
    return {
        "edge_methods": dict(sorted(methods.items())),
        "match_statuses": dict(sorted(statuses.items())),
        "conflict_reasons": conflict_reasons,
        "direct_cross_identifier": direct,
        "exact_contextual": exact,
        "fuzzy_proposal_count": fuzzy_proposals,
        "boundary_conflict": boundary_conflict,
        "material_identity_conflict": material_identity_conflict,
    }


def _licence_state(licence_classes: Iterable[str]) -> tuple[str, bool, str]:
    classes = {str(value) for value in licence_classes if value}
    contains_odbl = "ODBL_1" in classes
    if contains_odbl and len(classes) == 1:
        state = "ODBL_ONLY"
    elif contains_odbl:
        state = "MIXED_INCLUDES_ODBL"
    else:
        state = "PERMISSIVE_OR_ATTRIBUTION_ONLY"
    if contains_odbl:
        gate = "OSM attribution and downstream ODbL database-strategy review required before production use"
    elif "CC_BY_4" in classes or "CC_BY" in classes:
        gate = "source attribution must remain attached to the promoted evidence"
    else:
        gate = "retain source licence provenance"
    return state, contains_odbl, gate


def _identity_evidence_label(
    candidate: dict[str, Any],
    source: dict[str, Any],
    match: dict[str, Any],
) -> tuple[str, str, bool, bool]:
    candidate_type = str(candidate.get("candidate_type") or "")
    administrative_frame = bool(
        "geoboundaries" in source["sources"] and candidate_type in ADMINISTRATIVE_TYPES
    )
    direct = bool(match["direct_cross_identifier"])
    exact = bool(match["exact_contextual"])
    very_strong = administrative_frame or direct or (source["source_count"] >= 3 and exact)
    robust = very_strong or (source["source_count"] >= 2 and exact)
    if administrative_frame:
        label = "authoritative_administrative_frame"
    elif direct:
        label = "direct_cross_identifier"
    elif source["source_count"] >= 3 and exact:
        label = "three_or_more_source_contextual_match"
    elif source["source_count"] >= 2 and exact:
        label = "multi_source_contextual_match"
    elif source["has_osm_place"]:
        label = "OSM_place_single_source"
    elif source["source_count"] == 1:
        label = "single_source_baseline"
    else:
        label = "multi_source_without_promoting_match"
    return label, ("high" if very_strong else "moderate" if robust or source["has_osm_place"] else "low"), very_strong, robust


def _generic_osm_residential(candidate: dict[str, Any], source: dict[str, Any]) -> bool:
    if not candidate.get("osm_only") or candidate.get("candidate_type") != "estate/residential_development_candidate":
        return False
    normalized_name = str(candidate.get("normalized_name") or "")
    return normalized_name in GENERIC_OSM_RESIDENTIAL_NAMES or bool(re.fullmatch(r"\d+", normalized_name))


def _type_assessment(
    candidate: dict[str, Any],
    source: dict[str, Any],
) -> tuple[str, str, str | None]:
    """Separate source-derived candidate type from the v0.2 assessment."""

    raw_type = str(candidate.get("candidate_type") or "")
    if raw_type != "estate/residential_development_candidate":
        return raw_type, "source_proposed", None
    if source["has_osm_place"]:
        proposed_place = sorted(
            source["osm_place_values"],
            key=lambda value: (-SOURCE_REPRESENTATION_PLACE_PRIORITY.get(value, -1), value),
        )[0]
        return (
            proposed_place,
            "ordinary_factual_osm_place",
            "OSM place=* evidence is treated as a factual place type; landuse=residential does not make it an estate",
        )
    if _generic_osm_residential(candidate, source):
        return (
            "other",
            "generic_residential_object",
            "generic or numeric landuse=residential label is not an independent named geography",
        )
    if source["non_osm_is_farm"] and not source["osm_identifier_tags"]:
        return (
            "other",
            "non_development_source_classification",
            "non-OSM evidence classifies the same name as a farm rather than a residential development",
        )
    if source["osm_residential_values"]:
        return (
            raw_type,
            "named_residential_development_evidence",
            "named OSM residential object is retained as a provisional development candidate",
        )
    return (
        raw_type,
        "named_residential_landuse_only",
        "named OSM landuse=residential object remains an unverified development candidate",
    )


def _attribute_summary(
    candidate: dict[str, Any],
    source: dict[str, Any],
    match: dict[str, Any],
    duplicate: dict[str, Any],
) -> tuple[dict[str, Any], list[str]]:
    unresolved: list[str] = []
    type_disagreement = candidate.get("candidate_type_status") == "source_disagreement"
    assessed_type, type_assessment, type_assessment_reason = _type_assessment(candidate, source)
    identity_label, identity_confidence, _, _ = _identity_evidence_label(candidate, source, match)
    if type_disagreement:
        unresolved.append("candidate_type")
    if assessed_type != candidate.get("candidate_type") or type_assessment.startswith("named_residential"):
        unresolved.append("candidate_type")
    if match["boundary_conflict"]:
        unresolved.append("administrative_context")
    if assessed_type == "estate/residential_development_candidate":
        unresolved.append("estate_or_development_product_class")
    if duplicate.get("identity_collision"):
        unresolved.append("independent_identity_vs_duplicate_source_object")
    return {
        "identity": {
            "confidence": identity_confidence,
            "evidence_class": identity_label,
        },
        "name": {
            "confidence": "high" if source["source_count"] > 1 or match["direct_cross_identifier"] else "medium",
            "preferred_name": candidate.get("preferred_name"),
            "aliases_present": bool(candidate.get("aliases")),
            "historical_names_present": bool(candidate.get("historical_names")),
        },
        "type": {
            "confidence": "provisional"
            if type_disagreement or assessed_type != candidate.get("candidate_type") or type_assessment.startswith("named_residential")
            else "supported",
            "proposed_type": candidate.get("candidate_type"),
            "assessed_type": assessed_type,
            "assessment": type_assessment,
            "assessment_reason": type_assessment_reason,
            "source_native_hints": candidate.get("candidate_type_source_hints", []),
        },
        "administrative_assignment": {
            "confidence": "needs_source_verification" if match["boundary_conflict"] else "supported",
            "status": "source_admin_conflict" if match["boundary_conflict"] else "spatial_context_agrees",
        },
        "spatial": {
            "confidence": "provisional" if match["boundary_conflict"] else "supported",
            "representative_point_present": candidate.get("representative_latitude") is not None
            and candidate.get("representative_longitude") is not None,
            "gauteng_gate": "inside_or_intersects",
        },
        "duplicate_name": {
            "confidence": "review_required" if duplicate.get("identity_collision") else "not_blocking",
            "action": duplicate.get("duplicate_name_action"),
            "group_size": duplicate.get("normalized_name_group_size", 1),
        },
        "unresolved_attributes": sorted(set(unresolved)),
    }, sorted(set(unresolved))


def classify_candidate(
    candidate: dict[str, Any],
    source: dict[str, Any],
    match: dict[str, Any],
    duplicate: dict[str, Any],
) -> tuple[str, list[str]]:
    candidate_type, type_assessment, type_assessment_reason = _type_assessment(candidate, source)
    raw_candidate_type = str(candidate.get("candidate_type") or "")
    factual_type = candidate_type in FACTUAL_GEOGRAPHY_TYPES
    generic_osm = _generic_osm_residential(candidate, source)
    identity_label, _, very_strong, robust = _identity_evidence_label(candidate, source, match)
    clear_osm_place = bool(candidate.get("osm_only") and source["has_osm_place"])
    type_disagreement = candidate.get("candidate_type_status") == "source_disagreement"
    source_representation = duplicate.get("source_representation") or {}

    if source_representation.get("role") == "secondary":
        return REJECTED, [
            "source object is a deterministic OSM point/area representation of "
            f"{source_representation.get('representative_candidate_id')}; evidence remains attached to that candidate"
        ]
    if generic_osm or type_assessment == "generic_residential_object":
        return REJECTED, [
            "OSM landuse=residential label is generic, numeric or parcel-like and has no independent geographic evidence"
        ]
    if type_assessment == "non_development_source_classification":
        return CANDIDATE_ONLY, [type_assessment_reason or "non-development source classification remains unresolved"]
    if candidate_type == "estate/residential_development_candidate" and candidate.get("osm_only"):
        return CANDIDATE_ONLY, [
            "OSM-only residential-development evidence is retained but requires independent corroboration before promotion"
        ]
    if candidate_type == "other" or raw_candidate_type == "other":
        return CANDIDATE_ONLY, [
            "source-native evidence is not a bounded factual geography type for automatic canonical promotion"
        ]
    if duplicate.get("identity_collision"):
        if match["direct_cross_identifier"] or (robust and source["source_count"] >= 2):
            return FOUNDER_REVIEW, [
                "same normalized name has a close non-representational interpretation and deterministic identity evidence is still insufficient to separate it"
            ]
        return CANDIDATE_ONLY, [
            "same-name proximity lacks deterministic source-object identity evidence; retain separate candidates pending source verification"
        ]
    if match["boundary_conflict"] and factual_type:
        return PROVISIONAL_ATTRIBUTES, [
            "factual identity is retained; source administrative assignment requires technical/source verification"
        ]
    if candidate_type == "estate/residential_development_candidate" and source["source_count"] > 1:
        if match["direct_cross_identifier"] or robust or match["exact_contextual"]:
            return PROVISIONAL_ATTRIBUTES, [
                "development identity is independently supported; estate/development type remains provisional"
            ]
        return CANDIDATE_ONLY, [
            "development label has multiple sources but no sufficiently strong identity reconciliation"
        ]
    administrative_frame = "geoboundaries" in source["sources"] and candidate_type in ADMINISTRATIVE_TYPES
    if (
        administrative_frame
        and not type_disagreement
        and not match["boundary_conflict"]
        and not duplicate.get("identity_collision")
    ):
        return AUTO_PROMOTABLE, ["authoritative geoBoundaries administrative identity and Gauteng spatial frame"]
    if (
        very_strong
        and factual_type
        and not type_disagreement
        and not match["boundary_conflict"]
        and not candidate.get("osm_only")
        and not duplicate.get("identity_collision")
    ):
        return AUTO_PROMOTABLE, [
            f"{identity_label} evidence establishes identity; no material type, spatial or duplicate conflict remains"
        ]
    if robust and factual_type and not duplicate.get("identity_collision"):
        return PROVISIONAL_ATTRIBUTES, [
            "identity is supported by deterministic or exact contextual evidence; one or more factual attributes remain provisional"
        ]
    if clear_osm_place and not duplicate.get("identity_collision"):
        return PROVISIONAL_ATTRIBUTES, [
            "OSM place classification is a useful factual signal but remains single-source evidence; ODbL gate is mandatory"
        ]
    return CANDIDATE_ONLY, [
        "evidence does not meet the independent identity threshold for factual canonical promotion"
    ]


def _review_category(simulation: dict[str, Any]) -> str:
    if simulation["duplicate_evidence"].get("identity_collision"):
        return "ambiguous_identity_or_duplicate"
    if simulation.get("assessed_candidate_type") == "estate/residential_development_candidate":
        return "estate_or_development_promotion"
    if simulation["boundary_conflict"]:
        return "boundary_admin_identity"
    return "other_material_identity_review"


def _simulation_row(
    candidate: dict[str, Any],
    source: dict[str, Any],
    match: dict[str, Any],
    duplicate: dict[str, Any],
) -> dict[str, Any]:
    assessed_type, type_assessment, type_assessment_reason = _type_assessment(candidate, source)
    promotion_class, reasons = classify_candidate(candidate, source, match, duplicate)
    attribute_summary, unresolved = _attribute_summary(candidate, source, match, duplicate)
    licence_state, odbl, licence_gate = _licence_state(candidate.get("licence_classes", []))
    identity_label, identity_confidence, very_strong, robust = _identity_evidence_label(candidate, source, match)
    return {
        "candidate_location_id": candidate["candidate_location_id"],
        "preferred_name": candidate.get("preferred_name"),
        "normalized_name": candidate.get("normalized_name"),
        "candidate_type": candidate.get("candidate_type"),
        "assessed_candidate_type": assessed_type,
        "type_assessment": type_assessment,
        "type_assessment_reason": type_assessment_reason,
        "candidate_type_status": candidate.get("candidate_type_status"),
        "candidate_type_source_hints": candidate.get("candidate_type_source_hints", []),
        "representative_latitude": candidate.get("representative_latitude"),
        "representative_longitude": candidate.get("representative_longitude"),
        "administrative_context": candidate.get("administrative_context", {}),
        "aliases": candidate.get("aliases", []),
        "historical_names": candidate.get("historical_names", []),
        "source_support": {
            "sources": source["sources"],
            "source_count": source["source_count"],
            "source_record_ids": [record["source_record_id"] for record in source["records"]],
            "source_native_types": candidate.get("source_native_types", []),
            "geonames_feature_classes": source["geonames_feature_classes"],
            "geonames_feature_codes": source["geonames_feature_codes"],
            "osm_place_values": source["osm_place_values"],
            "osm_landuse_values": source["osm_landuse_values"],
            "osm_residential_values": source["osm_residential_values"],
            "osm_identifier_tags": source["osm_identifier_tags"],
            "osm_alias_tags": source["osm_alias_tags"],
        },
        "identity_evidence": {
            "class": identity_label,
            "confidence": identity_confidence,
            "very_strong": very_strong,
            "robust": robust,
            "direct_cross_identifier": match["direct_cross_identifier"],
            "exact_contextual": match["exact_contextual"],
            "match_methods": match["edge_methods"],
            "match_statuses": match["match_statuses"],
            "fuzzy_proposals_withheld": match["fuzzy_proposal_count"],
            "not_based_on_name_equality_alone": True,
        },
        "attribute_confidence": attribute_summary,
        "licence_classes": candidate.get("licence_classes", []),
        "licence_state": licence_state,
        "odbl_evidence_present": odbl,
        "licence_gate": licence_gate,
        "boundary_conflict": match["boundary_conflict"],
        "administrative_assignment_confidence": (
            "needs_source_verification" if match["boundary_conflict"] else "supported"
        ),
        "conflicts": candidate.get("conflicts", []),
        "conflict_reasons": match["conflict_reasons"],
        "duplicate_evidence": duplicate,
        "source_representation": duplicate.get("source_representation"),
        "osm_only": bool(candidate.get("osm_only")),
        "promotion_class": promotion_class,
        "factual_identity_status": (
            "promotable" if promotion_class in {AUTO_PROMOTABLE, PROVISIONAL_ATTRIBUTES} else
            "requires_founder_review" if promotion_class == FOUNDER_REVIEW else
            "candidate" if promotion_class == CANDIDATE_ONLY else "rejected_non_independent"
        ),
        "promotion_reasons": reasons,
        "unresolved_attributes": unresolved,
        "human_review_required": promotion_class == FOUNDER_REVIEW,
        "founder_review_category": _review_category({
            "assessed_candidate_type": assessed_type,
            "duplicate_evidence": duplicate,
            "boundary_conflict": match["boundary_conflict"],
        }) if promotion_class == FOUNDER_REVIEW else None,
        "source_assertion_count": sum(
            len(assertion.get("assertion_ids", []))
            for assertion in candidate.get("source_assertions", [])
        ),
        "source_modification_dates": candidate.get("source_modification_dates", []),
        "first_seen": candidate.get("first_seen"),
        "last_verified_at": candidate.get("last_verified_at"),
    }


def _probe_candidate_rows(
    simulations_by_id: dict[str, dict[str, Any]],
    normalized_to_ids: dict[str, list[str]],
) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for probe in REQUIRED_PROBES:
        normalized = normalize_lookup(probe)
        candidate_ids = sorted(normalized_to_ids.get(normalized, []))
        interpretations = []
        for candidate_id in candidate_ids:
            row = simulations_by_id[candidate_id]
            interpretations.append(
                {
                    "candidate_location_id": candidate_id,
                    "preferred_name": row["preferred_name"],
                    "promotion_class": row["promotion_class"],
                    "factual_identity_would_become_canonical": row["factual_identity_status"] == "promotable",
                    "identity_confidence": row["identity_evidence"]["confidence"],
                    "unresolved_attributes": row["unresolved_attributes"],
                    "supporting_sources": row["source_support"]["sources"],
                    "licence_state": row["licence_state"],
                    "review_required": row["human_review_required"],
                    "reason": row["promotion_reasons"],
                }
            )
        results.append(
            {
                "probe": probe,
                "normalized_name": normalized,
                "found": bool(interpretations),
                "candidate_interpretation_count": len(interpretations),
                "interpretations": interpretations,
            }
        )
    return results


def _attach_probe_review(
    simulations: list[dict[str, Any]],
    probes: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    probe_by_id: dict[str, list[str]] = defaultdict(list)
    for probe in probes:
        for interpretation in probe["interpretations"]:
            probe_by_id[interpretation["candidate_location_id"]].append(probe["probe"])
    for row in simulations:
        probe_names = sorted(probe_by_id.get(row["candidate_location_id"], []))
        row["required_probe_names"] = probe_names
        priority_review = bool(
            probe_names
            and row["promotion_class"] in {CANDIDATE_ONLY, REJECTED}
            and row["candidate_type"] != "other"
        )
        row["priority_probe_review"] = priority_review
        if priority_review:
            row["human_review_required"] = True
            row["review_set_reason"] = "required property-search probe remains weak or non-independent"
        elif row["human_review_required"]:
            row["review_set_reason"] = row["promotion_reasons"][0]
        else:
            row["review_set_reason"] = None
    return simulations


def _duplicate_examples(
    candidates: list[dict[str, Any]],
    simulations_by_id: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for candidate in candidates:
        groups[str(candidate.get("normalized_name") or "")].append(candidate)
    selected_names = {"sandton", "roodepoort", "mamelodi", "vaalkop", "vanderbijlpark"}
    selected = [
        (name, rows)
        for name, rows in groups.items()
        if len(rows) > 1 and name in selected_names
    ]
    if len(selected) < 5:
        selected.extend(
            sorted(
                ((name, rows) for name, rows in groups.items() if len(rows) > 1 and name not in selected_names),
                key=lambda item: (-len(item[1]), item[0]),
            )[: 5 - len(selected)]
        )
    examples = []
    for name, rows in selected[:8]:
        examples.append(
            {
                "normalized_name": name,
                "candidate_count": len(rows),
                "candidates": [
                    {
                        "candidate_location_id": row["candidate_location_id"],
                        "candidate_type": row.get("candidate_type"),
                        "sources": row.get("source_names", []),
                        "administrative_context": row.get("administrative_context", {}),
                        "representative_latitude": row.get("representative_latitude"),
                        "representative_longitude": row.get("representative_longitude"),
                        "promotion_class": simulations_by_id[row["candidate_location_id"]]["promotion_class"],
                    }
                    for row in sorted(rows, key=lambda value: str(value["candidate_location_id"]))
                ],
            }
        )
    return examples


def _type_stats(candidates: list[dict[str, Any]], simulations_by_id: dict[str, dict[str, Any]]) -> dict[str, Any]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for candidate in candidates:
        grouped[str(candidate.get("candidate_type") or "")].append(candidate)
    stats = {}
    for candidate_type, rows in sorted(grouped.items()):
        classes = Counter(simulations_by_id[row["candidate_location_id"]]["promotion_class"] for row in rows)
        total = len(rows)
        single_source = sum(row.get("source_count") == 1 for row in rows)
        multi_source = sum(row.get("source_count", 0) > 1 for row in rows)
        aliases = sum(bool(row.get("aliases")) for row in rows)
        historical_names = sum(bool(row.get("historical_names")) for row in rows)
        type_disagreement = sum(row.get("candidate_type_status") == "source_disagreement" for row in rows)
        duplicate_name = sum("duplicate_normalized_name_across_candidates" in row.get("review_reasons", []) for row in rows)
        boundary_conflict = sum(bool(row.get("conflicts")) for row in rows)
        osm_only = sum(bool(row.get("osm_only")) for row in rows)
        stats[candidate_type] = {
            "total": total,
            "single_source": single_source,
            "multi_source": multi_source,
            "conflict_count": boundary_conflict,
            "conflict_rate": round(boundary_conflict / total, 4) if total else 0,
            "ambiguous_count": duplicate_name,
            "ambiguous_rate": round(duplicate_name / total, 4) if total else 0,
            "aliases": aliases,
            "alias_rate": round(aliases / total, 4) if total else 0,
            "historical_names": historical_names,
            "historical_name_rate": round(historical_names / total, 4) if total else 0,
            "type_disagreement": type_disagreement,
            "duplicate_name": duplicate_name,
            "boundary_conflict": boundary_conflict,
            "boundary_conflict_rate": round(boundary_conflict / total, 4) if total else 0,
            "osm_only": osm_only,
            "osm_only_rate": round(osm_only / total, 4) if total else 0,
            "promotion_classes": dict(sorted(classes.items())),
        }
    return stats


def _source_combination_counts(candidates: list[dict[str, Any]]) -> dict[str, int]:
    return dict(
        Counter("+".join(sorted(candidate.get("source_names", []))) for candidate in candidates).most_common()
    )


def _counter_dict(values: Iterable[str]) -> dict[str, int]:
    return dict(Counter(values).most_common())


def _comparison_disposition(
    previous: dict[str, Any],
    current: dict[str, Any] | None,
) -> str:
    if current is None:
        return "candidate_not_present_in_v0_2"
    representation = current.get("source_representation") or {}
    if representation.get("role") == "secondary":
        return "deterministic_osm_source_representation_deduplicated"
    if previous.get("review_category") == "boundary_admin_identity" and current.get("boundary_conflict"):
        return "administrative_assignment_is_attribute_only_technical_verification"
    if previous.get("review_category") == "ambiguous_identity_or_duplicate":
        if representation.get("role") == "primary":
            return "deterministic_osm_source_representation_kept_under_primary"
        return "low_evidence_same_name_collision_deferred_to_source_verification"
    if previous.get("review_category") == "estate_or_development_promotion":
        if current.get("type_assessment") == "non_development_source_classification":
            return "farm_or_non_development_source_removed_estate_interpretation"
        if current.get("promotion_class") == PROVISIONAL_ATTRIBUTES:
            return "identity_promoted_type_remains_provisional"
        return "estate_threshold_or_type_reassessment"
    if previous.get("priority_probe_review"):
        return "priority_probe_reassessed_without_formal_founder_class"
    return "deterministic_v0_2_reclassification"


def compare_with_v01(
    result: dict[str, Any],
    baseline_output_root: Path | None,
) -> dict[str, Any]:
    current_rows = {row["candidate_location_id"]: row for row in result["simulations"]}
    current_review_rows = {row["candidate_location_id"]: row for row in result["founder_review"]}
    if baseline_output_root is None:
        return {
            "available": False,
            "reason": "no v0.1 promotion output root was supplied",
            "previous_review_count": None,
            "previous_review_rows_disappeared": None,
            "genuinely_remaining_review_rows": len(current_review_rows),
        }
    previous_review_path = baseline_output_root / "gauteng_founder_review_set_v0.1.jsonl"
    previous_simulation_path = baseline_output_root / "gauteng_canonical_promotion_simulation_v0.1.jsonl"
    if not previous_review_path.is_file() or not previous_simulation_path.is_file():
        return {
            "available": False,
            "reason": f"v0.1 output artifacts missing under {baseline_output_root}",
            "previous_review_count": None,
            "previous_review_rows_disappeared": None,
            "genuinely_remaining_review_rows": len(current_review_rows),
        }
    previous_review = list(read_jsonl(previous_review_path))
    previous_simulation = list(read_jsonl(previous_simulation_path))
    previous_by_id = {row["candidate_location_id"]: row for row in previous_review}
    disappeared = []
    remained = []
    for candidate_id in sorted(previous_by_id):
        previous = previous_by_id[candidate_id]
        current = current_rows.get(candidate_id)
        disposition = _comparison_disposition(previous, current)
        detail = {
            "candidate_location_id": candidate_id,
            "preferred_name": previous.get("preferred_name"),
            "previous_review_category": previous.get("review_category"),
            "previous_promotion_class": previous.get("promotion_class"),
            "current_promotion_class": current.get("promotion_class") if current else None,
            "current_assessed_candidate_type": current.get("assessed_candidate_type") if current else None,
            "disposition": disposition,
            "current_reason": current.get("promotion_reasons") if current else None,
        }
        if candidate_id in current_review_rows:
            remained.append(detail)
        else:
            disappeared.append(detail)
    current_ids = set(current_review_rows)
    new_rows = [
        {
            "candidate_location_id": candidate_id,
            "preferred_name": current_rows[candidate_id].get("preferred_name"),
            "promotion_class": current_rows[candidate_id].get("promotion_class"),
            "review_category": current_rows[candidate_id].get("review_category"),
        }
        for candidate_id in sorted(current_ids - set(previous_by_id))
    ]
    return {
        "available": True,
        "baseline_output_root": str(baseline_output_root),
        "previous_review_count": len(previous_review),
        "previous_formal_review_class_count": sum(
            row.get("promotion_class") == FOUNDER_REVIEW for row in previous_simulation
        ),
        "current_review_set_count": len(current_review_rows),
        "current_formal_review_class_count": sum(
            row.get("promotion_class") == FOUNDER_REVIEW for row in result["simulations"]
        ),
        "current_priority_probe_count": sum(
            bool(row.get("priority_probe_review")) for row in current_review_rows.values()
        ),
        "previous_review_rows_disappeared": len(disappeared),
        "genuinely_remaining_review_rows": sum(
            row.get("promotion_class") == FOUNDER_REVIEW for row in current_review_rows.values()
        ),
        "remaining_previous_rows": remained,
        "disappeared_rows": disappeared,
        "new_review_rows": new_rows,
        "disappeared_by_disposition": dict(Counter(row["disposition"] for row in disappeared)),
        "class_transitions": dict(
            Counter(
                f"{row['previous_promotion_class']} -> {row['current_promotion_class']}"
                for row in disappeared
            )
        ),
    }


def _summary(
    inputs: dict[str, Any],
    candidates: list[dict[str, Any]],
    matches: list[dict[str, Any]],
    simulations: list[dict[str, Any]],
    founder_review: list[dict[str, Any]],
    probes: list[dict[str, Any]],
    duplicate_analysis: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    simulations_by_id = {row["candidate_location_id"]: row for row in simulations}
    source_records = inputs["source_records"]
    records_by_id = {record["source_record_id"]: record for record in source_records}
    classes = Counter(row["promotion_class"] for row in simulations)
    source_combo = _source_combination_counts(candidates)
    match_methods = Counter(str(match.get("match_method")) for match in matches)
    match_statuses = Counter(str(match.get("match_status")) for match in matches)
    type_disagreements = [
        row for row in simulations if row.get("candidate_type_status") == "source_disagreement"
    ]
    boundary_rows = [row for row in simulations if row.get("boundary_conflict")]
    duplicate_rows = [
        row for row in simulations if row["duplicate_evidence"].get("normalized_name_group_size", 1) > 1
    ]
    source_representation_secondary_rows = [
        row for row in simulations
        if (row.get("source_representation") or {}).get("role") == "secondary"
    ]
    source_representation_primary_rows = [
        row for row in simulations
        if (row.get("source_representation") or {}).get("role") == "primary"
    ]
    identity_collision_rows = [
        row for row in simulations if row["duplicate_evidence"].get("identity_collision")
    ]
    osm_rows = [row for row in simulations if row["osm_only"]]
    estate_rows = [
        row for row in simulations if row["candidate_type"] == "estate/residential_development_candidate"
    ]
    estate_assessed_rows = [
        row for row in estate_rows
        if row.get("assessed_candidate_type") == "estate/residential_development_candidate"
    ]
    estate_reclassified_rows = [row for row in estate_rows if row not in estate_assessed_rows]
    osm_records = [record for record in source_records if record.get("source") == "osm"]
    osm_only_records = [
        records_by_id[source_id]
        for row in osm_rows
        for source_id in row["source_support"]["source_record_ids"]
        if source_id in records_by_id
    ]
    osm_only_tags = Counter()
    for record in osm_only_records:
        tags = (record.get("source_payload") or {}).get("tags") or {}
        for key in ("wikidata", "wikipedia"):
            if tags.get(key):
                osm_only_tags[key] += 1
    osm_alias_tags = Counter()
    for record in osm_only_records:
        tags = (record.get("source_payload") or {}).get("tags") or {}
        for key in ("alt_name", "official_name", "old_name"):
            if tags.get(key):
                osm_alias_tags[key] += 1
    duplicate_close_count = sum(row["duplicate_evidence"].get("close_same_context") for row in simulations)
    duplicate_group_count = sum(
        1 for candidate_id, info in duplicate_analysis.items() if info.get("normalized_name_group_size", 1) > 1
    )
    # The per-candidate map repeats group metadata; count unique groups instead.
    duplicate_group_count = len(
        {
            tuple(info["normalized_name_group_candidate_ids"])
            for info in duplicate_analysis.values()
            if info.get("normalized_name_group_size", 1) > 1
        }
    )
    boundary_source_records = [
        record
        for record in source_records
        if "conflict" in str((record.get("gauteng_spatial_gate") or {}).get("status", ""))
        or "outside" in str((record.get("gauteng_spatial_gate") or {}).get("status", ""))
    ]
    kyalami = [row for row in simulations if row["normalized_name"] == "kyalami"]
    khayalami_source_records = [
        record
        for record in source_records
        if normalize_lookup(record.get("exact_source_name")) == "khayalami"
        or "khayalami" in [normalize_lookup(value) for value in record.get("aliases_supplied_by_source", [])]
    ]
    type_hint_combinations = Counter(
        "|".join(row.get("candidate_type_source_hints", []))
        for row in simulations
        if row.get("candidate_type_status") == "source_disagreement"
    )
    review_categories = Counter(
        row.get("founder_review_category") or "important_probe_weak_evidence"
        for row in founder_review
    )
    formal_founder_review_rows = [
        row for row in founder_review if row["promotion_class"] == FOUNDER_REVIEW
    ]
    priority_probe_rows = [row for row in founder_review if row.get("priority_probe_review")]
    priority_probe_details = [
        {
            "candidate_location_id": row["candidate_location_id"],
            "preferred_name": row["preferred_name"],
            "promotion_class": row["promotion_class"],
            "required_probe_names": row.get("required_probe_names", []),
            "reason": row.get("review_set_reason"),
        }
        for row in priority_probe_rows
    ]
    founder_review_distinction = (
        f"The formal `{FOUNDER_REVIEW}` promotion class contains "
        f"{len(formal_founder_review_rows)} candidates. The founder review set contains "
        f"{len(founder_review)} records: those formal rows plus "
        f"{len(priority_probe_rows)} priority required-probe candidates that remain "
        f"`{CANDIDATE_ONLY}`. Priority inclusion surfaces a weak or non-independent "
        "required probe for founder visibility; it does not change the promotion "
        "classification or promote the candidate."
    )
    promotion_class_counts = {
        promotion_class: classes[promotion_class]
        for promotion_class in PROMOTION_CLASSES
    }
    return {
        "promotion_policy_version": PROMOTION_POLICY_VERSION,
        "source_catalogue": {
            "candidate_count": len(candidates),
            "source_record_count": len(source_records),
            "source_assertion_count": len(inputs["assertions"]),
            "match_count": len(matches),
            "source_combinations": source_combo,
            "candidate_type_stats": _type_stats(candidates, simulations_by_id),
        },
        "promotion_classes": promotion_class_counts,
        "promotion_class_definitions": {
            AUTO_PROMOTABLE: "Identity, name, point and proposed type are sufficiently supported for deterministic factual promotion.",
            PROVISIONAL_ATTRIBUTES: "Identity is promotable, but type, administrative context or ODbL/licence handling remains provisional.",
            FOUNDER_REVIEW: "A material identity collision remains after deterministic source-representation checks; administrative and type uncertainty alone do not escalate.",
            CANDIDATE_ONLY: "Evidence is retained but does not meet the independent identity threshold.",
            REJECTED: "The source record is a generic/non-independent residential object rather than a named geography candidate.",
        },
        "promotion_metrics": {
            "fully_auto_promotable": classes[AUTO_PROMOTABLE],
            "promotable_with_provisional_attributes": classes[PROVISIONAL_ATTRIBUTES],
            "promotion_without_founder_review": classes[AUTO_PROMOTABLE] + classes[PROVISIONAL_ATTRIBUTES],
            "promotion_without_founder_review_percent": round(
                100 * (classes[AUTO_PROMOTABLE] + classes[PROVISIONAL_ATTRIBUTES]) / len(candidates), 2
            ),
            "founder_review_class_count": classes[FOUNDER_REVIEW],
            "founder_review_set_count": len(founder_review),
            "candidate_only": classes[CANDIDATE_ONLY],
            "rejected_non_independent": classes[REJECTED],
            "deterministically_handled_without_founder_review": len(candidates) - len(founder_review),
            "deterministically_handled_without_founder_review_percent": round(
                100 * (len(candidates) - len(founder_review)) / len(candidates), 2
            ),
        },
        "founder_review_set": {
            "count": len(founder_review),
            "formal_class_count": len(formal_founder_review_rows),
            "priority_probe_count": len(priority_probe_rows),
            "priority_probe_rows": priority_probe_details,
            "distinction": founder_review_distinction,
            "categories": dict(review_categories),
        },
        "match_quality": {
            "methods": dict(match_methods),
            "statuses": dict(match_statuses),
            "fuzzy_proposals_withheld": match_methods.get("fuzzy_string_similarity", 0),
            "candidate_direct_evidence": sum(row["identity_evidence"]["direct_cross_identifier"] for row in simulations),
            "candidate_exact_contextual_evidence": sum(row["identity_evidence"]["exact_contextual"] for row in simulations),
        },
        "osm_only_assessment": {
            "total": len(osm_rows),
            "by_promotion_class": dict(Counter(row["promotion_class"] for row in osm_rows)),
            "by_candidate_type": dict(Counter(row["assessed_candidate_type"] for row in osm_rows)),
            "place_tag_source_records": sum(
                bool((record.get("source_native_classification") or {}).get("place"))
                for record in osm_only_records
            ),
            "landuse_residential_source_records": sum(
                (record.get("source_native_classification") or {}).get("landuse") == "residential"
                for record in osm_only_records
            ),
            "wikidata_tag_source_records": osm_only_tags.get("wikidata", 0),
            "wikipedia_tag_source_records": osm_only_tags.get("wikipedia", 0),
            "alias_or_historic_tag_source_records": dict(osm_alias_tags),
            "recommendation": "OSM-only factual place objects may enter the provisional class only after explicit ODbL attribution/database-strategy approval. OSM-only named residential landuse objects remain candidates; generic or numeric objects are rejected as non-independent.",
        },
        "estate_development_assessment": {
            "total": len(estate_rows),
            "by_promotion_class": dict(Counter(row["promotion_class"] for row in estate_rows)),
            "osm_only": sum(row["osm_only"] for row in estate_rows),
            "independently_supported": sum(not row["osm_only"] for row in estate_rows),
            "generic_or_non_independent_rejected": sum(row["promotion_class"] == REJECTED for row in estate_rows),
            "assessed_estate_candidate_count": len(estate_assessed_rows),
            "reclassified_count": len(estate_reclassified_rows),
            "reclassified_to_factual_or_other": dict(
                Counter(row["assessed_candidate_type"] for row in estate_reclassified_rows)
            ),
            "reclassified_examples": [
                {
                    "candidate_location_id": row["candidate_location_id"],
                    "preferred_name": row["preferred_name"],
                    "assessed_candidate_type": row["assessed_candidate_type"],
                    "type_assessment": row["type_assessment"],
                    "promotion_class": row["promotion_class"],
                }
                for row in sorted(estate_reclassified_rows, key=lambda value: value["candidate_location_id"])[:25]
            ],
            "by_assessed_type": dict(Counter(row["assessed_candidate_type"] for row in estate_rows)),
            "recommendation": "Treat OSM landuse=residential as candidate evidence, not final estate truth. OSM place=* reclassifies to the factual place type; generic/numeric labels and farm-coded non-development records do not become estates; named residential objects remain provisional candidates and require independent corroboration before promotion.",
        },
        "duplicate_name_assessment": {
            "normalized_name_group_count": duplicate_group_count,
            "candidate_count_in_duplicate_groups": len(duplicate_rows),
            "close_same_context_candidate_count": duplicate_close_count,
            "identity_collision_candidate_count": len(identity_collision_rows),
            "source_representation_primary_count": len(source_representation_primary_rows),
            "source_representation_secondary_count": len(source_representation_secondary_rows),
            "promotion_classes": dict(Counter(row["promotion_class"] for row in duplicate_rows)),
            "examples": _duplicate_examples(candidates, simulations_by_id),
        },
        "type_disagreement_assessment": {
            "candidate_count": len(type_disagreements),
            "by_promotion_class": dict(Counter(row["promotion_class"] for row in type_disagreements)),
            "common_source_type_combinations": dict(type_hint_combinations.most_common(15)),
            "recommendation": "Do not block a clear identity solely because GeoNames populated-place, NGA designation and OSM place taxonomies differ; preserve the hints and keep candidate_type provisional.",
        },
        "boundary_assessment": {
            "source_record_count_with_disagreement": len(boundary_source_records),
            "source_record_statuses": dict(
                (
                    f"{source}:{status}",
                    count,
                )
                for (source, status), count in Counter(
                    (record.get("source"), (record.get("gauteng_spatial_gate") or {}).get("status"))
                    for record in boundary_source_records
                ).items()
            ),
            "candidate_count": len(boundary_rows),
            "candidate_by_promotion_class": dict(Counter(row["promotion_class"] for row in boundary_rows)),
            "candidate_by_administrative_assignment_confidence": dict(
                Counter(row["administrative_assignment_confidence"] for row in boundary_rows)
            ),
            "recommendation": "The Gauteng spatial gate governs provincial eligibility. A source admin-code disagreement is retained as administrative-assignment uncertainty and technical/source-verification work; it does not create founder review unless identity evidence itself is materially ambiguous.",
        },
        "kyalami_khayalami": {
            "kyalami_candidates": [
                {
                    "candidate_location_id": row["candidate_location_id"],
                    "promotion_class": row["promotion_class"],
                    "sources": row["source_support"]["sources"],
                    "identity_confidence": row["identity_evidence"]["confidence"],
                    "unresolved_attributes": row["unresolved_attributes"],
                    "reason": row["promotion_reasons"],
                }
                for row in kyalami
            ],
            "khayalami_source_record_count": len(khayalami_source_records),
            "conclusion": "The approved source pack supports Kyalami as a GeoNames-only populated-place/neighbourhood interpretation. It provides no Khayalami source record or alias, so no merge or alias assertion is made.",
            "additional_evidence_required": "An approved-source record or founder-supplied authoritative evidence establishing whether Khayalami is an alias, historic name or separate place.",
        },
        "required_property_search_probes": probes,
        "licensing": {
            "source_licence_classes_preserved": sorted(
                {licence for row in simulations for licence in row.get("licence_classes", [])}
            ),
            "odbl_only_candidates": sum(row["licence_state"] == "ODBL_ONLY" for row in simulations),
            "mixed_odbl_candidates": sum(row["licence_state"] == "MIXED_INCLUDES_ODBL" for row in simulations),
            "identity_owner": "Property Listify",
            "evidence_owner": "respective source licence; ODbL evidence remains identifiable",
        },
        "scope": {
            "source_root": str(inputs["catalogue_root"]),
            "no_source_artifact_mutation": True,
            "no_database_operations": True,
            "no_search_areas": True,
            "no_product_search_changes": True,
        },
    }


def evaluate_catalogue(inputs: dict[str, Any]) -> dict[str, Any]:
    candidates = sorted(inputs["candidates"], key=lambda row: str(row["candidate_location_id"]))
    matches = inputs["matches"]
    source_records_by_id = {record["source_record_id"]: record for record in inputs["source_records"]}
    matches_by_candidate: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for match in matches:
        matches_by_candidate[str(match["candidate_location_id"])].append(match)
    duplicates = _duplicate_analysis(candidates, source_records_by_id)
    simulations = []
    for candidate in candidates:
        candidate_id = str(candidate["candidate_location_id"])
        source = _source_features(candidate, source_records_by_id)
        match = _match_features(candidate, matches_by_candidate)
        simulations.append(_simulation_row(candidate, source, match, duplicates[candidate_id]))
    simulations_by_id = {row["candidate_location_id"]: row for row in simulations}
    normalized_to_ids: dict[str, list[str]] = defaultdict(list)
    for candidate in candidates:
        normalized_to_ids[str(candidate.get("normalized_name") or "")].append(candidate["candidate_location_id"])
    probes = _probe_candidate_rows(simulations_by_id, normalized_to_ids)
    simulations = _attach_probe_review(simulations, probes)
    simulations_by_id = {row["candidate_location_id"]: row for row in simulations}
    probes = _probe_candidate_rows(simulations_by_id, normalized_to_ids)
    founder_review = [
        {
            **row,
            "review_category": row["founder_review_category"] or "important_probe_weak_evidence",
        }
        for row in simulations
        if row["human_review_required"]
    ]
    summary = _summary(inputs, candidates, matches, simulations, founder_review, probes, duplicates)
    return {
        "candidates": candidates,
        "simulations": simulations,
        "founder_review": founder_review,
        "probes": probes,
        "summary": summary,
    }


def _markdown_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def policy_markdown(summary: dict[str, Any]) -> str:
    metrics = summary["promotion_metrics"]
    classes = summary["promotion_classes"]
    founder_review_set = summary["founder_review_set"]
    priority_probe_details = "\n".join(
        f"- `{row['candidate_location_id']}` — {row['preferred_name']} — "
        f"remains `{row['promotion_class']}`; required probe: "
        f"{', '.join(row['required_probe_names']) or 'unspecified'}."
        for row in founder_review_set["priority_probe_rows"]
    ) or "- None."
    return f"""# Property Listify Gauteng Canonical Promotion Policy v0.2

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
   within {DUPLICATE_REVIEW_DISTANCE_KM:g} km is deterministically grouped as
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
| `{AUTO_PROMOTABLE}` | {classes[AUTO_PROMOTABLE]} | Direct/authoritative or at least three-source factual identity, with no material unresolved identity/type/spatial conflict. |
| `{PROVISIONAL_ATTRIBUTES}` | {classes[PROVISIONAL_ATTRIBUTES]} | Identity is sufficiently supported; type, admin context or licence handling remains provisional. |
| `{FOUNDER_REVIEW}` | {classes[FOUNDER_REVIEW]} | A material same-name identity collision remains after source-representation checks. |
| `{CANDIDATE_ONLY}` | {classes[CANDIDATE_ONLY]} | Evidence is retained but is below the independent promotion threshold. |
| `{REJECTED}` | {classes[REJECTED]} | Generic/non-independent residential object, not an independent named geography. |

`{metrics['promotion_without_founder_review']}` candidates ({metrics['promotion_without_founder_review_percent']}%) have a promotable factual identity without founder geography review under this simulation. The provisional class still requires its stated attribute/licence gates.

## Formal class versus founder review set

{founder_review_set['distinction']}

The formal promotion class and the founder review set therefore intentionally
have different counts. The review set is an escalation queue that also keeps
the required property-search probes visible when their evidence is too weak
for promotion; those priority rows are not reclassified to make the totals
match.

Priority required-probe rows:

{priority_probe_details}

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
"""


def summary_markdown(summary: dict[str, Any], artifact_paths: dict[str, str]) -> str:
    metrics = summary["promotion_metrics"]
    classes = summary["promotion_classes"]
    comparison = summary.get("comparison") or {}
    comparison_available = bool(comparison.get("available"))
    lines = [
        "# Property Listify Gauteng Canonical Promotion Simulation v0.2",
        "",
        "Derived from the completed candidate catalogue; no source artifacts were modified.",
        "",
        "## Outcome",
        "",
        f"- Candidates: **{summary['source_catalogue']['candidate_count']}**",
        f"- Fully auto-promotable: **{classes[AUTO_PROMOTABLE]}**",
        f"- Promotable with provisional attributes: **{classes[PROVISIONAL_ATTRIBUTES]}**",
        f"- Founder-review class: **{classes[FOUNDER_REVIEW]}**",
        f"- Founder review set: **{metrics['founder_review_set_count']}**",
        f"- Candidate only: **{classes[CANDIDATE_ONLY]}**",
        f"- Rejected/non-independent: **{classes[REJECTED]}**",
        f"- Promotion without founder review: **{metrics['promotion_without_founder_review']} ({metrics['promotion_without_founder_review_percent']}%)**",
        "",
        "## Source combinations",
        "",
        "| Combination | Candidates |",
        "|---|---:|",
    ]
    lines.extend(f"| `{key}` | {value} |" for key, value in summary["source_catalogue"]["source_combinations"].items())
    lines.extend(["", "## Candidate types and policy classes", "", "| Type | Total | Auto | Provisional | Review | Candidate | Rejected |", "|---|---:|---:|---:|---:|---:|---:|"])
    for candidate_type, stats in summary["source_catalogue"]["candidate_type_stats"].items():
        counts = stats["promotion_classes"]
        lines.append(
            f"| `{candidate_type}` | {stats['total']} | {counts.get(AUTO_PROMOTABLE, 0)} | {counts.get(PROVISIONAL_ATTRIBUTES, 0)} | {counts.get(FOUNDER_REVIEW, 0)} | {counts.get(CANDIDATE_ONLY, 0)} | {counts.get(REJECTED, 0)} |"
        )
    lines.extend([
        "",
        "## Match quality",
        "",
        f"- Methods: `{_markdown_json(summary['match_quality']['methods'])}`",
        f"- Statuses: `{_markdown_json(summary['match_quality']['statuses'])}`",
        f"- Fuzzy proposals withheld: **{summary['match_quality']['fuzzy_proposals_withheld']}**",
        "",
        "## OSM-only assessment",
        "",
        f"- Total: **{summary['osm_only_assessment']['total']}**",
        f"- By class: `{_markdown_json(summary['osm_only_assessment']['by_promotion_class'])}`",
        f"- By assessed type: `{_markdown_json(summary['osm_only_assessment']['by_candidate_type'])}`",
        f"- OSM-only records with Wikidata tags: **{summary['osm_only_assessment']['wikidata_tag_source_records']}**; Wikipedia tags: **{summary['osm_only_assessment']['wikipedia_tag_source_records']}**.",
        f"- Alias/historic tags: `{_markdown_json(summary['osm_only_assessment']['alias_or_historic_tag_source_records'])}`.",
        f"- Recommendation: {summary['osm_only_assessment']['recommendation']}",
        "",
        "## Estates/developments",
        "",
        f"- Raw estate/development candidates: **{summary['estate_development_assessment']['total']}**; assessed as estate candidates: **{summary['estate_development_assessment']['assessed_estate_candidate_count']}**; reclassified: **{summary['estate_development_assessment']['reclassified_count']}**.",
        f"- OSM-only: **{summary['estate_development_assessment']['osm_only']}**; independently supported: **{summary['estate_development_assessment']['independently_supported']}**.",
        f"- By class: `{_markdown_json(summary['estate_development_assessment']['by_promotion_class'])}`.",
        f"- Reclassified assessed types: `{_markdown_json(summary['estate_development_assessment']['reclassified_to_factual_or_other'])}`.",
        f"- Generic/non-independent rejected: **{summary['estate_development_assessment']['generic_or_non_independent_rejected']}**.",
        f"- Recommendation: {summary['estate_development_assessment']['recommendation']}",
        "",
        "## Duplicate names",
        "",
        f"- Groups: **{summary['duplicate_name_assessment']['normalized_name_group_count']}**; candidates in groups: **{summary['duplicate_name_assessment']['candidate_count_in_duplicate_groups']}**; close same-context candidates requiring collision review: **{summary['duplicate_name_assessment']['close_same_context_candidate_count']}**.",
        f"- Identity-collision candidates: **{summary['duplicate_name_assessment']['identity_collision_candidate_count']}**; source-representation primaries: **{summary['duplicate_name_assessment']['source_representation_primary_count']}**; representation secondaries: **{summary['duplicate_name_assessment']['source_representation_secondary_count']}**.",
        f"- Policy classes: `{_markdown_json(summary['duplicate_name_assessment']['promotion_classes'])}`.",
    ])
    for example in summary["duplicate_name_assessment"]["examples"]:
        displayed = example["candidates"][:6]
        suffix = f"; +{example['candidate_count'] - len(displayed)} more" if example["candidate_count"] > len(displayed) else ""
        lines.append(f"- `{example['normalized_name']}` ({example['candidate_count']} interpretations): " + ", ".join(
            f"{row['candidate_location_id']}={row['candidate_type']}/{row['promotion_class']}" for row in displayed
        ) + suffix)
    lines.extend([
        "",
        "## Type and boundary conflicts",
        "",
        f"- Type disagreements: **{summary['type_disagreement_assessment']['candidate_count']}**; by class: `{_markdown_json(summary['type_disagreement_assessment']['by_promotion_class'])}`.",
        f"- Common type-hint combinations: `{_markdown_json(summary['type_disagreement_assessment']['common_source_type_combinations'])}`.",
        f"- Boundary-disagreement source records: **{summary['boundary_assessment']['source_record_count_with_disagreement']}**; candidate identities: **{summary['boundary_assessment']['candidate_count']}**; by class: `{_markdown_json(summary['boundary_assessment']['candidate_by_promotion_class'])}`.",
        f"- Administrative-assignment confidence: `{_markdown_json(summary['boundary_assessment']['candidate_by_administrative_assignment_confidence'])}`.",
        f"- Boundary recommendation: {summary['boundary_assessment']['recommendation']}",
        "",
        "## v0.1 → v0.2 comparison",
        "",
        (
            f"- Previous review set: **{comparison['previous_review_count']}**; current review set: **{comparison['current_review_set_count']}**."
            if comparison_available
            else f"- Comparison unavailable: {comparison.get('reason', 'no baseline supplied')}."
        ),
        (
            f"- Previous rows no longer in founder review: **{comparison['previous_review_rows_disappeared']}**; genuinely remaining founder decisions: **{comparison['genuinely_remaining_review_rows']}**."
            if comparison_available
            else ""
        ),
        (
            f"- Current formal founder-review rows: **{comparison['current_formal_review_class_count']}**; current priority probes: **{comparison['current_priority_probe_count']}**."
            if comparison_available
            else ""
        ),
        (
            f"- Dispositions: `{_markdown_json(comparison['disappeared_by_disposition'])}`."
            if comparison_available
            else ""
        ),
        "",
        "## Kyalami / Khayalami",
        "",
        f"- Kyalami: `{_markdown_json(summary['kyalami_khayalami']['kyalami_candidates'])}`.",
        f"- Khayalami source records: **{summary['kyalami_khayalami']['khayalami_source_record_count']}**.",
        f"- Conclusion: {summary['kyalami_khayalami']['conclusion']}",
        f"- Additional evidence required: {summary['kyalami_khayalami']['additional_evidence_required']}",
        "",
        "## Required probe re-evaluation",
        "",
        "| Probe | Interpretations | Candidate classes / IDs |",
        "|---|---:|---|",
    ])
    for probe in summary["required_property_search_probes"]:
        interpretations = "; ".join(
            f"{row['candidate_location_id']}={row['promotion_class']} ({','.join(row['supporting_sources']) or 'none'})"
            for row in probe["interpretations"]
        ) or "missing"
        lines.append(f"| {probe['probe']} | {probe['candidate_interpretation_count']} | {interpretations} |")
    lines.extend([
        "",
        "## Founder review set",
        "",
        f"- Count: **{summary['founder_review_set']['count']}**.",
        f"- Formal `{FOUNDER_REVIEW}` class count: **{summary['founder_review_set']['formal_class_count']}**.",
        f"- Priority required-probe additions: **{summary['founder_review_set']['priority_probe_count']}**; these remain `{CANDIDATE_ONLY}` and are not promoted.",
        f"- Categories: `{_markdown_json(summary['founder_review_set']['categories'])}`.",
        f"- Distinction: {summary['founder_review_set']['distinction']}",
        "- Priority rows: " + "; ".join(
            f"`{row['candidate_location_id']}` {row['preferred_name']} ({row['promotion_class']})"
            for row in summary['founder_review_set']['priority_probe_rows']
        ) + ".",
        "- These rows are limited to close identity collisions, weak boundary cases, independently corroborated estate/development promotion decisions, and required probes whose evidence remains weak. Type disagreement alone is not escalated when identity is strong.",
        "",
        "## Reproducibility and scope",
        "",
        "The simulation reads the existing candidate, match, source-record and assertion artifacts and writes only derived outputs. It performs no network acquisition, database operation, Search Area creation or product change.",
        "",
        "Artifacts:",
    ])
    lines.extend(f"- `{key}`: `{value}`" for key, value in artifact_paths.items())
    lines.append("")
    return "\n".join(lines)


def comparison_markdown(comparison: dict[str, Any]) -> str:
    lines = [
        "# Gauteng Canonical Promotion v0.1 → v0.2 Comparison",
        "",
    ]
    if not comparison.get("available"):
        lines.append(f"Comparison unavailable: {comparison.get('reason', 'no baseline supplied')}.")
        return "\n".join(lines) + "\n"
    lines.extend([
        f"- Previous review set: **{comparison['previous_review_count']}**.",
        f"- Current review set: **{comparison['current_review_set_count']}**.",
        f"- Previous rows no longer in founder review: **{comparison['previous_review_rows_disappeared']}**.",
        f"- Genuinely remaining formal founder decisions: **{comparison['genuinely_remaining_review_rows']}**.",
        f"- Current priority-probe rows: **{comparison['current_priority_probe_count']}**.",
        "",
        "## Disposition counts",
        "",
        "| Disposition | Rows |",
        "|---|---:|",
    ])
    lines.extend(
        f"| `{key}` | {value} |"
        for key, value in comparison["disappeared_by_disposition"].items()
    )
    lines.extend([
        "",
        "## Rows that remain from v0.1",
        "",
        "The remaining rows are emitted in the v0.2 founder-review JSONL/CSV.",
        "",
        "## Rows no longer in founder review",
        "",
        "| Candidate | Name | v0.2 class | Disposition |",
        "|---|---|---|---|",
    ])
    lines.extend(
        f"| `{row['candidate_location_id']}` | {row['preferred_name']} | `{row['current_promotion_class']}` | `{row['disposition']}` |"
        for row in comparison["disappeared_rows"]
    )
    lines.append("")
    return "\n".join(lines)


def write_promotion_outputs(
    result: dict[str, Any],
    output_root: Path,
    comparison: dict[str, Any],
) -> dict[str, Path]:
    output_root.mkdir(parents=True, exist_ok=True)
    simulation_jsonl = output_root / f"gauteng_canonical_promotion_simulation_{PROMOTION_OUTPUT_VERSION}.jsonl"
    simulation_csv = output_root / f"gauteng_canonical_promotion_simulation_{PROMOTION_OUTPUT_VERSION}.csv"
    review_jsonl = output_root / f"gauteng_founder_review_set_{PROMOTION_OUTPUT_VERSION}.jsonl"
    review_csv = output_root / f"gauteng_founder_review_set_{PROMOTION_OUTPUT_VERSION}.csv"
    policy_path = output_root / f"gauteng_canonical_promotion_policy_{PROMOTION_OUTPUT_VERSION}.md"
    summary_json = output_root / f"gauteng_canonical_promotion_summary_{PROMOTION_OUTPUT_VERSION}.json"
    summary_md = output_root / f"gauteng_canonical_promotion_summary_{PROMOTION_OUTPUT_VERSION}.md"
    comparison_json = output_root / f"gauteng_canonical_promotion_comparison_{PROMOTION_OUTPUT_VERSION}.json"
    comparison_md = output_root / f"gauteng_canonical_promotion_comparison_{PROMOTION_OUTPUT_VERSION}.md"
    write_jsonl(simulation_jsonl, result["simulations"], sort_key="candidate_location_id")
    csv_fields = [
        "candidate_location_id",
        "preferred_name",
        "normalized_name",
        "candidate_type",
        "promotion_class",
        "factual_identity_status",
        "identity_evidence",
        "source_support",
        "licence_classes",
        "licence_state",
        "odbl_evidence_present",
        "boundary_conflict",
        "conflicts",
        "duplicate_evidence",
        "osm_only",
        "promotion_reasons",
        "human_review_required",
        "review_set_reason",
        "unresolved_attributes",
        "required_probe_names",
        "representative_latitude",
        "representative_longitude",
    ]
    write_csv(simulation_csv, result["simulations"], csv_fields)
    write_jsonl(review_jsonl, result["founder_review"], sort_key="candidate_location_id")
    write_csv(review_csv, result["founder_review"], csv_fields + ["review_category"])
    write_json(summary_json, result["summary"])
    artifact_paths = {
        "promotion_simulation_jsonl": str(simulation_jsonl),
        "promotion_simulation_csv": str(simulation_csv),
        "founder_review_jsonl": str(review_jsonl),
        "founder_review_csv": str(review_csv),
        "policy_document": str(policy_path),
        "summary_json": str(summary_json),
        "summary_markdown": str(summary_md),
        "comparison_json": str(comparison_json),
        "comparison_markdown": str(comparison_md),
    }
    policy_path.write_text(policy_markdown(result["summary"]), encoding="utf-8")
    summary_md.write_text(summary_markdown(result["summary"], artifact_paths), encoding="utf-8")
    write_json(comparison_json, comparison)
    comparison_md.write_text(comparison_markdown(comparison), encoding="utf-8")
    return {key: Path(value) for key, value in artifact_paths.items()}


def run_promotion(
    catalogue_root: Path,
    output_root: Path,
    baseline_output_root: Path | None = None,
) -> dict[str, Any]:
    inputs = load_catalogue_inputs(catalogue_root.resolve())
    result = evaluate_catalogue(inputs)
    comparison = compare_with_v01(result, baseline_output_root.resolve() if baseline_output_root else None)
    result["summary"]["comparison"] = comparison
    paths = write_promotion_outputs(result, output_root.resolve(), comparison)
    result["output_paths"] = {key: str(path) for key, path in paths.items()}
    # Rewrite summary after paths are known so the machine-readable handoff is
    # self-contained while the catalogue root remains read-only.
    write_json(output_root.resolve() / f"gauteng_canonical_promotion_summary_{PROMOTION_OUTPUT_VERSION}.json", {
        **result["summary"],
        "output_paths": result["output_paths"],
    })
    return result
