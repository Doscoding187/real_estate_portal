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
