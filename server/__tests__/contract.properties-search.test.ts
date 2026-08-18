import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSearchPublicInventory } = vi.hoisted(() => {
  return {
    mockSearchPublicInventory: vi.fn(),
  };
});

vi.mock('../services/publicSearchService', () => ({
  publicSearchService: {
    searchInventory: mockSearchPublicInventory,
  },
}));

import { appRouter } from '../routers';

describe('properties.search contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';

    mockSearchPublicInventory.mockResolvedValue({
      cards: [
        {
          kind: 'property',
          id: '501',
          propertyId: 501,
          href: '/property/501',
          title: 'Canonical property',
        },
        {
          kind: 'development',
          id: 'development:101',
          developmentId: 101,
          href: '/development/demo-development',
          title: 'Demo Development',
          development: {
            id: 101,
            name: 'Demo Development',
            slug: 'demo-development',
          },
        },
      ],
      total: 2,
      page: 0,
      pageSize: 20,
      hasMore: false,
      locationState: 'not_requested',
      sourceCounts: { manual: 1, development: 1 },
    });
  });

  it('keeps properties payload + pagination and omits developments by default', async () => {
    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    const result = await caller.properties.search({
      listingType: 'sale',
      limit: 20,
      offset: 0,
    });

    const propertiesPayload = (result as any).properties;
    const hasArrayProperties = Array.isArray(propertiesPayload);
    const hasItemsProperties =
      !!propertiesPayload &&
      typeof propertiesPayload === 'object' &&
      Array.isArray((propertiesPayload as any).items);

    expect(hasArrayProperties || hasItemsProperties).toBe(true);
    expect('hasMore' in (result as any) || 'pagination' in (result as any)).toBe(true);
    expect('developments' in (result as any)).toBe(false);
    expect(mockSearchPublicInventory).toHaveBeenCalledWith(
      expect.objectContaining({
        listingType: 'sale',
        listingSource: 'manual',
        page: 0,
        pageSize: 20,
      }),
    );
  });

  it('returns developments array payload when includeDevelopments=true', async () => {
    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    const result = await caller.properties.search({
      city: 'cape-town',
      province: 'western-cape',
      listingType: 'sale',
      limit: 20,
      offset: 0,
      includeDevelopments: true,
    });

    expect((result as any).developments).toBeDefined();
    expect(Array.isArray((result as any).developments.items)).toBe(true);
    expect(typeof (result as any).developments.total).toBe('number');
    expect(mockSearchPublicInventory).toHaveBeenCalledWith(
      expect.objectContaining({
        city: 'cape-town',
        province: 'western-cape',
        listingType: 'sale',
        listingSource: undefined,
      }),
    );
  });
});
