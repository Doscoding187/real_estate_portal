import { describe, expect, it } from 'vitest';
import { buildPlaceCentroidIndex, type PlaceCentroidEntry } from '../placeCentroidService';
import {
  findNearestSuburbForPoint,
  isInformalSettlement,
  POINT_MATCH_MAX_KM,
  rankSuburbsForPoint,
} from '../placeFromPointService';

const id = (n: number) => `pl-place-01-${String(n).padStart(24, '0')}`;
const entry = (
  n: number,
  lat: number | null,
  lng: number | null,
  level: 'city' | 'suburb' = 'suburb',
  key?: string,
): PlaceCentroidEntry => ({
  canonicalPlaceId: id(n),
  naturalKey: key ?? `k${n}`,
  level,
  parentCityPlaceId: null,
  lat,
  lng,
  matchMethod: 'test',
});

const index = buildPlaceCentroidIndex([
  entry(1, -26.05, 28.0),
  entry(2, -26.06, 28.01),
  entry(3, -26.2, 28.3),
  entry(4, null, null),
  entry(5, -26.0501, 28.0001, 'city'),
]);

describe('findNearestSuburbForPoint', () => {
  it('matches the nearest suburb centre within 3 km', () => {
    const match = findNearestSuburbForPoint(index, { lat: -26.0505, lng: 28.0005 });
    expect(match?.canonicalPlaceId).toBe(id(1));
    expect(match!.distanceKm).toBeLessThan(0.2);
    expect(findNearestSuburbForPoint(index, { lat: -26.0595, lng: 28.0095 })?.canonicalPlaceId).toBe(id(2));
  });

  it('ignores cities and centres without coordinates', () => {
    // Closest centre is the city entry; it must not be returned.
    expect(findNearestSuburbForPoint(index, { lat: -26.0501, lng: 28.0001 })?.canonicalPlaceId).toBe(id(1));
  });

  it('returns null when the nearest suburb is farther than 3 km, or the point is invalid', () => {
    expect(POINT_MATCH_MAX_KM).toBe(3);
    expect(findNearestSuburbForPoint(index, { lat: -26.1, lng: 28.15 })).toBeNull();
    expect(findNearestSuburbForPoint(index, { lat: Number.NaN, lng: 28 })).toBeNull();
    expect(findNearestSuburbForPoint(buildPlaceCentroidIndex([]), { lat: -26, lng: 28 })).toBeNull();
  });

  it('skips informal settlements and returns the next nearest suburb within 3 km', () => {
    const withInformal = buildPlaceCentroidIndex([
      entry(10, -26.05, 28.0, 'suburb', 'gauteng/johannesburg/kya-sands-informal-settlement'),
      entry(11, -26.06, 28.01, 'suburb', 'gauteng/johannesburg/kya-sand'),
    ]);
    const point = { lat: -26.0501, lng: 28.0001 };
    expect(rankSuburbsForPoint(withInformal, point).map(m => m.canonicalPlaceId)).toEqual([id(11)]);
    expect(findNearestSuburbForPoint(withInformal, point)?.canonicalPlaceId).toBe(id(11));
    // Only an informal settlement nearby: not found.
    const onlyInformal = buildPlaceCentroidIndex([
      entry(12, -26.05, 28.0, 'suburb', 'gauteng/x/lion-park-informal-settlement'),
    ]);
    expect(findNearestSuburbForPoint(onlyInformal, point)).toBeNull();
  });

  it('recognises informal settlement names in any spelling', () => {
    expect(isInformalSettlement('Kya Sands Informal Settlement')).toBe(true);
    expect(isInformalSettlement('gauteng/jhb/lucky-7-informal-settlement')).toBe(true);
    expect(isInformalSettlement('North Riding')).toBe(false);
  });
});
