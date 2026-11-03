import {
  canonicalPlaceSearchMembers,
  loadCanonicalPlaceSearchProjection,
  PLACE_INVENTORY_SCOPE_POLICY,
  type CanonicalPlaceSearchLabel,
  type CanonicalPlaceSearchProjection,
} from './canonicalPlaceSearchService';
import {
  type SearchResultSortOption,
} from '../../shared/transactionalSearchState';
import {
  canAdvancePublicSearchPage,
  normalizePublicSearchPageForTotal,
  normalizePublicSearchPageIndex,
  normalizePublicSearchPageSize,
} from '../../shared/publicSearchPagination';
import type { PropertyFilters, SearchCardResult, SortOption } from '../../shared/types';
import type { PublicDevelopmentSearchItem } from '../../shared/publicDevelopmentSearch';
import { isCanonicalPlaceId } from '../../shared/placeAuthority';
import { validatePublicSearchInput } from '../../shared/publicSearchValidation';
import { buildDevelopmentCardHighlights } from '../../shared/listing-highlight-registry';
import {
  BUY_PUBLIC_PROPERTY_TYPES,
  RENT_PUBLIC_PROPERTY_TYPES,
} from '../../shared/property-taxonomy';
import {
  COMMERCIAL_PUBLIC_JOURNEY_HANDOFF_MESSAGE,
  isCommercialMarketingPropertyType,
} from '../../shared/commercial-domain';
import { publicDevelopmentSearchService } from './publicDevelopmentSearchService';
import { propertySearchService } from './propertySearchService';

export interface PublicSearchInventoryInput {
  canonicalPlaceId?: string;
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
  minFloorSize?: number;
  maxFloorSize?: number;
  minErfSize?: number;
  maxErfSize?: number;
  minLandSize?: number;
  maxLandSize?: number;
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
  sortOption?: SearchResultSortOption;
  page?: number;
  pageSize?: number;
}

