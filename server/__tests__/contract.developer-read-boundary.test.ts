import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetKPIsWithCache, mockGetDevelopmentWithPhases, mockRequireDeveloperProfileByUserId } =
  vi.hoisted(() => ({
    mockGetKPIsWithCache: vi.fn(),
    mockGetDevelopmentWithPhases: vi.fn(),
    mockRequireDeveloperProfileByUserId: vi.fn(),
  }));

vi.mock('../services/kpiService', () => ({
  getKPIsWithCache: mockGetKPIsWithCache,
}));

vi.mock('../services/developerService', () => ({
  getDeveloperByUserId: vi.fn(),
  requireDeveloperProfileByUserId: mockRequireDeveloperProfileByUserId,
}));

vi.mock('../services/developmentService', () => ({
  developmentService: {
    getDevelopmentWithPhases: mockGetDevelopmentWithPhases,
  },
}));

import { developerRouter } from '../developerRouter';

const developerCaller = () =>
  developerRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: { id: 9001, role: 'property_developer' },
  } as any);

const canonicalKpis = {
  totalLeads: 4,
  qualifiedLeads: 2,
  conversionRate: 25,
  unitsSold: 1,
  unitsAvailable: 5,
  affordabilityMatchPercent: 50,
  marketingPerformanceScore: 37.5,
  trends: {
    totalLeads: 0,
    qualifiedLeads: 0,
    conversionRate: 0,
    unitsSold: 0,
    affordabilityMatchPercent: 0,
    marketingPerformanceScore: 0,
  },
};

describe('developer operating read boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireDeveloperProfileByUserId.mockResolvedValue({
      organisationId: 501,
      publisherId: 7001,
    });
    mockGetKPIsWithCache.mockResolvedValue(canonicalKpis);
    mockGetDevelopmentWithPhases.mockResolvedValue({
      id: 42,
      cataloguePublisherId: 7001,
      unitTypes: [],
      phases: [],
    });
  });

  it('uses the organisation-owned publisher, not the organisation primary key, for KPIs', async () => {
    await expect(
      developerCaller().getDashboardKPIs({ timeRange: '90d', forceRefresh: true }),
    ).resolves.toEqual(canonicalKpis);

    expect(mockRequireDeveloperProfileByUserId).toHaveBeenCalledWith(9001);
    expect(mockGetKPIsWithCache).toHaveBeenCalledWith(7001, '90d', true);
    expect(mockGetKPIsWithCache).not.toHaveBeenCalledWith(501, '90d', true);
  });

  it('does not turn a KPI failure into a credible-looking zero report', async () => {
    mockGetKPIsWithCache.mockRejectedValueOnce(new Error('KPI database offline'));

    await expect(developerCaller().getDashboardKPIs({ timeRange: '30d' })).rejects.toThrow(
      'KPI database offline',
    );
  });

  it('loads an edit aggregate through the caller publisher scope', async () => {
    await expect(developerCaller().getDevelopment({ id: 42 })).resolves.toMatchObject({
      id: 42,
      cataloguePublisherId: 7001,
    });

    expect(mockGetDevelopmentWithPhases).toHaveBeenCalledWith(42, 7001);
  });

  it('keeps a missing or foreign edit target private and preserves operational failures', async () => {
    mockGetDevelopmentWithPhases.mockResolvedValueOnce(null);

    await expect(developerCaller().getDevelopment({ id: 42 })).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Development not found',
    });

    mockGetDevelopmentWithPhases.mockRejectedValueOnce(new Error('Development database offline'));

    await expect(developerCaller().getDevelopment({ id: 42 })).rejects.toThrow(
      'Development database offline',
    );
  });
});
