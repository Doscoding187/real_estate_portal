
import { 
  eq, 
  desc, 
  and, 
  or, 
  isNotNull,
  sql
} from 'drizzle-orm';
import { getDb } from '../db';
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
  const db = await getDb();
  if (!db) return null;

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
    .select()
    .from(developmentPhases)
    .where(eq(developmentPhases.developmentId, dev.id))
    .orderBy(developmentPhases.phaseNumber);

  return {
    ...dev,
    unitTypes: units,
    phases: phases,
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

async function createDevelopment(developerId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(developments).values({
    ...data,
    developerId,
    // Ensure amenities are stringified if passed as array, or let Drizzle handle JSON if column is json
    amenities: Array.isArray(data.amenities) ? data.amenities : data.amenities
  }).returning();
  
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

// Object export to satisfy existing consumers
export const developmentService = {
  getPublicDevelopmentBySlug,
  getPublicDevelopment,
  listPublicDevelopments,
  createDevelopment,
  getDevelopmentWithPhases,
  getDevelopmentsByDeveloperId,
  createPhase,
  updatePhase
};
