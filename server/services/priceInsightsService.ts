import { db } from '../db';
import { sql } from 'drizzle-orm';
import { properties } from '../../drizzle/schema/listings';
import { developments, unitTypes } from '../../drizzle/schema/developments';
import { provinces, cities, suburbs, locations } from '../../drizzle/schema/locations';

export interface CityInsights {
  cityName: string;
  medianPrice: number;
  listings: number;
  avgPricePerSqm: number;
  priceRanges: PriceRange[];
  micromarkets: Micromarket[];
  confidence: number;
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
  confidence: number;
  heatmapIntensity: number;
  color: string;
  priceCategory: string;
}

const PRICE_BUCKETS = [
  { range: 'Below R1M', min: 0, max: 1000000 },
  { range: 'R1M-R2M', min: 1000000, max: 2000000 },
  { range: 'R2M-R3M', min: 2000000, max: 3000000 },
  { range: 'R3M-R5M', min: 3000000, max: 5000000 },
  { range: 'R5M-R10M', min: 5000000, max: 10000000 },
  { range: 'Above R10M', min: 10000000, max: Infinity },
] as const;

const MIN_OFFERS_FOR_LOW_CONFIDENCE = 3;
const MIN_OFFERS_FOR_MEDIUM_CONFIDENCE = 10;
const MIN_OFFERS_FOR_HIGH_CONFIDENCE = 30;

function calculateConfidence(count: number): number {
  if (count >= MIN_OFFERS_FOR_HIGH_CONFIDENCE) return 1.0;
  if (count >= MIN_OFFERS_FOR_MEDIUM_CONFIDENCE) return 0.7;
  if (count >= MIN_OFFERS_FOR_LOW_CONFIDENCE) return 0.4;
  return 0.1;
}

class PriceInsightsService {
  private cache: Map<string, { data: unknown; timestamp: number }>;
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  constructor() {
    this.cache = new Map();
  }

  // --- LIVE PRICES CTE ---
  private get livePricesCte() {
    return sql`
      WITH live_prices AS (
        SELECT 
          CAST(${properties.price} AS SIGNED) as priceAmount,
          CAST(${properties.area} AS SIGNED) as areaM2,
          ${provinces.id} as provinceId,
          ${provinces.name} as provinceName,
          ${cities.id} as cityId,
          ${cities.name} as cityName,
          ${suburbs.id} as suburbId,
          ${suburbs.name} as suburbName
        FROM ${properties}
        JOIN ${provinces} ON ${properties.provinceId} = ${provinces.id}
        JOIN ${cities} ON ${properties.cityId} = ${cities.id}
        LEFT JOIN ${suburbs} ON ${properties.suburbId} = ${suburbs.id}
        WHERE ${properties.status} = 'available' 
          AND ${properties.transactionType} = 'sale' 
          AND ${properties.price} > 0
        
        UNION ALL
        
        SELECT 
          CAST(${unitTypes.basePriceFrom} AS SIGNED) as priceAmount,
          CAST(${unitTypes.unitSize} AS SIGNED) as areaM2,
          ${provinces.id} as provinceId,
          ${provinces.name} as provinceName,
          ${cities.id} as cityId,
          ${cities.name} as cityName,
          ${suburbs.id} as suburbId,
          ${suburbs.name} as suburbName
        FROM ${unitTypes}
        JOIN ${developments} ON ${unitTypes.developmentId} = ${developments.id}
        JOIN ${cities} ON ${cities.name} = ${developments.city}
        JOIN ${provinces} ON ${provinces.id} = ${cities.provinceId}
        LEFT JOIN ${suburbs} ON ${suburbs.name} = ${developments.suburb} AND ${suburbs.cityId} = ${cities.id}
        WHERE ${unitTypes.isActive} = 1 
          AND ${developments.status} IN ('selling', 'now-selling', 'launching-soon')
          AND ${unitTypes.basePriceFrom} > 0
      )
    `;
  }

