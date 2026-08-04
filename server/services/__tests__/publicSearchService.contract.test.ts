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

    const result = await publicSearchService.searchInventory({ city: 'missing-city' });

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
      page: 1,
      pageSize: 2,
    });

    expect(mockSearchProperties).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'johannesburg', province: 'gauteng' }),
      'date_desc',
      1,
      4,
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
    });

    expect(mockSearchProperties).toHaveBeenCalledWith(
      expect.anything(),
      'date_desc',
      1,
      (PUBLIC_SEARCH_MAX_PAGE_INDEX + 1) * 12,
    );
    expect(result).toMatchObject({
      page: PUBLIC_SEARCH_MAX_PAGE_INDEX,
      total: 100_000,
      hasMore: false,
    });
  });
});
