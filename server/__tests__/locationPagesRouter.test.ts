import { describe, it, expect, vi } from 'vitest';
import { locationPagesRouter } from '../locationPagesRouter';
import { locationPagesService } from '../services/locationPagesService.improved';
import { provincialDiscoveryService } from '../services/provincialDiscoveryService';

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

  it('exposes the bounded provincial discovery read model without changing city contracts', async () => {
    const expected = {
      province: { id: 1, canonicalLocationId: 'province:1', name: 'Gauteng', slug: 'gauteng' },
      markets: [],
      journeyCounts: {},
      inventoryPreview: { state: 'empty', total: 0, items: [] },
      marketSnapshot: { state: 'unavailable' },
    };
    vi.spyOn(provincialDiscoveryService, 'getProvinceData').mockResolvedValue(expected as any);

    const caller = locationPagesRouter.createCaller({ req: {}, res: {}, user: null } as any);
    const result = await caller.getProvincialDiscoveryData({ provinceSlug: 'gauteng' });

    expect(result).toEqual(expected);
    expect(provincialDiscoveryService.getProvinceData).toHaveBeenCalledWith('gauteng');
  });
});
