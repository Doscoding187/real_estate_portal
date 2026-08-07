import { describe, expect, it } from 'vitest';
import type { PropertyFilters, SortOption } from '../../../shared/types';
import { PropertySearchService } from '../propertySearchService';
import type { SearchAreaQueryBoundary } from '../searchAreaQueryBoundary';

const filters: PropertyFilters = {
  listingType: 'sale',
  canonicalLocation: { provinceId: 1, cityId: 12, suburbId: 34 },
};

const boundary = (authorityKey: string): SearchAreaQueryBoundary => ({
  kind: 'canonical_members',
  authorityKey,
  parentCanonicalLocationId: 'city:12',
  parentCityId: 12,
  parentCityName: 'Johannesburg',
  memberCanonicalLocationIds: ['suburb:34'],
  memberSuburbIds: [34],
  memberSuburbNames: ['Sandton'],
});

function cacheKey(
  service: PropertySearchService,
  queryBoundary: SearchAreaQueryBoundary,
  sortOption: SortOption = 'date_desc',
  page = 1,
): string {
  return (
    service as unknown as {
      generateCacheKey: (
        input: PropertyFilters,
        sort: SortOption,
        currentPage: number,
        currentPageSize: number,
        boundary?: SearchAreaQueryBoundary,
      ) => string;
    }
  ).generateCacheKey(filters, sortOption, page, 12, queryBoundary);
}

describe('search runtime cache identity', () => {
  it('includes Search Area authority version, sort and page in the cache identity', () => {
    const service = new PropertySearchService();
    const v1 = cacheKey(service, boundary('search-area:johannesburg-sandton:v1'));
    const v2 = cacheKey(service, boundary('search-area:johannesburg-sandton:v2'));
    const sorted = cacheKey(service, boundary('search-area:johannesburg-sandton:v1'), 'price_asc');
    const paged = cacheKey(
      service,
      boundary('search-area:johannesburg-sandton:v1'),
      'date_desc',
      2,
    );

    expect(v1).not.toBe(v2);
    expect(v1).not.toBe(sorted);
    expect(v1).not.toBe(paged);
  });
});
