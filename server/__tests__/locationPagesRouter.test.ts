import { locationPagesRouter } from '../locationPagesRouter';
import { describe, it, expect, vi } from 'vitest';

// Mock dependencies
vi.mock('../services/locationPagesService.improved', () => ({
  locationPagesService: {
    getEnhancedProvinceData: vi.fn().mockResolvedValue({
      province: { id: 1, name: 'Western Cape', slug: 'western-cape' },
      cities: [],
      featuredDevelopments: [],
      trendingSuburbs: [],
      stats: { totalListings: 100 },
    }),
    getEnhancedCityData: vi.fn(),
    getEnhancedSuburbData: vi.fn(),
  },
}));

describe('LocationPages Router', () => {
  it('should fetch province data successfully', async () => {
    // Mock context
    const ctx = { req: {}, res: {}, user: null } as any;

    // Create caller
    const caller = locationPagesRouter.createCaller(ctx);

    const result = await caller.getEnhancedProvinceData({ provinceSlug: 'western-cape' });

    expect(result).toBeDefined();
    expect(result.province.name).toBe('Western Cape');
    expect(result.stats.totalListings).toBe(100);
  });
});
