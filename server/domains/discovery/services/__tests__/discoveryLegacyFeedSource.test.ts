import { beforeEach, describe, expect, it, vi } from 'vitest';
import { discoveryLegacyFeedSource } from '../discoveryLegacyFeedSource';

const { dbSelectChainMock } = vi.hoisted(() => ({
  dbSelectChainMock: {
    from: vi.fn(),
    leftJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
  },
}));

vi.mock('../../../../db', () => ({
  getDb: vi.fn(async () => ({
    select: vi.fn(() => dbSelectChainMock),
  })),
}));

describe('discoveryLegacyFeedSource', () => {
  beforeEach(() => {
    dbSelectChainMock.from.mockReturnValue(dbSelectChainMock);
    dbSelectChainMock.leftJoin.mockReturnValue(dbSelectChainMock);
    dbSelectChainMock.where.mockReturnValue(dbSelectChainMock);
    dbSelectChainMock.orderBy.mockReturnValue(dbSelectChainMock);
    dbSelectChainMock.limit.mockReturnValue(dbSelectChainMock);
    dbSelectChainMock.offset.mockResolvedValue([]);
  });

  it('builds category candidates from discovery-owned queries', async () => {
    dbSelectChainMock.offset.mockResolvedValue([
      {
        content: {
          id: 12,
          title: 'Property spotlight',
          description: 'Modern family home',
          thumbnailUrl: 'https://example.com/property.jpg',
          videoUrl: 'https://example.com/property.mp4',
          engagementScore: 44,
        },
      },
    ]);

    const result = await discoveryLegacyFeedSource.getCategoryCandidates({
      category: 'property',
      limit: 30,
      offset: 10,
    });

    expect(result.feedType).toBe('category');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: 12,
        primaryMediaUrl: 'https://example.com/property.mp4',
        performanceScore: 44,
      }),
    );
    expect(result.metadata).toEqual({ category: 'property' });
  });

  it('builds area candidates from discovery-owned queries', async () => {
    dbSelectChainMock.offset.mockResolvedValue([
      {
        content: {
          id: 31,
          title: 'Sandton update',
          thumbnailUrl: 'https://example.com/sandton.jpg',
        },
      },
    ]);

    const result = await discoveryLegacyFeedSource.getAreaCandidates({
      location: 'Sandton',
      limit: 5,
      offset: 0,
    });

    expect(result.feedType).toBe('area');
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: 31,
        primaryMediaUrl: 'https://example.com/sandton.jpg',
      }),
    );
    expect(result.metadata).toEqual({ location: 'Sandton' });
  });

  it('builds recommended candidates from discovery-owned queries', async () => {
    dbSelectChainMock.offset.mockResolvedValue([
      {
        id: 77,
        title: 'Featured loft',
        description: 'High-rise city views',
        thumbnailUrl: 'https://example.com/featured.jpg',
        isFeatured: 1,
        engagementScore: 120,
      },
    ]);

    const result = await discoveryLegacyFeedSource.getRecommendedCandidates({
      userId: 42,
      limit: 20,
      offset: 5,
    });

    expect(result.feedType).toBe('recommended');
    expect(result.items).toEqual([
      expect.objectContaining({
        id: 77,
        primaryMediaUrl: 'https://example.com/featured.jpg',
        performanceScore: 120,
      }),
    ]);
    expect(result.hasMore).toBe(false);
    expect(result.offset).toBe(6);
    expect(result.metadata).toEqual({ personalized: false });
  });
});
