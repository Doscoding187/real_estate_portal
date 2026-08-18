import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockResolvePublicLocation, mockSearchProperties, mockSearchListings } = vi.hoisted(() => ({
  mockResolvePublicLocation: vi.fn(),
  mockSearchProperties: vi.fn(),
  mockSearchListings: vi.fn(),
}));

vi.mock('../locationResolverService', () => ({
  locationResolver: {
    resolvePublicLocation: mockResolvePublicLocation,
  },
}));

vi.mock('../propertySearchService', () => ({
  propertySearchService: {
    searchProperties: mockSearchProperties,
  },
}));

vi.mock('../developmentDerivedListingService', () => ({
  developmentDerivedListingService: {
    searchListings: mockSearchListings,
  },
}));

import { publicSearchService } from '../publicSearchService';
import { PUBLIC_SEARCH_MAX_PAGE_INDEX } from '../../../shared/publicSearchPagination';

const resolvedLocation = {
  status: 'resolved' as const,
  location: {
    level: 'city' as const,
    province: { id: 1, name: 'Gauteng', slug: 'gauteng', code: 'GP' },
    city: {
      id: 12,
      name: 'Johannesburg',
      slug: 'johannesburg',
      provinceId: 1,
    },
    confidence: 'exact' as const,
    fallbackLevel: 'none' as const,
    originalIntent: 'johannesburg, gauteng',
  },
};

const resolvedSuburb = {
  status: 'resolved' as const,
  location: {
    level: 'suburb' as const,
    province: { id: 1, name: 'Gauteng', slug: 'gauteng', code: 'GP' },
    city: { id: 12, name: 'Johannesburg', slug: 'johannesburg', provinceId: 1 },
    suburb: { id: 34, name: 'Sandton', slug: 'sandton', cityId: 12 },
    confidence: 'exact' as const,
    fallbackLevel: 'none' as const,
    originalIntent: 'sandton, johannesburg, gauteng',
  },
};

function card(kind: 'property' | 'development', id: string, price: number) {
  return {
    kind,
    id,
    href: kind === 'property' ? `/property/${id}` : `/development/demo/unit/${id}`,
    title: id,
    location: 'Johannesburg, Gauteng',
    city: 'Johannesburg',
    province: 'Gauteng',
    price,
    image: null,
    images: [],
    propertyType: 'house',
    listingType: 'sale',
    listingSource: kind === 'property' ? 'manual' : 'development',
    listedDate: new Date('2026-07-01T00:00:00.000Z'),
  };
}

