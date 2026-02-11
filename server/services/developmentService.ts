import { sql, eq, desc, and, inArray } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db-connection';

import {
  developments,
  developers,
  unitTypes,
  developmentPhases,
  developerBrandProfiles,
} from '../../drizzle/schema';

// ===========================================================================
// TYPES
// ===========================================================================

type DevelopmentRow = InferSelectModel<typeof developments>;
type DeveloperRow = InferSelectModel<typeof developers>;
type UnitTypeRow = InferSelectModel<typeof unitTypes>;
type DevelopmentPhaseRow = InferSelectModel<typeof developmentPhases>;

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

function parseJsonField(field: unknown): unknown[] {
  if (Array.isArray(field)) return field;
  if (!field) return [];

  if (typeof field === 'string') {
    try {
      const trimmed = field.trim();
      if (trimmed.startsWith('[')) return JSON.parse(trimmed);
      if (trimmed.includes(',')) return trimmed.split(',').map(s => s.trim());
      return [trimmed];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeAmenities(amenities: unknown): string[] {
  if (Array.isArray(amenities)) return amenities as string[];

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

// ===========================================================================
// DEVELOPER DISPLAY HELPER (single source of truth)
// ===========================================================================

function buildDeveloperDisplay(dev: any) {
  const brand = dev?.brandProfile ?? dev?.publisher ?? null;
  const developer = dev?.developer ?? null;

  if (brand?.name) {
    return {
      type: 'brand_profile' as const,
      name: brand.name,
      logoUrl: brand.logoUrl ?? null,
      websiteUrl: brand.websiteUrl ?? null,
      description: brand.description ?? null,
      slug: brand.slug ?? undefined,
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
    };
  }

  return {
    type: 'unknown' as const,
    name: 'Unknown Developer',
    logoUrl: null,
    websiteUrl: null,
    description: 'Professional property developer committed to quality and excellence.',
    slug: undefined,
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
      amenities: developments.amenities,
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
    .orderBy(unitTypes.basePriceFrom);

  const unitsWithMedia = units.map((u: any) => {
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
    soldUnits: number;
    soldPct: number;
  } = null;

  if (unitsWithMedia.length > 0) {
    const totalUnits = unitsWithMedia.reduce(
      (sum: number, u: any) => sum + (Number(u?.totalUnits) || 0),
      0,
    );
    const availableUnits = unitsWithMedia.reduce(
      (sum: number, u: any) => sum + (Number(u?.availableUnits) || 0),
      0,
    );

    if (totalUnits > 0) {
      const soldUnits = totalUnits - availableUnits;
      const soldPct = Math.round((soldUnits / totalUnits) * 100);
      salesMetrics = { totalUnits, availableUnits, soldUnits, soldPct };
    }
  }

  return {
    ...dev,
    developerDisplay: buildDeveloperDisplay(dev),

    images: parseJsonField(dev.images),
    videos: parseJsonField(dev.videos),
    floorPlans: parseJsonField(dev.floorPlans),
    brochures: parseJsonField(dev.brochures),
    amenities: normalizeAmenities(dev.amenities),

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
    images: parseJsonField(results[0].images),
  };
}

export async function listPublicDevelopments(options: {
  limit?: number;
  province?: string;
  city?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const { limit = 20, province, city } = options;

  const conditions: any[] = [eq(developments.isPublished, 1)];
  if (province) conditions.push(eq(developments.province, province));
  if (city) conditions.push(eq(developments.city, city));

  const results = await db
    .select({
      id: developments.id,
      name: developments.name,
      slug: developments.slug,
      images: developments.images,
      city: developments.city,
      province: developments.province,
      priceFrom: developments.priceFrom,
      priceTo: developments.priceTo,
      developerBrandProfileId: developments.developerBrandProfileId,
    })
    .from(developments)
    .where(and(...conditions))
    .orderBy(desc(developments.createdAt))
    .limit(limit);

  return results.map((d: any) => ({
    ...d,
    images: parseJsonField(d.images),
  }));
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

  // If super admin, bypass ALL checks
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

  validateDevelopmentData({ ...developmentData, devOwnerType: effectiveOwnerType } as any, userId);

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
  const rentRange =
    normalizedTransactionType === 'for_rent' ? computeRentRangeFromUnits(unitTypesData) : null;
  const auctionRange =
    normalizedTransactionType === 'auction' ? computeAuctionRangeFromUnits(unitTypesData) : null;

  const insertPayload: Record<string, any> = {
    // Use resolved identity for ownership
    developerId: developerProfileId, // null for emulator mode
    name: (developmentData as any).name,
    slug,
    city: (developmentData as any).city,
    province: (developmentData as any).province,
    developmentType: (developmentData as any).developmentType || 'residential',
    transactionType: normalizedTransactionType,
    status: 'launching-soon',
    devOwnerType: ownerType || 'developer',

    isFeatured: 0,
    isPublished: 0,
    views: 0,
    showHouseAddress: boolToInt((developmentData as any).showHouseAddress ?? true),
    readinessScore: 0,
    approvalStatus: 'draft',
    nature: sanitizeEnum(
      (developmentData as any).nature,
      ['new', 'phase', 'extension', 'redevelopment'],
      'new',
    ),

    images: JSON.stringify(normalizeImages((developmentData as any).images)),

    // amenities is TEXT in your DB snapshot -> store as JSON string for consistency
    amenities: JSON.stringify(normalizeAmenities((developmentData as any).amenities)),

    // highlights/features are JSON in your DB snapshot -> store JSON strings without reshaping
    highlights: stringifyJsonValue((developmentData as any).highlights, []),
    features: stringifyJsonValue((developmentData as any).features, []),

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

    priceFrom: sanitizeInt((developmentData as any).priceFrom),
    priceTo: sanitizeInt((developmentData as any).priceTo),
    monthlyRentFrom:
      normalizedTransactionType === 'for_rent'
        ? (rentRange?.monthlyRentFrom ?? null)
        : sanitizeDecimal((developmentData as any).monthlyRentFrom),
    monthlyRentTo:
      normalizedTransactionType === 'for_rent'
        ? (rentRange?.monthlyRentTo ?? null)
        : sanitizeDecimal((developmentData as any).monthlyRentTo),
    auctionStartDate:
      normalizedTransactionType === 'auction' ? (auctionRange?.auctionStartDate ?? null) : null,
    auctionEndDate:
      normalizedTransactionType === 'auction' ? (auctionRange?.auctionEndDate ?? null) : null,
    startingBidFrom:
      normalizedTransactionType === 'auction' ? (auctionRange?.startingBidFrom ?? null) : null,
    reservePriceFrom:
      normalizedTransactionType === 'auction' ? (auctionRange?.reservePriceFrom ?? null) : null,
    totalUnits: sanitizeInt((developmentData as any).totalUnits),
    availableUnits: sanitizeInt((developmentData as any).availableUnits),
    totalDevelopmentArea: sanitizeInt((developmentData as any).totalDevelopmentArea),
    customClassification: sanitizeString((developmentData as any).customClassification),

    estateSpecs: (developmentData as any).estateSpecs || null,
    completionDate: sanitizeDate((developmentData as any).completionDate),

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
    transferCostsIncluded: (developmentData as any).transferCostsIncluded || null,
  };

  if (
    Array.isArray((developmentData as any).videos) &&
    (developmentData as any).videos.length > 0
  ) {
    insertPayload.videos = JSON.stringify((developmentData as any).videos);
  }
  if (
    Array.isArray((developmentData as any).floorPlans) &&
    (developmentData as any).floorPlans.length > 0
  ) {
    insertPayload.floorPlans = JSON.stringify((developmentData as any).floorPlans);
  }
  if (
    Array.isArray((developmentData as any).brochures) &&
    (developmentData as any).brochures.length > 0
  ) {
    insertPayload.brochures = JSON.stringify((developmentData as any).brochures);
  }

  // Apply metadata overrides explicitly
  if (ownerType && !(ownerType in insertPayload)) {
    insertPayload.devOwnerType = ownerType;
  }
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
      developerId,
      devOwnerType: ownerType || 'developer',
      developerBrandProfileId: brandProfileId ?? null,
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
  developerId: number,
  data: CreateDevelopmentData,
) {
  console.log('[updateDevelopment] Starting update for development:', id);
  console.log('[updateDevelopment] Payload keys:', Object.keys(data));

  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // ✅ Resolve developer PROFILE id from user id (same as createDevelopment)
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

  const developerProfileId = devProfile.id;

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
  if (developmentData.completionDate !== undefined)
    updatePayload.completionDate = sanitizeDate(developmentData.completionDate);
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
  // Estate specs merge (keep transferCostsIncluded inside estateSpecs)
  // ---------------------------------------------------------------------------
  const extraSpecs: any = {};
  if (developmentData.transferCostsIncluded !== undefined) {
    extraSpecs.transferCostsIncluded = developmentData.transferCostsIncluded;
  }

  if (estateSpecsData !== undefined || Object.keys(extraSpecs).length > 0) {
    let currentSpecs: any = estateSpecsData;
    if (typeof currentSpecs === 'string') {
      try {
        currentSpecs = JSON.parse(currentSpecs);
      } catch {
        currentSpecs = {};
      }
    }
    const finalSpecs = { ...(currentSpecs || {}), ...extraSpecs };
    updatePayload.estateSpecs = JSON.stringify(finalSpecs);
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

  if (effectiveTransactionType === 'for_rent' && Array.isArray(unitTypesData)) {
    const rentRange = computeRentRangeFromUnits(unitTypesData);
    updatePayload.monthlyRentFrom = rentRange.monthlyRentFrom;
    updatePayload.monthlyRentTo = rentRange.monthlyRentTo;
  }

  if (effectiveTransactionType === 'auction' && Array.isArray(unitTypesData)) {
    const auctionRange = computeAuctionRangeFromUnits(unitTypesData);
    updatePayload.auctionStartDate = auctionRange.auctionStartDate;
    updatePayload.auctionEndDate = auctionRange.auctionEndDate;
    updatePayload.startingBidFrom = auctionRange.startingBidFrom;
    updatePayload.reservePriceFrom = auctionRange.reservePriceFrom;
  }

  updatePayload.updatedAt = new Date().toISOString();

  console.log('[updateDevelopment] Update payload fields:', Object.keys(updatePayload));

  // ✅ Ownership check done in WHERE by developerProfileId
  await db
    .update(developments)
    .set(updatePayload)
    .where(and(eq(developments.id, id), eq(developments.developerId, developerProfileId)));

  const updated = await db.query.developments.findFirst({
    where: and(eq(developments.id, id), eq(developments.developerId, developerProfileId)),
  });

  if (!updated) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Update failed or you do not own this development',
    });
  }

  // Unit types (safe persistence helper handles no-wipe)
  if (unitTypesData !== undefined) {
    if (Array.isArray(unitTypesData)) {
      if (unitTypesData.length === 0) {
        console.warn('[updateDevelopment] Empty unitTypes - preserving existing (no delete)');
      }
      await persistUnitTypes(db, id, unitTypesData);
    } else {
      console.warn('[updateDevelopment] unitTypes is not an array:', typeof unitTypesData);
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

const normalizeParkingKind = (v: unknown): 'none' | 'carport' | 'garage' | '1' | '2' => {
  const s = String(v ?? '')
    .trim()
    .toLowerCase();
  if (['none', 'carport', 'garage', '1', '2'].includes(s)) return s as any;
  return 'none';
};

const mysqlDateTime = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

// ===========================================================================
// PERSIST UNIT TYPES (SAFETY: no accidental wipe on ID mismatch)
// ===========================================================================

export async function persistUnitTypes(
  db: any,
  developmentId: number,
  unitTypesData: any[],
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

  if (!unitTypesData || unitTypesData.length === 0) {
    console.log('[persistUnitTypes] Empty payload - preserving existing units');
    return;
  }

  const existingUnits = await db
    .select({ id: unitTypes.id })
    .from(unitTypes)
    .where(eq(unitTypes.developmentId, developmentId));

  // IMPORTANT: unitTypes.id type must be string/uuid(36) in your DB for this to work.
  // If unitTypes.id is INT auto_increment, tell me and I'll rewrite this to use numbers + insertId.
  const existingIds = new Set<string>(
    existingUnits.map((u: any) => String(u.id ?? '').trim()).filter(Boolean),
  );

  const normalizedIncoming = unitTypesData.map(u => ({
    ...u,
    normalizedId: u?.id ? String(u.id).trim() : null,
  }));

  const matchingIncomingIds = new Set<string>(
    normalizedIncoming
      .filter(u => u.normalizedId && existingIds.has(u.normalizedId))
      .map(u => u.normalizedId!),
  );

  // ✅ Only delete if we have proof the client is sending real DB IDs, OR there are no existing units.
  const safeToDelete = existingIds.size === 0 || matchingIncomingIds.size > 0;

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

  for (const unit of normalizedIncoming) {
    const isNewUnit = !unit.normalizedId || !existingIds.has(unit.normalizedId);
    const unitId = isNewUnit ? crypto.randomUUID() : unit.normalizedId!;

    if (unitId.length > 36) {
      throw new Error(
        `Unit ID violation: '${unitId}' length (${unitId.length}) > 36. Aborting save.`,
      );
    }

    const kind = normalizeParkingKind(unit.parkingType);
    const rawBays = asInt(unit.parkingBays ?? unit.parkingSpaces ?? 0, 0);
    const parkingBays = kind === 'none' ? 0 : rawBays;
    const parkingType = kind === 'none' ? null : kind;

    const basePriceFrom = (() => {
      const v = asDecimalOrNull(unit.basePriceFrom);
      if (v !== null) return v;

      const fallback = asDecimalOrNull(unit.priceFrom);
      if (fallback !== null) return fallback;

      if (asDecimalOrNull(unit.monthlyRentFrom) !== null) return 0;

      console.warn(`UnitType ${unitId}: basePriceFrom missing, defaulting to 0`);
      return 0;
    })();

    const unitPayload: Record<string, any> = {
      developmentId,

      // Keep both label+name populated for legacy UI compatibility
      label: unit.label || unit.name || 'Unnamed Unit',
      name: unit.name || unit.label || 'Unnamed Unit',

      // ✅ Avoid empty-string enums (store null instead)
      ownershipType: sanitizeEnum(
        unit.ownershipType,
        ['full-title', 'sectional-title', 'leasehold', 'life-rights'],
        null,
      ),
      structuralType: sanitizeEnum(
        unit.structuralType,
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
      floors: sanitizeEnum(unit.floors, ['single-storey', 'double-storey', 'triplex'], null),

      // Parking
      parkingType,
      parkingBays,

      // Numbers (keep DB happy)
      bedrooms: sanitizeInt(unit.bedrooms) ?? 0,
      bathrooms: asDecimalOrNull(unit.bathrooms) ?? 1.0,

      yardSize: sanitizeInt(unit.yardSize),
      unitSize: sanitizeInt(unit.unitSize),

      priceFrom: asDecimalOrNull(unit.priceFrom),
      priceTo: asDecimalOrNull(unit.priceTo),
      basePriceFrom,
      basePriceTo: asDecimalOrNull(unit.basePriceTo),
      monthlyRentFrom: asDecimalOrNull(unit.monthlyRentFrom ?? unit.monthlyRent),
      monthlyRentTo: asDecimalOrNull(unit.monthlyRentTo),
      leaseTerm: asStringOrNull(unit.leaseTerm),
      isFurnished: (unit.isFurnished ?? unit.furnished) ? 1 : 0,
      depositRequired: asDecimalOrNull(unit.depositRequired ?? unit.deposit),
      startingBid: asDecimalOrNull(unit.startingBid),
      reservePrice: asDecimalOrNull(unit.reservePrice),
      auctionStartDate: asDateTimeOrNull(unit.auctionStartDate),
      auctionEndDate: asDateTimeOrNull(unit.auctionEndDate),
      auctionStatus: sanitizeEnum(
        unit.auctionStatus,
        ['scheduled', 'active', 'sold', 'passed_in', 'withdrawn'],
        'scheduled',
      ),

      availableUnits: sanitizeInt(unit.availableUnits) ?? 0,
      totalUnits: sanitizeInt(unit.totalUnits) ?? 0,

      completionDate: asDateOnlyOrNull(unit.completionDate),

      internalNotes: asStringOrNull(unit.internalNotes),
      configDescription: asStringOrNull(unit.configDescription),
      virtualTourLink: asStringOrNull(unit.virtualTourLink),
      description: asStringOrNull(unit.description),

      transferCostsIncluded: unit.transferCostsIncluded ? 1 : 0,

      // JSON-ish columns stored as strings (safe for MySQL)
      extras: JSON.stringify(unit.extras || []),
      specifications: JSON.stringify(unit.specifications || {}),
      specOverrides: JSON.stringify(unit.specOverrides || {}),
      baseFeatures: JSON.stringify(unit.baseFeatures || {}),
      baseFinishes: JSON.stringify(unit.baseFinishes || {}),
      amenities: JSON.stringify(unit.amenities || { standard: [], additional: [] }),

      // ✅ keep as OBJECT (stringified), never flatten to gallery array
      baseMedia: JSON.stringify({
        gallery: [],
        floorPlans: [],
        renders: [],
        ...(unit.baseMedia || {}),
      }),

      features: JSON.stringify(unit.features || {}),

      updatedAt: mysqlDateTime(),
      isActive: 1,
    };

    console.log(`[persistUnitTypes] Unit ${unitId} PROCESSED:`, {
      incoming_unitSize: unit.unitSize,
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
        createdAt: new Date().toISOString(),
      });
    }
  }
}

// ===========================================================================
// GET DEVELOPMENT WITH PHASES (unchanged core, but safe parses)
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
      db.select().from(unitTypes).where(eq(unitTypes.developmentId, id)),
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

  // images/videos/brochures in this service are stored as JSON string (array), so keep parsing resilient
  const dbImages = parse((dev as any).images, []);
  const dbVideos = parse((dev as any).videos, []);
  const dbBrochures = parse((dev as any).brochures, []);

  // your table uses: amenities=text, highlights=json, features=json
  // so keep these parses tolerant of text/json mismatch
  const dbAmenities = normalizeAmenities((dev as any).amenities);
  const dbHighlights = parseJsonMaybeTwice((dev as any).highlights, []);
  const dbFeatures = parseJsonMaybeTwice((dev as any).features, []);

  const heroImage = Array.isArray(dbImages) ? ((dbImages[0] as any)?.url ?? dbImages[0]) : null;

  return {
    ...dev,

    images: dbImages,

    media: {
      photos: Array.isArray(dbImages) ? dbImages : [],
      videos: Array.isArray(dbVideos) ? dbVideos : [],
      brochures: Array.isArray(dbBrochures) ? dbBrochures : [],
      heroImage: heroImage ? { url: heroImage } : undefined,
    },

    // match actual column types
    amenities: Array.isArray(dbAmenities) ? dbAmenities : [],
    highlights: Array.isArray(dbHighlights) ? dbHighlights : [],
    features: Array.isArray(dbFeatures) ? dbFeatures : [],

    // keep these safe (they often flip between TEXT/JSON depending on migrations)
    estateSpecs: parse((dev as any).estateSpecs, {}),
    specifications: parse((dev as any).specifications, {}),
    residentialConfig: parse((dev as any).residentialConfig, {}),
    landConfig: parse((dev as any).landConfig, {}),
    commercialConfig: parse((dev as any).commercialConfig, {}),
    mixedUseConfig: parse((dev as any).mixedUseConfig, {}),

    unitTypes: (unitTypesData || []).map(u => ({
      ...u,
      extras: parse((u as any).extras, []),
      specifications: parse((u as any).specifications, {}),
      amenities: parse((u as any).amenities, { standard: [], additional: [] }),
      baseMedia: parse((u as any).baseMedia, { gallery: [], floorPlans: [], renders: [] }),
    })),

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

      images: parseJsonField(dev.images),
      videos: parseJsonField(dev.videos),
      floorPlans: parseJsonField(dev.floorPlans),
      brochures: parseJsonField(dev.brochures),
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
    createdAt: new Date().toISOString(),
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

    // Publish it
    console.log('[publishDevelopment] About to execute UPDATE query for development:', id);

    try {
      // Format datetime for MySQL (YYYY-MM-DD HH:MM:SS)
      const publishedAtFormatted = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const updateResult = await db
        .update(developments)
        .set({ isPublished: 1, publishedAt: publishedAtFormatted, status: 'launching-soon' })
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

  // Format datetime for MySQL (YYYY-MM-DD HH:MM:SS)
  const publishedAtFormatted = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await db
    .update(developments)
    .set({ isPublished: 1, publishedAt: publishedAtFormatted, status: 'launching-soon' })
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

  await db
    .update(developments)
    .set({
      status: 'selling',
      approvalStatus: 'approved',
      isPublished: true as any,
      approvedAt: new Date().toISOString(),
      approvedBy: adminId,
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
        publishedAt: new Date().toISOString(),

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

function validateForPublish(wizardState: WizardData): void {
  const errors: Record<string, string> = {};

  if (!Array.isArray(wizardState.unitTypes) || wizardState.unitTypes.length === 0) {
    errors['unitTypes'] = 'At least one unit type is required';
  }

  const images = (wizardState as any).images;
  const hasHeroImage =
    (Array.isArray(images) && images.length > 0) ||
    (typeof images === 'string' && images.trim() !== '');

  if (!hasHeroImage) {
    errors['media.heroImage'] = 'At least one photo (Hero Image) is required';
  }

  const transactionType =
    (wizardState as any).transactionType ||
    (wizardState as any).developmentData?.transactionType ||
    'for_sale';

  if (transactionType === 'for_rent' && Array.isArray(wizardState.unitTypes)) {
    const hasRent = wizardState.unitTypes.some((u: any) => {
      const from = Number(u?.monthlyRentFrom ?? u?.monthlyRent ?? 0);
      const to = Number(u?.monthlyRentTo ?? 0);
      return from > 0 || to > 0;
    });
    if (!hasRent) {
      errors['unitTypes.monthlyRentFrom'] = 'At least one unit type must include monthly rent';
    }
  }

  if (transactionType === 'auction' && Array.isArray(wizardState.unitTypes)) {
    const now = Date.now();
    const validAuctionUnits = wizardState.unitTypes.every((u: any) => {
      const startingBid = Number(u?.startingBid ?? 0);
      const reservePrice = u?.reservePrice != null ? Number(u.reservePrice) : undefined;
      const startDate = u?.auctionStartDate ? new Date(u.auctionStartDate) : null;
      const endDate = u?.auctionEndDate ? new Date(u.auctionEndDate) : null;

      if (!startingBid || startingBid <= 0) return false;
      if (
        reservePrice != null &&
        Number.isFinite(reservePrice) &&
        reservePrice > 0 &&
        reservePrice < startingBid
      )
        return false;
      if (!startDate || Number.isNaN(startDate.getTime())) return false;
      if (!endDate || Number.isNaN(endDate.getTime())) return false;
      if (endDate.getTime() <= startDate.getTime()) return false;
      if (startDate.getTime() < now) return false;
      return true;
    });

    if (!validAuctionUnits) {
      errors['unitTypes.startingBid'] = 'All unit types must include valid auction terms';
    }
  }

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
      title: developments.title,
      brandProfileId: developments.brandProfileId,
      slug: developments.slug,
      status: developments.status,
      // Add other required fields as needed
    })
    .from(developments)
    .where(eq(developments.id, id))
    .limit(1);

  return result[0] || null;
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
  getDevelopmentsByDeveloperId,
  getDeveloperDevelopments: getDevelopmentsByDeveloperId,
  createPhase,
  updatePhase,
  deleteDevelopment,
  publishDevelopment,
  saveDraft,
  publishDevelopmentStrict,
};
