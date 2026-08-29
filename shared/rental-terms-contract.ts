/**
 * Canonical tenant-facing rental terms.
 *
 * Monetary rental facts remain in `pricingContract`; these terms answer the
 * separate questions a prospective tenant needs to make a practical decision.
 * They deliberately live in the versioned listing details contract rather
 * than in ambiguous legacy columns such as `utilitiesIncluded`.
 */

export const RENTAL_TERMS_VERSION = 1 as const;

export type RentalAvailability =
  | { status: 'available_now' }
  | { status: 'available_from'; date: string }
  | { status: 'to_confirm' };

export type RentalLease =
  | { status: 'fixed_term'; minimumMonths: number }
  | { status: 'month_to_month' }
  | { status: 'to_confirm' };

export type RentalUtilities =
  | 'included'
  | 'not_included'
  | 'partially_included'
  | 'to_confirm';

export type RentalFurnishing =
  | 'furnished'
  | 'partly_furnished'
  | 'unfurnished'
  | 'to_confirm';

export interface RentalTerms {
  version: typeof RENTAL_TERMS_VERSION;
  availability: RentalAvailability;
  lease: RentalLease;
  utilities: RentalUtilities;
  furnishing: RentalFurnishing;
}

export interface RentalTermsValidationIssue {
  field: string;
  message: string;
}

const AVAILABILITY_STATUSES = ['available_now', 'available_from', 'to_confirm'] as const;
const LEASE_STATUSES = ['fixed_term', 'month_to_month', 'to_confirm'] as const;
const UTILITIES = ['included', 'not_included', 'partially_included', 'to_confirm'] as const;
const FURNISHING = ['furnished', 'partly_furnished', 'unfurnished', 'to_confirm'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const includes = <T extends readonly string[]>(values: T, value: unknown): value is T[number] =>
  typeof value === 'string' && values.includes(value as T[number]);

/** A date-only value avoids timezone changes becoming public availability claims. */
export function isRentalTermsDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

/** Returns a fresh value so browser state never shares mutable defaults. */
export function createDefaultRentalTerms(): RentalTerms {
  return {
    version: RENTAL_TERMS_VERSION,
    availability: { status: 'to_confirm' },
    lease: { status: 'to_confirm' },
    utilities: 'to_confirm',
    furnishing: 'to_confirm',
  };
}

/**
 * Normalization intentionally has no legacy fallback. A nullable/false legacy
 * utility flag cannot distinguish "not included" from "not supplied", so it
 * must never become a tenant-facing assertion.
 */
export function normalizeRentalTerms(value: unknown): RentalTerms | undefined {
  if (!isRecord(value) || value.version !== RENTAL_TERMS_VERSION) return undefined;

  const availabilityRaw = value.availability;
  const leaseRaw = value.lease;
  if (!isRecord(availabilityRaw) || !isRecord(leaseRaw)) return undefined;

  const availabilityStatus = availabilityRaw.status;
  if (!includes(AVAILABILITY_STATUSES, availabilityStatus)) return undefined;
  let availability: RentalAvailability;
  if (availabilityStatus === 'available_from') {
    if (!isRentalTermsDate(availabilityRaw.date)) return undefined;
    availability = { status: 'available_from', date: availabilityRaw.date };
  } else {
    availability = { status: availabilityStatus };
  }

  const leaseStatus = leaseRaw.status;
  if (!includes(LEASE_STATUSES, leaseStatus)) return undefined;
  let lease: RentalLease;
  if (leaseStatus === 'fixed_term') {
    const minimumMonths = leaseRaw.minimumMonths;
    if (
      typeof minimumMonths !== 'number' ||
      !Number.isInteger(minimumMonths) ||
      minimumMonths < 1 ||
      minimumMonths > 120
    ) {
      return undefined;
    }
    lease = { status: 'fixed_term', minimumMonths };
  } else {
    lease = { status: leaseStatus };
  }

  if (!includes(UTILITIES, value.utilities) || !includes(FURNISHING, value.furnishing)) {
    return undefined;
  }

  return {
    version: RENTAL_TERMS_VERSION,
    availability,
    lease,
    utilities: value.utilities,
    furnishing: value.furnishing,
  };
}

export function validateRentalTerms(
  value: unknown,
  options: { mode?: 'draft' | 'publish' } = {},
): RentalTermsValidationIssue[] {
  const mode = options.mode || 'draft';
  if (value === undefined || value === null) {
    return mode === 'publish'
      ? [
          {
            field: 'rentalTerms',
            message:
              'Set availability, lease, utilities and furnishing before publishing a rental listing',
          },
        ]
      : [];
  }

  if (normalizeRentalTerms(value)) return [];

  return [
    {
      field: 'rentalTerms',
      message:
        'Rental terms must use the current availability, lease, utilities and furnishing contract',
    },
  ];
}