describe('publicSearchService contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolvePublicLocation.mockResolvedValue(resolvedLocation);
    mockSearchProperties.mockResolvedValue({
      cards: [card('property', 'p-1', 1), card('property', 'p-2', 2), card('property', 'p-3', 3)],
      total: 3,
    });
    mockSearchListings.mockResolvedValue({
      cards: [card('development', 'd-1', 4), card('development', 'd-2', 5)],
      total: 2,
    });
  });

  it('does not widen an unresolved public location into a different search', async () => {
    mockResolvePublicLocation.mockResolvedValueOnce({
      status: 'unresolved',
      location: null,
      message: 'That city is unavailable.',
    });

    const result = await publicSearchService.searchInventory({
      city: 'missing-city',
      listingType: 'sale',
    });

    expect(result).toMatchObject({
      cards: [],
      total: 0,
      locationState: 'unresolved',
      locationMessage: 'That city is unavailable.',
    });
    expect(mockSearchProperties).not.toHaveBeenCalled();
    expect(mockSearchListings).not.toHaveBeenCalled();
  });

  it('blends authoritative sources before applying one server-side page boundary', async () => {
    const result = await publicSearchService.searchInventory({
      city: 'johannesburg',
      province: 'gauteng',
      listingType: 'sale',
      page: 1,
      pageSize: 2,
    });

    expect(mockSearchProperties).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'johannesburg', province: 'gauteng' }),
      'date_desc',
      1,
      4,
      undefined,
      { publicOnly: true },
    );
    expect(mockSearchListings).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'johannesburg', province: 'gauteng' }),
      'date_desc',
      1,
      4,
    );
    expect(result).toMatchObject({
      total: 5,
      page: 1,
      pageSize: 2,
      hasMore: true,
      locationState: 'resolved',
      locationContext: {
        type: 'city',
        ids: { provinceId: 1, cityId: 12 },
      },
    });
    expect(result.cards).toHaveLength(2);
    expect(result.sourceCounts).toEqual({ manual: 3, development: 2 });
  });

  it('passes complete map bounds to both public inventory sources', async () => {
    await publicSearchService.searchInventory({
      city: 'johannesburg',
      province: 'gauteng',
      listingType: 'sale',
      minLat: -26.2,
      maxLat: -26,
      minLng: 28,
      maxLng: 28.1,
    });

    const expectedBounds = {
      south: -26.2,
      north: -26,
      west: 28,
      east: 28.1,
    };

    expect(mockSearchProperties).toHaveBeenCalledWith(
      expect.objectContaining({ bounds: expectedBounds }),
      'date_desc',
      1,
      12,
      undefined,
      { publicOnly: true },
    );
    expect(mockSearchListings).toHaveBeenCalledWith(
      expect.objectContaining({ bounds: expectedBounds }),
      'date_desc',
      1,
      12,
    );
  });

  it('keeps the final accepted page reachable but never advertises an invalid next page', async () => {
    mockSearchProperties.mockResolvedValueOnce({ cards: [], total: 50_000 });
    mockSearchListings.mockResolvedValueOnce({ cards: [], total: 50_000 });

    const result = await publicSearchService.searchInventory({
      page: PUBLIC_SEARCH_MAX_PAGE_INDEX,
      pageSize: 12,
      listingType: 'sale',
    });

    expect(mockSearchProperties).toHaveBeenCalledWith(
      expect.anything(),
      'date_desc',
      1,
      (PUBLIC_SEARCH_MAX_PAGE_INDEX + 1) * 12,
      undefined,
      { publicOnly: true },
    );
    expect(result).toMatchObject({
      page: PUBLIC_SEARCH_MAX_PAGE_INDEX,
      total: 100_000,
      hasMore: false,
    });
  });

  it('canonicalizes available-page overflow and preserves coherent page metadata', async () => {
    const firstPage = await publicSearchService.searchInventory({
      listingType: 'sale',
      page: 0,
      pageSize: 2,
    });
    const lastPage = await publicSearchService.searchInventory({
      listingType: 'sale',
      page: 2,
      pageSize: 2,
    });
    const oneBeyondLastPage = await publicSearchService.searchInventory({
      listingType: 'sale',
      page: 3,
      pageSize: 2,
    });
    const veryLargePage = await publicSearchService.searchInventory({
      listingType: 'sale',
      page: 101,
      pageSize: 2,
    });

    expect(firstPage).toMatchObject({ page: 0, total: 5, pageSize: 2 });
    expect(lastPage).toMatchObject({ page: 2, total: 5, pageSize: 2 });
    expect(oneBeyondLastPage).toMatchObject({ page: 2, total: 5, pageSize: 2 });
    expect(veryLargePage).toMatchObject({ page: 2, total: 5, pageSize: 2 });
    expect(oneBeyondLastPage.cards.length).toBeLessThanOrEqual(2);
    expect(veryLargePage.cards.length).toBeLessThanOrEqual(2);
    expect(oneBeyondLastPage.hasMore).toBe(false);
    expect(veryLargePage.hasMore).toBe(false);
  });

  it('canonicalizes an overflow page to zero for an empty result universe', async () => {
    mockSearchProperties.mockResolvedValue({ cards: [], total: 0 });
    mockSearchListings.mockResolvedValue({ cards: [], total: 0 });

    const result = await publicSearchService.searchInventory({
      listingType: 'sale',
      page: 101,
      pageSize: 12,
    });

    expect(result).toMatchObject({
      cards: [],
      total: 0,
      page: 0,
      pageSize: 12,
      hasMore: false,
    });
  });

  it('retains safe normalization for negative, zero, and fractional pages', async () => {
    const negative = await publicSearchService.searchInventory({
      listingType: 'sale',
      page: -1.5,
      pageSize: 2,
    });
    const zero = await publicSearchService.searchInventory({
      listingType: 'sale',
      page: 0,
      pageSize: 2,
    });
    const fractional = await publicSearchService.searchInventory({
      listingType: 'sale',
      page: 1.9,
      pageSize: 2,
    });

    expect(negative.page).toBe(0);
    expect(zero.page).toBe(0);
    expect(fractional.page).toBe(1);
  });

  it('keeps a geography-only public inventory request neutral', async () => {
    const result = await publicSearchService.searchInventory({
      city: 'johannesburg',
      page: 101,
    });

    expect(result).toMatchObject({
      cards: [],
      total: 0,
      page: 0,
      locationState: 'unavailable',
    });
    expect(result.locationMessage).toContain('Buy or Rent');
    expect(mockResolvePublicLocation).not.toHaveBeenCalled();
    expect(mockSearchProperties).not.toHaveBeenCalled();
    expect(mockSearchListings).not.toHaveBeenCalled();
  });

  it('rejects unsupported runtime journeys instead of treating them as Rent', async () => {
    for (const listingType of [
      'shared_living',
      'developments',
      'plot_land',
      'commercial',
      'unknown',
    ]) {
      await expect(
        publicSearchService.searchInventory({
          city: 'johannesburg',
          listingType: listingType as never,
        }),
      ).rejects.toThrow('Buy or Rent');
    }

    expect(mockSearchProperties).not.toHaveBeenCalled();
    expect(mockSearchListings).not.toHaveBeenCalled();
  });

  it('uses the same canonical locality and filter boundary for the selected Rent sources', async () => {
    mockResolvePublicLocation.mockResolvedValueOnce(resolvedSuburb);

    const result = await publicSearchService.searchInventory({
      locationId: 'suburb:34',
      listingType: 'rent',
      minArea: 70,
      maxArea: 120,
      minPrice: 5_000,
      maxBathrooms: 3,
      sortOption: 'price_asc',
    });

    expect(mockSearchProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        listingType: 'rent',
        canonicalLocation: { provinceId: 1, cityId: 12, suburbId: 34 },
        minFloorSize: 70,
        maxFloorSize: 120,
        minPrice: 5_000,
        maxBathrooms: 3,
      }),
      'price_asc',
      1,
      12,
      undefined,
      { publicOnly: true },
    );
    expect(mockSearchListings).toHaveBeenCalledWith(
      expect.objectContaining({
        listingType: 'rent',
        minArea: 70,
        maxArea: 120,
        minPrice: 5_000,
        maxBathrooms: 3,
      }),
      'price_asc',
      1,
      12,
    );
    expect(result.total).toBe(5);
  });

  it('routes explicit public size filters to their matching canonical measurements', async () => {
    mockResolvePublicLocation.mockResolvedValueOnce(resolvedSuburb);

    await publicSearchService.searchInventory({
      locationId: 'suburb:34',
      listingType: 'sale',
      minFloorSize: 80,
      maxFloorSize: 140,
      minErfSize: 300,
      maxErfSize: 900,
      minLandSize: 10_000,
      maxLandSize: 25_000,
    });

    expect(mockSearchProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        minFloorSize: 80,
        maxFloorSize: 140,
        minErfSize: 300,
        maxErfSize: 900,
        minLandSize: 10_000,
        maxLandSize: 25_000,
      }),
      'date_desc',
      1,
      12,
      undefined,
      { publicOnly: true },
    );
  });

  it('keeps the inventory boundary and count stable when page or sort changes', async () => {
    const first = await publicSearchService.searchInventory({
      city: 'johannesburg',
      province: 'gauteng',
      listingType: 'sale',
      page: 0,
      pageSize: 2,
      sortOption: 'date_desc',
    });
    const firstFilters = mockSearchProperties.mock.calls[0][0];

    const second = await publicSearchService.searchInventory({
      city: 'johannesburg',
      province: 'gauteng',
      listingType: 'sale',
      page: 1,
      pageSize: 2,
      sortOption: 'price_asc',
    });
    const secondFilters = mockSearchProperties.mock.calls[1][0];

    expect(secondFilters).toEqual(firstFilters);
    expect(second.total).toBe(first.total);
    expect(second.locationContext).toEqual(first.locationContext);
    expect(mockSearchProperties.mock.calls[1][1]).toBe('price_asc');
    expect(mockSearchProperties.mock.calls[1][2]).toBe(1);
    expect(mockSearchProperties.mock.calls[1][3]).toBe(4);
  });

  it('normalizes an unsupported runtime sort without widening the search', async () => {
    await publicSearchService.searchInventory({
      city: 'johannesburg',
      province: 'gauteng',
      listingType: 'sale',
      sortOption: 'unsupported-sort' as never,
    });

    expect(mockSearchProperties).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'johannesburg', province: 'gauteng' }),
      'date_desc',
      1,
      12,
      undefined,
      { publicOnly: true },
    );
    expect(mockSearchListings).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'johannesburg', province: 'gauteng' }),
      'date_desc',
      1,
      12,
    );
  });
});
