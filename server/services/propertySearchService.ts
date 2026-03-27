/**
 * Property Search Service
 * Handles property search with filtering, sorting, pagination, and caching
 * Requirements: 2.3, 6.1, 6.2, 6.3, 7.1, 7.3, 7.4
 */

import { db } from '../db';
import {
  properties,
  propertyImages,
  developments,
  developers,
  developerBrandProfiles,
  agents,
  agencies,
  suburbs,
} from '../../drizzle/schema';
import { eq, and, gte, lte, inArray, or, sql, SQL, desc, asc } from 'drizzle-orm';
import { redisCache, CacheTTL } from '../lib/redis';
import type { PropertyFilters, SortOption, SearchResults, Property } from '../../shared/types';
import { locationResolver, ResolvedLocation } from './locationResolverService';

// Cache key prefix for property searches
const CACHE_PREFIX = 'property:search:';

type LoadSheddingSolution = Property['loadSheddingSolutions'][number];

function parseJsonObject(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, any>;
    }
    return {};
  } catch {
    return {};
  }
}

function asPositiveNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(v => String(v ?? '').trim())
      .filter(Boolean);
  }
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map(v => String(v ?? '').trim())
        .filter(Boolean);
    }
  } catch {
    // fall through
  }
  return trimmed
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map(v => v.trim()).filter(Boolean)));
}

