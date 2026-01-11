import { eq, desc, and, or, isNotNull, sql } from 'drizzle-orm';
import { getDb } from '../db-connection';
import { developments, developers, unitTypes, developmentPhases } from '../../drizzle/schema';

// =========================================================================== 
// TYPES
// =========================================================================== 

interface CreateDevelopmentData {
  unitTypes?: UnitTypeData[];
  amenities?: string[] | string;
  showHouseAddress?: boolean;
  isFeatured?: boolean;
  isPublished?: boolean;
  views?: number;
  developerBrandProfileId?: number | null;
  [key: string]: any;
}

interface UnitTypeData {
  id?: string;
  name?: string;
  bedrooms?: number;
  bathrooms?: number;
  parking?: string;
  parkingType?: string;
  parkingBays?: number;
  sizeFrom?: number;
  sizeTo?: number;
  unitSize?: number;
  priceFrom?: number;
  priceTo?: number;
  basePriceFrom?: number;
  extras?: Array<{ price: number; [key: string]: any }>;
  totalUnits?: number;
  availableUnits?: number;
  isActive?: boolean;
}

interface DevelopmentMetadata {
  ownerType?: 'platform' | 'developer';
  brandProfileId?: number | null;
  [key: string]: any;
}

interface DevelopmentError extends Error {
  code?: string;
  details?: Record<string, any>;
}

// =========================================================================== 
// UTILITIES
// =========================================================================== 

/**
 * Generates a URL-friendly slug from a string
 */
export function generateSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
}

/**
 * Generates a unique slug by appending a number if needed
 */
export async function generateUniqueSlug(baseName: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Database connection unavailable for slug generation');

  let slug = generateSlug(baseName);
  let counter = 1;
  let isUnique = false;

  while (!isUnique) {
    const existing = await db
      .select({ id: developments.id })
      .from(developments)
      .where(eq(developments.slug, slug))
      .limit(1);

    if (existing.length === 0) {
      isUnique = true;
    } else {
      // Add counter to make it unique
      slug = `${generateSlug(baseName)}-${counter}`;
      counter++;
    }
  }

  return slug;
}

/**
 * Converts boolean values to MySQL-compatible integers
 */
function boolToInt(value: any): 0 | 1 {
  if (value === true || value === 'true' || value === 1 || value === '1') return 1;
  return 0;
}

/**
 * Safely validates and parses a slug or ID
 */
function parseSlugOrId(input: string): { isId: boolean; value: string | number } {
  const trimmed = input.trim();
  const isNumeric = /^\d+$/.test(trimmed);
  
  if (isNumeric) {
    const parsed = parseInt(trimmed, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return { isId: true, value: parsed };
    }
  }
  
  // Validate slug format (alphanumeric, hyphens, underscores) allowed
  return { isId: false, value: trimmed };
}

/**
 * Normalizes amenities to array format
 */
function normalizeAmenities(amenities: any): string[] {
  if (Array.isArray(amenities)) return amenities;
  if (typeof amenities === 'string') {
    try {
      const parsed = JSON.parse(amenities);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return amenities ? [amenities] : [];
    }
  }
  return [];
}

/**
 * Normalizes image arrays (handles both string and array formats)
 */
function normalizeImages(images: any): string[] {
  if (Array.isArray(images)) return images;
  
  if (typeof images === 'string') {
    // Handle comma-separated strings
    if (images.includes(',')) {
      return images.split(',').map(img => img.trim()).filter(Boolean);
    }
    // Single image
    return images ? [images] : [];
  }
  
  return []; // Return empty array if invalid, Drizzle might need JSON string, but schema usually handles array -> json
}

/**
 * Validates development data before insertion
 */
function validateDevelopmentData(data: CreateDevelopmentData, developerId: number): void {
  if (!developerId) { // Allow negative/zero for some internal logic? No, create should have ID.
     // But Super Admin uses 1.
    throw createError('Invalid developerId', 'VALIDATION_ERROR', { developerId });
  }

  // Add more validation as needed
  if (data.devOwnerType && !['platform', 'developer'].includes(data.devOwnerType)) {
    throw createError(
      `Invalid devOwnerType: ${data.devOwnerType}. Must be 'platform' or 'developer'`,
      'VALIDATION_ERROR',
      { devOwnerType: data.devOwnerType }
    );
  }
}

/**
 * Creates a structured error object
 */
