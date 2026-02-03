/**
 * Global Search Service (STUBBED)
 *
 * NOTE: locationSearches table is not exported from schema.
 * Trending/personalization features that depend on locationSearches are disabled.
 * Core search functionality preserved.
 */

import { getDb } from '../db';
import { locations, properties, developments } from '../../drizzle/schema';
import { eq, and, or, like, inArray, SQL } from 'drizzle-orm';

/**
 * Global Search Service
 *
 * Provides unified search across locations, listings, and developments
 * with intelligent ranking based on multiple signals.
 */

export interface SearchOptions {
  query: string;
  types?: ('location' | 'listing' | 'development')[];
  limit?: number;
  userId?: number;
}

export interface LocationResult {
  id: number;
  name: string;
  slug: string;
  type: 'province' | 'city' | 'suburb' | 'neighborhood';
  placeId: string | null;
  description: string | null;
  latitude: string | null;
  longitude: string | null;
  propertyCount: number | null;
  relevanceScore: number;
  trendingScore: number;
  url: string;
}

export interface ListingResult {
  id: number;
  title: string;
  price: number;
  propertyType: string;
  listingType: string;
  city: string;
  province: string;
  locationId: number | null;
  placeId: string | null;
  mainImage: string | null;
  relevanceScore: number;
}

export interface DevelopmentResult {
  id: number;
  name: string;
  description: string | null;
  city: string;
  province: string;
  locationId: number | null;
  placeId: string | null;
  mainImage: string | null;
  relevanceScore: number;
}

export interface SearchResults {
  locations: LocationResult[];
  listings: ListingResult[];
  developments: DevelopmentResult[];
  totalResults: number;
  query: string;
}

type LocationRow = {
  id: number;
  name: string;
  slug: string;
  type: LocationResult['type'];
  placeId: string | null;
  description: string | null;
  latitude: string | null;
  longitude: string | null;
  propertyCount: number | null;
  parentId: number | null;
};

type ListingRow = {
  id: number;
  title: string;
  price: number;
  propertyType: string;
  listingType: string;
  city: string;
  province: string;
  locationId: number | null;
  placeId: string | null;
  mainImage: string | null;
};

type DevelopmentRow = {
  id: number;
  name: string;
  description: string | null;
  city: string;
  province: string;
  locationId: number | null;
  suburb: string | null;
  images: string | null;
  placeId: string | null;
};

type ParentLocationRow = {
  slug: string;
  parentId: number | null;
};

function extractMainImage(images: string | null): string | null {
  if (!images) return null;
  const trimmed = images.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0] as { url?: string } | string;
        if (typeof first === 'string') return first;
        if (first && typeof first === 'object' && typeof first.url === 'string') return first.url;
      }
    } catch {
      return null;
    }
  }
  return trimmed;
}

/**
 * Perform global search across all entity types
 */
export async function globalSearch(options: SearchOptions): Promise<SearchResults> {
  const { query, types = ['location', 'listing', 'development'], limit = 20 } = options;

  const results: SearchResults = {
    locations: [],
    listings: [],
    developments: [],
    totalResults: 0,
    query,
  };

  // Search locations if requested
  if (types.includes('location')) {
    results.locations = await searchLocations(query, limit);
  }

  // Search listings if requested
  if (types.includes('listing')) {
    results.listings = await searchListings(query, Math.ceil(limit / 2));
  }

  // Search developments if requested
  if (types.includes('development')) {
    results.developments = await searchDevelopments(query, Math.ceil(limit / 2));
  }

  results.totalResults =
    results.locations.length + results.listings.length + results.developments.length;

  return results;
}

/**
 * Search locations with basic ranking
 * NOTE: Trending/personalization disabled (locationSearches table not available)
 */
