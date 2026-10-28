import { describe, expect, it } from 'vitest';
import { buildBuySearchUrl } from '../heroJourneySearch';
import { resolveSearchIntent } from '../searchIntent';
import type { LocationNode } from '@/types/location';

const midrand: LocationNode = {
  canonicalPlaceId: 'pl-place-01-0614f47352b29b431aee83fd',
  name: 'Midrand',
  slug: 'midrand',
  type: 'city',
  provinceSlug: 'gauteng',
  citySlug: 'midrand',
  canonicalPath: '/gauteng/midrand',
};

describe('Place Authority geography selection handoff', () => {
  it('carries one canonical Place ID into transactional search', () => {
    const href = buildBuySearchUrl({ selectedLocations: [midrand] });
    const url = new URL(href, 'https://property-listify.test');

    expect(url.searchParams.get('canonicalPlaceId')).toBe(midrand.canonicalPlaceId);
    expect(url.searchParams.get('locationId')).toBeNull();
    expect(url.searchParams.get('factualLocationId')).toBeNull();

    const intent = resolveSearchIntent(url.pathname, {}, url.searchParams);
    expect(intent.geography).toMatchObject({
      level: 'canonical_place',
      canonicalPlaceId: midrand.canonicalPlaceId,
    });
    expect(intent.geography.locationId).toBeUndefined();
  });

  it('rejects Search Area input because only canonical Place scope is executable', async () => {
    const { buildTransactionalGeographyHref } = await import('../geographySearchHandoff');
    expect(
      buildTransactionalGeographyHref({
        journey: 'buy',
        scope: { kind: 'search_area', searchAreaId: 'pl-sa-gp-01da060bb6c5807438a654e9' },
      } as never),
    ).toBeUndefined();
  });
});
