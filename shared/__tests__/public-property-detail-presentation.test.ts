import { describe, expect, it } from 'vitest';
import {
  buildPublicPropertyDetailPresentation,
  buildPublicPropertyParkingFact,
} from '../public-property-detail-presentation';

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
    expect(presentation.rentalEssentials).toEqual([]);
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
      rentalTerms: {
        version: 1,
        availability: { status: 'available_from', date: '2026-09-01' },
        lease: { status: 'fixed_term', minimumMonths: 12 },
        utilities: 'partially_included',
        furnishing: 'partly_furnished',
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
    expect(presentation.rentalEssentials).toEqual([
      expect.objectContaining({ key: 'availability', value: 'From 01 Sept 2026', status: 'known' }),
      expect.objectContaining({ key: 'lease', value: '12-month minimum', status: 'known' }),
      expect.objectContaining({ key: 'utilities', value: 'Partly included', status: 'known' }),
      expect.objectContaining({ key: 'furnishing', value: 'Partly furnished', status: 'known' }),
    ]);
    expect(presentation.runningCosts).toEqual([]);
    expect(presentation.location).toMatchObject({
      label: 'Johannesburg, Gauteng',
      precision: 'exact',
      precisionLabel: 'Publicly listed location',
      coordinates: null,
      mapsUrl: null,
    });
  });

  it('reserves the fourth rental hero metric for transparent parking information', () => {
    const presentation = buildPublicPropertyDetailPresentation({
      listingType: 'rent',
      propertyType: 'apartment',
      price: 18_000,
      corePropertyInformation: {
        version: 1,
        bedrooms: { status: 'known', value: 2 },
        bathrooms: { status: 'known', value: 1 },
        internalArea: { status: 'known', valueM2: 72, unit: 'm2' },
        parkingBays: { status: 'unknown' },
        garages: { status: 'unknown' },
        floorLevel: { status: 'known', value: 3 },
      },
      featuresContext,
      rentalTerms: {
        version: 1,
        availability: { status: 'available_now' },
        lease: { status: 'month_to_month' },
        utilities: 'not_included',
        furnishing: 'unfurnished',
      },
      publicLocation: { city: 'Johannesburg', province: 'Gauteng' },
      media: [],
      photoCount: 1,
      hasVirtualTour: false,
    });

    expect(presentation.heroFacts.map(fact => [fact.key, fact.value, fact.status])).toEqual([
      ['internal-area', '72 m²', 'known'],
      ['bedrooms', '2', 'known'],
      ['bathrooms', '1', 'known'],
      ['parking', 'Not supplied', 'not_supplied'],
    ]);
  });

  it('keeps a full parking fact while supplying a compact hero metric', () => {
    expect(
      buildPublicPropertyParkingFact({
        version: 1,
        parkingBays: { status: 'known', value: 1 },
        garages: { status: 'unknown' },
      }),
    ).toMatchObject({
      key: 'parking',
      label: 'Parking',
      value: '1 parking bay',
      compactValue: '1',
      status: 'known',
    });
  });

  it('makes absent legacy rental terms transparent rather than inventing a tenancy claim', () => {
    const presentation = buildPublicPropertyDetailPresentation({
      listingType: 'rent',
      propertyType: 'apartment',
      price: 12_000,
      corePropertyInformation: houseCore,
      featuresContext,
      publicLocation: { city: 'Johannesburg', province: 'Gauteng' },
      media: [],
      photoCount: 0,
      hasVirtualTour: false,
    });

    expect(presentation.rentalEssentials).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'availability',
          value: 'To confirm',
          status: 'not_supplied',
        }),
        expect.objectContaining({ key: 'lease', value: 'To confirm', status: 'not_supplied' }),
        expect.objectContaining({ key: 'utilities', value: 'To confirm', status: 'not_supplied' }),
        expect.objectContaining({ key: 'furnishing', value: 'To confirm', status: 'not_supplied' }),
      ]),
    );
  });
});
