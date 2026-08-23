import { describe, expect, it } from 'vitest';

import { buildDevelopmentSubmitPayload } from '../developmentSubmitPayload';

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    wizardData: {
      developmentType: 'residential',
      transactionType: 'for_sale',
      developmentData: { name: 'Test Development', transactionType: 'for_sale' },
      classification: {},
      overview: {},
      location: {},
      governance_finances: {},
      amenities_features: {},
      marketing_summary: {},
      media: {},
      unitTypes: [
        {
          id: 'unit-1',
          name: 'Two Bedroom',
          bedrooms: 2,
          bathrooms: 1,
          totalUnits: 10,
          availableUnits: 8,
          reservedUnits: 0,
          basePriceFrom: 1200000,
          isActive: true,
        },
      ],
      finalisation: {},
    },
    canonicalSnapshot: undefined,
    cataloguePublisherId: 42,
    ...overrides,
  } as any;
}

describe('development submit payload floor-plan preservation', () => {
  it('omits the development-level floorPlans bucket the wizard does not manage', () => {
    const input = baseInput();
    (input.wizardData.media as Record<string, unknown>).photos = [
      { url: 'https://cdn.example.com/hero.jpg', category: 'hero' },
    ];
    const payload = buildDevelopmentSubmitPayload(input);
    expect(payload.floorPlans).toBeUndefined();
    expect((payload.media as Record<string, unknown>).floorPlans).toBeUndefined();
    expect(payload.images).toEqual([{ url: 'https://cdn.example.com/hero.jpg', category: 'hero' }]);
  });

  it('still emits floor plans when a caller explicitly supplies them', () => {
    const input = baseInput();
    (input.wizardData.media as Record<string, unknown>).floorPlans = [
      { url: 'https://cdn.example.com/plan-a.pdf' },
    ];
    const payload = buildDevelopmentSubmitPayload(input);
    expect(payload.floorPlans).toEqual(['https://cdn.example.com/plan-a.pdf']);
  });
});
