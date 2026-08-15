import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSearchInventory, mockSearchProperties, mockSearchListings } = vi.hoisted(() => ({
  mockSearchInventory: vi.fn(),
  mockSearchProperties: vi.fn(),
  mockSearchListings: vi.fn(),
}));

vi.mock('../publicSearchService', () => ({
  publicSearchService: {
    searchInventory: mockSearchInventory,
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

import type { SavedSearch } from '../../../shared/types';
import { SavedSearchNotificationEngine } from '../savedSearchNotificationEngine';

function savedSearch(criteria: Record<string, unknown>): SavedSearch {
  return {
    id: 1,
    userId: 7,
    name: 'Sandton rentals',
    criteria,
    notificationFrequency: 'daily',
    emailEnabled: false,
    inAppEnabled: true,
    createdAt: new Date('2026-08-15T08:00:00.000Z'),
    updatedAt: new Date('2026-08-15T08:00:00.000Z'),
    lastNotifiedAt: null,
  };
}

describe('saved-search notification public search authority', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchInventory.mockResolvedValue({
      cards: [
        {
          kind: 'development',
          id: 'dev-77-unit-1',
          href: '/development/rentals/unit/unit-1',
          title: 'Two Bedroom Rental',
          city: 'Johannesburg',
          suburb: 'Sandton',
          price: 12000,
          image: '/rent.jpg',
          images: [],
          listingType: 'rent',
          listingSource: 'development',
          listedDate: new Date('2026-08-15T10:00:00.000Z'),
        },
      ],
      total: 1,
    });
  });

  it('evaluates canonical Rent criteria through public inventory and preserves the card detail href', async () => {
    const engine = new SavedSearchNotificationEngine();
    const evaluateSearch = (
      engine as unknown as {
        evaluateSearch: (search: SavedSearch) => Promise<{
          totalMatches: number;
          newMatchCount: number;
          matches: Array<{ href: string; listingType: string; listingSource: string }>;
        }>;
      }
    ).evaluateSearch.bind(engine);

    const result = await evaluateSearch(
      savedSearch({
        listingType: 'rent',
        locationIds: ['suburb:34', 'suburb:35'],
        propertyType: 'apartment',
        minPrice: 5000,
        maxPrice: 15000,
        listingSource: 'development',
      }),
    );

    expect(mockSearchInventory).toHaveBeenCalledWith(
      expect.objectContaining({
        listingType: 'rent',
        locationIds: ['suburb:34', 'suburb:35'],
        propertyType: 'apartment',
        minPrice: 5000,
        maxPrice: 15000,
        listingSource: 'development',
        sortOption: 'date_desc',
        page: 0,
        pageSize: 50,
      }),
    );
    expect(mockSearchProperties).not.toHaveBeenCalled();
    expect(mockSearchListings).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      totalMatches: 1,
      newMatchCount: 1,
      matches: [
        {
          href: '/development/rentals/unit/unit-1',
          listingType: 'rent',
          listingSource: 'development',
        },
      ],
    });
  });

  it('keeps legacy predicates on the compatibility path instead of silently dropping them', async () => {
    mockSearchProperties.mockResolvedValue({ properties: [], total: 0 });
    mockSearchListings.mockResolvedValue({ items: [], total: 0 });

    const engine = new SavedSearchNotificationEngine();
    const evaluateSearch = (
      engine as unknown as {
        evaluateSearch: (search: SavedSearch) => Promise<unknown>;
      }
    ).evaluateSearch.bind(engine);

    await evaluateSearch(
      savedSearch({
        listingType: 'sale',
        city: 'johannesburg',
        petFriendly: true,
      }),
    );

    expect(mockSearchInventory).not.toHaveBeenCalled();
    expect(mockSearchProperties).toHaveBeenCalledOnce();
    expect(mockSearchListings).toHaveBeenCalledOnce();
  });
});
