export type DevelopmentInventoryMarketMode = 'for_sale' | 'for_rent';

export interface DevelopmentInventoryPriceSource {
  transactionType: DevelopmentInventoryMarketMode;
  salePrice?: unknown;
  rentPrice?: unknown;
}

export interface DevelopmentUnitTypePriceRange {
  basePriceFrom?: unknown;
  basePriceTo?: unknown;
  monthlyRentFrom?: unknown;
  monthlyRentTo?: unknown;
}

/**
 * Resolve whether an allocation has an exact price or a valid unit-type range
 * for its current market mode. A zero upper bound means a single-price range.
 */
export function hasValidDevelopmentInventoryMarketPrice(
  item: DevelopmentInventoryPriceSource,
  unitType: DevelopmentUnitTypePriceRange | null | undefined,
): boolean {
  const rental = item.transactionType === 'for_rent';
  const override = Number(rental ? item.rentPrice : item.salePrice);
  if (Number.isFinite(override) && override > 0) return true;

  const from = Number(rental ? unitType?.monthlyRentFrom : unitType?.basePriceFrom);
  const to = Number(rental ? unitType?.monthlyRentTo : unitType?.basePriceTo);
  if (!Number.isFinite(from) || from <= 0) return false;
  if (Number.isFinite(to) && to < 0) return false;
  return !Number.isFinite(to) || to === 0 || to >= from;
}
