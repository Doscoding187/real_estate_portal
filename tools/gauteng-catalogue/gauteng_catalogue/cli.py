from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path
from typing import Any

from . import CATALOGUE_VERSION, PIPELINE_VERSION
from .acquire import (
    MANIFEST_PATH,
    acquire_base_sources,
    acquire_wikidata,
    load_manifest,
    qids_from_source_records,
)
from .common import utc_now, write_csv, write_json
from .config import OUTPUT_ROOT, PIPELINE_METADATA
from .extract import SOURCE_RECORDS_PATH, build_source_records
from .reconcile import reconcile_records
from .report import (
    COVERAGE_JSON,
    COVERAGE_MARKDOWN,
    MATCHES_JSONL,
    CANDIDATES_JSONL,
    build_coverage_report,
    write_catalogue_outputs,
)


def _git_value(args: list[str]) -> str | None:
    try:
        return subprocess.check_output(["git", *args], text=True, stderr=subprocess.DEVNULL).strip()
    except (OSError, subprocess.CalledProcessError):
        return None


def _write_manifest_csv(manifest: dict[str, Any]) -> Path:
    path = OUTPUT_ROOT / f"gauteng_source_manifest_{CATALOGUE_VERSION}.csv"
    rows = []
    for artifact in manifest.get("artifacts", []):
        rows.append(
            {
                "artifact_id": artifact.get("artifact_id"),
                "source": artifact.get("source"),
                "access_url": artifact.get("access_url"),
                "resolved_url": artifact.get("resolved_url"),
                "filename": artifact.get("filename"),
                "path": artifact.get("path"),
                "retrieved_at": artifact.get("retrieved_at"),
                "source_version": artifact.get("source_version"),
                "size_bytes": artifact.get("size_bytes"),
                "sha256": artifact.get("sha256"),
                "licence_class": artifact.get("licence_class"),
                "attribution": artifact.get("attribution"),
                "geographic_scope": artifact.get("geographic_scope"),
                "filter_method": artifact.get("filter_method"),
                "record_count_before_filter": artifact.get("record_count_before_filter"),
                "record_count_after_relevance_filter": artifact.get("record_count_after_relevance_filter"),
                "record_count_after_gauteng_filter": artifact.get("record_count_after_gauteng_filter"),
                "errors_limitations": artifact.get("errors_limitations"),
            }
        )
    write_csv(
        path,
        rows,
        [
            "artifact_id",
            "source",
            "access_url",
            "resolved_url",
            "filename",
            "path",
            "retrieved_at",
            "source_version",
            "size_bytes",
            "sha256",
            "licence_class",
            "attribution",
            "geographic_scope",
            "filter_method",
            "record_count_before_filter",
            "record_count_after_relevance_filter",
            "record_count_after_gauteng_filter",
            "errors_limitations",
        ],
    )
    return path


def _build_and_report(manifest: dict[str, Any], *, include_wikidata: bool, command: str) -> dict[str, Any]:
    extraction = build_source_records(manifest, include_wikidata=include_wikidata)
    reconciliation = reconcile_records(extraction["records"], extraction["gate"])
    coverage = build_coverage_report(
        candidates=reconciliation["candidates"],
        matches=reconciliation["matches"],
        conflicts=reconciliation["conflicts"],
        source_records=extraction["records"],
        manifest=manifest,
        reconciliation_summary=reconciliation["summary"],
    )
    run_metadata = {
        **PIPELINE_METADATA,
        "pipeline_version": PIPELINE_VERSION,
        "command": command,
        "run_started_at": utc_now(),
        "repository_root": _git_value(["rev-parse", "--show-toplevel"]),
        "repository_head": _git_value(["rev-parse", "HEAD"]),
        "source_manifest": str(MANIFEST_PATH),
        "outputs": {
            "source_records": str(SOURCE_RECORDS_PATH),
            "source_assertions": str(SOURCE_RECORDS_PATH.with_name(SOURCE_RECORDS_PATH.name.replace("source_records", "source_assertions"))),
            "candidates": str(CANDIDATES_JSONL),
            "matches": str(MATCHES_JSONL),
            "coverage_json": str(COVERAGE_JSON),
            "coverage_markdown": str(COVERAGE_MARKDOWN),
        },
        "reproducibility": {
            "raw_artifacts_are_immutable_inputs": True,
            "candidate_identity_does_not_use_external_primary_ids": True,
            "database_operations_performed": False,
            "search_engine_changes_performed": False,
            "search_areas_created": False,
        },
        "summary": reconciliation["summary"],
    }
    write_catalogue_outputs(
        candidates=reconciliation["candidates"],
        matches=reconciliation["matches"],
        coverage_report=coverage,
        run_metadata=run_metadata,
    )
    write_json(MANIFEST_PATH, manifest)
    _write_manifest_csv(manifest)
    return {
        "extraction": extraction["counts"],
        "reconciliation": reconciliation["summary"],
        "coverage": coverage,
        "run_metadata": run_metadata,
    }


def run_all(*, skip_wikidata: bool = False) -> dict[str, Any]:
    manifest = acquire_base_sources()
    if skip_wikidata:
        return _build_and_report(manifest, include_wikidata=False, command="all --skip-wikidata")
    preliminary = build_source_records(manifest, include_wikidata=False)
    del preliminary
    qids = qids_from_source_records(SOURCE_RECORDS_PATH)
    acquire_wikidata(manifest, qids)
    return _build_and_report(manifest, include_wikidata=True, command="all")


def run_build(*, skip_wikidata: bool = False) -> dict[str, Any]:
    manifest = load_manifest()
    has_wikidata = any((OUTPUT_ROOT.parent / "raw" / "wikidata").glob("wikidata-query-*.json"))
    return _build_and_report(manifest, include_wikidata=has_wikidata and not skip_wikidata, command="build")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build the Property Listify Gauteng Candidate Catalogue v0.1")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("acquire-base", help="Acquire approved source artifacts except Wikidata query files")
    subparsers.add_parser("acquire-wikidata", help="Acquire narrow Wikidata query files using preliminary OSM QIDs")
    build_parser = subparsers.add_parser("build", help="Parse and reconcile already acquired artifacts")
    build_parser.add_argument("--skip-wikidata", action="store_true")
    all_parser = subparsers.add_parser("all", help="Acquire, parse, reconcile and emit all catalogue artifacts")
    all_parser.add_argument("--skip-wikidata", action="store_true")

    args = parser.parse_args(argv)
    if args.command == "acquire-base":
        manifest = acquire_base_sources()
        _write_manifest_csv(manifest)
        print(json.dumps({"manifest": str(MANIFEST_PATH), "artifacts": len(manifest.get("artifacts", []))}, indent=2))
        return 0
    if args.command == "acquire-wikidata":
        manifest = load_manifest()
        qids = qids_from_source_records(SOURCE_RECORDS_PATH) if SOURCE_RECORDS_PATH.exists() else []
        paths = acquire_wikidata(manifest, qids)
        write_json(MANIFEST_PATH, manifest)
        _write_manifest_csv(manifest)
        print(json.dumps({"query_files": [str(path) for path in paths], "qids": len(qids)}, indent=2))
        return 0
    result = run_all(skip_wikidata=args.skip_wikidata) if args.command == "all" else run_build(skip_wikidata=args.skip_wikidata)
    print(json.dumps({"reconciliation": result["reconciliation"], "output_root": str(OUTPUT_ROOT)}, indent=2, sort_keys=True))
    return 0
