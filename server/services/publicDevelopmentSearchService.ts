import { and, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';

import { cataloguePublishers, developments, unitTypes } from '../../drizzle/schema';
import { isPlaceId } from '../../drizzle/schema/placeAuthority';
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
import { publicDevelopmentEligibilityConditions } from './publicDevelopmentEligibility';
import {
  listDevelopmentIdsForCanonicalPlace,
  listDevelopmentIdsForCanonicalPlaces,
  listDevelopmentPlaceGeography,
  type DevelopmentPlaceGeography,
} from './developmentPlaceAssignmentService';
import { developmentSearchPlaceIds, ROLLUP_MAX_PLACE_IDS } from './placeLocalityRollupService';
import {
  COMMERCIAL_PUBLIC_JOURNEY_HANDOFF_MESSAGE,
  isCommercialMarketingPropertyType,
} from '../../shared/commercial-domain';

export interface PublicDevelopmentSearchInput {
  canonicalPlaceId?: string;
  /**
   * Several Places (a searched area plus its member suburbs, or a multi-area search). A Development
   * matches when its reviewed, accepted site Place is any of them. Exclusive with canonicalPlaceId.
   */
  canonicalPlaceIds?: string[];
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
  /** Opt-in: attach each unit type's unitSize (m2) to the returned unit types. */
  includeUnitSize?: boolean;
  /**
   * Opt-in: skip the development-level price and bedroom filters. The caller filters each unit
   * type by its own facts instead (unit-type result cards).
   */
  skipDevelopmentRangeFilters?: boolean;
  /** Legacy offset/limit callers are translated at this boundary only. */
}

type PublicDevelopmentSearchLocationContext = { canonicalPlaceId: string };

export interface PublicDevelopmentSearchResult {
  items: PublicDevelopmentSearchItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  locationState: 'not_requested' | 'resolved' | 'unresolved' | 'ambiguous' | 'unavailable';
  locationMessage?: string;
  locationContext?: PublicDevelopmentSearchLocationContext;
  /**
   * Developments with no published unit price that a price filter excluded.
   * Surfaced so the journey can say what a price bound hid instead of letting
   * "Price on request" inventory vanish silently. Zero when no price filter
   * is active.
   */
  unpricedHiddenCount: number;
}

type LocationResolution = {
  locationState: PublicDevelopmentSearchResult['locationState'];
  locationMessage?: string;
  canonicalPlaceId?: string;
  locationContext?: PublicDevelopmentSearchLocationContext;
};

type DevelopmentRow = {
  id: number;
  name: string;
  slug: string | null;
  description: string | null;
  tagline?: string | null;
  subtitle?: string | null;
  images: unknown;
  canonicalPlaceId: string | null;
  locationLabels: string[];
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

function parseStoredJson(value: unknown): unknown {
  let current = value;
  for (let depth = 0; depth < 2 && typeof current === 'string'; depth += 1) {
    try {
      current = JSON.parse(current);
    } catch {
      return current;
    }
  }
  return current;
}

function safeUnitImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  if (!candidate || candidate.length > 2048 || candidate.startsWith('//')) return null;
  if (candidate.startsWith('/')) return candidate;

  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function projectUnitGalleryImages(value: unknown): string[] {
  const parsed = parseStoredJson(value);
  const record = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  const gallery = record && Array.isArray((record as Record<string, unknown>).gallery)
    ? ((record as Record<string, unknown>).gallery as unknown[])
    : [];
  const projected = gallery.flatMap((entry, index) => {
    if (typeof entry === 'string') {
      const url = safeUnitImageUrl(entry);
      return url ? [{ url, isPrimary: false, index }] : [];
    }
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
    const image = entry as Record<string, unknown>;
    if (image.type && image.type !== 'image') return [];
    const url = safeUnitImageUrl(image.url ?? image.imageUrl ?? image.src);
    return url ? [{ url, isPrimary: image.isPrimary === true, index }] : [];
  });

  const ordered = projected.sort(
    (left, right) => Number(right.isPrimary) - Number(left.isPrimary) || left.index - right.index,
  );
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const image of ordered) {
    if (seen.has(image.url)) continue;
    seen.add(image.url);
    urls.push(image.url);
    if (urls.length === 12) break;
  }
  return urls;
}

async function resolveSearchLocation(
  input: PublicDevelopmentSearchInput,
): Promise<LocationResolution> {
  if (input.canonicalPlaceId === undefined) return { locationState: 'not_requested' };
  if (!isPlaceId(input.canonicalPlaceId)) {
    return {
      locationState: 'unresolved',
      locationMessage: 'The selected canonical Place is invalid.',
    };
  }
  return {
    locationState: 'resolved',
    canonicalPlaceId: input.canonicalPlaceId,
    locationContext: { canonicalPlaceId: input.canonicalPlaceId },
  };
}

function developmentFiltersFromInput(
  input: PublicDevelopmentSearchInput,
): PublicDevelopmentSearchFilters {
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
  development: Omit<DevelopmentRow, 'canonicalPlaceId' | 'locationLabels'>,
  geography: DevelopmentPlaceGeography,
  units: readonly UnitRow[],
): PublicDevelopmentSearchItem | null {
  const projectionDevelopment: PublicDevelopmentProjectionDevelopment = {
    ...development,
    ...geography,
    canonicalRoute: buildDevelopmentRootPath(development),
  };
  const projectionUnits: PublicDevelopmentProjectionUnit[] = units.map(unit => ({
    ...unit,
    id: String(unit.id),
    name: unit.name,
    images: projectUnitGalleryImages(unit.baseMedia),
  }));

  return projectPublicDevelopmentFacts(projectionDevelopment, projectionUnits);
}

function emptyResult(
  input: PublicDevelopmentSearchInput,
  location: LocationResolution,
): PublicDevelopmentSearchResult {
  const pageSize = normalizePublicSearchPageSize(input.pageSize);
  const requestedPage = normalizePublicSearchPageIndex(input.page ?? 0);
  const page = normalizePublicSearchPageForTotal(requestedPage, 0, pageSize);

  return {
    items: [],
    total: 0,
    page,
    pageSize,
    hasMore: false,
    unpricedHiddenCount: 0,
    locationState: location.locationState,
    locationMessage: location.locationMessage,
    locationContext: location.locationContext,
  };
}

export class PublicDevelopmentSearchService {
  async search(input: PublicDevelopmentSearchInput): Promise<PublicDevelopmentSearchResult> {
    // Commercial development records are not an alternate public Commercial
    // inventory. The active Commercial authority is Asset → Space →
    // Availability leasing, so callers must enter that journey explicitly.
    if (isCommercialMarketingPropertyType(input.developmentType)) {
      throw new Error(COMMERCIAL_PUBLIC_JOURNEY_HANDOFF_MESSAGE);
    }
    const location = await resolveSearchLocation(input);
    if (location.locationState === 'unresolved') {
      return emptyResult(input, location);
    }

    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const conditions: SQL[] = [publicDevelopmentEligibilityConditions()];
    if (input.canonicalPlaceIds) {
      // Each searched Place rolls up the same way a single-Place search does (a city includes the
      // localities beneath it), so unit-type cards follow the same place set as the listings.
      const rolled = await Promise.all(
        input.canonicalPlaceIds.map(placeId => developmentSearchPlaceIds(db as any, placeId)),
      );
      let searchPlaceIds = [...new Set(rolled.flat())];
      if (searchPlaceIds.length > ROLLUP_MAX_PLACE_IDS) {
        console.warn(
          `[publicDevelopmentSearch] ${input.canonicalPlaceIds.length} searched places roll up to ${searchPlaceIds.length}; cut to ${ROLLUP_MAX_PLACE_IDS}`,
        );
        searchPlaceIds = searchPlaceIds.slice(0, ROLLUP_MAX_PLACE_IDS);
      }
      const matchingDevelopmentIds = searchPlaceIds.length
        ? await listDevelopmentIdsForCanonicalPlaces(searchPlaceIds)
        : [];
      conditions.push(
        matchingDevelopmentIds.length
          ? inArray(developments.id, matchingDevelopmentIds)
          : sql`1 = 0`,
      );
    } else if (location.canonicalPlaceId) {
      // A city or province search includes the developments assigned to the
      // localities beneath it (same child rules as the area guides); a suburb
      // search stays an exact match.
      const searchPlaceIds = await developmentSearchPlaceIds(db as any, location.canonicalPlaceId);
      const matchingDevelopmentIds =
        searchPlaceIds.length === 1
          ? await listDevelopmentIdsForCanonicalPlace(location.canonicalPlaceId)
          : await listDevelopmentIdsForCanonicalPlaces(searchPlaceIds);
      conditions.push(
        matchingDevelopmentIds.length
          ? inArray(developments.id, matchingDevelopmentIds)
          : sql`1 = 0`,
      );
    }
    if (input.transactionType) {
      conditions.push(eq(developments.transactionType, input.transactionType));
    }
    if (input.developmentType)
      conditions.push(eq(developments.developmentType, input.developmentType));
    if (input.developmentStatus) conditions.push(eq(developments.status, input.developmentStatus));

    const rows = (await db
      .select({
        id: developments.id,
        name: developments.name,
        slug: developments.slug,
        description: developments.description,
        tagline: developments.tagline,
        subtitle: developments.subtitle,
        images: developments.images,
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
      .orderBy(desc(developments.createdAt), desc(developments.id))) as Array<
      Omit<DevelopmentRow, 'canonicalPlaceId' | 'locationLabels'>
    >;

    const developmentIds = rows.map(row => Number(row.id)).filter(Number.isSafeInteger);
    const geographyByDevelopment = await listDevelopmentPlaceGeography(developmentIds);
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
            unitSize: unitTypes.unitSize,
            yardSize: unitTypes.yardSize,
            parkingBays: unitTypes.parkingBays,
            structuralType: unitTypes.structuralType,
            baseMedia: unitTypes.baseMedia,
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
      .map(row =>
        itemFromRows(
          row,
          geographyByDevelopment.get(Number(row.id)) ?? {
            canonicalPlaceId: null,
            locationLabels: [],
          },
          unitsByDevelopment.get(Number(row.id)) || [],
        ),
      )
      .filter((item): item is PublicDevelopmentSearchItem => Boolean(item));
    if (input.includeUnitSize) {
      const factsByUnit = new Map<
        string,
        {
          unitSize: number | null;
          yardSize: number | null;
          parkingBays: number | null;
          structuralType: string | null;
        }
      >();
      const positive = (value: unknown) => {
        const parsed = finiteNumber(value);
        return parsed !== null && parsed > 0 ? parsed : null;
      };
      for (const unit of unitRows) {
        factsByUnit.set(String(unit.id), {
          unitSize: finiteNumber(unit.unitSize),
          yardSize: positive(unit.yardSize),
          // parking_bays defaults to 0, which cannot be told apart from "not
          // recorded", so only a positive count is sent.
          parkingBays: positive(unit.parkingBays),
          structuralType: unit.structuralType ? String(unit.structuralType) : null,
        });
      }
      for (const item of items) {
        item.unitTypes = item.unitTypes.map(unit => {
          const facts = factsByUnit.get(String(unit.id));
          return {
            ...unit,
            unitSize: facts?.unitSize ?? null,
            yardSize: facts?.yardSize ?? null,
            parkingBays: facts?.parkingBays ?? null,
            structuralType: facts?.structuralType ?? null,
          };
        });
      }
    }
    const developmentFilters = developmentFiltersFromInput(
      input.skipDevelopmentRangeFilters
        ? { ...input, minPrice: undefined, maxPrice: undefined, minBedrooms: undefined, maxBedrooms: undefined }
        : input,
    );
    const filtered = filterPublicDevelopmentSearchItems(items, developmentFilters);
    const unpricedHiddenCount = countUnpricedHiddenByPriceFilter(items, developmentFilters);
    const sortOption = isSearchResultSortOption(input.sortOption)
      ? input.sortOption
      : DEFAULT_SEARCH_RESULT_SORT;
    const sorted = sortPublicDevelopmentSearchItems(filtered, sortOption);
    const pageSize = normalizePublicSearchPageSize(input.pageSize);
    const requestedPage = normalizePublicSearchPageIndex(input.page ?? 0);
    const page = normalizePublicSearchPageForTotal(requestedPage, sorted.length, pageSize);
    const paged = paginatePublicDevelopmentSearchItems(sorted, page, pageSize);

    return {
      ...paged,
      locationState: location.locationState,
      locationMessage: location.locationMessage,
      locationContext: location.locationContext,
      unpricedHiddenCount,
    };
  }
}

export const publicDevelopmentSearchService = new PublicDevelopmentSearchService();
