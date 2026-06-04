import { sql, eq, desc, and, inArray } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { randomUUID } from 'crypto';
import { getDb } from '../db-connection';
import { generateUniqueSlug } from '../_core/utils/slug';
import { normalizeForPublish, validateNormalizedPayload } from './publishNormalizer';
import type { NormalizedDevelopmentPayload, WizardData } from './publishNormalizer';
import { buildDevelopmentCanonicalEditSnapshot } from '../lib/developmentCanonicalSnapshot';
import {
  flattenCanonicalDevelopmentPayload,
  isCanonicalPartialDevelopmentUpdate,
} from '../lib/canonicalDevelopmentPayload';
import { resolveDevelopmentUpdateIntent } from '../lib/developmentUpdateIntent';
import {
  buildDevelopmentTransactionAggregates as buildSharedDevelopmentTransactionAggregates,
  calculatePriceFrom,
  compareDevelopmentUnitsForPublicDisplay,
  normalizeDevelopmentTransactionType,
} from '../../shared/developmentDerived';
import { getDevelopmentPublishReadinessSummary } from '../../shared/developmentReadiness';
import {
  buildDevelopmentWorkflowStateColumns,
  buildPublishedDevelopmentWorkflowStateColumns,
} from '../lib/developmentWorkflowPersistence';

import {
  developments,
  developers,
  unitTypes,
  developmentPhases,
  developerBrandProfiles,
  developmentDrafts,
  locations,
  distributionPrograms,
} from '../../drizzle/schema';

// ===========================================================================
// TYPES
// ===========================================================================

type DevelopmentRow = InferSelectModel<typeof developments>;
type DeveloperRow = InferSelectModel<typeof developers>;
type UnitTypeRow = InferSelectModel<typeof unitTypes>;
type DevelopmentPhaseRow = InferSelectModel<typeof developmentPhases>;

interface CreateDevelopmentData {
  unitTypes?: unknown[];
  amenities?: unknown;
  estateSpecs?: unknown;
  specifications?: unknown;
  phases?: unknown[];
  highlights?: unknown;
  features?: unknown;
  videos?: unknown;
  floorPlans?: unknown;
  brochures?: unknown;
  images?: unknown;
  [key: string]: unknown;
}

interface DevelopmentMetadata {
  brandProfileId?: number;
  ownerType?: 'platform' | 'developer';
  [key: string]: unknown;
}

// ===========================================================================
// UTILITIES
// ===========================================================================

function parseSlugOrId(input: string): { isId: boolean; value: string | number } {
  const trimmed = input.trim();
  const isNumeric = /^\d+$/.test(trimmed);

  if (isNumeric) {
    const parsed = parseInt(trimmed, 10);
    if (!isNaN(parsed) && parsed > 0) return { isId: true, value: parsed };
  }

  return { isId: false, value: trimmed };
}

function parseJsonMaybeTwice<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value as T;

  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'string') {
      return JSON.parse(parsed);
    }
    return parsed;
  } catch {
    return fallback;
  }
}

export function parseDevelopmentJsonArrayField(field: unknown): unknown[] {
  if (Array.isArray(field)) return field;
  if (!field) return [];

  if (typeof field === 'string') {
    const trimmed = field.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === 'string' && parsed !== trimmed) {
        return parseDevelopmentJsonArrayField(parsed);
      }
      if (typeof parsed === 'string' && parsed.trim()) return [parsed.trim()];
      return [];
    } catch {
      if (trimmed.includes(',')) return trimmed.split(',').map(s => s.trim());
      return [trimmed];
    }
  }

  return [];
}

function normalizeAmenities(amenities: unknown): string[] {
  if (Array.isArray(amenities)) return amenities as string[];

  if (amenities && typeof amenities === 'object') {
    const standard = Array.isArray((amenities as any).standard) ? (amenities as any).standard : [];
    const additional = Array.isArray((amenities as any).additional)
      ? (amenities as any).additional
      : [];
    return [...standard, ...additional].filter(Boolean);
  }

  if (typeof amenities === 'string') {
    const parsed = parseJsonMaybeTwice<any>(amenities, null);
    if (Array.isArray(parsed)) return parsed;
    if (parsed?.standard || parsed?.additional) {
      return [...(parsed.standard ?? []), ...(parsed.additional ?? [])].filter(Boolean);
    }
    return amenities ? [amenities] : [];
  }

  return [];
}

type TransactionType = 'for_sale' | 'for_rent' | 'auction';

function normalizeTransactionType(input: unknown): TransactionType {
  return normalizeDevelopmentTransactionType(input);
}

async function validatePersistedDevelopmentForPublish(developmentId: number): Promise<void> {
  const fullDev = await getDevelopmentWithPhases(developmentId);
  if (!fullDev) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Development not found',
    });
  }

  const readiness = getDevelopmentPublishReadinessSummary(fullDev, {
    classification: {
      type:
        fullDev.developmentType === 'land' ? 'land' : (fullDev.developmentType ?? 'residential'),
    },
    transactionType: fullDev.transactionType,
    nowMs: Date.now(),
  });

  if (!readiness.isReady) {
    const validationErrors = Object.entries(readiness.fieldErrors).map(([field, message]) => ({
      field,
      message,
    }));
    const first = validationErrors[0];
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: first?.message ?? 'Publish validation failed',
      cause: {
        errors: readiness.messages,
        validationErrors,
        fields: readiness.fieldErrors,
      } as any,
    });
  }
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export type PublicDevelopmentListingType = 'sale' | 'rent' | 'auction';

export type PublicDevelopmentConfiguration = {
  unitTypeId?: string;
  label: string;
  listingType: PublicDevelopmentListingType;
  priceFrom: number | null;
  priceTo: number | null;
};

function mapTransactionTypeToListingType(transactionType: unknown): PublicDevelopmentListingType {
  const normalized = normalizeTransactionType(transactionType);
  if (normalized === 'for_rent') return 'rent';
  if (normalized === 'auction') return 'auction';
  return 'sale';
}

export function resolvePublicDevelopmentConfiguration(unit: any): PublicDevelopmentConfiguration {
  const transactionType = normalizeTransactionType(unit?.transactionType);
  const listingType = mapTransactionTypeToListingType(transactionType);
  const priceRange = calculatePriceFrom(unit, transactionType);
  const priceFrom = priceRange.priceFrom > 0 ? priceRange.priceFrom : null;
  const priceTo = priceRange.priceTo ?? priceFrom;

  return {
    ...(unit?.id ? { unitTypeId: String(unit.id) } : {}),
    label: String(unit?.label || ''),
    listingType,
    priceFrom,
    priceTo,
  };
}

// ===========================================================================
// INTERNAL SAFE HELPERS (AUTO-RESTORED)
// ===========================================================================

function boolToInt(value: unknown): 0 | 1 {
  if (value === true) return 1;
  if (value === false) return 0;
  return value ? 1 : 0;
}

function normalizeOptionalTinyIntFlag(value: unknown): 0 | 1 | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return value === 0 ? 0 : 1;

  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (!normalized) return null;
  if (['0', 'false', 'no', 'n', 'excluded', 'not_included'].includes(normalized)) return 0;
  if (['1', 'true', 'yes', 'y', 'included'].includes(normalized)) return 1;

  return boolToInt(value);
}

function sanitizeString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

function sanitizeInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

function sanitizeDecimal(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function sanitizeDevelopmentDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 19).replace('T', ' ');
  }
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) return s;
    const parsed = new Date(s);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 19).replace('T', ' ');
    }
    return s;
  }
  return null;
}

function sanitizeEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T | null,
): T | null {
  const s = String(value ?? '').trim();
  if ((allowed as readonly string[]).includes(s)) return s as T;
  return fallback;
}

function requireEnum<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  const sanitized = sanitizeEnum(value, allowed, null);
  if (sanitized) return sanitized;
  throw new TRPCError({ code: 'BAD_REQUEST', message: `Invalid ${label}` });
}

function normalizeImages(input: unknown): unknown[] {
  if (Array.isArray(input)) return input;
  if (input && typeof input === 'object') return [input];
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === 'string') {
        const parsedAgain = JSON.parse(parsed);
        if (Array.isArray(parsedAgain)) return parsedAgain;
      }
    } catch {
      return [];
    }
  }
  return [];
}

function stringifyJsonValue(value: unknown, fallback: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value ?? fallback);
  } catch {
    return JSON.stringify(fallback);
  }
}

function mergeRangeValue(
  specs: Record<string, any>,
  rangeKey: 'levyRange' | 'rightsAndTaxes',
  side: 'min' | 'max',
  value: unknown,
) {
  specs[rangeKey] = {
    ...(specs[rangeKey] && typeof specs[rangeKey] === 'object' && !Array.isArray(specs[rangeKey])
      ? specs[rangeKey]
      : {}),
    [side]: sanitizeDecimal(value),
  };
}

function buildDevelopmentGovernanceEstateSpecs(
  developmentData: Record<string, any>,
  estateSpecsData: unknown,
): { estateSpecs: Record<string, any>; hasOwnedFields: boolean } {
  const estateSpecs =
    estateSpecsData === undefined
      ? {}
      : parseJsonMaybeTwice<Record<string, any>>(estateSpecsData, {});
  const specs =
    estateSpecs && typeof estateSpecs === 'object' && !Array.isArray(estateSpecs)
      ? { ...estateSpecs }
      : {};
  let hasOwnedFields = estateSpecsData !== undefined;

  if (developmentData.monthlyLevyFrom !== undefined) {
    mergeRangeValue(specs, 'levyRange', 'min', developmentData.monthlyLevyFrom);
    hasOwnedFields = true;
  }
  if (developmentData.monthlyLevyTo !== undefined) {
    mergeRangeValue(specs, 'levyRange', 'max', developmentData.monthlyLevyTo);
    hasOwnedFields = true;
  }
  if (developmentData.ratesFrom !== undefined) {
    mergeRangeValue(specs, 'rightsAndTaxes', 'min', developmentData.ratesFrom);
    hasOwnedFields = true;
  }
  if (developmentData.ratesTo !== undefined) {
    mergeRangeValue(specs, 'rightsAndTaxes', 'max', developmentData.ratesTo);
    hasOwnedFields = true;
  }
  if (developmentData.transferCostsIncluded !== undefined) {
    specs.transferCostsIncluded =
      normalizeOptionalTinyIntFlag(developmentData.transferCostsIncluded) === 1;
    hasOwnedFields = true;
  }

  return { estateSpecs: specs, hasOwnedFields };
}

function createError(message: string, code: string, meta?: Record<string, unknown>): TRPCError {
  return new TRPCError({
    code: code as any,
    message,
    cause: meta as any,
  });
}

function handleDatabaseError(error: unknown, context?: Record<string, unknown>): never {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'Database error';
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message,
    cause: { context, error } as any,
  });
}

export function buildDevelopmentTransactionAggregates(
  transactionType: unknown,
  developmentData: Record<string, unknown> = {},
  unitTypesData?: Array<Record<string, unknown>> | null,
) {
  return buildSharedDevelopmentTransactionAggregates(
    transactionType,
    developmentData,
    unitTypesData,
  );
}

// ===========================================================================
// VALIDATION (minimal required checks)
// ===========================================================================

function validateDevelopmentData(input: any, _userId: number) {
  if (!input || typeof input !== 'object') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid development payload' });
  }

  if (!input.name || typeof input.name !== 'string' || !input.name.trim()) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Development name is required' });
  }

  if (!input.developmentType || typeof input.developmentType !== 'string') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Development type is required' });
  }

  if (!input.province || typeof input.province !== 'string') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Province is required' });
  }

  if (!input.city || typeof input.city !== 'string') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'City is required' });
  }

  if (Array.isArray((input as any).unitTypes) && (input as any).unitTypes.length === 0) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'At least one unit type is required' });
  }
}

// ===========================================================================
// DEVELOPER DISPLAY HELPER (single source of truth)
// ===========================================================================

function buildDeveloperDisplay(dev: any) {
  const brand = dev?.brandProfile ?? dev?.publisher ?? null;
  const developer = dev?.developer ?? null;

  // Schema-safe: verification fields are not guaranteed to exist yet.
  const isVerified = false;

  if (brand?.name) {
    return {
      type: 'brand_profile' as const,
      name: brand.name,
      logoUrl: brand.logoUrl ?? null,
      websiteUrl: brand.websiteUrl ?? null,
      description: brand.description ?? null,
      slug: brand.slug ?? undefined,
      isVerified,
    };
  }

  if (developer?.name) {
    return {
      type: 'developer' as const,
      name: developer.name,
      logoUrl: developer.logo ?? null,
      websiteUrl: developer.website ?? null,
      description: developer.description ?? null,
      slug: developer.slug ?? undefined,
      isVerified,
    };
  }

  return {
    type: 'unknown' as const,
    name: 'Unknown Developer',
    logoUrl: null,
    websiteUrl: null,
    description: 'Professional property developer committed to quality and excellence.',
    slug: undefined,
    isVerified,
  };
}

// ===========================================================================
// PUBLIC FUNCTIONS
// ===========================================================================

