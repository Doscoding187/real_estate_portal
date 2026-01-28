import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Price Insights Service
 *
 * Aggregates property listing data from the 'price_facts' view.
 * Uses listings (askingPrice/monthlyRent) + unit_types (base_price).
 * Joins by location_id only (no city-name matching).
 */

export interface CityInsights {
  cityName: string;
  medianPrice: number;
  listings: number;
  avgPricePerSqm: number;
  priceRanges: PriceRange[];
  micromarkets: Micromarket[];
  confidence: number; // 0-1 based on data volume
}

export interface PriceRange {
  range: string;
  count: number;
}

export interface Micromarket {
  area: string;
  pricePerSqm: number;
  confidence: number;
}

export interface SuburbPriceData {
  suburbId: number;
  suburbName: string;
  cityName: string;
  province: string;
  averagePrice: number;
  medianPrice: number;
  trendingDirection: 'up' | 'down' | 'stable';
  propertyCount: number;
  confidence: number; // 0-1 based on data volume
  heatmapIntensity: number; // 0-1 normalized
  color: string;
  priceCategory: string;
}

// Price range buckets
const PRICE_BUCKETS = [
  { range: 'Below R1M', min: 0, max: 1000000 },
  { range: 'R1M-R2M', min: 1000000, max: 2000000 },
  { range: 'R2M-R3M', min: 2000000, max: 3000000 },
  { range: 'R3M-R5M', min: 3000000, max: 5000000 },
  { range: 'R5M-R10M', min: 5000000, max: 10000000 },
  { range: 'Above R10M', min: 10000000, max: Infinity },
] as const;

// Confidence thresholds
const MIN_OFFERS_FOR_LOW_CONFIDENCE = 3;
const MIN_OFFERS_FOR_MEDIUM_CONFIDENCE = 10;
const MIN_OFFERS_FOR_HIGH_CONFIDENCE = 30;

function calculateConfidence(count: number): number {
  if (count >= MIN_OFFERS_FOR_HIGH_CONFIDENCE) return 1.0;
  if (count >= MIN_OFFERS_FOR_MEDIUM_CONFIDENCE) return 0.7;
  if (count >= MIN_OFFERS_FOR_LOW_CONFIDENCE) return 0.4;
  return 0.1; // Very low confidence
}

interface PriceFactRow {
  priceAmount: number;
  areaM2: number | null;
  cityName: string;
}

interface SuburbRow {
  suburbLocationId: number;
  suburbName: string;
  cityName: string;
  province: string;
  priceAmount: number;
}

class PriceInsightsService {
  private cache: Map<string, { data: unknown; timestamp: number }>;
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  constructor() {
    this.cache = new Map();
  }

  async getAllCityInsights(): Promise<Record<string, CityInsights>> {
    const cacheKey = 'all-cities';
    if (this.isCacheValid(cacheKey))
      return this.cache.get(cacheKey)!.data as Record<string, CityInsights>;

    try {
      const dbInstance = await db;

      // Get cities with at least MIN_OFFERS_FOR_LOW_CONFIDENCE offers
      const citiesResult = await dbInstance.execute(sql`
        SELECT 
          l.id as cityId,
          l.name as cityName,
          COUNT(*) as listingCount
        FROM price_facts pf
        JOIN locations l ON pf.cityLocationId = l.id
        WHERE pf.isActive = 1
        GROUP BY l.id, l.name
        HAVING listingCount >= ${MIN_OFFERS_FOR_LOW_CONFIDENCE}
        ORDER BY listingCount DESC
      `);

      const cities = citiesResult[0] as Array<{
        cityId: number;
        cityName: string;
        listingCount: number;
      }>;
      const insights: Record<string, CityInsights> = {};

      for (const city of cities) {
        if (!city.cityId) continue;
        const cityInsights = await this.getCityInsights(city.cityId);
        insights[city.cityName] = cityInsights;
      }

      this.cache.set(cacheKey, { data: insights, timestamp: Date.now() });
      return insights;
    } catch (error) {
      console.error('Error fetching all city insights:', error);
      throw error;
    }
  }

  async getCityInsights(cityId: number): Promise<CityInsights> {
    try {
      const dbInstance = await db;

      const propsResult = await dbInstance.execute(sql`
        SELECT 
           pf.priceAmount, 
           pf.areaM2,
           l.name as cityName
        FROM price_facts pf
        JOIN locations l ON pf.cityLocationId = l.id
        WHERE pf.cityLocationId = ${cityId} AND pf.isActive = 1
      `);

      const cityProperties = propsResult[0] as PriceFactRow[];

      if (cityProperties.length === 0) {
        throw new Error(`No active listings found for city ID ${cityId}`);
      }

      const cityName = cityProperties[0].cityName;
      const prices = cityProperties.map(p => Number(p.priceAmount));
      const confidence = calculateConfidence(cityProperties.length);

      const medianPrice = this.calculateMedianPrice(prices);
      const priceRanges = this.calculatePriceRanges(prices);
      const avgPricePerSqm = this.calculateAvgPricePerSqm(cityProperties);
      const micromarkets = await this.getTopMicromarkets(cityId);

      return {
        cityName,
        medianPrice,
        listings: cityProperties.length,
        avgPricePerSqm,
        priceRanges,
        micromarkets,
        confidence,
      };
    } catch (error) {
      console.error(`Error fetching insights for city ${cityId}:`, error);
      throw error;
    }
  }

