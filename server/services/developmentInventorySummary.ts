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
> & Partial<Pick<typeof developments.$inferSelect, 'inventoryMode'>>;

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
> &
  Partial<
    Pick<
      typeof unitTypes.$inferSelect,
      | 'id'
      | 'name'
      | 'label'
      | 'availableForSaleUnits'
      | 'availableForRentUnits'
      | 'availableSalePriceFrom'
      | 'availableSalePriceTo'
      | 'availableRentPriceFrom'
      | 'availableRentPriceTo'
    >
  >;

export type DevelopmentHomeInventoryUnitType = {
  id: string;
  name: string;
  totalUnits: number;
  availableUnits: number;
  reservedUnits: number;
  unclassifiedRemainderUnits: number;
};

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
  transactionModes: Array<'for_sale' | 'for_rent' | 'auction'>;
  unitTypes: DevelopmentHomeInventoryUnitType[];
  activeUnitTypeCount: number;
  totalUnits: number | null;
  availableUnits: number | null;
  reservedUnits: number | null;
  unclassifiedRemainderUnits: number | null;
  auctionTermsConfiguredCount: number;
  pricing:
    | { kind: 'sale' | 'rent'; from: number | null; to: number | null }
    | {
        kind: 'mixed';
        forSale: { from: number; to: number } | null;
        forRent: { from: number; to: number } | null;
      }
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

