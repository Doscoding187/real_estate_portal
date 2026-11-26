import { loadPlaceCentroids, type PlaceCentroidIndex } from './placeCentroidService';

/**
 * The centre point of a canonical suburb from OUR committed geography
 * (data/place-centroids-gauteng-v0.1.json), or null when the place has none.
 * Used only by the wizard's "pin is far from the suburb" warning; never blocks.
 */
export const placeCentreService = {
  getCentre(
    placeId: string,
    index: PlaceCentroidIndex = loadPlaceCentroids(),
  ): { lat: number; lng: number } | null {
    const entry = index.byPlaceId.get(placeId);
    if (!entry || entry.lat === null || entry.lng === null) return null;
    return { lat: entry.lat, lng: entry.lng };
  },
};
