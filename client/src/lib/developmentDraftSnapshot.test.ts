import { describe, expect, it } from 'vitest';

import {
  buildCanonicalDraftSnapshot,
  buildUnitTypesStepData,
  CANONICAL_DRAFT_SNAPSHOT_FIELD_OWNERSHIP,
  getCanonicalUnitTypesFromState,
  normalizeUnitTypesForState,
} from './developmentDraftSnapshot';

const normalizeTransactionType = (value: any) => {
  if (value === 'sale') return 'for_sale';
  if (value === 'rent') return 'for_rent';
  return value;
};

const fallbackDevelopmentData = {
  media: {
    heroImage: null,
    photos: [],
    videos: [],
    documents: [],
  },
};

describe('development draft snapshot helpers', () => {
  it('builds a canonical draft snapshot from step slices without stale developmentData mirrors', () => {
    const unitTypes = [
      {
        id: 'unit-1',
        name: 'Type A',
        bedrooms: 2,
        bathrooms: 2,
        priceFrom: 1500000,
        monthlyRentFrom: 12000,
      },
    ];

    const snapshot = buildCanonicalDraftSnapshot({
      state: {
        developmentType: 'residential',
        transactionType: 'for_sale',
        developmentData: {
          name: 'Stale Root Name',
          description: 'Stale root description',
          transactionType: 'for_rent',
          media: {
            heroImage: { url: 'https://cdn.example.com/root-hero.jpg' },
            photos: [],
            videos: [],
            documents: [],
          },
        },
        stepData: {
          configuration: {
            developmentType: 'residential',
            transactionType: 'sale',
          },
          identity_market: {
            name: 'Canonical Draft Name',
            status: 'selling',
            transactionType: 'sale',
            ownershipTypes: ['sectional-title'],
          },
          marketing_summary: {
            description: 'Canonical step description',
            keySellingPoints: ['Views', 'Security', 'Transit'],
          },
          development_media: {
            heroImage: { url: 'https://cdn.example.com/step-hero.jpg' },
            photos: [{ url: 'https://cdn.example.com/step-photo.jpg' }],
            videos: [{ url: 'https://cdn.example.com/step-video.mp4' }],
            floorPlans: [{ url: 'https://cdn.example.com/step-plan.pdf' }],
            brochures: [{ url: 'https://cdn.example.com/step-brochure.pdf' }],
          },
          unit_types: { unitTypes },
        },
      },
      normalizeTransactionType,
      fallbackDevelopmentData,
    });

    expect(snapshot.transactionType).toBe('for_sale');
    expect(snapshot.developmentData).toMatchObject({
      name: 'Canonical Draft Name',
      description: 'Canonical step description',
      transactionType: 'for_sale',
      media: {
        heroImage: { url: 'https://cdn.example.com/step-hero.jpg' },
        photos: [{ url: 'https://cdn.example.com/step-photo.jpg' }],
        videos: [{ url: 'https://cdn.example.com/step-video.mp4' }],
        floorPlans: [{ url: 'https://cdn.example.com/step-plan.pdf' }],
        documents: [{ url: 'https://cdn.example.com/step-brochure.pdf' }],
      },
    });
    expect(snapshot.stepData.development_media).toMatchObject({
      heroImage: { url: 'https://cdn.example.com/step-hero.jpg' },
      photos: [{ url: 'https://cdn.example.com/step-photo.jpg' }],
      videos: [{ url: 'https://cdn.example.com/step-video.mp4' }],
      floorPlans: [{ url: 'https://cdn.example.com/step-plan.pdf' }],
      documents: [{ url: 'https://cdn.example.com/step-brochure.pdf' }],
    });
    expect(snapshot.stepData.development_media.heroImage.url).not.toBe(
      'https://cdn.example.com/root-hero.jpg',
    );
    expect(snapshot.stepData.identity_market).toMatchObject({
      name: 'Canonical Draft Name',
      transactionType: 'for_sale',
      ownershipTypes: ['sectional-title'],
    });
    expect(snapshot.stepData.unit_types.unitTypes[0]).toEqual(snapshot.unitTypes[0]);
    expect(snapshot.unitTypes[0]).not.toHaveProperty('monthlyRentFrom');
  });

  it('owns canonical workflow metadata and edit target identity', () => {
    const snapshot = buildCanonicalDraftSnapshot({
      state: {
        workflowId: 'development_residential_sale',
        currentStepId: 'unit_types',
        completedSteps: ['configuration', 'identity_market'],
        editingId: '987',
        developmentId: 123,
        developmentData: {
          transactionType: 'for_sale',
          media: fallbackDevelopmentData.media,
        },
        stepData: {
          configuration: { transactionType: 'sale' },
          unit_types: {
            unitTypes: [
              {
                id: 'db-unit-1',
                name: 'Apartment',
                priceFrom: 1_500_000,
                monthlyRentFrom: 12_000,
              },
            ],
          },
        },
      },
      normalizeTransactionType,
      fallbackDevelopmentData,
    });

    expect(snapshot).toMatchObject({
      workflowId: 'development_residential_sale',
      currentStepId: 'unit_types',
      completedSteps: ['configuration', 'identity_market'],
      editingId: 987,
      developmentId: 987,
    });
    expect(snapshot.unitTypes[0]).toMatchObject({
      id: 'db-unit-1',
      priceFrom: 1_500_000,
    });
    expect(snapshot.unitTypes[0]).not.toHaveProperty('monthlyRentFrom');
  });

  it('documents canonical snapshot field ownership and excludes legacy shell fields', () => {
    const snapshot = buildCanonicalDraftSnapshot({
      state: {
        workflowId: 'residential_rent',
        currentStepId: 'marketing_summary',
        completedSteps: ['configuration', 'identity_market'],
        editingId: 456,
        currentPhase: 9,
        currentStep: 9,
        unitTypeDraft: { name: 'Legacy draft shell data' },
        overview: { description: 'Legacy overview mirror' },
        finalisation: { publishAcknowledged: true },
        _version: '2.0',
        _savedAt: 1,
        developmentData: {
          transactionType: 'for_rent',
          media: fallbackDevelopmentData.media,
        },
        stepData: {
          configuration: { transactionType: 'rent' },
          review_publish: {
            checklistConfirmed: true,
            readinessDismissals: ['launch-date-warning'],
          },
          marketing_summary: {
            description: 'Canonical marketing copy owns the description.',
          },
          unit_types: {
            unitTypes: [
              {
                id: 'rent-unit-1',
                name: 'Rental Type',
                monthlyRentFrom: 12_500,
                priceFrom: 1_500_000,
              },
            ],
          },
        },
      } as any,
      normalizeTransactionType,
      fallbackDevelopmentData,
    });

    for (const field of CANONICAL_DRAFT_SNAPSHOT_FIELD_OWNERSHIP.workflowState) {
      expect(snapshot).toHaveProperty(field);
    }
    for (const field of CANONICAL_DRAFT_SNAPSHOT_FIELD_OWNERSHIP.editIdentity) {
      expect(snapshot).toHaveProperty(field);
    }
    for (const field of CANONICAL_DRAFT_SNAPSHOT_FIELD_OWNERSHIP.canonicalMirrors) {
      expect(snapshot).toHaveProperty(field);
    }
    for (const slice of CANONICAL_DRAFT_SNAPSHOT_FIELD_OWNERSHIP.stepSlices) {
      expect(snapshot.stepData).toHaveProperty(slice);
    }
    for (const field of CANONICAL_DRAFT_SNAPSHOT_FIELD_OWNERSHIP.compatibilityOutsideSnapshot) {
      expect(snapshot).not.toHaveProperty(field);
    }
    expect(snapshot.developmentData.description).toBe(
      'Canonical marketing copy owns the description.',
    );
    expect(snapshot.stepData.review_publish).toEqual({
      checklistConfirmed: true,
      readinessDismissals: ['launch-date-warning'],
    });
    expect(snapshot.stepData.unit_types.unitTypes[0]).toEqual(snapshot.unitTypes[0]);
    expect(snapshot.unitTypes[0]).not.toHaveProperty('priceFrom');
  });

  it('keeps unit type state sourced from canonical stepData and strips inactive pricing for state actions', () => {
    const state = {
      transactionType: 'for_rent',
      developmentData: { transactionType: 'for_rent' },
      unitTypes: [{ id: 'root-unit', name: 'Root Unit' }],
      stepData: {
        unit_types: {
          unitTypes: [
            {
              id: 'step-unit',
              name: 'Step Unit',
              priceFrom: 1500000,
              monthlyRentFrom: 12500,
            },
          ],
        },
      },
    };

    const canonicalUnits = getCanonicalUnitTypesFromState(state);
    const normalizedUnits = normalizeUnitTypesForState(
      state,
      canonicalUnits,
      normalizeTransactionType,
    );

    expect(canonicalUnits[0].id).toBe('step-unit');
    expect(normalizedUnits[0]).toMatchObject({
      id: 'step-unit',
      monthlyRentFrom: 12500,
    });
    expect(normalizedUnits[0]).not.toHaveProperty('priceFrom');
    expect(buildUnitTypesStepData(state, normalizedUnits).unit_types.unitTypes).toEqual(
      normalizedUnits,
    );
  });
});
