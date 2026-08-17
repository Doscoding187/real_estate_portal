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
  cataloguePublishers,
  developerOrganisations,
  agents,
  agencies,
  users,
  suburbs,
} from '../../drizzle/schema';
import { eq, and, gte, lte, inArray, or, sql, SQL, desc, asc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { redisCache, CacheTTL } from '../lib/redis';
import type {
  PropertyFilters,
  SortOption,
  SearchResults,
  Property,
  SearchCardResult,
} from '../../shared/types';
import { locationResolver, ResolvedLocation } from './locationResolverService';
import {
  getSearchAreaQueryMembers,
  type PublicSearchQueryBoundary,
} from './searchAreaQueryBoundary';
import { buildCorePropertyInformation } from '../../shared/core-property-information';
import type { ListingPropertyType } from '../../shared/listing-types';
import { normalizeFeaturesContext } from '../../shared/features-context';
import { resolveMediaDeliveryUrl } from '../_core/mediaStorage';
import { normalizeCoordinatePair } from '../../shared/location-contract';
import { resolveApprovedPublicPropertyIds } from './approvedPublicPropertyService';

// Cache key prefix for property searches
// Authority version: v7 applies canonical approved public-property
// eligibility before returning search totals/pages. It also preserves
// fractional approved bathroom projections,
// routes approved image-mirror storage keys through the configured media
// adapter, and keeps missing/invalid public coordinates nullable. Advancing the
// namespace prevents a cached v5 payload with numeric-zero missing coordinates
// surviving this correction.
const CACHE_PREFIX = 'property:search:v7:';

const propertyOwnerAgencies = alias(agencies, 'property_owner_agencies');

type LoadSheddingSolution = Property['loadSheddingSolutions'][number];

type ManualPropertyFilters = PropertyFilters & {
  /** Internal route option; never inferred from listing or revision state. */
  featuredOnly?: boolean;
};

export interface PropertySearchOptions {
  /** Apply the canonical approved source-listing public contract. */
  publicOnly?: boolean;
}

type QueryLocationIds = Array<{
  provinceId?: number;
  provinceName?: string;
  cityId?: number;
  cityName?: string;
  suburbId?: number;
  suburbName?: string;
  canonicalOnly?: boolean;
}>;

function queryLocationIdsFromBoundary(boundary: PublicSearchQueryBoundary): QueryLocationIds {
  if (boundary.kind === 'canonical_members') {
    return getSearchAreaQueryMembers(boundary).map(member => ({
      ...(member.provinceId !== undefined ? { provinceId: member.provinceId } : {}),
      ...(member.provinceName ? { provinceName: member.provinceName } : {}),
      ...(member.cityId !== undefined ? { cityId: member.cityId } : {}),
      ...(member.cityName ? { cityName: member.cityName } : {}),
      ...(member.suburbId !== undefined ? { suburbId: member.suburbId } : {}),
      ...(member.suburbName ? { suburbName: member.suburbName } : {}),
      canonicalOnly: true,
    }));
  }

  return boundary.members.map(member => ({
    provinceId: member.provinceId,
    provinceName: member.provinceName,
    cityId: member.cityId,
    cityName: member.cityName,
    suburbId: member.suburbId,
    suburbName: member.suburbName,
    canonicalOnly: true,
  }));
}

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

/**
 * Listing-backed public projections preserve fractional bathroom facts in the
 * approval-written JSON snapshot. The legacy scalar column is INT and can
 * round 2.5 to 3, so it is not authoritative for canonical PLE inventory.
 * Unlinked inventory keeps the explicit legacy scalar path.
 */
function resolvePublicSearchBathrooms(property: {
  sourceListingId?: unknown;
  bathrooms?: unknown;
  propertySettings?: unknown;
  propertyType?: ListingPropertyType;
}): number | undefined {
  if (property.sourceListingId == null) return asPositiveNumber(property.bathrooms);

  const details = parseJsonObject(property.propertySettings);
  const core = buildCorePropertyInformation(property.propertyType, details);
  const value = core.bathrooms?.status === 'known' ? Number(core.bathrooms.value) : undefined;
  return asPositiveNumber(value);
}

/** Keep bathroom filtering on the same approved fact that cards expose. */
function publicSearchBathroomsExpression() {
  return sql<number | null>`CASE
    WHEN ${properties.sourceListingId} IS NULL THEN ${properties.bathrooms}
    WHEN JSON_VALID(${properties.propertySettings}) = 1
      AND JSON_UNQUOTE(JSON_EXTRACT(${properties.propertySettings}, '$.corePropertyInformation.bathrooms.status')) = 'known' THEN
      CAST(JSON_UNQUOTE(JSON_EXTRACT(${properties.propertySettings}, '$.corePropertyInformation.bathrooms.value')) AS DECIMAL(3,1))
    ELSE NULL
  END`;
}

function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(v => String(v ?? '').trim()).filter(Boolean);
  }
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map(v => String(v ?? '').trim()).filter(Boolean);
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
  const canonical = normalizeFeaturesContext(details.featuresContext, details);
  const powerBackup = String(
    canonical.utilities.backupPower ?? details.powerBackup ?? '',
  ).toLowerCase();
  if (powerBackup === 'none') solutions.add('none');
  if (powerBackup.includes('solar')) solutions.add('solar');
  if (powerBackup.includes('generator')) solutions.add('generator');
  if (powerBackup.includes('inverter') || powerBackup.includes('battery')) {
    solutions.add('inverter');
  }
  return Array.from(solutions);
}

function resolveMediaUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return undefined;
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('/')) return trimmed;

  return resolveMediaDeliveryUrl(trimmed) || undefined;
}

function buildPropertySearchCardResult(property: any): SearchCardResult {
  const publicCoordinates = normalizeCoordinatePair(property.latitude, property.longitude);
  const development = property.development
    ? {
        id: property.development.id ?? null,
        name: property.development.name ?? null,
        slug: property.development.slug ?? null,
      }
    : undefined;
  const developerBrand = property.developerBrand
    ? {
        id: property.developerBrand.id ?? null,
        brandName: property.developerBrand.brandName,
        slug: property.developerBrand.slug ?? null,
        logoUrl: property.developerBrand.logoUrl ?? null,
        publicContactEmail: property.developerBrand.publicContactEmail ?? null,
        publicContactPhone: property.developerBrand.publicContactPhone ?? null,
      }
    : undefined;

  const isPrivate = property.listerType === 'private';
  const isPlatform = property.listerType === 'platform' || !property.agent?.name;
  const identityName = isPrivate
    ? property.agent?.name || 'Private Seller'
    : isPlatform
      ? 'Property Listify'
      : property.agent?.name;
  const identityRole: SearchCardResult['contactRole'] = isPrivate
    ? 'private'
    : isPlatform
      ? 'platform'
      : 'agent';
  const location = [property.suburb, property.city, property.province].filter(Boolean).join(', ');
  const image = String(
    resolveMediaUrl(property.mainImage) ||
      resolveMediaUrl(property.images?.[0]?.url) ||
      property.mainImage ||
      property.images?.[0]?.url ||
      '',
  ).trim();
  const propertyId = Number(property.id || 0);
  const agentId = Number(property.agent?.id || 0);
  const agencyId = Number(property.agent?.agencyId || 0);

  return {
    kind: 'property',
    id: String(property.id),
    href: `/property/${property.id}`,
    title: String(property.title || '').trim(),
    location,
    address: property.address || undefined,
    city: String(property.city || '').trim(),
    suburb: String(property.suburb || property.city || '').trim(),
    province: String(property.province || '').trim(),
    price: Number(property.price || 0),
    image,
    images: Array.isArray(property.images) ? property.images : [],
    description: property.description || undefined,
    bedrooms: property.bedrooms || undefined,
    bathrooms: property.bathrooms || undefined,
    internalAreaM2: property.internalAreaM2 || property.floorSize || undefined,
    erfSizeM2: property.erfSizeM2 || property.erfSize || undefined,
    landAreaM2: property.landAreaM2 || property.landSize || undefined,
    area: property.floorSize || property.area || undefined,
    yardSize: property.erfSize || property.yardSize || undefined,
    propertyType: property.propertyType,
    listingType: property.listingType,
    listingSource: 'manual',
    listerType: property.listerType,
    contactRole: identityRole,
    identity: {
      role: identityRole,
      name: identityName,
      avatarUrl: property.agent?.image || null,
      phone: property.agent?.phone || null,
      whatsapp: property.agent?.whatsapp || property.agent?.phone || null,
      email: property.agent?.email || null,
      agentId: Number.isFinite(agentId) && agentId > 0 ? agentId : undefined,
      agencyId: Number.isFinite(agencyId) && agencyId > 0 ? agencyId : undefined,
    },
    development,
    developerBrand,
    highlights: Array.isArray(property.highlights) ? property.highlights : [],
    badges: Array.isArray(property.badges) ? property.badges : [],
    imageCount: Array.isArray(property.images) ? property.images.length : 0,
    videoCount: Number(property.videoCount || 0),
    transactionType: property.transactionType || property.listingType,
    listedDate:
      property.listedDate instanceof Date
        ? property.listedDate
        : new Date(property.listedDate || 0),
    latitude: publicCoordinates?.latitude,
    longitude: publicCoordinates?.longitude,
    propertyId: Number.isFinite(propertyId) && propertyId > 0 ? propertyId : undefined,
    developmentId:
      Number.isFinite(Number(property.developmentId)) && Number(property.developmentId) > 0
        ? Number(property.developmentId)
        : undefined,
  };
}

