import {
  blendPublicSearchResults,
  type PublicSearchBlendSortOption,
} from '../../shared/publicSearchBlend';
import {
  canAdvancePublicSearchPage,
  normalizePublicSearchPageIndex,
  normalizePublicSearchPageSize,
} from '../../shared/publicSearchPagination';
import type { PropertyFilters, SearchCardResult, SortOption } from '../../shared/types';
import { developmentDerivedListingService } from './developmentDerivedListingService';
import { locationResolver, type ResolvedLocation } from './locationResolverService';
import { propertySearchService } from './propertySearchService';

export interface PublicSearchInventoryInput {
  province?: string;
  city?: string;
  suburb?: string[];
  locations?: string[];
  locationId?: string;
  propertyType?: string;
  listingType?: 'sale' | 'rent';
  listingSource?: 'manual' | 'development';
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minArea?: number;
  maxArea?: number;
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
  sortOption?: PublicSearchBlendSortOption;
  page?: number;
  pageSize?: number;
}

export interface PublicSearchInventoryResult {
  cards: SearchCardResult[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  locationContext?: {
    type: 'province' | 'city' | 'suburb';
    name: string;
    slug: string;
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
  locationState: 'not_requested' | 'resolved' | 'unresolved' | 'ambiguous';
  locationMessage?: string;
  sourceCounts: {
    manual: number;
    development: number;
  };
}

function hasLocationIntent(input: PublicSearchInventoryInput): boolean {
  return Boolean(
    input.locationId ||
    input.province ||
    input.city ||
    input.suburb?.length ||
    input.locations?.length,
  );
}

function toLocationContext(
  location: ResolvedLocation,
): NonNullable<PublicSearchInventoryResult['locationContext']> {
  const selected = location.suburb || location.city || location.province;
  return {
    type: location.level,
    name: selected.name,
    slug: selected.slug,
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

function emptyLocationResult(
  input: PublicSearchInventoryInput,
  status: 'unresolved' | 'ambiguous',
  message: string,
) {
  const page = normalizePublicSearchPageIndex(input.page);
  const pageSize = normalizePublicSearchPageSize(input.pageSize);
  return {
    cards: [],
    total: 0,
    page,
    pageSize,
    hasMore: false,
    locationState: status,
    locationMessage: message,
    sourceCounts: { manual: 0, development: 0 },
  } satisfies PublicSearchInventoryResult;
}

function buildPublicFilters(
  input: PublicSearchInventoryInput,
  location: ResolvedLocation | null,
): PropertyFilters {
  return {
    province: location?.province.slug || input.province,
    city: location?.city?.slug || input.city,
    suburb: location?.suburb ? [location.suburb.slug] : input.suburb,
    canonicalLocation: location
      ? {
          provinceId: location.province.id,
          cityId: location.city?.id,
          suburbId: location.suburb?.id,
        }
      : undefined,
    propertyType: input.propertyType ? [input.propertyType as any] : undefined,
    listingType: input.listingType,
    minPrice: input.minPrice,
    maxPrice: input.maxPrice,
    minBedrooms: input.minBedrooms,
    maxBedrooms: input.maxBedrooms,
    minBathrooms: input.minBathrooms,
    minErfSize: input.minArea,
    maxErfSize: input.maxArea,
    minFloorSize: input.minArea,
    maxFloorSize: input.maxArea,
    bounds:
      input.minLat !== undefined &&
      input.maxLat !== undefined &&
      input.minLng !== undefined &&
      input.maxLng !== undefined
        ? {
            south: input.minLat,
            north: input.maxLat,
            west: input.minLng,
            east: input.maxLng,
          }
        : undefined,
  };
}

function buildDevelopmentFilters(
  input: PublicSearchInventoryInput,
  location: ResolvedLocation | null,
) {
  return {
    province: location?.province.slug || input.province,
    city: location?.city?.slug || input.city,
    suburb: location?.suburb ? [location.suburb.slug] : input.suburb,
    propertyType: input.propertyType ? [input.propertyType as any] : undefined,
    listingType: input.listingType,
    minPrice: input.minPrice,
    maxPrice: input.maxPrice,
    minBedrooms: input.minBedrooms,
    maxBedrooms: input.maxBedrooms,
    minBathrooms: input.minBathrooms,
    locations: undefined,
  };
}

function sourceSort(sortOption: PublicSearchBlendSortOption): SortOption {
  return sortOption === 'relevance' ? 'date_desc' : sortOption;
}

export class PublicSearchService {
  async searchInventory(input: PublicSearchInventoryInput): Promise<PublicSearchInventoryResult> {
    const page = normalizePublicSearchPageIndex(input.page);
    const pageSize = normalizePublicSearchPageSize(input.pageSize);
    const sortOption: PublicSearchBlendSortOption = input.sortOption || 'relevance';
    const sourceSortOption = sourceSort(sortOption);

    let location: ResolvedLocation | null = null;
    let locationState: PublicSearchInventoryResult['locationState'] = 'not_requested';
    let locationMessage: string | undefined;

    if (hasLocationIntent(input)) {
      if (
        !input.province &&
        !input.city &&
        !input.suburb?.length &&
        !input.locationId &&
        (input.locations?.length || 0) > 1
      ) {
        return emptyLocationResult(
          input,
          'ambiguous',
          'Choose one canonical province, city, or suburb before searching.',
        );
      }

      const resolution = await locationResolver.resolvePublicLocation({
        locationId: input.locationId,
        provinceSlug: input.province,
        citySlug:
          input.city ||
          (!input.province && !input.suburb?.length ? input.locations?.[0] : undefined),
        suburbSlug: input.suburb?.[0],
      });

      if (resolution.status !== 'resolved' || !resolution.location) {
        return emptyLocationResult(
          input,
          resolution.status === 'ambiguous' ? 'ambiguous' : 'unresolved',
          resolution.message ||
            'We could not match that location. Choose a canonical result and try again.',
        );
      }

      location = resolution.location;
      locationState = 'resolved';
      locationMessage = resolution.message;
    }

    const filters = buildPublicFilters(input, location);
    const developmentFilters = buildDevelopmentFilters(input, location);
    const manualEnabled = input.listingSource !== 'development';
    const developmentEnabled = input.listingSource !== 'manual';
    const sourcePageSize = manualEnabled && developmentEnabled ? (page + 1) * pageSize : pageSize;
    const sourcePage = manualEnabled && developmentEnabled ? 1 : page + 1;

    const [manualResults, developmentResults] = await Promise.all([
      manualEnabled
        ? propertySearchService.searchProperties(
            filters,
            sourceSortOption,
            sourcePage,
            sourcePageSize,
          )
        : null,
      developmentEnabled
        ? developmentDerivedListingService.searchListings(
            developmentFilters,
            sourceSortOption,
            sourcePage,
            sourcePageSize,
          )
        : null,
    ]);

    const manualCards = (manualResults?.cards || []) as SearchCardResult[];
    const developmentCards = (developmentResults?.cards || []) as SearchCardResult[];
    const policyFilters = {
      ...input,
      suburb: input.suburb?.[0],
    };
    const blended =
      manualEnabled && developmentEnabled
        ? (blendPublicSearchResults(
            manualCards.map(value => ({ kind: 'property' as const, value })),
            developmentCards.map(value => ({ kind: 'development' as const, value })),
            sortOption,
            policyFilters,
          ).map(item => item.value) as SearchCardResult[])
        : manualEnabled
          ? manualCards
          : developmentCards;
    const cards =
      manualEnabled && developmentEnabled
        ? blended.slice(page * pageSize, page * pageSize + pageSize)
        : blended;
    const manualTotal = manualResults?.total || 0;
    const developmentTotal = developmentResults?.total || 0;
    const total = manualTotal + developmentTotal;
    const locationContext = location ? toLocationContext(location) : undefined;

    return {
      cards,
      total,
      page,
      pageSize,
      hasMore: canAdvancePublicSearchPage(page, total, pageSize),
      locationContext,
      locationState,
      locationMessage,
      sourceCounts: {
        manual: manualTotal,
        development: developmentTotal,
      },
    };
  }
}

export const publicSearchService = new PublicSearchService();
