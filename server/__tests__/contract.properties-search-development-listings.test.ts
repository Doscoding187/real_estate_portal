import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSearchListings } = vi.hoisted(() => ({
  mockSearchListings: vi.fn(),
}));

vi.mock('../services/developmentDerivedListingService', () => ({
  developmentDerivedListingService: {
    searchListings: mockSearchListings,
  },
}));

import { appRouter } from '../routers';

describe('properties.searchDevelopmentListings contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';

    mockSearchListings.mockResolvedValue({
      items: [
        {
          id: 'dev-10-unit-a',
          unitTypeId: 'unit-a',
          developmentId: 10,
          title: '2 Bedroom Apartment for Sale',
          price: 1200000,
          city: 'Johannesburg',
          suburb: 'Berea',
          province: 'Gauteng',
          propertyType: 'apartment',
          listingType: 'sale',
          transactionType: 'for_sale',
          listingSource: 'development',
          bedrooms: 2,
          bathrooms: 2,
          images: [],
          badges: ['Off-plan'],
          listedDate: new Date('2026-03-20T00:00:00.000Z'),
          development: {
            id: 10,
            name: 'Demo Development',
            slug: 'demo-development',
            status: 'launching-soon',
          },
          developerBrand: {
            id: 4,
            brandName: 'Demo Builder',
            slug: 'demo-builder',
            logoUrl: null,
            publicContactEmail: 'sales@example.com',
          },
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
      hasMore: false,
    });
  });

  it('returns the derived listing payload with pagination metadata', async () => {
    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    const result = await caller.properties.searchDevelopmentListings({
      city: 'Johannesburg',
      province: 'Gauteng',
      limit: 20,
      offset: 0,
      listingType: 'sale',
    });

    expect(mockSearchListings).toHaveBeenCalled();
    expect(Array.isArray((result as any).items)).toBe(true);
    expect((result as any).items[0]).toMatchObject({
      listingSource: 'development',
      developmentId: 10,
      propertyType: 'apartment',
      listingType: 'sale',
      developerBrand: {
        brandName: 'Demo Builder',
      },
    });
    expect((result as any)).toMatchObject({
      total: 1,
      page: 1,
      pageSize: 20,
      hasMore: false,
    });
  });

  it('passes locations slug filters through to development-derived search', async () => {
    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    await caller.properties.searchDevelopmentListings({
      locations: ['alberton'],
      limit: 20,
      offset: 0,
      listingType: 'sale',
    });

    expect(mockSearchListings).toHaveBeenCalledWith(
      expect.objectContaining({
        locations: ['alberton'],
      }),
      'date_desc',
      1,
      20,
    );
  });
});
