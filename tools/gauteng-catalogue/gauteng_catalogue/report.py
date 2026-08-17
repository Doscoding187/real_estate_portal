from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from . import CATALOGUE_VERSION
from .common import normalize_lookup, utc_now, write_csv, write_json, write_jsonl
from .config import OUTPUT_ROOT, PROBE_NAMES


CANDIDATES_JSONL = OUTPUT_ROOT / f"gauteng_candidate_catalogue_{CATALOGUE_VERSION}.jsonl"
CANDIDATES_CSV = OUTPUT_ROOT / f"gauteng_candidate_catalogue_{CATALOGUE_VERSION}.csv"
CANDIDATES_GEOJSON = OUTPUT_ROOT / f"gauteng_candidate_catalogue_{CATALOGUE_VERSION}.geojson"
MATCHES_JSONL = OUTPUT_ROOT / f"gauteng_candidate_matches_{CATALOGUE_VERSION}.jsonl"
MATCHES_CSV = OUTPUT_ROOT / f"gauteng_candidate_matches_{CATALOGUE_VERSION}.csv"
COVERAGE_JSON = OUTPUT_ROOT / f"gauteng_coverage_conflict_report_{CATALOGUE_VERSION}.json"
COVERAGE_MARKDOWN = OUTPUT_ROOT / f"gauteng_coverage_conflict_report_{CATALOGUE_VERSION}.md"
RUN_METADATA = OUTPUT_ROOT / f"gauteng_catalogue_run_{CATALOGUE_VERSION}.json"


def _candidate_probe_forms(candidate: dict[str, Any]) -> set[str]:
    values = [candidate.get("preferred_name"), candidate.get("normalized_name")]
    values.extend(candidate.get("aliases", []))
    values.extend(candidate.get("historical_names", []))
    return {value for value in (normalize_lookup(item) for item in values) if value}


def _probe_row(probe: str, candidates: list[dict[str, Any]], matches: list[dict[str, Any]]) -> dict[str, Any]:
    normalized = normalize_lookup(probe)
    interpretations = [candidate for candidate in candidates if normalized in _candidate_probe_forms(candidate)]
    interpretations.sort(key=lambda candidate: candidate["candidate_location_id"])
    interpretation_ids = {candidate["candidate_location_id"] for candidate in interpretations}
    related_matches = [
        match
        for match in matches
        if match.get("candidate_location_id") in interpretation_ids
        or match.get("related_candidate_location_id") in interpretation_ids
    ]
    return {
        "probe": probe,
        "normalized_probe": normalized,
        "found": bool(interpretations),
        "candidate_interpretation_count": len(interpretations),
        "interpretations": [
            {
                "candidate_location_id": candidate["candidate_location_id"],
                "preferred_name": candidate["preferred_name"],
                "candidate_type": candidate["candidate_type"],
                "coordinates": {
                    "latitude": candidate["representative_latitude"],
                    "longitude": candidate["representative_longitude"],
                },
                "supporting_sources": candidate["source_names"],
                "administrative_context": candidate["administrative_context"],
                "aliases": candidate["aliases"],
                "historical_names": candidate["historical_names"],
                "conflicts": candidate["conflicts"],
                "confidence": candidate["match_confidence"],
                "review_status": candidate["review_state"],
                "review_reasons": candidate["review_reasons"],
            }
            for candidate in interpretations
        ],
        "supporting_sources": sorted({match.get("source") for match in related_matches if match.get("source")}),
        "conflicts": sorted(
            {
                reason
                for match in related_matches
                for reason in (match.get("conflict_reason") or [])
                if reason
            }
        ),
        "confidence": max((candidate["match_confidence"] for candidate in interpretations), default=0.0),
        "review_status": (
            "needs_review"
            if any(candidate["review_state"] == "needs_review" for candidate in interpretations)
            else "supported_candidate"
            if interpretations
            else "missing"
        ),
    }


