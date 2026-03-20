export type SearchBlendSortOption =
  | 'relevance'
  | 'price_asc'
  | 'price_desc'
  | 'date_desc'
  | 'date_asc';

export interface SearchBlendItem<T = unknown> {
  kind: 'property' | 'development';
  value: T;
}

const MANUALS_PER_DEVELOPMENT = 3;

function getSourceRank(kind: SearchBlendItem['kind']): number {
  return kind === 'property' ? 0 : 1;
}

function getComparablePrice(item: SearchBlendItem): number {
  return Number((item.value as any)?.price || 0);
}

function getComparableDate(item: SearchBlendItem): number {
  return new Date((item.value as any)?.listedDate || (item.value as any)?.createdAt || 0).getTime();
}

function compareWithTieBreak(
  left: SearchBlendItem,
  right: SearchBlendItem,
  primaryComparison: number,
): number {
  if (primaryComparison !== 0) return primaryComparison;
  return getSourceRank(left.kind) - getSourceRank(right.kind);
}

function interleaveByRelevance(
  properties: SearchBlendItem[],
  developments: SearchBlendItem[],
): SearchBlendItem[] {
  const mixed: SearchBlendItem[] = [];
  let propertyIndex = 0;
  let developmentIndex = 0;

  while (propertyIndex < properties.length || developmentIndex < developments.length) {
    let insertedProperties = 0;
    while (propertyIndex < properties.length && insertedProperties < MANUALS_PER_DEVELOPMENT) {
      mixed.push(properties[propertyIndex]);
      propertyIndex += 1;
      insertedProperties += 1;
    }

    if (developmentIndex < developments.length) {
      mixed.push(developments[developmentIndex]);
      developmentIndex += 1;
    }
  }

  return mixed;
}

export function blendSearchResults(
  properties: SearchBlendItem[],
  developments: SearchBlendItem[],
  sortBy: SearchBlendSortOption,
): SearchBlendItem[] {
  if (!developments.length) return properties;
  if (!properties.length) return developments;

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

  return interleaveByRelevance(properties, developments);
}

export const SEARCH_BLEND_POLICY_COPY =
  'Property listings are prioritised first. New developments are interleaved after every three listings.';
