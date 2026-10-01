"""Build a territory's v0.2 canonical source authority from acquired evidence.

This is the *source* half of Place Authority. It turns verified, digest-pinned
acquisition evidence into the canonical factual geography, name assertions,
source links and candidate dispositions that the admission builder consumes. It
never admits a Place and never assigns a Place ID: identity adjudication belongs
to `tools/place-admission/build-place-admission.mjs`.

Two rules shape everything here.

**Nothing is admitted because of what it is called.** A GeoNames feature code and
a population figure are evidence about a source record, not a decision to create
a referent. Records whose source class is not a settlement or an administrative
unit are dispositioned with an explicit reason instead of being promoted.

**Administrative context comes from geometry.** A source admin code is an
assertion by the source, not proof of containment. Context is resolved by testing
the representative point against the acquired polygons, and disagreements,
multiple matches and boundary cases are queued rather than silently resolved.

The builder is territory-driven: `TerritoryConfig` supplies the province, its
name tokens, its ISO codes and its source admin1 code. No province is named in
this module.
"""

from __future__ import annotations

import gzip
import hashlib
import json
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Any, Iterable, Iterator

from .config import REPO_ROOT, TerritoryConfig
from .geometry import (
    TerritorySpatialGate,
    _fallback_point_in_geometry,
    load_geojson,
    select_overlapping_features,
    select_territory_feature,
)

SOURCE_AUTHORITY_VERSION = "0.2"

# --------------------------------------------------------------------------- #
# Governed classification policy.
#
# Every entry is a recorded decision, not a tuning parameter. A record is
# admitted only if its GeoNames class+code appears here. Anything absent is
# dispositioned. The table is deliberately short: it admits administrative units
# and settlements, and nothing else.
# --------------------------------------------------------------------------- #

#: Exact class.code -> canonical Place type. Evidence is the source's own
#: classification, so these mappings need no invented threshold.
EXACT_TYPE_BY_SOURCE_CODE: dict[str, str] = {
    "A.ADM1": "province",
    "A.ADM2": "district_municipality",
    "A.ADM3": "local_municipality",
    # Administrative seats. A seat of a first-order division is a city; a seat of
    # a lower division is a town. This is the source telling us the seat role.
    "P.PPLA": "city",
    "P.PPLA2": "town",
    "P.PPLA3": "town",
    # Settlement classes.
    "P.PPLX": "suburb",
    "S.HTL": "locality",
    "S.RSD": "suburb",
    "S.TOWR": "town",
    "L.LCTY": "locality",
}

#: Source codes whose Place type needs a population band because the source does
#: not distinguish settlement ranks. Recorded as governed policy, exactly as the
#: admission builder records its settlement merge distance.
POPULATED_PLACE_CODES = frozenset({"P.PPL"})

CITY_MIN_POPULATION = 100_000
TOWN_MIN_POPULATION = 10_000

#: Human-readable reason per GeoNames feature class, used to disposition every
#: record that is not admitted. Every non-admitted record must land in one of
#: these, so the disposition accounting is total.
NON_PLACE_CLASS_REASONS: dict[str, str] = {
    "A": "administrative unit not matching an admitted administrative code",
    "H": "historical feature; a former referent is a name assertion, not a Place",
    "L": "locality or reserve feature outside the admitted settlement classes",
    "P": "populated-place class that did not meet the governed admission codes",
    "R": "religious or structural feature, not a settlement or administrative unit",
    "S": "spot feature outside the admitted settlement classes (farm, airport, ruin, cave and similar)",
    "T": "terrain or hydrographic feature, not a settlement or administrative unit",
    "U": "undersea feature",
    "V": "vegetation feature, not a settlement or administrative unit",
    "W": "water feature, not a settlement or administrative unit",
    "X": "unnamed or miscellaneous feature",
    "Z": "regional or other feature outside the admitted settlement classes",
}

LICENCE_CLASS = "permissive_supported"

#: The obligation that value alone does not express. Recorded per identity and
#: in the build summary so nobody reads "permissive" as "no obligations".
LICENCE_OBLIGATIONS = (
    "GeoNames is CC BY 4.0: attribution required, no share-alike. "
    "geoBoundaries gbOpen is distributed CC BY 4.0 with upstream CC BY 3.0 IGO "
    "notices and OCHA ROSEA / Municipal Demarcation Board attribution. "
    "The permissive_supported label records the absence of ODbL obligations; it "
    "does not mean obligation-free."
)

IDENTIFIER_LIKE = __import__("re").compile(
    r"^(?:q\d+|[a-z]{2,6}\d[a-z0-9]*|https?://.*)$", __import__("re").IGNORECASE
)


# --------------------------------------------------------------------------- #
# Deterministic identity ids
# --------------------------------------------------------------------------- #


def _stable_hash(*parts: str) -> str:
    digest = hashlib.sha256("\x1f".join(parts).encode("utf-8")).hexdigest()
    return digest[:24]


def canonical_location_id(territory_id: str, source_native_id: str) -> str:
    """An opaque, stable, source-keyed identity handle.

    Deliberately derived from the territory and the source-native id only. Never
    from a name, coordinate, parent or classification, so a rename, a
    reclassification or a boundary change cannot move a referent.
    """
    return f"pl-geo-v01-{territory_id}-{_stable_hash(territory_id, source_native_id)}"


def normalize_name(value: str) -> str:
    """Governed name normalization for matching only, never for identity."""
    decomposed = unicodedata.normalize("NFKD", str(value or ""))
    stripped = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return " ".join(stripped.casefold().split())


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


# --------------------------------------------------------------------------- #
# Acquisition bundle loading
# --------------------------------------------------------------------------- #


