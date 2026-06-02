import { describe, expect, it } from 'vitest';
import { sanitizeDraftData } from './sanitizeDraftData';

describe('sanitizeDraftData', () => {
  it('preserves the canonical development wizard draft snapshot', () => {
    const sanitized = sanitizeDraftData({
      editingId: '987',
      workflowId: 'residential_sale',
      currentStepId: 'unit_types',
      completedSteps: ['identity_market', 'configuration'],
      currentPhase: 10,
      currentStep: 5,
      developmentType: 'residential',
      developmentData: {
        name: 'Canonical Draft',
        description: 'A draft that can resume from a keyed workflow step',
        transactionType: 'for_sale',
        location: {
          address: '1 Main Road',
          city: 'Cape Town',
          province: 'Western Cape',
        },
        media: {
          heroImage: { id: 'hero-1', url: 'https://example.com/hero.jpg', file: { bad: true } },
          photos: [],
          videos: [],
          documents: [],
        },
      },
      stepData: {
        identity_market: {
          name: 'Canonical Draft',
          transactionType: 'for_sale',
        },
        unit_types: {
          unitTypes: [{ id: 'db-unit-1', name: 'Type A', bedrooms: 2, bathrooms: 2 }],
        },
      },
      unitTypes: [{ id: 'db-unit-1', name: 'Type A', bedrooms: 2, bathrooms: 2 }],
      _version: '3.0',
      _savedAt: 1710000000000,
    }) as any;

    expect(sanitized.workflowId).toBe('residential_sale');
    expect(sanitized.editingId).toBe(987);
    expect(sanitized.developmentId).toBe(987);
    expect(sanitized.currentStepId).toBe('unit_types');
    expect(sanitized.completedSteps).toEqual(['configuration', 'identity_market']);
    expect(sanitized.stepData.identity_market.name).toBe('Canonical Draft');
    expect(sanitized.stepData.unit_types.unitTypes[0].id).toBe('db-unit-1');
    expect(sanitized.unitTypes[0].id).toBe('db-unit-1');
    expect(sanitized.developmentData.name).toBe('Canonical Draft');
    expect(sanitized._version).toBe('3.0');
    expect(sanitized._savedAt).toBe(1710000000000);
  });

  it('keeps older reduced drafts backwards compatible', () => {
    const sanitized = sanitizeDraftData({
      developmentData: {
        name: 'Old Draft',
        location: { city: 'Johannesburg', province: 'Gauteng' },
      },
    }) as any;

    expect(sanitized.developmentData.name).toBe('Old Draft');
    expect(sanitized.workflowId).toBeNull();
    expect(sanitized.currentStepId).toBeNull();
    expect(sanitized.completedSteps).toEqual([]);
    expect(sanitized.stepData.unit_types.unitTypes).toEqual([]);
  });

  it('builds developmentData from canonical step slices when nested data is sparse', () => {
    const sanitized = sanitizeDraftData({
      workflowId: 'residential_sale',
      currentStepId: 'marketing_summary',
      completedSteps: ['configuration', 'identity_market', 'location'],
      developmentData: {
        name: 'Stale Draft Name',
        transactionType: 'for_rent',
        location: { city: 'Old City', province: 'Old Province' },
        description: 'Stale description',
        monthlyLevyFrom: 99,
        ratesFrom: 88,
        transferCostsIncluded: false,
        media: {
          heroImage: { id: 'stale-hero', url: 'https://example.com/stale-hero.jpg' },
          photos: [],
          videos: [],
          documents: [],
        },
      },
      stepData: {
        configuration: {
          developmentType: 'residential',
          transactionType: 'for_sale',
        },
        identity_market: {
          name: 'Canonical Step Draft',
          subtitle: 'Step owned subtitle',
          status: 'selling',
          nature: 'new',
          ownershipTypes: ['sectional-title'],
          launchDate: '2026-08-01',
          completionDate: '2027-06-30',
        },
        location: {
          address: '7 Canonical Road',
          city: 'Cape Town',
          province: 'Western Cape',
          suburb: 'Sea Point',
          postalCode: '8005',
        },
        governance_finances: {
          levyRange: { min: 1500, max: 2100 },
          rightsAndTaxes: { min: 900, max: 1200 },
          transferCostsIncluded: true,
        },
        amenities_features: {
          amenities: ['Pool'],
          features: ['Solar ready'],
        },
        marketing_summary: {
          description: 'Canonical marketing description',
          tagline: 'Canonical tagline',
          keySellingPoints: ['Sea views', 'Secure parking'],
        },
        development_media: {
          heroImage: { id: 'hero-step', url: 'https://example.com/step-hero.jpg' },
          photos: [{ id: 'photo-step', url: 'https://example.com/photo.jpg' }],
        },
        unit_types: {
          unitTypes: [
            {
              id: 'step-sale-unit',
              name: 'Step Sale Unit',
              bedrooms: 2,
              bathrooms: 2,
              priceFrom: '1500000',
              monthlyRentFrom: '15000',
              totalUnits: 5,
              availableUnits: 4,
            },
          ],
        },
      },
    }) as any;

    expect(sanitized.developmentData).toMatchObject({
      name: 'Canonical Step Draft',
      description: 'Canonical marketing description',
      transactionType: 'for_sale',
      developmentType: 'residential',
      tagline: 'Canonical tagline',
      subtitle: 'Step owned subtitle',
      status: 'selling',
      ownershipTypes: ['sectional-title'],
      ownershipType: 'sectional-title',
      launchDate: '2026-08-01',
      completionDate: '2027-06-30',
      monthlyLevyFrom: 1500,
      monthlyLevyTo: 2100,
      ratesFrom: 900,
      ratesTo: 1200,
      transferCostsIncluded: true,
      location: {
        address: '7 Canonical Road',
        city: 'Cape Town',
        province: 'Western Cape',
        suburb: 'Sea Point',
        postalCode: '8005',
      },
      amenities: ['Pool'],
      features: ['Solar ready'],
      highlights: ['Sea views', 'Secure parking'],
    });
    expect(sanitized.developmentData.media.heroImage).toMatchObject({ id: 'hero-step' });
    expect(sanitized.stepData.development_media).toEqual(sanitized.developmentData.media);
    expect(sanitized.stepData.development_media.heroImage).not.toMatchObject({
      id: 'stale-hero',
    });
    expect(sanitized.unitTypes[0]).toMatchObject({
      id: 'step-sale-unit',
      priceFrom: 1500000,
    });
    expect(sanitized.unitTypes[0]).not.toHaveProperty('monthlyRentFrom');
    expect(sanitized.stepData.unit_types.unitTypes[0]).toBe(sanitized.unitTypes[0]);
  });

  it('mirrors sanitized canonical media into development_media step data', () => {
    const sanitized = sanitizeDraftData({
      workflowId: 'residential_sale',
      currentStepId: 'development_media',
      developmentData: {
        name: 'Media Draft',
        transactionType: 'for_sale',
        media: {
          heroImage: { id: 'stale-root-hero', url: 'https://example.com/stale-root.jpg' },
          photos: [],
          videos: [],
          documents: [],
        },
      },
      stepData: {
        development_media: {
          heroImage: {
            id: 'step-hero',
            url: 'https://example.com/step-hero.jpg',
            file: { shouldNotPersist: true },
          },
          photos: [
            {
              id: 'step-photo',
              url: 'https://example.com/step-photo.jpg',
              file: { shouldNotPersist: true },
            },
          ],
          videos: [{ id: 'step-video', url: 'https://example.com/step-video.mp4' }],
          floorPlans: [{ id: 'step-plan', url: 'https://example.com/step-plan.pdf' }],
          documents: [{ id: 'step-doc', url: 'https://example.com/step-doc.pdf' }],
        },
      },
    }) as any;

    expect(sanitized.developmentData.media).toEqual({
      heroImage: {
        id: 'step-hero',
        url: 'https://example.com/step-hero.jpg',
        type: 'image',
        category: 'featured',
        isPrimary: false,
        displayOrder: 0,
      },
      photos: [
        {
          id: 'step-photo',
          url: 'https://example.com/step-photo.jpg',
          type: 'image',
          category: 'general',
          isPrimary: false,
          displayOrder: 0,
        },
      ],
      videos: [
        {
          id: 'step-video',
          url: 'https://example.com/step-video.mp4',
          type: 'video',
          category: 'video',
          isPrimary: false,
          displayOrder: 0,
        },
      ],
      floorPlans: [
        {
          id: 'step-plan',
          url: 'https://example.com/step-plan.pdf',
          type: 'document',
          category: 'floor_plan',
          isPrimary: false,
          displayOrder: 0,
        },
      ],
      documents: [
        {
          id: 'step-doc',
          url: 'https://example.com/step-doc.pdf',
          type: 'document',
          category: 'document',
          isPrimary: false,
          displayOrder: 0,
        },
      ],
    });
    expect(sanitized.stepData.development_media).toEqual(sanitized.developmentData.media);
    expect(JSON.stringify(sanitized)).not.toContain('shouldNotPersist');
    expect(JSON.stringify(sanitized)).not.toContain('stale-root');
  });

  it('normalizes canonical workflow state and rejects unknown step ids', () => {
    const sanitized = sanitizeDraftData({
      workflowId: ' residential_sale ',
      currentStepId: 'phase-10',
      completedSteps: ['configuration', 'identity_market', 'configuration', 'not_real'],
      currentPhase: 10,
      developmentData: {
        name: 'Workflow Normalized Draft',
        transactionType: 'for_sale',
      },
    }) as any;

    expect(sanitized.workflowId).toBe('residential_sale');
    expect(sanitized.currentStepId).toBe('location');
    expect(sanitized.completedSteps).toEqual(['configuration', 'identity_market']);
    expect(sanitized.currentPhase).toBe(10);
  });

  it('preserves review_publish UI state in the canonical draft snapshot', () => {
    const sanitized = sanitizeDraftData({
      workflowId: 'residential_sale',
      currentStepId: 'review_publish',
      completedSteps: ['configuration', 'identity_market', 'location', 'unit_types'],
      developmentData: {
        name: 'Review Draft',
        transactionType: 'for_sale',
      },
      stepData: {
        review_publish: {
          checklistConfirmed: true,
          readinessDismissals: ['media-warning'],
          reviewerNote: 'Manual review state belongs to the draft snapshot.',
        },
      },
    }) as any;

    expect(sanitized.currentStepId).toBe('review_publish');
    expect(sanitized.stepData.review_publish).toEqual({
      checklistConfirmed: true,
      readinessDismissals: ['media-warning'],
      reviewerNote: 'Manual review state belongs to the draft snapshot.',
    });
  });

  it('does not inject missing transaction-specific unit pricing fields into drafts', () => {
    const sanitized = sanitizeDraftData({
      developmentData: {
        name: 'Auction Draft',
        transactionType: 'auction',
      },
      unitTypes: [
        {
          id: 'auction-unit',
          name: 'Auction Unit',
          bedrooms: 3,
          bathrooms: 2,
          startingBid: '850000',
        },
      ],
    }) as any;

    expect(sanitized.unitTypes[0]).toMatchObject({
      id: 'auction-unit',
      startingBid: 850000,
    });
    expect(sanitized.unitTypes[0]).not.toHaveProperty('priceFrom');
    expect(sanitized.unitTypes[0]).not.toHaveProperty('monthlyRentFrom');
    expect(sanitized.unitTypes[0]).not.toHaveProperty('auctionStatus');
    expect(sanitized.stepData.unit_types.unitTypes[0]).toBe(sanitized.unitTypes[0]);
  });

  it('uses canonical stepData unit types when root unitTypes is missing', () => {
    const sanitized = sanitizeDraftData({
      workflowId: 'residential_rent',
      currentStepId: 'unit_types',
      developmentData: {
        name: 'Step Data Only Draft',
        transactionType: 'for_rent',
      },
      stepData: {
        unit_types: {
          unitTypes: [
            {
              id: 'step-rental-unit',
              name: 'Step Rental Unit',
              bedrooms: 2,
              bathrooms: 2,
              priceFrom: '1500000',
              monthlyRentFrom: '18000',
              monthlyRentTo: '20000',
            },
          ],
        },
      },
    }) as any;

    expect(sanitized.unitTypes).toHaveLength(1);
    expect(sanitized.unitTypes[0]).toMatchObject({
      id: 'step-rental-unit',
      monthlyRentFrom: 18000,
      monthlyRentTo: 20000,
    });
    expect(sanitized.unitTypes[0]).not.toHaveProperty('priceFrom');
    expect(sanitized.stepData.unit_types.unitTypes[0]).toBe(sanitized.unitTypes[0]);
  });

  it('falls back to root unitTypes when legacy stepData only carries unit ids', () => {
    const sanitized = sanitizeDraftData({
      workflowId: 'residential_sale',
      currentStepId: 'unit_types',
      developmentData: {
        name: 'Hydrated Legacy Bridge Draft',
        transactionType: 'for_sale',
      },
      stepData: {
        unit_types: {
          unitTypes: [{ id: 'db-unit-1' }],
        },
      },
      unitTypes: [
        {
          id: 'db-unit-1',
          name: 'Full Root Unit',
          bedrooms: 2,
          bathrooms: 2,
          priceFrom: '1500000',
          priceTo: '1650000',
          parkingType: 'carport',
        },
      ],
    }) as any;

    expect(sanitized.unitTypes).toHaveLength(1);
    expect(sanitized.unitTypes[0]).toMatchObject({
      id: 'db-unit-1',
      name: 'Full Root Unit',
      priceFrom: 1500000,
      priceTo: 1650000,
      parkingType: 'carport',
    });
    expect(sanitized.stepData.unit_types.unitTypes[0]).toBe(sanitized.unitTypes[0]);
  });

  it('strips stale non-sale pricing fields and normalizes inverted sale ranges', () => {
    const sanitized = sanitizeDraftData({
      developmentData: {
        name: 'Sale Draft',
        transactionType: 'for_sale',
      },
      unitTypes: [
        {
          id: 'sale-unit',
          name: 'Sale Unit',
          priceFrom: '1500000',
          priceTo: '1200000',
          monthlyRentFrom: '12500',
          startingBid: '900000',
        },
      ],
    }) as any;

    expect(sanitized.unitTypes[0]).toMatchObject({
      id: 'sale-unit',
      priceFrom: 1500000,
      priceTo: 1500000,
    });
    expect(sanitized.unitTypes[0]).not.toHaveProperty('monthlyRentFrom');
    expect(sanitized.unitTypes[0]).not.toHaveProperty('startingBid');
    expect(sanitized.stepData.unit_types.unitTypes[0]).toBe(sanitized.unitTypes[0]);
  });

  it('strips stale non-rental pricing fields and normalizes inverted rental ranges', () => {
    const sanitized = sanitizeDraftData({
      developmentData: {
        name: 'Rental Draft',
        transactionType: 'to-rent',
      },
      unitTypes: [
        {
          id: 'rental-unit',
          name: 'Rental Unit',
          priceFrom: '1500000',
          monthlyRentFrom: '15000',
          monthlyRentTo: '12000',
          startingBid: '900000',
        },
      ],
    }) as any;

    expect(sanitized.developmentData.transactionType).toBe('for_rent');
    expect(sanitized.unitTypes[0]).toMatchObject({
      id: 'rental-unit',
      monthlyRentFrom: 15000,
      monthlyRentTo: 15000,
    });
    expect(sanitized.unitTypes[0]).not.toHaveProperty('priceFrom');
    expect(sanitized.unitTypes[0]).not.toHaveProperty('startingBid');
  });

  it('strips stale non-auction pricing fields and normalizes inverted reserves', () => {
    const sanitized = sanitizeDraftData({
      developmentData: {
        name: 'Auction Draft',
        transactionType: 'auction',
      },
      unitTypes: [
        {
          id: 'auction-unit',
          name: 'Auction Unit',
          priceFrom: '1500000',
          monthlyRentFrom: '15000',
          startingBid: '900000',
          reservePrice: '850000',
        },
      ],
    }) as any;

    expect(sanitized.unitTypes[0]).toMatchObject({
      id: 'auction-unit',
      startingBid: 900000,
      reservePrice: 900000,
    });
    expect(sanitized.unitTypes[0]).not.toHaveProperty('priceFrom');
    expect(sanitized.unitTypes[0]).not.toHaveProperty('monthlyRentFrom');
  });
});
