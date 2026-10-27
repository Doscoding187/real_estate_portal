import { describe, expect, it } from 'vitest';

import { toCanonicalPlaceLocationSearchResult } from '../locationRouter';

describe('canonical Place location search adapter', () => {
  it('preserves the exact Place identity and projected URL', () => {
    const result = toCanonicalPlaceLocationSearchResult({
      kind: 'canonical_location',
      canonicalLocationId: 'pl-place-01-21f154cd5d0954c29ec7525f',
      label: 'Johannesburg',
      factualLevel: 'city',
      searchScopeKind: 'metro_city',
      display: { typeLabel: 'City', contextLabel: 'Gauteng' },
      provinceSlug: 'gauteng',
      citySlug: 'johannesburg',
      provinceName: 'Gauteng',
      canonicalPath: '/gauteng/johannesburg',
      source: 'canonical_geography',
      matchReason: 'exact',
    });

    expect(result).toMatchObject({
      id: 'pl-place-01-21f154cd5d0954c29ec7525f',
      name: 'Johannesburg',
      slug: 'johannesburg',
      type: 'city',
      canonicalLocationId: 'pl-place-01-21f154cd5d0954c29ec7525f',
      provinceName: 'Gauteng',
      canonicalPath: '/gauteng/johannesburg',
      selectionTypeLabel: 'City',
      selectionContextLabel: 'Gauteng',
    });
  });

  it('preserves administrative context without translating it to a legacy city handle', () => {
    expect(
      toCanonicalPlaceLocationSearchResult({
        kind: 'canonical_location',
        canonicalLocationId: 'pl-place-01-2bfd89dfb3b792235d492939',
        label: 'Hiltonia',
        factualLevel: 'suburb',
        searchScopeKind: 'locality',
        display: { typeLabel: 'Locality', contextLabel: 'City of Johannesburg' },
        provinceSlug: 'gauteng',
        suburbSlug: 'hiltonia',
        provinceName: 'Gauteng',
        cityName: 'City of Johannesburg',
        canonicalPath: '/gauteng/city-of-johannesburg/hiltonia',
        source: 'canonical_geography',
      }),
    ).toMatchObject({
      id: 'pl-place-01-2bfd89dfb3b792235d492939',
      type: 'suburb',
      cityName: 'City of Johannesburg',
      canonicalPath: '/gauteng/city-of-johannesburg/hiltonia',
    });

    expect(
      toCanonicalPlaceLocationSearchResult({
        kind: 'canonical_location',
        canonicalLocationId: 'city:12',
        label: 'Broken',
        factualLevel: 'suburb',
        searchScopeKind: 'locality',
        display: { typeLabel: 'Suburb' },
        provinceSlug: 'gauteng',
        citySlug: 'broken',
        canonicalPath: '/gauteng/broken',
        source: 'canonical_geography',
      }),
    ).toBeNull();
  });
});