export async function getPublicDevelopmentBySlug(slugOrId: string) {
  const db = await getDb();
  if (!db) return null;

  const { isId, value } = parseSlugOrId(slugOrId);

  const whereClause = isId
    ? and(eq(developments.id, value as number), eq(developments.isPublished, 1))
    : and(eq(developments.slug, value as string), eq(developments.isPublished, 1));

  const results = await db
    .select({
      id: developments.id,
      name: developments.name,
      slug: developments.slug,
      description: developments.description,
      images: developments.images,
      videos: developments.videos,
      city: developments.city,
      province: developments.province,
      suburb: developments.suburb,
      address: developments.address,
      latitude: developments.latitude,
      longitude: developments.longitude,
      priceFrom: developments.priceFrom,
      priceTo: developments.priceTo,
      monthlyRentFrom: developments.monthlyRentFrom,
      monthlyRentTo: developments.monthlyRentTo,
      auctionStartDate: developments.auctionStartDate,
      auctionEndDate: developments.auctionEndDate,
      startingBidFrom: developments.startingBidFrom,
      reservePriceFrom: developments.reservePriceFrom,
      amenities: developments.amenities,
      highlights: developments.highlights,
      estateSpecs: developments.estateSpecs,
      floorPlans: developments.floorPlans,
      brochures: developments.brochures,
      developerBrandProfileId: developments.developerBrandProfileId,

      // ✅ chips + status row + availability bar
      status: developments.status,
      developmentType: developments.developmentType,
      ownershipType: developments.ownershipType,
      transactionType: developments.transactionType,
      marketingRole: developments.marketingRole,
      completionDate: developments.completionDate,
      totalUnits: developments.totalUnits,
      availableUnits: developments.availableUnits,

      developer: {
        id: developers.id,
        name: developers.name,
        slug: developers.slug,
        logo: developers.logo,
        description: developers.description,
        website: developers.website,
      },
    })
    .from(developments)
    .leftJoin(developers, eq(developments.developerId, developers.id))
    .where(whereClause)
    .limit(1);

  if (!results[0]) return null;

  const dev: any = results[0];

  // Attach brand profile (optional)
  try {
    if (dev?.developerBrandProfileId) {
      const brand = await db
        .select({
          id: developerBrandProfiles.id,
          brandName: developerBrandProfiles.brandName,
          slug: developerBrandProfiles.slug,
          logoUrl: developerBrandProfiles.logoUrl,
          websiteUrl: developerBrandProfiles.websiteUrl,
          about: developerBrandProfiles.about,
          foundedYear: developerBrandProfiles.foundedYear,
          headOfficeLocation: developerBrandProfiles.headOfficeLocation,
        })
        .from(developerBrandProfiles)
        .where(eq(developerBrandProfiles.id, dev.developerBrandProfileId))
        .limit(1);

      const bp = brand?.[0];
      if (bp) {
        dev.brandProfile = {
          id: bp.id,
          name: bp.brandName,
          slug: bp.slug,
          logoUrl: bp.logoUrl ?? null,
          websiteUrl: bp.websiteUrl ?? null,
          description: bp.about ?? null,
          foundedYear: bp.foundedYear ?? null,
          headOfficeLocation: bp.headOfficeLocation ?? null,
        };
        dev.publisher = dev.brandProfile; // alias for older UI code
      }
    }
  } catch (err) {
    console.warn('[getPublicDevelopmentBySlug] Brand profile attachment failed (non-fatal):', err);
  }

  // Units (for unit cards)
  const units = await db
    .select()
    .from(unitTypes)
    .where(and(eq(unitTypes.developmentId, dev.id), eq(unitTypes.isActive, 1)))
    .orderBy(unitTypes.displayOrder);

  const unitsWithMedia = units
    .sort((left: any, right: any) =>
      compareDevelopmentUnitsForPublicDisplay(
        left,
        right,
        normalizeTransactionType(dev.transactionType),
      ),
    )
    .map((u: any) => {
      let baseMedia = u.baseMedia;

      if (typeof baseMedia === 'string') {
        try {
          baseMedia = JSON.parse(baseMedia);
          if (typeof baseMedia === 'string') baseMedia = JSON.parse(baseMedia);
        } catch {
          baseMedia = { gallery: [] };
        }
      }

      const gallery = Array.isArray(baseMedia?.gallery) ? baseMedia.gallery : [];
      const primary = gallery[0];

      return {
        ...u,
        baseMedia,
        primaryImageUrl: primary?.url ?? null,
      };
    });

  // Sales metrics (drives progress bar vs "Sales data unavailable")
  let salesMetrics: null | {
    totalUnits: number;
    availableUnits: number;
    reservedUnits: number;
    soldUnits: number;
    soldPct: number;
  } = null;

  if (unitsWithMedia.length > 0) {
    const totals = unitsWithMedia.reduce(
      (acc: { total: number; available: number; reserved: number }, u: any) => {
        const total = Math.max(0, Number(u?.totalUnits || 0));
        const reserved = Math.min(Math.max(0, Number(u?.reservedUnits || 0)), total);
        const available = Math.min(Math.max(0, Number(u?.availableUnits || 0)), total - reserved);
        return {
          total: acc.total + total,
          available: acc.available + available,
          reserved: acc.reserved + reserved,
        };
      },
      { total: 0, available: 0, reserved: 0 },
    );

    if (totals.total > 0) {
      const soldUnits = Math.max(totals.total - totals.available - totals.reserved, 0);
      const soldPct = Math.round((soldUnits / totals.total) * 100);
      salesMetrics = {
        totalUnits: totals.total,
        availableUnits: totals.available,
        reservedUnits: totals.reserved,
        soldUnits,
        soldPct,
      };
    }
  }

  const images = parseDevelopmentJsonArrayField(dev.images);
  const videos = parseDevelopmentJsonArrayField(dev.videos);
  const floorPlans = parseDevelopmentJsonArrayField(dev.floorPlans);
  const brochures = parseDevelopmentJsonArrayField(dev.brochures);
  const highlights = parseDevelopmentJsonArrayField(dev.highlights);

  return {
    ...dev,
    developerDisplay: buildDeveloperDisplay(dev),
    priceFrom: dev.priceFrom != null ? Number(dev.priceFrom) : null,
    priceTo: dev.priceTo != null ? Number(dev.priceTo) : null,
    monthlyRentFrom: dev.monthlyRentFrom != null ? Number(dev.monthlyRentFrom) : null,
    monthlyRentTo: dev.monthlyRentTo != null ? Number(dev.monthlyRentTo) : null,
    startingBidFrom: dev.startingBidFrom != null ? Number(dev.startingBidFrom) : null,
    reservePriceFrom: dev.reservePriceFrom != null ? Number(dev.reservePriceFrom) : null,

    images,
    videos,
    floorPlans,
    brochures,
    media: {
      photos: images,
      videos,
      floorPlans,
      brochures,
      documents: brochures,
    },
    amenities: normalizeAmenities(dev.amenities),
    highlights,

    estateSpecs:
      typeof dev.estateSpecs === 'string'
        ? (parseJsonMaybeTwice(dev.estateSpecs, {}) as any)
        : (dev.estateSpecs ?? {}),

    brandProfile: dev.brandProfile,
    publisher: dev.publisher,

    unitTypes: unitsWithMedia,
    salesMetrics,
  };
}

export async function getPublicDevelopment(id: number) {
  // Legacy ID lookup: current public detail routes use getPublicDevelopmentBySlug.
  // Keep as a compatibility bridge until route/import checks prove it can be removed.
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select({
      id: developments.id,
      name: developments.name,
      slug: developments.slug,
      description: developments.description,
      images: developments.images,
      city: developments.city,
      province: developments.province,
      suburb: developments.suburb,
      address: developments.address,
      priceFrom: developments.priceFrom,
      priceTo: developments.priceTo,
      isPublished: developments.isPublished,
    })
    .from(developments)
    .where(and(eq(developments.id, id), eq(developments.isPublished, 1)))
    .limit(1);

  if (!results[0]) return null;

  return {
    ...results[0],
    images: parseDevelopmentJsonArrayField(results[0].images),
  };
}

export async function listPublicDevelopments(options: {
  limit?: number;
  province?: string;
  city?: string;
  suburb?: string;
  developmentType?: 'residential' | 'commercial' | 'mixed_use' | 'land';
  transactionType?: 'for_sale' | 'for_rent' | 'auction';
}) {
  const db = await getDb();
  if (!db) return [];

  const { limit = 20, province, city, suburb, developmentType, transactionType } = options;

  const conditions: any[] = [
    eq(developments.isPublished, 1),
    eq(developments.approvalStatus, 'approved'),
  ];
  if (province) conditions.push(eq(developments.province, province));
  if (city) conditions.push(eq(developments.city, city));
  if (suburb) conditions.push(eq(developments.suburb, suburb));
  if (developmentType) conditions.push(eq(developments.developmentType, developmentType as any));
  if (transactionType) conditions.push(eq(developments.transactionType, transactionType as any));

  const results = await db
    .select({
      id: developments.id,
      name: developments.name,
      slug: developments.slug,
      description: developments.description,
      images: developments.images,
      videos: developments.videos,
      floorPlans: developments.floorPlans,
      brochures: developments.brochures,
      city: developments.city,
      suburb: developments.suburb,
      province: developments.province,
      priceFrom: developments.priceFrom,
      priceTo: developments.priceTo,
      monthlyRentFrom: developments.monthlyRentFrom,
      monthlyRentTo: developments.monthlyRentTo,
      startingBidFrom: developments.startingBidFrom,
      reservePriceFrom: developments.reservePriceFrom,
      transactionType: developments.transactionType,
      status: developments.status,
      isFeatured: developments.isFeatured,
      rating: developments.rating,
      highlights: developments.highlights,
      developerBrandProfileId: developments.developerBrandProfileId,
      developerName: developers.name,
      developerLogoUrl: developers.logo,
      brandName: developerBrandProfiles.brandName,
      brandLogoUrl: developerBrandProfiles.logoUrl,
      commissionModel: distributionPrograms.commissionModel,
      referrerCommissionType: distributionPrograms.referrerCommissionType,
      referrerCommissionValue: distributionPrograms.referrerCommissionValue,
      defaultCommissionAmount: distributionPrograms.defaultCommissionAmount,
    })
    .from(developments)
    .leftJoin(developers, eq(developments.developerId, developers.id))
    .leftJoin(
      developerBrandProfiles,
      eq(developments.developerBrandProfileId, developerBrandProfiles.id),
    )
    .leftJoin(distributionPrograms, eq(developments.id, distributionPrograms.developmentId))
    .where(and(...conditions))
    .orderBy(desc(developments.createdAt))
    .limit(limit);

  const developmentIds = results.map((d: any) => Number(d.id)).filter(Boolean);
  const unitRows =
    developmentIds.length > 0
      ? await db
          .select({
            id: unitTypes.id,
            developmentId: unitTypes.developmentId,
            name: unitTypes.name,
            bedrooms: unitTypes.bedrooms,
            structuralType: unitTypes.structuralType,
            basePriceFrom: unitTypes.basePriceFrom,
            basePriceTo: unitTypes.basePriceTo,
            monthlyRentFrom: unitTypes.monthlyRentFrom,
            monthlyRentTo: unitTypes.monthlyRentTo,
            startingBid: unitTypes.startingBid,
            reservePrice: unitTypes.reservePrice,
            displayOrder: unitTypes.displayOrder,
            developmentType: developments.developmentType,
            transactionType: developments.transactionType,
          })
          .from(unitTypes)
          .leftJoin(developments, eq(unitTypes.developmentId, developments.id))
          .where(and(inArray(unitTypes.developmentId, developmentIds), eq(unitTypes.isActive, 1)))
          .orderBy(unitTypes.displayOrder)
      : [];

  const unitsByDevelopment = new Map<number, PublicDevelopmentConfiguration[]>();

  const mapUnitKind = (structuralType: unknown, developmentType: unknown) => {
    const s = String(structuralType || '').toLowerCase();
    const devType = String(developmentType || '').toLowerCase();

    if (devType === 'land' || s.includes('plot')) return 'Plot';
    if (devType === 'commercial') return 'Office';
    if (s.includes('house') || s.includes('townhouse')) return 'House';
    if (s.includes('office')) return 'Office';
    return 'Apartment';
  };

  for (const unit of unitRows as any[]) {
    const devId = Number(unit.developmentId);
    if (!unitsByDevelopment.has(devId)) unitsByDevelopment.set(devId, []);
    const kind = mapUnitKind(unit.structuralType, unit.developmentType);
    const label =
      unit.name || (Number(unit.bedrooms) > 0 ? `${Number(unit.bedrooms)} Bed ${kind}` : `${kind}`);
    unitsByDevelopment.get(devId)!.push(
      resolvePublicDevelopmentConfiguration({
        ...unit,
        label,
      }),
    );
  }

  Array.from(unitsByDevelopment.entries()).forEach(([devId, configurations]) => {
    const sourceUnits = (unitRows as any[]).filter(unit => Number(unit.developmentId) === devId);
    const transactionType = normalizeTransactionType(sourceUnits[0]?.transactionType);
    unitsByDevelopment.set(
      devId,
      configurations
        .map((configuration, index) => ({ configuration, source: sourceUnits[index] }))
        .sort((left, right) =>
          compareDevelopmentUnitsForPublicDisplay(left.source, right.source, transactionType),
        )
        .map(item => item.configuration),
    );
  });

  return results.map((d: any) => {
    const images = parseDevelopmentJsonArrayField(d.images);
    const videos = parseDevelopmentJsonArrayField(d.videos);
    const floorPlans = parseDevelopmentJsonArrayField(d.floorPlans);
    const brochures = parseDevelopmentJsonArrayField(d.brochures);

    return {
      ...d,
      monthlyRentFrom: d.monthlyRentFrom != null ? Number(d.monthlyRentFrom) : null,
      monthlyRentTo: d.monthlyRentTo != null ? Number(d.monthlyRentTo) : null,
      startingBidFrom: d.startingBidFrom != null ? Number(d.startingBidFrom) : null,
      reservePriceFrom: d.reservePriceFrom != null ? Number(d.reservePriceFrom) : null,
      images,
      videos,
      floorPlans,
      brochures,
      media: {
        photos: images,
        videos,
        floorPlans,
        brochures,
        documents: brochures,
      },
      highlights: parseDevelopmentJsonArrayField(d.highlights),
      rating: d.rating != null ? Number(d.rating) : null,
      isFeatured: Number(d.isFeatured || 0) === 1,
      builderName: d.brandName || d.developerName || null,
      builderLogoUrl: d.brandLogoUrl || d.developerLogoUrl || null,
      commissionModel: d.commissionModel || null,
      referrerCommissionType: d.referrerCommissionType || null,
      referrerCommissionValue:
        d.referrerCommissionValue != null ? Number(d.referrerCommissionValue) : null,
      referrerCommissionAmount:
        d.defaultCommissionAmount != null ? Number(d.defaultCommissionAmount) : null,
      configurations: unitsByDevelopment.get(Number(d.id)) || [],
    };
  });
}

