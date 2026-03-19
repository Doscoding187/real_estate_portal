import { describe, it, expect, vi } from 'vitest';
import { locationPagesRouter } from '../locationPagesRouter';
import { locationPagesService } from '../services/locationPagesService.improved';

describe('LocationPages Router', () => {
  it('should fetch province data successfully', async () => {
    const expected = {
      province: { id: 1, name: 'Western Cape', slug: 'western-cape' },
      cities: [],
      featuredDevelopments: [],
      trendingSuburbs: [],
      stats: { totalListings: 100 },
    };
    vi.spyOn(locationPagesService, 'getEnhancedProvinceData').mockResolvedValue(expected as any);

    // Mock context
    const ctx = { req: {}, res: {}, user: null } as any;

    // Create caller
    const caller = locationPagesRouter.createCaller(ctx);

    const result = await caller.getEnhancedProvinceData({ provinceSlug: 'western-cape' });

    expect(result).toEqual(expected);
    expect(locationPagesService.getEnhancedProvinceData).toHaveBeenCalledWith('western-cape');
  });
});
