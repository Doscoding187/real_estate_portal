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
const STATIC_CONTENT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const DYNAMIC_STATS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Simple in-memory cache (in production, use Redis)
const cache = new Map<string, { data: any; expires: number }>();

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any, ttl: number): void {
  cache.set(key, {
    data,
    expires: Date.now() + ttl
  });
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
      .select()
      .from(developments)
      .where(and(
        eq(developments.province, province.name),
        eq(developments.status, 'now-selling')
      ))
      .limit(6);

    // 4. Trending Suburbs
    const trendingSuburbs = await db
      .select({
        id: suburbs.id,
        name: suburbs.name,
        slug: suburbs.slug,
        cityName: cities.name,
        citySlug: cities.slug,
        listingCount: sql<number>`(SELECT COUNT(*) FROM ${properties} WHERE ${properties.suburbId} = ${suburbs.id} AND ${properties.status} = 'published')`
      })
      .from(suburbs)
      .leftJoin(cities, eq(suburbs.cityId, cities.id))
      .where(eq(cities.provinceId, province.id))
      .orderBy(desc(sql`listingCount`))
      .limit(10);

    // 5. Aggregate Stats
    const [stats] = await db
      .select({
        totalListings: sql<number>`count(*)`,
        avgPrice: sql<number>`avg(${properties.price})`
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
        avgPrice: Math.round(Number(stats?.avgPrice || 0))
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
        .select()
        .from(properties)
        .where(and(
          eq(properties.cityId, city.id),
          eq(properties.status, 'published' as any),
          eq(properties.featured, 1)
        ))
        .limit(6);

      // 4. Developments in City
      const cityDevelopments = await db
        .select()
        .from(developments)
        .where(and(
          eq(developments.city, city.name),
          eq(developments.isPublished, 1)
        ))
        .limit(4);

      // 5. Aggregate Stats
      const [stats] = await db
        .select({
          totalListings: sql<number>`count(*)`,
          avgPrice: sql<number>`avg(${properties.price})`
        })
        .from(properties)
        .where(and(
          eq(properties.cityId, city.id), 
          eq(properties.status, 'published' as any)
        ));

      return {
        city,
        suburbs: suburbList,
        featuredProperties: featuredProperties.map(p => ({...p, images: typeof p.images === 'string' ? JSON.parse(p.images) : p.images})),
        developments: cityDevelopments,
        stats: {
          totalListings: Number(stats?.totalListings || 0),
          avgPrice: Number(stats?.avgPrice || 0)
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
    const cached = getCached(cacheKey);
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
      setCache(cacheKey, location, STATIC_CONTENT_CACHE_TTL);
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
    let staticContent = getCached(staticCacheKey);
    
    if (!staticContent) {
      staticContent = await this.getLocationByPath(provinceSlug);
      if (staticContent) {
        setCache(staticCacheKey, staticContent, STATIC_CONTENT_CACHE_TTL);
      }
    }
    
    // Get dynamic statistics (cached 5 minutes)
    const dynamicCacheKey = `dynamic:province:${provinceSlug}`;
    let dynamicData = getCached(dynamicCacheKey);
    
    if (!dynamicData) {
      dynamicData = await this.getProvinceData(provinceSlug);
      if (dynamicData) {
        setCache(dynamicCacheKey, dynamicData, DYNAMIC_STATS_CACHE_TTL);
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
    let staticContent = getCached(staticCacheKey);
    
    if (!staticContent) {
      staticContent = await this.getLocationByPath(provinceSlug, citySlug);
      if (staticContent) {
        setCache(staticCacheKey, staticContent, STATIC_CONTENT_CACHE_TTL);
      }
    }
    
    // Get dynamic statistics (cached 5 minutes)
    const dynamicCacheKey = `dynamic:city:${provinceSlug}:${citySlug}`;
    let dynamicData = getCached(dynamicCacheKey);
    
    if (!dynamicData) {
      dynamicData = await this.getCityData(provinceSlug, citySlug);
      if (dynamicData) {
        setCache(dynamicCacheKey, dynamicData, DYNAMIC_STATS_CACHE_TTL);
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
    let staticContent = getCached(staticCacheKey);
    
    if (!staticContent) {
      staticContent = await this.getLocationByPath(provinceSlug, citySlug, suburbSlug);
      if (staticContent) {
        setCache(staticCacheKey, staticContent, STATIC_CONTENT_CACHE_TTL);
      }
    }
    
    // Get dynamic statistics (cached 5 minutes)
    const dynamicCacheKey = `dynamic:suburb:${provinceSlug}:${citySlug}:${suburbSlug}`;
    let dynamicData = getCached(dynamicCacheKey);
    
    if (!dynamicData) {
      dynamicData = await this.getSuburbData(provinceSlug, citySlug, suburbSlug);
      if (dynamicData) {
        setCache(dynamicCacheKey, dynamicData, DYNAMIC_STATS_CACHE_TTL);
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
    keysToInvalidate.forEach(key => {
      cache.delete(key);
      console.log(`[LocationPages] Invalidated cache: ${key}`);
    });
  }
};
