import { describe, expect, it } from 'vitest';
import {
  buildTransactionalGeographyHref,
  createCanonicalSearchLocation,
} from '@/lib/geographySearchHandoff';
import { resolveSearchIntent } from '@/lib/searchIntent';

const johannesburgId = 'pl-place-01-21f154cd5d0954c29ec7525f';
const hiltoniaId = 'pl-place-01-2bfd89dfb3b792235d492939';

function paramsFor(href: string) {
  return new URL(href, 'https://listify.test').searchParams;
}

describe('canonical Place transactional handoff', () => {
  it.each(['shared_living', 'developments', 'plot_land', 'commercial', 'unknown', '', null])(
    'rejects unsupported journey %s',
    journey => {
      expect(
        buildTransactionalGeographyHref({
          journey: journey as never,
          scope: { kind: 'metro_city', canonicalLocationId: johannesburgId },
        }),
      ).toBeUndefined();
    },
  );

  it('uses only the Place identity for sale and rent search', () => {
    const sale = buildTransactionalGeographyHref({
      journey: 'buy',
      scope: { kind: 'metro_city', canonicalLocationId: johannesburgId },
    })!;
    const rent = buildTransactionalGeographyHref({
      journey: 'rent',
      scope: { kind: 'locality', canonicalLocationId: hiltoniaId },
    })!;

    expect(paramsFor(sale).get('canonicalPlaceId')).toBe(johannesburgId);
    expect(paramsFor(sale).get('locationId')).toBeNull();
    expect(paramsFor(sale).get('province')).toBeNull();
    expect(paramsFor(sale).get('city')).toBeNull();
    expect(paramsFor(rent).get('canonicalPlaceId')).toBe(hiltoniaId);
    expect(paramsFor(rent).get('suburb')).toBeNull();
  });

  it('rejects Search Area in the canonical Place transactional handoff', () => {
    expect(
      buildTransactionalGeographyHref({
        journey: 'buy',
        scope: { kind: 'search_area', searchAreaId: 'johannesburg-sandton' } as never,
      }),
    ).toBeUndefined();
  });

  it('rejects numeric runtime ids and OR Place selections', () => {
    expect(
      buildTransactionalGeographyHref({
        journey: 'buy',
        scope: { kind: 'metro_city', canonicalLocationId: 'city:12' },
      }),
    ).toBeUndefined();
    expect(
      buildTransactionalGeographyHref({
        journey: 'buy',
        scope: {
          kind: 'multi_location',
          members: [
            { kind: 'locality', canonicalLocationId: hiltoniaId },
            { kind: 'locality', canonicalLocationId: johannesburgId },
          ],
        },
      }),
    ).toBeUndefined();
  });

  it('maps canonical location nodes without using labels or slugs as authority', () => {
    expect(
      createCanonicalSearchLocation({
        id: johannesburgId,
        canonicalLocationId: johannesburgId,
        type: 'city',
      }),
    ).toEqual({
      scope: { kind: 'metro_city', canonicalLocationId: johannesburgId },
    });
    expect(
      createCanonicalSearchLocation({
        id: 'Sandton',
        type: 'suburb',
      }),
    ).toBeUndefined();
  });

  it('round-trips only canonical Place identity through SearchIntent', () => {
    const href = buildTransactionalGeographyHref({
      journey: 'rent',
      scope: { kind: 'metro_city', canonicalLocationId: johannesburgId },
    })!;
    const url = new URL(href, 'https://listify.test');
    const intent = resolveSearchIntent(url.pathname, {}, url.searchParams);

    expect(intent.transactionType).toBe('to-rent');
    expect(intent.geography).toEqual({
      level: 'canonical_place',
      canonicalPlaceId: johannesburgId,
    });
  });
});
