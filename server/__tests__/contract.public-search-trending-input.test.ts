import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('searchPublicInventory trending and photo input', () => {
  beforeEach(() => {
    mockSearchInventory.mockReset();
    mockSearchInventory.mockResolvedValue({ cards: [], total: 0 });
  });

  it('accepts the trending sort and requirePhoto and passes them through', async () => {
    await publicCaller().properties.searchPublicInventory({
      listingType: 'sale',
      sortOption: 'trending',
      requirePhoto: true,
    });
    expect(mockSearchInventory).toHaveBeenCalledWith(
      expect.objectContaining({ sortOption: 'trending', requirePhoto: true }),
    );
  });

  it('keeps the default sort and leaves requirePhoto absent when not supplied', async () => {
    await publicCaller().properties.searchPublicInventory({ listingType: 'sale' });
    const input = mockSearchInventory.mock.calls[0][0];
    expect(input.sortOption).toBe('relevance');
    expect(input.requirePhoto).toBeUndefined();
  });

  it('still accepts every existing sort value', async () => {
    for (const sortOption of ['relevance', 'price_asc', 'price_desc', 'date_desc', 'date_asc']) {
      await publicCaller().properties.searchPublicInventory({ listingType: 'sale', sortOption } as any);
    }
    expect(mockSearchInventory).toHaveBeenCalledTimes(5);
  });

  it('still rejects an unknown sort value and a non-boolean requirePhoto', async () => {
    await expect(
      publicCaller().properties.searchPublicInventory({
        listingType: 'sale',
        sortOption: 'popular',
      } as any),
    ).rejects.toThrow();
    await expect(
      publicCaller().properties.searchPublicInventory({
        listingType: 'sale',
        requirePhoto: 'yes',
      } as any),
    ).rejects.toThrow();
    expect(mockSearchInventory).not.toHaveBeenCalled();
  });
});

describe('searchPublicInventory developmentResultShape input', () => {
  beforeEach(() => {
    mockSearchInventory.mockReset();
    mockSearchInventory.mockResolvedValue({ cards: [], total: 0 });
  });

  it('accepts unit_type and development and passes them through', async () => {
    for (const developmentResultShape of ['unit_type', 'development']) {
      await publicCaller().properties.searchPublicInventory({
        listingType: 'rent',
        developmentResultShape,
      } as any);
    }
    expect(mockSearchInventory.mock.calls.map(call => call[0].developmentResultShape)).toEqual([
      'unit_type',
      'development',
    ]);
  });

  it('leaves the shape absent by default and rejects unknown values', async () => {
    await publicCaller().properties.searchPublicInventory({ listingType: 'sale' });
    expect(mockSearchInventory.mock.calls[0][0].developmentResultShape).toBeUndefined();
    await expect(
      publicCaller().properties.searchPublicInventory({
        listingType: 'sale',
        developmentResultShape: 'units',
      } as any),
    ).rejects.toThrow();
    expect(mockSearchInventory).toHaveBeenCalledTimes(1);
  });
});
