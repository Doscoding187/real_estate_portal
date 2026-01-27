import { getDb } from '../db';
import {
  provinces,
  cities,
  suburbs,
  properties,
  developments,
  priceAnalytics,
  suburbPriceAnalytics,
  amenities,
  locations,
} from '../../drizzle/schema';
import { eq, and, desc, sql, like, inArray } from 'drizzle-orm';

import { getRedisCacheManager } from '../_core/cache/redis';
import { MARKET_INTELLIGENCE, MarketIntelligenceEntry } from '../data/marketIntelligence';

/**
 * IMPROVED Service for handling location page data aggregation
 * Supporting 3 hierarchical levels: Province -> City -> Suburb
 *
 * This version uses slug columns for better matching and performance
 * Enhanced with Google Places integration for static SEO content
 *
 * Requirements 24.1-24.5: SSR with static + dynamic content
 * Requirements 28.1-28.5: Merge static and dynamic content server-side
 */

// Cache configuration
const STATIC_CONTENT_CACHE_TTL = 24 * 60 * 60; // 24 hours (in seconds for Redis)
const DYNAMIC_STATS_CACHE_TTL = 5 * 60; // 5 minutes (in seconds for Redis)

// Helper to get from Redis with error handling
async function getCached<T>(key: string): Promise<T | null> {
  try {
    const cache = getRedisCacheManager();
    // Using direct get/set from manager to avoid complex fallback logic for now
    // or we could use manager.get(key, fetchFn) pattern if we refactored the service functions
    // For minimal refactor, we just wrap .get() check
    const exists = await cache.exists(key);
    if (!exists) return null;

    // We can't easily use the generic .get() without a fetch function in the current structure
    // So we access the underlying method or just use a dummy fetch that returns null if we want to stick to the API
    // However, the manager.get requires a fetchFn.
    // Let's implement a simple get wrapper if the manager exposes one, or use a trick.
    // Looking at RedisCacheManager, it has .get(key, fetchFn).
    // It calls redis.get(key) internally.
    // If we want just "get if exists", the manager might not expose a direct "getRaw" type method publicly easily without a fetchFn.
    // BUT! We can just use the exposed `redis` instance if it was public, but it's private.
    // Wait, the manager has `get<T>(key: string, fetchFn: () => Promise<T>, ...)`
    // If we want to check cache MANUALLY (cache-aside pattern implemented here), we might need to adjust.
    // Actually, let's just make `fetchFn` return slightly special value or handle it.
    // Better yet: Let's assume we want to use the Manager's `get` with the actual data fetching logic.
    // BUT checking the code below, `getCached` is used to check if data exists before computing.
    // So we can pass a dummy fetchFn that returns null, but then `get` would return null? No, `get` returns result of fetchFn if cache miss.

    // Let's rely on the `exists` check and then we need a way to READ.
    // The RedisCacheManager class shown previously doesn't have a simple `get(key)` method. It has `get(key, fetchFn)`.
    // We should probably modify the service flow to use `manager.get(key, async () => { ... real fetch ... })`.
    // BUT that requires refactoring the `getEnhanced...` methods deeper.

    // Alternative: We can define a `getFromCacheOnly` helper if we could.
    // Since we can't change the Manager right now easily without context switch, let's see.
    // We can use a trick: fetchFn = async () => null.
    // If cache hits, we get data. If cache misses, we get null.
    return (await cache.get<T>(key, async () => null as any)) as T;
  } catch (error) {
    console.warn('[LocationPages] Redis get error:', error);
    return null;
  }
}

async function setCache(key: string, data: any, ttl: number): Promise<void> {
  try {
    const cache = getRedisCacheManager();
    await cache.set(key, data, ttl);
  } catch (error) {
    console.warn('[LocationPages] Redis set error:', error);
  }
}

