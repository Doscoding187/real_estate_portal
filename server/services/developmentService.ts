
import { 
  eq, 
  desc, 
  and, 
  or, 
  isNotNull,
  sql
} from 'drizzle-orm';
import { getDb } from '../db-connection';
import { 
  developments, 
  developers, 
  unitTypes, 
  developmentPhases 
} from '../../drizzle/schema';

// ===========================================================================
// PUBLIC FUNCTIONS (Moved from db.ts)
// ===========================================================================

export async function getPublicDevelopmentBySlug(slugOrId: string) {
  console.log('[DEBUG] Service: getPublicDevelopmentBySlug called with:', slugOrId);
  try {
    const db = await getDb();
    console.log('[DEBUG] Service: getDb result:', db ? 'Connected' : 'NULL');
    
    if (!db) {
      console.error('[CRITICAL] Service: Database connection is NULL');
      return null;
    }

  const isNumeric = /^\d+$/.test(slugOrId);
  const idValue = isNumeric ? parseInt(slugOrId) : -1;

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
      // Joined Developer Info
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
    .where(
      and(
        or(
          eq(developments.slug, slugOrId),
          eq(developments.id, idValue)
        ),
        eq(developments.isPublished, 1) // Only public
      )
    )
    .limit(1);

  if (results.length === 0) return null;

  const dev = results[0];

  // Fetch unit types
  const units = await db
    .select()
    .from(unitTypes)
    .where(
      and(
        eq(unitTypes.developmentId, dev.id),
        eq(unitTypes.isActive, 1)
      )
    )
    .orderBy(unitTypes.basePriceFrom);

  // Fetch phases
  const phases = await db
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
      // Removed latitude/longitude as they are missing in production
      // Omit missing columns: specType, customSpecType, finishingDifferences, phaseHighlights
    })
    .from(developmentPhases)
    .where(eq(developmentPhases.developmentId, dev.id))
    .orderBy(developmentPhases.phaseNumber);

    return {
      ...dev,
      amenities: Array.isArray(dev.amenities) ? dev.amenities : [],
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
    })
    .from(developments)
    .where(eq(developments.isPublished, 1))
    .orderBy(desc(developments.isFeatured), desc(developments.createdAt))
    .limit(limit);

  return results;
}

// ===========================================================================
// ADMIN / DEVELOPER FUNCTIONS (Restored)
// ===========================================================================

async function createDevelopment(developerId: number, data: any, metadata: any = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Extract unitTypes from data to prevent Drizzle error
  const { unitTypes: unitTypesData, ...developmentData } = data;

  const [result] = await db.insert(developments).values({
    ...developmentData,
    ...metadata,
    developerId,
    // Ensure amenities are stringified if passed as array, or let Drizzle handle JSON if column is json
    amenities: Array.isArray(developmentData.amenities) ? developmentData.amenities : developmentData.amenities
  }).returning();

  // Persist Unit Types
  if (unitTypesData && Array.isArray(unitTypesData) && unitTypesData.length > 0) {
     await persistUnitTypes(result.id, unitTypesData);
  }
  
  return result;
}

async function getDevelopmentWithPhases(id: number) {
  const db = await getDb();
  if (!db) return null;

  const results = await db.select().from(developments).where(eq(developments.id, id)).limit(1);
  if (!results.length) return null;
  const dev = results[0];

  const phases = await db.select().from(developmentPhases).where(eq(developmentPhases.developmentId, id));

  return {
    ...dev,
    phases
  };
}

async function getDevelopmentsByDeveloperId(developerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(developments).where(eq(developments.developerId, developerId));
}

async function updateDevelopment(id: number, developerId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // If developerId is -1, bypass ownership check (Super Admin mode)
  // Otherwise, verify ownership
  if (developerId !== -1) {
    const existing = await db
      .select()
      .from(developments)
      .where(and(eq(developments.id, id), eq(developments.developerId, developerId)))
      .limit(1);
      
    if (!existing.length) {
      throw new Error("Unauthorized: Development not found or you don't have permission to update it");
    }
  }

  // Extract unitTypes from data to prevent Drizzle error on development update
  const { unitTypes: unitTypesData, ...developmentData } = data;

  const [result] = await db.update(developments)
    .set({
      ...developmentData,
      amenities: Array.isArray(developmentData.amenities) ? developmentData.amenities : developmentData.amenities
    })
    .where(eq(developments.id, id))
    .returning();

  // Handle Unit Types Persistence
  if (unitTypesData && Array.isArray(unitTypesData) && unitTypesData.length > 0) {
    await persistUnitTypes(id, unitTypesData);
  }
  
  return result;
}

