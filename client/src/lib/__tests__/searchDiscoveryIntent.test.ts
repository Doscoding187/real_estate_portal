import { describe, expect, it } from 'vitest';

import { buildBuySearchUrl } from '../heroJourneySearch';
import { resolveSearchIntent } from '../searchIntent';
import type { LocationNode } from '@/types/location';

const midrand: LocationNode = {
  id: 'city:701',
  canonicalLocationId: 'city:701',
  factualLocationId: 'pl-gp-v01-0d7688adb9c7af392007',
  name: 'Midrand',
  slug: 'midrand',
  type: 'city',
  provinceSlug: 'gauteng',
  citySlug: 'midrand',
};

describe('collision-safe discovery selection handoff', () => {
  it('preserves the durable factual identity beside the runtime query handle', () => {
    const href = buildBuySearchUrl({ selectedLocations: [midrand] });
    const url = new URL(href, 'https://property-listify.test');

    expect(url.searchParams.get('locationId')).toBe('city:701');
    expect(url.searchParams.get('factualLocationId')).toBe('pl-gp-v01-0d7688adb9c7af392007');

    const intent = resolveSearchIntent(url.pathname, {}, url.searchParams);
    expect(intent.geography).toMatchObject({
      level: 'city',
      locationId: 'city:701',
      factualLocationId: 'pl-gp-v01-0d7688adb9c7af392007',
    });
  });

  it('does not make a preview Search Area selectable through the public URL handoff', async () => {
    const { buildTransactionalGeographyHref } = await import('../geographySearchHandoff');
    expect(
      buildTransactionalGeographyHref({
        journey: 'buy',
        scope: {
          kind: 'search_area',
          searchAreaId: 'pl-sa-gp-01da060bb6c5807438a654e9',
        },
        searchAreaAvailability: 'preview',
      }),
    ).toBeUndefined();
  });

  it.each([
    ['buy', 'for-sale'],
    ['rent', 'to-rent'],
  ] as const)(
    'serializes a public Search Area as a typed %s identity',
    async (journey, routeType) => {
      const { buildTransactionalGeographyHref } = await import('../geographySearchHandoff');
      const href = buildTransactionalGeographyHref({
        journey,
        scope: {
          kind: 'search_area',
          searchAreaId: 'pl-sa-gp-01da060bb6c5807438a654e9',
        },
        searchAreaAvailability: 'available',
        filters: { minPrice: journey === 'buy' ? 100000 : 5000 },
      });
      const url = new URL(href!, 'https://property-listify.test');

      expect(url.pathname).toBe(
        routeType === 'for-sale' ? '/property-for-sale' : '/property-to-rent',
      );
      expect(url.searchParams.get('searchAreaId')).toBe('pl-sa-gp-01da060bb6c5807438a654e9');
      expect(url.searchParams.get('locationId')).toBeNull();
      expect(url.searchParams.get('factualLocationId')).toBeNull();

      const intent = resolveSearchIntent(url.pathname, {}, url.searchParams);
      expect(intent).toMatchObject({
        transactionType: routeType,
        geography: {
          level: 'search_area',
          searchAreaId: 'pl-sa-gp-01da060bb6c5807438a654e9',
        },
        filters: { minPrice: journey === 'buy' ? 100000 : 5000 },
      });
    },
  );

  it('keeps factual Midrand and Midrand Search Area URLs observably distinct', async () => {
    const { buildTransactionalGeographyHref } = await import('../geographySearchHandoff');
    const factualHref = buildTransactionalGeographyHref({
      journey: 'buy',
      scope: { kind: 'metro_city', canonicalLocationId: 'city:701' },
      factualLocationId: 'pl-gp-v01-0d7688adb9c7af392007',
      context: { province: 'gauteng', city: 'midrand' },
    });
    const areaHref = buildTransactionalGeographyHref({
      journey: 'buy',
      scope: { kind: 'search_area', searchAreaId: 'pl-sa-gp-01da060bb6c5807438a654e9' },
      searchAreaAvailability: 'available',
    });

    expect(factualHref).not.toBe(areaHref);
    expect(
      new URL(factualHref!, 'https://property-listify.test').searchParams.get('factualLocationId'),
    ).toBe('pl-gp-v01-0d7688adb9c7af392007');
    expect(
      new URL(areaHref!, 'https://property-listify.test').searchParams.get('searchAreaId'),
    ).toBe('pl-sa-gp-01da060bb6c5807438a654e9');
  });
});
