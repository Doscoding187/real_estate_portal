import { describe, expect, it } from 'vitest';
import { sanitizeDraftData } from './sanitizeDraftData';

describe('sanitizeDraftData', () => {
  it('preserves the canonical development wizard draft snapshot', () => {
    const sanitized = sanitizeDraftData({
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
    expect(sanitized.currentStepId).toBe('unit_types');
    expect(sanitized.completedSteps).toEqual(['identity_market', 'configuration']);
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
});
