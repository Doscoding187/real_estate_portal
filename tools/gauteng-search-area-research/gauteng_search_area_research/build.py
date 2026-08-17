"""Build deterministic, research-only Gauteng Search Area artifacts.

The module intentionally has no application or database dependencies.  It
keeps observed market evidence separate from factual canonical identities and
does not promote missing or ambiguous factual geography.
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path
from typing import Any, Iterable


SCHEMA_VERSION = "0.1"
DEFAULT_RESEARCH_DATE = "2026-08-15"
VALID_MEMBERSHIP_STATES = {
    "core",
    "strongly_supported",
    "supported",
    "fringe",
    "disputed",
    "unresolved",
    "excluded",
}


def normalize_name(value: str) -> str:
    """Return a stable, human-name normalization used only for matching."""

    text = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    text = text.casefold().replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def stable_id(prefix: str, namespace: str, value: str, length: int = 20) -> str:
    digest = hashlib.sha256(f"{namespace}:{normalize_name(value)}".encode()).hexdigest()
    return f"{prefix}{digest[:length]}"


def candidate_id(preferred_name: str) -> str:
    return stable_id("sa-gp-v01-", "property-listify-search-area", preferred_name)


def source_id(url: str) -> str:
    return stable_id("src-gp-sa-v01-", "market-evidence-url", url, length=20)


def assertion_id(area_id: str, canonical_id: str | None, name: str, state: str) -> str:
    raw = f"{area_id}|{canonical_id or 'unresolved'}|{normalize_name(name)}|{state}"
    digest = hashlib.sha256(raw.encode()).hexdigest()[:20]
    return f"sama-gp-v01-{digest}"


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open(encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSONL at {path}:{line_number}: {exc}") from exc
    return rows


def build_canonical_index(path: Path) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]], dict[str, list[dict[str, Any]]]]:
    """Read the accepted factual projection into a small research index."""

    rows = read_jsonl(path)
    index: list[dict[str, Any]] = []
    by_id: dict[str, dict[str, Any]] = {}
    by_name: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        canonical_id = row.get("canonical_location_id")
        preferred_name = row.get("preferred_name")
        if not canonical_id or not preferred_name:
            raise ValueError("Canonical projection row lacks canonical_location_id or preferred_name")
        item = {
            "canonical_location_id": canonical_id,
            "preferred_name": preferred_name,
            "normalized_name": row.get("normalized_name") or normalize_name(preferred_name),
            "canonical_type": row.get("canonical_type"),
            "promotion_class": row.get("promotion_class"),
            "identity_confidence": row.get("identity_confidence"),
            "licence_state": row.get("licence_state"),
            "licence_gate": row.get("licence_gate"),
            "source_count": row.get("source_count"),
            "representative_latitude": row.get("representative_latitude"),
            "representative_longitude": row.get("representative_longitude"),
            "administrative_context": row.get("administrative_context", {}),
        }
        index.append(item)
        by_id[canonical_id] = item
        by_name[item["normalized_name"]].append(item)
    index.sort(key=lambda item: item["canonical_location_id"])
    for values in by_name.values():
        values.sort(key=lambda item: item["canonical_location_id"])
    return index, by_id, dict(by_name)


def _source_lookup(seed: dict[str, Any]) -> tuple[dict[str, dict[str, Any]], dict[str, str]]:
    by_key: dict[str, dict[str, Any]] = {}
    key_to_id: dict[str, str] = {}
    for source in seed.get("sources", []):
        key = source["key"]
        if key in by_key:
            raise ValueError(f"Duplicate source key: {key}")
        sid = source_id(source["url"])
        item = dict(source)
        item["source_id"] = sid
        item["source_schema_version"] = SCHEMA_VERSION
        by_key[key] = item
        key_to_id[key] = sid
    return by_key, key_to_id


def _source_stats(source_ids: Iterable[str], by_id: dict[str, dict[str, Any]]) -> dict[str, Any]:
    rows = [by_id[sid] for sid in source_ids]
    publishers = sorted({row["publisher"] for row in rows})
    categories = sorted({row["source_category"] for row in rows})
    return {
        "source_count": len(rows),
        "independent_source_count": len(publishers),
        "independent_publishers": publishers,
        "source_categories": categories,
    }


def _canonical_name_context(item: dict[str, Any]) -> dict[str, Any]:
    adm = item.get("administrative_context") or {}
    names: list[str] = []
    for level in ("adm2", "adm3", "province"):
        values = adm.get(level, []) or []
        if isinstance(values, dict):
            values = [values]
        for entry in values:
            if isinstance(entry, dict) and entry.get("name") and entry["name"] not in names:
                names.append(entry["name"])
    return {"administrative_context_names": names}


def _resolve_member(
    raw_member: dict[str, Any],
    by_id: dict[str, dict[str, Any]],
    by_name: dict[str, list[dict[str, Any]]],
) -> list[dict[str, Any]]:
    """Resolve only against existing factual rows; retain ambiguity explicitly."""

    name = raw_member["name"]
    requested_state = raw_member.get("state", "supported")
    explicit_ids = raw_member.get("canonical_location_ids") or []
    if explicit_ids:
        missing_ids = [value for value in explicit_ids if value not in by_id]
        if missing_ids:
            raise ValueError(f"Unknown canonical IDs for {name}: {missing_ids}")
        rows = [by_id[value] for value in explicit_ids]
        resolution = "explicit_canonical_reference"
    else:
        rows = by_name.get(normalize_name(name), [])
        resolution = (
            "resolved_exact_preferred_name"
            if len(rows) == 1
            else "ambiguous_factual_name"
            if len(rows) > 1
            else "missing_from_accepted_factual_projection"
        )

    if not rows:
        return [{"canonical": None, "resolution_state": resolution, "requested_state": requested_state}]
    if len(rows) > 1 and not explicit_ids:
        return [{
            "canonical": None,
            "resolution_state": resolution,
            "resolution_candidates": [row["canonical_location_id"] for row in rows],
            "requested_state": requested_state,
        }]
    return [
        {"canonical": row, "resolution_state": resolution, "requested_state": requested_state}
        for row in rows
    ]


def _membership_state(resolved: dict[str, Any], raw_member: dict[str, Any]) -> str:
    requested = resolved["requested_state"]
    if requested == "excluded":
        return "excluded"
    if resolved.get("canonical") is None:
        return "unresolved"
    return requested


def _output_source_manifest(source_rows: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    for row in sorted(source_rows.values(), key=lambda item: item["source_id"]):
        item = dict(row)
        item["source_key"] = item.pop("key")
        output.append(item)
    return output


def _validate_candidate_relationships(
    seed: dict[str, Any],
    candidate_ids_by_key: dict[str, str],
) -> None:
    """Validate optional nesting and overlap references before projection."""

    parent_by_key: dict[str, str] = {}
    for raw_candidate in seed.get("candidates", []):
        key = raw_candidate["key"]
        broader_key = raw_candidate.get("broader_candidate_key")
        if broader_key:
            if broader_key not in candidate_ids_by_key:
                raise ValueError(f"Unknown broader Search Area candidate: {key} -> {broader_key}")
            if broader_key == key:
                raise ValueError(f"Search Area candidate cannot be its own parent: {key}")
            parent_by_key[key] = broader_key
        for overlap_key in raw_candidate.get("overlapping_search_area_keys", []):
            if overlap_key not in candidate_ids_by_key:
                raise ValueError(f"Unknown overlapping Search Area candidate: {key} -> {overlap_key}")

    for start_key in parent_by_key:
        visited: set[str] = set()
        current = start_key
        while current in parent_by_key:
            if current in visited:
                raise ValueError(f"Search Area nesting cycle detected at {current}")
            visited.add(current)
            current = parent_by_key[current]


def _build_candidates(
    seed: dict[str, Any],
    canonical_by_id: dict[str, dict[str, Any]],
    canonical_by_name: dict[str, list[dict[str, Any]]],
    sources_by_key: dict[str, dict[str, Any]],
    source_key_to_id: dict[str, str],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    source_by_id = {row["source_id"]: row for row in sources_by_key.values()}
    candidates: list[dict[str, Any]] = []
    memberships: list[dict[str, Any]] = []
    candidate_ids_by_key: dict[str, str] = {}
    for raw_candidate in seed.get("candidates", []):
        cid = candidate_id(raw_candidate["preferred_name"])
        if cid in candidate_ids_by_key.values():
            raise ValueError(f"Duplicate Search Area identity: {raw_candidate['preferred_name']}")
        candidate_ids_by_key[raw_candidate["key"]] = cid
    _validate_candidate_relationships(seed, candidate_ids_by_key)

    for raw_candidate in seed.get("candidates", []):
        cid = candidate_ids_by_key[raw_candidate["key"]]
        area_source_ids = [source_key_to_id[key] for key in raw_candidate.get("source_keys", [])]
        factual_collisions = [
            row["canonical_location_id"]
            for row in canonical_by_name.get(normalize_name(raw_candidate["preferred_name"]), [])
        ]
        broader_key = raw_candidate.get("broader_candidate_key")
        candidate = {
            "schema_version": SCHEMA_VERSION,
            "search_area_candidate_id": cid,
            "identity_authority": "property_market_search_area",
            "preferred_name": raw_candidate["preferred_name"],
            "normalized_name": normalize_name(raw_candidate["preferred_name"]),
            "aliases": raw_candidate.get("aliases", []),
            "market_concept_type": raw_candidate.get("market_concept_type"),
            "proposed_status": raw_candidate.get("proposed_status"),
            "launch_priority": raw_candidate.get("launch_priority"),
            "evidence_strength": raw_candidate.get("evidence_strength"),
            "source_count": len(area_source_ids),
            "independent_source_count": _source_stats(area_source_ids, source_by_id)["independent_source_count"],
            "independent_publishers": _source_stats(area_source_ids, source_by_id)["independent_publishers"],
            "source_categories": _source_stats(area_source_ids, source_by_id)["source_categories"],
            "description": raw_candidate.get("description"),
            "geographic_scope_narrative": raw_candidate.get("scope_narrative"),
            "broader_search_area_candidate_id": candidate_ids_by_key.get(broader_key) if broader_key else None,
            "relationship_type": raw_candidate.get("relationship_type"),
            "overlapping_search_area_keys": raw_candidate.get("overlapping_search_area_keys", []),
            "overlapping_search_area_candidate_ids": [
                candidate_ids_by_key[key]
                for key in raw_candidate.get("overlapping_search_area_keys", [])
            ],
            "same_name_factual_collision": bool(factual_collisions),
            "same_name_factual_collision_ids": factual_collisions,
            "nesting_recommendation": raw_candidate.get("nesting_recommendation"),
            "consumer_search_usefulness": raw_candidate.get("consumer_search_usefulness"),
            "recommendation": raw_candidate.get("recommendation"),
            "source_disagreements": raw_candidate.get("source_disagreements"),
            "overlap_notes": raw_candidate.get("overlap_notes"),
            "consumer_query_notes": raw_candidate.get("consumer_query_notes"),
            "source_evidence_ids": sorted(area_source_ids),
            "created_or_researched_date": seed.get("research_date", DEFAULT_RESEARCH_DATE),
            "last_verified_date": seed.get("research_date", DEFAULT_RESEARCH_DATE),
        }
        candidates.append(candidate)

        for raw_member in raw_candidate.get("members", []):
            requested_state = raw_member.get("state", "supported")
            if requested_state not in VALID_MEMBERSHIP_STATES:
                raise ValueError(
                    f"Unsupported membership state {requested_state!r}: "
                    f"{raw_candidate['key']} / {raw_member['name']}"
                )
            supporting_ids = sorted({source_key_to_id[key] for key in raw_member.get("source_keys", [])})
            conflicting_ids = sorted({source_key_to_id[key] for key in raw_member.get("conflicting_source_keys", [])})
            if not supporting_ids:
                raise ValueError(f"Membership has no supporting source: {raw_candidate['key']} / {raw_member['name']}")
            for resolved in _resolve_member(raw_member, canonical_by_id, canonical_by_name):
                canonical = resolved.get("canonical")
                state = _membership_state(resolved, raw_member)
                stats = _source_stats(supporting_ids, source_by_id)
                if conflicting_ids:
                    conflict_stats = _source_stats(conflicting_ids, source_by_id)
                else:
                    conflict_stats = {"source_count": 0, "independent_source_count": 0, "independent_publishers": [], "source_categories": []}
                memberships.append({
                    "schema_version": SCHEMA_VERSION,
                    "membership_assertion_id": assertion_id(cid, canonical["canonical_location_id"] if canonical else None, raw_member["name"], state),
                    "search_area_candidate_id": cid,
                    "search_area_preferred_name": raw_candidate["preferred_name"],
                    "canonical_location_id": canonical["canonical_location_id"] if canonical else None,
                    "canonical_location_name": canonical["preferred_name"] if canonical else raw_member["name"],
                    "canonical_location_type": canonical.get("canonical_type") if canonical else raw_member.get("likely_type"),
                    "canonical_resolution_state": resolved["resolution_state"],
                    "canonical_resolution_candidates": resolved.get("resolution_candidates", []),
                    "membership_state": state,
                    "observed_membership_state": raw_member.get("state", "supported"),
                    "confidence": raw_member.get("confidence", "medium"),
                    "supporting_source_ids": supporting_ids,
                    "conflicting_source_ids": conflicting_ids,
                    "supporting_source_count": stats["source_count"],
                    "independent_source_count": stats["independent_source_count"],
                    "independent_publishers": stats["independent_publishers"],
                    "source_categories": stats["source_categories"],
                    "conflicting_source_count": conflict_stats["source_count"],
                    "conflicting_independent_source_count": conflict_stats["independent_source_count"],
                    "reason_evidence": raw_member.get("reason"),
                    "observed_membership_context": raw_member.get("observed_context"),
                    "review_state": raw_member.get("review_state", "research_recommended"),
                    "factual_gap_candidate": (
                        canonical is None
                        and resolved["resolution_state"] == "missing_from_accepted_factual_projection"
                        and not raw_member.get("out_of_scope", False)
                        and state != "excluded"
                    ),
                    "gap_likely_type": raw_member.get("likely_type"),
                    "gap_candidate_id": raw_member.get("gap_candidate_id"),
                    "retained_candidate_catalogue_exists": raw_member.get(
                        "retained_candidate_catalogue_exists",
                        True if raw_member.get("gap_candidate_id") else "not_verified",
                    ),
                    "gap_kind": raw_member.get("gap_kind"),
                    "kyalami_policy_blocked": bool(raw_member.get("kyalami_policy_blocked", False)),
                    "gap_recommended_follow_up": raw_member.get("gap_recommended_follow_up"),
                    "researched_at": seed.get("research_date", DEFAULT_RESEARCH_DATE),
                    **(_canonical_name_context(canonical) if canonical else {}),
                })
    memberships.sort(key=lambda row: (row["search_area_candidate_id"], row["canonical_location_name"].casefold(), row["membership_assertion_id"]))
    return candidates, memberships


def _build_gaps(memberships: list[dict[str, Any]], seed: dict[str, Any]) -> list[dict[str, Any]]:
    gaps: dict[str, dict[str, Any]] = {}
    for row in memberships:
        if not row.get("factual_gap_candidate"):
            continue
        key = normalize_name(row["canonical_location_name"])
        gap = gaps.setdefault(key, {
            "schema_version": SCHEMA_VERSION,
            "gap_id": stable_id("gap-gp-v01-", "factual-geography-gap", row["canonical_location_name"]),
            "name": row["canonical_location_name"],
            "normalized_name": key,
            "market_source_evidence": [],
            "search_area_candidates": [],
            "likely_type": row.get("gap_likely_type"),
            "reason_it_matters": [],
            "retained_candidate_catalogue_exists": row.get(
                "retained_candidate_catalogue_exists",
                True if row.get("gap_candidate_id") else "not_verified",
            ),
            "candidate_id_where_available": row.get("gap_candidate_id"),
            "gap_kinds": [],
            "kyalami_policy_blocked": bool(row.get("kyalami_policy_blocked", False)),
            "recommended_geography_follow_up": row.get("gap_recommended_follow_up") or "Review against the retained candidate layer; do not promote from market evidence alone.",
            "promoted_to_factual_canonical": False,
            "researched_at": seed.get("research_date", DEFAULT_RESEARCH_DATE),
        })
        for source_id_value in row["supporting_source_ids"]:
            if source_id_value not in gap["market_source_evidence"]:
                gap["market_source_evidence"].append(source_id_value)
        if row["search_area_preferred_name"] not in gap["search_area_candidates"]:
            gap["search_area_candidates"].append(row["search_area_preferred_name"])
        if row.get("reason_evidence") and row["reason_evidence"] not in gap["reason_it_matters"]:
            gap["reason_it_matters"].append(row["reason_evidence"])
        if row.get("gap_kind") and row["gap_kind"] not in gap["gap_kinds"]:
            gap["gap_kinds"].append(row["gap_kind"])
        if row.get("gap_recommended_follow_up"):
            gap["recommended_geography_follow_up"] = row["gap_recommended_follow_up"]
        gap["kyalami_policy_blocked"] = gap["kyalami_policy_blocked"] or bool(row.get("kyalami_policy_blocked", False))
    return sorted(gaps.values(), key=lambda row: row["normalized_name"])


def _merge_seed(base: dict[str, Any], supplement: dict[str, Any] | None) -> dict[str, Any]:
    """Merge a reviewable supplement without mutating the original seed."""

    if not supplement:
        return json.loads(json.dumps(base))
    merged = json.loads(json.dumps(base))
    existing_sources = {row["key"]: row for row in merged.setdefault("sources", [])}
    for source in supplement.get("sources", []):
        key = source["key"]
        if key in existing_sources:
            if existing_sources[key].get("url") != source.get("url"):
                raise ValueError(f"Supplement changes the URL for existing source key: {key}")
            continue
        merged["sources"].append(json.loads(json.dumps(source)))
        existing_sources[key] = merged["sources"][-1]

    candidates_by_key = {row["key"]: row for row in merged.setdefault("candidates", [])}
    for update in supplement.get("candidate_updates", []):
        key = update["key"]
        if key not in candidates_by_key:
            raise ValueError(f"Supplement references unknown candidate key: {key}")
        candidate = candidates_by_key[key]
        for source_key in update.get("source_keys", []):
            if source_key not in existing_sources:
                raise ValueError(f"Supplement references unknown source key: {source_key}")
            if source_key not in candidate.setdefault("source_keys", []):
                candidate["source_keys"].append(source_key)
        for field, value in update.get("fields", {}).items():
            candidate[field] = value
        existing_member_keys = {
            (
                normalize_name(member["name"]),
                tuple(member.get("canonical_location_ids") or []),
            ): member
            for member in candidate.setdefault("members", [])
        }
        for member in update.get("members", []):
            member_key = (normalize_name(member["name"]), tuple(member.get("canonical_location_ids") or []))
            if member_key in existing_member_keys:
                current = existing_member_keys[member_key]
                for field, value in member.items():
                    if field == "source_keys":
                        current[field] = sorted(set(current.get(field, [])) | set(value))
                    elif field == "conflicting_source_keys":
                        current[field] = sorted(set(current.get(field, [])) | set(value))
                    else:
                        current[field] = value
            else:
                candidate["members"].append(json.loads(json.dumps(member)))
                existing_member_keys[member_key] = candidate["members"][-1]

    merged.setdefault("founder_review", []).extend(json.loads(json.dumps(supplement.get("founder_review", []))))
    if supplement.get("search_intent"):
        merged["search_intent"] = json.loads(json.dumps(supplement["search_intent"]))
    if supplement.get("retained_candidate_catalogue"):
        merged["retained_candidate_catalogue"] = json.loads(
            json.dumps(supplement["retained_candidate_catalogue"])
        )
    merged["research_date"] = supplement.get("research_date", merged.get("research_date", DEFAULT_RESEARCH_DATE))
    return merged


def _build_founder_review(seed: dict[str, Any], candidate_ids: dict[str, str], source_key_to_id: dict[str, str]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for raw in seed.get("founder_review", []):
        row = dict(raw)
        row["related_search_area_candidate_ids"] = [candidate_ids[key] for key in raw.get("related_candidate_keys", [])]
        row.pop("related_candidate_keys", None)
        row["supporting_source_ids"] = sorted({source_key_to_id[key] for key in raw.get("source_keys", [])})
        row.pop("source_keys", None)
        rows.append(row)
    return rows


def _build_search_intent(
    seed: dict[str, Any],
    candidate_ids: dict[str, str],
    source_key_to_id: dict[str, str],
    canonical_by_name: dict[str, list[dict[str, Any]]],
) -> list[dict[str, Any]]:
    """Resolve review queries without changing their product classification."""

    rows: list[dict[str, Any]] = []
    for raw in seed.get("search_intent", []):
        query = raw["query"]
        factual_rows = canonical_by_name.get(normalize_name(query), [])
        candidate_keys = raw.get("candidate_keys", [])
        source_keys = raw.get("source_keys", [])
        rows.append({
            "schema_version": SCHEMA_VERSION,
            "query": query,
            "normalized_query": normalize_name(query),
            "classification": raw["classification"],
            "search_area_candidate_ids": [candidate_ids[key] for key in candidate_keys],
            "factual_canonical_location_ids": [row["canonical_location_id"] for row in factual_rows],
            "factual_resolution_state": (
                "resolved_exact_preferred_name"
                if len(factual_rows) == 1
                else "ambiguous_factual_name"
                if len(factual_rows) > 1
                else "missing_from_accepted_factual_projection"
            ),
            "supporting_source_ids": sorted({source_key_to_id[key] for key in source_keys}),
            "notes": raw.get("notes"),
            "researched_at": seed.get("research_date", DEFAULT_RESEARCH_DATE),
        })
    return rows


def _write_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def _write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")


def _summary_markdown(
    seed: dict[str, Any],
    candidates: list[dict[str, Any]],
    memberships: list[dict[str, Any]],
    gaps: list[dict[str, Any]],
    source_manifest: list[dict[str, Any]],
) -> str:
    state_counts = Counter(row["membership_state"] for row in memberships)
    resolved = [row for row in memberships if row.get("canonical_location_id")]
    location_area_counts = Counter(row["canonical_location_id"] for row in resolved)
    overlap_locations = sum(1 for count in location_area_counts.values() if count > 1)
    overlap_assertions = sum(count for count in location_area_counts.values() if count > 1)
    serious = [row for row in candidates if row["proposed_status"] != "avoid"]
    launch_critical = [row["preferred_name"] for row in candidates if row["launch_priority"] == "launch-critical"]
    useful_post_launch = [row["preferred_name"] for row in candidates if row["launch_priority"] == "useful-post-launch"]
    research_further = [row["preferred_name"] for row in candidates if row["launch_priority"] == "research-further"]
    avoid = [row["preferred_name"] for row in candidates if row["launch_priority"] == "avoid"]
    lines = [
        "# Gauteng property Search Area research v0.1",
        "",
        f"Research date: {seed.get('research_date', DEFAULT_RESEARCH_DATE)}.",
        "",
        "This is a research authority projection. It does not create production Search Areas, database records, routes, polygons, or search configuration.",
        "",
        "## Decision",
        "",
        "YES — the evidence is strong enough for a bounded Gauteng Search Area v0.1 candidate-definition workstream, provided launch is restricted to the launch-critical candidates below and unresolved factual gaps remain blocked.",
        "",
        "## Recommended MVP candidate set",
        "",
        f"Launch-critical: {', '.join(f'**{name}**' for name in launch_critical)}.",
        "",
        f"Useful post-launch: {', '.join(useful_post_launch)}.",
        "",
        f"Research further: {', '.join(research_further)}. Avoid as Search Areas for this cycle: {', '.join(avoid)}; direct factual intent is more useful than a broad market grouping on current evidence.",
        "",
        "## Candidate findings",
        "",
        "| Candidate | Evidence | Core / strongly supported resolved members | Priority | Recommendation |",
        "|---|---:|---:|---|---|",
    ]
    for candidate in serious:
        area_rows = [row for row in memberships if row["search_area_candidate_id"] == candidate["search_area_candidate_id"]]
        strong = sum(row["membership_state"] in {"core", "strongly_supported"} for row in area_rows)
        lines.append(f"| {candidate['preferred_name']} | {candidate['evidence_strength']} / {candidate['independent_source_count']} independent | {strong} | {candidate['launch_priority']} | {candidate['recommendation']} |")
    lines.extend([
        "",
        "The detailed membership authority is in `gauteng_search_area_membership_evidence_v0.1.jsonl`; this report intentionally does not enumerate every suburb.",
        "",
        "## Counts",
        "",
        f"- Search Area candidates: {len(candidates)} ({len([row for row in candidates if row['launch_priority'] == 'launch-critical'])} launch-critical).",
        f"- Membership assertions: {len(memberships)}; resolved: {len(resolved)}.",
        f"- Resolved core: {state_counts['core']}; strongly supported: {state_counts['strongly_supported']}; supported: {state_counts['supported']}; disputed: {state_counts['disputed']}; fringe: {state_counts['fringe']}; unresolved: {state_counts['unresolved']}; excluded: {state_counts['excluded']}.",
        f"- Overlap: {overlap_locations} factual canonical locations have membership in more than one candidate, representing {overlap_assertions} assertions. Overlap is retained rather than forced into one market.",
        f"- Factual-geography gap candidates: {len(gaps)}. None are promoted by this workstream.",
        "",
        "## Authority rules",
        "",
        "- Factual canonical IDs are read-only references to checkpoint `bd39aa38e4f7158164f3572b62db827fbf01c1a7`; a same-name Search Area receives its own `sa-gp-v01-*` identity.",
        "- Core means multiple independent market sources converge on the location. Strongly supported means consistent evidence exists but the term is narrower, less independent, or overlaps a neighbouring market. Supported and fringe assertions are retained for review, not automatically launched.",
        "- Missing factual names are emitted as `factual_geography_gap_candidate` records. Kyalami remains blocked by the factual evidence/licensing gate; it is not absorbed into Midrand or any other Search Area.",
        "- Portal and agency taxonomies are observations only. No source IDs, proprietary taxonomy, or source hierarchy is reused as Property Listify authority.",
        "- A market term and an identically named factual location may both be valid results. Candidate IDs and canonical IDs are intentionally different namespaces.",
        "",
        "## Main findings",
        "",
        "Johannesburg North is a useful market concept but collides with the factual suburb of the same name. The market should be a separate identity with a consensus core around northern Johannesburg, Randburg/Sandton/Fourways-related suburbs; Greater Sandton and Fourways are useful narrower overlaps, not reasons to copy a portal hierarchy.",
        "",
        "Johannesburg East is not launch-safe: Lightstone uses a narrow inner-east basket while other property sources use the label for an East Rand-wide basket. The conflict is substantive, not a fringe-boundary disagreement.",
        "",
        "Pretoria East has the strongest Pretoria supra-suburb evidence. Old East is a recognisable narrower overlap; Pretoria Moot and Pretoria North are useful separate post-launch concepts. Broad portal lists that mix Pretoria East with North/West areas are preserved as conflicting evidence and not adopted wholesale.",
        "",
        "East Rand is a strong cross-town property-market term. Alberton is intentionally allowed to overlap with Johannesburg South; the evidence does not support a forced exclusive boundary.",
        "",
        "Midrand and Centurion operate both as factual identities and as consumer-facing multi-suburb property markets. They need type-aware disambiguation, not aliasing one identity into the other.",
        "",
        "## Sources and limitations",
        "",
        f"The source manifest contains {len(source_manifest)} current or recent observations across portals, established agencies, market analytics, property publications, and official/administrative context. Access date is recorded per source.",
        "",
        "Limitations: property portals expose changing listing inventories and editorial groupings rather than licensed reusable market authorities; agency pages may be promotional or SEO-oriented; membership evidence is a market interpretation, not statutory geography; exact boundaries require later product governance; province-crossing Vaal usage requires a later scope decision.",
        "",
        "## Founder review",
        "",
        "The bounded review CSV contains only decisions that cannot be settled safely by evidence alone: whether to carry overlapping/narrower concepts at launch, how to treat the ambiguous Johannesburg East label, and whether Vaal should launch as a Gauteng-scoped Search Area despite a cross-province market concept.",
        "",
    ])
    return "\n".join(lines)


def build_all(
    seed_path: Path,
    canonical_path: Path,
    output_dir: Path,
    supplement_path: Path | None = None,
) -> dict[str, Any]:
    base_seed = json.loads(seed_path.read_text(encoding="utf-8"))
    supplement = json.loads(supplement_path.read_text(encoding="utf-8")) if supplement_path else None
    seed = _merge_seed(base_seed, supplement)
    index, canonical_by_id, canonical_by_name = build_canonical_index(canonical_path)
    sources_by_key, source_key_to_id = _source_lookup(seed)
    candidates, memberships = _build_candidates(
        seed,
        canonical_by_id,
        canonical_by_name,
        sources_by_key,
        source_key_to_id,
    )
    membership_by_candidate: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in memberships:
        membership_by_candidate[row["search_area_candidate_id"]].append(row)
    for candidate in candidates:
        area_rows = membership_by_candidate[candidate["search_area_candidate_id"]]
        candidate["membership_assertion_count"] = len(area_rows)
        candidate["membership_state_counts"] = dict(
            sorted(Counter(row["membership_state"] for row in area_rows).items())
        )
        candidate["resolved_membership_count"] = sum(1 for row in area_rows if row.get("canonical_location_id"))
        candidate["unresolved_membership_count"] = sum(1 for row in area_rows if not row.get("canonical_location_id"))
    gaps = _build_gaps(memberships, seed)
    candidate_ids = {raw["key"]: candidate_id(raw["preferred_name"]) for raw in seed.get("candidates", [])}
    founder_review = _build_founder_review(seed, candidate_ids, source_key_to_id)
    source_manifest = _output_source_manifest(sources_by_key)
    output_dir.mkdir(parents=True, exist_ok=True)

    _write_json(output_dir / "gauteng_search_area_candidates_v0.1.json", candidates)
    _write_jsonl(output_dir / "gauteng_search_area_membership_evidence_v0.1.jsonl", memberships)
    _write_json(output_dir / "gauteng_search_area_source_manifest_v0.1.json", source_manifest)
    _write_json(output_dir / "gauteng_search_area_geography_gaps_v0.1.json", gaps)
    _write_jsonl(output_dir / "gauteng_factual_canonical_location_index_v0.1.jsonl", index)
    if seed.get("search_intent"):
        search_intent = _build_search_intent(seed, candidate_ids, source_key_to_id, canonical_by_name)
        _write_json(output_dir / "gauteng_search_area_search_intent_v0.1.json", search_intent)

    if founder_review:
        fieldnames = sorted({key for row in founder_review for key in row})
        with (output_dir / "gauteng_search_area_founder_review_v0.1.csv").open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(founder_review)

    summary = _summary_markdown(seed, candidates, memberships, gaps, source_manifest)
    (output_dir / "gauteng_search_area_research_summary_v0.1.md").write_text(summary, encoding="utf-8")

    state_counts = Counter(row["membership_state"] for row in memberships)
    observed_state_counts = Counter(row["observed_membership_state"] for row in memberships)
    location_area_counts = Counter(row["canonical_location_id"] for row in memberships if row.get("canonical_location_id"))
    run = {
        "schema_version": SCHEMA_VERSION,
        "research_date": seed.get("research_date", DEFAULT_RESEARCH_DATE),
        "seed_path": str(seed_path),
        "canonical_source_path": str(canonical_path),
        "retained_candidate_catalogue": seed.get("retained_candidate_catalogue"),
        "factual_checkpoint_commit": seed["factual_checkpoint"]["commit"],
        "factual_checkpoint_content_verified": True,
        "canonical_location_count": len(index),
        "source_count": len(source_manifest),
        "search_area_candidate_count": len(candidates),
        "membership_assertion_count": len(memberships),
        "membership_state_counts": dict(sorted(state_counts.items())),
        "observed_membership_state_counts": dict(sorted(observed_state_counts.items())),
        "resolved_membership_assertion_count": sum(1 for row in memberships if row.get("canonical_location_id")),
        "geography_gap_candidate_count": len(gaps),
        "overlap_canonical_location_count": sum(1 for count in location_area_counts.values() if count > 1),
        "overlap_membership_assertion_count": sum(count for count in location_area_counts.values() if count > 1),
        "search_intent_count": len(seed.get("search_intent", [])),
        "candidate_priority_counts": dict(
            sorted(Counter(row["launch_priority"] for row in candidates).items())
        ),
        "production_changes_made": False,
        "search_implementation_changes_made": False,
        "database_changes_made": False,
    }
    _write_json(output_dir / "gauteng_search_area_research_run_v0.1.json", run)
    return run
