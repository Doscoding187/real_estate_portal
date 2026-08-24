import { and, desc, eq, inArray, or, sql, type SQL } from 'drizzle-orm';

import {
  cataloguePublishers,
  developments,
  unitTypes,
} from '../../drizzle/schema';
import {
  encodeCanonicalLocationId,
  parseCanonicalLocationId,
} from '../../shared/locationAuthority';
import {
  countUnpricedHiddenByPriceFilter,
  filterPublicDevelopmentSearchItems,
  paginatePublicDevelopmentSearchItems,
  projectPublicDevelopmentFacts,
  sortPublicDevelopmentSearchItems,
  type PublicDevelopmentSearchAvailability,
  type PublicDevelopmentSearchDevelopmentType,
  type PublicDevelopmentSearchFilters,
  type PublicDevelopmentSearchItem,
  type PublicDevelopmentSearchStatus,
  type PublicDevelopmentProjectionDevelopment,
  type PublicDevelopmentProjectionUnit,
} from '../../shared/publicDevelopmentSearch';
import {
  normalizePublicSearchPageForTotal,
  normalizePublicSearchPageIndex,
  normalizePublicSearchPageSize,
} from '../../shared/publicSearchPagination';
import {
  DEFAULT_SEARCH_RESULT_SORT,
  isSearchResultSortOption,
  type SearchResultSortOption,
} from '../../shared/transactionalSearchState';
import { getDb } from '../db-connection';
import { buildDevelopmentRootPath } from './developmentRouteAuthority';
import { locationResolver, type ResolvedLocation } from './locationResolverService';
import { publicDevelopmentEligibilityConditions } from './publicDevelopmentEligibility';
import {
  buildCanonicalLocationQueryBoundary,
  buildSearchAreaQueryBoundary,
  combineSearchAreaQueryBoundaries,
  getSearchAreaQueryMembers,
  type PublicSearchQueryBoundary,
} from './searchAreaQueryBoundary';
import { searchAreaAuthority } from './searchAreaAuthority';

export interface PublicDevelopmentSearchInput {
  locationId?: string;
  locationIds?: string[];
  searchAreaId?: string;
  searchAreaIds?: string[];
  province?: string;
  city?: string;
  suburb?: string | string[];
  locations?: string[];
  /** Compatibility-only text handoff from older Discover surfaces. */
  search?: string;
  developmentType?: PublicDevelopmentSearchDevelopmentType;
  developmentStatus?: PublicDevelopmentSearchStatus;
  transactionType?: 'for_sale' | 'for_rent';
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  availability?: PublicDevelopmentSearchAvailability;
  sortOption?: SearchResultSortOption;
  page?: number;
  pageSize?: number;
  /** Legacy offset/limit callers are translated at this boundary only. */
  limit?: number;
  offset?: number;
}

type PublicDevelopmentSearchLocationContext = {
  type: 'province' | 'city' | 'suburb';
  name: string;
  slug: string;
  canonicalLocationId: string;
  confidence: 'exact';
  fallbackLevel: 'none';
  originalIntent: string;
  hierarchy: {
    province: string;
    city?: string;
    suburb?: string;
  };
  ids: {
    provinceId: number;
    cityId?: number;
    suburbId?: number;
  };
};

type PublicDevelopmentSearchMultiLocationContext = {
  kind: 'multi_location';
  level: 'province' | 'city' | 'suburb';
  parentName?: string;
  locations: Array<{
    canonicalLocationId: string;
    name: string;
    slug: string;
    type: 'province' | 'city' | 'suburb';
    parentCanonicalLocationId?: string;
  }>;
};

export interface PublicDevelopmentSearchResult {
  items: PublicDevelopmentSearchItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  /** Retained for callers that still use the old offset/limit vocabulary. */
  limit: number;
  offset: number;
  locationState: 'not_requested' | 'resolved' | 'unresolved' | 'ambiguous' | 'unavailable';
  locationMessage?: string;
  locationContext?: PublicDevelopmentSearchLocationContext;
  multiLocationContext?: PublicDevelopmentSearchMultiLocationContext;
}

type LocationResolution = {
  locationState: PublicDevelopmentSearchResult['locationState'];
  locationMessage?: string;
  boundary?: PublicSearchQueryBoundary;
  locationContext?: PublicDevelopmentSearchLocationContext;
  multiLocationContext?: PublicDevelopmentSearchMultiLocationContext;
};

