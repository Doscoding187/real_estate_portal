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
} from '../../drizzle/schema';
import { eq, and, desc, sql, like, inArray, count, avg } from 'drizzle-orm';

/**
 * IMPROVED Service for handling location page data aggregation
 * Supporting 3 hierarchical levels: Province -> City -> Suburb
 *
 * This version uses slug columns for better matching and performance
 */
function safeParseImages(value: unknown): string[] {
  if (value == null) return [];

  if (Array.isArray(value)) {
    return value.map(img => (typeof img === 'string' ? img : typeof img === 'object' && img !== null && 'url' in img ? String(img.url) : '')).filter(Boolean);
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(img => (typeof img === 'string' ? img : typeof img === 'object' && img !== null && 'url' in img ? String(img.url) : '')).filter(Boolean);
      }
    } catch {
      console.warn('[LocationPages] Failed to parse images JSON string');
    }
    return [];
  }

  return [];
}

export const locationPagesService = {
  async getPopularCities(limit = 12) {
    const db = await getDb();

    const listingCount = sql<number>`COUNT(${properties.id})`;

    const rows = await db
      .select({
        id: cities.id,
        name: cities.name,
        slug: cities.slug,
        provinceName: provinces.name,
        provinceSlug: provinces.slug,
        listingCount,
      })
      .from(cities)
      .innerJoin(provinces, eq(cities.provinceId, provinces.id))
      .leftJoin(
        properties,
        and(eq(properties.cityId, cities.id), eq(properties.status, 'published')),
      )
      .groupBy(cities.id, cities.name, cities.slug, provinces.name, provinces.slug)
      .orderBy(desc(listingCount), cities.name)
      .limit(limit);

    return rows
      .map(row => ({
        id: row.id,
        name: row.name,
        slug:
          row.slug ||
          row.name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, ''),
        provinceName: row.provinceName,
        provinceSlug:
          row.provinceSlug ||
          row.provinceName
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, ''),
        listingCount: Number(row.listingCount || 0),
      }))
      .filter(row => row.listingCount > 0);
  },

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
      const allProvinces = await db
        .select({ name: provinces.name, slug: provinces.slug })
        .from(provinces);
      console.log(`[LocationPages] Available provinces:`, allProvinces);

      return null;
    }

    console.log(`[LocationPages] Found province: ${province.name} (id: ${province.id})`);

    // Secondary queries wrapped individually so a single failure doesn't kill the whole page
    let cityList: any[] = [];
    let featuredDevelopments: any[] = [];
    let trendingSuburbs: any[] = [];
    let stats: any = {};

    try {
      cityList = await db
        .select({
          id: cities.id,
          name: cities.name,
          slug: cities.slug,
          isMetro: cities.isMetro,
          listingCount: sql<number>`count(${properties.id})`,
          avgPrice: sql<number>`avg(cast(${properties.price} as decimal(12,2)))`,
        })
        .from(cities)
        .leftJoin(
          properties,
          and(eq(properties.cityId, cities.id), eq(properties.status, 'published')),
        )
        .where(eq(cities.provinceId, province.id))
        .groupBy(cities.id)
        .orderBy(desc(sql`count(${properties.id})`))
        .limit(12);
    } catch (error) {
      console.warn('[LocationPages] City list query failed for province, returning empty', error);
    }

    try {
      featuredDevelopments = await db
        .select()
        .from(developments)
        .where(
          and(
            sql`TRIM(LOWER(${developments.province})) = LOWER(${province.name})`,
            eq(developments.isPublished, 1),
          ),
        )
        .limit(6);
    } catch (error) {
      console.warn('[LocationPages] Developments query failed for province, returning empty', error);
    }

    try {
      trendingSuburbs = await db
        .select({
          id: suburbs.id,
          name: suburbs.name,
          slug: suburbs.slug,
          cityName: cities.name,
          citySlug: cities.slug,
          listingCount: sql<number>`count(${properties.id})`,
        })
        .from(suburbs)
        .leftJoin(cities, eq(suburbs.cityId, cities.id))
        .leftJoin(
          properties,
          and(eq(properties.suburbId, suburbs.id), eq(properties.status, 'published')),
        )
        .where(eq(cities.provinceId, province.id))
        .groupBy(suburbs.id, cities.name, cities.slug)
        .orderBy(desc(sql`count(${properties.id})`))
        .limit(10);
    } catch (error) {
      console.warn('[LocationPages] Trending suburbs query failed for province, returning empty', error);
    }

    try {
      [stats] = await db
        .select({
          totalListings: sql<number>`count(*)`,
          avgPrice: sql<number>`avg(${properties.price})`,
        })
        .from(properties)
        .where(and(eq(properties.provinceId, province.id), eq(properties.status, 'published')));
    } catch (error) {
      console.warn('[LocationPages] Stats query failed for province, returning defaults', error);
    }

    return {
      province,
      cities: cityList,
      featuredDevelopments,
      trendingSuburbs,
      stats: {
        totalListings: Number(stats?.totalListings || 0),
        avgPrice: Math.round(Number(stats?.avgPrice || 0)),
      },
    };
  },

  /**
   * Get data for City Page (Level 2)
   */
  async getCityData(provinceSlug: string, citySlug: string) {
    console.log(
      `[LocationPages] getCityData called with: provinceSlug="${provinceSlug}", citySlug="${citySlug}"`,
    );

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
            longitude: cities.longitude,
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
            longitude: cities.longitude,
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
        const allCities = await db
          .select({ name: cities.name, slug: cities.slug })
          .from(cities)
          .limit(10);
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
          avgPrice: sql<number>`(SELECT AVG(${properties.price}) FROM ${properties} WHERE ${properties.suburbId} = ${suburbs.id} AND ${properties.status} = 'published')`,
          avgSalePrice: sql<number>`(SELECT AVG(${properties.price}) FROM ${properties} WHERE ${properties.suburbId} = ${suburbs.id} AND ${properties.status} = 'published' AND ${properties.listingType} = 'sale')`,
          avgRentalPrice: sql<number>`(SELECT AVG(${properties.price}) FROM ${properties} WHERE ${properties.suburbId} = ${suburbs.id} AND ${properties.status} = 'published' AND ${properties.listingType} = 'rent')`,
          propertiesForSale: sql<number>`(SELECT COUNT(*) FROM ${properties} WHERE ${properties.suburbId} = ${suburbs.id} AND ${properties.status} = 'published' AND ${properties.listingType} = 'sale')`,
          propertiesForRent: sql<number>`(SELECT COUNT(*) FROM ${properties} WHERE ${properties.suburbId} = ${suburbs.id} AND ${properties.status} = 'published' AND ${properties.listingType} = 'rent')`,
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
        .where(
          and(
            eq(properties.cityId, city.id),
            eq(properties.status, 'published' as any),
            eq(properties.featured, 1),
          ),
        )
        .limit(6);

      // 4. Developments in City (match by city name, trim whitespace, also include suburb matches)
      // Cascading: show developments where city matches OR suburb is in this city's suburbs
      const cityDevelopments = await db
        .select()
        .from(developments)
        .where(
          and(
            sql`(TRIM(LOWER(${developments.city})) = LOWER(${city.name}) OR TRIM(LOWER(${developments.suburb})) IN (SELECT LOWER(name) FROM suburbs WHERE cityId = ${city.id}))`,
            eq(developments.isPublished, 1),
          ),
        )
        .limit(8);

      // 5. Aggregate Stats (handle empty case gracefully)
      const [stats] = await db
        .select({
          totalListings: sql<number>`count(*)`,
          avgPrice: sql<number>`avg(${properties.price})`,
        })
        .from(properties)
        .where(and(eq(properties.cityId, city.id), eq(properties.status, 'published' as any)));

      // Always return city data, even if no listings exist (show empty state)
      console.log(
        `[LocationPages] Returning city data with ${featuredProperties.length} properties`,
      );

      // 5. Property Type Stats (for PropertyTypeExplorer)
      const propertyTypeStats = await db
        .select({
          type: properties.propertyType,
          count: count(properties.id),
          avgPrice: avg(properties.price),
        })
        .from(properties)
        .where(and(eq(properties.cityId, city.id), eq(properties.status, 'published')))
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
        featuredProperties: (featuredProperties || []).map((p: any) => ({
          ...p,
          images: safeParseImages(p.images),
        })),
        developments: cityDevelopments || [],
        stats: {
          totalListings: Number(stats?.totalListings || 0),
          avgPrice: Number(stats?.avgPrice || 0),
        },
        propertyTypes: propertyTypeStats.map((pt: any) => ({
          type: pt.type,
          count: Number(pt.count),
          avgPrice: Math.round(Number(pt.avgPrice) || 0),
        })),
        // We can just reuse suburbs for TopLocalities if it has the data,
        // but let's ensure it's sorted by volume for "Top" feel
        topLocalities: (suburbList || [])
          .sort((a: any, b: any) => Number(b.listingCount || 0) - Number(a.listingCount || 0))
          .slice(0, 10),
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
    console.log(
      `[LocationPages] getSuburbData called with: provinceSlug="${provinceSlug}", citySlug="${citySlug}", suburbSlug="${suburbSlug}"`,
    );

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
          longitude: suburbs.longitude,
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
          longitude: suburbs.longitude,
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
      const allSuburbs = await db
        .select({ name: suburbs.name, slug: suburbs.slug })
        .from(suburbs)
        .limit(10);
      console.log(`[LocationPages] Sample suburbs:`, allSuburbs);

      return null;
    }

    console.log(`[LocationPages] Found suburb: ${suburb.name} (id: ${suburb.id})`);

    // 2. Listing Stats — wrap in try/catch so schema drift or empty DB doesn't crash the page
    let stats: any = {};
    try {
      [stats] = await db
        .select({
          totalListings: sql<number>`count(*)`,
          avgPrice: sql<number>`avg(${properties.price})`,
          rentalCount: sql<number>`count(CASE WHEN ${properties.listingType} = 'rent' THEN 1 END)`,
          saleCount: sql<number>`count(CASE WHEN ${properties.listingType} = 'sale' THEN 1 END)`,
        })
        .from(properties)
        .where(and(eq(properties.suburbId, suburb.id), eq(properties.status, 'published')));
    } catch (error) {
      console.warn('[LocationPages] Stats query failed for suburb, returning defaults', error);
    }

    // 3. Featured Properties in Suburb — wrap so media parsing or schema mismatch doesn't crash
    let localProperties: any[] = [];
    try {
      localProperties = await db
        .select()
        .from(properties)
        .where(and(eq(properties.suburbId, suburb.id), eq(properties.status, 'published')))
        .orderBy(desc(properties.createdAt))
        .limit(12);
    } catch (error) {
      console.warn('[LocationPages] Properties query failed for suburb, returning empty', error);
    }

    // 4. Market Insights (Price Analytics)
    let analytics: any = null;
    try {
      [analytics] = await db
        .select()
        .from(suburbPriceAnalytics)
        .where(eq(suburbPriceAnalytics.suburbId, suburb.id))
        .limit(1);
    } catch (error) {
      console.warn('[LocationPages] suburbPriceAnalytics query failed, returning null', error);
    }

    // 5. AI Insights & Reviews — wrap import + calls so module failures don't crash
    let insights: any = null;
    let reviews: any[] = [];
    try {
      const { locationInsightsService } = await import('./locationInsightsService');
      insights = await locationInsightsService.getInsights(
        suburb.id,
        suburb.name,
        suburb.cityName,
      );
      reviews = await locationInsightsService.getReviews(suburb.id);
    } catch (error) {
      console.warn('[LocationPages] locationInsightsService failed, returning null insights', error);
    }

    return {
      suburb,
      stats: {
        totalListings: Number(stats?.totalListings || 0),
        avgPrice: Math.round(Number(stats?.avgPrice || 0)),
        rentalCount: Number(stats?.rentalCount || 0),
        saleCount: Number(stats?.saleCount || 0),
      },
      listings: localProperties.map((p: any) => ({
        ...p,
        images: safeParseImages(p.images),
      })),
      analytics: analytics || null,
      insights,
      reviews,
    };
  },
};
