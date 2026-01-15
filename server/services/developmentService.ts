import { eq, desc, and, or, isNotNull, sql, inArray } from 'drizzle-orm';
import { getDb } from '../db-connection';
import { developments, developers, unitTypes, developmentPhases } from '../../drizzle/schema';

// =========================================================================== 
// TYPES
// =========================================================================== 

interface CreateDevelopmentData {
  // Identity
  name: string;
  tagline?: string;
  developmentType: 'residential' | 'commercial' | 'mixed_use' | 'estate' | 'complex';
  description?: string;
  slug?: string;

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
/**
 * Normalizes image arrays (handles both string and array formats)
 * Preserves structured objects { url, category, caption }
 * IMPORTANT: Do NOT normalize or flatten image/unit JSON.
 * This data is used for wizard resume & edit flows.
 * Breaking this will cause silent data loss.
 */
function normalizeImages(images: any): any[] {
  if (Array.isArray(images)) return images;
  
  if (typeof images === 'string') {
    // Handle comma-separated strings
    if (images.includes(',') && !images.trim().startsWith('[')) {
      return images.split(',').map(img => img.trim()).filter(Boolean);
    }
    // Handle JSON string
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Fallback for single image string
      return images ? [images] : [];
    }
    // Single image string that failed JSON parse
    return images ? [images] : [];
  }
  
  return []; 
}

/**
 * Safely parses a JSON string field that might be stored as text
 */
function parseJsonField(field: any): any[] {
  if (Array.isArray(field)) return field;
  if (!field) return [];
  
  if (typeof field === 'string') {
    try {
      // Check if it looks like a JSON array
      const trimmed = field.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        return JSON.parse(trimmed);
      }
      // Handle comma-separated list
      if (trimmed.includes(',')) {
         return trimmed.split(',').map((s: string) => s.trim());
      }
      return [trimmed];
    } catch (e) {
      console.warn('[developmentService] Failed to parse JSON field:', field);
      return [];
    }
  }
  return [];
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
    errno: error.errno,
    sqlMessage: error.sqlMessage,
    sqlState: error.sqlState,
    keys: Object.keys(error),
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
      amenities: normalizeAmenities(dev.amenities), // JSON column, Drizzle handles or we normalize
      // Helper to parse TEXT columns that contain JSON strings
      images: parseJsonField(dev.images),
      videos: parseJsonField(dev.videos),
      floorPlans: parseJsonField(dev.floorPlans),
      brochures: parseJsonField(dev.brochures),
      
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

  if (!results[0]) return null;

  return {
    ...results[0],
    images: parseJsonField(results[0].images),
  };
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

  return results.map(dev => ({
    ...dev,
    images: parseJsonField(dev.images),
  }));
}

// =========================================================================== 
// ADMIN / DEVELOPER FUNCTIONS
// =========================================================================== 

/**
 * Creates a new development with associated unit types in a transaction
 */