def build_coverage_report(
    *,
    candidates: list[dict[str, Any]],
    matches: list[dict[str, Any]],
    conflicts: dict[str, Any],
    source_records: list[dict[str, Any]],
    manifest: dict[str, Any],
    reconciliation_summary: dict[str, Any],
) -> dict[str, Any]:
    probes = [_probe_row(probe, candidates, matches) for probe in PROBE_NAMES]
    kyalami = {
        "Kyalami": _probe_row("Kyalami", candidates, matches),
        "Khayalami": _probe_row("Khayalami", candidates, matches),
    }
    kyalami_candidate_ids = {
        interpretation["candidate_location_id"]
        for row in kyalami.values()
        for interpretation in row["interpretations"]
    }
    if len(kyalami_candidate_ids) == 1 and all(row["found"] for row in kyalami.values()):
        kyalami_interpretation = "same_candidate_alias_or_variant"
    elif len(kyalami_candidate_ids) > 1:
        kyalami_interpretation = "separate_candidate_interpretations"
    elif any(row["found"] for row in kyalami.values()):
        kyalami_interpretation = "one_form_found_other_missing"
    else:
        kyalami_interpretation = "no_source_evidence_found"

    candidates_by_type = Counter(candidate["candidate_type"] for candidate in candidates)
    candidates_by_review = Counter(candidate["review_state"] for candidate in candidates)
    candidates_by_source_count = Counter(str(candidate["source_count"]) for candidate in candidates)
    source_counts = Counter(record["source"] for record in source_records)
    source_gate_counts: Counter[str] = Counter(
        str(record.get("gauteng_spatial_gate", {}).get("status", "unknown")) for record in source_records
    )
    development_candidates = [
        {
            "candidate_location_id": candidate["candidate_location_id"],
            "preferred_name": candidate["preferred_name"],
            "candidate_type": candidate["candidate_type"],
            "sources": candidate["source_names"],
            "review_state": candidate["review_state"],
            "coordinates": {
                "latitude": candidate["representative_latitude"],
                "longitude": candidate["representative_longitude"],
            },
        }
        for candidate in candidates
        if candidate["candidate_type"] in {"estate/residential_development_candidate", "precinct/development_candidate"}
        or any("development" in reason for reason in candidate["review_reasons"])
    ]
    source_data_count_discrepancies = []
    for artifact in manifest.get("artifacts", []):
        official_count = (artifact.get("source_version") or {}).get("official_record_count")
        parsed_count = artifact.get("record_count_before_filter")
        if official_count is not None and parsed_count is not None and official_count != parsed_count:
            source_data_count_discrepancies.append(
                {
                    "artifact_id": artifact.get("artifact_id"),
                    "source": artifact.get("source"),
                    "official_record_count": official_count,
                    "parsed_record_count": parsed_count,
                    "note": "Official source index count differs from parsed country artifact count; both are preserved.",
                }
            )
    conflicts_with_source_counts = dict(conflicts)
    conflicts_with_source_counts["source_data_count_discrepancies"] = source_data_count_discrepancies
    return {
        "catalogue": "Property Listify Gauteng Candidate Catalogue v0.1",
        "generated_at": utc_now(),
        "scope": "research candidate catalogue; no production geography or Search Areas",
        "source_manifest_path": f"gauteng_source_manifest_{CATALOGUE_VERSION}.json",
        "summary": {
            **reconciliation_summary,
            "candidates_by_proposed_type": dict(sorted(candidates_by_type.items())),
            "candidates_by_review_state": dict(sorted(candidates_by_review.items())),
            "candidates_by_source_count": dict(sorted(candidates_by_source_count.items())),
            "source_record_counts": dict(sorted(source_counts.items())),
            "source_gate_status_counts": dict(sorted(source_gate_counts.items())),
            "multi_source_candidates": sum(1 for candidate in candidates if candidate["source_count"] > 1),
            "single_source_candidates": sum(1 for candidate in candidates if candidate["source_count"] == 1),
            "osm_only_candidates": sum(1 for candidate in candidates if candidate["osm_only"]),
            "ambiguous_or_conflicting_candidates": sum(
                1
                for candidate in candidates
                if candidate["review_state"] == "needs_review"
                and any(
                    reason in candidate["review_reasons"]
                    for reason in (
                        "duplicate_normalized_name_across_candidates",
                        "source_type_disagreement",
                        "spatial_or_admin_conflict",
                    )
                )
            ),
        },
        "required_property_search_probes": probes,
        "edge_cases": {
            "kyalami_khayalami": {
                "interpretation": kyalami_interpretation,
                "forms": kyalami,
                "candidate_ids": sorted(kyalami_candidate_ids),
            },
            "duplicate_names": {
                "group_count": len(conflicts.get("duplicate_normalized_names", [])),
                "examples": conflicts.get("duplicate_normalized_names", [])[:30],
                "invariant": "identical normalized names are retained as separate candidates unless stronger evidence supports a match",
            },
            "source_type_disagreements": {
                "count": len(conflicts.get("source_type_disagreements", [])),
                "examples": conflicts.get("source_type_disagreements", [])[:50],
                "invariant": "source-native classifications remain visible; proposed classification is reviewable",
            },
            "estates_and_developments": {
                "candidate_count": len(development_candidates),
                "candidates": development_candidates[:100],
                "invariant": "named residential-development evidence is a candidate only, never an automatically verified canonical location",
            },
            "boundary_disagreement": {
                "count": len(conflicts.get("boundary_admin_spatial_disagreements", [])),
                "examples": conflicts.get("boundary_admin_spatial_disagreements", [])[:100],
            },
            "source_data_count_discrepancies": {
                "count": len(source_data_count_discrepancies),
                "examples": source_data_count_discrepancies,
            },
            "fuzzy_matches_withheld": {
                "count": len(conflicts.get("fuzzy_proposals_withheld", [])),
                "examples": conflicts.get("fuzzy_proposals_withheld", [])[:100],
                "invariant": "fuzzy similarity produces proposed review rows and never silently merges records",
            },
        },
        "licensing": {
            "candidate_identity_owner": "Property Listify",
            "source_licence_classes_preserved": sorted(
                {
                    licence
                    for candidate in candidates
                    for licence in candidate.get("licence_classes", [])
                }
            ),
            "osm_only_candidates_are_explicit": True,
            "mixed_licence_evidence_is_not_collapsed": True,
        },
        "acquisition_limitations": manifest.get("acquisition_limitations", []),
        "conflicts": conflicts_with_source_counts,
    }