function createError(message: string, code: string, details?: Record<string, any>): DevelopmentError {
  const error = new Error(message) as DevelopmentError;
  error.code = code;
  error.details = details;
  return error;
}

/**
 * Handles database errors with specific messages
 */
function handleDatabaseError(error: any, context: Record<string, any>): never {
  console.error('[developmentService] Database error:', {
    message: error.message,
    code: error.code,
    context,
  });

  switch (error.code) {
    case 'ER_NO_REFERENCED_ROW_2':
      throw createError(
        'Foreign key constraint violation. Invalid developerId or developerBrandProfileId.',
        'FK_CONSTRAINT_ERROR',
        {
          developerId: context.developerId,
          developerBrandProfileId: context.developerBrandProfileId,
        }
      );

    case 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD':
      throw createError(
        `Invalid enum value for devOwnerType: ${context.devOwnerType}. Must be 'platform' or 'developer'.`,
        'ENUM_ERROR',
        { devOwnerType: context.devOwnerType }
      );

    case 'ER_DUP_ENTRY':
      throw createError(
        'Duplicate entry detected. Development slug or unique field already exists.',
        'DUPLICATE_ENTRY',
        context
      );

    case 'ER_DATA_TOO_LONG':
      throw createError(
        'Data too long for one or more fields.',
        'DATA_TOO_LONG',
        context
      );

    default:
      throw createError(
        `Database operation failed: ${error.message}`,
        error.code || 'DB_ERROR',
        context
      );
  }
}

// =========================================================================== 
// PUBLIC FUNCTIONS
// =========================================================================== 

export async function getPublicDevelopmentBySlug(slugOrId: string) {
  console.log('[DEBUG] Service: getPublicDevelopmentBySlug called with:', slugOrId);
  
  try {
    const db = await getDb();
    if (!db) {
      console.error('[CRITICAL] Service: Database connection is NULL');
      return null;
    }

    const { isId, value } = parseSlugOrId(slugOrId);
    
    // Safety check for empty slug
    if (!isId && (!value || value === 'undefined' || value === 'null')) return null;

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
        locationId: developments.locationId,
        city: developments.city,
        province: developments.province,
        suburb: developments.suburb,
        address: developments.address,
        latitude: developments.latitude,
        longitude: developments.longitude,
        priceFrom: developments.priceFrom,
        priceTo: developments.priceTo,
        amenities: developments.amenities,
        highlights: developments.highlights,
        features: developments.features,
        estateSpecs: developments.estateSpecs,
        monthlyLevyFrom: developments.monthlyLevyFrom,
        monthlyLevyTo: developments.monthlyLevyTo,
        ratesFrom: developments.ratesFrom,
        ratesTo: developments.ratesTo,
        transferCostsIncluded: developments.transferCostsIncluded,
        status: developments.status,
        developmentType: developments.developmentType,
        completionDate: developments.completionDate,
        totalUnits: developments.totalUnits,
        availableUnits: developments.availableUnits,
        floorPlans: developments.floorPlans,
        brochures: developments.brochures,
        showHouseAddress: developments.showHouseAddress,
        isPublished: developments.isPublished,
        marketingRole: developments.marketingRole,
        developer: {
          id: developers.id,
          name: developers.name,
          slug: developers.slug,
          logo: developers.logo,
          description: developers.description,
          website: developers.website,
          email: developers.email,
          phone: developers.phone,
          status: developers.status,
        },
      })
      .from(developments)
      .leftJoin(developers, eq(developments.developerId, developers.id))
      .where(whereClause)
      .limit(1);

    if (results.length === 0) return null;

    const dev = results[0];

    // Parallel fetch for better performance
    const [units, phases] = await Promise.all([
      db
        .select()
        .from(unitTypes)
        .where(and(
          eq(unitTypes.developmentId, dev.id),
          eq(unitTypes.isActive, 1)
        ))
        .orderBy(unitTypes.basePriceFrom),
      
      db
        .select({
          id: developmentPhases.id,
          developmentId: developmentPhases.developmentId,
          name: developmentPhases.name,
          phaseNumber: developmentPhases.phaseNumber,
          description: developmentPhases.description,
          status: developmentPhases.status,
          totalUnits: developmentPhases.totalUnits,
          availableUnits: developmentPhases.availableUnits,
          priceFrom: developmentPhases.priceFrom,
          priceTo: developmentPhases.priceTo,
          launchDate: developmentPhases.launchDate,
          completionDate: developmentPhases.completionDate,
        })
        .from(developmentPhases)
        .where(eq(developmentPhases.developmentId, dev.id))
        .orderBy(developmentPhases.phaseNumber)
    ]);

    return {
      ...dev,
      amenities: normalizeAmenities(dev.amenities),
      unitTypes: units,
      phases: phases,
    };
  } catch (err) {
    console.error('[CRITICAL] Error in getPublicDevelopmentBySlug:', err);
    return null;
  }
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
      address: developments.address,
      city: developments.city,
      province: developments.province,
      priceFrom: developments.priceFrom,
      priceTo: developments.priceTo,
      monthlyLevyFrom: developments.monthlyLevyFrom,
      monthlyLevyTo: developments.monthlyLevyTo,
      ratesFrom: developments.ratesFrom,
      ratesTo: developments.ratesTo,
      transferCostsIncluded: developments.transferCostsIncluded,
      status: developments.status,
      developerId: developments.developerId,
    })
    .from(developments)
    .where(and(
      eq(developments.id, id),
      eq(developments.isPublished, 1)
    ))
    .limit(1);

  return results[0] || null;
}

