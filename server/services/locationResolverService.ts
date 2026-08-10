/**
 * Location Resolver Service
 *
 * Single source of truth for location resolution.
 * Converts slugs to IDs, validates hierarchy, and provides fallback logic.
 *
 * Usage:
 *   const location = await locationResolver.resolveLocation({
 *     provinceSlug: 'gauteng',
 *     citySlug: 'alberton',
 *   });
 */

import { getDb } from '../db-connection';
import { eq, and, ne, sql } from 'drizzle-orm';
import { provinces, cities, suburbs } from '../../drizzle/schema';
import { parseCanonicalLocationId } from '../../shared/locationAuthority';

export interface ResolvedProvince {
  id: number;
  name: string;
  slug: string;
  code: string;
}

export interface ResolvedCity {
  id: number;
  name: string;
  slug: string;
  provinceId: number;
  latitude?: string;
  longitude?: string;
}

export interface ResolvedSuburb {
  id: number;
  name: string;
  slug: string;
  cityId: number;
  latitude?: string;
  longitude?: string;
}

export interface ResolvedLocation {
  level: 'province' | 'city' | 'suburb';
  province: ResolvedProvince;
  city?: ResolvedCity;
  suburb?: ResolvedSuburb;

  // New user-centric context fields
  confidence: 'exact' | 'expanded' | 'approximate';
  fallbackLevel: 'none' | 'suburb_to_city' | 'city_to_province' | 'suburb_to_province';
  originalIntent: string; // "Sandton", "Sandton, Johannesburg", etc.
}

export type PublicLocationResolutionStatus = 'resolved' | 'unresolved' | 'ambiguous';

export interface PublicLocationResolutionResult {
  status: PublicLocationResolutionStatus;
  location: ResolvedLocation | null;
  message?: string;
}

export class LocationResolverService {
  /**
   * Resolve public search geography without the SEO resolver's widening
   * fallbacks. A public search must never turn an unknown suburb into a city
   * or an ambiguous city into a province-wide search.
   */
  async resolvePublicLocation(opts: {
    locationId?: string;
    provinceSlug?: string;
    citySlug?: string;
    suburbSlug?: string;
  }): Promise<PublicLocationResolutionResult> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const normalize = (value?: string) =>
      String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-');
    const provinceSlug = normalize(opts.provinceSlug);
    const citySlug = normalize(opts.citySlug);
    const suburbSlug = normalize(opts.suburbSlug);
    const originalIntent = [suburbSlug, citySlug, provinceSlug].filter(Boolean).join(', ');

    const unresolved = (message: string): PublicLocationResolutionResult => ({
      status: 'unresolved',
      location: null,
      message,
    });
    const ambiguous = (message: string): PublicLocationResolutionResult => ({
      status: 'ambiguous',
      location: null,
      message,
    });

    const findProvinceById = async (id: number) => {
      const [row] = await db
        .select({ id: provinces.id, name: provinces.name, slug: provinces.slug, code: provinces.code })
        .from(provinces)
        .where(and(eq(provinces.id, id), ne(provinces.status, 'retired')))
        .limit(1);
      return row
        ? {
            id: row.id,
            name: row.name,
            slug: row.slug || normalize(row.name),
            code: row.code,
          }
        : null;
    };

    const findProvinceBySlug = async (slug: string) => {
      const [row] = await db
        .select({ id: provinces.id, name: provinces.name, slug: provinces.slug, code: provinces.code })
        .from(provinces)
        .where(and(sql`LOWER(${provinces.slug}) = LOWER(${slug})`, ne(provinces.status, 'retired')))
        .limit(1);
      return row
        ? {
            id: row.id,
            name: row.name,
            slug: row.slug || slug,
            code: row.code,
          }
        : null;
    };

