from __future__ import annotations

import copy
import json
import unittest
from pathlib import Path

from gauteng_catalogue.promotion import (
    AUTO_PROMOTABLE,
    CANDIDATE_ONLY,
    FOUNDER_REVIEW,
    PROVISIONAL_ATTRIBUTES,
    REJECTED,
    evaluate_catalogue,
)


def _record(
    source_record_id: str,
    source: str,
    name: str,
    *,
    latitude: float = -26.1,
    longitude: float = 28.1,
    place: str | None = None,
    landuse: str | None = None,
    element_type: str = "node",
    residential: str | None = None,
    feature_class: str | None = None,
    feature_code: str | None = None,
    designation: str | None = None,
    licence: str = "CC_BY_4",
) -> dict:
    tags = {"name": name}
    if place:
        tags["place"] = place
    if landuse:
        tags["landuse"] = landuse
    if residential:
        tags["residential"] = residential
    return {
        "source_record_id": source_record_id,
        "source": source,
        "exact_source_name": name,
        "source_native_classification": {
            "element_type": element_type if source == "osm" else None,
            "place": place,
            "landuse": landuse,
            "residential": residential,
            "feature_class": feature_class or ("P" if source == "geonames" else None),
            "feature_code": feature_code or ("PPL" if source == "geonames" else None),
            "designation": designation,
        },
        "source_payload": {"tags": tags},
        "gauteng_spatial_gate": {"status": "inside", "catalogue_eligible": True},
        "latitude": latitude,
        "longitude": longitude,
        "licence_class": licence,
        "aliases_supplied_by_source": [],
        "historical_names_supplied_by_source": [],
    }


def _candidate(
    candidate_id: str,
    name: str,
    source_ids: list[tuple[str, str]],
    *,
    candidate_type: str = "suburb",
    type_status: str = "proposed",
    type_hints: list[str] | None = None,
    latitude: float = -26.1,
    longitude: float = 28.1,
    osm_only: bool = False,
    edges: list[dict] | None = None,
    conflicts: list | None = None,
    licences: list[str] | None = None,
) -> dict:
    source_names = sorted({source for source, _ in source_ids})
    return {
        "candidate_location_id": candidate_id,
        "preferred_name": name,
        "normalized_name": name.casefold(),
        "candidate_type": candidate_type,
        "candidate_type_status": type_status,
        "candidate_type_source_hints": type_hints or [candidate_type],
        "representative_latitude": latitude,
        "representative_longitude": longitude,
        "administrative_context": {
            "province": {"name": "Gauteng"},
            "adm2": [{"name": "Test Municipality"}],
            "adm3": [{"name": "Test Municipality"}],
        },
        "aliases": [],
        "historical_names": [],
        "source_names": source_names,
        "source_count": len(source_names),
        "source_ids": [
            {"source": source, "source_native_id": native_id, "source_record_id": native_id}
            for source, native_id in source_ids
        ],
        "source_native_types": [],
        "source_assertions": [{"assertion_ids": [f"a:{candidate_id}"]}],
        "licence_classes": licences or (["ODBL_1"] if osm_only else ["CC_BY_4"]),
        "osm_only": osm_only,
        "reconciliation_edges": edges or [],
        "conflicts": conflicts or [],
        "review_reasons": [],
        "first_seen": "2026-01-01T00:00:00Z",
        "last_verified_at": "2026-01-01T00:00:00Z",
        "source_modification_dates": [],
    }


def _inputs(candidates: list[dict], records: list[dict], matches: list[dict] | None = None) -> dict:
    return {
        "catalogue_root": Path("/tmp/catalogue"),
        "output_root": Path("/tmp/catalogue/output"),
        "candidates": candidates,
        "matches": matches or [],
        "source_records": records,
        "assertions": [],
        "coverage": {},
        "run_metadata": {},
    }


