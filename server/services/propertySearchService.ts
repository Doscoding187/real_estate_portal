/**
 * Property Search Service
 * Handles property search with filtering, sorting, pagination, and caching
 * Requirements: 2.3, 6.1, 6.2, 6.3, 7.1, 7.3, 7.4
 */

import { db } from '../db';
import { properties, propertyImages } from '../../drizzle/schema';
import { eq, and, gte, lte, inArray, or, sql, SQL, desc, asc, isNotNull } from 'drizzle-orm';
import { redisCache, CacheTTL } from '../lib/redis';
import type { PropertyFilters, SortOption, SearchResults, Property } from '../../shared/types';
import { locationResolver } from './locationResolverService';

// Cache key prefix for property searches
const CACHE_PREFIX = 'property:search:';

export class PropertySearchService {
  /**
   * Search properties with filters, sorting, and pagination
   * Requirements: 2.3 (sorting), 6.1-6.3 (pagination), 7.1 (result count)
   */
  async searchProperties(
    filters: PropertyFilters,
    sortOption: SortOption = 'date_desc',
    page: number = 1,
    pageSize: number = 12
  ): Promise<SearchResults> {
    // Generate cache key
    const cacheKey = this.generateCacheKey(filters, sortOption, page, pageSize);
    
    // Try to get from cache
    const cached = await redisCache.get<SearchResults>(cacheKey);
    if (cached) {
      return cached;
    }

    // Resolve location slugs to IDs for optimal queries
    const locationIds = await locationResolver.getLocationIds({
      provinceSlug: filters.province,
      citySlug: filters.city,
      suburbSlug: filters.suburb?.[0],
    });

    // Build query conditions with resolved location IDs
    const conditions = this.buildFilterConditions(filters, locationIds);
    
    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(properties)
      .where(and(...conditions));
    
    const total = Number(countResult[0]?.count || 0);

    // Calculate pagination
    const offset = (page - 1) * pageSize;
    const hasMore = offset + pageSize < total;

    // Build sort order
    const orderBy = this.buildSortOrder(sortOption);

    // Execute search query
    const results = await db
      .select({
        id: properties.id,
        title: properties.title,
        price: properties.price,
        suburb: sql<string>`COALESCE(${properties.address}, '')`,
        city: properties.city,
        province: properties.province,
        propertyType: properties.propertyType,
        listingType: properties.listingType,
        bedrooms: properties.bedrooms,
        bathrooms: properties.bathrooms,
        erfSize: sql<number>`CAST(${properties.area} AS SIGNED)`,
        floorSize: sql<number>`CAST(${properties.area} AS SIGNED)`,
        titleType: sql<'freehold' | 'sectional'>`'freehold'`, // Default until migration
        levy: properties.levies,
        rates: properties.ratesAndTaxes,
        securityEstate: sql<boolean>`false`, // Default until migration
        petFriendly: sql<boolean>`false`, // Default until migration
        fibreReady: sql<boolean>`false`, // Default until migration
        loadSheddingSolutions: sql<Array<'solar' | 'generator' | 'inverter' | 'none'>>`JSON_ARRAY('none')`,
        videoCount: sql<number>`0`, // Will be calculated from related tables
        status: properties.status,
        listedDate: properties.createdAt,
        latitude: sql<number>`CAST(${properties.latitude} AS DECIMAL(10,8))`,
        longitude: sql<number>`CAST(${properties.longitude} AS DECIMAL(11,8))`,
        highlights: sql<string[]>`JSON_ARRAY()`,
        agentId: properties.agentId,
      })
      .from(properties)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset);

    // Get images for properties
    const propertyIds = results.map(p => Number(p.id));
    const images = propertyIds.length > 0 ? await db
      .select({
        propertyId: propertyImages.propertyId,
        imageUrl: propertyImages.imageUrl,
        isPrimary: propertyImages.isPrimary,
      })
      .from(propertyImages)
      .where(inArray(propertyImages.propertyId, propertyIds))
      .orderBy(desc(propertyImages.isPrimary), asc(propertyImages.displayOrder)) : [];

    // Group images by property
    const imagesByProperty = new Map<number, typeof images>();
    images.forEach(img => {
      const propId = img.propertyId;
      if (!imagesByProperty.has(propId)) {
        imagesByProperty.set(propId, []);
      }
      imagesByProperty.get(propId)!.push(img);
    });

