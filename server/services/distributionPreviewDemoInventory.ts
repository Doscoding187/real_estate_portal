import {
  DISTRIBUTION_PREVIEW_DEMO_SOURCE_ATTRIBUTION,
  isDistributionPreviewDemoSlug,
} from '../../shared/distributionPreviewDemo';

export type DistributionPreviewDemoMode = 'for_sale' | 'for_rent';

export type DistributionPreviewDemoModeFacts = {
  availableCount: number;
  priceFrom: number;
  priceTo: number;
  priceBasis: 'purchase_price' | 'monthly_rent';
};

export type DistributionPreviewDemoUnitType = {
  id: string;
  name: string;
  description: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  unitSize: number | null;
  basePriceFrom: number | null;
  basePriceTo: number | null;
  availableUnits: number;
  isActive: boolean;
};

export type DistributionPreviewDemoInventory = {
  mode: 'aggregate' | 'itemized';
  phaseScope: 'development-wide';
  modes: Partial<Record<DistributionPreviewDemoMode, DistributionPreviewDemoModeFacts>>;
  phases: Array<{ id: number; name: string; phaseNumber: number }>;
  unitTypes: Array<{
    id: string;
    name: string;
    description: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    size: number | null;
    imageUrl: string | null;
    modes: Partial<Record<DistributionPreviewDemoMode, DistributionPreviewDemoModeFacts>>;
  }>;
};

/**
 * Only an exactly governed platform preview development may expose synthetic
 * stock: the deterministic slug prefix, the platform reference publisher with
 * the governed source-attribution marker, a published and approved for-sale
 * development, and no active supersession. Everything else stays fail-closed
 * in the caller.
 */
export function isGovernedDistributionPreviewDemo(input: {
  development: {
    slug: unknown;
    transactionType: unknown;
    isPublished: unknown;
    approvalStatus: unknown;
  };
  publisher: {
    authorityKind: unknown;
    isVisible: unknown;
    sourceAttribution: unknown;
  } | null;
  activeSupersession: boolean;
}): boolean {
  if (!isDistributionPreviewDemoSlug(input.development.slug)) return false;
  if (!input.publisher) return false;
  if (input.publisher.authorityKind !== 'platform_reference') return false;
  if (Number(input.publisher.isVisible || 0) !== 1) return false;
  if (input.publisher.sourceAttribution !== DISTRIBUTION_PREVIEW_DEMO_SOURCE_ATTRIBUTION) {
    return false;
  }
  if (Number(input.development.isPublished || 0) !== 1) return false;
  if (input.development.approvalStatus !== 'approved') return false;
  if (input.development.transactionType !== 'for_sale') return false;
  if (input.activeSupersession) return false;
  return true;
}

function saleModeFor(unitType: DistributionPreviewDemoUnitType): DistributionPreviewDemoModeFacts | null {
  if (!unitType.isActive) return null;
  if (unitType.availableUnits <= 0) return null;
  const priceFrom = unitType.basePriceFrom;
  if (typeof priceFrom !== 'number' || !Number.isFinite(priceFrom) || priceFrom <= 0) return null;
  const candidateTo =
    typeof unitType.basePriceTo === 'number' && Number.isFinite(unitType.basePriceTo)
      ? unitType.basePriceTo
      : priceFrom;
  const priceTo = candidateTo >= priceFrom ? candidateTo : priceFrom;
  return {
    availableCount: unitType.availableUnits,
    priceFrom,
    priceTo,
    priceBasis: 'purchase_price',
  };
}

/**
 * Derives the synthetic inventory projection for a governed preview demo.
 * Returns null when the development is not governed; returns an empty-stock
 * development-wide inventory when governed but nothing is currently priced so
 * the partner journey can explain the state instead of hiding the campaign.
 */
export function resolveDistributionPreviewDemoInventory(input: {
  development: {
    slug: unknown;
    transactionType: unknown;
    isPublished: unknown;
    approvalStatus: unknown;
    inventoryMode: 'aggregate' | 'itemized';
  };
  publisher: {
    authorityKind: unknown;
    isVisible: unknown;
    sourceAttribution: unknown;
  } | null;
  unitTypes: DistributionPreviewDemoUnitType[];
  activeSupersession: boolean;
}): DistributionPreviewDemoInventory | null {
  if (!isGovernedDistributionPreviewDemo(input)) return null;

  const unitTypes = input.unitTypes
    .map(unitType => {
      const modes = saleModeFor(unitType);
      if (!modes) return null;
      return {
        id: unitType.id,
        name: unitType.name,
        description: unitType.description,
        bedrooms: unitType.bedrooms,
        bathrooms: unitType.bathrooms,
        size: unitType.unitSize,
        imageUrl: null,
        modes: { for_sale: modes } as Partial<
          Record<DistributionPreviewDemoMode, DistributionPreviewDemoModeFacts>
        >,
      };
    })
    .filter((unitType): unitType is NonNullable<typeof unitType> => unitType !== null);

  const modes: Partial<Record<DistributionPreviewDemoMode, DistributionPreviewDemoModeFacts>> = {};
  if (unitTypes.length > 0) {
    const saleModes = unitTypes.map(unitType => unitType.modes.for_sale!);
    modes.for_sale = {
      availableCount: saleModes.reduce((total, mode) => total + mode.availableCount, 0),
      priceFrom: Math.min(...saleModes.map(mode => mode.priceFrom)),
      priceTo: Math.max(...saleModes.map(mode => mode.priceTo)),
      priceBasis: 'purchase_price',
    };
  }

  return {
    mode: input.development.inventoryMode,
    phaseScope: 'development-wide',
    modes,
    phases: [],
    unitTypes,
  };
}
