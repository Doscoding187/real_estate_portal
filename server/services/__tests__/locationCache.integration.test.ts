import { describe, it, expect, vi, beforeEach } from 'vitest';
import { locationPagesService } from '../locationPagesService.improved';

// Mock the Redis Cache Manager
const mockGet = vi.fn();
const mockSet = vi.fn();
const mockExists = vi.fn();
const mockDel = vi.fn();

vi.mock('../../_core/cache/redis', () => ({
  getRedisCacheManager: () => ({
    get: mockGet,
    set: mockSet,
    exists: mockExists,
    del: mockDel,
  }),
  CachePrefixes: {
    LOCATION_DATA: 'loc:',
    STATISTICS: 'stats:',
  },
}));

vi.mock('../../db', () => {
  const mockDbObj = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi
      .fn()
      .mockResolvedValue([{ id: 1, name: 'Gauteng', slug: 'gauteng', type: 'province' }]),
    execute: vi.fn(),
  };
  return {
    getDb: vi.fn().mockResolvedValue(mockDbObj),
    db: mockDbObj,
  };
});

describe('LocationCache Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should try to get cached static content for province', async () => {
    // Setup mock return for cache miss
    mockExists.mockResolvedValue(false);

    // We expect getLocationByPath to be called and fail since we didn't fully mock the DB chain return values
    // But we just want to verify the cache attempt
    try {
      await locationPagesService.getEnhancedProvinceData('gauteng');
    } catch (e) {
      // Ignore DB errors
    }

    expect(mockExists).toHaveBeenCalledWith('static:province:gauteng');
  });

  it('should try to get cached dynamic content for province', async () => {
    mockExists.mockResolvedValue(false);

    // Mock getProvinceData to avoid complex DB logic inside it
    const spy = vi.spyOn(locationPagesService, 'getProvinceData');
    spy.mockResolvedValue({ some: 'data' } as any);

    await locationPagesService.getEnhancedProvinceData('gauteng');

    expect(mockExists).toHaveBeenCalledWith('dynamic:province:gauteng');
    spy.mockRestore();
  });

  it('should invalidate cache keys using redis manager', async () => {
    // Mock DB to return a location so invalidation logic proceeds
    const { getDb } = await import('../../db');
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          id: 1,
          type: 'province',
          slug: 'gauteng',
        },
      ]),
    };
    (getDb as any).mockResolvedValue(mockDb);

    await locationPagesService.invalidateLocationCache(1);

    expect(mockDel).toHaveBeenCalled();
    const deletedKeys = mockDel.mock.calls[0][0];
    expect(deletedKeys).toContain('dynamic:province:gauteng');
  });
});
