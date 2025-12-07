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
import { eq, and, desc, sql, like, inArray } from 'drizzle-orm';

/**
 * Service for handling location page data aggregation
 * Supporting 3 hierarchical levels: Province -> City -> Suburb
 */
export const locationPagesService = {
  
  /**
   * Get data for Province Page (Level 1)
   */
  async getProvinceData(provinceSlug: string) {
    const db = await getDb();
    
    // 1. Get Province Details
    const [province] = await db
      .select()
      .from(provinces)
      .where(eq(sql`LOWER(${provinces.name})`, provinceSlug.replace(/-/g, ' '))) // robust approximation for slug
      .limit(1);

    if (!province) return null;

    // 2. Get Child Cities (Top 12 by listing count or default)
    // Note: Assuming we want cities in this province
    const cityList = await db
      .select({
        id: cities.id,
        name: cities.name,
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

    // 4. Trending Suburbs (Top 10 by search volume or price growth - using listing count as proxy for now if analytics missing)
    const trendingSuburbs = await db
      .select({
        id: suburbs.id,
        name: suburbs.name,
        cityName: cities.name,
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
    try {
      const db = await getDb();
      const cleanCityName = citySlug.replace(/-/g, ' ');
      
      console.log(`[LocationService] getCityData called with: provinceSlug=${provinceSlug}, citySlug=${citySlug}, cleanCityName=${cleanCityName}`);

      // 1. Get City Details
      const [city] = await db
        .select({
          id: cities.id,
          name: cities.name,
          provinceId: cities.provinceId,
          provinceName: provinces.name,
          isMetro: cities.isMetro,
          latitude: cities.latitude,
          longitude: cities.longitude
        })
        .from(cities)
        .leftJoin(provinces, eq(cities.provinceId, provinces.id))
        .where(eq(sql`LOWER(${cities.name})`, cleanCityName))
        .limit(1);

      console.log(`[LocationService] City query result:`, city);

      if (!city) {
          console.log(`[LocationService] City not found for ${cleanCityName}`);
          return null;
      }

      // 2. Popular Suburbs in City
      console.log(`[LocationService] Fetching suburbs for cityId: ${city.id}`);
      
      const listingCountSql = sql<number>`(SELECT COUNT(*) FROM ${properties} WHERE ${properties.suburbId} = ${suburbs.id} AND ${properties.status} = 'published')`;
      
      const suburbList = await db
        .select({
          id: suburbs.id,
          name: suburbs.name,
          listingCount: listingCountSql,
          avgPrice: sql<number>`(SELECT AVG(${properties.price}) FROM ${properties} WHERE ${properties.suburbId} = ${suburbs.id} AND ${properties.status} = 'published')`
        })
        .from(suburbs)
        .where(eq(suburbs.cityId, city.id))
        .orderBy(desc(listingCountSql))
        .limit(12);
      
      console.log(`[LocationService] Suburb list fetched: ${suburbList?.length} items`);

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
      // Use SQL helpers to avoid raw string issues
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
      console.error('[LocationService] Error in getCityData:', error);
      throw error;
    }
  },

  /**
   * Get data for Suburb Page (Level 3)
   */
  async getSuburbData(provinceSlug: string, citySlug: string, suburbSlug: string) {
    const db = await getDb();
    const cleanSuburbName = suburbSlug.replace(/-/g, ' ');

    // 1. Get Suburb Details joined with City and Province
    const [suburb] = await db
      .select({
        id: suburbs.id,
        name: suburbs.name,
        cityId: suburbs.cityId,
        cityName: cities.name,
        provinceName: provinces.name,
        latitude: suburbs.latitude,
        longitude: suburbs.longitude
      })
      .from(suburbs)
      .leftJoin(cities, eq(suburbs.cityId, cities.id))
      .leftJoin(provinces, eq(cities.provinceId, provinces.id))
      .where(eq(sql`LOWER(${suburbs.name})`, cleanSuburbName))
      .limit(1);

    if (!suburb) return null;

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
    // Try to get from cached table first
    const [analytics] = await db
      .select()
      .from(suburbPriceAnalytics)
      .where(eq(suburbPriceAnalytics.suburbId, suburb.id))
      .limit(1);

    // 5. Nearby Schools/Amenities (if we have an amenities table linked to location or coords via geo-query)
    // Placeholder for now as amenities table structure is simple
    
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
