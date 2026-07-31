import { describe, expect, it, vi } from 'vitest';

import {
  assertExploreReferenceOwnership,
  ExplorePublishingAuthorizationError,
  getExplorePublishingEligibility,
} from '../explorePublishingEligibilityService';

function dbReturning(rows: unknown[]) {
  const query = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue(rows),
  };
  query.from.mockReturnValue(query);
  query.innerJoin.mockReturnValue(query);
  query.where.mockReturnValue(query);
  return { select: vi.fn(() => query) };
}

describe('Explore publishing eligibility', () => {
  it('fails closed for public and unsupported roles', async () => {
    const db = dbReturning([]);

    await expect(
      getExplorePublishingEligibility(db, { id: 1, role: 'visitor' }),
    ).resolves.toEqual({ allowed: false, reason: 'unsupported_role' });
    expect(db.select).not.toHaveBeenCalled();
  });

  it('requires approved organization identities for agencies, agents, and developers', async () => {
    await expect(
      getExplorePublishingEligibility(dbReturning([]), { id: 2, role: 'agency_admin' }),
    ).resolves.toEqual({ allowed: false, reason: 'agency_identity_required' });

    await expect(
      getExplorePublishingEligibility(dbReturning([]), { id: 3, role: 'agent' }),
    ).resolves.toEqual({ allowed: false, reason: 'agent_not_approved' });

    await expect(
      getExplorePublishingEligibility(dbReturning([]), { id: 4, role: 'property_developer' }),
    ).resolves.toEqual({ allowed: false, reason: 'developer_not_approved' });
  });

  it('keeps approved external publisher identities closed until submissions open', async () => {
    await expect(
      getExplorePublishingEligibility(dbReturning([{ id: 44 }]), {
        id: 5,
        role: 'agency_admin',
        agencyId: 44,
      }),
    ).resolves.toEqual({ allowed: false, reason: 'publisher_submissions_not_open' });

    await expect(
      getExplorePublishingEligibility(dbReturning([{ agentId: 17, agencyId: 44 }]), {
        id: 6,
        role: 'agent',
      }),
    ).resolves.toEqual({ allowed: false, reason: 'publisher_submissions_not_open' });

    await expect(
      getExplorePublishingEligibility(dbReturning([{ id: 81 }]), {
        id: 7,
        role: 'property_developer',
      }),
    ).resolves.toEqual({ allowed: false, reason: 'publisher_submissions_not_open' });
  });

  it('retains internal editorial authority without an external organisation identity', async () => {
    const publisher = await getExplorePublishingEligibility(dbReturning([]), {
      id: 7,
      role: 'super_admin',
    });
    expect(publisher).toMatchObject({
      allowed: true,
      publisherType: 'editorial',
      creatorType: 'user',
    });
  });

  it('retains ownership enforcement for any future external publisher authority', async () => {
    const publisher = {
      allowed: true as const,
      publisherType: 'developer' as const,
      publisherId: 81,
      creatorType: 'developer' as const,
      creatorId: 7,
      agencyId: null,
      agentId: null,
      developerId: 81,
    };

    await expect(
      assertExploreReferenceOwnership(dbReturning([{ developerId: 999 }]), publisher, { developmentId: 33 }),
    ).rejects.toBeInstanceOf(ExplorePublishingAuthorizationError);
  });
});
