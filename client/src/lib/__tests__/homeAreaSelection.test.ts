import { describe, expect, it } from 'vitest';
import { needsHomeAreaClarification } from '@/lib/homeAreaSelection';
import { hasCanonicalLocationIdentity } from '@/lib/locationDiscovery';
import { buildSelectedDiscoverHref } from '@/lib/publicDiscoveryRoutes';
import { EMPTY_HOME_SEARCH_FILTERS } from '@/contexts/HomeSearchContext';
import type { LocationNode } from '@/types/location';

const city: LocationNode = {
  id: 'pl-place-01-000000000000000000000001',
  canonicalLocationId: 'pl-place-01-000000000000000000000001',
  factualType: 'city',
  type: 'city',
  name: 'Johannesburg',
  slug: 'johannesburg',
  provinceSlug: 'gauteng',
  canonicalPath: '/gauteng/johannesburg',
};

const locality: LocationNode = {
  id: 'pl-place-01-000000000000000000000002',
  canonicalLocationId: 'pl-place-01-000000000000000000000002',
  factualType: 'suburb',
  type: 'suburb',
  name: 'Rosebank',
  slug: 'rosebank',
  provinceSlug: 'gauteng',
  citySlug: 'johannesburg',
  parentCanonicalLocationId: city.canonicalLocationId,
  canonicalPath: '/gauteng/johannesburg/rosebank',
};

describe('homepage Place selection and handoff', () => {
  it('asks for a narrower choice after province or city selection', () => {
    expect(needsHomeAreaClarification({ locations: [] })).toBe(true);
    expect(needsHomeAreaClarification({ locations: [city] })).toBe(true);
    expect(needsHomeAreaClarification({ locations: [locality] })).toBe(false);
  });

  it('accepts Place IDs and rejects the retired runtime geography IDs', () => {
    expect(hasCanonicalLocationIdentity(city)).toBe(true);
    expect(
      hasCanonicalLocationIdentity({ ...city, id: 'city:12', canonicalLocationId: 'city:12' }),
    ).toBe(false);
  });

  it('uses the exact Place ID for Buy and Rent browse', () => {
    for (const journey of ['sale', 'rent'] as const) {
      const href = buildSelectedDiscoverHref(
        journey,
        { locations: [locality] },
        EMPTY_HOME_SEARCH_FILTERS,
      );
      const url = new URL(href!, 'http://localhost');
      expect(url.searchParams.get('canonicalPlaceId')).toBe(locality.canonicalLocationId);
      for (const key of ['locationId', 'locationIds', 'city', 'province', 'suburb']) {
        expect(url.searchParams.has(key)).toBe(false);
      }
    }
  });

  it('requires a separate canonical Place selection for Development browse', () => {
    expect(
      buildSelectedDiscoverHref('developments', { locations: [city] }, EMPTY_HOME_SEARCH_FILTERS),
    ).toBeNull();

    const href = buildSelectedDiscoverHref(
      'developments',
      { locations: [] },
      EMPTY_HOME_SEARCH_FILTERS,
      undefined,
      'pl-place-01-000000000000000000000003',
    );
    expect(href).toContain('canonicalPlaceId=pl-place-01-000000000000000000000003');
  });

  it('does not infer a Place from display labels or browse with mixed selections', () => {
    expect(buildSelectedDiscoverHref('sale', { locations: [] }, EMPTY_HOME_SEARCH_FILTERS)).toBeNull();
    expect(
      buildSelectedDiscoverHref('sale', { locations: [city, locality] }, EMPTY_HOME_SEARCH_FILTERS),
    ).toBeNull();
  });
});
