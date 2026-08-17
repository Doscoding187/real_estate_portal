from __future__ import annotations

from collections import defaultdict
from difflib import SequenceMatcher
from itertools import combinations
from statistics import median
from typing import Any, Iterable

from .common import (
    assertion_id,
    candidate_id,
    haversine_km,
    normalize_lookup,
    read_jsonl,
    stable_digest,
    utc_now,
)
from .geometry import GautengSpatialGate


GENERIC_TYPES = {"other", "administrative_territorial_entity", "osm_place", "named_residential_development_candidate"}
ADMIN_TYPES = {"province", "metropolitan_municipality", "district_municipality", "local_municipality"}
SETTLEMENT_TYPES = {
    "city",
    "town",
    "village",
    "suburb",
    "neighbourhood",
    "locality",
    "hamlet",
    "quarter",
}
ESTATE_TYPES = {"estate/residential_development_candidate", "precinct/development_candidate"}
TYPE_PRIORITY = {
    "province": 100,
    "metropolitan_municipality": 95,
    "district_municipality": 90,
    "local_municipality": 85,
    "city": 80,
    "town": 75,
    "suburb": 70,
    "neighbourhood": 68,
    "quarter": 66,
    "village": 64,
    "locality": 60,
    "hamlet": 55,
    "estate/residential_development_candidate": 40,
    "precinct/development_candidate": 35,
    "other": 1,
}


class UnionFind:
    def __init__(self, values: Iterable[str]):
        self.parent = {value: value for value in values}
        self.rank = {value: 0 for value in values}
        self.edges: list[dict[str, Any]] = []

    def find(self, value: str) -> str:
        parent = self.parent[value]
        if parent != value:
            self.parent[value] = self.find(parent)
        return self.parent[value]

    def union(self, left: str, right: str, method: str, confidence: float, notes: str) -> None:
        root_left = self.find(left)
        root_right = self.find(right)
        if root_left != root_right:
            if self.rank[root_left] < self.rank[root_right]:
                root_left, root_right = root_right, root_left
            self.parent[root_right] = root_left
            if self.rank[root_left] == self.rank[root_right]:
                self.rank[root_left] += 1
        self.edges.append(
            {
                "source_record_id_a": left,
                "source_record_id_b": right,
                "match_method": method,
                "confidence": confidence,
                "notes": notes,
            }
        )


def _source_record_forms(record: dict[str, Any]) -> set[str]:
    values = [record.get("exact_source_name")]
    values.extend(record.get("aliases_supplied_by_source", []))
    values.extend(record.get("historical_names_supplied_by_source", []))
    return {normalized for normalized in (normalize_lookup(value) for value in values) if normalized}


def _record_types(record: dict[str, Any]) -> set[str]:
    values = set(record.get("proposed_type_hints") or [])
    if record.get("proposed_type"):
        values.add(str(record["proposed_type"]))
    return {value for value in values if value}


def _type_family(types: set[str]) -> str:
    if types & ADMIN_TYPES:
        return "administrative"
    if types & ESTATE_TYPES:
        return "estate"
    if types & SETTLEMENT_TYPES:
        return "settlement"
    return "other"


def _types_compatible(left: dict[str, Any], right: dict[str, Any]) -> bool:
    left_types = _record_types(left)
    right_types = _record_types(right)
    left_family = _type_family(left_types)
    right_family = _type_family(right_types)
    if left_family == "other" or right_family == "other":
        return True
    if left_family != right_family:
        return False
    if left_family == "administrative":
        return bool(left_types & right_types) or bool(
            left.get("source") == "geoboundaries" and right.get("source") == "geonames"
        )
    return True


def _context_names(record: dict[str, Any]) -> set[str]:
    context = record.get("administrative_context") or {}
    values: set[str] = set()
    for key in ("adm2", "adm3"):
        for item in context.get(key, []) or []:
            if item.get("name"):
                values.add(normalize_lookup(item["name"]))
    source_context = record.get("source_admin_context") or {}
    for key in ("admin1_name", "admin2_name", "ADM1", "ADM2", "ADM3"):
        if source_context.get(key):
            values.add(normalize_lookup(source_context[key]))
    return {value for value in values if value}


