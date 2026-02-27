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

  for (const method of ['select', 'from', 'leftJoin', 'where', 'orderBy', 'offset']) {
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
  });

  it('returns empty recommended feed when query fails', async () => {
    mockDb.limit.mockRejectedValueOnce(new Error('recommended query failed'));

    const result = await exploreFeedService.getRecommendedFeed({
      limit: 5,
      offset: 2,
    });

    expect(result.feedType).toBe('recommended');
    expect(result.items).toEqual([]);
    expect(result.shorts).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.offset).toBe(2);
    expect(result.metadata).toMatchObject({
      personalized: false,
      degraded: true,
      fallbackReason: 'query_error',
    });
  });

  it('returns empty area feed when query fails', async () => {
    mockDb.limit.mockRejectedValueOnce(new Error('area query failed'));

    const result = await exploreFeedService.getAreaFeed({
      location: 'Sandton',
      limit: 5,
      offset: 4,
    });

    expect(result.feedType).toBe('area');
    expect(result.items).toEqual([]);
    expect(result.shorts).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.offset).toBe(4);
    expect(result.metadata).toMatchObject({
      location: 'Sandton',
      degraded: true,
      fallbackReason: 'query_error',
    });
  });
});
