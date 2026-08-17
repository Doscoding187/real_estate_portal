from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterable

from .common import as_float


try:  # Optional at import time so unit tests can exercise the gates without GIS wheels.
    from shapely.geometry import Point, shape
    from shapely.ops import unary_union

    SHAPELY_AVAILABLE = True
except ImportError:  # pragma: no cover - exercised only in minimal environments.
    Point = None  # type: ignore[assignment]
    shape = None  # type: ignore[assignment]
    unary_union = None  # type: ignore[assignment]
    SHAPELY_AVAILABLE = False


def load_geojson(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict) or value.get("type") != "FeatureCollection":
        raise ValueError(f"Expected GeoJSON FeatureCollection at {path}")
    return value


def iter_features(collection: dict[str, Any]) -> Iterable[dict[str, Any]]:
    for feature in collection.get("features", []):
        if isinstance(feature, dict) and isinstance(feature.get("geometry"), dict):
            yield feature


def _bbox_for_coordinates(coordinates: Any) -> tuple[float, float, float, float] | None:
    values: list[tuple[float, float]] = []

    def walk(item: Any) -> None:
        if isinstance(item, (list, tuple)) and len(item) >= 2 and all(
            isinstance(value, (int, float)) for value in item[:2]
        ):
            values.append((float(item[0]), float(item[1])))
            return
        if isinstance(item, (list, tuple)):
            for child in item:
                walk(child)

    walk(coordinates)
    if not values:
        return None
    longitudes = [item[0] for item in values]
    latitudes = [item[1] for item in values]
    return min(longitudes), min(latitudes), max(longitudes), max(latitudes)


def _bbox_for_geometry(geometry: dict[str, Any]) -> tuple[float, float, float, float] | None:
    if geometry.get("type") == "GeometryCollection":
        boxes = [_bbox_for_geometry(item) for item in geometry.get("geometries", []) if isinstance(item, dict)]
        boxes = [item for item in boxes if item]
        if not boxes:
            return None
        return (
            min(item[0] for item in boxes),
            min(item[1] for item in boxes),
            max(item[2] for item in boxes),
            max(item[3] for item in boxes),
        )
    return _bbox_for_coordinates(geometry.get("coordinates"))


def _point_in_ring(lon: float, lat: float, ring: list[list[float]]) -> bool:
    inside = False
    if len(ring) < 3:
        return False
    previous = ring[-1]
    for current in ring:
        x_one, y_one = float(previous[0]), float(previous[1])
        x_two, y_two = float(current[0]), float(current[1])
        if ((y_one > lat) != (y_two > lat)) and lon < (x_two - x_one) * (lat - y_one) / (y_two - y_one) + x_one:
            inside = not inside
        previous = current
    return inside


def _fallback_point_in_geometry(lon: float, lat: float, geometry: dict[str, Any]) -> bool:
    geometry_type = geometry.get("type")
    coordinates = geometry.get("coordinates")
    if geometry_type == "Polygon" and coordinates:
        return _point_in_ring(lon, lat, coordinates[0]) and not any(
            _point_in_ring(lon, lat, ring) for ring in coordinates[1:]
        )
    if geometry_type == "MultiPolygon" and coordinates:
        return any(_fallback_point_in_geometry(lon, lat, {"type": "Polygon", "coordinates": polygon}) for polygon in coordinates)
    if geometry_type == "GeometryCollection":
        return any(
            _fallback_point_in_geometry(lon, lat, child)
            for child in geometry.get("geometries", [])
            if isinstance(child, dict)
        )
    return False


def geometry_point(geometry: dict[str, Any]) -> tuple[float, float] | None:
    if SHAPELY_AVAILABLE:
        try:
            candidate = shape(geometry).representative_point()
            return float(candidate.y), float(candidate.x)
        except Exception:
            pass
    bbox = _bbox_for_geometry(geometry)
    if bbox:
        return (bbox[1] + bbox[3]) / 2, (bbox[0] + bbox[2]) / 2
    return None