def _candidate_csv_row(candidate: dict[str, Any]) -> dict[str, Any]:
    return {
        "candidate_location_id": candidate["candidate_location_id"],
        "preferred_name": candidate["preferred_name"],
        "normalized_name": candidate["normalized_name"],
        "candidate_type": candidate["candidate_type"],
        "candidate_type_status": candidate["candidate_type_status"],
        "representative_latitude": candidate["representative_latitude"],
        "representative_longitude": candidate["representative_longitude"],
        "adm2": [item.get("name") for item in candidate["administrative_context"].get("adm2", [])],
        "adm3": [item.get("name") for item in candidate["administrative_context"].get("adm3", [])],
        "aliases": candidate["aliases"],
        "historical_names": candidate["historical_names"],
        "source_names": candidate["source_names"],
        "source_count": candidate["source_count"],
        "licence_classes": candidate["licence_classes"],
        "osm_only": candidate["osm_only"],
        "match_confidence": candidate["match_confidence"],
        "match_confidence_label": candidate["match_confidence_label"],
        "review_state": candidate["review_state"],
        "review_reasons": candidate["review_reasons"],
        "first_seen": candidate["first_seen"],
        "source_modification_dates": candidate["source_modification_dates"],
        "last_verified_at": candidate["last_verified_at"],
    }


def _match_csv_row(match: dict[str, Any]) -> dict[str, Any]:
    return {
        key: match.get(key)
        for key in (
            "candidate_location_id",
            "source_record_id",
            "source",
            "source_native_id",
            "match_method",
            "match_confidence",
            "match_status",
            "conflict_reason",
            "review_required",
            "related_candidate_location_id",
            "distance_km",
            "same_context",
            "notes",
            "evidence_source_artifact_ids",
            "evidence_assertion_ids",
        )
    }


