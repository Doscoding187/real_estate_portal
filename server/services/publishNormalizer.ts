/**
 * Publish Normalization Layer
 *
 * Single source of truth for converting wizard state to DB-safe payload.
 * Prevents "wizard + DB desync" by normalizing data before validation.
 *
 * Rules:
 * 1. Empty string → null
 * 2. Trim all strings
 * 3. Coerce numbers
 * 4. Map UI enums to DB enums
 * 5. Apply server-approved defaults only
 * 6. Drop UI-only fields
 */

import { z } from 'zod';

// ============================================================================
// TYPES
// ============================================================================

export interface WizardData {
  // Identity
  name: string;
  tagline?: string;
  subtitle?: string;
  marketingName?: string;
  developmentType: string;
  transactionType?: string;
  status?: string;
  constructionPhase?: string;
  description?: string;

  // Location
  city: string;
  province: string;
  suburb?: string;
  address?: string;
  postalCode?: string;
  latitude?: string | number;
  longitude?: string | number;

  // Classification
  nature?: string;
  ownershipType?: string | string[];
  structuralType?: string;
  floors?: string;
  propertyTypes?: string[];
  customClassification?: string;

  // Pricing
  priceFrom?: string | number;
  priceTo?: string | number;
  monthlyRentFrom?: string | number;
  monthlyRentTo?: string | number;
  monthlyLevyFrom?: string | number;
  monthlyLevyTo?: string | number;
  ratesFrom?: string | number;
  ratesTo?: string | number;
  transferCostsIncluded?: boolean | number;

  // Units
  totalUnits?: string | number;
  availableUnits?: string | number;
  totalDevelopmentArea?: string | number;

  // Media & Content
  images?: any;
  videos?: any;
  floorPlans?: any;
  brochures?: any;
  amenities?: string[] | string;
  highlights?: string[] | string;
  features?: string[] | string;
  estateSpecs?: any;

  // Dates
  completionDate?: string | Date;

  // Flags
  showHouseAddress?: boolean | number;
  isFeatured?: boolean | number;
  isPublished?: boolean | number;

  // Unit Types
  unitTypes?: any[];

  // Brand
  developerBrandProfileId?: number;
  marketingBrandProfileId?: number;
  marketingRole?: string;

  // Location FK
  locationId?: number;

  // UI-only fields (will be dropped)
  _meta?: any;
  _ui?: any;
  tempId?: string;
  [key: string]: any;
}

export interface NormalizedDevelopmentPayload {
  name: string;
  slug?: string;
  city: string;
  province: string;
  developmentType: 'residential' | 'commercial' | 'mixed_use' | 'land';
  transactionType: 'for_sale' | 'for_rent' | 'auction';
  status: 'launching-soon' | 'selling' | 'sold-out';
  devOwnerType: 'platform' | 'developer';

  // Optional fields (can be null)
  tagline?: string | null;
  subtitle?: string | null;
  marketingName?: string | null;
  description?: string | null;
  suburb?: string | null;
  address?: string | null;
  postalCode?: string | null;
  latitude?: string | null;
  longitude?: string | null;

  constructionPhase?: 'planning' | 'under_construction' | 'completed' | 'phase_completed' | null;
  nature?: 'new' | 'phase' | 'extension' | 'redevelopment' | null;
  ownershipType?: 'full-title' | 'sectional-title' | 'leasehold' | 'life-rights' | null;
  structuralType?:
    | 'apartment'
    | 'freestanding-house'
    | 'simplex'
    | 'duplex'
    | 'penthouse'
    | 'plot-and-plan'
    | 'townhouse'
    | 'studio'
    | null;
  floors?: 'single-storey' | 'double-storey' | 'triplex' | null;

  propertyTypes?: string[] | null;
  customClassification?: string | null;

  priceFrom?: number | null;
  priceTo?: number | null;
  monthlyRentFrom?: number | null;
  monthlyRentTo?: number | null;
  auctionStartDate?: string | null;
  auctionEndDate?: string | null;
  startingBidFrom?: number | null;
  reservePriceFrom?: number | null;
  monthlyLevyFrom?: number | null;
  monthlyLevyTo?: number | null;
  ratesFrom?: number | null;
  ratesTo?: number | null;
  transferCostsIncluded?: number | null;

  totalUnits?: number | null;
  availableUnits?: number | null;
  totalDevelopmentArea?: number | null;

  images?: string | null;
  videos?: string | null;
  floorPlans?: string | null;
  brochures?: string | null;
  amenities?: string[] | null;
  highlights?: string[] | null;
  features?: string[] | null;
  estateSpecs?: any | null;