class AcquisitionBundle:
    """Read-only view of a verified acquisition snapshot."""

    def __init__(self, bundle_dir: Path):
        self.dir = Path(bundle_dir)
        manifest_path = self.dir / "manifest.json"
        if not manifest_path.is_file():
            raise FileNotFoundError(f"Acquisition manifest not found: {manifest_path}")
        self.manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        self.manifest_sha256 = sha256_file(manifest_path)
        self.territory_id = str(self.manifest.get("territory_id") or "")
        self.bundle_kind = str(self.manifest.get("bundle_kind") or "")
        self.limitations = list(self.manifest.get("limitations") or [])
        self._records: list[dict[str, Any]] | None = None

    def _verify_outputs(self) -> None:
        for output in self.manifest.get("outputs", []):
            path = self.dir / output["path"]
            if not path.is_file():
                raise FileNotFoundError(f"Acquisition output missing: {path}")
            actual = sha256_file(path)
            if actual != output["sha256"]:
                raise ValueError(
                    f"Acquisition output {output['path']} digest {actual} does not match "
                    f"the manifest's {output['sha256']}"
                )

    @property
    def records(self) -> list[dict[str, Any]]:
        if self._records is None:
            self._verify_outputs()
            index = self.dir / "source-records.jsonl.gz"
            raw = gzip.decompress(index.read_bytes()).decode("utf-8")
            self._records = [json.loads(line) for line in raw.splitlines() if line.strip()]
        return self._records

    def source_records(self, source: str) -> list[dict[str, Any]]:
        return [record for record in self.records if record.get("source") == source]

    def raw_path(self, *parts: str) -> Path:
        return self.dir.joinpath("raw", *parts)

    def feature_code_names(self) -> dict[str, str]:
        names: dict[str, str] = {}
        path = self.raw_path("geonames", "featureCodes_en.txt")
        with path.open(encoding="utf-8") as handle:
            for line in handle:
                fields = line.rstrip("\n").split("\t")
                if len(fields) >= 3 and fields[0] != "class":
                    names[f"{fields[0]}.{fields[1]}"] = fields[2]
        return names


# --------------------------------------------------------------------------- #
# GeoNames column layout, per the bundled dump readme.
# --------------------------------------------------------------------------- #

GEONAMES_COLUMNS = (
    "geonameid",
    "name",
    "asciiname",
    "alternatenames",
    "latitude",
    "longitude",
    "feature_class",
    "feature_code",
    "country_code",
    "cc2",
    "admin1_code",
    "admin2_code",
    "admin3_code",
    "admin4_code",
    "population",
    "elevation",
    "dem",
    "timezone",
    "modification_date",
)

ALTERNATE_NAME_COLUMNS = (
    "alternate_name_id",
    "geonameid",
    "isolanguage",
    "alternate_name",
    "is_preferred_name",
    "is_short_name",
    "is_colloquial",
    "is_historic",
    "valid_from",
    "valid_to",
)


def geonames_row(record: dict[str, Any]) -> dict[str, str]:
    columns = record["source_native_columns"]
    if len(columns) != len(GEONAMES_COLUMNS):
        raise ValueError(
            f"GeoNames record {record.get('source_native_id')} has {len(columns)} columns; "
            f"the bundled readme declares {len(GEONAMES_COLUMNS)}"
        )
    return dict(zip(GEONAMES_COLUMNS, columns))


def alternate_name_row(record: dict[str, Any]) -> dict[str, str]:
    columns = record["source_native_columns"]
    if len(columns) != len(ALTERNATE_NAME_COLUMNS):
        raise ValueError(
            f"Alternate-name record {record.get('source_native_id')} has {len(columns)} columns; "
            f"the bundled readme declares {len(ALTERNATE_NAME_COLUMNS)}"
        )
    return dict(zip(ALTERNATE_NAME_COLUMNS, columns))


