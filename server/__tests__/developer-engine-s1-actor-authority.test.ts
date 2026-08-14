import { describe, expect, it, vi } from 'vitest';
import { TRPCError } from '@trpc/server';

const { mockVerifyPublisherContext, mockGetDeveloperByUserId } = vi.hoisted(() => ({
  mockVerifyPublisherContext: vi.fn(),
  mockGetDeveloperByUserId: vi.fn(),
}));

vi.mock('../services/cataloguePublisherContextService', () => ({
  cataloguePublisherContextService: {
    verifyPublisherContext: mockVerifyPublisherContext,
  },
}));

vi.mock('../services/developerService', () => ({
  getDeveloperByUserId: mockGetDeveloperByUserId,
}));

import { resolveOperatingIdentity, validateOwnership } from '../_core/identityResolver';

function context(user: { id: number; role: string }, cataloguePublisherId?: number) {
  return {
    req: { headers: {} },
    res: {},
    user,
    requestId: 's1-actor-contract',
    operatingAs:
      cataloguePublisherId === undefined
        ? undefined
        : {
            cataloguePublisherId,
            publisherType: 'developer' as const,
            publisherName: 'Requested Publisher',
            originalUserId: user.id,
            authorityKind: 'platform_reference' as const,
            mode: 'platform_curator' as const,
          },
  } as any;
}

describe('Developer Engine S1 actor authority', () => {
  it('resolves a valid platform-curator identity from server-validated brand state', async () => {
    mockVerifyPublisherContext.mockResolvedValue({
      cataloguePublisherId: 21,
      publisherName: 'Curated Homes',
      authorityKind: 'platform_reference',
      publisherType: 'developer',
      brandTier: 'regional',
      isOperatingAs: false,
    });

    const identity = await resolveOperatingIdentity(context({ id: 5, role: 'super_admin' }, 21), {
      mode: 'platform_curator',
      cataloguePublisherId: 21,
    });

    expect(identity).toMatchObject({
      mode: 'platform_curator',
      actor: { userId: 5, role: 'super_admin' },
      cataloguePublisherId: 21,
      publisherType: 'developer',
    });
    expect(mockVerifyPublisherContext).toHaveBeenCalledWith(21);
  });

  it('rejects an ordinary actor before a curator brand can be resolved', async () => {
    await expect(
      resolveOperatingIdentity(context({ id: 8, role: 'property_developer' }, 21), {
        mode: 'platform_curator',
        cataloguePublisherId: 21,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mockVerifyPublisherContext).not.toHaveBeenCalled();
  });

  it('rejects a stale or cross-brand curator request', async () => {
    await expect(
      resolveOperatingIdentity(context({ id: 5, role: 'super_admin' }, 21), {
        mode: 'platform_curator',
        cataloguePublisherId: 22,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('does not treat an arbitrary brand ID as curator context without server context resolution', async () => {
    await expect(
      resolveOperatingIdentity(context({ id: 5, role: 'super_admin' }), {
        mode: 'platform_curator',
        cataloguePublisherId: 21,
      }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
    expect(mockVerifyPublisherContext).not.toHaveBeenCalled();
  });

  it('uses the canonical Catalogue Publisher relationship for a developer organisation', async () => {
    mockGetDeveloperByUserId.mockResolvedValue({
      id: 7,
      userId: 70,
      organisationId: 7,
      publisherId: 44,
      cataloguePublisherId: 44,
    });

    const identity = await resolveOperatingIdentity(
      context({ id: 70, role: 'property_developer' }),
      { mode: 'developer', cataloguePublisherId: 44 },
    );

    expect(identity).toMatchObject({
      mode: 'developer',
      actor: { userId: 70, role: 'property_developer' },
      developerId: 7,
      organisationId: 7,
      cataloguePublisherId: 44,
    });

    await expect(
      resolveOperatingIdentity(context({ id: 70, role: 'property_developer' }), {
        mode: 'developer',
        cataloguePublisherId: 45,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('requires the transactional onboarding identity to include a publisher', async () => {
    mockGetDeveloperByUserId.mockResolvedValue({
      id: 8,
      userId: 80,
      organisationId: 8,
      publisherId: null,
    });

    await expect(
      resolveOperatingIdentity(context({ id: 80, role: 'property_developer' }), {
        mode: 'developer',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('propagates claimed or otherwise unavailable curator identities as authorization failures', async () => {
    mockVerifyPublisherContext.mockRejectedValue(
      new TRPCError({ code: 'FORBIDDEN', message: 'Publisher is unavailable.' }),
    );

    await expect(
      resolveOperatingIdentity(context({ id: 5, role: 'super_admin' }, 21), {
        mode: 'platform_curator',
        cataloguePublisherId: 21,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('rejects conflicting organisation aliases while accepting canonical publisher ownership', () => {
    expect(() =>
      validateOwnership({ developerId: 31, organisationId: 32 }),
    ).toThrow('Conflicting ownership aliases supplied');
    expect(() =>
      validateOwnership({ cataloguePublisherId: 21, organisationId: 31 }),
    ).not.toThrow();
  });
});
