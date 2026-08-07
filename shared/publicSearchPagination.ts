export const PUBLIC_SEARCH_DEFAULT_PAGE_SIZE = 12;
export const PUBLIC_SEARCH_MAX_PAGE_SIZE = 50;
export const PUBLIC_SEARCH_MAX_PAGE_INDEX = 100;
export const PUBLIC_SEARCH_MAX_REACHABLE_PAGES = PUBLIC_SEARCH_MAX_PAGE_INDEX + 1;

export function isPublicSearchPageIndexAccepted(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= PUBLIC_SEARCH_MAX_PAGE_INDEX
  );
}

export function normalizePublicSearchPageIndex(value: unknown): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 0;
  return Math.max(0, Math.min(PUBLIC_SEARCH_MAX_PAGE_INDEX, numeric));
}

export function normalizePublicSearchPageSize(value: unknown): number {
  const numeric =
    typeof value === 'number' && Number.isFinite(value)
      ? Math.floor(value)
      : PUBLIC_SEARCH_DEFAULT_PAGE_SIZE;
  return Math.max(1, Math.min(PUBLIC_SEARCH_MAX_PAGE_SIZE, numeric));
}

export function getPublicSearchReachablePageCount(total: number, pageSize: number): number {
  const normalizedTotal = Math.max(0, Math.floor(Number.isFinite(total) ? total : 0));
  const normalizedPageSize = normalizePublicSearchPageSize(pageSize);
  if (normalizedTotal === 0) return 0;
  return Math.min(
    PUBLIC_SEARCH_MAX_REACHABLE_PAGES,
    Math.max(1, Math.ceil(normalizedTotal / normalizedPageSize)),
  );
}

/**
 * Canonicalizes a page after the result universe is known.
 *
 * The public page cap is deliberately part of the reachable-page contract, so
 * very large result sets retain their final capped page while smaller result
 * sets normalize overflow to their actual last page.
 */
export function normalizePublicSearchPageForTotal(
  page: unknown,
  total: unknown,
  pageSize: unknown,
): number {
  const normalizedPage = normalizePublicSearchPageIndex(page);
  const normalizedTotal = Math.max(
    0,
    Math.floor(typeof total === 'number' && Number.isFinite(total) ? total : 0),
  );
  const reachablePageCount = getPublicSearchReachablePageCount(
    normalizedTotal,
    normalizePublicSearchPageSize(pageSize),
  );

  if (reachablePageCount === 0) return 0;
  return Math.min(normalizedPage, reachablePageCount - 1);
}

export function canAdvancePublicSearchPage(page: number, total: number, pageSize: number): boolean {
  const pageCount = getPublicSearchReachablePageCount(total, pageSize);
  return isPublicSearchPageIndexAccepted(page) && page + 1 < pageCount;
}
