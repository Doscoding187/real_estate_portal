import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getProvinceData, searchInventory } = vi.hoisted(() => ({
  getProvinceData: vi.fn(),
  searchInventory: vi.fn(),
}));

vi.mock('../locationPagesService', () => ({
  locationPagesService: { getProvinceData },
}));

vi.mock('../publicSearchService', () => ({
  publicSearchService: { searchInventory },
}));

import { provincialDiscoveryService } from '../provincialDiscoveryService';

function publicResult(input: { city?: string; listingType?: string; pageSize?: number }) {
  const total = input.city === 'pretoria' ? 1 : input.listingType === 'rent' ? 2 : 4;
  return {
    cards:
      total > 0
        ? [
            {
              kind: 'property',
              id: 'property-1',
              href: '/property/1',
              title: 'Public Gauteng home',
              location: 'Pretoria, Gauteng',
              city: 'Pretoria',
              suburb: 'Arcadia',
              province: 'Gauteng',
              price: 1_250_000,
              image: '/public-image.jpg',
              images: [],
              bedrooms: 3,
              bathrooms: 2,
              area: 140,
              propertyType: 'house',
              listingType: input.listingType || 'sale',
              listingSource: 'manual',
              contactRole: 'private',
              identity: {
                role: 'private',
                name: 'Do not expose this field',
                email: 'private@example.com',
              },
              highlights: [],
              listedDate: new Date('2026-08-01'),
            },
          ]
        : [],
    total,
    page: 0,
    pageSize: input.pageSize || 12,
    hasMore: false,
    locationState: 'resolved',
    sourceCounts: { manual: total, development: 0 },
  };
}

describe('provincial discovery read model', () => {
  beforeEach(() => {
    getProvinceData.mockResolvedValue({
      province: {
        id: 1,
        name: 'Gauteng',
        slug: 'gauteng',
        code: 'GP',
        latitude: '-26.27',
        longitude: '28.11',
        description: 'Province description',
      },
      cities: [
        { id: 10, name: 'Johannesburg', slug: 'johannesburg' },
        { id: 20, name: 'Pretoria', slug: 'pretoria' },
      ],
    });
    searchInventory.mockImplementation(
      (input: { city?: string; listingType?: string; pageSize?: number }) =>
        Promise.resolve(publicResult(input)),
    );
  });

  it('uses bounded public-search requests and returns a safe preview contract', async () => {
    const result = await provincialDiscoveryService.getProvinceData('gauteng');

    expect(result?.province.canonicalLocationId).toBe('province:1');
    expect(result?.markets.map(market => market.name)).toEqual(['Johannesburg', 'Pretoria']);
    expect(result?.inventoryPreview.state).toBe('sparse');
    expect(result?.inventoryPreview.items[0]).toMatchObject({
      id: 'property-1',
      title: 'Public Gauteng home',
      price: 1_250_000,
    });
    expect(result?.inventoryPreview.items[0]).not.toHaveProperty('identity');
    expect(result?.inventoryPreview.items[0]).not.toHaveProperty('description');

    expect(searchInventory).toHaveBeenCalled();
    expect(searchInventory.mock.calls.every(([input]) => input.pageSize <= 6)).toBe(true);
    expect(searchInventory).toHaveBeenCalledWith(
      expect.objectContaining({ province: 'gauteng', city: 'pretoria', pageSize: 4 }),
    );
  });

  it('keeps a lower-inventory market honest instead of rendering a fabricated zero', async () => {
    searchInventory.mockImplementation(
      (input: { city?: string; listingType?: string; pageSize?: number }) =>
        Promise.resolve({
          ...publicResult(input),
          cards: [],
          total: 0,
          sourceCounts: { manual: 0, development: 0 },
        }),
    );

    const result = await provincialDiscoveryService.getProvinceData('gauteng');

    expect(result?.inventoryPreview.state).toBe('empty');
    expect(result?.markets[0].state).toBe('empty');
    expect(result?.marketSnapshot.state).toBe('unavailable');
  });
});