  completionDate?: string | null;

  showHouseAddress: 0 | 1;
  isFeatured: 0 | 1;
  isPublished: 0 | 1;
  readinessScore: number;
  approvalStatus: 'draft' | 'pending' | 'approved' | 'rejected';

  developerBrandProfileId?: number | null;
  marketingBrandProfileId?: number | null;
  marketingRole?: 'exclusive' | 'joint' | 'open' | null;
  locationId?: number | null;
}

// ============================================================================
// NORMALIZATION UTILITIES
// ============================================================================

/**
 * Converts empty string to null, trims non-empty strings
 */
function emptyToNull(value: any): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  return String(value).trim() || null;
}

/**
 * Coerces value to integer, returns null if invalid
 */
function coerceInt(value: any): number | null {
  if (value === undefined || value === null || value === '') return null;
  const num = typeof value === 'number' ? value : parseInt(String(value), 10);
  return isNaN(num) ? null : num;
}

/**
 * Coerces value to decimal, returns null if invalid
 */
function coerceDecimal(value: any): number | null {
  if (value === undefined || value === null || value === '') return null;
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(num) ? null : num;
}

/**
 * Converts boolean to MySQL int (0 or 1)
 */
function boolToInt(value: any): 0 | 1 {
  if (value === true || value === 'true' || value === 1 || value === '1') return 1;
  return 0;
}

/**
 * Validates and maps enum value, returns null if invalid
 */
function mapEnum<T extends string>(
  value: any,
  allowedValues: readonly T[],
  defaultValue: T | null = null,
): T | null {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = String(value).toLowerCase().trim();
  const match = allowedValues.find(v => v.toLowerCase() === normalized);
  return match || defaultValue;
}

/**
 * Normalizes array fields (handles string, JSON string, or array)
 */
function normalizeArray(value: any): string[] | null {
  if (!value) return null;
  if (Array.isArray(value)) return value.filter(Boolean);

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // Try JSON parse
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : null;
      } catch {
        return null;
      }
    }

    // Comma-separated
    if (trimmed.includes(',')) {
      return trimmed
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    }

    return [trimmed];
  }

  return null;
}

/**
 * Normalizes media fields (preserves structured objects)
 */
function normalizeMedia(value: any): string | null {
  if (!value) return null;
  if (Array.isArray(value) && value.length === 0) return null;

  // Already a string (JSON)
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' || trimmed === '[]' ? null : trimmed;
  }

  // Convert array/object to JSON string
  try {
    const json = JSON.stringify(value);
    return json === '[]' || json === '{}' ? null : json;
  } catch {
    return null;
  }
}

function computeAuctionRangeFromUnits(unitTypes?: any[]): {
  auctionStartDate: string | null;
  auctionEndDate: string | null;
  startingBidFrom: number | null;
  reservePriceFrom: number | null;
} {
  if (!Array.isArray(unitTypes) || unitTypes.length === 0) {
    return {
      auctionStartDate: null,
      auctionEndDate: null,
      startingBidFrom: null,
      reservePriceFrom: null,
    };
  }

  const normalizeDateTimeString = (value: unknown): string | null => {
    if (value === undefined || value === null || value === '') return null;
    if (value instanceof Date) {
      return value.toISOString().slice(0, 19).replace('T', ' ');
    }
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.includes('T')) return trimmed.replace('T', ' ').slice(0, 19);
    if (trimmed.includes(' ')) return trimmed.slice(0, 19);
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 19).replace('T', ' ');
  };

  const parseDateTime = (value: unknown) => {
    const normalized = normalizeDateTimeString(value);
    if (!normalized) return null;
    const parsed = new Date(normalized.replace(' ', 'T'));
    if (Number.isNaN(parsed.getTime())) return null;
    return { normalized, ts: parsed.getTime() };
  };

  const startDates = unitTypes
    .map(unit => parseDateTime(unit?.auctionStartDate))
    .filter(Boolean) as Array<{ normalized: string; ts: number }>;
  const endDates = unitTypes
    .map(unit => parseDateTime(unit?.auctionEndDate))
    .filter(Boolean) as Array<{ normalized: string; ts: number }>;

  const startingBids = unitTypes
    .map(unit => Number(unit?.startingBid ?? 0))
    .filter(n => Number.isFinite(n) && n > 0);
  const reservePrices = unitTypes
    .map(unit => Number(unit?.reservePrice ?? 0))
    .filter(n => Number.isFinite(n) && n > 0);

  const earliestStart = startDates.sort((a, b) => a.ts - b.ts)[0]?.normalized ?? null;
  const latestEnd = endDates.sort((a, b) => b.ts - a.ts)[0]?.normalized ?? null;

  return {
    auctionStartDate: earliestStart,
    auctionEndDate: latestEnd,
    startingBidFrom: startingBids.length ? Math.min(...startingBids) : null,
    reservePriceFrom: reservePrices.length ? Math.min(...reservePrices) : null,
  };
}

