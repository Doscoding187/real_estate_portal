import { describe, expect, it, vi } from 'vitest';
import { TRPCError } from '@trpc/server';

const { mockVerifyBrandContext, mockGetDeveloperByUserId, mockGetDb } = vi.hoisted(() => ({
  mockVerifyBrandContext: vi.fn(),
  mockGetDeveloperByUserId: vi.fn(),
  mockGetDb: vi.fn(),
}));

vi.mock('../services/brandContextService', () => ({
  brandContextService: {
    verifyBrandContext: mockVerifyBrandContext,
  },
}));

vi.mock('../services/developerService', () => ({
  getDeveloperByUserId: mockGetDeveloperByUserId,
}));

vi.mock('../db-connection', () => ({
  getDb: mockGetDb,
}));

import { resolveOperatingIdentity } from '../_core/identityResolver';

function context(user: { id: number; role: string }, brandProfileId?: number) {
  return {
    req: { headers: {} },
    res: {},
    user,
    requestId: 's1-actor-contract',
    operatingAs:
      brandProfileId === undefined
        ? undefined
        : {
            brandProfileId,
            brandType: 'developer' as const,
            brandName: 'Requested Brand',
            originalUserId: user.id,
            ownerType: 'platform' as const,
            mode: 'platform_curator' as const,
          },
  } as any;
}

function developerBrandDatabase() {
  const limit = vi.fn().mockResolvedValue([
    {
      id: 44,
      ownerType: 'developer',
      linkedDeveloperAccountId: 7,
    },
  ]);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { select: vi.fn().mockReturnValue({ from }) };
}

describe('Developer Engine S1 actor authority', () => {
  it('resolves a valid platform-curator identity from server-validated brand state', async () => {
    mockVerifyBrandContext.mockResolvedValue({
      brandProfileId: 21,
      brandName: 'Curated Homes',
      ownerType: 'platform',
      identityType: 'developer',
      brandTier: 'regional',
      isOperatingAs: false,
    });

    const identity = await resolveOperatingIdentity(context({ id: 5, role: 'super_admin' }, 21), {
      mode: 'platform_curator',
      brandProfileId: 21,
    });

    expect(identity).toMatchObject({
      mode: 'platform_curator',
      actor: { userId: 5, role: 'super_admin' },
      brandProfileId: 21,
      ownerType: 'platform',
    });
    expect(mockVerifyBrandContext).toHaveBeenCalledWith(21);
  });

  it('rejects an ordinary actor before a curator brand can be resolved', async () => {
    await expect(
      resolveOperatingIdentity(context({ id: 8, role: 'property_developer' }, 21), {
        mode: 'platform_curator',
        brandProfileId: 21,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mockVerifyBrandContext).not.toHaveBeenCalled();
  });

  it('rejects a stale or cross-brand curator request', async () => {
    await expect(
      resolveOperatingIdentity(context({ id: 5, role: 'super_admin' }, 21), {
        mode: 'platform_curator',
        brandProfileId: 22,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('does not treat an arbitrary brand ID as curator context without server context resolution', async () => {
    await expect(
      resolveOperatingIdentity(context({ id: 5, role: 'super_admin' }), {
        mode: 'platform_curator',
        brandProfileId: 21,
      }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
    expect(mockVerifyBrandContext).not.toHaveBeenCalled();
  });

  it('uses the canonical brandProfile relationship instead of a stale developerBrandProfileId field', async () => {
    mockGetDeveloperByUserId.mockResolvedValue({
      id: 7,
      userId: 70,
      developerBrandProfileId: 999,
      brandProfile: { id: 44 },
    });
    mockGetDb.mockResolvedValue(developerBrandDatabase());

    const identity = await resolveOperatingIdentity(
      context({ id: 70, role: 'property_developer' }),
      { mode: 'developer', brandProfileId: 44 },
    );

    expect(identity).toMatchObject({
      mode: 'developer',
      actor: { userId: 70, role: 'property_developer' },
      developerId: 7,
      brandProfileId: 44,
      ownerType: 'developer',
    });

    await expect(
      resolveOperatingIdentity(context({ id: 70, role: 'property_developer' }), {
        mode: 'developer',
        brandProfileId: 45,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('allows developer-scoped onboarding before a public brand is linked', async () => {
    mockGetDeveloperByUserId.mockResolvedValue({
      id: 8,
      userId: 80,
      developerBrandProfileId: null,
      brandProfile: null,
    });

    await expect(
      resolveOperatingIdentity(context({ id: 80, role: 'property_developer' }), {
        mode: 'developer',
      }),
    ).resolves.toMatchObject({
      mode: 'developer',
      developerId: 8,
      brandProfileId: null,
      ownerType: 'developer',
    });
    expect(mockGetDb).not.toHaveBeenCalled();
  });

  it('propagates claimed or otherwise unavailable curator identities as authorization failures', async () => {
    mockVerifyBrandContext.mockRejectedValue(
      new TRPCError({ code: 'FORBIDDEN', message: 'Brand is claimed.' }),
    );

    await expect(
      resolveOperatingIdentity(context({ id: 5, role: 'super_admin' }, 21), {
        mode: 'platform_curator',
        brandProfileId: 21,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
