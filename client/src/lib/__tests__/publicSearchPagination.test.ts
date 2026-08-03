import { describe, expect, it } from 'vitest';
import {
  canAdvancePublicSearchPage,
  getPublicSearchReachablePageCount,
  isPublicSearchPageIndexAccepted,
  PUBLIC_SEARCH_MAX_PAGE_INDEX,
  PUBLIC_SEARCH_MAX_REACHABLE_PAGES,
} from '../../../../shared/publicSearchPagination';

describe('public search pagination contract', () => {
  it('accepts the final reachable page and disables Next there', () => {
    expect(isPublicSearchPageIndexAccepted(PUBLIC_SEARCH_MAX_PAGE_INDEX)).toBe(true);
    expect(canAdvancePublicSearchPage(PUBLIC_SEARCH_MAX_PAGE_INDEX, 100_000, 12)).toBe(false);
  });

  it('rejects direct page input beyond the public cap', () => {
    expect(isPublicSearchPageIndexAccepted(PUBLIC_SEARCH_MAX_PAGE_INDEX + 1)).toBe(false);
  });

  it('caps large result sets at the same page count used by the UI action', () => {
    expect(getPublicSearchReachablePageCount(100_000, 12)).toBe(PUBLIC_SEARCH_MAX_REACHABLE_PAGES);
    expect(canAdvancePublicSearchPage(PUBLIC_SEARCH_MAX_PAGE_INDEX - 1, 100_000, 12)).toBe(true);
  });

  it('preserves ordinary result counts below the public cap', () => {
    expect(getPublicSearchReachablePageCount(25, 12)).toBe(3);
    expect(canAdvancePublicSearchPage(1, 25, 12)).toBe(true);
    expect(canAdvancePublicSearchPage(2, 25, 12)).toBe(false);
  });
});