    const findCityById = async (id: number) => {
      const [row] = await db
        .select({
          id: cities.id,
          name: cities.name,
          slug: cities.slug,
          provinceId: cities.provinceId,
          latitude: cities.latitude,
          longitude: cities.longitude,
        })
        .from(cities)
        .where(and(eq(cities.id, id), ne(cities.status, 'retired')))
        .limit(1);
      return row
        ? {
            id: row.id,
            name: row.name,
            slug: row.slug || normalize(row.name),
            provinceId: row.provinceId,
            latitude: row.latitude || undefined,
            longitude: row.longitude || undefined,
          }
        : null;
    };

    const findCityBySlug = async (slug: string, provinceId?: number) => {
      const rows = await db
        .select({
          id: cities.id,
          name: cities.name,
          slug: cities.slug,
          provinceId: cities.provinceId,
          latitude: cities.latitude,
          longitude: cities.longitude,
        })
        .from(cities)
        .where(
          provinceId
            ? and(
                sql`LOWER(${cities.slug}) = LOWER(${slug})`,
                eq(cities.provinceId, provinceId),
                ne(cities.status, 'retired'),
              )
            : and(sql`LOWER(${cities.slug}) = LOWER(${slug})`, ne(cities.status, 'retired')),
        )
        .limit(2);

      if (rows.length > 1) return 'ambiguous' as const;
      const row = rows[0];
      return row
        ? {
            id: row.id,
            name: row.name,
            slug: row.slug || slug,
            provinceId: row.provinceId,
            latitude: row.latitude || undefined,
            longitude: row.longitude || undefined,
          }
        : null;
    };

    const findSuburbById = async (id: number) => {
      const [row] = await db
        .select({
          id: suburbs.id,
          name: suburbs.name,
          slug: suburbs.slug,
          cityId: suburbs.cityId,
          latitude: suburbs.latitude,
          longitude: suburbs.longitude,
        })
        .from(suburbs)
        .where(and(eq(suburbs.id, id), ne(suburbs.status, 'retired')))
        .limit(1);
      return row
        ? {
            id: row.id,
            name: row.name,
            slug: row.slug || normalize(row.name),
            cityId: row.cityId,
            latitude: row.latitude || undefined,
            longitude: row.longitude || undefined,
          }
        : null;
    };

    const findSuburbBySlug = async (slug: string, cityId?: number, provinceId?: number) => {
      const suburbConditions = [
        sql`LOWER(${suburbs.slug}) = LOWER(${slug})`,
        ne(suburbs.status, 'retired'),
        ne(cities.status, 'retired'),
      ];
      if (cityId) suburbConditions.push(eq(suburbs.cityId, cityId));
      if (provinceId) suburbConditions.push(eq(cities.provinceId, provinceId));

      const rows = await db
        .select({
          id: suburbs.id,
          name: suburbs.name,
          slug: suburbs.slug,
          cityId: suburbs.cityId,
          latitude: suburbs.latitude,
          longitude: suburbs.longitude,
        })
        .from(suburbs)
        .innerJoin(cities, eq(suburbs.cityId, cities.id))
        .where(and(...suburbConditions))
        .limit(2);

      if (rows.length > 1) return 'ambiguous' as const;
      const row = rows[0];
      return row
        ? {
            id: row.id,
            name: row.name,
            slug: row.slug || slug,
            cityId: row.cityId,
            latitude: row.latitude || undefined,
            longitude: row.longitude || undefined,
          }
        : null;
    };

    let province: ResolvedProvince | null = null;
    let city: ResolvedCity | null = null;
    let suburb: ResolvedSuburb | null = null;
    const canonicalId = parseCanonicalLocationId(opts.locationId);

    if (opts.locationId && !canonicalId) {
      return unresolved('The selected location does not match its canonical identity.');
    }