def _distance_threshold_km(left: dict[str, Any], right: dict[str, Any]) -> float:
    family = _type_family(_record_types(left) | _record_types(right))
    if family == "administrative":
        return 20.0
    if family == "settlement":
        return 3.5
    if family == "estate":
        return 1.5
    return 2.5


def _cross_tokens(record: dict[str, Any]) -> set[str]:
    tokens: set[str] = set()
    for key, values in (record.get("cross_identifiers") or {}).items():
        if not isinstance(values, list):
            values = [values]
        for value in values:
            text = str(value).strip()
            if not text:
                continue
            if key in {"wikidata", "wikidata_qid"}:
                text = text.upper()
            tokens.add(f"{key}:{text}")
            if key == "osm_relation" and text.isdigit():
                # Wikidata P402 stores the OSM relation number while the OSM
                # source record retains the native relation/<id> element ID.
                tokens.add(f"osm:relation/{text}")
    if record.get("source") == "nga_gns":
        for value in (record.get("cross_identifiers") or {}).get("nga_ufi", []):
            if value:
                tokens.add(f"gns_ufi:{value}")
    return tokens


def _pair_exact_contextual(left: dict[str, Any], right: dict[str, Any]) -> bool:
    if left.get("source") == right.get("source"):
        return False
    if not _types_compatible(left, right):
        return False
    distance = haversine_km(left.get("latitude"), left.get("longitude"), right.get("latitude"), right.get("longitude"))
    if distance is None or distance > _distance_threshold_km(left, right):
        return False
    left_context = _context_names(left)
    right_context = _context_names(right)
    family = _type_family(_record_types(left) | _record_types(right))
    if family == "settlement" and left_context and right_context and not left_context.intersection(right_context):
        return False
    return True


def _similarity(left: dict[str, Any], right: dict[str, Any]) -> float:
    best = 0.0
    for left_form in _source_record_forms(left):
        for right_form in _source_record_forms(right):
            best = max(best, SequenceMatcher(None, left_form, right_form).ratio())
    return best


def _source_weight(source: str) -> int:
    return {"osm": 5, "geonames": 4, "wikidata": 3, "nga_gns": 2, "geoboundaries": 1}.get(source, 1)


def _candidate_type(records: list[dict[str, Any]]) -> tuple[str, bool, list[str]]:
    scores: defaultdict[str, int] = defaultdict(int)
    source_types: set[str] = set()
    source_type_signatures: set[tuple[str, ...]] = set()
    for record in records:
        weight = _source_weight(record["source"])
        hints = _record_types(record)
        substantive_hints = sorted(hint for hint in hints if hint not in GENERIC_TYPES)
        if substantive_hints:
            source_type_signatures.add(tuple(substantive_hints))
        if record.get("proposed_type"):
            scores[str(record["proposed_type"])] += weight * 5
        for hint in hints:
            if hint in GENERIC_TYPES:
                continue
            scores[hint] += weight
            source_types.add(hint)
    if not scores:
        return "other", False, []
    ordered = sorted(scores.items(), key=lambda item: (-item[1], -TYPE_PRIORITY.get(item[0], 0), item[0]))
    proposed = ordered[0][0]
    substantive = {value for value in source_types if value not in GENERIC_TYPES}
    # A single source may legitimately publish several possible native hints
    # (for example GeoNames PPL -> locality/town/village). The disagreement
    # flag is for disagreement across source assertions, not for that one
    # source-native ambiguity.
    disagreement = len(source_type_signatures) > 1
    if substantive & ADMIN_TYPES and len(substantive & ADMIN_TYPES) > 1:
        disagreement = True
    return proposed, disagreement, sorted(substantive)


def _preferred_name(records: list[dict[str, Any]]) -> str:
    scores: defaultdict[tuple[str, str], int] = defaultdict(int)
    for record in records:
        value = str(record.get("exact_source_name") or "").strip()
        normalized = normalize_lookup(value)
        if value and normalized:
            scores[(normalized, value)] += _source_weight(record["source"])
    if not scores:
        return "Unnamed candidate"
    ordered = sorted(scores.items(), key=lambda item: (-item[1], item[0][0], item[0][1]))
    return ordered[0][0][1]


