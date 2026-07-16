import { TRPCError } from '@trpc/server';
import { developments, unitTypes } from '../../drizzle/schema';

export type SubmissionValidationError = {
  field: string;
  message: string;
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
  | 'basePriceFrom'
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

function positiveNumber(value: unknown): boolean {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

function nonNegativeInteger(value: unknown): boolean {
  const number = Number(value);
  return Number.isFinite(number) && Number.isInteger(number) && number >= 0;
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

  const activeUnits = persistedUnitTypes.filter(unit => Number(unit.isActive ?? 1) !== 0);
  if (developmentType !== 'land' && activeUnits.length === 0) {
    errors.push({ field: 'unitTypes', message: 'At least one unit type is required.' });
  }

  for (const unit of activeUnits) {
    const label = String(unit.name ?? unit.label ?? 'Unit type').trim();
    const total = unit.totalUnits;
    const available = unit.availableUnits;
    const reserved = unit.reservedUnits ?? 0;
    if (
      !nonNegativeInteger(total) ||
      !nonNegativeInteger(available) ||
      !nonNegativeInteger(reserved) ||
      Number(available) + Number(reserved) > Number(total)
    ) {
      errors.push({
        field: `unitTypes.${label}.inventory`,
        message: `${label} has invalid aggregate inventory.`,
      });
    }
    if (transactionType === 'for_sale' && !positiveNumber(unit.priceFrom ?? unit.basePriceFrom)) {
      errors.push({
        field: `unitTypes.${label}.priceFrom`,
        message: `${label} requires a positive sale price.`,
      });
    }
    if (
      transactionType === 'for_rent' &&
      !positiveNumber(unit.monthlyRentFrom ?? unit.monthlyRentTo)
    ) {
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
        !positiveNumber(unit.startingBid) ||
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