class PromotionPolicyTests(unittest.TestCase):
    def test_direct_cross_identifier_is_auto_promotable(self) -> None:
        records = [
            _record("sr:osm:node/1", "osm", "Example", place="suburb", licence="ODBL_1"),
            _record("sr:wikidata:Q1", "wikidata", "Example", licence="CC0"),
        ]
        candidate = _candidate(
            "pl-1",
            "Example",
            [("osm", "sr:osm:node/1"), ("wikidata", "sr:wikidata:Q1")],
            edges=[
                {
                    "match_method": "direct_cross_identifier",
                    "confidence": 1.0,
                    "source_record_id_a": "sr:osm:node/1",
                    "source_record_id_b": "sr:wikidata:Q1",
                }
            ],
            licences=["CC0", "ODBL_1"],
            osm_only=False,
        )
        result = evaluate_catalogue(_inputs([candidate], records))
        row = result["simulations"][0]
        self.assertEqual(AUTO_PROMOTABLE, row["promotion_class"])
        self.assertTrue(row["identity_evidence"]["direct_cross_identifier"])
        self.assertEqual("MIXED_INCLUDES_ODBL", row["licence_state"])

    def test_identity_can_be_promotable_with_uncertain_type(self) -> None:
        records = [
            _record("sr:geonames:1", "geonames", "Example"),
            _record("sr:nga_gns:1", "nga_gns", "Example", licence="NO_RESTRICTION_GNS"),
        ]
        candidate = _candidate(
            "pl-2",
            "Example",
            [("geonames", "sr:geonames:1"), ("nga_gns", "sr:nga_gns:1")],
            type_status="source_disagreement",
            type_hints=["locality", "suburb", "town"],
            licences=["CC_BY_4", "NO_RESTRICTION_GNS"],
            edges=[{"match_method": "exact_contextual", "confidence": 0.94}],
        )
        result = evaluate_catalogue(_inputs([candidate], records))
        row = result["simulations"][0]
        self.assertEqual(PROVISIONAL_ATTRIBUTES, row["promotion_class"])
        self.assertIn("candidate_type", row["unresolved_attributes"])

    def test_duplicate_name_is_preserved_but_close_collision_is_reviewed(self) -> None:
        records = [
            _record("sr:geonames:3", "geonames", "Springfield", latitude=-26.1, longitude=28.1),
            _record("sr:nga_gns:3", "nga_gns", "Springfield", latitude=-26.1, longitude=28.1),
            _record("sr:geonames:5", "geonames", "Springfield", latitude=-26.1001, longitude=28.1001),
            _record("sr:nga_gns:5", "nga_gns", "Springfield", latitude=-26.1001, longitude=28.1001),
            _record("sr:geonames:4", "geonames", "Springfield", latitude=-26.5, longitude=27.5),
            _record("sr:nga_gns:4", "nga_gns", "Springfield", latitude=-26.5, longitude=27.5),
        ]
        close = _candidate(
            "pl-close",
            "Springfield",
            [("geonames", "sr:geonames:3"), ("nga_gns", "sr:nga_gns:3")],
            latitude=-26.1,
            longitude=28.1,
            edges=[{"match_method": "exact_contextual", "confidence": 0.94}],
        )
        close_two = _candidate(
            "pl-close-two",
            "Springfield",
            [("geonames", "sr:geonames:5"), ("nga_gns", "sr:nga_gns:5")],
            latitude=-26.1001,
            longitude=28.1001,
            edges=[{"match_method": "exact_contextual", "confidence": 0.94}],
        )
        far = _candidate(
            "pl-far",
            "Springfield",
            [("geonames", "sr:geonames:4"), ("nga_gns", "sr:nga_gns:4")],
            latitude=-26.5,
            longitude=27.5,
            edges=[{"match_method": "exact_contextual", "confidence": 0.94}],
        )
        result = evaluate_catalogue(_inputs([close, close_two, far], records))
        rows = {row["candidate_location_id"]: row for row in result["simulations"]}
        self.assertEqual(FOUNDER_REVIEW, rows["pl-close"]["promotion_class"])
        self.assertEqual(FOUNDER_REVIEW, rows["pl-close-two"]["promotion_class"])
        self.assertEqual(PROVISIONAL_ATTRIBUTES, rows["pl-far"]["promotion_class"])
        self.assertEqual("preserve_separate", rows["pl-far"]["duplicate_evidence"]["duplicate_name_action"])

    def test_osm_only_place_is_provisional_and_estate_is_not_promoted(self) -> None:
        place_record = _record("sr:osm:node/5", "osm", "OSM Place", place="suburb", licence="ODBL_1")
        estate_record = _record("sr:osm:way/6", "osm", "Named Estate", landuse="residential", licence="ODBL_1")
        place = _candidate("pl-osm-place", "OSM Place", [("osm", "sr:osm:node/5")], osm_only=True, licences=["ODBL_1"])
        estate = _candidate(
            "pl-osm-estate",
            "Named Estate",
            [("osm", "sr:osm:way/6")],
            candidate_type="estate/residential_development_candidate",
            osm_only=True,
            licences=["ODBL_1"],
        )
        result = evaluate_catalogue(_inputs([place, estate], [place_record, estate_record]))
        rows = {row["candidate_location_id"]: row for row in result["simulations"]}
        self.assertEqual(PROVISIONAL_ATTRIBUTES, rows["pl-osm-place"]["promotion_class"])
        self.assertEqual(CANDIDATE_ONLY, rows["pl-osm-estate"]["promotion_class"])
        self.assertTrue(rows["pl-osm-place"]["odbl_evidence_present"])

    def test_generic_osm_residential_object_is_rejected(self) -> None:
        record = _record("sr:osm:way/7", "osm", "Home", landuse="residential", licence="ODBL_1")
        candidate = _candidate(
            "pl-home",
            "Home",
            [("osm", "sr:osm:way/7")],
            candidate_type="estate/residential_development_candidate",
            osm_only=True,
            licences=["ODBL_1"],
        )
        result = evaluate_catalogue(_inputs([candidate], [record]))
        self.assertEqual(REJECTED, result["simulations"][0]["promotion_class"])

    def test_osm_node_area_representation_is_not_founder_review(self) -> None:
        node_record = _record(
            "sr:osm:node/11",
            "osm",
            "Mapped Place",
            place="suburb",
            element_type="node",
            latitude=-26.1,
            longitude=28.1,
            licence="ODBL_1",
        )
        area_record = _record(
            "sr:osm:way/12",
            "osm",
            "Mapped Place",
            landuse="residential",
            element_type="way",
            latitude=-26.1002,
            longitude=28.1002,
            licence="ODBL_1",
        )
        node = _candidate(
            "pl-node",
            "Mapped Place",
            [("osm", "sr:osm:node/11")],
            candidate_type="suburb",
            osm_only=True,
            latitude=-26.1,
            longitude=28.1,
            licences=["ODBL_1"],
        )
        area = _candidate(
            "pl-area",
            "Mapped Place",
            [("osm", "sr:osm:way/12")],
            candidate_type="estate/residential_development_candidate",
            osm_only=True,
            latitude=-26.1002,
            longitude=28.1002,
            licences=["ODBL_1"],
        )
        result = evaluate_catalogue(_inputs([node, area], [node_record, area_record]))
        rows = {row["candidate_location_id"]: row for row in result["simulations"]}
        self.assertEqual(PROVISIONAL_ATTRIBUTES, rows["pl-node"]["promotion_class"])
        self.assertEqual(REJECTED, rows["pl-area"]["promotion_class"])
        self.assertEqual("primary", rows["pl-node"]["source_representation"]["role"])
        self.assertEqual("secondary", rows["pl-area"]["source_representation"]["role"])
        self.assertEqual("pl-node", rows["pl-area"]["source_representation"]["representative_candidate_id"])
        self.assertEqual([], result["founder_review"])

    def test_same_name_osm_nodes_remain_candidate_only(self) -> None:
        records = [
            _record("sr:osm:node/13", "osm", "Twin Place", place="suburb", latitude=-26.1, longitude=28.1, licence="ODBL_1"),
            _record("sr:osm:node/14", "osm", "Twin Place", place="suburb", latitude=-26.1002, longitude=28.1002, licence="ODBL_1"),
        ]
        candidates = [
            _candidate("pl-twin-a", "Twin Place", [("osm", "sr:osm:node/13")], osm_only=True, licences=["ODBL_1"]),
            _candidate("pl-twin-b", "Twin Place", [("osm", "sr:osm:node/14")], osm_only=True, licences=["ODBL_1"], latitude=-26.1002, longitude=28.1002),
        ]
        result = evaluate_catalogue(_inputs(candidates, records))
        rows = {row["candidate_location_id"]: row for row in result["simulations"]}
        self.assertEqual(CANDIDATE_ONLY, rows["pl-twin-a"]["promotion_class"])
        self.assertEqual(CANDIDATE_ONLY, rows["pl-twin-b"]["promotion_class"])
        self.assertTrue(all(not row["human_review_required"] for row in rows.values()))
        self.assertTrue(all(row["duplicate_evidence"]["identity_collision"] for row in rows.values()))

    def test_estate_type_guard_preserves_place_and_rejects_farm_as_estate(self) -> None:
        place_record = _record(
            "sr:osm:way/15",
            "osm",
            "Ordinary Place",
            place="suburb",
            landuse="residential",
            element_type="way",
            licence="ODBL_1",
        )
        farm_record = _record(
            "sr:geonames:16",
            "geonames",
            "Farm Name",
            feature_class="S",
            feature_code="FRM",
        )
        farm_osm_record = _record(
            "sr:osm:way/16",
            "osm",
            "Farm Name",
            landuse="residential",
            element_type="way",
            licence="ODBL_1",
        )
        place = _candidate(
            "pl-ordinary-place",
            "Ordinary Place",
            [("osm", "sr:osm:way/15")],
            candidate_type="estate/residential_development_candidate",
            osm_only=True,
            licences=["ODBL_1"],
        )
        farm = _candidate(
            "pl-farm-estate",
            "Farm Name",
            [("geonames", "sr:geonames:16"), ("osm", "sr:osm:way/16")],
            candidate_type="estate/residential_development_candidate",
            licences=["CC_BY_4", "ODBL_1"],
        )
        result = evaluate_catalogue(_inputs([place, farm], [place_record, farm_record, farm_osm_record]))
        rows = {row["candidate_location_id"]: row for row in result["simulations"]}
        self.assertEqual("suburb", rows["pl-ordinary-place"]["assessed_candidate_type"])
        self.assertEqual(PROVISIONAL_ATTRIBUTES, rows["pl-ordinary-place"]["promotion_class"])
        self.assertEqual("other", rows["pl-farm-estate"]["assessed_candidate_type"])
        self.assertEqual(CANDIDATE_ONLY, rows["pl-farm-estate"]["promotion_class"])
        self.assertNotEqual("estate/residential_development_candidate", rows["pl-farm-estate"]["assessed_candidate_type"])

    def test_fuzzy_proposal_and_weak_boundary_do_not_promote(self) -> None:
        record = _record("sr:geonames:8", "geonames", "Boundary Place")
        candidate = _candidate(
            "pl-boundary",
            "Boundary Place",
            [("geonames", "sr:geonames:8")],
            conflicts=["inside_admin_code_conflict"],
        )
        matches = [
            {
                "candidate_location_id": "pl-boundary",
                "match_method": "fuzzy_string_similarity",
                "match_status": "proposed",
                "conflict_reason": ["heuristic proposal intentionally not merged"],
            },
            {
                "candidate_location_id": "pl-boundary",
                "match_method": "candidate_seed",
                "match_status": "single_source",
                "conflict_reason": [],
            },
        ]
        result = evaluate_catalogue(_inputs([candidate], [record], matches))
        row = result["simulations"][0]
        self.assertEqual(PROVISIONAL_ATTRIBUTES, row["promotion_class"])
        self.assertFalse(row["identity_evidence"]["direct_cross_identifier"])
        self.assertEqual("needs_source_verification", row["administrative_assignment_confidence"])
        self.assertEqual(1, row["identity_evidence"]["fuzzy_proposals_withheld"])

    def test_required_weak_probe_enters_founder_review_set(self) -> None:
        record = _record("sr:geonames:9", "geonames", "Kyalami")
        candidate = _candidate(
            "pl-kyalami",
            "Kyalami",
            [("geonames", "sr:geonames:9")],
            candidate_type="neighbourhood",
            type_hints=["locality", "neighbourhood"],
        )
        result = evaluate_catalogue(_inputs([candidate], [record]))
        row = result["simulations"][0]
        self.assertEqual(CANDIDATE_ONLY, row["promotion_class"])
        self.assertTrue(row["human_review_required"])
        self.assertEqual(1, len(result["founder_review"]))
        self.assertIn("Kyalami", row["required_probe_names"])
        founder_review_set = result["summary"]["founder_review_set"]
        self.assertEqual(0, founder_review_set["formal_class_count"])
        self.assertEqual(1, founder_review_set["priority_probe_count"])
        self.assertIn("formal", founder_review_set["distinction"])

    def test_evaluation_is_reproducible_and_does_not_mutate_inputs(self) -> None:
        records = [_record("sr:geonames:10", "geonames", "Stable")]
        candidate = _candidate("pl-stable", "Stable", [("geonames", "sr:geonames:10")])
        original = copy.deepcopy((candidate, records))
        first = evaluate_catalogue(_inputs([candidate], records))
        second = evaluate_catalogue(_inputs([candidate], records))
        self.assertEqual(
            json.dumps(first["simulations"], sort_keys=True),
            json.dumps(second["simulations"], sort_keys=True),
        )
        self.assertEqual(original, (candidate, records))


if __name__ == "__main__":
    unittest.main()
