import {
  haversineKm,
  loadPlaceCentroids,
  type PlaceCentroidEntry,
  type PlaceCentroidIndex,
} from './placeCentroidService';
import { loadCanonicalPlaceSearchProjection } from './canonicalPlaceSearchService';

/**
 * The suburb for a pin comes ONLY from our own canonical geography: the nearest
 * suburb centre within this distance, using the committed centroid file
 * (data/place-centroids-gauteng-v0.1.json). There is no boundary polygon data.
 * Anything farther is "not found" and is left for a reviewer.
 */
export const POINT_MATCH_MAX_KM = 3;

/** Informal settlements are never offered as the suburb buyers see. */
const INFORMAL_SETTLEMENT = /informal[\s-]*settlement/i;
export const isInformalSettlement = (value: string | null | undefined): boolean =>
  INFORMAL_SETTLEMENT.test(String(value ?? ''));

export type PointPlaceMatch = { canonicalPlaceId: string; distanceKm: number };

/** Suburb centres within maxKm of the point, nearest first; informal settlements excluded. Pure. */
export function rankSuburbsForPoint(
  index: PlaceCentroidIndex,
  point: { lat: number; lng: number },
  maxKm: number = POINT_MATCH_MAX_KM,
): PointPlaceMatch[] {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return [];
  const ranked: PointPlaceMatch[] = [];
  for (const entry of index.entries as readonly PlaceCentroidEntry[]) {
    if (entry.level !== 'suburb' || entry.lat === null || entry.lng === null) continue;
    if (isInformalSettlement(entry.naturalKey)) continue;
    const distanceKm = haversineKm(point, { lat: entry.lat, lng: entry.lng });
    if (distanceKm <= maxKm) ranked.push({ canonicalPlaceId: entry.canonicalPlaceId, distanceKm });
  }
  return ranked.sort(
    (a, b) => a.distanceKm - b.distanceKm || a.canonicalPlaceId.localeCompare(b.canonicalPlaceId),
  );
}

/** Nearest suburb centre to the point, within maxKm (informal settlements skipped). Pure. */
export function findNearestSuburbForPoint(
  index: PlaceCentroidIndex,
  point: { lat: number; lng: number },
  maxKm: number = POINT_MATCH_MAX_KM,
): PointPlaceMatch | null {
  return rankSuburbsForPoint(index, point, maxKm)[0] ?? null;
}

export type PointPlace = {
  placeId: string;
  suburb: string;
  city: string;
  distanceKm: number;
};

const roundKm = (value: number) => Math.round(value * 10) / 10;
const MAX_CANDIDATES = 8;

export const placeFromPointService = {
  /**
   * The searchable canonical locality a map pin belongs to, or null. Read-only: it
   * reads only the centroid file and the Place search projection. The result must
   * be a published, labelled locality exactly as search requires, and a locality
   * whose public name is an informal settlement is skipped for the next nearest.
   */
  async locate(
    point: { lat: number; lng: number },
    index: PlaceCentroidIndex = loadPlaceCentroids(),
  ): Promise<PointPlace | null> {
    const candidates = rankSuburbsForPoint(index, point).slice(0, MAX_CANDIDATES);
    if (!candidates.length) return null;
    const projection = await loadCanonicalPlaceSearchProjection(undefined, {
      placeIds: candidates.map(candidate => candidate.canonicalPlaceId),
    });
    for (const candidate of candidates) {
      const label = projection.labels.get(candidate.canonicalPlaceId);
      if (!label || projection.executions.get(candidate.canonicalPlaceId)?.scope !== 'locality') {
        continue;
      }
      if (isInformalSettlement(label.label)) continue;
      return {
        placeId: candidate.canonicalPlaceId,
        suburb: label.label,
        city: label.city,
        distanceKm: roundKm(candidate.distanceKm),
      };
    }
    return null;
  },
};
