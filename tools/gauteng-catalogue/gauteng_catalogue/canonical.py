from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable

from .common import (
    normalize_lookup,
    read_jsonl,
    sha256_file,
    stable_digest,
    write_json,
    write_jsonl,
)
from .promotion import (
    AUTO_PROMOTABLE,
    CANDIDATE_ONLY,
    PROVISIONAL_ATTRIBUTES,
    REJECTED,
    REQUIRED_PROBES,
)


CANONICAL_OUTPUT_VERSION = "v0.1"
CANONICAL_POLICY_VERSION = "0.2.0"
CANONICAL_STATUS = "factual_canonical"
LIFECYCLE_ACTIVE = "active"
ACCEPTED_PROMOTION_CLASSES = (AUTO_PROMOTABLE, PROVISIONAL_ATTRIBUTES)


# This is a research finding and policy gate, not a source record. The
# official material is deliberately not copied into the reusable evidence
# store until commercial persistence/derivative-use permission is established.
KYALAMI_EVIDENCE = {
    "research_status": "official_identity_evidence_found_licence_gate_unresolved",
    "machine_canonical_decision": "candidate_only_until_commercial_reuse_gate",
    "preferred_common_consumer_name": "Kyalami",
    "official_corrected_name": "Khayalami",
    "identity_relationship": "official spelling correction; one factual identity",
    "related_names_must_remain_separate": [
        "Kyalami Estate / Khayalami Estate",
        "Kyalami Hills / Khayalami Hills",
        "Kyalami AH / Khayalami AH",
        "Kyalami Gardens / Khayalami Gardens",
        "Kyalami Ridge / Khayalami Ridge",
        "other Kyalami-family places",
    ],
    "sources": [
        {
            "source": "South African Government Gazette 40081, GoN 730",
            "url": "https://www.gov.za/sites/default/files/gcis_document/201606/40081gon730.pdf",
            "published_or_reference_date": "2016-06-17",
            "finding": "Khayalami is recorded as a correction of spelling from Kyalami for a township in the City of Joburg Municipality area in Gauteng.",
            "commercial_reuse_status": "not_cleared",
        },
        {
            "source": "City of Johannesburg Corporate Geo-Informatics Online Maps",
            "url": "https://joburg.itntnetworks.co.za/online-maps/",
            "published_or_reference_date": None,
            "finding": "The official GIS lookup maps KYALAMI proper and the named Kyalami-family places to KHAYALAMI spellings.",
            "commercial_reuse_status": "no_explicit_commercial_derivative_licence_found",
        },
        {
            "source": "Department of Sport, Arts and Culture geographical-names process",
            "url": "https://www.dsac.gov.za/South%20African%20Geographical%20Names%20process",
            "published_or_reference_date": None,
            "finding": "The Department identifies the South African Geographical Names Council process and publishes an approved-names database resource.",
            "commercial_reuse_status": "no_explicit_commercial_derivative_licence_verified",
        },
        {
            "source": "South African Government website terms",
            "url": "https://www.gov.za/terms-and-conditions-use-0",
            "published_or_reference_date": None,
            "finding": "The accessible terms limit ordinary copying to non-commercial informational/reference purposes and require prior written permission for commercial use.",
            "commercial_reuse_status": "permission_required_for_commercial_use",
        },
    ],
    "licence_gate": {
        "status": "blocked",
        "reason": "Official identity evidence is strong, but a reusable commercial persistence/derivative-use right for the official web/GIS/database material was not established.",
        "required_next_step": "Obtain written permission or an explicit commercial-compatible licence from the relevant rights holder, then attach the official evidence to the existing Kyalami candidate without changing unrelated canonical IDs.",
    },
}


def _read_required_jsonl(root: Path, filename: str) -> list[dict[str, Any]]:
    path = root / filename
    if not path.is_file():
        raise FileNotFoundError(f"Required canonical input is missing: {path}")
    return list(read_jsonl(path))


def load_canonical_inputs(
    candidate_root: Path,
    promotion_output_root: Path,
) -> dict[str, Any]:
    """Load the accepted candidate/promotion layers without writing to either."""

    candidate_output = candidate_root.resolve() / "output"
    promotion_output = promotion_output_root.resolve()
    simulation = _read_required_jsonl(
        promotion_output,
        "gauteng_canonical_promotion_simulation_v0.2.jsonl",
    )
    candidates = _read_required_jsonl(
        candidate_output,
        "gauteng_candidate_catalogue_v0.1.jsonl",
    )
    source_records = _read_required_jsonl(
        candidate_output,
        "gauteng_source_records_v0.1.jsonl",
    )
    assertions = _read_required_jsonl(
        candidate_output,
        "gauteng_source_assertions_v0.1.jsonl",
    )
    matches = _read_required_jsonl(
        candidate_output,
        "gauteng_candidate_matches_v0.1.jsonl",
    )
    summary_path = promotion_output / "gauteng_canonical_promotion_summary_v0.2.json"
    run_path = candidate_output / "gauteng_catalogue_run_v0.1.json"
    manifest_path = candidate_output / "gauteng_source_manifest_v0.1.json"
    return {
        "candidate_root": candidate_root.resolve(),
        "promotion_output_root": promotion_output,
        "candidates": candidates,
        "source_records": source_records,
        "assertions": assertions,
        "matches": matches,
        "promotion_simulation": simulation,
        "promotion_summary": json.loads(summary_path.read_text(encoding="utf-8"))
        if summary_path.is_file()
        else {},
        "catalogue_run": json.loads(run_path.read_text(encoding="utf-8"))
        if run_path.is_file()
        else {},
        "source_manifest": json.loads(manifest_path.read_text(encoding="utf-8"))
        if manifest_path.is_file()
        else {},
    }


