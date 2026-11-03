import { beforeEach, describe, expect, it, vi } from 'vitest';
import { discoveryFeedService } from '../discoveryFeedService';

const { getRecommendedFeedMock, getCategoryFeedMock, getAreaFeedMock } = vi.hoisted(() => ({
  getRecommendedFeedMock: vi.fn(),
  getCategoryFeedMock: vi.fn(),
  getAreaFeedMock: vi.fn(),
}));

vi.mock('../discoveryFeedSource', () => ({
  discoveryFeedSource: {
    getRecommendedCandidates: getRecommendedFeedMock,
    getCategoryCandidates: getCategoryFeedMock,
    getAreaCandidates: getAreaFeedMock,
  },
}));

describe('discoveryFeedService', () => {
  beforeEach(() => {
    getRecommendedFeedMock.mockReset();
    getCategoryFeedMock.mockReset();
    getAreaFeedMock.mockReset();
  });

  it('routes property category queries to the legacy category feed', async () => {
    getCategoryFeedMock.mockResolvedValue({
      items: [
        {
          id: 1,
          category: 'property',
          price: 1500000,
          contentType: 'video',
          createdAt: '2026-03-19T00:00:00.000Z',
          actor: { id: 22 },
          thumbnailUrl: 'https://example.com/property.jpg',
        },
      ],
      shorts: [
        {
          id: 1,
          category: 'property',
          price: 1500000,
          contentType: 'video',
          createdAt: '2026-03-19T00:00:00.000Z',
          actor: { id: 22 },
          thumbnailUrl: 'https://example.com/property.jpg',
        },
      ],
      feedType: 'category',
      hasMore: false,
      offset: 1,
    });

    const result = await discoveryFeedService.getFeed({
      mode: 'feed',
      category: 'property',
      contentType: 'video',
      limit: 20,
    });

    expect(getCategoryFeedMock).toHaveBeenCalledWith({
      category: 'property',
      limit: 60,
      offset: 0,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: '1',
        type: 'property',
        price: 1500000,
      }),
    );
    expect(result.metadata?.feedType).toBe('category');
    expect(result.metadata?.discoveryCandidateCount).toBe(1);
  });

  it('filters recommended feed results by price range', async () => {
    getRecommendedFeedMock.mockResolvedValue({
      items: [
        {
          id: 1,
          category: 'property',
          price: 900000,
          contentType: 'video',
          createdAt: '2026-03-10T00:00:00.000Z',
          thumbnailUrl: 'https://example.com/low.jpg',
        },
        {
          id: 2,
          category: 'property',
          price: 2100000,
          contentType: 'video',
          createdAt: '2026-03-19T00:00:00.000Z',
          thumbnailUrl: 'https://example.com/high.jpg',
        },
      ],
      shorts: [
        {
          id: 1,
          category: 'property',
          price: 900000,
          contentType: 'video',
          createdAt: '2026-03-10T00:00:00.000Z',
          thumbnailUrl: 'https://example.com/low.jpg',
        },
        {
          id: 2,
          category: 'property',
          price: 2100000,
          contentType: 'video',
          createdAt: '2026-03-19T00:00:00.000Z',
          thumbnailUrl: 'https://example.com/high.jpg',
        },
      ],
      feedType: 'recommended',
      hasMore: true,
      offset: 20,
    });

    const result = await discoveryFeedService.getFeed({
      mode: 'feed',
      priceRange: {
        min: 1000000,
        max: 3000000,
      },
      contentType: 'video',
      limit: 20,
    });

    expect(getRecommendedFeedMock).toHaveBeenCalledWith({
      userId: undefined,
      limit: 60,
      offset: 0,
    });
    expect(result.items).toEqual([
      expect.objectContaining({
        id: '2',
        type: 'property',
        price: 2100000,
        media: expect.objectContaining({
          coverUrl: expect.any(String),
        }),
      }),
    ]);
    expect(result.metadata?.discoveryQuery).toMatchObject({
      priceRange: { min: 1000000, max: 3000000 },
    });
  });

  it('filters candidate items by creator actor id before paging the ranked feed', async () => {
    getRecommendedFeedMock.mockResolvedValue({
      items: [
        {
          id: 21,
          category: 'property',
          contentType: 'video',
          createdAt: '2026-03-18T00:00:00.000Z',
          actor: { id: 8 },
          viewCount: 1200,
          thumbnailUrl: 'https://example.com/one.jpg',
        },
        {
          id: 22,
          category: 'property',
          contentType: 'video',
          createdAt: '2026-03-19T00:00:00.000Z',
          actor: { id: 99 },
          viewCount: 2400,
          thumbnailUrl: 'https://example.com/two.jpg',
        },
        {
          id: 23,
          category: 'property',
          contentType: 'video',
          createdAt: '2026-03-19T12:00:00.000Z',
          actor: { id: 99 },
          viewCount: 3200,
          thumbnailUrl: 'https://example.com/three.jpg',
        },
      ],
      shorts: [],
      feedType: 'recommended',
      hasMore: false,
      offset: 20,
    });

    const result = await discoveryFeedService.getFeed({
      mode: 'shorts',
      creatorActorId: 99,
      contentType: 'video',
      limit: 1,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: '23',
        type: 'property',
        metadata: expect.objectContaining({
          actor: { id: 99 },
        }),
      }),
    );
    expect(result.hasMore).toBe(true);
    expect(result.offset).toBe(1);
  });

  it('routes one canonical Place identity into the exact area feed', async () => {
    getAreaFeedMock.mockResolvedValue({
      items: [
        {
          id: 31,
          canonicalPlaceId: 'pl-place-01-000000000000000000000007',
          category: 'property',
          contentType: 'video',
          createdAt: '2026-03-20T10:00:00.000Z',
          location: { name: 'Sandton' },
          viewCount: 1800,
          thumbnailUrl: 'https://example.com/sandton.jpg',
        },
      ],
      shorts: [],
      feedType: 'area',
      hasMore: false,
      offset: 20,
      metadata: { canonicalPlaceId: 'pl-place-01-000000000000000000000007' },
    });

    const result = await discoveryFeedService.getFeed({
      mode: 'feed',
      canonicalPlaceId: 'pl-place-01-000000000000000000000007',
      contentType: 'video',
      limit: 10,
    });

    expect(getAreaFeedMock).toHaveBeenCalledWith({
      canonicalPlaceId: 'pl-place-01-000000000000000000000007',
      limit: 30,
      offset: 0,
    });
    expect(getRecommendedFeedMock).not.toHaveBeenCalled();
    expect(result.metadata?.feedType).toBe('area');
    expect(result.items[0]).toEqual(expect.objectContaining({
      canonicalPlaceId: 'pl-place-01-000000000000000000000007',
      location: { name: 'Sandton' },
    }));
  });
});