  // 1. Fetch Hierarchy Summaries
  async getHierarchyAggregations(level: string, parentId?: number) {
    const dbInstance = await db;
    
    let groupByCol = sql`lp.provinceId`;
    let idCol = sql`lp.provinceId`;
    let filter = sql`1=1`;

    if (level === 'province') {
      groupByCol = sql`lp.cityId`;
      idCol = sql`lp.cityId`;
      filter = sql`lp.provinceId = ${parentId}`;
    } else if (level === 'city') {
      groupByCol = sql`lp.suburbId`;
      idCol = sql`lp.suburbId`;
      filter = sql`lp.cityId = ${parentId}`;
    }

    const summariesResult = await dbInstance.execute(sql`
      ${this.livePricesCte}
      SELECT
        ${idCol} AS id,
        AVG(lp.priceAmount) AS avg_price,
        COUNT(*) AS listing_count,
        -- Approximate Median using 50th percentile logic natively via JSON / JS sorting done later if needed
        -- Since true median in MySQL requires complex functions, we fallback to AVG or calculate it in memory
        -- for now, returning avg as a proxy, will be processed properly if needed.
        AVG(lp.priceAmount) AS median_price
      FROM live_prices lp
      WHERE ${filter} AND ${idCol} IS NOT NULL
      GROUP BY ${groupByCol}
    `);

    const summariesByTabId: Record<string, any> = {};
    const rows = (summariesResult[0] as any[]) || [];

    for (const row of rows) {
      if (row.id) {
        summariesByTabId[String(row.id)] = {
          medianPrice: row.median_price ? Number(row.median_price) : null,
          avgPrice: row.avg_price ? Number(row.avg_price) : null,
          listingCount: row.listing_count ? Number(row.listing_count) : null,
        };
      }
    }

    // Top Children For Explore Tab
    let childIdCol = sql`lp.cityId`;
    let childNameCol = sql`lp.cityName`;
    let parentPartitionCol = sql`lp.provinceId`;
    let exploreFilter = sql`lp.cityId IS NOT NULL`;

    if (level === 'province') {
      childIdCol = sql`lp.suburbId`;
      childNameCol = sql`lp.suburbName`;
      parentPartitionCol = sql`lp.cityId`;
      exploreFilter = sql`lp.suburbId IS NOT NULL AND lp.provinceId = ${parentId}`;
    } else if (level === 'city') {
      // no explore underneath suburbs
      return { summariesByTabId, topChildrenByTabId: {} };
    }

    const topChildrenResult = await dbInstance.execute(sql`
      ${this.livePricesCte}
      SELECT * FROM (
        SELECT 
          ${childIdCol} AS id,
          ${childNameCol} AS name,
          ${parentPartitionCol} AS tab_id,
          AVG(lp.priceAmount) AS median_price,
          COUNT(*) as listing_count,
          ROW_NUMBER() OVER (
            PARTITION BY ${parentPartitionCol} 
            ORDER BY COUNT(*) DESC
          ) AS rn
        FROM live_prices lp
        WHERE ${exploreFilter}
        GROUP BY ${childIdCol}, ${childNameCol}, ${parentPartitionCol}
      ) t
      WHERE t.rn <= 5
    `);

    const topChildrenByTabId: Record<string, any[]> = {};
    const exploreRows = (topChildrenResult[0] as any[]) || [];

    for (const row of exploreRows) {
      const key = String(row.tab_id);
      if (!topChildrenByTabId[key]) topChildrenByTabId[key] = [];

      topChildrenByTabId[key].push({
        id: Number(row.id),
        name: row.name,
        medianPrice: row.median_price ? Number(row.median_price) : null,
      });
    }

    return { summariesByTabId, topChildrenByTabId };
  }