def _representative_coordinate(records: list[dict[str, Any]]) -> tuple[float | None, float | None, str | None]:
    coordinates = [
        (float(record["latitude"]), float(record["longitude"]), record["source_record_id"])
        for record in records
        if record.get("latitude") is not None and record.get("longitude") is not None
    ]
    if not coordinates:
        return None, None, None
    return median([item[0] for item in coordinates]), median([item[1] for item in coordinates]), coordinates[0][2]


def _canonical_key(name: str, proposed_type: str, latitude: float | None, longitude: float | None, context: dict[str, Any]) -> str:
    context_key = []
    for key in ("adm2", "adm3"):
        context_key.extend(sorted(normalize_lookup(item.get("name")) for item in context.get(key, []) if item.get("name")))
    return "|".join(
        (
            normalize_lookup(name),
            proposed_type,
            f"{latitude:.4f}" if latitude is not None else "",
            f"{longitude:.4f}" if longitude is not None else "",
            ",".join(context_key),
        )
    )


def _assertion_ids_for_record(record: dict[str, Any]) -> list[str]:
    source_id = record["source_record_id"]
    values: list[tuple[str, Any]] = [
        ("exact_name", record.get("exact_source_name")),
        ("normalized_lookup_form", record.get("normalized_lookup_form")),
        ("source_native_classification", record.get("source_native_classification")),
        ("source_admin_context", record.get("source_admin_context")),
        ("spatial_gate", record.get("gauteng_spatial_gate")),
        ("source_modification_date", record.get("source_modification_date")),
    ]
    values.extend(("alias", value) for value in record.get("aliases_supplied_by_source", []))
    values.extend(("historical_name", value) for value in record.get("historical_names_supplied_by_source", []))
    values.extend((f"cross_identifier:{key}", value) for key, value in (record.get("cross_identifiers") or {}).items())
    if record.get("latitude") is not None and record.get("longitude") is not None:
        values.append(("coordinate", {"latitude": record["latitude"], "longitude": record["longitude"]}))
    if record.get("geometry") is not None:
        values.append(("geometry", record["geometry"]))
    return sorted(
        assertion_id(source_id, assertion_type, value)
        for assertion_type, value in values
        if value not in (None, "", [], {})
    )


def _add_administrative_context(records: list[dict[str, Any]], gate: GautengSpatialGate) -> None:
    for record in records:
        if record.get("latitude") is not None and record.get("longitude") is not None:
            record["administrative_context"] = gate.administrative_context(record["latitude"], record["longitude"])
        else:
            record["administrative_context"] = {
                "province": {"name": "Gauteng", "source": "geoBoundaries", "level": "ADM1"},
                "adm2": [],
                "adm3": [],
            }


