import type { SearchFilters } from '@/lib/urlUtils';
import {
  blendPublicSearchResults,
  resolvePublicSearchBlendPolicy,
  type PublicSearchBlendFilters,
  type PublicSearchBlendItem,
  type PublicSearchBlendPolicy,
  type PublicSearchBlendSortOption,
} from '@shared/publicSearchBlend';

export type SearchBlendSortOption = PublicSearchBlendSortOption;
export type SearchBlendItem<T = unknown> = PublicSearchBlendItem<T>;
export type SearchBlendPolicy = PublicSearchBlendPolicy;
export type SearchBlendMode = PublicSearchBlendPolicy['mode'];

export function resolveSearchBlendPolicy(
  filters: SearchFilters,
  sortBy: SearchBlendSortOption,
): SearchBlendPolicy {
  return resolvePublicSearchBlendPolicy(filters as PublicSearchBlendFilters, sortBy);
}

export function blendSearchResults(
  properties: SearchBlendItem[],
  developments: SearchBlendItem[],
  sortBy: SearchBlendSortOption,
  filters: SearchFilters,
): SearchBlendItem[] {
  return blendPublicSearchResults(
    properties,
    developments,
    sortBy,
    filters as PublicSearchBlendFilters,
  );
}
