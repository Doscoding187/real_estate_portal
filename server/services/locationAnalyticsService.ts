/**
 * Location Analytics Service
 * 
 * Calculates dynamic market statistics from listings for location pages.
 * 
 * Requirements:
 * - 17.1-17.5: Calculate accurate listing counts for provinces, cities, and suburbs
 * - 18.1-18.5: Calculate market insights (avg price, median, days on market, etc.)
 * 
 * Properties:
 * - Property 21: Province listing count accuracy
 * - Property 22: City listing count accuracy
 * - Property 23: Suburb listing count accuracy
 * - Property 24: Average sale price calculation
 * - Property 25: Average rental price calculation
 * - Property 26: Median price calculation
 * - Property 27: Days on market calculation
 * - Property 28: Price per square meter calculation
 */

import { getDb } from '../db';
import { locations, listings, developments, locationSearches, recentSearches } from '../../drizzle/schema';
import { eq, and, sql, gte, desc, asc } from 'drizzle-orm';
import { redisCache, CacheTTL } from '../lib/redis';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface PriceStats {
  avgSalePrice: number | null;
  avgRentalPrice: number | null;
  medianPrice: number | null;
  pricePerSqm: number | null;
  minPrice: number | null;
  maxPrice: number | null;
}

export interface MarketActivity {
  avgDaysOnMarket: number | null;
  newListingsLast30Days: number;
  priceReductions: number;
  totalListings: number;
  forSaleCount: number;
  toRentCount: number;
}

export interface PropertyTypeStats {
  [propertyType: string]: number;
}

export interface LocationStatistics {
  // Price metrics
  avgSalePrice: number | null;
  avgRentalPrice: number | null;
  medianPrice: number | null;
  pricePerSqm: number | null;
  
  // Inventory metrics
  totalListings: number;
  forSaleCount: number;
  toRentCount: number;
  developmentCount: number;
  
  // Market activity
  avgDaysOnMarket: number | null;
  newListingsLast30Days: number;
  priceReductions: number;
  
  // Distribution
  propertyTypeDistribution: PropertyTypeStats;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all location IDs in a hierarchy (location + all descendants)
 * This is used to aggregate statistics across a location and its children.
 * 
 * For example, a city's statistics should include all suburbs within that city.
 * 
 * @param locationId - Root location ID
 * @returns Array of location IDs including the root and all descendants
 */
async function getLocationHierarchyIds(locationId: number): Promise<number[]> {
  const db = await getDb();
  const ids: number[] = [locationId];
  
  // Get direct children
  const children = await db
    .select({ id: locations.id })
    .from(locations)
    .where(eq(locations.parentId, locationId));
  
  // Recursively get descendants
  for (const child of children) {
    const childIds = await getLocationHierarchyIds(child.id);
    ids.push(...childIds);
  }
  
  return ids;
}

/**
 * Calculate median from an array of numbers
 * 
 * Property 26: Median price calculation
 * For any location with listings, the median price should be the middle value
 * when all listing prices are sorted
 * 
 * @param values - Array of numbers
 * @returns Median value or null if array is empty
 */
function calculateMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    // Even number of values: average of two middle values
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    // Odd number of values: middle value
    return sorted[mid];
  }
}

// ============================================================================
// Location Analytics Service
// ============================================================================

