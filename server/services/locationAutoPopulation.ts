/**
 * Location Auto-Population Service
 *
 * Automatically creates city and suburb records from Google Places data
 * when properties are added to the system.
 *
 * This eliminates the need to manually seed thousands of locations.
 */

import { getDb } from '../db';
import { provinces, cities, suburbs } from '../../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

interface GooglePlaceComponents {
  locality?: string; // City
  sublocality?: string; // Suburb/neighborhood
  administrative_area_level_1?: string; // Province
  administrative_area_level_2?: string; // District/Municipality
  postal_code?: string;
}

interface LocationData {
  placeId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  components: GooglePlaceComponents;
}

/**
 * Auto-create location hierarchy from Google Places data
 * Returns: { provinceId, cityId, suburbId }
 */
export async function autoCreateLocationHierarchy(locationData: LocationData) {
  console.log('[AutoLocation] Processing:', locationData.formattedAddress);

  const db = await getDb();
  const { components, latitude, longitude, placeId } = locationData;

  // 1. Find or identify province
  let provinceId: number | null = null;
  const provinceName = components.administrative_area_level_1;

  if (provinceName) {
    console.log('[AutoLocation] Looking for province:', provinceName);

    const [existingProvince] = await db
      .select()
      .from(provinces)
      .where(sql`LOWER(${provinces.name}) LIKE LOWER(${`%${provinceName}%`})`)
      .limit(1);

    if (existingProvince) {
      provinceId = existingProvince.id;
      console.log('[AutoLocation] Province found:', existingProvince.name, `(id: ${provinceId})`);
    } else {
      console.warn('[AutoLocation] Province not found for:', provinceName);
    }
  }

  // 2. Find or create city
  let cityId: number | null = null;
  const cityName = components.locality || components.administrative_area_level_2;

  if (cityName && provinceId) {
    console.log('[AutoLocation] Looking for city:', cityName);

    // Check if city exists
    const [existingCity] = await db
      .select()
      .from(cities)
      .where(
        and(eq(cities.provinceId, provinceId), sql`LOWER(${cities.name}) = LOWER(${cityName})`),
      )
      .limit(1);

    if (existingCity) {
      cityId = existingCity.id;
      console.log('[AutoLocation] City found:', existingCity.name, `(id: ${cityId})`);
    } else {
      // Auto-create city
      console.log('[AutoLocation] Auto-creating city:', cityName);

      const citySlug = cityName.toLowerCase().replace(/\s+/g, '-');

      const [result] = await db.insert(cities).values({
        provinceId,
        name: cityName,
        slug: citySlug,
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        isMetro: 0,
      });

      cityId = result.insertId;
      console.log('[AutoLocation] ✅ City created:', cityName, `(id: ${cityId})`);
    }
  }

  // 3. Find or create suburb
  let suburbId: number | null = null;
  const suburbName = components.sublocality;

  if (suburbName && cityId) {
    console.log('[AutoLocation] Looking for suburb:', suburbName);

    // Check if suburb exists
    const [existingSuburb] = await db
      .select()
      .from(suburbs)
      .where(and(eq(suburbs.cityId, cityId), sql`LOWER(${suburbs.name}) = LOWER(${suburbName})`))
      .limit(1);

    if (existingSuburb) {
      suburbId = existingSuburb.id;
      console.log('[AutoLocation] Suburb found:', existingSuburb.name, `(id: ${suburbId})`);
    } else {
      // Auto-create suburb
      console.log('[AutoLocation] Auto-creating suburb:', suburbName);

      const suburbSlug = suburbName.toLowerCase().replace(/\s+/g, '-');

      const [result] = await db.insert(suburbs).values({
        cityId,
        name: suburbName,
        slug: suburbSlug,
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        postalCode: components.postal_code || null,
      });

      suburbId = result.insertId;
      console.log('[AutoLocation] ✅ Suburb created:', suburbName, `(id: ${suburbId})`);
    }
  }

  console.log('[AutoLocation] Result:', { provinceId, cityId, suburbId });

  return {
    provinceId,
    cityId,
    suburbId,
  };
}

/**
 * Extract components from Google Places address_components array
 */
export function extractPlaceComponents(
  addressComponents: google.maps.GeocoderAddressComponent[],
): GooglePlaceComponents {
  const components: GooglePlaceComponents = {};

  for (const component of addressComponents) {
    const types = component.types;

    if (types.includes('locality')) {
      components.locality = component.long_name;
    }
    if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
      components.sublocality = component.long_name;
    }
    if (types.includes('administrative_area_level_1')) {
      components.administrative_area_level_1 = component.long_name;
    }
    if (types.includes('administrative_area_level_2')) {
      components.administrative_area_level_2 = component.long_name;
    }
    if (types.includes('postal_code')) {
      components.postal_code = component.long_name;
    }
  }

  return components;
}
