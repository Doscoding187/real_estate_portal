import { getDb } from '../db';
import { 
  provinces, 
  cities, 
  suburbs, 
  properties, 
  developments,
  priceAnalytics,
  suburbPriceAnalytics,
  amenities
} from '../../drizzle/schema';
import { eq, and, desc, sql, like, inArray, count, avg } from 'drizzle-orm';

/**
 * IMPROVED Service for handling location page data aggregation
 * Supporting 3 hierarchical levels: Province -> City -> Suburb
 * 
 * This version uses slug columns for better matching and performance
 */
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

      // 5. Aggregate Stats (handle empty case gracefully)
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

      // Always return city data, even if no listings exist (show empty state)
      console.log(`[LocationPages] Returning city data with ${featuredProperties.length} properties`);
      
      // 5. Property Type Stats (for PropertyTypeExplorer)
    const propertyTypeStats = await db
      .select({
        type: properties.propertyType,
        count: count(properties.id),
        avgPrice: avg(properties.price)
      })
      .from(properties)
      .where(and(
        eq(properties.cityId, city.id),
        eq(properties.status, 'published')
      ))
      .groupBy(properties.propertyType);

    // 6. Top Localities (Suburbs) by demand/inventory (for LocationTopLocalities)
    // We'll use the suburbList we already fetched, but maybe we need more stats if not present
    // The suburbList query (see above in file, assumed existing) might need enhancement or we just process it.
    // Let's assume suburbList is list of suburbs. We want to sort them by listing count or similar.
    // The previous 'suburbList' query (lines 90-110 approx) likely joins with listings count.
    // Let's verify existing suburbs query first. If it has counts, we are good.
    
    return {
      city,
      suburbs: suburbList || [],
      featuredProperties: (featuredProperties || []).map(p => ({
        ...p, 
        images: typeof p.images === 'string' ? JSON.parse(p.images) : p.images
      })),
      developments: cityDevelopments || [],
      stats: {
        totalListings: Number(stats?.totalListings || 0),
        avgPrice: Number(stats?.avgPrice || 0)
      },
      propertyTypes: propertyTypeStats.map(pt => ({
        type: pt.type,
        count: Number(pt.count),
        avgPrice: Math.round(Number(pt.avgPrice) || 0)
      })),
      // We can just reuse suburbs for TopLocalities if it has the data, 
      // but let's ensure it's sorted by volume for "Top" feel
      topLocalities: (suburbList || [])
        .sort((a: any, b: any) => (Number(b.listingCount || 0) - Number(a.listingCount || 0)))
        .slice(0, 10)
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
  }
};