export class PropertySearchService {
  /**
   * Search properties with filters, sorting, and pagination
   * Requirements: 2.3 (sorting), 6.1-6.3 (pagination), 7.1 (result count)
   */
  async searchProperties(
    filters: ManualPropertyFilters,
    sortOption: SortOption = 'date_desc',
    page: number = 1,
    pageSize: number = 12,
    queryBoundary?: PublicSearchQueryBoundary,
    options: PropertySearchOptions = {},
  ): Promise<SearchResults> {
    if (queryBoundary && queryLocationIdsFromBoundary(queryBoundary).length === 0) {
      return {
        properties: [],
        cards: [],
        total: 0,
        page,
        pageSize,
        hasMore: false,
      };
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(
      filters,
      sortOption,
      page,
      pageSize,
      queryBoundary,
      options,
    );

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
        cards: (cached.cards || []).map((card: any) => ({
          ...card,
          listedDate:
            card?.listedDate instanceof Date
              ? card.listedDate
              : card?.listedDate
                ? new Date(card.listedDate)
                : new Date(0),
        })),
      };
    }

    // Resolve location slugs to IDs for optimal queries
    // NOTE: Wrapped in try-catch - if resolver fails, fall back to text queries
    const locationIds: QueryLocationIds = queryBoundary
      ? queryLocationIdsFromBoundary(queryBoundary)
      : [];
    let resolvedLocation: ResolvedLocation | null = null;

    if (queryBoundary) {
      // Search Area boundaries are already resolved by the server authority.
      // Never fall back to a parent or to text when the boundary is present.
    } else if (filters.canonicalLocation) {
      locationIds.push({
        provinceId: filters.canonicalLocation.provinceId,
        cityId: filters.canonicalLocation.cityId,
        suburbId: filters.canonicalLocation.suburbId,
      });
    } else {
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
    }

    // Build query conditions with resolved location IDs
    const conditions = this.buildFilterConditions(filters, locationIds);

    // Calculate pagination
    const offset = (page - 1) * pageSize;

