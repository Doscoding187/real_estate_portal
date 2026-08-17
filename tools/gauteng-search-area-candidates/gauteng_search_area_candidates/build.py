"""Build the Gauteng Search Area candidate-definition authority pack.

The builder consumes only the accepted Gauteng Search Area research outputs.
It produces non-production JSON/JSONL artifacts and never writes to
application, database, or production Search Area files.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import shutil
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable


SCHEMA_VERSION = "0.1"
DEFINITION_VERSION = "gauteng-search-area-definitions-v0.1"
MEMBERSHIP_POLICY_VERSION = "gauteng-search-area-membership-policy-v0.1"
RESEARCH_VERSION = "gauteng-search-area-research-v0.1"
EVIDENCE_RELATIVE_PATH = (
    "data/gauteng-search-area-research-v0.1/output/"
    "gauteng_search_area_membership_evidence_v0.1.jsonl"
)
GAPS_RELATIVE_PATH = (
    "data/gauteng-search-area-research-v0.1/output/"
    "gauteng_search_area_geography_gaps_v0.1.json"
)

ACTIVE_MEMBERSHIP_CLASSES = ("core", "strongly_supported")
DEFERRED_MEMBERSHIP_CLASSES = (
    "supported",
    "fringe",
    "disputed",
    "unresolved",
    "excluded",
)

# Property Listify-owned semantic keys. These are not source candidate IDs,
# portal IDs, database IDs, or names used as permanent authority.
TARGETS: tuple[dict[str, Any], ...] = (
    {
        "identity_key": "jhb-north",
        "preferred_name": "Johannesburg North",
        "primary_context": "City of Johannesburg",
        "anchor_name": "Sandton",
        "anchor_role": "strongly supported northern market anchor",
        "description": (
            "A Property Listify-governed northern Johannesburg property-market "
            "Search Area spanning multiple factual locations; it is separate "
            "from the factual suburb also named Johannesburg North."
        ),
        "collision_note": (
            "The broad market Search Area must not inherit the factual "
            "Johannesburg North suburb's boundaries."
        ),
    },
    {
        "identity_key": "jhb-south",
        "preferred_name": "Johannesburg South",
        "primary_context": "City of Johannesburg",
        "anchor_name": "Glenvista",
        "anchor_role": "core southern market anchor",
        "description": (
            "A Property Listify-governed southern Johannesburg property-market "
            "Search Area spanning multiple factual suburbs, with an "
            "evidence-supported Alberton overlap."
        ),
        "collision_note": None,
    },
    {
        "identity_key": "east-rand",
        "preferred_name": "East Rand",
        "primary_context": "Ekurhuleni",
        "anchor_name": None,
        "anchor_role": None,
        "description": (
            "A Property Listify-governed east-of-Johannesburg property-market "
            "Search Area spanning multiple factual towns; it is a market "
            "grouping, not a statutory or municipal boundary."
        ),
        "collision_note": (
            "The factual East Rand identity and the cross-town East Rand "
            "market remain distinct; no Johannesburg East evidence is "
            "imported to resolve the deferred Johannesburg East ambiguity."
        ),
    },
    {
        "identity_key": "pretoria-east",
        "preferred_name": "Pretoria East",
        "primary_context": "City of Tshwane",
        "anchor_name": "Menlyn",
        "anchor_role": "core eastern Pretoria market anchor",
        "description": (
            "A Property Listify-governed eastern Pretoria property-market "
            "Search Area representing a commonly recognised group of mature "
            "eastern suburbs and newer residential/estate nodes; it is not a "
            "fabricated statutory suburb."
        ),
        "collision_note": None,
    },
    {
        "identity_key": "midrand",
        "preferred_name": "Midrand",
        "primary_context": "City of Johannesburg",
        "anchor_name": None,
        "anchor_role": None,
        "description": (
            "A Property Listify-governed Midrand property-market Search Area "
            "spanning multiple factual locations; its Search Area identity "
            "remains distinct from both accepted factual Midrand identities."
        ),
        "collision_note": (
            "Both accepted factual Midrand identities remain distinct, and "
            "neither factual identity is the Search Area identity."
        ),
    },
    {
        "identity_key": "centurion",
        "preferred_name": "Centurion",
        "primary_context": "City of Tshwane",
        "anchor_name": None,
        "anchor_role": None,
        "description": (
            "A Property Listify-governed Centurion property-market Search Area "
            "spanning multiple factual suburbs, towns and estate nodes; its "
            "Search Area identity remains distinct from the factual Centurion "
            "town identity."
        ),
        "collision_note": (
            "The factual Centurion town and the broader property-market Search "
            "Area are separate identities and must remain separately resolvable."
        ),
    },
)

TARGET_NAMES = tuple(target["preferred_name"] for target in TARGETS)
TARGET_BY_NAME = {target["preferred_name"]: target for target in TARGETS}
KEY_TO_NAME = {
    "johannesburg_north": "Johannesburg North",
    "johannesburg_south": "Johannesburg South",
    "east_rand": "East Rand",
    "pretoria_east": "Pretoria East",
    "midrand": "Midrand",
    "centurion": "Centurion",
}


def search_area_id(identity_key: str) -> str:
    """Return the stable opaque Property Listify Search Area ID."""

    preimage = f"property-listify/search-area/gauteng/{identity_key}"
    digest = hashlib.sha256(preimage.encode("utf-8")).hexdigest()[:24]
    return f"pl-sa-gp-{digest}"


def _read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _read_jsonl(path: Path) -> list[dict[str, Any]]:
    return [
        json.loads(line)
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def _write_json(path: Path, value: Any) -> None:
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def _write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> None:
    path.write_text(
        "".join(
            json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n"
            for row in rows
        ),
        encoding="utf-8",
    )


def _source_paths(root: Path) -> dict[str, Path]:
    research = root / "data" / "gauteng-search-area-research-v0.1" / "output"
    factual = root / "data" / "gauteng-factual-canonical-v0.1" / "output"
    return {
        "candidates": research / "gauteng_search_area_candidates_v0.1.json",
        "evidence": research / "gauteng_search_area_membership_evidence_v0.1.jsonl",
        "gaps": research / "gauteng_search_area_geography_gaps_v0.1.json",
        "search_intent": research / "gauteng_search_area_search_intent_v0.1.json",
        "kyalami": factual / "gauteng_factual_canonical_kyalami_evidence_v0.1.json",
    }


def _load_inputs(root: Path) -> dict[str, Any]:
    paths = _source_paths(root)
    for label, path in paths.items():
        if not path.is_file():
            raise FileNotFoundError(f"missing accepted research input {label}: {path}")
    candidates = _read_json(paths["candidates"])
    evidence = _read_jsonl(paths["evidence"])
    gaps = _read_json(paths["gaps"])
    search_intent = _read_json(paths["search_intent"])
    kyalami = _read_json(paths["kyalami"])
    if not isinstance(candidates, list) or not isinstance(gaps, list):
        raise ValueError("candidate and geography-gap artifacts must be arrays")
    if not isinstance(search_intent, list):
        raise ValueError("search-intent artifact must be an array")
    return {
        "paths": paths,
        "candidates": candidates,
        "evidence": evidence,
        "gaps": gaps,
        "search_intent": search_intent,
        "kyalami": kyalami,
    }


def _validate_research(inputs: dict[str, Any]) -> None:
    candidates = inputs["candidates"]
    by_name = {candidate.get("preferred_name"): candidate for candidate in candidates}
    if len(by_name) != len(candidates):
        raise ValueError("accepted candidate catalogue has duplicate preferred names")
    missing = [name for name in TARGET_NAMES if name not in by_name]
    if missing:
        raise ValueError(f"accepted research is missing MVP candidates: {missing}")

    for target in TARGETS:
        name = target["preferred_name"]
        rows = [row for row in inputs["evidence"] if row.get("search_area_preferred_name") == name]
        if not rows:
            raise ValueError(f"no membership evidence for {name}")
        if not by_name[name].get("search_area_candidate_id"):
            raise ValueError(f"candidate has no research provenance ID: {name}")
        for row in rows:
            if row.get("membership_state") not in ACTIVE_MEMBERSHIP_CLASSES:
                continue
            if not row.get("canonical_location_id"):
                raise ValueError(f"active evidence lacks canonical ID: {name}/{row.get('canonical_location_name')}")
            if row.get("factual_gap_candidate") or row.get("kyalami_policy_blocked"):
                raise ValueError(f"blocked evidence would enter active boundary: {name}/{row.get('canonical_location_name')}")
            if row.get("canonical_resolution_state") in {
                "missing_from_accepted_factual_projection",
                "ambiguous_factual_name",
            }:
                raise ValueError(f"unresolved factual identity would enter active boundary: {name}/{row.get('canonical_location_name')}")


def _rows_for_area(inputs: dict[str, Any], name: str) -> list[dict[str, Any]]:
    return [
        row
        for row in inputs["evidence"]
        if row.get("search_area_preferred_name") == name
    ]


def _ordered_context_names(rows: list[dict[str, Any]], primary: str) -> list[str]:
    names = {
        context
        for row in rows
        for context in row.get("administrative_context_names", [])
    }
    ordered: list[str] = []
    if primary in names:
        ordered.append(primary)
    ordered.extend(sorted(name for name in names if name not in {primary, "Gauteng"}))
    if "Gauteng" in names:
        ordered.append("Gauteng")
    return ordered


def _anchor(target: dict[str, Any], rows: list[dict[str, Any]]) -> dict[str, Any]:
    anchor_name = target["anchor_name"]
    if not anchor_name:
        return {
            "canonical_location_id": None,
            "preferred_name": None,
            "factual_type": None,
            "role": None,
            "is_membership_boundary": False,
            "reason": "No singular factual anchor is asserted for this multi-centred or same-name-collision market.",
        }
    candidates = [
        row
        for row in rows
        if row.get("canonical_location_name") == anchor_name
        and row.get("canonical_location_id")
        and row.get("membership_state") in ACTIVE_MEMBERSHIP_CLASSES
    ]
    if len(candidates) != 1:
        raise ValueError(f"anchor must resolve to one active factual identity: {target['preferred_name']}/{anchor_name}")
    row = candidates[0]
    return {
        "canonical_location_id": row["canonical_location_id"],
        "preferred_name": row["canonical_location_name"],
        "factual_type": row.get("canonical_location_type"),
        "role": target["anchor_role"],
        "is_membership_boundary": False,
        "evidence_references": {
            "membership_assertion_id": row["membership_assertion_id"],
            "source_ids": row.get("supporting_source_ids", []),
        },
        "note": "Anchor is contextual only and does not define Search Area membership.",
    }


def _build_definitions(inputs: dict[str, Any]) -> tuple[dict[str, Any], dict[str, str]]:
    candidates_by_name = {
        candidate["preferred_name"]: candidate for candidate in inputs["candidates"]
    }
    definitions: list[dict[str, Any]] = []
    ids: dict[str, str] = {}
    for target in TARGETS:
        name = target["preferred_name"]
        source = candidates_by_name[name]
        rows = _rows_for_area(inputs, name)
        area_id = search_area_id(target["identity_key"])
        ids[name] = area_id
        definitions.append(
            {
                "schema_version": SCHEMA_VERSION,
                "search_area_id": area_id,
                "identity_authority": "property_listify_search_area",
                "preferred_name": name,
                "normalized_name": source["normalized_name"],
                "aliases": source["aliases"],
                "status": "candidate",
                "approval_state": "approved_for_integration",
                "lifecycle_state": "candidate",
                "market_type": source["market_concept_type"],
                "market_class": "property_market_search_area",
                "canonical_context": {
                    "primary_context_name": target["primary_context"],
                    "context_names": _ordered_context_names(rows, target["primary_context"]),
                    "context_type": "administrative_context",
                    "is_membership_parent": False,
                    "authority_note": "Context is factual/geographic context only; it is not a Search Area parent and does not define membership.",
                },
                "optional_anchor": _anchor(target, rows),
                "parent_relationship": {
                    "parent_search_area_id": None,
                    "relationship_type": "none_required",
                    "acyclic": True,
                    "reason": source["nesting_recommendation"],
                },
                "description": target["description"],
                "evidence_version": RESEARCH_VERSION,
                "membership_policy_version": MEMBERSHIP_POLICY_VERSION,
                "launch_priority": source["launch_priority"],
                "production_activation": False,
                "same_name_factual_collision": source["same_name_factual_collision"],
                "same_name_factual_canonical_ids": source["same_name_factual_collision_ids"],
                "research_provenance": {
                    "research_candidate_id": source["search_area_candidate_id"],
                    "source_evidence_ids": source["source_evidence_ids"],
                    "source_categories": source["source_categories"],
                    "evidence_strength": source["evidence_strength"],
                    "overlapping_search_area_keys": source["overlapping_search_area_keys"],
                    "overlapping_search_area_candidate_ids": source[
                        "overlapping_search_area_candidate_ids"
                    ],
                    "geographic_scope_narrative": source["geographic_scope_narrative"],
                    "overlap_notes": source["overlap_notes"],
                    "source_disagreements": source["source_disagreements"],
                    "consumer_query_notes": source["consumer_query_notes"],
                    "nesting_recommendation": source["nesting_recommendation"],
                },
            }
        )
    return (
        {
            "schema_version": SCHEMA_VERSION,
            "definition_version": DEFINITION_VERSION,
            "identity_namespace": "property-listify.search_area.gauteng",
            "id_generation": {
                "algorithm": "sha256",
                "preimage_template": "property-listify/search-area/gauteng/{stable_identity_key}",
                "digest_length": 24,
                "authority_note": "Stable IDs are Property Listify-owned opaque identities, not portal IDs, source slugs, database IDs, or names.",
            },
            "membership_policy_version": MEMBERSHIP_POLICY_VERSION,
            "lifecycle_model": ["candidate", "preview", "active", "deprecated", "superseded"],
            "production_activation": False,
            "search_areas": definitions,
        },
        ids,
    )


def _build_active_memberships(inputs: dict[str, Any], ids: dict[str, str]) -> list[dict[str, Any]]:
    active: list[dict[str, Any]] = []
    for target in TARGETS:
        area_name = target["preferred_name"]
        for source in _rows_for_area(inputs, area_name):
            membership_class = source.get("membership_state")
            if membership_class not in ACTIVE_MEMBERSHIP_CLASSES:
                continue
            active.append(
                {
                    "schema_version": SCHEMA_VERSION,
                    "effective_definition_version": DEFINITION_VERSION,
                    "search_area_id": ids[area_name],
                    "search_area_preferred_name": area_name,
                    "canonical_location_id": source["canonical_location_id"],
                    "factual_location_preferred_name": source["canonical_location_name"],
                    "factual_type": source["canonical_location_type"],
                    "membership_class": membership_class,
                    "confidence": source["confidence"],
                    "evidence_references": {
                        "membership_assertion_id": source["membership_assertion_id"],
                        "source_ids": source.get("supporting_source_ids", []),
                        "source_artifact": EVIDENCE_RELATIVE_PATH,
                    },
                    "evidence_count": source["supporting_source_count"],
                    "independent_evidence_count": source["independent_source_count"],
                    "conflict_information": {
                        "conflicting_source_count": source["conflicting_source_count"],
                        "conflicting_independent_source_count": source["conflicting_independent_source_count"],
                        "conflicting_source_ids": source.get("conflicting_source_ids", []),
                    },
                    "why_passed_active_threshold": (
                        "Accepted because the research membership class is "
                        f"{membership_class}, the factual canonical identity is "
                        "resolved in the accepted factual projection, and no "
                        "geography-gap or Kyalami policy block applies."
                    ),
                    "research_candidate_id": source["search_area_candidate_id"],
                    "research_membership_assertion_id": source["membership_assertion_id"],
                    "canonical_resolution_state": source["canonical_resolution_state"],
                    "factual_gap_candidate": source["factual_gap_candidate"],
                    "kyalami_policy_blocked": source["kyalami_policy_blocked"],
                }
            )
    class_order = {name: index for index, name in enumerate(ACTIVE_MEMBERSHIP_CLASSES)}
    active.sort(
        key=lambda row: (
            TARGET_NAMES.index(row["search_area_preferred_name"]),
            class_order[row["membership_class"]],
            row["factual_location_preferred_name"].casefold(),
            row["canonical_location_id"],
        )
    )
    return active


def _build_collisions(inputs: dict[str, Any], ids: dict[str, str]) -> dict[str, Any]:
    candidates_by_name = {
        candidate["preferred_name"]: candidate for candidate in inputs["candidates"]
    }
    collisions: list[dict[str, Any]] = []
    for target in TARGETS:
        name = target["preferred_name"]
        source = candidates_by_name[name]
        factual_ids = source["same_name_factual_collision_ids"]
        if not factual_ids:
            continue
        factual_identities = []
        for factual_id in factual_ids:
            matches = [
                row for row in inputs["evidence"]
                if row.get("canonical_location_id") == factual_id
            ]
            factual_identities.append(
                {
                    "canonical_location_id": factual_id,
                    "preferred_name": name,
                    "factual_type": matches[0].get("canonical_location_type") if matches else None,
                    "factual_type_state": (
                        "provided_by_membership_evidence"
                        if matches else "not_provided_by_accepted_search_area_research"
                    ),
                    "identity_kind": "factual_location",
                }
            )
        collisions.append(
            {
                "search_area_id": ids[name],
                "search_area_preferred_name": name,
                "factual_canonical_ids": factual_identities,
                "collision_type": "same_preferred_name_factual_location_and_search_area",
                "disambiguation_required": True,
                "identities_are_distinct": True,
                "search_area_does_not_inherit_factual_boundaries": True,
                "distinction_note": target["collision_note"],
                "research_source_evidence_ids": source["source_evidence_ids"],
            }
        )
    return {
        "schema_version": SCHEMA_VERSION,
        "collision_model": "factual_location_and_search_area_are_distinct_identity_types",
        "disambiguation_required": True,
        "collisions": collisions,
    }


def _build_gap_links(inputs: dict[str, Any], ids: dict[str, str]) -> dict[str, Any]:
    evidence_by_area_name: defaultdict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in inputs["evidence"]:
        evidence_by_area_name[
            (row.get("search_area_preferred_name", ""), row.get("canonical_location_name", "").casefold())
        ].append(row)

    links: list[dict[str, Any]] = []
    for gap in inputs["gaps"]:
        affected_names = [
            name for name in gap["search_area_candidates"] if name in ids
        ]
        affected = []
        linked_rows: list[dict[str, Any]] = []
        for area_name in affected_names:
            rows = evidence_by_area_name[(area_name, gap["name"].casefold())]
            linked_rows.extend(rows)
            affected.append(
                {
                    "search_area_id": ids[area_name],
                    "search_area_preferred_name": area_name,
                    "membership_assertion_ids": [row["membership_assertion_id"] for row in rows],
                    "membership_states": sorted({row["membership_state"] for row in rows}),
                    "observed_membership_states": sorted({
                        row["observed_membership_state"]
                        for row in rows
                        if row.get("observed_membership_state")
                    }),
                }
            )
        kyalami_blocked = gap.get("kyalami_policy_blocked", False) or any(
            row.get("kyalami_policy_blocked") for row in linked_rows
        )
        if kyalami_blocked:
            block_reason = "kyalami_search_area_workaround_forbidden"
        elif affected_names:
            block_reason = "no_accepted_factual_canonical_id"
        else:
            block_reason = "deferred_search_area_not_in_mvp"
        links.append(
            {
                "schema_version": SCHEMA_VERSION,
                "gap_id": gap["gap_id"],
                "name": gap["name"],
                "normalized_name": gap["normalized_name"],
                "likely_type": gap.get("likely_type"),
                "research_search_area_names": gap["search_area_candidates"],
                "affected_search_area_ids": [ids[name] for name in affected_names],
                "affected_search_area_names": affected_names,
                "active_membership_allowed": False,
                "active_membership_block_reason": block_reason,
                "linked_membership_evidence": [
                    {
                        "search_area_id": ids[row["search_area_preferred_name"]],
                        "search_area_preferred_name": row["search_area_preferred_name"],
                        "membership_assertion_id": row["membership_assertion_id"],
                        "membership_state": row["membership_state"],
                        "observed_membership_state": row.get("observed_membership_state"),
                        "canonical_location_id": row.get("canonical_location_id"),
                        "factual_gap_candidate": row.get("factual_gap_candidate"),
                        "kyalami_policy_blocked": row.get("kyalami_policy_blocked"),
                    }
                    for row in linked_rows
                ],
                "factual_enrichment_reference": {
                    "source_artifact": GAPS_RELATIVE_PATH,
                    "candidate_id_where_available": gap.get("candidate_id_where_available"),
                    "promoted_to_factual_canonical": gap.get("promoted_to_factual_canonical", False),
                    "recommended_follow_up": gap.get("recommended_geography_follow_up"),
                },
                "research_gap": gap,
            }
        )
    links.sort(key=lambda item: item["normalized_name"])
    return {
        "schema_version": SCHEMA_VERSION,
        "source_artifact": GAPS_RELATIVE_PATH,
        "total_recorded_geography_gap_candidates": len(inputs["gaps"]),
        "mvp_affected_geography_gap_candidates": sum(bool(link["affected_search_area_ids"]) for link in links),
        "deferred_only_geography_gap_candidates": sum(not bool(link["affected_search_area_ids"]) for link in links),
        "kyalami_policy": inputs["kyalami"],
        "gaps": links,
    }


def _build_overlap_report(
    inputs: dict[str, Any], ids: dict[str, str], active: list[dict[str, Any]]
) -> dict[str, Any]:
    by_canonical_id: defaultdict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in active:
        by_canonical_id[row["canonical_location_id"]].append(row)

    active_overlap_set: list[dict[str, Any]] = []
    for canonical_id, rows in sorted(by_canonical_id.items()):
        names = sorted(
            {row["search_area_preferred_name"] for row in rows},
            key=TARGET_NAMES.index,
        )
        if len(names) < 2:
            continue
        active_overlap_set.append(
            {
                "canonical_location_id": canonical_id,
                "canonical_location_preferred_name": rows[0]["factual_location_preferred_name"],
                "search_area_memberships": [
                    {
                        "search_area_id": ids[name],
                        "search_area_preferred_name": name,
                        "membership_class": next(
                            row["membership_class"]
                            for row in rows
                            if row["search_area_preferred_name"] == name
                        ),
                    }
                    for name in names
                ],
                "overlap_expected": True,
                "ambiguity": "none_material",
                "interpretation": "The same accepted factual location is intentionally shared by two market concepts; this is real market geography, not a duplicate identity.",
            }
        )

    candidates_by_name = {
        candidate["preferred_name"]: candidate for candidate in inputs["candidates"]
    }
    expected_pairs: set[tuple[str, str]] = set()
    for target in TARGETS:
        for key in candidates_by_name[target["preferred_name"]].get("overlapping_search_area_keys", []):
            other = KEY_TO_NAME.get(key)
            if other:
                expected_pairs.add(tuple(sorted(
                    (target["preferred_name"], other),
                    key=TARGET_NAMES.index,
                )))

    active_ids_by_pair: defaultdict[tuple[str, str], list[str]] = defaultdict(list)
    for item in active_overlap_set:
        names = tuple(
            member["search_area_preferred_name"]
            for member in item["search_area_memberships"]
        )
        active_ids_by_pair[names].append(item["canonical_location_id"])

    relationships = []
    for pair in sorted(expected_pairs, key=lambda pair: tuple(TARGET_NAMES.index(name) for name in pair)):
        shared_ids = active_ids_by_pair.get(pair, [])
        relationships.append(
            {
                "search_area_ids": [ids[name] for name in pair],
                "search_area_preferred_names": list(pair),
                "active_shared_canonical_location_ids": shared_ids,
                "active_shared_canonical_location_count": len(shared_ids),
                "overlap_expected": True,
                "relationship_type": (
                    "active_market_overlap"
                    if shared_ids else "market_overlap_or_adjacency_without_active_shared_id"
                ),
                "interpretation": (
                    "Exact active overlap is preserved."
                    if shared_ids else
                    "Research indicates market adjacency or overlap, but the conservative active canonical boundary shares no ID yet."
                ),
            }
        )
    return {
        "schema_version": SCHEMA_VERSION,
        "definition_version": DEFINITION_VERSION,
        "active_overlap_set": active_overlap_set,
        "active_overlapping_canonical_location_count": len(active_overlap_set),
        "active_overlapping_search_area_pair_count": sum(
            bool(item["active_shared_canonical_location_ids"])
            for item in relationships
        ),
        "overlapping_search_area_pairs": relationships,
        "overlap_policy": {
            "overlap_allowed": True,
            "overlap_expected": True,
            "identity_rule": "canonical factual IDs remain distinct from Search Area IDs",
            "tree_required": False,
        },
    }


def _summary(
    inputs: dict[str, Any],
    definitions: dict[str, Any],
    ids: dict[str, str],
    active: list[dict[str, Any]],
    collisions: dict[str, Any],
    overlaps: dict[str, Any],
    gap_links: dict[str, Any],
) -> str:
    active_by_area: defaultdict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in active:
        active_by_area[row["search_area_preferred_name"]].append(row)
    gaps_by_area: defaultdict[str, list[str]] = defaultdict(list)
    for gap in gap_links["gaps"]:
        for area_name in gap["affected_search_area_names"]:
            gaps_by_area[area_name].append(gap["name"])
    overlap_counts: Counter[str] = Counter()
    for item in overlaps["active_overlap_set"]:
        for member in item["search_area_memberships"]:
            overlap_counts[member["search_area_preferred_name"]] += 1
    source_by_area = {name: _rows_for_area(inputs, name) for name in TARGET_NAMES}
    core_total = sum(row["membership_class"] == "core" for row in active)
    strong_total = sum(row["membership_class"] == "strongly_supported" for row in active)
    deferred_total = sum(
        len(source_by_area[name]) - len(active_by_area[name])
        for name in TARGET_NAMES
    )
    full_state_counts = Counter(row["membership_state"] for row in inputs["evidence"])
    candidate_by_name = {
        candidate["preferred_name"]: candidate for candidate in inputs["candidates"]
    }

    lines = [
        "# Gauteng Search Area definition summary v0.1",
        "",
        "Status: non-production candidate authority; approved for later integration review.",
        "",
        "This pack defines exactly six Property Listify-owned Search Area identities. A Search Area is a market identity that references factual canonical locations; it is not a substitute for factual geography.",
        "",
        "## Definitions",
        "",
        "| Search Area | PL ID | Active | Core | Strongly supported | Active overlap | Same-name factual collision | Geography gaps |",
        "|---|---|---:|---:|---:|---:|---|---:|",
    ]
    for target in TARGETS:
        name = target["preferred_name"]
        rows = active_by_area[name]
        core = sum(row["membership_class"] == "core" for row in rows)
        strong = sum(row["membership_class"] == "strongly_supported" for row in rows)
        collision = "yes" if candidate_by_name[name]["same_name_factual_collision"] else "no"
        lines.append(
            f"| {name} | {ids[name]} | {len(rows)} | {core} | {strong} | "
            f"{overlap_counts[name]} | {collision} | {len(gaps_by_area[name])} |"
        )

    lines.extend(
        [
            "",
            f"Active memberships total {len(active)}: {core_total} core and {strong_total} strongly supported. The six-area slice retains {deferred_total} deferred evidence rows; the full copied research evidence remains available and is not replaced by the active projection.",
            "",
            "## Active membership policy",
            "",
            "Only core and strongly_supported evidence enters the active v0.1 projection. supported, fringe, disputed, unresolved and excluded evidence remains preserved and non-active.",
            "",
            "Full active membership: gauteng_search_area_active_memberships_v0.1.jsonl.",
            "Full research evidence copy: gauteng_search_area_membership_evidence_v0.1.jsonl.",
            "",
            "Full-research evidence state counts: " + ", ".join(
                f"{state}={full_state_counts[state]}"
                for state in sorted(full_state_counts)
            ) + ".",
            "",
            "## Contexts, anchors and relationships",
            "",
            "Contexts are factual/administrative context only and are not Search Area parents. Parent relationships are intentionally unset for MVP; future graph edges must remain acyclic where nesting is introduced.",
            "",
            "| Search Area | Contexts | Optional anchor | Aliases |",
            "|---|---|---|---|",
        ]
    )
    for definition in definitions["search_areas"]:
        context = definition["canonical_context"]
        anchor = definition["optional_anchor"]
        anchor_text = anchor["preferred_name"] or "none (multi-centred/collision-safe)"
        lines.append(
            f"| {definition['preferred_name']} | {', '.join(context['context_names'])} | "
            f"{anchor_text} | {'; '.join(definition['aliases'])} |"
        )

    lines.extend(["", "## Active overlap", ""])
    if overlaps["active_overlap_set"]:
        for item in overlaps["active_overlap_set"]:
            areas = ", ".join(
                member["search_area_preferred_name"]
                for member in item["search_area_memberships"]
            )
            lines.append(
                f"- {item['canonical_location_preferred_name']} ({item['canonical_location_id']}) is active in {areas}. This expected overlap reflects real market geography and creates no material identity ambiguity."
            )
    else:
        lines.append("- No active canonical location is shared.")
    lines.append(
        "- Research-observed market relationships without a shared active canonical ID remain recorded in the overlap report; they do not force uncertain membership into v0.1."
    )

    lines.extend(["", "## Same-name factual/Search Area collisions", ""])
    for collision in collisions["collisions"]:
        facts = ", ".join(
            f"{fact['canonical_location_id']} ({fact['preferred_name']})"
            for fact in collision["factual_canonical_ids"]
        )
        lines.append(
            f"- {collision['search_area_preferred_name']} Search Area ({collision['search_area_id']}) remains distinct from factual identity {facts}; disambiguation is required."
        )

    lines.extend(["", "## Geography gaps", ""])
    for target in TARGETS:
        name = target["preferred_name"]
        names = gaps_by_area[name]
        lines.append(
            f"- {name}: {', '.join(names) if names else 'none recorded in the 23-gap research artifact'}."
        )
    lines.append(
        f"The gap-link artifact carries all {gap_links['total_recorded_geography_gap_candidates']} recorded candidates, including {gap_links['deferred_only_geography_gap_candidates']} that belong only to deferred Search Area candidates. Gap names never become active canonical memberships from market evidence alone."
    )

    lines.extend(
        [
            "",
            "## Closed governance invariants",
            "",
            "- Johannesburg East, Vaal, Pretoria Old East and Pretoria Far East have no active definition.",
            "- The East Rand boundary does not import ambiguous Johannesburg East membership.",
            "- If Vaal is introduced later, Vaal Triangle defaults to an alias of the Gauteng Vaal Search Area unless stronger evidence disproves that rule; no Vaal membership is active here.",
            "- Pretoria East retains the researched Old East, Far East and North East relationship evidence without defining any of those later concepts in active v0.1.",
            "- Kyalami remains non-active and policy-blocked: one eventual factual identity, consumer name Kyalami, corrected/official name Khayalami, and related Kyalami-family places remain separate. No Search Area workaround is used.",
            "- Search Area IDs are stable across future membership-definition versions; a future canonical promotion changes membership version, not identity.",
            "",
            "## Artifact set",
            "",
            "- gauteng_search_area_definitions_v0.1.json",
            "- gauteng_search_area_active_memberships_v0.1.jsonl",
            "- gauteng_search_area_membership_evidence_v0.1.jsonl",
            "- gauteng_search_area_identity_collisions_v0.1.json",
            "- gauteng_search_area_overlap_report_v0.1.json",
            "- gauteng_search_area_geography_gap_links_v0.1.json",
            "- gauteng_search_area_definition_summary_v0.1.md",
            "",
            "No production registry, Search engine, UI, route, database schema, migration, seed, or shared production data is modified by this pack.",
        ]
    )
    return "\n".join(lines) + "\n"


def build_pack(
    repo_root: Path | str | None = None,
    output_dir: Path | str | None = None,
) -> dict[str, Any]:
    """Build all candidate-definition artifacts and return the derived report."""

    root = Path(repo_root) if repo_root is not None else Path(__file__).resolve().parents[2]
    root = root.resolve()
    output = (
        Path(output_dir)
        if output_dir is not None
        else root / "data" / "gauteng-search-area-candidates-v0.1" / "output"
    ).resolve()

    inputs = _load_inputs(root)
    _validate_research(inputs)
    definitions, ids = _build_definitions(inputs)
    active = _build_active_memberships(inputs, ids)
    collisions = _build_collisions(inputs, ids)
    gap_links = _build_gap_links(inputs, ids)
    overlaps = _build_overlap_report(inputs, ids, active)
    summary = _summary(inputs, definitions, ids, active, collisions, overlaps, gap_links)

    output.mkdir(parents=True, exist_ok=True)
    _write_json(output / "gauteng_search_area_definitions_v0.1.json", definitions)
    _write_jsonl(output / "gauteng_search_area_active_memberships_v0.1.jsonl", active)
    shutil.copyfile(
        inputs["paths"]["evidence"],
        output / "gauteng_search_area_membership_evidence_v0.1.jsonl",
    )
    _write_json(output / "gauteng_search_area_identity_collisions_v0.1.json", collisions)
    _write_json(output / "gauteng_search_area_overlap_report_v0.1.json", overlaps)
    _write_json(output / "gauteng_search_area_geography_gap_links_v0.1.json", gap_links)
    (output / "gauteng_search_area_definition_summary_v0.1.md").write_text(
        summary, encoding="utf-8"
    )

    return {
        "output_dir": output,
        "definitions": definitions,
        "id_by_name": ids,
        "active_memberships": active,
        "collisions": collisions,
        "overlaps": overlaps,
        "gap_links": gap_links,
        "summary": summary,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, default=None)
    parser.add_argument("--output-dir", type=Path, default=None)
    args = parser.parse_args()
    report = build_pack(repo_root=args.repo_root, output_dir=args.output_dir)
    print(
        f"built {len(report['definitions']['search_areas'])} Search Areas, "
        f"{len(report['active_memberships'])} active memberships at "
        f"{report['output_dir']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
