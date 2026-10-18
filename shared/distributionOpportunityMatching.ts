export type DistributionMarketMode = 'sale' | 'rent';
export type DistributionBedroomFilter = 'studio' | 1 | 2 | 3 | '4+';

export type DistributionPriceBand = {
  key: string;
  label: string;
  minPrice: number | null;
  maxPrice: number | null;
};

export const DISTRIBUTION_PRICE_BANDS: Record<DistributionMarketMode, DistributionPriceBand[]> = {
  sale: [
    { key: 'any', label: 'Any price', minPrice: null, maxPrice: null },
    { key: 'up_to_900k', label: 'Up to R900k', minPrice: 0, maxPrice: 900_000 },
    {
      key: '900k_to_1_5m',
      label: 'R900k–R1.5m',
      minPrice: 900_001,
      maxPrice: 1_500_000,
    },
    {
      key: '1_5m_to_2_2m',
      label: 'R1.5m–R2.2m',
      minPrice: 1_500_001,
      maxPrice: 2_200_000,
    },
    { key: 'over_2_2m', label: 'Over R2.2m', minPrice: 2_200_001, maxPrice: null },
  ],
  rent: [
    { key: 'any', label: 'Any monthly rent', minPrice: null, maxPrice: null },
    { key: 'up_to_10k', label: 'Up to R10k / month', minPrice: 0, maxPrice: 10_000 },
    {
      key: '10k_to_20k',
      label: 'R10k–R20k / month',
      minPrice: 10_001,
      maxPrice: 20_000,
    },
    {
      key: '20k_to_30k',
      label: 'R20k–R30k / month',
      minPrice: 20_001,
      maxPrice: 30_000,
    },
    { key: 'over_30k', label: 'Over R30k / month', minPrice: 30_001, maxPrice: null },
  ],
};

export const DISTRIBUTION_BEDROOM_FILTERS: Array<{
  key: DistributionBedroomFilter;
  label: string;
}> = [
  { key: 'studio', label: 'Studio' },
  { key: 1, label: '1 bed' },
  { key: 2, label: '2 beds' },
  { key: 3, label: '3 beds' },
  { key: '4+', label: '4+ beds' },
];

export type DistributionOpportunityUnit = {
  bedrooms: number | null;
  label?: string | null;
  available: boolean;
  priceFrom: number | null;
  priceTo: number | null;
};

/** A normalized candidate built only from the catalogue already visible to the caller. */
export type DistributionOpportunityCandidate = {
  marketMode: DistributionMarketMode;
  available: boolean;
  priceFrom: number | null;
  priceTo: number | null;
  locationText: string;
  unitTypes: DistributionOpportunityUnit[];
};

export type DistributionOpportunityCriteria = {
  marketMode: DistributionMarketMode;
  minPrice?: number | null;
  maxPrice?: number | null;
  areaKeywords?: readonly string[];
  bedrooms?: readonly DistributionBedroomFilter[];
};

function validPriceRange(priceFrom: number | null, priceTo: number | null) {
  return (
    typeof priceFrom === 'number' &&
    Number.isFinite(priceFrom) &&
    priceFrom > 0 &&
    (priceTo === null ||
      (Number.isFinite(priceTo) && priceTo >= priceFrom))
  );
}

function priceRangeOverlaps(
  priceFrom: number | null,
  priceTo: number | null,
  minPrice?: number | null,
  maxPrice?: number | null,
) {
  if (!validPriceRange(priceFrom, priceTo)) return false;
  const highest = priceTo ?? priceFrom!;
  if (typeof maxPrice === 'number' && priceFrom! > maxPrice) return false;
  if (typeof minPrice === 'number' && highest < minPrice) return false;
  return true;
}

function unitMatchesBedrooms(
  unit: DistributionOpportunityUnit,
  selected: readonly DistributionBedroomFilter[],
) {
  const label = (unit.label || '').toLowerCase();
  return selected.some(bedroom => {
    if (bedroom === 'studio') {
      return unit.bedrooms === 0 || /studio|bachelor/.test(label);
    }
    if (bedroom === '4+') {
      return (unit.bedrooms !== null && unit.bedrooms >= 4) || /[4-9](\s*bed|\s*br)/.test(label);
    }
    return (
      unit.bedrooms === bedroom ||
      new RegExp(`(?:^|\\D)${bedroom}\\s*(?:bed(?:room)?s?|br)(?:\\D|$)`).test(label)
    );
  });
}

/**
 * Applies the same browse filters to public listings and entitled partner
 * catalogue entries. This is property discovery only; it does not assess
 * borrowing capacity or determine referral eligibility.
 */
export function matchesDistributionOpportunity(
  candidate: DistributionOpportunityCandidate,
  criteria: DistributionOpportunityCriteria,
) {
  if (candidate.marketMode !== criteria.marketMode || !candidate.available) return false;

  const selectedAreaKeywords = (criteria.areaKeywords || [])
    .map(keyword => keyword.trim().toLowerCase())
    .filter(Boolean);
  const normalizedLocation = candidate.locationText.toLowerCase();
  if (
    selectedAreaKeywords.length > 0 &&
    !selectedAreaKeywords.some(keyword => normalizedLocation.includes(keyword))
  ) {
    return false;
  }

  const selectedBedrooms = criteria.bedrooms || [];
  if (selectedBedrooms.length > 0) {
    return candidate.unitTypes.some(
      unit =>
        unit.available &&
        unitMatchesBedrooms(unit, selectedBedrooms) &&
        priceRangeOverlaps(unit.priceFrom, unit.priceTo, criteria.minPrice, criteria.maxPrice),
    );
  }

  return priceRangeOverlaps(
    candidate.priceFrom,
    candidate.priceTo,
    criteria.minPrice,
    criteria.maxPrice,
  );
}