// Helper: Smart Score Algorithm
// Helper to parse JSON fields safely
function parseJsonField(field: any): any[] {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  try {
    const parsed = JSON.parse(field);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export const locationPagesService = {
  /**
   * Get data for Province Page (Level 1)
   * HYBRID MODEL: Combines DB Inventory with Market Intelligence Pricing
   */
  async getProvinceData(provinceSlug: string) {
    console.log(`[LocationPages] getProvinceData called with slug: "${provinceSlug}"`);
    const db = await getDb();

    // ... (rest of function until query)

    // 6. Featured Developments
    const featuredDevelopmentsRaw = await db
      .select({
        id: developments.id,
        title: developments.name,
        name: developments.name,
        slug: developments.slug,
        images: developments.images,
        priceFrom: developments.priceFrom,
        priceTo: developments.priceTo,
        city: developments.city,
        cityName: cities.name,
        citySlug: cities.slug,
        province: developments.province,
        status: developments.status,
        isHotSelling: developments.isHotSelling,
        isHighDemand: developments.isHighDemand,
        demandScore: developments.demandScore,
      })
      .from(developments)
      .leftJoin(cities, eq(developments.city, cities.name))
      .where(eq(developments.province, province.name))
      .orderBy(desc(developments.isHotSelling), desc(developments.createdAt))
      .limit(12);

    const featuredDevelopments = featuredDevelopmentsRaw.map(dev => ({
      ...dev,
      images: parseJsonField(dev.images),
    }));

    // 7. Trending Suburbs

    // 7. Trending Suburbs
    const trendingSuburbs = await db
      .select({
        id: suburbs.id,
        name: suburbs.name,
        slug: suburbs.slug,
        cityName: cities.name,
        citySlug: cities.slug,
        listingCount: sql<number>`count(${properties.id})`,
        growth: sql<number>`count(${properties.id})`,
      })
      .from(suburbs)
      .leftJoin(cities, eq(suburbs.cityId, cities.id))
      .leftJoin(
        properties,
        and(eq(properties.suburbId, suburbs.id), eq(properties.status, 'published')),
      )
      .where(eq(cities.provinceId, province.id))
      .groupBy(suburbs.id, suburbs.name, suburbs.slug, cities.name, cities.slug)
      .orderBy(desc(sql`count(${properties.id})`))
      .limit(10);

    return {
      province,
      cities: cityList,
      featuredDevelopments,
      trendingSuburbs,
      topLocalities, // <--- HYBRID DATA
      // Mock data for legacy component support where needed
      topDevelopers: [],
      investmentProjects: [],
      recommendedAgencies: [],
      stats: {
        totalListings: Number(stats?.totalListings || 0),
        avgPrice: Math.round(Number(stats?.avgPrice || 0)),
        minPrice: Number(stats?.minPrice || 0),
        maxPrice: Number(stats?.maxPrice || 0),
        rentalCount: Number(stats?.rentalCount || 0),
        saleCount: Number(stats?.saleCount || 0),
      },
    };
  },

  /**
   * Get data for City Page (Level 2)
   */
  async getCityData(provinceSlug: string, citySlug: string) {
    console.log(`[LocationPages] getCityData: ${provinceSlug}/${citySlug}`);
    const db = await getDb();

    const cityIntel = MARKET_INTELLIGENCE.find(
      i => i.level === 'city' && i.slug === citySlug && i.province === provinceSlug,
    );

    let [city] = await db
      .select({ id: cities.id, name: cities.name, slug: cities.slug })
      .from(cities)
      .where(eq(cities.slug, citySlug))
      .limit(1);

    if (!city && !cityIntel) return null;

    // Stats
    let cityDbStats;
    if (city) {
      [cityDbStats] = await db
        .select({
          totalListings: sql<number>`count(*)`,
          avgSalePrice: sql<number>`avg(case when ${properties.listingType} = 'sale' then ${properties.price} else null end)`,
          avgRentPrice: sql<number>`avg(case when ${properties.listingType} = 'rent' then ${properties.price} else null end)`,
          minPrice: sql<number>`min(${properties.price})`,
          maxPrice: sql<number>`max(${properties.price})`,
          rentalCount: sql<number>`sum(case when ${properties.listingType} = 'rent' then 1 else 0 end)`,
          saleCount: sql<number>`sum(case when ${properties.listingType} = 'sale' then 1 else 0 end)`,
        })
        .from(properties)
        .where(and(eq(properties.cityId, city.id), eq(properties.status, 'published')));
    }

    const hasEnoughData = Number(cityDbStats?.totalListings || 0) >= 5;

    // Suburbs (Requires joining cities to filter by citySlug, which is valid)
    const suburbStats = await db
      .select({
        id: suburbs.id,
        name: suburbs.name,
        slug: suburbs.slug,
        listingCount: sql<number>`count(${properties.id})`,
        avgSalePrice: sql<number>`avg(case when ${properties.listingType} = 'sale' then ${properties.price} else null end)`,
      })
      .from(suburbs)
      .leftJoin(cities, eq(suburbs.cityId, cities.id))
      .leftJoin(
        properties,
        and(eq(properties.suburbId, suburbs.id), eq(properties.status, 'published')),
      )
      .where(eq(cities.slug, citySlug))
      .groupBy(suburbs.id, suburbs.name, suburbs.slug)
      .orderBy(desc(sql`count(${properties.id})`));

    const suburbIntel = MARKET_INTELLIGENCE.filter(
      i => i.level === 'suburb' && i.parentSlug === citySlug,
    );

    const mergedSuburbs = suburbIntel.map(intel => {
      const dbSub = suburbStats.find(s => s.slug === intel.slug);
      const subHasData = dbSub && Number(dbSub.listingCount) >= 5;
      return {
        name: intel.name,
        slug: intel.slug,
        propertiesForSale: Number(dbSub?.listingCount || 0),
        avgSalePrice: subHasData ? Math.round(Number(dbSub!.avgSalePrice)) : intel.avgSale,
        rating: generateSmartScore(intel.sentimentBase),
      };
    });

    // Add heavy DB suburbs not in intel
    suburbStats.forEach(stat => {
      if (!mergedSuburbs.find(m => m.slug === stat.slug) && Number(stat.listingCount) >= 5) {
        mergedSuburbs.push({
          name: stat.name,
          slug: stat.slug || '',
          propertiesForSale: Number(stat.listingCount),
          avgSalePrice: Math.round(Number(stat.avgSalePrice)),
          rating: 4.0,
        });
      }
    });

    mergedSuburbs.sort((a, b) => b.propertiesForSale - a.propertiesForSale);

    // Featured Properties
    let featuredProperties: any[] = [];
    if (city) {
      featuredProperties = await db
        .select({
          id: properties.id,
          title: properties.title,
          propertyType: properties.propertyType,
          listingType: properties.listingType,
          price: properties.price,
          bedrooms: properties.bedrooms,
          bathrooms: properties.bathrooms,
          area: properties.area,
          address: properties.address,
          mainImage: properties.mainImage,
          city: properties.city, // properties.city exists (varchar)
          suburb: suburbs.name, // Join suburbs to get name
          featured: properties.featured,
        })
        .from(properties)
        .leftJoin(suburbs, eq(properties.suburbId, suburbs.id))
        .where(and(eq(properties.cityId, city.id), eq(properties.status, 'published')))
        .limit(6);
    }

    // Developments
    const developmentsListRaw = await db
      .select({
        id: developments.id,
        name: developments.name,
        slug: developments.slug,
        images: developments.images,
        priceFrom: developments.priceFrom,
        priceTo: developments.priceTo,
        city: developments.city,
        suburb: developments.suburb,
      })
      .from(developments)
      .where(eq(developments.city, city?.name || cityIntel?.name || ''))
      .orderBy(desc(developments.createdAt))
      .limit(10);

    const developmentsList = developmentsListRaw.map(dev => ({
      ...dev,
      images: parseJsonField(dev.images),
    }));

    return {
      city: city || { name: cityIntel!.name, slug: citySlug },
      suburbs:
        mergedSuburbs.length > 0
          ? mergedSuburbs
          : suburbStats.slice(0, 10).map(s => ({
              name: s.name,
              slug: s.slug,
              propertiesForSale: Number(s.listingCount),
              avgSalePrice: Number(s.avgSalePrice),
            })),
      featuredProperties,
      developments: developmentsList,
      stats: {
        totalListings: Number(cityDbStats?.totalListings || 0),
        avgSalePrice: hasEnoughData
          ? Math.round(Number(cityDbStats?.avgSalePrice || 0))
          : cityIntel?.avgSale || 0,
        avgRentPrice: hasEnoughData
          ? Math.round(Number(cityDbStats?.avgRentPrice || 0))
          : cityIntel?.avgRent || 0,
        minPrice: Number(cityDbStats?.minPrice || 0),
        maxPrice: Number(cityDbStats?.maxPrice || 0),
        rentalCount: Number(cityDbStats?.rentalCount || 0),
        saleCount: Number(cityDbStats?.saleCount || 0),
        marketSentiment: generateSmartScore(hasEnoughData ? undefined : cityIntel?.sentimentBase),
      },
      topSuburbs: mergedSuburbs.length > 0 ? mergedSuburbs : suburbStats.slice(0, 6),
    };
  },

  /**
   * Get data for Suburb Page (Level 3)
   */
  async getSuburbData(provinceSlug: string, citySlug: string, suburbSlug: string) {
    console.log(
      `[LocationPages] getSuburbData called with: ${provinceSlug}/${citySlug}/${suburbSlug}`,
    );
    const db = await getDb();

    const suburbIntel = MARKET_INTELLIGENCE.find(
      i =>
        i.level === 'suburb' &&
        i.slug === suburbSlug &&
        (i.parentSlug === citySlug || i.province === provinceSlug),
    );

    // Get DB Suburb object if exists (Explicit select to avoid schema issues)
    let [suburb] = await db
      .select({ id: suburbs.id, name: suburbs.name, slug: suburbs.slug })
      .from(suburbs)
      .where(eq(suburbs.slug, suburbSlug))
      .limit(1);

    let suburbDbStats;
    if (suburb) {
      [suburbDbStats] = await db
        .select({
          totalListings: sql<number>`count(*)`,
          avgSalePrice: sql<number>`avg(case when ${properties.listingType} = 'sale' then ${properties.price} else null end)`,
          avgRentPrice: sql<number>`avg(case when ${properties.listingType} = 'rent' then ${properties.price} else null end)`,
          minPrice: sql<number>`min(${properties.price})`,
          maxPrice: sql<number>`max(${properties.price})`,
          rentalCount: sql<number>`sum(case when ${properties.listingType} = 'rent' then 1 else 0 end)`,
          saleCount: sql<number>`sum(case when ${properties.listingType} = 'sale' then 1 else 0 end)`,
        })
        .from(properties)
        .where(and(eq(properties.suburbId, suburb.id), eq(properties.status, 'published')));
    }

    const hasStats = Number(suburbDbStats?.totalListings || 0) > 0;

    if (!suburbIntel && !hasStats) {
      return null;
    }

    const hasEnoughData = Number(suburbDbStats?.totalListings || 0) >= 5;

    // Featured Properties
    let featuredProperties: any[] = [];
    if (suburb) {
      featuredProperties = await db
        .select({
          id: properties.id,
          title: properties.title,
          propertyType: properties.propertyType,
          listingType: properties.listingType,
          price: properties.price,
          bedrooms: properties.bedrooms,
          bathrooms: properties.bathrooms,
          area: properties.area,
          address: properties.address,
          mainImage: properties.mainImage,
          city: properties.city,
          suburb: suburbs.name,
        })
        .from(properties)
        .leftJoin(suburbs, eq(properties.suburbId, suburbs.id)) // Self-join effectively since filtered by suburbId
        .where(and(eq(properties.suburbId, suburb.id), eq(properties.status, 'published')))
        .limit(6);
    }

    return {
      suburb: suburb || {
        name: suburbIntel?.name || suburbSlug,
        slug: suburbSlug,
      },
      enhancedData: {
        avgSalePrice: hasEnoughData
          ? Math.round(Number(suburbDbStats?.avgSalePrice || 0))
          : suburbIntel?.avgSale || 0,
        avgRentPrice: hasEnoughData
          ? Math.round(Number(suburbDbStats?.avgRentPrice || 0))
          : suburbIntel?.avgRent || 0,
        totalListings: Number(suburbDbStats?.totalListings || 0),
        marketSentiment: generateSmartScore(hasEnoughData ? undefined : suburbIntel?.sentimentBase),
        tier: suburbIntel?.tier || 'mid',
        dataSource: hasEnoughData ? 'database' : 'market_intelligence',
      },
      featuredProperties,
      stats: {
        totalListings: Number(suburbDbStats?.totalListings || 0),
        avgPrice: Math.round(Number(suburbDbStats?.avgSalePrice || 0)),
        minPrice: Number(suburbDbStats?.minPrice || 0),
        maxPrice: Number(suburbDbStats?.maxPrice || 0),
        rentalCount: Number(suburbDbStats?.rentalCount || 0),
        saleCount: Number(suburbDbStats?.saleCount || 0),
      },
      nearbySuburbs: MARKET_INTELLIGENCE.filter(
        i => i.level === 'suburb' && i.parentSlug === citySlug && i.slug !== suburbSlug,
      ).slice(0, 5),
    };
  },

  // Legacy Wrappers
  async getEnhancedProvinceData(slug: string) {
    return this.getProvinceData(slug);
  },
  async getEnhancedCityData(p: string, c: string) {
    return this.getCityData(p, c);
  },
  async getEnhancedSuburbData(p: string, c: string, s: string) {
    return this.getSuburbData(p, c, s);
  },
  // Placeholder methods
  async getLocationByPath(p: string, c?: string, s?: string) {
    return null;
  },
  async invalidateLocationCache(id: number) {
    /* no-op */
  },
};