// ===========================================================================
// ADMIN / DEVELOPER FUNCTIONS
// ===========================================================================

export async function createDevelopment(
  userId: number,
  data: CreateDevelopmentData,
  metadata: DevelopmentMetadata = {},
  operatingContext?: { brandProfileId: number } | null,
) {
  data = flattenCanonicalDevelopmentPayload(data as Record<string, any>) as CreateDevelopmentData;

  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const { brandProfileId, ownerType, ...restMetadata } = metadata;
  const {
    unitTypes: unitTypesData,
    amenities: amenitiesData,
    estateSpecs: estateSpecsData,
    specifications: specificationsData,
    phases: phasesData,
    highlights: highlightsData,
    features: featuresData,
    videos: videosData,
    floorPlans: floorPlansData,
    brochures: brochuresData,
    images: imagesData,
    ...developmentData
  } = data as any;

  console.log('[createDevelopment] Input params:', {
    userId,
    operatingContext,
    brandProfileId,
    ownerType,
  });

  // Check user role FIRST before any validation
  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, userId),
    columns: { id: true, role: true },
  });

  let developerProfileId: number | null = null;
  let resolvedBrandProfileId: number | null = null;
  let effectiveOwnerType: 'platform' | 'developer' = ownerType || 'developer';

  // Super admins bypass ownership checks, but DB-row publish readiness still uses the shared
  // canonical bridge so public listings are not published with missing commercial basics.
  if (user?.role === 'super_admin') {
    // Super admin mode - use brand profile from context or metadata
    resolvedBrandProfileId =
      operatingContext?.brandProfileId ||
      brandProfileId ||
      (developmentData as any).developerBrandProfileId ||
      null;
    developerProfileId = null;
    effectiveOwnerType = 'platform';

    console.log('[createDevelopment] ✅ SUPER ADMIN MODE - Bypassing all checks:', {
      brandProfileId: resolvedBrandProfileId,
      ownerType: effectiveOwnerType,
    });
  } else {
    // Regular developer mode - require developer profile
    const devProfile = await db.query.developers.findFirst({
      where: eq(developers.userId, userId),
      columns: { id: true, brandProfileId: true },
    });

    if (!devProfile) {
      throw createError(
        'Developer profile not found. Please complete onboarding.',
        'VALIDATION_ERROR',
        { userId },
      );
    }

    developerProfileId = devProfile.id;
    resolvedBrandProfileId = devProfile.brandProfileId || brandProfileId || null;
    effectiveOwnerType = 'developer';

    console.log('[createDevelopment] Developer mode:', {
      developerId: developerProfileId,
      brandProfileId: resolvedBrandProfileId,
    });
  }

  // validateDevelopmentData(
  //   { ...developmentData, devOwnerType: effectiveOwnerType } as any,
  //   userId,
  // );

  // 2) brand profile validation (only if brandProfileId is set)
  const targetBrandId = resolvedBrandProfileId;
  if (targetBrandId) {
    const validBrand = await db.query.developerBrandProfiles.findFirst({
      where: eq(developerBrandProfiles.id, targetBrandId),
      columns: { id: true },
    });
    if (!validBrand) {
      throw createError(`Brand Profile with ID ${targetBrandId} not found`, 'NOT_FOUND', {
        brandProfileId: targetBrandId,
      });
    }
  }

  // 3) marketing brand validation
  if ((developmentData as any).marketingBrandProfileId) {
    const validMarketing = await db.query.developerBrandProfiles.findFirst({
      where: eq(developerBrandProfiles.id, (developmentData as any).marketingBrandProfileId),
      columns: { id: true },
    });
    if (!validMarketing) {
      throw createError(
        `Marketing Brand Profile with ID ${(developmentData as any).marketingBrandProfileId} not found`,
        'NOT_FOUND',
        { marketingBrandProfileId: (developmentData as any).marketingBrandProfileId },
      );
    }
  }

  // 4) location validation (soft strip)
  if ((developmentData as any).locationId) {
    const validLocation = await db.query.locations.findFirst({
      where: eq(locations.id, (developmentData as any).locationId),
      columns: { id: true },
    });
    if (!validLocation) {
      console.warn(
        `[createDevelopment] Invalid Location ID ${(developmentData as any).locationId} provided. Removing to prevent crash.`,
      );
      (developmentData as any).locationId = undefined;
    }
  }

  const allowedDevTypes = new Set(['residential', 'commercial', 'mixed_use', 'land']);
  if (!allowedDevTypes.has((developmentData as any).developmentType)) {
    throw createError(
      `Invalid developmentType: ${(developmentData as any).developmentType}`,
      'VALIDATION_ERROR',
      { developmentType: (developmentData as any).developmentType },
    );
  }

  let baseSlug = (developmentData as any).slug as string | undefined;
  if (!baseSlug || baseSlug.trim() === '') {
    if (!(developmentData as any).name) {
      throw createError(
        'Either slug or name must be provided to generate a slug',
        'VALIDATION_ERROR',
      );
    }
    baseSlug = (developmentData as any).name;
  }

  // Ensure baseSlug is never undefined
  const slugSource = (baseSlug || '').trim();
  const slug = await generateUniqueSlug(slugSource);

  // IMPORTANT:
  // - amenities/highlights/features tables differ (you showed amenities=text, highlights=json, features=json)
  // - safest: always store these consistently as JSON strings if DB expects json, otherwise string.
  // We keep your existing behavior but ensure highlights/features become JSON strings.
  const normalizedTransactionType = normalizeTransactionType(
    (developmentData as any).transactionType,
  );
  const isSuperAdminBrandCreation = user?.role === 'super_admin' && !!resolvedBrandProfileId;
  const nowFormatted = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const transactionAggregates = normalizeDevelopmentTransactionAggregatesForDb(
    buildDevelopmentTransactionAggregates(
      normalizedTransactionType,
      developmentData as Record<string, unknown>,
      unitTypesData as Array<Record<string, unknown>> | null,
    ),
  );
  const governanceEstateSpecs = buildDevelopmentGovernanceEstateSpecs(
    developmentData as Record<string, any>,
    estateSpecsData,
  );

  const insertPayload: Record<string, any> = {
    // Use resolved identity for ownership
    developerId: developerProfileId, // null for emulator mode
    name: (developmentData as any).name,
    slug,
    city: (developmentData as any).city,
    province: (developmentData as any).province,
    developmentType: (developmentData as any).developmentType || 'residential',
    transactionType: normalizedTransactionType,
    status: sanitizeEnum(
      (developmentData as any).status,
      ['launching-soon', 'selling', 'sold-out'],
      'launching-soon',
    ),
    devOwnerType: effectiveOwnerType,

    isFeatured: 0,
    isPublished: isSuperAdminBrandCreation ? 1 : 0,
    publishedAt: isSuperAdminBrandCreation ? nowFormatted : null,
    views: 0,
    showHouseAddress: boolToInt((developmentData as any).showHouseAddress ?? true),
    readinessScore: 0,
    approvalStatus: isSuperAdminBrandCreation ? 'approved' : 'draft',
    approvedAt: isSuperAdminBrandCreation ? nowFormatted : null,
    approvedBy: isSuperAdminBrandCreation ? user?.id : null,
    nature: sanitizeEnum(
      (developmentData as any).nature,
      ['new', 'phase', 'extension', 'redevelopment'],
      'new',
    ),

    images: JSON.stringify(normalizeImages(imagesData)),

    // amenities is TEXT in your DB snapshot -> store as JSON string for consistency
    amenities: JSON.stringify(normalizeAmenities(amenitiesData)),

    // highlights/features are JSON in your DB snapshot -> store JSON strings without reshaping
    highlights: stringifyJsonValue(highlightsData, []),
    features: stringifyJsonValue(featuresData, []),

    propertyTypes: (developmentData as any).propertyTypes
      ? JSON.stringify((developmentData as any).propertyTypes)
      : null,

    // Use resolved brand profile ID
    developerBrandProfileId: resolvedBrandProfileId,
    marketingBrandProfileId: (developmentData as any).marketingBrandProfileId || null,
    locationId: (developmentData as any).locationId || null,

    marketingRole: sanitizeEnum(
      (developmentData as any).marketingRole,
      ['exclusive', 'joint', 'open'],
      null,
    ),
    tagline: sanitizeString((developmentData as any).tagline),
    description: sanitizeString((developmentData as any).description),
    address: sanitizeString((developmentData as any).address),
    suburb: sanitizeString((developmentData as any).suburb),
    postalCode: sanitizeString((developmentData as any).postalCode),

    latitude: (developmentData as any).latitude || null,
    longitude: (developmentData as any).longitude || null,

    ...transactionAggregates,
    totalUnits: sanitizeInt((developmentData as any).totalUnits),
    availableUnits: sanitizeInt((developmentData as any).availableUnits),
    totalDevelopmentArea: sanitizeInt((developmentData as any).totalDevelopmentArea),
    customClassification: sanitizeString((developmentData as any).customClassification),

    estateSpecs: governanceEstateSpecs.hasOwnedFields
      ? stringifyJsonValue(governanceEstateSpecs.estateSpecs, {})
      : null,
    launchDate: sanitizeDevelopmentDate((developmentData as any).launchDate),
    completionDate: sanitizeDevelopmentDate((developmentData as any).completionDate),

    ownershipType: sanitizeEnum(
      (developmentData as any).ownershipType,
      ['full-title', 'sectional-title', 'leasehold', 'life-rights'],
      null,
    ),
    structuralType: sanitizeEnum(
      (developmentData as any).structuralType,
      [
        'apartment',
        'freestanding-house',
        'simplex',
        'duplex',
        'penthouse',
        'plot-and-plan',
        'townhouse',
        'studio',
      ],
      null,
    ),
    floors: sanitizeEnum(
      (developmentData as any).floors,
      ['single-storey', 'double-storey', 'triplex'],
      null,
    ),

    monthlyLevyFrom: sanitizeDecimal((developmentData as any).monthlyLevyFrom),
    monthlyLevyTo: sanitizeDecimal((developmentData as any).monthlyLevyTo),
    ratesFrom: sanitizeDecimal((developmentData as any).ratesFrom),
    ratesTo: sanitizeDecimal((developmentData as any).ratesTo),
    transferCostsIncluded: normalizeOptionalTinyIntFlag(
      (developmentData as any).transferCostsIncluded,
    ),
    ...(isSuperAdminBrandCreation
      ? buildPublishedDevelopmentWorkflowStateColumns({
          ...(developmentData as Record<string, any>),
          transactionType: normalizedTransactionType,
        })
      : buildDevelopmentWorkflowStateColumns(developmentData as Record<string, any>)),
  };

  if (Array.isArray(videosData) && videosData.length > 0) {
    insertPayload.videos = JSON.stringify(videosData);
  }
  if (Array.isArray(floorPlansData) && floorPlansData.length > 0) {
    insertPayload.floorPlans = JSON.stringify(floorPlansData);
  }
  if (Array.isArray(brochuresData) && brochuresData.length > 0) {
    insertPayload.brochures = JSON.stringify(brochuresData);
  }

  // Apply metadata overrides explicitly
  if (brandProfileId && !(brandProfileId in insertPayload)) {
    insertPayload.developerBrandProfileId = brandProfileId;
  }

  Object.keys(restMetadata).forEach(key => {
    if (!(key in insertPayload)) insertPayload[key] = (restMetadata as any)[key];
  });

  console.log('[createDevelopment] Consolidated payload keys:', Object.keys(insertPayload));

  let resultId: number;
  let unitTypesCount: number | undefined;

  try {
    const createdDev = await db.transaction(async (tx: any) => {
      // fingerprint db (optional)
      try {
        const [rows] = await tx.execute(sql`SELECT DATABASE() as dbName, @@hostname as dbHost`);
        const { dbName, dbHost } = (rows as any)[0] || {};
        console.log(`[createDevelopment] !!! SAFE INSERT ACTIVE !!! (DB: ${dbName} @ ${dbHost})`);
      } catch (e) {
        console.warn('DB Fingerprint failed', e);
      }

      let insertResult: any;
      try {
        [insertResult] = await tx.insert(developments).values(insertPayload);
      } catch (insertErr: any) {
        console.error('='.repeat(50));
        console.error('[createDevelopment] ⛔ RAW DB INSERT ERROR:');
        console.error('  message:', insertErr?.message);
        console.error('  code:', insertErr?.code);
        console.error('  errno:', insertErr?.errno);
        console.error('  sqlMessage:', insertErr?.sqlMessage);
        console.error('  sqlState:', insertErr?.sqlState);
        console.error('  sql (first 300 chars):', insertErr?.sql?.substring?.(0, 300));
        console.error('='.repeat(50));
        throw insertErr;
      }

      console.log('[createDevelopment] Raw insert result:', JSON.stringify(insertResult, null, 2));
      const newId = Number(insertResult.insertId);

      let persistedCount = 0;
      if (unitTypesData && Array.isArray(unitTypesData) && unitTypesData.length > 0) {
        await persistUnitTypes(tx, newId, unitTypesData);

        const [{ count }] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(unitTypes)
          .where(eq(unitTypes.developmentId, newId));

        console.log(
          `[createDevelopment] Verification read: ${count} units persisted (expected >= 1)`,
        );

        if (Number(count) === 0) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Unit types were provided but none were persisted. Aborting create.',
          });
        }
        persistedCount = Number(count);
      }

      return { newId, persistedCount };
    });

    resultId = createdDev.newId;
    unitTypesCount = createdDev.persistedCount;
  } catch (error: any) {
    console.error('[createDevelopment] ⛔ RAW INSERT ERROR:', {
      message: error?.message,
      code: error?.code,
      errno: error?.errno,
      sqlMessage: error?.sqlMessage,
      sqlState: error?.sqlState,
      sql: error?.sql?.substring?.(0, 500),
    });
    if (error?.cause) {
      console.error('[createDevelopment] ⛔ CAUSE:', {
        message: error.cause?.message,
        code: error.cause?.code,
        errno: error.cause?.errno,
        sqlMessage: error.cause?.sqlMessage,
      });
    }
    handleDatabaseError(error, {
      developerId: developerProfileId,
      devOwnerType: effectiveOwnerType,
      developerBrandProfileId: resolvedBrandProfileId ?? null,
    });
  }

  const [created] = await db
    .select()
    .from(developments)
    .where(eq(developments.id, resultId))
    .limit(1);

  if (!created) {
    throw new Error(`Development created but not found on retrieval. ID: ${resultId}`);
  }

  if (typeof unitTypesCount === 'number') {
    (created as any).unitTypesCount = unitTypesCount;
  }

  return created;
}

