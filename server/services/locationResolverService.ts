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

import { db, getDb } from '../db';
import { eq, and, sql } from 'drizzle-orm';
import { provinces, cities, suburbs } from '../../drizzle/schema';

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
}

export class LocationResolverService {
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
      return { level: 'province', province };
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
        and(
          sql`LOWER(${cities.slug}) = LOWER(${citySlug})`,
          eq(cities.provinceId, province.id)
        )
      )
      .limit(1);

    if (cityResult.length === 0) {
      // City not found, fallback to province level
      console.warn(`[LocationResolver] City not found: ${citySlug} in ${provinceSlug}, falling back to province`);
      return { level: 'province', province };
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
      return { level: 'city', province, city };
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
      .where(
        and(
          sql`LOWER(${suburbs.slug}) = LOWER(${suburbSlug})`,
          eq(suburbs.cityId, city.id)
        )
      )
      .limit(1);

    if (suburbResult.length === 0) {
      // Suburb not found, fallback to city level
      console.warn(`[LocationResolver] Suburb not found: ${suburbSlug} in ${citySlug}, falling back to city`);
      return { level: 'city', province, city };
    }

    const suburb: ResolvedSuburb = {
      id: suburbResult[0].id,
      name: suburbResult[0].name,
      slug: suburbResult[0].slug || suburbSlug,
      cityId: suburbResult[0].cityId,
      latitude: suburbResult[0].latitude || undefined,
      longitude: suburbResult[0].longitude || undefined,
    };

    return { level: 'suburb', province, city, suburb };
  }

  /**
   * Validate that a location hierarchy is valid
   * Returns true if the hierarchy is correct
   */
  async validateHierarchy(
    provinceSlug: string,
    citySlug?: string,
    suburbSlug?: string
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