    if (canonicalId?.level === 'province') {
      province = await findProvinceById(canonicalId.id);
      if (!province) return unresolved('That province is no longer available.');
    } else if (canonicalId?.level === 'city') {
      city = await findCityById(canonicalId.id);
      if (!city) return unresolved('That city is no longer available.');
      province = await findProvinceById(city.provinceId);
      if (!province) return unresolved('That city has no valid province authority.');
    } else if (canonicalId?.level === 'suburb') {
      suburb = await findSuburbById(canonicalId.id);
      if (!suburb) return unresolved('That suburb is no longer available.');
      city = await findCityById(suburb.cityId);
      if (!city) return unresolved('That suburb has no valid city authority.');
      province = await findProvinceById(city.provinceId);
      if (!province) return unresolved('That suburb has no valid province authority.');
    } else if (provinceSlug) {
      province = await findProvinceBySlug(provinceSlug);
      if (!province) return unresolved(`We could not match the province "${provinceSlug}".`);

      if (citySlug) {
        const cityResult = await findCityBySlug(citySlug, province.id);
        if (cityResult === 'ambiguous') {
          return ambiguous(`The city "${citySlug}" needs a more specific location.`);
        }
        city = cityResult;
        if (!city) return unresolved(`We could not match "${citySlug}" in ${province.name}.`);
      }
    } else if (citySlug) {
      const cityResult = await findCityBySlug(citySlug);
      if (cityResult === 'ambiguous') {
        return ambiguous(`The city "${citySlug}" exists in more than one province. Choose a province.`);
      }
      city = cityResult;
      if (!city) return unresolved(`We could not match the city "${citySlug}".`);
      province = await findProvinceById(city.provinceId);
      if (!province) return unresolved('That city has no valid province authority.');
    }

    if (!province && suburbSlug) {
      const suburbResult = await findSuburbBySlug(suburbSlug);
      if (suburbResult === 'ambiguous') {
        return ambiguous(`The suburb "${suburbSlug}" needs a city or province.`);
      }
      suburb = suburbResult;
      if (!suburb) return unresolved(`We could not match the suburb "${suburbSlug}".`);
      city = await findCityById(suburb.cityId);
      if (!city) return unresolved('That suburb has no valid city authority.');
      province = await findProvinceById(city.provinceId);
      if (!province) return unresolved('That suburb has no valid province authority.');
    } else if (province && suburbSlug) {
      const suburbResult = await findSuburbBySlug(suburbSlug, city?.id, province.id);
      if (suburbResult === 'ambiguous') {
        return ambiguous(`The suburb "${suburbSlug}" needs a more specific city.`);
      }
      suburb = suburbResult;
      if (!suburb) return unresolved(`We could not match "${suburbSlug}" in this location.`);
      if (!city) {
        city = await findCityById(suburb.cityId);
        if (!city) return unresolved('That suburb has no valid city authority.');
      }
    }

    if (!province) {
      return unresolved('Choose a supported province, city, or suburb before searching.');
    }

    if (provinceSlug && normalize(provinceSlug) !== normalize(province.slug)) {
      return unresolved('The selected province does not match its canonical authority.');
    }
    if (citySlug && (!city || normalize(citySlug) !== normalize(city.slug))) {
      return unresolved('The selected city does not match its canonical authority.');
    }
    if (suburbSlug && (!suburb || normalize(suburbSlug) !== normalize(suburb.slug))) {
      return unresolved('The selected location does not match its canonical hierarchy.');
    }

