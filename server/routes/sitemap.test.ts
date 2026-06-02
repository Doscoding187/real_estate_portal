import { describe, expect, it } from 'vitest';

import { buildAreaListingPath, normalizeSitemapListingType } from './sitemap';

describe('sitemap area listing URLs', () => {
  it('normalizes development listing aliases before choosing the public area route', () => {
    expect(normalizeSitemapListingType('for_sale')).toBe('sale');
    expect(normalizeSitemapListingType('to-rent')).toBe('rent');
    expect(normalizeSitemapListingType('auctions')).toBe('auction');
  });

  it('builds canonical sale, rent, and auction area paths', () => {
    expect(buildAreaListingPath('for_sale', 'gauteng', 'johannesburg')).toBe(
      '/property-for-sale/gauteng/johannesburg',
    );
    expect(buildAreaListingPath('for_rent', 'western-cape', 'cape-town')).toBe(
      '/property-to-rent/western-cape/cape-town',
    );
    expect(buildAreaListingPath('auctions', 'kwazulu-natal', 'durban')).toBe(
      '/property-for-sale/kwazulu-natal/durban?listingType=auction',
    );
  });
});
