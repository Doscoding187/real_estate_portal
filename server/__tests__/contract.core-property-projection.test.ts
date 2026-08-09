import { describe, expect, it } from 'vitest';
import { transformListingToProperty } from '../db';

describe('manual listing core property projection compatibility', () => {
  it('keeps internal and erf areas distinct in listing-to-property reads', () => {
    const property = transformListingToProperty({
      id: 101,
      title: 'Family home',
      description: 'A complete family home description for projection testing.',
      action: 'sell',
      propertyType: 'house',
      askingPrice: 2_000_000,
      propertyDetails: {
        corePropertyInformation: {
          version: 1,
          bedrooms: { status: 'known', value: 3 },
          bathrooms: { status: 'known', value: 2 },
          internalArea: { status: 'known', valueM2: 180, unit: 'm2' },
          erfArea: { status: 'known', valueM2: 600, unit: 'm2' },
        },
      },
      city: 'Johannesburg',
      province: 'Gauteng',
      streetAddress: '1 Main Road',
      postalCode: '2000',
      latitude: '-26.1',
      longitude: '28.0',
      ownerId: 5,
      status: 'published',
    });

    expect(property.area).toBe(180);
    expect(property.yardSize).toBe(600);
    expect(property.area).not.toBe(property.yardSize);
  });

  it('normalizes farm land using the source unit for compatibility reads', () => {
    const property = transformListingToProperty({
      id: 102,
      title: 'Smallholding',
      description: 'A complete smallholding description for projection testing.',
      action: 'rent',
      propertyType: 'farm',
      monthlyRent: 20_000,
      propertyDetails: {
        corePropertyInformation: {
          version: 1,
          farmUse: 'smallholding',
          farmLandArea: {
            status: 'known',
            value: 2,
            sourceUnit: 'hectares',
            normalizedM2: 20_000,
          },
          residenceIncluded: false,
        },
      },
      city: 'Pretoria',
      province: 'Gauteng',
      streetAddress: 'Farm Road',
      ownerId: 5,
      status: 'published',
    });

    expect(property.area).toBe(0);
    expect(property.yardSize).toBe(20_000);
  });
});
