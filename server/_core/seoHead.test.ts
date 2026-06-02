import { describe, expect, it } from 'vitest';

import { resolveSeoPageData } from './seoHead';

describe('resolveSeoPageData', () => {
  it('uses auction SEO labels and canonical query state on auction search roots', () => {
    const seo = resolveSeoPageData('/property-for-sale?listingType=auction');

    expect(seo.title).toBe('Properties on Auction in South Africa | Property Listify');
    expect(seo.description).toContain('auction properties');
    expect(seo.canonicalUrl).toBe(
      'https://www.propertylistifysa.co.za/property-for-sale?listingType=auction',
    );
  });

  it('uses auction SEO labels and canonical query state on auction area pages', () => {
    const seo = resolveSeoPageData('/property-for-sale/gauteng/johannesburg?listingType=auction');

    expect(seo.title).toBe('Properties on Auction in Johannesburg, Gauteng | Property Listify');
    expect(seo.description).toContain('properties on auction in Johannesburg, Gauteng');
    expect(seo.canonicalUrl).toBe(
      'https://www.propertylistifysa.co.za/property-for-sale/gauteng/johannesburg?listingType=auction',
    );
  });
});
