import { describe, expect, it } from 'vitest';

import {
  appendTransactionalResultState,
  DEFAULT_SEARCH_RESULT_PAGE,
  DEFAULT_SEARCH_RESULT_SORT,
  parseTransactionalResultState,
} from '@/../../shared/transactionalSearchState';

describe('transactional result-state contract', () => {
  it('parses supported sort and zero-based page state', () => {
    const state = parseTransactionalResultState(new URLSearchParams('sort=price_desc&page=3'));

    expect(state).toEqual({ sort: 'price_desc', page: 3 });
  });

  it('rejects invalid result-state values without creating active state', () => {
    const state = parseTransactionalResultState(new URLSearchParams('sort=not-supported&page=-1'));

    expect(state).toEqual({
      sort: DEFAULT_SEARCH_RESULT_SORT,
      page: DEFAULT_SEARCH_RESULT_PAGE,
    });
  });

  it('serializes only non-default state using the canonical URL keys', () => {
    const params = new URLSearchParams();
    appendTransactionalResultState(params, { sort: 'date_asc', page: 2 });

    expect(params.toString()).toBe('sort=date_asc&page=2');
  });

  it('omits default state from canonical URLs', () => {
    const params = new URLSearchParams();
    appendTransactionalResultState(params, {
      sort: DEFAULT_SEARCH_RESULT_SORT,
      page: DEFAULT_SEARCH_RESULT_PAGE,
    });

    expect(params.toString()).toBe('');
  });
});
