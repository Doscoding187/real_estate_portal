import { TRPCError } from '@trpc/server';
import { developments, unitTypes } from '../../drizzle/schema';

export type SubmissionValidationError = {
  field: string;
  message: string;
};

export type PersistedSalePriceResolution = {
  status: 'canonical' | 'compatibility' | 'conflict' | 'invalid_canonical' | 'missing';
  from: number | null;
  to: number | null;
  compatibilityDerived: boolean;
};

export type PersistedRentalPriceResolution = {
  status: 'valid' | 'missing_or_invalid_from' | 'upper_bound_conflict';
  from: number | null;
  to: number | null;
};

type PersistedDevelopment = Pick<
  typeof developments.$inferSelect,
  | 'name'
  | 'address'
  | 'description'
  | 'ownershipType'
  | 'developmentType'
  | 'transactionType'
  | 'images'
  | 'highlights'
>;
type PersistedUnitType = Pick<
  typeof unitTypes.$inferSelect,
  | 'name'
  | 'label'
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
  | 'auctionStartDate'
  | 'auctionEndDate'
  | 'reservePrice'
>;

const CANONICAL_OWNERSHIP_TYPES = [
  'full-title',
  'sectional-title',
  'leasehold',
  'life-rights',
] as const;

function parseJsonMaybeTwice<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value as T;

  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
  } catch {
    return fallback;
  }
}

function parseJsonField(field: unknown): unknown[] {
  if (Array.isArray(field)) return field;
  if (!field) return [];

  if (typeof field === 'string') {
    try {
      const trimmed = field.trim();
      if (trimmed.startsWith('[')) return JSON.parse(trimmed);
      if (trimmed.includes(',')) return trimmed.split(',').map(value => value.trim());
      return [trimmed];
    } catch {
      return [];
    }
  }

  return [];
}

export function hasPositivePersistedNumber(value: unknown): boolean {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

function hasPersistedValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== '';
}

function positiveNumberOrNull(value: unknown): number | null {
  return hasPositivePersistedNumber(value) ? Number(value) : null;
}

/**
 * Canonical sale-price authority: base fields are current; price fields are
 * compatibility aliases only. A populated canonical value is never masked.
 */
export function resolvePersistedUnitTypeSalePrice(input: {
  basePriceFrom?: unknown;
  basePriceTo?: unknown;
  priceFrom?: unknown;
  priceTo?: unknown;
}): PersistedSalePriceResolution {
  const hasBaseFrom = hasPersistedValue(input.basePriceFrom);
  const hasLegacyFrom = hasPersistedValue(input.priceFrom);
  const baseFrom = positiveNumberOrNull(input.basePriceFrom);
  const legacyFrom = positiveNumberOrNull(input.priceFrom);

  if (hasBaseFrom && baseFrom === null) {
    return { status: 'invalid_canonical', from: null, to: null, compatibilityDerived: false };
  }
  if (!hasBaseFrom && !hasLegacyFrom) {
    return { status: 'missing', from: null, to: null, compatibilityDerived: false };
  }
  if (!hasBaseFrom || baseFrom === null) {
    if (legacyFrom === null) {
      return { status: 'missing', from: null, to: null, compatibilityDerived: false };
    }
    const legacyTo = hasPersistedValue(input.priceTo) ? positiveNumberOrNull(input.priceTo) : null;
    if (hasPersistedValue(input.priceTo) && (legacyTo === null || legacyTo < legacyFrom)) {
      return { status: 'invalid_canonical', from: null, to: null, compatibilityDerived: false };
    }
    return { status: 'compatibility', from: legacyFrom, to: legacyTo, compatibilityDerived: true };
  }
  if (hasLegacyFrom && (legacyFrom === null || legacyFrom !== baseFrom)) {
    return { status: 'conflict', from: null, to: null, compatibilityDerived: false };
  }

  const hasBaseTo = hasPersistedValue(input.basePriceTo);
  const hasLegacyTo = hasPersistedValue(input.priceTo);
  const baseTo = positiveNumberOrNull(input.basePriceTo);
  const legacyTo = positiveNumberOrNull(input.priceTo);
  if (hasBaseTo && (baseTo === null || baseTo < baseFrom)) {
    return { status: 'invalid_canonical', from: null, to: null, compatibilityDerived: false };
  }
  if (hasBaseTo && hasLegacyTo && (legacyTo === null || legacyTo !== baseTo)) {
    return { status: 'conflict', from: null, to: null, compatibilityDerived: false };
  }
  if (!hasBaseTo && hasLegacyTo) {
    if (legacyTo === null || legacyTo < baseFrom) {
      return { status: 'conflict', from: null, to: null, compatibilityDerived: false };
    }
    return { status: 'compatibility', from: baseFrom, to: legacyTo, compatibilityDerived: true };
  }
  return { status: 'canonical', from: baseFrom, to: baseTo, compatibilityDerived: false };
}

export function resolvePersistedUnitTypeRentalPrice(input: {
  monthlyRentFrom?: unknown;
  monthlyRentTo?: unknown;
}): PersistedRentalPriceResolution {
  const from = positiveNumberOrNull(input.monthlyRentFrom);
  if (from === null) return { status: 'missing_or_invalid_from', from: null, to: null };
  if (!hasPersistedValue(input.monthlyRentTo)) return { status: 'valid', from, to: null };
  const to = positiveNumberOrNull(input.monthlyRentTo);
  if (to === null || to < from) return { status: 'upper_bound_conflict', from: null, to: null };
  return { status: 'valid', from, to };
}

export function isNonNegativePersistedInteger(value: unknown): boolean {
  const number = Number(value);
  return Number.isFinite(number) && Number.isInteger(number) && number >= 0;
}