/// ===========================================================================
// UPDATE DEVELOPMENT (FIX: userId -> developer profile id ownership check)
// ===========================================================================

export async function updateDevelopment(
  id: number,
  userId: number,
  data: CreateDevelopmentData,
  operatingContext?: { brandProfileId: number } | null,
) {
  data = flattenCanonicalDevelopmentPayload(data as Record<string, any>, {
    mode: isCanonicalPartialDevelopmentUpdate(data) ? 'partial_update' : 'full',
  }) as CreateDevelopmentData;
  const updateIntent = resolveDevelopmentUpdateIntent(data);

  console.log('[updateDevelopment] Starting update for development:', id);
  console.log('[updateDevelopment] Payload keys:', Object.keys(data));
  console.log('[updateDevelopment] Unit types update mode:', updateIntent.unitTypesMode);

  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // ✅ Resolve developer PROFILE id from user id (same as createDevelopment)
  let developerProfileId: number | null = null;
  let superAdminBrandProfileId: number | null = null;

  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, userId),
    columns: { id: true, role: true },
  });

  if (user?.role === 'super_admin' && operatingContext?.brandProfileId) {
    superAdminBrandProfileId = operatingContext.brandProfileId;
  } else {
    const devProfile = await db.query.developers.findFirst({
      where: eq(developers.userId, userId),
      columns: { id: true },
    });

    if (!devProfile) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Developer profile for user ID ${userId} not found`,
      });
    }

    developerProfileId = devProfile.id;
  }

  const {
    unitTypes: unitTypesData,
    amenities: amenitiesData,
    estateSpecs: estateSpecsData,
    specifications: specificationsData,
    phases: phasesData,
    highlights: highlightsData,
    features: featuresData,
    videos: videosData,
    floorPlans: floorPlansData,
    brochures: brochuresData,
    images: imagesData,
    ...developmentData
  } = data as any;
  const effectiveUnitTypesData = updateIntent.unitTypesMode === 'none' ? undefined : unitTypesData;

  const updatePayload: Record<string, any> = {};

  // ---------------------------------------------------------------------------
  // Basic strings
  // ---------------------------------------------------------------------------
  if (developmentData.name !== undefined) {
    const name = sanitizeString(developmentData.name);
    if (name === null) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid name' });
    }
    updatePayload.name = name;
  }
  if (developmentData.description !== undefined)
    updatePayload.description = sanitizeString(developmentData.description);
  if (developmentData.tagline !== undefined)
    updatePayload.tagline = sanitizeString(developmentData.tagline);
  if (developmentData.subtitle !== undefined)
    updatePayload.subtitle = sanitizeString(developmentData.subtitle);

  Object.assign(updatePayload, buildDevelopmentWorkflowStateColumns(developmentData));

  // ---------------------------------------------------------------------------
  // Categorization / types
  // ---------------------------------------------------------------------------
  if (developmentData.developmentType !== undefined)
    updatePayload.developmentType = requireEnum(
      developmentData.developmentType,
      ['residential', 'commercial', 'mixed_use', 'land'],
      'developmentType',
    );
  if (developmentData.transactionType !== undefined)
    updatePayload.transactionType = normalizeTransactionType(developmentData.transactionType);
  if (developmentData.propertyCategory !== undefined)
    updatePayload.propertyCategory = developmentData.propertyCategory;
  if (developmentData.subCategory !== undefined)
    updatePayload.subCategory = developmentData.subCategory;

  // ---------------------------------------------------------------------------
  // Address / geo
  // ---------------------------------------------------------------------------
  if (developmentData.address !== undefined)
    updatePayload.address = sanitizeString(developmentData.address);
  if (developmentData.suburb !== undefined)
    updatePayload.suburb = sanitizeString(developmentData.suburb);
  if (developmentData.city !== undefined) updatePayload.city = developmentData.city;
  if (developmentData.province !== undefined) updatePayload.province = developmentData.province;
  if (developmentData.postalCode !== undefined)
    updatePayload.postalCode = sanitizeString(developmentData.postalCode);
  if (developmentData.latitude !== undefined) updatePayload.latitude = developmentData.latitude;
  if (developmentData.longitude !== undefined) updatePayload.longitude = developmentData.longitude;

  // ---------------------------------------------------------------------------
  // Status / dates
  // ---------------------------------------------------------------------------
  if (developmentData.launchDate !== undefined)
    updatePayload.launchDate = sanitizeDevelopmentDate(developmentData.launchDate);
  if (developmentData.completionDate !== undefined)
    updatePayload.completionDate = sanitizeDevelopmentDate(developmentData.completionDate);
  if (developmentData.marketingRole !== undefined) {
    updatePayload.marketingRole = sanitizeEnum(
      developmentData.marketingRole,
      ['exclusive', 'joint', 'open'],
      null,
    );
  }
  if (developmentData.gpsAccuracy !== undefined) {
    updatePayload.gpsAccuracy = sanitizeEnum(
      developmentData.gpsAccuracy,
      ['accurate', 'approximate'],
      null,
    );
  }
  if (developmentData.nature !== undefined) {
    updatePayload.nature = sanitizeEnum(
      developmentData.nature,
      ['new', 'phase', 'extension', 'redevelopment'],
      'new',
    );
  }
  if (developmentData.status !== undefined) {
    updatePayload.status = requireEnum(
      developmentData.status,
      ['launching-soon', 'selling', 'sold-out'],
      'status',
    );
  }

  // ---------------------------------------------------------------------------
  // Numeric fields (pass-through)
  // ---------------------------------------------------------------------------
  const decimalFields = new Set([
    'monthlyLevyFrom',
    'monthlyLevyTo',
    'ratesFrom',
    'ratesTo',
    'monthlyRentFrom',
    'monthlyRentTo',
  ]);

  const intFields = new Set([
    'priceFrom',
    'priceTo',
    'totalUnits',
    'availableUnits',
    'totalDevelopmentArea',
    'erfSizeFrom',
    'erfSizeTo',
    'floorSizeFrom',
    'floorSizeTo',
    'bedroomsFrom',
    'bedroomsTo',
    'bathroomsFrom',
    'bathroomsTo',
  ]);

  decimalFields.forEach(field => {
    if ((developmentData as any)[field] === undefined) return;
    updatePayload[field] = sanitizeDecimal((developmentData as any)[field]);
  });

  intFields.forEach(field => {
    if ((developmentData as any)[field] === undefined) return;
    updatePayload[field] = sanitizeInt((developmentData as any)[field]);
  });

  // ---------------------------------------------------------------------------
  // Boolean-ish fields (pass-through)
  // ---------------------------------------------------------------------------
  const booleanFields = [
    'petsAllowed',
    'fibreReady',
    'solarReady',
    'waterBackup',
    'backupPower',
    'gatedCommunity',
    'featured',
    'isPhasedDevelopment',
  ] as const;

  booleanFields.forEach(field => {
    if ((developmentData as any)[field] !== undefined)
      updatePayload[field] = (developmentData as any)[field];
  });

  if (developmentData.transferCostsIncluded !== undefined) {
    updatePayload.transferCostsIncluded = normalizeOptionalTinyIntFlag(
      developmentData.transferCostsIncluded,
    );
  }

  // ---------------------------------------------------------------------------
  // Media / amenities / json-ish columns
  // NOTE: your DB snapshot showed:
  // - amenities = TEXT
  // - highlights = JSON
  // - features = JSON
  //
  // So:
  // - always JSON.stringify arrays/objects going into highlights/features
  // - amenities we also store as JSON string for consistency
  // ---------------------------------------------------------------------------
  if (imagesData !== undefined) {
    updatePayload.images =
      typeof imagesData === 'string' ? imagesData : JSON.stringify(normalizeImages(imagesData));
  }

  if (videosData !== undefined) {
    updatePayload.videos =
      typeof videosData === 'string' ? videosData : JSON.stringify(videosData || []);
  }

  if (floorPlansData !== undefined) {
    updatePayload.floorPlans =
      typeof floorPlansData === 'string' ? floorPlansData : JSON.stringify(floorPlansData || []);
  }

  if (brochuresData !== undefined) {
    updatePayload.brochures =
      typeof brochuresData === 'string' ? brochuresData : JSON.stringify(brochuresData || []);
  }

  if (amenitiesData !== undefined) {
    // store as JSON string (amenities column is TEXT in your snapshot)
    updatePayload.amenities =
      typeof amenitiesData === 'string'
        ? amenitiesData
        : JSON.stringify(normalizeAmenities(amenitiesData));
  }

  if (highlightsData !== undefined) {
    updatePayload.highlights =
      typeof highlightsData === 'string' ? highlightsData : stringifyJsonValue(highlightsData, []);
  }

  if (featuresData !== undefined) {
    updatePayload.features =
      typeof featuresData === 'string' ? featuresData : stringifyJsonValue(featuresData, []);
  }

  // ---------------------------------------------------------------------------
  // Ownership / structural
  // ---------------------------------------------------------------------------
  if (developmentData.ownershipType !== undefined)
    updatePayload.ownershipType = sanitizeEnum(
      developmentData.ownershipType,
      ['full-title', 'sectional-title', 'leasehold', 'life-rights'],
      null,
    );
  if (developmentData.floors !== undefined)
    updatePayload.floors = sanitizeEnum(
      developmentData.floors,
      ['single-storey', 'double-storey', 'triplex'],
      null,
    );
  if (developmentData.structuralType !== undefined)
    updatePayload.structuralType = sanitizeEnum(
      developmentData.structuralType,
      [
        'apartment',
        'freestanding-house',
        'simplex',
        'duplex',
        'penthouse',
        'plot-and-plan',
        'townhouse',
        'studio',
      ],
      null,
    );

  // ---------------------------------------------------------------------------
  // Governance finance mirrors preserve canonical step data for edit hydration.
  // ---------------------------------------------------------------------------
  const governanceEstateSpecs = buildDevelopmentGovernanceEstateSpecs(
    developmentData as Record<string, any>,
    estateSpecsData,
  );
  if (governanceEstateSpecs.hasOwnedFields) {
    updatePayload.estateSpecs = stringifyJsonValue(governanceEstateSpecs.estateSpecs, {});
  }

  // ---------------------------------------------------------------------------
  // Specifications + per-type configs
  // ---------------------------------------------------------------------------
  if (specificationsData !== undefined) {
    updatePayload.specifications =
      typeof specificationsData === 'string'
        ? specificationsData
        : JSON.stringify(specificationsData || {});
  }

  if (developmentData.residentialConfig !== undefined) {
    updatePayload.residentialConfig =
      typeof developmentData.residentialConfig === 'string'
        ? developmentData.residentialConfig
        : JSON.stringify(developmentData.residentialConfig || {});
  }
  if (developmentData.landConfig !== undefined) {
    updatePayload.landConfig =
      typeof developmentData.landConfig === 'string'
        ? developmentData.landConfig
        : JSON.stringify(developmentData.landConfig || {});
  }
  if (developmentData.commercialConfig !== undefined) {
    updatePayload.commercialConfig =
      typeof developmentData.commercialConfig === 'string'
        ? developmentData.commercialConfig
        : JSON.stringify(developmentData.commercialConfig || {});
  }
  if (developmentData.mixedUseConfig !== undefined) {
    updatePayload.mixedUseConfig =
      typeof developmentData.mixedUseConfig === 'string'
        ? developmentData.mixedUseConfig
        : JSON.stringify(developmentData.mixedUseConfig || {});
  }

  // ---------------------------------------------------------------------------
  // SEO
  // ---------------------------------------------------------------------------
  if (developmentData.metaTitle !== undefined) updatePayload.metaTitle = developmentData.metaTitle;
  if (developmentData.metaDescription !== undefined)
    updatePayload.metaDescription = developmentData.metaDescription;

  // keywords column does not exist in DB; do not write

  // ---------------------------------------------------------------------------
  // Branding / agent
  // ---------------------------------------------------------------------------
  if (developmentData.brandProfileId !== undefined) {
    updatePayload.developerBrandProfileId = developmentData.brandProfileId;
  }
  if (developmentData.agentId !== undefined) updatePayload.agentId = developmentData.agentId;

  const effectiveTransactionType =
    updatePayload.transactionType ??
    (developmentData.transactionType
      ? normalizeTransactionType(developmentData.transactionType)
      : undefined);
  const previousTransactionType =
    effectiveTransactionType && developmentData.transactionType !== undefined
      ? await getCurrentDevelopmentTransactionTypeForUpdate(
          db,
          id,
          developerProfileId,
          superAdminBrandProfileId,
        )
      : null;
  const transactionTypeChanged =
    Boolean(effectiveTransactionType && previousTransactionType) &&
    previousTransactionType !== effectiveTransactionType;

  if (
    transactionTypeChanged &&
    updateIntent.deleteMissingUnitTypes === false &&
    Array.isArray(effectiveUnitTypesData)
  ) {
    await assertPartialTransactionSwitchOwnsFullInventory(db, id, effectiveUnitTypesData);
  }

  const aggregateUnitTypesData = Array.isArray(effectiveUnitTypesData)
    ? await resolveUnitTypesForUpdateAggregates(db, id, effectiveUnitTypesData, {
        deleteMissing: updateIntent.deleteMissingUnitTypes,
      })
    : undefined;
  const inventoryAggregates = buildDevelopmentInventoryAggregates(aggregateUnitTypesData);

  if (inventoryAggregates) {
    updatePayload.totalUnits = inventoryAggregates.totalUnits;
    updatePayload.availableUnits = inventoryAggregates.availableUnits;
  }

  if (
    effectiveTransactionType &&
    shouldRecomputeDevelopmentTransactionAggregates(developmentData, effectiveUnitTypesData, {
      transactionTypeChanged,
    })
  ) {
    Object.assign(
      updatePayload,
      normalizeDevelopmentTransactionAggregatesForDb(
        buildDevelopmentTransactionAggregates(
          effectiveTransactionType,
          developmentData as Record<string, unknown>,
          aggregateUnitTypesData,
        ),
      ),
    );
  }

  updatePayload.updatedAt = mysqlDateTime();

  console.log('[updateDevelopment] Update payload fields:', Object.keys(updatePayload));

  // ✅ Ownership check done in WHERE by developerProfileId
  if (superAdminBrandProfileId !== null) {
    await db
      .update(developments)
      .set(updatePayload)
      .where(
        and(
          eq(developments.id, id),
          eq(developments.developerBrandProfileId, superAdminBrandProfileId),
        ),
      );
  } else {
    await db
      .update(developments)
      .set(updatePayload)
      .where(and(eq(developments.id, id), eq(developments.developerId, developerProfileId!)));
  }

  const updated = await db.query.developments.findFirst({
    where:
      superAdminBrandProfileId !== null
        ? and(
            eq(developments.id, id),
            eq(developments.developerBrandProfileId, superAdminBrandProfileId),
          )
        : and(eq(developments.id, id), eq(developments.developerId, developerProfileId!)),
  });

  if (!updated) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Update failed or you do not own this development',
    });
  }

  // Unit types (safe persistence helper handles no-wipe)
  if (effectiveUnitTypesData !== undefined) {
    if (Array.isArray(effectiveUnitTypesData)) {
      if (effectiveUnitTypesData.length === 0) {
        console.warn('[updateDevelopment] Empty unitTypes - deleting all existing unit types');
      }
      await persistUnitTypes(db, id, effectiveUnitTypesData, {
        deleteMissing: updateIntent.deleteMissingUnitTypes,
      });
    } else {
      console.warn('[updateDevelopment] unitTypes is not an array:', typeof effectiveUnitTypesData);
    }
  } else {
    console.log('[updateDevelopment] No unitTypes in payload - preserving existing');
  }

  // Phases (must respect INT auto_increment ids)
  if (phasesData !== undefined && Array.isArray(phasesData)) {
    await persistDevelopmentPhases(db, id, phasesData);
  }

  console.log('[updateDevelopment] Update completed successfully');
  return { success: true };
}

// ===========================================================================
//// ===========================================================================
// UNIT TYPE PERSISTENCE HELPERS
// ===========================================================================

const asInt = (val: any, fallback: number = 0): number => {
  if (val === undefined || val === null || val === '') return fallback;
  const num = parseInt(String(val), 10);
  return Number.isFinite(num) ? num : fallback;
};

const asStringOrNull = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length ? s : null;
};

const asDecimalOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const asDateOnlyOrNull = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!s) return null;
  return s.length >= 10 ? s.slice(0, 10) : null;
};

const asDateTimeOrNull = (v: unknown): string | null => {
  if (v === undefined || v === null || v === '') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 19).replace('T', ' ');
  }
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!s) return null;
  if (s.includes('T')) return s.replace('T', ' ').slice(0, 19);
  if (s.includes(' ')) return s.slice(0, 19);
  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 19).replace('T', ' ');
};

function normalizeDevelopmentTransactionAggregatesForDb<T extends Record<string, any>>(
  aggregates: T,
): T {
  return {
    ...aggregates,
    auctionStartDate: asDateTimeOrNull(aggregates.auctionStartDate),
    auctionEndDate: asDateTimeOrNull(aggregates.auctionEndDate),
  };
}

type DevelopmentInventoryAggregates = {
  totalUnits: number;
  availableUnits: number;
};

function buildDevelopmentInventoryAggregates(
  unitTypesData?: Array<Record<string, any>> | null,
): DevelopmentInventoryAggregates | null {
  if (!Array.isArray(unitTypesData)) return null;

  return unitTypesData.reduce<DevelopmentInventoryAggregates>(
    (acc, unit) => {
      const totalUnits = Math.max(0, sanitizeInt(unit?.totalUnits) ?? 0);
      const reservedUnits = Math.min(Math.max(0, sanitizeInt(unit?.reservedUnits) ?? 0), totalUnits);
      const availableUnits = Math.min(
        Math.max(0, sanitizeInt(unit?.availableUnits) ?? 0),
        Math.max(0, totalUnits - reservedUnits),
      );

      return {
        totalUnits: acc.totalUnits + totalUnits,
        availableUnits: acc.availableUnits + availableUnits,
      };
    },
    { totalUnits: 0, availableUnits: 0 },
  );
}

const normalizeParkingKind = (v: unknown): 'none' | 'open' | 'covered' | 'carport' | 'garage' => {
  const s = String(v ?? '')
    .trim()
    .toLowerCase();
  if (s === '1' || s === '2') return 'open';
  if (['none', 'open', 'covered', 'carport', 'garage'].includes(s)) return s as any;
  return 'none';
};

const mysqlDateTime = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

const mergeUnitObjectField = (existingValue: unknown, incomingValue: unknown) => {
  if (incomingValue === undefined) return existingValue;
  if (incomingValue === null) return incomingValue;

  const existingObject = parseJsonMaybeTwice<Record<string, unknown>>(existingValue, {});
  const incomingObject = parseJsonMaybeTwice<Record<string, unknown>>(incomingValue, {});
  if (
    existingObject &&
    incomingObject &&
    typeof existingObject === 'object' &&
    typeof incomingObject === 'object' &&
    !Array.isArray(existingObject) &&
    !Array.isArray(incomingObject)
  ) {
    return { ...existingObject, ...incomingObject };
  }

  return incomingValue;
};

const MERGED_UNIT_OBJECT_FIELDS = new Set([
  'baseMedia',
  'specifications',
  'specOverrides',
  'baseFeatures',
  'baseFinishes',
  'amenities',
  'features',
]);

const mergeDefinedUnitFields = (
  existingUnit: Record<string, any>,
  incomingUnit: Record<string, any>,
) => {
  const merged = { ...existingUnit };
  for (const [key, value] of Object.entries(incomingUnit)) {
    if (value !== undefined) {
      merged[key] = MERGED_UNIT_OBJECT_FIELDS.has(key)
        ? mergeUnitObjectField(existingUnit[key], value)
        : value;
    }
  }
  if (incomingUnit.basePriceFrom !== undefined && incomingUnit.priceFrom === undefined) {
    merged.priceFrom = incomingUnit.basePriceFrom;
  }
  if (incomingUnit.priceFrom !== undefined && incomingUnit.basePriceFrom === undefined) {
    merged.basePriceFrom = incomingUnit.priceFrom;
  }
  if (incomingUnit.basePriceTo !== undefined && incomingUnit.priceTo === undefined) {
    merged.priceTo = incomingUnit.basePriceTo;
  }
  if (incomingUnit.priceTo !== undefined && incomingUnit.basePriceTo === undefined) {
    merged.basePriceTo = incomingUnit.priceTo;
  }
  return merged;
};

export const DEVELOPMENT_TRANSACTION_AGGREGATE_FIELDS = [
  'priceFrom',
  'priceTo',
  'monthlyRentFrom',
  'monthlyRentTo',
  'auctionStartDate',
  'auctionEndDate',
  'startingBidFrom',
  'reservePriceFrom',
] as const;

export function hasExplicitDevelopmentAggregateInput(
  developmentData: Record<string, any>,
): boolean {
  return DEVELOPMENT_TRANSACTION_AGGREGATE_FIELDS.some(
    field => developmentData[field] !== undefined,
  );
}

export function shouldRecomputeDevelopmentTransactionAggregates(
  developmentData: Record<string, any>,
  unitTypesData: unknown,
  options: { transactionTypeChanged?: boolean } = {},
): boolean {
  return (
    Array.isArray(unitTypesData) ||
    hasExplicitDevelopmentAggregateInput(developmentData) ||
    options.transactionTypeChanged === true
  );
}

async function getCurrentDevelopmentTransactionTypeForUpdate(
  db: any,
  developmentId: number,
  developerProfileId: number | null,
  superAdminBrandProfileId: number | null,
): Promise<TransactionType | null> {
  const ownershipCondition =
    superAdminBrandProfileId !== null
      ? and(
          eq(developments.id, developmentId),
          eq(developments.developerBrandProfileId, superAdminBrandProfileId),
        )
      : and(eq(developments.id, developmentId), eq(developments.developerId, developerProfileId!));

  const [currentDevelopment] = await db
    .select({ transactionType: developments.transactionType })
    .from(developments)
    .where(ownershipCondition)
    .limit(1);

  return currentDevelopment ? normalizeTransactionType(currentDevelopment.transactionType) : null;
}

async function resolveUnitTypesForUpdateAggregates(
  db: any,
  developmentId: number,
  incomingUnits: unknown[],
  options: { deleteMissing?: boolean } = {},
): Promise<Array<Record<string, unknown>>> {
  if (incomingUnits.length === 0) return [];

  const existingUnits = await db
    .select()
    .from(unitTypes)
    .where(eq(unitTypes.developmentId, developmentId));
  const existingIds = new Set<string>(
    existingUnits.map((unit: any) => String(unit.id ?? '').trim()).filter(Boolean),
  );
  const existingUnitsById = new Map<string, Record<string, any>>(
    existingUnits
      .map((unit: any) => [String(unit.id ?? '').trim(), unit] as const)
      .filter(([unitId]) => Boolean(unitId)),
  );
  const normalizedIncoming = incomingUnits.filter(isRecord).map(unit => ({
    ...unit,
    normalizedId: unit.id ? String(unit.id).trim() : null,
  }));
  const matchingIncomingIds = new Set<string>(
    normalizedIncoming
      .filter(unit => unit.normalizedId && existingIds.has(unit.normalizedId))
      .map(unit => unit.normalizedId!),
  );
  const safeToDelete =
    options.deleteMissing !== false && (existingIds.size === 0 || matchingIncomingIds.size > 0);
  const mergedIncoming = normalizedIncoming.map(unit => {
    const { normalizedId, ...incomingUnit } = unit;
    const existingUnit = normalizedId ? existingUnitsById.get(normalizedId) : undefined;
    return existingUnit ? mergeDefinedUnitFields(existingUnit, incomingUnit) : incomingUnit;
  });

  if (safeToDelete) {
    return mergedIncoming;
  }

  const incomingIds = new Set<string>(
    normalizedIncoming.map(unit => unit.normalizedId).filter(Boolean) as string[],
  );
  const preservedExistingUnits = existingUnits.filter((unit: any) => {
    const unitId = String(unit.id ?? '').trim();
    return unitId && !incomingIds.has(unitId);
  });

  return [...preservedExistingUnits, ...mergedIncoming];
}

async function assertPartialTransactionSwitchOwnsFullInventory(
  db: any,
  developmentId: number,
  incomingUnits: unknown[],
) {
  const existingUnits = await db
    .select({ id: unitTypes.id })
    .from(unitTypes)
    .where(eq(unitTypes.developmentId, developmentId));
  const existingIds = new Set<string>(
    existingUnits.map((unit: any) => String(unit.id ?? '').trim()).filter(Boolean),
  );

  if (existingIds.size === 0) return;

  const incomingIds = new Set<string>(
    incomingUnits
      .filter(isRecord)
      .map(unit => (unit.id ? String(unit.id).trim() : ''))
      .filter(Boolean),
  );
  const missingIds = Array.from(existingIds).filter(id => !incomingIds.has(id));

  if (missingIds.length > 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message:
        'Changing transaction type from a partial unit_types save requires a full unit_types snapshot.',
      cause: {
        missingUnitTypeIds: missingIds,
      } as any,
    });
  }
}

const asJsonArrayValue = (value: unknown): unknown[] => {
  const parsed = parseJsonMaybeTwice<unknown>(value, []);
  return Array.isArray(parsed) ? parsed : [];
};

const asJsonObjectValue = (value: unknown, fallback: Record<string, unknown>) => {
  const parsed = parseJsonMaybeTwice<unknown>(value, fallback);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }
  return fallback;
};

const asSafeUnitTypeId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 36) return null;
  return /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(trimmed) ? trimmed : null;
};

// ===========================================================================
// PERSIST UNIT TYPES (SAFETY: no accidental wipe on ID mismatch)
// ===========================================================================

export async function persistUnitTypes(
  db: any,
  developmentId: number,
  unitTypesData: any[],
  options: { deleteMissing?: boolean } = {},
): Promise<void> {
  console.log(
    `[persistUnitTypes] Processing ${unitTypesData?.length ?? 0} units for development ${developmentId}`,
  );
  if (unitTypesData?.length > 0) {
    console.log(
      '[persistUnitTypes] DEBUG FIRST UNIT RAW:',
      JSON.stringify(unitTypesData[0], null, 2),
    );
  }

  if (!unitTypesData) {
    console.log('[persistUnitTypes] Missing payload - preserving existing units');
    return;
  }

  const existingUnits = await db
    .select()
    .from(unitTypes)
    .where(eq(unitTypes.developmentId, developmentId));

  // IMPORTANT: unitTypes.id type must be string/uuid(36) in your DB for this to work.
  // If unitTypes.id is INT auto_increment, tell me and I'll rewrite this to use numbers + insertId.
  const existingIds = new Set<string>(
    existingUnits.map((u: any) => String(u.id ?? '').trim()).filter(Boolean),
  );
  const existingUnitsById = new Map<string, Record<string, any>>(
    existingUnits
      .map((u: any) => [String(u.id ?? '').trim(), u] as const)
      .filter(([id]) => Boolean(id)),
  );

  if (unitTypesData.length === 0) {
    if (options.deleteMissing === false) {
      console.log('[persistUnitTypes] Empty patch payload - preserving existing units');
      return;
    }
    if (existingIds.size > 0) {
      console.log(`[persistUnitTypes] Empty array payload - deleting ${existingIds.size} units`);
      await db.delete(unitTypes).where(eq(unitTypes.developmentId, developmentId));
    }
    return;
  }

  const [developmentTransaction] = await db
    .select({ transactionType: developments.transactionType })
    .from(developments)
    .where(eq(developments.id, developmentId))
    .limit(1);
  const effectiveTransactionType = normalizeTransactionType(
    developmentTransaction?.transactionType,
  );
  const isSaleUnit = effectiveTransactionType === 'for_sale';
  const isRentUnit = effectiveTransactionType === 'for_rent';
  const isAuctionUnit = effectiveTransactionType === 'auction';

  const normalizedIncoming = unitTypesData.map(u => ({
    ...u,
    normalizedId: u?.id ? String(u.id).trim() : null,
  }));

  const matchingIncomingIds = new Set<string>(
    normalizedIncoming
      .filter(u => u.normalizedId && existingIds.has(u.normalizedId))
      .map(u => u.normalizedId!),
  );

  // Full-sync inventory updates may delete omitted rows. Partial patch payloads preserve
  // omitted rows, whether they came from canonical stepData or the temporary legacy bridge.
  const safeToDelete =
    options.deleteMissing !== false && (existingIds.size === 0 || matchingIncomingIds.size > 0);

  if (safeToDelete) {
    const idsToDelete: string[] = Array.from(existingIds).filter(
      id => !matchingIncomingIds.has(id),
    );
    if (idsToDelete.length > 0) {
      console.log(`[persistUnitTypes] Deleting ${idsToDelete.length} units:`, idsToDelete);
      await db
        .delete(unitTypes)
        .where(and(eq(unitTypes.developmentId, developmentId), inArray(unitTypes.id, idsToDelete)));
    }
  } else if (options.deleteMissing === false) {
    console.log(
      '[persistUnitTypes] Unit types patch - preserving omitted existing units.',
      {
        existingCount: existingIds.size,
        incomingCount: normalizedIncoming.length,
        matchingIncomingCount: matchingIncomingIds.size,
      },
    );
  } else {
    console.warn(
      '[persistUnitTypes] SAFETY TRIP: No incoming IDs match existing DB IDs. Skipping deletion to prevent data loss.',
      {
        existingCount: existingIds.size,
        incomingCount: normalizedIncoming.length,
        incomingIdSample: normalizedIncoming.slice(0, 3).map(u => u.normalizedId),
      },
    );
  }

  for (const [unitIndex, unit] of normalizedIncoming.entries()) {
    const isNewUnit = !unit.normalizedId || !existingIds.has(unit.normalizedId);
    const unitId = isNewUnit
      ? (asSafeUnitTypeId(unit.normalizedId) ?? randomUUID())
      : unit.normalizedId!;
    const existingUnit = isNewUnit ? null : existingUnitsById.get(unitId);
    const unitData = existingUnit ? mergeDefinedUnitFields(existingUnit, unit) : unit;

    if (unitId.length > 36) {
      throw new Error(
        `Unit ID violation: '${unitId}' length (${unitId.length}) > 36. Aborting save.`,
      );
    }

    const legacyParkingBays =
      String(unitData.parkingType ?? '').trim() === '1'
        ? 1
        : String(unitData.parkingType ?? '').trim() === '2'
          ? 2
          : 0;
    const kind = normalizeParkingKind(unitData.parkingType);
    const rawBays = asInt(unitData.parkingBays ?? unitData.parkingSpaces ?? legacyParkingBays, 0);
    const parkingBays = kind === 'none' ? 0 : rawBays;
    const parkingType = kind === 'none' ? null : kind;

    const basePriceFrom = (() => {
      if (!isSaleUnit) return 0;

      const incomingBasePrice = asDecimalOrNull(unit.basePriceFrom);
      if (unit.basePriceFrom !== undefined && incomingBasePrice !== null) return incomingBasePrice;

      const incomingCanonicalPrice = asDecimalOrNull(unit.priceFrom);
      if (unit.priceFrom !== undefined && incomingCanonicalPrice !== null) {
        return incomingCanonicalPrice;
      }

      const storedBasePrice = asDecimalOrNull(unitData.basePriceFrom);
      if (storedBasePrice !== null) return storedBasePrice;

      const storedCanonicalPrice = asDecimalOrNull(unitData.priceFrom);
      if (storedCanonicalPrice !== null) return storedCanonicalPrice;

      console.warn(`UnitType ${unitId}: basePriceFrom missing, defaulting to 0`);
      return 0;
    })();
    const basePriceTo = (() => {
      if (!isSaleUnit) return null;

      const incomingBasePrice = asDecimalOrNull(unit.basePriceTo);
      if (unit.basePriceTo !== undefined && incomingBasePrice !== null) return incomingBasePrice;

      const incomingCanonicalPrice = asDecimalOrNull(unit.priceTo);
      if (unit.priceTo !== undefined && incomingCanonicalPrice !== null)
        return incomingCanonicalPrice;

      return asDecimalOrNull(unitData.basePriceTo ?? unitData.priceTo);
    })();

    const totalUnits = Math.max(0, sanitizeInt(unitData.totalUnits) ?? 0);
    const availableUnits = Math.max(0, sanitizeInt(unitData.availableUnits) ?? 0);
    const reservedUnits = Math.max(0, sanitizeInt((unitData as any).reservedUnits) ?? 0);
    if (availableUnits + reservedUnits > totalUnits) {
      const unitName = String(unitData.label || unitData.name || unitId).trim() || 'Unnamed Unit';
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Unit "${unitName}" has invalid inventory: available + reserved cannot exceed total.`,
      });
    }

    const unitPayload: Record<string, any> = {
      developmentId,

      // Keep both label+name populated for legacy UI compatibility
      label: unitData.label || unitData.name || 'Unnamed Unit',
      name: unitData.name || unitData.label || 'Unnamed Unit',

      // ✅ Avoid empty-string enums (store null instead)
      ownershipType: sanitizeEnum(
        unitData.ownershipType,
        ['full-title', 'sectional-title', 'leasehold', 'life-rights'],
        null,
      ),
      structuralType: sanitizeEnum(
        unitData.structuralType,
        [
          'apartment',
          'freestanding-house',
          'simplex',
          'duplex',
          'penthouse',
          'plot-and-plan',
          'townhouse',
          'studio',
        ],
        null,
      ),
      floors: sanitizeEnum(unitData.floors, ['single-storey', 'double-storey', 'triplex'], null),

      // Parking
      parkingType,
      parkingBays,

      // Numbers (keep DB happy)
      bedrooms: sanitizeInt(unitData.bedrooms) ?? 0,
      bathrooms: asDecimalOrNull(unitData.bathrooms) ?? 1.0,

      yardSize: sanitizeInt(unitData.yardSize),
      unitSize: sanitizeInt(unitData.unitSize),

      priceFrom: isSaleUnit ? asDecimalOrNull(unitData.priceFrom) : null,
      priceTo: isSaleUnit ? asDecimalOrNull(unitData.priceTo) : null,
      basePriceFrom,
      basePriceTo,
      monthlyRentFrom: isRentUnit
        ? asDecimalOrNull(unitData.monthlyRentFrom ?? unitData.monthlyRent)
        : null,
      monthlyRentTo: isRentUnit ? asDecimalOrNull(unitData.monthlyRentTo) : null,
      leaseTerm: isRentUnit ? asStringOrNull(unitData.leaseTerm) : null,
      isFurnished: isRentUnit && (unitData.isFurnished ?? unitData.furnished) ? 1 : 0,
      depositRequired: isRentUnit
        ? asDecimalOrNull(unitData.depositRequired ?? unitData.deposit)
        : null,
      startingBid: isAuctionUnit ? asDecimalOrNull(unitData.startingBid) : null,
      reservePrice: isAuctionUnit ? asDecimalOrNull(unitData.reservePrice) : null,
      auctionStartDate: isAuctionUnit ? asDateTimeOrNull(unitData.auctionStartDate) : null,
      auctionEndDate: isAuctionUnit ? asDateTimeOrNull(unitData.auctionEndDate) : null,
      auctionStatus: sanitizeEnum(
        isAuctionUnit ? unitData.auctionStatus : null,
        ['scheduled', 'registration_open', 'active', 'sold', 'passed_in', 'withdrawn'],
        'scheduled',
      ),

      availableUnits,
      totalUnits,
      reservedUnits,

      completionDate: asDateOnlyOrNull(unitData.completionDate),

      internalNotes: asStringOrNull(unitData.internalNotes),
      configDescription: asStringOrNull(unitData.configDescription),
      virtualTourLink: asStringOrNull(unitData.virtualTourLink),
      description: asStringOrNull(unitData.description),

      transferCostsIncluded: unitData.transferCostsIncluded ? 1 : 0,

      // JSON-ish columns stored as strings (safe for MySQL)
      extras: JSON.stringify(asJsonArrayValue(unitData.extras)),
      specifications: JSON.stringify(asJsonObjectValue(unitData.specifications, {})),
      specOverrides: JSON.stringify(asJsonObjectValue(unitData.specOverrides, {})),
      baseFeatures: JSON.stringify(asJsonObjectValue(unitData.baseFeatures, {})),
      baseFinishes: JSON.stringify(asJsonObjectValue(unitData.baseFinishes, {})),
      amenities: JSON.stringify(
        asJsonObjectValue(unitData.amenities, { standard: [], additional: [] }),
      ),

      // ✅ keep as OBJECT (stringified), never flatten to gallery array
      baseMedia: JSON.stringify({
        gallery: [],
        floorPlans: [],
        renders: [],
        ...asJsonObjectValue(unitData.baseMedia, {}),
      }),

      features: JSON.stringify(asJsonObjectValue(unitData.features, {})),

      updatedAt: mysqlDateTime(),
      isActive: 1,
      displayOrder: sanitizeInt(unitData.displayOrder) ?? unitIndex,
    };

    console.log(`[persistUnitTypes] Unit ${unitId} PROCESSED:`, {
      incoming_unitSize: unitData.unitSize,
      final_unitSize: unitPayload.unitSize,
      final_yardSize: unitPayload.yardSize,
    });

    if (isNewUnit) {
      await db.insert(unitTypes).values({
        ...unitPayload,
        id: unitId,
        createdAt: mysqlDateTime(),
      });
    } else {
      await db
        .update(unitTypes)
        .set(unitPayload)
        .where(and(eq(unitTypes.developmentId, developmentId), eq(unitTypes.id, unitId)));
    }
  }

  try {
    const finalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, developmentId));
    console.log(`[persistUnitTypes] DONE. DB count: ${finalCount[0]?.count ?? '?'}`);
  } catch (e) {
    console.warn('[persistUnitTypes] Verification count failed:', e);
  }
}

