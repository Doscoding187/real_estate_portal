import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildDevelopmentStructuredData } from '../developmentStructuredData';

const base = {
  name: 'Baltimore Lifestyle Estate',
  description: 'Freestanding family homes in a secure estate.',
  url: 'https://www.propertylistifysa.co.za/development/baltimore-lifestyle-estate-5yr6po',
  imageUrl: 'https://example.com/hero.jpg',
  locationLabels: ['North Riding'],
  publisherName: 'Cosmopolitan Projects',
  transactionType: 'for_sale',
  priceFrom: 1930000,
  priceTo: 2400000,
};

describe('buildDevelopmentStructuredData', () => {
  it('emits a Residence with the suburb as address locality and a Product with a ZAR price range', () => {
    const [residence, product] = buildDevelopmentStructuredData(base);
    expect(residence).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Residence',
      name: 'Baltimore Lifestyle Estate',
      url: base.url,
      image: base.imageUrl,
      address: { '@type': 'PostalAddress', addressLocality: 'North Riding', addressCountry: 'ZA' },
    });
    expect(product).toMatchObject({
      '@type': 'Product',
      brand: { '@type': 'Organization', name: 'Cosmopolitan Projects' },
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'ZAR',
        lowPrice: 1930000,
        highPrice: 2400000,
      },
    });
  });

  it('leaves out what is not known: no price, no address, no offer for rent', () => {
    const [residence, product] = buildDevelopmentStructuredData({
      ...base,
      priceFrom: null,
      priceTo: null,
      locationLabels: [],
      imageUrl: null,
      description: '  ',
    });
    expect(residence).not.toHaveProperty('address');
    expect(residence).not.toHaveProperty('image');
    expect(residence).not.toHaveProperty('description');
    expect(product).not.toHaveProperty('offers');
    const [, rent] = buildDevelopmentStructuredData({ ...base, transactionType: 'for_rent' });
    expect(rent).not.toHaveProperty('offers');
  });

  it('emits nothing without a name or url', () => {
    expect(buildDevelopmentStructuredData({ ...base, name: ' ' })).toEqual([]);
    expect(buildDevelopmentStructuredData({ ...base, url: '' })).toEqual([]);
  });

  it('is emitted by both renderings of the development page', () => {
    const page = readFileSync(
      path.resolve(process.cwd(), 'client/src/pages/DevelopmentDetail.tsx'),
      'utf8',
    );
    expect(page.match(/structuredData=\{developmentStructuredData\(/g)).toHaveLength(2);
    expect(page).toContain('buildDevelopmentStructuredData({');
  });
});
