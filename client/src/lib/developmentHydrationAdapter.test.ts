import { describe, expect, it } from 'vitest';

import {
  buildHydratedDevelopmentDataUpdates,
  buildHydratedStepData,
  hydrateDevelopmentConfigs,
  normalizeAmenityKeys,
  normalizeHydratedUnitTypeForState,
  resolveHydrationDateValue,
} from './developmentHydrationAdapter';
import { parseCanonicalJsonValue } from '../../../shared/developmentCanonicalSelectors';

describe('development hydration adapter', () => {
  it('coerces hydration date values while preserving explicit empty values', () => {
    expect(resolveHydrationDateValue(undefined, '2026-09-01')).toEqual(new Date('2026-09-01'));
    expect(resolveHydrationDateValue(null, '2026-09-01')).toBeNull();
    expect(resolveHydrationDateValue('', '2026-09-01')).toBe('');
    expect(resolveHydrationDateValue(undefined, undefined)).toBeUndefined();
  });

  it('hydrates missing development config slices with stable defaults', () => {
    expect(hydrateDevelopmentConfigs({}, parseCanonicalJsonValue)).toMatchObject({
      residentialConfig: {
        unitMix: { studios: 0, oneBed: 0, twoBed: 0, threeBed: 0, fourPlusBed: 0 },
        priceRange: { min: null, max: null },
        parkingOptions: [],
        residentialType: null,
      },
      landConfig: {
        totalStands: null,
        infrastructure: [],
      },
      commercialConfig: {
        availableSpace: null,
        spaceUnits: 'sqm',
        features: [],
      },
    });
  });

  it('parses existing development config slices without applying ad hoc hook logic', () => {
    expect(
      hydrateDevelopmentConfigs(
        {
          residentialConfig: JSON.stringify({
            residentialType: 'apartment',
            parkingOptions: ['basement'],
          }),
          landConfig: {
            landType: 'serviced',
            infrastructure: ['water'],
          },
          commercialConfig: JSON.stringify({
            totalSpace: 1200,
            features: ['loading-bay'],
          }),
        },
        parseCanonicalJsonValue,
      ),
    ).toMatchObject({
      residentialConfig: {
        residentialType: 'apartment',
        parkingOptions: ['basement'],
      },
      landConfig: {
        landType: 'serviced',
        infrastructure: ['water'],
      },
      commercialConfig: {
        totalSpace: 1200,
        features: ['loading-bay'],
      },
    });
  });

  it('normalizes amenity labels and nested amenity buckets to canonical keys', () => {
    expect(
      normalizeAmenityKeys({
        standard: ['Swimming Pool', 'access_control'],
        additional: ['Custom Sky Lounge', '  '],
      }),
    ).toEqual(['swimming_pool', 'access_control', 'Custom Sky Lounge']);
  });

  it('builds hydration updates without wiping current fields omitted by DB edit payloads', () => {
    const currentDevelopmentData = {
      name: 'Existing Development',
      subtitle: 'Existing subtitle',
      description: 'Existing description',
      status: 'planning',
      transactionType: 'for_sale',
      location: {
        address: '1 Existing Road',
        suburb: 'Gardens',
        city: 'Cape Town',
        province: 'Western Cape',
        postalCode: '8001',
        latitude: '-33.9249',
        longitude: '18.4241',
      },
      media: {
        heroImage: { url: 'https://cdn.example.com/hero.jpg' },
        photos: [{ url: 'https://cdn.example.com/photo.jpg' }],
        videos: [],
        documents: [],
      },
      monthlyLevyFrom: 1250,
      ratesFrom: 900,
      amenities: ['access_control'],
      highlights: ['Existing highlight'],
    };

    const result = buildHydratedDevelopmentDataUpdates({
      source: { id: 'dev-1', status: 'selling' },
      snapshotStepData: {},
      currentDevelopmentData,
      normalizeTransactionType: value => value,
    });

    expect(result.updates).toMatchObject({
      name: 'Existing Development',
      subtitle: 'Existing subtitle',
      description: 'Existing description',
      status: 'selling',
      transactionType: 'for_sale',
      location: currentDevelopmentData.location,
      media: currentDevelopmentData.media,
      monthlyLevyFrom: 1250,
      ratesFrom: 900,
      amenities: ['access_control'],
      highlights: ['Existing highlight'],
    });
  });

  it('builds hydration updates from canonical step slices before flat DB fields', () => {
    const result = buildHydratedDevelopmentDataUpdates({
      source: {
        name: 'Flat DB Name',
        city: 'Flat City',
        province: 'Flat Province',
        images: JSON.stringify([{ url: 'https://cdn.example.com/flat.jpg' }]),
        propertyTypes: ['flat-property-type'],
        monthlyLevyFrom: '1500.00',
      },
      snapshotStepData: {
        identity_market: {
          name: 'Canonical Step Name',
          status: 'launching-soon',
          transactionType: 'sale',
        },
        location: {
          city: 'Cape Town',
          province: 'Western Cape',
        },
        amenities_features: {
          amenities: ['Swimming Pool'],
          features: ['fiber-ready'],
        },
        marketing_summary: {
          description: 'Canonical description',
          keySellingPoints: ['Sea views'],
        },
        development_media: {
          heroImage: { url: 'https://cdn.example.com/step-hero.jpg' },
          photos: [{ url: 'https://cdn.example.com/step-photo.jpg' }],
        },
      },
      currentDevelopmentData: {
        name: '',
        description: '',
        transactionType: 'for_sale',
        location: {},
        media: { heroImage: null, photos: [], videos: [], documents: [] },
        amenities: [],
        highlights: [],
      },
      normalizeTransactionType: value => (value === 'sale' ? 'for_sale' : value),
    });

    expect(result.updates).toMatchObject({
      name: 'Canonical Step Name',
      description: 'Canonical description',
      status: 'launching-soon',
      transactionType: 'for_sale',
      location: {
        city: 'Cape Town',
        province: 'Western Cape',
      },
      media: {
        heroImage: { url: 'https://cdn.example.com/step-hero.jpg' },
        photos: [{ url: 'https://cdn.example.com/step-photo.jpg' }],
      },
      monthlyLevyFrom: '1500.00',
      amenities: ['swimming_pool'],
      highlights: ['Sea views'],
      features: ['fiber-ready'],
    });
    expect(result.sourceSelectorPayload.propertyTypes).toEqual(['flat-property-type']);
  });

  it('reconstructs canonical step data while preserving snapshot ownership and unit identity', () => {
    const hydratedUnitTypes = [
      {
        id: 'unit-existing-1',
        name: 'Type A',
        bedrooms: 2,
        bathrooms: 2,
        priceFrom: 1500000,
        totalUnits: 10,
        availableUnits: 7,
      },
    ];

    const stepData = buildHydratedStepData({
      source: {
        estateSpecs: JSON.stringify({
          hasHOA: false,
          governanceType: 'legacy-body',
          levyRange: { min: 900, max: 1200 },
          rightsAndTaxes: { min: 500, max: 700 },
        }),
        monthlyLevyFrom: 800,
        ratesFrom: 450,
      },
      snapshotStepData: {
        identity_market: {
          ownershipTypes: ['sectional_title'],
        },
        governance_finances: {
          hasGoverningBody: true,
          governanceType: 'body-corporate',
          levyRange: { min: 1100, max: 1600 },
          rightsAndTaxes: { min: 650, max: 850 },
          architecturalGuidelines: true,
          guidelinesSummary: 'Approved palette required',
        },
        unit_types: {
          selectedUnitId: 'unit-existing-1',
          unitTypes: [{ id: 'stale-unit' }],
        },
      },
      hasSnapshotStepData: true,
      canonicalDevelopmentData: {
        name: 'Canonical Development',
        developmentType: 'residential',
        transactionType: 'for_sale',
        status: 'selling',
        description: 'A canonical description for hydration testing',
        location: { city: 'Cape Town', province: 'Western Cape' },
        amenities: ['access_control'],
        highlights: ['Sea views', 'Mountain views', 'Walkable retail'],
        transferCostsIncluded: true,
      },
      hydratedDevelopmentType: 'residential',
      hydratedUnitTypes,
      parse: parseCanonicalJsonValue,
    });

    expect(stepData.identity_market).toMatchObject({
      name: 'Canonical Development',
      ownershipTypes: ['sectional_title'],
    });
    expect(stepData.governance_finances).toMatchObject({
      hasGoverningBody: true,
      governanceType: 'body-corporate',
      levyRange: { min: 1100, max: 1600 },
      rightsAndTaxes: { min: 650, max: 850 },
      architecturalGuidelines: true,
      guidelinesSummary: 'Approved palette required',
      transferCostsIncluded: true,
    });
    expect(stepData.unit_types).toMatchObject({
      selectedUnitId: 'unit-existing-1',
      unitTypes: hydratedUnitTypes,
    });
  });

  it('reconstructs canonical step data from DB edit rows when no saved snapshot exists', () => {
    const source = {
      name: 'DB Hydrated Development',
      description: 'Persisted DB copy should become canonical marketing step data.',
      tagline: 'DB hydrated tagline',
      developmentType: 'residential',
      transactionType: 'for_rent',
      status: 'selling',
      ownershipType: 'sectional-title',
      address: '14 Database Road',
      suburb: 'Sea Point',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '8005',
      latitude: '-33.91',
      longitude: '18.39',
      monthlyLevyFrom: '1250.00',
      monthlyLevyTo: '1750.00',
      ratesFrom: '950.00',
      ratesTo: '1200.00',
      transferCostsIncluded: 1,
      amenities: JSON.stringify(['Swimming Pool', 'access_control']),
      features: JSON.stringify(['fiber-ready']),
      highlights: JSON.stringify(['Sea views', 'Secure parking', 'Walkable location']),
      images: JSON.stringify([{ url: 'https://cdn.example.com/db-hero.jpg' }]),
      videos: JSON.stringify(['https://cdn.example.com/db-video.mp4']),
      floorPlans: JSON.stringify(['https://cdn.example.com/db-floorplan.pdf']),
      brochures: JSON.stringify(['https://cdn.example.com/db-brochure.pdf']),
      estateSpecs: JSON.stringify({
        hasHOA: true,
        governanceType: 'body-corporate',
        architecturalGuidelines: true,
        guidelinesSummary: 'Approved materials required',
        levyRange: { min: 1250, max: 1750 },
        rightsAndTaxes: { min: 950, max: 1200 },
      }),
    };
    const hydratedUnitTypes = [
      {
        id: 'db-rent-unit-1',
        name: 'DB Rent Type',
        monthlyRentFrom: 15_500,
        monthlyRentTo: 18_500,
        totalUnits: 12,
        availableUnits: 8,
      },
    ];
    const currentDevelopmentData = {
      location: {},
      media: { heroImage: null, photos: [], videos: [], documents: [] },
      amenities: [],
      highlights: [],
    };

    const { updates } = buildHydratedDevelopmentDataUpdates({
      source,
      snapshotStepData: {},
      currentDevelopmentData,
      normalizeTransactionType: value => (value === 'for_rent' ? 'for_rent' : value),
    });
    const stepData = buildHydratedStepData({
      source,
      snapshotStepData: {},
      hasSnapshotStepData: false,
      canonicalDevelopmentData: updates,
      hydratedDevelopmentType: 'residential',
      hydratedUnitTypes,
      parse: parseCanonicalJsonValue,
    });

    expect(updates).toMatchObject({
      name: 'DB Hydrated Development',
      description: 'Persisted DB copy should become canonical marketing step data.',
      tagline: 'DB hydrated tagline',
      transactionType: 'for_rent',
      location: {
        address: '14 Database Road',
        suburb: 'Sea Point',
        city: 'Cape Town',
        province: 'Western Cape',
        postalCode: '8005',
        latitude: '-33.91',
        longitude: '18.39',
      },
      monthlyLevyFrom: '1250.00',
      monthlyLevyTo: '1750.00',
      ratesFrom: '950.00',
      ratesTo: '1200.00',
      transferCostsIncluded: 1,
      amenities: ['swimming_pool', 'access_control'],
      features: ['fiber-ready'],
      highlights: ['Sea views', 'Secure parking', 'Walkable location'],
    });
    expect(updates.media.heroImage).toMatchObject({
      url: 'https://cdn.example.com/db-hero.jpg',
      category: 'featured',
      isPrimary: true,
    });
    expect(stepData.configuration).toMatchObject({
      developmentType: 'residential',
      transactionType: 'for_rent',
    });
    expect(stepData.identity_market).toMatchObject({
      name: 'DB Hydrated Development',
      status: 'selling',
      transactionType: 'for_rent',
      ownershipTypes: ['sectional-title'],
    });
    expect(stepData.location).toMatchObject(updates.location);
    expect(stepData.marketing_summary).toMatchObject({
      description: 'Persisted DB copy should become canonical marketing step data.',
      tagline: 'DB hydrated tagline',
      keySellingPoints: ['Sea views', 'Secure parking', 'Walkable location'],
    });
    expect(stepData.amenities_features).toMatchObject({
      amenities: ['swimming_pool', 'access_control'],
      features: ['fiber-ready'],
    });
    expect(stepData.governance_finances).toMatchObject({
      hasGoverningBody: true,
      governanceType: 'body-corporate',
      levyRange: { min: 1250, max: 1750 },
      rightsAndTaxes: { min: 950, max: 1200 },
      architecturalGuidelines: true,
      guidelinesSummary: 'Approved materials required',
      transferCostsIncluded: 1,
    });
    expect(stepData.development_media).toMatchObject({
      heroImage: expect.objectContaining({ url: 'https://cdn.example.com/db-hero.jpg' }),
      photos: [expect.objectContaining({ url: 'https://cdn.example.com/db-hero.jpg' })],
      videos: [{ url: 'https://cdn.example.com/db-video.mp4' }],
      floorPlans: [{ url: 'https://cdn.example.com/db-floorplan.pdf' }],
      documents: [{ url: 'https://cdn.example.com/db-brochure.pdf' }],
    });
    expect(stepData.unit_types.unitTypes).toEqual(hydratedUnitTypes);
  });

  it('hydrates DB unit rows into canonical state units and strips inactive pricing', () => {
    const unit = normalizeHydratedUnitTypeForState(
      {
        id: 'db-unit-1',
        name: 'Type A',
        bedrooms: '2',
        bathrooms: '2',
        specifications: JSON.stringify({
          classification: { category: 'house', subType: 'duplex' },
        }),
        basePriceFrom: '1500000.00',
        basePriceTo: '1750000.00',
        monthlyRentFrom: '14500.00',
        unitSize: '85',
        parkingType: 'carport',
        parkingBays: '2',
        totalUnits: '10',
        availableUnits: '7',
        reservedUnits: '1',
      },
      0,
      'for_sale',
      parseCanonicalJsonValue,
    );

    expect(unit).toMatchObject({
      id: 'db-unit-1',
      label: 'Type A',
      name: 'Type A',
      bedrooms: 2,
      bathrooms: 2,
      priceFrom: 1500000,
      priceTo: 1750000,
      unitSize: 85,
      unitCategory: 'house',
      unitSubType: 'duplex',
      parkingType: 'carport',
      parkingBays: 2,
      totalUnits: 10,
      availableUnits: 7,
      reservedUnits: 1,
    });
    expect(unit.specifications.classification).toEqual({
      category: 'house',
      subType: 'duplex',
    });
    expect(unit).not.toHaveProperty('monthlyRentFrom');
  });
});
