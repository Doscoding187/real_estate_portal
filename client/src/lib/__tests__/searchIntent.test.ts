import { describe, expect, it } from 'vitest';
import {
  buildCanonicalSavedSearchCriteria,
  generateIntentUrl,
  resolveSearchIntent,
} from '@/lib/searchIntent';

const PLACE_ID = 'pl-place-01-000000000000000000000001';

describe('canonical search intent', () => {
  it('resolves Buy with one exact Place identity and supported filters', () => {
    const intent = resolveSearchIntent(
      '/property-for-sale',
      {},
      new URLSearchParams(`canonicalPlaceId=${PLACE_ID}&propertyType=house&maxPrice=2000000`),
    );

    expect(intent.transactionType).toBe('for-sale');
    expect(intent.geography).toEqual({ level: 'canonical_place', canonicalPlaceId: PLACE_ID });
    expect(intent.filters).toMatchObject({ propertyType: 'house', maxPrice: 2_000_000 });
    expect(intent.validation).toBeUndefined();
  });

  it('resolves Rent from its result route and serializes canonical identity only', () => {
    const intent = resolveSearchIntent(
      '/property-to-rent',
      {},
      new URLSearchParams(`canonicalPlaceId=${PLACE_ID}&minBedrooms=2`),
    );
    const url = new URL(generateIntentUrl(intent), 'https://listify.test');

    expect(intent.transactionType).toBe('to-rent');
    expect(url.pathname).toBe('/property-to-rent');
    expect(url.searchParams.get('canonicalPlaceId')).toBe(PLACE_ID);
    expect(url.searchParams.get('minBedrooms')).toBe('2');
    expect(url.searchParams.has('city')).toBe(false);
  });

  it.each([
    'province=gauteng',
    'city=johannesburg',
    'suburb=sandton',
    'locationId=city%3A12',
    'locationIds=pl-place-01-000000000000000000000001',
    'searchAreaId=johannesburg-sandton',
  ])('marks retired geography input invalid: %s', query => {
    const intent = resolveSearchIntent('/property-for-sale', {}, new URLSearchParams(query));
    const url = new URL(generateIntentUrl(intent), 'https://listify.test');

    expect(intent.validation?.code).toBe('invalid-place-authority');
    expect(url.searchParams.get('searchError')).toBe('invalid-place-authority');
    expect(url.searchParams.has('province')).toBe(false);
    expect(url.searchParams.has('city')).toBe(false);
    expect(url.searchParams.has('locationId')).toBe(false);
  });

  it('rejects multiple or malformed canonical Place identities', () => {
    const duplicate = resolveSearchIntent(
      '/property-for-sale',
      {},
      new URLSearchParams(`canonicalPlaceId=${PLACE_ID}&canonicalPlaceId=${PLACE_ID}`),
    );
    const malformed = resolveSearchIntent(
      '/property-for-sale',
      {},
      new URLSearchParams('canonicalPlaceId=city%3A12'),
    );

    expect(duplicate.validation?.code).toBe('invalid-place-authority');
    expect(malformed.validation?.code).toBe('invalid-place-authority');
  });

  describe('multi-area selection (repeated canonicalPlaceId)', () => {
    const ids = (count: number) =>
      Array.from({ length: count }, (_, index) => `pl-place-01-${String(index + 1).padStart(24, '0')}`);
    const query = (list: string[], extra = '') =>
      new URLSearchParams(list.map(id => `canonicalPlaceId=${id}`).join('&') + extra);

    it('resolves several distinct Places, keeps the first as the primary, and round-trips the URL', () => {
      const intent = resolveSearchIntent(
        '/property-for-sale',
        {},
        query(ids(3), '&propertyType=house&minBedrooms=2'),
      );
      expect(intent.validation).toBeUndefined();
      expect(intent.geography).toEqual({
        level: 'canonical_place',
        canonicalPlaceId: ids(3)[0],
        canonicalPlaceIds: ids(3),
      });

      // A reload re-resolves the same intent from the URL it generated.
      const url = new URL(generateIntentUrl(intent), 'https://listify.test');
      expect(url.searchParams.getAll('canonicalPlaceId')).toEqual(ids(3));
      expect(url.searchParams.get('propertyType')).toBe('house');
      expect(url.searchParams.get('minBedrooms')).toBe('2');
      const reloaded = resolveSearchIntent(
        '/property-for-sale',
        {},
        new URLSearchParams(url.search),
      );
      expect(reloaded.geography).toEqual(intent.geography);
      expect(reloaded.filters).toEqual(intent.filters);
    });

    it('allows exactly ten Places and rejects eleven, duplicates and non-Buy/Rent journeys', () => {
      expect(resolveSearchIntent('/property-to-rent', {}, query(ids(10))).validation).toBeUndefined();
      expect(
        resolveSearchIntent('/property-for-sale', {}, query(ids(11))).validation?.code,
      ).toBe('invalid-place-authority');
      expect(
        resolveSearchIntent('/property-for-sale', {}, query([ids(2)[0], ids(2)[0]])).validation?.code,
      ).toBe('invalid-place-authority');
      expect(
        resolveSearchIntent('/new-developments', {}, query(ids(2))).validation?.code,
      ).toBe('invalid-place-authority');
    });

    it('keeps a single Place without a list', () => {
      const intent = resolveSearchIntent('/property-for-sale', {}, query(ids(1)));
      expect(intent.geography).toEqual({ level: 'canonical_place', canonicalPlaceId: ids(1)[0] });
    });
  });

  it('rejects a transaction conflict and missing transaction intent', () => {
    expect(
      resolveSearchIntent(
        '/property-for-sale',
        {},
        new URLSearchParams('transactionType=rent'),
      ).validation?.code,
    ).toBe('invalid-transaction-intent');
    expect(resolveSearchIntent('/', {}, new URLSearchParams()).validation?.code).toBe(
      'missing-transaction-intent',
    );
  });

  it('serializes saved-search criteria without geographic display text', () => {
    const intent = resolveSearchIntent(
      '/property-to-rent',
      {},
      new URLSearchParams(`canonicalPlaceId=${PLACE_ID}&maxPrice=15000`),
    );
    const criteria = buildCanonicalSavedSearchCriteria(intent);

    expect(criteria).toMatchObject({ listingType: 'rent', maxPrice: 15_000 });
    expect(criteria).not.toHaveProperty('canonicalPlaceId');
    expect(criteria).not.toHaveProperty('city');
    expect(criteria).not.toHaveProperty('province');
  });
});