def _accepted_rows(simulation: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        (
            row
            for row in simulation
            if row.get("promotion_class") in ACCEPTED_PROMOTION_CLASSES
        ),
        key=lambda row: str(row.get("candidate_location_id")),
    )


def _source_assertion_ids_by_record(
    candidate: dict[str, Any],
) -> dict[str, list[str]]:
    result: dict[str, list[str]] = defaultdict(list)
    for entry in candidate.get("source_assertions", []):
        source_record_id = entry.get("source_record_id")
        if not source_record_id:
            continue
        result[str(source_record_id)].extend(
            str(assertion_id)
            for assertion_id in entry.get("assertion_ids", [])
            if assertion_id
        )
    return {
        source_record_id: sorted(set(assertion_ids))
        for source_record_id, assertion_ids in result.items()
    }


def _source_record_ids(candidate: dict[str, Any]) -> list[str]:
    return sorted(
        {
            str(source_id.get("source_record_id"))
            for source_id in candidate.get("source_ids", [])
            if source_id.get("source_record_id")
        }
    )


def _source_ids_by_record(candidate: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        str(source_id["source_record_id"]): source_id
        for source_id in candidate.get("source_ids", [])
        if source_id.get("source_record_id")
    }


def _source_tags(record: dict[str, Any]) -> dict[str, Any]:
    payload = record.get("source_payload") or {}
    tags = payload.get("tags") or {}
    return tags if isinstance(tags, dict) else {}


def _as_name_values(value: Any) -> list[str]:
    if isinstance(value, (list, tuple, set)):
        values = [str(item).strip() for item in value]
    elif value is None:
        values = []
    else:
        values = [str(value).strip()]
    return sorted({value for value in values if value})


def _source_assertions_for_names(
    source_record_id: str,
    assertions_by_record: dict[str, list[dict[str, Any]]],
) -> list[str]:
    return sorted(
        str(assertion.get("assertion_id"))
        for assertion in assertions_by_record.get(source_record_id, [])
        if assertion.get("assertion_id")
    )


def _is_searchable_name(value: str) -> bool:
    """Keep source labels for provenance without exposing identifier aliases."""

    normalized = value.strip().casefold()
    if not normalized:
        return False
    if normalized.startswith(("http://", "https://")):
        return False
    if re.fullmatch(r"q\d+", normalized):
        return False
    # GeoNames alternate-name exports can include compact country/code values
    # such as ZABNI or ZAZBQ. They are retained as source labels, not names.
    if re.fullmatch(r"za[a-z0-9]{3}", normalized):
        return False
    return True


def _add_name_value(
    bucket: dict[tuple[str, str], dict[str, Any]],
    *,
    name: str,
    role: str,
    source_record_ids: Iterable[str],
    source_assertion_ids: Iterable[str],
    source_names: Iterable[str],
    derived_from_candidate: bool = False,
) -> None:
    display_name = str(name).strip()
    normalized_name = normalize_lookup(display_name)
    if not normalized_name:
        return
    key = (normalized_name, role)
    row = bucket.setdefault(
        key,
        {
            "display_name": display_name,
            "normalized_name": normalized_name,
            "roles": set(),
            "source_record_ids": set(),
            "source_assertion_ids": set(),
            "source_names": set(),
            "derived_from_candidate": False,
        },
    )
    # Preserve the first deterministic spelling while accumulating all
    # evidence. Candidate/source iteration is sorted by the caller.
    row["roles"].add(role)
    row["source_record_ids"].update(str(value) for value in source_record_ids if value)
    row["source_assertion_ids"].update(str(value) for value in source_assertion_ids if value)
    row["source_names"].update(str(value) for value in source_names if value)
    row["derived_from_candidate"] = row["derived_from_candidate"] or derived_from_candidate


