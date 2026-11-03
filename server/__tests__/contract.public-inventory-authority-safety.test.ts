import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    getPropertyById: vi.fn(),
    archiveListing: vi.fn(),
    deleteProperty: vi.fn(),
    updateProperty: vi.fn(),
    getListingById: vi.fn(),
    deleteListing: vi.fn(),
    setUserFavoriteFact: vi.fn(),
    recordUserListingViewFact: vi.fn(),
    getUserFavoriteFacts: vi.fn(),
    getUserRecentViewFacts: vi.fn(),
    getDb: vi.fn(),
    assertNotDedicatedLandWorkflowListing: vi.fn(),
  },
}));

vi.mock('../db', () => mockDb);

const { mockResolvePublicPropertyEligibility } = vi.hoisted(() => ({
  mockResolvePublicPropertyEligibility: vi.fn(),
}));

vi.mock('../services/publicPropertyEligibilityService', () => ({
  resolvePublicPropertyEligibility: mockResolvePublicPropertyEligibility,
  resolvePublicPropertyEligibilities: vi.fn(),
  resolvePublicPropertyEligibilitiesBySourceListingIds: vi.fn(),
}));

import { appRouter } from '../routers';

const callerFor = (role = 'agent') =>
  appRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: { id: 42, email: `${role}@example.test`, name: role, role },
  } as any);

describe('public inventory authority safety contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.archiveListing.mockResolvedValue(undefined);
    mockDb.deleteProperty.mockResolvedValue(undefined);
    mockDb.deleteListing.mockResolvedValue(undefined);
    mockDb.setUserFavoriteFact.mockResolvedValue({ propertyId: 705, saved: true });
    mockDb.getDb.mockResolvedValue({});
    mockDb.assertNotDedicatedLandWorkflowListing.mockResolvedValue(undefined);
    mockDb.getListingById.mockReset();
    mockResolvePublicPropertyEligibility.mockReset();
  });

  it.each(['create', 'update', 'delete'] as const)(
    'does not expose direct property %s procedures',
    async operation => {
      const caller = callerFor() as any;
      await expect(caller.properties[operation]({ id: 700 })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });

      expect(mockDb.deleteProperty).not.toHaveBeenCalled();
      expect(mockDb.updateProperty).not.toHaveBeenCalled();
    },
  );

  it('does not preserve a direct hard-delete fallback for an unlinked property', async () => {
    const caller = callerFor() as any;
    await expect(caller.properties.delete({ id: 701 })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(mockDb.deleteProperty).not.toHaveBeenCalled();
    expect(mockDb.archiveListing).not.toHaveBeenCalled();
  });

  it('refuses to save a legacy Commercial property mirror as a generic favorite', async () => {
    mockResolvePublicPropertyEligibility.mockResolvedValue({
      sourceListingId: 1705,
      property: { id: 705, propertyType: 'commercial' },
    });

    await expect(
      callerFor().properties.setFavorite({ propertyId: 705, saved: true }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Commercial leasing is available through the dedicated Commercial journey only.',
    });

    expect(mockDb.setUserFavoriteFact).not.toHaveBeenCalled();
  });

  it('refuses to save an unavailable public projection before persistence', async () => {
    mockResolvePublicPropertyEligibility.mockResolvedValue(null);

    await expect(
      callerFor().properties.setFavorite({ propertyId: 706, saved: true }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Property is not currently available in the public inventory.',
    });

    expect(mockDb.setUserFavoriteFact).not.toHaveBeenCalled();
  });

  it('archives published listings instead of hard-deleting customer-visible supply', async () => {
    mockDb.getListingById.mockResolvedValue({
      id: 1703,
      userId: 42,
      ownerId: 42,
      status: 'published',
    });

    await expect(callerFor().listing.delete({ id: 1703 })).resolves.toEqual({
      success: true,
      status: 'archived',
    });

    expect(mockDb.archiveListing).toHaveBeenCalledWith(1703);
    expect(mockDb.deleteListing).not.toHaveBeenCalled();
  });
});
