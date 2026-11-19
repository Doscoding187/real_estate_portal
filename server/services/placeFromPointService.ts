import {
  haversineKm,
  loadPlaceCentroids,
  type PlaceCentroidIndex,
} from './placeCentroidService';
import { loadCanonicalPlaceSearchProjection } from './canonicalPlaceSearchService';

/**
 * A pin is matched to the nearest suburb centre within this distance. There is no
 * boundary polygon data in the repository (only the generated suburb centroids in
 * data/place-centroids-gauteng-v0.1.json), so "nearest centre within 3 km" is the
 * honest rule; anything farther is "not found" and is left for a reviewer.
 */
export const POINT_MATCH_MAX_KM = 3;

export type PointPlaceMatch = { canonicalPlaceId: string; distanceKm: number };

/** Nearest suburb centroid to the point, within maxKm. Pure. */
export function findNearestSuburbForPoint(
  index: PlaceCentroidIndex,
  point: { lat: number; lng: number },
  maxKm: number = POINT_MATCH_MAX_KM,
): PointPlaceMatch | null {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return null;
  let best: PointPlaceMatch | null = null;
  for (const entry of index.entries) {
    if (entry.level !== 'suburb' || entry.lat === null || entry.lng === null) continue;
    const distanceKm = haversineKm(point, { lat: entry.lat, lng: entry.lng });
    if (distanceKm > maxKm) continue;
    if (
      !best ||
      distanceKm < best.distanceKm ||
      (distanceKm === best.distanceKm && entry.canonicalPlaceId < best.canonicalPlaceId)
    ) {
      best = { canonicalPlaceId: entry.canonicalPlaceId, distanceKm };
    }
  }
  return best;
}

export type PointPlace = {
  placeId: string;
  suburb: string;
  city: string;
  distanceKm: number;
};

const roundKm = (value: number) => Math.round(value * 10) / 10;

export const placeFromPointService = {
  /**
   * The searchable canonical locality a map pin belongs to, or null. Read-only: it
   * only reads the centroid file and the Place search projection, and the result
   * must be a published, labelled locality exactly as search requires.
   */
  async locate(
    point: { lat: number; lng: number },
    index: PlaceCentroidIndex = loadPlaceCentroids(),
  ): Promise<PointPlace | null> {
    const match = findNearestSuburbForPoint(index, point);
    if (!match) return null;
    const projection = await loadCanonicalPlaceSearchProjection(undefined, {
      placeIds: [match.canonicalPlaceId],
    });
    const label = projection.labels.get(match.canonicalPlaceId);
    if (!label || projection.executions.get(match.canonicalPlaceId)?.scope !== 'locality') {
      return null;
    }
    return {
      placeId: match.canonicalPlaceId,
      suburb: label.label,
      city: label.city,
      distanceKm: roundKm(match.distanceKm),
    };
  },
};