// ===========================================================================
// PERSIST DEVELOPMENT PHASES
// ===========================================================================
async function persistDevelopmentPhases(
  db: any,
  developmentId: number,
  phasesData: any[],
): Promise<void> {
  console.log(`[persistDevelopmentPhases] Processing ${phasesData?.length ?? 0} phases`);

  const safePhases = Array.isArray(phasesData) ? phasesData : [];

  // 1) Load existing phase IDs (INT)
  const existingPhases = await db
    .select({ id: developmentPhases.id })
    .from(developmentPhases)
    .where(eq(developmentPhases.developmentId, developmentId));

  const existingIds = new Set<number>(
    existingPhases.map((p: any) => Number(p.id)).filter((n: number) => Number.isFinite(n)),
  );

  // 2) Normalize incoming IDs (INT)
  const incomingIds = new Set<number>(
    safePhases
      .filter(p => p?.id !== undefined && p?.id !== null && p?.id !== '')
      .map(p => Number(p.id))
      .filter(n => Number.isFinite(n)),
  );

  // 3) Delete removed phases (full-sync)
  const idsToDelete = Array.from(existingIds).filter(id => !incomingIds.has(id));
  if (idsToDelete.length > 0) {
    await db
      .delete(developmentPhases)
      .where(
        and(
          eq(developmentPhases.developmentId, developmentId),
          inArray(developmentPhases.id, idsToDelete),
        ),
      );
  }

  // 4) Upsert phases
  for (const phase of safePhases) {
    const hasId = phase?.id !== undefined && phase?.id !== null && phase?.id !== '';
    const phaseId = hasId ? Number(phase.id) : null;

    const phasePayload: any = {
      developmentId,
      name: phase?.name || 'Unnamed Phase',
      description: phase?.description || null,
      status: phase?.status || 'planning',
      completionDate: phase?.completionDate || null,
      totalUnits: phase?.totalUnits ?? null,
      availableUnits: phase?.availableUnits ?? null,
      media: JSON.stringify(phase?.media || {}),
    };

    if (phaseId !== null && Number.isFinite(phaseId)) {
      // UPDATE (scoped by developmentId for safety)
      await db
        .update(developmentPhases)
        .set(phasePayload)
        .where(
          and(
            eq(developmentPhases.developmentId, developmentId),
            eq(developmentPhases.id, phaseId),
          ),
        );
    } else {
      // INSERT (do NOT include id; DB auto-increments it)
      await db.insert(developmentPhases).values({
        ...phasePayload,
        createdAt: mysqlDateTime(),
      });
    }
  }
}

