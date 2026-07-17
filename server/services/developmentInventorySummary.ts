import { developments, unitTypes } from '../../drizzle/schema';
import {
  hasPositivePersistedNumber,
  hasValidPersistedUnitTypeInventory,
  isPersistedUnitTypeActive,
  resolvePersistedUnitTypeRentalPrice,
  resolvePersistedUnitTypeSalePrice,
  type SubmissionValidationError,
} from './developmentSubmissionReadiness';

type PersistedDevelopmentInventoryContext = Pick<
  typeof developments.$inferSelect,
  'developmentType' | 'transactionType'
>;

type PersistedInventoryUnitType = Pick<
  typeof unitTypes.$inferSelect,
  | 'isActive'
  | 'totalUnits'
  | 'availableUnits'
  | 'reservedUnits'
  | 'priceFrom'
  | 'priceTo'
  | 'basePriceFrom'
  | 'basePriceTo'
  | 'monthlyRentFrom'
  | 'monthlyRentTo'
  | 'startingBid'
  | 'reservePrice'
  | 'auctionStartDate'
  | 'auctionEndDate'
>;

export type DevelopmentHomeInventoryWarning = {
  code:
    | 'no_active_unit_types'
    | 'inactive_unit_types'
    | 'invalid_aggregate_inventory'
    | 'missing_or_invalid_pricing'
    | 'rental_price_integrity_conflict'
    | 'sale_price_integrity_conflict'
    | 'legacy_sale_price_compatibility'
    | 'zero_aggregate_availability';
  message: string;
};

export type DevelopmentHomeInventory = {
  catalogueState: 'configured' | 'not_configured' | 'land_not_required';
  activeUnitTypeCount: number;
  totalUnits: number | null;
  availableUnits: number | null;
  reservedUnits: number | null;
  derivedSoldUnits: number | null;
  auctionTermsConfiguredCount: number;
  pricing:
    | { kind: 'sale' | 'rent'; from: number | null; to: number | null }
    | {
        kind: 'auction';
        from: number | null;
        to: number | null;
      }
    | { kind: 'unavailable'; from: null; to: null };
  warnings: DevelopmentHomeInventoryWarning[];
};

