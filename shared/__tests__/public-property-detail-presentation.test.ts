import { describe, expect, it } from 'vitest';
import { buildPublicPropertyDetailPresentation } from '../public-property-detail-presentation';

const houseCore = {
  version: 1 as const,
  bedrooms: { status: 'known' as const, value: 4 },
  bathrooms: { status: 'known' as const, value: 3 },
  internalArea: { status: 'known' as const, valueM2: 268, unit: 'm2' as const },
  erfArea: { status: 'known' as const, valueM2: 612, unit: 'm2' as const },
  garages: { status: 'known' as const, value: 2 },
};

const featuresContext = {
  version: 1 as const,
  spaces: ['garden', 'pool', 'study_office'] as const,
  context: {
    setting: 'estate' as const,
    controlledAccess: 'controlled' as const,
    securityProfile: 'security_estate' as const,
  },
  utilities: {
    electricitySupply: 'municipal' as const,
    backupPower: 'solar' as const,
    waterSupply: 'borehole' as const,
    wastewaterSystem: 'municipal' as const,
    internetAccess: 'fibre' as const,
  },
  security: {
    status: 'known' as const,
    features: ['access_control', 'guard_24hr'] as const,
  },
  petPolicy: 'allowed' as const,
  highlights: ['natural_light'] as const,
  customFeatures: [],
  customHighlights: [],
};

describe('public property-detail presentation', () => {
  it('uses type-aware house metrics with a focused six-fact buyer-check set', () => {
    const presentation = buildPublicPropertyDetailPresentation({
      listingType: 'sale',
      propertyType: 'house',
      price: 3_850_000,
      corePropertyInformation: houseCore,
      featuresContext,
      pricingContract: {
        version: 1,
        intent: 'sale',
        askingPrice: 3_850_000,
        negotiability: 'not_negotiable',
        recurringCosts: {
          ratesAndTaxes: { status: 'known', amount: 2_180, cadence: 'monthly' },
          hoaEstateLevy: { status: 'known', amount: 1_850, cadence: 'monthly' },
        },
      },
      publicLocation: {
        address: 'Fourways, Johannesburg, Gauteng',
        city: 'Johannesburg',
        province: 'Gauteng',
        precision: 'approximate',
        latitude: '-26.0100',
        longitude: '28.0100',
      },
      media: [],
      photoCount: 24,
      hasVirtualTour: false,
    });

    expect(presentation.heroFacts.map(item => [item.key, item.value, item.icon])).toEqual([
      ['internal-area', '268 m²', 'floorSize'],
      ['bedrooms', '4', 'bedrooms'],
      ['bathrooms', '3', 'bathrooms'],
      ['erf-area', '612 m²', 'yardSize'],
    ]);
    expect(
      presentation.buyerChecks.map(item => [
        item.key,
        item.label,
        item.value.replace(/\u00a0/g, ' '),
      ]),
    ).toEqual([
      ['electricity', 'Electricity', 'Municipal'],
      ['water', 'Water', 'Borehole'],
      ['backup-power', 'Backup power', 'Solar'],
      ['security', 'Security', '24/7'],
      ['internet', 'Internet', 'Fibre'],
      ['pet-policy', 'Pet policy', 'Allowed'],
    ]);
    expect(
      presentation.runningCosts.map(item => [
        item.key,
        item.label,
        item.value.replace(/\u00a0/g, ' '),
      ]),
    ).toEqual([
      ['rates-and-taxes', 'Rates & taxes', 'R 2 180 / month'],
      ['levy', 'Estate levy', 'R 1 850 / month'],
    ]);
    expect(presentation.price).toMatchObject({
      label: 'Asking price',
      supportingText: 'Price not negotiable',
    });
    expect(presentation.location).toMatchObject({
      label: 'Fourways, Johannesburg, Gauteng',
      precision: 'approximate',
      precisionLabel: 'Approximate area location',
      description: "The marker represents the public area, not the property's exact position.",
      coordinates: { latitude: -26.01, longitude: 28.01 },
    });
    expect(presentation.location.mapsUrl).toContain('query=-26.01%2C28.01');
  });

  it('keeps rent-specific financial detail outside the six-fact buyer-check registry', () => {
    const presentation = buildPublicPropertyDetailPresentation({
      listingType: 'rent',
      propertyType: 'house',
      price: 24_000,
      corePropertyInformation: houseCore,
      featuresContext,
      pricingContract: {
        version: 1,
        intent: 'rent',
        monthlyRent: 24_000,
        deposit: { status: 'unknown' },
      },
      publicLocation: {
        city: 'Johannesburg',
        province: 'Gauteng',
        precision: 'exact',
      },
      media: [],
      photoCount: 1,
      hasVirtualTour: false,
    });

    expect(presentation.price.value).toContain('/ month');
    expect(presentation.buyerChecks).toHaveLength(6);
    expect(presentation.buyerChecks).toContainEqual(
      expect.objectContaining({ key: 'pet-policy', value: 'Allowed', status: 'known' }),
    );
    expect(presentation.runningCosts).toEqual([]);
    expect(presentation.location).toMatchObject({
      label: 'Johannesburg, Gauteng',
      precision: 'exact',
      precisionLabel: 'Publicly listed location',
      coordinates: null,
      mapsUrl: null,
    });
  });
});
