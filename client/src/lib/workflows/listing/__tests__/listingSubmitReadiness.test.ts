import { describe, expect, it } from 'vitest';
import { calculateSubmitReadinessDryRun } from '../listingSubmitReadiness';
import type { ListingWorkflowData } from '@shared/listing-workflow-types';

const completeData: ListingWorkflowData = {
  action: 'sell',
  propertyType: 'house',
  title: 'Modern Family Home',
  description: 'Beautiful 4-bedroom family home in a prime location with modern finishes throughout. This home features an open-plan living area and a modern kitchen.',
  pricing: { askingPrice: 2500000, negotiable: true } as any,
  propertyDetails: { bedrooms: 4, bathrooms: 2, houseAreaM2: 250 },
  additionalInfo: { furnishingStatus: 'fully_furnished', petPolicy: 'allowed' },
  basicInfo: { propertyCategory: 'existing', possessionStatus: 'immediate' },
  location: {
    address: '42 Oak Ave',
    latitude: -26.2041,
    longitude: 28.0473,
    city: 'Johannesburg',
    province: 'Gauteng',
    placeId: 'ChIJ123',
  },
  media: [
    { id: 'media-1', url: 'https://example.com/1.jpg', type: 'image', displayOrder: 0, isPrimary: true },
    { id: 'media-2', url: 'https://example.com/2.jpg', type: 'image', displayOrder: 1, isPrimary: false },
    { id: 'media-3', url: 'https://example.com/3.jpg', type: 'image', displayOrder: 2, isPrimary: false },
    { id: 'media-4', url: 'https://example.com/4.jpg', type: 'image', displayOrder: 3, isPrimary: false },
    { id: 'media-5', url: 'https://example.com/5.jpg', type: 'image', displayOrder: 4, isPrimary: false },
  ],
  mainMediaId: 'media-1',
};

const emptyData: ListingWorkflowData = {
  action: undefined as any,
  propertyType: undefined as any,
  title: '',
  description: '',
  pricing: undefined as any,
  propertyDetails: undefined as any,
  additionalInfo: undefined as any,
  basicInfo: undefined as any,
  location: undefined as any,
  media: [],
  mainMediaId: undefined as any,
};