  async getTopMicromarkets(cityId: number): Promise<Micromarket[]> {
    try {
      const dbInstance = await db;
      const result = await dbInstance.execute(sql`
        SELECT 
          s.name as area,
          AVG(pf.priceAmount / NULLIF(pf.areaM2, 0)) as pricePerSqm,
          COUNT(*) as listingCount
        FROM price_facts pf
        JOIN locations s ON pf.suburbLocationId = s.id
        WHERE pf.cityLocationId = ${cityId}
          AND pf.isActive = 1
          AND pf.areaM2 > 0
        GROUP BY s.id, s.name
        HAVING listingCount >= ${MIN_OFFERS_FOR_LOW_CONFIDENCE}
        ORDER BY listingCount DESC
        LIMIT 4
      `);

      return (result[0] as Array<{ area: string; pricePerSqm: number; listingCount: number }>).map(
        row => ({
          area: row.area,
          pricePerSqm: Math.round(Number(row.pricePerSqm)),
          confidence: calculateConfidence(row.listingCount),
        }),
      );
    } catch (error) {
      console.error(`Error fetching micromarkets for city ${cityId}:`, error);
      return [];
    }
  }

  async getSuburbPriceHeatmap(input: {
    cityId?: number;
    provinceId?: number;
    propertyType?: string;
    listingType?: string;
    limit?: number;
    offset?: number;
  }): Promise<SuburbPriceData[]> {
    const { cityId, limit, offset } = input;
    const dbInstance = await db;

    // Build WHERE clause
    const clauses = [sql`pf.isActive = 1`, sql`pf.suburbLocationId IS NOT NULL`];

    if (cityId) {
      clauses.push(sql`pf.cityLocationId = ${cityId}`);
    }

    const whereClause = sql.join(clauses, sql` AND `);

    // Fetch raw rows
    const rowsResult = await dbInstance.execute(sql`
      SELECT 
          pf.suburbLocationId,
          s.name as suburbName,
          c.name as cityName,
          pf.province,
          pf.priceAmount
      FROM price_facts pf
      JOIN locations s ON pf.suburbLocationId = s.id
      JOIN locations c ON pf.cityLocationId = c.id
      WHERE ${whereClause}
    `);

    const rows = rowsResult[0] as SuburbRow[];

    // Group by Suburb
    const suburbsMap = new Map<number, SuburbRow[]>();

    for (const row of rows) {
      if (!suburbsMap.has(row.suburbLocationId)) {
        suburbsMap.set(row.suburbLocationId, []);
      }
      suburbsMap.get(row.suburbLocationId)!.push(row);
    }

    const results: SuburbPriceData[] = [];

    for (const [suburbId, records] of suburbsMap.entries()) {
      if (records.length < MIN_OFFERS_FOR_LOW_CONFIDENCE) continue; // Confidence threshold

      const prices = records.map(r => Number(r.priceAmount));
      const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      const median = this.calculateMedianPrice(prices);
      const confidence = calculateConfidence(records.length);

      const first = records[0];

      // Price Category
      let category = 'Mid-Range';
      if (avgPrice < 1000000) category = 'Budget';
      else if (avgPrice < 2000000) category = 'Affordable';
      else if (avgPrice < 5000000) category = 'Mid-Range';
      else if (avgPrice < 10000000) category = 'High-End';
      else category = 'Premium';

      results.push({
        suburbId,
        suburbName: first.suburbName,
        cityName: first.cityName,
        province: first.province,
        averagePrice: avgPrice,
        medianPrice: median,
        trendingDirection: 'stable', // No time series data available
        propertyCount: records.length,
        confidence,
        heatmapIntensity: 0, // Calculated later
        color: '',
        priceCategory: category,
      });
    }

    // Calculate Heatmap Intensity (0-1 based on price relative to max)
    const maxPrice = Math.max(...results.map(r => r.averagePrice), 1);
    results.forEach(r => {
      r.heatmapIntensity = r.averagePrice / maxPrice;
      r.color = '#34D399'; // Default, frontend handles actual color
    });

    // Sort by count desc, apply limit/offset
    results.sort((a, b) => b.propertyCount - a.propertyCount);

    if (limit) {
      const start = offset || 0;
      return results.slice(start, start + limit);
    }

    return results;
  }

  // Helper Methods
  private calculateMedianPrice(prices: number[]): number {
    if (prices.length === 0) return 0;
    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }

  private calculatePriceRanges(prices: number[]): PriceRange[] {
    const bucketCounts = new Map<string, number>();
    PRICE_BUCKETS.forEach(bucket => bucketCounts.set(bucket.range, 0));
    prices.forEach(price => {
      for (const bucket of PRICE_BUCKETS) {
        if (price >= bucket.min && price < bucket.max) {
          bucketCounts.set(bucket.range, (bucketCounts.get(bucket.range) || 0) + 1);
          break;
        }
      }
    });
    return PRICE_BUCKETS.map(bucket => ({
      range: bucket.range,
      count: bucketCounts.get(bucket.range) || 0,
    }));
  }

  private calculateAvgPricePerSqm(props: PriceFactRow[]): number {
    const validProperties = props.filter(p => p.areaM2 && p.areaM2 > 0);
    if (validProperties.length === 0) return 0;
    const totalPricePerSqm = validProperties.reduce(
      (sum, p) => sum + Number(p.priceAmount) / Number(p.areaM2),
      0,
    );
    return Math.round(totalPricePerSqm / validProperties.length);
  }

  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.CACHE_TTL;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const priceInsightsService = new PriceInsightsService();