// Helper: Persist Unit Types
async function persistUnitTypes(developmentId: number, unitTypesData: any[]) {
   const db = await getDb();
   if (!db) return;

   console.log('[Service] persistUnitTypes: Processing', unitTypesData.length, 'unit types for dev', developmentId);
    
    for (const unit of unitTypesData) {
      // Basic validation
      if (!unit.id) continue;
      
      const unitPayload = {
        developmentId: developmentId,
        name: unit.name || 'Untitled Unit',
        bedrooms: Number(unit.bedrooms || 0),
        bathrooms: Number(unit.bathrooms || 0),
        parking: unit.parking, // Enum mapped
        parkingType: unit.parkingType, // Store if schema allows, or map to 'parking'
        parkingBays: Number(unit.parkingBays || 0),
        
        // Dimensions
        sizeFrom: Number(unit.sizeFrom || unit.unitSize || 0),
        sizeTo: Number(unit.sizeTo || unit.sizeFrom || unit.unitSize || 0),
        
        // Pricing
        priceFrom: Number(unit.priceFrom || unit.basePriceFrom || 0),
        priceTo: Number(unit.priceTo || unit.priceFrom || unit.basePriceTo || 0),
        
        // NEW FIELDS
        monthlyLevyFrom: unit.monthlyLevyFrom ? Number(unit.monthlyLevyFrom) : null,
        monthlyLevyTo: unit.monthlyLevyTo ? Number(unit.monthlyLevyTo) : null,
        ratesAndTaxesFrom: unit.ratesAndTaxesFrom ? Number(unit.ratesAndTaxesFrom) : null,
        ratesAndTaxesTo: unit.ratesAndTaxesTo ? Number(unit.ratesAndTaxesTo) : null,
        
        // Inventory
        totalUnits: Number(unit.totalUnits || 0),
        availableUnits: Number(unit.availableUnits || 0),
        
        // Metadata
        isActive: unit.isActive === false ? 0 : 1, // Default to 1
        updatedAt: new Date().toISOString()
      };

      // Check if unit exists
      const existingUnit = await db.select().from(unitTypes).where(eq(unitTypes.id, unit.id)).limit(1);
      
      if (existingUnit.length > 0) {
        // Update
        await db.update(unitTypes)
          .set(unitPayload)
          .where(eq(unitTypes.id, unit.id));
      } else {
        // Insert
        await db.insert(unitTypes).values({
          id: unit.id, // Use frontend generated ID
          ...unitPayload,
          createdAt: new Date().toISOString()
        });
      }
    }
}

async function createPhase(developmentId: number, developerId: number, data: any) {
   const db = await getDb();
   if (!db) throw new Error("Database not available");
   
   // Verify ownership if needed, but assuming check is done before or via developerId match if we enforced it
   const [result] = await db.insert(developmentPhases).values({
     ...data,
     developmentId
   }).returning();
   return result;
}

async function updatePhase(phaseId: number, developerId: number, data: any) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    // In real app, verify developer owns the development of this phase
    const [result] = await db.update(developmentPhases)
      .set(data)
      .where(eq(developmentPhases.id, phaseId))
      .returning();
    return result;
}

async function deleteDevelopment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Drizzle doesn't return deleted rows by default in MySQL, but we can return result info
  const result = await db.delete(developments).where(eq(developments.id, id));
  return result;
}

async function publishDevelopment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.update(developments)
    .set({ 
      isPublished: 1, 
      publishedAt: new Date().toISOString(),
      status: 'launching-soon' // Default status on publish
    })
    .where(eq(developments.id, id))
    .returning();
  return result;
}

// Object export to satisfy existing consumers
export const developmentService = {
  getPublicDevelopmentBySlug,
  getPublicDevelopment,
  listPublicDevelopments,
  createDevelopment,
  updateDevelopment,
  getDevelopmentWithPhases,
  getDevelopmentsByDeveloperId,
  getDeveloperDevelopments: getDevelopmentsByDeveloperId, // Alias for router compatibility
  createPhase,
  updatePhase,
  deleteDevelopment,
  publishDevelopment
};