def reconcile_records(records: list[dict[str, Any]], gate: GautengSpatialGate) -> dict[str, Any]:
    eligible_records = [record for record in records if record.get("catalogue_eligible")]
    _add_administrative_context(eligible_records, gate)
    records_by_id = {record["source_record_id"]: record for record in eligible_records}
    union_find = UnionFind(records_by_id)

    token_index: defaultdict[str, list[str]] = defaultdict(list)
    for record in eligible_records:
        for token in _cross_tokens(record):
            token_index[token].append(record["source_record_id"])
    for token, source_ids in sorted(token_index.items()):
        unique_ids = sorted(set(source_ids))
        if len(unique_ids) < 2:
            continue
        for left, right in combinations(unique_ids, 2):
            if token.startswith("gns_ufi:") or records_by_id[left].get("source") != records_by_id[right].get("source"):
                union_find.union(
                    left,
                    right,
                    "direct_cross_identifier",
                    1.0,
                    f"Shared normalized cross-identifier {token}; native IDs remain preserved.",
                )

    exact_index: defaultdict[str, list[str]] = defaultdict(list)
    for record in eligible_records:
        for form in _source_record_forms(record):
            exact_index[form].append(record["source_record_id"])
    seen_pairs: set[tuple[str, str]] = set()
    for form, source_ids in sorted(exact_index.items()):
        for left_id, right_id in combinations(sorted(set(source_ids)), 2):
            pair = (left_id, right_id)
            if pair in seen_pairs:
                continue
            seen_pairs.add(pair)
            left = records_by_id[left_id]
            right = records_by_id[right_id]
            if _pair_exact_contextual(left, right):
                union_find.union(
                    left_id,
                    right_id,
                    "exact_contextual",
                    0.94,
                    f"Exact normalized name/alias '{form}' plus compatible type and spatial proximity; not name equality alone.",
                )

    groups_by_root: defaultdict[str, list[str]] = defaultdict(list)
    for source_id in sorted(records_by_id):
        groups_by_root[union_find.find(source_id)].append(source_id)
    root_for_source = {source_id: union_find.find(source_id) for source_id in records_by_id}

    fuzzy_proposals: list[dict[str, Any]] = []
    fuzzy_blocks: defaultdict[str, set[str]] = defaultdict(set)
    for record in eligible_records:
        for form in _source_record_forms(record):
            fuzzy_blocks[form[:5]].add(record["source_record_id"])
    fuzzy_seen: set[tuple[str, str]] = set()
    for block, source_ids in sorted(fuzzy_blocks.items()):
        if not block or len(source_ids) > 800:
            continue
        for left_id, right_id in combinations(sorted(source_ids), 2):
            pair = (left_id, right_id)
            if pair in fuzzy_seen or root_for_source[left_id] == root_for_source[right_id]:
                continue
            fuzzy_seen.add(pair)
            left = records_by_id[left_id]
            right = records_by_id[right_id]
            if left["source"] == right["source"] or not _types_compatible(left, right):
                continue
            similarity = _similarity(left, right)
            distance = haversine_km(left.get("latitude"), left.get("longitude"), right.get("latitude"), right.get("longitude"))
            same_context = bool(_context_names(left).intersection(_context_names(right)))
            if similarity >= 0.86 and (distance is not None and distance <= 10.0 or same_context):
                fuzzy_proposals.append(
                    {
                        "source_record_id_a": left_id,
                        "source_record_id_b": right_id,
                        "similarity": round(similarity, 4),
                        "distance_km": round(distance, 4) if distance is not None else None,
                        "same_context": same_context,
                        "status": "proposed",
                        "review_required": True,
                    }
                )

    candidate_groups: list[list[dict[str, Any]]] = []
    for source_ids in groups_by_root.values():
        candidate_groups.append([records_by_id[source_id] for source_id in sorted(source_ids)])
    candidate_groups.sort(key=lambda group: (_preferred_name(group).casefold(), group[0]["source_record_id"]))

    edges_by_root: defaultdict[str, list[dict[str, Any]]] = defaultdict(list)
    for edge in union_find.edges:
        left_root = union_find.find(edge["source_record_id_a"])
        right_root = union_find.find(edge["source_record_id_b"])
        if left_root == right_root and edge["match_method"] in {"direct_cross_identifier", "exact_contextual"}:
            edges_by_root[left_root].append(edge)

    candidates: list[dict[str, Any]] = []
    group_to_candidate: dict[str, str] = {}
    collision_counts: defaultdict[str, int] = defaultdict(int)
    group_metadata: list[dict[str, Any]] = []
    for group in candidate_groups:
        preferred_name = _preferred_name(group)
        proposed_type, classification_disagreement, source_types = _candidate_type(group)
        latitude, longitude, representative_source_id = _representative_coordinate(group)
        context = group[0].get("administrative_context") or {"province": {"name": "Gauteng"}, "adm2": [], "adm3": []}
        canonical_key = _canonical_key(preferred_name, proposed_type, latitude, longitude, context)
        collision_counts[canonical_key] += 1
        group_metadata.append(
            {
                "group": group,
                "preferred_name": preferred_name,
                "proposed_type": proposed_type,
                "classification_disagreement": classification_disagreement,
                "source_types": source_types,
                "latitude": latitude,
                "longitude": longitude,
                "representative_source_id": representative_source_id,
                "context": context,
                "canonical_key": canonical_key,
            }
        )

    collision_slots: defaultdict[str, int] = defaultdict(int)
    for metadata in group_metadata:
        canonical_key = metadata["canonical_key"]
        collision_slots[canonical_key] += 1
        identity_key = canonical_key
        if collision_counts[canonical_key] > 1:
            identity_key = f"{canonical_key}|slot:{collision_slots[canonical_key]}"
        pl_candidate_id = candidate_id(identity_key)
        group = metadata["group"]
        root = union_find.find(group[0]["source_record_id"])
        group_to_candidate[root] = pl_candidate_id
        direct_edges = edges_by_root.get(root, [])
        source_names = sorted({record["source"] for record in group})
        aliases = sorted(
            {
                value
                for record in group
                for value in record.get("aliases_supplied_by_source", [])
                if normalize_lookup(value) != normalize_lookup(metadata["preferred_name"])
            }
        )
        historical_names = sorted(
            {
                value
                for record in group
                for value in record.get("historical_names_supplied_by_source", [])
            }
        )
        gate_conflicts = sorted(
            {
                str(record.get("gauteng_spatial_gate", {}).get("status"))
                for record in group
                if "conflict" in str(record.get("gauteng_spatial_gate", {}).get("status", ""))
                or "outside" in str(record.get("gauteng_spatial_gate", {}).get("status", ""))
            }
        )
        osm_only = source_names == ["osm"]
        review_reasons: list[str] = []
        if len(source_names) == 1:
            review_reasons.append("single_source_candidate")
        if osm_only:
            review_reasons.append("osm_only_candidate_requires_ODbL_review")
        if metadata["classification_disagreement"]:
            review_reasons.append("source_type_disagreement")
        if gate_conflicts:
            review_reasons.append("spatial_or_admin_conflict")
        confidence = 1.0 if any(edge["match_method"] == "direct_cross_identifier" for edge in direct_edges) else 0.94 if direct_edges else 0.55
        match_confidence_label = "deterministic" if confidence == 1.0 else "high_confidence" if confidence > 0.9 else "single_source"
        candidate = {
            "candidate_location_id": pl_candidate_id,
            "identity_namespace": "Property Listify",
            "identity_key": canonical_key,
            "preferred_name": metadata["preferred_name"],
            "normalized_name": normalize_lookup(metadata["preferred_name"]),
            "candidate_type": metadata["proposed_type"],
            "candidate_type_status": "source_disagreement" if metadata["classification_disagreement"] else "proposed",
            "candidate_type_source_hints": metadata["source_types"],
            "representative_latitude": metadata["latitude"],
            "representative_longitude": metadata["longitude"],
            "representative_geometry": (
                {
                    "type": "Point",
                    "coordinates": [metadata["longitude"], metadata["latitude"]],
                }
                if metadata["latitude"] is not None and metadata["longitude"] is not None
                else None
            ),
            "representative_source_record_id": metadata["representative_source_id"],
            "administrative_context": metadata["context"],
            "aliases": aliases,
            "historical_names": historical_names,
            "source_native_types": [
                {
                    "source": record["source"],
                    "source_record_id": record["source_record_id"],
                    "source_native_id": record["source_native_id"],
                    "classification": record["source_native_classification"],
                    "proposed_type_hints": record.get("proposed_type_hints", []),
                }
                for record in group
            ],
            "source_ids": [
                {
                    "source": record["source"],
                    "source_record_id": record["source_record_id"],
                    "source_native_id": record["source_native_id"],
                }
                for record in group
            ],
            "source_assertions": [
                {
                    "source_record_id": record["source_record_id"],
                    "source": record["source"],
                    "licence_class": record["licence_class"],
                    "assertion_ids": _assertion_ids_for_record(record),
                    "evidence_summary": "Source-native record preserved; candidate identity is a separate Property Listify-owned layer.",
                }
                for record in group
            ],
            "licence_classes": sorted({record["licence_class"] for record in group}),
            "osm_only": osm_only,
            "source_names": source_names,
            "source_count": len(source_names),
            "match_confidence": confidence,
            "match_confidence_label": match_confidence_label,
            "review_state": "needs_review" if review_reasons else "supported_candidate",
            "review_reasons": sorted(review_reasons),
            "first_seen": min(
                (record.get("retrieved_at") for record in group if record.get("retrieved_at")),
                default=None,
            ),
            "source_modification_dates": sorted(
                {record["source_modification_date"] for record in group if record.get("source_modification_date")}
            ),
            "last_verified_at": utc_now(),
            "evidence_edge_count": len(direct_edges),
            "reconciliation_edges": direct_edges,
            "conflicts": gate_conflicts,
        }
        candidates.append(candidate)

    candidates.sort(key=lambda candidate: candidate["candidate_location_id"])
    candidate_by_id = {candidate["candidate_location_id"]: candidate for candidate in candidates}
    duplicate_groups: defaultdict[str, list[str]] = defaultdict(list)
    for candidate in candidates:
        duplicate_groups[candidate["normalized_name"]].append(candidate["candidate_location_id"])
    duplicate_groups = defaultdict(list, {key: sorted(value) for key, value in duplicate_groups.items() if len(value) > 1})
    for candidate in candidates:
        if candidate["normalized_name"] in duplicate_groups:
            candidate["review_state"] = "needs_review"
            candidate.setdefault("review_reasons", []).append("duplicate_normalized_name_across_candidates")
            candidate["review_reasons"] = sorted(set(candidate["review_reasons"]))

    candidate_to_group = {
        group_to_candidate[union_find.find(metadata["group"][0]["source_record_id"])]: metadata["group"]
        for metadata in group_metadata
    }
    matches: list[dict[str, Any]] = []
    for candidate in candidates:
        group = candidate_to_group[candidate["candidate_location_id"]]
        edges = edges_by_root.get(union_find.find(group[0]["source_record_id"]), [])
        for record in group:
            has_direct = any(
                edge["match_method"] == "direct_cross_identifier"
                and record["source_record_id"] in {edge["source_record_id_a"], edge["source_record_id_b"]}
                for edge in edges
            )
            has_exact = any(
                edge["match_method"] == "exact_contextual"
                and record["source_record_id"] in {edge["source_record_id_a"], edge["source_record_id_b"]}
                for edge in edges
            )
            if candidate["normalized_name"] in duplicate_groups:
                status = "ambiguous"
                method = "duplicate_name_preserved"
                confidence = 0.5
                reason = ["same normalized name appears in multiple candidate interpretations"]
            elif has_direct:
                status = "deterministic"
                method = "direct_cross_identifier"
                confidence = 1.0
                reason = []
            elif has_exact:
                status = "high_confidence"
                method = "exact_contextual"
                confidence = 0.94
                reason = []
            else:
                status = "single_source"
                method = "candidate_seed"
                confidence = 0.55
                reason = ["no cross-source match evidence; source record retained as candidate seed"]
            gate_status = str(record.get("gauteng_spatial_gate", {}).get("status", ""))
            if "conflict" in gate_status or "outside" in gate_status:
                status = "conflict"
                reason.append(gate_status)
            if candidate["candidate_type_status"] == "source_disagreement":
                reason.append("source_native_type_disagreement_preserved")
            matches.append(
                {
                    "candidate_location_id": candidate["candidate_location_id"],
                    "source_record_id": record["source_record_id"],
                    "source": record["source"],
                    "source_native_id": record["source_native_id"],
                    "match_method": method,
                    "match_confidence": confidence,
                    "match_status": status,
                    "conflict_reason": sorted(set(reason)),
                    "review_required": bool(reason) or candidate["review_state"] == "needs_review",
                    "notes": "; ".join(sorted(set(reason))) or "Source evidence remains separately recoverable.",
                    "evidence_source_artifact_ids": record.get("source_artifact_ids", []),
                    "evidence_assertion_ids": _assertion_ids_for_record(record),
                }
            )

    for proposal in fuzzy_proposals:
        left_candidate = group_to_candidate[root_for_source[proposal["source_record_id_a"]]]
        right_candidate = group_to_candidate[root_for_source[proposal["source_record_id_b"]]]
        matches.append(
            {
                "candidate_location_id": left_candidate,
                "source_record_id": proposal["source_record_id_b"],
                "source": records_by_id[proposal["source_record_id_b"]]["source"],
                "source_native_id": records_by_id[proposal["source_record_id_b"]]["source_native_id"],
                "match_method": "fuzzy_string_similarity",
                "match_confidence": proposal["similarity"],
                "match_status": "proposed",
                "conflict_reason": ["heuristic proposal intentionally not merged"],
                "review_required": True,
                "related_candidate_location_id": right_candidate,
                "notes": "Fuzzy similarity is review-only; source records remain assigned to their original candidates.",
                "distance_km": proposal["distance_km"],
                "same_context": proposal["same_context"],
            }
        )
    matches.sort(key=lambda item: (item["candidate_location_id"], item["source_record_id"], item["match_status"]))

    conflicts = {
        "duplicate_normalized_names": [
            {
                "normalized_name": name,
                "candidate_location_ids": candidate_ids,
                "interpretations": [
                    {
                        "candidate_location_id": candidate_id_value,
                        "preferred_name": candidate_by_id[candidate_id_value]["preferred_name"],
                        "candidate_type": candidate_by_id[candidate_id_value]["candidate_type"],
                        "coordinates": {
                            "latitude": candidate_by_id[candidate_id_value]["representative_latitude"],
                            "longitude": candidate_by_id[candidate_id_value]["representative_longitude"],
                        },
                        "sources": candidate_by_id[candidate_id_value]["source_names"],
                    }
                    for candidate_id_value in candidate_ids
                ],
            }
            for name, candidate_ids in sorted(duplicate_groups.items())
        ],
        "source_type_disagreements": [
            {
                "candidate_location_id": candidate["candidate_location_id"],
                "preferred_name": candidate["preferred_name"],
                "proposed_type": candidate["candidate_type"],
                "source_native_type_hints": candidate["candidate_type_source_hints"],
                "source_names": candidate["source_names"],
            }
            for candidate in candidates
            if candidate["candidate_type_status"] == "source_disagreement"
        ],
        "boundary_admin_spatial_disagreements": [
            {
                "source_record_id": record["source_record_id"],
                "source": record["source"],
                "name": record.get("exact_source_name"),
                "gate": record.get("gauteng_spatial_gate"),
            }
            for record in records
            if "conflict" in str(record.get("gauteng_spatial_gate", {}).get("status", ""))
            or "outside" in str(record.get("gauteng_spatial_gate", {}).get("status", ""))
        ],
        "fuzzy_proposals_withheld": fuzzy_proposals,
        "osm_only_candidates": [
            {
                "candidate_location_id": candidate["candidate_location_id"],
                "preferred_name": candidate["preferred_name"],
                "candidate_type": candidate["candidate_type"],
                "coordinates": {
                    "latitude": candidate["representative_latitude"],
                    "longitude": candidate["representative_longitude"],
                },
            }
            for candidate in candidates
            if candidate["osm_only"]
        ],
    }
    return {
        "candidates": candidates,
        "matches": matches,
        "conflicts": conflicts,
        "eligible_source_records": eligible_records,
        "summary": {
            "source_records_eligible": len(eligible_records),
            "candidates": len(candidates),
            "multi_source_candidates": sum(1 for candidate in candidates if candidate["source_count"] > 1),
            "single_source_candidates": sum(1 for candidate in candidates if candidate["source_count"] == 1),
            "osm_only_candidates": sum(1 for candidate in candidates if candidate["osm_only"]),
            "ambiguous_candidates": sum(1 for candidate in candidates if candidate["review_state"] == "needs_review" and "duplicate_normalized_name_across_candidates" in candidate["review_reasons"]),
            "conflicting_matches": sum(1 for match in matches if match["match_status"] == "conflict"),
            "proposed_fuzzy_matches": sum(1 for match in matches if match["match_status"] == "proposed"),
        },
    }
