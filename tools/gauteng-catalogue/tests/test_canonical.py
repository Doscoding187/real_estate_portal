from __future__ import annotations

import copy
import sys
import unittest
from pathlib import Path


PACKAGE_ROOT = Path(__file__).resolve().parents[1]
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from gauteng_catalogue.canonical import build_canonical_dataset
from gauteng_catalogue.promotion import (
    AUTO_PROMOTABLE,
    CANDIDATE_ONLY,
    PROVISIONAL_ATTRIBUTES,
    REJECTED,
)


def _source_record(
    source_record_id: str,
    source: str,
    name: str,
    *,
    native_id: str | None = None,
    latitude: float = -26.1,
    longitude: float = 28.1,
    licence: str = "CC_BY_4",
    tags: dict | None = None,
    element_type: str = "node",
    place: str | None = "suburb",
) -> dict:
    return {
        "source_record_id": source_record_id,
        "source": source,
        "source_native_id": native_id or source_record_id,
        "source_native_stable_id": native_id or source_record_id,
        "exact_source_name": name,
        "aliases_supplied_by_source": [],
        "historical_names_supplied_by_source": [],
        "latitude": latitude,
        "longitude": longitude,
        "geometry": None,
        "source_native_classification": {
            "element_type": element_type if source == "osm" else None,
            "place": place if source == "osm" else None,
        },
        "source_payload": {"tags": tags or {"name": name}},
        "source_artifact_ids": [f"{source}:fixture"],
        "source_modification_date": "2026-01-01",
        "retrieved_at": "2026-01-02T00:00:00Z",
        "licence_class": licence,
        "attribution": "fixture attribution",
    }


def _candidate(
    candidate_id: str,
    name: str,
    source_records: list[dict],
    *,
    candidate_type: str = "suburb",
    aliases: list[str] | None = None,
    historical_names: list[str] | None = None,
    latitude: float = -26.1,
    longitude: float = 28.1,
) -> dict:
    source_ids = [
        {
            "source_record_id": record["source_record_id"],
            "source": record["source"],
            "source_native_id": record["source_native_id"],
        }
        for record in source_records
    ]
    return {
        "candidate_location_id": candidate_id,
        "preferred_name": name,
        "normalized_name": name.casefold(),
        "candidate_type": candidate_type,
        "aliases": aliases or [],
        "historical_names": historical_names or [],
        "representative_latitude": latitude,
        "representative_longitude": longitude,
        "representative_geometry": None,
        "administrative_context": {
            "province": {"level": "ADM1", "name": "Gauteng", "source": "fixture"},
            "adm2": [{"level": "ADM2", "name": "Fixture Municipality"}],
        },
        "source_ids": source_ids,
        "source_assertions": [
            {
                "source_record_id": record["source_record_id"],
                "assertion_ids": [f"asrt:{record['source_record_id']}"],
            }
            for record in source_records
        ],
        "source_modification_dates": ["2026-01-01"],
        "first_seen": "2026-01-01T00:00:00Z",
        "last_verified_at": "2026-01-02T00:00:00Z",
    }


