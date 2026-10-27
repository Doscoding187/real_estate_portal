import { describe, expect, it } from 'vitest';
import { buildDevelopmentsSearchUrl } from '@/lib/heroJourneySearch';
import { resolveSearchIntent } from '@/lib/searchIntent';

const johannesburgPlaceId = 'pl-place-01-000000000000000000000001';

describe('New Developments search intent', () => {
  it('serializes one reviewed Place ID and bounded development refinements', () => {
    const href = buildDevelopmentsSearchUrl({
      canonicalPlaceId: johannesburgPlaceId,
      developmentType: 'residential',
      developmentStatus: 'selling',
      minPrice: '1000000',
      maxPrice: '2000000',
    });
    const url = new URL(href, 'https://property-listify.local');
    const intent = resolveSearchIntent('/new-developments', {}, url.searchParams);

    expect(url.pathname).toBe('/new-developments');
    expect(url.searchParams.get('canonicalPlaceId')).toBe(johannesburgPlaceId);
    expect(url.searchParams.has('locationId')).toBe(false);
    expect(url.searchParams.get('developmentType')).toBe('residential');
    expect(url.searchParams.get('developmentStatus')).toBe('selling');
    expect(url.searchParams.get('minPrice')).toBe('1000000');
    expect(intent.transactionType).toBe('developments');
    expect(intent.geography.canonicalPlaceId).toBe(johannesburgPlaceId);
    expect(intent.filters.maxPrice).toBe(2000000);
  });

  it('fails closed for a missing or malformed canonical Place ID', () => {
    expect(buildDevelopmentsSearchUrl({})).toBe(
      '/new-developments?searchError=canonical-place-required',
    );
    expect(buildDevelopmentsSearchUrl({ canonicalPlaceId: 'Johannesburg' })).toBe(
      '/new-developments?searchError=canonical-place-required',
    );
  });

  it('does not serialize display labels or free text as Development geography', () => {
    const href = buildDevelopmentsSearchUrl({ canonicalPlaceId: johannesburgPlaceId });
    const url = new URL(href, 'https://property-listify.local');
    expect(url.searchParams.get('canonicalPlaceId')).toBe(johannesburgPlaceId);
    expect(url.searchParams.has('search')).toBe(false);
    expect(url.searchParams.has('city')).toBe(false);
    expect(url.searchParams.has('province')).toBe(false);
  });
});
