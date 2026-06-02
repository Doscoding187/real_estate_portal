export type DevelopmentTransactionType = 'for_sale' | 'for_rent' | 'auction';

function normalizeDevelopmentTransactionAlias(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

export function normalizeDevelopmentTransactionType(value: unknown): DevelopmentTransactionType {
  const normalized = normalizeDevelopmentTransactionAlias(value);

  if (['for_rent', 'rent', 'to_rent', 'rental', 'rent_to_buy'].includes(normalized)) {
    return 'for_rent';
  }
  if (['auction', 'auctions'].includes(normalized)) return 'auction';
  return 'for_sale';
}

export function mapDevelopmentTransactionTypeToListingType(
  transactionType: unknown,
): 'sale' | 'rent' | 'auction' {
  const normalizedTransactionType = normalizeDevelopmentTransactionType(transactionType);
  if (normalizedTransactionType === 'for_rent') return 'rent';
  if (normalizedTransactionType === 'auction') return 'auction';
  return 'sale';
}

export function mapListingTypeToDevelopmentTransactionType(
  listingType: unknown,
): DevelopmentTransactionType | undefined {
  const normalized = normalizeDevelopmentTransactionAlias(listingType);

  if (['sale', 'sell', 'for_sale'].includes(normalized)) return 'for_sale';
  if (['rent', 'rental', 'to_rent', 'for_rent', 'rent_to_buy'].includes(normalized)) {
    return 'for_rent';
  }
  if (['auction', 'auctions'].includes(normalized)) return 'auction';

  return undefined;
}

export interface DevelopmentUnitPricingInput {
  priceFrom?: unknown;
  priceTo?: unknown;
  basePriceFrom?: unknown;
  basePriceTo?: unknown;
  monthlyRent?: unknown;
  monthlyRentFrom?: unknown;
  monthlyRentTo?: unknown;
  startingBid?: unknown;
  reservePrice?: unknown;
}

export interface DevelopmentUnitPriceRange {
  priceFrom: number;
  priceTo?: number;
}

export interface DevelopmentUnitDisplayInput extends DevelopmentUnitPricingInput {
  displayOrder?: unknown;
  name?: unknown;
  label?: unknown;
  id?: unknown;
}

export interface DevelopmentInventoryInput {
  totalUnits?: unknown;
  availableUnits?: unknown;
  reservedUnits?: unknown;
}

export interface DevelopmentInventorySummary {
  total: number;
  available: number;
  reserved: number;
  sold: number;
  soldPct: number | null;
  isSoldOut: boolean;
}

export interface DevelopmentTransactionAggregates {
  priceFrom: number | null;
  priceTo: number | null;
  monthlyRentFrom: number | null;
  monthlyRentTo: number | null;
  auctionStartDate: string | null;
  auctionEndDate: string | null;
  startingBidFrom: number | null;
  reservePriceFrom: number | null;
}

function toFiniteNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function toPositiveNumber(value: unknown): number | undefined {
  const numeric = toFiniteNumber(value);
  return numeric !== undefined && numeric > 0 ? numeric : undefined;
}

function toNullableNumber(value: unknown): number | null {
  const numeric = toFiniteNumber(value);
  return numeric !== undefined ? numeric : null;
}

function toOptionalPositiveNumber(value: unknown): number | undefined {
  return toPositiveNumber(value);
}

function toDateStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 19).replace('T', ' ');
  }
  if (typeof value === 'string') {
    const text = value.trim();
    return text.length > 0 ? text : null;
  }
  return null;
}

function normalizeRange(fromValue: unknown, toValue: unknown) {
  const from = toOptionalPositiveNumber(fromValue);
  const to = toOptionalPositiveNumber(toValue);

  return {
    from,
    to: from && to && to >= from ? to : undefined,
  };
}

