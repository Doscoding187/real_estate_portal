import { TRPCError } from '@trpc/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrpcContext } from '../../../_core/context';
import {
  canAccessExploreOptionAPilot,
  parseExploreOptionAPilotAllowedUserIds,
} from '../exploreOptionAPilotAccess';

describe('Explore Option A pilot access policy', () => {
  it('denies access when enablement is missing or explicitly false', () => {
    expect(canAccessExploreOptionAPilot(42, {})).toBe(false);
    expect(
      canAccessExploreOptionAPilot(42, {
        EXPLORE_OPTION_A_PILOT_ENABLED: 'false',
        EXPLORE_OPTION_A_PILOT_ALLOWED_USER_IDS: '42',
      }),
    ).toBe(false);
  });

  it('requires an exact allowlist match after trimming and ignoring empty entries', () => {
    const environment = {
      EXPLORE_OPTION_A_PILOT_ENABLED: 'true',
      EXPLORE_OPTION_A_PILOT_ALLOWED_USER_IDS: ' , 42, ,  84  , ',
    };

    expect(canAccessExploreOptionAPilot(42, environment)).toBe(true);
    expect(canAccessExploreOptionAPilot(84, environment)).toBe(true);
    expect(canAccessExploreOptionAPilot(4, environment)).toBe(false);
    expect(canAccessExploreOptionAPilot(420, environment)).toBe(false);
  });

  it('denies an enabled pilot with an empty, wildcard, or nonmatching allowlist', () => {
    expect(
      canAccessExploreOptionAPilot(42, {
        EXPLORE_OPTION_A_PILOT_ENABLED: 'true',
        EXPLORE_OPTION_A_PILOT_ALLOWED_USER_IDS: '',
      }),
    ).toBe(false);
    expect(
      canAccessExploreOptionAPilot(42, {
        EXPLORE_OPTION_A_PILOT_ENABLED: 'true',
        EXPLORE_OPTION_A_PILOT_ALLOWED_USER_IDS: '*, all, 4*',
      }),
    ).toBe(false);
    expect(parseExploreOptionAPilotAllowedUserIds('*, 42, 4*')).toEqual(new Set(['42']));
  });
});

const { applyBrandContextMock } = vi.hoisted(() => ({
  applyBrandContextMock: vi.fn(),
}));

const { getFeedMock, handleEngagementMock } = vi.hoisted(() => ({
  getFeedMock: vi.fn(),
  handleEngagementMock: vi.fn(),
}));

vi.mock('../../../_core/brandContext', () => ({
  applyBrandContext: applyBrandContextMock,
}));

vi.mock('../services/discoveryFeedService', () => ({
  discoveryFeedService: {
    getFeed: getFeedMock,
  },
}));

vi.mock('../services/discoveryEngagementService', () => ({
  discoveryEngagementService: {
    handle: handleEngagementMock,
  },
}));

describe('discovery.getOptionAPilotAccess', () => {
  beforeEach(() => {
    applyBrandContextMock.mockReset();
    applyBrandContextMock.mockImplementation(async (context: unknown) => context);
    getFeedMock.mockReset();
    handleEngagementMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('requires authentication and returns only the boolean decision without feed access', async () => {
    vi.stubEnv('EXPLORE_OPTION_A_PILOT_ENABLED', 'true');
    vi.stubEnv('EXPLORE_OPTION_A_PILOT_ALLOWED_USER_IDS', '42');

    const { discoveryRouter } = await import('../router');
    const createCaller = (user: TrpcContext['user']) =>
      discoveryRouter.createCaller({
        user,
        req: { headers: {} } as TrpcContext['req'],
        res: {} as TrpcContext['res'],
        requestId: 'test',
      });

    await expect(createCaller(null).getOptionAPilotAccess()).rejects.toMatchObject<
      Partial<TRPCError>
    >({ code: 'UNAUTHORIZED' });
    await expect(
      createCaller({ id: 7, role: 'agent' } as TrpcContext['user']).getOptionAPilotAccess(),
    ).resolves.toEqual({
      accessible: false,
    });
    await expect(
      createCaller({ id: 42, role: 'agent' } as TrpcContext['user']).getOptionAPilotAccess(),
    ).resolves.toEqual({
      accessible: true,
    });
    expect(getFeedMock).not.toHaveBeenCalled();
    expect(handleEngagementMock).not.toHaveBeenCalled();
  });
});
