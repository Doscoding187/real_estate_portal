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
  parseCanonicalLocationId,
  encodeCanonicalLocationId,
} from '../../shared/locationAuthority';
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
  buildCanonicalLocationQueryBoundary,
  combineSearchAreaQueryBoundaries,
  narrowSearchAreaQueryBoundary,
  type PublicSearchQueryBoundary,
} from './searchAreaQueryBoundary';

export interface PublicSearchInventoryInput {
  province?: string;
  city?: string;
  suburb?: string[];
  locations?: string[];
  locationId?: string;
  locationIds?: string[];
  searchAreaId?: string;
  searchAreaIds?: string[];
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
  searchAreaContexts?: SearchAreaSummary[];
  multiLocationContext?: {
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
    input.locationIds?.length ||
    input.searchAreaId ||
    input.searchAreaIds?.length ||
    input.province ||
    input.city ||
    input.suburb?.length ||
    input.locations?.length,
  );
}

function canonicalizeCanonicalLocationIds(locationIds: readonly string[]): string[] {
  return Array.from(
    new Set(
      locationIds
        .map(locationId => parseCanonicalLocationId(locationId))
        .filter((value): value is NonNullable<typeof value> => Boolean(value))
        .map(value => encodeCanonicalLocationId(value.level, value.id)),
    ),
  ).sort();
}

function canonicalizeSearchAreaIds(searchAreaIds: readonly string[]): string[] {
  return Array.from(new Set(searchAreaIds.map(value => value.trim()).filter(Boolean))).sort();
}

function toMultiLocationContext(
  locations: readonly ResolvedLocation[],
  canonicalLocationIds: readonly string[],
): NonNullable<PublicSearchInventoryResult['multiLocationContext']> | undefined {
  if (locations.length === 0 || locations.length !== canonicalLocationIds.length) return undefined;
  const first = locations[0];
  const level = first.level;
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
    level,
    parentName:
      level === 'city' ? first.province.name : level === 'suburb' ? first.city?.name : undefined,
    locations: mapped.sort((a, b) => a.canonicalLocationId.localeCompare(b.canonicalLocationId)),
  };
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

export interface PublicLocationResolver {
  resolvePublicLocation: (opts: {
    locationId?: string;
    provinceSlug?: string;
    citySlug?: string;
    suburbSlug?: string;
  }) => Promise<Awaited<ReturnType<typeof locationResolver.resolvePublicLocation>>>;
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
  constructor(
    private readonly searchAreaResolver: SearchAreaResolver = searchAreaAuthority,
    private readonly publicLocationResolver: PublicLocationResolver = locationResolver,
  ) {}

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
    let queryBoundary: PublicSearchQueryBoundary | undefined;
    let searchAreaContext: PublicSearchInventoryResult['searchAreaContext'];
    let searchAreaContexts: PublicSearchInventoryResult['searchAreaContexts'];
    let multiLocationContext: PublicSearchInventoryResult['multiLocationContext'];
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

      queryBoundary = buildSearchAreaQueryBoundary(resolution) ?? undefined;
      if (!queryBoundary) {
        return emptyLocationResult(
          input,
          'unavailable',
          'This Search Area has no safe canonical query boundary.',
        );
      }

      searchAreaContext = resolution.summary;
      locationState = 'resolved';

      if (input.locationId) {
        const refinement = await this.publicLocationResolver.resolvePublicLocation({
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

        const narrowedBoundary = narrowSearchAreaQueryBoundary(queryBoundary, input.locationId);
        if (!narrowedBoundary) {
          return emptyLocationResult(
            input,
            'unavailable',
            'That locality is not an approved member of the selected Search Area.',
          );
        }

        queryBoundary = narrowedBoundary;
        location = refinement.location;
        locationMessage = refinement.message;
      }
    } else if (input.searchAreaIds?.length) {
      const searchAreaJourney = input.listingType === 'sale' ? 'buy' : 'rent';
      const searchAreaIds = canonicalizeSearchAreaIds(input.searchAreaIds);
      const resolutions = await Promise.all(
        searchAreaIds.map(searchAreaId =>
          this.searchAreaResolver.resolveSearchArea(searchAreaId, {
            journey: searchAreaJourney,
          }),
        ),
      );

      const unavailableResolution = resolutions.find(
        resolution => resolution.status !== 'available',
      );
      if (unavailableResolution?.status === 'preview') {
        return emptyLocationResult(input, 'unavailable', searchAreaFailureMessage('preview_only'));
      }
      if (unavailableResolution?.status === 'unavailable') {
        return emptyLocationResult(
          input,
          'unavailable',
          searchAreaFailureMessage(unavailableResolution.reason),
        );
      }

      const boundaries = resolutions
        .map(resolution =>
          resolution.status === 'available' ? buildSearchAreaQueryBoundary(resolution) : null,
        )
        .filter((boundary): boundary is NonNullable<typeof boundary> => Boolean(boundary));
      queryBoundary = combineSearchAreaQueryBoundaries(boundaries) ?? undefined;
      if (!queryBoundary) {
        return emptyLocationResult(
          input,
          'unavailable',
          'The selected Search Areas do not share one safe canonical parent boundary.',
        );
      }

      const availableResolutions = resolutions.filter(
        (
          resolution,
        ): resolution is Extract<SearchAreaResolution, { status: 'available' | 'preview' }> & {
          status: 'available';
        } => resolution.status === 'available',
      );
      searchAreaContexts = availableResolutions.map(resolution => resolution.summary);
      searchAreaContext = searchAreaContexts.length === 1 ? searchAreaContexts[0] : undefined;
      locationState = 'resolved';
    } else if (input.locationIds?.length) {
      const canonicalLocationIds = canonicalizeCanonicalLocationIds(input.locationIds);
      const resolutions = await Promise.all(
        canonicalLocationIds.map(locationId =>
          this.publicLocationResolver.resolvePublicLocation({ locationId }),
        ),
      );
      const unresolvedResolution = resolutions.find(
        resolution => resolution.status !== 'resolved' || !resolution.location,
      );
      if (unresolvedResolution) {
        return emptyLocationResult(
          input,
          unresolvedResolution.status === 'ambiguous' ? 'ambiguous' : 'unresolved',
          unresolvedResolution.message ||
            'One or more selected locations could not be resolved canonically.',
        );
      }

      const resolvedLocations = resolutions.map(resolution => resolution.location!);
      queryBoundary =
        buildCanonicalLocationQueryBoundary(resolvedLocations, canonicalLocationIds) ?? undefined;
      if (!queryBoundary) {
        return emptyLocationResult(
          input,
          'unavailable',
          'Selected locations must be canonical siblings at one geographic level.',
        );
      }

      multiLocationContext = toMultiLocationContext(resolvedLocations, canonicalLocationIds);
      locationState = 'resolved';
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

      const resolution = await this.publicLocationResolver.resolvePublicLocation({
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
          ? queryBoundary
            ? propertySearchService.searchProperties(
                filters,
                sourceSortOption,
                sourcePage,
                sourcePageSize,
                queryBoundary,
              )
            : propertySearchService.searchProperties(
                filters,
                sourceSortOption,
                sourcePage,
                sourcePageSize,
              )
          : null,
        developmentEnabled
          ? queryBoundary
            ? developmentDerivedListingService.searchListings(
                developmentFilters,
                sourceSortOption,
                sourcePage,
                sourcePageSize,
                queryBoundary,
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
      searchAreaContexts,
      multiLocationContext,
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
