import { describe, expect, it } from 'vitest';
import {
  buildTransactionalGeographyHref,
  createCanonicalSearchLocation,
  createCanonicalSearchScope,
} from '@/lib/geographySearchHandoff';
import { resolveSearchIntent } from '@/lib/searchIntent';

function paramsFor(href: string) {
  return new URL(href, 'https://listify.test').searchParams;
}

describe('geography to transactional search handoff', () => {
  it.each(['shared_living', 'developments', 'plot_land', 'commercial', 'unknown', '', null])(
    'rejects unsupported runtime journey %s instead of creating a Rent URL',
    journey => {
      const href = buildTransactionalGeographyHref({
        journey: journey as never,
        scope: { kind: 'metro_city', canonicalLocationId: 'city:12' },
      });

      expect(href).toBeUndefined();
    },
  );

  it('hands a province and explicit Buy journey to the canonical sale root', () => {
    const href = buildTransactionalGeographyHref({
      journey: 'buy',
      scope: { kind: 'province', canonicalLocationId: 'province:1' },
      context: { province: 'gauteng' },
    });

    expect(href).toBe('/property-for-sale?locationId=province%3A1&province=gauteng');
  });

  it('preserves an explicit Rent journey and metro/city identity', () => {
    const href = buildTransactionalGeographyHref({
      journey: 'rent',
      scope: { kind: 'metro_city', canonicalLocationId: 'city:12' },
      context: { province: 'gauteng', city: 'johannesburg' },
    })!;
    const parsed = new URL(href, 'https://listify.test');
    const params = parsed.searchParams;

    expect(parsed.pathname).toBe('/property-to-rent');
    expect(params.get('locationId')).toBe('city:12');
    expect(params.get('city')).toBe('johannesburg');
    expect(params.get('province')).toBe('gauteng');
  });

  it('hands a precise locality to the canonical Buy root', () => {
    const params = paramsFor(
      buildTransactionalGeographyHref({
        journey: 'buy',
        scope: { kind: 'locality', canonicalLocationId: 'suburb:42' },
        context: { province: 'gauteng', city: 'johannesburg', suburb: 'bryanston' },
      })!,
    );

    expect(params.get('locationId')).toBe('suburb:42');
    expect(params.get('suburb')).toBe('bryanston');
    expect(params.get('city')).toBe('johannesburg');
  });

  it('serializes only the stable Search Area ID and never member arrays', () => {
    const href = buildTransactionalGeographyHref({
      journey: 'buy',
      scope: { kind: 'search_area', searchAreaId: 'johannesburg-sandton' },
      searchAreaAvailability: 'available',
      context: { province: 'gauteng', city: 'johannesburg' },
      filters: {
        searchAreaId: 'browser-defined-area',
        locationIds: ['suburb:34', 'suburb:35'],
        locations: ['suburb:34'],
        propertyType: 'house',
      },
    });

    const params = paramsFor(href!);
    expect(params.get('searchAreaId')).toBe('johannesburg-sandton');
    expect(params.get('propertyType')).toBe('house');
    expect(params.get('locationIds')).toBeNull();
    expect(params.get('locations')).toBeNull();
    expect(params.get('province')).toBeNull();
    expect(params.get('city')).toBeNull();
  });

  it('supports an optional canonical locality refinement inside a Search Area', () => {
    const params = paramsFor(
      buildTransactionalGeographyHref({
        journey: 'rent',
        scope: { kind: 'search_area', searchAreaId: 'johannesburg-sandton' },
        searchAreaAvailability: 'available',
        localityRefinementId: 'suburb:34',
      })!,
    );

    expect(params.get('searchAreaId')).toBe('johannesburg-sandton');
    expect(params.get('locationId')).toBe('suburb:34');
  });

  it('fails closed for missing journeys, preview areas and invalid refinements', () => {
    expect(
      buildTransactionalGeographyHref({
        scope: { kind: 'province', canonicalLocationId: 'province:1' },
      }),
    ).toBeUndefined();
    expect(
      buildTransactionalGeographyHref({
        journey: 'buy',
        scope: { kind: 'search_area', searchAreaId: 'johannesburg-sandton' },
        searchAreaAvailability: 'preview',
      }),
    ).toBeUndefined();
    expect(
      buildTransactionalGeographyHref({
        journey: 'buy',
        scope: { kind: 'search_area', searchAreaId: 'johannesburg-sandton' },
        searchAreaAvailability: 'available',
        localityRefinementId: 'city:12',
      }),
    ).toBeUndefined();
  });

  it('serializes canonical multi-location scope IDs without member arrays', () => {
    const href = buildTransactionalGeographyHref({
      journey: 'buy',
      scope: {
        kind: 'multi_location',
        members: [
          { kind: 'locality', canonicalLocationId: 'suburb:35' },
          { kind: 'locality', canonicalLocationId: 'suburb:34' },
        ],
      },
    })!;
    const parsed = new URL(href, 'https://listify.test');

    expect(parsed.pathname).toBe('/property-for-sale');
    expect(parsed.searchParams.getAll('locationIds')).toEqual(['suburb:34', 'suburb:35']);
    expect(parsed.searchParams.get('memberCanonicalLocationIds')).toBeNull();
  });

  it('rejects a preview Search Area inside a multi-location handoff', () => {
    expect(
      buildTransactionalGeographyHref({
        journey: 'rent',
        scope: {
          kind: 'multi_location',
          members: [
            { kind: 'search_area', searchAreaId: 'johannesburg-sandton' },
            { kind: 'search_area', searchAreaId: 'johannesburg-rosebank' },
          ],
        },
        searchAreaAvailabilityById: {
          'johannesburg-sandton': 'preview',
          'johannesburg-rosebank': 'available',
        },
      }),
    ).toBeUndefined();
  });

  it('maps canonical LocationNode identity without making names authoritative', () => {
    expect(
      createCanonicalSearchLocation({
        id: 'city:12',
        canonicalLocationId: 'city:12',
        type: 'city',
        slug: 'johannesburg',
        provinceSlug: 'gauteng',
        citySlug: 'johannesburg',
      }),
    ).toEqual({
      scope: { kind: 'metro_city', canonicalLocationId: 'city:12' },
      context: { province: 'gauteng', city: 'johannesburg' },
    });

    expect(
      createCanonicalSearchLocation({
        id: 'Sandton',
        type: 'suburb',
        slug: 'sandton',
        provinceSlug: 'gauteng',
        citySlug: 'johannesburg',
      }),
    ).toBeUndefined();
  });

  it('round-trips the generated handoff through SearchIntent', () => {
    const href = buildTransactionalGeographyHref({
      journey: 'rent',
      scope: { kind: 'metro_city', canonicalLocationId: 'city:12' },
      context: { province: 'gauteng', city: 'johannesburg' },
    })!;
    const parsed = new URL(href, 'https://listify.test');
    const intent = resolveSearchIntent(parsed.pathname, {}, parsed.searchParams);

    expect(intent.transactionType).toBe('to-rent');
    expect(intent.geography).toMatchObject({
      level: 'city',
      locationId: 'city:12',
      city: 'johannesburg',
      province: 'gauteng',
    });
  });

  it('normalizes canonical IDs before handoff', () => {
    expect(createCanonicalSearchScope('suburb-42')).toEqual({
      kind: 'locality',
      canonicalLocationId: 'suburb:42',
    });
  });
});
