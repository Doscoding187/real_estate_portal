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
import type { PropertyFilters, SearchCardResult } from '../../shared/types';
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
import {
  developmentUnitTypeCards,
  mixListingsAndUnitTypes,
  type DevelopmentUnitTypeCard,
} from './developmentUnitTypeCards';
import { propertySearchService, type ManualPropertySortOption } from './propertySearchService';
import { developmentSearchPlaceIds, ROLLUP_MAX_PLACE_IDS } from './placeLocalityRollupService';
import { getDb } from '../db-connection';

/** Unit-type results read at most this many eligible developments per search (50 per read). */
export const UNIT_TYPE_DEVELOPMENT_BOUND = 200;
const UNIT_TYPE_DEVELOPMENT_PAGE_SIZE = 50;

/** Public inventory sort values: the shared search sorts plus the homepage rail's trending order. */
export type PublicInventorySortOption = SearchResultSortOption | 'trending';

export interface PublicSearchInventoryInput {
  canonicalPlaceId?: string;
  /**
   * 1..MULTI_LOCATION_MAX selected Places; exclusive with canonicalPlaceId. Manual listings, plus
   * development unit types when developmentResultShape is 'unit_type'.
   */
  canonicalPlaceIds?: string[];
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
  sortOption?: PublicInventorySortOption;
  /** Manual source only: require an approved photo. Development results ignore it. */
  requirePhoto?: boolean;
  /**
   * 'development' (default) returns one card per development. 'unit_type'
   * returns one card per available unit type, mixed with listings up to the rail limit.
   */
  developmentResultShape?: 'development' | 'unit_type';
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
  /** Every selected Place, in request order, when several were requested. */
  canonicalPlaceContexts?: Array<CanonicalPlaceSearchLabel & { scopePolicy: string }>;
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
  input: PublicSearchInventoryInput,
  page: number,
  pageSize: number,
  placeIds?: string[],
): Parameters<typeof publicDevelopmentSearchService.search>[0] {
  const unitTypeShape = input.developmentResultShape === 'unit_type';
  return {
    // Unit-type cards match a development whose accepted site Place is any searched Place
    // (the area and its member suburbs, or each selected area); whole developments stay exact.
    ...(unitTypeShape && placeIds?.length
      ? { canonicalPlaceIds: placeIds }
      : { canonicalPlaceId: input.canonicalPlaceId }),
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
    sortOption: input.sortOption === 'trending' ? 'date_desc' : input.sortOption,
    page,
    pageSize,
    ...(unitTypeShape ? { includeUnitSize: true, skipDevelopmentRangeFilters: true } : {}),
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

function sourceSort(sortOption: PublicInventorySortOption): ManualPropertySortOption {
  return sortOption === 'relevance' ? 'date_desc' : sortOption;
}

/**
 * Place IDs a resale/agent-listing search for one selected Place covers. A metro city includes the
 * localities beneath it (the same rollup, cache and bound as development search); a locality stays
 * an exact match; a province keeps its own member rule.
 */
async function manualSearchPlaceIds(
  execution: Parameters<typeof canonicalPlaceSearchMembers>[0],
  projection: CanonicalPlaceSearchProjection,
): Promise<{ placeIds: string[]; rolledUp: boolean }> {
  if (execution.scope !== 'metro_city') {
    return { placeIds: canonicalPlaceSearchMembers(execution, projection), rolledUp: false };
  }
  const database = await getDb();
  if (!database) {
    return { placeIds: canonicalPlaceSearchMembers(execution, projection), rolledUp: false };
  }
  return {
    placeIds: await developmentSearchPlaceIds(database as any, execution.placeId),
    rolledUp: true,
  };
}

export class PublicSearchService {
  async searchInventory(
    requestedInput: PublicSearchInventoryInput,
  ): Promise<PublicSearchInventoryResult> {
    if (isCommercialMarketingPropertyType(requestedInput.propertyType)) {
      throw new Error(COMMERCIAL_PUBLIC_JOURNEY_HANDOFF_MESSAGE);
    }

    const validationIssue = validatePublicSearchInput(requestedInput);
    if (validationIssue) throw new Error(validationIssue.message);

    // A one-item list is the single-Place search (so Developments stay included).
    const { canonicalPlaceIds: requestedPlaceIds, ...inputWithoutList } = requestedInput;
    const input: PublicSearchInventoryInput =
      requestedPlaceIds?.length === 1
        ? { ...inputWithoutList, canonicalPlaceId: requestedPlaceIds[0] }
        : requestedInput;
    const multiPlaceIds = input.canonicalPlaceIds;

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
    const sortOption: PublicInventorySortOption =
      input.sortOption === 'relevance' ||
      input.sortOption === 'trending' ||
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
    let canonicalPlaceContexts: PublicSearchInventoryResult['canonicalPlaceContexts'];
    let placeSetRolledUp = false;

    if (multiPlaceIds !== undefined) {
      placeProjection = await loadCanonicalPlaceSearchProjection(undefined, {
        placeIds: multiPlaceIds,
      });
      const selected = multiPlaceIds.map(placeId => ({
        execution: placeProjection!.executions.get(placeId),
        label: placeProjection!.labels.get(placeId),
      }));
      if (selected.some(item => !item.execution || !item.label)) {
        return emptyLocationResult(
          input,
          'unavailable',
          'One of the selected Places cannot currently be searched. Choose other approved Places.',
        );
      }
      if (selected.some(item => item.execution!.scope === 'province')) {
        return emptyLocationResult(
          input,
          'unavailable',
          'A province cannot be combined with other Places. Choose cities or suburbs.',
        );
      }
      const memberSets = await Promise.all(
        selected.map(item => manualSearchPlaceIds(item.execution!, placeProjection!)),
      );
      placeSetRolledUp = memberSets.some(item => item.rolledUp);
      placeMemberIds = [...new Set(memberSets.flatMap(item => item.placeIds))].slice(
        0,
        ROLLUP_MAX_PLACE_IDS,
      );
      canonicalPlaceContexts = selected.map(item => ({
        ...item.label!,
        scopePolicy: PLACE_INVENTORY_SCOPE_POLICY,
      }));
      canonicalPlaceContext = canonicalPlaceContexts[0];
    } else if (input.canonicalPlaceId !== undefined) {
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
        const members = await manualSearchPlaceIds(execution, placeProjection);
        placeMemberIds = members.placeIds;
        placeSetRolledUp = members.rolledUp;
      }
      canonicalPlaceContext = { ...label, scopePolicy: PLACE_INVENTORY_SCOPE_POLICY };
    }

    const filters = buildPublicFilters(input, placeMemberIds);
    const manualEnabled = input.listingSource !== 'development';
    const unitTypePlaceIds = placeMemberIds?.length ? placeMemberIds : undefined;
    // Unit types follow the searched Places (one, a place with its members, or several areas);
    // whole development cards stay single-Place.
    const unitTypeShape =
      input.developmentResultShape === 'unit_type' &&
      input.listingSource !== 'manual' &&
      (Boolean(input.canonicalPlaceId) || Boolean(multiPlaceIds?.length));
    // A requested place that resolves to no searchable member Places yields no unit types; it must
    // never widen into an unfiltered development search. (A province keeps its own scoped rollup.)
    const unitTypeScopeEmpty =
      unitTypeShape && !provincePlaceId && !unitTypePlaceIds?.length;
    const developmentEnabled =
      (unitTypeShape && !unitTypeScopeEmpty) ||
      (!unitTypeShape && input.listingSource !== 'manual' && Boolean(input.canonicalPlaceId));
    const fetchSourceResults = async (requestedPage: number) => {
      const combined = (manualEnabled && developmentEnabled) || unitTypeShape;
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
                ...(input.requirePhoto ? { requirePhoto: true } : {}),
                // A rolled-up city search covers more Places than the projection loaded for the
                // selected ones, so let the search load labels for the Places it actually finds.
                ...(placeProjection && !placeSetRolledUp ? { placeProjection } : {}),
                provincePlaceId,
              },
            )
          : null,
        developmentEnabled && !unitTypeShape
          ? publicDevelopmentSearchService.search(
              buildDevelopmentSearchInput(
                input,
                developmentSourcePage,
                sourcePageSize,
                unitTypePlaceIds,
              ),
            )
          : null,
      ]);
    };

    // Unit-type cards are built and filtered from the whole eligible development set (bounded), so
    // the total is exact and every match is reachable; only then are they mixed and paged.
    let unitTypeCards: DevelopmentUnitTypeCard[] = [];
    if (unitTypeShape && developmentEnabled) {
      const developmentItems: PublicDevelopmentSearchItem[] = [];
      for (
        let developmentPage = 0;
        developmentItems.length < UNIT_TYPE_DEVELOPMENT_BOUND;
        developmentPage += 1
      ) {
        const chunk = await publicDevelopmentSearchService.search(
          buildDevelopmentSearchInput(
            input,
            developmentPage,
            UNIT_TYPE_DEVELOPMENT_PAGE_SIZE,
            unitTypePlaceIds,
          ),
        );
        developmentItems.push(...chunk.items);
        if (!chunk.hasMore) break;
        if (developmentItems.length >= UNIT_TYPE_DEVELOPMENT_BOUND) {
          console.warn(
            `[publicSearch] unit-type results cut to the first ${UNIT_TYPE_DEVELOPMENT_BOUND} developments`,
          );
          break;
        }
      }
      unitTypeCards = developmentItems.flatMap(item =>
        developmentUnitTypeCards(item, {
          listingType: input.listingType!,
          requirePhoto: input.requirePhoto,
          filters: {
            minPrice: input.minPrice,
            maxPrice: input.maxPrice,
            minBedrooms: input.minBedrooms,
            maxBedrooms: input.maxBedrooms,
            propertyType: input.propertyType,
          },
        }),
      );
    }

    let [manualResults, developmentResults] = await fetchSourceResults(page);
    let manualTotal = manualResults?.total || 0;
    const developmentTotalFor = () =>
      unitTypeShape ? unitTypeCards.length : developmentResults?.total || 0;
    let developmentTotal = developmentTotalFor();
    let total = manualTotal + developmentTotal;
    const canonicalPage = normalizePublicSearchPageForTotal(page, total, pageSize);

    if (canonicalPage !== page) {
      [manualResults, developmentResults] = await fetchSourceResults(canonicalPage);
      manualTotal = manualResults?.total || 0;
      developmentTotal = developmentTotalFor();
      total = manualTotal + developmentTotal;
    }

    const manualCards = (manualResults?.cards || []) as SearchCardResult[];
    const developmentCards = unitTypeShape
      ? []
      : (developmentResults?.items || []).map(developmentCard);
    const blended =
      manualEnabled && developmentEnabled
        ? blendSearchSources(
            manualCards,
            developmentCards,
            // Trending orders the manual source only; keep its order and interleave.
            sortOption === 'trending' ? 'relevance' : sortOption,
          )
        : manualEnabled
          ? manualCards
          : developmentCards;
    const cards = unitTypeShape
      ? mixListingsAndUnitTypes(manualEnabled ? manualCards : [], unitTypeCards, {
          limit: (canonicalPage + 1) * pageSize,
        }).slice(canonicalPage * pageSize, canonicalPage * pageSize + pageSize)
      : manualEnabled && developmentEnabled
        ? blended.slice(canonicalPage * pageSize, canonicalPage * pageSize + pageSize)
        : blended;

    return {
      cards,
      total,
      page: canonicalPage,
      pageSize,
      hasMore: canAdvancePublicSearchPage(canonicalPage, total, pageSize),
      canonicalPlaceContext,
      ...(canonicalPlaceContexts ? { canonicalPlaceContexts } : {}),
      locationState: input.canonicalPlaceId || multiPlaceIds ? 'resolved' : 'not_requested',
      sourceCounts: {
        manual: manualTotal,
        development: developmentTotal,
      },
    };
  }
}

export const publicSearchService = new PublicSearchService();
