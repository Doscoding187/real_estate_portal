import { describe, it, expect } from 'vitest';
import {
  buildSaveDraftPayloadFromWizardState,
  hydrateStateFromDraftResponse,
} from '../listingDraftPayload';
import type { ListingWizardState } from '@shared/listing-types';

// ── Fixtures ──

const minimumState: Partial<ListingWizardState> = {
  action: 'sell',
  propertyType: 'house',
};

const fullState: Partial<ListingWizardState> = {
  action: 'sell',
  propertyType: 'house',
  title: 'Modern Family Home',
  description: 'A beautiful family home located in a quiet suburb with excellent schools nearby.',
  pricing: { askingPrice: 2500000, negotiable: true },
  propertyDetails: { bedrooms: 4, bathrooms: 2 },
  additionalInfo: { garden: true, pool: true },
  location: {
    address: '42 Oak Ave',
    latitude: -26.2041,
    longitude: 28.0473,
    city: 'Johannesburg',
    suburb: 'Sandton',
    province: 'Gauteng',
    postalCode: '2196',
    placeId: 'ChIJ...',
  },
  media: [
    { id: 's3://img1.jpg', url: 's3://img1.jpg', type: 'image', displayOrder: 0, isPrimary: true },
    { id: 's3://img2.jpg', url: 's3://img2.jpg', type: 'image', displayOrder: 1, isPrimary: false },
  ],
  mainMediaId: 's3://img1.jpg',
  displayMediaType: 'image',
  currentStep: 3,
  completedSteps: [1, 2],
  badges: ['featured'],
  basicInfo: { depositAmount: 50000, leaseTerm: '12 months' },
};

// ── buildSaveDraftPayloadFromWizardState ──

describe('buildSaveDraftPayloadFromWizardState', () => {
  it('builds minimum payload with action + propertyType', () => {
    const result = buildSaveDraftPayloadFromWizardState(minimumState);
    expect(result.action).toBe('sell');
    expect(result.propertyType).toBe('house');
    expect(result.id).toBeUndefined();
    expect(result.draftData).toBeUndefined();
  });

  it('rejects payloads without an action instead of defaulting to sell', () => {
    expect(() =>
      buildSaveDraftPayloadFromWizardState({ propertyType: 'house' }),
    ).toThrow('Cannot save draft before selecting a listing action');
  });

  it('rejects payloads without a property type instead of defaulting to house', () => {
    expect(() =>
      buildSaveDraftPayloadFromWizardState({ action: 'sell' }),
    ).toThrow('Cannot save draft before selecting a property type');
  });

  it('includes existingDraftId when provided', () => {
    const result = buildSaveDraftPayloadFromWizardState(minimumState, 42);
    expect(result.id).toBe(42);
  });

  it('promotes title and description to normalized fields', () => {
    const result = buildSaveDraftPayloadFromWizardState(fullState);
    expect(result.title).toBe('Modern Family Home');
    expect(result.description).toBe(fullState.description);
  });

  it('promotes pricing to normalized field', () => {
    const result = buildSaveDraftPayloadFromWizardState(fullState);
    expect(result.pricing).toBeDefined();
    expect(result.pricing!.askingPrice).toBe(2500000);
    expect(result.pricing!.negotiable).toBe(true);
  });

  it('merges propertyDetails and additionalInfo', () => {
    const result = buildSaveDraftPayloadFromWizardState(fullState);
    expect(result.propertyDetails).toBeDefined();
    expect(result.propertyDetails!.bedrooms).toBe(4);
    expect(result.propertyDetails!.garden).toBe(true);
    expect(result.propertyDetails!.pool).toBe(true);
  });

  it('promotes location fields', () => {
    const result = buildSaveDraftPayloadFromWizardState(fullState);
    expect(result.location).toBeDefined();
    expect(result.location!.address).toBe('42 Oak Ave');
    expect(result.location!.city).toBe('Johannesburg');
    expect(result.location!.latitude).toBe(-26.2041);
  });

  it('builds mediaIds from media array', () => {
    const result = buildSaveDraftPayloadFromWizardState(fullState);
    expect(result.mediaIds).toEqual(['s3://img1.jpg', 's3://img2.jpg']);
  });

  it('uses mainMediaId when set', () => {
    const result = buildSaveDraftPayloadFromWizardState(fullState);
    expect(result.mainMediaId).toBe('s3://img1.jpg');
  });

  it('falls back to first media id for mainMediaId', () => {
    const state = { ...fullState, mainMediaId: undefined };
    const result = buildSaveDraftPayloadFromWizardState(state);
    expect(result.mainMediaId).toBe('s3://img1.jpg');
  });

  it('builds draftData JSON with session state', () => {
    const result = buildSaveDraftPayloadFromWizardState(fullState);
    expect(result.draftData).toBeDefined();
    expect(result.draftData!.currentStep).toBe(3);
    expect(result.draftData!.completedSteps).toEqual([1, 2]);
    expect(result.draftData!.badges).toEqual(['featured']);
    expect(result.draftData!.basicInfo).toEqual({ depositAmount: 50000, leaseTerm: '12 months' });
  });

  it('excludes session-only fields from normalized columns', () => {
    const result = buildSaveDraftPayloadFromWizardState(fullState);
    expect(result.title).toBe('Modern Family Home');
    expect(result.description).toBeDefined();
    // basicInfo should NOT be at the top level — only in draftData
    expect((result as any).basicInfo).toBeUndefined();
  });

  it('omits draftData when there is no session state', () => {
    const state: Partial<ListingWizardState> = {
      action: 'rent',
      propertyType: 'apartment',
    };
    const result = buildSaveDraftPayloadFromWizardState(state);
    // Without currentStep, completedSteps, etc. draftData should be absent
    expect(result.draftData).toBeUndefined();
  });

  it('handles empty media array gracefully', () => {
    const state = { ...fullState, media: [], mainMediaId: undefined };
    const result = buildSaveDraftPayloadFromWizardState(state);
    expect(result.mediaIds).toBeUndefined();
    expect(result.mainMediaId).toBeUndefined();
  });
});