type DevelopmentRow = {
  id: number;
  name: string;
  slug: string | null;
  description: string | null;
  images: unknown;
  city: string;
  suburb: string | null;
  province: string;
  developmentType: PublicDevelopmentSearchDevelopmentType;
  transactionType: 'for_sale' | 'for_rent' | 'auction';
  status: PublicDevelopmentSearchStatus;
  nature: 'new' | 'phase' | 'extension' | 'redevelopment';
  completionDate: string | null;
  createdAt: string;
  isFeatured: number | null;
  rating: string | number | null;
  highlights: unknown;
  cataloguePublisherId: number | null;
  publisherName: string | null;
  publisherLogoUrl: string | null;
  publisherAuthorityKind: 'platform_reference' | 'developer_first_party' | null;
  publisherSlug?: string | null;
  publisherWebsiteUrl?: string | null;
  publisherDescription?: string | null;
  publisherSourceAttribution?: string | null;
  publisherLastVerifiedAt?: string | null;
  publisherFoundedYear?: number | null;
  publisherHeadOfficeLocation?: string | null;
  address?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  showHouseAddress?: number | null;
  gpsAccuracy?: 'accurate' | 'approximate' | null;
  videos?: unknown;
  floorPlans?: unknown;
  brochures?: unknown;
  amenities?: unknown;
  estateSpecs?: unknown;
  ownershipType?: string | null;
  structuralType?: string | null;
  floors?: number | null;
  marketingRole?: 'exclusive' | 'joint' | 'open' | null;
  isPublished?: number;
  approvalStatus?: 'draft' | 'pending' | 'approved' | 'rejected' | null;
};

type UnitRow = {
  id: string;
  developmentId: number;
  name: string;
  label: string | null;
  bedrooms: number;
  bathrooms: string | number;
  basePriceFrom: string | number;
  basePriceTo: string | number | null;
  monthlyRentFrom: string | number | null;
  monthlyRentTo: string | number | null;
  totalUnits: number | null;
  availableUnits: number | null;
  reservedUnits: number | null;
  displayOrder: number | null;
  unitSize?: number | null;
  yardSize?: number | null;
  baseFeatures?: unknown;
  baseFinishes?: unknown;
  baseMedia?: unknown;
  extras?: unknown;
  ownershipType?: string | null;
  structuralType?: string | null;
  floors?: string | null;
  configDescription?: string | null;
  description?: string | null;
  virtualTourLink?: string | null;
  specOverrides?: unknown;
  specifications?: unknown;
  amenities?: unknown;
  features?: unknown;
  parkingType?: string | null;
  parkingBays?: number | null;
  completionDate?: string | null;
  monthlyRent?: number | string | null;
};

function finiteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}


function canonicalLocationIdForResolvedLocation(location: ResolvedLocation): string | null {
  if (location.level === 'province') {
    return encodeCanonicalLocationId('province', location.province.id);
  }
  if (location.level === 'city' && location.city) {
    return encodeCanonicalLocationId('city', location.city.id);
  }
  if (location.level === 'suburb' && location.suburb) {
    return encodeCanonicalLocationId('suburb', location.suburb.id);
  }
  return null;
}

function toLocationContext(location: ResolvedLocation): PublicDevelopmentSearchLocationContext | undefined {
  const selected = location.suburb || location.city || location.province;
  const canonicalLocationId = canonicalLocationIdForResolvedLocation(location);
  if (!canonicalLocationId) return undefined;

  return {
    type: location.level,
    name: selected.name,
    slug: selected.slug,
    canonicalLocationId,
    confidence: 'exact',
    fallbackLevel: 'none',
    originalIntent: location.originalIntent,
    hierarchy: {
      province: location.province.name,
      city: location.city?.name,
      suburb: location.suburb?.name,
    },
    ids: {
      provinceId: location.province.id,
      cityId: location.city?.id,
      suburbId: location.suburb?.id,
    },
  };
}

