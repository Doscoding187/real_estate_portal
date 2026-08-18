import { describe, expect, it } from 'vitest';
import { encodeCanonicalLocationId } from '@shared/locationAuthority';
import { buildDevelopmentsSearchUrl } from '@/lib/heroJourneySearch';
import { resolveSearchIntent } from '@/lib/searchIntent';

const johannesburg = {
  id: encodeCanonicalLocationId('city', 42),
  canonicalLocationId: encodeCanonicalLocationId('city', 42),
  slug: 'johannesburg',
  name: 'Johannesburg',
  type: 'city' as const,
  provinceSlug: 'gauteng',
  citySlug: 'johannesburg',
};

const pretoria = {
  id: encodeCanonicalLocationId('city', 77),
  canonicalLocationId: encodeCanonicalLocationId('city', 77),
  slug: 'pretoria',
  name: 'Pretoria',
  type: 'city' as const,
  provinceSlug: 'gauteng',
  citySlug: 'johannesburg',
};

describe('New Developments search intent', () => {
  it('serializes canonical geography and bounded development refinements', () => {
    const href = buildDevelopmentsSearchUrl({
      selectedLocations: [johannesburg],
      developmentType: 'residential',
      developmentStatus: 'selling',
      minPrice: '1000000',
      maxPrice: '2000000',
    });
    const url = new URL(href, 'https://property-listify.local');
    const intent = resolveSearchIntent('/new-developments', {}, url.searchParams);

    expect(url.pathname).toBe('/new-developments');
    expect(url.searchParams.get('locationId')).toBe(johannesburg.canonicalLocationId);
    expect(url.searchParams.get('developmentType')).toBe('residential');
    expect(url.searchParams.get('developmentStatus')).toBe('selling');
    expect(url.searchParams.get('minPrice')).toBe('1000000');
    expect(intent.transactionType).toBe('developments');
    expect(intent.geography.locationId).toBe(johannesburg.canonicalLocationId);
    expect(intent.filters.maxPrice).toBe(2000000);
  });

  it('preserves compatible multi-location intent without converting it to a unit search', () => {
    const href = buildDevelopmentsSearchUrl({ selectedLocations: [johannesburg, pretoria] });
    const url = new URL(href, 'https://property-listify.local');
    const intent = resolveSearchIntent('/new-developments', {}, url.searchParams);

    expect(intent.transactionType).toBe('developments');
    expect(intent.geography.level).toBe('multi_location');
    expect(intent.geography.locationIds).toEqual(
      [johannesburg.canonicalLocationId, pretoria.canonicalLocationId].sort(),
    );
    expect(url.searchParams.get('listingType')).toBeNull();
  });

  it('fails closed when a homepage selection has no canonical location identity', () => {
    const href = buildDevelopmentsSearchUrl({
      selectedLocations: [
        {
          id: 'google-place-id',
          slug: 'johannesburg',
          name: 'Johannesburg',
          type: 'city',
        },
      ],
    });

    expect(href).toBe('/new-developments?searchError=canonical-location-required');
  });

  it('keeps legacy text handoff state readable until the server resolves it canonically', () => {
    const intent = resolveSearchIntent(
      '/new-developments',
      {},
      new URLSearchParams('search=Cape%20Town&minPrice=900000'),
    );

    expect(intent.transactionType).toBe('developments');
    expect(intent.filters.search).toBe('Cape Town');
    expect(intent.filters.minPrice).toBe(900000);
  });
});