    // Transform results to Property type
    const transformedProperties: Property[] = results.map(prop => ({
      id: String(prop.id),
      title: prop.title,
      price: prop.price,
      suburb: prop.suburb || prop.city,
      city: prop.city,
      province: prop.province,
      propertyType: prop.propertyType as Property['propertyType'],
      listingType: prop.listingType as Property['listingType'],
      bedrooms: prop.bedrooms || undefined,
      bathrooms: prop.bathrooms || undefined,
      erfSize: prop.erfSize || undefined,
      floorSize: prop.floorSize || undefined,
      titleType: prop.titleType,
      levy: prop.levy || undefined,
      rates: prop.rates || undefined,
      securityEstate: prop.securityEstate,
      petFriendly: prop.petFriendly,
      fibreReady: prop.fibreReady,
      loadSheddingSolutions: prop.loadSheddingSolutions,
      images: (imagesByProperty.get(Number(prop.id)) || []).map(img => ({
        url: img.imageUrl,
        thumbnailUrl: img.imageUrl,
      })),
      videoCount: prop.videoCount,
      status: this.mapStatus(prop.status),
      listedDate: new Date(prop.listedDate),
      agent: {
        id: String(prop.agentId || 0),
        name: 'Agent Name', // Will be populated from agents table
        agency: 'Agency Name',
        phone: '',
        whatsapp: '',
        email: '',
      },
      latitude: prop.latitude || 0,
      longitude: prop.longitude || 0,
      highlights: prop.highlights,
    }));

    const searchResults: SearchResults = {
      properties: transformedProperties,
      total,
      page,
      pageSize,
      hasMore,
    };

    // Cache the results
    await redisCache.set(cacheKey, searchResults, CacheTTL.FEED_RESULTS);

