import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb, mockCacheGet, mockCacheSet, mockRecommendedFeedKey } = vi.hoisted(() => {
  const localDb: any = {
    select: vi.fn(),
    from: vi.fn(),
    leftJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
  };

  for (const method of ['select', 'from', 'leftJoin', 'where', 'orderBy', 'limit', 'offset']) {
    localDb[method].mockImplementation(() => localDb);
  }

  return {
    mockDb: localDb,
    mockCacheGet: vi.fn().mockResolvedValue(null),
    mockCacheSet: vi.fn().mockResolvedValue(undefined),
    mockRecommendedFeedKey: vi.fn().mockReturnValue('explore:recommended:test'),
  };
});

vi.mock('../../db', () => ({
  db: mockDb,
}));

vi.mock('../../lib/cache', () => ({
  cache: {
    get: mockCacheGet,
    set: mockCacheSet,
  },
  CacheKeys: {
    recommendedFeed: mockRecommendedFeedKey,
  },
  CacheTTL: {
    FEED: 60,
  },
}));

import { exploreFeedService } from '../exploreFeedService';

describe('ExploreFeedService fallback behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const method of ['select', 'from', 'leftJoin', 'where', 'orderBy', 'limit', 'offset']) {
      mockDb[method].mockImplementation(() => mockDb);
    }
  });

  it('propagates recommended feed query failures', async () => {
    mockDb.limit.mockRejectedValueOnce(new Error('recommended query failed'));

    await expect(exploreFeedService.getRecommendedFeed({ limit: 5, offset: 2 })).rejects.toThrow(
      'recommended query failed',
    );
  });

  it('propagates area feed query failures', async () => {
    mockDb.offset.mockRejectedValueOnce(new Error('area query failed'));

    await expect(exploreFeedService.getAreaFeed({ location: 'Sandton', limit: 5, offset: 4 })).rejects.toThrow(
      'area query failed',
    );
  });

  it('fails closed when the canonical Explore schema is missing', async () => {
    const missingSchemaError = new Error('Failed query');
    (missingSchemaError as any).cause = {
      code: 'ER_NO_SUCH_TABLE',
      message: "Table 'listify_local.explore_content' doesn't exist",
    };
    mockDb.limit.mockRejectedValueOnce(missingSchemaError);

    await expect(exploreFeedService.getRecommendedFeed({ limit: 5, offset: 0 })).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: 'Explore feed is unavailable until its canonical schema is established',
    });
  });
});
