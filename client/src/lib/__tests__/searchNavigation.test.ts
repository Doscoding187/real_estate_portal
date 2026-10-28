import { describe, expect, it } from 'vitest';

import { generatePropertyUrl } from '@/lib/urlUtils';
import { buildCanonicalSearchUrl, getListingTypeForPath } from '@/lib/searchNavigation';

const PLACE_ID = 'pl-place-01-000000000000000000000001';

describe('canonical search navigation authority', () => {
  it('builds a transactional search with one exact Place identity', () => {
    const href = buildCanonicalSearchUrl({
      canonicalPlaceId: PLACE_ID,
      listingType: 'rent',
      minPrice: 5000,
    });

    const url = new URL(href, 'https://listify.test');
    expect(url.pathname).toBe('/property-to-rent');
    expect(url.searchParams.get('canonicalPlaceId')).toBe(PLACE_ID);
    expect(url.searchParams.get('minPrice')).toBe('5000');
    expect(url.searchParams.has('city')).toBe(false);
  });

  it.each([
    { city: 'johannesburg' },
    { province: 'gauteng' },
    { suburb: 'sandton' },
    { locationId: 'city:12' },
    { canonicalPlaceIds: [PLACE_ID] },
  ])('rejects retired or multi-identity search geography: %o', geography => {
    expect(buildCanonicalSearchUrl({ listingType: 'sale', ...geography })).toBe('/');
  });

  it('rejects malformed Place identity', () => {
    expect(buildCanonicalSearchUrl({ listingType: 'sale', canonicalPlaceId: 'city:12' })).toBe('/');
  });

  it('never emits raw geography text from the general property URL builder', () => {
    expect(
      generatePropertyUrl({ listingType: 'sale', city: 'Johannesburg', province: 'Gauteng' }),
    ).toBe('/');
    expect(generatePropertyUrl({ listingType: 'sale', canonicalPlaceId: PLACE_ID })).toBe(
      `/property-for-sale?canonicalPlaceId=${PLACE_ID}`,
    );
  });

  it('derives the navbar journey from the live result routes only', () => {
    expect(getListingTypeForPath('/property-for-sale')).toBe('sale');
    expect(getListingTypeForPath('/property-to-rent')).toBe('rent');
    expect(getListingTypeForPath('/gauteng/johannesburg')).toBeNull();
    expect(getListingTypeForPath('/properties')).toBeNull();
  });
});
