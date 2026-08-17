from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path


PACKAGE_ROOT = Path(__file__).resolve().parents[1]
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from gauteng_catalogue.common import candidate_id, normalize_lookup, sha256_file
from gauteng_catalogue.acquire import _query_for_qids
from gauteng_catalogue.extract import _qid
from gauteng_catalogue.geometry import GautengSpatialGate
from gauteng_catalogue.reconcile import reconcile_records


def synthetic_gate() -> GautengSpatialGate:
    return GautengSpatialGate(
        {
            "type": "Feature",
            "properties": {"shapeName": "Gauteng"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[27.0, -27.0], [29.5, -27.0], [29.5, -25.0], [27.0, -25.0], [27.0, -27.0]]],
            },
        }
    )


def record(
    source: str,
    native_id: str,
    name: str,
    latitude: float,
    longitude: float,
    *,
    hints: list[str],
    cross: dict | None = None,
    aliases: list[str] | None = None,
    licence: str | None = None,
) -> dict:
    return {
        "source_record_id": f"sr:{source}:{native_id}",
        "source": source,
        "source_native_id": native_id,
        "source_native_classification": {"native_type": hints},
        "exact_source_name": name,
        "normalized_lookup_form": normalize_lookup(name),
        "aliases_supplied_by_source": aliases or [],
        "historical_names_supplied_by_source": [],
        "latitude": latitude,
        "longitude": longitude,
        "geometry": None,
        "source_admin_context": {},
        "source_payload": {},
        "source_modification_date": None,
        "retrieved_at": "2026-08-14T00:00:00Z",
        "source_artifact_ids": [f"{source}:fixture"],
        "licence_class": licence or {"osm": "ODBL_1", "geonames": "CC_BY_4", "wikidata": "CC0"}.get(source, "CC_BY"),
        "attribution": "fixture",
        "cross_identifiers": cross or {},
        "proposed_type_hints": hints,
        "gauteng_spatial_gate": {"status": "inside", "catalogue_eligible": True},
        "catalogue_eligible": True,
    }


class CataloguePipelineTests(unittest.TestCase):
    def test_normalization_is_conservative_and_candidate_id_is_property_listify_owned(self) -> None:
        self.assertEqual(normalize_lookup("Kyalami / Khayalami"), "kyalami khayalami")
        key = "sandton|suburb|-26.1076|28.0567|"
        self.assertEqual(candidate_id(key), candidate_id(key))
        self.assertTrue(candidate_id(key).startswith("pl-gp-v01-"))
        self.assertNotIn("geonames", candidate_id(key))
        self.assertNotIn("Q", candidate_id(key))

    def test_spatial_gate_includes_inside_points_and_rejects_outside(self) -> None:
        gate = synthetic_gate()
        self.assertEqual(gate.point_status(-26.2, 28.0), "inside")
        self.assertEqual(gate.point_status(-24.9, 28.0), "outside")
        self.assertEqual(gate.point_status(None, 28.0), "missing_coordinate")

    def test_direct_cross_identifier_is_stronger_than_name_similarity(self) -> None:
        records = [
            record("geonames", "100", "Sandton", -26.1076, 28.0567, hints=["locality"], cross={"geonames": ["100"]}),
            record("osm", "node/200", "Sandton", -26.108, 28.057, hints=["suburb"], cross={"wikidata": ["Q200"]}),
            record("wikidata", "Q200", "Sandton", -26.1081, 28.0571, hints=["suburb"], cross={"wikidata": ["Q200"], "geonames": ["100"]}),
        ]
        result = reconcile_records(records, synthetic_gate())
        self.assertEqual(result["summary"]["candidates"], 1)
        self.assertEqual(result["summary"]["multi_source_candidates"], 1)
        self.assertTrue(any(edge["match_method"] == "direct_cross_identifier" for edge in result["candidates"][0]["reconciliation_edges"]))
        self.assertEqual(result["candidates"][0]["licence_classes"], ["CC0", "CC_BY_4", "ODBL_1"])

    def test_duplicate_names_are_not_collapsed_and_fuzzy_matches_are_proposed(self) -> None:
        records = [
            record("geonames", "1", "Springfield", -26.2, 28.0, hints=["locality"]),
            record("osm", "node/2", "Springfield", -25.2, 29.0, hints=["suburb"]),
            record("geonames", "3", "Rosebank", -26.14, 28.04, hints=["locality"]),
            record("osm", "node/4", "Rosebanx", -26.141, 28.041, hints=["suburb"]),
        ]
        result = reconcile_records(records, synthetic_gate())
        self.assertEqual(result["summary"]["candidates"], 4)
        self.assertGreaterEqual(len(result["conflicts"]["duplicate_normalized_names"]), 1)
        self.assertGreaterEqual(result["summary"]["proposed_fuzzy_matches"], 1)
        self.assertFalse(any(edge["match_method"] == "fuzzy_string_similarity" for candidate in result["candidates"] for edge in candidate["reconciliation_edges"]))
        self.assertTrue(any(match["match_status"] == "proposed" for match in result["matches"]))

    def test_osm_only_candidates_are_explicit_and_aliases_are_preserved(self) -> None:
        result = reconcile_records(
            [
                record(
                    "osm",
                    "way/8",
                    "Kyalami",
                    -26.05,
                    28.08,
                    hints=["estate/residential_development_candidate"],
                    aliases=["Khayalami"],
                )
            ],
            synthetic_gate(),
        )
        candidate = result["candidates"][0]
        self.assertTrue(candidate["osm_only"])
        self.assertIn("ODBL_1", candidate["licence_classes"])
        self.assertIn("Khayalami", candidate["aliases"])
        self.assertEqual(candidate["candidate_type"], "estate/residential_development_candidate")

    def test_source_type_disagreement_remains_reviewable(self) -> None:
        result = reconcile_records(
            [
                record("geonames", "20", "Rosebank", -26.145, 28.035, hints=["locality"]),
                record("osm", "node/21", "Rosebank", -26.1452, 28.0352, hints=["suburb"]),
            ],
            synthetic_gate(),
        )
        self.assertEqual(result["summary"]["candidates"], 1)
        candidate = result["candidates"][0]
        self.assertEqual(candidate["candidate_type_status"], "source_disagreement")
        self.assertIn("source_type_disagreement", candidate["review_reasons"])
        self.assertTrue(result["conflicts"]["source_type_disagreements"])

    def test_candidate_id_does_not_depend_on_external_native_id(self) -> None:
        first = reconcile_records(
            [record("geonames", "external-1", "Alberton", -26.267, 28.12, hints=["town"])],
            synthetic_gate(),
        )["candidates"][0]["candidate_location_id"]
        second = reconcile_records(
            [record("geonames", "external-999", "Alberton", -26.267, 28.12, hints=["town"])],
            synthetic_gate(),
        )["candidates"][0]["candidate_location_id"]
        self.assertEqual(first, second)

    def test_checksum_is_available_for_manifest_generation(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "artifact.txt"
            path.write_text("immutable source artifact\n", encoding="utf-8")
            self.assertEqual(len(sha256_file(path)), 64)

    def test_wikidata_numeric_entity_urls_normalize_to_qids(self) -> None:
        self.assertEqual(_qid("http://www.wikidata.org/entity/21069446"), "Q21069446")
        self.assertEqual(_qid("https://www.wikidata.org/entity/Q34647"), "Q34647")

    def test_wikidata_query_keeps_q_prefix_in_entity_values(self) -> None:
        self.assertIn("wd:Q34647", _query_for_qids(["34647"]))


if __name__ == "__main__":
    unittest.main()