function numberOrNull(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

const warningPriority: Record<DevelopmentHomeInventoryWarning['code'], number> = {
  sale_price_integrity_conflict: 1,
  invalid_aggregate_inventory: 2,
  missing_or_invalid_pricing: 3,
  rental_price_integrity_conflict: 4,
  no_active_unit_types: 5,
  zero_aggregate_availability: 6,
  legacy_sale_price_compatibility: 7,
  inactive_unit_types: 8,
};

export function prioritizeDevelopmentHomeInventoryWarnings(
  warnings: DevelopmentHomeInventoryWarning[],
): DevelopmentHomeInventoryWarning[] {
  return [...warnings]
    .sort((left, right) => warningPriority[left.code] - warningPriority[right.code])
    .slice(0, 5);
}

/**
 * Read-only aggregate catalogue projection. It receives the owner-scoped unit
 * type rows already loaded for the Home, so it never establishes ownership or
 * falls back to legacy development-level inventory/pricing columns.
 */
export function buildDevelopmentHomeInventory(
  development: PersistedDevelopmentInventoryContext,
  persistedUnitTypes: PersistedInventoryUnitType[],
  _readinessErrors: readonly SubmissionValidationError[],
): DevelopmentHomeInventory {
  const active = persistedUnitTypes.filter(isPersistedUnitTypeActive);
  const inactiveCount = persistedUnitTypes.length - active.length;
  const landWithoutCatalogue = development.developmentType === 'land' && active.length === 0;
  const inventoryValid = active.every(hasValidPersistedUnitTypeInventory);
  const warnings: DevelopmentHomeInventoryWarning[] = [];

  if (!landWithoutCatalogue && active.length === 0) {
    warnings.push({ code: 'no_active_unit_types', message: 'Aggregate catalogue not configured.' });
  }
  if (inactiveCount > 0) {
    warnings.push({
      code: 'inactive_unit_types',
      message: 'Inactive catalogue entries are excluded from aggregate inventory.',
    });
  }
  if (active.length > 0 && !inventoryValid) {
    warnings.push({
      code: 'invalid_aggregate_inventory',
      message: 'One or more active unit types have invalid aggregate inventory.',
    });
  }

  const quantities =
    active.length > 0 && inventoryValid
      ? active.reduce(
          (totals, unit) => ({
            total: totals.total + Number(unit.totalUnits),
            available: totals.available + Number(unit.availableUnits),
            reserved: totals.reserved + Number(unit.reservedUnits ?? 0),
          }),
          { total: 0, available: 0, reserved: 0 },
        )
      : null;

  if (quantities?.available === 0) {
    warnings.push({
      code: 'zero_aggregate_availability',
      message: '0 aggregate units are marked available.',
    });
  }

  let pricing: DevelopmentHomeInventory['pricing'] = {
    kind: 'unavailable',
    from: null,
    to: null,
  };
  const auctionTermsConfiguredCount = active.filter(unit => {
    const start = unit.auctionStartDate ? new Date(unit.auctionStartDate) : null;
    const end = unit.auctionEndDate ? new Date(unit.auctionEndDate) : null;
    const reserve =
      unit.reservePrice == null || unit.reservePrice === '' ? null : Number(unit.reservePrice);
    return (
      hasPositivePersistedNumber(unit.startingBid) &&
      start &&
      end &&
      !Number.isNaN(start.getTime()) &&
      !Number.isNaN(end.getTime()) &&
      start.getTime() > Date.now() &&
      end > start &&
      (reserve === null ||
        (Number.isFinite(reserve) && reserve > 0 && reserve >= Number(unit.startingBid)))
    );
  }).length;
  if (active.length > 0) {
    if (development.transactionType === 'for_sale') {
      const prices = active.map(resolvePersistedUnitTypeSalePrice);
      if (prices.some(price => price.status === 'conflict')) {
        warnings.push({
          code: 'sale_price_integrity_conflict',
          message:
            'Conflicting sale prices are recorded for this unit type. Open the editor and confirm the correct price.',
        });
      } else if (prices.some(price => !['canonical', 'compatibility'].includes(price.status))) {
        warnings.push({
          code: 'missing_or_invalid_pricing',
          message: 'Active catalogue pricing is missing or invalid for this transaction type.',
        });
      } else {
        if (prices.some(price => price.compatibilityDerived))
          warnings.push({
            code: 'legacy_sale_price_compatibility',
            message:
              'Sale pricing uses an older catalogue field. Open the editor and save the unit type to align its pricing.',
          });
        pricing = {
          kind: 'sale',
          from: Math.min(...prices.map(price => price.from!)),
          to: Math.max(...prices.map(price => price.to ?? price.from!)),
        };
      }
    } else if (development.transactionType === 'for_rent') {
      const rents = active.map(resolvePersistedUnitTypeRentalPrice);
      if (rents.some(rent => rent.status === 'upper_bound_conflict')) {
        warnings.push({
          code: 'rental_price_integrity_conflict',
          message: 'An active unit type has an invalid monthly rent range.',
        });
      } else if (rents.some(rent => rent.status !== 'valid')) {
        warnings.push({
          code: 'missing_or_invalid_pricing',
          message: 'Active catalogue pricing is missing or invalid for this transaction type.',
        });
      } else {
        pricing = {
          kind: 'rent',
          from: Math.min(...rents.map(rent => rent.from!)),
          to: Math.max(...rents.map(rent => rent.to ?? rent.from!)),
        };
      }
    } else if (development.transactionType === 'auction') {
      const bids = active
        .map(unit => numberOrNull(unit.startingBid))
        .filter((bid): bid is number => bid !== null && bid > 0);
      if (bids.length > 0) {
        pricing = {
          kind: 'auction',
          from: Math.min(...(bids as number[])),
          to: Math.max(...(bids as number[])),
        };
      }
      if (auctionTermsConfiguredCount !== active.length)
        warnings.push({
          code: 'missing_or_invalid_pricing',
          message: 'One or more active unit types have missing or invalid auction terms.',
        });
    }
  }
  if (
    active.length > 0 &&
    pricing.kind === 'unavailable' &&
    !warnings.some(warning => warning.code === 'missing_or_invalid_pricing')
  ) {
    warnings.push({
      code: 'missing_or_invalid_pricing',
      message: 'Active catalogue pricing is missing or invalid for this transaction type.',
    });
  }

  return {
    catalogueState: landWithoutCatalogue
      ? 'land_not_required'
      : active.length === 0
        ? 'not_configured'
        : 'configured',
    activeUnitTypeCount: active.length,
    totalUnits: quantities?.total ?? null,
    availableUnits: quantities?.available ?? null,
    reservedUnits: quantities?.reserved ?? null,
    derivedSoldUnits: quantities
      ? quantities.total - quantities.available - quantities.reserved
      : null,
    pricing,
    auctionTermsConfiguredCount,
    warnings: prioritizeDevelopmentHomeInventoryWarnings(warnings),
  };
}
