import type { SearchResultSortOption } from './transactionalSearchState';

export type PublicSearchBlendSortOption = SearchResultSortOption;

export interface PublicSearchBlendItem<T = unknown> {
  kind: 'property' | 'development';
  value: T;
}

export interface PublicSearchBlendFilters {
  listingSource?: 'manual' | 'development';
  developmentId?: unknown;
  cataloguePublisherId?: unknown;
  developmentStatus?: unknown;
  newDevelopment?: unknown;
  isNewDevelopment?: unknown;
  offPlan?: unknown;
  suburb?: unknown;
  city?: unknown;
  propertyType?: unknown;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minArea?: number;
  maxArea?: number;
}

const MANUALS_PER_DEVELOPMENT = 3;
const FOCUSED_MANUALS_PER_DEVELOPMENT = 5;
const FOCUSED_DEVELOPMENTS_PER_MANUAL = 2;

export type PublicSearchBlendMode =
  | 'manual_only'
  | 'development_only'
  | 'broad_discovery'
  | 'focused_property'
  | 'development_focused'
  | 'global_sort';

export interface PublicSearchBlendPolicy {
  mode: PublicSearchBlendMode;
  propertyBurst: number;
  developmentBurst: number;
  copy?: string;
}

function getSourceRank(kind: PublicSearchBlendItem['kind']): number {
  return kind === 'property' ? 0 : 1;
}

function getComparablePrice(item: PublicSearchBlendItem): number {
  return Number((item.value as any)?.price || 0);
}

function getComparableDate(item: PublicSearchBlendItem): number {
  return new Date((item.value as any)?.listedDate || (item.value as any)?.createdAt || 0).getTime();
}

function compareWithTieBreak(
  left: PublicSearchBlendItem,
  right: PublicSearchBlendItem,
  primaryComparison: number,
): number {
  if (primaryComparison !== 0) return primaryComparison;
  return getSourceRank(left.kind) - getSourceRank(right.kind);
}

function interleaveByRelevance(
  properties: PublicSearchBlendItem[],
  developments: PublicSearchBlendItem[],
  policy: Pick<PublicSearchBlendPolicy, 'propertyBurst' | 'developmentBurst'>,
): PublicSearchBlendItem[] {
  const mixed: PublicSearchBlendItem[] = [];
  let propertyIndex = 0;
  let developmentIndex = 0;

  while (propertyIndex < properties.length || developmentIndex < developments.length) {
    let insertedProperties = 0;
    while (propertyIndex < properties.length && insertedProperties < policy.propertyBurst) {
      mixed.push(properties[propertyIndex]);
      propertyIndex += 1;
      insertedProperties += 1;
    }

    let insertedDevelopments = 0;
    while (
      developmentIndex < developments.length &&
      insertedDevelopments < policy.developmentBurst
    ) {
      mixed.push(developments[developmentIndex]);
      developmentIndex += 1;
      insertedDevelopments += 1;
    }
  }

  return mixed;
}

function hasDevelopmentIntent(filters: PublicSearchBlendFilters): boolean {
  return [
    filters.developmentId,
    filters.cataloguePublisherId,
    filters.developmentStatus,
    filters.newDevelopment,
    filters.isNewDevelopment,
    filters.offPlan,
  ].some(Boolean);
}

function getFocusedSearchSignalScore(filters: PublicSearchBlendFilters): number {
  let score = 0;

  if (filters.suburb) score += 2;
  else if (filters.city) score += 1;

  if (filters.propertyType) score += 1;
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) score += 1;
  if (filters.minBedrooms !== undefined || filters.maxBedrooms !== undefined) score += 1;
  if (filters.minBathrooms !== undefined || filters.maxBathrooms !== undefined) score += 1;
  if (filters.minArea !== undefined || filters.maxArea !== undefined) score += 1;

  return score;
}

export function resolvePublicSearchBlendPolicy(
  filters: PublicSearchBlendFilters,
  sortBy: PublicSearchBlendSortOption,
): PublicSearchBlendPolicy {
  if (filters.listingSource === 'manual') {
    return {
      mode: 'manual_only',
      propertyBurst: Number.POSITIVE_INFINITY,
      developmentBurst: 0,
    };
  }

  if (filters.listingSource === 'development') {
    return {
      mode: 'development_only',
      propertyBurst: 0,
      developmentBurst: Number.POSITIVE_INFINITY,
    };
  }

  if (sortBy !== 'relevance') {
    return {
      mode: 'global_sort',
      propertyBurst: Number.POSITIVE_INFINITY,
      developmentBurst: Number.POSITIVE_INFINITY,
    };
  }

  if (hasDevelopmentIntent(filters)) {
    return {
      mode: 'development_focused',
      propertyBurst: 1,
      developmentBurst: FOCUSED_DEVELOPMENTS_PER_MANUAL,
      copy:
        'New developments are prioritised for this search. Property listings are interleaved between development inventory.',
    };
  }

  if (getFocusedSearchSignalScore(filters) >= 3) {
    return {
      mode: 'focused_property',
      propertyBurst: FOCUSED_MANUALS_PER_DEVELOPMENT,
      developmentBurst: 1,
      copy:
        'Property listings are prioritised for focused searches. New developments are interleaved after every five listings.',
    };
  }

  return {
    mode: 'broad_discovery',
    propertyBurst: MANUALS_PER_DEVELOPMENT,
    developmentBurst: 1,
    copy:
      'Property listings are prioritised first. New developments are interleaved after every three listings.',
  };
}

export function blendPublicSearchResults(
  properties: PublicSearchBlendItem[],
  developments: PublicSearchBlendItem[],
  sortBy: PublicSearchBlendSortOption,
  filters: PublicSearchBlendFilters,
): PublicSearchBlendItem[] {
  if (!developments.length) return properties;
  if (!properties.length) return developments;

  const policy = resolvePublicSearchBlendPolicy(filters, sortBy);

  if (sortBy === 'price_asc' || sortBy === 'price_desc') {
    return [...properties, ...developments].sort((left, right) =>
      compareWithTieBreak(
        left,
        right,
        sortBy === 'price_asc'
          ? getComparablePrice(left) - getComparablePrice(right)
          : getComparablePrice(right) - getComparablePrice(left),
      ),
    );
  }

  if (sortBy === 'date_asc' || sortBy === 'date_desc') {
    return [...properties, ...developments].sort((left, right) =>
      compareWithTieBreak(
        left,
        right,
        sortBy === 'date_asc'
          ? getComparableDate(left) - getComparableDate(right)
          : getComparableDate(right) - getComparableDate(left),
      ),
    );
  }

  return interleaveByRelevance(properties, developments, policy);
}
