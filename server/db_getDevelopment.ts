import { getDb } from './db';
import { developments, developers, unitTypes } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Get a single public development by ID
 */
export async function getPublicDevelopment(id: number) {
  const db = await getDb();
  if (!db) return null;

  // 1. Fetch development + developer
  const dev = await db
    .select({
      id: developments.id,
      name: developments.name,
      description: developments.description,
      city: developments.city,
      suburb: developments.suburb,
      province: developments.province,
      address: developments.address,
      images: developments.images,
      priceFrom: developments.priceFrom,
      highlights: developments.highlights,
      amenities: developments.amenities,
      isFeatured: developments.isFeatured,
      rating: developments.rating,
      completionDate: developments.completionDate,
      totalUnits: developments.totalUnits,
      availableUnits: developments.availableUnits,
      createdAt: developments.createdAt,
      developerName: developers.name,
      developerSlug: developers.slug,
      developerIsFeatured: developers.isVerified,
      developerEmail: developers.email,
      developerPhone: developers.phone,
      developerWebsite: developers.website,
    })
    .from(developments)
    .innerJoin(developers, eq(developments.developerId, developers.id))
    .where(
      and(
        eq(developments.id, id),
        eq(developments.isPublished, 1),
        eq(developments.approvalStatus, 'approved'),
      ),
    )
    .limit(1)
    .then(res => res[0]);

  if (!dev) return null;

  // 2. Fetch Unit Types
  const unitTypesRes = await db.select().from(unitTypes).where(eq(unitTypes.developmentId, id));

  return {
    ...dev,
    unitTypes: unitTypesRes || [],
  };
}