def _name_assertions(
    candidate: dict[str, Any],
    simulation: dict[str, Any],
    records_by_id: dict[str, dict[str, Any]],
    assertions_by_record: dict[str, list[dict[str, Any]]],
) -> list[dict[str, Any]]:
    candidate_id = str(candidate["candidate_location_id"])
    source_record_ids = _source_record_ids(candidate)
    source_assertion_ids = [
        assertion_id
        for source_record_id in source_record_ids
        for assertion_id in _source_assertions_for_names(
            source_record_id,
            assertions_by_record,
        )
    ]
    source_names = simulation.get("source_support", {}).get("sources", [])
    bucket: dict[tuple[str, str], dict[str, Any]] = {}
    _add_name_value(
        bucket,
        name=str(candidate.get("preferred_name") or ""),
        role="preferred_common",
        source_record_ids=source_record_ids,
        source_assertion_ids=source_assertion_ids,
        source_names=source_names,
        derived_from_candidate=True,
    )
    for alias in candidate.get("aliases", []) or []:
        _add_name_value(
            bucket,
            name=str(alias),
            role="alias",
            source_record_ids=source_record_ids,
            source_assertion_ids=source_assertion_ids,
            source_names=source_names,
        )
    for historical_name in candidate.get("historical_names", []) or []:
        _add_name_value(
            bucket,
            name=str(historical_name),
            role="historical",
            source_record_ids=source_record_ids,
            source_assertion_ids=source_assertion_ids,
            source_names=source_names,
        )

    preferred_normalized = normalize_lookup(candidate.get("preferred_name"))
    for source_record_id in source_record_ids:
        record = records_by_id.get(source_record_id, {})
        record_assertions = _source_assertions_for_names(
            source_record_id,
            assertions_by_record,
        )
        record_source = [record.get("source") or ""]
        exact_name = str(record.get("exact_source_name") or "").strip()
        if exact_name:
            role = "preferred_common" if normalize_lookup(exact_name) == preferred_normalized else "alias"
            _add_name_value(
                bucket,
                name=exact_name,
                role=role,
                source_record_ids=[source_record_id],
                source_assertion_ids=record_assertions,
                source_names=record_source,
            )
        for alias in record.get("aliases_supplied_by_source", []) or []:
            _add_name_value(
                bucket,
                name=str(alias),
                role="alias",
                source_record_ids=[source_record_id],
                source_assertion_ids=record_assertions,
                source_names=record_source,
            )
        for historical_name in record.get("historical_names_supplied_by_source", []) or []:
            _add_name_value(
                bucket,
                name=str(historical_name),
                role="historical",
                source_record_ids=[source_record_id],
                source_assertion_ids=record_assertions,
                source_names=record_source,
            )
        tags = _source_tags(record)
        for tag_key, role in (
            ("official_name", "official"),
            ("official_name_en", "official"),
            ("alt_name", "alias"),
            ("short_name", "alias"),
            ("old_name", "historical"),
        ):
            for value in _as_name_values(tags.get(tag_key)):
                _add_name_value(
                    bucket,
                    name=value,
                    role=role,
                    source_record_ids=[source_record_id],
                    source_assertion_ids=record_assertions,
                    source_names=record_source,
                )

    # A single normalized name can carry multiple factual roles, such as an
    # official name that is also the preferred consumer name. Merge those
    # roles into one name assertion rather than creating duplicate names.
    merged: dict[str, dict[str, Any]] = {}
    for row in bucket.values():
        key = row["normalized_name"]
        target = merged.setdefault(
            key,
            {
                "display_name": row["display_name"],
                "normalized_name": key,
                "roles": set(),
                "source_record_ids": set(),
                "source_assertion_ids": set(),
                "source_names": set(),
                "derived_from_candidate": False,
            },
        )
        target["roles"].update(row["roles"])
        target["source_record_ids"].update(row["source_record_ids"])
        target["source_assertion_ids"].update(row["source_assertion_ids"])
        target["source_names"].update(row["source_names"])
        target["derived_from_candidate"] = target["derived_from_candidate"] or row["derived_from_candidate"]

    role_priority = {
        "preferred_common": 0,
        "official": 1,
        "alias": 2,
        "spelling_variant": 3,
        "historical": 4,
    }
    result = []
    for row in sorted(merged.values(), key=lambda value: (value["normalized_name"], value["display_name"])):
        roles = sorted(row["roles"], key=lambda role: (role_priority.get(role, 99), role))
        primary_role = roles[0] if roles else "alias"
        assertion_id = f"cln-name-{stable_digest([candidate_id, row['normalized_name'], roles, sorted(row['source_record_ids'])], 20)}"
        result.append(
            {
                "name_assertion_id": assertion_id,
                "canonical_location_id": candidate_id,
                "name": row["display_name"],
                "normalized_name": row["normalized_name"],
                "name_type": primary_role,
                "name_roles": roles,
                "status": "historical" if "historical" in roles and primary_role == "historical" else "active",
                "searchable": _is_searchable_name(row["display_name"]),
                "source_record_ids": sorted(row["source_record_ids"]),
                "source_assertion_ids": sorted(row["source_assertion_ids"]),
                "source_names": sorted(row["source_names"]),
                "derived_from_candidate": row["derived_from_candidate"],
                "provenance_statement": "Property Listify name assertion derived from accepted candidate evidence; source-native labels remain linked.",
            }
        )
    return result


def _administrative_relationships(
    candidate: dict[str, Any],
    simulation: dict[str, Any],
) -> list[dict[str, Any]]:
    relationships: list[dict[str, Any]] = []
    context = candidate.get("administrative_context") or {}
    confidence = simulation.get("administrative_assignment_confidence", "supported")
    for level in ("province", "adm2", "adm3"):
        value = context.get(level)
        values = value if isinstance(value, list) else [value]
        for item in values:
            if not isinstance(item, dict) or not item.get("name"):
                continue
            relationship_id = f"rel-{stable_digest([candidate['candidate_location_id'], level, item], 20)}"
            relationships.append(
                {
                    "relationship_id": relationship_id,
                    "relationship_type": "administrative_containment",
                    "administrative_level": level,
                    "target_name": item.get("name"),
                    "target_source_native_id": item.get("source_native_id"),
                    "target_source_properties": item.get("source_properties", {}),
                    "confidence": confidence,
                    "status": "supported" if confidence == "supported" else "provisional",
                    "source": "geoBoundaries administrative context",
                    "canonical_parent_not_invented": True,
                }
            )
    return sorted(relationships, key=lambda row: row["relationship_id"])


def _match_evidence(
    candidate_id: str,
    source_record_id: str,
    matches_by_candidate: dict[str, list[dict[str, Any]]],
) -> list[dict[str, Any]]:
    evidence = []
    for match in matches_by_candidate.get(candidate_id, []):
        if match.get("source_record_id") != source_record_id:
            continue
        evidence.append(
            {
                "match_method": match.get("match_method"),
                "match_status": match.get("match_status"),
                "match_confidence": match.get("match_confidence"),
                "conflict_reason": match.get("conflict_reason", []),
                "notes": match.get("notes"),
                "review_required": match.get("review_required"),
                "evidence_assertion_ids": sorted(match.get("evidence_assertion_ids", [])),
                "evidence_source_artifact_ids": sorted(match.get("evidence_source_artifact_ids", [])),
            }
        )
    return sorted(
        evidence,
        key=lambda row: (
            str(row.get("match_method")),
            str(row.get("match_status")),
            json.dumps(row, ensure_ascii=False, sort_keys=True),
        ),
    )