export function isPersistedUnitTypeActive(unit: Pick<PersistedUnitType, 'isActive'>): boolean {
  return Number(unit.isActive ?? 1) !== 0;
}

export function hasValidPersistedUnitTypeInventory(
  unit: Pick<PersistedUnitType, 'totalUnits' | 'availableUnits' | 'reservedUnits'>,
): boolean {
  const reserved = unit.reservedUnits ?? 0;
  return (
    isNonNegativePersistedInteger(unit.totalUnits) &&
    isNonNegativePersistedInteger(unit.availableUnits) &&
    isNonNegativePersistedInteger(reserved) &&
    Number(unit.availableUnits) + Number(reserved) <= Number(unit.totalUnits)
  );
}

function hasValidPersistedImage(images: unknown): boolean {
  return parseJsonField(images).some(image => {
    const url = typeof image === 'string' ? image : (image as { url?: unknown })?.url;
    return typeof url === 'string' && /^https?:\/\//i.test(url.trim());
  });
}

/**
 * The DOE-S0 persisted submission gate. This must be used both by the submit
 * mutation and read-only operating projections so their blocker sets agree.
 */
export function validatePersistedSubmissionReadiness(
  development: PersistedDevelopment,
  persistedUnitTypes: PersistedUnitType[],
): SubmissionValidationError[] {
  const errors: SubmissionValidationError[] = [];
  const name = String(development.name ?? '').trim();
  const address = String(development.address ?? '').trim();
  const description = String(development.description ?? '').trim();
  const ownershipType = String(development.ownershipType ?? '').trim();
  const developmentType = String(development.developmentType ?? '').trim();
  const transactionType = String(development.transactionType ?? '').trim();

  if (!name) errors.push({ field: 'name', message: 'Development name is required.' });
  if (!address) errors.push({ field: 'address', message: 'Development address is required.' });
  if (!['residential', 'commercial', 'mixed_use', 'land'].includes(developmentType)) {
    errors.push({
      field: 'developmentType',
      message: 'A supported development classification is required.',
    });
  }
  if (!['for_sale', 'for_rent', 'auction'].includes(transactionType)) {
    errors.push({ field: 'transactionType', message: 'A supported transaction type is required.' });
  }
  if (description.length < 50) {
    errors.push({
      field: 'description',
      message: 'Description must contain at least 50 characters.',
    });
  }
  if (!hasValidPersistedImage(development.images)) {
    errors.push({
      field: 'media',
      message: 'At least one persisted image with a URL is required.',
    });
  }
  const highlights = parseJsonMaybeTwice<unknown[]>(development.highlights, []);
  if (
    !Array.isArray(highlights) ||
    highlights.filter(value => String(value ?? '').trim()).length < 3
  ) {
    errors.push({ field: 'highlights', message: 'At least three highlights are required.' });
  }
  if (!(CANONICAL_OWNERSHIP_TYPES as readonly string[]).includes(ownershipType)) {
    errors.push({ field: 'ownershipType', message: 'A supported ownership type is required.' });
  }

  const activeUnits = persistedUnitTypes.filter(isPersistedUnitTypeActive);
  if (developmentType !== 'land' && activeUnits.length === 0) {
    errors.push({ field: 'unitTypes', message: 'At least one unit type is required.' });
  }

  for (const unit of activeUnits) {
    const label = String(unit.name ?? unit.label ?? 'Unit type').trim();
    if (!hasValidPersistedUnitTypeInventory(unit)) {
      errors.push({
        field: `unitTypes.${label}.inventory`,
        message: `${label} has invalid aggregate inventory.`,
      });
    }
    const salePrice = resolvePersistedUnitTypeSalePrice(unit);
    if (transactionType === 'for_sale' && salePrice.status === 'conflict') {
      errors.push({
        field: `unitTypes.${label}.salePriceConflict`,
        message: `${label} has conflicting canonical and legacy sale prices.`,
      });
    } else if (
      transactionType === 'for_sale' &&
      !['canonical', 'compatibility'].includes(salePrice.status)
    ) {
      errors.push({
        field: `unitTypes.${label}.priceFrom`,
        message: `${label} requires a positive sale price.`,
      });
    }
    const rentalPrice = resolvePersistedUnitTypeRentalPrice(unit);
    if (transactionType === 'for_rent' && rentalPrice.status === 'upper_bound_conflict') {
      errors.push({
        field: `unitTypes.${label}.monthlyRentTo`,
        message: `${label} has an invalid monthly rent range.`,
      });
    } else if (transactionType === 'for_rent' && rentalPrice.status !== 'valid') {
      errors.push({
        field: `unitTypes.${label}.monthlyRentFrom`,
        message: `${label} requires a positive rental price.`,
      });
    }
    if (transactionType === 'auction') {
      const start = unit.auctionStartDate ? new Date(unit.auctionStartDate) : null;
      const end = unit.auctionEndDate ? new Date(unit.auctionEndDate) : null;
      const reserve =
        unit.reservePrice == null || unit.reservePrice === '' ? null : Number(unit.reservePrice);
      if (
        !hasPositivePersistedNumber(unit.startingBid) ||
        !start ||
        !end ||
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        start.getTime() <= Date.now() ||
        end <= start ||
        (reserve !== null &&
          (!Number.isFinite(reserve) || reserve <= 0 || reserve < Number(unit.startingBid)))
      ) {
        errors.push({
          field: `unitTypes.${label}.auction`,
          message: `${label} requires valid auction terms.`,
        });
      }
    }
  }

  return errors;
}

export function submissionValidationError(errors: SubmissionValidationError[]): TRPCError {
  return new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Development is not ready for submission.',
    cause: { validationErrors: errors },
  });
}