export function calculatePriceFrom(
  unit: DevelopmentUnitPricingInput,
  transactionType: DevelopmentTransactionType,
): DevelopmentUnitPriceRange {
  if (transactionType === 'for_rent') {
    const priceFrom = toPositiveNumber(unit.monthlyRentFrom ?? unit.monthlyRent) ?? 0;
    const priceTo = toPositiveNumber(unit.monthlyRentTo);
    return {
      priceFrom,
      priceTo: priceFrom > 0 && priceTo !== undefined && priceTo >= priceFrom ? priceTo : undefined,
    };
  }

  if (transactionType === 'auction') {
    const priceFrom = toPositiveNumber(unit.startingBid) ?? 0;
    const priceTo = toPositiveNumber(unit.reservePrice);
    return {
      priceFrom,
      priceTo: priceFrom > 0 && priceTo !== undefined && priceTo >= priceFrom ? priceTo : undefined,
    };
  }

  const priceFrom = toPositiveNumber(unit.priceFrom ?? unit.basePriceFrom) ?? 0;
  const priceTo = toPositiveNumber(unit.priceTo ?? unit.basePriceTo);
  return {
    priceFrom,
    priceTo: priceFrom > 0 && priceTo !== undefined && priceTo >= priceFrom ? priceTo : undefined,
  };
}

export function stripUnitPricingForTransaction<T extends Record<string, any>>(
  unit: T,
  transactionType: DevelopmentTransactionType | undefined,
  options: { normalizeRanges?: boolean } = {},
): T {
  const normalizedUnit: Record<string, any> = { ...unit };
  const normalizedTransactionType = normalizeDevelopmentTransactionType(transactionType);
  const shouldNormalizeRanges = options.normalizeRanges ?? true;

  if (normalizedTransactionType !== 'for_sale') {
    delete normalizedUnit.priceFrom;
    delete normalizedUnit.priceTo;
    delete normalizedUnit.basePriceFrom;
    delete normalizedUnit.basePriceTo;
    delete normalizedUnit.extras;
  }
  if (normalizedTransactionType !== 'for_rent') {
    delete normalizedUnit.monthlyRentFrom;
    delete normalizedUnit.monthlyRentTo;
    delete normalizedUnit.monthlyRent;
    delete normalizedUnit.leaseTerm;
    delete normalizedUnit.isFurnished;
    delete normalizedUnit.depositRequired;
  }
  if (normalizedTransactionType !== 'auction') {
    delete normalizedUnit.startingBid;
    delete normalizedUnit.reservePrice;
    delete normalizedUnit.auctionStartDate;
    delete normalizedUnit.auctionEndDate;
    delete normalizedUnit.auctionStatus;
  }

  if (shouldNormalizeRanges && normalizedTransactionType === 'for_sale') {
    const priceFrom = toOptionalPositiveNumber(
      normalizedUnit.basePriceFrom ?? normalizedUnit.priceFrom,
    );
    const priceTo = toOptionalPositiveNumber(normalizedUnit.basePriceTo ?? normalizedUnit.priceTo);
    if (priceFrom && priceTo && priceTo < priceFrom) {
      if (normalizedUnit.priceTo != null) normalizedUnit.priceTo = priceFrom;
      if (normalizedUnit.basePriceTo != null) normalizedUnit.basePriceTo = priceFrom;
    }
  }

  if (shouldNormalizeRanges && normalizedTransactionType === 'for_rent') {
    const rentFrom = toOptionalPositiveNumber(
      normalizedUnit.monthlyRentFrom ?? normalizedUnit.monthlyRent,
    );
    const rentTo = toOptionalPositiveNumber(normalizedUnit.monthlyRentTo);
    if (rentFrom && rentTo && rentTo < rentFrom) {
      normalizedUnit.monthlyRentTo = rentFrom;
    }
  }

  if (shouldNormalizeRanges && normalizedTransactionType === 'auction') {
    const startingBid = toOptionalPositiveNumber(normalizedUnit.startingBid);
    const reservePrice = toOptionalPositiveNumber(normalizedUnit.reservePrice);
    if (startingBid && reservePrice && reservePrice < startingBid) {
      normalizedUnit.reservePrice = startingBid;
    }
  }

  return normalizedUnit as T;
}

