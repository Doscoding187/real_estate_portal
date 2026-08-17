import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildDiscoverBrowseHref,
  buildDiscoverCardHref,
  DISCOVER_PROPERTY_TYPE_BY_LABEL,
} from '@/lib/publicDiscoveryRoutes';
import { CITY_PROVINCE_MAP } from '@/lib/locationUtils';

function parseRelativeUrl(value: string) {
  return new URL(value, 'https://property-listify.local');
}

describe('public discovery route authority', () => {
  it('maps every visible property card to a supported public search category', () => {
    expect(DISCOVER_PROPERTY_TYPE_BY_LABEL).toEqual({
      Houses: 'house',
      Apartments: 'apartment',
      Townhouses: 'townhouse',
      Villas: 'villa',
      'Cluster Homes': 'cluster_home',
      Farms: 'farm',
    });
  });

  it('builds canonical sale and rent routes with known location context', () => {
    const sale = parseRelativeUrl(buildDiscoverBrowseHref('sale', 'Cape Town'));
    const rent = parseRelativeUrl(buildDiscoverBrowseHref('rent', 'Cape Town'));

    expect(sale.pathname).toBe('/property-for-sale');
    expect(rent.pathname).toBe('/property-to-rent');

    for (const url of [sale, rent]) {
      expect(url.searchParams.get('city')).toBe('cape-town');
      expect(url.searchParams.get('province')).toBe(CITY_PROVINCE_MAP['cape-town']);
    }
  });

  it('uses supported property types rather than display-label slugification', () => {
    const villa = parseRelativeUrl(buildDiscoverCardHref('Villas', 'sale', 'Cape Town'));
    const cluster = parseRelativeUrl(buildDiscoverCardHref('Cluster Homes', 'sale', 'Cape Town'));
    const farm = parseRelativeUrl(buildDiscoverCardHref('Farms', 'sale', 'Cape Town'));

    expect(villa.pathname).toBe('/property-for-sale');
    expect(villa.searchParams.get('propertyType')).toBe('villa');

    expect(cluster.searchParams.get('propertyType')).toBe('cluster_home');
    expect(farm.searchParams.get('propertyType')).toBe('farm');

    expect(villa.href).not.toContain('villas');
    expect(cluster.href).not.toContain('cluster-homes');
    expect(farm.href).not.toContain('farms');
  });

  it('does not present narrower categories than the canonical search can distinguish', () => {
    expect(DISCOVER_PROPERTY_TYPE_BY_LABEL).not.toHaveProperty('Office Spaces');
    expect(DISCOVER_PROPERTY_TYPE_BY_LABEL).not.toHaveProperty('Shops');
    expect(DISCOVER_PROPERTY_TYPE_BY_LABEL).not.toHaveProperty('Penthouses');
  });

  it('keeps development cards on the canonical root without invented filters', () => {
    const browse = parseRelativeUrl(buildDiscoverBrowseHref('developments', 'Cape Town'));
    const ready = parseRelativeUrl(
      buildDiscoverCardHref('Ready to Move', 'developments', 'Cape Town'),
    );
    const luxury = parseRelativeUrl(
      buildDiscoverCardHref('Luxury Projects', 'developments', 'Cape Town'),
    );

    for (const url of [browse, ready, luxury]) {
      expect(url.pathname).toBe('/new-developments');
      expect(url.searchParams.get('search')).toBe('Cape Town');
      expect(url.searchParams.has('type')).toBe(false);
      expect(url.searchParams.has('status')).toBe(false);
    }
  });

  it('connects DiscoverProperties to canonical builders and removes stale routes', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'client/src/components/DiscoverProperties.tsx'),
      'utf8',
    );

    expect(source).toContain('buildDiscoverBrowseHref');
    expect(source).toContain('buildDiscoverCardHref');

    expect(source).not.toContain('/properties?action=sale');
    expect(source).not.toContain('/properties?action=rent');
    expect(source).not.toContain('href="/developments"');
    expect(source).not.toContain('window.location.assign(`/developments');
    expect(source).not.toContain("propertyType.toLowerCase().replace(/\\s+/g, '-')");
    expect(source).toContain("type: 'Villas'");
    expect(source).toContain("type: 'Cluster Homes'");
    expect(source).toContain("type: 'Farms'");
    expect(source).not.toContain("type: 'Office Spaces'");
    expect(source).not.toContain("type: 'Shops'");
    expect(source).not.toContain("type: 'Penthouses'");
  });
});