def write_catalogue_outputs(
    *,
    candidates: list[dict[str, Any]],
    matches: list[dict[str, Any]],
    coverage_report: dict[str, Any],
    run_metadata: dict[str, Any],
) -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    write_jsonl(CANDIDATES_JSONL, candidates, sort_key="candidate_location_id")
    write_csv(
        CANDIDATES_CSV,
        [_candidate_csv_row(candidate) for candidate in sorted(candidates, key=lambda item: item["candidate_location_id"])],
        [
            "candidate_location_id",
            "preferred_name",
            "normalized_name",
            "candidate_type",
            "candidate_type_status",
            "representative_latitude",
            "representative_longitude",
            "adm2",
            "adm3",
            "aliases",
            "historical_names",
            "source_names",
            "source_count",
            "licence_classes",
            "osm_only",
            "match_confidence",
            "match_confidence_label",
            "review_state",
            "review_reasons",
            "first_seen",
            "source_modification_dates",
            "last_verified_at",
        ],
    )
    features = []
    for candidate in sorted(candidates, key=lambda item: item["candidate_location_id"]):
        geometry = candidate.get("representative_geometry")
        if not geometry:
            continue
        properties = {
            key: value
            for key, value in candidate.items()
            if key not in {"representative_geometry"}
        }
        features.append({"type": "Feature", "id": candidate["candidate_location_id"], "geometry": geometry, "properties": properties})
    write_json(CANDIDATES_GEOJSON, {"type": "FeatureCollection", "features": features})

    write_jsonl(MATCHES_JSONL, matches, sort_key="candidate_location_id")
    write_csv(
        MATCHES_CSV,
        [_match_csv_row(match) for match in matches],
        [
            "candidate_location_id",
            "source_record_id",
            "source",
            "source_native_id",
            "match_method",
            "match_confidence",
            "match_status",
            "conflict_reason",
            "review_required",
            "related_candidate_location_id",
            "distance_km",
            "same_context",
            "notes",
            "evidence_source_artifact_ids",
            "evidence_assertion_ids",
        ],
    )
    write_json(COVERAGE_JSON, coverage_report)
    write_markdown_report(COVERAGE_MARKDOWN, coverage_report)
    write_json(RUN_METADATA, run_metadata)


def write_markdown_report(path: Path, report: dict[str, Any]) -> None:
    summary = report["summary"]
    lines = [
        "# Property Listify Gauteng Candidate Catalogue v0.1",
        "",
        "This is a source-backed research catalogue, not production geography and not Search Areas.",
        "",
        "## Summary",
        "",
        f"- Candidates: **{summary.get('candidates', 0)}**",
        f"- Multi-source candidates: **{summary.get('multi_source_candidates', 0)}**",
        f"- Single-source candidates: **{summary.get('single_source_candidates', 0)}**",
        f"- OSM-only candidates: **{summary.get('osm_only_candidates', 0)}**",
        f"- Ambiguous/conflicting candidates: **{summary.get('ambiguous_or_conflicting_candidates', 0)}**",
        f"- Fuzzy proposals withheld from merge: **{report['edge_cases']['fuzzy_matches_withheld']['count']}**",
        "",
        "## Required property-search probes",
        "",
        "| Probe | Found | Interpretations | Types | Sources | Review |",
        "|---|---:|---:|---|---|---|",
    ]
    for probe in report["required_property_search_probes"]:
        types = ", ".join(sorted({item["candidate_type"] for item in probe["interpretations"]})) or "—"
        sources = ", ".join(probe["supporting_sources"]) or "—"
        lines.append(
            f"| {probe['probe']} | {'yes' if probe['found'] else 'no'} | {probe['candidate_interpretation_count']} | {types} | {sources} | {probe['review_status']} |"
        )
    kyalami = report["edge_cases"]["kyalami_khayalami"]
    lines.extend(
        [
            "",
            "## Important edge cases",
            "",
            f"- Kyalami/Khayalami interpretation: **{kyalami['interpretation']}**.",
            f"- Duplicate normalized-name groups retained: **{report['edge_cases']['duplicate_names']['group_count']}**.",
            f"- Source-type disagreements retained for review: **{report['edge_cases']['source_type_disagreements']['count']}**.",
            f"- Residential-development candidates (not verified geography): **{report['edge_cases']['estates_and_developments']['candidate_count']}**.",
            f"- Boundary/admin disagreements: **{report['edge_cases']['boundary_disagreement']['count']}**.",
            f"- Source artifact count discrepancies retained: **{report['edge_cases']['source_data_count_discrepancies']['count']}**.",
            "",
            "## Licence boundary",
            "",
            "Candidate IDs are Property Listify-owned. Source evidence remains attached to its source licence, including explicit ODbL provenance for OSM evidence and OSM-only candidates.",
            "",
            "## Reconciliation invariant",
            "",
            "Direct cross-identifiers are stronger than contextual matches. Exact names require compatible type and spatial context. Fuzzy similarity is review-only and never silently merges records.",
            "",
        ]
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")
