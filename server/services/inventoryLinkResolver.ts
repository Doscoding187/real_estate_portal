import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
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

type PropertyInventoryRecord = {
  id: number;
  ownerId: number;
  agentId: number | null;
  sourceListingId: number | null;
  title: string;
  address: string;
  city: string;
  province: string;
  status: string;
  createdAt: string;
};

export type ResolvedInventoryLink = {
  listingId: number;
  propertyId: number | null;
  inventoryModel: 'property' | 'legacy_listing';
  matchReason: 'source_listing_id' | 'owner_title_address' | 'none';
};

export type InventoryBridgeSchemaCapabilities = {
  propertiesSourceListingIdColumn: boolean;
  showingsPropertyIdColumn: boolean;
  showingsLeadIdColumn: boolean;
};

const CAP_CACHE_TTL_MS = 60_000;
let cachedCapabilities: { value: InventoryBridgeSchemaCapabilities; expiresAt: number } | null = null;

function normalizeRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) {
    if (Array.isArray(result[0])) {
      return result[0] as Record<string, unknown>[];
    }
    return result as Record<string, unknown>[];
  }

  if (result && typeof result === 'object') {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) {
      return rows as Record<string, unknown>[];
    }
  }

  return [];
}

function readCount(rows: Record<string, unknown>[]) {
  const raw = rows[0]?.count_value ?? rows[0]?.count ?? 0;
  return Number(raw || 0);
}

async function columnExists(db: DbLike, tableName: string, columnName: string) {
  const result = await db.execute(sql`
    SELECT COUNT(*) AS count_value
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND LOWER(table_name) = LOWER(${tableName})
      AND LOWER(column_name) = LOWER(${columnName})
  `);

  return readCount(normalizeRows(result)) > 0;
}

export async function getInventoryBridgeSchemaCapabilities(
  db: DbLike,
  options?: { forceRefresh?: boolean },
): Promise<InventoryBridgeSchemaCapabilities> {
  const now = Date.now();
  if (!options?.forceRefresh && cachedCapabilities && cachedCapabilities.expiresAt > now) {
    return cachedCapabilities.value;
  }

  const value = {
    propertiesSourceListingIdColumn: await columnExists(db, 'properties', 'sourceListingId'),
    showingsPropertyIdColumn: await columnExists(db, 'showings', 'propertyId'),
    showingsLeadIdColumn: await columnExists(db, 'showings', 'leadId'),
  };

  cachedCapabilities = {
    value,
    expiresAt: now + CAP_CACHE_TTL_MS,
  };

  return value;
}

function normalizeComparableValue(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

function scorePropertyMatch(
  listing: ListingInventoryRecord,
  property: PropertyInventoryRecord,
): number {
  let score = 0;

  if (
    listing.agentId != null &&
    property.agentId != null &&
    Number(listing.agentId) === Number(property.agentId)
  ) {
    score += 4;
  }

  if (normalizeComparableValue(listing.city) === normalizeComparableValue(property.city)) {
    score += 2;
  }

  if (normalizeComparableValue(listing.province) === normalizeComparableValue(property.province)) {
    score += 2;
  }

  if (property.status === 'published' || property.status === 'available') {
    score += 1;
  }

  return score;
}

export async function resolvePropertyForListing(
  db: DbLike,
  listing: ListingInventoryRecord,
): Promise<ResolvedInventoryLink> {
  // Agent OS treats properties as the operational inventory model.
  // New writes populate sourceListingId, but older rows still need compatibility matching.
  // Centralize both here so routers do not reimplement inventory bridging logic.
  const capabilities = await getInventoryBridgeSchemaCapabilities(db);
  const candidates = await db
    .select({
      id: properties.id,
      ownerId: properties.ownerId,
      agentId: properties.agentId,
      sourceListingId: capabilities.propertiesSourceListingIdColumn
        ? properties.sourceListingId
        : sql<number | null>`NULL`,
      title: properties.title,
      address: properties.address,
      city: properties.city,
      province: properties.province,
      status: properties.status,
      createdAt: properties.createdAt,
    })
    .from(properties)
    .where(
      and(
        eq(properties.ownerId, listing.ownerId),
        eq(properties.title, listing.title),
        eq(properties.address, listing.address),
      ),
    )
    .orderBy(desc(properties.createdAt))
    .limit(10);

  const directMatch = candidates.find(candidate => Number(candidate.sourceListingId) === Number(listing.id));
  if (directMatch) {
    return {
      listingId: listing.id,
      propertyId: directMatch.id,
      inventoryModel: 'property',
      matchReason: 'source_listing_id',
    };
  }

  if (candidates.length === 0) {
    return {
      listingId: listing.id,
      propertyId: null,
      inventoryModel: 'legacy_listing',
      matchReason: 'none',
    };
  }

  const bestMatch = [...candidates].sort((left, right) => {
    const scoreDelta = scorePropertyMatch(listing, right) - scorePropertyMatch(listing, left);
    if (scoreDelta !== 0) return scoreDelta;
    return String(right.createdAt).localeCompare(String(left.createdAt));
  })[0];

  return {
    listingId: listing.id,
    propertyId: bestMatch.id,
    inventoryModel: 'property',
    matchReason: 'owner_title_address',
  };
}

export async function resolvePropertiesForListings(
  db: DbLike,
  listingRecords: ListingInventoryRecord[],
): Promise<Map<number, ResolvedInventoryLink>> {
  const results = await Promise.all(
    listingRecords.map(async listing => [listing.id, await resolvePropertyForListing(db, listing)] as const),
  );

  return new Map(results);
}

export async function getAgentInventorySchedulingOptions(
  db: DbLike,
  userId: number,
  agentId: number | null,
  options?: { allowLegacyFallback?: boolean },
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
    .where(
      and(
        ownershipCondition,
        inArray(listings.status, ['approved', 'published', 'pending_review', 'draft']),
      ),
    )
    .orderBy(desc(listings.updatedAt));

  const resolvedMap = await resolvePropertiesForListings(db, records);

  const normalizedRecords = records.map(record => {
    const resolved = resolvedMap.get(record.id);

    return {
      id: record.id,
      listingId: record.id,
      propertyId: resolved?.propertyId ?? null,
      inventoryModel: resolved?.inventoryModel ?? 'legacy_listing',
      isResolved: (resolved?.propertyId ?? null) != null,
      matchReason: resolved?.matchReason ?? 'none',
      title: record.title,
      address: record.address,
      city: record.city,
      status: record.status,
    };
  }).sort((left, right) => {
    if (left.isResolved !== right.isResolved) {
      return left.isResolved ? -1 : 1;
    }

    if (left.status === 'published' && right.status !== 'published') return -1;
    if (right.status === 'published' && left.status !== 'published') return 1;

    return String(left.title || '').localeCompare(String(right.title || ''));
  });

  if (options?.allowLegacyFallback === false) {
    return normalizedRecords.filter(record => record.isResolved);
  }

  return normalizedRecords;
}
