import { beforeEach, describe, expect, it, vi } from 'vitest';
import { discoveryFeedService } from '../discoveryFeedService';

const { getRecommendedFeedMock, getCategoryFeedMock } = vi.hoisted(() => ({
  getRecommendedFeedMock: vi.fn(),
  getCategoryFeedMock: vi.fn(),
}));

vi.mock('../../../../services/exploreFeedService', () => ({
  exploreFeedService: {
    getRecommendedFeed: getRecommendedFeedMock,
    getCategoryFeed: getCategoryFeedMock,
  },
}));

describe('discoveryFeedService', () => {
  beforeEach(() => {
    getRecommendedFeedMock.mockReset();
    getCategoryFeedMock.mockReset();
  });

  it('routes property category queries to the legacy category feed', async () => {
    getCategoryFeedMock.mockResolvedValue({
      items: [
        { id: 1, category: 'property', price: 1500000, contentType: 'video' },
      ],
      shorts: [
        { id: 1, category: 'property', price: 1500000, contentType: 'video' },
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
      limit: 20,
      offset: 0,
    });
    expect(result.items).toHaveLength(1);
    expect(result.feedType).toBe('category');
  });

  it('filters recommended feed results by price range', async () => {
    getRecommendedFeedMock.mockResolvedValue({
      items: [
        { id: 1, category: 'property', price: 900000, contentType: 'video' },
        { id: 2, category: 'property', price: 2100000, contentType: 'video' },
      ],
      shorts: [
        { id: 1, category: 'property', price: 900000, contentType: 'video' },
        { id: 2, category: 'property', price: 2100000, contentType: 'video' },
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
      limit: 20,
      offset: 0,
    });
    expect(result.items).toEqual([
      { id: 2, category: 'property', price: 2100000, contentType: 'video' },
    ]);
    expect(result.shorts).toEqual(result.items);
    expect(result.metadata?.discoveryQuery).toMatchObject({
      priceRange: { min: 1000000, max: 3000000 },
    });
  });
});
