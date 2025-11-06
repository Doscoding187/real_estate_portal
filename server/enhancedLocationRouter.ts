import { router, publicProcedure, protectedProcedure, agentProcedure } from './_core/trpc';
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
import { eq, and, or, like, desc, sql, count, inArray } from 'drizzle-orm';

/**
 * Enhanced Location Router - Advanced Property Discovery & Location Intelligence
 * Builds on existing locationRouter with advanced geospatial features
 */
export const enhancedLocationRouter = router({
  /**
   * Advanced property search with multiple criteria
   */
  advancedPropertySearch: publicProcedure
    .input(
      z.object({
        // Location criteria
        location: z
          .object({
            type: z.enum(['province', 'city', 'suburb', 'coordinates']),
            value: z.string(), // Name or coordinates "lat,lng"
            radius: z.number().min(0.1).max(100).default(10), // km
          })
          .optional(),

        // Property filters
        filters: z
          .object({
            propertyType: z.array(z.string()).optional(),
            listingType: z.array(z.string()).optional(),
            minPrice: z.number().optional(),
            maxPrice: z.number().optional(),
            bedrooms: z
              .object({
                min: z.number().optional(),
                max: z.number().optional(),
              })
              .optional(),
            bathrooms: z
              .object({
                min: z.number().optional(),
                max: z.number().optional(),
              })
              .optional(),
            minArea: z.number().optional(),
            maxArea: z.number().optional(),
            amenities: z.array(z.string()).optional(),
          })
          .optional(),

        // Nearby amenities
        amenities: z
          .object({
            schools: z
              .object({
                enabled: z.boolean().default(false),
                maxDistance: z.number().min(0.1).max(10).default(2), // km
              })
              .optional(),
            hospitals: z
              .object({
                enabled: z.boolean().default(false),
                maxDistance: z.number().min(0.1).max(10).default(5),
              })
              .optional(),
            transport: z
              .object({
                enabled: z.boolean().default(false),
                maxDistance: z.number().min(0.1).max(5).default(1),
              })
              .optional(),
            shopping: z
              .object({
                enabled: z.boolean().default(false),
                maxDistance: z.number().min(0.1).max(10).default(2),
              })
              .optional(),
          })
          .optional(),

        // Pagination and sorting
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        sortBy: z.enum(['price', 'distance', 'newest', 'area']).default('newest'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),

        // Map bounds for spatial filtering
        bounds: z
          .object({
            north: z.number(),
            south: z.number(),
            east: z.number(),
            west: z.number(),
          })
          .optional(),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();

      // Build WHERE conditions
      const conditions = [eq(properties.status, 'published')];

      // Location-based filtering
      if (input.location) {
        if (input.location.type === 'province') {
          // Filter by province name or ID
          const [province] = await db
            .select({ id: provinces.id })
            .from(provinces)
            .where(like(provinces.name, `%${input.location.value}%`))
            .limit(1);

          if (province) {
            conditions.push(eq(properties.provinceId, province.id));
          }
        } else if (input.location.type === 'city') {
          // Filter by city
          const [city] = await db
            .select({ id: cities.id })
            .from(cities)
            .where(like(cities.name, `%${input.location.value}%`))
            .limit(1);

          if (city) {
            conditions.push(eq(properties.cityId, city.id));
          }
        } else if (input.location.type === 'suburb') {
          // Filter by suburb
          const [suburb] = await db
            .select({ id: suburbs.id })
            .from(suburbs)
            .where(like(suburbs.name, `%${input.location.value}%`))
            .limit(1);

          if (suburb) {
            conditions.push(eq(properties.suburbId, suburb.id));
          }
        } else if (input.location.type === 'coordinates') {
          // Radius search around coordinates
          const [lat, lng] = input.location.value.split(',').map(Number);
          if (!isNaN(lat) && !isNaN(lng)) {
            // Use Haversine formula for radius search
            const radiusKm = input.location.radius;
            conditions.push(
              sql`(
                6371 * acos(
                  cos(radians(${lat})) * 
                  cos(radians(${properties.latitude})) * 
                  cos(radians(${properties.longitude}) - radians(${lng})) + 
                  sin(radians(${lat})) * 
                  sin(radians(${properties.latitude}))
                )
              ) <= ${radiusKm}`,
            );
          }
        }
      }

      // Map bounds filtering
      if (input.bounds) {
        conditions.push(
          sql`${properties.latitude} BETWEEN ${input.bounds.south} AND ${input.bounds.north}`,
          sql`${properties.longitude} BETWEEN ${input.bounds.west} AND ${input.bounds.east}`,
        );
      }

      // Apply property filters
      if (input.filters) {
        const { propertyType, listingType, minPrice, maxPrice, minArea, maxArea, amenities } =
          input.filters;

        if (propertyType?.length) {
          conditions.push(
            sql`${properties.propertyType} IN (${propertyType.map(() => '?').join(',')})`,
          );
        }

        if (listingType?.length) {
          conditions.push(
            sql`${properties.listingType} IN (${listingType.map(() => '?').join(',')})`,
          );
        }

        if (minPrice) conditions.push(sql`${properties.price} >= ${minPrice}`);
        if (maxPrice) conditions.push(sql`${properties.price} <= ${maxPrice}`);
        if (minArea) conditions.push(sql`${properties.area} >= ${minArea}`);
        if (maxArea) conditions.push(sql`${properties.area} <= ${maxArea}`);

        if (input.filters.bedrooms) {
          if (input.filters.bedrooms.min) {
            conditions.push(sql`${properties.bedrooms} >= ${input.filters.bedrooms.min}`);
          }
          if (input.filters.bedrooms.max) {
            conditions.push(sql`${properties.bedrooms} <= ${input.filters.bedrooms.max}`);
          }
        }

        if (input.filters.bathrooms) {
          if (input.filters.bathrooms.min) {
            conditions.push(sql`${properties.bathrooms} >= ${input.filters.bathrooms.min}`);
          }
          if (input.filters.bathrooms.max) {
            conditions.push(sql`${properties.bathrooms} <= ${input.filters.bathrooms.max}`);
          }
        }
      }

      // Build query
      const baseQuery = db
        .select({
          id: properties.id,
          title: properties.title,
          description: properties.description,
          price: properties.price,
          propertyType: properties.propertyType,
          listingType: properties.listingType,
          bedrooms: properties.bedrooms,
          bathrooms: properties.bathrooms,
          area: properties.area,
          latitude: properties.latitude,
          longitude: properties.longitude,
          mainImage: properties.mainImage,
          address: properties.address,
          city: properties.city,
          province: properties.province,
          createdAt: properties.createdAt,
          distance: sql<number>`
            CASE 
              WHEN ${input.location?.type === 'coordinates'} THEN
                (6371 * acos(
                  cos(radians(${input.location?.value.split(',').map(Number)[0] || 0})) * 
                  cos(radians(${properties.latitude})) * 
                  cos(radians(${properties.longitude}) - radians(${
                    input.location?.value.split(',').map(Number)[1] || 0
                  })) + 
                  sin(radians(${input.location?.value.split(',').map(Number)[0] || 0})) * 
                  sin(radians(${properties.latitude}))
                ))
              ELSE NULL
            END
          `.as('distance_km'),
        })
        .from(properties)
        .where(and(...conditions));

      // Add sorting
      let orderedQuery = baseQuery;
      if (input.sortBy === 'distance' && input.location?.type === 'coordinates') {
        orderedQuery = baseQuery.orderBy(sql`distance_km ${input.sortOrder}`);
      } else if (input.sortBy === 'price') {
        orderedQuery = baseQuery.orderBy(
          input.sortOrder === 'asc' ? sql`${properties.price} ASC` : sql`${properties.price} DESC`,
        );
      } else if (input.sortBy === 'area') {
        orderedQuery = baseQuery.orderBy(
          input.sortOrder === 'asc' ? sql`${properties.area} ASC` : sql`${properties.area} DESC`,
        );
      } else {
        orderedQuery = baseQuery.orderBy(
          input.sortOrder === 'asc'
            ? sql`${properties.createdAt} ASC`
            : sql`${properties.createdAt} DESC`,
        );
      }

      // Add pagination
      const results = await orderedQuery.limit(input.limit).offset(input.offset);

      // Enhance results with amenity data if requested
      const enhancedResults = await Promise.all(
        results.map(async property => {
          const enhanced = { ...property };

          // Add nearby amenities count if requested
          if (input.amenities) {
            enhanced.nearbyAmenities = {
              schools: 0,
              hospitals: 0,
              transport: 0,
              shopping: 0,
            };

            // Calculate distances to nearby amenities (simplified for now)
            // In a real implementation, you would query the nearby_amenities table
            // using spatial indexes and Haversine distance calculations
          }

          return enhanced;
        }),
      );

      return {
        properties: enhancedResults,
        total: enhancedResults.length,
        hasMore: enhancedResults.length === input.limit,
      };
    }),

  /**
   * Get nearby amenities for a location
   */
  getNearbyAmenities: publicProcedure
    .input(
      z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        radius: z.number().min(0.1).max(10).default(2), // km
        types: z
          .array(
            z.enum([
              'school',
              'hospital',
              'shopping',
              'restaurant',
              'transport',
              'bank',
              'park',
              'university',
            ]),
          )
          .optional(),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();

      // For now, return mock data - in real implementation would query nearby_amenities table
      // This would use MySQL spatial functions like ST_Distance_Sphere for accurate calculations
      const mockAmenities = [
        {
          id: 1,
          name: 'Sandton City',
          type: 'shopping',
          address: 'Rivonia Rd, Sandhurst, Sandton',
          latitude: -26.1076,
          longitude: 28.0567,
          distance: 2.1,
        },
        {
          id: 2,
          name: 'Rosebank Mall',
          type: 'shopping',
          address: 'Oxford Rd, Rosebank, Johannesburg',
          latitude: -26.1534,
          longitude: 28.0433,
          distance: 3.5,
        },
        {
          id: 3,
          name: 'St. Johns College',
          type: 'school',
          address: 'St. Andrews Rd, Bedfordview',
          latitude: -26.1698,
          longitude: 28.1237,
          distance: 4.2,
        },
        {
          id: 4,
          name: 'Johannesburg General Hospital',
          type: 'hospital',
          address: 'Jubilee Rd, Parktown, Johannesburg',
          latitude: -26.1823,
          longitude: 28.0433,
          distance: 5.1,
        },
        {
          id: 5,
          name: 'Sandton Gautrain Station',
          type: 'transport',
          address: 'Rivonia Rd, Sandhurst, Sandton',
          latitude: -26.1076,
          longitude: 28.0567,
          distance: 2.1,
        },
      ];

      // Filter by requested types
      let filteredAmenities = mockAmenities;
      if (input.types?.length) {
        filteredAmenities = mockAmenities.filter(amenity =>
          input.types!.includes(amenity.type as any),
        );
      }

      // Calculate distances and filter by radius
      const amenitiesWithDistance = filteredAmenities
        .map(amenity => {
          const distance = calculateHaversineDistance(
            input.latitude,
            input.longitude,
            amenity.latitude,
            amenity.longitude,
          );
          return { ...amenity, distance: Math.round(distance * 10) / 10 };
        })
        .filter(amenity => amenity.distance <= input.radius)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, input.limit);

      return amenitiesWithDistance;
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
        gridSize: z.number().min(5).max(50).default(15),
        filters: z
          .object({
            propertyType: z.array(z.string()).optional(),
            minPrice: z.number().optional(),
            maxPrice: z.number().optional(),
          })
          .optional(),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();

      const latStep = (input.bounds.north - input.bounds.south) / input.gridSize;
      const lngStep = (input.bounds.east - input.bounds.west) / input.gridSize;

      const heatmapData = [];

      // Build filter conditions
      const conditions = [eq(properties.status, 'published')];
      if (input.filters?.propertyType?.length) {
        conditions.push(
          sql`${properties.propertyType} IN (${input.filters.propertyType.map(() => '?').join(',')})`,
        );
      }
      if (input.filters?.minPrice) {
        conditions.push(sql`${properties.price} >= ${input.filters.minPrice}`);
      }
      if (input.filters?.maxPrice) {
        conditions.push(sql`${properties.price} <= ${input.filters.maxPrice}`);
      }

      for (let i = 0; i < input.gridSize; i++) {
        for (let j = 0; j < input.gridSize; j++) {
          const gridLat = input.bounds.south + i * latStep;
          const gridLng = input.bounds.west + j * lngStep;

          const cellConditions = [
            ...conditions,
            sql`${properties.latitude} BETWEEN ${gridLat} AND ${gridLat + latStep}`,
            sql`${properties.longitude} BETWEEN ${gridLng} AND ${gridLng + lngStep}`,
          ];

          const [countResult] = await db
            .select({ count: count() })
            .from(properties)
            .where(and(...cellConditions));

          if (countResult?.count > 0) {
            heatmapData.push({
              latitude: gridLat + latStep / 2,
              longitude: gridLng + lngStep / 2,
              count: countResult.count,
              weight: Math.min(countResult.count / 10, 1),
              intensity: Math.min(countResult.count / 5, 0.8),
            });
          }
        }
      }

      return heatmapData;
    }),

  /**
   * Get similar properties based on location and features
   */
  getSimilarProperties: publicProcedure
    .input(
      z.object({
        propertyId: z.number(),
        radius: z.number().min(0.5).max(10).default(2), // km
        limit: z.number().min(1).max(20).default(10),
        includePriceRange: z.boolean().default(true),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();

      // Get the reference property
      const [referenceProperty] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, input.propertyId))
        .limit(1);

      if (!referenceProperty) {
        throw new Error('Property not found');
      }

      // Build similarity criteria
      const conditions = [
        eq(properties.status, 'published'),
        sql`${properties.id} != ${input.propertyId}`,
        // Location similarity
        sql`(
          6371 * acos(
            cos(radians(${referenceProperty.latitude || 0})) * 
            cos(radians(${properties.latitude || 0})) * 
            cos(radians(${properties.longitude || 0}) - radians(${referenceProperty.longitude || 0})) + 
            sin(radians(${referenceProperty.latitude || 0})) * 
            sin(radians(${properties.latitude || 0}))
          )
        ) <= ${input.radius}`,
      ];

      // Add property type similarity
      if (referenceProperty.propertyType) {
        conditions.push(eq(properties.propertyType, referenceProperty.propertyType));
      }

      // Add price range similarity if requested
      if (input.includePriceRange && referenceProperty.price) {
        const priceRange = referenceProperty.price * 0.3; // 30% price range
        conditions.push(
          sql`${properties.price} BETWEEN ${referenceProperty.price - priceRange} AND ${referenceProperty.price + priceRange}`,
        );
      }

      const similarProperties = await db
        .select({
          id: properties.id,
          title: properties.title,
          price: properties.price,
          propertyType: properties.propertyType,
          listingType: properties.listingType,
          bedrooms: properties.bedrooms,
          bathrooms: properties.bathrooms,
          area: properties.area,
          latitude: properties.latitude,
          longitude: properties.longitude,
          mainImage: properties.mainImage,
          city: properties.city,
          province: properties.province,
          distance: sql<number>`
            (6371 * acos(
              cos(radians(${referenceProperty.latitude || 0})) * 
              cos(radians(${properties.latitude || 0})) * 
              cos(radians(${properties.longitude || 0}) - radians(${referenceProperty.longitude || 0})) + 
              sin(radians(${referenceProperty.latitude || 0})) * 
              sin(radians(${properties.latitude || 0}))
            ))
          `.as('distance_km'),
        })
        .from(properties)
        .where(and(...conditions))
        .orderBy(sql`distance_km ASC`)
        .limit(input.limit);

      return similarProperties;
    }),

  /**
   * Get location insights and statistics
   */
  getLocationInsights: publicProcedure
    .input(
      z.object({
        location: z.object({
          type: z.enum(['province', 'city', 'suburb']),
          value: z.string(),
        }),
        propertyType: z.string().optional(),
        listingType: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();

      let locationFilter = '';
      let locationValue = input.location.value;

      // Build location filter based on type
      if (input.location.type === 'province') {
        locationFilter = properties.province;
        // Try to find province by name
        const [province] = await db
          .select({ name: provinces.name })
          .from(provinces)
          .where(like(provinces.name, `%${locationValue}%`))
          .limit(1);

        if (province) {
          locationValue = province.name;
        }
      } else if (input.location.type === 'city') {
        locationFilter = properties.city;
      } else if (input.location.type === 'suburb') {
        locationFilter = properties.address;
        locationValue = `%${locationValue}%`;
      }

      // Get property statistics
      const conditions = [eq(properties.status, 'published')];

      if (locationValue && locationFilter) {
        if (input.location.type === 'suburb') {
          conditions.push(like(properties.address, locationValue));
        } else {
          conditions.push(eq(locationFilter as any, locationValue));
        }
      }

      if (input.propertyType) {
        conditions.push(eq(properties.propertyType, input.propertyType as any));
      }

      if (input.listingType) {
        conditions.push(eq(properties.listingType, input.listingType as any));
      }

      // Get price statistics
      const [priceStats] = await db
        .select({
          avgPrice: sql<number>`AVG(${properties.price})`.as('avg_price'),
          minPrice: sql<number>`MIN(${properties.price})`.as('min_price'),
          maxPrice: sql<number>`MAX(${properties.price})`.as('max_price'),
          medianPrice: sql<number>`(
            SELECT AVG(price) FROM (
              SELECT price FROM properties 
              WHERE ${and(...conditions)}
              ORDER BY price 
              LIMIT (SELECT COUNT(*) FROM properties WHERE ${and(...conditions)} + 1) / 2, 1
            ) as median_price
          )`.as('median_price'),
          totalProperties: count(),
        })
        .from(properties)
        .where(and(...conditions));

      // Get property type distribution
      const propertyTypes = await db
        .select({
          type: properties.propertyType,
          count: count(),
        })
        .from(properties)
        .where(and(...conditions))
        .groupBy(properties.propertyType)
        .orderBy(count());

      // Get listing type distribution
      const listingTypes = await db
        .select({
          type: properties.listingType,
          count: count(),
        })
        .from(properties)
        .where(and(...conditions))
        .groupBy(properties.listingType)
        .orderBy(count());

      return {
        priceStats: {
          average: Math.round(priceStats?.avgPrice || 0),
          minimum: priceStats?.minPrice || 0,
          maximum: priceStats?.maxPrice || 0,
          median: Math.round(priceStats?.medianPrice || 0),
          totalProperties: priceStats?.totalProperties || 0,
        },
        distribution: {
          propertyTypes: propertyTypes.map(pt => ({
            type: pt.type,
            count: pt.count,
            percentage: Math.round((pt.count / (priceStats?.totalProperties || 1)) * 100),
          })),
          listingTypes: listingTypes.map(lt => ({
            type: lt.type,
            count: lt.count,
            percentage: Math.round((lt.count / (priceStats?.totalProperties || 1)) * 100),
          })),
        },
      };
    }),

  /**
   * Save search for user notifications
   */
  saveSearch: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        searchParams: z.object({
          location: z.any().optional(),
          filters: z.any().optional(),
          amenities: z.any().optional(),
        }),
        notificationEnabled: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();

      // Check if user already has a search with this name
      const [existingSearch] = await db
        .select()
        .from(locationSearchCache) // Using existing table for now
        .where(
          and(
            eq(locationSearchCache.searchQuery, `${ctx.user.id}_${input.name}`),
            eq(locationSearchCache.searchType, 'saved_search'),
          ),
        )
        .limit(1);

      if (existingSearch) {
        // Update existing search
        await db
          .update(locationSearchCache)
          .set({
            resultsJSON: JSON.stringify({
              params: input.searchParams,
              notificationEnabled: input.notificationEnabled,
              updatedAt: new Date(),
            }),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          })
          .where(eq(locationSearchCache.id, existingSearch.id));

        return { success: true, updated: true };
      } else {
        // Create new saved search
        await db.insert(locationSearchCache).values({
          searchQuery: `${ctx.user.id}_${input.name}`,
          searchType: 'saved_search',
          resultsJSON: JSON.stringify({
            params: input.searchParams,
            notificationEnabled: input.notificationEnabled,
            createdAt: new Date(),
          }),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        });

        return { success: true, created: true };
      }
    }),
});

// Helper function for calculating Haversine distance
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
