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
  locations
} from '../../drizzle/schema';
import { eq, and, desc, sql, like, inArray } from 'drizzle-orm';

import { getRedisCacheManager } from '../_core/cache/redis';

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
    return await cache.get<T>(key, async () => null as any) as T;
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

export const locationPagesService = {
  
  /**
   * Get data for Province Page (Level 1)
   */
  async getProvinceData(provinceSlug: string) {
    console.log(`[LocationPages] getProvinceData called with slug: "${provinceSlug}"`);
    
    const db = await getDb();
    
    // Try slug column first (if it exists), fallback to name matching
    let province;
    
    try {
      // Method 1: Use slug column (preferred)
      [province] = await db
        .select()
        .from(provinces)
        .where(eq(provinces.slug, provinceSlug))
        .limit(1);
      
      console.log(`[LocationPages] Slug match result:`, province ? province.name : 'NOT FOUND');
    } catch (error) {
      console.log(`[LocationPages] Slug column doesn't exist, using name matching`);
    }
    
    // Method 2: Fallback to name matching
    if (!province) {
      const cleanName = provinceSlug.replace(/-/g, ' ');
      console.log(`[LocationPages] Trying name match with: "${cleanName}"`);
      
      [province] = await db
        .select()
        .from(provinces)
        .where(sql`LOWER(${provinces.name}) = LOWER(${cleanName})`)
        .limit(1);
      
      console.log(`[LocationPages] Name match result:`, province ? province.name : 'NOT FOUND');
    }

    if (!province) {
      console.log(`[LocationPages] Province not found for slug: "${provinceSlug}"`);
      
      // Debug: Show available provinces
      const allProvinces = await db.select({ name: provinces.name, slug: provinces.slug }).from(provinces);
      console.log(`[LocationPages] Available provinces:`, allProvinces);
      
      return null;
    }

    console.log(`[LocationPages] Found province: ${province.name} (id: ${province.id})`);

    // 2. Get Child Cities (Top 12 by listing count or default)
    const cityList = await db
      .select({
        id: cities.id,
        name: cities.name,
        slug: cities.slug,
        isMetro: cities.isMetro,
        listingCount: sql<number>`(SELECT COUNT(*) FROM ${properties} WHERE ${properties.cityId} = ${cities.id} AND ${properties.status} = 'published')`,
        avgPrice: sql<number>`(SELECT AVG(${properties.price}) FROM ${properties} WHERE ${properties.cityId} = ${cities.id} AND ${properties.status} = 'published')`
      })
      .from(cities)
      .where(eq(cities.provinceId, province.id))
      .orderBy(desc(sql`listingCount`))
      .limit(12);

    // 3. Featured Developments in Province
    const featuredDevelopments = await db
      .select({
        id: developments.id,
        name: developments.name,
        slug: developments.slug,
        images: developments.images,
        price: developments.price,
        city: developments.city,
        province: developments.province,
        isHotSelling: developments.isHotSelling,
        isHighDemand: developments.isHighDemand,
        demandScore: developments.demandScore
      })
      .from(developments)
      .where(and(
        eq(developments.province, province.name),
        eq(developments.status, 'now-selling')
      ))
      .orderBy(desc(developments.isHotSelling), desc(developments.demandScore))
      .limit(6);

    // 4. Trending Suburbs
    // 4. Trending Suburbs (Ranked by new listings in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 19).replace('T', ' ');

    const trendingSuburbs = await db
      .select({
        id: suburbs.id,
        name: suburbs.name,
        slug: suburbs.slug,
        cityName: cities.name,
        citySlug: cities.slug,
        listingCount: sql<number>`(SELECT COUNT(*) FROM ${properties} WHERE ${properties.suburbId} = ${suburbs.id} AND ${properties.status} = 'published')`,
        growth: sql<number>`(
          SELECT COUNT(*) * 10 
          FROM ${properties} 
          WHERE ${properties.suburbId} = ${suburbs.id} 
          AND ${properties.status} = 'published'
          AND ${properties.createdAt} >= ${thirtyDaysAgoStr}
        )` // Simplified "growth" score based on recent activity * weight
      })
      .from(suburbs)
      .leftJoin(cities, eq(suburbs.cityId, cities.id))
      .where(eq(cities.provinceId, province.id))
      .orderBy(desc(sql`growth`))
      .limit(10);

    // 5. Aggregate Stats
    const [stats] = await db
      .select({
        totalListings: sql<number>`count(*)`,
        avgPrice: sql<number>`avg(${properties.price})`,
        minPrice: sql<number>`min(${properties.price})`,
        maxPrice: sql<number>`max(${properties.price})`,
        rentalCount: sql<number>`sum(case when ${properties.listingType} = 'rent' then 1 else 0 end)`,
        saleCount: sql<number>`sum(case when ${properties.listingType} = 'sale' then 1 else 0 end)`
      })
      .from(properties)
      .where(and(
        eq(properties.provinceId, province.id),
        eq(properties.status, 'published')
      ));

    return {
      province,
      cities: cityList,
      featuredDevelopments,
      trendingSuburbs,
      stats: {
        totalListings: Number(stats?.totalListings || 0),
        avgPrice: Math.round(Number(stats?.avgPrice || 0)),
        minPrice: Number(stats?.minPrice || 0),
        maxPrice: Number(stats?.maxPrice || 0),
        rentalCount: Number(stats?.rentalCount || 0),
        saleCount: Number(stats?.saleCount || 0)
      }
    };
  },

  /**
   * Get data for City Page (Level 2)
   */
  async getCityData(provinceSlug: string, citySlug: string) {
    console.log(`[LocationPages] getCityData called with: provinceSlug="${provinceSlug}", citySlug="${citySlug}"`);
    
    try {
      const db = await getDb();
      
      // Try slug column first, fallback to name matching
      let city;
      
      try {
        // Method 1: Use slug column (preferred)
        [city] = await db
          .select({
            id: cities.id,
            name: cities.name,
            slug: cities.slug,
            provinceId: cities.provinceId,
            provinceName: provinces.name,
            provinceSlug: provinces.slug,
            isMetro: cities.isMetro,
            latitude: cities.latitude,
            longitude: cities.longitude
          })
          .from(cities)
          .leftJoin(provinces, eq(cities.provinceId, provinces.id))
          .where(eq(cities.slug, citySlug))
          .limit(1);
        
        console.log(`[LocationPages] Slug match result:`, city ? city.name : 'NOT FOUND');
      } catch (error) {
        console.log(`[LocationPages] Slug column doesn't exist, using name matching`);
      }
      
      // Method 2: Fallback to name matching
      if (!city) {
        const cleanCityName = citySlug.replace(/-/g, ' ');
        console.log(`[LocationPages] Trying name match with: "${cleanCityName}"`);
        
        [city] = await db
          .select({
            id: cities.id,
            name: cities.name,
            slug: cities.slug,
            provinceId: cities.provinceId,
            provinceName: provinces.name,
            provinceSlug: provinces.slug,
            isMetro: cities.isMetro,
            latitude: cities.latitude,
            longitude: cities.longitude
          })
          .from(cities)
          .leftJoin(provinces, eq(cities.provinceId, provinces.id))
          .where(sql`LOWER(${cities.name}) = LOWER(${cleanCityName})`)
          .limit(1);
        
        console.log(`[LocationPages] Name match result:`, city ? city.name : 'NOT FOUND');
      }

      if (!city) {
        console.log(`[LocationPages] City not found for slug: "${citySlug}"`);
        
        // Debug: Show available cities
        const allCities = await db.select({ name: cities.name, slug: cities.slug }).from(cities).limit(10);
        console.log(`[LocationPages] Sample cities:`, allCities);
        
        return null;
      }

      console.log(`[LocationPages] Found city: ${city.name} (id: ${city.id})`);

      // 2. Popular Suburbs in City
      const listingCountSql = sql<number>`(SELECT COUNT(*) FROM ${properties} WHERE ${properties.suburbId} = ${suburbs.id} AND ${properties.status} = 'published')`;
      
      const suburbList = await db
        .select({
          id: suburbs.id,
          name: suburbs.name,
          slug: suburbs.slug,
          listingCount: listingCountSql,
          avgPrice: sql<number>`(SELECT AVG(${properties.price}) FROM ${properties} WHERE ${properties.suburbId} = ${suburbs.id} AND ${properties.status} = 'published')`
        })
        .from(suburbs)
        .where(eq(suburbs.cityId, city.id))
        .orderBy(desc(listingCountSql))
        .limit(12);
      
      console.log(`[LocationPages] Found ${suburbList.length} suburbs`);

      // 3. Featured Properties in City
      const featuredProperties = await db
        .select({
          id: properties.id,
          title: properties.title,
          description: properties.description,
          propertyType: properties.propertyType,
          listingType: properties.listingType,
          price: properties.price,
          bedrooms: properties.bedrooms,
          bathrooms: properties.bathrooms,
          area: properties.area,
          address: properties.address,
          city: properties.city,
          province: properties.province,
          latitude: properties.latitude,
          longitude: properties.longitude,
          images: properties.mainImage, // Using mainImage instead of images array for safety
          featured: properties.featured,
          createdAt: properties.createdAt,
        })
        .from(properties)
        .where(and(
          eq(properties.cityId, city.id),
          eq(properties.status, 'published' as any),
          eq(properties.featured, 1)
        ))
        .limit(6);

      // 4. Developments in City
      const cityDevelopments = await db
        .select({
          id: developments.id,
          name: developments.name,
          slug: developments.slug,
          images: developments.images,
          price: developments.price,
          city: developments.city,
          province: developments.province,
          isHotSelling: developments.isHotSelling,
          isHighDemand: developments.isHighDemand,
          demandScore: developments.demandScore
        })
        .from(developments)
        .where(and(
          eq(developments.city, city.name),
          eq(developments.isPublished, 1)
        ))
        .orderBy(desc(developments.isHotSelling), desc(developments.demandScore))
        .limit(6);

      // 5. Aggregate Stats
      const [stats] = await db
        .select({
          totalListings: sql<number>`count(*)`,
          avgPrice: sql<number>`avg(${properties.price})`,
          minPrice: sql<number>`min(${properties.price})`,
          maxPrice: sql<number>`max(${properties.price})`,
          rentalCount: sql<number>`sum(case when ${properties.listingType} = 'rent' then 1 else 0 end)`,
          saleCount: sql<number>`sum(case when ${properties.listingType} = 'sale' then 1 else 0 end)`
        })
        .from(properties)
        .where(and(
          eq(properties.cityId, city.id), 
          eq(properties.status, 'published' as any)
        ));

      // Debug logging before return
      console.log(`[LocationPages] Preparing return data for city: ${city.name}`);
      console.log(`[LocationPages] - Suburbs count: ${suburbList?.length || 0}`);
      console.log(`[LocationPages] - Featured properties count: ${featuredProperties?.length || 0}`);
      console.log(`[LocationPages] - Developments count: ${cityDevelopments?.length || 0}`);
      console.log(`[LocationPages] - Stats:`, stats);

      return {
        city,
        suburbs: suburbList ?? [],
        featuredProperties: (featuredProperties ?? [])
          .filter((p): p is NonNullable<typeof p> => p != null)
          .map(p => {
            let images: any[] = [];

            if (typeof p.images === 'string') {
              try {
                images = JSON.parse(p.images);
              } catch (e) {
                console.error(
                  '[LocationPages] Invalid images JSON for property',
                  p.id,
                  p.images
                );
              }
            } else if (Array.isArray(p.images)) {
              images = p.images;
            }

            // Final guard
            if (!Array.isArray(images)) {
              images = [];
            }

            return {
              ...p,
              images,
            };
          }),
        developments: (cityDevelopments ?? [])
          .filter((d): d is NonNullable<typeof d> => d != null)
          .map(d => {
            // Safe handling for development images
            let devImages = d.images;
            if (typeof devImages !== 'string') {
              try {
                devImages = JSON.stringify(devImages || []);
              } catch (e) {
                console.error('[LocationPages] Error stringifying development images:', d.id);
                devImages = '[]';
              }
            }
            
            return {
              ...d,
              images: devImages
            };
          }),
        stats: {
          totalListings: Number(stats?.totalListings || 0),
          avgPrice: Number(stats?.avgPrice || 0),
          minPrice: Number(stats?.minPrice || 0),
          maxPrice: Number(stats?.maxPrice || 0),
          rentalCount: Number(stats?.rentalCount || 0),
          saleCount: Number(stats?.saleCount || 0)
        }
      };
    } catch (error) {
      console.error('[LocationPages] Error in getCityData:', error);
      throw error;
    }
  },

  /**
   * Get data for Suburb Page (Level 3)
   */
  async getSuburbData(provinceSlug: string, citySlug: string, suburbSlug: string) {
    console.log(`[LocationPages] getSuburbData called with: provinceSlug="${provinceSlug}", citySlug="${citySlug}", suburbSlug="${suburbSlug}"`);
    
    const db = await getDb();
    
    // Try slug column first, fallback to name matching
    let suburb;
    
    try {
      // Method 1: Use slug column (preferred)
      [suburb] = await db
        .select({
          id: suburbs.id,
          name: suburbs.name,
          slug: suburbs.slug,
          cityId: suburbs.cityId,
          cityName: cities.name,
          citySlug: cities.slug,
          provinceName: provinces.name,
          provinceSlug: provinces.slug,
          latitude: suburbs.latitude,
          longitude: suburbs.longitude
        })
        .from(suburbs)
        .leftJoin(cities, eq(suburbs.cityId, cities.id))
        .leftJoin(provinces, eq(cities.provinceId, provinces.id))
        .where(eq(suburbs.slug, suburbSlug))
        .limit(1);
      
      console.log(`[LocationPages] Slug match result:`, suburb ? suburb.name : 'NOT FOUND');
    } catch (error) {
      console.log(`[LocationPages] Slug column doesn't exist, using name matching`);
    }
    
    // Method 2: Fallback to name matching
    if (!suburb) {
      const cleanSuburbName = suburbSlug.replace(/-/g, ' ');
      console.log(`[LocationPages] Trying name match with: "${cleanSuburbName}"`);
      
      [suburb] = await db
        .select({
          id: suburbs.id,
          name: suburbs.name,
          slug: suburbs.slug,
          cityId: suburbs.cityId,
          cityName: cities.name,
          citySlug: cities.slug,
          provinceName: provinces.name,
          provinceSlug: provinces.slug,
          latitude: suburbs.latitude,
          longitude: suburbs.longitude
        })
        .from(suburbs)
        .leftJoin(cities, eq(suburbs.cityId, cities.id))
        .leftJoin(provinces, eq(cities.provinceId, provinces.id))
        .where(sql`LOWER(${suburbs.name}) = LOWER(${cleanSuburbName})`)
        .limit(1);
      
      console.log(`[LocationPages] Name match result:`, suburb ? suburb.name : 'NOT FOUND');
    }

    if (!suburb) {
      console.log(`[LocationPages] Suburb not found for slug: "${suburbSlug}"`);
      
      // Debug: Show available suburbs
      const allSuburbs = await db.select({ name: suburbs.name, slug: suburbs.slug }).from(suburbs).limit(10);
      console.log(`[LocationPages] Sample suburbs:`, allSuburbs);
      
      return null;
    }

    console.log(`[LocationPages] Found suburb: ${suburb.name} (id: ${suburb.id})`);

    // 2. Listing Stats
    const [stats] = await db
      .select({
        totalListings: sql<number>`count(*)`,
        avgPrice: sql<number>`avg(${properties.price})`,
        rentalCount: sql<number>`count(CASE WHEN ${properties.listingType} = 'rent' THEN 1 END)`,
        saleCount: sql<number>`count(CASE WHEN ${properties.listingType} = 'sale' THEN 1 END)`
      })
      .from(properties)
      .where(and(
        eq(properties.suburbId, suburb.id),
        eq(properties.status, 'published')
      ));

    // 3. Featured Properties in Suburb
    const localProperties = await db
      .select()
      .from(properties)
      .where(and(
        eq(properties.suburbId, suburb.id),
        eq(properties.status, 'published')
      ))
      .orderBy(desc(properties.createdAt))
      .limit(12);

    // 4. Market Insights (Price Analytics)
    const [analytics] = await db
      .select()
      .from(suburbPriceAnalytics)
      .where(eq(suburbPriceAnalytics.suburbId, suburb.id))
      .limit(1);
    
    return {
      suburb,
      stats: {
        totalListings: Number(stats?.totalListings || 0),
        avgPrice: Math.round(Number(stats?.avgPrice || 0)),
        rentalCount: Number(stats?.rentalCount || 0),
        saleCount: Number(stats?.saleCount || 0)
      },
      listings: localProperties.map(p => ({...p, images: typeof p.images === 'string' ? JSON.parse(p.images) : p.images})),
      analytics: analytics || null
    };
  },

  /**
   * Get location by hierarchical path with Google Places integration
   * Requirements 24.1, 28.1: Fetch static content from locations table
   * 
   * This method supports slug-based lookups and returns Google Places data
   * from the locations table for SEO-optimized content.
   * 
   * @param province - Province slug
   * @param city - City slug (optional)
   * @param suburb - Suburb slug (optional)
   * @returns Location record with Google Places data
   */
  async getLocationByPath(
    province: string,
    city?: string,
    suburb?: string
  ): Promise<any | null> {
    const cacheKey = `location:${province}:${city || ''}:${suburb || ''}`;
    
    // Check cache (24 hour TTL for static content)
    const cached = await getCached<Location>(cacheKey);
    if (cached) {
      console.log(`[LocationPages] Cache hit for: ${cacheKey}`);
      return cached;
    }
    
    const db = await getDb();
    
    // Determine which level we're looking for
    let locationType: 'province' | 'city' | 'suburb';
    let locationSlug: string;
    
    if (suburb) {
      locationType = 'suburb';
      locationSlug = suburb;
    } else if (city) {
      locationType = 'city';
      locationSlug = city;
    } else {
      locationType = 'province';
      locationSlug = province;
    }
    
    // Try to find in locations table (Google Places data)
    const [location] = await db
      .select()
      .from(locations)
      .where(and(
        eq(locations.slug, locationSlug),
        eq(locations.type, locationType)
      ))
      .limit(1);
    
    if (location) {
      console.log(`[LocationPages] Found location in locations table: ${location.name}`);
      await setCache(cacheKey, location, STATIC_CONTENT_CACHE_TTL);
      return location;
    }
    
    console.log(`[LocationPages] Location not found in locations table, falling back to legacy tables`);
    return null;
  },

  /**
   * Get enhanced province data with Google Places integration
   * Requirements 24.1-24.5, 28.1-28.5: Merge static + dynamic content
   * 
   * This method combines:
   * - Static SEO content from locations table (80%, cached 24 hours)
   * - Dynamic market statistics from listings (20%, cached 5 minutes)
   * 
   * @param provinceSlug - Province slug
   * @returns Combined static and dynamic data
   */
  async getEnhancedProvinceData(provinceSlug: string) {
    console.log(`[LocationPages] getEnhancedProvinceData called with slug: "${provinceSlug}"`);
    
    // Get static content from locations table (cached 24 hours)
    const staticCacheKey = `static:province:${provinceSlug}`;
    let staticContent = await getCached<any>(staticCacheKey);
    
    if (!staticContent) {
      staticContent = await this.getLocationByPath(provinceSlug);
      if (staticContent) {
        await setCache(staticCacheKey, staticContent, STATIC_CONTENT_CACHE_TTL);
      }
    }
    
    // Get dynamic statistics (cached 5 minutes)
    const dynamicCacheKey = `dynamic:province:${provinceSlug}`;
    let dynamicData = await getCached<any>(dynamicCacheKey);
    
    if (!dynamicData) {
      dynamicData = await this.getProvinceData(provinceSlug);
      if (dynamicData) {
        await setCache(dynamicCacheKey, dynamicData, DYNAMIC_STATS_CACHE_TTL);
      }
    }
    
    if (!dynamicData) {
      return null;
    }
    
    // Merge static (80%) and dynamic (20%) content
    return {
      ...dynamicData,
      // Override with Google Places static content if available
      seoContent: staticContent ? {
        title: staticContent.seoTitle || dynamicData.province?.name,
        description: staticContent.seoDescription || '',
        heroImage: staticContent.heroImage,
        placeId: staticContent.placeId,
        coordinates: {
          lat: staticContent.latitude,
          lng: staticContent.longitude
        },
        viewport: staticContent.viewportNeLat ? {
          northeast: {
            lat: parseFloat(staticContent.viewportNeLat),
            lng: parseFloat(staticContent.viewportNeLng)
          },
          southwest: {
            lat: parseFloat(staticContent.viewportSwLat),
            lng: parseFloat(staticContent.viewportSwLng)
          }
        } : null
      } : null
    };
  },

  /**
   * Get enhanced city data with Google Places integration
   * Requirements 24.1-24.5, 28.1-28.5: Merge static + dynamic content
   * 
   * @param provinceSlug - Province slug
   * @param citySlug - City slug
   * @returns Combined static and dynamic data
   */
  async getEnhancedCityData(provinceSlug: string, citySlug: string) {
    console.log(`[LocationPages] getEnhancedCityData called with: provinceSlug="${provinceSlug}", citySlug="${citySlug}"`);
    
    // Get static content from locations table (cached 24 hours)
    const staticCacheKey = `static:city:${provinceSlug}:${citySlug}`;
    let staticContent = await getCached<any>(staticCacheKey);
    
    if (!staticContent) {
      staticContent = await this.getLocationByPath(provinceSlug, citySlug);
      if (staticContent) {
        await setCache(staticCacheKey, staticContent, STATIC_CONTENT_CACHE_TTL);
      }
    }
    
    // Get dynamic statistics (cached 5 minutes)
    const dynamicCacheKey = `dynamic:city:${provinceSlug}:${citySlug}`;
    let dynamicData = await getCached<any>(dynamicCacheKey);
    
    if (!dynamicData) {
      dynamicData = await this.getCityData(provinceSlug, citySlug);
      if (dynamicData) {
        await setCache(dynamicCacheKey, dynamicData, DYNAMIC_STATS_CACHE_TTL);
      }
    }
    
    if (!dynamicData) {
      return null;
    }
    
    // Merge static (80%) and dynamic (20%) content
    return {
      ...dynamicData,
      // Override with Google Places static content if available
      seoContent: staticContent ? {
        title: staticContent.seoTitle || dynamicData.city?.name,
        description: staticContent.seoDescription || '',
        heroImage: staticContent.heroImage,
        placeId: staticContent.placeId,
        coordinates: {
          lat: staticContent.latitude,
          lng: staticContent.longitude
        },
        viewport: staticContent.viewportNeLat ? {
          northeast: {
            lat: parseFloat(staticContent.viewportNeLat),
            lng: parseFloat(staticContent.viewportNeLng)
          },
          southwest: {
            lat: parseFloat(staticContent.viewportSwLat),
            lng: parseFloat(staticContent.viewportSwLng)
          }
        } : null
      } : null
    };
  },

  /**
   * Get enhanced suburb data with Google Places integration
   * Requirements 24.1-24.5, 28.1-28.5: Merge static + dynamic content
   * 
   * @param provinceSlug - Province slug
   * @param citySlug - City slug
   * @param suburbSlug - Suburb slug
   * @returns Combined static and dynamic data
   */
  async getEnhancedSuburbData(provinceSlug: string, citySlug: string, suburbSlug: string) {
    console.log(`[LocationPages] getEnhancedSuburbData called with: provinceSlug="${provinceSlug}", citySlug="${citySlug}", suburbSlug="${suburbSlug}"`);
    
    // Get static content from locations table (cached 24 hours)
    const staticCacheKey = `static:suburb:${provinceSlug}:${citySlug}:${suburbSlug}`;
    let staticContent = await getCached<any>(staticCacheKey);
    
    if (!staticContent) {
      staticContent = await this.getLocationByPath(provinceSlug, citySlug, suburbSlug);
      if (staticContent) {
        await setCache(staticCacheKey, staticContent, STATIC_CONTENT_CACHE_TTL);
      }
    }
    
    // Get dynamic statistics (cached 5 minutes)
    const dynamicCacheKey = `dynamic:suburb:${provinceSlug}:${citySlug}:${suburbSlug}`;
    let dynamicData = await getCached<any>(dynamicCacheKey);
    
    if (!dynamicData) {
      dynamicData = await this.getSuburbData(provinceSlug, citySlug, suburbSlug);
      if (dynamicData) {
        await setCache(dynamicCacheKey, dynamicData, DYNAMIC_STATS_CACHE_TTL);
      }
    }
    
    if (!dynamicData) {
      return null;
    }
    
    // Merge static (80%) and dynamic (20%) content
    return {
      ...dynamicData,
      // Override with Google Places static content if available
      seoContent: staticContent ? {
        title: staticContent.seoTitle || dynamicData.suburb?.name,
        description: staticContent.seoDescription || '',
        heroImage: staticContent.heroImage,
        placeId: staticContent.placeId,
        coordinates: {
          lat: staticContent.latitude,
          lng: staticContent.longitude
        },
        viewport: staticContent.viewportNeLat ? {
          northeast: {
            lat: parseFloat(staticContent.viewportNeLat),
            lng: parseFloat(staticContent.viewportNeLng)
          },
          southwest: {
            lat: parseFloat(staticContent.viewportSwLat),
            lng: parseFloat(staticContent.viewportSwLng)
          }
        } : null
      } : null
    };
  },

  /**
   * Invalidate cached statistics for a location
   * Requirements 24.4: Invalidate cached statistics when listings change
   * 
   * This should be called when a listing is created, updated, or deleted
   * to ensure users see fresh market data.
   * 
   * @param locationId - Location ID
   */
  async invalidateLocationCache(locationId: number): Promise<void> {
    const db = await getDb();
    
    // Get the location to find its slug
    const [location] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, locationId))
      .limit(1);
    
    if (!location) {
      console.warn(`[LocationPages] Location ${locationId} not found for cache invalidation`);
      return;
    }
    
    // Build cache keys based on location type and hierarchy
    const keysToInvalidate: string[] = [];
    
    if (location.type === 'suburb') {
      // Get parent city and province
      if (location.parentId) {
        const [parentCity] = await db
          .select()
          .from(locations)
          .where(eq(locations.id, location.parentId))
          .limit(1);
        
        if (parentCity && parentCity.parentId) {
          const [parentProvince] = await db
            .select()
            .from(locations)
            .where(eq(locations.id, parentCity.parentId))
            .limit(1);
          
          if (parentProvince) {
            keysToInvalidate.push(`dynamic:suburb:${parentProvince.slug}:${parentCity.slug}:${location.slug}`);
            keysToInvalidate.push(`dynamic:city:${parentProvince.slug}:${parentCity.slug}`);
            keysToInvalidate.push(`dynamic:province:${parentProvince.slug}`);
          }
        }
      }
    } else if (location.type === 'city') {
      if (location.parentId) {
        const [parentProvince] = await db
          .select()
          .from(locations)
          .where(eq(locations.id, location.parentId))
          .limit(1);
        
        if (parentProvince) {
          keysToInvalidate.push(`dynamic:city:${parentProvince.slug}:${location.slug}`);
          keysToInvalidate.push(`dynamic:province:${parentProvince.slug}`);
        }
      }
    } else if (location.type === 'province') {
      keysToInvalidate.push(`dynamic:province:${location.slug}`);
    }
    
    // Invalidate all relevant cache keys
  if (keysToInvalidate.length > 0) {
    try {
      const cache = getRedisCacheManager();
      await cache.del(keysToInvalidate);
      console.log(`[LocationPages] Invalidated cache keys: ${keysToInvalidate.join(', ')}`);
    } catch (error) {
      console.error('[LocationPages] Failed to invalidate cache:', error);
    }
  }
}
};