    return searchResults;
  }

  /**
   * Build filter conditions from PropertyFilters
   * Supports all filter types: location, price, bedrooms, SA-specific
   * Uses hybrid approach: ID-based queries when available, text fallback otherwise
   */
  private buildFilterConditions(filters: PropertyFilters, locationIds?: {
    provinceId?: number;
    cityId?: number;
    suburbId?: number;
  }): SQL[] {
    const conditions: SQL[] = [];

    // Only show published/available properties by default
    conditions.push(
      or(
        eq(properties.status, 'available'),
        eq(properties.status, 'published')
      )!
    );

    // Location filters - Use IDs when available, fallback to text matching
    if (locationIds?.provinceId) {
      // ID-based: Fast, exact match
      conditions.push(eq(properties.provinceId, locationIds.provinceId));
    } else if (filters.province) {
      // Text fallback: Case-insensitive for legacy data
      conditions.push(sql`LOWER(${properties.province}) = LOWER(${filters.province})`);
    }

    if (locationIds?.cityId) {
      // ID-based: Fast, exact match
      conditions.push(eq(properties.cityId, locationIds.cityId));
    } else if (filters.city) {
      // Text fallback: Case-insensitive for legacy data
      conditions.push(sql`LOWER(${properties.city}) = LOWER(${filters.city})`);
    }

    if (locationIds?.suburbId) {
      // ID-based: Fast, exact match
      conditions.push(eq(properties.suburbId, locationIds.suburbId));
    } else if (filters.suburb && filters.suburb.length > 0) {
      // Text fallback: Search in address field (legacy approach)
      const suburbConditions = filters.suburb.map(suburb =>
        sql`LOWER(${properties.address}) LIKE LOWER(${`%${suburb}%`})`
      );
      conditions.push(or(...suburbConditions)!);
    }

    // Property type filter
    if (filters.propertyType && filters.propertyType.length > 0) {
      conditions.push(inArray(properties.propertyType, filters.propertyType));
    }

    // Listing type filter
    if (filters.listingType) {
      conditions.push(eq(properties.listingType, filters.listingType));
    }

    // Price range
    if (filters.minPrice !== undefined) {
      conditions.push(gte(properties.price, filters.minPrice));
    }
    if (filters.maxPrice !== undefined) {
      conditions.push(lte(properties.price, filters.maxPrice));
    }

    // Bedrooms
    if (filters.minBedrooms !== undefined) {
      conditions.push(gte(properties.bedrooms, filters.minBedrooms));
    }
    if (filters.maxBedrooms !== undefined) {
      conditions.push(lte(properties.bedrooms, filters.maxBedrooms));
    }

    // Bathrooms
    if (filters.minBathrooms !== undefined) {
      conditions.push(gte(properties.bathrooms, filters.minBathrooms));
    }

    // Size filters (using area field for now)
    if (filters.minErfSize !== undefined) {
      conditions.push(gte(properties.area, filters.minErfSize));
    }
    if (filters.maxErfSize !== undefined) {
      conditions.push(lte(properties.area, filters.maxErfSize));
    }
    if (filters.minFloorSize !== undefined) {
      conditions.push(gte(properties.area, filters.minFloorSize));
    }
    if (filters.maxFloorSize !== undefined) {
      conditions.push(lte(properties.area, filters.maxFloorSize));
    }

    // SA-specific filters (will be fully functional after migration)
    // For now, these are placeholders that won't filter anything
    // TODO: Update after migration adds these columns

    // Status filter
    if (filters.status && filters.status.length > 0) {
      const statusConditions = filters.status.map(status => {
        // Map our status enum to database status
        switch (status) {
          case 'available':
            return or(eq(properties.status, 'available'), eq(properties.status, 'published'));
          case 'sold':
            return eq(properties.status, 'sold');
          case 'let':
            return eq(properties.status, 'rented');
          case 'under_offer':
            return eq(properties.status, 'pending');
          default:
            return eq(properties.status, status);
        }
      });
      conditions.push(or(...statusConditions)!);
    }

    // Map bounds filter (for map view)
    if (filters.bounds) {
      conditions.push(
        and(
          sql`CAST(${properties.latitude} AS DECIMAL(10,8)) >= ${filters.bounds.south}`,
          sql`CAST(${properties.latitude} AS DECIMAL(10,8)) <= ${filters.bounds.north}`,
          sql`CAST(${properties.longitude} AS DECIMAL(11,8)) >= ${filters.bounds.west}`,
          sql`CAST(${properties.longitude} AS DECIMAL(11,8)) <= ${filters.bounds.east}`
        )!
      );
    }

    return conditions;
  }

  /**
   * Build sort order based on SortOption
   * Requirement 2.3: Support all sort options
   */
  private buildSortOrder(sortOption: SortOption): SQL {
    switch (sortOption) {
      case 'price_asc':
        return asc(properties.price);
      case 'price_desc':
        return desc(properties.price);
      case 'date_desc':
        return desc(properties.createdAt);
      case 'date_asc':
        return asc(properties.createdAt);
      case 'suburb_asc':
        return asc(properties.address);
      case 'suburb_desc':
        return desc(properties.address);
      default:
        return desc(properties.createdAt);
    }
  }

  /**
   * Map database status to Property status
   */
  private mapStatus(dbStatus: string): Property['status'] {
    switch (dbStatus) {
      case 'sold':
        return 'sold';
      case 'rented':
        return 'let';
      case 'pending':
        return 'under_offer';
      case 'available':
      case 'published':
      default:
        return 'available';
    }
  }

  /**
   * Generate cache key for search results
   */
  private generateCacheKey(
    filters: PropertyFilters,
    sortOption: SortOption,
    page: number,
    pageSize: number
  ): string {
    const filterStr = JSON.stringify(filters);
    const hash = this.simpleHash(filterStr);
    return `${CACHE_PREFIX}${hash}:${sortOption}:${page}:${pageSize}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get filter counts for preview
   * Requirement 7.3: Show count before applying filter
   */
  async getFilterCounts(baseFilters: PropertyFilters): Promise<{
    total: number;
    byPropertyType: Record<string, number>;
    byPriceRange: Array<{ range: string; count: number }>;
  }> {
    // Resolve location slugs to IDs for optimal queries
    const locationIds = await locationResolver.getLocationIds({
      provinceSlug: baseFilters.province,
      citySlug: baseFilters.city,
      suburbSlug: baseFilters.suburb?.[0],
    });

    const conditions = this.buildFilterConditions(baseFilters, locationIds);

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(properties)
      .where(and(...conditions));
    
    const total = Number(totalResult[0]?.count || 0);

    // Get counts by property type
    const typeResults = await db
      .select({
        propertyType: properties.propertyType,
        count: sql<number>`count(*)`,
      })
      .from(properties)
      .where(and(...conditions))
      .groupBy(properties.propertyType);

    const byPropertyType: Record<string, number> = {};
    typeResults.forEach(row => {
      byPropertyType[row.propertyType] = Number(row.count);
    });

    // Get counts by price range
    const priceRanges = [
      { range: 'Under R1M', min: 0, max: 1000000 },
      { range: 'R1M - R2M', min: 1000000, max: 2000000 },
      { range: 'R2M - R3M', min: 2000000, max: 3000000 },
      { range: 'R3M - R5M', min: 3000000, max: 5000000 },
      { range: 'Over R5M', min: 5000000, max: Number.MAX_SAFE_INTEGER },
    ];

    const byPriceRange = await Promise.all(
      priceRanges.map(async ({ range, min, max }) => {
        const rangeConditions = [
          ...conditions,
          gte(properties.price, min),
          lte(properties.price, max),
        ];
        const result = await db
          .select({ count: sql<number>`count(*)` })
          .from(properties)
          .where(and(...rangeConditions));
        
        return {
          range,
          count: Number(result[0]?.count || 0),
        };
      })
    );

    return {
      total,
      byPropertyType,
      byPriceRange,
    };
  }

  /**
   * Invalidate cache for property searches
   * Call this when properties are updated
   */
  async invalidateCache(propertyId?: string): Promise<void> {
    if (propertyId) {
      // Invalidate specific property caches
      await redisCache.delByPattern(`${CACHE_PREFIX}*`);
    } else {
      // Invalidate all search caches
      await redisCache.delByPattern(`${CACHE_PREFIX}*`);
    }
  }
}

export const propertySearchService = new PropertySearchService();