function toMultiLocationContext(
  locations: readonly ResolvedLocation[],
  canonicalLocationIds: readonly string[],
): PublicDevelopmentSearchMultiLocationContext | undefined {
  if (locations.length === 0 || locations.length !== canonicalLocationIds.length) return undefined;

  const first = locations[0];
  const mapped = locations.map((location, index) => {
    const selected = location.suburb || location.city || location.province;
    const parentCanonicalLocationId =
      location.level === 'city'
        ? encodeCanonicalLocationId('province', location.province.id)
        : location.level === 'suburb' && location.city
          ? encodeCanonicalLocationId('city', location.city.id)
          : undefined;

    return {
      canonicalLocationId: canonicalLocationIds[index],
      name: selected.name,
      slug: selected.slug,
      type: location.level,
      parentCanonicalLocationId,
    };
  });

  return {
    kind: 'multi_location',
    level: first.level,
    parentName:
      first.level === 'city'
        ? first.province.name
        : first.level === 'suburb'
          ? first.city?.name
          : undefined,
    locations: mapped.sort((left, right) =>
      left.canonicalLocationId.localeCompare(right.canonicalLocationId),
    ),
  };
}

function emptyLocationResolution(
  locationState: Extract<LocationResolution['locationState'], 'unresolved' | 'ambiguous' | 'unavailable'>,
  locationMessage: string,
): LocationResolution {
  return { locationState, locationMessage };
}

function canonicalizeLocationIds(values: readonly string[]): string[] | null {
  const normalized: string[] = [];
  for (const value of values) {
    const parsed = parseCanonicalLocationId(String(value).trim());
    if (!parsed) return null;
    normalized.push(encodeCanonicalLocationId(parsed.level, parsed.id));
  }
  return Array.from(new Set(normalized)).sort();
}

function locationEquals(column: any, value: string): SQL {
  return sql`LOWER(TRIM(${column})) = LOWER(TRIM(${value}))`;
}

function anyCondition(conditions: SQL[]): SQL {
  if (conditions.length === 0) return sql`1 = 0`;
  if (conditions.length === 1) return conditions[0];
  return or(...conditions)!;
}

function allCondition(conditions: SQL[]): SQL {
  return and(...conditions)!;
}

function sqlConditionForBoundary(boundary: PublicSearchQueryBoundary) {
  if (boundary.kind === 'canonical_members') {
    const memberConditions = getSearchAreaQueryMembers(boundary).flatMap(member => {
      if (member.scopeKind === 'province') {
        return member.provinceName ? [locationEquals(developments.province, member.provinceName)] : [];
      }
      if (member.scopeKind === 'metro_city') {
        return member.cityName ? [locationEquals(developments.city, member.cityName)] : [];
      }
      if (!member.cityName || !member.suburbName) return [];
      return [
        allCondition([
          locationEquals(developments.city, member.cityName),
          locationEquals(developments.suburb, member.suburbName),
        ]),
      ];
    });
    return anyCondition(memberConditions);
  }

  const locationConditions = boundary.members.map(member => {
    if (member.level === 'province') {
      return locationEquals(developments.province, member.provinceName);
    }
    if (member.level === 'city') {
      return allCondition([
        locationEquals(developments.province, member.provinceName),
        locationEquals(developments.city, member.cityName || member.name),
      ]);
    }
    return allCondition([
      locationEquals(developments.province, member.provinceName),
      locationEquals(developments.city, member.cityName || ''),
      locationEquals(developments.suburb, member.suburbName || member.name),
    ]);
  });

  return anyCondition(locationConditions);
}

function resolveLocationIdsFromInput(input: PublicDevelopmentSearchInput): string[] | null {
  const ids = input.locationIds?.length
    ? input.locationIds
    : input.locationId
      ? [input.locationId]
      : [];
  return ids.length > 0 ? canonicalizeLocationIds(ids) : [];
}

async function resolveCanonicalLocationBoundary(
  canonicalLocationIds: readonly string[],
): Promise<LocationResolution> {
  const resolutions = await Promise.all(
    canonicalLocationIds.map(locationId =>
      locationResolver.resolvePublicLocation({ locationId }),
    ),
  );
  const failed = resolutions.find(
    resolution => resolution.status !== 'resolved' || !resolution.location,
  );
  if (failed) {
    return emptyLocationResolution(
      failed.status === 'ambiguous' ? 'ambiguous' : 'unresolved',
      failed.message || 'One or more selected locations could not be resolved canonically.',
    );
  }

  const locations = resolutions.map(resolution => resolution.location!);
  const boundary = buildCanonicalLocationQueryBoundary(locations, canonicalLocationIds);
  if (!boundary) {
    return emptyLocationResolution(
      'unavailable',
      'Selected locations must be canonical siblings at one geographic level.',
    );
  }

  return {
    locationState: 'resolved',
    boundary,
    locationContext:
      locations.length === 1 ? toLocationContext(locations[0]) : undefined,
    multiLocationContext:
      locations.length > 1 ? toMultiLocationContext(locations, canonicalLocationIds) : undefined,
  };
}