def _source_link_rows(
    candidate: dict[str, Any],
    simulation: dict[str, Any],
    records_by_id: dict[str, dict[str, Any]],
    assertions_by_record: dict[str, list[dict[str, Any]]],
    matches_by_candidate: dict[str, list[dict[str, Any]]],
) -> list[dict[str, Any]]:
    candidate_id = str(candidate["candidate_location_id"])
    assertion_ids_by_record = _source_assertion_ids_by_record(candidate)
    source_ids_by_record = _source_ids_by_record(candidate)
    rows = []
    for source_record_id in _source_record_ids(candidate):
        record = records_by_id.get(source_record_id, {})
        source_id = source_ids_by_record.get(source_record_id, {})
        source_assertion_ids = assertion_ids_by_record.get(
            source_record_id,
            _source_assertions_for_names(source_record_id, assertions_by_record),
        )
        matches = _match_evidence(candidate_id, source_record_id, matches_by_candidate)
        artifact_ids = set(record.get("source_artifact_ids", []) or [])
        for match in matches:
            artifact_ids.update(match.get("evidence_source_artifact_ids", []))
        link_id = f"cln-source-{stable_digest([candidate_id, source_record_id], 20)}"
        rows.append(
            {
                "source_link_id": link_id,
                "canonical_location_id": candidate_id,
                "candidate_location_id": candidate_id,
                "source_record_id": source_record_id,
                "source": record.get("source") or source_id.get("source"),
                "source_native_id": record.get("source_native_id") or source_id.get("source_native_id"),
                "source_native_stable_id": record.get("source_native_stable_id"),
                "exact_source_name": record.get("exact_source_name"),
                "source_native_classification": record.get("source_native_classification", {}),
                "source_record_geometry": record.get("geometry"),
                "source_artifact_ids": sorted(artifact_ids),
                "source_assertion_ids": sorted(source_assertion_ids),
                "source_assertion_count": len(source_assertion_ids),
                "source_modification_date": record.get("source_modification_date"),
                "retrieved_at": record.get("retrieved_at"),
                "licence_class": record.get("licence_class"),
                "attribution": record.get("attribution"),
                "match_evidence": matches,
                "promotion_class": simulation.get("promotion_class"),
                "evidence_role": "supporting_identity_evidence",
                "odbl_evidence": record.get("licence_class") == "ODBL_1",
            }
        )
    return sorted(rows, key=lambda row: row["source_link_id"])


def _licensing_classification(simulation: dict[str, Any]) -> str:
    state = simulation.get("licence_state")
    if state == "ODBL_ONLY":
        return "osm_only_odbl_provisional"
    if state == "MIXED_INCLUDES_ODBL":
        return "mixed_odbl_supported"
    return "permissive_supported"


def _canonical_row(
    candidate: dict[str, Any],
    simulation: dict[str, Any],
    names: list[dict[str, Any]],
    source_links: list[dict[str, Any]],
) -> dict[str, Any]:
    candidate_id = str(candidate["candidate_location_id"])
    type_attributes = simulation.get("attribute_confidence", {}).get("type", {})
    spatial_attributes = simulation.get("attribute_confidence", {}).get("spatial", {})
    name_attributes = simulation.get("attribute_confidence", {}).get("name", {})
    official_names = [
        row["name"]
        for row in names
        if "official" in row.get("name_roles", [])
    ]
    all_assertion_ids = sorted(
        {
            assertion_id
            for link in source_links
            for assertion_id in link.get("source_assertion_ids", [])
        }
    )
    unresolved_attributes = sorted(set(simulation.get("unresolved_attributes", [])))
    licensing_classification = _licensing_classification(simulation)
    return {
        "canonical_location_id": candidate_id,
        "identity_namespace": "Property Listify",
        "canonical_status": CANONICAL_STATUS,
        "lifecycle_status": LIFECYCLE_ACTIVE,
        "promotion_class": simulation.get("promotion_class"),
        "promotion_policy_version": CANONICAL_POLICY_VERSION,
        "candidate_layer_reference": {
            "candidate_location_id": candidate_id,
            "candidate_promotion_class": simulation.get("promotion_class"),
            "candidate_layer_retained": True,
        },
        "identity_confidence": simulation.get("identity_evidence", {}).get("confidence"),
        "identity_evidence_class": simulation.get("identity_evidence", {}).get("class"),
        "identity_evidence": simulation.get("identity_evidence", {}),
        "preferred_name": candidate.get("preferred_name"),
        "official_name": official_names[0] if official_names else None,
        "normalized_name": candidate.get("normalized_name"),
        "name_assertion_ids": [row["name_assertion_id"] for row in names],
        "name_confidence": name_attributes.get("confidence"),
        "name_state": "supported",
        "canonical_type": simulation.get("assessed_candidate_type") or candidate.get("candidate_type"),
        "proposed_type": candidate.get("candidate_type"),
        "type_confidence": type_attributes.get("confidence"),
        "type_state": "supported" if type_attributes.get("confidence") == "supported" else "provisional",
        "type_assessment": simulation.get("type_assessment"),
        "type_assessment_reason": simulation.get("type_assessment_reason"),
        "source_native_classifications": simulation.get("source_support", {}).get("source_native_types", []),
        "representative_latitude": candidate.get("representative_latitude"),
        "representative_longitude": candidate.get("representative_longitude"),
        "representative_geometry": candidate.get("representative_geometry"),
        "spatial_confidence": spatial_attributes.get("confidence"),
        "administrative_context": candidate.get("administrative_context", {}),
        "administrative_relationships": _administrative_relationships(candidate, simulation),
        "administrative_assignment_confidence": simulation.get("administrative_assignment_confidence"),
        "boundary_conflict": bool(simulation.get("boundary_conflict")),
        "unresolved_attributes": unresolved_attributes,
        "source_record_ids": [link["source_record_id"] for link in source_links],
        "source_assertion_ids": all_assertion_ids,
        "source_names": simulation.get("source_support", {}).get("sources", []),
        "source_count": simulation.get("source_support", {}).get("source_count", len(source_links)),
        "source_modification_dates": candidate.get("source_modification_dates", []),
        "first_seen": candidate.get("first_seen"),
        "last_verified_at": candidate.get("last_verified_at"),
        "licence_classes": sorted(set(simulation.get("licence_classes", []))),
        "licensing_classification": licensing_classification,
        "licence_state": simulation.get("licence_state"),
        "licence_gate": simulation.get("licence_gate"),
        "odbl_evidence_present": bool(simulation.get("odbl_evidence_present")),
        "licence_review_state": (
            "required_before_production_use"
            if simulation.get("odbl_evidence_present")
            else "source_attribution_required"
        ),
        "osm_only": bool(simulation.get("osm_only")),
        "source_representation": simulation.get("source_representation"),
        "promotion_reasons": simulation.get("promotion_reasons", []),
        "source_evidence_statement": "Accepted factual identity derived from the v0.2 promotion simulation; source records and assertions remain the evidence authority.",
    }


