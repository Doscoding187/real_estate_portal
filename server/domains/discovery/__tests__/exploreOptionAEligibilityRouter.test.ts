import { TRPCError } from '@trpc/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrpcContext } from '../../../_core/context';

const {
  applyBrandContextMock,
  getFeedMock,
  handleEngagementMock,
  resolveEligibleProfilesMock,
  resolveListingCandidatesMock,
} = vi.hoisted(() => ({
  applyBrandContextMock: vi.fn(),
  getFeedMock: vi.fn(),
  handleEngagementMock: vi.fn(),
  resolveEligibleProfilesMock: vi.fn(),
  resolveListingCandidatesMock: vi.fn(),
}));

vi.mock('../../../_core/brandContext', () => ({
  applyBrandContext: applyBrandContextMock,
}));

vi.mock('../services/discoveryFeedService', () => ({
  discoveryFeedService: { getFeed: getFeedMock },
}));

vi.mock('../services/discoveryEngagementService', () => ({
  discoveryEngagementService: { handle: handleEngagementMock },
}));

vi.mock('../services/exploreOptionAEligibilityService', () => ({
  exploreOptionAEligibilityService: {
    resolveEligibleProfessionalProfiles: resolveEligibleProfilesMock,
    resolveListingCandidates: resolveListingCandidatesMock,
  },
}));

function createCaller(user: TrpcContext['user']) {
  return import('../router').then(({ discoveryRouter }) =>
    discoveryRouter.createCaller({
      user,
      req: { headers: {} } as TrpcContext['req'],
      res: {} as TrpcContext['res'],
      requestId: 'test',
    }),
  );
}

describe('Option A identity and listing eligibility procedures', () => {
  beforeEach(() => {
    applyBrandContextMock.mockReset();
    applyBrandContextMock.mockImplementation(async (context: unknown) => context);
    getFeedMock.mockReset();
    handleEngagementMock.mockReset();
    resolveEligibleProfilesMock.mockReset();
    resolveListingCandidatesMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects unauthenticated callers before resolving identity or listing candidates', async () => {
    const caller = await createCaller(null);

    await expect(caller.getOptionAIdentityContext()).rejects.toMatchObject<Partial<TRPCError>>({
      code: 'UNAUTHORIZED',
    });
    await expect(
      caller.listOptionAListingCandidates({ professionalProfileId: 101 }),
    ).rejects.toMatchObject<Partial<TRPCError>>({ code: 'UNAUTHORIZED' });
    expect(resolveEligibleProfilesMock).not.toHaveBeenCalled();
    expect(resolveListingCandidatesMock).not.toHaveBeenCalled();
  });

  it('withholds identity and listing information when the pilot gate denies access', async () => {
    vi.stubEnv('EXPLORE_OPTION_A_PILOT_ENABLED', 'false');
    vi.stubEnv('EXPLORE_OPTION_A_PILOT_ALLOWED_USER_IDS', '42');
    const caller = await createCaller({ id: 42, role: 'agent' } as TrpcContext['user']);

    await expect(caller.getOptionAIdentityContext()).rejects.toMatchObject<Partial<TRPCError>>({
      code: 'NOT_FOUND',
    });
    await expect(
      caller.listOptionAListingCandidates({ professionalProfileId: 101 }),
    ).rejects.toMatchObject<Partial<TRPCError>>({ code: 'NOT_FOUND' });
    expect(resolveEligibleProfilesMock).not.toHaveBeenCalled();
    expect(resolveListingCandidatesMock).not.toHaveBeenCalled();
  });

  it('does not turn an authenticated agent role into a professional profile', async () => {
    vi.stubEnv('EXPLORE_OPTION_A_PILOT_ENABLED', 'true');
    vi.stubEnv('EXPLORE_OPTION_A_PILOT_ALLOWED_USER_IDS', '42');
    resolveEligibleProfilesMock.mockResolvedValue([]);
    const caller = await createCaller({ id: 42, role: 'agent' } as TrpcContext['user']);

    await expect(caller.getOptionAIdentityContext()).resolves.toEqual({
      operator: { userId: 42 },
      eligibleProfiles: [],
    });
    expect(resolveEligibleProfilesMock).toHaveBeenCalledWith(42);
  });

  it('derives operator identity from context and delegates only a selected professional-profile ID', async () => {
    vi.stubEnv('EXPLORE_OPTION_A_PILOT_ENABLED', 'true');
    vi.stubEnv('EXPLORE_OPTION_A_PILOT_ALLOWED_USER_IDS', '42');
    resolveEligibleProfilesMock.mockResolvedValue([
      {
        professionalProfileId: 101,
        displayName: 'Verified Agent',
        publicProfileSlug: 'verified-agent',
      },
    ]);
    resolveListingCandidatesMock.mockResolvedValue([]);
    const caller = await createCaller({ id: 42, role: 'agent' } as TrpcContext['user']);

    await expect(caller.getOptionAIdentityContext()).resolves.toEqual({
      operator: { userId: 42 },
      eligibleProfiles: [
        {
          professionalProfileId: 101,
          displayName: 'Verified Agent',
          publicProfileSlug: 'verified-agent',
        },
      ],
    });
    await expect(
      caller.listOptionAListingCandidates({
        professionalProfileId: 101,
        userId: 999,
      } as unknown as { professionalProfileId: number }),
    ).resolves.toEqual({
      professionalProfileId: 101,
      candidates: [],
    });
    expect(resolveEligibleProfilesMock).toHaveBeenCalledWith(42);
    expect(resolveListingCandidatesMock).toHaveBeenCalledWith(42, 101);
    expect(getFeedMock).not.toHaveBeenCalled();
    expect(handleEngagementMock).not.toHaveBeenCalled();
  });
});
