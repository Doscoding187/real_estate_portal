import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSearchProperties, mockGetFilterCounts } = vi.hoisted(() => ({
  mockSearchProperties: vi.fn(),
  mockGetFilterCounts: vi.fn(),
}));

vi.mock('../services/propertySearchService', () => ({
  propertySearchService: {
    searchProperties: mockSearchProperties,
    getFilterCounts: mockGetFilterCounts,
  },
}));

import { appRouter } from '../routers';

describe('propertyResults listingType contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';

    mockSearchProperties.mockResolvedValue({
      properties: [],
      total: 0,
      page: 1,
      pageSize: 12,
      hasMore: false,
    });
  });

  it('accepts auction listing type for result searches', async () => {
    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    await caller.propertyResults.search({
      filters: {
        listingType: 'auction',
      },
      page: 1,
      pageSize: 12,
      sortOption: 'date_desc',
    });

    expect(mockSearchProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        listingType: 'auction',
      }),
      'date_desc',
      1,
      12,
    );
  });
});