export async function searchLocations(
  query: string,
  limit: number = 10,
): Promise<LocationResult[]> {
  const db = await getDb();
  const searchQuery = `%${query.toLowerCase()}%`;

  // Get locations matching the query
  const matchingLocations = (await db
    .select({
      id: locations.id,
      name: locations.name,
      slug: locations.slug,
      type: locations.type,
      placeId: locations.placeId,
      description: locations.description,
      latitude: locations.latitude,
      longitude: locations.longitude,
      propertyCount: locations.propertyCount,
      parentId: locations.parentId,
    })
    .from(locations)
    .where(
      or(
        like(locations.name, searchQuery),
        like(locations.slug, searchQuery),
        like(locations.description, searchQuery),
      ),
    )
    .limit(limit * 2)) as LocationRow[];

  if (matchingLocations.length === 0) {
    return [];
  }

  // Calculate relevance scores and build results (simplified - no trending data)
  const rankedResults = await Promise.all(
    matchingLocations.map(async (location: LocationRow) => {
      // 1. Query similarity score (0-100)
      const nameLower = location.name.toLowerCase();
      const queryLower = query.toLowerCase();
      let similarityScore = 0;

      if (nameLower === queryLower) {
        similarityScore = 100; // Exact match
      } else if (nameLower.startsWith(queryLower)) {
        similarityScore = 80; // Starts with query
      } else if (nameLower.includes(queryLower)) {
        similarityScore = 60; // Contains query
      } else {
        similarityScore = 40; // Fuzzy match
      }

      // 2. Listing inventory volume (0-100)
      const inventoryScore = Math.min(((location.propertyCount || 0) / 50) * 100, 100);

      // 3. Type priority (suburbs > cities > provinces)
      let typePriority = 0;
      if (location.type === 'suburb' || location.type === 'neighborhood') {
        typePriority = 20;
      } else if (location.type === 'city') {
        typePriority = 10;
      } else if (location.type === 'province') {
        typePriority = 5;
      }

      // Calculate weighted relevance score (no trending/history)
      const relevanceScore = similarityScore * 0.5 + inventoryScore * 0.3 + typePriority * 0.2;

      // Build hierarchical URL
      const url = await buildLocationUrl(db, location);

      return {
        id: location.id,
        name: location.name,
        slug: location.slug,
        type: location.type,
        placeId: location.placeId,
        description: location.description,
        latitude: location.latitude,
        longitude: location.longitude,
        propertyCount: location.propertyCount,
        relevanceScore: Math.round(relevanceScore),
        trendingScore: 0, // Disabled - no locationSearches table
        url,
      };
    }),
  );

  // Sort by relevance score and return top results
  return rankedResults.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);
}

/**
 * Build hierarchical URL for a location
 * Format: /south-africa/{province-slug}/{city-slug}/{suburb-slug}
 */
async function buildLocationUrl(db: any, location: any): Promise<string> {
  const segments = [location.slug];
  let currentLocation = location;

  // Traverse up the hierarchy
  while (currentLocation.parentId) {
    const [parent] = (await db
      .select({ slug: locations.slug, parentId: locations.parentId })
      .from(locations)
      .where(eq(locations.id, currentLocation.parentId))
      .limit(1)) as ParentLocationRow[];

    if (parent) {
      segments.unshift(parent.slug);
      currentLocation = parent;
    } else {
      break;
    }
  }

  return `/south-africa/${segments.join('/')}`;
}

/**
 * Search listings with location-based filtering
 */
async function searchListings(query: string, limit: number = 10): Promise<ListingResult[]> {
  const db = await getDb();
  const searchQuery = `%${query.toLowerCase()}%`;

  const results = (await db
    .select({
      id: properties.id,
      title: properties.title,
      price: properties.price,
      propertyType: properties.propertyType,
      listingType: properties.listingType,
      city: properties.city,
      province: properties.province,
      locationId: properties.locationId,
      placeId: properties.placeId,
      mainImage: properties.mainImage,
    })
    .from(properties)
    .where(
      and(
        or(
          like(properties.title, searchQuery),
          like(properties.description, searchQuery),
          like(properties.city, searchQuery),
          like(properties.locationText, searchQuery),
        ),
        eq(properties.status, 'published'),
      ),
    )
    .limit(limit)) as ListingRow[];

  return results.map((listing: ListingRow) => ({
    ...listing,
    price: Number(listing.price),
    relevanceScore: 50, // Basic relevance for now
  }));
}

/**
 * Search developments with location-based filtering
 */
