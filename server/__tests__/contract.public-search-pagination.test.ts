import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PUBLIC_SEARCH_MAX_PAGE_INDEX } from '../../shared/publicSearchPagination';

const { mockSearchInventory } = vi.hoisted(() => ({
  mockSearchInventory: vi.fn(),
}));

vi.mock('../services/publicSearchService', () => ({
  publicSearchService: {
    searchInventory: mockSearchInventory,
  },
}));

import { appRouter } from '../routers';

function publicCaller() {
  return appRouter.createCaller({ req: { headers: {} }, res: {}, user: null } as any);
}

describe('public search page boundary', () => {
  beforeEach(() => {
    mockSearchInventory.mockReset();
    mockSearchInventory.mockResolvedValue({
      cards: [],
      total: 100_000,
      page: PUBLIC_SEARCH_MAX_PAGE_INDEX,
      pageSize: 12,
      hasMore: false,
      locationState: 'not_requested',
      sourceCounts: { manual: 100_000, development: 0 },
    });
  });

  it('accepts the final public page', async () => {
    await expect(
      publicCaller().properties.searchPublicInventory({
        page: PUBLIC_SEARCH_MAX_PAGE_INDEX,
        pageSize: 12,
      }),
    ).resolves.toMatchObject({ page: PUBLIC_SEARCH_MAX_PAGE_INDEX, hasMore: false });
    expect(mockSearchInventory).toHaveBeenCalledWith(
      expect.objectContaining({ page: PUBLIC_SEARCH_MAX_PAGE_INDEX, pageSize: 12 }),
    );
  });

  it('rejects a direct page beyond the cap before invoking search', async () => {
    await expect(
      publicCaller().properties.searchPublicInventory({
        page: PUBLIC_SEARCH_MAX_PAGE_INDEX + 1,
        pageSize: 12,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(mockSearchInventory).not.toHaveBeenCalled();
  });

  it('rejects incomplete map bounds before invoking search', async () => {
    await expect(
      publicCaller().properties.searchPublicInventory({
        listingType: 'sale',
        minLat: -26.2,
        maxLat: -26,
        minLng: 28,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(mockSearchInventory).not.toHaveBeenCalled();
  });

  it('rejects contradictory prices before invoking search', async () => {
    await expect(
      publicCaller().properties.searchPublicInventory({
        listingType: 'sale',
        minPrice: 2_000_000,
        maxPrice: 1_000_000,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(mockSearchInventory).not.toHaveBeenCalled();
  });

  it('rejects a canonical location level that contradicts the submitted geography', async () => {
    await expect(
      publicCaller().properties.searchPublicInventory({
        listingType: 'sale',
        locationId: 'city:12',
        province: 'gauteng',
        city: 'johannesburg',
        suburb: ['sandton'],
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(mockSearchInventory).not.toHaveBeenCalled();
  });
});
