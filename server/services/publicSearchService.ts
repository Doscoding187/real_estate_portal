import {
  blendPublicSearchResults,
  type PublicSearchBlendSortOption,
} from '../../shared/publicSearchBlend';
import {
  canAdvancePublicSearchPage,
  normalizePublicSearchPageIndex,
  normalizePublicSearchPageSize,
  normalizePublicSearchPageForTotal,
} from '../../shared/publicSearchPagination';
import type { PropertyFilters, SearchCardResult, SortOption } from '../../shared/types';
import { validatePublicSearchInput } from '../../shared/publicSearchValidation';
import type { SearchAreaSummary } from '../../shared/searchScope';
import {
  DEFAULT_SEARCH_RESULT_SORT,
  isSearchResultSortOption,
} from '../../shared/transactionalSearchState';
import { developmentDerivedListingService } from './developmentDerivedListingService';
import { locationResolver, type ResolvedLocation } from './locationResolverService';
import { propertySearchService } from './propertySearchService';
import {
  searchAreaAuthority,
  type SearchAreaResolution,
  type SearchAreaFailureReason,
  type ResolveSearchAreaOptions,
} from './searchAreaAuthority';
import {
  buildSearchAreaQueryBoundary,
  narrowSearchAreaQueryBoundary,
  type SearchAreaQueryBoundary,
} from './searchAreaQueryBoundary';

export interface PublicSearchInventoryInput {
  province?: string;
  city?: string;
  suburb?: string[];
  locations?: string[];
  locationId?: string;
  searchAreaId?: string;
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
  searchAreaContext?: SearchAreaSummary;
  locationState: 'not_requested' | 'resolved' | 'unresolved' | 'ambiguous' | 'unavailable';
  locationMessage?: string;
  sourceCounts: {
    manual: number;
    development: number;
  };
}