def _simulation(
    candidate: dict,
    source_records: list[dict],
    *,
    promotion_class: str = PROVISIONAL_ATTRIBUTES,
    type_confidence: str = "supported",
    unresolved_attributes: list[str] | None = None,
    source_representation: dict | None = None,
) -> dict:
    sources = sorted({record["source"] for record in source_records})
    licence_classes = sorted({record["licence_class"] for record in source_records})
    odbl = "ODBL_1" in licence_classes
    if odbl and len(licence_classes) == 1:
        licence_state = "ODBL_ONLY"
    elif odbl:
        licence_state = "MIXED_INCLUDES_ODBL"
    else:
        licence_state = "PERMISSIVE_OR_ATTRIBUTION_ONLY"
    return {
        "candidate_location_id": candidate["candidate_location_id"],
        "promotion_class": promotion_class,
        "preferred_name": candidate["preferred_name"],
        "normalized_name": candidate["normalized_name"],
        "candidate_type": candidate["candidate_type"],
        "assessed_candidate_type": candidate["candidate_type"],
        "representative_latitude": candidate["representative_latitude"],
        "representative_longitude": candidate["representative_longitude"],
        "administrative_context": candidate["administrative_context"],
        "aliases": candidate["aliases"],
        "historical_names": candidate["historical_names"],
        "attribute_confidence": {
            "identity": {"confidence": "high", "evidence_class": "exact_contextual"},
            "name": {"confidence": "high", "preferred_name": candidate["preferred_name"]},
            "type": {"confidence": type_confidence, "assessed_type": candidate["candidate_type"]},
            "spatial": {"confidence": "supported"},
        },
        "identity_evidence": {
            "class": "exact_contextual",
            "confidence": "high",
            "direct_cross_identifier": False,
            "exact_contextual": True,
        },
        "source_support": {
            "sources": sources,
            "source_count": len(sources),
            "source_native_types": [
                {
                    "source": record["source"],
                    "source_record_id": record["source_record_id"],
                    "source_native_id": record["source_native_id"],
                    "classification": record["source_native_classification"],
                }
                for record in source_records
            ],
        },
        "licence_classes": licence_classes,
        "licence_state": licence_state,
        "licence_gate": "fixture gate",
        "odbl_evidence_present": odbl,
        "osm_only": sources == ["osm"],
        "source_representation": source_representation or {"role": "none"},
        "administrative_assignment_confidence": "supported",
        "boundary_conflict": False,
        "unresolved_attributes": unresolved_attributes or [],
        "promotion_reasons": ["fixture evidence"],
        "type_assessment": "fixture",
    }


def _inputs(candidates: list[dict], source_records: list[dict], simulations: list[dict]) -> dict:
    source_ids = {record["source_record_id"] for record in source_records}
    assertions = [
        {
            "assertion_id": f"asrt:{source_record_id}",
            "source_record_id": source_record_id,
            "assertion_type": "name",
            "value": "fixture",
        }
        for source_record_id in sorted(source_ids)
    ]
    return {
        "candidate_root": Path("/tmp/fixture-candidate-root"),
        "promotion_output_root": Path("/tmp/fixture-promotion-root"),
        "candidates": candidates,
        "source_records": source_records,
        "assertions": assertions,
        "matches": [],
        "promotion_simulation": simulations,
    }


