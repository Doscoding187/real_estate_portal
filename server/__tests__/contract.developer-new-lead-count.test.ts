import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDeveloperNewLeadCount, mockRequireDeveloperProfileByUserId } = vi.hoisted(() => ({
  mockGetDeveloperNewLeadCount: vi.fn(),
  mockRequireDeveloperProfileByUserId: vi.fn(),
}));

vi.mock('../services/developerFunnelService', () => ({
  getDeveloperNewLeadCount: mockGetDeveloperNewLeadCount,
}));

vi.mock('../services/developerService', () => ({
  getDeveloperByUserId: vi.fn(),
  requireDeveloperProfileByUserId: mockRequireDeveloperProfileByUserId,
}));

import { developerRouter } from '../developerRouter';

const developerCaller = () =>
  developerRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: { id: 9001, role: 'property_developer' },
  } as any);

const anonymousCaller = () =>
  developerRouter.createCaller({ req: { headers: {} }, res: {}, user: null } as any);

describe('developer.getNewLeadCount contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireDeveloperProfileByUserId.mockResolvedValue({
      organisationId: 501,
      publisherId: 7001,
    });
    mockGetDeveloperNewLeadCount.mockResolvedValue({ count: 3 });
  });

  it('resolves the caller developer identity and scopes the count to its publisher', async () => {
    await expect(developerCaller().getNewLeadCount()).resolves.toEqual({ count: 3 });

    expect(mockRequireDeveloperProfileByUserId).toHaveBeenCalledWith(9001);
    expect(mockGetDeveloperNewLeadCount).toHaveBeenCalledWith({ developerId: 7001 });
  });

  it('never reports another developer organisation count', async () => {
    mockRequireDeveloperProfileByUserId.mockResolvedValue({
      organisationId: 502,
      publisherId: 7002,
    });
    mockGetDeveloperNewLeadCount.mockResolvedValue({ count: 0 });

    await expect(developerCaller().getNewLeadCount()).resolves.toEqual({ count: 0 });
    expect(mockGetDeveloperNewLeadCount).toHaveBeenCalledWith({ developerId: 7002 });
    expect(mockGetDeveloperNewLeadCount).not.toHaveBeenCalledWith({ developerId: 7001 });
  });

  it('rejects an unauthenticated caller before resolving developer context', async () => {
    await expect(anonymousCaller().getNewLeadCount()).rejects.toThrow();
    expect(mockRequireDeveloperProfileByUserId).not.toHaveBeenCalled();
    expect(mockGetDeveloperNewLeadCount).not.toHaveBeenCalled();
  });
});