function hasLocationIntent(input: PublicSearchInventoryInput): boolean {
  return Boolean(
    input.locationId ||
    input.searchAreaId ||
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
  status: 'unresolved' | 'ambiguous' | 'unavailable',
  message: string,
) {
  const pageSize = normalizePublicSearchPageSize(input.pageSize);
  const page = normalizePublicSearchPageForTotal(input.page, 0, pageSize);
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

function searchAreaFailureMessage(reason: SearchAreaFailureReason): string {
  if (reason === 'unsupported_journey') {
    return 'This Search Area does not support the selected journey.';
  }

  if (reason === 'preview_only') {
    return 'This Search Area is only available in preview and cannot be searched yet.';
  }

  return 'This Search Area is unavailable for search.';
}

export interface SearchAreaResolver {
  resolveSearchArea: (
    searchAreaId: string,
    options?: ResolveSearchAreaOptions,
  ) => Promise<SearchAreaResolution>;
}

function buildSearchBounds(input: PublicSearchInventoryInput) {
  if (
    input.minLat === undefined ||
    input.maxLat === undefined ||
    input.minLng === undefined ||
    input.maxLng === undefined
  ) {
    return undefined;
  }

  return {
    south: input.minLat,
    north: input.maxLat,
    west: input.minLng,
    east: input.maxLng,
  };
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
    maxBathrooms: input.maxBathrooms,
    minErfSize: input.minArea,
    maxErfSize: input.maxArea,
    minFloorSize: input.minArea,
    maxFloorSize: input.maxArea,
    bounds: buildSearchBounds(input),
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
    maxBathrooms: input.maxBathrooms,
    minArea: input.minArea,
    maxArea: input.maxArea,
    bounds: buildSearchBounds(input),
    locations: undefined,
  };
}

function sourceSort(sortOption: PublicSearchBlendSortOption): SortOption {
  return sortOption === 'relevance' ? 'date_desc' : sortOption;
}

export class PublicSearchService {
  constructor(private readonly searchAreaResolver: SearchAreaResolver = searchAreaAuthority) {}

  async searchInventory(input: PublicSearchInventoryInput): Promise<PublicSearchInventoryResult> {
    const validationIssue = validatePublicSearchInput(input);
    if (validationIssue) {
      throw new Error(validationIssue.message);
    }

    if (!input.listingType) {
      return emptyLocationResult(
        input,
        'unavailable',
        'Choose Buy or Rent before searching public inventory.',
      );
    }

    const page = normalizePublicSearchPageIndex(input.page);
    const pageSize = normalizePublicSearchPageSize(input.pageSize);
    const sortOption: PublicSearchBlendSortOption = isSearchResultSortOption(input.sortOption)
      ? input.sortOption
      : DEFAULT_SEARCH_RESULT_SORT;
    const sourceSortOption = sourceSort(sortOption);

    let location: ResolvedLocation | null = null;
    let searchAreaBoundary: SearchAreaQueryBoundary | undefined;
    let searchAreaContext: PublicSearchInventoryResult['searchAreaContext'];
    let locationState: PublicSearchInventoryResult['locationState'] = 'not_requested';
    let locationMessage: string | undefined;

    if (input.searchAreaId) {
      if (!input.listingType) {
        return emptyLocationResult(
          input,
          'unavailable',
          'Choose Buy or Rent before searching within a Search Area.',
        );
      }

      const searchAreaJourney = input.listingType === 'sale' ? 'buy' : 'rent';
      const resolution = await this.searchAreaResolver.resolveSearchArea(input.searchAreaId, {
        journey: searchAreaJourney,
      });

      if (resolution.status === 'preview') {
        return emptyLocationResult(input, 'unavailable', searchAreaFailureMessage('preview_only'));
      }

      if (resolution.status === 'unavailable') {
        return emptyLocationResult(
          input,
          'unavailable',
          searchAreaFailureMessage(resolution.reason),
        );
      }

      searchAreaBoundary = buildSearchAreaQueryBoundary(resolution) ?? undefined;
      if (!searchAreaBoundary) {
        return emptyLocationResult(
          input,
          'unavailable',
          'This Search Area has no safe canonical query boundary.',
        );
      }

      searchAreaContext = resolution.summary;
      locationState = 'resolved';

      if (input.locationId) {
        const refinement = await locationResolver.resolvePublicLocation({
          locationId: input.locationId,
        });

        if (refinement.status !== 'resolved' || !refinement.location) {
          return emptyLocationResult(
            input,
            refinement.status === 'ambiguous' ? 'ambiguous' : 'unresolved',
            refinement.message ||
              'That locality could not be resolved within the selected Search Area.',
          );
        }

        if (refinement.location.level !== 'suburb') {
          return emptyLocationResult(
            input,
            'unavailable',
            'A Search Area can only be refined by a canonical locality.',
          );
        }

        const narrowedBoundary = narrowSearchAreaQueryBoundary(
          searchAreaBoundary,
          input.locationId,
        );
        if (!narrowedBoundary) {
          return emptyLocationResult(
            input,
            'unavailable',
            'That locality is not an approved member of the selected Search Area.',
          );
        }

        searchAreaBoundary = narrowedBoundary;
        location = refinement.location;
        locationMessage = refinement.message;
      }
    } else if (hasLocationIntent(input)) {
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
    const fetchSourceResults = async (requestedPage: number) => {
      const sourcePageSize =
        manualEnabled && developmentEnabled ? (requestedPage + 1) * pageSize : pageSize;
      const sourcePage = manualEnabled && developmentEnabled ? 1 : requestedPage + 1;

      return Promise.all([
        manualEnabled
          ? searchAreaBoundary
            ? propertySearchService.searchProperties(
                filters,
                sourceSortOption,
                sourcePage,
                sourcePageSize,
                searchAreaBoundary,
              )
            : propertySearchService.searchProperties(
                filters,
                sourceSortOption,
                sourcePage,
                sourcePageSize,
              )
          : null,
        developmentEnabled
          ? searchAreaBoundary
            ? developmentDerivedListingService.searchListings(
                developmentFilters,
                sourceSortOption,
                sourcePage,
                sourcePageSize,
                searchAreaBoundary,
              )
            : developmentDerivedListingService.searchListings(
                developmentFilters,
                sourceSortOption,
                sourcePage,
                sourcePageSize,
              )
          : null,
      ]);
    };

    let [manualResults, developmentResults] = await fetchSourceResults(page);
    let manualTotal = manualResults?.total || 0;
    let developmentTotal = developmentResults?.total || 0;
    let total = manualTotal + developmentTotal;
    const canonicalPage = normalizePublicSearchPageForTotal(page, total, pageSize);

    if (canonicalPage !== page) {
      [manualResults, developmentResults] = await fetchSourceResults(canonicalPage);
      manualTotal = manualResults?.total || 0;
      developmentTotal = developmentResults?.total || 0;
      total = manualTotal + developmentTotal;
    }

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
        ? blended.slice(canonicalPage * pageSize, canonicalPage * pageSize + pageSize)
        : blended;
    const locationContext = location ? toLocationContext(location) : undefined;

    return {
      cards,
      total,
      page: canonicalPage,
      pageSize,
      hasMore: canAdvancePublicSearchPage(page, total, pageSize),
      locationContext,
      searchAreaContext,
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
