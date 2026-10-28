import { describe, expect, it } from 'vitest';

import {
  buildProviderBusinessStructuredData,
  buildServiceBreadcrumbStructuredData,
} from '../seoStructuredData';

describe('buildProviderBusinessStructuredData', () => {
  const baseInput = { slug: 'cape-handyman--7', companyName: 'Cape Handyman' };

  it('emits provider facts with platform-owned absolute urls', () => {
    const data = buildProviderBusinessStructuredData({
      ...baseInput,
      headline: 'Certified handyman network',
      logoUrl: 'https://cdn.propertylistifysa.co.za/logo.png',
      locations: [{ suburb: 'Rondebosch', city: 'Cape Town', province: 'Western Cape' }],
      averageRating: '4.80',
      reviewCount: 6,
    });

    expect(data['@type']).toBe('LocalBusiness');
    expect(data['@id']).toBe(
      'https://www.propertylistifysa.co.za/services/provider/cape-handyman--7#provider',
    );
    expect(data.url).toBe('https://www.propertylistifysa.co.za/services/provider/cape-handyman--7');
    expect(data.description).toBe('Certified handyman network');
    expect(data.image).toBe('https://cdn.propertylistifysa.co.za/logo.png');
    expect(data.areaServed).toEqual(['Rondebosch, Cape Town, Western Cape']);
    expect(data.aggregateRating).toEqual({
      '@type': 'AggregateRating',
      ratingValue: 4.8,
      reviewCount: 6,
      bestRating: 5,
    });
  });

  it('never presents reviews the platform has not computed', () => {
    const zeroReviews = buildProviderBusinessStructuredData({
      ...baseInput,
      averageRating: '0.00',
      reviewCount: 0,
    });
    expect('aggregateRating' in zeroReviews).toBe(false);

    const ratingWithoutReviews = buildProviderBusinessStructuredData({
      ...baseInput,
      averageRating: 5,
      reviewCount: 0,
    });
    expect('aggregateRating' in ratingWithoutReviews).toBe(false);
  });

  it('omits coverage and copy the platform does not hold', () => {
    const data = buildProviderBusinessStructuredData({ ...baseInput });

    expect('areaServed' in data).toBe(false);
    expect('description' in data).toBe(false);
    expect('image' in data).toBe(false);
    expect('aggregateRating' in data).toBe(false);
    expect(data.name).toBe('Cape Handyman');
  });
});

describe('buildServiceBreadcrumbStructuredData', () => {
  it('positions entries and links only entries that have a path', () => {
    const data = buildServiceBreadcrumbStructuredData([
      { label: 'Home', path: '/' },
      { label: 'Services', path: '/services' },
      { label: 'Inspection & compliance' },
    ]);

    expect(data.itemListElement).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://www.propertylistifysa.co.za/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Services',
        item: 'https://www.propertylistifysa.co.za/services',
      },
      { '@type': 'ListItem', position: 3, name: 'Inspection & compliance' },
    ]);
  });
});