function itemizedAvailablePriceRange(
  units: PersistedInventoryUnitType[],
  mode: 'for_sale' | 'for_rent',
): { range: { from: number; to: number } | null; invalid: boolean } {
  const candidates = units.filter(unit =>
    Number(mode === 'for_sale' ? unit.availableForSaleUnits || 0 : unit.availableForRentUnits || 0) > 0,
  );
  if (candidates.length === 0) return { range: null, invalid: false };

  const rows = candidates.map(unit => {
    const from = numberOrNull(
      mode === 'for_sale' ? unit.availableSalePriceFrom : unit.availableRentPriceFrom,
    );
    const to = numberOrNull(
      mode === 'for_sale' ? unit.availableSalePriceTo : unit.availableRentPriceTo,
    ) ?? from;
    return { from, to };
  });
  if (rows.some(row => row.from === null || row.from <= 0 || row.to === null || row.to < row.from)) {
    return { range: null, invalid: true };
  }

  return {
    range: {
      from: Math.min(...rows.map(row => row.from!)),
      to: Math.max(...rows.map(row => row.to!)),
    },
    invalid: false,
  };
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
  const inventoryMode = development.inventoryMode ?? 'aggregate';
  const availableForSaleCount = active.reduce(
    (sum, unit) => sum + Number(unit.availableForSaleUnits || 0),
    0,
  );
  const availableForRentCount = active.reduce(
    (sum, unit) => sum + Number(unit.availableForRentUnits || 0),
    0,
  );
  const transactionModes: DevelopmentHomeInventory['transactionModes'] =
    inventoryMode === 'itemized'
      ? [
          ...(availableForSaleCount > 0 ? (['for_sale'] as const) : []),
          ...(availableForRentCount > 0 ? (['for_rent'] as const) : []),
        ]
      : development.transactionType === 'for_sale' || development.transactionType === 'for_rent'
        ? [development.transactionType]
        : development.transactionType === 'auction'
          ? ['auction']
          : [];
  const effectiveTransactionType =
    inventoryMode === 'itemized'
      ? transactionModes.length > 1
        ? 'mixed'
        : transactionModes[0] || development.transactionType
      : development.transactionType;
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
    if (effectiveTransactionType === 'for_sale') {
      const itemizedPrices = inventoryMode === 'itemized'
        ? itemizedAvailablePriceRange(active, 'for_sale')
        : null;
      const prices = inventoryMode === 'itemized'
        ? []
        : active.map(resolvePersistedUnitTypeSalePrice);
      if (itemizedPrices?.invalid) {
        warnings.push({
          code: 'missing_or_invalid_pricing',
          message: 'One or more available sale allocations have missing or invalid prices.',
        });
      } else if (itemizedPrices?.range) {
        pricing = { kind: 'sale', ...itemizedPrices.range };
      } else if (inventoryMode === 'itemized') {
        // No released sale stock means there is no current market price to report.
      } else if (prices.some(price => price.status === 'conflict')) {
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
    } else if (effectiveTransactionType === 'for_rent') {
      const itemizedPrices = inventoryMode === 'itemized'
        ? itemizedAvailablePriceRange(active, 'for_rent')
        : null;
      const rents = inventoryMode === 'itemized'
        ? []
        : active.map(resolvePersistedUnitTypeRentalPrice);
      if (itemizedPrices?.invalid) {
        warnings.push({
          code: 'missing_or_invalid_pricing',
          message: 'One or more available rental allocations have missing or invalid prices.',
        });
      } else if (itemizedPrices?.range) {
        pricing = { kind: 'rent', ...itemizedPrices.range };
      } else if (inventoryMode === 'itemized') {
        // No released rental stock means there is no current market price to report.
      } else if (rents.some(rent => rent.status === 'upper_bound_conflict')) {
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
    } else if (effectiveTransactionType === 'mixed') {
      const itemized = inventoryMode === 'itemized';
      const availableForSale = active.filter(unit => Number(unit.availableForSaleUnits || 0) > 0);
      const availableForRent = active.filter(unit => Number(unit.availableForRentUnits || 0) > 0);
      const itemizedSalePrices = itemized ? itemizedAvailablePriceRange(active, 'for_sale') : null;
      const itemizedRentPrices = itemized ? itemizedAvailablePriceRange(active, 'for_rent') : null;
      const salePrices = itemized ? [] : availableForSale.map(resolvePersistedUnitTypeSalePrice);
      const rentPrices = itemized ? [] : availableForRent.map(resolvePersistedUnitTypeRentalPrice);
      if (itemizedSalePrices?.invalid || itemizedRentPrices?.invalid) {
        warnings.push({
          code: 'missing_or_invalid_pricing',
          message: 'One or more available allocations have missing or invalid prices.',
        });
      }
      if (salePrices.some(price => price.status === 'conflict')) {
        warnings.push({
          code: 'sale_price_integrity_conflict',
          message: 'An available sale unit type has conflicting sale prices.',
        });
      }
      if (rentPrices.some(price => price.status === 'upper_bound_conflict')) {
        warnings.push({
          code: 'rental_price_integrity_conflict',
          message: 'An available rental unit type has an invalid monthly rent range.',
        });
      }
      const validSales = salePrices.filter(price => price.status === 'canonical' || price.status === 'compatibility');
      const validRents = rentPrices.filter(price => price.status === 'valid');
      pricing = {
        kind: 'mixed',
        forSale: itemized
          ? itemizedSalePrices?.range ?? null
          : validSales.length
          ? {
              from: Math.min(...validSales.map(price => price.from!)),
              to: Math.max(...validSales.map(price => price.to ?? price.from!)),
            }
          : null,
        forRent: itemized
          ? itemizedRentPrices?.range ?? null
          : validRents.length
          ? {
              from: Math.min(...validRents.map(price => price.from!)),
              to: Math.max(...validRents.map(price => price.to ?? price.from!)),
            }
          : null,
      };
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
    (inventoryMode !== 'itemized' || Number(quantities?.available || 0) > 0) &&
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
    transactionModes,
    unitTypes: active.map(unit => {
      const totalUnits = numberOrNull(unit.totalUnits) ?? 0;
      const availableUnits = numberOrNull(unit.availableUnits) ?? 0;
      const reservedUnits = numberOrNull(unit.reservedUnits) ?? 0;
      return {
        id: String(unit.id ?? ''),
        name: String(unit.name ?? unit.label ?? 'Unnamed unit type'),
        totalUnits,
        availableUnits,
        reservedUnits,
        unclassifiedRemainderUnits: Math.max(totalUnits - availableUnits - reservedUnits, 0),
      };
    }),
    activeUnitTypeCount: active.length,
    totalUnits: quantities?.total ?? null,
    availableUnits: quantities?.available ?? null,
    reservedUnits: quantities?.reserved ?? null,
    unclassifiedRemainderUnits: quantities
      ? quantities.total - quantities.available - quantities.reserved
      : null,
    pricing,
    auctionTermsConfiguredCount,
    warnings: prioritizeDevelopmentHomeInventoryWarnings(warnings),
  };
}