export async function listPublicDevelopments(limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  const results = await db
    .select({
      id: developments.id,
      developerId: developments.developerId,
      name: developments.name,
      slug: developments.slug,
      description: developments.description,
      images: developments.images,
      city: developments.city,
      province: developments.province,
      priceFrom: developments.priceFrom,
      priceTo: developments.priceTo,
      status: developments.status,
      isFeatured: developments.isFeatured,
      developer: {
        id: developers.id,
        name: developers.name,
        logo: developers.logo,
      },
    })
    .from(developments)
    .leftJoin(developers, eq(developments.developerId, developers.id))
    .where(eq(developments.isPublished, 1))
    .orderBy(desc(developments.isFeatured), desc(developments.createdAt))
    .limit(limit);

  return results;
}

// =========================================================================== 
// ADMIN / DEVELOPER FUNCTIONS
// =========================================================================== 

/**
 * Creates a new development with associated unit types in a transaction
 */
async function createDevelopment(
  developerId: number,
  data: CreateDevelopmentData,
  metadata: DevelopmentMetadata = {}
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  console.log('[createDevelopment] Input data:', {
    name: data.name,
    slug: data.slug,
  });

  // Extract data that needs special handling
  const { unitTypes: unitTypesData, ...developmentData } = data;
  const { ownerType, brandProfileId, ...restMetadata } = metadata;

  // Validate input before proceeding
  validateDevelopmentData({ ...developmentData, devOwnerType: ownerType || 'developer' }, developerId);

  // CRITICAL: Generate slug if not provided or empty
  let slug = developmentData.slug;
  if (!slug || slug.trim() === '') {
    if (!developmentData.name) {
      throw createError('Either slug or name must be provided to generate a slug', 'VALIDATION_ERROR');
    }
    slug = await generateUniqueSlug(developmentData.name);
    console.log('[createDevelopment] Generated slug:', slug);
  } else {
    // Ensure provided slug is properly formatted
    slug = generateSlug(slug);
  }

  // Transform data for MySQL compatibility
  const transformedData: any = {
    // Core Identity
    developerId,
    slug,
    name: developmentData.name,
    description: developmentData.description || null,
    
    // Ownership configuration
    devOwnerType: ownerType || 'developer',
    developerBrandProfileId: brandProfileId ?? developmentData.developerBrandProfileId ?? null,
    marketingRole: developmentData.marketingRole || null,

    // Location
    address: developmentData.address || null,
    city: developmentData.city || null,
    province: developmentData.province || null,
    suburb: developmentData.suburb || null,
    latitude: developmentData.latitude || null,
    longitude: developmentData.longitude || null,
    locationId: developmentData.locationId || null,

    // Development Details
    developmentType: developmentData.developmentType || 'residential',
    status: developmentData.status || 'pre-launch',

    // Pricing
    priceFrom: developmentData.priceFrom || null,
    priceTo: developmentData.priceTo || null,

    // Financial - Global level
    monthlyLevyFrom: developmentData.monthlyLevyFrom || null,
    monthlyLevyTo: developmentData.monthlyLevyTo || null,
    ratesFrom: developmentData.ratesFrom || null,
    ratesTo: developmentData.ratesTo || null,
    transferCostsIncluded: developmentData.transferCostsIncluded || null,

    // Inventory
    totalUnits: developmentData.totalUnits || null,
    availableUnits: developmentData.availableUnits || null,
    
    // Boolean to integer conversions for MySQL using helper
    showHouseAddress: boolToInt(developmentData.showHouseAddress),
    isFeatured: boolToInt(developmentData.isFeatured),
    isPublished: boolToInt(developmentData.isPublished),
    
    // Default values
    views: developmentData.views ?? 0,
    
    // Normalize amenities
    amenities: normalizeAmenities(developmentData.amenities),
    highlights: normalizeAmenities(developmentData.highlights),
    features: normalizeAmenities(developmentData.features),
    images: normalizeImages(developmentData.images),
    videos: developmentData.videos || null,
    floorPlans: developmentData.floorPlans || null,
    brochures: developmentData.brochures || null,
    estateSpecs: developmentData.estateSpecs || null,

    // Dates
    completionDate: developmentData.completionDate || null,

    // Metadata
    // Note: Drizzle schema handles createdAt/updatedAt defaults usually
  };

  // Add any remaining metadata fields (careful not to overwrite transformed ones)
  Object.keys(restMetadata).forEach(key => {
     if (!(key in transformedData)) {
       transformedData[key] = restMetadata[key];
     }
  });

  console.log('[developmentService] Creating development payload:', {
    slug: transformedData.slug,
    devOwnerType: transformedData.devOwnerType,
    brandProfileId: transformedData.developerBrandProfileId,
    developerId: transformedData.developerId,
  });

  let resultId: number;

  try {
    // USE TRANSACTION for Atomicity
    const createdDev = await db.transaction(async (tx: any) => {
       const [insertResult] = await tx.insert(developments).values(transformedData);
       const newId = insertResult.insertId;

       // Persist Unit Types within same transaction
       if (unitTypesData && Array.isArray(unitTypesData) && unitTypesData.length > 0) {
          await persistUnitTypes(tx, newId, unitTypesData);
       }
       
       return newId;
    });
    
    resultId = createdDev;

  } catch (error: any) {
    handleDatabaseError(error, {
      developerId,
      devOwnerType: transformedData.devOwnerType,
      developerBrandProfileId: transformedData.developerBrandProfileId,
    });
  }
  
  // Fetch and return the created development (outside transaction)
  const [created] = await db.select().from(developments).where(eq(developments.id, resultId)).limit(1);
  
  if (!created) {
    throw new Error(`Development created but not found on retrieval. ID: ${resultId}`);
  }

  return created;
}