class GautengSpatialGate:
    """Small, explicit spatial gate around the approved geoBoundaries province."""

    def __init__(self, province_feature: dict[str, Any], context_features: dict[str, list[dict[str, Any]]] | None = None):
        self.province_feature = province_feature
        self.context_features = context_features or {"ADM2": [], "ADM3": []}
        self.province_geometry = province_feature.get("geometry") or {}
        self._province_shape = None
        self._context_shapes: dict[str, list[tuple[dict[str, Any], Any]]] = {"ADM2": [], "ADM3": []}
        if SHAPELY_AVAILABLE:
            self._province_shape = self._safe_shape(self.province_geometry)
            for level, features in self.context_features.items():
                self._context_shapes[level] = [
                    (feature, self._safe_shape(feature.get("geometry") or {}))
                    for feature in features
                ]

    @staticmethod
    def _safe_shape(geometry: dict[str, Any]) -> Any:
        if not SHAPELY_AVAILABLE:
            return geometry
        try:
            candidate = shape(geometry)
            if not candidate.is_valid:
                candidate = candidate.buffer(0)
            return candidate
        except Exception:
            return None

    def point_status(self, latitude: float | None, longitude: float | None) -> str:
        if latitude is None or longitude is None:
            return "missing_coordinate"
        if SHAPELY_AVAILABLE and self._province_shape is not None:
            try:
                return "inside" if self._province_shape.covers(Point(float(longitude), float(latitude))) else "outside"
            except Exception:
                return "invalid_coordinate"
        return "inside" if _fallback_point_in_geometry(float(longitude), float(latitude), self.province_geometry) else "outside"

    def geometry_status(self, geometry: dict[str, Any] | None) -> str:
        if not geometry:
            return "missing_geometry"
        if SHAPELY_AVAILABLE and self._province_shape is not None:
            candidate = self._safe_shape(geometry)
            if candidate is None:
                return "invalid_geometry"
            try:
                return "intersects" if self._province_shape.intersects(candidate) else "outside"
            except Exception:
                return "invalid_geometry"
        candidate_bbox = _bbox_for_geometry(geometry)
        province_bbox = _bbox_for_geometry(self.province_geometry)
        if not candidate_bbox or not province_bbox:
            return "invalid_geometry"
        overlaps = not (
            candidate_bbox[2] < province_bbox[0]
            or candidate_bbox[0] > province_bbox[2]
            or candidate_bbox[3] < province_bbox[1]
            or candidate_bbox[1] > province_bbox[3]
        )
        return "intersects" if overlaps else "outside"

    def representative_point(self, geometry: dict[str, Any] | None) -> tuple[float, float] | None:
        if not geometry:
            return None
        return geometry_point(geometry)

    def administrative_context(self, latitude: float | None, longitude: float | None) -> dict[str, Any]:
        context: dict[str, Any] = {
            "province": {"name": "Gauteng", "source": "geoBoundaries", "level": "ADM1"},
            "adm2": [],
            "adm3": [],
        }
        if latitude is None or longitude is None:
            return context
        if SHAPELY_AVAILABLE:
            point = Point(float(longitude), float(latitude))
            for level in ("ADM2", "ADM3"):
                key = level.lower()
                for feature, feature_shape in self._context_shapes.get(level, []):
                    if feature_shape is None:
                        continue
                    try:
                        if feature_shape.covers(point):
                            context[key].append(self._context_value(level, feature))
                    except Exception:
                        continue
        else:
            for level, features in self.context_features.items():
                key = level.lower()
                for feature in features:
                    if _fallback_point_in_geometry(float(longitude), float(latitude), feature.get("geometry") or {}):
                        context[key].append(self._context_value(level, feature))
        return context

    @staticmethod
    def _context_value(level: str, feature: dict[str, Any]) -> dict[str, Any]:
        properties = feature.get("properties") or {}
        name = next(
            (
                properties.get(key)
                for key in ("shapeName", "NAME_1", "NAME_2", "NAME_3", "name", "NAME")
                if properties.get(key)
            ),
            None,
        )
        return {
            "level": level,
            "name": str(name) if name is not None else None,
            "source_native_id": str(
                next(
                    (
                        properties.get(key)
                        for key in ("shapeID", "shapeISO", "shapeName", "GID_1", "GID_2", "GID_3")
                        if properties.get(key)
                    ),
                    "unknown",
                )
            ),
            "source_properties": properties,
        }


def select_gauteng_feature(features: Iterable[dict[str, Any]]) -> dict[str, Any]:
    candidates = []
    for feature in features:
        properties = feature.get("properties") or {}
        values = " ".join(str(properties.get(key, "")) for key in ("shapeName", "shapeISO", "name", "NAME_1"))
        if "gauteng" in values.casefold() or str(properties.get("shapeISO", "")).upper() in {"GP", "ZA-GP"}:
            candidates.append(feature)
    if len(candidates) != 1:
        raise ValueError(f"Expected one Gauteng ADM1 feature, found {len(candidates)}")
    return candidates[0]


def select_gauteng_overlapping_features(
    features: Iterable[dict[str, Any]], gate: GautengSpatialGate
) -> list[dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    for feature in features:
        if gate.geometry_status(feature.get("geometry")) == "intersects":
            selected.append(feature)
    return selected
