import { describe, expect, it, vi } from 'vitest';

const { getDbMock, eligibilityMock, insertMock, valuesMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  eligibilityMock: vi.fn(),
  insertMock: vi.fn(),
  valuesMock: vi.fn(),
}));

vi.mock('../db', () => ({ getDb: getDbMock }));
vi.mock('../services/explorePublishingEligibilityService', () => ({
  getExplorePublishingEligibility: eligibilityMock,
  getExplorePublishingAccessMessage: (eligibility: { reason?: string }) =>
    eligibility.reason === 'publisher_submissions_not_open'
      ? 'Publisher submissions are not yet open.'
      : 'Your account is not approved to publish to Explore.',
  assertExploreReferenceOwnership: vi.fn(),
  ExplorePublishingAuthorizationError: class ExplorePublishingAuthorizationError extends Error {},
}));
vi.mock('../services/exploreFeedService', () => ({
  exploreFeedService: {
    getRecommendedFeed: vi.fn(),
    getAreaFeed: vi.fn(),
    getCategoryFeed: vi.fn(),
    getAgentFeed: vi.fn(),
    getDeveloperFeed: vi.fn(),
    getAgencyFeed: vi.fn(),
    getCategories: vi.fn(),
    getTopics: vi.fn(),
  },
}));
vi.mock('../services/exploreInteractionService', () => ({
  exploreInteractionService: { recordInteraction: vi.fn(), saveProperty: vi.fn(), shareProperty: vi.fn() },
}));

import { exploreRouter } from '../exploreRouter';

const uploadInput = {
  title: 'A property tour',
  mediaUrls: ['https://cdn.example.com/tour.mp4'],
};

function caller(user: { id: number; role: string; agencyId?: number } | null) {
  return exploreRouter.createCaller({ user, req: { headers: {} }, res: {} } as any);
}

describe('Explore publishing boundary', () => {
  it('rejects unauthenticated and ineligible upload attempts before writing content', async () => {
    getDbMock.mockResolvedValue({ insert: insertMock });
    eligibilityMock.mockResolvedValue({ allowed: false, reason: 'unsupported_role' });

    await expect(caller(null).uploadShort(uploadInput)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(caller({ id: 2, role: 'visitor' }).uploadShort(uploadInput)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });

    eligibilityMock.mockResolvedValue({
      allowed: false,
      reason: 'publisher_submissions_not_open',
    });
    await expect(caller({ id: 3, role: 'agent' }).uploadShort(uploadInput)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Publisher submissions are not yet open.',
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('limits writes to internal editorial authority and creates inactive content', async () => {
    valuesMock.mockResolvedValue({ insertId: 77 });
    insertMock.mockReturnValue({ values: valuesMock });
    getDbMock.mockResolvedValue({ insert: insertMock });
    eligibilityMock.mockResolvedValue({
      allowed: true,
      publisherType: 'editorial',
      publisherId: 9,
      creatorType: 'user',
      creatorId: 9,
      agencyId: null,
      agentId: null,
      developerId: null,
    });

    const result = await caller({ id: 9, role: 'super_admin' }).uploadShort({
      ...uploadInput,
      agencyId: 999,
      creatorType: 'developer',
    } as any);

    expect(result).toMatchObject({ success: true, contentId: 77, publicationState: 'inactive' });
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        creatorId: 9,
        creatorType: 'user',
        agencyId: null,
        isActive: 0,
      }),
    );
  });
});