// ===========================================================================
// GET DEVELOPMENT WITH PHASES (safe parses + canonical edit snapshot)
// ===========================================================================

export async function getDevelopmentWithPhases(id: number) {
  console.log('[getDevelopmentWithPhases] Loading development:', id);
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [dev] = await db.select().from(developments).where(eq(developments.id, id)).limit(1);
  if (!dev) throw new Error('Development not found');

  let unitTypesData: any[] = [];
  let phasesData: any[] = [];

  try {
    const [unitTypesRes, phasesRes] = await Promise.all([
      db
        .select()
        .from(unitTypes)
        .where(eq(unitTypes.developmentId, id))
        .orderBy(unitTypes.displayOrder),
      db.select().from(developmentPhases).where(eq(developmentPhases.developmentId, id)),
    ]);

    unitTypesData = unitTypesRes || [];
    phasesData = phasesRes || [];

    console.log(
      `[getDevelopmentWithPhases] Loaded ${unitTypesData.length} units, ${phasesData.length} phases`,
    );
  } catch (err: any) {
    console.error('[getDevelopmentWithPhases] Failed to load related data:', err);
  }

  const parse = (val: any, def: any) => {
    if (!val) return def;
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        console.warn('[getDevelopmentWithPhases] JSON parse failed for:', val);
        return def;
      }
    }
    return val;
  };

  // images/videos/floorPlans/brochures in this service are stored as JSON string (array), so keep parsing resilient
  const dbImages = parse((dev as any).images, []);
  const dbVideos = parse((dev as any).videos, []);
  const dbFloorPlans = parse((dev as any).floorPlans, []);
  const dbBrochures = parse((dev as any).brochures, []);

  // your table uses: amenities=text, highlights=json, features=json
  // so keep these parses tolerant of text/json mismatch
  const dbAmenities = normalizeAmenities((dev as any).amenities);
  const dbHighlights = parseJsonMaybeTwice((dev as any).highlights, []);
  const dbFeatures = parseJsonMaybeTwice((dev as any).features, []);

  const heroImage = Array.isArray(dbImages) ? ((dbImages[0] as any)?.url ?? dbImages[0]) : null;
  const media = {
    photos: Array.isArray(dbImages) ? dbImages : [],
    videos: Array.isArray(dbVideos) ? dbVideos : [],
    floorPlans: Array.isArray(dbFloorPlans) ? dbFloorPlans : [],
    brochures: Array.isArray(dbBrochures) ? dbBrochures : [],
    documents: Array.isArray(dbBrochures) ? dbBrochures : [],
    heroImage: heroImage ? { url: heroImage } : undefined,
  };
  const estateSpecs = parse((dev as any).estateSpecs, {});
  const specifications = parse((dev as any).specifications, {});
  const residentialConfig = parse((dev as any).residentialConfig, {});
  const landConfig = parse((dev as any).landConfig, {});
  const commercialConfig = parse((dev as any).commercialConfig, {});
  const mixedUseConfig = parse((dev as any).mixedUseConfig, {});
  const hydratedUnitTypes = (unitTypesData || []).map(u => ({
    ...u,
    extras: parse((u as any).extras, []),
    specifications: parse((u as any).specifications, {}),
    amenities: parse((u as any).amenities, { standard: [], additional: [] }),
    baseFeatures: parse((u as any).baseFeatures, {}),
    baseFinishes: parse((u as any).baseFinishes, {}),
    specOverrides: parse((u as any).specOverrides, {}),
    features: parse((u as any).features, {}),
    baseMedia: parse((u as any).baseMedia, { gallery: [], floorPlans: [], renders: [] }),
  }));
  const canonicalSnapshot = buildDevelopmentCanonicalEditSnapshot({
    dev,
    media,
    amenities: Array.isArray(dbAmenities) ? dbAmenities : [],
    highlights: Array.isArray(dbHighlights) ? dbHighlights : [],
    features: Array.isArray(dbFeatures) ? dbFeatures : [],
    unitTypes: hydratedUnitTypes,
    parseJson: parse,
  });

  return {
    ...dev,
    ...canonicalSnapshot,

    images: dbImages,
    media,

    // match actual column types
    amenities: Array.isArray(dbAmenities) ? dbAmenities : [],
    highlights: Array.isArray(dbHighlights) ? dbHighlights : [],
    features: Array.isArray(dbFeatures) ? dbFeatures : [],

    // keep these safe (they often flip between TEXT/JSON depending on migrations)
    estateSpecs,
    specifications,
    residentialConfig,
    landConfig,
    commercialConfig,
    mixedUseConfig,

    // Legacy root shape remains DB-compatible while stepData.unit_types is the canonical edit source.
    unitTypes: hydratedUnitTypes,

    phases: (phasesData || []).map(p => ({
      ...p,
      media: parse((p as any).media, {}),
    })),
  };
}