    return {
      status: 'resolved',
      location: {
        level: suburb ? 'suburb' : city ? 'city' : 'province',
        province,
        city: city || undefined,
        suburb: suburb || undefined,
        confidence: 'exact',
        fallbackLevel: 'none',
        originalIntent:
          originalIntent || [suburb?.slug, city?.slug, province.slug].filter(Boolean).join(', '),
      },
    };
  }

  /**
   * Resolve location slugs to full location data with IDs
   * Returns null if no valid location found
   */
  async resolveLocation(opts: {
    provinceSlug?: string;
    citySlug?: string;
    suburbSlug?: string;
  }): Promise<ResolvedLocation | null> {
    const db = await getDb();
    if (!db) return null;

    const { provinceSlug, citySlug, suburbSlug } = opts;

    // Must have at least province
    if (!provinceSlug) return null;

    // Construct original intent for display/debugging
    const parts: string[] = [];
    if (suburbSlug) parts.push(suburbSlug);
    if (citySlug) parts.push(citySlug);
    if (provinceSlug) parts.push(provinceSlug);
    const originalIntent = parts.join(', ');

    // Resolve province (case-insensitive)
    const provinceResult = await db
      .select({
        id: provinces.id,
        name: provinces.name,
        slug: provinces.slug,
        code: provinces.code,
      })
      .from(provinces)
      .where(sql`LOWER(${provinces.slug}) = LOWER(${provinceSlug})`)
      .limit(1);

    if (provinceResult.length === 0) {
      console.warn(`[LocationResolver] Province not found: ${provinceSlug}`);
      return null;
    }

    const province: ResolvedProvince = {
      id: provinceResult[0].id,
      name: provinceResult[0].name,
      slug: provinceResult[0].slug || provinceSlug,
      code: provinceResult[0].code,
    };

    // Province only
    if (!citySlug) {
      return {
        level: 'province',
        province,
        confidence: 'exact',
        fallbackLevel: 'none',
        originalIntent,
      };
    }

    // Resolve city (must belong to this province, case-insensitive)
    const cityResult = await db
      .select({
        id: cities.id,
        name: cities.name,
        slug: cities.slug,
        provinceId: cities.provinceId,
        latitude: cities.latitude,
        longitude: cities.longitude,
      })
      .from(cities)
      .where(
        and(sql`LOWER(${cities.slug}) = LOWER(${citySlug})`, eq(cities.provinceId, province.id)),
      )
      .limit(1);

    if (cityResult.length === 0) {
      // City not found, fallback to province level
      console.warn(
        `[LocationResolver] City not found: ${citySlug} in ${provinceSlug}, falling back to province`,
      );
      return {
        level: 'province',
        province,
        confidence: 'expanded',
        fallbackLevel: 'city_to_province',
        originalIntent,
      };
    }

    const city: ResolvedCity = {
      id: cityResult[0].id,
      name: cityResult[0].name,
      slug: cityResult[0].slug || citySlug,
      provinceId: cityResult[0].provinceId,
      latitude: cityResult[0].latitude || undefined,
      longitude: cityResult[0].longitude || undefined,
    };

    // City only (no suburb)
    if (!suburbSlug) {
      return {
        level: 'city',
        province,
        city,
        confidence: 'exact',
        fallbackLevel: 'none',
        originalIntent,
      };
    }

    // Resolve suburb (must belong to this city, case-insensitive)
    const suburbResult = await db
      .select({
        id: suburbs.id,
        name: suburbs.name,
        slug: suburbs.slug,
        cityId: suburbs.cityId,
        latitude: suburbs.latitude,
        longitude: suburbs.longitude,
      })
      .from(suburbs)
      .where(and(sql`LOWER(${suburbs.slug}) = LOWER(${suburbSlug})`, eq(suburbs.cityId, city.id)))
      .limit(1);

    if (suburbResult.length === 0) {
      // Suburb not found, fallback to city level
      console.warn(
        `[LocationResolver] Suburb not found: ${suburbSlug} in ${citySlug}, falling back to city`,
      );
      return {
        level: 'city',
        province,
        city,
        confidence: 'expanded',
        fallbackLevel: 'suburb_to_city',
        originalIntent,
      };
    }

    const suburb: ResolvedSuburb = {
      id: suburbResult[0].id,
      name: suburbResult[0].name,
      slug: suburbResult[0].slug || suburbSlug,
      cityId: suburbResult[0].cityId,
      latitude: suburbResult[0].latitude || undefined,
      longitude: suburbResult[0].longitude || undefined,
    };

    return {
      level: 'suburb',
      province,
      city,
      suburb,
      confidence: 'exact',
      fallbackLevel: 'none',
      originalIntent,
    };
  }

  /**
   * Validate that a location hierarchy is valid
   * Returns true if the hierarchy is correct
   */
  async validateHierarchy(
    provinceSlug: string,
    citySlug?: string,
    suburbSlug?: string,
  ): Promise<boolean> {
    const location = await this.resolveLocation({
      provinceSlug,
      citySlug,
      suburbSlug,
    });

    if (!location) return false;

    // If city was requested, it must be present
    if (citySlug && !location.city) return false;

    // If suburb was requested, it must be present
    if (suburbSlug && !location.suburb) return false;

    return true;
  }

  /**
   * Get location IDs for property queries
   * Returns an object with the available IDs
   */
  async getLocationIds(opts: {
    provinceSlug?: string;
    citySlug?: string;
    suburbSlug?: string;
  }): Promise<{
    provinceId?: number;
    cityId?: number;
    suburbId?: number;
  }> {
    const location = await this.resolveLocation(opts);

    if (!location) return {};

    return {
      provinceId: location.province.id,
      cityId: location.city?.id,
      suburbId: location.suburb?.id,
    };
  }

  /**
   * Get all cities in a province
   */
  async getCitiesInProvince(provinceSlug: string): Promise<ResolvedCity[]> {
    const db = await getDb();
    if (!db) return [];

    const location = await this.resolveLocation({ provinceSlug });
    if (!location) return [];

    const result = await db
      .select({
        id: cities.id,
        name: cities.name,
        slug: cities.slug,
        provinceId: cities.provinceId,
        latitude: cities.latitude,
        longitude: cities.longitude,
      })
      .from(cities)
      .where(eq(cities.provinceId, location.province.id))
      .orderBy(cities.name);

    return result.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug || '',
      provinceId: c.provinceId,
      latitude: c.latitude || undefined,
      longitude: c.longitude || undefined,
    }));
  }

  /**
   * Get all suburbs in a city
   */
  async getSuburbsInCity(provinceSlug: string, citySlug: string): Promise<ResolvedSuburb[]> {
    const db = await getDb();
    if (!db) return [];

    const location = await this.resolveLocation({ provinceSlug, citySlug });
    if (!location?.city) return [];

    const result = await db
      .select({
        id: suburbs.id,
        name: suburbs.name,
        slug: suburbs.slug,
        cityId: suburbs.cityId,
        latitude: suburbs.latitude,
        longitude: suburbs.longitude,
      })
      .from(suburbs)
      .where(eq(suburbs.cityId, location.city.id))
      .orderBy(suburbs.name);

    return result.map(s => ({
      id: s.id,
      name: s.name,
      slug: s.slug || '',
      cityId: s.cityId,
      latitude: s.latitude || undefined,
      longitude: s.longitude || undefined,
    }));
  }

  /**
   * Create a new suburb if it doesn't exist
   * Returns the suburb ID (existing or newly created)
   */
  async ensureSuburbExists(opts: {
    provinceSlug: string;
    citySlug: string;
    suburbName: string;
    suburbSlug?: string;
    latitude?: string;
    longitude?: string;
  }): Promise<number | null> {
    const db = await getDb();
    if (!db) return null;

    const { provinceSlug, citySlug, suburbName, suburbSlug, latitude, longitude } = opts;
    const slug = suburbSlug || this.slugify(suburbName);

    // First try to resolve existing suburb
    const location = await this.resolveLocation({
      provinceSlug,
      citySlug,
      suburbSlug: slug,
    });

    if (location?.suburb) {
      return location.suburb.id;
    }

    // Need to create suburb - first verify city exists
    if (!location?.city) {
      console.error(`[LocationResolver] Cannot create suburb: city not found (${citySlug})`);
      return null;
    }

    // Insert new suburb
    try {
      const result = await db.insert(suburbs).values({
        cityId: location.city.id,
        name: suburbName,
        slug,
        latitude: latitude || null,
        longitude: longitude || null,
      });

      console.log(`[LocationResolver] Created suburb: ${suburbName} (${slug})`);
      return Number(result[0].insertId);
    } catch (error) {
      console.error(`[LocationResolver] Failed to create suburb:`, error);
      return null;
    }
  }

  /**
   * Slugify a location name
   */
  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

// Export singleton instance
export const locationResolver = new LocationResolverService();
