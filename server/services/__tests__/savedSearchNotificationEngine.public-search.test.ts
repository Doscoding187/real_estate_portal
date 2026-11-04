import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSearchInventory, mockSearchProperties } = vi.hoisted(() => ({
  mockSearchInventory: vi.fn(),
  mockSearchProperties: vi.fn(),
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
          canonicalPlaceId: 'pl-place-01-6a145c6d642ba208a2c12de7',
          locationLabels: ['Sandton', 'Johannesburg'],
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

  it('evaluates Development Rent criteria through an exact canonical Place and preserves the detail href', async () => {
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
        canonicalPlaceId: 'pl-place-01-6a145c6d642ba208a2c12de7',
        propertyType: 'apartment',
        minPrice: 5000,
        maxPrice: 15000,
        listingSource: 'development',
      }),
    );

    expect(mockSearchInventory).toHaveBeenCalledWith(
      expect.objectContaining({
        listingType: 'rent',
        canonicalPlaceId: 'pl-place-01-6a145c6d642ba208a2c12de7',
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

  it.each(['sale', 'rent'])(
    'retains canonical Place identity and refuses malformed or mixed %s criteria without fallback',
    async listingType => {
      const engine: any = new SavedSearchNotificationEngine();
      const canonicalPlaceId = 'pl-place-01-6a145c6d642ba208a2c12de7';
      await engine.evaluateSearch(
        savedSearch({ listingType, canonicalPlaceId, propertyType: 'house' }),
      );
      expect(mockSearchInventory).toHaveBeenCalledWith(
        expect.objectContaining({ canonicalPlaceId }),
      );
      mockSearchInventory.mockClear();
      for (const criteria of [
        { canonicalPlaceId, city: 'johannesburg' },
        { canonicalPlaceId: 'invalid' },
        { canonicalPlaceId, petFriendly: true },
        { canonicalPlaceId: '' },
        { canonicalPlaceId: '   ' },
        { canonicalPlaceId: null },
        { canonicalPlaceId: undefined },
        { canonicalPlaceId: 123 },
        { canonicalPlaceId: [canonicalPlaceId] },
        { canonicalPlaceId, factualLocationId: 'competing' },
        { canonicalPlaceId, city: 123 },
        { canonicalPlaceId, locationId: null },
      ]) {
        expect(await engine.evaluateSearch(savedSearch({ listingType, ...criteria }))).toBeNull();
      }
      expect(mockSearchInventory).not.toHaveBeenCalled();
      expect(mockSearchProperties).not.toHaveBeenCalled();
    },
  );

  it('fails closed for Development criteria that use text geography without a canonical Place', async () => {
    const engine = new SavedSearchNotificationEngine();
    const evaluateSearch = (
      engine as unknown as {
        evaluateSearch: (search: SavedSearch) => Promise<unknown>;
      }
    ).evaluateSearch.bind(engine);

    await expect(
      evaluateSearch(
        savedSearch({
          listingType: 'sale',
          city: 'johannesburg',
          listingSource: 'development',
          petFriendly: true,
        }),
      ),
    ).resolves.toBeNull();

    expect(mockSearchInventory).not.toHaveBeenCalled();
    expect(mockSearchProperties).not.toHaveBeenCalled();
  });
});