// ── hydrateStateFromDraftResponse ──

describe('hydrateStateFromDraftResponse', () => {
  it('returns serverDraftId and hydration state', () => {
    const draft = {
      id: 42,
      action: 'sell',
      propertyType: 'house',
      title: 'Restored Title',
      description: 'Restored description with full content for the listing.',
      draftData: {
        currentStep: 4,
        completedSteps: [1, 2, 3],
        basicInfo: { depositAmount: 50000 },
        pricing: { askingPrice: 3000000 },
        location: { city: 'Cape Town' },
        media: [{ id: 's3://img1.jpg', url: 's3://img1.jpg' }],
        mainMediaId: 's3://img1.jpg',
      },
    };

    const result = hydrateStateFromDraftResponse(draft);

    expect(result.serverDraftId).toBe(42);
    expect(result.state.title).toBe('Restored Title');
    expect(result.state.currentStep).toBe(4);
    expect(result.state.completedSteps).toEqual([1, 2, 3]);
    expect(result.state.basicInfo).toEqual({ depositAmount: 50000 });
    expect(result.state.pricing).toEqual({ askingPrice: 3000000 });
    expect(result.state.location).toEqual({ city: 'Cape Town' });
    expect(result.state.media).toHaveLength(1);
    expect(result.state.mainMediaId).toBe('s3://img1.jpg');
  });

  it('handles null draftData', () => {
    const draft = {
      id: 99,
      action: 'rent',
      propertyType: 'apartment',
      draftData: null,
    };
    const result = hydrateStateFromDraftResponse(draft);
    expect(result.serverDraftId).toBe(99);
    expect(result.state.currentStep).toBeUndefined();
    expect(result.state.title).toBeUndefined();
  });

  it('only restores allowed fields from draft response', () => {
    const draft = {
      id: 5,
      action: 'sell',
      propertyType: 'house',
      title: 'Allowed Title',
      draftData: {
        currentStep: 2,
        completedSteps: [1],
        basicInfo: { depositAmount: 10000 },
        // Should NOT restore these non-allowed fields
        errors: [{ field: 'title', message: 'err' }],
        isValid: false,
        _computed: 'xyz',
      },
    };

    const result = hydrateStateFromDraftResponse(draft);
    expect(result.state.title).toBe('Allowed Title');
    expect(result.state.currentStep).toBe(2);
    expect(result.state.basicInfo).toEqual({ depositAmount: 10000 });
    // Non-allowed fields are excluded
    expect((result.state as any).errors).toBeUndefined();
    expect((result.state as any).isValid).toBeUndefined();
    expect((result.state as any)._computed).toBeUndefined();
  });
});