  // 2. Original Endpoint Equivalents
  async getAllCityInsights(): Promise<Record<string, CityInsights>> {
    const cacheKey = 'all-cities-live';
    if (this.isCacheValid(cacheKey)) return this.cache.get(cacheKey)!.data as Record<string, CityInsights>;

    try {
      const dbInstance = await db;
      const citiesResult = await dbInstance.execute(sql`
        ${this.livePricesCte}
        SELECT 
          cityId,
          cityName,
          COUNT(*) as listingCount
        FROM live_prices
        GROUP BY cityId, cityName
        HAVING listingCount >= ${MIN_OFFERS_FOR_LOW_CONFIDENCE}
        ORDER BY listingCount DESC
      `);

      const cities = citiesResult[0] as Array<{ cityId: number; cityName: string; listingCount: number }>;
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
        ${this.livePricesCte}
        SELECT 
           priceAmount, 
           areaM2,
           cityName
        FROM live_prices
        WHERE cityId = ${cityId}
      `);

      const cityProperties = propsResult[0] as Array<{ priceAmount: number; areaM2: number; cityName: string }>;

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
        medianPrice: medianPrice,
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
        ${this.livePricesCte}
        SELECT 
          suburbName as area,
          AVG(priceAmount / NULLIF(areaM2, 0)) as pricePerSqm,
          COUNT(*) as listingCount
        FROM live_prices
        WHERE cityId = ${cityId}
          AND areaM2 > 0
          AND suburbName IS NOT NULL
        GROUP BY suburbId, suburbName
        HAVING listingCount >= ${MIN_OFFERS_FOR_LOW_CONFIDENCE}
        ORDER BY listingCount DESC
        LIMIT 4
      `);

      return ((result[0] as any[]) || []).map(row => ({
        area: row.area,
        pricePerSqm: Math.round(Number(row.pricePerSqm)),
        confidence: calculateConfidence(row.listingCount),
      }));
    } catch (error) {
      console.error(`Error fetching micromarkets for city ${cityId}:`, error);
      return [];
    }
  }

  async getSuburbPriceHeatmap(input: {
    cityId?: number;
    provinceId?: number;
    limit?: number;
    offset?: number;
  }): Promise<SuburbPriceData[]> {
    const { cityId, limit, offset } = input;
    const dbInstance = await db;

    let whereClause = sql`suburbId IS NOT NULL`;
    if (cityId) {
      whereClause = sql`${whereClause} AND cityId = ${cityId}`;
    }

    const rowsResult = await dbInstance.execute(sql`
      ${this.livePricesCte}
      SELECT 
          suburbId,
          suburbName,
          cityName,
          provinceName as province,
          priceAmount
      FROM live_prices
      WHERE ${whereClause}
    `);

    const rows = rowsResult[0] as Array<{ suburbId: number; suburbName: string; cityName: string; province: string; priceAmount: number }>;
    const suburbsMap = new Map<number, typeof rows>();

    for (const row of rows) {
      if (!suburbsMap.has(row.suburbId)) suburbsMap.set(row.suburbId, []);
      suburbsMap.get(row.suburbId)!.push(row);
    }

    const results: SuburbPriceData[] = [];
    for (const [suburbId, records] of Array.from(suburbsMap.entries())) {
      if (records.length < MIN_OFFERS_FOR_LOW_CONFIDENCE) continue;

      const prices = records.map(r => Number(r.priceAmount));
      const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      const median = this.calculateMedianPrice(prices);
      const first = records[0];

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
        trendingDirection: 'stable',
        propertyCount: records.length,
        confidence: calculateConfidence(records.length),
        heatmapIntensity: 0,
        color: '#34D399',
        priceCategory: category,
      });
    }

    const maxPrice = Math.max(...results.map(r => r.averagePrice), 1);
    results.forEach(r => r.heatmapIntensity = r.averagePrice / maxPrice);
    results.sort((a, b) => b.propertyCount - a.propertyCount);

    if (limit) {
      const start = offset || 0;
      return results.slice(start, start + limit);
    }
    return results;
  }

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

  private calculateAvgPricePerSqm(props: Array<{ priceAmount: number; areaM2: number }>): number {
    const validProperties = props.filter(p => p.areaM2 && p.areaM2 > 0);
    if (validProperties.length === 0) return 0;
    const totalPricePerSqm = validProperties.reduce((sum, p) => sum + Number(p.priceAmount) / Number(p.areaM2), 0);
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