function normalizeList(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
  return value && value.trim() ? [value.trim()] : [];
}

async function resolveTextLocationBoundary(
  input: PublicDevelopmentSearchInput,
): Promise<LocationResolution> {
  const suburbValues = normalizeList(input.suburb);
  const legacyLocations = (input.locations || []).map(value => String(value).trim()).filter(Boolean);

  if (suburbValues.length > 1 || legacyLocations.length > 1) {
    return emptyLocationResolution(
      'ambiguous',
      'Choose one canonical province, city, or suburb before searching.',
    );
  }

  const suburbSlug = suburbValues[0];
  const citySlug =
    input.city ||
    (!input.province && !suburbSlug ? legacyLocations[0] || input.search : undefined);
  const resolution = await locationResolver.resolvePublicLocation({
    provinceSlug: input.province,
    citySlug,
    suburbSlug,
  });

  if (resolution.status !== 'resolved' || !resolution.location) {
    return emptyLocationResolution(
      resolution.status === 'ambiguous' ? 'ambiguous' : 'unresolved',
      resolution.message ||
        'We could not match that location. Choose a canonical location suggestion and try again.',
    );
  }

  const canonicalLocationId = canonicalLocationIdForResolvedLocation(resolution.location);
  const boundary = canonicalLocationId
    ? buildCanonicalLocationQueryBoundary([resolution.location], [canonicalLocationId])
    : null;
  if (!boundary) {
    return emptyLocationResolution('unavailable', 'The selected location has no safe query boundary.');
  }

  return {
    locationState: 'resolved',
    boundary,
    locationContext: toLocationContext(resolution.location),
    locationMessage: resolution.message,
  };
}

async function resolveSearchLocation(
  input: PublicDevelopmentSearchInput,
): Promise<LocationResolution> {
  const canonicalIds = resolveLocationIdsFromInput(input);
  if (canonicalIds === null) {
    return emptyLocationResolution('unresolved', 'The selected location identity is invalid.');
  }

  if (input.locationId && input.locationIds?.length) {
    return emptyLocationResolution(
      'unavailable',
      'Use one canonical location representation for a Developments search.',
    );
  }

  const hasSearchArea = Boolean(input.searchAreaId || input.searchAreaIds?.length);
  if (hasSearchArea && (canonicalIds.length > 0 || input.province || input.city || input.suburb)) {
    return emptyLocationResolution(
      'unavailable',
      'A Search Area cannot be combined with a second Developments geography boundary.',
    );
  }

  if (input.searchAreaId && input.searchAreaIds?.length) {
    return emptyLocationResolution(
      'unavailable',
      'Use one canonical Search Area representation for a Developments search.',
    );
  }

  if (input.searchAreaId) {
    const resolution = await searchAreaAuthority.resolveSearchArea(input.searchAreaId, {
      journey: 'developments',
    });
    if (resolution.status === 'preview') {
      return emptyLocationResolution('unavailable', 'This Search Area is not live for Developments.');
    }
    if (resolution.status === 'unavailable') {
      return emptyLocationResolution(
        'unavailable',
        'This Search Area does not support the Developments journey yet.',
      );
    }

    const boundary = buildSearchAreaQueryBoundary(resolution);
    if (!boundary) {
      return emptyLocationResolution('unavailable', 'This Search Area has no safe query boundary.');
    }

    return { locationState: 'resolved', boundary };
  }

  if (input.searchAreaIds?.length) {
    const searchAreaIds = Array.from(new Set(input.searchAreaIds.map(value => value.trim()).filter(Boolean)));
    const resolutions = await Promise.all(
      searchAreaIds.map(searchAreaId =>
        searchAreaAuthority.resolveSearchArea(searchAreaId, { journey: 'developments' }),
      ),
    );
    if (resolutions.some(resolution => resolution.status !== 'available')) {
      return emptyLocationResolution(
        'unavailable',
        'The selected Search Areas do not support the Developments journey yet.',
      );
    }

    const boundaries = resolutions
      .map(resolution =>
        resolution.status === 'available' ? buildSearchAreaQueryBoundary(resolution) : null,
      )
      .filter((boundary): boundary is NonNullable<typeof boundary> => Boolean(boundary));
    const boundary = combineSearchAreaQueryBoundaries(boundaries);
    if (!boundary) {
      return emptyLocationResolution(
        'unavailable',
        'The selected Search Areas do not share one safe query boundary.',
      );
    }

    return { locationState: 'resolved', boundary };
  }

  if (canonicalIds.length > 0) {
    return resolveCanonicalLocationBoundary(canonicalIds);
  }

  const hasTextLocation = Boolean(
    input.province || input.city || input.suburb || input.locations?.length || input.search,
  );
  return hasTextLocation
    ? resolveTextLocationBoundary(input)
    : { locationState: 'not_requested' };
}