export const locationAnalyticsService = {
  
  /**
   * Calculate price statistics for a location
   * 
   * Requirements 18.1-18.5: Calculate market insights
   * 
   * Property 24: Average sale price calculation
   * For any location with sale listings, the average sale price should equal
   * the sum of all sale listing prices divided by the count of sale listings
   * 
   * Property 25: Average rental price calculation
   * For any location with rental listings, the average rental price should equal
   * the sum of all rental listing prices divided by the count of rental listings
   * 
   * Property 26: Median price calculation
   * For any location with listings, the median price should be the middle value
   * when all listing prices are sorted
   * 
   * Property 28: Price per square meter calculation
   * For any location with listings that have floor_area data, the average price
   * per m² should equal the sum of (price / floor_area) divided by the count
   * of listings with floor_area
   * 
   * @param locationId - Location ID
   * @returns Price statistics
   */
  async calculatePriceStats(locationId: number): Promise<PriceStats> {
    const db = await getDb();
    
    // Get all location IDs in hierarchy
    const locationIds = await getLocationHierarchyIds(locationId);
    
    // Get location details to match against listings
    const [location] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, locationId))
      .limit(1);
    
    if (!location) {
      return {
        avgSalePrice: null,
        avgRentalPrice: null,
        medianPrice: null,
        pricePerSqm: null,
        minPrice: null,
        maxPrice: null,
      };
    }
    
    // Build location filter based on location type
    // Note: This uses legacy fields (city, suburb, province) until locationId is added to listings
    let locationFilter;
    if (location.type === 'province') {
      locationFilter = eq(listings.province, location.name);
    } else if (location.type === 'city') {
      locationFilter = eq(listings.city, location.name);
    } else if (location.type === 'suburb') {
      locationFilter = eq(listings.suburb, location.name);
    } else {
      locationFilter = eq(listings.suburb, location.name);
    }
    
    // Get all active listings for this location
    const activeListings = await db
      .select({
        action: listings.action,
        askingPrice: listings.askingPrice,
        monthlyRent: listings.monthlyRent,
        propertyDetails: listings.propertyDetails,
      })
      .from(listings)
      .where(
        and(
          locationFilter,
          eq(listings.status, 'published')
        )
      );
    
    // Separate sale and rental listings
    const saleListings = activeListings.filter(l => l.action === 'sell' && l.askingPrice);
    const rentalListings = activeListings.filter(l => l.action === 'rent' && l.monthlyRent);
    
    // Calculate average sale price
    // Property 24: Average sale price calculation
    const avgSalePrice = saleListings.length > 0
      ? saleListings.reduce((sum, l) => sum + Number(l.askingPrice), 0) / saleListings.length
      : null;
    
    // Calculate average rental price
    // Property 25: Average rental price calculation
    const avgRentalPrice = rentalListings.length > 0
      ? rentalListings.reduce((sum, l) => sum + Number(l.monthlyRent), 0) / rentalListings.length
      : null;
    
    // Calculate median price (all listings)
    // Property 26: Median price calculation
    const allPrices = [
      ...saleListings.map(l => Number(l.askingPrice)),
      ...rentalListings.map(l => Number(l.monthlyRent)),
    ];
    const medianPrice = calculateMedian(allPrices);
    
    // Calculate price per square meter
    // Property 28: Price per square meter calculation
    const listingsWithArea = saleListings.filter(l => {
      const details = l.propertyDetails as any;
      return details && (details.unitSizeM2 || details.houseAreaM2 || details.floorAreaM2);
    });
    
    const pricePerSqm = listingsWithArea.length > 0
      ? listingsWithArea.reduce((sum, l) => {
          const details = l.propertyDetails as any;
          const area = details.unitSizeM2 || details.houseAreaM2 || details.floorAreaM2;
          return sum + (Number(l.askingPrice) / area);
        }, 0) / listingsWithArea.length
      : null;
    
    // Calculate min and max prices
    const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : null;
    const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : null;
    
    return {
      avgSalePrice: avgSalePrice ? Math.round(avgSalePrice) : null,
      avgRentalPrice: avgRentalPrice ? Math.round(avgRentalPrice) : null,
      medianPrice: medianPrice ? Math.round(medianPrice) : null,
      pricePerSqm: pricePerSqm ? Math.round(pricePerSqm) : null,
      minPrice: minPrice ? Math.round(minPrice) : null,
      maxPrice: maxPrice ? Math.round(maxPrice) : null,
    };
  },
  
  /**
   * Calculate market activity metrics for a location
   * 
   * Requirements 18.4: Calculate average days on market
   * Requirements 17.4: Update statistics within 5 minutes
   * 
   * Property 27: Days on market calculation
   * For any location with listings, the average days on market should equal
   * the sum of (current_date - created_at) for all listings divided by listing count
   * 
   * @param locationId - Location ID
   * @returns Market activity metrics
   */
  async calculateMarketActivity(locationId: number): Promise<MarketActivity> {
    const db = await getDb();
    
    // Get location details to match against listings
    const [location] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, locationId))
      .limit(1);
    
    if (!location) {
      return {
        avgDaysOnMarket: null,
        newListingsLast30Days: 0,
        priceReductions: 0,
        totalListings: 0,
        forSaleCount: 0,
        toRentCount: 0,
      };
    }
    
    // Build location filter based on location type
    let locationFilter;
    if (location.type === 'province') {
      locationFilter = eq(listings.province, location.name);
    } else if (location.type === 'city') {
      locationFilter = eq(listings.city, location.name);
    } else if (location.type === 'suburb') {
      locationFilter = eq(listings.suburb, location.name);
    } else {
      locationFilter = eq(listings.suburb, location.name);
    }
    
    // Get all active listings
    const activeListings = await db
      .select({
        id: listings.id,
        action: listings.action,
        createdAt: listings.createdAt,
      })
      .from(listings)
      .where(
        and(
          locationFilter,
          eq(listings.status, 'published')
        )
      );
    
    // Calculate average days on market
    // Property 27: Days on market calculation
    const now = new Date();
    const daysOnMarket = activeListings.map(l => {
      const createdAt = new Date(l.createdAt);
      const diffTime = Math.abs(now.getTime() - createdAt.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    });
    
    const avgDaysOnMarket = daysOnMarket.length > 0
      ? Math.round(daysOnMarket.reduce((sum, days) => sum + days, 0) / daysOnMarket.length)
      : null;
    
    // Count new listings in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newListings = await db
      .select({ count: sql<number>`count(*)` })
      .from(listings)
      .where(
        and(
          locationFilter,
          eq(listings.status, 'published'),
          gte(listings.createdAt, thirtyDaysAgo.toISOString())
        )
      );
    
    const newListingsLast30Days = Number(newListings[0]?.count || 0);
    
    // Count for sale vs to rent
    const forSaleCount = activeListings.filter(l => l.action === 'sell').length;
    const toRentCount = activeListings.filter(l => l.action === 'rent').length;
    
    // TODO: Implement price reductions tracking
    // This would require a listing_history table to track price changes
    const priceReductions = 0;
    
    return {
      avgDaysOnMarket,
      newListingsLast30Days,
      priceReductions,
      totalListings: activeListings.length,
      forSaleCount,
      toRentCount,
    };
  },
  
  /**
   * Calculate property type distribution for a location
   * 
   * Requirements 18.5: Calculate property type distribution
   * 
   * @param locationId - Location ID
   * @returns Property type distribution (property type -> count)
   */
  async calculatePropertyTypes(locationId: number): Promise<PropertyTypeStats> {
    const db = await getDb();
    
    // Get location details to match against listings
    const [location] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, locationId))
      .limit(1);
    
    if (!location) {
      return {};
    }
    
    // Build location filter based on location type
    let locationFilter;
    if (location.type === 'province') {
      locationFilter = eq(listings.province, location.name);
    } else if (location.type === 'city') {
      locationFilter = eq(listings.city, location.name);
    } else if (location.type === 'suburb') {
      locationFilter = eq(listings.suburb, location.name);
    } else {
      locationFilter = eq(listings.suburb, location.name);
    }
    
    // Get property type distribution
    const distribution = await db
      .select({
        propertyType: listings.propertyType,
        count: sql<number>`count(*)`,
      })
      .from(listings)
      .where(
        and(
          locationFilter,
          eq(listings.status, 'published')
        )
      )
      .groupBy(listings.propertyType);
    
    const result: PropertyTypeStats = {};
    for (const item of distribution) {
      if (item.propertyType) {
        result[item.propertyType] = Number(item.count);
      }
    }
    
    return result;
  },
  
  /**
   * Get comprehensive location statistics
   * 
   * Requirements 17.1-17.5: Calculate listing counts
   * Requirements 18.1-18.5: Calculate market insights
   * 
   * Property 21: Province listing count accuracy
   * For any province, the displayed listing count should equal the number of
   * listings where location_id references a location within that province's hierarchy
   * 
   * Property 22: City listing count accuracy
   * For any city, the displayed listing count should equal the number of listings
   * where location_id references a location within that city's hierarchy
   * 
   * Property 23: Suburb listing count accuracy
   * For any suburb, the displayed listing count should equal the number of listings
 * where location_id references that suburb
   * 
   * @param locationId - Location ID
   * @returns Complete location statistics
   */
  async getLocationStatistics(locationId: number): Promise<LocationStatistics> {
    const db = await getDb();
    
    // Get location details
    const [location] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, locationId))
      .limit(1);
    
    if (!location) {
      throw new Error(`Location ${locationId} not found`);
    }
    
    // Get price stats
    const priceStats = await this.calculatePriceStats(locationId);
    
    // Get market activity
    const marketActivity = await this.calculateMarketActivity(locationId);
    
    // Get property type distribution
    const propertyTypeDistribution = await this.calculatePropertyTypes(locationId);
    
    // Build location filter for developments
    let locationFilter;
    if (location.type === 'province') {
      locationFilter = eq(developments.province, location.name);
    } else if (location.type === 'city') {
      locationFilter = eq(developments.city, location.name);
    } else if (location.type === 'suburb') {
      locationFilter = eq(developments.suburb, location.name);
    } else {
      locationFilter = eq(developments.suburb, location.name);
    }
    
    // Count developments
    const developmentCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(developments)
      .where(
        and(
          locationFilter,
          eq(developments.isPublished, 1)
        )
      );
    
    return {
      // Price metrics
      avgSalePrice: priceStats.avgSalePrice,
      avgRentalPrice: priceStats.avgRentalPrice,
      medianPrice: priceStats.medianPrice,
      pricePerSqm: priceStats.pricePerSqm,
      
      // Inventory metrics
      totalListings: marketActivity.totalListings,
      forSaleCount: marketActivity.forSaleCount,
      toRentCount: marketActivity.toRentCount,
      developmentCount: Number(developmentCount[0]?.count || 0),
      
      // Market activity
      avgDaysOnMarket: marketActivity.avgDaysOnMarket,
      newListingsLast30Days: marketActivity.newListingsLast30Days,
      priceReductions: marketActivity.priceReductions,
      
      // Distribution
      propertyTypeDistribution,
    };
  },
  
  /**
   * Track a location search event
   * 
   * Requirements 21.1: Record search events for trending analysis
   * 
   * Property 31: Search event recording
   * For any location search, a record should be created in location_searches table
   * with location_id, user_id (if authenticated), and timestamp
   * 
   * @param locationId - Location ID
   * @param userId - User ID (optional)
   */
  async trackLocationSearch(locationId: number, userId?: number): Promise<void> {
    const db = await getDb();
    
    try {
      // Insert search event
      await db.insert(locationSearches).values({
        locationId,
        userId: userId || null,
      });
      
      // Update recent searches for authenticated users
      if (userId) {
        // Use INSERT ... ON DUPLICATE KEY UPDATE to handle unique constraint
        await db.execute(sql`
          INSERT INTO recent_searches (user_id, location_id, searched_at)
          VALUES (${userId}, ${locationId}, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE searched_at = CURRENT_TIMESTAMP
        `);
      }
      
      console.log(`[LocationAnalytics] Tracked search: location=${locationId}, user=${userId}`);
    } catch (error) {
      console.error('[LocationAnalytics] Error tracking search:', error);
      // Don't throw - tracking failures shouldn't break the user experience
    }
  },
  
  /**
   * Calculate trending score for a location
   * 
   * Requirements 21.2-21.3: Analyze search frequency and weight recent searches
   * 
   * Algorithm:
   * - Count searches in last 30 days
   * - Weight recent searches higher (exponential decay)
   * - Normalize to 0-100 scale
   * 
   * @param locationId - Location ID
   * @returns Trending score (0-100)
   */
  async calculateTrendingScore(locationId: number): Promise<number> {
    const db = await getDb();
    
    try {
      // Get searches from last 30 days with time-based weighting
      const result = await db.execute(sql`
        SELECT 
          COUNT(*) as total_searches,
          SUM(
            CASE 
              WHEN searched_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 4.0
              WHEN searched_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) THEN 2.0
              WHEN searched_at >= DATE_SUB(NOW(), INTERVAL 21 DAY) THEN 1.0
              ELSE 0.5
            END
          ) as weighted_score
        FROM location_searches
        WHERE location_id = ${locationId}
          AND searched_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);
      
      const row = result.rows[0] as { total_searches: number; weighted_score: number };
      
      if (!row || row.total_searches === 0) {
        return 0;
      }
      
      // Normalize weighted score to 0-100 scale
      // Assume 100+ weighted searches = score of 100
      const normalizedScore = Math.min(100, (row.weighted_score / 100) * 100);
      
      return Math.round(normalizedScore);
    } catch (error) {
      console.error('[LocationAnalytics] Error calculating trending score:', error);
      return 0;
    }
  },
  
  /**
   * Get trending suburbs
   * 
   * Requirements 21.4-21.5: Display top 10 trending suburbs with statistics
   * 
   * @param limit - Number of trending suburbs to return (default: 10)
   * @returns Array of trending locations with scores and statistics
   */
  async getTrendingSuburbs(limit: number = 10): Promise<Array<{
    id: number;
    name: string;
    slug: string;
    cityName: string | null;
    provinceName: string | null;
    trendingScore: number;
    searchCount30d: number;
    listingCount: number;
    avgPrice: number | null;
  }>> {
    const db = await getDb();
    
    try {
      // Get suburbs with search activity in last 30 days
      const result = await db.execute(sql`
        SELECT 
          l.id,
          l.name,
          l.slug,
          city.name as city_name,
          province.name as province_name,
          COUNT(ls.id) as search_count_30d,
          SUM(
            CASE 
              WHEN ls.searched_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 4.0
              WHEN ls.searched_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) THEN 2.0
              WHEN ls.searched_at >= DATE_SUB(NOW(), INTERVAL 21 DAY) THEN 1.0
              ELSE 0.5
            END
          ) as weighted_score,
          (
            SELECT COUNT(*)
            FROM properties p
            WHERE p.location_id = l.id
              AND p.status = 'active'
          ) as listing_count,
          (
            SELECT AVG(p.price)
            FROM properties p
            WHERE p.location_id = l.id
              AND p.status = 'active'
              AND p.listingType = 'sale'
          ) as avg_price
        FROM locations l
        LEFT JOIN location_searches ls ON l.id = ls.location_id
          AND ls.searched_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        LEFT JOIN locations city ON l.parentId = city.id AND city.type = 'city'
        LEFT JOIN locations province ON city.parentId = province.id AND province.type = 'province'
        WHERE l.type = 'suburb'
        GROUP BY l.id, l.name, l.slug, city.name, province.name
        HAVING search_count_30d > 0
        ORDER BY weighted_score DESC, search_count_30d DESC
        LIMIT ${limit}
      `);
      
      return result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        cityName: row.city_name,
        provinceName: row.province_name,
        trendingScore: Math.min(100, Math.round((row.weighted_score / 100) * 100)),
        searchCount30d: Number(row.search_count_30d),
        listingCount: Number(row.listing_count),
        avgPrice: row.avg_price ? Number(row.avg_price) : null,
      }));
    } catch (error) {
      console.error('[LocationAnalytics] Error getting trending suburbs:', error);
      return [];
    }
  },
  
  /**
   * Calculate similarity score between two locations
   * 
   * Requirements 22.1-22.5: Calculate similar suburbs based on price, property types, and lifestyle
   * 
   * Algorithm:
   * - Price similarity (40%): 1 - |price1 - price2| / max(price1, price2)
   * - Property type similarity (30%): Overlap in property type distribution
   * - Listing density similarity (30%): Similar number of active listings
   * 
   * @param location1Stats - Statistics for first location
   * @param location2Stats - Statistics for second location
   * @returns Similarity score (0-1)
   */
  calculateSimilarity(
    location1Stats: { avgPrice: number | null; propertyTypes: PropertyTypeStats; listingCount: number },
    location2Stats: { avgPrice: number | null; propertyTypes: PropertyTypeStats; listingCount: number }
  ): number {
    let priceScore = 0;
    let typeScore = 0;
    let densityScore = 0;
    
    // Price similarity (40% weight)
    if (location1Stats.avgPrice && location2Stats.avgPrice) {
      const priceDiff = Math.abs(location1Stats.avgPrice - location2Stats.avgPrice);
      const maxPrice = Math.max(location1Stats.avgPrice, location2Stats.avgPrice);
      priceScore = maxPrice > 0 ? 1 - (priceDiff / maxPrice) : 0;
    }
    
    // Property type similarity (30% weight)
    // Calculate Jaccard similarity coefficient for property types
    const types1 = Object.keys(location1Stats.propertyTypes);
    const types2 = Object.keys(location2Stats.propertyTypes);
    
    if (types1.length > 0 && types2.length > 0) {
      const intersection = types1.filter(t => types2.includes(t)).length;
      const union = new Set([...types1, ...types2]).size;
      typeScore = union > 0 ? intersection / union : 0;
    }
    
    // Listing density similarity (30% weight)
    // Locations with similar listing counts are more comparable
    if (location1Stats.listingCount > 0 && location2Stats.listingCount > 0) {
      const densityDiff = Math.abs(location1Stats.listingCount - location2Stats.listingCount);
      const maxDensity = Math.max(location1Stats.listingCount, location2Stats.listingCount);
      densityScore = maxDensity > 0 ? 1 - (densityDiff / maxDensity) : 0;
    }
    
    // Weighted average
    return (priceScore * 0.4) + (typeScore * 0.3) + (densityScore * 0.3);
  },
  
  /**
   * Get similar locations based on price, property types, and market characteristics
   * 
   * Requirements 22.1-22.5: Display up to 5 similar locations with statistics
   * 
   * Algorithm:
   * 1. Get all locations of the same type (suburb/city)
   * 2. Calculate statistics for each location
   * 3. Calculate similarity score with target location
   * 4. Filter by minimum similarity threshold (0.5)
   * 5. Prioritize locations within the same city
   * 6. Return top 5 most similar locations
   * 
   * @param locationId - Target location ID
   * @param limit - Maximum number of similar locations to return (default: 5)
   * @returns Array of similar locations with similarity scores and statistics
   */
  async getSimilarLocations(locationId: number, limit: number = 5): Promise<Array<{
    id: number;
    name: string;
    slug: string;
    type: string;
    cityName: string | null;
    provinceName: string | null;
    similarityScore: number;
    avgPrice: number | null;
    listingCount: number;
    propertyTypes: string[];
  }>> {
    const db = await getDb();
    
    try {
      // Get target location details
      const [targetLocation] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, locationId))
        .limit(1);
      
      if (!targetLocation) {
        console.error(`[LocationAnalytics] Location ${locationId} not found`);
        return [];
      }
      
      // Get target location statistics
      const targetStats = await this.getLocationStatistics(locationId);
      const targetPriceStats = await this.calculatePriceStats(locationId);
      const targetPropertyTypes = await this.calculatePropertyTypes(locationId);
      
      // Get candidate locations (same type, exclude target)
      // Prioritize locations within the same city
      const candidateLocations = await db
        .select({
          id: locations.id,
          name: locations.name,
          slug: locations.slug,
          type: locations.type,
          parentId: locations.parentId,
        })
        .from(locations)
        .where(
          and(
            eq(locations.type, targetLocation.type),
            sql`${locations.id} != ${locationId}`
          )
        )
        .limit(100); // Limit candidates for performance
      
      // Calculate similarity for each candidate
      const similarLocations: Array<{
        id: number;
        name: string;
        slug: string;
        type: string;
        parentId: number | null;
        similarityScore: number;
        avgPrice: number | null;
        listingCount: number;
        propertyTypes: PropertyTypeStats;
        sameCity: boolean;
      }> = [];
      
      for (const candidate of candidateLocations) {
        try {
          // Get candidate statistics
          const candidateMarketActivity = await this.calculateMarketActivity(candidate.id);
          const candidatePriceStats = await this.calculatePriceStats(candidate.id);
          const candidatePropertyTypes = await this.calculatePropertyTypes(candidate.id);
          
          // Skip locations with no listings
          if (candidateMarketActivity.totalListings === 0) {
            continue;
          }
          
          // Calculate similarity score
          const similarityScore = this.calculateSimilarity(
            {
              avgPrice: targetPriceStats.avgSalePrice,
              propertyTypes: targetPropertyTypes,
              listingCount: targetStats.totalListings,
            },
            {
              avgPrice: candidatePriceStats.avgSalePrice,
              propertyTypes: candidatePropertyTypes,
              listingCount: candidateMarketActivity.totalListings,
            }
          );
          
          // Only include locations with similarity >= 0.5
          if (similarityScore >= 0.5) {
            similarLocations.push({
              id: candidate.id,
              name: candidate.name,
              slug: candidate.slug,
              type: candidate.type,
              parentId: candidate.parentId,
              similarityScore,
              avgPrice: candidatePriceStats.avgSalePrice,
              listingCount: candidateMarketActivity.totalListings,
              propertyTypes: candidatePropertyTypes,
              sameCity: candidate.parentId === targetLocation.parentId,
            });
          }
        } catch (error) {
          console.error(`[LocationAnalytics] Error calculating similarity for location ${candidate.id}:`, error);
          // Continue with next candidate
        }
      }
      
      // Sort by similarity score (descending), prioritizing same city
      similarLocations.sort((a, b) => {
        // Prioritize same city
        if (a.sameCity && !b.sameCity) return -1;
        if (!a.sameCity && b.sameCity) return 1;
        
        // Then by similarity score
        return b.similarityScore - a.similarityScore;
      });
      
      // Get parent location names for top results
      const topResults = similarLocations.slice(0, limit);
      const resultsWithParents = await Promise.all(
        topResults.map(async (result) => {
          let cityName: string | null = null;
          let provinceName: string | null = null;
          
          if (result.parentId) {
            const [parent] = await db
              .select()
              .from(locations)
              .where(eq(locations.id, result.parentId))
              .limit(1);
            
            if (parent) {
              if (parent.type === 'city') {
                cityName = parent.name;
                
                // Get province
                if (parent.parentId) {
                  const [province] = await db
                    .select()
                    .from(locations)
                    .where(eq(locations.id, parent.parentId))
                    .limit(1);
                  
                  if (province) {
                    provinceName = province.name;
                  }
                }
              } else if (parent.type === 'province') {
                provinceName = parent.name;
              }
            }
          }
          
          return {
            id: result.id,
            name: result.name,
            slug: result.slug,
            type: result.type,
            cityName,
            provinceName,
            similarityScore: Math.round(result.similarityScore * 100) / 100,
            avgPrice: result.avgPrice,
            listingCount: result.listingCount,
            propertyTypes: Object.keys(result.propertyTypes),
          };
        })
      );
      
      return resultsWithParents;
    } catch (error) {
      console.error('[LocationAnalytics] Error getting similar locations:', error);
      return [];
    }
  },
};
