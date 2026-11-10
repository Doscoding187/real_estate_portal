import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCheckRateLimit, mockGetClientIp, mockCreateLead } = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn(),
  mockGetClientIp: vi.fn(),
  mockCreateLead: vi.fn(),
}));

vi.mock('../services/publicLeadRateLimitService', () => ({
  checkPublicLeadRateLimit: mockCheckRateLimit,
  getPublicLeadClientIp: mockGetClientIp,
}));

vi.mock('../services/servicesEngineService', async importOriginal => {
  const actual = await importOriginal<typeof import('../services/servicesEngineService')>();
  return {
    ...actual,
    servicesEngineService: {
      ...actual.servicesEngineService,
      createLeadFromContext: mockCreateLead,
    },
  };
});

import { servicesEngineRouter } from '../servicesEngineRouter';

const caller = () =>
  servicesEngineRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: { id: 42, role: 'agent' },
  } as any);

const input = () => ({
  requestKey: 'request-key-0123456789',
  providerId: 7,
  category: 'moving' as const,
  sourceSurface: 'directory' as const,
  intentStage: 'buyer_saved_property' as const,
  canonicalPlaceId: 'pl-place-01-000000000000000000000001',
  notes: 'Need a mover next month.',
  serviceCode: 'moving_local',
});

describe('servicesEngine.createLeadFromJourney rate limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClientIp.mockReturnValue('198.51.100.30');
    mockCreateLead.mockResolvedValue({ success: true, leadId: 1 });
  });

  it('rejects with TOO_MANY_REQUESTS and creates no lead when the async limiter resolves false', async () => {
    mockCheckRateLimit.mockResolvedValue(false);

    await expect(caller().createLeadFromJourney(input())).rejects.toMatchObject({
      code: 'TOO_MANY_REQUESTS',
    });
    expect(mockCheckRateLimit).toHaveBeenCalledWith('198.51.100.30', expect.anything());
    expect(mockCreateLead).not.toHaveBeenCalled();
  });

  it('creates the lead when the async limiter resolves true', async () => {
    mockCheckRateLimit.mockResolvedValue(true);

    await expect(caller().createLeadFromJourney(input())).resolves.toBeDefined();
    expect(mockCreateLead).toHaveBeenCalledOnce();
  });
});
