import {
  canonicalPlaceSearchMembers,
  loadCanonicalPlaceSearchProjection,
  type CanonicalPlaceSearchProjection,
} from './canonicalPlaceSearchService';
/**
 * Property Search Service
 * Handles property search through assigned canonical Place identities.
 * Requirements: 2.3, 6.1, 6.2, 6.3, 7.1, 7.3, 7.4
 */

import { db } from '../db';
import {
  properties,
  developments,
  cataloguePublishers,
  developerOrganisations,
  agents,
  agencies,
  users,
} from '../../drizzle/schema';
import { eq, and, gte, lte, inArray, or, sql, SQL, desc, asc, ne } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { redisCache } from '../lib/redis';
import type {
  PropertyFilters,
  SortOption,
  SearchResults,
  Property,
  SearchCardResult,
} from '../../shared/types';
import { buildCorePropertyInformation } from '../../shared/core-property-information';
import type { ListingPropertyType } from '../../shared/listing-types';
import { normalizeFeaturesContext } from '../../shared/features-context';
import { resolveMediaDeliveryUrl } from '../_core/mediaStorage';
import { normalizeCoordinatePair } from '../../shared/location-contract';
import {
  resolvePublicPropertyEligibilities,
  type PublicPropertyEligibilityResolution,
} from './publicPropertyEligibilityService';
import { PUBLIC_PROPERTY_QUERY_BATCH_SIZE } from './approvedPublicPropertyService';
import { buildManualPropertyCardHighlights } from '../../shared/listing-highlight-registry';
import { excludeLandFromGenericPublicProjection } from './landLaunchContainmentService';
import { normalizeRentalTerms } from '../../shared/rental-terms-contract';
import { hasHomePropertyPhoto } from '../../shared/homePropertyPhoto';
import {
  buildPublicPropertyParkingFact,
  buildPublicRentalEssentials,
} from '../../shared/public-property-detail-presentation';

// Cache invalidation uses the canonical Place search namespace.
const CACHE_PREFIX = 'property:search:v11:';

const propertyOwnerAgencies = alias(agencies, 'property_owner_agencies');

type LoadSheddingSolution = Property['loadSheddingSolutions'][number];

export interface PropertySearchOptions {
  /** Apply the canonical approved source-listing public contract. */
  publicOnly: true;
  /** Require approved photo media before public pagination (homepage rail). */
  requirePhoto?: boolean;
  /** One request uses the same validated graph for scope membership and labels. */
  placeProjection?: CanonicalPlaceSearchProjection;
  /** Fresh province membership is checked against filtered inventory assignments. */
  provincePlaceId?: string;
}

/**
 * Manual-property pages must remain stable when the selected sort field ties.
 * A property ID tie-breaker prevents candidates moving between pages across
 * otherwise identical requests.
 */
export function buildManualPropertySortOrder(sortOption: SortOption): [SQL, SQL] {
  let primaryOrder: SQL;
  switch (sortOption) {
    case 'price_asc':
      primaryOrder = asc(properties.price);
      break;
    case 'price_desc':
      primaryOrder = desc(properties.price);
      break;
    case 'date_asc':
      primaryOrder = asc(properties.createdAt);
      break;
    case 'date_desc':
    default:
      primaryOrder = desc(properties.createdAt);
      break;
  }

  return [primaryOrder, asc(properties.id)];
}

