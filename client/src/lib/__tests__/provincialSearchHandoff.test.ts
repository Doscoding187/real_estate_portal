import { describe, expect, it } from 'vitest';
import { resolveSearchIntent } from '@/lib/searchIntent';
import { buildProvincialJourneyHref } from '@/lib/provincialSearchHandoff';
import type { LocationNode } from '@/types/location';

const province: LocationNode = {
  id: 'province:1',
  canonicalLocationId: 'province:1',
  name: 'Gauteng',
  slug: 'gauteng',
  type: 'province',
  provinceSlug: 'gauteng',
};

const westernCapeProvince: LocationNode = {
  id: 'province:2',
  canonicalLocationId: 'province:2',
  name: 'Western Cape',
  slug: 'western-cape',
  type: 'province',
  provinceSlug: 'western-cape',
};

const capeTown: LocationNode = {
  id: 'city:4',
  canonicalLocationId: 'city:4',
  name: 'Cape Town',
  slug: 'cape-town',
  type: 'city',
  provinceSlug: 'western-cape',
};

const sandton: LocationNode = {
  id: 'suburb:34',
  canonicalLocationId: 'suburb:34',
  name: 'Sandton',
  slug: 'sandton',
  type: 'suburb',
  provinceSlug: 'gauteng',
  citySlug: 'johannesburg',
};

const rosebank: LocationNode = {
  id: 'suburb:35',
  canonicalLocationId: 'suburb:35',
  name: 'Rosebank',
  slug: 'rosebank',
  type: 'suburb',
  provinceSlug: 'gauteng',
  citySlug: 'johannesburg',
};

function parseHref(href: string) {
  const url = new URL(href, 'https://listify.test');
  return { url, intent: resolveSearchIntent(url.pathname, {}, url.searchParams) };
}

describe('provincial journey handoff', () => {
  it('keeps a neutral province scope until Buy is explicitly chosen', () => {
    const href = buildProvincialJourneyHref({ journey: 'buy', province });

    expect(href).toBe('/property-for-sale?locationId=province%3A1&province=gauteng');
  });

  it('preserves Rent and a canonical locality through the handoff and round trip', () => {
    const href = buildProvincialJourneyHref({
      journey: 'rent',
      province,
      selectedLocations: [sandton],
      filters: { propertyType: 'apartment', maxPrice: 20_000 },
    });
    expect(href).toBe(
      '/property-to-rent?propertyType=apartment&maxPrice=20000&locationId=suburb%3A34&suburb=sandton&city=johannesburg&province=gauteng',
    );

    const { intent } = parseHref(href!);
    expect(intent.transactionType).toBe('to-rent');
    expect(intent.geography).toMatchObject({
      level: 'suburb',
      locationId: 'suburb:34',
      province: 'gauteng',
      city: 'johannesburg',
      suburb: 'sandton',
    });
    expect(intent.filters).toMatchObject({
      listingType: 'rent',
      propertyType: 'apartment',
      maxPrice: 20_000,
    });
  });

  it('reuses the same canonical handoff for Western Cape and Cape Town', () => {
    const buyHref = buildProvincialJourneyHref({
      journey: 'buy',
      province: westernCapeProvince,
    });
    expect(buyHref).toBe('/property-for-sale?locationId=province%3A2&province=western-cape');

    const rentHref = buildProvincialJourneyHref({
      journey: 'rent',
      province: westernCapeProvince,
      selectedLocations: [capeTown],
      filters: { propertyType: 'apartment', maxPrice: 20_000 },
    });
    expect(rentHref).toBe(
      '/property-to-rent?propertyType=apartment&maxPrice=20000&locationId=city%3A4&city=cape-town&province=western-cape',
    );

    const { intent } = parseHref(rentHref!);
    expect(intent.transactionType).toBe('to-rent');
    expect(intent.geography).toMatchObject({
      level: 'city',
      locationId: 'city:4',
      province: 'western-cape',
      city: 'cape-town',
    });
  });

  it('preserves deliberate sibling OR choices without widening to Johannesburg', () => {
    const href = buildProvincialJourneyHref({
      journey: 'rent',
      province,
      selectedLocations: [sandton, rosebank],
    });
    const { url, intent } = parseHref(href!);

    expect(url.pathname).toBe('/property-to-rent');
    expect(url.searchParams.getAll('locationIds')).toEqual(['suburb:34', 'suburb:35']);
    expect(url.searchParams.get('city')).toBeNull();
    expect(url.searchParams.get('suburb')).toBeNull();
    expect(intent.transactionType).toBe('to-rent');
    expect(intent.geography).toMatchObject({
      level: 'multi_location',
      locationIds: ['suburb:34', 'suburb:35'],
    });
  });

  it('does not serialize deferred journeys or unsupported Rent controls', () => {
    expect(
      buildProvincialJourneyHref({
        journey: 'shared_living',
        province,
      }),
    ).toBeUndefined();

    const href = buildProvincialJourneyHref({
      journey: 'rent',
      province,
      filters: {
        propertyType: 'house',
        maxPrice: 10_000,
        ...({ furnished: true, leaseTerm: '12 months' } as Record<string, unknown>),
      },
    });
    expect(href).not.toContain('furnished');
    expect(href).not.toContain('leaseTerm');
  });
});
