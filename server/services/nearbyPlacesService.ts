import { loadCanonicalPlaceSearchProjection } from './canonicalPlaceSearchService';
import {
  haversineKm,
  loadPlaceCentroids,
  type PlaceCentroidEntry,
  type PlaceCentroidIndex,
} from './placeCentroidService';

/** Nearest same-city suburbs considered for the results-page "nearby areas" chooser. */
export const NEARBY_PLACES_MAX_CANDIDATES = 40;

export type NearbyPlace = {
  placeId: string;
  name: string;
  distanceKm: number;
};

const roundKm = (value: number) => Math.round(value * 10) / 10;

/**
 * Same-city suburbs nearest to the selected suburbs, by centroid distance (to the
 * nearest selected suburb). Pure, no I/O. Returns nothing unless every selected
 * place is a suburb with a known centre in one and the same city; distances are
 * never guessed.
 */
export function selectNearbyPlaceCandidates(
  index: PlaceCentroidIndex,
  selectedIds: readonly string[],
  limit = NEARBY_PLACES_MAX_CANDIDATES,
): Array<{ entry: PlaceCentroidEntry; distanceKm: number }> {
  const selected = selectedIds.map(id => index.byPlaceId.get(id));
  if (!selected.length || selected.some(entry => !entry || entry.level !== 'suburb')) return [];
  const cityIds = new Set(selected.map(entry => entry!.parentCityPlaceId));
  const [cityId] = [...cityIds];
  if (cityIds.size !== 1 || !cityId) return [];
  const centres = selected.flatMap(entry =>
    entry!.lat !== null && entry!.lng !== null ? [{ lat: entry!.lat, lng: entry!.lng }] : [],
  );
  if (centres.length !== selected.length) return [];

  const chosen = new Set(selectedIds);
  return index.entries
    .filter(
      entry =>
        entry.level === 'suburb' &&
        entry.parentCityPlaceId === cityId &&
        !chosen.has(entry.canonicalPlaceId) &&
        entry.lat !== null &&
        entry.lng !== null,
    )
    .map(entry => ({
      entry,
      distanceKm: Math.min(
        ...centres.map(centre => haversineKm(centre, { lat: entry.lat!, lng: entry.lng! })),
      ),
    }))
    .sort(
      (left, right) =>
        left.distanceKm - right.distanceKm ||
        left.entry.canonicalPlaceId.localeCompare(right.entry.canonicalPlaceId),
    )
    .slice(0, limit);
}

export const nearbyPlacesService = {
  /** Searchable, published suburbs near the selected suburbs of one city, nearest first. */
  async getNearbyPlaces(
    selectedIds: readonly string[],
    index: PlaceCentroidIndex = loadPlaceCentroids(),
  ): Promise<NearbyPlace[]> {
    const candidates = selectNearbyPlaceCandidates(index, selectedIds);
    if (!candidates.length) return [];
    // Searchable (labelled) localities only, exactly as search does.
    const projection = await loadCanonicalPlaceSearchProjection(undefined, {
      placeIds: [...selectedIds, ...candidates.map(item => item.entry.canonicalPlaceId)],
    });
    if (
      selectedIds.some(
        id => projection.executions.get(id)?.scope !== 'locality' || !projection.labels.has(id),
      )
    ) {
      return [];
    }
    return candidates.flatMap(item => {
      const id = item.entry.canonicalPlaceId;
      const label = projection.labels.get(id);
      if (!label || projection.executions.get(id)?.scope !== 'locality') return [];
      return [{ placeId: id, name: label.label, distanceKm: roundKm(item.distanceKm) }];
    });
  },
};
