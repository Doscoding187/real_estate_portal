import { PUBLIC_SEARCH_MAX_PAGE_INDEX } from './publicSearchPagination';

/**
 * Journey-neutral result-state primitives shared by transactional search
 * adapters. Journey-specific filters remain outside this contract.
 */
export const SEARCH_RESULT_SORT_OPTIONS = [
  'relevance',
  'price_asc',
  'price_desc',
  'date_desc',
  'date_asc',
] as const;

export type SearchResultSortOption = (typeof SEARCH_RESULT_SORT_OPTIONS)[number];

export const DEFAULT_SEARCH_RESULT_SORT: SearchResultSortOption = 'relevance';
export const DEFAULT_SEARCH_RESULT_PAGE = 0;
export const SEARCH_RESULT_SORT_PARAM = 'sort';
export const SEARCH_RESULT_PAGE_PARAM = 'page';

export interface TransactionalResultState {
  sort: SearchResultSortOption;
  /** Public search pages are zero-based throughout the client and API. */
  page: number;
}

export function isSearchResultSortOption(value: unknown): value is SearchResultSortOption {
  return (
    typeof value === 'string' && (SEARCH_RESULT_SORT_OPTIONS as readonly string[]).includes(value)
  );
}

function parsePage(value: string | null): number {
  if (value === null || !/^\d+$/.test(value)) return DEFAULT_SEARCH_RESULT_PAGE;

  const page = Number(value);
  if (!Number.isSafeInteger(page) || page > PUBLIC_SEARCH_MAX_PAGE_INDEX) {
    return DEFAULT_SEARCH_RESULT_PAGE;
  }

  return page;
}

export function normalizeTransactionalResultState(
  state?: Partial<TransactionalResultState> | null,
): TransactionalResultState {
  return {
    sort: isSearchResultSortOption(state?.sort) ? state.sort : DEFAULT_SEARCH_RESULT_SORT,
    page:
      typeof state?.page === 'number' &&
      Number.isSafeInteger(state.page) &&
      state.page >= 0 &&
      state.page <= PUBLIC_SEARCH_MAX_PAGE_INDEX
        ? state.page
        : DEFAULT_SEARCH_RESULT_PAGE,
  };
}

export function createDefaultTransactionalResultState(): TransactionalResultState {
  return {
    sort: DEFAULT_SEARCH_RESULT_SORT,
    page: DEFAULT_SEARCH_RESULT_PAGE,
  };
}

export function parseTransactionalResultState(
  searchParams: URLSearchParams,
): TransactionalResultState {
  const sort = searchParams.get(SEARCH_RESULT_SORT_PARAM);
  return normalizeTransactionalResultState({
    sort: isSearchResultSortOption(sort) ? sort : undefined,
    page: parsePage(searchParams.get(SEARCH_RESULT_PAGE_PARAM)),
  });
}

/** Adds only non-default result state to a canonical URL. */
export function appendTransactionalResultState(
  searchParams: URLSearchParams,
  state?: Partial<TransactionalResultState> | null,
): void {
  const normalized = normalizeTransactionalResultState(state);

  if (normalized.sort !== DEFAULT_SEARCH_RESULT_SORT) {
    searchParams.set(SEARCH_RESULT_SORT_PARAM, normalized.sort);
  }

  if (normalized.page !== DEFAULT_SEARCH_RESULT_PAGE) {
    searchParams.set(SEARCH_RESULT_PAGE_PARAM, String(normalized.page));
  }
}