def _probe_results(
    canonical_rows: list[dict[str, Any]],
    all_simulation: list[dict[str, Any]],
    name_rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    canonical_by_name: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in canonical_rows:
        canonical_by_name[str(row.get("normalized_name") or "")].append(row)
    canonical_ids = {row["canonical_location_id"] for row in canonical_rows}
    names_by_canonical: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for name in name_rows:
        names_by_canonical[str(name.get("canonical_location_id"))].append(
            {
                "name_assertion_id": name.get("name_assertion_id"),
                "name": name.get("name"),
                "normalized_name": name.get("normalized_name"),
                "name_type": name.get("name_type"),
                "name_roles": name.get("name_roles", []),
                "status": name.get("status"),
                "searchable": name.get("searchable"),
            }
        )
    for canonical_id in names_by_canonical:
        names_by_canonical[canonical_id].sort(
            key=lambda name: str(name.get("name_assertion_id"))
        )
    candidate_by_name: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in all_simulation:
        candidate_by_name[str(row.get("normalized_name") or "")].append(row)
    results = []
    for probe in REQUIRED_PROBES:
        normalized = normalize_lookup(probe)
        canonical_interpretations = []
        for row in sorted(canonical_by_name.get(normalized, []), key=lambda value: value["canonical_location_id"]):
            canonical_interpretations.append(
                {
                    "canonical_location_id": row["canonical_location_id"],
                    "preferred_name": row["preferred_name"],
                    "official_name": row.get("official_name"),
                    "name_assertions": names_by_canonical.get(row["canonical_location_id"], []),
                    "canonical_type": row.get("canonical_type"),
                    "type_state": row.get("type_state"),
                    "type_confidence": row.get("type_confidence"),
                    "representative_latitude": row.get("representative_latitude"),
                    "representative_longitude": row.get("representative_longitude"),
                    "source_names": row.get("source_names", []),
                    "licensing_classification": row.get("licensing_classification"),
                    "licence_classes": row.get("licence_classes", []),
                    "unresolved_attributes": row.get("unresolved_attributes", []),
                    "administrative_context": row.get("administrative_context", {}),
                    "boundary_conflict": row.get("boundary_conflict", False),
                }
            )
        extra_candidates = []
        for row in sorted(candidate_by_name.get(normalized, []), key=lambda value: str(value.get("candidate_location_id"))):
            candidate_id = str(row.get("candidate_location_id"))
            if candidate_id in canonical_ids:
                continue
            extra_candidates.append(
                {
                    "candidate_location_id": candidate_id,
                    "preferred_name": row.get("preferred_name"),
                    "candidate_type": row.get("candidate_type"),
                    "assessed_candidate_type": row.get("assessed_candidate_type"),
                    "promotion_class": row.get("promotion_class"),
                    "sources": row.get("source_support", {}).get("sources", []),
                    "licence_state": row.get("licence_state"),
                    "reason": row.get("promotion_reasons", []),
                    "identity_confidence": row.get("identity_evidence", {}).get("confidence"),
                    "identity_evidence_class": row.get("identity_evidence", {}).get("class"),
                    "representative_latitude": row.get("representative_latitude"),
                    "representative_longitude": row.get("representative_longitude"),
                    "administrative_context": row.get("administrative_context", {}),
                    "aliases": row.get("aliases", []),
                    "historical_names": row.get("historical_names", []),
                    "conflicts": row.get("conflicts", []),
                    "boundary_conflict": row.get("boundary_conflict", False),
                    "deliberately_not_canonical": True,
                }
            )
        results.append(
            {
                "probe": probe,
                "normalized_name": normalized,
                "canonical_identity_found": bool(canonical_interpretations),
                "canonical_interpretation_count": len(canonical_interpretations),
                "canonical_interpretations": canonical_interpretations,
                "extra_candidate_interpretations": extra_candidates,
            }
        )
    return results


def _kyalami_summary(all_simulation: list[dict[str, Any]]) -> dict[str, Any]:
    rows = [
        {
            "candidate_location_id": row.get("candidate_location_id"),
            "preferred_name": row.get("preferred_name"),
            "candidate_type": row.get("candidate_type"),
            "promotion_class": row.get("promotion_class"),
            "sources": row.get("source_support", {}).get("sources", []),
            "licence_state": row.get("licence_state"),
        }
        for row in all_simulation
        if str(row.get("normalized_name")) == "kyalami"
    ]
    return {
        **KYALAMI_EVIDENCE,
        "existing_candidate_interpretations": sorted(
            rows,
            key=lambda row: str(row.get("candidate_location_id")),
        ),
        "canonical_location_id": None,
    }


def _input_checksums(inputs: dict[str, Any]) -> dict[str, Any]:
    paths = {
        "candidate_catalogue": inputs["candidate_root"] / "output" / "gauteng_candidate_catalogue_v0.1.jsonl",
        "source_records": inputs["candidate_root"] / "output" / "gauteng_source_records_v0.1.jsonl",
        "source_assertions": inputs["candidate_root"] / "output" / "gauteng_source_assertions_v0.1.jsonl",
        "candidate_matches": inputs["candidate_root"] / "output" / "gauteng_candidate_matches_v0.1.jsonl",
        "promotion_simulation": inputs["promotion_output_root"] / "gauteng_canonical_promotion_simulation_v0.2.jsonl",
    }
    result = {}
    for key, path in sorted(paths.items()):
        result[key] = {
            "filename": path.name,
            "sha256": sha256_file(path) if path.is_file() else None,
            "size_bytes": path.stat().st_size if path.is_file() else None,
            "available": path.is_file(),
        }
    return result


def _duplicate_safety(
    canonical_rows: list[dict[str, Any]],
    all_simulation: list[dict[str, Any]],
) -> dict[str, Any]:
    by_name: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in canonical_rows:
        by_name[str(row.get("normalized_name") or "")].append(row)
    duplicate_canonical_groups = {
        name: sorted(row["canonical_location_id"] for row in rows)
        for name, rows in by_name.items()
        if len(rows) > 1
    }
    return {
        "canonical_normalized_name_groups_with_multiple_identities": len(duplicate_canonical_groups),
        "canonical_records_in_duplicate_name_groups": sum(len(ids) for ids in duplicate_canonical_groups.values()),
        "examples": [
            {"normalized_name": name, "canonical_location_ids": ids}
            for name, ids in sorted(duplicate_canonical_groups.items())[:10]
        ],
        "source_representation_secondary_rows_not_canonical": sum(
            (row.get("source_representation") or {}).get("role") == "secondary"
            for row in all_simulation
        ),
        "candidate_only_and_rejected_rows_not_canonical": sum(
            row.get("promotion_class") in {CANDIDATE_ONLY, REJECTED}
            for row in all_simulation
        ),
        "aliases_are_name_assertions_not_canonical_records": True,
    }


def build_canonical_dataset(inputs: dict[str, Any]) -> dict[str, Any]:
    candidates_by_id = {
        str(candidate["candidate_location_id"]): candidate
        for candidate in inputs["candidates"]
    }
    records_by_id = {
        str(record["source_record_id"]): record
        for record in inputs["source_records"]
    }
    assertions_by_record: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for assertion in inputs["assertions"]:
        source_record_id = assertion.get("source_record_id")
        if source_record_id:
            assertions_by_record[str(source_record_id)].append(assertion)
    for source_record_id in assertions_by_record:
        assertions_by_record[source_record_id].sort(
            key=lambda assertion: str(assertion.get("assertion_id"))
        )
    matches_by_candidate: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for match in inputs["matches"]:
        matches_by_candidate[str(match.get("candidate_location_id"))].append(match)

    simulation_rows = sorted(
        inputs["promotion_simulation"],
        key=lambda row: str(row.get("candidate_location_id")),
    )
    accepted_simulation = _accepted_rows(simulation_rows)
    canonical_rows: list[dict[str, Any]] = []
    name_rows: list[dict[str, Any]] = []
    source_link_rows: list[dict[str, Any]] = []
    for simulation in accepted_simulation:
        candidate_id = str(simulation["candidate_location_id"])
        candidate = candidates_by_id.get(candidate_id)
        if candidate is None:
            raise ValueError(f"Accepted simulation row has no candidate evidence: {candidate_id}")
        names = _name_assertions(
            candidate,
            simulation,
            records_by_id,
            assertions_by_record,
        )
        links = _source_link_rows(
            candidate,
            simulation,
            records_by_id,
            assertions_by_record,
            matches_by_candidate,
        )
        row = _canonical_row(candidate, simulation, names, links)
        canonical_rows.append(row)
        name_rows.extend(names)
        source_link_rows.extend(links)

    canonical_rows.sort(key=lambda row: row["canonical_location_id"])
    name_rows.sort(key=lambda row: row["name_assertion_id"])
    source_link_rows.sort(key=lambda row: row["source_link_id"])
    probes = _probe_results(canonical_rows, simulation_rows, name_rows)
    kyalami = _kyalami_summary(simulation_rows)
    promotion_classes = Counter(row.get("promotion_class") for row in simulation_rows)
    canonical_types = Counter(row.get("canonical_type") for row in canonical_rows)
    canonical_licensing = Counter(row.get("licensing_classification") for row in canonical_rows)
    unresolved_type = sum("candidate_type" in row.get("unresolved_attributes", []) for row in canonical_rows)
    unresolved_admin = sum(
        row.get("administrative_assignment_confidence") != "supported"
        for row in canonical_rows
    )
    unresolved_spatial = sum(
        row.get("spatial_confidence") != "supported"
        for row in canonical_rows
    )
    boundary_conflicts = sum(bool(row.get("boundary_conflict")) for row in canonical_rows)
    aliases = sum(
        any(role in {"alias", "official", "spelling_variant"} for role in name.get("name_roles", []))
        for name in name_rows
    )
    historical = sum(
        "historical" in name.get("name_roles", [])
        for name in name_rows
    )
    canonical_name_ids = {row["canonical_location_id"] for row in canonical_rows}
    aliases_by_canonical = Counter(
        name["canonical_location_id"]
        for name in name_rows
        if name["canonical_location_id"] in canonical_name_ids
        and any(role in {"alias", "official", "spelling_variant"} for role in name.get("name_roles", []))
    )
    historical_by_canonical = Counter(
        name["canonical_location_id"]
        for name in name_rows
        if name["canonical_location_id"] in canonical_name_ids
        and "historical" in name.get("name_roles", [])
    )
    summary = {
        "output_version": CANONICAL_OUTPUT_VERSION,
        "canonical_status": CANONICAL_STATUS,
        "identity_owner": "Property Listify",
        "evidence_owner": "respective source; source IDs, assertions and licence obligations remain attached",
        "promotion_authority": {
            "policy_version": CANONICAL_POLICY_VERSION,
            "accepted_promotion_classes": list(ACCEPTED_PROMOTION_CLASSES),
            "simulation_output": "gauteng_canonical_promotion_simulation_v0.2.jsonl",
        },
        "canonical_result": {
            "total_factual_canonical_identities": len(canonical_rows),
            "auto_promoted": promotion_classes[AUTO_PROMOTABLE],
            "provisional_attribute_identities": promotion_classes[PROVISIONAL_ATTRIBUTES],
            "expected_accepted_identity_count": 1480,
            "difference_from_expected": len(canonical_rows) - 1480,
            "candidate_only_retained_outside_canonical": promotion_classes[CANDIDATE_ONLY],
            "rejected_non_independent_retained_outside_canonical": promotion_classes[REJECTED],
            "formal_founder_review_rows": promotion_classes.get("founder_review_required", 0),
            "by_canonical_type": dict(sorted(canonical_types.items())),
            "identities_with_unresolved_type": unresolved_type,
            "identities_with_admin_uncertainty": unresolved_admin,
            "identities_with_spatial_uncertainty": unresolved_spatial,
            "identities_with_boundary_conflict": boundary_conflicts,
            "identities_with_alias_or_official_name_assertions": len(aliases_by_canonical),
            "identities_with_historical_name_assertions": len(historical_by_canonical),
            "name_assertion_count": len(name_rows),
            "non_searchable_source_label_count": sum(
                not name.get("searchable", True) for name in name_rows
            ),
            "source_link_count": len(source_link_rows),
            "aliases_or_official_name_assertion_count": aliases,
            "historical_name_assertion_count": historical,
        },
        "licensing_distribution": {
            "by_canonical_licensing_classification": dict(sorted(canonical_licensing.items())),
            "permissive_supported": canonical_licensing.get("permissive_supported", 0),
            "mixed_odbl_supported": canonical_licensing.get("mixed_odbl_supported", 0),
            "osm_only_odbl_provisional": canonical_licensing.get("osm_only_odbl_provisional", 0),
            "odbl_evidence_remains_non_proprietary": True,
        },
        "candidate_layer": {
            "total_candidates": len(simulation_rows),
            "candidate_only": promotion_classes[CANDIDATE_ONLY],
            "rejected_non_independent": promotion_classes[REJECTED],
            "source_records_not_deleted": True,
            "candidate_matches_not_deleted": True,
            "source_assertions_not_deleted": True,
        },
        "name_model": {
            "separate_name_assertion_layer": True,
            "supported_roles": ["preferred_common", "official", "alias", "historical", "spelling_variant"],
            "aliases_are_not_canonical_identities": True,
        },
        "duplicate_safety": _duplicate_safety(canonical_rows, simulation_rows),
        "kyalami_khayalami": kyalami,
        "required_property_search_probes": probes,
        "special_probe_handling": {
            "Sandton": "Strong multi-source interpretation is canonical; weak NGA-only interpretation remains candidate-only.",
            "Mamelodi": "Strong town/place interpretation is canonical; OSM residential-development interpretation remains candidate-only.",
            "Kyalami": "No canonical row is emitted until the official evidence commercial-reuse gate is cleared; the founder naming policy is preserved in the Kyalami gate record.",
        },
        "input_checksums": _input_checksums(inputs),
        "scope": {
            "no_source_artifact_mutation": True,
            "no_candidate_layer_mutation": True,
            "no_database_operations": True,
            "no_product_search_changes": True,
            "no_search_areas": True,
            "no_production_integration": True,
        },
    }
    return {
        "canonical_rows": canonical_rows,
        "name_rows": name_rows,
        "source_link_rows": source_link_rows,
        "summary": summary,
        "kyalami_evidence": kyalami,
    }


def _markdown_probe_value(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def summary_markdown(result: dict[str, Any], artifact_paths: dict[str, Path]) -> str:
    summary = result["summary"]
    counts = summary["canonical_result"]
    licensing = summary["licensing_distribution"]
    lines = [
        "# Property Listify Gauteng Factual Canonical Geography v0.1",
        "",
        "This is a derived, non-production factual authority. It does not write",
        "application geography, Search Areas, databases or product code.",
        "",
        "## Canonical result",
        "",
        f"- Factual canonical identities: **{counts['total_factual_canonical_identities']}**.",
        f"- Auto-promoted: **{counts['auto_promoted']}**.",
        f"- Provisional attributes: **{counts['provisional_attribute_identities']}**.",
        f"- Candidate-only retained outside canonical: **{counts['candidate_only_retained_outside_canonical']}**.",
        f"- Rejected/non-independent retained outside canonical: **{counts['rejected_non_independent_retained_outside_canonical']}**.",
        f"- Difference from expected 1,480 accepted identities: **{counts['difference_from_expected']}**.",
        f"- Unresolved type: **{counts['identities_with_unresolved_type']}**; administrative uncertainty: **{counts['identities_with_admin_uncertainty']}**; spatial/boundary uncertainty: **{counts['identities_with_spatial_uncertainty']}**/**{counts['identities_with_boundary_conflict']}**.",
        f"- Name assertions: **{counts['name_assertion_count']}**; identifier-like source labels retained but non-searchable: **{counts['non_searchable_source_label_count']}**.",
        f"- Canonical types: `{_markdown_probe_value(counts['by_canonical_type'])}`.",
        "",
        "## Licensing",
        "",
        f"- Classification: `{_markdown_probe_value(licensing['by_canonical_licensing_classification'])}`.",
        "- `ODBL_1` evidence remains explicitly attributable and is not represented as proprietary source data.",
        "- OSM-only provisional identities remain subject to a production ODbL database-strategy gate.",
        "",
        "## Kyalami / Khayalami",
        "",
        f"- Machine decision: **{summary['kyalami_khayalami']['machine_canonical_decision']}**.",
        "- Official evidence supports Khayalami as the corrected spelling from Kyalami and therefore one intended factual identity.",
        "- The official material was not ingested into the reusable evidence store because commercial persistence/derivative-use permission was not established.",
        "- Preferred consumer name remains `Kyalami`; official/corrected name remains `Khayalami` in the founder policy gate.",
        "- Kyalami-family places remain separate candidate interpretations unless separately evidenced.",
        "",
        "## Sandton / Mamelodi",
        "",
        "- Strong Sandton proceeds; the weak NGA-only interpretation remains candidate-only.",
        "- Strong Mamelodi proceeds; the extra OSM residential-development interpretation remains candidate-only.",
        "",
        "## Duplicate safety",
        "",
        f"- Canonical duplicate-name groups: **{summary['duplicate_safety']['canonical_normalized_name_groups_with_multiple_identities']}**.",
        f"- Canonical records in duplicate-name groups: **{summary['duplicate_safety']['canonical_records_in_duplicate_name_groups']}**.",
        "- Aliases are name assertions and never create canonical records.",
        "- Source-representation secondary rows and candidate/rejected rows remain outside the canonical layer.",
        "",
        "## Required probes",
        "",
        "| Probe | Canonical? | Canonical IDs | Extra candidate interpretations |",
        "|---|---|---|---|",
    ]
    for probe in summary["required_property_search_probes"]:
        canonical_ids = ", ".join(
            row["canonical_location_id"]
            for row in probe["canonical_interpretations"]
        ) or "—"
        extras = ", ".join(
            row["candidate_location_id"]
            for row in probe["extra_candidate_interpretations"]
        ) or "—"
        lines.append(
            f"| {probe['probe']} | {'yes' if probe['canonical_identity_found'] else 'no'} | `{canonical_ids}` | `{extras}` |"
        )
    lines.extend([
        "",
        "## Output artifacts",
        "",
    ])
    for key, path in artifact_paths.items():
        lines.append(f"- `{key}`: `{path.name}`")
    lines.extend([
        "",
        "## Reproducibility",
        "",
        "The canonical layer is derived from the accepted v0.2 simulation and",
        "the read-only candidate/source/assertion/match artifacts. Stable",
        "Property Listify candidate IDs are retained as canonical IDs; provider",
        "IDs remain evidence only.",
    ])
    return "\n".join(lines) + "\n"


def write_canonical_outputs(
    result: dict[str, Any],
    output_root: Path,
) -> dict[str, Path]:
    output_root = output_root.resolve()
    output_root.mkdir(parents=True, exist_ok=True)
    geography_path = output_root / "gauteng_factual_canonical_geography_v0.1.jsonl"
    names_path = output_root / "gauteng_factual_canonical_names_v0.1.jsonl"
    source_links_path = output_root / "gauteng_factual_canonical_source_links_v0.1.jsonl"
    summary_path = output_root / "gauteng_factual_canonical_summary_v0.1.json"
    report_path = output_root / "gauteng_factual_canonical_summary_v0.1.md"
    kyalami_path = output_root / "gauteng_factual_canonical_kyalami_evidence_v0.1.json"
    paths = {
        "canonical_geography_jsonl": geography_path,
        "canonical_names_jsonl": names_path,
        "canonical_source_links_jsonl": source_links_path,
        "canonical_summary_json": summary_path,
        "canonical_summary_markdown": report_path,
        "kyalami_evidence_json": kyalami_path,
    }
    write_jsonl(geography_path, result["canonical_rows"], sort_key="canonical_location_id")
    write_jsonl(names_path, result["name_rows"], sort_key="name_assertion_id")
    write_jsonl(source_links_path, result["source_link_rows"], sort_key="source_link_id")
    write_json(summary_path, {
        **result["summary"],
        "output_paths": {key: path.name for key, path in paths.items()},
    })
    write_json(kyalami_path, result["kyalami_evidence"])
    report_path.write_text(summary_markdown(result, paths), encoding="utf-8")
    return paths


def run_canonical(
    candidate_root: Path,
    promotion_output_root: Path,
    output_root: Path,
) -> dict[str, Any]:
    inputs = load_canonical_inputs(candidate_root, promotion_output_root)
    result = build_canonical_dataset(inputs)
    paths = write_canonical_outputs(result, output_root)
    result["output_paths"] = {key: str(path) for key, path in paths.items()}
    # Rewrite the summary once paths are known. Only relative output names are
    # stored so the machine artifact remains portable across worktrees.
    write_json(
        paths["canonical_summary_json"],
        {
            **result["summary"],
            "output_paths": {key: path.name for key, path in paths.items()},
        },
    )
    return result