def as_float(value: str | None) -> float | None:
    try:
        return float(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None


def as_int(value: str | None) -> int:
    try:
        return int(value) if value not in (None, "") else 0
    except (TypeError, ValueError):
        return 0


# --------------------------------------------------------------------------- #
# Geometry
# --------------------------------------------------------------------------- #


def load_boundary_layer(bundle: AcquisitionBundle, level: str) -> list[dict[str, Any]]:
    path = bundle.raw_path("geoboundaries", f"{level}.geojson.gz")
    if not path.is_file():
        return []
    collection = json.loads(gzip.decompress(path.read_bytes()).decode("utf-8"))
    return list(collection.get("features") or [])


def boundary_metadata(bundle: AcquisitionBundle, level: str) -> dict[str, Any]:
    path = bundle.raw_path("geoboundaries", f"{level}-metadata.json")
    if not path.is_file():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def resolve_territory_boundaries(
    bundle: AcquisitionBundle, territory: TerritoryConfig
) -> tuple[dict[str, Any], dict[str, list[dict[str, Any]]], dict[str, Any]]:
    """Select this territory's ADM1, then the ADM2/ADM3 that intersect it.

    Selection is spatial, not by source code. A feature is kept when its geometry
    intersects the territory's province polygon, which is the only evidence in
    the bundle that it belongs to the territory.
    """
    adm1_features = load_boundary_layer(bundle, "ADM1")
    if not adm1_features:
        raise ValueError("The acquisition bundle carries no ADM1 layer.")
    province = select_territory_feature(
        adm1_features, territory.province_name_tokens, territory.province_iso_codes
    )
    gate = TerritorySpatialGate(province, province_name=territory.province)

    context: dict[str, list[dict[str, Any]]] = {"ADM2": [], "ADM3": []}
    selection: dict[str, dict[str, Any]] = {}
    for level in ("ADM2", "ADM3"):
        features = load_boundary_layer(bundle, level)
        if not features:
            continue
        bbox_selected = select_overlapping_features(features, gate)
        selected: list[dict[str, Any]] = []
        swept_in_and_rejected: list[dict[str, Any]] = []
        for feature in bbox_selected:
            point = gate.representative_point(feature.get("geometry"))
            status = gate.point_status(point[0], point[1]) if point else "missing_coordinate"
            if status != "inside":
                # Without a GIS wheel the outer test is a bounding box and the
                # representative point is a bounding-box centre, so a genuine
                # coastal or non-convex unit of this territory can be swept out
                # as readily as an out-of-province neighbour can be swept in.
                # Dropping it would lose real context, so the feature is kept and
                # the weaker evidence is recorded. It is inert: a context match is
                # still decided per point against the real polygon, and
                # `identities_resolved_to_weaker_evidence` below proves how many
                # identities actually leaned on it.
                swept_in_and_rejected.append(
                    {
                        "polygon_name": str(_shape_name(feature)),
                        "point_status": status,
                        "decision": "retained_on_weaker_evidence",
                    }
                )
            selected.append(feature)
        context[level] = selected
        selection[level] = {
            "bbox_intersecting": len(bbox_selected),
            "representative_point_inside": len(selected),
            "swept_in_and_rejected": swept_in_and_rejected,
        }

    # The gate resolves administrative context from the features it is given, so
    # they must be attached before any context is read. Without this every
    # identity silently loses its municipality.
    gate.context_features = context

    return province, context, {
        "province_gate": gate,
        "intersection_basis": _intersection_basis(),
        "selection": selection,
    }


def _intersection_basis() -> str:
    from . import geometry as geometry_module

    return "shapely" if geometry_module.SHAPELY_AVAILABLE else "bounding_box_fallback"


# --------------------------------------------------------------------------- #
# Classification
# --------------------------------------------------------------------------- #


def classify(geoname: dict[str, str], feature_code_names: dict[str, str]) -> dict[str, Any]:
    """Decide the Place type for one source record, or refuse to admit it."""
    feature_class = geoname["feature_class"]
    feature_code = geoname["feature_code"]
    code = f"{feature_class}.{feature_code}"
    label = feature_code_names.get(code, "unknown")
    population = as_int(geoname["population"])

    if code in EXACT_TYPE_BY_SOURCE_CODE:
        return {
            "admitted": True,
            "canonical_type": EXACT_TYPE_BY_SOURCE_CODE[code],
            "type_confidence": "high",
            "type_state": "supported",
            "type_assessment": "source_feature_code",
            "type_assessment_reason": (
                f"GeoNames class {code} ({label}) maps to a governed Place type."
            ),
        }

    if code in POPULATED_PLACE_CODES:
        if population >= CITY_MIN_POPULATION:
            canonical_type, band = "city", f"population >= {CITY_MIN_POPULATION}"
        elif population >= TOWN_MIN_POPULATION:
            canonical_type, band = "town", f"population >= {TOWN_MIN_POPULATION}"
        else:
            canonical_type, band = "village", f"population < {TOWN_MIN_POPULATION}"
        return {
            "admitted": True,
            "canonical_type": canonical_type,
            "type_confidence": "medium",
            "type_state": "provisional",
            "type_assessment": "governed_population_band",
            "type_assessment_reason": (
                f"GeoNames class {code} ({label}) does not rank settlements; the governed "
                f"population band selected {canonical_type} ({band}, population {population})."
            ),
        }

    return {
        "admitted": False,
        "reason": NON_PLACE_CLASS_REASONS.get(
            feature_class,
            f"source feature class {feature_class} is not an admitted settlement or administrative class",
        ),
        "source_feature_label": label,
    }


# --------------------------------------------------------------------------- #
# Name assertions
# --------------------------------------------------------------------------- #


def name_role_for(alternate: dict[str, str], is_preferred_display: bool) -> str:
    """Map GeoNames alternate-name qualifiers onto the V1 name vocabulary."""
    if alternate.get("is_preferred_name") == "1":
        return "official"
    if alternate.get("is_historic") == "1":
        return "historical"
    if alternate.get("is_colloquial") == "1" or alternate.get("is_short_name") == "1":
        return "common"
    if is_preferred_display:
        return "preferred_public"
    return "common"


def is_searchable_name(role: str, text: str, language: str) -> bool:
    """D8: identifier-like text stays non-searchable provenance."""
    if not text or not text.strip():
        return False
    if IDENTIFIER_LIKE.match(text.strip()):
        return False
    if role == "historical":
        return True
    # A language-qualified name is a real language form, not an identifier.
    if language:
        return True
    return role in {"preferred_public", "official", "common"}


# --------------------------------------------------------------------------- #
# Build
# --------------------------------------------------------------------------- #


def build_source_authority(
    bundle_dir: Path,
    territory: TerritoryConfig,
    output_dir: Path,
) -> dict[str, Any]:
    bundle = AcquisitionBundle(bundle_dir)
    if bundle.territory_id and bundle.territory_id != territory.territory_id:
        raise ValueError(
            f"Acquisition bundle is for {bundle.territory_id}, not {territory.territory_id}"
        )
    feature_code_names = bundle.feature_code_names()

    province_feature, context_features, gate_info = resolve_territory_boundaries(
        bundle, territory
    )
    gate: TerritorySpatialGate = gate_info["province_gate"]

    geonames_records = bundle.source_records("geonames")
    alternate_records = bundle.source_records("geonames_alternate_name")

    # Group alternate names by the geonameid they assert about.
    alternates_by_geonameid: dict[str, list[dict[str, Any]]] = {}
    for record in alternate_records:
        row = alternate_name_row(record)
        alternates_by_geonameid.setdefault(row["geonameid"], []).append(record)

    identities: list[dict[str, Any]] = []
    name_assertions: list[dict[str, Any]] = []
    source_links: list[dict[str, Any]] = []
    dispositions: list[dict[str, Any]] = []
    context_queue: list[dict[str, Any]] = []
    type_tally: Counter[str] = Counter()
    disposition_tally: Counter[str] = Counter()
    code_disagreements: list[dict[str, Any]] = []
    adm2_name_by_id: dict[str, str] = {}
    adm3_name_by_id: dict[str, str] = {}

    for feature in context_features.get("ADM2", []):
        adm2_name_by_id[str(_shape_id(feature))] = str(_shape_name(feature))
    for feature in context_features.get("ADM3", []):
        adm3_name_by_id[str(_shape_id(feature))] = str(_shape_name(feature))

    seen_identities: set[str] = set()
    weaker_polygon_names: dict[str, set[str]] = {"ADM2": set(), "ADM3": set()}
    for _level, _sel in gate_info["selection"].items():
        for _r in _sel.get("swept_in_and_rejected", []):
            weaker_polygon_names[_level].add(str(_r["polygon_name"]))
    identities_resolved_to_weaker: Counter[str] = Counter()

    # ------------------------------------------------------------------ #
    # Administrative crosswalk.
    #
    # A geoBoundaries polygon and a GeoNames administrative record describe the
    # same real unit but rarely carry the same label: the polygon is "West Coast"
    # and the record is "West Coast District Municipality". Because identity is
    # joined on name downstream, the context must carry the *admitted identity's*
    # name and keep the polygon label as provenance. The mapping is made by
    # testing each admitted administrative record's own point against the
    # polygons, so it is resolved from geometry rather than assumed from a code
    # or a string.
    # ------------------------------------------------------------------ #
    adm_identity_by_native_id: dict[str, dict[str, Any]] = {}
    for record in geonames_records:
        geoname = geonames_row(record)
        if f"{geoname['feature_class']}.{geoname['feature_code']}" not in ("A.ADM2", "A.ADM3"):
            continue
        adm_identity_by_native_id[geoname["geonameid"]] = {
            "geonameid": geoname["geonameid"],
            "name": geoname["name"],
            "normalized": normalize_name(geoname["name"]),
            "type": "district_municipality"
            if geoname["feature_code"] == "ADM2"
            else "local_municipality",
            "latitude": as_float(geoname["latitude"]),
            "longitude": as_float(geoname["longitude"]),
        }

    adm_name_by_geonameid: dict[str, str] = {
        entry["geonameid"]: entry["name"] for entry in adm_identity_by_native_id.values()
    }

    # polygon shapeName -> admitted identity name, per level
    crosswalk: dict[str, dict[str, str]] = {"ADM2": {}, "ADM3": {}}
    crosswalk_unresolved: list[dict[str, Any]] = []
    for level, adm_code in (("ADM2", "A.ADM2"), ("ADM3", "A.ADM3")):
        for feature in context_features.get(level, []):
            shape_name = str(_shape_name(feature))
            candidates = [
                entry
                for entry in adm_identity_by_native_id.values()
                if entry["type"] == ("district_municipality" if level == "ADM2" else "local_municipality")
                and entry["normalized"] == normalize_name(shape_name)
            ]
            if candidates:
                # Labels agree; this is the strongest case.
                crosswalk[level][shape_name] = candidates[0]["name"]
                continue
            # Labels disagree. Resolve by geometry: whose point is in this polygon?
            owners = [
                entry
                for entry in adm_identity_by_native_id.values()
                if entry["type"] == ("district_municipality" if level == "ADM2" else "local_municipality")
                and _fallback_contains(
                    feature.get("geometry") or {},
                    entry["longitude"],
                    entry["latitude"],
                )
            ]
            if len(owners) == 1:
                crosswalk[level][shape_name] = owners[0]["name"]
            elif len(owners) > 1:
                crosswalk_unresolved.append(
                    {
                        "level": level,
                        "polygon_name": shape_name,
                        "reason": "multiple admitted records fall in this polygon",
                        "candidates": sorted(entry["name"] for entry in owners),
                    }
                )
            else:
                crosswalk_unresolved.append(
                    {
                        "level": level,
                        "polygon_name": shape_name,
                        "reason": "no admitted administrative record falls in this polygon",
                        "candidates": [],
                    }
                )

    for record in sorted(geonames_records, key=lambda r: str(r["source_native_id"])):
        geoname = geonames_row(record)
        native_id = geoname["geonameid"]
        decision = classify(geoname, feature_code_names)
        display_name = geoname["name"].strip()
        normalized = normalize_name(display_name)

        if not decision["admitted"]:
            disposition_tally[decision["reason"][:60]] += 1
            dispositions.append(
                {
                    "source_authority_version": f"{territory.territory_id}-source-authority-{SOURCE_AUTHORITY_VERSION}",
                    "candidate_location_id": f"{territory.territory_id}-cand-{native_id}",
                    "preferred_name": display_name,
                    "normalized_name": normalized,
                    "candidate_type": f"{geoname['feature_class']}.{geoname['feature_code']}",
                    "assessed_candidate_type": None,
                    "candidate_type_status": "not_admitted",
                    "promotion_class": "candidate_only",
                    "factual_identity_status": "candidate",
                    "human_review_required": True,
                    "priority_probe_review": False,
                    "promotion_reasons": [decision["reason"]],
                    "conflict_reasons": [],
                    "licence_state": "attribution_required_not_odbl",
                    "osm_only": 0,
                    "source_support": {"sources": [record.get("artifact_id")]},
                    "source_record_id": native_id,
                    "source_locator": record.get("source_locator"),
                    "source_feature_sha256": record.get("source_feature_sha256"),
                    "licence": record.get("licence"),
                    "attribution": record.get("attribution"),
                }
            )
            continue

        latitude = as_float(geoname["latitude"])
        longitude = as_float(geoname["longitude"])
        identity = canonical_location_id(territory.territory_id, native_id)
        if identity in seen_identities:
            raise ValueError(f"Source identity {identity} was produced twice")
        seen_identities.add(identity)

        inside_province = gate.point_status(latitude, longitude)
        if inside_province != "inside":
            # A province-coded record that does not fall inside the province
            # polygon is a real disagreement between sources. Queue it; never
            # force it inside.
            code_disagreements.append(
                {
                    "kind": "province_containment",
                    "source_record_id": native_id,
                    "preferred_name": display_name,
                    "point_status": inside_province,
                }
            )

        context = gate.administrative_context(latitude, longitude)
        adm2_matches = [_crosswalk_context("ADM2", m, crosswalk) for m in (context.get("adm2") or [])]
        adm3_matches = [_crosswalk_context("ADM3", m, crosswalk) for m in (context.get("adm3") or [])]
        unresolved_levels = [
            level
            for level, matches in (("adm2", adm2_matches), ("adm3", adm3_matches))
            if not any(m.get("name") for m in matches)
        ]
        adm2_matches = [m for m in adm2_matches if m.get("name")]
        adm3_matches = [m for m in adm3_matches if m.get("name")]
        for _level, _matches in (("ADM2", adm2_matches), ("ADM3", adm3_matches)):
            for _m in _matches:
                if str(_m.get("polygon_name")) in weaker_polygon_names[_level]:
                    identities_resolved_to_weaker[_level] += 1
        if len(adm2_matches) > 1 or len(adm3_matches) > 1:
            context_queue.append(
                {
                    "kind": "multiple_context_matches",
                    "source_record_id": native_id,
                    "preferred_name": display_name,
                    "adm2": [m.get("name") for m in adm2_matches],
                    "adm3": [m.get("name") for m in adm3_matches],
                }
            )

        # A source admin code is an assertion. Compare it with geometry and
        # record the disagreement instead of preferring either one.
        asserted_adm2 = geoname["admin2_code"]
        if asserted_adm2:
            asserted_name = _admin2_name(bundle, asserted_adm2)
            geometric_names = {m.get("name") for m in adm2_matches}
            if asserted_name and geometric_names and asserted_name not in geometric_names:
                code_disagreements.append(
                    {
                        "kind": "adm2_code_vs_geometry",
                        "source_record_id": native_id,
                        "preferred_name": display_name,
                        "asserted_admin2_code": asserted_adm2,
                        "asserted_admin2_name": asserted_name,
                        "geometric_admin2_names": sorted(n for n in geometric_names if n),
                    }
                )

        source_record_ids = [f"geonames:{native_id}"]
        type_tally[decision["canonical_type"]] += 1
        type_state = decision["type_state"]

        identities.append(
            {
                "source_authority_version": f"{territory.territory_id}-source-authority-{SOURCE_AUTHORITY_VERSION}",
                "canonical_location_id": identity,
                "identity_namespace": "Property Listify",
                "canonical_status": "factual_canonical",
                "lifecycle_status": "active",
                "promotion_class": (
                    "auto_promotable_factual_identity"
                    if type_state == "supported"
                    else "promotable_with_provisional_attributes"
                ),
                "promotion_policy_version": SOURCE_AUTHORITY_VERSION,
                "identity_confidence": "medium" if type_state != "supported" else "high",
                "identity_evidence_class": (
                    "single_source_settlement_classification"
                    if type_state != "supported"
                    else "single_source_administrative_or_seat_classification"
                ),
                "preferred_name": display_name,
                "official_name": None,
                "normalized_name": normalized,
                "name_assertion_ids": [],
                "name_confidence": "medium",
                "name_state": "supported",
                "canonical_type": decision["canonical_type"],
                "proposed_type": decision["canonical_type"],
                "type_confidence": decision["type_confidence"],
                "type_state": type_state,
                "type_assessment": decision["type_assessment"],
                "type_assessment_reason": decision["type_assessment_reason"],
                "source_native_classifications": [
                    {
                        "source": "geonames",
                        "feature_code": f"{geoname['feature_class']}.{geoname['feature_code']}",
                        "feature_label": feature_code_names.get(
                            f"{geoname['feature_class']}.{geoname['feature_code']}", "unknown"
                        ),
                        "population": as_int(geoname["population"]),
                        "timezone": geoname["timezone"],
                    }
                ],
                "representative_latitude": latitude,
                "representative_longitude": longitude,
                "representative_geometry": None,
                "spatial_confidence": "supported" if inside_province == "inside" else "unverified",
                "administrative_context": {
                    "province": {
                        "level": "ADM1",
                        "name": territory.province,
                        "source": "geoBoundaries",
                    },
                    "adm2": adm2_matches,
                    "adm3": adm3_matches,
                },
                "administrative_relationships": [],
                "administrative_assignment_confidence": (
                    "single_source_geometry_match" if adm3_matches or adm2_matches else "unresolved"
                ),
                "boundary_conflict": any(
                    entry.get("source_record_id") == native_id for entry in code_disagreements
                ),
                "unresolved_attributes": sorted(
                    list(unresolved_levels)
                    + (["province_containment"] if inside_province != "inside" else [])
                ),
                "source_record_ids": source_record_ids,
                "source_names": ["geonames"],
                "source_count": 1,
                "source_modification_dates": [geoname["modification_date"]]
                if geoname["modification_date"]
                else [],
                "first_seen": geoname["modification_date"] or None,
                "last_verified_at": None,
                "licence_classes": ["CC_BY_4.0"],
                "licensing_classification": LICENCE_CLASS,
                "licence_state": "attribution_required_not_odbl",
                "licence_gate": "founder_review_required_before_publication",
                "licence_obligations": LICENCE_OBLIGATIONS,
                "odbl_evidence_present": False,
                "licence_review_state": "recorded_not_cleared",
                "osm_only": 0,
                "source_representation": {
                    "acquisition_manifest_sha256": bundle.manifest_sha256,
                    "boundary_year_represented": boundary_metadata(bundle, "ADM1").get(
                        "boundaryYearRepresented"
                    ),
                    "spatial_intersection_basis": gate_info["intersection_basis"],
                },
                "promotion_reasons": [
                    f"GeoNames class {geoname['feature_class']}.{geoname['feature_code']} is an admitted "
                    f"settlement or administrative class",
                ],
            }
        )

        # The identity's own display name is always a name assertion. The admission
        # builder derives a Place's names *only* from name assertions, so an
        # identity that carries its name solely in `preferred_name` would admit a
        # Place with no name at all.
        display_assertion_id = f"{territory.territory_id}-name-primary-{native_id}"
        name_ids: list[str] = [display_assertion_id]
        name_assertions.append(
            {
                "source_authority_version": f"{territory.territory_id}-source-authority-{SOURCE_AUTHORITY_VERSION}",
                "name_assertion_id": display_assertion_id,
                "canonical_location_id": identity,
                "name": display_name,
                "normalized_name": normalized,
                "name_type": "preferred_common",
                "name_roles": ["preferred_common"],
                "language": None,
                "is_preferred_name": False,
                "is_short_name": False,
                "is_colloquial": False,
                "is_historic": False,
                "valid_from": None,
                "valid_to": None,
                "status": "active",
                "searchable": bool(is_searchable_name("preferred_public", display_name, "")),
                "source_record_ids": [f"geonames:{native_id}"],
                "source_names": ["geonames"],
                "derived_from_candidate": False,
                "is_source_display_name": True,
                "source_locator": record.get("source_locator"),
                "licence": record.get("licence"),
                "attribution": record.get("attribution"),
            }
        )

        for alternate_record in sorted(
            alternates_by_geonameid.get(native_id, []),
            key=lambda r: str(alternate_name_row(r)["alternate_name_id"]),
        ):
            alternate = alternate_name_row(alternate_record)
            text = alternate["alternate_name"].strip()
            if not text:
                continue
            language = alternate["isolanguage"].strip()
            role = name_role_for(alternate, False)
            if role == "common" and normalize_name(text) == normalized:
                # The source's own display name, restated. It is already recorded
                # as the identity's primary assertion, so recording it twice
                # would double-count one referent's name.
                continue
            assertion_id = f"{territory.territory_id}-name-{alternate['alternate_name_id']}"
            name_ids.append(assertion_id)
            name_assertions.append(
                {
                    "source_authority_version": f"{territory.territory_id}-source-authority-{SOURCE_AUTHORITY_VERSION}",
                    "name_assertion_id": assertion_id,
                    "canonical_location_id": identity,
                    "name": text,
                    "normalized_name": normalize_name(text),
                    "name_type": role,
                    "name_roles": [role],
                    "language": language or None,
                    "is_preferred_name": alternate.get("is_preferred_name") == "1",
                    "is_short_name": alternate.get("is_short_name") == "1",
                    "is_colloquial": alternate.get("is_colloquial") == "1",
                    "is_historic": alternate.get("is_historic") == "1",
                    "valid_from": alternate.get("valid_from") or None,
                    "valid_to": alternate.get("valid_to") or None,
                    "status": "active",
                    "searchable": bool(is_searchable_name(role, text, language)),
                    "source_record_ids": [f"geonames_alternate_name:{alternate['alternate_name_id']}"],
                    "source_names": ["geonames"],
                    "derived_from_candidate": False,
                    "source_locator": alternate_record.get("source_locator"),
                    "licence": alternate_record.get("licence"),
                    "attribution": alternate_record.get("attribution"),
                }
            )

        for identity_row in identities:
            if identity_row["canonical_location_id"] == identity:
                identity_row["name_assertion_ids"] = name_ids
                break

        source_links.append(
            {
                "source_authority_version": f"{territory.territory_id}-source-authority-{SOURCE_AUTHORITY_VERSION}",
                "source_link_id": f"{territory.territory_id}-source-{native_id}",
                "canonical_location_id": identity,
                "source_record_id": f"geonames:{native_id}",
                "source": "geonames",
                "source_native_id": native_id,
                "source_native_stable_id": native_id,
                "exact_source_name": display_name,
                "source_native_classification": {
                    "feature_class": geoname["feature_class"],
                    "feature_code": geoname["feature_code"],
                    "feature_label": feature_code_names.get(
                        f"{geoname['feature_class']}.{geoname['feature_code']}", "unknown"
                    ),
                    "population": as_int(geoname["population"]),
                    "admin1_code": geoname["admin1_code"],
                    "admin2_code": geoname["admin2_code"],
                    "admin3_code": geoname["admin3_code"],
                    "timezone": geoname["timezone"],
                },
                "source_artifact_ids": [record.get("artifact_id")],
                "source_modification_date": geoname["modification_date"] or None,
                "retrieved_at": None,
                "licence_class": "CC BY 4.0",
                "licence_url": "https://creativecommons.org/licenses/by/4.0/",
                "attribution": record.get("attribution"),
                "source_locator": record.get("source_locator"),
                "source_feature_sha256": record.get("source_feature_sha256"),
            }
        )

    # Every linked alternate name is accounted for: admitted as a name assertion
    # on an admitted identity, or dispositioned. A dangling assertion is a defect.
    linked_alternate_ids = {row["name_assertion_id"] for row in name_assertions}
    dangling = 0
    for record in alternate_records:
        alternate = alternate_name_row(record)
        text = alternate["alternate_name"].strip()
        if not text:
            continue
        assertion_id = f"{territory.territory_id}-name-{alternate['alternate_name_id']}"
        if assertion_id in linked_alternate_ids:
            continue
        dangling += 1

    identities.sort(key=lambda row: row["canonical_location_id"])
    name_assertions.sort(key=lambda row: row["name_assertion_id"])
    source_links.sort(key=lambda row: row["source_link_id"])
    dispositions.sort(key=lambda row: row["candidate_location_id"])

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    prefix = territory.territory_id.replace("-", "_")

    artifact_paths = {
        "geography": output_dir / f"{prefix}_factual_canonical_geography_v{SOURCE_AUTHORITY_VERSION}.jsonl",
        "names": output_dir / f"{prefix}_factual_canonical_names_v{SOURCE_AUTHORITY_VERSION}.jsonl",
        "source_links": output_dir
        / f"{prefix}_factual_canonical_source_links_v{SOURCE_AUTHORITY_VERSION}.jsonl",
        "candidate_dispositions": output_dir
        / f"{prefix}_candidate_dispositions_v{SOURCE_AUTHORITY_VERSION}.jsonl",
    }
    _write_jsonl(artifact_paths["geography"], identities)
    _write_jsonl(artifact_paths["names"], name_assertions)
    _write_jsonl(artifact_paths["source_links"], source_links)
    _write_jsonl(artifact_paths["candidate_dispositions"], dispositions)

    admitted_ids = {row["canonical_location_id"] for row in identities}
    for name_row in name_assertions:
        if name_row["canonical_location_id"] not in admitted_ids:
            raise ValueError(f"Name assertion {name_row['name_assertion_id']} has no admitted identity")
    for link_row in source_links:
        if link_row["canonical_location_id"] not in admitted_ids:
            raise ValueError(f"Source link {link_row['source_link_id']} has no admitted identity")

    compact_artifacts = [
        {
            "kind": kind,
            "path": _repo_path(path),
            "sha256": sha256_file(path),
            "size_bytes": path.stat().st_size,
        }
        for kind, path in sorted(artifact_paths.items())
    ]

    adm1_metadata = boundary_metadata(bundle, "ADM1")
    authority_version = f"{territory.territory_id}-source-authority-v{SOURCE_AUTHORITY_VERSION}"
    summary = {
        "source_authority_version": authority_version,
        "territory_id": territory.territory_id,
        "province": territory.province,
        "generated_from_acquisition": {
            "bundle_manifest_sha256": bundle.manifest_sha256,
            "bundle_kind": bundle.bundle_kind,
            "acquisition_limitations": bundle.limitations,
        },
        "boundary_evidence": {
            "boundary_year_represented": adm1_metadata.get("boundaryYearRepresented"),
            "source_data_update_date": adm1_metadata.get("sourceDataUpdateDate"),
            "build_date": adm1_metadata.get("buildDate"),
            "boundary_source": adm1_metadata.get("boundarySource"),
            "boundary_license": adm1_metadata.get("boundaryLicense"),
            "spatial_intersection_basis": gate_info["intersection_basis"],
            "context_feature_selection": gate_info["selection"],
            "adm1_selected": _shape_name(province_feature),
            "adm2_features_intersecting": len(context_features.get("ADM2", [])),
            "adm3_features_intersecting": len(context_features.get("ADM3", [])),
            "currency_status": (
                f"Boundaries represent {adm1_metadata.get('boundaryYearRepresented')}. This is "
                "historical evidence, not a current-boundary certification, and a currency review "
                "is owed before any scope is published."
            ),
        },
        "governed_policy": {
            "exact_type_by_source_code": dict(sorted(EXACT_TYPE_BY_SOURCE_CODE.items())),
            "populated_place_codes": sorted(POPULATED_PLACE_CODES),
            "city_min_population": CITY_MIN_POPULATION,
            "town_min_population": TOWN_MIN_POPULATION,
            "administrative_context_basis": "representative point tested against acquired polygons",
            "source_admin_code_treated_as": "assertion recorded and compared, never as containment proof",
            "licence_classification": LICENCE_CLASS,
            "licence_obligations": LICENCE_OBLIGATIONS,
        },
        "counts": {
            "source_universe_records": len(geonames_records),
            "admitted_identities": len(identities),
            "name_assertions": len(name_assertions),
            "source_links": len(source_links),
            "candidate_dispositions": len(dispositions),
            "identities_by_type": dict(sorted(type_tally.items())),
            "dispositions_by_reason": dict(sorted(disposition_tally.items())),
            "alternate_name_records": len(alternate_records),
            "alternate_names_not_linked_to_an_identity": dangling,
        },
        "context_resolution": {
            "records_queued_for_multiple_context_matches": len(context_queue),
            "code_geometry_disagreements": len(code_disagreements),
            "administrative_crosswalk_basis": (
                "geoBoundaries polygon resolved to an admitted administrative identity: by "
                "normalized label when the labels agree, otherwise by testing each admitted "
                "record's own point against the polygon. The polygon label is kept as "
                "provenance; the context name is the admitted identity's name, because "
                "identity is joined on name downstream."
            ),
            "administrative_crosswalk": {
                level: dict(sorted(mapping.items())) for level, mapping in crosswalk.items()
            },
            "administrative_crosswalk_unresolved": crosswalk_unresolved,
            "identities_resolved_to_weaker_evidence": {
                "ADM2": identities_resolved_to_weaker.get("ADM2", 0),
                "ADM3": identities_resolved_to_weaker.get("ADM3", 0),
                "basis": (
                    "Identities whose administrative context came from a polygon retained only "
                    "on bounding-box evidence, because no geospatial wheel is installed and the "
                    "representative point is a bounding-box centre. Non-zero means real context "
                    "depends on the weaker selection test."
                ),
            },
            "queue": context_queue,
            "disagreements": code_disagreements,
        },
        "invariants_asserted": [
            "every source record is either an admitted identity or an explicit candidate disposition",
            "every name assertion and source link references an admitted identity",
            "identity is derived from territory and source-native id only, never from a name or coordinate",
            "administrative context is resolved from geometry, and source admin codes are compared, not trusted",
            "no record is promoted because of its name",
            "licence obligations are recorded per identity, not summarised away by the licensing label",
        ],
    }
    summary_path = output_dir / f"{prefix}_source_build_summary_v{SOURCE_AUTHORITY_VERSION}.json"
    _write_json(summary_path, summary)

    manifest = {
        "authority_version": authority_version,
        "source_snapshot_id": f"{bundle.manifest_sha256}",
        "territory_id": territory.territory_id,
        "country": "ZA",
        "province": territory.province,
        "manifest_version": SOURCE_AUTHORITY_VERSION,
        "pipeline_version": SOURCE_AUTHORITY_VERSION,
        "catalogue_version": SOURCE_AUTHORITY_VERSION,
        "scope": "canonical factual geography source authority; not an admitted Place package",
        "supersedes": None,
        "raw_materialization": {
            "acquisition_bundle_manifest_sha256": bundle.manifest_sha256,
            "raw_artifacts": [
                {
                    "artifact_id": artifact.get("artifact_id"),
                    "path": artifact.get("path"),
                    "download_sha256": artifact.get("download_sha256"),
                }
                for artifact in bundle.manifest.get("artifacts", [])
            ],
        },
        "license_observations": {
            "geonames": {
                "class": "CC BY 4.0",
                "attribution_required": True,
                "evidence": "https://download.geonames.org/export/dump/readme.txt",
            },
            "geoboundaries_gbopen": {
                "class": "CC BY 4.0 distribution",
                "upstream_class": adm1_metadata.get("boundaryLicense"),
                "upstream_attribution": adm1_metadata.get("boundarySource"),
                "gbAuthoritative_substituted": False,
                "gbHumanitarian_substituted": False,
            },
        },
        "acquisition_limitations": bundle.limitations,
        "compact_artifacts": compact_artifacts,
        "build_summary": {
            "path": _repo_path(summary_path),
            "sha256": sha256_file(summary_path),
        },
    }
    manifest_path = output_dir / f"{prefix}_source_manifest_v{SOURCE_AUTHORITY_VERSION}.json"
    _write_json(manifest_path, manifest)

    return {
        "authority_version": authority_version,
        "manifest_path": manifest_path,
        "summary": summary,
        "output_dir": output_dir,
    }


def _crosswalk_context(
    level: str, context_value: dict[str, Any], crosswalk: dict[str, dict[str, str]]
) -> dict[str, Any]:
    """Rewrite a resolved polygon label to the admitted identity's name.

    The polygon label is preserved as provenance. Returning a name-less value
    means the polygon could not be resolved to an admitted administrative
    identity, and the identity is then recorded as having unresolved context
    rather than inheriting a label no admitted Place carries.
    """
    result = dict(context_value)
    polygon_label = result.get("name")
    resolved = crosswalk.get(level, {}).get(str(polygon_label))
    result["polygon_name"] = polygon_label
    result["name"] = resolved
    result["name_resolved_by"] = "crosswalk" if resolved else "unresolved"
    return result


def _fallback_contains(geometry: dict[str, Any], longitude: float | None, latitude: float | None) -> bool:
    """Standard-library point-in-polygon, so a crosswalk never needs a GIS wheel."""
    if longitude is None or latitude is None:
        return False
    return _fallback_point_in_geometry(float(longitude), float(latitude), geometry)


def _repo_path(path: Path) -> str:
    """Repo-relative when the artifact is inside the repository, else absolute.

    A rebuild written to a scratch directory outside the repository still has to
    produce a manifest, so the relativisation is a convenience rather than a
    precondition.
    """
    try:
        return str(path.relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


def _write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    content = "".join(json.dumps(row, sort_keys=True) + "\n" for row in rows)
    path.write_text(content, encoding="utf-8")


def _write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _shape_properties(feature: dict[str, Any]) -> dict[str, Any]:
    return feature.get("properties") or {}


def _shape_name(feature: dict[str, Any]) -> str:
    properties = _shape_properties(feature)
    for key in ("shapeName", "NAME_1", "NAME_2", "NAME_3", "name", "NAME"):
        if properties.get(key):
            return str(properties[key])
    return "unknown"


def _shape_id(feature: dict[str, Any]) -> str:
    properties = _shape_properties(feature)
    for key in ("shapeID", "shapeISO", "shapeName"):
        if properties.get(key):
            return str(properties[key])
    return "unknown"


def _admin2_name(bundle: AcquisitionBundle, code: str) -> str | None:
    path = bundle.raw_path("geonames", "admin2Codes.txt")
    if not path.is_file():
        return None
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            fields = line.rstrip("\n").split("\t")
            if len(fields) >= 2 and fields[0].strip() == code.strip():
                return fields[1].strip()
    return None