export function buildDevelopmentFinancialPayload(input: {
  transactionType: unknown;
  priceFrom?: number;
  priceTo?: number;
  monthlyRentFrom?: number;
  monthlyRentTo?: number;
  auctionStartDate?: string;
  auctionEndDate?: string;
  startingBidFrom?: number;
  reservePriceFrom?: number;
}) {
  const transactionType = normalizeDevelopmentTransactionType(input.transactionType);
  const saleRange = normalizeRange(input.priceFrom, input.priceTo);
  const rentRange = normalizeRange(input.monthlyRentFrom, input.monthlyRentTo);
  const auctionRange = normalizeRange(input.startingBidFrom, input.reservePriceFrom);

  return {
    priceFrom: transactionType === 'for_sale' ? saleRange.from : undefined,
    priceTo: transactionType === 'for_sale' ? saleRange.to : undefined,
    monthlyRentFrom: transactionType === 'for_rent' ? rentRange.from : undefined,
    monthlyRentTo: transactionType === 'for_rent' ? rentRange.to : undefined,
    auctionStartDate: transactionType === 'auction' ? input.auctionStartDate : undefined,
    auctionEndDate: transactionType === 'auction' ? input.auctionEndDate : undefined,
    startingBidFrom: transactionType === 'auction' ? auctionRange.from : undefined,
    reservePriceFrom: transactionType === 'auction' ? auctionRange.to : undefined,
  };
}

function getSaleAggregateRange(unitTypes?: DevelopmentUnitPricingInput[] | null) {
  if (!Array.isArray(unitTypes) || unitTypes.length === 0) return { from: null, to: null };

  let minFrom: number | null = null;
  let maxTo: number | null = null;

  for (const unit of unitTypes) {
    const from = toNullableNumber(unit.priceFrom ?? unit.basePriceFrom);
    const to = toNullableNumber(unit.priceTo ?? unit.basePriceTo);
    if (from !== null) minFrom = minFrom === null ? from : Math.min(minFrom, from);
    if (to !== null) maxTo = maxTo === null ? to : Math.max(maxTo, to);
  }

  return { from: minFrom, to: maxTo };
}

function getRentAggregateRange(unitTypes?: DevelopmentUnitPricingInput[] | null) {
  if (!Array.isArray(unitTypes) || unitTypes.length === 0) return { from: null, to: null };

  let minFrom: number | null = null;
  let maxTo: number | null = null;

  for (const unit of unitTypes) {
    const from = toNullableNumber(unit.monthlyRentFrom ?? unit.monthlyRent);
    const to = toNullableNumber(unit.monthlyRentTo);
    if (from !== null) minFrom = minFrom === null ? from : Math.min(minFrom, from);
    if (to !== null) maxTo = maxTo === null ? to : Math.max(maxTo, to);
  }

  return { from: minFrom, to: maxTo };
}

function getAuctionAggregateRange(unitTypes?: DevelopmentUnitPricingInput[] | null) {
  if (!Array.isArray(unitTypes) || unitTypes.length === 0) {
    return {
      auctionStartDate: null,
      auctionEndDate: null,
      startingBidFrom: null,
      reservePriceFrom: null,
    };
  }

  let earliestStart: string | null = null;
  let latestEnd: string | null = null;
  let minStartingBid: number | null = null;
  let minReservePrice: number | null = null;

  for (const unit of unitTypes) {
    const startingBid = toNullableNumber(unit.startingBid);
    const reservePrice = toNullableNumber(unit.reservePrice);
    const startDate = toDateStringOrNull((unit as any).auctionStartDate);
    const endDate = toDateStringOrNull((unit as any).auctionEndDate);

    if (startingBid !== null) {
      minStartingBid =
        minStartingBid === null ? startingBid : Math.min(minStartingBid, startingBid);
    }
    if (reservePrice !== null) {
      minReservePrice =
        minReservePrice === null ? reservePrice : Math.min(minReservePrice, reservePrice);
    }
    if (startDate && (!earliestStart || startDate < earliestStart)) earliestStart = startDate;
    if (endDate && (!latestEnd || endDate > latestEnd)) latestEnd = endDate;
  }

  return {
    auctionStartDate: earliestStart,
    auctionEndDate: latestEnd,
    startingBidFrom: minStartingBid,
    reservePriceFrom: minReservePrice,
  };
}

