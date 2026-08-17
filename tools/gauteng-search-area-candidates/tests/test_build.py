from __future__ import annotations

import json
import sys
import tempfile
import unittest
from collections import Counter
from pathlib import Path


TOOL_ROOT = Path(__file__).resolve().parents[1]
if str(TOOL_ROOT) not in sys.path:
    sys.path.insert(0, str(TOOL_ROOT))

from gauteng_search_area_candidates.build import (  # noqa: E402
    ACTIVE_MEMBERSHIP_CLASSES,
    DEFINITION_VERSION,
    TARGET_NAMES,
    build_pack,
    search_area_id,
)


REPO_ROOT = Path(__file__).resolve().parents[3]
RESEARCH_OUTPUT = (
    REPO_ROOT
    / "data"
    / "gauteng-search-area-research-v0.1"
    / "output"
)
CANONICAL_OUTPUT = (
    REPO_ROOT
    / "data"
    / "gauteng-factual-canonical-v0.1"
    / "output"
)


def read_jsonl(path: Path) -> list[dict[str, object]]:
    return [
        json.loads(line)
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


class SearchAreaDefinitionBuildTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.source_paths = [
            RESEARCH_OUTPUT / "gauteng_search_area_candidates_v0.1.json",
            RESEARCH_OUTPUT / "gauteng_search_area_membership_evidence_v0.1.jsonl",
            RESEARCH_OUTPUT / "gauteng_search_area_geography_gaps_v0.1.json",
            RESEARCH_OUTPUT / "gauteng_search_area_search_intent_v0.1.json",
            CANONICAL_OUTPUT / "gauteng_factual_canonical_kyalami_evidence_v0.1.json",
        ]
        cls.source_bytes_before = {
            path: path.read_bytes() for path in cls.source_paths
        }
        cls.temp = tempfile.TemporaryDirectory()
        cls.output_one = Path(cls.temp.name) / "one"
        cls.output_two = Path(cls.temp.name) / "two"
        cls.report = build_pack(REPO_ROOT, cls.output_one)
        cls.report_again = build_pack(REPO_ROOT, cls.output_two)

    @classmethod
    def tearDownClass(cls) -> None:
        for path, expected in cls.source_bytes_before.items():
            if path.read_bytes() != expected:
                raise AssertionError(f"source evidence changed: {path}")
        cls.temp.cleanup()

    def test_exactly_six_active_candidate_definitions(self) -> None:
        definitions = self.report["definitions"]["search_areas"]
        self.assertEqual(len(definitions), 6)
        self.assertEqual(
            [definition["preferred_name"] for definition in definitions],
            list(TARGET_NAMES),
        )
        self.assertTrue(all(not definition["production_activation"] for definition in definitions))

    def test_ids_are_stable_opaque_and_not_source_ids(self) -> None:
        definitions = self.report["definitions"]["search_areas"]
        source_candidates = json.loads(
            (RESEARCH_OUTPUT / "gauteng_search_area_candidates_v0.1.json").read_text(
                encoding="utf-8"
            )
        )
        source_ids = {
            candidate["search_area_candidate_id"] for candidate in source_candidates
        }
        ids = [definition["search_area_id"] for definition in definitions]
        self.assertEqual(len(set(ids)), 6)
        for definition in definitions:
            self.assertTrue(definition["search_area_id"].startswith("pl-sa-gp-"))
            self.assertNotIn(definition["search_area_id"], source_ids)
            stable_key = next(
                target["identity_key"]
                for target in (
                    {"preferred_name": "Johannesburg North", "identity_key": "jhb-north"},
                    {"preferred_name": "Johannesburg South", "identity_key": "jhb-south"},
                    {"preferred_name": "East Rand", "identity_key": "east-rand"},
                    {"preferred_name": "Pretoria East", "identity_key": "pretoria-east"},
                    {"preferred_name": "Midrand", "identity_key": "midrand"},
                    {"preferred_name": "Centurion", "identity_key": "centurion"},
                )
                if target["preferred_name"] == definition["preferred_name"]
            )
            self.assertEqual(definition["search_area_id"], search_area_id(stable_key))

    def test_active_memberships_use_only_allowed_classes_and_threshold(self) -> None:
        active = self.report["active_memberships"]
        self.assertEqual(len(active), 62)
        self.assertEqual(Counter(row["membership_class"] for row in active), Counter({
            "core": 41,
            "strongly_supported": 21,
        }))
        self.assertTrue(
            all(
                row["membership_class"] in ACTIVE_MEMBERSHIP_CLASSES
                and row["effective_definition_version"] == DEFINITION_VERSION
                and row["why_passed_active_threshold"]
                for row in active
            )
        )
        self.assertEqual(
            set(row["search_area_preferred_name"] for row in active),
            set(TARGET_NAMES),
        )

    def test_supported_and_other_deferred_states_do_not_leak(self) -> None:
        active = self.report["active_memberships"]
        self.assertFalse(
            set(row["membership_class"] for row in active)
            & {"supported", "fringe", "disputed", "unresolved", "excluded"}
        )
        evidence = read_jsonl(
            RESEARCH_OUTPUT
            / "gauteng_search_area_membership_evidence_v0.1.jsonl"
        )
        self.assertTrue(
            any(
                row["membership_state"] in {
                    "supported",
                    "fringe",
                    "disputed",
                    "unresolved",
                    "excluded",
                }
                for row in evidence
            )
        )

    def test_every_active_member_references_accepted_factual_id(self) -> None:
        evidence = read_jsonl(
            RESEARCH_OUTPUT
            / "gauteng_search_area_membership_evidence_v0.1.jsonl"
        )
        accepted_ids = {
            row["canonical_location_id"]
            for row in evidence
            if row["search_area_preferred_name"] in TARGET_NAMES
            and row["canonical_location_id"]
            and not row["factual_gap_candidate"]
            and not row["kyalami_policy_blocked"]
            and row["canonical_resolution_state"]
            not in {"missing_from_accepted_factual_projection", "ambiguous_factual_name"}
        }
        self.assertTrue(
            {
                row["canonical_location_id"]
                for row in self.report["active_memberships"]
            }.issubset(accepted_ids)
        )
        self.assertTrue(
            all(
                row["canonical_location_id"]
                and row["factual_type"]
                and not row["factual_gap_candidate"]
                for row in self.report["active_memberships"]
            )
        )

    def test_gap_candidates_never_become_active_and_kyalami_stays_blocked(self) -> None:
        gaps = self.report["gap_links"]
        self.assertEqual(gaps["total_recorded_geography_gap_candidates"], 23)
        self.assertEqual(gaps["mvp_affected_geography_gap_candidates"], 19)
        gap_names = {
            gap["name"]
            for gap in gaps["gaps"]
            if gap["affected_search_area_ids"]
        }
        active_names = {
            row["factual_location_preferred_name"]
            for row in self.report["active_memberships"]
        }
        self.assertTrue(gap_names.isdisjoint(active_names))
        kyalami = next(gap for gap in gaps["gaps"] if gap["name"] == "Kyalami")
        self.assertFalse(kyalami["active_membership_allowed"])
        self.assertEqual(
            kyalami["active_membership_block_reason"],
            "kyalami_search_area_workaround_forbidden",
        )
        self.assertTrue(kyalami["research_gap"]["kyalami_policy_blocked"])
        self.assertEqual(
            gaps["kyalami_policy"]["preferred_common_consumer_name"],
            "Kyalami",
        )
        self.assertEqual(
            gaps["kyalami_policy"]["official_corrected_name"],
            "Khayalami",
        )
        self.assertIsNone(gaps["kyalami_policy"]["canonical_location_id"])
        self.assertFalse(
            any(
                row["factual_location_preferred_name"] == "Kyalami"
                for row in self.report["active_memberships"]
            )
        )

    def test_active_overlap_is_preserved_exactly(self) -> None:
        overlap = self.report["overlaps"]
        self.assertEqual(overlap["active_overlapping_canonical_location_count"], 1)
        active_overlap = overlap["active_overlap_set"][0]
        self.assertEqual(active_overlap["canonical_location_preferred_name"], "Alberton")
        self.assertEqual(
            {
                member["search_area_preferred_name"]
                for member in active_overlap["search_area_memberships"]
            },
            {"Johannesburg South", "East Rand"},
        )
        self.assertEqual(
            overlap["active_overlapping_search_area_pair_count"], 1
        )
        self.assertTrue(overlap["overlap_policy"]["overlap_allowed"])

    def test_same_name_collisions_remain_distinct(self) -> None:
        collisions = {
            collision["search_area_preferred_name"]: collision
            for collision in self.report["collisions"]["collisions"]
        }
        self.assertEqual(
            set(collisions),
            {"Johannesburg North", "East Rand", "Midrand", "Centurion"},
        )
        self.assertTrue(
            all(
                collision["disambiguation_required"]
                and collision["identities_are_distinct"]
                for collision in collisions.values()
            )
        )
        self.assertEqual(len(collisions["Midrand"]["factual_canonical_ids"]), 2)
        self.assertEqual(len(collisions["Centurion"]["factual_canonical_ids"]), 1)
        self.assertEqual(len(collisions["Johannesburg North"]["factual_canonical_ids"]), 1)
        self.assertEqual(len(collisions["East Rand"]["factual_canonical_ids"]), 1)
        definition_ids = {
            definition["search_area_id"]
            for definition in self.report["definitions"]["search_areas"]
        }
        for collision in collisions.values():
            for factual in collision["factual_canonical_ids"]:
                self.assertNotIn(factual["canonical_location_id"], definition_ids)

        midrand_rows = [
            row
            for row in self.report["active_memberships"]
            if row["search_area_preferred_name"] == "Midrand"
            and row["factual_location_preferred_name"] == "Midrand"
        ]
        self.assertEqual(
            {row["canonical_location_id"] for row in midrand_rows},
            {
                "pl-gp-v01-0d7688adb9c7af392007",
                "pl-gp-v01-455d2715587edce120f0",
            },
        )

    def test_deferred_candidate_definitions_are_absent(self) -> None:
        names = {
            definition["preferred_name"]
            for definition in self.report["definitions"]["search_areas"]
        }
        self.assertNotIn("Johannesburg East", names)
        self.assertNotIn("Vaal", names)
        self.assertNotIn("Pretoria Old East", names)
        self.assertNotIn("Pretoria Far East", names)

    def test_evidence_copy_and_build_are_immutable_and_deterministic(self) -> None:
        evidence_source = RESEARCH_OUTPUT / "gauteng_search_area_membership_evidence_v0.1.jsonl"
        evidence_copy = self.output_one / "gauteng_search_area_membership_evidence_v0.1.jsonl"
        self.assertEqual(evidence_copy.read_bytes(), evidence_source.read_bytes())
        self.assertEqual(
            sorted(path.name for path in self.output_one.iterdir()),
            sorted(path.name for path in self.output_two.iterdir()),
        )
        for path_one in self.output_one.iterdir():
            path_two = self.output_two / path_one.name
            self.assertEqual(path_one.read_bytes(), path_two.read_bytes(), path_one.name)


if __name__ == "__main__":
    unittest.main()