describe('calculateSubmitReadinessDryRun', () => {
  it('returns ready for complete data', async () => {
    const result = await calculateSubmitReadinessDryRun(completeData);
    expect(result.ready).toBe(true);
    expect(result.blockingReasons).toHaveLength(0);
  });

  it('builds payload for complete data', async () => {
    const result = await calculateSubmitReadinessDryRun(completeData);
    expect(result.payload.built).toBe(true);
    expect(result.payload.action).toBe('sell');
    expect(result.payload.propertyType).toBe('house');
    expect(result.payload.title).toBe('Modern Family Home');
    expect(result.payload.mediaCount).toBe(5);
    expect(result.payload.mainMediaPresent).toBe(true);
    expect(result.payload.propertyDetailsKeys).toBeGreaterThan(0);
    expect(result.payload.sizeBytes).toBeGreaterThan(0);
  });

  it('returns validation results', async () => {
    const result = await calculateSubmitReadinessDryRun(completeData);
    expect(result.validation).toBeDefined();
    expect(result.validation.valid).toBe(true);
    expect(result.validation.errorCount).toBe(0);
  });

  it('returns readiness and quality scores', async () => {
    const result = await calculateSubmitReadinessDryRun(completeData);
    expect(result.readiness.score).toBeGreaterThanOrEqual(0);
    expect(result.quality.score).toBeGreaterThanOrEqual(0);
    expect(result.quality.tier).toBeDefined();
  });

  it('returns blocked for empty data', async () => {
    const result = await calculateSubmitReadinessDryRun(emptyData);
    expect(result.ready).toBe(false);
    expect(result.blockingReasons.length).toBeGreaterThan(0);
  });

  it('includes "Action not selected" for missing action', async () => {
    const result = await calculateSubmitReadinessDryRun(emptyData);
    expect(result.blockingReasons).toContain('Action not selected');
  });

  it('includes "Property type not selected" for missing propertyType', async () => {
    const result = await calculateSubmitReadinessDryRun(emptyData);
    expect(result.blockingReasons).toContain('Property type not selected');
  });

  it('includes "Title not set" for missing title', async () => {
    const result = await calculateSubmitReadinessDryRun(emptyData);
    expect(result.blockingReasons).toContain('Title not set');
  });

  it('includes "Description not set" for missing description', async () => {
    const result = await calculateSubmitReadinessDryRun(emptyData);
    expect(result.blockingReasons).toContain('Description not set');
  });

  it('includes "Pricing not set" for missing pricing', async () => {
    const result = await calculateSubmitReadinessDryRun(emptyData);
    expect(result.blockingReasons).toContain('Pricing not set');
  });

  it('includes "Location address not set" for missing location', async () => {
    const result = await calculateSubmitReadinessDryRun(emptyData);
    expect(result.blockingReasons).toContain('Location address not set');
  });

  it('includes "No media uploaded" for empty media', async () => {
    const result = await calculateSubmitReadinessDryRun(emptyData);
    expect(result.blockingReasons).toContain('No media uploaded');
  });

  it('reports validation errors for empty data', async () => {
    const result = await calculateSubmitReadinessDryRun(emptyData);
    expect(result.validation.valid).toBe(false);
    expect(result.validation.errorCount).toBeGreaterThan(0);
    expect(result.blockingReasons.some((r) => r.includes('validation error'))).toBe(true);
  });

  it('reports readiness gaps for empty data', async () => {
    const result = await calculateSubmitReadinessDryRun(emptyData);
    // readiness score should be low for empty data
    expect(result.readiness.score).toBeLessThan(50);
    const allMissing = Object.values(result.readiness.missing).flat();
    expect(allMissing.length).toBeGreaterThan(0);
  });

  it('handles partial data without crashing', async () => {
    const partialData: ListingWorkflowData = {
      action: 'sell',
      propertyType: undefined as any,
      title: 'Some title',
      description: '',
      pricing: undefined as any,
      propertyDetails: undefined as any,
      additionalInfo: undefined as any,
      basicInfo: undefined as any,
      location: { address: '123 Street' } as any,
      media: [{ id: 'm1', url: 'x.jpg', type: 'image', displayOrder: 0, isPrimary: true }],
      mainMediaId: undefined as any,
    };
    const result = await calculateSubmitReadinessDryRun(partialData);
    // Should not throw, should return a result
    expect(result).toBeDefined();
    expect(result.ready).toBe(false);
  });

  describe('action-aware price mapping', () => {
    it('uses askingPrice for sell action', async () => {
      const data: ListingWorkflowData = {
        ...completeData,
        action: 'sell',
        pricing: { askingPrice: 1000000 } as any,
      };
      const result = await calculateSubmitReadinessDryRun(data);
      // price gap is empty when askingPrice is set
      expect(result.readiness.missing.pricing).toEqual([]);
      expect(result.blockingReasons).not.toContain('Pricing not set');
    });

    it('uses monthlyRent for rent action', async () => {
      const data: ListingWorkflowData = {
        ...completeData,
        action: 'rent',
        propertyType: 'apartment',
        pricing: { monthlyRent: 15000 } as any,
        propertyDetails: { bedrooms: 2, bathrooms: 1, unitSizeM2: 85 },
      };
      const result = await calculateSubmitReadinessDryRun(data);
      // monthlyRent satisfies the pricing check in readiness
      expect(result.readiness.missing.pricing).toEqual([]);
      expect(result.blockingReasons).not.toContain('Pricing not set');
    });

    it('uses startingBid for auction action and does not report missing pricing', async () => {
      const data: ListingWorkflowData = {
        ...completeData,
        action: 'auction',
        propertyType: 'house',
        pricing: { startingBid: 500000 } as any,
      };
      const result = await calculateSubmitReadinessDryRun(data);
      // startingBid is mapped to askingPrice, so pricing gap is empty
      expect(result.readiness.missing.pricing).toEqual([]);
      expect(result.blockingReasons).not.toContain('Pricing not set');
    });
  });

  describe('media mapping', () => {
    it('videos are not counted as images', async () => {
      const data: ListingWorkflowData = {
        ...completeData,
        media: [
          { id: 'v1', url: 'x.mp4', type: 'video', displayOrder: 0, isPrimary: true },
          { id: 'v2', url: 'y.mp4', type: 'video', displayOrder: 1, isPrimary: false },
        ],
        mainMediaId: 'v1',
      };
      const result = await calculateSubmitReadinessDryRun(data);
      // readiness checks images or media length; with only 2 videos and no images,
      // readiness score should be lower (no image count)
      expect(result.readiness.missing.media?.length).toBeGreaterThan(0);
      expect(result.readiness.missing.media?.[0]).toContain('images');
    });

    it('media without IDs does not report mainMedia present', async () => {
      const data: ListingWorkflowData = {
        ...completeData,
        mainMediaId: undefined as any,
        media: [
          { id: '', url: 'x.jpg', type: 'image', displayOrder: 0, isPrimary: true },
          { id: '', url: 'y.jpg', type: 'image', displayOrder: 1, isPrimary: false },
        ],
      };
      const result = await calculateSubmitReadinessDryRun(data);
      // mainMediaPresent should be false — first item has empty id
      expect(result.payload.mainMediaPresent).toBe(false);
    });

    it('counts images correctly when media includes both types', async () => {
      const data: ListingWorkflowData = {
        ...completeData,
        media: [
          { id: 'i1', url: 'a.jpg', type: 'image', displayOrder: 0, isPrimary: true },
          { id: 'i2', url: 'b.jpg', type: 'image', displayOrder: 1, isPrimary: false },
          { id: 'v1', url: 'c.mp4', type: 'video', displayOrder: 2, isPrimary: false },
        ],
        mainMediaId: 'i1',
      };
      const result = await calculateSubmitReadinessDryRun(data);
      // 2 images + 1 video = 3 total, but only 2 images
      expect(result.payload.mediaCount).toBe(3);
      expect(result.payload.mainMediaPresent).toBe(true);
    });
  });

  describe('feature mapping', () => {
    it('builds features from additionalInfo arrays matching V1 PreviewStep', async () => {
      const data: ListingWorkflowData = {
        ...completeData,
        additionalInfo: {
          propertyHighlights: ['Pool', 'Garden'],
          additionalRooms: ['Study', 'Guest Toilet'],
          securityFeatures: ['Burglar Bars', 'Electric Fence'],
        } as any,
      };
      const result = await calculateSubmitReadinessDryRun(data);
      // 2 + 2 + 2 = 6 features; quality score should reflect featureCount >= 5
      expect(result.quality.score).toBeGreaterThanOrEqual(5);
      // No quality tip about listing features
      const noFeaturesTip = result.quality.tips.find((t) => t.includes('features'));
      expect(noFeaturesTip).toBeUndefined();
    });
  });

  describe('property-type floor-size mapping', () => {
    it('maps apartment to unitSizeM2', async () => {
      const data: ListingWorkflowData = {
        ...completeData,
        action: 'rent',
        propertyType: 'apartment',
        pricing: { monthlyRent: 12000 } as any,
        propertyDetails: { bedrooms: 2, bathrooms: 1, unitSizeM2: 85 },
      };
      const result = await calculateSubmitReadinessDryRun(data);
      // unitSizeM2=85 satisfies hasFloorSize — no "floor size" tip
      const floorTip = result.quality.tips.find((t) => t.includes('floor size') || t.includes('erf size'));
      expect(floorTip).toBeUndefined();
    });

    it('maps house to houseAreaM2', async () => {
      const data: ListingWorkflowData = {
        ...completeData,
        propertyType: 'house',
        propertyDetails: { bedrooms: 3, bathrooms: 2, houseAreaM2: 200 },
      };
      const result = await calculateSubmitReadinessDryRun(data);
      // houseAreaM2=200 satisfies hasFloorSize
      const floorTip = result.quality.tips.find((t) => t.includes('floor size') || t.includes('erf size'));
      expect(floorTip).toBeUndefined();
    });

    it('maps land to landSizeM2OrHa', async () => {
      const data: ListingWorkflowData = {
        ...completeData,
        propertyType: 'land',
        propertyDetails: { landSizeM2OrHa: 500 },
      };
      const result = await calculateSubmitReadinessDryRun(data);
      // land does not need bedrooms for readiness specs
      expect(result.readiness.missing.specs).toEqual([]);
      // landSizeM2OrHa=500 satisfies hasFloorSize
      const floorTip = result.quality.tips.find((t) => t.includes('floor size') || t.includes('erf size'));
      expect(floorTip).toBeUndefined();
    });

    it('maps farm to landSizeHa', async () => {
      const data: ListingWorkflowData = {
        ...completeData,
        propertyType: 'farm',
        propertyDetails: { landSizeHa: 10 },
      };
      const result = await calculateSubmitReadinessDryRun(data);
      // landSizeHa=10 satisfies hasFloorSize
      const floorTip = result.quality.tips.find((t) => t.includes('floor size') || t.includes('erf size'));
      expect(floorTip).toBeUndefined();
    });

    it('maps commercial to floorAreaM2', async () => {
      const data: ListingWorkflowData = {
        ...completeData,
        propertyType: 'commercial',
        propertyDetails: { floorAreaM2: 300 },
      };
      const result = await calculateSubmitReadinessDryRun(data);
      // floorAreaM2=300 satisfies hasFloorSize
      const floorTip = result.quality.tips.find((t) => t.includes('floor size') || t.includes('erf size'));
      expect(floorTip).toBeUndefined();
    });
  });
});