function slugifyText(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseCoordinate(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

function deriveLoadSheddingSolutions(details: Record<string, any>): LoadSheddingSolution[] {
  const solutions = new Set<LoadSheddingSolution>();
  const powerBackup = String(details.powerBackup ?? '').toLowerCase();
  if (powerBackup.includes('solar')) solutions.add('solar');
  if (powerBackup.includes('generator')) solutions.add('generator');
  if (powerBackup.includes('inverter') || powerBackup.includes('battery')) {
    solutions.add('inverter');
  }
  if (solutions.size === 0) solutions.add('none');
  return Array.from(solutions);
}

export class PropertySearchService {
  /**
   * Search properties with filters, sorting, and pagination
   * Requirements: 2.3 (sorting), 6.1-6.3 (pagination), 7.1 (result count)
   */
  async searchProperties(
    filters: PropertyFilters,
    sortOption: SortOption = 'date_desc',
    page: number = 1,
    pageSize: number = 12,
  ): Promise<SearchResults> {
    // Generate cache key
    const cacheKey = this.generateCacheKey(filters, sortOption, page, pageSize);

    // Try to get from cache
    const cached = await redisCache.get<SearchResults>(cacheKey);
    if (cached) {
      return {
        ...cached,
        properties: (cached.properties || []).map((p: any) => ({
          ...p,
          listedDate:
            p?.listedDate instanceof Date
              ? p.listedDate
              : p?.listedDate
                ? new Date(p.listedDate)
                : new Date(0),
        })),
      };
    }

    // Resolve location slugs to IDs for optimal queries
    // NOTE: Wrapped in try-catch - if resolver fails, fall back to text queries
    const locationIds: Array<{
      provinceId?: number;
      provinceName?: string;
      cityId?: number;
      cityName?: string;
      suburbId?: number;
      suburbName?: string;
    }> = [];
    let resolvedLocation: ResolvedLocation | null = null;

    try {
      // Priority 1: Multi-location Search (New P24 Style)
      if (filters.locations && filters.locations.length > 0) {
        await Promise.all(
          filters.locations.map(async slug => {
            const resolved = await locationResolver.resolveLocation({
              // We don't know the type, so we try to resolve purely by slug if possible
              // The resolver might need an update or we try all slots.
              // For now, let's assume the resolver can handle a generic slug lookup
              // or we pass it as city/suburb specifically if we knew.
              // BUT, since we only have a slug, we might need a smarter resolver method.
              // Hack for now: try city first, then suburb?
              // Actually, locationResolver usually takes {provinceSlug, citySlug, suburbSlug}

              // Let's assume the slug could be anything.
              // Ideally locationResolver should have `resolveSlug(slug)`

              // For now, we'll try to guess based on context or just pass it as city (most common)
              // or rely on a new resolver method if it existed.
              // Current implementation of resolveLocation uses rigid hierarchy.

              // Let's rely on the text fallback for now if resolution is hard,
              // OR try to resolve each independently.

              // Temporary strategy: Try resolving as city first (most high value), then suburb.
              citySlug: slug,
            });

            if (resolved) {
              if (resolved.city || resolved.suburb || resolved.province) {
                locationIds.push({
                  provinceId: resolved.province?.id,
                  provinceName: resolved.province?.name,
                  cityId: resolved.city?.id,
                  cityName: resolved.city?.name,
                  suburbId: resolved.suburb?.id,
                  suburbName: resolved.suburb?.name,
                });
              }
            }
          }),
        );
      }
      // Priority 2: Hierarchical Search (Legacy / Single Location)
      else {
        resolvedLocation = await locationResolver.resolveLocation({
          provinceSlug: filters.province,
          citySlug: filters.city,
          suburbSlug: filters.suburb?.[0],
        });

        if (resolvedLocation) {
          locationIds.push({
            provinceId: resolvedLocation.province?.id,
            provinceName: resolvedLocation.province?.name,
            cityId: resolvedLocation.city?.id,
            cityName: resolvedLocation.city?.name,
            suburbId: resolvedLocation.suburb?.id,
            suburbName: resolvedLocation.suburb?.name,
          });
        }
      }
    } catch (error) {
      console.error(
        '[PropertySearchService] Location resolver failed, using text fallback:',
        error,
      );
    }

    // Build query conditions with resolved location IDs
    const conditions = this.buildFilterConditions(filters, locationIds);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(properties)
      .leftJoin(developments, eq(properties.developmentId, developments.id))
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
        description: properties.description,
        price: properties.price,
        suburb: sql<string>`COALESCE(${properties.address}, '')`,
        address: properties.address,
        city: properties.city,
        province: properties.province,
        propertyType: properties.propertyType,
        listingType: properties.listingType,
        bedrooms: properties.bedrooms,
        bathrooms: properties.bathrooms,
        developmentId: properties.developmentId,
        developmentName: developments.name,
        developmentSlug: developments.slug,
        developerId: developments.developerId,
        developerName: developers.name,
        developerLogo: developers.logo,
        erfSize: sql<number>`CAST(${properties.area} AS SIGNED)`,
        floorSize: sql<number>`CAST(${properties.area} AS SIGNED)`,
        titleType: sql<'freehold' | 'sectional'>`'freehold'`, // Default until migration
        levy: properties.levies,
        rates: properties.ratesAndTaxes,
        securityEstate: sql<boolean>`false`, // Default until migration
        petFriendly: sql<boolean>`false`, // Default until migration
        fibreReady: sql<boolean>`false`, // Default until migration
        loadSheddingSolutions: sql<
          Array<'solar' | 'generator' | 'inverter' | 'none'>
        >`JSON_ARRAY('none')`,
        videoCount: sql<number>`CASE WHEN ${properties.videoUrl} IS NOT NULL THEN 1 ELSE 0 END`,
        status: properties.status,
        listedDate: properties.createdAt,
        latitude: sql<number>`CAST(${properties.latitude} AS DECIMAL(10,8))`,
        longitude: sql<number>`CAST(${properties.longitude} AS DECIMAL(11,8))`,
        highlights: properties.amenities,
        amenities: properties.amenities,
        mainImage: properties.mainImage,
        propertySettings: properties.propertySettings,
        agentDisplayName: agents.displayName,
        agentFirstName: agents.firstName,
        agentLastName: agents.lastName,
        agentPhone: agents.phone,
        agentWhatsapp: agents.whatsapp,
        agentEmail: agents.email,
        agentProfileImage: agents.profileImage,
        agencyName: agencies.name,
        agentId: properties.agentId,
        developerBrandProfileId: sql<number>`COALESCE(${properties.developerBrandProfileId}, ${developments.developerBrandProfileId})`,
        builderBrandName: developerBrandProfiles.brandName,
        builderLogoUrl: developerBrandProfiles.logoUrl,
        builderSlug: developerBrandProfiles.slug,
        builderPublicContactEmail: developerBrandProfiles.publicContactEmail,
      })
      .from(properties)
      .leftJoin(developments, eq(properties.developmentId, developments.id))
      .leftJoin(developers, eq(developments.developerId, developers.id))
      .leftJoin(agents, eq(properties.agentId, agents.id))
      .leftJoin(agencies, eq(agents.agencyId, agencies.id))
      .leftJoin(
        developerBrandProfiles,
        sql`${developerBrandProfiles.id} = COALESCE(${properties.developerBrandProfileId}, ${developments.developerBrandProfileId})`,
      )
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset);

    // Get images for properties
    const propertyIds = results.map((p: any) => Number(p.id));
    const images =
      propertyIds.length > 0
        ? await db
            .select({
              propertyId: propertyImages.propertyId,
              imageUrl: propertyImages.imageUrl,
              isPrimary: propertyImages.isPrimary,
            })
            .from(propertyImages)
            .where(inArray(propertyImages.propertyId, propertyIds))
            .orderBy(desc(propertyImages.isPrimary), asc(propertyImages.displayOrder))
        : [];

    // Group images by property
    const imagesByProperty = new Map<number, typeof images>();
    images.forEach((img: any) => {
      const propId = img.propertyId;
      if (!imagesByProperty.has(propId)) {
        imagesByProperty.set(propId, []);
      }
      imagesByProperty.get(propId)!.push(img);
    });

    // Transform results to Property type
    const transformedProperties: Property[] = results.map((prop: any) => {
      const details = parseJsonObject(prop.propertySettings);
      const floorSize =
        asPositiveNumber(details.unitSizeM2) ||
        asPositiveNumber(details.houseAreaM2) ||
        asPositiveNumber(details.floorAreaM2) ||
        asPositiveNumber(prop.floorSize);
      const erfSize =
        asPositiveNumber(details.erfSizeM2) ||
        asPositiveNumber(details.landSizeM2OrHa) ||
        (asPositiveNumber(details.landSizeHa) ? Number(details.landSizeHa) * 10000 : undefined) ||
        asPositiveNumber(prop.erfSize);

      const securityTokens = parseStringList(details.securityFeatures).map(v => v.toLowerCase());
      const amenityTokens = [
        ...parseStringList(details.amenities),
        ...parseStringList(details.amenitiesFeatures),
        ...parseStringList(prop.amenities),
      ].map(v => v.toLowerCase());

      const internetAvailability = String(
        details.internetAvailability ?? details.internetAccess ?? '',
      ).toLowerCase();
      const securityLabel = String(details.security ?? details.securityLevel ?? '').toLowerCase();

      const securityEstate =
        securityLabel.includes('estate') ||
        securityLabel.includes('24') ||
        securityTokens.includes('security_estate');
      const petFriendly =
        details.petFriendly === true ||
        details.petPolicy === 'allowed' ||
        details.petPolicy === 'by_arrangement';
      const fibreReady =
        internetAvailability.includes('fibre') ||
        internetAvailability.includes('fiber') ||
        amenityTokens.some(token => token.includes('fibre') || token.includes('fiber'));

      const highlights = uniqueStrings([
        ...parseStringList(prop.highlights),
        ...parseStringList(details.propertyHighlights),
        ...parseStringList(details.amenitiesFeatures),
        ...parseStringList(details.securityFeatures),
        ...parseStringList(details.outdoorFeatures),
      ]);

      const primaryImage = (imagesByProperty.get(Number(prop.id)) || []).map((img: any) => ({
        url: img.imageUrl,
        thumbnailUrl: img.imageUrl,
      }));
      if (primaryImage.length === 0 && prop.mainImage) {
        primaryImage.push({ url: prop.mainImage, thumbnailUrl: prop.mainImage });
      }

      const agentName = (
        String(prop.agentDisplayName || '').trim() ||
        [prop.agentFirstName, prop.agentLastName].filter(Boolean).join(' ').trim()
      ).trim();
      const developerName = String(prop.developerName || '').trim();
      const developerLogo = prop.developerLogo || undefined;
      const builderName = String(prop.builderBrandName || '').trim() || developerName;
      const builderLogo = prop.builderLogoUrl || developerLogo;

      const hasAgentIdentity = !!agentName;
      const storedBadges = Array.isArray(details.badges) ? details.badges : [];

      const developmentId = Number(prop.developmentId || 0);
      const developmentName =
        String(prop.developmentName || '').trim() || String(details.developmentName || '').trim();
      const developmentSlug = String(prop.developmentSlug || '').trim() || undefined;
      const development =
        (Number.isFinite(developmentId) && developmentId > 0) || developmentName
          ? {
              id: Number.isFinite(developmentId) && developmentId > 0 ? developmentId : null,
              name: developmentName || null,
              slug: developmentSlug || null,
            }
          : undefined;

      const developerBrandProfileId = Number(prop.developerBrandProfileId || 0);
      const developerBrand =
        Number.isFinite(developerBrandProfileId) && developerBrandProfileId > 0
          ? {
              id: developerBrandProfileId,
              brandName: builderName || 'Developer',
              slug: String(prop.builderSlug || '').trim() || slugifyText(builderName || 'developer'),
              logoUrl: prop.builderLogoUrl || null,
              publicContactEmail: String(prop.builderPublicContactEmail || '').trim() || null,
            }
          : undefined;

      const titleType: Property['titleType'] =
        String(details.propertySetting || details.ownershipType || '').toLowerCase().includes(
          'sectional',
        )
          ? 'sectional'
          : 'freehold';

      return {
        id: String(prop.id),
        title: prop.title,
        description: prop.description ?? undefined,
        price: prop.price,
        suburb: prop.suburb || prop.city,
        city: prop.city,
        province: prop.province,
        propertyType: prop.propertyType as Property['propertyType'],
        listingType: prop.listingType as Property['listingType'],
        bedrooms: prop.bedrooms || undefined,
        bathrooms: prop.bathrooms || undefined,
        erfSize: erfSize || undefined,
        floorSize: floorSize || undefined,
        titleType,
        levy: prop.levy || undefined,
        rates: prop.rates || undefined,
        securityEstate,
        petFriendly,
        fibreReady,
        loadSheddingSolutions: deriveLoadSheddingSolutions(details),
        images: primaryImage,
        mainImage: prop.mainImage || primaryImage[0]?.url || undefined,
        videoCount: Number(prop.videoCount || 0),
        status: this.mapStatus(prop.status),
        listedDate: new Date(prop.listedDate),
        listingSource: 'manual',
        listerType: hasAgentIdentity ? (prop.agencyName ? 'agency' : 'agent') : 'private',
        agent: hasAgentIdentity
          ? {
              id: String(prop.agentId || 0),
              name: agentName,
              agency: String(prop.agencyName || ''),
              phone: String(prop.agentPhone || ''),
              whatsapp: String(prop.agentWhatsapp || ''),
              email: String(prop.agentEmail || ''),
              image: prop.agentProfileImage || undefined,
            }
          : undefined,
        developerBrand,
        development,
        developmentId: Number.isFinite(developmentId) && developmentId > 0 ? developmentId : undefined,
        badges: uniqueStrings([
          ...storedBadges.map((badge: any) => String(badge ?? '').trim()),
          development?.name ? `Part of ${development.name}` : '',
        ]),
        latitude: prop.latitude || 0,
        longitude: prop.longitude || 0,
        highlights,
        area: floorSize || undefined,
        yardSize: erfSize || undefined,
        address: prop.address || undefined,
        propertySettings: details,
      } as any;
    });

    let locationContext: SearchResults['locationContext'] = undefined;

    if (resolvedLocation) {
      let name = resolvedLocation.province.name;
      let slug = resolvedLocation.province.slug;

      if (resolvedLocation.level === 'city' && resolvedLocation.city) {
        name = resolvedLocation.city.name;
        slug = resolvedLocation.city.slug;
      } else if (resolvedLocation.level === 'suburb' && resolvedLocation.suburb) {
        name = resolvedLocation.suburb.name;
        slug = resolvedLocation.suburb.slug;
      }

      locationContext = {
        type: resolvedLocation.level,
        name,
        slug,
        confidence: resolvedLocation.confidence,
        fallbackLevel: resolvedLocation.fallbackLevel,
        originalIntent: resolvedLocation.originalIntent,
        hierarchy: {
          province: resolvedLocation.province.name,
          city: resolvedLocation.city?.name,
          suburb: resolvedLocation.suburb?.name,
        },
        ids: {
          provinceId: resolvedLocation.province.id,
          cityId: resolvedLocation.city?.id,
          suburbId: resolvedLocation.suburb?.id,
        },
      };
    }

    const searchResults: SearchResults = {
      properties: transformedProperties,
      total,
      page,
      pageSize,
      hasMore,
      locationContext,
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
  private buildFilterConditions(
    filters: PropertyFilters,
    locationIds: Array<{
      provinceId?: number;
      provinceName?: string;
      cityId?: number;
      cityName?: string;
      suburbId?: number;
      suburbName?: string;
    }> = [],
  ): SQL[] {
    const conditions: SQL[] = [];

    // Only show published/available properties by default
    conditions.push(or(eq(properties.status, 'available'), eq(properties.status, 'published'))!);

    // Location filters - Use Hybrid Approach (ID OR Text) to handle legitimate legacy data

    // Location filters - Use Hybrid Approach (ID OR Text)

    // We collect all location conditions and OR them together
    const locationConditions: SQL[] = [];

    // 1. Process Resolved IDs (Multi-select support)
    if (locationIds.length > 0) {
      for (const loc of locationIds) {
        // Determine the most specific level for this location object
        if (loc.suburbId) {
          locationConditions.push(eq(properties.suburbId, loc.suburbId));
        } else if (loc.cityId) {
          if (loc.cityName) {
            locationConditions.push(
              or(
                eq(properties.cityId, loc.cityId),
                sql`LOWER(${properties.city}) = LOWER(${loc.cityName})`,
              )!,
            );
          } else {
            locationConditions.push(eq(properties.cityId, loc.cityId));
          }
        } else if (loc.provinceId) {
          if (loc.provinceName) {
            locationConditions.push(
              or(
                eq(properties.provinceId, loc.provinceId),
                sql`LOWER(${properties.province}) = LOWER(${loc.provinceName})`,
              )!,
            );
          } else {
            locationConditions.push(eq(properties.provinceId, loc.provinceId));
          }
        }
      }
    }

    // 2. Process Text Fallbacks (if no IDs found or explicit text overrides)
    // Legacy support for single text filters if not covered by ID list
    if (locationIds.length === 0) {
      if (filters.province) {
        locationConditions.push(sql`LOWER(${properties.province}) = LOWER(${filters.province})`);
      }
      if (filters.city) {
        locationConditions.push(sql`LOWER(${properties.city}) = LOWER(${filters.city})`);
      }
      if (filters.suburb && filters.suburb.length > 0) {
        const suburbConditions = filters.suburb.map(
          suburb => sql`LOWER(${properties.address}) LIKE LOWER(${`%${suburb}%`})`,
        );
        locationConditions.push(or(...suburbConditions)!);
      }
    }

    // 3. Process Generic 'Locations' text array (from multi-select if resolution failed)
    if (filters.locations && filters.locations.length > 0 && locationIds.length === 0) {
      // Fallback: search these strings in city or suburb (address)
      const multiTextConditions = filters.locations.map(slug => {
        // Unslugify loosely for search (replace - with space)
        const textParams = slug.replace(/-/g, ' ');
        return or(
          sql`LOWER(${properties.city}) LIKE LOWER(${`%${textParams}%`})`,
          sql`LOWER(${properties.address}) LIKE LOWER(${`%${textParams}%`})`,
        );
      });
      locationConditions.push(or(...multiTextConditions)!);
    }

    // Combine all location conditions with OR (Match ANY of the selected locations)
    if (locationConditions.length > 0) {
      conditions.push(or(...locationConditions)!);
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

    // Ownership Type (from Developments table)
    if (filters.ownershipType && filters.ownershipType.length > 0) {
      conditions.push(inArray(developments.ownershipType, filters.ownershipType));
    }

    // Structural Type (from Developments table)
    if (filters.structuralType && filters.structuralType.length > 0) {
      conditions.push(inArray(developments.structuralType, filters.structuralType));
    }

    // Floors (from Developments table)
    if (filters.floors && filters.floors.length > 0) {
      const floorMap: Record<string, number> = {
        'single-storey': 1,
        'double-storey': 2,
        triplex: 3,
      };
      const floorNums = filters.floors
        .map(f => floorMap[f])
        .filter((n): n is number => Number.isFinite(n));
      if (floorNums.length > 0) {
        conditions.push(inArray(developments.floors, floorNums));
      }
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
          sql`CAST(${properties.longitude} AS DECIMAL(11,8)) <= ${filters.bounds.east}`,
        )!,
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
    pageSize: number,
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
      hash = (hash << 5) - hash + char;
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
    byType: Record<string, number>;
    byBedrooms: Record<string, number>;
    byLocation: Array<{ name: string; slug: string; count: number }>;
    byPropertyType: Record<string, number>;
    byPriceRange: Array<{ range: string; count: number }>;
  }> {
    // Resolve location slugs to IDs for optimal queries
    // NOTE: Wrapped in try-catch - if resolver fails, fall back to text queries
    let locationIds: Array<{
      provinceId?: number;
      provinceName?: string;
      cityId?: number;
      cityName?: string;
      suburbId?: number;
      suburbName?: string;
    }> = [];
    let resolvedLocation: ResolvedLocation | null = null;
    try {
      if (baseFilters.locations && baseFilters.locations.length > 0) {
        // Quick resolve logic similar to searchProperties
        await Promise.all(
          baseFilters.locations.map(async slug => {
            // ... simplified resolution for counts ...
            const resolved = await locationResolver.resolveLocation({ citySlug: slug });
            if (resolved && (resolved.city || resolved.suburb || resolved.province)) {
              locationIds.push({
                provinceId: resolved.province?.id,
                provinceName: resolved.province?.name,
                cityId: resolved.city?.id,
                cityName: resolved.city?.name,
                suburbId: resolved.suburb?.id,
                suburbName: resolved.suburb?.name,
              });
            }
          }),
        );
      } else {
        resolvedLocation = await locationResolver.resolveLocation({
          provinceSlug: baseFilters.province,
          citySlug: baseFilters.city,
          suburbSlug: baseFilters.suburb?.[0],
        });

        if (resolvedLocation) {
          locationIds.push({
            provinceId: resolvedLocation.province?.id,
            provinceName: resolvedLocation.province?.name,
            cityId: resolvedLocation.city?.id,
            cityName: resolvedLocation.city?.name,
            suburbId: resolvedLocation.suburb?.id,
            suburbName: resolvedLocation.suburb?.name,
          });
        }
      }
    } catch (error) {
      console.error(
        '[PropertySearchService] Location resolver failed in getFilterCounts, using text fallback:',
        error,
      );
    }

    const conditions = this.buildFilterConditions(baseFilters, locationIds);

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(properties)
      .leftJoin(developments, eq(properties.developmentId, developments.id))
      .where(and(...conditions));

    const total = Number(totalResult[0]?.count || 0);

    // Get counts by property type
    const typeResults = await db
      .select({
        propertyType: properties.propertyType,
        count: sql<number>`count(*)`,
      })
      .from(properties)
      .leftJoin(developments, eq(properties.developmentId, developments.id))
      .where(and(...conditions))
      .groupBy(properties.propertyType);

    const byPropertyType: Record<string, number> = {};
    typeResults.forEach((row: any) => {
      byPropertyType[row.propertyType] = Number(row.count);
    });
    const byType = { ...byPropertyType };

    // Get counts by bedrooms
    const bedroomResults = await db
      .select({
        bedrooms: properties.bedrooms,
        count: sql<number>`count(*)`,
      })
      .from(properties)
      .leftJoin(developments, eq(properties.developmentId, developments.id))
      .where(and(...conditions))
      .groupBy(properties.bedrooms);

    const byBedrooms: Record<string, number> = {};
    bedroomResults.forEach((row: any) => {
      const beds = Number(row.bedrooms || 0);
      if (beds > 0) {
        byBedrooms[String(beds)] = Number(row.count || 0);
      }
    });

    // Get counts by nearby locations (suburbs) when city context exists
    let byLocation: Array<{ name: string; slug: string; count: number }> = [];
    if (resolvedLocation?.city?.id) {
      const citySuburbs = await db
        .select({
          id: suburbs.id,
          name: suburbs.name,
          slug: suburbs.slug,
          latitude: suburbs.latitude,
          longitude: suburbs.longitude,
        })
        .from(suburbs)
        .where(eq(suburbs.cityId, resolvedLocation.city.id))
        .orderBy(suburbs.name);

      const baseFilterNoGeo: PropertyFilters = {
        ...baseFilters,
        province: undefined,
        city: undefined,
        suburb: undefined,
        locations: undefined,
      };
      const baseNoGeoConditions = this.buildFilterConditions(baseFilterNoGeo, []);

      const currentSuburbSlug = baseFilters.suburb?.[0]?.toLowerCase();
      const currentSuburbName = resolvedLocation.suburb?.name?.toLowerCase();
      const refLat = parseCoordinate(resolvedLocation.suburb?.latitude);
      const refLng = parseCoordinate(resolvedLocation.suburb?.longitude);

      const suburbCounts = await Promise.all(
        citySuburbs.map(async suburbItem => {
          const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(properties)
            .leftJoin(developments, eq(properties.developmentId, developments.id))
            .where(and(...baseNoGeoConditions, eq(properties.suburbId, suburbItem.id)));
          const count = Number(countResult[0]?.count || 0);
          if (count <= 0) return null;

          const distanceKm =
            refLat !== null && refLng !== null
              ? (() => {
                  const lat = parseCoordinate(suburbItem.latitude);
                  const lng = parseCoordinate(suburbItem.longitude);
                  if (lat === null || lng === null) return Number.POSITIVE_INFINITY;
                  return haversineKm(refLat, refLng, lat, lng);
                })()
              : Number.POSITIVE_INFINITY;

          return {
            name: suburbItem.name,
            slug: suburbItem.slug || slugifyText(suburbItem.name),
            count,
            distanceKm,
          };
        }),
      );

      byLocation = suburbCounts
        .filter((row): row is NonNullable<typeof row> => row !== null)
        .filter(
          row =>
            row.slug.toLowerCase() !== currentSuburbSlug &&
            row.name.toLowerCase() !== currentSuburbName,
        )
        .sort((a, b) => {
          if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
          return b.count - a.count;
        })
        .slice(0, 8)
        .map(({ name, slug, count }) => ({ name, slug, count }));
    }

    if (byLocation.length === 0) {
      // Fallback to grouped locations when city context is not available
      const locationFilters: PropertyFilters = {
        ...baseFilters,
        suburb: undefined,
      };
      const locationIdsForCounts = locationIds.map(loc => ({
        provinceId: loc.provinceId,
        provinceName: loc.provinceName,
        cityId: loc.cityId,
        cityName: loc.cityName,
      }));
      const locationConditions = this.buildFilterConditions(locationFilters, locationIdsForCounts);
      const locationNameExpr = sql<string>`COALESCE(NULLIF(${suburbs.name}, ''), NULLIF(${properties.city}, ''), 'Other')`;
      const locationResults = await db
        .select({
          name: locationNameExpr,
          count: sql<number>`count(*)`,
        })
        .from(properties)
        .leftJoin(developments, eq(properties.developmentId, developments.id))
        .leftJoin(suburbs, eq(properties.suburbId, suburbs.id))
        .where(and(...locationConditions))
        .groupBy(locationNameExpr)
        .orderBy(desc(sql`count(*)`))
        .limit(12);

      byLocation = locationResults
        .map((row: any) => ({
          name: String(row.name || '').trim(),
          slug: slugifyText(String(row.name || '')),
          count: Number(row.count || 0),
        }))
        .filter(row => row.name.length > 0 && row.slug.length > 0 && row.count > 0);
    }

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
          .leftJoin(developments, eq(properties.developmentId, developments.id))
          .where(and(...rangeConditions));

        return {
          range,
          count: Number(result[0]?.count || 0),
        };
      }),
    );

    return {
      total,
      byType,
      byBedrooms,
      byLocation,
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