export async function createDevelopment(
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
  // CRITICAL: Ensure Slug Uniqueness
  // Whether provided or generated from name, we MUST ensure it's unique in the DB.
  let baseSlug = developmentData.slug;
  if (!baseSlug || baseSlug.trim() === '') {
    if (!developmentData.name) {
      throw createError('Either slug or name must be provided to generate a slug', 'VALIDATION_ERROR');
    }
    baseSlug = developmentData.name; // Will be slugified inside generateUniqueSlug
  }
  
  // existing generateUniqueSlug handles slugification and appending counter
  const slug = await generateUniqueSlug(baseSlug);
  console.log('[createDevelopment] Final unique slug:', slug);

  // Transform data for MySQL compatibility
  // Transform data for MySQL compatibility
  const transformedData: any = {
    // Core Identity
    developerId,
    slug,
    name: developmentData.name,
    tagline: developmentData.tagline || null,
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
    publishedAt: boolToInt(developmentData.isPublished) === 1 ? new Date().toISOString() : null,
    
    // Auto-approve platform-seeded developments when published
    // (Subscriber developments go through approval queue)
    approvalStatus: boolToInt(developmentData.isPublished) === 1 && ownerType === 'platform' 
      ? 'approved' 
      : (developmentData.approvalStatus || 'draft'),
    
    // Identity & Classification
    nature: developmentData.nature || 'new',
    totalDevelopmentArea: developmentData.totalDevelopmentArea || null,
    propertyTypes: developmentData.propertyTypes ? JSON.stringify(developmentData.propertyTypes) : null,
    customClassification: developmentData.customClassification || null,
    
    // Default values
    views: developmentData.views ?? 0,
    
    // JSON Fields (Drizzle handles these automatically as they are defined as json())
    amenities: normalizeAmenities(developmentData.amenities),
    highlights: normalizeAmenities(developmentData.highlights),
    features: normalizeAmenities(developmentData.features),
    estateSpecs: developmentData.estateSpecs || null, // Assuming JSON
    
    // Text Fields (MUST stringify arrays manually as they are defined as text() in schema)
    // NOTE: We check if it's already a string (e.g. from comma-separated input) or an array
    images: JSON.stringify(normalizeImages(developmentData.images)),

    videos: Array.isArray(developmentData.videos) ? JSON.stringify(developmentData.videos) : (developmentData.videos || null),
    floorPlans: Array.isArray(developmentData.floorPlans) ? JSON.stringify(developmentData.floorPlans) : (developmentData.floorPlans || null),
    brochures: Array.isArray(developmentData.brochures) ? JSON.stringify(developmentData.brochures) : (developmentData.brochures || null),

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

export async function updateDevelopment(
  id: number, 
  developerId: number, 
  data: CreateDevelopmentData
) {
  console.log('[updateDevelopment] Starting update for development:', id);
  console.log('[updateDevelopment] Payload keys:', Object.keys(data));
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Separate concerns
  const { 
    unitTypes: unitTypesData,
    media: mediaData,
    amenities: amenitiesData,
    estateSpecs: estateSpecsData,
    specifications: specificationsData,
    phases: phasesData,
    ...developmentData 
  } = data;

  // ============================================================================
  // STEP 1: Core Development Table Fields
  // ============================================================================
  const updatePayload: any = {};

  // Basic Identity Fields (always safe to update)
  if (developmentData.name !== undefined) updatePayload.name = developmentData.name;
  if (developmentData.description !== undefined) updatePayload.description = developmentData.description;
  if (developmentData.tagline !== undefined) updatePayload.tagline = developmentData.tagline;
  if (developmentData.subtitle !== undefined) updatePayload.subtitle = developmentData.subtitle;

  // Type & Classification
  if (developmentData.developmentType !== undefined) updatePayload.developmentType = developmentData.developmentType;
  if (developmentData.propertyCategory !== undefined) updatePayload.propertyCategory = developmentData.propertyCategory;
  if (developmentData.subCategory !== undefined) updatePayload.subCategory = developmentData.subCategory;

  // Location Fields
  if (developmentData.address !== undefined) updatePayload.address = developmentData.address;
  if (developmentData.suburb !== undefined) updatePayload.suburb = developmentData.suburb;
  if (developmentData.city !== undefined) updatePayload.city = developmentData.city;
  if (developmentData.province !== undefined) updatePayload.province = developmentData.province;
  if (developmentData.postalCode !== undefined) updatePayload.postalCode = developmentData.postalCode;
  if (developmentData.latitude !== undefined) updatePayload.latitude = developmentData.latitude;
  if (developmentData.longitude !== undefined) updatePayload.longitude = developmentData.longitude;

  // Status & Dates
  if (developmentData.status !== undefined) updatePayload.status = developmentData.status;
  if (developmentData.completionDate !== undefined) updatePayload.completionDate = developmentData.completionDate;
  if (developmentData.launchDate !== undefined) updatePayload.launchDate = developmentData.launchDate;

  // Numerical Fields - ALL of them
  const numericFields = [
    'priceFrom', 'priceTo',
    'monthlyLevyFrom', 'monthlyLevyTo',
    'ratesFrom', 'ratesTo',
    'totalUnits', 'availableUnits',
    'totalDevelopmentArea',
    'erfSizeFrom', 'erfSizeTo',
    'floorSizeFrom', 'floorSizeTo',
    'bedroomsFrom', 'bedroomsTo',
    'bathroomsFrom', 'bathroomsTo'
  ];

  numericFields.forEach(field => {
    if (developmentData[field] !== undefined) {
      updatePayload[field] = developmentData[field];
    }
  });

  // Boolean Fields - explicitly handle true/false/null
  const booleanFields = [
    'petsAllowed',
    'fibreReady',
    'solarReady',
    'waterBackup',
    'backupPower',
    'gatedCommunity',
    'featured',
    'isPhasedDevelopment'
  ];

  booleanFields.forEach(field => {
    if (developmentData[field] !== undefined) {
      updatePayload[field] = developmentData[field];
    }
  });

  // ============================================================================
  // STEP 2: JSON Fields - Preserve Structure
  // ============================================================================
  
  // Media (Photos, Videos, Brochures)
  if (mediaData !== undefined) {
    updatePayload.media = typeof mediaData === 'string' 
      ? mediaData 
      : JSON.stringify(mediaData || { photos: [], videos: [], brochures: [] });
  }

  // Amenities (Standard + Additional)
  if (amenitiesData !== undefined) {
    updatePayload.amenities = typeof amenitiesData === 'string'
      ? amenitiesData
      : JSON.stringify(amenitiesData || { standard: [], additional: [] });
  }

  // Estate Specs (for Residential/Estate developments)
  if (estateSpecsData !== undefined) {
    updatePayload.estateSpecs = typeof estateSpecsData === 'string'
      ? estateSpecsData
      : JSON.stringify(estateSpecsData || {});
  }

  // Specifications (Master specs inherited by units)
  if (specificationsData !== undefined) {
    updatePayload.specifications = typeof specificationsData === 'string'
      ? specificationsData
      : JSON.stringify(specificationsData || {});
  }

  // Config-specific JSON fields
  if (developmentData.residentialConfig !== undefined) {
    updatePayload.residentialConfig = typeof developmentData.residentialConfig === 'string'
      ? developmentData.residentialConfig
      : JSON.stringify(developmentData.residentialConfig || {});
  }

  if (developmentData.landConfig !== undefined) {
    updatePayload.landConfig = typeof developmentData.landConfig === 'string'
      ? developmentData.landConfig
      : JSON.stringify(developmentData.landConfig || {});
  }

  if (developmentData.commercialConfig !== undefined) {
    updatePayload.commercialConfig = typeof developmentData.commercialConfig === 'string'
      ? developmentData.commercialConfig
      : JSON.stringify(developmentData.commercialConfig || {});
  }

  if (developmentData.mixedUseConfig !== undefined) {
    updatePayload.mixedUseConfig = typeof developmentData.mixedUseConfig === 'string'
      ? developmentData.mixedUseConfig
      : JSON.stringify(developmentData.mixedUseConfig || {});
  }

  // Marketing & SEO
  if (developmentData.metaTitle !== undefined) {
     updatePayload.metaTitle = developmentData.metaTitle;
  }
  if (developmentData.metaDescription !== undefined) {
     updatePayload.metaDescription = developmentData.metaDescription;
  }
  if (developmentData.keywords !== undefined) {
    updatePayload.keywords = typeof developmentData.keywords === 'string'
      ? developmentData.keywords
      : JSON.stringify(developmentData.keywords || []);
  }

  // Developer References
  if (developmentData.brandProfileId !== undefined) updatePayload.developerBrandProfileId = developmentData.brandProfileId;
  if (developmentData.agentId !== undefined) updatePayload.agentId = developmentData.agentId;

  // Always update timestamp
  updatePayload.updatedAt = new Date().toISOString();

  console.log('[updateDevelopment] Update payload fields:', Object.keys(updatePayload));

  // Execute core table update
  await db
    .update(developments)
    .set(updatePayload)
    .where(eq(developments.id, id));

  // ============================================================================
  // STEP 3: Unit Types (Full Sync with Deletion)
  // ============================================================================
  if (unitTypesData !== undefined) {
    if (Array.isArray(unitTypesData)) {
      if (unitTypesData.length === 0) {
        console.warn('[updateDevelopment] Empty unitTypes - will DELETE all units');
      }
      await persistUnitTypes(db, id, unitTypesData);
    } else {
      console.warn('[updateDevelopment] unitTypes is not an array:', typeof unitTypesData);
    }
  } else {
    console.log('[updateDevelopment] No unitTypes in payload - preserving existing');
  }

  // ============================================================================
  // STEP 4: Development Phases (if phased development)
  // ============================================================================
  if (phasesData !== undefined && Array.isArray(phasesData)) {
    await persistDevelopmentPhases(db, id, phasesData);
  }

  console.log('[updateDevelopment] Update completed successfully');
  return { success: true };
}

/**
 * Persists unit types with proper deletion handling.
 * This replaces the old "upsert-only" approach with a full sync strategy.
 */
/**
 * PERSIST UNIT TYPES WITH FULL SYNC
 * - Deletes units that were removed
 * - Updates existing units
 * - Inserts new units
 */
async function persistUnitTypes(
  db: any,
  developmentId: number,
  unitTypesData: any[]
): Promise<void> {
  console.log(`[persistUnitTypes] Processing ${unitTypesData.length} units`);

  // Get existing unit IDs
  const existingUnits = await db
    .select({ id: unitTypes.id })
    .from(unitTypes)
    .where(eq(unitTypes.developmentId, developmentId));

  const existingIds = new Set(existingUnits.map((u: any) => u.id));
  const incomingIds = new Set(unitTypesData.filter(u => u.id).map(u => u.id));

  // Delete removed units
  const idsToDelete = [...existingIds].filter(id => !incomingIds.has(id));
  if (idsToDelete.length > 0) {
    console.log(`[persistUnitTypes] Deleting ${idsToDelete.length} units:`, idsToDelete);
    await db.delete(unitTypes).where(
      and(
        eq(unitTypes.developmentId, developmentId),
        inArray(unitTypes.id, idsToDelete)
      )
    );
  }

  // Upsert each unit
  for (const unit of unitTypesData) {
    if (!unit.id) {
      unit.id = `unit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    const unitPayload = {
      id: unit.id,
      developmentId,
      label: unit.label || unit.name || 'Unnamed Unit',
      name: unit.name || unit.label || 'Unnamed Unit',
      
      // ALL fields explicitly mapped
      ownershipType: unit.ownershipType || null,
      structuralType: unit.structuralType || null,
      bedrooms: unit.bedrooms !== undefined ? unit.bedrooms : null,
      bathrooms: unit.bathrooms !== undefined ? unit.bathrooms : null,
      floorSizeFrom: unit.floorSizeFrom || null,
      floorSizeTo: unit.floorSizeTo || null,
      yardSize: unit.yardSize || null,
      parkingType: unit.parkingType || null,
      parkingSpaces: unit.parkingSpaces !== undefined ? unit.parkingSpaces : null,
      priceFrom: unit.priceFrom || null,
      priceTo: unit.priceTo || null,
      depositRequired: unit.depositRequired !== undefined ? unit.depositRequired : null,
      availableUnits: unit.availableUnits !== undefined ? unit.availableUnits : null,
      completionDate: unit.completionDate || null,
      internalNotes: unit.internalNotes || null,
      
      // JSON fields
      extras: JSON.stringify(unit.extras || []),
      specifications: JSON.stringify(unit.specifications || {}),
      amenities: JSON.stringify(unit.amenities || { standard: [], additional: [] }),
      baseMedia: JSON.stringify(unit.baseMedia || { gallery: [], floorPlans: [], renders: [] }),
      specs: JSON.stringify(unit.specs || []),
      
      updatedAt: new Date().toISOString(),
    };

    if (existingIds.has(unit.id)) {
      await db.update(unitTypes).set(unitPayload).where(eq(unitTypes.id, unit.id));
    } else {
      await db.insert(unitTypes).values({
        ...unitPayload,
        createdAt: new Date().toISOString(),
      });
    }
  }
}

/**
 * PERSIST DEVELOPMENT PHASES (for phased developments)
 */
async function persistDevelopmentPhases(
  db: any,
  developmentId: number,
  phasesData: any[]
): Promise<void> {
  console.log(`[persistDevelopmentPhases] Processing ${phasesData.length} phases`);

  // Get existing phases
  const existingPhases = await db
    .select({ id: developmentPhases.id })
    .from(developmentPhases)
    .where(eq(developmentPhases.developmentId, developmentId));

  const existingIds = new Set(existingPhases.map((p: any) => p.id));
  const incomingIds = new Set(phasesData.filter(p => p.id).map(p => p.id));

  // Delete removed phases
  const idsToDelete = [...existingIds].filter(id => !incomingIds.has(id));
  if (idsToDelete.length > 0) {
    await db.delete(developmentPhases).where(
      and(
        eq(developmentPhases.developmentId, developmentId),
        inArray(developmentPhases.id, idsToDelete)
      )
    );
  }

  // Upsert phases
  for (const phase of phasesData) {
    if (!phase.id) {
      phase.id = `phase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    const phasePayload = {
      id: phase.id,
      developmentId,
      name: phase.name || 'Unnamed Phase',
      description: phase.description || null,
      status: phase.status || 'planning',
      completionDate: phase.completionDate || null,
      totalUnits: phase.totalUnits || null,
      availableUnits: phase.availableUnits || null,
      media: JSON.stringify(phase.media || {}),
    };

    if (existingIds.has(phase.id)) {
      await db.update(developmentPhases).set(phasePayload).where(eq(developmentPhases.id, phase.id));
    } else {
      await db.insert(developmentPhases).values({
        ...phasePayload,
        createdAt: new Date().toISOString(),
      });
    }
  }
}

/**
 * GET DEVELOPMENT WITH ALL RELATED DATA
 * Critical: ALWAYS return arrays (never undefined) for related data
 */
export async function getDevelopmentWithPhases(id: number) {
  console.log('[getDevelopmentWithPhases] Loading development:', id);
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [dev] = await db
    .select()
    .from(developments)
    .where(eq(developments.id, id))
    .limit(1);

  if (!dev) {
    throw new Error('Development not found');
  }

  // Load related data
  let unitTypesData: any[] = [];
  let phasesData: any[] = [];

  try {
    const [unitTypesRes, phasesRes] = await Promise.all([
      db.select().from(unitTypes).where(eq(unitTypes.developmentId, id)),
      db.select().from(developmentPhases).where(eq(developmentPhases.developmentId, id))
    ]);
    
    unitTypesData = unitTypesRes || [];
    phasesData = phasesRes || [];
    
    console.log(`[getDevelopmentWithPhases] Loaded ${unitTypesData.length} units, ${phasesData.length} phases`);
  } catch (error: any) {
    console.error('[getDevelopmentWithPhases] Failed to load related data:', error.message);
    // Still return empty arrays - don't crash
  }

  // Helper to safely parse JSON
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

  // Return complete development with ALL fields preserved
  return {
    ...dev,
    
    // Parse JSON columns
    media: parse(dev.media, { photos: [], videos: [], brochures: [] }),
    amenities: parse(dev.amenities, { standard: [], additional: [] }),
    estateSpecs: parse(dev.estateSpecs, {}),
    specifications: parse(dev.specifications, {}),
    residentialConfig: parse(dev.residentialConfig, {}),
    landConfig: parse(dev.landConfig, {}),
    commercialConfig: parse(dev.commercialConfig, {}),
    mixedUseConfig: parse(dev.mixedUseConfig, {}),
    // keywords: parse(dev.keywords, []), 
    
    // CRITICAL: Always return arrays (never undefined)
    unitTypes: unitTypesData.map(u => ({
      ...u,
      extras: parse(u.extras, []),
      specifications: parse(u.specifications, {}),
      amenities: parse(u.amenities, { standard: [], additional: [] }),
      baseMedia: parse(u.baseMedia, { gallery: [], floorPlans: [], renders: [] }),
      specs: parse(u.specs, []),
    })),
    
    phases: phasesData.map(p => ({
      ...p,
      media: parse(p.media, {}),
    })),
  };
}

async function getDevelopmentsByDeveloperId(developerId: number) {
  const db = await getDb();
  if (!db) return [];

  const results = await db
    .select()
    .from(developments)
    .where(eq(developments.developerId, developerId));
    
  return results.map(dev => ({
    ...dev,
    amenities: normalizeAmenities(dev.amenities),
    images: parseJsonField(dev.images),
    videos: parseJsonField(dev.videos),
    floorPlans: parseJsonField(dev.floorPlans),
    brochures: parseJsonField(dev.brochures),
  }));
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

async function deleteDevelopment(id: number, developerId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Optionally verify ownership if developerId is provided and not -1 (platform mode)
  if (developerId !== undefined && developerId !== -1) {
    const [dev] = await db.select().from(developments).where(eq(developments.id, id)).limit(1);
    if (!dev) throw new Error('Development not found');
    if (dev.developerId !== developerId) throw new Error('Unauthorized: You do not own this development');
  }

  // CRITICAL: Delete child records first to avoid FK constraint errors
  console.log('[deleteDevelopment] Deleting unit types for development:', id);
  await db.delete(unitTypes).where(eq(unitTypes.developmentId, id));
  
  console.log('[deleteDevelopment] Deleting phases for development:', id);
  await db.delete(developmentPhases).where(eq(developmentPhases.developmentId, id));

  // Now delete the parent development
  console.log('[deleteDevelopment] Deleting development:', id);
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
