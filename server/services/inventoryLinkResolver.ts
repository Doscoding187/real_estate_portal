import { and, desc, eq, inArray, or } from 'drizzle-orm';
import { listings, properties } from '../../drizzle/schema';

type DbLike = Awaited<ReturnType<typeof import('../db').getDb>>;

type ListingInventoryRecord = {
  id: number;
  ownerId: number;
  agentId: number | null;
  title: string;
  address: string;
  city?: string | null;
  province?: string | null;
  status?: string | null;
};

export type ResolvedInventoryLink = {
  listingId: number;
  propertyId: number | null;
  isResolved: boolean;
  matchReason: 'source_listing_id' | 'missing_source_listing_id' | 'duplicate_source_listing_id';
};

export async function resolvePropertyForListing(
  db: DbLike,
  listing: ListingInventoryRecord,
): Promise<ResolvedInventoryLink> {
  const matches = await db
    .select({ id: properties.id })
    .from(properties)
    .where(eq(properties.sourceListingId, listing.id))
    .orderBy(desc(properties.createdAt))
    .limit(2);

  if (matches.length === 1) {
    return {
      listingId: listing.id,
      propertyId: matches[0].id,
      isResolved: true,
      matchReason: 'source_listing_id',
    };
  }

  return {
    listingId: listing.id,
    propertyId: null,
    isResolved: false,
    matchReason: matches.length > 1 ? 'duplicate_source_listing_id' : 'missing_source_listing_id',
  };
}

export async function resolvePropertiesForListings(
  db: DbLike,
  listingRecords: ListingInventoryRecord[],
): Promise<Map<number, ResolvedInventoryLink>> {
  const results = await Promise.all(
    listingRecords.map(
      async listing => [listing.id, await resolvePropertyForListing(db, listing)] as const,
    ),
  );

  return new Map(results);
}

export async function getAgentInventorySchedulingOptions(
  db: DbLike,
  userId: number,
  agentId: number | null,
) {
  const ownershipCondition =
    agentId != null
      ? or(eq(listings.ownerId, userId), eq(listings.agentId, agentId))!
      : eq(listings.ownerId, userId);

  const records = await db
    .select({
      id: listings.id,
      ownerId: listings.ownerId,
      agentId: listings.agentId,
      title: listings.title,
      address: listings.address,
      city: listings.city,
      province: listings.province,
      status: listings.status,
      updatedAt: listings.updatedAt,
    })
    .from(listings)
    .where(and(ownershipCondition, inArray(listings.status, ['approved', 'published'])))
    .orderBy(desc(listings.updatedAt));

  const resolvedMap = await resolvePropertiesForListings(db, records);

  return records
    .flatMap(record => {
      const resolved = resolvedMap.get(record.id);

      if (!resolved?.isResolved || resolved.propertyId == null) {
        return [];
      }

      return [
        {
          id: record.id,
          listingId: record.id,
          propertyId: resolved.propertyId,
          isResolved: true as const,
          matchReason: resolved.matchReason,
          title: record.title,
          address: record.address,
          city: record.city,
          status: record.status,
        },
      ];
    })
    .sort((left, right) => {
      if (left.status === 'published' && right.status !== 'published') return -1;
      if (right.status === 'published' && left.status !== 'published') return 1;

      return String(left.title || '').localeCompare(String(right.title || ''));
    });
}