function buildSqlLocationCondition(boundary: PublicSearchQueryBoundary | undefined) {
  return boundary ? sqlConditionForBoundary(boundary) : undefined;
}

function developmentFiltersFromInput(input: PublicDevelopmentSearchInput): PublicDevelopmentSearchFilters {
  const minPrice = finiteNumber(input.minPrice);
  const maxPrice = finiteNumber(input.maxPrice);
  const minBedrooms = finiteNumber(input.minBedrooms);
  const maxBedrooms = finiteNumber(input.maxBedrooms);

  return {
    developmentType: input.developmentType,
    developmentStatus: input.developmentStatus,
    minPrice: minPrice !== null && minPrice >= 0 ? minPrice : undefined,
    maxPrice: maxPrice !== null && maxPrice >= 0 ? maxPrice : undefined,
    minBedrooms: minBedrooms !== null && minBedrooms >= 0 ? minBedrooms : undefined,
    maxBedrooms: maxBedrooms !== null && maxBedrooms >= 0 ? maxBedrooms : undefined,
    availability: input.availability,
  };
}

function itemFromRows(
  development: DevelopmentRow,
  units: readonly UnitRow[],
): PublicDevelopmentSearchItem | null {
  const projectionDevelopment: PublicDevelopmentProjectionDevelopment = {
    ...development,
    canonicalRoute: buildDevelopmentRootPath(development),
  };
  const projectionUnits: PublicDevelopmentProjectionUnit[] = units.map(unit => ({
    ...unit,
    id: String(unit.id),
    name: unit.name,
  }));

  return projectPublicDevelopmentFacts(projectionDevelopment, projectionUnits);
}

function emptyResult(
  input: PublicDevelopmentSearchInput,
  location: LocationResolution,
): PublicDevelopmentSearchResult {
  const { boundary: _boundary, ...publicLocation } = location;
  const pageSize = normalizePublicSearchPageSize(input.pageSize ?? input.limit);
  const requestedPage =
    input.page !== undefined
      ? normalizePublicSearchPageIndex(input.page)
      : Math.max(0, Math.floor((input.offset || 0) / pageSize));
  const page = normalizePublicSearchPageForTotal(requestedPage, 0, pageSize);

  return {
    items: [],
    total: 0,
    page,
    pageSize,
    hasMore: false,
    limit: pageSize,
    offset: page * pageSize,
    ...publicLocation,
  };
}