export function buildDevelopmentTransactionAggregates(
  transactionType: unknown,
  developmentData: Record<string, unknown> = {},
  unitTypesData?: DevelopmentUnitPricingInput[] | null,
): DevelopmentTransactionAggregates {
  const normalizedTransactionType = normalizeDevelopmentTransactionType(transactionType);
  const saleRange =
    normalizedTransactionType === 'for_sale' ? getSaleAggregateRange(unitTypesData) : null;
  const rentRange =
    normalizedTransactionType === 'for_rent' ? getRentAggregateRange(unitTypesData) : null;
  const auctionRange =
    normalizedTransactionType === 'auction' ? getAuctionAggregateRange(unitTypesData) : null;

  return {
    priceFrom:
      normalizedTransactionType === 'for_sale'
        ? (saleRange?.from ?? toNullableNumber(developmentData.priceFrom))
        : null,
    priceTo:
      normalizedTransactionType === 'for_sale'
        ? (saleRange?.to ?? toNullableNumber(developmentData.priceTo))
        : null,
    monthlyRentFrom:
      normalizedTransactionType === 'for_rent'
        ? (rentRange?.from ?? toNullableNumber(developmentData.monthlyRentFrom))
        : null,
    monthlyRentTo:
      normalizedTransactionType === 'for_rent'
        ? (rentRange?.to ?? toNullableNumber(developmentData.monthlyRentTo))
        : null,
    auctionStartDate:
      normalizedTransactionType === 'auction'
        ? (auctionRange?.auctionStartDate ?? toDateStringOrNull(developmentData.auctionStartDate))
        : null,
    auctionEndDate:
      normalizedTransactionType === 'auction'
        ? (auctionRange?.auctionEndDate ?? toDateStringOrNull(developmentData.auctionEndDate))
        : null,
    startingBidFrom:
      normalizedTransactionType === 'auction'
        ? (auctionRange?.startingBidFrom ?? toNullableNumber(developmentData.startingBidFrom))
        : null,
    reservePriceFrom:
      normalizedTransactionType === 'auction'
        ? (auctionRange?.reservePriceFrom ?? toNullableNumber(developmentData.reservePriceFrom))
        : null,
  };
}

function toDisplayOrder(value: unknown): number {
  const numeric = toFiniteNumber(value);
  return numeric !== undefined && numeric >= 0 ? numeric : Number.MAX_SAFE_INTEGER;
}

function toSortPrice(
  unit: DevelopmentUnitPricingInput,
  transactionType: DevelopmentTransactionType,
): number {
  const price = calculatePriceFrom(unit, transactionType).priceFrom;
  return price > 0 ? price : Number.MAX_SAFE_INTEGER;
}

function toSortLabel(unit: DevelopmentUnitDisplayInput): string {
  return String(unit.label ?? unit.name ?? unit.id ?? '')
    .trim()
    .toLowerCase();
}

export function compareDevelopmentUnitsForPublicDisplay(
  left: DevelopmentUnitDisplayInput,
  right: DevelopmentUnitDisplayInput,
  transactionType: DevelopmentTransactionType,
): number {
  const displayOrderDiff = toDisplayOrder(left.displayOrder) - toDisplayOrder(right.displayOrder);
  if (displayOrderDiff !== 0) return displayOrderDiff;

  const priceDiff = toSortPrice(left, transactionType) - toSortPrice(right, transactionType);
  if (priceDiff !== 0) return priceDiff;

  return toSortLabel(left).localeCompare(toSortLabel(right));
}

export function calculateInventorySummary(
  input: DevelopmentInventoryInput,
): DevelopmentInventorySummary {
  const total = Math.max(0, Math.trunc(toFiniteNumber(input.totalUnits) ?? 0));
  const reserved = Math.min(
    Math.max(0, Math.trunc(toFiniteNumber(input.reservedUnits) ?? 0)),
    total,
  );
  const availableCapacity = Math.max(total - reserved, 0);
  const available = Math.min(
    Math.max(0, Math.trunc(toFiniteNumber(input.availableUnits) ?? 0)),
    total > 0 ? availableCapacity : Number.MAX_SAFE_INTEGER,
  );
  const sold = total > 0 ? Math.max(total - available - reserved, 0) : 0;
  const soldPct = total > 0 ? Math.round((sold / total) * 100) : null;

  return {
    total,
    available,
    reserved,
    sold,
    soldPct,
    isSoldOut: total > 0 && available <= 0,
  };
}
