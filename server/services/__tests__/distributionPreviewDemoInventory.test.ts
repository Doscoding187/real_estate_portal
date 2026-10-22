import { describe, expect, it } from 'vitest';
import { DISTRIBUTION_PREVIEW_DEMO_SOURCE_ATTRIBUTION } from '../../../shared/distributionPreviewDemo';
import {
  isGovernedDistributionPreviewDemo,
  resolveDistributionPreviewDemoInventory,
  type DistributionPreviewDemoUnitType,
} from '../distributionPreviewDemoInventory';

const governedDevelopment = {
  slug: 'distribution-preview-demo-ridge-estate-v2',
  transactionType: 'for_sale',
  isPublished: 1,
  approvalStatus: 'approved',
  inventoryMode: 'itemized' as const,
};

const governedPublisher = {
  authorityKind: 'platform_reference',
  isVisible: 1,
  sourceAttribution: DISTRIBUTION_PREVIEW_DEMO_SOURCE_ATTRIBUTION,
};

const twoBedroom: DistributionPreviewDemoUnitType = {
  id: 'unit-2bed',
  name: 'Sample 2-Bedroom Apartment',
  description: 'Synthetic demonstration unit type',
  bedrooms: 2,
  bathrooms: 2,
  unitSize: 78,
  yardSize: null,
  basePriceFrom: 1150000,
  basePriceTo: null,
  availableUnits: 4,
  isActive: true,
  media: {
    gallery: [{ url: '/demo/2bed-gallery.jpg', fileName: null, type: 'image' }],
    floorPlans: [{ url: '/demo/2bed-plan.pdf', fileName: '2-bed-plan.pdf', type: 'pdf' }],
    renders: [{ url: '/demo/2bed-render.png', fileName: null, type: 'image' }],
  },
};

const threeBedroom: DistributionPreviewDemoUnitType = {
  id: 'unit-3bed',
  name: 'Sample 3-Bedroom Apartment',
  description: null,
  bedrooms: 3,
  bathrooms: 2,
  unitSize: 105,
  yardSize: null,
  basePriceFrom: 1650000,
  basePriceTo: 1725000,
  availableUnits: 2,
  isActive: true,
};

function governedInput(overrides: Record<string, unknown> = {}) {
  return {
    development: governedDevelopment,
    publisher: governedPublisher,
    unitTypes: [twoBedroom, threeBedroom],
    activeSupersession: false,
    ...overrides,
  } as Parameters<typeof resolveDistributionPreviewDemoInventory>[0];
}

describe('distribution preview demo inventory', () => {
  it('rejects any development that is not an exactly governed preview demo', () => {
    expect(
      isGovernedDistributionPreviewDemo({
        development: { ...governedDevelopment, slug: 'real-development' },
        publisher: governedPublisher,
        activeSupersession: false,
      }),
    ).toBe(false);
    expect(
      isGovernedDistributionPreviewDemo({
        development: governedDevelopment,
        publisher: { ...governedPublisher, sourceAttribution: 'Publicly available source' },
        activeSupersession: false,
      }),
    ).toBe(false);
    expect(
      isGovernedDistributionPreviewDemo({
        development: governedDevelopment,
        publisher: { ...governedPublisher, authorityKind: 'developer_first_party' },
        activeSupersession: false,
      }),
    ).toBe(false);
    expect(
      isGovernedDistributionPreviewDemo({
        development: governedDevelopment,
        publisher: { ...governedPublisher, isVisible: 0 },
        activeSupersession: false,
      }),
    ).toBe(false);
  });

  it('rejects unpublished, unapproved, non-sale, or superseded demo developments', () => {
    expect(
      isGovernedDistributionPreviewDemo({
        development: { ...governedDevelopment, isPublished: 0 },
        publisher: governedPublisher,
        activeSupersession: false,
      }),
    ).toBe(false);
    expect(
      isGovernedDistributionPreviewDemo({
        development: { ...governedDevelopment, approvalStatus: 'draft' },
        publisher: governedPublisher,
        activeSupersession: false,
      }),
    ).toBe(false);
    expect(
      isGovernedDistributionPreviewDemo({
        development: { ...governedDevelopment, transactionType: 'for_rent' },
        publisher: governedPublisher,
        activeSupersession: false,
      }),
    ).toBe(false);
    expect(
      isGovernedDistributionPreviewDemo({
        development: governedDevelopment,
        publisher: governedPublisher,
        activeSupersession: true,
      }),
    ).toBe(false);
  });

  it('returns null for non-governed developments instead of exposing stock', () => {
    expect(
      resolveDistributionPreviewDemoInventory({
        ...governedInput(),
        development: { ...governedDevelopment, slug: 'not-a-preview-demo' },
      }),
    ).toBeNull();
  });

  it('derives development-wide sale inventory from marketable unit types', () => {
    const inventory = resolveDistributionPreviewDemoInventory(governedInput());

    expect(inventory).not.toBeNull();
    expect(inventory?.phaseScope).toBe('development-wide');
    expect(inventory?.mode).toBe('itemized');
    expect(inventory?.phases).toEqual([]);
    expect(inventory?.modes.for_sale).toEqual({
      availableCount: 6,
      priceFrom: 1150000,
      priceTo: 1725000,
      priceBasis: 'purchase_price',
    });
    expect(inventory?.unitTypes.map(unitType => unitType.id)).toEqual(['unit-2bed', 'unit-3bed']);
    expect(inventory?.unitTypes[0]?.modes.for_sale).toEqual({
      availableCount: 4,
      priceFrom: 1150000,
      priceTo: 1150000,
      priceBasis: 'purchase_price',
    });
    expect(inventory?.unitTypes[1]?.modes.for_sale).toEqual({
      availableCount: 2,
      priceFrom: 1650000,
      priceTo: 1725000,
      priceBasis: 'purchase_price',
    });
  });

  it('carries sanitized unit media and derives the primary image from the gallery', () => {
    const inventory = resolveDistributionPreviewDemoInventory(governedInput());

    expect(inventory?.unitTypes[0]?.imageUrl).toBe('/demo/2bed-gallery.jpg');
    expect(inventory?.unitTypes[0]?.media).toEqual(twoBedroom.media);
    expect(inventory?.unitTypes[1]?.imageUrl).toBeNull();
    expect(inventory?.unitTypes[1]?.media).toEqual({
      gallery: [],
      floorPlans: [],
      renders: [],
    });
  });

  it('excludes inactive, unavailable, and unpriced unit types from stock', () => {
    const inventory = resolveDistributionPreviewDemoInventory(
      governedInput({
        unitTypes: [
          twoBedroom,
          { ...threeBedroom, id: 'inactive', isActive: false },
          { ...threeBedroom, id: 'sold-out', availableUnits: 0 },
          { ...threeBedroom, id: 'unpriced', basePriceFrom: null },
        ],
      }),
    );

    expect(inventory?.unitTypes.map(unitType => unitType.id)).toEqual(['unit-2bed']);
    expect(inventory?.modes.for_sale?.availableCount).toBe(4);
  });

  it('reports an empty governed campaign when no unit type is marketable', () => {
    const inventory = resolveDistributionPreviewDemoInventory(
      governedInput({ unitTypes: [{ ...twoBedroom, availableUnits: 0 }] }),
    );

    expect(inventory).not.toBeNull();
    expect(inventory?.phaseScope).toBe('development-wide');
    expect(inventory?.modes).toEqual({});
    expect(inventory?.unitTypes).toEqual([]);
  });
});
