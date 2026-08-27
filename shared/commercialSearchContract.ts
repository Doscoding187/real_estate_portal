/**
 * Canonical public search contract for the Commercial Office leasing journey.
 *
 * Commercial is not a residential property-type filter. These fields describe
 * the decisions a business can make about a leasable office space while
 * preserving the Cost Passport and availability truth owned by the server.
 */

export const COMMERCIAL_SEARCH_QUERY_KEYS = [
  'minAreaM2',
  'maxAreaM2',
  'maxMonthlyBudget',
  'availability',
  'fitOutCondition',
  'backupPower',
  'backupWater',
  'fibreConnectivity',
  'minParkingBays',
] as const;

export type CommercialAvailabilityFilter = 'now' | 'future';

export interface CommercialSearchFilters {
  minAreaM2?: number;
  maxAreaM2?: number;
  /** Major ZAR units in the public URL; the server converts to minor units. */
  maxMonthlyBudget?: number;
  availability?: CommercialAvailabilityFilter;
  /** Supplier-supplied text until a governed fit-out vocabulary exists. */
  fitOutCondition?: string;
  backupPower?: true;
  backupWater?: true;
  fibreConnectivity?: true;
  minParkingBays?: number;
}

type CommercialSearchFilterInput = Partial<CommercialSearchFilters> | Record<string, unknown>;

export const COMMERCIAL_AVAILABILITY_OPTIONS = [
  { value: 'now', label: 'Available now' },
  { value: 'future', label: 'Available soon' },
] as const satisfies readonly { value: CommercialAvailabilityFilter; label: string }[];

/**
 * The homepage composer uses minimum area because it is the clearest first
 * question for a business: how much space must the team fit into?
 */
export const COMMERCIAL_SPACE_SIZE_OPTIONS = [
  { value: '100', label: '100 m² or more' },
  { value: '250', label: '250 m² or more' },
  { value: '500', label: '500 m² or more' },
  { value: '1000', label: '1 000 m² or more' },
] as const;

export const COMMERCIAL_BUDGET_OPTIONS = [
  { value: '25000', label: 'Up to R25k / month' },
  { value: '50000', label: 'Up to R50k / month' },
  { value: '100000', label: 'Up to R100k / month' },
  { value: '250000', label: 'Up to R250k / month' },
  { value: '500000', label: 'Up to R500k / month' },
] as const;

export const COMMERCIAL_PARKING_OPTIONS = [
  { value: '1', label: '1+ bay' },
  { value: '2', label: '2+ bays' },
  { value: '4', label: '4+ bays' },
  { value: '8', label: '8+ bays' },
  { value: '12', label: '12+ bays' },
] as const;

function parseFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parsePositiveNumber(value: unknown): number | undefined {
  const parsed = parseFiniteNumber(value);
  return parsed !== undefined && parsed > 0 ? parsed : undefined;
}

function parseNonNegativeNumber(value: unknown): number | undefined {
  const parsed = parseFiniteNumber(value);
  return parsed !== undefined && parsed >= 0 ? parsed : undefined;
}

function parseBooleanFlag(value: unknown): true | undefined {
  return value === true || value === '1' ? true : undefined;
}

function addCoherentRange(
  target: CommercialSearchFilters,
  minAreaM2: number | undefined,
  maxAreaM2: number | undefined,
) {
  if (minAreaM2 !== undefined && maxAreaM2 !== undefined && minAreaM2 > maxAreaM2) return;
  if (minAreaM2 !== undefined) target.minAreaM2 = minAreaM2;
  if (maxAreaM2 !== undefined) target.maxAreaM2 = maxAreaM2;
}

/** Sanitizes arbitrary URL or handoff state into the supported Commercial contract. */
export function sanitizeCommercialSearchFilters(
  filters: CommercialSearchFilterInput,
): CommercialSearchFilters {
  const sanitized: CommercialSearchFilters = {};
  addCoherentRange(
    sanitized,
    parsePositiveNumber(filters.minAreaM2),
    parsePositiveNumber(filters.maxAreaM2),
  );

  const maxMonthlyBudget = parseNonNegativeNumber(filters.maxMonthlyBudget);
  if (maxMonthlyBudget !== undefined) sanitized.maxMonthlyBudget = maxMonthlyBudget;

  if (filters.availability === 'now' || filters.availability === 'future') {
    sanitized.availability = filters.availability;
  }

  if (typeof filters.fitOutCondition === 'string') {
    const fitOutCondition = filters.fitOutCondition.trim().slice(0, 100);
    if (fitOutCondition) sanitized.fitOutCondition = fitOutCondition;
  }

  if (parseBooleanFlag(filters.backupPower)) sanitized.backupPower = true;
  if (parseBooleanFlag(filters.backupWater)) sanitized.backupWater = true;
  if (parseBooleanFlag(filters.fibreConnectivity)) sanitized.fibreConnectivity = true;

  const minParkingBays = parseNonNegativeNumber(filters.minParkingBays);
  if (minParkingBays !== undefined) sanitized.minParkingBays = minParkingBays;

  return sanitized;
}

/** Parses only the supported Commercial query keys. */
export function parseCommercialSearchParams(
  searchParams: URLSearchParams,
): CommercialSearchFilters {
  const raw: Record<string, unknown> = {};
  COMMERCIAL_SEARCH_QUERY_KEYS.forEach(key => {
    const value = searchParams.get(key);
    if (value !== null) raw[key] = value;
  });
  return sanitizeCommercialSearchFilters(raw);
}

/** Serializes the sanitized Commercial fields without default or invalid noise. */
export function serializeCommercialSearchParams(
  filters: CommercialSearchFilterInput,
): URLSearchParams {
  const sanitized = sanitizeCommercialSearchFilters(filters);
  const params = new URLSearchParams();
  Object.entries(sanitized).forEach(([key, value]) => {
    if (value === true) params.set(key, '1');
    else if (value !== undefined) params.set(key, String(value));
  });
  return params;
}
