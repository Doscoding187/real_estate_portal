import { describe, expect, it } from 'vitest';
import { transformListingToProperty } from '../db';

describe('public listing projection Features & Context contract', () => {
  it('preserves the nested contract and does not mix highlights into structured features', () => {
    const property = transformListingToProperty({
      id: 99,
      title: 'Canonical house',
      description: 'A sufficiently complete listing description for projection tests.',
      action: 'sell',
      propertyType: 'house',
      askingPrice: 1000000,
      propertyDetails: {
        corePropertyInformation: {
          version: 1,
          bedrooms: { status: 'known', value: 3 },
          bathrooms: { status: 'known', value: 2 },
          internalArea: { status: 'known', valueM2: 140, unit: 'm2' },
          erfArea: { status: 'known', valueM2: 500, unit: 'm2' },
        },
        featuresContext: {
          version: 1,
          spaces: ['study_office'],
          context: {},
          utilities: { backupPower: 'none' },
          security: { status: 'known', features: ['cctv'] },
          highlights: ['natural_light'],
          customFeatures: [],
          customHighlights: ['Quiet cul-de-sac'],
        },
      },
      city: 'Johannesburg',
      province: 'Gauteng',
      streetAddress: '1 Main Road',
      postalCode: '2000',
    });

    expect(property.propertyDetails.featuresContext.highlights).toEqual(['natural_light']);
    expect(property.propertyDetails.featuresContext.customHighlights).toEqual(['Quiet cul-de-sac']);
    expect(property.features).toEqual(expect.arrayContaining(['study_office', 'cctv']));
    expect(property.features).not.toContain('natural_light');
  });
});