/**
 * Maps UI status to DB status enum
 */
function mapStatusEnum(value: any): 'launching-soon' | 'selling' | 'sold-out' {
  const normalized = String(value || '')
    .toLowerCase()
    .trim();

  // Map legacy values
  const mapping: Record<string, 'launching-soon' | 'selling' | 'sold-out'> = {
    'now-selling': 'selling',
    'launching-soon': 'launching-soon',
    'sold-out': 'sold-out',
    selling: 'selling',
    coming_soon: 'launching-soon',
    pre_launch: 'launching-soon',
  };

  return mapping[normalized] || 'launching-soon';
}

/**
 * Handles ownershipType which can be string or array in wizard
 */
function normalizeOwnershipType(
  value: any,
): 'full-title' | 'sectional-title' | 'leasehold' | 'life-rights' | null {
  if (!value) return null;

  // If array, take first value
  if (Array.isArray(value)) {
    value = value[0];
  }

  return mapEnum(value, ['full-title', 'sectional-title', 'leasehold', 'life-rights'] as const);
}

// ============================================================================
// MAIN NORMALIZATION FUNCTION
// ============================================================================

/**
 * Normalizes wizard data to DB-safe payload
 *
 * @throws {Error} If required fields are missing or invalid
 */
export function normalizeForPublish(
  wizardData: WizardData,
  ownerType: 'platform' | 'developer' = 'developer',
): NormalizedDevelopmentPayload {
  // Validate required fields
  if (!wizardData.name?.trim()) {
    throw new Error('Development name is required');
  }
  if (!wizardData.city?.trim()) {
    throw new Error('City is required');
  }
  if (!wizardData.province?.trim()) {
    throw new Error('Province is required');
  }

  // Validate and map developmentType
  const devType = mapEnum(wizardData.developmentType, [
    'residential',
    'commercial',
    'mixed_use',
    'land',
  ]);
  if (!devType) {
    throw new Error(
      `Invalid developmentType: ${wizardData.developmentType}. Must be one of: residential, commercial, mixed_use, land`,
    );
  }

  const transactionType = mapEnum(
    wizardData.transactionType,
    ['for_sale', 'for_rent', 'auction'] as const,
    'for_sale',
  )!;
  const auctionRange =
    transactionType === 'auction' ? computeAuctionRangeFromUnits(wizardData.unitTypes) : null;

  return {
    // Required fields
    name: wizardData.name.trim(),
    city: wizardData.city.trim(),
    province: wizardData.province.trim(),
    developmentType: devType,
    transactionType,
    status: mapStatusEnum(wizardData.status),
    devOwnerType: ownerType,

    // Defaults for NOT NULL columns
    showHouseAddress: boolToInt(wizardData.showHouseAddress ?? true),
    isFeatured: boolToInt(wizardData.isFeatured ?? false),
    isPublished: boolToInt(wizardData.isPublished ?? false),
    readinessScore: 0,
    approvalStatus: 'draft',

    // Optional text fields
    tagline: emptyToNull(wizardData.tagline),
    subtitle: emptyToNull(wizardData.subtitle),
    marketingName: emptyToNull(wizardData.marketingName),
    description: emptyToNull(wizardData.description),
    suburb: emptyToNull(wizardData.suburb),
    address: emptyToNull(wizardData.address),
    postalCode: emptyToNull(wizardData.postalCode),
    latitude: emptyToNull(wizardData.latitude),
    longitude: emptyToNull(wizardData.longitude),
    customClassification: emptyToNull(wizardData.customClassification),

    // Optional enums
    constructionPhase: mapEnum(wizardData.constructionPhase, [
      'planning',
      'under_construction',
      'completed',
      'phase_completed',
    ] as const),
    nature: mapEnum(
      wizardData.nature,
      ['new', 'phase', 'extension', 'redevelopment'] as const,
      'new',
    ),
    ownershipType: normalizeOwnershipType(wizardData.ownershipType),
    structuralType: mapEnum(wizardData.structuralType, [
      'apartment',
      'freestanding-house',
      'simplex',
      'duplex',
      'penthouse',
      'plot-and-plan',
      'townhouse',
      'studio',
    ] as const),
    floors: mapEnum(wizardData.floors, ['single-storey', 'double-storey', 'triplex'] as const),
    marketingRole: mapEnum(wizardData.marketingRole, ['exclusive', 'joint', 'open'] as const),

    // Numeric fields
    priceFrom: coerceInt(wizardData.priceFrom),
    priceTo: coerceInt(wizardData.priceTo),
    monthlyRentFrom: coerceDecimal(wizardData.monthlyRentFrom),
    monthlyRentTo: coerceDecimal(wizardData.monthlyRentTo),
    auctionStartDate:
      transactionType === 'auction'
        ? (auctionRange?.auctionStartDate ?? emptyToNull((wizardData as any).auctionStartDate))
        : emptyToNull((wizardData as any).auctionStartDate),
    auctionEndDate:
      transactionType === 'auction'
        ? (auctionRange?.auctionEndDate ?? emptyToNull((wizardData as any).auctionEndDate))
        : emptyToNull((wizardData as any).auctionEndDate),
    startingBidFrom:
      transactionType === 'auction'
        ? (auctionRange?.startingBidFrom ?? coerceDecimal((wizardData as any).startingBidFrom))
        : coerceDecimal((wizardData as any).startingBidFrom),
    reservePriceFrom:
      transactionType === 'auction'
        ? (auctionRange?.reservePriceFrom ?? coerceDecimal((wizardData as any).reservePriceFrom))
        : coerceDecimal((wizardData as any).reservePriceFrom),
    monthlyLevyFrom: coerceDecimal(wizardData.monthlyLevyFrom),
    monthlyLevyTo: coerceDecimal(wizardData.monthlyLevyTo),
    ratesFrom: coerceDecimal(wizardData.ratesFrom),
    ratesTo: coerceDecimal(wizardData.ratesTo),
    transferCostsIncluded: wizardData.transferCostsIncluded
      ? boolToInt(wizardData.transferCostsIncluded)
      : null,
    totalUnits: coerceInt(wizardData.totalUnits),
    availableUnits: coerceInt(wizardData.availableUnits),
    totalDevelopmentArea: coerceInt(wizardData.totalDevelopmentArea),

    // Array fields
    propertyTypes: normalizeArray(wizardData.propertyTypes),
    amenities: normalizeArray(wizardData.amenities),
    highlights: normalizeArray(wizardData.highlights),
    features: normalizeArray(wizardData.features),

    // Media fields (preserve structure)
    images: normalizeMedia(wizardData.images),
    videos: normalizeMedia(wizardData.videos),
    floorPlans: normalizeMedia(wizardData.floorPlans),
    brochures: normalizeMedia(wizardData.brochures),

    // JSON fields
    estateSpecs: wizardData.estateSpecs || null,

    // Date fields
    completionDate: wizardData.completionDate ? String(wizardData.completionDate) : null,

    // Foreign keys
    developerBrandProfileId: wizardData.developerBrandProfileId || null,
    marketingBrandProfileId: wizardData.marketingBrandProfileId || null,
    locationId: wizardData.locationId || null,
  };
}

