import { getDb } from '../db';
import { locations, locationSearches, properties, developments } from '../../drizzle/schema';
import { eq, and, or, like, desc, sql, count, inArray, SQL } from 'drizzle-orm';

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

/**
 * Perform global search across all entity types
 */
export async function globalSearch(options: SearchOptions): Promise<SearchResults> {
  const {
    query,
    types = ['location', 'listing', 'development'],
    limit = 20,
    userId
  } = options;

  const results: SearchResults = {
    locations: [],
    listings: [],
    developments: [],
    totalResults: 0,
    query
  };

  // Search locations if requested
  if (types.includes('location')) {
    results.locations = await searchLocations(query, limit, userId);
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
    results.locations.length + 
    results.listings.length + 
    results.developments.length;

  return results;
}

/**
 * Search locations with intelligent ranking
 * 
 * Ranking signals:
 * 1. Query similarity (text matching)
 * 2. Historical popularity (search frequency)
 * 3. Trending score (recent search activity)
 * 4. Listing inventory volume
 * 5. User search history (personalization)
 */
export async function searchLocations(
  query: string,
  limit: number = 10,
  userId?: number
): Promise<LocationResult[]> {
  const db = await getDb();
  const searchQuery = `%${query.toLowerCase()}%`;

  // Get locations matching the query
  const matchingLocations = await db
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
        like(locations.description, searchQuery)
      )
    )
    .limit(limit * 2); // Get more than needed for ranking

  if (matchingLocations.length === 0) {
    return [];
  }

  const locationIds = matchingLocations.map(loc => loc.id);

  // Calculate trending scores (search frequency in last 30 days)
  const trendingScores = await db
    .select({
      locationId: locationSearches.locationId,
      searchCount: count(locationSearches.id).as('searchCount'),
    })
    .from(locationSearches)
    .where(
      and(
        inArray(locationSearches.locationId, locationIds),
        sql`${locationSearches.searchedAt} >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
      )
    )
    .groupBy(locationSearches.locationId);

  const trendingMap = new Map(
    trendingScores.map(ts => [ts.locationId, Number(ts.searchCount)])
  );

  // Get user's recent searches for personalization
  let userRecentLocationIds: number[] = [];
  if (userId) {
    const { recentSearches } = await import('../../drizzle/schema');
    const recentSearchResults = await db
      .select({ locationId: recentSearches.locationId })
      .from(recentSearches)
      .where(eq(recentSearches.userId, userId))
      .orderBy(desc(recentSearches.searchedAt))
      .limit(10);
    
    userRecentLocationIds = recentSearchResults.map(rs => rs.locationId);
  }

  // Calculate relevance scores and build results
  const rankedResults = await Promise.all(
    matchingLocations.map(async (location) => {
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

      // 2. Historical popularity (0-100)
      const searchCount = trendingMap.get(location.id) || 0;
      const popularityScore = Math.min((searchCount / 10) * 100, 100);

      // 3. Trending score (0-100) - same as popularity for now
      const trendingScore = popularityScore;

      // 4. Listing inventory volume (0-100)
      const inventoryScore = Math.min(((location.propertyCount || 0) / 50) * 100, 100);

      // 5. User history bonus (0-20)
      const historyBonus = userRecentLocationIds.includes(location.id) ? 20 : 0;

      // 6. Type priority (suburbs > cities > provinces)
      let typePriority = 0;
      if (location.type === 'suburb' || location.type === 'neighborhood') {
        typePriority = 20;
      } else if (location.type === 'city') {
        typePriority = 10;
      } else if (location.type === 'province') {
        typePriority = 5;
      }

      // Calculate weighted relevance score
      const relevanceScore = 
        (similarityScore * 0.35) +
        (popularityScore * 0.20) +
        (inventoryScore * 0.20) +
        (typePriority * 0.15) +
        (historyBonus * 0.10);

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
        trendingScore: Math.round(trendingScore),
        url,
      };
    })
  );

  // Sort by relevance score and return top results
  return rankedResults
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
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
    const [parent] = await db
      .select({ slug: locations.slug, parentId: locations.parentId })
      .from(locations)
      .where(eq(locations.id, currentLocation.parentId))
      .limit(1);

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
async function searchListings(
  query: string,
  limit: number = 10
): Promise<ListingResult[]> {
  const db = await getDb();
  const searchQuery = `%${query.toLowerCase()}%`;

  const results = await db
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
          like(properties.suburb, searchQuery)
        ),
        eq(properties.status, 'published')
      )
    )
    .limit(limit);

  return results.map(listing => ({
    ...listing,
    price: Number(listing.price),
    relevanceScore: 50, // Basic relevance for now
  }));
}

/**
 * Search developments with location-based filtering
 */
async function searchDevelopments(
  query: string,
  limit: number = 10
): Promise<DevelopmentResult[]> {
  const db = await getDb();
  const searchQuery = `%${query.toLowerCase()}%`;

  const results = await db
    .select({
      id: developments.id,
      name: developments.name,
      description: developments.description,
      city: developments.city,
      province: developments.province,
      locationId: developments.locationId,
      placeId: developments.placeId,
      mainImage: developments.mainImage,
    })
    .from(developments)
    .where(
      and(
        or(
          like(developments.name, searchQuery),
          like(developments.description, searchQuery),
          like(developments.city, searchQuery),
          like(developments.suburb, searchQuery)
        ),
        eq(developments.status, 'active')
      )
    )
    .limit(limit);

  return results.map(dev => ({
    ...dev,
    relevanceScore: 50, // Basic relevance for now
  }));
}

/**
 * Filter listings by Place ID
 * 
 * Uses location_id for precise filtering without string matching ambiguity
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
  limit: number = 50
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
    eq(properties.status, 'published')
  ];

  if (filters?.propertyType && filters.propertyType.length > 0) {
    conditions.push(inArray(properties.propertyType, filters.propertyType as any));
  }

  if (filters?.listingType && filters.listingType.length > 0) {
    conditions.push(inArray(properties.listingType, filters.listingType as any));
  }

  if (filters?.minPrice) {
    conditions.push(sql`${properties.price} >= ${filters.minPrice}`);
  }

  if (filters?.maxPrice) {
    conditions.push(sql`${properties.price} <= ${filters.maxPrice}`);
  }

  if (filters?.bedrooms) {
    conditions.push(eq(properties.bedrooms, filters.bedrooms));
  }

  if (filters?.bathrooms) {
    conditions.push(eq(properties.bathrooms, filters.bathrooms));
  }

  const results = await db
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
    .limit(limit);

  return results.map(listing => ({
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
  limit: number = 50
): Promise<ListingResult[]> {
  const db = await getDb();

  const conditions: SQL[] = [
    eq(properties.placeId, placeId),
    eq(properties.status, 'published')
  ];

  if (filters?.propertyType && filters.propertyType.length > 0) {
    conditions.push(inArray(properties.propertyType, filters.propertyType as any));
  }

  if (filters?.listingType && filters.listingType.length > 0) {
    conditions.push(inArray(properties.listingType, filters.listingType as any));
  }

  if (filters?.minPrice) {
    conditions.push(sql`${properties.price} >= ${filters.minPrice}`);
  }

  if (filters?.maxPrice) {
    conditions.push(sql`${properties.price} <= ${filters.maxPrice}`);
  }

  if (filters?.bedrooms) {
    conditions.push(eq(properties.bedrooms, filters.bedrooms));
  }

  if (filters?.bathrooms) {
    conditions.push(eq(properties.bathrooms, filters.bathrooms));
  }

  const results = await db
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
    .limit(limit);

  return results.map(listing => ({
    ...listing,
    price: Number(listing.price),
    relevanceScore: 90, // Slightly lower relevance for direct Place ID match
  }));
}

/**
 * Track location search for trending analysis
 */
export async function trackLocationSearch(
  locationId: number,
  userId?: number
): Promise<void> {
  const db = await getDb();

  await db.insert(locationSearches).values({
    locationId,
    userId: userId || null,
    searchedAt: new Date().toISOString(),
  });
}