class CanonicalGeographyTests(unittest.TestCase):
    def test_accepted_ids_are_stable_and_nonaccepted_rows_do_not_leak(self) -> None:
        accepted_record = _source_record("sr:geonames:1", "geonames", "Accepted")
        candidate_record = _source_record("sr:geonames:2", "geonames", "Candidate")
        rejected_record = _source_record("sr:geonames:3", "geonames", "Rejected")
        accepted = _candidate("pl-accepted", "Accepted", [accepted_record])
        candidate_only = _candidate("pl-candidate", "Candidate", [candidate_record])
        rejected = _candidate("pl-rejected", "Rejected", [rejected_record])
        result = build_canonical_dataset(
            _inputs(
                [accepted, candidate_only, rejected],
                [accepted_record, candidate_record, rejected_record],
                [
                    _simulation(accepted, [accepted_record], promotion_class=AUTO_PROMOTABLE),
                    _simulation(candidate_only, [candidate_record], promotion_class=CANDIDATE_ONLY),
                    _simulation(rejected, [rejected_record], promotion_class=REJECTED),
                ],
            )
        )
        self.assertEqual(["pl-accepted"], [row["canonical_location_id"] for row in result["canonical_rows"]])
        self.assertEqual("pl-accepted", result["canonical_rows"][0]["candidate_layer_reference"]["candidate_location_id"])
        self.assertEqual(1, result["summary"]["candidate_layer"]["candidate_only"])
        self.assertEqual(1, result["summary"]["candidate_layer"]["rejected_non_independent"])

    def test_names_are_separate_assertions_and_attributes_can_be_provisional(self) -> None:
        record = _source_record(
            "sr:osm:node/1",
            "osm",
            "Beta",
            licence="ODBL_1",
            tags={
                "name": "Beta",
                "official_name": "Beta Official",
                "old_name": "Old Beta",
                "alt_name": ["Q123", "ZABNI", "https://example.test/beta", "Beta Alias"],
            },
        )
        candidate = _candidate(
            "pl-beta",
            "Beta",
            [record],
            aliases=["Beta Heights"],
            historical_names=["Beta Old"],
        )
        result = build_canonical_dataset(
            _inputs(
                [candidate],
                [record],
                [
                    _simulation(
                        candidate,
                        [record],
                        unresolved_attributes=["candidate_type", "administrative_assignment"],
                        type_confidence="provisional",
                    )
                ],
            )
        )
        names = result["name_rows"]
        self.assertGreaterEqual(len(names), 4)
        roles_by_name = {row["name"]: set(row["name_roles"]) for row in names}
        self.assertIn("preferred_common", roles_by_name["Beta"])
        self.assertIn("official", roles_by_name["Beta Official"])
        self.assertIn("alias", roles_by_name["Beta Heights"])
        self.assertIn("historical", roles_by_name["Old Beta"])
        searchable = {row["name"]: row["searchable"] for row in names}
        self.assertTrue(searchable["Beta Alias"])
        self.assertFalse(searchable["Q123"])
        self.assertFalse(searchable["ZABNI"])
        self.assertFalse(searchable["https://example.test/beta"])
        self.assertEqual("provisional", result["canonical_rows"][0]["type_state"])
        self.assertIn("candidate_type", result["canonical_rows"][0]["unresolved_attributes"])
        self.assertIn("administrative_assignment", result["canonical_rows"][0]["unresolved_attributes"])
        self.assertEqual("osm_only_odbl_provisional", result["canonical_rows"][0]["licensing_classification"])

    def test_duplicate_names_and_source_representation_are_safe(self) -> None:
        first_record = _source_record("sr:geonames:10", "geonames", "Springfield", latitude=-26.1, longitude=28.1)
        second_record = _source_record("sr:geonames:11", "geonames", "Springfield", latitude=-26.5, longitude=27.5)
        node = _source_record(
            "sr:osm:node/12",
            "osm",
            "Mapped Place",
            native_id="node/12",
            tags={"name": "Mapped Place", "place": "suburb"},
            place="suburb",
        )
        area = _source_record(
            "sr:osm:way/13",
            "osm",
            "Mapped Place",
            native_id="way/13",
            tags={"name": "Mapped Place", "landuse": "residential"},
            element_type="way",
            place=None,
        )
        first = _candidate("pl-springfield-a", "Springfield", [first_record], latitude=-26.1, longitude=28.1)
        second = _candidate("pl-springfield-b", "Springfield", [second_record], latitude=-26.5, longitude=27.5)
        represented = _candidate("pl-mapped-place", "Mapped Place", [node, area])
        secondary = _candidate("pl-mapped-secondary", "Mapped Place", [area])
        result = build_canonical_dataset(
            _inputs(
                [first, second, represented, secondary],
                [first_record, second_record, node, area],
                [
                    _simulation(first, [first_record]),
                    _simulation(second, [second_record]),
                    _simulation(represented, [node, area], promotion_class=AUTO_PROMOTABLE),
                    _simulation(
                        secondary,
                        [area],
                        promotion_class=CANDIDATE_ONLY,
                        source_representation={"role": "secondary", "representative_candidate_id": "pl-mapped-place"},
                    ),
                ],
            )
        )
        canonical = result["canonical_rows"]
        same_name = [row for row in canonical if row["normalized_name"] == "springfield"]
        self.assertEqual({"pl-springfield-a", "pl-springfield-b"}, {row["canonical_location_id"] for row in same_name})
        self.assertIn("pl-mapped-place", {row["canonical_location_id"] for row in canonical})
        self.assertNotIn("pl-mapped-secondary", {row["canonical_location_id"] for row in canonical})
        self.assertEqual(2, result["summary"]["duplicate_safety"]["canonical_records_in_duplicate_name_groups"])
        self.assertEqual(1, result["summary"]["duplicate_safety"]["source_representation_secondary_rows_not_canonical"])

    def test_probe_interpretations_keep_strong_sandton_and_mamelodi_only(self) -> None:
        sandton_record = _source_record("sr:osm:sandton", "osm", "Sandton", licence="ODBL_1", place="suburb")
        weak_sandton_record = _source_record("sr:nga:sandton", "nga_gns", "Sandton", licence="NO_RESTRICTION_GNS")
        mamelodi_record = _source_record("sr:geonames:mamelodi", "geonames", "Mamelodi", place=None)
        weak_mamelodi_record = _source_record(
            "sr:osm:mamelodi-residential",
            "osm",
            "Mamelodi",
            licence="ODBL_1",
            tags={"name": "Mamelodi", "landuse": "residential"},
            element_type="way",
            place=None,
        )
        sandton = _candidate("pl-sandton", "Sandton", [sandton_record])
        weak_sandton = _candidate("pl-sandton-weak", "Sandton", [weak_sandton_record])
        mamelodi = _candidate("pl-mamelodi", "Mamelodi", [mamelodi_record], candidate_type="town")
        weak_mamelodi = _candidate("pl-mamelodi-weak", "Mamelodi", [weak_mamelodi_record], candidate_type="estate/residential_development_candidate")
        result = build_canonical_dataset(
            _inputs(
                [sandton, weak_sandton, mamelodi, weak_mamelodi],
                [sandton_record, weak_sandton_record, mamelodi_record, weak_mamelodi_record],
                [
                    _simulation(sandton, [sandton_record], promotion_class=AUTO_PROMOTABLE),
                    _simulation(weak_sandton, [weak_sandton_record], promotion_class=CANDIDATE_ONLY),
                    _simulation(mamelodi, [mamelodi_record], promotion_class=PROVISIONAL_ATTRIBUTES),
                    _simulation(weak_mamelodi, [weak_mamelodi_record], promotion_class=CANDIDATE_ONLY),
                ],
            )
        )
        probes = {row["probe"]: row for row in result["summary"]["required_property_search_probes"]}
        self.assertEqual(["pl-sandton"], [row["canonical_location_id"] for row in probes["Sandton"]["canonical_interpretations"]])
        self.assertEqual(["pl-sandton-weak"], [row["candidate_location_id"] for row in probes["Sandton"]["extra_candidate_interpretations"]])
        self.assertEqual("Sandton", probes["Sandton"]["canonical_interpretations"][0]["name_assertions"][0]["name"])
        self.assertIsNotNone(probes["Sandton"]["extra_candidate_interpretations"][0]["representative_latitude"])
        self.assertEqual(["pl-mamelodi"], [row["canonical_location_id"] for row in probes["Mamelodi"]["canonical_interpretations"]])
        self.assertEqual(["pl-mamelodi-weak"], [row["candidate_location_id"] for row in probes["Mamelodi"]["extra_candidate_interpretations"]])
        self.assertIsNone(result["summary"]["kyalami_khayalami"]["canonical_location_id"])
        self.assertEqual("candidate_only_until_commercial_reuse_gate", result["summary"]["kyalami_khayalami"]["machine_canonical_decision"])

    def test_derivation_is_deterministic_and_does_not_mutate_inputs(self) -> None:
        record = _source_record("sr:geonames:deterministic", "geonames", "Deterministic")
        candidate = _candidate("pl-deterministic", "Deterministic", [record])
        inputs = _inputs([candidate], [record], [_simulation(candidate, [record])])
        before = copy.deepcopy(inputs)
        first = build_canonical_dataset(inputs)
        second = build_canonical_dataset(inputs)
        self.assertEqual(first, second)
        self.assertEqual(before, inputs)
        self.assertEqual("sr:geonames:deterministic", first["source_link_rows"][0]["source_record_id"])
        self.assertIn("asrt:sr:geonames:deterministic", first["source_link_rows"][0]["source_assertion_ids"])


if __name__ == "__main__":
    unittest.main()
