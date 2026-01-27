/**
 * List public published developments with richer details for the demo page
 */
export async function listPublicDevelopments(limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  // Fetch developments with developer info
  const results = await db
    .select({
      id: developments.id,
      name: developments.name,
      description: developments.description,
      city: developments.city,
      suburb: developments.suburb,
      province: developments.province,
      images: developments.images,
      priceFrom: developments.priceFrom,
      highlights: developments.highlights,
      isFeatured: developments.isFeatured,
      rating: developments.rating,
      createdAt: developments.createdAt,
      developerName: developers.name,
      developerIsFeatured: developers.isVerified, // Using isVerified as proxy for featured for now
    })
    .from(developments)
    .innerJoin(developers, eq(developments.developerId, developers.id))
    .where(and(eq(developments.isPublished, 1), eq(developments.approvalStatus, 'approved')))
    .orderBy(desc(developments.isFeatured), desc(developments.createdAt))
    .limit(limit);

  // Fetch unit types for these developments to build the "unitTypes" summary
  // This is an N+1 query optimization using inArray if needed, or just iterate.
  // For simplicity/speed in this verification, I'll fetch unit types for all fetched dev IDs
  const devIds = results.map(d => d.id);

  let unitTypesMap: Record<number, any[]> = {};

  if (devIds.length > 0) {
    const units = await db
      .select({
        developmentId: require('../drizzle/schema').unitTypes.developmentId,
        bedrooms: require('../drizzle/schema').unitTypes.bedrooms,
        name: require('../drizzle/schema').unitTypes.name,
        priceFrom: require('../drizzle/schema').unitTypes.basePriceFrom,
      })
      .from(require('../drizzle/schema').unitTypes)
      .where(inArray(require('../drizzle/schema').unitTypes.developmentId, devIds));

    // Group by developmentId
    units.forEach((u: any) => {
      if (!unitTypesMap[u.developmentId]) unitTypesMap[u.developmentId] = [];
      unitTypesMap[u.developmentId].push({
        bedrooms: u.bedrooms,
        label: u.name,
        priceFrom: Number(u.priceFrom),
      });
    });
  }

  return results.map(dev => ({
    ...dev,
    unitTypes: unitTypesMap[dev.id] || [],
  }));
}
