import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { locationPagesService } from '../locationPagesService.improved';
import { locationPagesService as baseLocationPagesService } from '../locationPagesService';

const describeWithDb = process.env.DATABASE_URL ? describe : describe.skip;

describeWithDb('LocationCache Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delegates enhanced province data lookups to the base service', async () => {
    const expected = { province: { id: 1, name: 'Gauteng' } };
    const provinceSpy = vi
      .spyOn(baseLocationPagesService, 'getProvinceData')
      .mockResolvedValue(expected as any);

    const result = await locationPagesService.getEnhancedProvinceData('gauteng');

    expect(provinceSpy).toHaveBeenCalledWith('gauteng');
    expect(result).toEqual(expected);
  });

  it('delegates path lookups to province/city/suburb base methods', async () => {
    const provinceSpy = vi
      .spyOn(baseLocationPagesService, 'getProvinceData')
      .mockResolvedValue({ province: { id: 1 } } as any);
    const citySpy = vi
      .spyOn(baseLocationPagesService, 'getCityData')
      .mockResolvedValue({ city: { id: 2 } } as any);
    const suburbSpy = vi
      .spyOn(baseLocationPagesService, 'getSuburbData')
      .mockResolvedValue({ suburb: { id: 3 } } as any);

    await locationPagesService.getLocationByPath('gauteng');
    await locationPagesService.getLocationByPath('gauteng', 'johannesburg');
    await locationPagesService.getLocationByPath('gauteng', 'johannesburg', 'berea');

    expect(provinceSpy).toHaveBeenCalledWith('gauteng');
    expect(citySpy).toHaveBeenCalledWith('gauteng', 'johannesburg');
    expect(suburbSpy).toHaveBeenCalledWith('gauteng', 'johannesburg', 'berea');
  });

  it('keeps cache invalidation as a safe no-op in stabilized mode', async () => {
    await expect(locationPagesService.invalidateLocationCache(1)).resolves.toBeUndefined();
  });
});
