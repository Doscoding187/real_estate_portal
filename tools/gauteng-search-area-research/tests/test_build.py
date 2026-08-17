from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path


TOOL_ROOT = Path(__file__).resolve().parents[1]
if str(TOOL_ROOT) not in sys.path:
    sys.path.insert(0, str(TOOL_ROOT))

from gauteng_search_area_research.build import (  # noqa: E402
    build_all,
    candidate_id,
    source_id,
    _validate_candidate_relationships,
)


def source(key: str, publisher: str, url: str) -> dict[str, str]:
    return {
        "key": key,
        "publisher": publisher,
        "domain": "example.test",
        "url": url,
        "title_or_context": key,
        "access_date": "2026-08-15",
        "source_category": "test_market_evidence",
        "reuse_classification": "market_evidence_only_no_reuse",
        "observation": "test observation",
        "limitations": "test limitation",
    }


def member(name: str, state: str, source_keys: list[str], **extra: object) -> dict[str, object]:
    row: dict[str, object] = {
        "name": name,
        "state": state,
        "confidence": "high",
        "source_keys": source_keys,
        "reason": "test evidence",
    }
    row.update(extra)
    return row


def fixture_seed() -> dict[str, object]:
    return {
        "schema_version": "0.1",
        "research_date": "2026-08-15",
        "factual_checkpoint": {"commit": "bd39aa38e4f7158164f3572b62db827fbf01c1a7"},
        "sources": [
            source("s1", "Publisher One", "https://example.test/one"),
            source("s2", "Publisher Two", "https://example.test/two"),
            source("s3", "Publisher Three", "https://example.test/three"),
        ],
        "candidates": [
            {
                "key": "north",
                "preferred_name": "Test North",
                "aliases": [],
                "market_concept_type": "test_market",
                "proposed_status": "proposed",
                "launch_priority": "launch-critical",
                "evidence_strength": "strong",
                "description": "test",
                "scope_narrative": "test",
                "source_keys": ["s1", "s2"],
                "overlapping_search_area_keys": ["south"],
                "nesting_recommendation": "no hierarchy",
                "consumer_search_usefulness": "high",
                "source_disagreements": "test conflict",
                "overlap_notes": "Test Foo overlaps.",
                "consumer_query_notes": "test disambiguation",
                "recommendation": "test",
                "members": [
                    member(
                        "Test Foo",
                        "core",
                        ["s1", "s2"],
                        canonical_location_ids=["pl-test-foo"],
                        conflicting_source_keys=["s3"],
                    ),
                    member(
                        "Missing Place",
                        "supported",
                        ["s1"],
                        likely_type="suburb",
                        gap_candidate_id="pl-test-missing-candidate",
                        retained_candidate_catalogue_exists=True,
                    ),
                ],
            },
            {
                "key": "south",
                "preferred_name": "Test South",
                "aliases": [],
                "market_concept_type": "test_market",
                "proposed_status": "proposed",
                "launch_priority": "useful-post-launch",
                "evidence_strength": "moderate",
                "description": "test",
                "scope_narrative": "test",
                "source_keys": ["s2", "s3"],
                "overlapping_search_area_keys": ["north"],
                "nesting_recommendation": "no hierarchy",
                "consumer_search_usefulness": "medium",
                "recommendation": "test",
                "members": [
                    member("Test Foo", "supported", ["s2"], canonical_location_ids=["pl-test-foo"]),
                ],
            },
            {
                "key": "same_name",
                "preferred_name": "Test Foo",
                "aliases": [],
                "market_concept_type": "test_market",
                "proposed_status": "proposed",
                "launch_priority": "research-further",
                "evidence_strength": "weak",
                "description": "test",
                "scope_narrative": "test",
                "source_keys": ["s1"],
                "members": [],
            },
        ],
    }


class BuildProjectionTests(unittest.TestCase):
    def test_ids_are_stable_and_normalized(self) -> None:
        self.assertEqual(candidate_id("Test North"), candidate_id(" test-north "))
        self.assertEqual(source_id("https://example.test/one"), source_id("https://example.test/one"))

    def test_candidate_nesting_cycles_are_rejected(self) -> None:
        seed = fixture_seed()
        seed["candidates"][0]["broader_candidate_key"] = "south"  # type: ignore[index]
        seed["candidates"][1]["broader_candidate_key"] = "north"  # type: ignore[index]
        ids = {row["key"]: candidate_id(row["preferred_name"]) for row in seed["candidates"]}  # type: ignore[index]
        with self.assertRaisesRegex(ValueError, "cycle"):
            _validate_candidate_relationships(seed, ids)

    def test_research_projection_preserves_authority_boundaries(self) -> None:
        seed = fixture_seed()
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            seed_path = root / "seed.json"
            canonical_path = root / "canonical.jsonl"
            out_one = root / "out-one"
            out_two = root / "out-two"
            seed_path.write_text(json.dumps(seed), encoding="utf-8")
            canonical_path.write_text(
                json.dumps(
                    {
                        "canonical_location_id": "pl-test-foo",
                        "preferred_name": "Test Foo",
                        "canonical_type": "suburb",
                        "administrative_context": {"province": {"name": "Gauteng"}},
                    }
                )
                + "\n",
                encoding="utf-8",
            )

            first = build_all(seed_path, canonical_path, out_one)
            second = build_all(seed_path, canonical_path, out_two)
            self.assertEqual(first, second)
            self.assertEqual(first["overlap_canonical_location_count"], 1)
            self.assertEqual(first["overlap_membership_assertion_count"], 2)
            self.assertEqual(first["geography_gap_candidate_count"], 1)

            candidates = json.loads((out_one / "gauteng_search_area_candidates_v0.1.json").read_text())
            by_name = {row["preferred_name"]: row for row in candidates}
            self.assertTrue(by_name["Test Foo"]["same_name_factual_collision"])
            self.assertEqual(by_name["Test North"]["membership_state_counts"]["core"], 1)

            memberships = [
                json.loads(line)
                for line in (out_one / "gauteng_search_area_membership_evidence_v0.1.jsonl").read_text().splitlines()
            ]
            core = next(row for row in memberships if row["membership_state"] == "core")
            self.assertEqual(core["canonical_location_id"], "pl-test-foo")
            self.assertEqual(len(core["conflicting_source_ids"]), 1)
            unresolved = next(row for row in memberships if row["canonical_location_name"] == "Missing Place")
            self.assertTrue(unresolved["factual_gap_candidate"])
            self.assertEqual(unresolved["membership_state"], "unresolved")

            gaps = json.loads((out_one / "gauteng_search_area_geography_gaps_v0.1.json").read_text())
            self.assertFalse(gaps[0]["promoted_to_factual_canonical"])
            self.assertEqual(gaps[0]["candidate_id_where_available"], "pl-test-missing-candidate")
            self.assertTrue(gaps[0]["retained_candidate_catalogue_exists"])

            for filename in (
                "gauteng_search_area_candidates_v0.1.json",
                "gauteng_search_area_membership_evidence_v0.1.jsonl",
                "gauteng_search_area_source_manifest_v0.1.json",
                "gauteng_search_area_geography_gaps_v0.1.json",
                "gauteng_search_area_research_summary_v0.1.md",
            ):
                self.assertEqual(
                    (out_one / filename).read_bytes(),
                    (out_two / filename).read_bytes(),
                    filename,
                )


if __name__ == "__main__":
    unittest.main()