// ===========================================================================
// OTHER HELPERS / WORKFLOWS
// ===========================================================================

async function getDevelopmentsByDeveloperId(developerProfileId: number) {
  const db = await getDb();
  if (!db) return [];

  const results = await db
    .select()
    .from(developments)
    .where(eq(developments.developerId, developerProfileId));

  const safeParse = (val: any, fallback: any) => {
    if (val === null || val === undefined || val === '') return fallback;
    if (Array.isArray(val) || typeof val === 'object') return val;
    if (typeof val === 'string') {
      return parseJsonMaybeTwice(val, fallback);
    }
    return fallback;
  };

  const safeArray = (val: any) => (Array.isArray(val) ? val : []);

  return results.map((dev: any) => {
    // DB types you showed:
    // amenities = TEXT (may be JSON string or csv or plain string)
    // highlights = JSON
    // features  = JSON
    const amenities = normalizeAmenities(dev.amenities);
    const highlights = safeArray(safeParse(dev.highlights, []));
    const features = safeArray(safeParse(dev.features, []));

    return {
      ...dev,
      amenities,
      highlights,
      features,

      images: parseDevelopmentJsonArrayField(dev.images),
      videos: parseDevelopmentJsonArrayField(dev.videos),
      floorPlans: parseDevelopmentJsonArrayField(dev.floorPlans),
      brochures: parseDevelopmentJsonArrayField(dev.brochures),
    };
  });
}

async function createPhase(developmentId: number, developerId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // (optional but recommended) ownership check: dev must own the development
  const devProfile = await db.query.developers.findFirst({
    where: eq(developers.userId, developerId),
    columns: { id: true },
  });
  if (!devProfile)
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Developer profile not found' });

  const [owned] = await db
    .select({ id: developments.id })
    .from(developments)
    .where(and(eq(developments.id, developmentId), eq(developments.developerId, devProfile.id)))
    .limit(1);

  if (!owned) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Unauthorized: you do not own this development',
    });
  }

  // IMPORTANT: developmentPhases.id is INT auto_increment -> never pass id
  const { id, ...safe } = data || {};

  const [result] = await db.insert(developmentPhases).values({
    ...safe,
    developmentId,
    createdAt: mysqlDateTime(),
  });

  const [created] = await db
    .select()
    .from(developmentPhases)
    .where(eq(developmentPhases.id, Number(result.insertId)))
    .limit(1);

  return created;
}

async function updatePhase(phaseId: number, developerId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const idNum = Number(phaseId);
  if (!Number.isFinite(idNum)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid phaseId' });
  }

  // (optional but recommended) ownership check via phase -> development -> developer
  const devProfile = await db.query.developers.findFirst({
    where: eq(developers.userId, developerId),
    columns: { id: true },
  });
  if (!devProfile)
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Developer profile not found' });

  const [phaseRow] = await db
    .select({ developmentId: developmentPhases.developmentId })
    .from(developmentPhases)
    .where(eq(developmentPhases.id, idNum))
    .limit(1);

  if (!phaseRow) throw new TRPCError({ code: 'NOT_FOUND', message: 'Phase not found' });

  const [owned] = await db
    .select({ id: developments.id })
    .from(developments)
    .where(
      and(
        eq(developments.id, Number(phaseRow.developmentId)),
        eq(developments.developerId, devProfile.id),
      ),
    )
    .limit(1);

  if (!owned) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Unauthorized: you do not own this development',
    });
  }

  // IMPORTANT: never allow id changes
  const { id, ...safe } = data || {};

  await db.update(developmentPhases).set(safe).where(eq(developmentPhases.id, idNum));

  const [updated] = await db
    .select()
    .from(developmentPhases)
    .where(eq(developmentPhases.id, idNum))
    .limit(1);

  return updated;
}

