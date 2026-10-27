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
  listDevelopmentPlaceGeography,
  type DevelopmentPlaceGeography,
} from './developmentPlaceAssignmentService';
import {
  COMMERCIAL_PUBLIC_JOURNEY_HANDOFF_MESSAGE,
  isCommercialMarketingPropertyType,
} from '../../shared/commercial-domain';

export interface PublicDevelopmentSearchInput {
  canonicalPlaceId?: string;
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
    if (location.canonicalPlaceId) {
      const matchingDevelopmentIds = await listDevelopmentIdsForCanonicalPlace(
        location.canonicalPlaceId,
      );
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
    const developmentFilters = developmentFiltersFromInput(input);
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
