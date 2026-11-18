import { describe, expect, it } from 'vitest';
import { buildPlaceCentroidIndex, type PlaceCentroidEntry } from '../placeCentroidService';
import { selectNearbyPlaceCandidates } from '../nearbyPlacesService';

const id = (n: number) => `pl-place-01-${String(n).padStart(24, '0')}`;
const CITY_A = id(900);
const CITY_B = id(901);

function suburb(
  n: number,
  lat: number | null,
  lng: number | null,
  city: string | null = CITY_A,
): PlaceCentroidEntry {
  return {
    canonicalPlaceId: id(n),
    naturalKey: `s${n}`,
    level: 'suburb',
    parentCityPlaceId: city,
    lat,
    lng,
    matchMethod: 'test',
  };
}

const index = buildPlaceCentroidIndex([
  suburb(1, -26.1, 28.05),
  suburb(2, -26.11, 28.06),
  suburb(3, -26.25, 28.15),
  suburb(4, -26.3, 28.2),
  suburb(5, null, null),
  suburb(6, -26.1, 28.05, CITY_B),
  { ...suburb(7, -26.0, 28.0), level: 'city', parentCityPlaceId: null },
]);

describe('selectNearbyPlaceCandidates', () => {
  it('returns same-city suburbs nearest first, excluding the selected and unlocated ones', () => {
    const result = selectNearbyPlaceCandidates(index, [id(1)]);
    expect(result.map(item => item.entry.canonicalPlaceId)).toEqual([id(2), id(3), id(4)]);
    expect(result[0].distanceKm).toBeLessThan(result[1].distanceKm);
  });

  it('measures from the nearest selected suburb and drops every selected suburb', () => {
    const result = selectNearbyPlaceCandidates(index, [id(1), id(4)]);
    expect(result.map(item => item.entry.canonicalPlaceId)).toEqual([id(2), id(3)]);
    // id(3) is closer to id(4) than to id(1).
    const toFirstOnly = selectNearbyPlaceCandidates(index, [id(1)]).find(
      item => item.entry.canonicalPlaceId === id(3),
    )!;
    expect(result[1].distanceKm).toBeLessThan(toFirstOnly.distanceKm);
  });

  it('returns nothing when the selection spans cities, is not all suburbs, or has no centre', () => {
    expect(selectNearbyPlaceCandidates(index, [id(1), id(6)])).toEqual([]);
    expect(selectNearbyPlaceCandidates(index, [id(7)])).toEqual([]);
    expect(selectNearbyPlaceCandidates(index, [id(5)])).toEqual([]);
    expect(selectNearbyPlaceCandidates(index, [id(999)])).toEqual([]);
    expect(selectNearbyPlaceCandidates(index, [])).toEqual([]);
  });

  it('bounds the candidate list', () => {
    expect(selectNearbyPlaceCandidates(index, [id(1)], 2)).toHaveLength(2);
  });
});
