import { describe, expect, it } from 'vitest';

import { toLegacyLocationSearchResult } from '../locationRouter';

describe('governed location search legacy adapter', () => {
  it('preserves the canonical hierarchy and map metadata for city results', () => {
    const result = toLegacyLocationSearchResult({
      kind: 'canonical_location',
      canonicalLocationId: 'city:12',
      label: 'Johannesburg',
      factualLevel: 'city',
      searchScopeKind: 'metro_city',
      display: { typeLabel: 'City', contextLabel: 'Gauteng' },
      provinceSlug: 'gauteng',
      citySlug: 'johannesburg',
      parentCanonicalLocationId: 'province:1',
      provinceName: 'Gauteng',
      provinceCode: 'GP',
      latitude: '-26.2041',
      longitude: '28.0473',
      isMetro: 0,
      canonicalPath: '/gauteng/johannesburg',
      source: 'canonical_geography',
      matchReason: 'exact',
    });

    expect(result).toMatchObject({
      id: 12,
      name: 'Johannesburg',
      slug: 'johannesburg',
      type: 'city',
      canonicalLocationId: 'city:12',
      provinceId: 1,
      provinceName: 'Gauteng',
      provinceCode: 'GP',
      latitude: '-26.2041',
      longitude: '28.0473',
      isMetro: 0,
      canonicalPath: '/gauteng/johannesburg',
      selectionTypeLabel: 'City',
      selectionContextLabel: 'Gauteng',
    });
  });

  it('maps a suburb parent to the city identity and rejects malformed results', () => {
    expect(
      toLegacyLocationSearchResult({
        kind: 'canonical_location',
        canonicalLocationId: 'suburb:991',
        label: 'Isando',
        factualLevel: 'suburb',
        searchScopeKind: 'locality',
        display: { typeLabel: 'Suburb', contextLabel: 'Kempton Park' },
        provinceSlug: 'gauteng',
        citySlug: 'kempton-park',
        suburbSlug: 'isando',
        parentCanonicalLocationId: 'city:77',
        provinceName: 'Gauteng',
        cityName: 'Kempton Park',
        postalCode: '1619',
        canonicalPath: '/gauteng/kempton-park/isando',
        source: 'canonical_geography',
      }),
    ).toMatchObject({
      id: 991,
      type: 'suburb',
      cityId: 77,
      cityName: 'Kempton Park',
      postalCode: '1619',
    });

    expect(
      toLegacyLocationSearchResult({
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