async function updateDevelopment(id: number, developerId: number, data: CreateDevelopmentData) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verify ownership (bypass for super admin with developerId === -1)
  if (developerId !== -1) {
    const existing = await db
      .select()
      .from(developments)
      .where(and(
        eq(developments.id, id),
        eq(developments.developerId, developerId)
      ))
      .limit(1);

    if (!existing.length) {
      throw new Error(
        "Unauthorized: Development not found or you don't have permission to update it"
      );
    }
  }

  // Extract data that needs special handling
  const { unitTypes: unitTypesData, ...developmentData } = data;

  // Update development
  await db.update(developments)
    .set({
      ...developmentData,
      amenities: normalizeAmenities(developmentData.amenities),
      highlights: normalizeAmenities(developmentData.highlights),
      features: normalizeAmenities(developmentData.features),
      images: normalizeImages(developmentData.images),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(developments.id, id));

  // Handle Unit Types if provided
  if (unitTypesData && Array.isArray(unitTypesData) && unitTypesData.length > 0) {
    await persistUnitTypes(db, id, unitTypesData);
  }

  // Fetch and return updated development
  const [updated] = await db
    .select()
    .from(developments)
    .where(eq(developments.id, id))
    .limit(1);
  
  return updated;
}

/**
 * Persists unit types for a development.
 * Accepts `db` (transaction or pool) to ensure atomicity.
 */
