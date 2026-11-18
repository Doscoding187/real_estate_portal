import { describe, expect, it } from 'vitest';
import { generateIntentUrl, resolveSearchIntent } from '@/lib/searchIntent';
import {
  addAreaToIntent,
  selectedPlaceIds,
  summariseSelectedAreas,
} from '@/lib/searchAreaSelection';

const id = (n: number) => `pl-place-01-${String(n).padStart(24, '0')}`;
const intentFor = (placeIds: string[], extra = '') =>
  resolveSearchIntent(
    '/property-for-sale',
    {},
    new URLSearchParams(placeIds.map(value => `canonicalPlaceId=${value}`).join('&') + extra),
  );

describe('results heading summary', () => {
  it('names one area, joins two, and summarises more than two as surrounding areas', () => {
    expect(summariseSelectedAreas(['Sandton'])).toBe('Sandton');
    expect(summariseSelectedAreas(['Sandton', 'Bryanston'])).toBe('Sandton and Bryanston');
    expect(summariseSelectedAreas(['Sandton', 'A', 'B'])).toBe('Sandton and 2 surrounding areas');
    expect(summariseSelectedAreas(['Sandton', ...Array.from({ length: 9 }, (_, i) => `S${i}`)])).toBe(
      'Sandton and 9 surrounding areas',
    );
  });

  it('has no summary without a resolved name', () => {
    expect(summariseSelectedAreas([])).toBeUndefined();
    expect(summariseSelectedAreas(['  '])).toBeUndefined();
  });
});

describe('nearby-area selection', () => {
  it('lists the selected Places in order', () => {
    expect(selectedPlaceIds(intentFor([]))).toEqual([]);
    expect(selectedPlaceIds(intentFor([id(1)]))).toEqual([id(1)]);
    expect(selectedPlaceIds(intentFor([id(1), id(2)]))).toEqual([id(1), id(2)]);
  });

  it('adds an area, keeps filters, resets the page and persists in the URL', () => {
    const start = intentFor([id(1)], '&propertyType=house&minBedrooms=2&page=3');
    const next = addAreaToIntent(start, id(2));
    expect(next.geography).toEqual({
      level: 'canonical_place',
      canonicalPlaceId: id(1),
      canonicalPlaceIds: [id(1), id(2)],
    });
    expect(next.resultState.page).toBe(0);
    const url = new URL(generateIntentUrl(next), 'https://listify.test');
    expect(url.searchParams.getAll('canonicalPlaceId')).toEqual([id(1), id(2)]);
    expect(url.searchParams.get('propertyType')).toBe('house');
    expect(url.searchParams.get('minBedrooms')).toBe('2');
  });

  it('ignores a duplicate and never exceeds ten areas', () => {
    const two = intentFor([id(1), id(2)]);
    expect(addAreaToIntent(two, id(2))).toBe(two);
    let intent = intentFor([id(1)]);
    for (let n = 2; n <= 14; n += 1) intent = addAreaToIntent(intent, id(n));
    expect(selectedPlaceIds(intent)).toHaveLength(10);
    expect(selectedPlaceIds(intent)).toEqual(Array.from({ length: 10 }, (_, i) => id(i + 1)));
  });

  it('does nothing for a country-wide search', () => {
    const country = intentFor([]);
    expect(addAreaToIntent(country, id(1))).toBe(country);
  });
});