export interface PublicSearchInventoryResult {
  cards: SearchCardResult[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  canonicalPlaceContext?: CanonicalPlaceSearchLabel & { scopePolicy: string };
  locationState: 'not_requested' | 'resolved' | 'unresolved' | 'ambiguous' | 'unavailable';
  locationMessage?: string;
  sourceCounts: {
    manual: number;
    development: number;
  };
}

function emptyLocationResult(
  input: PublicSearchInventoryInput,
  status: 'unresolved' | 'ambiguous' | 'unavailable',
  message: string,
): PublicSearchInventoryResult {
  const pageSize = normalizePublicSearchPageSize(input.pageSize);
  return {
    cards: [],
    total: 0,
    page: 0,
    pageSize,
    hasMore: false,
    locationState: status,
    locationMessage: message,
    sourceCounts: { manual: 0, development: 0 },
  };
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

function genericJourneyPropertyTypes(
  listingType: 'sale' | 'rent',
  requestedPropertyType?: string,
): NonNullable<PropertyFilters['propertyType']> {
  if (isCommercialMarketingPropertyType(requestedPropertyType)) {
    throw new Error(COMMERCIAL_PUBLIC_JOURNEY_HANDOFF_MESSAGE);
  }
  if (requestedPropertyType) return [requestedPropertyType as any];
  return [
    ...(listingType === 'sale' ? BUY_PUBLIC_PROPERTY_TYPES : RENT_PUBLIC_PROPERTY_TYPES),
  ] as any;
}

function buildPublicFilters(
  input: PublicSearchInventoryInput,
  placeMemberIds?: string[],
): PropertyFilters {
  return {
    canonicalPlaceIds: placeMemberIds,
    propertyType: genericJourneyPropertyTypes(input.listingType!, input.propertyType),
    listingType: input.listingType,
    minPrice: input.minPrice,
    maxPrice: input.maxPrice,
    minBedrooms: input.minBedrooms,
    maxBedrooms: input.maxBedrooms,
    minBathrooms: input.minBathrooms,
    minErfSize: input.minErfSize,
    maxErfSize: input.maxErfSize,
    minFloorSize: input.minFloorSize ?? input.minArea,
    maxFloorSize: input.maxFloorSize ?? input.maxArea,
    minLandSize: input.minLandSize,
    maxLandSize: input.maxLandSize,
    bounds: buildSearchBounds(input),
  };
}

function buildDevelopmentSearchInput(
  input: PublicSearchInventoryInput & { canonicalPlaceId: string },
  page: number,
  pageSize: number,
): Parameters<typeof publicDevelopmentSearchService.search>[0] {
  return {
    canonicalPlaceId: input.canonicalPlaceId,
    transactionType: input.listingType === 'rent' ? 'for_rent' : 'for_sale',
    developmentType:
      input.propertyType === 'plot'
        ? 'land'
        : input.propertyType === 'commercial'
          ? 'commercial'
          : 'residential',
    minPrice: input.minPrice,
    maxPrice: input.maxPrice,
    minBedrooms: input.minBedrooms,
    maxBedrooms: input.maxBedrooms,
    sortOption: input.sortOption,
    page,
    pageSize,
  };
}

function developmentCard(item: PublicDevelopmentSearchItem): SearchCardResult {
  const location = item.locationLabels.join(', ');
  const publisherRole =
    item.publisher.authorityKind === 'platform_reference' ? 'platform' : 'developer';
  const publisherProvenance =
    item.publisher.authorityKind === 'platform_reference' ? 'platform_curated' : 'developer';
  const price = item.priceFrom ?? 0;
  const firstImage = item.images[0] ?? '';
  const bathrooms = item.unitTypes
    .map(unit => unit.bathrooms)
    .filter((value): value is number => value !== null && Number.isFinite(value));

  return {
    kind: 'development',
    id: String(item.id),
    href: item.canonicalRoute,
    title: item.name,
    location,
    city: '',
    suburb: '',
    province: '',
    ...(item.canonicalPlaceId ? { canonicalPlaceId: item.canonicalPlaceId } : {}),
    locationLabels: item.locationLabels,
    price,
    image: firstImage,
    images: item.images.map(url => ({ url })),
    description: item.description ?? undefined,
    bedrooms: item.bedroomRange.min ?? undefined,
    bathrooms: bathrooms.length ? Math.min(...bathrooms) : undefined,
    propertyType:
      item.developmentType === 'land'
        ? 'plot'
        : item.developmentType === 'commercial'
          ? 'commercial'
          : 'house',
    listingType: item.transactionType === 'for_rent' ? 'rent' : 'sale',
    listingSource: 'development',
    contactRole: publisherRole,
    identity: {
      role: publisherRole,
      provenance: publisherProvenance,
      name: item.publisher.name,
      organizationName: item.publisher.name,
      organizationLogoUrl: item.publisher.logoUrl,
      cataloguePublisherId: item.publisher.id,
    },
    development: { id: item.id, name: item.name, slug: item.slug },
    developerBrand: {
      id: item.publisher.id,
      brandName: item.publisher.name,
      slug: item.publisher.slug,
      logoUrl: item.publisher.logoUrl ?? undefined,
    },
    highlights: buildDevelopmentCardHighlights(item.highlights),
    badges: [item.status],
    imageCount: item.images.length,
    transactionType: item.transactionType,
    listedDate: item.createdAt ? new Date(item.createdAt) : new Date(0),
    developmentId: item.id,
    availableUnits: item.availableUnits ?? undefined,
    totalUnits: item.totalUnits ?? undefined,
  };
}

type SearchSource = 'property' | 'development';
type SearchSourceResult = { kind: SearchSource; value: SearchCardResult };

function sourcePrice(item: SearchSourceResult): number {
  return Number(item.value.price ?? 0);
}

function sourceDate(item: SearchSourceResult): number {
  const value = item.value as SearchCardResult & { listedDate?: string | Date; createdAt?: string | Date };
  return new Date(value.listedDate ?? value.createdAt ?? 0).getTime();
}

/** Mix the two canonical inventory sources without inspecting geography labels. */
function blendSearchSources(
  properties: SearchCardResult[],
  developments: SearchCardResult[],
  sortOption: SearchResultSortOption,
): SearchCardResult[] {
  if (!properties.length) return developments;
  if (!developments.length) return properties;

  const combined: SearchSourceResult[] = [
    ...properties.map(value => ({ kind: 'property' as const, value })),
    ...developments.map(value => ({ kind: 'development' as const, value })),
  ];
  if (sortOption === 'price_asc' || sortOption === 'price_desc') {
    return combined
      .sort((left, right) => {
        const delta = sourcePrice(left) - sourcePrice(right);
        return (sortOption === 'price_asc' ? delta : -delta) || Number(left.kind === 'development') - Number(right.kind === 'development');
      })
      .map(item => item.value);
  }
  if (sortOption === 'date_asc' || sortOption === 'date_desc') {
    return combined
      .sort((left, right) => {
        const delta = sourceDate(left) - sourceDate(right);
        return (sortOption === 'date_asc' ? delta : -delta) || Number(left.kind === 'development') - Number(right.kind === 'development');
      })
      .map(item => item.value);
  }

  const mixed: SearchCardResult[] = [];
  let propertyIndex = 0;
  let developmentIndex = 0;
  while (propertyIndex < properties.length || developmentIndex < developments.length) {
    mixed.push(...properties.slice(propertyIndex, propertyIndex + 3));
    propertyIndex += 3;
    if (developmentIndex < developments.length) mixed.push(developments[developmentIndex++]);
  }
  return mixed;
}

function sourceSort(sortOption: SearchResultSortOption): SortOption {
  return sortOption === 'relevance' ? 'date_desc' : sortOption;
}

export class PublicSearchService {
  async searchInventory(input: PublicSearchInventoryInput): Promise<PublicSearchInventoryResult> {
    if (isCommercialMarketingPropertyType(input.propertyType)) {
      throw new Error(COMMERCIAL_PUBLIC_JOURNEY_HANDOFF_MESSAGE);
    }

    const validationIssue = validatePublicSearchInput(input);
    if (validationIssue) throw new Error(validationIssue.message);

    if (!input.listingType) {
      return emptyLocationResult(
        input,
        'unavailable',
        'Choose Buy or Rent before searching public inventory.',
      );
    }

    if (input.listingSource === 'development' && !input.canonicalPlaceId) {
      return emptyLocationResult(
        input,
        'unavailable',
        'Choose one approved canonical Place to search Development inventory.',
      );
    }

    const page = normalizePublicSearchPageIndex(input.page);
    const pageSize = normalizePublicSearchPageSize(input.pageSize);
    const sortOption: SearchResultSortOption =
      input.sortOption === 'relevance' ||
      input.sortOption === 'price_asc' ||
      input.sortOption === 'price_desc' ||
      input.sortOption === 'date_desc' ||
      input.sortOption === 'date_asc'
        ? input.sortOption
        : 'relevance';
    const sourceSortOption = sourceSort(sortOption);

    let placeProjection: CanonicalPlaceSearchProjection | undefined;
    let canonicalPlaceContext: PublicSearchInventoryResult['canonicalPlaceContext'];
    let placeMemberIds: string[] | undefined;
    let provincePlaceId: string | undefined;

    if (input.canonicalPlaceId !== undefined) {
      if (!isCanonicalPlaceId(input.canonicalPlaceId)) {
        return emptyLocationResult(
          input,
          'unavailable',
          'Choose a valid canonical Place identity.',
        );
      }
      placeProjection = await loadCanonicalPlaceSearchProjection(undefined, {
        placeIds: [input.canonicalPlaceId],
      });
      const execution = placeProjection.executions.get(input.canonicalPlaceId);
      const label = placeProjection.labels.get(input.canonicalPlaceId);
      if (!execution || !label) {
        return emptyLocationResult(
          input,
          'unavailable',
          'The selected Place cannot currently be searched. Choose another approved Place.',
        );
      }
      if (execution.scope === 'province') {
        provincePlaceId = execution.placeId;
      } else {
        placeMemberIds = canonicalPlaceSearchMembers(execution, placeProjection);
      }
      canonicalPlaceContext = { ...label, scopePolicy: PLACE_INVENTORY_SCOPE_POLICY };
    }

    const filters = buildPublicFilters(input, placeMemberIds);
    const manualEnabled = input.listingSource !== 'development';
    const developmentEnabled = input.listingSource !== 'manual' && Boolean(input.canonicalPlaceId);
    const fetchSourceResults = async (requestedPage: number) => {
      const combined = manualEnabled && developmentEnabled;
      const sourcePageSize = combined ? (requestedPage + 1) * pageSize : pageSize;
      const manualSourcePage = combined ? 1 : requestedPage + 1;
      const developmentSourcePage = combined ? 0 : requestedPage;
      return Promise.all([
        manualEnabled
          ? propertySearchService.searchProperties(
              filters,
              sourceSortOption,
              manualSourcePage,
              sourcePageSize,
              {
                publicOnly: true,
                ...(placeProjection ? { placeProjection } : {}),
                provincePlaceId,
              },
            )
          : null,
        developmentEnabled
          ? publicDevelopmentSearchService.search(
              buildDevelopmentSearchInput(
                { ...input, canonicalPlaceId: input.canonicalPlaceId! },
                developmentSourcePage,
                sourcePageSize,
              ),
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
    const developmentCards = (developmentResults?.items || []).map(developmentCard);
    const blended =
      manualEnabled && developmentEnabled
        ? blendSearchSources(manualCards, developmentCards, sortOption)
        : manualEnabled
          ? manualCards
          : developmentCards;
    const cards =
      manualEnabled && developmentEnabled
        ? blended.slice(canonicalPage * pageSize, canonicalPage * pageSize + pageSize)
        : blended;

    return {
      cards,
      total,
      page: canonicalPage,
      pageSize,
      hasMore: canAdvancePublicSearchPage(canonicalPage, total, pageSize),
      canonicalPlaceContext,
      locationState: input.canonicalPlaceId ? 'resolved' : 'not_requested',
      sourceCounts: {
        manual: manualTotal,
        development: developmentTotal,
      },
    };
  }
}

export const publicSearchService = new PublicSearchService();