    // Public search uses the same source-listing, approval, projection and
    // media contract as property detail. Resolve eligibility before slicing a
    // page so totals, pagination and cards cannot expose stale rows.
    const publicConditions = options.publicOnly
      ? [...conditions, sql`${properties.sourceListingId} IS NOT NULL`]
      : conditions;
    let total = 0;
    let eligiblePageIds: number[] | undefined;
    if (options.publicOnly) {
      const candidateRows = await db
        .select({ id: properties.id })
        .from(properties)
        .leftJoin(developments, eq(properties.developmentId, developments.id))
        .where(and(...publicConditions))
        .orderBy(this.buildSortOrder(sortOption));
      const eligibleIds = await resolveApprovedPublicPropertyIds(
        candidateRows.map(row => Number(row.id)),
      );
      total = eligibleIds.length;
      eligiblePageIds = eligibleIds.slice(offset, offset + pageSize);
    } else {
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(properties)
        .leftJoin(developments, eq(properties.developmentId, developments.id))
        .where(and(...conditions));
      total = Number(countResult[0]?.count || 0);
    }

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
        suburb: sql<string>`COALESCE(NULLIF(${suburbs.name}, ''), NULLIF(${properties.city}, ''), '')`,
        address: properties.publicAddress,
        city: properties.city,
        province: properties.province,
        propertyType: properties.propertyType,
        listingType: properties.listingType,
        bedrooms: properties.bedrooms,
        bathrooms: publicSearchBathroomsExpression(),
        developmentId: properties.developmentId,
        developmentName: developments.name,
        developmentSlug: developments.slug,
        developerId: sql<number | null>`NULL`,
        developerName: developerOrganisations.name,
        developerLogo: developerOrganisations.logo,
        // New listings use typed measurement columns. COALESCE keeps old
        // published rows searchable through the legacy `area` field until
        // their source listing is republished with canonical facts.
        erfSize: sql<number>`CAST(COALESCE(${properties.erfSizeM2}, ${properties.area}) AS DECIMAL(14,2))`,
        floorSize: sql<number>`CAST(COALESCE(${properties.internalAreaM2}, ${properties.area}) AS DECIMAL(14,2))`,
        landSize: sql<number>`CAST(COALESCE(${properties.landAreaM2}, ${properties.area}) AS DECIMAL(14,2))`,
        internalAreaM2: properties.internalAreaM2,
        erfSizeM2: properties.erfSizeM2,
        landAreaM2: properties.landAreaM2,
        titleType: sql<null>`NULL`,
        levy: properties.levies,
        rates: properties.ratesAndTaxes,
        securityEstate: sql<null>`NULL`,
        petFriendly: sql<null>`NULL`,
        fibreReady: sql<null>`NULL`,
        loadSheddingSolutions: sql<
          Array<'solar' | 'generator' | 'inverter' | 'none'>
        >`JSON_ARRAY()`,
        videoCount: sql<number>`CASE WHEN ${properties.videoUrl} IS NOT NULL THEN 1 ELSE 0 END`,
        status: properties.status,
        listedDate: properties.createdAt,
        latitude: sql<number | null>`CAST(${properties.publicLatitude} AS DECIMAL(10,8))`,
        longitude: sql<number | null>`CAST(${properties.publicLongitude} AS DECIMAL(11,8))`,
        highlights: properties.amenities,
        amenities: properties.amenities,
        mainImage: properties.mainImage,
        sourceListingId: properties.sourceListingId,
        ownerId: properties.ownerId,
        propertySettings: properties.propertySettings,
        agentDisplayName: agents.displayName,
        agentFirstName: agents.firstName,
        agentLastName: agents.lastName,
        agentPhone: agents.phone,
        agentWhatsapp: agents.whatsapp,
        agentEmail: agents.email,
        agentProfileImage: agents.profileImage,
        agencyName: agencies.name,
        ownerName: users.name,
        ownerFirstName: users.firstName,
        ownerLastName: users.lastName,
        ownerAgencyId: propertyOwnerAgencies.id,
        ownerAgencyName: propertyOwnerAgencies.name,
        agentId: properties.agentId,
        cataloguePublisherId: sql<number>`COALESCE(${properties.cataloguePublisherId}, ${developments.cataloguePublisherId})`,
        builderBrandName: cataloguePublishers.name,
        builderLogoUrl: cataloguePublishers.logoUrl,
        builderSlug: cataloguePublishers.slug,
        builderPublicContactEmail: cataloguePublishers.publicContactEmail,
      })
      .from(properties)
      .leftJoin(developments, eq(properties.developmentId, developments.id))
      .leftJoin(
        cataloguePublishers,
        sql`${cataloguePublishers.id} = COALESCE(${properties.cataloguePublisherId}, ${developments.cataloguePublisherId})`,
      )
      .leftJoin(
        developerOrganisations,
        eq(cataloguePublishers.developerOrganisationId, developerOrganisations.id),
      )
      .leftJoin(suburbs, eq(properties.suburbId, suburbs.id))
      .leftJoin(agents, and(eq(properties.agentId, agents.id), eq(agents.status, 'approved')))
      .leftJoin(agencies, and(eq(agents.agencyId, agencies.id), eq(agencies.isVerified, 1)))
      .leftJoin(users, eq(properties.ownerId, users.id))
      .leftJoin(
        propertyOwnerAgencies,
        and(
          eq(users.agencyId, propertyOwnerAgencies.id),
          eq(propertyOwnerAgencies.isVerified, 1),
        ),
      )
      .where(
        and(
          ...publicConditions,
          ...(eligiblePageIds ? [inArray(properties.id, eligiblePageIds)] : []),
        ),
      )
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(options.publicOnly ? 0 : offset);

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
      const featuresContext = normalizeFeaturesContext(details.featuresContext, details);
      const hasCanonicalStep4 =
        details.featuresContext && typeof details.featuresContext === 'object';
      const core = buildCorePropertyInformation(prop.propertyType, details);
      const coreInternalArea =
        core.internalArea?.status === 'known' ? Number(core.internalArea.valueM2) : undefined;
      const coreErfArea =
        core.erfArea?.status === 'known' ? Number(core.erfArea.valueM2) : undefined;
      const coreLandArea =
        core.farmLandArea?.status === 'known' ? Number(core.farmLandArea.normalizedM2) : undefined;
      const floorSize =
        coreInternalArea ||
        asPositiveNumber(prop.internalAreaM2) ||
        asPositiveNumber(prop.floorSize);
      const erfSize =
        coreErfArea || asPositiveNumber(prop.erfSizeM2) || asPositiveNumber(prop.erfSize);
      const landSize =
        coreLandArea || asPositiveNumber(prop.landAreaM2) || asPositiveNumber(prop.landSize);

      const securityTokens = (
        hasCanonicalStep4
          ? featuresContext.security.features
          : parseStringList(details.securityFeatures)
      ).map(v => v.toLowerCase());
      const amenityTokens = [
        ...parseStringList(details.amenities),
        ...parseStringList(details.amenitiesFeatures),
        ...parseStringList(prop.amenities),
      ].map(v => v.toLowerCase());

      const internetAvailability = String(
        hasCanonicalStep4
          ? (featuresContext.utilities.internetAccess ?? '')
          : (details.internetAvailability ?? details.internetAccess ?? ''),
      ).toLowerCase();

      const explicitSecurityEstate =
        details.securityEstate === true
          ? true
          : details.securityEstate === false
            ? false
            : undefined;
      const canonicalPetPolicy = hasCanonicalStep4 ? featuresContext.petPolicy : undefined;
      const petFriendly = hasCanonicalStep4
        ? canonicalPetPolicy === 'allowed'
          ? true
          : canonicalPetPolicy === 'not_allowed'
            ? false
            : undefined
        : details.petFriendly === true
          ? true
          : details.petFriendly === false || details.petPolicy === 'no_pets'
            ? false
            : details.petPolicy === 'allowed'
              ? true
              : undefined;
      const fibreReady = hasCanonicalStep4
        ? featuresContext.utilities.internetAccess === 'fibre'
          ? true
          : featuresContext.utilities.internetAccess === 'none'
            ? false
            : undefined
        : details.fibreReady === true
          ? true
          : details.fibreReady === false
            ? false
            : amenityTokens.some(token => token.includes('fibre') || token.includes('fiber'))
              ? true
              : undefined;

      const highlights = uniqueStrings([
        ...(hasCanonicalStep4
          ? featuresContext.highlights.map(value => value.replace(/_/g, ' '))
          : [
              ...parseStringList(prop.highlights),
              ...parseStringList(details.propertyHighlights),
              ...parseStringList(details.amenitiesFeatures),
              ...parseStringList(details.securityFeatures),
              ...parseStringList(details.outdoorFeatures),
            ]),
      ]);

      const primaryImage: Array<{ url: string; thumbnailUrl: string }> = [];
      for (const img of imagesByProperty.get(Number(prop.id)) || []) {
        const resolvedImageUrl = resolveMediaUrl((img as any).imageUrl);
        if (!resolvedImageUrl) continue;
        primaryImage.push({
          url: resolvedImageUrl,
          thumbnailUrl: resolvedImageUrl,
        });
      }
      // Canonical PLE card images are owned by propertyImages. Only the
      // explicit unlinked legacy path may use the historical properties.mainImage.
      const legacyMainImage =
        prop.sourceListingId == null ? resolveMediaUrl(prop.mainImage) : undefined;
      if (primaryImage.length === 0 && legacyMainImage) {
        primaryImage.push({ url: legacyMainImage, thumbnailUrl: legacyMainImage });
      }

      const agentName = (
        String(prop.agentDisplayName || '').trim() ||
        [prop.agentFirstName, prop.agentLastName].filter(Boolean).join(' ').trim()
      ).trim();
      const ownerName = (
        String(prop.ownerName || '').trim() ||
        [prop.ownerFirstName, prop.ownerLastName].filter(Boolean).join(' ').trim()
      ).trim();
      const ownerAgencyName = String(prop.ownerAgencyName || '').trim();
      // An owner name alone is not a public recipient signal. Only expose the
      // owner identity when it is backed by a verified agency relationship;
      // otherwise custody remains platform/attention-review as appropriate.
      const publicContactName = agentName || (ownerAgencyName ? ownerName || ownerAgencyName : '');
      const developerName = String(prop.developerName || '').trim();
      const developerLogo = prop.developerLogo || undefined;
      const builderName = String(prop.builderBrandName || '').trim() || developerName;
      const builderLogo = prop.builderLogoUrl || developerLogo;

      const hasAgentIdentity = !!publicContactName;
      const storedBadges = Array.isArray(details.badges) ? details.badges : [];
      const publicCoordinates = normalizeCoordinatePair(prop.latitude, prop.longitude);

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

      const cataloguePublisherId = Number(prop.cataloguePublisherId || 0);
      const developerBrand =
        Number.isFinite(cataloguePublisherId) && cataloguePublisherId > 0
          ? {
              id: cataloguePublisherId,
              brandName: builderName || 'Developer',
              slug:
                String(prop.builderSlug || '').trim() || slugifyText(builderName || 'developer'),
              logoUrl: prop.builderLogoUrl || null,
              publicContactEmail: String(prop.builderPublicContactEmail || '').trim() || null,
            }
          : undefined;

      const titleType: Property['titleType'] = String(
        details.ownershipType || details.titleType || '',
      )
        .toLowerCase()
        .includes('sectional')
        ? 'sectional'
        : String(details.ownershipType || details.titleType || '')
              .toLowerCase()
              .includes('freehold')
          ? 'freehold'
          : undefined;

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
        bathrooms: resolvePublicSearchBathrooms(prop),
        internalAreaM2: floorSize || undefined,
        erfSizeM2: erfSize || undefined,
        landAreaM2: landSize || undefined,
        erfSize: erfSize || undefined,
        floorSize: floorSize || undefined,
        titleType,
        levy: prop.levy || undefined,
        rates: prop.rates || undefined,
        securityEstate: explicitSecurityEstate,
        petFriendly,
        fibreReady,
        loadSheddingSolutions: deriveLoadSheddingSolutions(details),
        images: primaryImage,
        mainImage: primaryImage[0]?.url || undefined,
        videoCount: Number(prop.videoCount || 0),
        status: this.mapStatus(prop.status),
        listedDate: new Date(prop.listedDate),
        listingSource: 'manual',
        listerType: hasAgentIdentity
          ? prop.agencyName || ownerAgencyName
            ? 'agency'
            : 'agent'
          : 'platform',
        agent: hasAgentIdentity
          ? {
              id: String(prop.agentId || prop.ownerId || 0),
              name: publicContactName,
              agency: String(prop.agencyName || ownerAgencyName || ''),
              phone: String(prop.agentPhone || ''),
              whatsapp: String(prop.agentWhatsapp || ''),
              email: String(prop.agentEmail || ''),
              image: prop.agentProfileImage || undefined,
            }
          : undefined,
        developerBrand,
        development,
        developmentId:
          Number.isFinite(developmentId) && developmentId > 0 ? developmentId : undefined,
        badges: uniqueStrings([
          ...storedBadges.map((badge: any) => String(badge ?? '').trim()),
          development?.name ? `Part of ${development.name}` : '',
        ]),
        latitude: publicCoordinates?.latitude ?? null,
        longitude: publicCoordinates?.longitude ?? null,
        highlights,
        area: floorSize || undefined,
        yardSize: erfSize || landSize || undefined,
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
      cards: transformedProperties.map(buildPropertySearchCardResult),
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

  /** Return featured manual inventory through the same projection-only read path. */
  async searchFeaturedProperties(limit: number = 6): Promise<Property[]> {
    const pageSize = Math.max(1, Math.min(50, Math.floor(limit)));
    const results = await this.searchProperties(
      { featuredOnly: true },
      'date_desc',
      1,
      pageSize,
      undefined,
      { publicOnly: true },
    );
    return results.properties;
  }

  /**
   * Build filter conditions from PropertyFilters
   * Supports all filter types: location, price, bedrooms, SA-specific
   * Uses hybrid approach: ID-based queries when available, text fallback otherwise
   */
  private buildFilterConditions(
    filters: ManualPropertyFilters,
    locationIds: QueryLocationIds = [],
  ): SQL[] {
    const conditions: SQL[] = [];

    // Only show published/available properties by default
    conditions.push(or(eq(properties.status, 'available'), eq(properties.status, 'published'))!);
    if (filters.featuredOnly) conditions.push(eq(properties.featured, 1));

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
          if (loc.cityName && !filters.canonicalLocation && !loc.canonicalOnly) {
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
          if (loc.provinceName && !filters.canonicalLocation && !loc.canonicalOnly) {
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
    if (locationIds.length === 0 && !filters.canonicalLocation) {
      if (filters.province) {
        locationConditions.push(sql`LOWER(${properties.province}) = LOWER(${filters.province})`);
      }
      if (filters.city) {
        locationConditions.push(sql`LOWER(${properties.city}) = LOWER(${filters.city})`);
      }
      if (filters.suburb && filters.suburb.length > 0) {
        const suburbConditions = filters.suburb.map(
          suburb => sql`LOWER(${properties.publicAddress}) LIKE LOWER(${`%${suburb}%`})`,
        );
        locationConditions.push(or(...suburbConditions)!);
      }
    }

    // 3. Process Generic 'Locations' text array (from multi-select if resolution failed)
    if (
      filters.locations &&
      filters.locations.length > 0 &&
      locationIds.length === 0 &&
      !filters.canonicalLocation
    ) {
      // Fallback: search these strings in city or suburb (address)
      const multiTextConditions = filters.locations.map(slug => {
        // Unslugify loosely for search (replace - with space)
        const textParams = slug.replace(/-/g, ' ');
        return or(
          sql`LOWER(${properties.city}) LIKE LOWER(${`%${textParams}%`})`,
          sql`LOWER(${properties.publicAddress}) LIKE LOWER(${`%${textParams}%`})`,
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
      conditions.push(gte(publicSearchBathroomsExpression(), filters.minBathrooms));
    }
    if (filters.maxBathrooms !== undefined) {
      conditions.push(lte(publicSearchBathroomsExpression(), filters.maxBathrooms));
    }

    // Size filters use the canonical typed public measurements. The legacy
    // `area` fallback preserves older rows but is intentionally compatibility
    // only; new projections populate the specific columns.
    if (filters.minErfSize !== undefined) {
      conditions.push(
        gte(sql`COALESCE(${properties.erfSizeM2}, ${properties.area})`, filters.minErfSize),
      );
    }
    if (filters.maxErfSize !== undefined) {
      conditions.push(
        lte(sql`COALESCE(${properties.erfSizeM2}, ${properties.area})`, filters.maxErfSize),
      );
    }
    if (filters.minFloorSize !== undefined) {
      conditions.push(
        gte(sql`COALESCE(${properties.internalAreaM2}, ${properties.area})`, filters.minFloorSize),
      );
    }
    if (filters.maxFloorSize !== undefined) {
      conditions.push(
        lte(sql`COALESCE(${properties.internalAreaM2}, ${properties.area})`, filters.maxFloorSize),
      );
    }
    if (filters.minLandSize !== undefined) {
      conditions.push(
        gte(sql`COALESCE(${properties.landAreaM2}, ${properties.area})`, filters.minLandSize),
      );
    }
    if (filters.maxLandSize !== undefined) {
      conditions.push(
        lte(sql`COALESCE(${properties.landAreaM2}, ${properties.area})`, filters.maxLandSize),
      );
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
          sql`CAST(${properties.publicLatitude} AS DECIMAL(10,8)) >= ${filters.bounds.south}`,
          sql`CAST(${properties.publicLatitude} AS DECIMAL(10,8)) <= ${filters.bounds.north}`,
          sql`CAST(${properties.publicLongitude} AS DECIMAL(11,8)) >= ${filters.bounds.west}`,
          sql`CAST(${properties.publicLongitude} AS DECIMAL(11,8)) <= ${filters.bounds.east}`,
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
        return asc(properties.publicAddress);
      case 'suburb_desc':
        return desc(properties.publicAddress);
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
    filters: ManualPropertyFilters,
    sortOption: SortOption,
    page: number,
    pageSize: number,
    queryBoundary?: PublicSearchQueryBoundary,
    options: PropertySearchOptions = {},
  ): string {
    const filterStr = JSON.stringify(filters);
    const hash = this.simpleHash(filterStr);
    const boundaryKey = queryBoundary ? `:${queryBoundary.authorityKey}` : '';
    const authorityKey = options.publicOnly ? ':public' : ':internal';
    return `${CACHE_PREFIX}${hash}${boundaryKey}${authorityKey}:${sortOption}:${page}:${pageSize}`;
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
