import {
  getDevelopmentSalesProjection,
  type DevelopmentSalesModeProjection,
} from './distributionDeveloperReadPort';

export type DistributionPublicMarketMode = 'sale' | 'rent';

export type DistributionPublicModeProjection = {
  availableCount: number;
  priceFrom: number;
  priceTo: number;
  priceBasis: 'purchase_price' | 'monthly_rent';
};

type DeveloperModeMap = Partial<
  Record<'for_sale' | 'for_rent', DevelopmentSalesModeProjection>
>;

export type DistributionPublicOpportunity = {
  developmentId: number;
  revision: string;
  observedAt: string;
  campaign: {
    name: string;
    tagline: string | null;
    description: string | null;
    developmentType: string;
    city: string;
    province: string;
    images: string[];
  };
  inventory: {
    modes: Partial<Record<DistributionPublicMarketMode, DistributionPublicModeProjection>>;
    unitTypes: Array<{
      name: string;
      description: string | null;
      bedrooms: number | null;
      bathrooms: number | null;
      size: number | null;
      imageUrl: string | null;
      modes: Partial<Record<DistributionPublicMarketMode, DistributionPublicModeProjection>>;
    }>;
  };
};

function toMarketableMode(
  mode: DevelopmentSalesModeProjection | undefined,
): DistributionPublicModeProjection | undefined {
  if (
    !mode ||
    !Number.isSafeInteger(mode.availableCount) ||
    mode.availableCount <= 0 ||
    !Number.isFinite(mode.priceFrom) ||
    mode.priceFrom <= 0 ||
    !Number.isFinite(mode.priceTo) ||
    mode.priceTo < mode.priceFrom
  ) {
    return undefined;
  }

  return {
    availableCount: mode.availableCount,
    priceFrom: mode.priceFrom,
    priceTo: mode.priceTo,
    priceBasis: mode.priceBasis,
  };
}

function toPublicModes(modes: DeveloperModeMap) {
  const sale = toMarketableMode(modes.for_sale);
  const rent = toMarketableMode(modes.for_rent);
  return {
    ...(sale ? { sale } : {}),
    ...(rent ? { rent } : {}),
  };
}

/**
 * Returns only public campaign and marketable sale/rent facts from the
 * Developer projection. Partner contacts and resources are deliberately
 * omitted from this public discovery contract.
 */
export async function listPublicDistributionOpportunities(
  developmentIds: number[],
): Promise<{ items: DistributionPublicOpportunity[] }> {
  const uniqueIds = [...new Set(developmentIds)];
  if (
    uniqueIds.length > 50 ||
    uniqueIds.some(id => !Number.isSafeInteger(id) || id <= 0)
  ) {
    throw new Error('Public opportunity projection scope is invalid.');
  }

  const items: DistributionPublicOpportunity[] = [];
  const batchSize = 5;
  for (let offset = 0; offset < uniqueIds.length; offset += batchSize) {
    const batch = uniqueIds.slice(offset, offset + batchSize);
    const projected = await Promise.all(batch.map(async developmentId => {
      const projection = await getDevelopmentSalesProjection(developmentId);
      if (
        !projection ||
        projection.campaign.visible !== true ||
        projection.inventory.phaseScope === 'unscoped-hidden'
      ) {
        return null;
      }

      const modes = toPublicModes(projection.inventory.modes);
      if (!Object.keys(modes).length) return null;

      return {
        developmentId: projection.developmentId,
        revision: projection.revision,
        observedAt: projection.observedAt,
        campaign: {
          name: projection.campaign.name,
          tagline: projection.campaign.tagline,
          description: projection.campaign.description,
          developmentType: projection.campaign.developmentType,
          city: projection.campaign.city,
          province: projection.campaign.province,
          images: projection.campaign.images,
        },
        inventory: {
          modes,
          unitTypes: projection.inventory.unitTypes.flatMap(unitType => {
            const unitModes = toPublicModes(unitType.modes);
            if (!Object.keys(unitModes).length) return [];
            return [{
              name: unitType.name,
              description: unitType.description,
              bedrooms: unitType.bedrooms,
              bathrooms: unitType.bathrooms,
              size: unitType.size,
              imageUrl: unitType.imageUrl,
              modes: unitModes,
            }];
          }),
        },
      } satisfies DistributionPublicOpportunity;
    }));

    items.push(...projected.filter(
      (item): item is DistributionPublicOpportunity => item !== null,
    ));
  }

  return { items };
}