function boundedPropertyIdCondition(propertyIds: readonly number[]): SQL {
  if (propertyIds.length === 0) return sql`0 = 1`;
  const conditions: SQL[] = [];
  for (let offset = 0; offset < propertyIds.length; offset += PUBLIC_PROPERTY_QUERY_BATCH_SIZE) {
    conditions.push(
      inArray(properties.id, propertyIds.slice(offset, offset + PUBLIC_PROPERTY_QUERY_BATCH_SIZE)),
    );
  }
  return conditions.length === 1 ? conditions[0] : or(...conditions)!;
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
  const propertyDetails = parseJsonObject(property.propertySettings);
  const corePropertyInformation = buildCorePropertyInformation(
    property.propertyType as ListingPropertyType | undefined,
    propertyDetails,
  );
  const parking = buildPublicPropertyParkingFact(corePropertyInformation);
  const isRentalListing =
    String(property.listingType || '')
      .trim()
      .toLowerCase() === 'rent';
  const rentalTerms = isRentalListing
    ? normalizeRentalTerms(propertyDetails.rentalTerms)
    : undefined;
  const rentalSnapshot = rentalTerms
    ? buildPublicRentalEssentials(rentalTerms).filter(
        fact => fact.key === 'availability' || fact.key === 'lease' || fact.key === 'furnishing',
      )
    : undefined;
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

  const identity =
    property.publicIdentity ||
    (property.listerType === 'private'
      ? {
          role: 'private',
          provenance: 'private',
          name: property.agent?.name || 'Private Seller',
        }
      : {
          role: 'agent',
          provenance: 'agent',
          name: property.agent?.name || 'Listing contact unavailable',
          organizationName: property.agent?.agency || null,
          avatarUrl: property.agent?.image || null,
          phone: property.agent?.phone || null,
          whatsapp: property.agent?.whatsapp || property.agent?.phone || null,
          email: property.agent?.email || null,
          agentId: Number(property.agent?.id || 0) || undefined,
          agencyId: Number(property.agent?.agencyId || 0) || undefined,
        });
  const location = [property.suburb, property.city, property.province].filter(Boolean).join(', ');
  const image = String(
    resolveMediaUrl(property.mainImage) ||
      resolveMediaUrl(property.images?.[0]?.url) ||
      property.mainImage ||
      property.images?.[0]?.url ||
      '',
  ).trim();
  const propertyId = Number(property.id || 0);

  return {
    kind: 'property',
    canonicalPlaceId: property.canonicalPlaceId || undefined,
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
    parking,
    ...(rentalSnapshot?.length ? { rentalSnapshot } : {}),
    internalAreaM2: property.internalAreaM2 || property.floorSize || undefined,
    erfSizeM2: property.erfSizeM2 || property.erfSize || undefined,
    landAreaM2: property.landAreaM2 || property.landSize || undefined,
    area: property.floorSize || property.area || undefined,
    yardSize: property.erfSize || property.yardSize || undefined,
    propertyType: property.propertyType,
    listingType: property.listingType,
    listingSource: 'manual',
    listerType: property.listerType,
    contactRole: identity.role,
    identity,
    development,
    developerBrand,
    highlights: buildManualPropertyCardHighlights({
      propertyDetails: property.propertySettings,
      legacyHighlights: property.highlights,
    }),
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
    filters: PropertyFilters,
    sortOption: SortOption = 'date_desc',
    page: number = 1,
    pageSize: number = 12,
    options: PropertySearchOptions = { publicOnly: true },
  ): Promise<SearchResults> {
    const rawFilters = filters as unknown as Record<string, unknown>;
    if (
      ['canonicalLocation', 'locations', 'province', 'city', 'suburb'].some(
        key => rawFilters[key] !== undefined,
      )
    ) {
      throw new Error('Property search accepts canonical Place IDs only.');
    }
    if (
      options.provincePlaceId &&
      filters.canonicalPlaceIds !== undefined
    ) {
      throw new Error('Province inventory scope requires the exclusive public Place boundary.');
    }

    const conditions = this.buildFilterConditions(filters);

    // Calculate pagination
    const offset = (page - 1) * pageSize;

    // Public search uses the same source-listing, approval, projection and
    // media contract as property detail. Resolve eligibility before slicing a
    // page so totals, pagination and cards cannot expose stale rows.
    const publicConditions = [
      ...conditions,
      sql`${properties.sourceListingId} IS NOT NULL`,
      sql`${properties.canonicalPlaceId} IS NOT NULL`,
      excludeLandFromGenericPublicProjection(),
    ];
    let total = 0;
    let eligiblePageIds: number[] | undefined;
    let publicResolutionById = new Map<number, PublicPropertyEligibilityResolution>();
    let placeLabels = new Map<
      string,
      import('./canonicalPlaceSearchService').CanonicalPlaceSearchLabel
    >();
    let candidateRows = await db
        .select({ id: properties.id, canonicalPlaceId: properties.canonicalPlaceId })
        .from(properties)
        .leftJoin(developments, eq(properties.developmentId, developments.id))
        .where(and(...publicConditions))
        .orderBy(...buildManualPropertySortOrder(sortOption));
      if (options.provincePlaceId) {
        // Unassigned rows cannot enter a canonical province search.
        candidateRows = candidateRows.filter(row => Boolean(row.canonicalPlaceId));
      }
      if (candidateRows.some(row => row.canonicalPlaceId)) {
        const projection =
          (!options.provincePlaceId && options.placeProjection) ||
          (await loadCanonicalPlaceSearchProjection(undefined, {
            placeIds: [
              ...(options.provincePlaceId ? [options.provincePlaceId] : []),
              ...new Set<string>(
                candidateRows.flatMap(row => (row.canonicalPlaceId ? [row.canonicalPlaceId] : [])),
              ),
            ],
          }));
        placeLabels = projection.labels;
        if (options.provincePlaceId) {
          const selected = projection.executions.get(options.provincePlaceId);
          const members = new Set(
            selected?.scope === 'province' && projection.labels.has(selected.placeId)
              ? canonicalPlaceSearchMembers(selected, projection)
              : [],
          );
          candidateRows = candidateRows.filter(
            row => row.canonicalPlaceId && members.has(row.canonicalPlaceId),
          );
        }
      }
      publicResolutionById = await resolvePublicPropertyEligibilities(
        candidateRows.map(row => Number(row.id)),
      );
      const eligibleIds = candidateRows
        .filter(row => row.canonicalPlaceId && placeLabels.has(row.canonicalPlaceId))
        .map(row => Number(row.id))
        .filter(propertyId => {
          const resolution = publicResolutionById.get(propertyId);
          return (
            resolution &&
            (!options.requirePhoto ||
              resolution.images.some(image => hasHomePropertyPhoto(image.url || image.imageUrl)))
          );
        });
      total = eligibleIds.length;
    eligiblePageIds = eligibleIds.slice(offset, offset + pageSize);

    const hasMore = offset + pageSize < total;

    // Build sort order
    const orderBy = buildManualPropertySortOrder(sortOption);

    // Execute search query
    const results = await db
      .select({
        id: properties.id,
        canonicalPlaceId: properties.canonicalPlaceId,
        title: properties.title,
        description: properties.description,
        price: properties.price,
        address: properties.publicAddress,
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
        agentSlug: agents.slug,
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
      .leftJoin(agents, and(eq(properties.agentId, agents.id), eq(agents.status, 'approved')))
      .leftJoin(agencies, and(eq(agents.agencyId, agencies.id), eq(agencies.isVerified, 1)))
      .leftJoin(users, eq(properties.ownerId, users.id))
      .leftJoin(
        propertyOwnerAgencies,
        and(eq(users.agencyId, propertyOwnerAgencies.id), eq(propertyOwnerAgencies.isVerified, 1)),
      )
      .where(
        and(
          ...publicConditions,
          ...(eligiblePageIds ? [boundedPropertyIdCondition(eligiblePageIds)] : []),
        ),
      )
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset(0);

    // Get images for properties
    const propertyIds = results.map((p: any) => Number(p.id));
    const images = propertyIds.flatMap(propertyId =>
      (publicResolutionById.get(propertyId)?.images || [])
        .filter(
          image => !options.requirePhoto || hasHomePropertyPhoto(image.url || image.imageUrl),
        )
        .map(image => ({
          propertyId,
          imageUrl: image.imageUrl || image.url,
          isPrimary: image.isPrimary,
        })),
    );

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
    const transformedProperties: Property[] = results.map((rawProperty: any) => {
      const publicResolution = publicResolutionById.get(Number(rawProperty.id));
      const placeLabel = rawProperty.canonicalPlaceId
        ? placeLabels.get(rawProperty.canonicalPlaceId)
        : undefined;
      const prop = publicResolution
        ? { ...rawProperty, ...publicResolution.property }
        : rawProperty;
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
      const erfSize = coreErfArea || asPositiveNumber(prop.erfSizeM2);
      const landSize = coreLandArea || asPositiveNumber(prop.landAreaM2);

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

      const explicitSecurityEstate = hasCanonicalStep4
        ? featuresContext.context.securityProfile === 'security_estate'
          ? true
          : featuresContext.context.securityProfile === 'gated_community' ||
              featuresContext.context.securityProfile === 'standard'
            ? false
            : undefined
        : details.securityEstate === true
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
      // Public card images come from approved media resolved by eligibility.

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
      const publicIdentity = publicResolution?.publicIdentity;
      const storedBadges = Array.isArray(details.badges) ? details.badges : [];
      const publicCoordinates = normalizeCoordinatePair(prop.latitude, prop.longitude);
      // Public geography comes from the admitted Place projection. Keep the
      // canonical locality label for exact and approximate locations.
      const canonicalPublicSuburb =
        placeLabel?.locality || '';

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
        canonicalPlaceId: rawProperty.canonicalPlaceId || undefined,
        suburb: placeLabel ? placeLabel.locality : canonicalPublicSuburb,
        city: placeLabel?.city || '',
        province: placeLabel?.province || '',
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
        publicIdentity,
        listerType:
          publicIdentity?.role ||
          (hasAgentIdentity
            ? prop.agencyName || ownerAgencyName
              ? 'agency'
              : 'agent'
            : undefined),
        agent:
          publicIdentity?.role === 'agent'
            ? {
                id: String(publicIdentity.agentId),
                name: publicIdentity.name,
                agency: String(publicIdentity.organizationName || ''),
                phone: String(publicIdentity.phone || ''),
                whatsapp: String(publicIdentity.whatsapp || ''),
                email: String(publicIdentity.email || ''),
                image: publicIdentity.avatarUrl || undefined,
                agencyId: publicIdentity.agencyId,
                slug: publicIdentity.agentSlug || undefined,
              }
            : !publicIdentity && hasAgentIdentity
              ? {
                  id: String(prop.agentId || prop.ownerId || 0),
                  name: publicContactName,
                  agency: String(prop.agencyName || ownerAgencyName || ''),
                  phone: String(prop.agentPhone || ''),
                  whatsapp: String(prop.agentWhatsapp || ''),
                  email: String(prop.agentEmail || ''),
                  image: prop.agentProfileImage || undefined,
                  slug: prop.agentSlug || undefined,
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

    const searchResults: SearchResults = {
      properties: transformedProperties,
      cards: transformedProperties.map(buildPropertySearchCardResult),
      total,
      page,
      pageSize,
      hasMore,
    };

    return searchResults;
  }

  /**
   * Build filter conditions from PropertyFilters
   * Supports all filter types: location, price, bedrooms, SA-specific
   * Uses hybrid approach: ID-based queries when available, text fallback otherwise
   */
  private buildFilterConditions(filters: PropertyFilters): SQL[] {
    const conditions: SQL[] = [];
    if (filters.canonicalPlaceIds !== undefined) {
      conditions.push(
        filters.canonicalPlaceIds.length
          ? inArray(properties.canonicalPlaceId, filters.canonicalPlaceIds)
          : sql`0 = 1`,
      );
    }

    // Only show published/available properties by default
    conditions.push(or(eq(properties.status, 'available'), eq(properties.status, 'published'))!);
    // Commercial leasing has a separate Asset → Space → Availability public
    // authority. Generic property projections are never a valid Commercial
    // search source, even when an old mirror still exists.
    conditions.push(ne(properties.propertyType, 'commercial'));
    // Geography filters accept canonical Place IDs only.

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
