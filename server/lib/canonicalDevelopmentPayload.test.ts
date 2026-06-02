import { describe, expect, it } from 'vitest';

import {
  CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP,
  CANONICAL_PARTIAL_UPDATE_MODE,
  CANONICAL_UPDATE_MODE_FIELD,
  canonicalMediaToImages,
  flattenCanonicalDevelopmentPayload,
  getCanonicalDevelopmentGovernanceFinances,
  getCanonicalDevelopmentMediaPayload,
  getCanonicalDevelopmentUnitTypes,
} from './canonicalDevelopmentPayload';
import { buildCanonicalHydrationDevelopmentDataSnapshot } from '../../shared/developmentCanonicalSelectors';

describe('canonical development payload extraction', () => {
  it('documents canonical flattening field ownership by step slice', () => {
    const flattened = flattenCanonicalDevelopmentPayload({
      workflowId: 'residential_sale',
      currentStepId: 'unit_types',
      completedSteps: ['configuration', 'identity_market', 'location'],
      editingId: 42,
      developmentId: 42,
      currentPhase: 5,
      currentStep: 'legacy-unit-types',
      overview: { name: 'Legacy Overview' },
      finalisation: { ready: true },
      _version: 2,
      _savedAt: '2026-05-25T10:00:00.000Z',
      developmentData: {
        propertyTypes: ['apartment'],
      },
      stepData: {
        configuration: {
          developmentType: 'residential',
          transactionType: 'for_sale',
        },
        identity_market: {
          name: 'Canonical Ownership Estate',
          subtitle: 'North block',
          status: 'planning',
          nature: 'new_development',
          ownershipTypes: ['sectional_title'],
          ownershipType: 'sectional_title',
          marketingRole: 'mandate',
          launchDate: '2026-06-01',
          completionDate: '2027-12-01',
        },
        location: {
          address: '14 Engine Road',
          city: 'Cape Town',
          province: 'Western Cape',
          suburb: 'Green Point',
          postalCode: '8051',
          latitude: '-33.906',
          longitude: '18.405',
        },
        amenities_features: {
          amenities: ['Pool'],
          features: ['Solar ready'],
        },
        marketing_summary: {
          description: 'Canonical marketing summary',
          tagline: 'Built for the next release',
          highlights: ['Sea views'],
        },
        development_media: {
          heroImage: { id: 'hero', url: 'https://example.com/hero.jpg' },
          videos: [{ url: 'https://example.com/video.mp4' }],
          floorPlans: [{ url: 'https://example.com/floor.pdf' }],
          documents: [{ url: 'https://example.com/brochure.pdf' }],
        },
        governance_finances: {
          levyRange: {
            min: 1500,
            max: 2500,
          },
          rightsAndTaxes: {
            min: 900,
            max: 1400,
          },
          transferCostsIncluded: true,
        },
        unit_types: {
          unitTypes: [
            {
              id: 'unit-1',
              label: 'One Bedroom',
              bedrooms: 1,
              priceFrom: 1250000,
            },
          ],
        },
      },
    });

    const canonicalOwnershipGroups = Object.entries(
      CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP,
    ).filter(
      ([group]) =>
        group !== 'sourceStepSlices' && group !== 'legacyCompatibilityOutsideCanonicalOwnership',
    );
    const canonicalOwnedFields = canonicalOwnershipGroups.flatMap(([, fields]) => [...fields]);

    for (const field of canonicalOwnedFields) {
      expect(flattened).toHaveProperty(field);
    }

    for (const stepId of CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.sourceStepSlices) {
      expect(flattened.stepData).toHaveProperty(stepId);
    }

    const uniqueOwnedFields = new Set(canonicalOwnedFields);
    expect(uniqueOwnedFields.size).toBe(canonicalOwnedFields.length);

    for (const field of CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.legacyCompatibilityOutsideCanonicalOwnership) {
      expect(uniqueOwnedFields.has(field)).toBe(false);
      expect(flattened).toHaveProperty(field);
    }
  });

  it('flattens developmentData location and media into the mutation payload shape', () => {
    const flattened = flattenCanonicalDevelopmentPayload({
      developmentType: 'residential',
      developmentData: {
        name: 'Canonical Payload',
        transactionType: 'for_sale',
        location: {
          address: '1 Canonical Road',
          city: 'Cape Town',
          province: 'Western Cape',
        },
        media: {
          heroImage: { id: 'hero', url: 'https://example.com/hero.jpg' },
          photos: [{ id: 'photo-1', url: 'https://example.com/photo.jpg' }],
        },
      },
    });

    expect(flattened).toMatchObject({
      name: 'Canonical Payload',
      transactionType: 'for_sale',
      address: '1 Canonical Road',
      city: 'Cape Town',
      province: 'Western Cape',
      images: [
        { id: 'hero', url: 'https://example.com/hero.jpg' },
        { id: 'photo-1', url: 'https://example.com/photo.jpg' },
      ],
    });
  });

  it('flattens canonical media assets into the legacy mutation columns', () => {
    const flattened = flattenCanonicalDevelopmentPayload({
      workflowId: 'residential_sale',
      currentStepId: 'development_media',
      developmentData: {
        name: 'Media Canonical',
        transactionType: 'for_sale',
        media: {
          heroImage: { id: 'hero', url: 'https://example.com/hero.jpg' },
          photos: [{ id: 'photo-1', url: 'https://example.com/photo.jpg' }],
          videos: [{ id: 'video-1', url: 'https://example.com/video.mp4' }],
          floorPlans: [{ id: 'floor-1', url: 'https://example.com/floor.pdf' }],
          documents: [{ id: 'doc-1', url: 'https://example.com/brochure.pdf' }],
        },
      },
    });

    expect(flattened).toMatchObject({
      images: [
        { id: 'hero', url: 'https://example.com/hero.jpg' },
        { id: 'photo-1', url: 'https://example.com/photo.jpg' },
      ],
      videos: ['https://example.com/video.mp4'],
      floorPlans: ['https://example.com/floor.pdf'],
      brochures: ['https://example.com/brochure.pdf'],
    });
  });

  it('uses stepData development_media when developmentData has no media snapshot', () => {
    expect(
      getCanonicalDevelopmentMediaPayload({
        workflowId: 'residential_sale',
        currentStepId: 'development_media',
        stepData: {
          development_media: {
            heroImage: { url: 'https://example.com/step-hero.jpg' },
            videos: ['https://example.com/step-video.mp4'],
            documents: [{ url: 'https://example.com/step-doc.pdf' }],
          },
        },
        developmentData: {
          name: 'Step Media Canonical',
          transactionType: 'for_sale',
        },
      }),
    ).toMatchObject({
      images: [{ url: 'https://example.com/step-hero.jpg' }],
      videos: ['https://example.com/step-video.mp4'],
      brochures: ['https://example.com/step-doc.pdf'],
    });
  });

  it('prefers canonical stepData media over stale root media columns', () => {
    const flattened = flattenCanonicalDevelopmentPayload({
      workflowId: 'residential_sale',
      currentStepId: 'development_media',
      images: ['https://example.com/stale-root.jpg'],
      developmentData: {
        media: {
          heroImage: { url: 'https://example.com/stale-hero.jpg' },
          photos: [],
          videos: ['https://example.com/stale-video.mp4'],
        },
      },
      stepData: {
        development_media: {
          heroImage: { id: 'step-hero', url: 'https://example.com/step-hero.jpg' },
          photos: [{ id: 'step-photo', url: 'https://example.com/step-photo.jpg' }],
          videos: [{ url: 'https://example.com/step-video.mp4' }],
          documents: [{ url: 'https://example.com/step-doc.pdf' }],
        },
      },
    });

    expect(flattened).toMatchObject({
      images: [
        { id: 'step-hero', url: 'https://example.com/step-hero.jpg' },
        { id: 'step-photo', url: 'https://example.com/step-photo.jpg' },
      ],
      videos: ['https://example.com/step-video.mp4'],
      brochures: ['https://example.com/step-doc.pdf'],
    });
  });

  it('prefers canonical stepData unit types over stale root unitTypes', () => {
    const flattened = flattenCanonicalDevelopmentPayload({
      developmentData: {
        name: 'Inventory Source',
        transactionType: 'for_rent',
      },
      stepData: {
        unit_types: {
          unitTypes: [
            {
              id: 'canonical-unit',
              name: 'Canonical Rental',
              monthlyRentFrom: 12_500,
            },
          ],
        },
      },
      unitTypes: [
        {
          id: 'stale-unit',
          name: 'Stale Sale',
          basePriceFrom: 1_500_000,
        },
      ],
    });

    expect(flattened.unitTypes).toEqual([
      {
        id: 'canonical-unit',
        name: 'Canonical Rental',
        monthlyRentFrom: 12_500,
      },
    ]);
  });

  it('falls back to root unitTypes when the legacy edit step slice only contains IDs', () => {
    const rootUnits = [
      {
        id: 'db-unit-1',
        name: 'Full DB Unit',
        priceFrom: 1_500_000,
      },
    ];

    expect(
      getCanonicalDevelopmentUnitTypes({
        stepData: {
          unit_types: {
            unitTypes: [{ id: 'db-unit-1' }],
          },
        },
        unitTypes: rootUnits,
      }),
    ).toBe(rootUnits);
  });

  it('flattens canonical governance finances without requiring legacy root fields', () => {
    const flattened = flattenCanonicalDevelopmentPayload({
      workflowId: 'residential_sale',
      currentStepId: 'governance_finances',
      stepData: {
        governance_finances: {
          levyRange: { min: 1_250, max: 1_750 },
          rightsAndTaxes: { min: 950, max: 1_200 },
          transferCostsIncluded: false,
        },
      },
      developmentData: {
        name: 'Governance Canonical',
        transactionType: 'for_sale',
      },
    });

    expect(flattened).toMatchObject({
      monthlyLevyFrom: 1_250,
      monthlyLevyTo: 1_750,
      ratesFrom: 950,
      ratesTo: 1_200,
      transferCostsIncluded: false,
    });
  });

  it('prefers canonical stepData governance finances over stale developmentData mirrors', () => {
    expect(
      getCanonicalDevelopmentGovernanceFinances({
        stepData: {
          governance_finances: {
            levyRange: { min: 1_250, max: 1_750 },
            rightsAndTaxes: { min: 950, max: 1_200 },
            transferCostsIncluded: false,
          },
        },
        developmentData: {
          monthlyLevyFrom: 1_500,
          ratesFrom: 1_050,
          transferCostsIncluded: true,
        },
      }),
    ).toMatchObject({
      monthlyLevyFrom: 1_250,
      monthlyLevyTo: 1_750,
      ratesFrom: 950,
      ratesTo: 1_200,
      transferCostsIncluded: false,
    });
  });

  it('builds edit hydration developmentData from canonical step slices and flat DB fallbacks', () => {
    const snapshot = buildCanonicalHydrationDevelopmentDataSnapshot(
      {
        name: 'Flat DB Name',
        description: 'Flat DB description',
        developmentType: 'residential',
        transactionType: 'for_sale',
        city: 'Old City',
        province: 'Old Province',
        monthlyLevyFrom: '1500.00',
        monthlyLevyTo: '1800.00',
        ratesFrom: '950.00',
        ratesTo: '1100.00',
        transferCostsIncluded: true,
        propertyTypes: JSON.stringify(['apartment']),
        images: JSON.stringify(['https://example.com/db-photo.jpg']),
      },
      {
        identity_market: {
          name: 'Canonical Step Name',
          status: 'selling',
          transactionType: 'for_sale',
        },
        location: {
          city: 'Cape Town',
          province: 'Western Cape',
        },
      },
    );

    expect(snapshot).toMatchObject({
      name: 'Canonical Step Name',
      description: 'Flat DB description',
      transactionType: 'for_sale',
      propertyTypes: ['apartment'],
      monthlyLevyFrom: '1500.00',
      monthlyLevyTo: '1800.00',
      ratesFrom: '950.00',
      ratesTo: '1100.00',
      transferCostsIncluded: true,
      location: {
        city: 'Cape Town',
        province: 'Western Cape',
      },
      media: {
        heroImage: {
          url: 'https://example.com/db-photo.jpg',
          category: 'featured',
          isPrimary: true,
        },
      },
    });
  });

  it('promotes canonical step slices over stale developmentData during flattening', () => {
    const flattened = flattenCanonicalDevelopmentPayload({
      developmentType: 'residential',
      transactionType: 'for_rent',
      name: 'Stale Root Name',
      city: 'Old City',
      developmentData: {
        name: 'Stale Nested Name',
        description: 'Stale nested description',
        status: 'planning',
        transactionType: 'for_rent',
        ownershipTypes: ['full-title'],
        location: {
          address: 'Old Address',
          city: 'Old City',
          province: 'Old Province',
        },
        amenities: ['Old Amenity'],
        features: ['Old Feature'],
        highlights: ['Old Highlight'],
      },
      stepData: {
        configuration: {
          developmentType: 'residential',
          transactionType: 'for_sale',
        },
        identity_market: {
          name: 'Canonical Step Name',
          subtitle: 'Canonical subtitle',
          status: 'selling',
          nature: 'new',
          transactionType: 'for_sale',
          ownershipTypes: ['sectional-title'],
          marketingRole: 'exclusive',
          launchDate: '2026-09-01',
          completionDate: '2027-07-31',
        },
        location: {
          address: '8 Canonical Lane',
          city: 'Cape Town',
          province: 'Western Cape',
          suburb: 'Green Point',
          postalCode: '8051',
        },
        amenities_features: {
          amenities: ['Pool'],
          features: ['Solar ready'],
        },
        marketing_summary: {
          description: 'Canonical step description.',
          tagline: 'Canonical step tagline',
          keySellingPoints: ['Sea views', 'Secure parking'],
        },
      },
    });

    expect(flattened).toMatchObject({
      developmentType: 'residential',
      transactionType: 'for_sale',
      name: 'Canonical Step Name',
      subtitle: 'Canonical subtitle',
      tagline: 'Canonical step tagline',
      description: 'Canonical step description.',
      status: 'selling',
      nature: 'new',
      ownershipTypes: ['sectional-title'],
      ownershipType: 'sectional-title',
      marketingRole: 'exclusive',
      launchDate: '2026-09-01',
      completionDate: '2027-07-31',
      address: '8 Canonical Lane',
      city: 'Cape Town',
      province: 'Western Cape',
      suburb: 'Green Point',
      postalCode: '8051',
      amenities: ['Pool'],
      features: ['Solar ready'],
      highlights: ['Sea views', 'Secure parking'],
    });
  });

  it('flattens canonical location step data without inventing unrelated owned fields', () => {
    const flattened = flattenCanonicalDevelopmentPayload({
      workflowId: 'residential_sale',
      currentStepId: 'location',
      address: 'Stale Root Address',
      city: 'Stale Root City',
      province: 'Stale Root Province',
      developmentData: {
        name: 'Location Ownership',
        transactionType: 'for_sale',
        location: {
          address: 'Stale Nested Address',
          city: 'Stale Nested City',
          province: 'Stale Nested Province',
          suburb: 'Stale Nested Suburb',
          postalCode: '0000',
        },
      },
      stepData: {
        location: {
          address: '22 Canonical Location Lane',
          city: 'Cape Town',
          province: 'Western Cape',
          suburb: 'Green Point',
          postalCode: '8051',
          latitude: '-33.906',
          longitude: '18.405',
        },
      },
    });

    expect(flattened).toMatchObject({
      address: '22 Canonical Location Lane',
      city: 'Cape Town',
      province: 'Western Cape',
      suburb: 'Green Point',
      postalCode: '8051',
      latitude: '-33.906',
      longitude: '18.405',
    });
    expect(flattened.images).toBeUndefined();
    expect(flattened.videos).toBeUndefined();
    expect(flattened.brochures).toBeUndefined();
    expect(flattened.monthlyLevyFrom).toBeUndefined();
    expect(flattened.monthlyLevyTo).toBeUndefined();
    expect(flattened.ratesFrom).toBeUndefined();
    expect(flattened.ratesTo).toBeUndefined();
    expect(flattened.unitTypes).toBeUndefined();
  });

  it('scopes canonical partial update flattening to the active keyed step', () => {
    const flattened = flattenCanonicalDevelopmentPayload(
      {
        workflowId: 'residential_sale',
        currentStepId: 'development_media',
        [CANONICAL_UPDATE_MODE_FIELD]: CANONICAL_PARTIAL_UPDATE_MODE,
        name: 'Stale Root Name',
        city: 'Stale Root City',
        totalUnits: 99,
        media: {
          heroImage: { url: 'https://example.com/stale-root-media.jpg' },
        },
        developmentData: {
          name: 'Stale Nested Name',
          description: 'Stale nested description.',
          location: {
            city: 'Stale Nested City',
            province: 'Stale Nested Province',
          },
        },
        stepData: {
          location: {
            city: 'Cape Town',
            province: 'Western Cape',
          },
          development_media: {
            images: [{ url: 'https://example.com/new-hero.jpg' }],
            videos: ['https://example.com/new-video.mp4'],
          },
          unit_types: {
            unitTypes: [{ id: 'stale-unit', totalUnits: 99 }],
          },
        },
      },
      { mode: 'partial_update' },
    );

    expect(flattened.images).toEqual([{ url: 'https://example.com/new-hero.jpg' }]);
    expect(flattened.videos).toEqual(['https://example.com/new-video.mp4']);
    expect(flattened.stepData).toEqual({
      development_media: {
        images: [{ url: 'https://example.com/new-hero.jpg' }],
        videos: ['https://example.com/new-video.mp4'],
      },
    });
    expect(flattened).not.toHaveProperty('developmentData');
    expect(flattened).not.toHaveProperty('name');
    expect(flattened).not.toHaveProperty('city');
    expect(flattened).not.toHaveProperty('province');
    expect(flattened).not.toHaveProperty('totalUnits');
    expect(flattened).not.toHaveProperty('unitTypes');
    expect(flattened).not.toHaveProperty('developmentType');
    expect(flattened).not.toHaveProperty('transactionType');
    expect(flattened).not.toHaveProperty('tagline');
    expect(flattened).not.toHaveProperty('media');
    expect(flattened).not.toHaveProperty('monthlyLevyFrom');
  });

  it('keeps canonical partial media flattening on flattened media columns only', () => {
    const flattened = flattenCanonicalDevelopmentPayload(
      {
        workflowId: 'residential_sale',
        currentStepId: 'development_media',
        completedSteps: ['configuration', 'identity_market', 'development_media'],
        [CANONICAL_UPDATE_MODE_FIELD]: CANONICAL_PARTIAL_UPDATE_MODE,
        media: {
          heroImage: { url: 'https://example.com/stale-root-media.jpg' },
        },
        developmentData: {
          media: {
            heroImage: { url: 'https://example.com/stale-nested-media.jpg' },
          },
        },
        stepData: {
          development_media: {
            heroImage: { url: 'https://example.com/canonical-media-hero.jpg' },
            photos: [{ url: 'https://example.com/canonical-media-gallery.jpg' }],
            videos: [{ url: 'https://example.com/canonical-media-video.mp4' }],
            floorPlans: [{ url: 'https://example.com/canonical-media-floorplan.pdf' }],
            documents: [{ url: 'https://example.com/canonical-media-brochure.pdf' }],
          },
        },
      },
      { mode: 'partial_update' },
    );

    expect(flattened).toEqual({
      workflowId: 'residential_sale',
      currentStepId: 'development_media',
      completedSteps: ['configuration', 'identity_market', 'development_media'],
      canonicalUpdateMode: 'partial_step',
      stepData: {
        development_media: {
          heroImage: { url: 'https://example.com/canonical-media-hero.jpg' },
          photos: [{ url: 'https://example.com/canonical-media-gallery.jpg' }],
          videos: [{ url: 'https://example.com/canonical-media-video.mp4' }],
          floorPlans: [{ url: 'https://example.com/canonical-media-floorplan.pdf' }],
          documents: [{ url: 'https://example.com/canonical-media-brochure.pdf' }],
        },
      },
      images: [
        { url: 'https://example.com/canonical-media-hero.jpg' },
        { url: 'https://example.com/canonical-media-gallery.jpg' },
      ],
      videos: ['https://example.com/canonical-media-video.mp4'],
      floorPlans: ['https://example.com/canonical-media-floorplan.pdf'],
      brochures: ['https://example.com/canonical-media-brochure.pdf'],
    });
  });

  it('keeps canonical partial amenities flattening free of undefined non-owned fields', () => {
    const flattened = flattenCanonicalDevelopmentPayload(
      {
        workflowId: 'residential_sale',
        currentStepId: 'amenities_features',
        completedSteps: ['configuration', 'identity_market', 'amenities_features'],
        [CANONICAL_UPDATE_MODE_FIELD]: CANONICAL_PARTIAL_UPDATE_MODE,
        developmentData: {
          name: 'Stale nested name',
          developmentType: 'residential',
          transactionType: 'for_sale',
          location: {
            city: 'Stale nested city',
            province: 'Stale nested province',
          },
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
          location: {
            city: 'Cape Town',
            province: 'Western Cape',
          },
        },
      },
      { mode: 'partial_update' },
    );

    expect(flattened).toEqual({
      workflowId: 'residential_sale',
      currentStepId: 'amenities_features',
      completedSteps: ['configuration', 'identity_market', 'amenities_features'],
      [CANONICAL_UPDATE_MODE_FIELD]: CANONICAL_PARTIAL_UPDATE_MODE,
      stepData: {
        amenities_features: {
          amenities: [],
          features: [],
        },
      },
      amenities: [],
      features: [],
    });
  });

  it('does not flatten stale mirrors for malformed canonical partial updates', () => {
    const flattened = flattenCanonicalDevelopmentPayload(
      {
        workflowId: 'residential_sale',
        currentStepId: 'unknown_step',
        [CANONICAL_UPDATE_MODE_FIELD]: CANONICAL_PARTIAL_UPDATE_MODE,
        name: 'Stale Root Name',
        city: 'Stale Root City',
        priceFrom: 999_999,
        developmentData: {
          name: 'Stale Nested Name',
          description: 'Stale nested description.',
          location: {
            city: 'Stale Nested City',
            province: 'Stale Nested Province',
          },
        },
        stepData: {
          unknown_step: {
            name: 'Unknown step data',
          },
          unit_types: {
            unitTypes: [{ id: 'stale-unit', priceFrom: 999_999 }],
          },
        },
        unitTypes: [{ id: 'stale-unit', priceFrom: 999_999 }],
      },
      { mode: 'partial_update' },
    );

    expect(flattened).toEqual({
      workflowId: 'residential_sale',
      currentStepId: 'unknown_step',
      [CANONICAL_UPDATE_MODE_FIELD]: CANONICAL_PARTIAL_UPDATE_MODE,
      stepData: {},
    });
  });

  it('filters derived non-owned fields from canonical partial updates after flattening', () => {
    const identityFlattened = flattenCanonicalDevelopmentPayload(
      {
        workflowId: 'residential_sale',
        currentStepId: 'identity_market',
        completedSteps: ['configuration'],
        [CANONICAL_UPDATE_MODE_FIELD]: CANONICAL_PARTIAL_UPDATE_MODE,
        stepData: {
          identity_market: {
            name: 'Identity Owned Name',
            subtitle: 'Identity owned subtitle',
            tagline: 'Legacy identity tagline mirror',
          },
        },
      },
      { mode: 'partial_update' },
    );

    expect(identityFlattened).toMatchObject({
      workflowId: 'residential_sale',
      currentStepId: 'identity_market',
      [CANONICAL_UPDATE_MODE_FIELD]: CANONICAL_PARTIAL_UPDATE_MODE,
      name: 'Identity Owned Name',
      subtitle: 'Identity owned subtitle',
      stepData: {
        identity_market: {
          name: 'Identity Owned Name',
          subtitle: 'Identity owned subtitle',
          tagline: 'Legacy identity tagline mirror',
        },
      },
    });
    expect(identityFlattened).not.toHaveProperty('tagline');
    expect(identityFlattened).not.toHaveProperty('description');

    const marketingFlattened = flattenCanonicalDevelopmentPayload(
      {
        workflowId: 'residential_sale',
        currentStepId: 'marketing_summary',
        completedSteps: ['configuration', 'identity_market'],
        [CANONICAL_UPDATE_MODE_FIELD]: CANONICAL_PARTIAL_UPDATE_MODE,
        stepData: {
          marketing_summary: {
            description: 'Marketing owned description.',
            tagline: 'Marketing owned tagline',
          },
        },
      },
      { mode: 'partial_update' },
    );

    expect(marketingFlattened).toMatchObject({
      workflowId: 'residential_sale',
      currentStepId: 'marketing_summary',
      [CANONICAL_UPDATE_MODE_FIELD]: CANONICAL_PARTIAL_UPDATE_MODE,
      description: 'Marketing owned description.',
      tagline: 'Marketing owned tagline',
    });
    expect(marketingFlattened).not.toHaveProperty('subtitle');
    expect(marketingFlattened).not.toHaveProperty('name');
  });

  it('keeps media extraction shared for canonical publish and mutation paths', () => {
    expect(
      canonicalMediaToImages({
        heroImage: { url: 'https://example.com/hero.jpg' },
        photos: [{ url: 'https://example.com/photo.jpg' }],
      }),
    ).toEqual([{ url: 'https://example.com/hero.jpg' }, { url: 'https://example.com/photo.jpg' }]);
  });
});
