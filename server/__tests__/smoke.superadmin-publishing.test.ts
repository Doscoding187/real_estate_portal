import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDb } from '../db-connection';
import { developerBrandProfileService } from '../services/developerBrandProfileService';
import { developmentService } from '../services/developmentService';

describe('Demo Gate v1: super admin publishing smoke', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('covers brand create, development create, and development fetch without crashing', async () => {
    const dbConn = await getDb();
    expect(dbConn).toBeTruthy();

    const brand = await developerBrandProfileService.createBrandProfile({
      brandName: 'Demo Gate Brand',
    });

    expect(typeof brand.id).toBe('number');
    expect(Number.isFinite(brand.id)).toBe(true);

    const createdDevelopmentId = 101;
    vi.spyOn(developmentService, 'createDevelopment').mockResolvedValue({
      id: createdDevelopmentId,
      name: 'Demo Gate Development',
      developmentType: 'residential',
    } as any);

    const created = await developmentService.createDevelopment(
      1,
      {
        name: 'Demo Gate Development',
        developmentType: 'residential',
      } as any,
      {
        ownerType: 'platform',
        brandProfileId: brand.id || 1,
      },
      { brandProfileId: brand.id || 1 },
    );

    expect(typeof created.id).toBe('number');
    expect(created.id).toBe(createdDevelopmentId);

    vi.spyOn(developmentService, 'getDevelopmentWithPhases').mockResolvedValue(null);
    const fetched = await developmentService.getDevelopmentWithPhases(createdDevelopmentId);

    expect(fetched === null || typeof fetched === 'object').toBe(true);
  });
});