async function persistUnitTypes(
  db: any,
  developmentId: number,
  unitTypesData: UnitTypeData[]
): Promise<void> {
  if (!db) return; // Should throw?

  console.log('[persistUnitTypes] Processing', unitTypesData.length, 'unit types for dev', developmentId);

  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
  };

  for (const unit of unitTypesData) {
    // Skip units without ID
    if (!unit.id) {
      console.warn('[persistUnitTypes] Skipping unit without ID:', unit.name);
      results.skipped++;
      continue;
    }

    try {
      // Calculate price range
      const basePrice = Number(unit.priceFrom || unit.basePriceFrom || 0);
      const extrasTotal = Array.isArray(unit.extras)
        ? unit.extras.reduce((sum, item) => sum + (Number(item.price) || 0), 0)
        : 0;

      const unitPayload = {
        developmentId,
        name: unit.name || 'Untitled Unit',
        bedrooms: Number(unit.bedrooms || 0),
        bathrooms: Number(unit.bathrooms || 0),
        parking: unit.parking || null,
        parkingType: unit.parkingType || null,
        parkingBays: Number(unit.parkingBays || 0),
        
        // Dimensions
        sizeFrom: Number(unit.sizeFrom || unit.unitSize || 0),
        sizeTo: Number(unit.sizeTo || unit.sizeFrom || unit.unitSize || 0),
        
        // Pricing
        priceFrom: basePrice,
        priceTo: basePrice + extrasTotal,
        
        // Extras
        extras: unit.extras || [],
        
        // Inventory
        totalUnits: Number(unit.totalUnits || 0),
        availableUnits: Number(unit.availableUnits || 0),
        
        // Metadata
        isActive: boolToInt(unit.isActive !== false),
        updatedAt: new Date().toISOString(),
      };

      // Upsert logic
      const existingUnit = await db
        .select()
        .from(unitTypes)
        .where(eq(unitTypes.id, unit.id))
        .limit(1);

      if (existingUnit.length > 0) {
        // Update existing unit
        await db
          .update(unitTypes)
          .set(unitPayload)
          .where(eq(unitTypes.id, unit.id));
        
        results.updated++;
      } else {
        // Insert new unit
        await db.insert(unitTypes).values({
          id: unit.id,
          ...unitPayload,
          createdAt: new Date().toISOString(),
        });
        
        results.created++;
      }
    } catch (error: any) {
      console.error('[persistUnitTypes] Failed to persist unit:', {
        unitId: unit.id,
        unitName: unit.name,
        error: error.message,
      });
      throw error; // Re-throw to trigger rollback logic
    }
  }

  console.log('[persistUnitTypes] Complete:', results);
}

async function getDevelopmentWithPhases(id: number) {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(developments)
    .where(eq(developments.id, id))
    .limit(1);

  if (!results.length) return null;

  const dev = results[0];
  const phases = await db
    .select()
    .from(developmentPhases)
    .where(eq(developmentPhases.developmentId, id));

  return { ...dev, phases };
}

async function getDevelopmentsByDeveloperId(developerId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(developments)
    .where(eq(developments.developerId, developerId));
}

async function createPhase(developmentId: number, developerId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(developmentPhases).values({
    ...data,
    developmentId,
  });

  const [created] = await db
    .select()
    .from(developmentPhases)
    .where(eq(developmentPhases.id, result.insertId))
    .limit(1);

  return created;
}

async function updatePhase(phaseId: number, developerId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(developmentPhases)
    .set(data)
    .where(eq(developmentPhases.id, phaseId));

  const [updated] = await db
    .select()
    .from(developmentPhases)
    .where(eq(developmentPhases.id, phaseId))
    .limit(1);

  return updated;
}

async function deleteDevelopment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.delete(developments).where(eq(developments.id, id));
  return result;
}

async function publishDevelopment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(developments)
    .set({
      isPublished: 1,
      publishedAt: new Date().toISOString(),
      status: 'launching-soon',
    })
    .where(eq(developments.id, id));

  const [updated] = await db
    .select()
    .from(developments)
    .where(eq(developments.id, id))
    .limit(1);

  return updated;
}

// =========================================================================== 
// EXPORTS
// =========================================================================== 

export const developmentService = {
  // Public
  getPublicDevelopmentBySlug,
  getPublicDevelopment,
  listPublicDevelopments,
  
  // Admin/Developer
  createDevelopment,
  updateDevelopment,
  getDevelopmentWithPhases,
  getDevelopmentsByDeveloperId,
  getDeveloperDevelopments: getDevelopmentsByDeveloperId,
  createPhase,
  updatePhase,
  deleteDevelopment,
  publishDevelopment,
};
