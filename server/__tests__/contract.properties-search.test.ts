import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSearchProperties, mockListPublicDevelopments } = vi.hoisted(() => {
  return {
    mockSearchProperties: vi.fn(),
    mockListPublicDevelopments: vi.fn(),
  };
});

vi.mock('../services/propertySearchService', () => ({
  propertySearchService: {
    searchProperties: mockSearchProperties,
  },
}));

vi.mock('../services/developmentService', () => ({
  developmentService: {
    listPublicDevelopments: mockListPublicDevelopments,
  },
}));

import { appRouter } from '../routers';

describe('properties.search contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';

    mockSearchProperties.mockResolvedValue({
      properties: [],
      total: 0,
      page: 1,
      pageSize: 20,
      hasMore: false,
    });

    mockListPublicDevelopments.mockResolvedValue([
      {
        id: 101,
        name: 'Demo Development',
        slug: 'demo-development',
        city: 'Cape Town',
        suburb: 'City Bowl',
        province: 'Western Cape',
        priceFrom: 1200000,
        priceTo: 2500000,
        images: [],
        developerBrandProfileId: 1,
      },
    ]);
  });

  it('keeps properties payload + pagination and omits developments by default', async () => {
    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    const result = await caller.properties.search({
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
      limit: 20,
      offset: 0,
      includeDevelopments: true,
    });

    expect((result as any).developments).toBeDefined();
    expect(Array.isArray((result as any).developments.items)).toBe(true);
    expect(typeof (result as any).developments.total).toBe('number');
  });
});