/**
 * Validates normalized payload (additional business logic checks)
 */
export function validateNormalizedPayload(payload: NormalizedDevelopmentPayload): void {
  // Add custom validation rules here
  if (payload.priceFrom && payload.priceTo && payload.priceFrom > payload.priceTo) {
    throw new Error('priceFrom cannot be greater than priceTo');
  }

  if (
    payload.monthlyLevyFrom &&
    payload.monthlyLevyTo &&
    payload.monthlyLevyFrom > payload.monthlyLevyTo
  ) {
    throw new Error('monthlyLevyFrom cannot be greater than monthlyLevyTo');
  }

  if (payload.transactionType === 'for_rent') {
    if (
      payload.monthlyRentFrom &&
      payload.monthlyRentTo &&
      payload.monthlyRentFrom > payload.monthlyRentTo
    ) {
      throw new Error('monthlyRentFrom cannot be greater than monthlyRentTo');
    }
  }

  if (payload.transactionType === 'auction') {
    if (payload.auctionStartDate && payload.auctionEndDate) {
      const start = new Date(payload.auctionStartDate);
      const end = new Date(payload.auctionEndDate);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        if (end <= start) {
          throw new Error('auctionEndDate must be after auctionStartDate');
        }
      }
    }

    if (
      payload.startingBidFrom &&
      payload.reservePriceFrom &&
      payload.reservePriceFrom < payload.startingBidFrom
    ) {
      throw new Error('reservePriceFrom cannot be lower than startingBidFrom');
    }
  }

  // Add more validation as needed
}
