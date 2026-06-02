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
          unitDisplayOrder: 0,
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
      cards: [
        {
          kind: 'development',
          id: 'dev-10-unit-a',
          href: '/development/demo-development/unit/unit-a',
          title: '2 Bedroom Apartment for Sale',
          location: 'Berea, Johannesburg, Gauteng',
          city: 'Johannesburg',
          suburb: 'Berea',
          province: 'Gauteng',
          price: 1200000,
          image: 'https://example.com/unit-a.jpg',
          images: [],
          propertyType: 'apartment',
          listingType: 'sale',
          listingSource: 'development',
          contactRole: 'developer',
          identity: {
            role: 'developer',
            name: 'Demo Builder',
          },
          development: {
            id: 10,
            name: 'Demo Development',
            slug: 'demo-development',
          },
          developerBrand: {
            id: 4,
            brandName: 'Demo Builder',
            slug: 'demo-builder',
            logoUrl: null,
            publicContactEmail: 'sales@example.com',
          },
          highlights: [],
          badges: ['Off-plan'],
          listedDate: new Date('2026-03-20T00:00:00.000Z'),
          developmentId: 10,
          unitTypeId: 'unit-a',
          unitDisplayOrder: 0,
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
    expect((result as any).cards[0]).toMatchObject({
      kind: 'development',
      contactRole: 'developer',
      identity: { name: 'Demo Builder' },
      href: '/development/demo-development/unit/unit-a',
      unitTypeId: 'unit-a',
      unitDisplayOrder: 0,
    });
  });

  it('returns ordered development unit cards with stable inventory identity', async () => {
    mockSearchListings.mockResolvedValueOnce({
      items: [
        {
          id: 'dev-10-unit-b',
          unitTypeId: 'unit-b',
          unitDisplayOrder: 0,
          developmentId: 10,
          title: '3 Bedroom Apartment for Sale',
          price: 1600000,
          city: 'Johannesburg',
          suburb: 'Berea',
          province: 'Gauteng',
          propertyType: 'apartment',
          listingType: 'sale',
          transactionType: 'for_sale',
          listingSource: 'development',
          images: [],
          listedDate: new Date('2026-03-20T00:00:00.000Z'),
          development: { id: 10, name: 'Demo Development', slug: 'demo-development' },
          developerBrand: { id: 4, brandName: 'Demo Builder', slug: 'demo-builder' },
        },
        {
          id: 'dev-10-unit-a',
          unitTypeId: 'unit-a',
          unitDisplayOrder: 1,
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
          images: [],
          listedDate: new Date('2026-03-20T00:00:00.000Z'),
          development: { id: 10, name: 'Demo Development', slug: 'demo-development' },
          developerBrand: { id: 4, brandName: 'Demo Builder', slug: 'demo-builder' },
        },
      ],
      cards: [
        {
          kind: 'development',
          id: 'dev-10-unit-b',
          href: '/development/demo-development/unit/unit-b',
          title: '3 Bedroom Apartment for Sale',
          location: 'Berea, Johannesburg, Gauteng',
          city: 'Johannesburg',
          suburb: 'Berea',
          province: 'Gauteng',
          price: 1600000,
          image: '',
          images: [],
          propertyType: 'apartment',
          listingType: 'sale',
          listingSource: 'development',
          contactRole: 'developer',
          identity: { role: 'developer', name: 'Demo Builder' },
          development: { id: 10, name: 'Demo Development', slug: 'demo-development' },
          developerBrand: { id: 4, brandName: 'Demo Builder', slug: 'demo-builder' },
          highlights: [],
          listedDate: new Date('2026-03-20T00:00:00.000Z'),
          developmentId: 10,
          unitTypeId: 'unit-b',
          unitDisplayOrder: 0,
        },
        {
          kind: 'development',
          id: 'dev-10-unit-a',
          href: '/development/demo-development/unit/unit-a',
          title: '2 Bedroom Apartment for Sale',
          location: 'Berea, Johannesburg, Gauteng',
          city: 'Johannesburg',
          suburb: 'Berea',
          province: 'Gauteng',
          price: 1200000,
          image: '',
          images: [],
          propertyType: 'apartment',
          listingType: 'sale',
          listingSource: 'development',
          contactRole: 'developer',
          identity: { role: 'developer', name: 'Demo Builder' },
          development: { id: 10, name: 'Demo Development', slug: 'demo-development' },
          developerBrand: { id: 4, brandName: 'Demo Builder', slug: 'demo-builder' },
          highlights: [],
          listedDate: new Date('2026-03-20T00:00:00.000Z'),
          developmentId: 10,
          unitTypeId: 'unit-a',
          unitDisplayOrder: 1,
        },
      ],
      total: 2,
      page: 1,
      pageSize: 20,
      hasMore: false,
    });

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

    expect((result as any).items.map((item: any) => item.unitTypeId)).toEqual(['unit-b', 'unit-a']);
    expect((result as any).cards.map((card: any) => card.unitTypeId)).toEqual(['unit-b', 'unit-a']);
    expect((result as any).cards.map((card: any) => card.unitDisplayOrder)).toEqual([0, 1]);
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

  it('accepts auction listing type and passes it to development-derived search', async () => {
    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    await caller.properties.searchDevelopmentListings({
      limit: 20,
      offset: 0,
      listingType: 'auction',
    });

    expect(mockSearchListings).toHaveBeenCalledWith(
      expect.objectContaining({
        listingType: 'auction',
      }),
      'date_desc',
      1,
      20,
    );
  });
});
