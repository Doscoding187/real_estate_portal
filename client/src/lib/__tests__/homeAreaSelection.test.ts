import { describe, expect, it } from 'vitest';
import { homeAreaFromDiscovery, needsHomeAreaClarification } from '@/lib/homeAreaSelection';
import { buildSelectedDiscoverHref } from '@/lib/publicDiscoveryRoutes';
import { EMPTY_HOME_SEARCH_FILTERS } from '@/contexts/HomeSearchContext';
import type {
  SearchAreaDiscoveryResult,
  CanonicalLocationDiscoveryResult,
} from '@shared/searchDiscovery';
const city: CanonicalLocationDiscoveryResult = {
  kind: 'canonical_location',
  canonicalLocationId: 'city:12',
  factualLevel: 'city',
  searchScopeKind: 'metro_city',
  label: 'Johannesburg',
  provinceSlug: 'gauteng',
  citySlug: 'johannesburg',
  display: { typeLabel: 'City' },
  canonicalPath: '/gauteng/johannesburg',
  source: 'canonical_geography',
};
const area: SearchAreaDiscoveryResult = {
  kind: 'search_area',
  searchAreaId: 'metro-north',
  label: 'Metro North',
  display: { typeLabel: 'Property market area' },
  lifecycle: 'active',
  availability: 'available',
  publicEligible: true,
  supportedJourneys: ['buy', 'rent'],
  source: 'search_area',
};
describe('Homepage area identity and handoff', () => {
  it('clarifies absent, city and province scope but not an explicitly selected locality or market area', () => {
    expect(needsHomeAreaClarification({ locations: [], searchArea: null })).toBe(true);
    expect(needsHomeAreaClarification(homeAreaFromDiscovery(city, 'buy')!)).toBe(true);
    expect(
      needsHomeAreaClarification(
        homeAreaFromDiscovery(
          {
            ...city,
            canonicalLocationId: 'suburb:34',
            factualLevel: 'suburb',
            suburbSlug: 'rosebank',
            searchScopeKind: 'locality',
          },
          'buy',
        )!,
      ),
    ).toBe(false);
    expect(needsHomeAreaClarification(homeAreaFromDiscovery(area, 'buy')!)).toBe(false);
  });
  it('rejects unavailable, private or unsupported market areas and mismatched location identities', () => {
    expect(
      homeAreaFromDiscovery({ ...area, availability: 'preview', publicEligible: false }, 'buy'),
    ).toBeNull();
    expect(homeAreaFromDiscovery(area, 'developments')).toBeNull();
    expect(
      homeAreaFromDiscovery({ ...city, canonicalLocationId: 'google-provider-id' }, 'buy'),
    ).toBeNull();
    expect(homeAreaFromDiscovery({ ...city, factualLevel: 'suburb' }, 'buy')).toBeNull();
  });
  it('clarifies a factual town without rewriting its city runtime handle', () => {
    const selection = homeAreaFromDiscovery(
      { ...city, factualType: 'town', label: 'Rosebank' },
      'buy',
    )!;
    expect(needsHomeAreaClarification(selection)).toBe(true);
    const url = new URL(
      buildSelectedDiscoverHref('sale', selection, EMPTY_HOME_SEARCH_FILTERS)!,
      'http://localhost',
    );
    expect(url.searchParams.get('locationId')).toBe('city:12');
  });
  it('does not convert municipality context into an executable city scope', () => {
    for (const factualType of [
      'local_municipality',
      'district_municipality',
      'metropolitan_municipality',
    ]) {
      expect(
        homeAreaFromDiscovery({ ...city, factualType, label: 'Ekurhuleni' }, 'buy'),
      ).toBeNull();
    }
  });
  it('preserves category and budget using existing adapters, with one geography authority', () => {
    const selection = homeAreaFromDiscovery(area, 'buy')!;
    const url = new URL(
      buildSelectedDiscoverHref(
        'sale',
        selection,
        { ...EMPTY_HOME_SEARCH_FILTERS, priceMax: '2000000', minBedrooms: '2' },
        'Houses',
      )!,
      'http://localhost',
    );
    expect(url.pathname).toBe('/property-for-sale');
    expect(url.searchParams.get('searchAreaId')).toBe(area.searchAreaId);
    expect(url.searchParams.get('propertyType')).toBe('house');
    expect(url.searchParams.get('maxPrice')).toBe('2000000');
    expect(url.searchParams.get('minBedrooms')).toBe('2');
    for (const key of [
      'locationId',
      'locationIds',
      'city',
      'province',
      'suburb',
      'canonicalPlaceId',
    ])
      expect(url.searchParams.has(key)).toBe(false);
    const rent = new URL(
      buildSelectedDiscoverHref(
        'rent',
        homeAreaFromDiscovery(city, 'rent')!,
        { ...EMPTY_HOME_SEARCH_FILTERS, budgetMax: '10000' },
        'Apartments',
      )!,
      'http://localhost',
    );
    expect(rent.pathname).toBe('/property-to-rent');
    expect(rent.searchParams.get('locationId')).toBe('city:12');
    expect(rent.searchParams.get('maxPrice')).toBe('10000');
    expect(
      buildSelectedDiscoverHref(
        'sale',
        { locations: [], searchArea: null },
        EMPTY_HOME_SEARCH_FILTERS,
      ),
    ).toBeNull();
  });
});
