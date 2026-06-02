import { describe, expect, it } from 'vitest';
import {
  generateBreadcrumbs,
  generateMetaDescription,
  generatePageTitle,
  generatePropertyUrl,
  parseLegacyQueryParams,
} from './urlUtils';

describe('urlUtils listingType handling', () => {
  it('preserves auction intent when generating property URLs', () => {
    expect(generatePropertyUrl({ listingType: 'auction' })).toBe(
      '/property-for-sale?listingType=auction',
    );
  });

  it('normalizes legacy listingType aliases', () => {
    expect(parseLegacyQueryParams(new URLSearchParams('listingType=auctions')).listingType).toBe(
      'auction',
    );
    expect(parseLegacyQueryParams(new URLSearchParams('listingType=for_rent')).listingType).toBe(
      'rent',
    );
  });

  it('renders auction SEO labels and breadcrumbs', () => {
    const filters = { listingType: 'auction' as const, city: 'Cape Town' };

    expect(generatePageTitle(filters)).toContain('Properties on Auction');
    expect(generateMetaDescription(filters)).toContain('properties on auction');
    expect(generateBreadcrumbs(filters)[1]).toEqual({
      label: 'Auctions',
      href: '/property-for-sale?listingType=auction',
    });
  });
});
