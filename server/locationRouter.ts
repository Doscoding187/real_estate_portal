import { router } from './_core/trpc';
import { publicProcedure, agentProcedure } from './_core/trpc';
import { z } from 'zod';
import { getDb } from './db';
import {
  provinces,
  cities,
  suburbs,
  properties,
  locationSearchCache,
  agentCoverageAreas,
} from '../drizzle/schema';
import { eq, and, or, like, desc, sql, count } from 'drizzle-orm';

/**
 * Location Router - Location intelligence and search functionality
 */
export const locationRouter = router({
  /**
   * Search for locations (provinces, cities, suburbs, addresses)
   */
  searchLocations: publicProcedure
    .input(
      z.object({
        query: z.string().min(1).max(255),
        type: z.enum(['province', 'city', 'suburb', 'address', 'all']).default('all'),
        limit: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      const searchQuery = `%${input.query.toLowerCase()}%`;
      const results: any[] = [];

      // Check cache first
      const cacheKey = `${input.query}_${input.type}_${input.limit}`;
      const [cached] = await db
        .select()
        .from(locationSearchCache)
        .where(
          and(
            eq(locationSearchCache.searchQuery, cacheKey),
            eq(locationSearchCache.searchType, input.type),
            sql`${locationSearchCache.expiresAt} > NOW()`,
          ),
        )
        .limit(1);

      if (cached) {
        return JSON.parse(cached.resultsJSON);
      }

      // Search based on type
      if (input.type === 'province' || input.type === 'all') {
        const provinceResults = await db
          .select({
            id: provinces.id,
            name: provinces.name,
            code: provinces.code,
            type: sql`'province'`,
            latitude: provinces.latitude,
            longitude: provinces.longitude,
          })
          .from(provinces)
          .where(or(like(provinces.name, searchQuery), like(provinces.code, searchQuery)))
          .limit(input.type === 'province' ? input.limit : Math.ceil(input.limit / 3));

        results.push(...provinceResults);
      }

      if (input.type === 'city' || input.type === 'all') {
        const cityResults = await db
          .select({
            id: cities.id,
            name: cities.name,
            provinceName: provinces.name,
            provinceCode: provinces.code,
            type: sql`'city'`,
            latitude: cities.latitude,
            longitude: cities.longitude,
            isMetro: cities.isMetro,
          })
          .from(cities)
          .leftJoin(provinces, eq(cities.provinceId, provinces.id))
          .where(like(cities.name, searchQuery))
          .limit(input.type === 'city' ? input.limit : Math.ceil(input.limit / 3));

        results.push(...cityResults);
      }

      if (input.type === 'suburb' || input.type === 'all') {
        const suburbResults = await db
          .select({
            id: suburbs.id,
            name: suburbs.name,
            cityName: cities.name,
            provinceName: provinces.name,
            provinceCode: provinces.code,
            type: sql`'suburb'`,
            latitude: suburbs.latitude,
            longitude: suburbs.longitude,
            postalCode: suburbs.postalCode,
          })
          .from(suburbs)
          .leftJoin(cities, eq(suburbs.cityId, cities.id))
          .leftJoin(provinces, eq(cities.provinceId, provinces.id))
          .where(like(suburbs.name, searchQuery))
          .limit(input.type === 'suburb' ? input.limit : Math.ceil(input.limit / 3));

        results.push(...suburbResults);
      }

      // Cache results for 1 hour
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      await db.insert(locationSearchCache).values({
        searchQuery: cacheKey,
        searchType: input.type,
        resultsJSON: JSON.stringify(results),
        expiresAt,
      });

      return results;
    }),

  /**
   * Get location hierarchy (provinces with their cities and suburbs)
   */
  getLocationHierarchy: publicProcedure
    .input(
      z.object({
        provinceId: z.number().optional(),
        cityId: z.number().optional(),
        depth: z.enum(['province', 'city', 'suburb', 'full']).default('full'),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();

      if (input.depth === 'province') {
        const provincesList = await db
          .select({
            id: provinces.id,
            name: provinces.name,
            code: provinces.code,
            latitude: provinces.latitude,
            longitude: provinces.longitude,
          })
          .from(provinces)
          .orderBy(provinces.name);

        return provincesList;
      }

      if (input.depth === 'city' && input.provinceId) {
        const citiesList = await db
          .select({
            id: cities.id,
            name: cities.name,
            provinceId: cities.provinceId,
            provinceName: provinces.name,
            latitude: cities.latitude,
            longitude: cities.longitude,
            isMetro: cities.isMetro,
          })
          .from(cities)
          .leftJoin(provinces, eq(cities.provinceId, provinces.id))
          .where(eq(cities.provinceId, input.provinceId))
          .orderBy(cities.name);

        return citiesList;
      }

      if (input.depth === 'suburb' && input.cityId) {
        const suburbsList = await db
          .select({
            id: suburbs.id,
            name: suburbs.name,
            cityId: suburbs.cityId,
            cityName: cities.name,
            provinceName: provinces.name,
            latitude: suburbs.latitude,
            longitude: suburbs.longitude,
            postalCode: suburbs.postalCode,
          })
          .from(suburbs)
          .leftJoin(cities, eq(suburbs.cityId, cities.id))
          .leftJoin(provinces, eq(cities.provinceId, provinces.id))
          .where(eq(suburbs.cityId, input.cityId))
          .orderBy(suburbs.name);

        return suburbsList;
      }

      // Full hierarchy
      const hierarchy = await db
        .select({
          province: {
            id: provinces.id,
            name: provinces.name,
            code: provinces.code,
            latitude: provinces.latitude,
            longitude: provinces.longitude,
          },
          cities: sql<any[]>`JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', ${cities.id},
              'name', ${cities.name},
              'latitude', ${cities.latitude},
              'longitude', ${cities.longitude},
              'isMetro', ${cities.isMetro},
              'suburbs', (
                SELECT JSON_ARRAYAGG(
                  JSON_OBJECT(
                    'id', ${suburbs.id},
                    'name', ${suburbs.name},
                    'latitude', ${suburbs.latitude},
                    'longitude', ${suburbs.longitude},
                    'postalCode', ${suburbs.postalCode}
                  )
                )
                FROM ${suburbs}
                WHERE ${suburbs.cityId} = ${cities.id}
              )
            )
          )`,
        })
        .from(provinces)
        .leftJoin(cities, eq(cities.provinceId, provinces.id))
        .leftJoin(suburbs, eq(suburbs.cityId, cities.id))
        .groupBy(
          provinces.id,
          provinces.name,
          provinces.code,
          provinces.latitude,
          provinces.longitude,
        )
        .orderBy(provinces.name);

      return hierarchy;
    }),

  /**
   * Get properties on map within bounds
   */
  getPropertiesOnMap: publicProcedure
    .input(
      z.object({
        bounds: z.object({
          north: z.number(),
          south: z.number(),
          east: z.number(),
          west: z.number(),
        }),
        filters: z
          .object({
            propertyType: z.array(z.string()).optional(),
            listingType: z.array(z.string()).optional(),
            minPrice: z.number().optional(),
            maxPrice: z.number().optional(),
            bedrooms: z.number().optional(),
            bathrooms: z.number().optional(),
          })
          .optional(),
        limit: z.number().min(1).max(1000).default(100),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();

      const conditions = [
        sql`${properties.latitude} BETWEEN ${input.bounds.south} AND ${input.bounds.north}`,
        sql`${properties.longitude} BETWEEN ${input.bounds.west} AND ${input.bounds.east}`,
        eq(properties.status, 'published'),
      ];

      // Apply filters
      if (input.filters?.propertyType?.length) {
        conditions.push(
          sql`${properties.propertyType} IN (${input.filters.propertyType.map(() => '?').join(',')})`,
        );
      }

      if (input.filters?.listingType?.length) {
        conditions.push(
          sql`${properties.listingType} IN (${input.filters.listingType.map(() => '?').join(',')})`,
        );
      }

      if (input.filters?.minPrice) {
        conditions.push(sql`${properties.price} >= ${input.filters.minPrice}`);
      }

      if (input.filters?.maxPrice) {
        conditions.push(sql`${properties.price} <= ${input.filters.maxPrice}`);
      }

      if (input.filters?.bedrooms) {
        conditions.push(eq(properties.bedrooms, input.filters.bedrooms));
      }

      if (input.filters?.bathrooms) {
        conditions.push(eq(properties.bathrooms, input.filters.bathrooms));
      }

      const propertiesList = await db
        .select({
          id: properties.id,
          title: properties.title,
          price: properties.price,
          propertyType: properties.propertyType,
          listingType: properties.listingType,
          bedrooms: properties.bedrooms,
          bathrooms: properties.bathrooms,
          latitude: properties.latitude,
          longitude: properties.longitude,
          mainImage: properties.mainImage,
          city: properties.city,
          province: properties.province,
        })
        .from(properties)
        .where(and(...conditions))
        .limit(input.limit);

      return propertiesList;
    }),

  /**
   * Reverse geocoding - get address from coordinates
   */
  reverseGeocode: publicProcedure
    .input(
      z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();

      // Find nearest province, city, and suburb
      const nearbyLocations = await db
        .select({
          type: sql`'province'`,
          id: provinces.id,
          name: provinces.name,
          code: provinces.code,
          distance: sql`
            (
              6371 * acos(
                cos(radians(${input.latitude})) * 
                cos(radians(${provinces.latitude})) * 
                cos(radians(${provinces.longitude}) - radians(${input.longitude})) + 
                sin(radians(${input.latitude})) * 
                sin(radians(${provinces.latitude}))
              )
            )
          `,
        })
        .from(provinces)
        .where(and(sql`${provinces.latitude} IS NOT NULL`, sql`${provinces.longitude} IS NOT NULL`))
        .limit(1)
        .orderBy(sql`distance`);

      const [nearestProvince] = nearbyLocations;

      let nearestCity = null;
      let nearestSuburb = null;

      if (nearestProvince) {
        const citiesNearby = await db
          .select({
            id: cities.id,
            name: cities.name,
            distance: sql`
              (
                6371 * acos(
                  cos(radians(${input.latitude})) * 
                  cos(radians(${cities.latitude})) * 
                  cos(radians(${cities.longitude}) - radians(${input.longitude})) + 
                  sin(radians(${input.latitude})) * 
                  sin(radians(${cities.latitude}))
                )
              )
            `,
          })
          .from(cities)
          .where(
            and(
              eq(cities.provinceId, nearestProvince.id),
              sql`${cities.latitude} IS NOT NULL`,
              sql`${cities.longitude} IS NOT NULL`,
            ),
          )
          .limit(1)
          .orderBy(sql`distance`);

        [nearestCity] = citiesNearby;

        if (nearestCity) {
          const suburbsNearby = await db
            .select({
              id: suburbs.id,
              name: suburbs.name,
              postalCode: suburbs.postalCode,
              distance: sql`
                (
                  6371 * acos(
                    cos(radians(${input.latitude})) * 
                    cos(radians(${suburbs.latitude})) * 
                    cos(radians(${suburbs.longitude}) - radians(${input.longitude})) + 
                    sin(radians(${input.latitude})) * 
                    sin(radians(${suburbs.latitude}))
                  )
                )
              `,
            })
            .from(suburbs)
            .where(
              and(
                eq(suburbs.cityId, nearestCity.id),
                sql`${suburbs.latitude} IS NOT NULL`,
                sql`${suburbs.longitude} IS NOT NULL`,
              ),
            )
            .limit(1)
            .orderBy(sql`distance`);

          [nearestSuburb] = suburbsNearby;
        }
      }

      return {
        coordinates: {
          latitude: input.latitude,
          longitude: input.longitude,
        },
        province: nearestProvince,
        city: nearestCity,
        suburb: nearestSuburb,
        formattedAddress: [nearestSuburb?.name, nearestCity?.name, nearestProvince?.name]
          .filter(Boolean)
          .join(', '),
      };
    }),

  /**
   * Get agent coverage areas
   */
  getAgentCoverageAreas: agentProcedure
    .input(
      z.object({
        agentId: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();

      // Get agent record from user if no agentId provided
      let agentId = input.agentId;
      if (!agentId) {
        const { agents } = await import('../drizzle/schema');
        const [agentRecord] = await db
          .select()
          .from(agents)
          .where(eq(agents.userId, ctx.user.id))
          .limit(1);

        if (!agentRecord) {
          throw new Error('Agent profile not found');
        }
        agentId = agentRecord.id;
      }

      const coverageAreas = await db
        .select()
        .from(agentCoverageAreas)
        .where(eq(agentCoverageAreas.agentId, agentId))
        .orderBy(agentCoverageAreas.areaName);

      return coverageAreas;
    }),

  /**
   * Calculate distance between two points
   */
  calculateDistance: publicProcedure
    .input(
      z.object({
        from: z.object({
          latitude: z.number(),
          longitude: z.number(),
        }),
        to: z.object({
          latitude: z.number(),
          longitude: z.number(),
        }),
        unit: z.enum(['km', 'miles']).default('km'),
      }),
    )
    .query(async ({ input }) => {
      const R = input.unit === 'km' ? 6371 : 3959; // Earth's radius in km or miles
      const dLat = ((input.to.latitude - input.from.latitude) * Math.PI) / 180;
      const dLon = ((input.to.longitude - input.from.longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((input.from.latitude * Math.PI) / 180) *
          Math.cos((input.to.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      return {
        distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
        unit: input.unit,
      };
    }),

  /**
   * Get property density heatmap data
   */
  getPropertyHeatmap: publicProcedure
    .input(
      z.object({
        bounds: z.object({
          north: z.number(),
          south: z.number(),
          east: z.number(),
          west: z.number(),
        }),
        gridSize: z.number().min(5).max(50).default(10), // Grid cells per axis
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();

      const latStep = (input.bounds.north - input.bounds.south) / input.gridSize;
      const lngStep = (input.bounds.east - input.bounds.west) / input.gridSize;

      const heatmapData = [];

      for (let i = 0; i < input.gridSize; i++) {
        for (let j = 0; j < input.gridSize; j++) {
          const gridLat = input.bounds.south + i * latStep;
          const gridLng = input.bounds.west + j * lngStep;

          // Count properties in this grid cell
          const [countResult] = await db
            .select({ count: count() })
            .from(properties)
            .where(
              and(
                sql`${properties.latitude} BETWEEN ${gridLat} AND ${gridLat + latStep}`,
                sql`${properties.longitude} BETWEEN ${gridLng} AND ${gridLng + lngStep}`,
                eq(properties.status, 'published'),
              ),
            );

          if (countResult?.count > 0) {
            heatmapData.push({
              latitude: gridLat + latStep / 2,
              longitude: gridLng + lngStep / 2,
              count: countResult.count,
              weight: Math.min(countResult.count / 10, 1), // Normalize to 0-1
            });
          }
        }
      }

      return heatmapData;
    }),
});