export class PublicDevelopmentSearchService {
  async search(input: PublicDevelopmentSearchInput): Promise<PublicDevelopmentSearchResult> {
    const location = await resolveSearchLocation(input);
    if (location.locationState !== 'not_requested' && !location.boundary) {
      return emptyResult(input, location);
    }

    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const conditions: SQL[] = [publicDevelopmentEligibilityConditions()];
    if (input.transactionType) {
      conditions.push(eq(developments.transactionType, input.transactionType));
    }
    if (input.developmentType) conditions.push(eq(developments.developmentType, input.developmentType));
    if (input.developmentStatus) conditions.push(eq(developments.status, input.developmentStatus));

    const locationCondition = buildSqlLocationCondition(location.boundary);
    if (locationCondition) conditions.push(locationCondition);

    const rows = (await db
      .select({
        id: developments.id,
        name: developments.name,
        slug: developments.slug,
        description: developments.description,
        images: developments.images,
        city: developments.city,
        suburb: developments.suburb,
        province: developments.province,
        developmentType: developments.developmentType,
        transactionType: developments.transactionType,
        status: developments.status,
        nature: developments.nature,
        completionDate: developments.completionDate,
        createdAt: developments.createdAt,
        isFeatured: developments.isFeatured,
        rating: developments.rating,
        highlights: developments.highlights,
        cataloguePublisherId: developments.cataloguePublisherId,
        publisherName: cataloguePublishers.name,
        publisherLogoUrl: cataloguePublishers.logoUrl,
        publisherAuthorityKind: cataloguePublishers.authorityKind,
        publisherSlug: cataloguePublishers.slug,
        publisherWebsiteUrl: cataloguePublishers.websiteUrl,
        publisherDescription: cataloguePublishers.about,
        publisherSourceAttribution: cataloguePublishers.sourceAttribution,
        publisherFoundedYear: cataloguePublishers.foundedYear,
        publisherHeadOfficeLocation: cataloguePublishers.headOfficeLocation,
      })
      .from(developments)
      .leftJoin(cataloguePublishers, eq(developments.cataloguePublisherId, cataloguePublishers.id))
      .where(and(...conditions))
      .orderBy(desc(developments.createdAt), desc(developments.id))) as DevelopmentRow[];

    const developmentIds = rows.map(row => Number(row.id)).filter(Number.isSafeInteger);
    const unitRows = developmentIds.length
      ? ((await db
          .select({
            id: unitTypes.id,
            developmentId: unitTypes.developmentId,
            name: unitTypes.name,
            label: unitTypes.label,
            bedrooms: unitTypes.bedrooms,
            bathrooms: unitTypes.bathrooms,
            basePriceFrom: unitTypes.basePriceFrom,
            basePriceTo: unitTypes.basePriceTo,
            monthlyRentFrom: unitTypes.monthlyRentFrom,
            monthlyRentTo: unitTypes.monthlyRentTo,
            totalUnits: unitTypes.totalUnits,
            availableUnits: unitTypes.availableUnits,
            reservedUnits: unitTypes.reservedUnits,
            displayOrder: unitTypes.displayOrder,
          })
          .from(unitTypes)
          .where(and(inArray(unitTypes.developmentId, developmentIds), eq(unitTypes.isActive, 1)))
          .orderBy(unitTypes.displayOrder, unitTypes.id)) as UnitRow[])
      : [];

    const unitsByDevelopment = new Map<number, UnitRow[]>();
    for (const unit of unitRows) {
      const developmentId = Number(unit.developmentId);
      const existing = unitsByDevelopment.get(developmentId) || [];
      existing.push(unit);
      unitsByDevelopment.set(developmentId, existing);
    }

    const items = rows
      .map(row => itemFromRows(row, unitsByDevelopment.get(Number(row.id)) || []))
      .filter((item): item is PublicDevelopmentSearchItem => Boolean(item));
    const developmentFilters = developmentFiltersFromInput(input);
    const filtered = filterPublicDevelopmentSearchItems(items, developmentFilters);
    const unpricedHiddenCount = countUnpricedHiddenByPriceFilter(items, developmentFilters);
    const sortOption = isSearchResultSortOption(input.sortOption)
      ? input.sortOption
      : DEFAULT_SEARCH_RESULT_SORT;
    const sorted = sortPublicDevelopmentSearchItems(filtered, sortOption);
    const pageSize = normalizePublicSearchPageSize(input.pageSize ?? input.limit);
    const requestedPage =
      input.page !== undefined
        ? normalizePublicSearchPageIndex(input.page)
        : Math.max(0, Math.floor((input.offset || 0) / pageSize));
    const page = normalizePublicSearchPageForTotal(requestedPage, sorted.length, pageSize);
    const paged = paginatePublicDevelopmentSearchItems(sorted, page, pageSize);

    return {
      ...paged,
      limit: paged.pageSize,
      offset: paged.page * paged.pageSize,
      locationState: location.locationState,
      locationMessage: location.locationMessage,
      locationContext: location.locationContext,
      multiLocationContext: location.multiLocationContext,
      unpricedHiddenCount,
    };
  }
}

export const publicDevelopmentSearchService = new PublicDevelopmentSearchService();
