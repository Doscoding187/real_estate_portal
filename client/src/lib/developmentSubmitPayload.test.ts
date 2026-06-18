import { describe, expect, it } from 'vitest';

import {
  buildDevelopmentEditAutosavePayload,
  buildDevelopmentEditProgressPayload,
  buildDevelopmentEditSavePayload,
  buildDevelopmentPartialUpdatePayload,
  buildDevelopmentUpdatePayload,
  buildDevelopmentWizardDataFromCanonicalSnapshot,
  buildDevelopmentSubmitPayload,
  normalizeAmenitiesPayload,
  normalizeSubmitUnitTypes,
  resolveSubmitUnitTypes,
} from './developmentSubmitPayload';
import {
  CANONICAL_PARTIAL_UPDATE_MODE,
  CANONICAL_UPDATE_MODE_FIELD,
} from '../../../shared/developmentPayloadOwnership';

describe('development submit payload helpers', () => {
  it('normalizes amenity sources from arrays, JSON strings, and grouped objects', () => {
    expect(normalizeAmenitiesPayload(['Pool', '', 'Gym'])).toEqual(['Pool', 'Gym']);
    expect(normalizeAmenitiesPayload('["Security","Fibre"]')).toEqual(['Security', 'Fibre']);
    expect(
      normalizeAmenitiesPayload({
        standard: ['Garden'],
        additional: ['Clubhouse'],
      }),
    ).toEqual(['Garden', 'Clubhouse']);
  });

  it('normalizes submit unit types and strips pricing outside the active transaction', () => {
    const [unit] = normalizeSubmitUnitTypes(
      [
        {
          id: 'unit-1',
          name: 'Rental Type',
          bedrooms: '2',
          bathrooms: '2.5',
          priceFrom: 1_500_000,
          priceTo: 1_700_000,
          monthlyRentFrom: 15_000,
          monthlyRentTo: 16_500,
          startingBid: 900_000,
          parkingType: 'street',
          parkingBays: '1',
          totalUnits: '8',
          availableUnits: '6',
          reservedUnits: '1',
        },
      ],
      'for_rent',
    );

    expect(unit).toMatchObject({
      id: 'unit-1',
      name: 'Rental Type',
      bedrooms: 2,
      bathrooms: 2.5,
      monthlyRentFrom: 15_000,
      monthlyRentTo: 16_500,
      parkingType: 'open',
      parkingBays: 1,
      totalUnits: 8,
      availableUnits: 6,
      reservedUnits: 1,
    });
    expect(unit).not.toHaveProperty('priceFrom');
    expect(unit).not.toHaveProperty('basePriceFrom');
    expect(unit).not.toHaveProperty('priceTo');
    expect(unit).not.toHaveProperty('basePriceTo');
    expect(unit).not.toHaveProperty('startingBid');
  });

  it('builds the flat submit payload from canonical wizard data', () => {
    const payload = buildDevelopmentSubmitPayload({
      amenities: ['Pool'],
      residentialConfig: {
        residentialType: 'apartment',
        communityTypes: ['security_estate'],
      },
      landConfig: { landType: 'serviced', infrastructure: ['roads'] },
      commercialConfig: { commercialType: 'retail', features: ['loading_bay'] },
      wizardData: {
        name: 'Canonical Submit',
        subtitle: 'Future ready',
        description: 'Canonical submit payload description.',
        developmentType: 'residential',
        transactionType: 'for_sale',
        ownershipTypes: ['sectional-title'],
        status: 'selling',
        location: {
          address: '1 Submit Road',
          city: 'Cape Town',
          province: 'Western Cape',
        },
        heroImage: 'https://example.com/hero.jpg',
        media: {
          photos: [
            { url: 'https://example.com/hero.jpg' },
            { url: 'https://example.com/photo.jpg', category: 'gallery' },
          ],
          videos: [{ url: 'https://example.com/video.mp4' }],
          floorPlans: [{ url: 'https://example.com/floorplan.pdf' }],
          documents: ['https://example.com/brochure.pdf'],
        },
        hasGoverningBody: true,
        governanceType: 'hoa',
        levyRange: { min: 1200, max: 1800 },
        rightsAndTaxes: { min: 900, max: 1100 },
        unitTypes: [
          {
            id: 'unit-1',
            name: 'Type A',
            bedrooms: 2,
            bathrooms: 2,
            priceFrom: 1_200_000,
            priceTo: 1_350_000,
            extras: [{ price: 50_000 }],
            parkingType: 'carport',
            parkingBays: 1,
            totalUnits: 10,
            availableUnits: 8,
            reservedUnits: 1,
          },
        ],
      },
    });

    expect(payload).toMatchObject({
      name: 'Canonical Submit',
      tagline: 'Future ready',
      developmentType: 'residential',
      transactionType: 'for_sale',
      ownershipType: 'sectional-title',
      address: '1 Submit Road',
      city: 'Cape Town',
      province: 'Western Cape',
      priceFrom: 1_250_000,
      priceTo: 1_400_000,
      amenities: ['Pool'],
      totalUnits: 10,
      availableUnits: 8,
    });
    expect(payload.features).toEqual(
      expect.arrayContaining([
        'cfg:res_type:apartment',
        'cfg:comm_type:security_estate',
        'cfg:hoa:true',
        'cfg:governance_type:hoa',
      ]),
    );
    expect(payload.images).toEqual([
      { url: 'https://example.com/hero.jpg', category: 'hero' },
      { url: 'https://example.com/photo.jpg', category: 'gallery' },
    ]);
    expect(payload.videos).toEqual(['https://example.com/video.mp4']);
    expect(payload.floorPlans).toEqual(['https://example.com/floorplan.pdf']);
    expect(payload.brochures).toEqual(['https://example.com/brochure.pdf']);
    expect(payload.media.floorPlans).toEqual([{ url: 'https://example.com/floorplan.pdf' }]);
    expect(payload.unitTypes[0]).toMatchObject({
      id: 'unit-1',
      basePriceFrom: 1_200_000,
      basePriceTo: 1_350_000,
      parkingType: 'carport',
    });
  });

  it('does not manufacture empty media fields when submit source has no media', () => {
    const payload = buildDevelopmentSubmitPayload({
      amenities: [],
      wizardData: {
        name: 'No Media Submit',
        description: 'Missing media should not clear stored media during updates.',
        developmentType: 'residential',
        transactionType: 'for_sale',
        location: {
          city: 'Cape Town',
          province: 'Western Cape',
        },
        unitTypes: [
          {
            id: 'unit-1',
            name: 'No Media Type',
            bedrooms: 2,
            bathrooms: 2,
            priceFrom: 1_200_000,
            totalUnits: 4,
            availableUnits: 3,
          },
        ],
      },
    });

    expect(payload).not.toHaveProperty('images');
    expect(payload).not.toHaveProperty('videos');
    expect(payload).not.toHaveProperty('floorPlans');
    expect(payload).not.toHaveProperty('brochures');
    expect(payload).not.toHaveProperty('media');
  });

  it('prefers canonical step unit types and transaction type over stale root mirrors', () => {
    const payload = buildDevelopmentSubmitPayload({
      amenities: [],
      wizardData: {
        name: 'Canonical Rent Submit',
        description: 'Canonical submit should use the keyed workflow snapshot.',
        developmentType: 'residential',
        transactionType: 'for_sale',
        location: {
          city: 'Cape Town',
          province: 'Western Cape',
        },
        unitTypes: [
          {
            id: 'stale-root-unit',
            name: 'Stale Sale Unit',
            bedrooms: 3,
            bathrooms: 2,
            priceFrom: 2_000_000,
            priceTo: 2_200_000,
            totalUnits: 5,
            availableUnits: 5,
          },
        ],
        stepData: {
          configuration: {
            developmentType: 'residential',
            transactionType: 'for_rent',
          },
          unit_types: {
            unitTypes: [
              {
                id: 'canonical-step-unit',
                name: 'Canonical Rental Unit',
                bedrooms: 2,
                bathrooms: 1,
                priceFrom: 1_500_000,
                monthlyRentFrom: 12_500,
                monthlyRentTo: 14_000,
                totalUnits: 8,
                availableUnits: 6,
              },
            ],
          },
        },
      },
    });

    expect(payload).toMatchObject({
      transactionType: 'for_rent',
      monthlyRentFrom: 12_500,
      monthlyRentTo: 14_000,
      priceFrom: undefined,
      priceTo: undefined,
      totalUnits: 8,
      availableUnits: 6,
    });
    expect(payload.unitTypes).toHaveLength(1);
    expect(payload.unitTypes[0]).toMatchObject({
      id: 'canonical-step-unit',
      monthlyRentFrom: 12_500,
      monthlyRentTo: 14_000,
    });
    expect(payload.unitTypes[0]).not.toHaveProperty('basePriceFrom');
    expect(payload.unitTypes[0]).not.toHaveProperty('priceFrom');
  });

  it('embeds the canonical workflow snapshot with normalized submit units', () => {
    const payload = buildDevelopmentSubmitPayload({
      amenities: ['Stale caller amenity'],
      canonicalSnapshot: {
        workflowId: 'residential_sale',
        currentStepId: 'review_publish',
        completedSteps: ['configuration', 'amenities_features', 'unit_types'],
        developmentData: {
          name: 'Snapshot Name',
          transactionType: 'sale',
          developmentType: 'residential',
          amenities: ['Stale development amenity'],
          features: ['Stale development feature'],
          media: {
            heroImage: {
              id: 'snapshot-hero',
              url: 'https://example.com/snapshot-hero.jpg',
              type: 'image',
            },
            photos: [],
            videos: [{ url: 'https://example.com/snapshot-video.mp4' }],
            floorPlans: [{ url: 'https://example.com/snapshot-floorplan.pdf' }],
            documents: [{ url: 'https://example.com/snapshot-brochure.pdf' }],
          },
        },
        stepData: {
          configuration: {
            developmentType: 'residential',
            transactionType: 'sale',
          },
          unit_types: {
            unitTypes: [{ id: 'stale-snapshot-unit' }],
            selectedUnitId: 'submit-unit-1',
          },
          amenities_features: {
            amenities: ['Canonical pool'],
            features: ['Solar ready'],
          },
        },
      },
      wizardData: {
        name: 'Submit With Snapshot',
        description: 'Submit payload should keep canonical workflow snapshot data.',
        developmentType: 'residential',
        transactionType: 'sale',
        location: {
          city: 'Cape Town',
          province: 'Western Cape',
        },
        stepData: {
          configuration: {
            developmentType: 'residential',
            transactionType: 'sale',
          },
          unit_types: {
            unitTypes: [
              {
                id: 'submit-unit-1',
                name: 'Submit Unit',
                bedrooms: 2,
                bathrooms: 2,
                priceFrom: 1_250_000,
                monthlyRentFrom: 12_500,
                totalUnits: 4,
                availableUnits: 3,
              },
            ],
          },
        },
      },
    });

    expect(payload).toMatchObject({
      workflowId: 'residential_sale',
      currentStepId: 'review_publish',
      completedSteps: ['configuration', 'amenities_features', 'unit_types'],
      name: 'Snapshot Name',
      transactionType: 'for_sale',
      priceFrom: 1_250_000,
      amenities: ['Canonical pool'],
      features: ['Solar ready'],
      totalUnits: 4,
      availableUnits: 3,
    });
    expect(payload.developmentData).toMatchObject({
      name: 'Snapshot Name',
      developmentType: 'residential',
      transactionType: 'for_sale',
      amenities: ['Canonical pool'],
      features: ['Solar ready'],
    });
    expect(payload.images).toEqual([
      { url: 'https://example.com/snapshot-hero.jpg', category: 'hero' },
    ]);
    expect(payload.videos).toEqual(['https://example.com/snapshot-video.mp4']);
    expect(payload.floorPlans).toEqual(['https://example.com/snapshot-floorplan.pdf']);
    expect(payload.brochures).toEqual(['https://example.com/snapshot-brochure.pdf']);
    expect(payload.media.floorPlans).toEqual([
      { url: 'https://example.com/snapshot-floorplan.pdf' },
    ]);
    expect(payload.stepData.unit_types).toMatchObject({
      selectedUnitId: 'submit-unit-1',
      unitTypes: [
        expect.objectContaining({
          id: 'submit-unit-1',
          basePriceFrom: 1_250_000,
        }),
      ],
    });
    expect(payload.unitTypes[0]).not.toHaveProperty('monthlyRentFrom');
    expect(payload.stepData.unit_types.unitTypes[0]).not.toHaveProperty('monthlyRentFrom');
  });

  it('allows canonical amenities and feature labels to clear stale caller mirrors', () => {
    const payload = buildDevelopmentSubmitPayload({
      amenities: ['Legacy selected amenity'],
      canonicalSnapshot: {
        workflowId: 'residential_sale',
        currentStepId: 'amenities_features',
        completedSteps: ['configuration', 'amenities_features'],
        developmentData: {
          name: 'Amenity Clear Snapshot',
          transactionType: 'sale',
          developmentType: 'residential',
          amenities: ['Legacy development amenity'],
          features: ['Legacy development feature'],
        },
        stepData: {
          configuration: {
            developmentType: 'residential',
            transactionType: 'sale',
          },
          amenities_features: {
            amenities: [],
            features: [],
          },
        },
      },
      wizardData: {
        name: 'Stale Amenity Wizard',
        developmentType: 'residential',
        transactionType: 'sale',
        amenities: ['Stale root amenity'],
        features: ['Stale root feature'],
      },
    });

    expect(payload.amenities).toEqual([]);
    expect(payload.features).toEqual([]);
    expect(payload.developmentData).toMatchObject({
      amenities: [],
      features: [],
    });
  });

  it('builds explicit update payloads from a canonical draft snapshot', () => {
    const canonicalSnapshot = {
      workflowId: 'residential_rent',
      currentStepId: 'unit_types',
      completedSteps: ['configuration', 'identity_market', 'unit_types'],
      developmentData: {
        name: 'Resumed Rental Draft',
        description: 'Update payload should be sourced from the canonical draft snapshot.',
        developmentType: 'residential',
        transactionType: 'for_rent',
        status: 'selling',
        location: {
          address: '7 Resume Road',
          city: 'Cape Town',
          province: 'Western Cape',
        },
      },
      stepData: {
        configuration: {
          developmentType: 'residential',
          transactionType: 'for_rent',
        },
        unit_types: {
          selectedUnitId: 'db-rent-unit-1',
          unitTypes: [
            {
              id: 'db-rent-unit-1',
              name: 'Rent Unit',
              bedrooms: 2,
              bathrooms: 2,
              monthlyRentFrom: 15_000,
              monthlyRentTo: 18_500,
              basePriceFrom: 1_900_000,
              totalUnits: 12,
              availableUnits: 9,
            },
          ],
        },
      },
      unitTypes: [
        {
          id: 'db-rent-unit-1',
          name: 'Rent Unit',
          bedrooms: 2,
          bathrooms: 2,
          monthlyRentFrom: 15_000,
          monthlyRentTo: 18_500,
          basePriceFrom: 1_900_000,
          totalUnits: 12,
          availableUnits: 9,
        },
      ],
    };

    const resumedWizardData = buildDevelopmentWizardDataFromCanonicalSnapshot(canonicalSnapshot);
    const payload = buildDevelopmentUpdatePayload({
      canonicalSnapshot,
      amenities: [],
    });

    expect(resumedWizardData).toMatchObject({
      workflowId: 'residential_rent',
      currentStepId: 'unit_types',
      name: 'Resumed Rental Draft',
      unitTypes: canonicalSnapshot.unitTypes,
    });
    expect(payload).toMatchObject({
      workflowId: 'residential_rent',
      currentStepId: 'unit_types',
      name: 'Resumed Rental Draft',
      transactionType: 'for_rent',
      monthlyRentFrom: 15_000,
      monthlyRentTo: 18_500,
      totalUnits: 12,
      availableUnits: 9,
    });
    expect(payload.unitTypes[0]).toMatchObject({
      id: 'db-rent-unit-1',
      monthlyRentFrom: 15_000,
      monthlyRentTo: 18_500,
    });
    expect(payload.unitTypes[0]).not.toHaveProperty('basePriceFrom');
    expect(payload.stepData.unit_types).toMatchObject({
      selectedUnitId: 'db-rent-unit-1',
      unitTypes: [expect.objectContaining({ id: 'db-rent-unit-1' })],
    });
    expect(payload.stepData.unit_types.unitTypes[0]).toEqual(payload.unitTypes[0]);
  });

  it('uses canonical step owners when rebuilding update payloads from resumed snapshots', () => {
    const canonicalSnapshot = {
      workflowId: 'residential_rent',
      currentStepId: 'governance_finances',
      completedSteps: ['configuration', 'identity_market', 'location', 'marketing_summary'],
      developmentData: {
        name: 'Step Owned Rental Draft',
        description: 'Stale root description.',
        developmentType: 'residential',
        transactionType: 'for_rent',
        status: 'draft',
        highlights: ['Stale root highlight'],
        monthlyLevyFrom: 900,
        ratesFrom: 700,
        location: {
          address: '1 Stale Road',
          suburb: 'Old Suburb',
          city: 'Old City',
          province: 'Old Province',
          postalCode: '0001',
        },
      },
      stepData: {
        configuration: {
          developmentType: 'residential',
          transactionType: 'for_rent',
        },
        location: {
          address: '22 Canonical Lane',
          suburb: 'Green Point',
          city: 'Cape Town',
          province: 'Western Cape',
          postalCode: '8051',
          latitude: '-33.906',
          longitude: '18.405',
        },
        marketing_summary: {
          description: 'Canonical marketing summary wins.',
          tagline: 'Built from the canonical path',
          keySellingPoints: ['Stable demand', 'Secure parking', 'Walkable location'],
        },
        governance_finances: {
          levyRange: { min: 1_250, max: 1_750 },
          rightsAndTaxes: { min: 950, max: 1_200 },
          transferCostsIncluded: true,
        },
        unit_types: {
          selectedUnitId: 'rent-unit-step-owned',
          unitTypes: [
            {
              id: 'rent-unit-step-owned',
              name: 'Step Owned Rent Unit',
              bedrooms: 2,
              bathrooms: 2,
              monthlyRentFrom: 15_500,
              monthlyRentTo: 18_500,
              totalUnits: 12,
              availableUnits: 8,
            },
          ],
        },
      },
    };

    const resumedWizardData = buildDevelopmentWizardDataFromCanonicalSnapshot(canonicalSnapshot);
    const payload = buildDevelopmentUpdatePayload({
      canonicalSnapshot,
      amenities: [],
    });

    expect(resumedWizardData).toMatchObject({
      location: {
        address: '22 Canonical Lane',
        suburb: 'Green Point',
        city: 'Cape Town',
        province: 'Western Cape',
      },
      description: 'Canonical marketing summary wins.',
      tagline: 'Built from the canonical path',
      highlights: ['Stable demand', 'Secure parking', 'Walkable location'],
      monthlyLevyFrom: 1_250,
      ratesFrom: 950,
    });
    expect(payload).toMatchObject({
      address: '22 Canonical Lane',
      suburb: 'Green Point',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '8051',
      description: 'Canonical marketing summary wins.',
      tagline: 'Built from the canonical path',
      highlights: ['Stable demand', 'Secure parking', 'Walkable location'],
      monthlyLevyFrom: 1_250,
      monthlyLevyTo: 1_750,
      ratesFrom: 950,
      ratesTo: 1_200,
      transferCostsIncluded: true,
      monthlyRentFrom: 15_500,
      monthlyRentTo: 18_500,
    });
    expect(payload.developmentData).toMatchObject({
      location: {
        address: '22 Canonical Lane',
        suburb: 'Green Point',
        city: 'Cape Town',
        province: 'Western Cape',
      },
      description: 'Canonical marketing summary wins.',
      tagline: 'Built from the canonical path',
      highlights: ['Stable demand', 'Secure parking', 'Walkable location'],
      monthlyLevyFrom: 1_250,
      ratesFrom: 950,
    });
  });

  it('keeps edit identity and legacy draft shell fields out of update mutation payloads', () => {
    const canonicalSnapshot = {
      workflowId: 'residential_sale',
      currentStepId: 'review_publish',
      completedSteps: ['configuration', 'identity_market', 'unit_types'],
      editingId: 987,
      developmentId: 987,
      currentPhase: 10,
      currentStep: 10,
      unitTypeDraft: { name: 'Compatibility draft only' },
      overview: { metaTitle: 'Compatibility overview only' },
      finalisation: { accepted: true },
      _version: '3.0',
      _savedAt: 1710000000000,
      developmentData: {
        name: 'Owned Update Payload',
        description: 'The mutation payload should keep canonical data, not draft shell fields.',
        developmentType: 'residential',
        transactionType: 'for_sale',
        status: 'selling',
        location: {
          address: '12 Ownership Road',
          city: 'Cape Town',
          province: 'Western Cape',
        },
      },
      stepData: {
        configuration: {
          developmentType: 'residential',
          transactionType: 'sale',
        },
        unit_types: {
          selectedUnitId: 'db-sale-unit-1',
          unitTypes: [
            {
              id: 'db-sale-unit-1',
              name: 'Sale Unit',
              bedrooms: 2,
              bathrooms: 2,
              priceFrom: 1_650_000,
              monthlyRentFrom: 16_000,
              totalUnits: 10,
              availableUnits: 6,
            },
          ],
        },
      },
      unitTypes: [
        {
          id: 'db-sale-unit-1',
          name: 'Sale Unit',
          bedrooms: 2,
          bathrooms: 2,
          priceFrom: 1_650_000,
          monthlyRentFrom: 16_000,
          totalUnits: 10,
          availableUnits: 6,
        },
      ],
    };

    const payload = buildDevelopmentUpdatePayload({
      canonicalSnapshot,
      amenities: [],
    });

    expect(payload).toMatchObject({
      workflowId: 'residential_sale',
      currentStepId: 'review_publish',
      completedSteps: ['configuration', 'identity_market', 'unit_types'],
      name: 'Owned Update Payload',
      transactionType: 'for_sale',
      priceFrom: 1_650_000,
      totalUnits: 10,
      availableUnits: 6,
    });
    expect(payload.unitTypes[0]).toMatchObject({
      id: 'db-sale-unit-1',
      basePriceFrom: 1_650_000,
    });
    expect(payload.stepData.unit_types.unitTypes[0]).toEqual(payload.unitTypes[0]);
    expect(payload).not.toHaveProperty('editingId');
    expect(payload).not.toHaveProperty('developmentId');
    expect(payload).not.toHaveProperty('currentPhase');
    expect(payload).not.toHaveProperty('currentStep');
    expect(payload).not.toHaveProperty('unitTypeDraft');
    expect(payload).not.toHaveProperty('overview');
    expect(payload).not.toHaveProperty('finalisation');
    expect(payload).not.toHaveProperty('_version');
    expect(payload).not.toHaveProperty('_savedAt');
    expect(payload.unitTypes[0]).not.toHaveProperty('monthlyRentFrom');
  });

  it('uses canonical update inventory over stale root mirrors for full-sync edits', () => {
    const canonicalSnapshot = {
      workflowId: 'residential_sale',
      currentStepId: 'review_publish',
      completedSteps: ['configuration', 'identity_market', 'unit_types'],
      developmentData: {
        name: 'Canonical Inventory Update',
        description: 'The canonical unit_types step owns edit inventory.',
        developmentType: 'residential',
        transactionType: 'for_sale',
        status: 'selling',
        location: {
          city: 'Cape Town',
          province: 'Western Cape',
        },
      },
      stepData: {
        configuration: {
          developmentType: 'residential',
          transactionType: 'sale',
        },
        unit_types: {
          selectedUnitId: 'unit-a',
          unitTypes: [
            {
              id: 'unit-a',
              name: 'Canonical Type A',
              bedrooms: 2,
              bathrooms: 2,
              priceFrom: 1_850_000,
              priceTo: 1_950_000,
              totalUnits: 8,
              availableUnits: 5,
            },
          ],
        },
      },
      unitTypes: [
        {
          id: 'unit-a',
          name: 'Stale Root Type A',
          bedrooms: 1,
          bathrooms: 1,
          priceFrom: 1_100_000,
          totalUnits: 99,
          availableUnits: 99,
        },
        {
          id: 'unit-b',
          name: 'Removed Root Type B',
          bedrooms: 3,
          bathrooms: 2,
          priceFrom: 2_400_000,
          totalUnits: 4,
          availableUnits: 4,
        },
      ],
    };

    const payload = buildDevelopmentUpdatePayload({
      canonicalSnapshot,
      amenities: [],
    });

    expect(payload.unitTypes).toEqual([
      expect.objectContaining({
        id: 'unit-a',
        name: 'Canonical Type A',
        bedrooms: 2,
        bathrooms: 2,
        basePriceFrom: 1_850_000,
        basePriceTo: 1_950_000,
        totalUnits: 8,
        availableUnits: 5,
      }),
    ]);
    expect(payload.priceFrom).toBe(1_850_000);
    expect(payload.totalUnits).toBe(8);
    expect(payload.availableUnits).toBe(5);
    expect(payload.stepData.unit_types.unitTypes).toEqual(payload.unitTypes);
    expect(payload.stepData.unit_types.selectedUnitId).toBe('unit-a');
  });

  it('uses edited canonical sale prices ahead of stale hydrated base price mirrors', () => {
    const canonicalSnapshot = {
      workflowId: 'residential_sale',
      currentStepId: 'review_publish',
      completedSteps: ['configuration', 'identity_market', 'unit_types'],
      developmentData: {
        name: 'Hydrated Sale Edit',
        description: 'Edited sale prices should own the commercial inventory.',
        developmentType: 'residential',
        transactionType: 'for_sale',
        status: 'selling',
        location: {
          city: 'Cape Town',
          province: 'Western Cape',
        },
      },
      stepData: {
        configuration: {
          developmentType: 'residential',
          transactionType: 'sale',
        },
        unit_types: {
          unitTypes: [
            {
              id: 'sale-unit-a',
              name: 'Sale Unit A',
              bedrooms: 2,
              bathrooms: 2,
              basePriceFrom: 1_250_000,
              basePriceTo: 1_450_000,
              priceFrom: 1_500_000,
              priceTo: 1_750_000,
              totalUnits: 10,
              availableUnits: 7,
            },
          ],
        },
      },
    };

    const payload = buildDevelopmentUpdatePayload({
      canonicalSnapshot,
      amenities: [],
    });

    expect(payload).toMatchObject({
      priceFrom: 1_500_000,
      priceTo: 1_750_000,
    });
    expect(payload.unitTypes[0]).toMatchObject({
      id: 'sale-unit-a',
      basePriceFrom: 1_500_000,
      basePriceTo: 1_750_000,
    });
    expect(payload.stepData.unit_types.unitTypes[0]).toEqual(payload.unitTypes[0]);
  });

  it('omits inventory-owned fields for keyed partial updates outside inventory steps', () => {
    const canonicalSnapshot = {
      workflowId: 'residential_sale',
      currentStepId: 'development_media',
      completedSteps: ['configuration', 'identity_market', 'unit_types', 'development_media'],
      developmentData: {
        name: 'Media Partial Update',
        description: 'Media-only saves should not resend commercial inventory.',
        developmentType: 'residential',
        transactionType: 'for_sale',
        status: 'selling',
      },
      stepData: {
        unit_types: {
          selectedUnitId: 'unit-a',
          unitTypes: [
            {
              id: 'unit-a',
              name: 'Canonical Type A',
              bedrooms: 2,
              bathrooms: 2,
              priceFrom: 1_850_000,
              totalUnits: 8,
              availableUnits: 5,
            },
          ],
        },
        development_media: {
          images: [{ url: 'https://example.com/new-hero.jpg' }],
          videos: [],
        },
      },
      unitTypes: [
        {
          id: 'stale-root-unit',
          name: 'Stale Root Type',
          bedrooms: 1,
          bathrooms: 1,
          priceFrom: 950_000,
          totalUnits: 99,
          availableUnits: 99,
        },
      ],
    };

    const payload = buildDevelopmentPartialUpdatePayload({
      canonicalSnapshot,
      amenities: [],
    });

    expect(payload.currentStepId).toBe('development_media');
    expect(payload[CANONICAL_UPDATE_MODE_FIELD]).toBe(CANONICAL_PARTIAL_UPDATE_MODE);
    expect(payload.stepData.development_media).toEqual({
      images: [{ url: 'https://example.com/new-hero.jpg' }],
      videos: [],
    });
    expect(payload.stepData).not.toHaveProperty('unit_types');
    expect(payload).not.toHaveProperty('media');
    expect(payload).not.toHaveProperty('unitTypes');
    expect(payload).not.toHaveProperty('totalUnits');
    expect(payload).not.toHaveProperty('availableUnits');
    expect(payload).not.toHaveProperty('priceFrom');
    expect(payload).not.toHaveProperty('priceTo');
    expect(payload).not.toHaveProperty('city');
    expect(payload).not.toHaveProperty('province');
    expect(payload).not.toHaveProperty('address');
    expect(payload).not.toHaveProperty('monthlyRentFrom');
    expect(payload).not.toHaveProperty('monthlyRentTo');
    expect(payload).not.toHaveProperty('auctionStartDate');
    expect(payload).not.toHaveProperty('auctionEndDate');
    expect(payload).not.toHaveProperty('startingBidFrom');
    expect(payload).not.toHaveProperty('reservePriceFrom');
  });

  it('scopes amenities partial updates to explicit amenities_features step fields', () => {
    const canonicalSnapshot = {
      workflowId: 'residential_sale',
      currentStepId: 'amenities_features',
      completedSteps: ['configuration', 'identity_market', 'amenities_features'],
      developmentData: {
        name: 'Amenities Partial Update',
        developmentType: 'residential',
        transactionType: 'for_sale',
        amenities: ['Stale development amenity'],
        features: ['Stale development feature'],
      },
      stepData: {
        configuration: {
          developmentType: 'residential',
          transactionType: 'for_sale',
        },
        amenities_features: {
          amenities: ['Pool'],
        },
      },
    };

    const payload = buildDevelopmentPartialUpdatePayload({
      canonicalSnapshot,
      amenities: ['Stale caller amenity'],
      residentialConfig: {
        residentialType: 'apartment',
      },
    });

    expect(payload).toMatchObject({
      currentStepId: 'amenities_features',
      amenities: ['Pool'],
      stepData: {
        amenities_features: {
          amenities: ['Pool'],
        },
      },
    });
    expect(payload).not.toHaveProperty('features');
    expect(payload).not.toHaveProperty('developmentType');
    expect(payload).not.toHaveProperty('transactionType');
    expect(payload).not.toHaveProperty('unitTypes');
  });

  it('allows amenities partial updates to explicitly clear feature labels', () => {
    const payload = buildDevelopmentPartialUpdatePayload({
      amenities: ['Stale caller amenity'],
      residentialConfig: {
        residentialType: 'apartment',
      },
      canonicalSnapshot: {
        workflowId: 'residential_sale',
        currentStepId: 'amenities_features',
        completedSteps: ['configuration', 'identity_market', 'amenities_features'],
        developmentData: {
          name: 'Amenities Clear Partial Update',
          developmentType: 'residential',
          transactionType: 'for_sale',
          amenities: ['Stale development amenity'],
          features: ['Stale development feature'],
        },
        stepData: {
          configuration: {
            developmentType: 'residential',
            transactionType: 'for_sale',
          },
          amenities_features: {
            amenities: [],
            features: [],
          },
        },
      },
    });

    expect(payload.amenities).toEqual([]);
    expect(payload.features).toEqual([]);
    expect(payload.stepData.amenities_features).toEqual({
      amenities: [],
      features: [],
    });
  });

  it('keeps inventory-owned fields for keyed inventory partial updates', () => {
    const canonicalSnapshot = {
      workflowId: 'residential_sale',
      currentStepId: 'unit_types',
      completedSteps: ['configuration', 'identity_market', 'unit_types'],
      developmentData: {
        name: 'Inventory Partial Update',
        description: 'Unit type saves own commercial inventory.',
        developmentType: 'residential',
        transactionType: 'for_sale',
        status: 'selling',
      },
      stepData: {
        unit_types: {
          selectedUnitId: 'unit-a',
          unitTypes: [
            {
              id: 'unit-a',
              name: 'Canonical Type A',
              bedrooms: 2,
              bathrooms: 2,
              priceFrom: 1_850_000,
              totalUnits: 8,
              availableUnits: 5,
            },
          ],
        },
      },
    };

    const payload = buildDevelopmentPartialUpdatePayload({
      canonicalSnapshot,
      amenities: [],
    });

    expect(payload.currentStepId).toBe('unit_types');
    expect(payload.unitTypes).toEqual([
      expect.objectContaining({
        id: 'unit-a',
        name: 'Canonical Type A',
        totalUnits: 8,
        availableUnits: 5,
      }),
    ]);
    expect(payload.totalUnits).toBe(8);
    expect(payload.availableUnits).toBe(5);
    expect(payload.stepData.unit_types.unitTypes).toEqual(payload.unitTypes);
  });

  it('blocks unit_types partial transaction switches that omit persisted units', () => {
    const previousCanonicalSnapshot = {
      workflowId: 'residential_sale',
      currentStepId: 'unit_types',
      completedSteps: ['configuration', 'identity_market', 'unit_types'],
      developmentData: {
        developmentType: 'residential',
        transactionType: 'for_sale',
      },
      stepData: {
        unit_types: {
          unitTypes: [
            {
              id: 'unit-a',
              name: 'Type A',
              priceFrom: 1_250_000,
            },
            {
              id: 'unit-b',
              name: 'Type B',
              priceFrom: 1_850_000,
            },
          ],
        },
      },
    };
    const nextCanonicalSnapshot = {
      workflowId: 'residential_rent',
      currentStepId: 'unit_types',
      completedSteps: ['configuration', 'identity_market', 'unit_types'],
      developmentData: {
        developmentType: 'residential',
        transactionType: 'for_rent',
      },
      stepData: {
        configuration: {
          developmentType: 'residential',
          transactionType: 'for_rent',
        },
        unit_types: {
          selectedUnitId: 'unit-a',
          unitTypes: [
            {
              id: 'unit-a',
              name: 'Type A',
              monthlyRentFrom: 12_500,
              monthlyRentTo: 14_000,
            },
          ],
        },
      },
    };

    expect(() =>
      buildDevelopmentPartialUpdatePayload(
        {
          canonicalSnapshot: nextCanonicalSnapshot,
          amenities: [],
        },
        { previousCanonicalSnapshot },
      ),
    ).toThrow(/full unit catalogue/i);
  });

  it('requires persisted baseline for explicit edit progress saves', () => {
    const canonicalSnapshot = {
      workflowId: 'residential_sale',
      currentStepId: 'marketing_summary',
      completedSteps: ['configuration', 'identity_market'],
      developmentData: {
        developmentType: 'residential',
        transactionType: 'for_sale',
      },
      stepData: {
        marketing_summary: {
          description: 'Progress save description',
        },
      },
    };

    expect(() =>
      buildDevelopmentEditProgressPayload(
        {
          canonicalSnapshot,
          amenities: [],
        },
        {} as any,
      ),
    ).toThrow(/baseline snapshot/i);
  });

  it('builds explicit edit progress saves as baseline-aware partial updates', () => {
    const previousCanonicalSnapshot = {
      workflowId: 'residential_sale',
      currentStepId: 'marketing_summary',
      completedSteps: ['configuration', 'identity_market', 'location', 'unit_types'],
      developmentData: {
        name: 'Persisted Edit',
        description: 'Persisted description',
        developmentType: 'residential',
        transactionType: 'for_sale',
        location: {
          city: 'Cape Town',
          province: 'Western Cape',
        },
      },
      stepData: {
        unit_types: {
          unitTypes: [{ id: 'unit-a', name: 'Type A', priceFrom: 1_250_000 }],
        },
      },
    };

    const payload = buildDevelopmentEditProgressPayload(
      {
        amenities: [],
        canonicalSnapshot: {
          ...previousCanonicalSnapshot,
          currentStepId: 'marketing_summary',
          developmentData: {
            ...previousCanonicalSnapshot.developmentData,
            description: 'Updated progress description',
            location: {
              city: 'Stale Mirror City',
              province: 'Stale Mirror Province',
            },
          },
          stepData: {
            ...previousCanonicalSnapshot.stepData,
            marketing_summary: {
              description: 'Updated progress description',
              tagline: 'Updated progress tagline',
              keySellingPoints: ['Views'],
            },
          },
        },
      },
      { previousCanonicalSnapshot },
    );

    expect(payload[CANONICAL_UPDATE_MODE_FIELD]).toBe(CANONICAL_PARTIAL_UPDATE_MODE);
    expect(payload).toMatchObject({
      currentStepId: 'marketing_summary',
      description: 'Updated progress description',
      tagline: 'Updated progress tagline',
      highlights: ['Views'],
      stepData: {
        marketing_summary: {
          description: 'Updated progress description',
          tagline: 'Updated progress tagline',
          keySellingPoints: ['Views'],
        },
      },
    });
    expect(payload).not.toHaveProperty('city');
    expect(payload).not.toHaveProperty('unitTypes');
    expect(payload).not.toHaveProperty('priceFrom');
  });

  it('builds edit autosave location payloads without media, governance, or unit ownership', () => {
    const previousCanonicalSnapshot = {
      workflowId: 'residential_rent',
      currentStepId: 'location',
      completedSteps: ['configuration', 'identity_market', 'location', 'development_media'],
      developmentData: {
        name: 'Persisted Rental Edit',
        developmentType: 'residential',
        transactionType: 'for_rent',
        location: {
          city: 'Cape Town',
          province: 'Western Cape',
        },
        media: {
          photos: [{ url: 'https://example.com/original-photo.jpg' }],
        },
        monthlyLevyFrom: 900,
      },
      stepData: {
        location: {
          city: 'Cape Town',
          province: 'Western Cape',
        },
        development_media: {
          photos: [{ url: 'https://example.com/original-photo.jpg' }],
        },
        unit_types: {
          unitTypes: [{ id: 'rent-a', name: 'Rental A', monthlyRentFrom: 12_500 }],
        },
      },
    };

    const payload = buildDevelopmentEditAutosavePayload(
      {
        amenities: [],
        canonicalSnapshot: {
          ...previousCanonicalSnapshot,
          currentStepId: 'location',
          developmentData: {
            ...previousCanonicalSnapshot.developmentData,
            location: {
              city: 'Johannesburg',
              province: 'Gauteng',
              suburb: 'Rosebank',
              address: '1 Autosave Street',
            },
            media: {
              photos: [{ url: 'https://example.com/stale-mirror-photo.jpg' }],
            },
            monthlyLevyFrom: 1500,
          },
          stepData: {
            ...previousCanonicalSnapshot.stepData,
            location: {
              city: 'Johannesburg',
              province: 'Gauteng',
              suburb: 'Rosebank',
              address: '1 Autosave Street',
            },
          },
        },
      },
      { previousCanonicalSnapshot },
    );

    expect(payload[CANONICAL_UPDATE_MODE_FIELD]).toBe(CANONICAL_PARTIAL_UPDATE_MODE);
    expect(payload).toMatchObject({
      currentStepId: 'location',
      address: '1 Autosave Street',
      city: 'Johannesburg',
      province: 'Gauteng',
      suburb: 'Rosebank',
      stepData: {
        location: {
          city: 'Johannesburg',
          province: 'Gauteng',
          suburb: 'Rosebank',
          address: '1 Autosave Street',
        },
      },
    });
    expect(payload).not.toHaveProperty('images');
    expect(payload).not.toHaveProperty('media');
    expect(payload).not.toHaveProperty('monthlyLevyFrom');
    expect(payload).not.toHaveProperty('unitTypes');
    expect(payload.stepData).not.toHaveProperty('development_media');
    expect(payload.stepData).not.toHaveProperty('unit_types');
  });

  it('builds edit autosave media payloads without location, governance, or unit ownership', () => {
    const previousCanonicalSnapshot = {
      workflowId: 'residential_auction',
      currentStepId: 'development_media',
      completedSteps: ['configuration', 'identity_market', 'location', 'development_media'],
      developmentData: {
        name: 'Persisted Auction Edit',
        developmentType: 'residential',
        transactionType: 'auction',
        location: {
          city: 'Pretoria',
          province: 'Gauteng',
        },
        media: {
          photos: [{ url: 'https://example.com/original-auction-photo.jpg' }],
          brochures: [{ url: 'https://example.com/original-auction-pack.pdf' }],
        },
        ratesFrom: 1200,
      },
      stepData: {
        location: {
          city: 'Pretoria',
          province: 'Gauteng',
        },
        development_media: {
          photos: [{ url: 'https://example.com/original-auction-photo.jpg' }],
          brochures: [{ url: 'https://example.com/original-auction-pack.pdf' }],
        },
        unit_types: {
          unitTypes: [{ id: 'auction-a', name: 'Auction Lot A', startingBid: 950_000 }],
        },
      },
    };

    const payload = buildDevelopmentEditAutosavePayload(
      {
        amenities: [],
        canonicalSnapshot: {
          ...previousCanonicalSnapshot,
          currentStepId: 'development_media',
          developmentData: {
            ...previousCanonicalSnapshot.developmentData,
            location: {
              city: 'Stale Mirror City',
              province: 'Stale Mirror Province',
            },
            media: {
              heroImage: { url: 'https://example.com/new-hero.jpg' },
              photos: [{ url: 'https://example.com/new-gallery.jpg' }],
              floorPlans: [{ url: 'https://example.com/new-plan.pdf' }],
              brochures: [{ url: 'https://example.com/new-pack.pdf' }],
            },
            ratesFrom: 2200,
          },
          stepData: {
            ...previousCanonicalSnapshot.stepData,
            development_media: {
              heroImage: { url: 'https://example.com/new-hero.jpg' },
              photos: [{ url: 'https://example.com/new-gallery.jpg' }],
              floorPlans: [{ url: 'https://example.com/new-plan.pdf' }],
              brochures: [{ url: 'https://example.com/new-pack.pdf' }],
            },
          },
        },
      },
      { previousCanonicalSnapshot },
    );

    expect(payload[CANONICAL_UPDATE_MODE_FIELD]).toBe(CANONICAL_PARTIAL_UPDATE_MODE);
    expect(payload).toMatchObject({
      currentStepId: 'development_media',
      images: [
        { url: 'https://example.com/new-hero.jpg', category: 'hero' },
        { url: 'https://example.com/new-gallery.jpg', category: undefined },
      ],
      floorPlans: ['https://example.com/new-plan.pdf'],
      brochures: ['https://example.com/new-pack.pdf'],
      stepData: {
        development_media: {
          heroImage: { url: 'https://example.com/new-hero.jpg' },
          photos: [{ url: 'https://example.com/new-gallery.jpg' }],
          floorPlans: [{ url: 'https://example.com/new-plan.pdf' }],
          brochures: [{ url: 'https://example.com/new-pack.pdf' }],
        },
      },
    });
    expect(payload).not.toHaveProperty('city');
    expect(payload).not.toHaveProperty('province');
    expect(payload).not.toHaveProperty('ratesFrom');
    expect(payload).not.toHaveProperty('unitTypes');
    expect(payload.stepData).not.toHaveProperty('location');
    expect(payload.stepData).not.toHaveProperty('unit_types');
  });

  it('allows unit_types partial transaction switches when every persisted unit is included', () => {
    const previousCanonicalSnapshot = {
      workflowId: 'residential_sale',
      currentStepId: 'unit_types',
      completedSteps: ['configuration', 'identity_market', 'unit_types'],
      developmentData: {
        developmentType: 'residential',
        transactionType: 'for_sale',
      },
      stepData: {
        unit_types: {
          unitTypes: [
            { id: 'unit-a', name: 'Type A', priceFrom: 1_250_000 },
            { id: 'unit-b', name: 'Type B', priceFrom: 1_850_000 },
          ],
        },
      },
    };

    const payload = buildDevelopmentPartialUpdatePayload(
      {
        amenities: [],
        canonicalSnapshot: {
          workflowId: 'residential_rent',
          currentStepId: 'unit_types',
          completedSteps: ['configuration', 'identity_market', 'unit_types'],
          developmentData: {
            developmentType: 'residential',
            transactionType: 'for_rent',
          },
          stepData: {
            configuration: {
              developmentType: 'residential',
              transactionType: 'for_rent',
            },
            unit_types: {
              unitTypes: [
                {
                  id: 'unit-a',
                  name: 'Type A',
                  monthlyRentFrom: 12_500,
                },
                {
                  id: 'unit-b',
                  name: 'Type B',
                  monthlyRentFrom: 18_500,
                },
              ],
            },
          },
        },
      },
      { previousCanonicalSnapshot },
    );

    expect(payload.currentStepId).toBe('unit_types');
    expect(payload.transactionType).toBe('for_rent');
    expect(payload.unitTypes.map((unit: any) => unit.id)).toEqual(['unit-a', 'unit-b']);
    expect(payload[CANONICAL_UPDATE_MODE_FIELD]).toBe(CANONICAL_PARTIAL_UPDATE_MODE);
  });

  it('keeps unit display order in explicit unit_types edit progress payloads', () => {
    const previousCanonicalSnapshot = {
      workflowId: 'residential_rent',
      currentStepId: 'unit_types',
      completedSteps: ['configuration', 'identity_market'],
      developmentData: {
        developmentType: 'residential',
        transactionType: 'for_rent',
      },
      stepData: {
        unit_types: {
          unitTypes: [
            { id: 'unit-a', name: 'Type A', monthlyRentFrom: 12_000, displayOrder: 0 },
            { id: 'unit-b', name: 'Type B', monthlyRentFrom: 18_000, displayOrder: 1 },
          ],
        },
      },
    };

    const payload = buildDevelopmentEditProgressPayload(
      {
        amenities: [],
        canonicalSnapshot: {
          ...previousCanonicalSnapshot,
          stepData: {
            unit_types: {
              unitTypes: [
                { id: 'unit-b', name: 'Type B', monthlyRentFrom: 18_000, displayOrder: 0 },
                { id: 'unit-a', name: 'Type A Updated', monthlyRentFrom: 13_000, displayOrder: 1 },
              ],
            },
          },
        },
      },
      { previousCanonicalSnapshot },
    );

    expect(payload).toMatchObject({
      canonicalUpdateMode: 'partial_step',
      currentStepId: 'unit_types',
      unitTypes: [
        { id: 'unit-b', displayOrder: 0 },
        { id: 'unit-a', name: 'Type A Updated', displayOrder: 1 },
      ],
    });
    expect(payload.stepData.unit_types.unitTypes).toEqual(payload.unitTypes);
  });

  it('keeps review edit saves scoped unless publish intent is explicit', () => {
    const canonicalSnapshot = {
      workflowId: 'residential_sale',
      currentStepId: 'review_publish',
      completedSteps: [
        'configuration',
        'identity_market',
        'location',
        'governance_finances',
        'amenities_features',
        'marketing_summary',
        'development_media',
        'unit_types',
        'review_publish',
      ],
      developmentData: {
        name: 'Stale Review Mirror Name',
        description: 'Stale review mirror description.',
        developmentType: 'residential',
        transactionType: 'for_sale',
        status: 'selling',
        location: {
          city: 'Stale City',
          province: 'Stale Province',
        },
      },
      stepData: {
        review_publish: {
          confirmed: true,
        },
        unit_types: {
          unitTypes: [
            {
              id: 'unit-a',
              name: 'Canonical Type A',
              bedrooms: 2,
              bathrooms: 2,
              priceFrom: 1_850_000,
              totalUnits: 8,
              availableUnits: 5,
            },
          ],
        },
      },
    };

    const partialPayload = buildDevelopmentEditSavePayload({
      canonicalSnapshot,
      amenities: [],
    });

    expect(partialPayload[CANONICAL_UPDATE_MODE_FIELD]).toBe(CANONICAL_PARTIAL_UPDATE_MODE);
    expect(partialPayload).toMatchObject({
      workflowId: 'residential_sale',
      currentStepId: 'review_publish',
      completedSteps: canonicalSnapshot.completedSteps,
      stepData: {
        review_publish: {
          confirmed: true,
        },
      },
    });
    expect(partialPayload.stepData).not.toHaveProperty('unit_types');
    expect(partialPayload).not.toHaveProperty('name');
    expect(partialPayload).not.toHaveProperty('description');
    expect(partialPayload).not.toHaveProperty('city');
    expect(partialPayload).not.toHaveProperty('unitTypes');
    expect(partialPayload).not.toHaveProperty('priceFrom');

    const publishPayload = buildDevelopmentEditSavePayload(
      {
        canonicalSnapshot,
        amenities: [],
      },
      { intent: 'publish' },
    );

    expect(publishPayload).not.toHaveProperty(CANONICAL_UPDATE_MODE_FIELD);
    expect(publishPayload.name).toBe('Stale Review Mirror Name');
    expect(publishPayload.unitTypes).toHaveLength(1);
  });

  it('routes edit save payloads by explicit intent', () => {
    const canonicalSnapshot = {
      workflowId: 'residential_sale',
      currentStepId: 'marketing_summary',
      completedSteps: ['configuration', 'identity_market', 'location', 'unit_types'],
      developmentData: {
        name: 'Intent Routed Edit',
        description: 'Stale nested description.',
        developmentType: 'residential',
        transactionType: 'for_sale',
        status: 'selling',
        location: {
          city: 'Stale City',
          province: 'Stale Province',
        },
      },
      stepData: {
        marketing_summary: {
          description: 'Canonical marketing description.',
          tagline: 'Canonical tagline',
          keySellingPoints: ['Views', 'Security'],
        },
        location: {
          city: 'Cape Town',
          province: 'Western Cape',
        },
        unit_types: {
          unitTypes: [
            {
              id: 'unit-a',
              name: 'Canonical Type A',
              bedrooms: 2,
              bathrooms: 2,
              priceFrom: 1_850_000,
              totalUnits: 8,
              availableUnits: 5,
            },
          ],
        },
      },
    };

    const partialPayload = buildDevelopmentEditSavePayload({
      canonicalSnapshot,
      amenities: [],
    });
    expect(partialPayload[CANONICAL_UPDATE_MODE_FIELD]).toBe(CANONICAL_PARTIAL_UPDATE_MODE);
    expect(partialPayload).toMatchObject({
      currentStepId: 'marketing_summary',
      description: 'Canonical marketing description.',
      tagline: 'Canonical tagline',
      highlights: ['Views', 'Security'],
      stepData: {
        marketing_summary: {
          description: 'Canonical marketing description.',
          tagline: 'Canonical tagline',
          keySellingPoints: ['Views', 'Security'],
        },
      },
    });
    expect(partialPayload).not.toHaveProperty('city');
    expect(partialPayload).not.toHaveProperty('unitTypes');

    const publishPayload = buildDevelopmentEditSavePayload(
      {
        canonicalSnapshot,
        amenities: [],
      },
      { intent: 'publish' },
    );
    expect(publishPayload).not.toHaveProperty(CANONICAL_UPDATE_MODE_FIELD);
    expect(publishPayload.city).toBe('Cape Town');
    expect(publishPayload.unitTypes).toHaveLength(1);
    expect(publishPayload.stepData.unit_types.unitTypes).toEqual(publishPayload.unitTypes);
  });

  it('keeps identity partial updates from owning the marketing tagline', () => {
    const payload = buildDevelopmentPartialUpdatePayload({
      amenities: [],
      canonicalSnapshot: {
        workflowId: 'residential_sale',
        currentStepId: 'identity_market',
        completedSteps: ['configuration'],
        developmentData: {
          name: 'Stale Identity Name',
          tagline: 'Existing marketing tagline',
          subtitle: 'Existing identity subtitle',
          developmentType: 'residential',
          transactionType: 'for_sale',
        },
        stepData: {
          identity_market: {
            name: 'Updated Identity Name',
            subtitle: 'Updated identity subtitle',
            status: 'launching-soon',
          },
          marketing_summary: {
            tagline: 'Stale marketing mirror',
            description: 'Stale marketing description',
          },
        },
      },
    });

    expect(payload).toMatchObject({
      currentStepId: 'identity_market',
      name: 'Updated Identity Name',
      subtitle: 'Updated identity subtitle',
      status: 'launching-soon',
      stepData: {
        identity_market: {
          name: 'Updated Identity Name',
          subtitle: 'Updated identity subtitle',
          status: 'launching-soon',
        },
      },
    });
    expect(payload).not.toHaveProperty('tagline');
    expect(payload).not.toHaveProperty('description');
  });

  it('keeps the root unit mirror when the legacy edit step slice only contains ids', () => {
    const units = resolveSubmitUnitTypes({
      unitTypes: [
        {
          id: 'db-unit-1',
          name: 'Full DB Unit',
          bedrooms: 2,
          bathrooms: 2,
          priceFrom: 1_200_000,
        },
      ],
      stepData: {
        unit_types: {
          unitTypes: [{ id: 'db-unit-1' }],
        },
      },
    });

    expect(units).toEqual([
      {
        id: 'db-unit-1',
        name: 'Full DB Unit',
        bedrooms: 2,
        bathrooms: 2,
        priceFrom: 1_200_000,
      },
    ]);
  });
});
