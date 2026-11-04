import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildDiscoverBrowseHref,
  buildDiscoverCardHref,
  DISCOVER_PROPERTY_TYPE_BY_LABEL,
} from '@/lib/publicDiscoveryRoutes';
import type { CanonicalPlaceSelection } from '@/components/location/CanonicalPlaceSelector';

const capeTown: CanonicalPlaceSelection = {
  canonicalPlaceId: 'pl-place-01-000000000000000000000001',
  label: 'Cape Town',
  placeType: 'city',
  scope: 'metro_city',
  administrativeContext: 'Western Cape',
};

function parseRelativeUrl(value: string) {
  return new URL(value, 'https://property-listify.local');
}

describe('public discovery route authority', () => {
  it('maps visible property cards to supported public search categories', () => {
    expect(DISCOVER_PROPERTY_TYPE_BY_LABEL).toEqual({
      Houses: 'house',
      Apartments: 'apartment',
      Townhouses: 'townhouse',
      Villas: 'villa',
      'Cluster Homes': 'cluster_home',
      Farms: 'farm',
    });
  });

  it('uses only the selected canonical Place ID for sale and rent geography', () => {
    const sale = parseRelativeUrl(buildDiscoverBrowseHref('sale', capeTown));
    const rent = parseRelativeUrl(buildDiscoverBrowseHref('rent', capeTown));

    expect(sale.pathname).toBe('/property-for-sale');
    expect(rent.pathname).toBe('/property-to-rent');
    for (const url of [sale, rent]) {
      expect(url.searchParams.get('canonicalPlaceId')).toBe(capeTown.canonicalPlaceId);
      for (const key of ['city', 'province', 'suburb', 'locationId', 'locationIds']) {
        expect(url.searchParams.has(key)).toBe(false);
      }
    }
  });

  it('uses supported property categories and leaves display labels out of geography', () => {
    const villa = parseRelativeUrl(buildDiscoverCardHref('Villas', 'sale', capeTown));
    const cluster = parseRelativeUrl(buildDiscoverCardHref('Cluster Homes', 'sale', capeTown));
    const farm = parseRelativeUrl(buildDiscoverCardHref('Farms', 'sale', capeTown));

    expect(villa.searchParams.get('propertyType')).toBe('villa');
    expect(cluster.searchParams.get('propertyType')).toBe('cluster_home');
    expect(farm.searchParams.get('propertyType')).toBe('farm');
    for (const url of [villa, cluster, farm]) {
      expect(url.searchParams.get('canonicalPlaceId')).toBe(capeTown.canonicalPlaceId);
      expect(url.searchParams.has('search')).toBe(false);
    }
  });

  it('does not present narrower categories than canonical search can distinguish', () => {
    expect(DISCOVER_PROPERTY_TYPE_BY_LABEL).not.toHaveProperty('Office Spaces');
    expect(DISCOVER_PROPERTY_TYPE_BY_LABEL).not.toHaveProperty('Shops');
    expect(DISCOVER_PROPERTY_TYPE_BY_LABEL).not.toHaveProperty('Penthouses');
  });

  it('fails closed for development browse without a canonical Place ID', () => {
    const missing = parseRelativeUrl(buildDiscoverBrowseHref('developments'));
    const browse = parseRelativeUrl(buildDiscoverBrowseHref('developments', capeTown));
    const ready = parseRelativeUrl(buildDiscoverCardHref('Ready to Move', 'developments', capeTown));

    expect(missing.pathname).toBe('/new-developments');
    expect(missing.searchParams.get('searchError')).toBe('canonical-place-required');
    for (const url of [browse, ready]) {
      expect(url.pathname).toBe('/new-developments');
      expect(url.searchParams.get('canonicalPlaceId')).toBe(capeTown.canonicalPlaceId);
      expect(url.searchParams.has('search')).toBe(false);
      expect(url.searchParams.has('type')).toBe(false);
      expect(url.searchParams.has('status')).toBe(false);
    }
  });

  it('keeps unscoped sale browse country-wide without inferring a place from labels', () => {
    const browse = parseRelativeUrl(buildDiscoverBrowseHref('sale'));
    expect(browse.pathname).toBe('/property-for-sale');
    expect(browse.searchParams.has('canonicalPlaceId')).toBe(false);
    expect(browse.searchParams.has('city')).toBe(false);
    expect(browse.searchParams.has('province')).toBe(false);
  });

  it('connects DiscoverProperties to canonical route builders', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'client/src/components/DiscoverProperties.tsx'),
      'utf8',
    );

    expect(source).toContain('buildDiscoverBrowseHref');
    expect(source).toContain('buildDiscoverCardHref');
    expect(source).toMatch(/href=\{buildDiscoverCardHref\(/);
    expect(source).not.toContain('CITY_PROVINCE_MAP');
    expect(source).not.toContain('setSelectedCity');
    expect(source).not.toContain("type: 'Office Spaces'");
    expect(source).not.toContain("type: 'Shops'");
    expect(source).not.toContain("type: 'Penthouses'");
  });
});
