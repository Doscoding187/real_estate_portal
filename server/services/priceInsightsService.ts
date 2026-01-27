import { db } from '../db';
import { properties, cities, suburbs } from '../../drizzle/schema';
import { eq, and, inArray, sql, desc, count, avg } from 'drizzle-orm';

/**
 * Price Insights Service
 *
 * Aggregates property listing data to calculate city-level statistics:
 * - Median prices
 * - Price distributions
 * - Average price per m²
 * - Micromarket comparisons
 */

export interface CityInsights {
  cityName: string;
  medianPrice: number;
  listings: number;
  avgPricePerSqm: number;
  priceRanges: PriceRange[];
  micromarkets: Micromarket[];
}

export interface PriceRange {
  range: string;
  count: number;
}

export interface Micromarket {
  area: string;
  pricePerSqm: number;
}

// Active listing statuses
const ACTIVE_STATUSES = ['available', 'published', 'pending'] as const;

// Price range buckets (in Rands)
const PRICE_BUCKETS = [
  { range: 'Below R1M', min: 0, max: 1000000 },
  { range: 'R1M-R2M', min: 1000000, max: 2000000 },
  { range: 'R2M-R3M', min: 2000000, max: 3000000 },
  { range: 'R3M-R5M', min: 3000000, max: 5000000 },
  { range: 'R5M-R10M', min: 5000000, max: 10000000 },
  { range: 'Above R10M', min: 10000000, max: Infinity },
] as const;

class PriceInsightsService {
  private cache: Map<string, { data: any; timestamp: number }>;
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  constructor() {
    this.cache = new Map();
  }

  /**
   * Get price insights for all cities with sufficient listings
   */
  async getAllCityInsights(): Promise<Record<string, CityInsights>> {
    const cacheKey = 'all-cities';

    // Check cache
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey)!.data;
    }

    try {
      const dbInstance = await db;

      // Get all cities with at least 10 active listings
      const citiesWithListings = await dbInstance
        .select({
          cityId: properties.cityId,
          cityName: properties.city,
          listingCount: count(properties.id),
        })
        .from(properties)
        .where(
          and(
            inArray(properties.status, ACTIVE_STATUSES as any),
            sql`${properties.cityId} IS NOT NULL`,
          ),
        )
        .groupBy(properties.cityId, properties.city)
        .having(sql`COUNT(${properties.id}) >= 10`)
        .orderBy(desc(count(properties.id)));

      const insights: Record<string, CityInsights> = {};

      // Calculate insights for each city
      for (const cityData of citiesWithListings) {
        if (!cityData.cityId) continue;

        const cityInsights = await this.getCityInsights(cityData.cityId);
        insights[cityData.cityName] = cityInsights;
      }

      // Cache the result
      this.cache.set(cacheKey, {
        data: insights,
        timestamp: Date.now(),
      });

      return insights;
    } catch (error) {
      console.error('Error fetching all city insights:', error);
      throw error;
    }
  }

  /**
   * Get price insights for a specific city
   */
  async getCityInsights(cityId: number): Promise<CityInsights> {
    try {
      const dbInstance = await db;

      // Get all active properties for this city
      const cityProperties = await dbInstance
        .select()
        .from(properties)
        .where(
          and(eq(properties.cityId, cityId), inArray(properties.status, ACTIVE_STATUSES as any)),
        );

      if (cityProperties.length === 0) {
        throw new Error(`No active listings found for city ID ${cityId}`);
      }

      const cityName = cityProperties[0].city;
      const prices = cityProperties.map((p: any) => p.price);

      // Calculate median price
      const medianPrice = this.calculateMedianPrice(prices);

      // Calculate price ranges
      const priceRanges = this.calculatePriceRanges(prices);

      // Calculate average price per m²
      const avgPricePerSqm = this.calculateAvgPricePerSqm(cityProperties);

      // Get top micromarkets
      const micromarkets = await this.getTopMicromarkets(cityId);

      return {
        cityName,
        medianPrice,
        listings: cityProperties.length,
        avgPricePerSqm,
        priceRanges,
        micromarkets,
      };
    } catch (error) {
      console.error(`Error fetching insights for city ${cityId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate median price from array of prices
   */
  private calculateMedianPrice(prices: number[]): number {
    if (prices.length === 0) return 0;

    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      // Even length: average of two middle values
      return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    } else {
      // Odd length: middle value
      return sorted[mid];
    }
  }

  /**
   * Calculate price range distribution
   * Returns all 6 buckets, even if count is zero
   */
  private calculatePriceRanges(prices: number[]): PriceRange[] {
    const bucketCounts = new Map<string, number>();

    // Initialize all buckets with zero
    PRICE_BUCKETS.forEach(bucket => {
      bucketCounts.set(bucket.range, 0);
    });

    // Count properties in each bucket
    prices.forEach(price => {
      for (const bucket of PRICE_BUCKETS) {
        // Inclusive lower bound, exclusive upper bound
        if (price >= bucket.min && price < bucket.max) {
          bucketCounts.set(bucket.range, (bucketCounts.get(bucket.range) || 0) + 1);
          break;
        }
      }
    });

    // Return in order
    return PRICE_BUCKETS.map(bucket => ({
      range: bucket.range,
      count: bucketCounts.get(bucket.range) || 0,
    }));
  }

  /**
   * Calculate average price per square meter
   * Excludes properties with null or zero area
   */
  private calculateAvgPricePerSqm(props: any[]): number {
    const validProperties = props.filter((p: any) => p.area && p.area > 0);

    if (validProperties.length === 0) return 0;

    const totalPricePerSqm = validProperties.reduce((sum: number, p: any) => {
      return sum + p.price / p.area;
    }, 0);

    return Math.round(totalPricePerSqm / validProperties.length);
  }

  /**
   * Get top 4 micromarkets (suburbs) by listing count
   * Returns suburbs with at least 3 listings
   */
  private async getTopMicromarkets(cityId: number): Promise<Micromarket[]> {
    try {
      const dbInstance = await db;

      // Query suburbs with their property counts and avg price per m²
      const result = await dbInstance.execute(sql`
        SELECT 
          s.name as area,
          AVG(p.price / NULLIF(p.area, 0)) as pricePerSqm,
          COUNT(p.id) as listingCount
        FROM suburbs s
        INNER JOIN properties p ON p.suburbId = s.id
        WHERE p.cityId = ${cityId}
          AND p.status IN ('available', 'published', 'pending')
          AND p.area > 0
        GROUP BY s.id, s.name
        HAVING listingCount >= 3
        ORDER BY listingCount DESC
        LIMIT 4
      `);

      return (result.rows as any[]).map(row => ({
        area: row.area,
        pricePerSqm: Math.round(row.pricePerSqm),
      }));
    } catch (error) {
      console.error(`Error fetching micromarkets for city ${cityId}:`, error);
      return [];
    }
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;

    const age = Date.now() - cached.timestamp;
    return age < this.CACHE_TTL;
  }

  /**
   * Clear cache (for testing or manual refresh)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const priceInsightsService = new PriceInsightsService();