async function searchDevelopments(query: string, limit: number = 10): Promise<DevelopmentResult[]> {
  const db = await getDb();
  const searchQuery = `%${query.toLowerCase()}%`;

  const results = (await db
    .select({
      id: developments.id,
      name: developments.name,
      description: developments.description,
      city: developments.city,
      province: developments.province,
      locationId: developments.locationId,
      suburb: developments.suburb,
      images: developments.images,
      placeId: locations.placeId,
    })
    .from(developments)
    .leftJoin(locations, eq(developments.locationId, locations.id))
    .where(
      and(
        or(
          like(developments.name, searchQuery),
          like(developments.description, searchQuery),
          like(developments.city, searchQuery),
          like(developments.suburb, searchQuery),
        ),
        inArray(developments.status, ['launching-soon', 'selling', 'sold-out']),
      ),
    )
    .limit(limit)) as DevelopmentRow[];

  return results.map((dev: DevelopmentRow) => ({
    id: dev.id,
    name: dev.name,
    description: dev.description,
    city: dev.city,
    province: dev.province,
    locationId: dev.locationId,
    placeId: dev.placeId,
    mainImage: extractMainImage(dev.images),
    relevanceScore: 50, // Basic relevance for now
  }));
}

/**
 * Filter listings by Place ID
 */
export async function filterListingsByPlaceId(
  placeId: string,
  filters?: {
    propertyType?: string[];
    listingType?: string[];
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    bathrooms?: number;
  },
  limit: number = 50,
): Promise<ListingResult[]> {
  const db = await getDb();

  // First, find the location by Place ID
  const [location] = await db
    .select({ id: locations.id })
    .from(locations)
    .where(eq(locations.placeId, placeId))
    .limit(1);

  if (!location) {
    // Fallback to direct Place ID matching on listings
    return filterListingsByPlaceIdDirect(placeId, filters, limit);
  }

  // Build filter conditions
  const conditions: SQL[] = [
    eq(properties.locationId, location.id),
    eq(properties.status, 'published'),
  ];

  if (filters?.propertyType && filters.propertyType.length > 0) {
    conditions.push(inArray(properties.propertyType, filters.propertyType as any));
  }

  if (filters?.listingType && filters.listingType.length > 0) {
    conditions.push(inArray(properties.listingType, filters.listingType as any));
  }

  if (filters?.bedrooms) {
    conditions.push(eq(properties.bedrooms, filters.bedrooms));
  }

  if (filters?.bathrooms) {
    conditions.push(eq(properties.bathrooms, filters.bathrooms));
  }

  const results = (await db
    .select({
      id: properties.id,
      title: properties.title,
      price: properties.price,
      propertyType: properties.propertyType,
      listingType: properties.listingType,
      city: properties.city,
      province: properties.province,
      locationId: properties.locationId,
      placeId: properties.placeId,
      mainImage: properties.mainImage,
    })
    .from(properties)
    .where(and(...conditions))
    .limit(limit)) as ListingRow[];

  return results.map((listing: ListingRow) => ({
    ...listing,
    price: Number(listing.price),
    relevanceScore: 100, // High relevance for exact location match
  }));
}

/**
 * Fallback: Filter listings by Place ID directly (when location record doesn't exist)
 */
async function filterListingsByPlaceIdDirect(
  placeId: string,
  filters?: any,
  limit: number = 50,
): Promise<ListingResult[]> {
  const db = await getDb();

  const conditions: SQL[] = [eq(properties.placeId, placeId), eq(properties.status, 'published')];

  if (filters?.propertyType && filters.propertyType.length > 0) {
    conditions.push(inArray(properties.propertyType, filters.propertyType as any));
  }

  if (filters?.listingType && filters.listingType.length > 0) {
    conditions.push(inArray(properties.listingType, filters.listingType as any));
  }

  if (filters?.bedrooms) {
    conditions.push(eq(properties.bedrooms, filters.bedrooms));
  }

  if (filters?.bathrooms) {
    conditions.push(eq(properties.bathrooms, filters.bathrooms));
  }

  const results = (await db
    .select({
      id: properties.id,
      title: properties.title,
      price: properties.price,
      propertyType: properties.propertyType,
      listingType: properties.listingType,
      city: properties.city,
      province: properties.province,
      locationId: properties.locationId,
      placeId: properties.placeId,
      mainImage: properties.mainImage,
    })
    .from(properties)
    .where(and(...conditions))
    .limit(limit)) as ListingRow[];

  return results.map((listing: ListingRow) => ({
    ...listing,
    price: Number(listing.price),
    relevanceScore: 90,
  }));
}

/**
 * Track location search for trending analysis
 * STUBBED: locationSearches table not available
 */
export async function trackLocationSearch(locationId: number, userId?: number): Promise<void> {
  // STUB: No-op - locationSearches table not available
  console.debug(
    '[globalSearchService] trackLocationSearch called but disabled (no locationSearches table)',
  );
}