async function publishDevelopment(
  id: number,
  userId: number,
  operatingContext?: { brandProfileId: number } | null,
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  console.log('[publishDevelopment] Input params:', {
    id,
    userId,
    operatingContext,
  });

  // Check user role FIRST before any validation
  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, userId),
    columns: { id: true, role: true },
  });

  // If super admin, bypass ALL checks
  if (user?.role === 'super_admin') {
    // Super admin mode - use brand profile from context
    const brandProfileId = operatingContext?.brandProfileId;

    console.log('[publishDevelopment] ✅ SUPER ADMIN MODE - Bypassing all checks:', {
      brandProfileId,
    });

    // First, get the development to verify it exists and check its brand
    const [existingDev] = await db
      .select()
      .from(developments)
      .where(eq(developments.id, id))
      .limit(1);

    if (!existingDev) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Development not found',
      });
    }

    console.log('[publishDevelopment] Development found:', {
      id: existingDev.id,
      name: existingDev.name,
      developerBrandProfileId: existingDev.developerBrandProfileId,
      requestedBrandProfileId: brandProfileId,
    });

    // Verify brand ownership if brandProfileId is provided
    if (brandProfileId && existingDev.developerBrandProfileId !== brandProfileId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Development belongs to brand ${existingDev.developerBrandProfileId}, not ${brandProfileId}`,
      });
    }

    await validatePersistedDevelopmentForPublish(id);

    // Publish it
    console.log('[publishDevelopment] About to execute UPDATE query for development:', id);

    try {
      // Format datetime for MySQL (YYYY-MM-DD HH:MM:SS)
      const publishedAtFormatted = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const updateResult = await db
        .update(developments)
        .set({
          isPublished: 1,
          approvalStatus: 'approved',
          publishedAt: publishedAtFormatted,
          ...buildPublishedDevelopmentWorkflowStateColumns(existingDev),
        })
        .where(eq(developments.id, id));

      console.log(
        '[publishDevelopment] ✅ Update query executed successfully, result:',
        updateResult,
      );
    } catch (dbError: any) {
      console.error('[publishDevelopment] ❌ Database error during UPDATE:', {
        developmentId: id,
        error: dbError,
        errorName: dbError?.name,
        errorMessage: dbError?.message,
        errorCode: dbError?.code,
        errorSql: dbError?.sql,
        errorStack: dbError?.stack,
      });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Database error: ${dbError?.message || dbError?.toString() || 'Unknown error'}`,
      });
    }

    console.log('[publishDevelopment] About to SELECT updated development');

    const [updated] = await db.select().from(developments).where(eq(developments.id, id)).limit(1);

    if (!updated) {
      console.error('[publishDevelopment] ❌ Development not found after update!');
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Publish failed: Could not retrieve updated development',
      });
    }

    console.log('[publishDevelopment] ✅ Super admin published development:', {
      id: updated.id,
      name: updated.name,
      isPublished: updated.isPublished,
      status: updated.status,
    });
    return updated;
  }

  // Real developer mode - check ownership
  const devProfile = await db.query.developers.findFirst({
    where: eq(developers.userId, userId),
    columns: { id: true },
  });

  if (!devProfile) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Developer profile not found' });
  }

  const [ownedDevelopment] = await db
    .select()
    .from(developments)
    .where(and(eq(developments.id, id), eq(developments.developerId, devProfile.id)))
    .limit(1);

  if (!ownedDevelopment) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Publish failed: Development not found or unauthorized',
    });
  }

  await validatePersistedDevelopmentForPublish(id);

  // Format datetime for MySQL (YYYY-MM-DD HH:MM:SS)
  const publishedAtFormatted = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await db
    .update(developments)
    .set({
      isPublished: 1,
      approvalStatus: 'approved',
      publishedAt: publishedAtFormatted,
      ...buildPublishedDevelopmentWorkflowStateColumns(ownedDevelopment),
    })
    .where(and(eq(developments.id, id), eq(developments.developerId, devProfile.id)));

  const [updated] = await db
    .select()
    .from(developments)
    .where(and(eq(developments.id, id), eq(developments.developerId, devProfile.id)))
    .limit(1);

  if (!updated) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Publish failed: Development not found or unauthorized',
    });
  }

  return updated;
}

async function approveDevelopment(id: number, adminId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [existingDev] = await db.select().from(developments).where(eq(developments.id, id)).limit(1);
  if (!existingDev) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Development not found' });
  }

  const now = mysqlDateTime();

  await db
    .update(developments)
    .set({
      approvalStatus: 'approved',
      isPublished: true as any,
      publishedAt: (existingDev as any).publishedAt ?? now,
      approvedAt: now,
      approvedBy: adminId,
      ...buildPublishedDevelopmentWorkflowStateColumns(existingDev),
    })
    .where(eq(developments.id, id));
}

async function rejectDevelopment(id: number, adminId: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db
    .update(developments)
    .set({
      isPublished: 0,
      approvalStatus: 'rejected' as any,
      rejectionReason: reason,
    })
    .where(eq(developments.id, id));
}

async function requestChanges(id: number, adminId: number, notes: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db
    .update(developments)
    .set({
      isPublished: 0,
      approvalStatus: 'pending_changes' as any,
      changeRequestNotes: notes,
    })
    .where(eq(developments.id, id));
}

async function unpublishDevelopment(id: number, adminId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database unavailable');

  await db
    .update(developments)
    .set({
      isPublished: 0,
      publishedAt: null,
      updatedAt: mysqlDateTime(),
    })
    .where(eq(developments.id, id));

  return { success: true, id, adminId };
}

// ===========================================================================
// DRAFT VS PUBLISH SEPARATION
// ===========================================================================

export async function saveDraft(
  developerId: number, // userId coming from auth/session
  wizardState: WizardData,
): Promise<{ draftId: number }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  if (!developerId) throw new Error('Developer ID is required');

  // ✅ resolve developer PROFILE id (developers.id) from userId
  const devProfile = await db.query.developers.findFirst({
    where: eq(developers.userId, developerId),
    columns: { id: true },
  });

  if (!devProfile) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Developer profile for user ID ${developerId} not found`,
    });
  }

  try {
    const draftPayload = {
      developerId: devProfile.id, // ✅ FK-compatible (developers.id)
      developerBrandProfileId: (wizardState as any).developerBrandProfileId || null,
      draftName: (wizardState as any).name || 'Untitled Draft',
      draftData: wizardState,
      progress: 0,
      currentStep: 0,
    };

    const [result] = await db.insert(developmentDrafts).values(draftPayload);
    return { draftId: result.insertId };
  } catch (error: any) {
    console.error('[saveDraft] Error:', error);
    throw new Error(`Failed to save draft: ${error.message}`);
  }
}

export async function publishDevelopmentStrict(
  developerId: number,
  wizardState: WizardData,
  ownerType: 'platform' | 'developer' = 'developer',
): Promise<{ developmentId: number; unitTypesCount: number }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  console.log('[publishDevelopmentStrict] Starting publish for developer:', developerId);

  let normalized: NormalizedDevelopmentPayload;
  try {
    normalized = normalizeForPublish(wizardState, ownerType);
  } catch (error: any) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Normalization failed',
      cause: { field: 'normalization', error: error.message } as any,
    });
  }

  try {
    validateNormalizedPayload(normalized);
  } catch (error: any) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Validation failed',
      cause: { field: 'validation', error: error.message } as any,
    });
  }

  validateForPublish(wizardState);

  const slug = await generateUniqueSlug((normalized as any).name);

  try {
    const result = await db.transaction(async (tx: any) => {
      // developerId in developments table MUST be the developer PROFILE id
      const devProfile = await tx.query.developers.findFirst({
        where: eq(developers.userId, developerId),
        columns: { id: true },
      });
      if (!devProfile) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Developer profile for user ID ${developerId} not found`,
        });
      }

      const devPayload = {
        ...(normalized as any),
        developerId: devProfile.id,
        slug,
        isPublished: 1,
        approvalStatus: 'approved',
        publishedAt: mysqlDateTime(),
        ...buildPublishedDevelopmentWorkflowStateColumns(wizardState as Record<string, any>),
        amenities: JSON.stringify(normalizeAmenities((normalized as any).amenities)),

        // ✅ hard defaults to satisfy DB NOT NULL + no default
        views: 0,
        isFeatured: 0,
      };

      const [insertResult] = await tx.insert(developments).values(devPayload);
      const newId = insertResult.insertId;

      let unitCount = 0;
      if (Array.isArray(wizardState.unitTypes) && wizardState.unitTypes.length > 0) {
        await persistUnitTypes(tx, newId, wizardState.unitTypes);

        const [{ count }] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(unitTypes)
          .where(eq(unitTypes.developmentId, newId));

        unitCount = Number(count);

        if (unitCount === 0) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Unit types were provided but none were persisted',
          });
        }
      }

      return { newId, unitCount };
    });

    console.log('[publishDevelopmentStrict] Success:', result);
    return { developmentId: result.newId, unitTypesCount: result.unitCount };
  } catch (error: any) {
    console.error('[publishDevelopmentStrict] Transaction failed:', error);
    if (error instanceof TRPCError) throw error;

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Publish failed: ${error.message}`,
    });
  }
}

export function validateForPublish(wizardState: WizardData): void {
  const transactionType = normalizeTransactionType(
    (wizardState as any).transactionType ||
      (wizardState as any).developmentData?.transactionType ||
      'for_sale',
  );
  const readiness = getDevelopmentPublishReadinessSummary(wizardState, {
    transactionType,
    nowMs: Date.now(),
  });
  const errors = readiness.fieldErrors;

  if (Object.keys(errors).length > 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Publish validation failed',
      cause: { fields: errors } as any,
    });
  }
}

// ===========================================================================
// DELETE DEVELOPMENT
// ===========================================================================

async function deleteDevelopment(
  id: number,
  userId?: number,
  operatingContext?: { brandProfileId: number } | null,
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  console.log('[deleteDevelopment] Input params:', { id, userId, operatingContext });

  // Check user role FIRST before any validation (same pattern as publishDevelopment)
  if (userId !== undefined && userId !== -1) {
    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, userId),
      columns: { id: true, role: true },
    });

    // If super admin with brand context, use brand profile ownership check
    if (user?.role === 'super_admin' && operatingContext?.brandProfileId) {
      console.log('[deleteDevelopment] ✅ SUPER ADMIN MODE - Using brand profile ownership');

      const [owned] = await db
        .select({ id: developments.id })
        .from(developments)
        .where(
          and(
            eq(developments.id, id),
            eq(developments.developerBrandProfileId, operatingContext.brandProfileId),
          ),
        )
        .limit(1);

      if (!owned) {
        const [exists] = await db
          .select({ id: developments.id })
          .from(developments)
          .where(eq(developments.id, id))
          .limit(1);

        if (!exists) throw new TRPCError({ code: 'NOT_FOUND', message: 'Development not found' });

        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Unauthorized: Development belongs to a different brand profile',
        });
      }

      console.log('[deleteDevelopment] ✅ Brand ownership verified, proceeding with delete');
    } else {
      // Real developer mode - check developer ownership
      const devProfile = await db.query.developers.findFirst({
        where: eq(developers.userId, userId),
        columns: { id: true },
      });

      if (!devProfile) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Unauthorized: developer profile not found',
        });
      }

      const [owned] = await db
        .select({ id: developments.id })
        .from(developments)
        .where(and(eq(developments.id, id), eq(developments.developerId, devProfile.id)))
        .limit(1);

      if (!owned) {
        const [exists] = await db
          .select({ id: developments.id })
          .from(developments)
          .where(eq(developments.id, id))
          .limit(1);

        if (!exists) throw new TRPCError({ code: 'NOT_FOUND', message: 'Development not found' });

        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Unauthorized: You do not own this development',
        });
      }
    }
  }

  await db.delete(unitTypes).where(eq(unitTypes.developmentId, id));
  await db.delete(developmentPhases).where(eq(developmentPhases.developmentId, id));
  try {
    await db
      .delete(developmentDrafts)
      .where(sql`JSON_EXTRACT(${developmentDrafts.draftData}, '$.id') = ${id}`);
  } catch (err) {
    console.warn('Failed to delete associated drafts:', err);
    // Continue with deletion of development even if draft cleanup fails
  }

  return db.delete(developments).where(eq(developments.id, id));
}

async function getDevelopmentById(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database unavailable');

  const result = await db
    .select({
      id: developments.id,
      title: developments.name,
      brandProfileId: developments.developerBrandProfileId,
      slug: developments.slug,
      status: developments.status,
      // Add other required fields as needed
    })
    .from(developments)
    .where(eq(developments.id, id))
    .limit(1);

  return result[0] || null;
}

async function getDevelopmentsByBrandId(brandProfileId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database unavailable');

  return db
    .select()
    .from(developments)
    .where(eq(developments.developerBrandProfileId, brandProfileId));
}

// ===========================================================================
// EXPORTS
// ===========================================================================

export const developmentService = {
  approveDevelopment,
  rejectDevelopment,
  requestChanges,

  getPublicDevelopmentBySlug,
  getPublicDevelopment,
  listPublicDevelopments,

  createDevelopment,
  updateDevelopment,
  getDevelopmentWithPhases,
  getDevelopmentById,
  getDevelopmentsByBrandId,
  getDevelopmentsByDeveloperId,
  getDeveloperDevelopments: getDevelopmentsByDeveloperId,
  createPhase,
  updatePhase,
  deleteDevelopment,
  publishDevelopment,
  unpublishDevelopment,
  saveDraft,
  publishDevelopmentStrict,
};
