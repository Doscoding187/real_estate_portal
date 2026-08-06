import { describe, expect, it } from 'vitest';

import { generatePropertyUrl } from '@/lib/urlUtils';
import {
  buildCanonicalSearchUrl,
  buildPropertiesCompatibilityRedirect,
  getListingTypeForPath,
} from '@/lib/searchNavigation';

describe('core search navigation authority', () => {
  it('canonicalizes explicit Buy compatibility state and preserves result state', () => {
    const href = buildPropertiesCompatibilityRedirect(
      '?listingType=sale&locationId=city%3A12&province=gauteng&city=johannesburg&sort=price_desc&page=2',
    );

    const url = new URL(href, 'https://listify.test');
    expect(url.pathname).toBe('/property-for-sale');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      province: 'gauteng',
      city: 'johannesburg',
      sort: 'price_desc',
      page: '2',
      locationId: 'city:12',
    });
  });

  it('canonicalizes explicit Rent compatibility state without converting it to Buy', () => {
    const href = buildPropertiesCompatibilityRedirect(
      '?listingType=rent&city=johannesburg&minPrice=5000&sort=price_asc&page=1',
    );

    const url = new URL(href, 'https://listify.test');
    expect(url.pathname).toBe('/property-to-rent');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      city: 'johannesburg',
      minPrice: '5000',
      sort: 'price_asc',
      page: '1',
    });
  });

  it('routes canonical geography-only compatibility state to neutral discovery', () => {
    expect(
      buildPropertiesCompatibilityRedirect(
        '?locationId=city%3A12&province=gauteng&city=johannesburg',
      ),
    ).toBe('/gauteng/johannesburg');
  });

  it('returns incomplete or malformed compatibility state to the neutral chooser', () => {
    expect(buildPropertiesCompatibilityRedirect('')).toBe('/');
    expect(buildPropertiesCompatibilityRedirect('?listingType=unknown')).toBe('/');
    expect(buildPropertiesCompatibilityRedirect('?locationId=google-place-id')).toBe('/');
  });

  it('does not infer a transaction when generic URL construction lacks one', () => {
    expect(generatePropertyUrl({ city: 'johannesburg', province: 'gauteng' })).toBe('/');
    expect(buildCanonicalSearchUrl({ listingType: 'rent', city: 'johannesburg' })).toBe(
      '/property-to-rent?city=johannesburg',
    );
  });

  it('derives navbar journey from explicit result routes only', () => {
    expect(getListingTypeForPath('/property-for-sale', '')).toBe('sale');
    expect(getListingTypeForPath('/property-to-rent', '')).toBe('rent');
    expect(getListingTypeForPath('/gauteng/johannesburg', '')).toBeNull();
    expect(getListingTypeForPath('/properties', '?listingType=rent')).toBe('rent');
  });
});
