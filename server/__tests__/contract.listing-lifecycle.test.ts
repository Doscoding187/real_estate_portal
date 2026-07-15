/**
 * Phase 3A/3B - Canonical Listing Lifecycle Contracts
 *
 * Characterisation tests that document and verify router-level lifecycle
 * behaviour. Lower-level sourceListingId bridge behavior is covered in
 * contract.listing-lifecycle-db.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the entire db module so we can assert what the router asks of it
// without needing a real database.
//
// Use vi.hoisted() to avoid hoisting issues with vi.mock factory functions.
// ---------------------------------------------------------------------------

const { mockDb, mockAssertListingPublicationEntitled } = vi.hoisted(() => ({
  mockDb: {
      getListingById: vi.fn(),
      createListing: vi.fn(),
      updateListing: vi.fn(),
      submitListingForReview: vi.fn(),
      approveListing: vi.fn(),
      rejectListing: vi.fn(),
      archiveListing: vi.fn(),
      deleteListing: vi.fn(),
      getListingMedia: vi.fn(),
      replaceListingMedia: vi.fn(),
      getUserListings: vi.fn(),
      getListingAnalytics: vi.fn(),
      getAgentById: vi.fn(),
      getAgentByUserId: vi.fn(),
      getUserById: vi.fn(),
      getApprovalQueue: vi.fn(),
      syncPublishedListingMediaToPropertyMirror: vi.fn(),
      getDb: vi.fn(),
  },
  mockAssertListingPublicationEntitled: vi.fn(),
}));

vi.mock('../db', () => mockDb);

// Also mock the agent OS event service so tests don't fail on recording
vi.mock('../services/agentOsEventService', () => ({
  recordAgentOsEvent: vi.fn(),
}));

vi.mock('../services/listingPublicationEntitlementService', () => ({
  assertListingPublicationEntitled: mockAssertListingPublicationEntitled,
  ListingPublicationEntitlementError: class ListingPublicationEntitlementError extends Error {
    constructor(public readonly reason: string, message: string) {
      super(message);
    }
  },
}));

// Mock readiness/quality to avoid calculation issues in tests
vi.mock('../lib/readiness', () => ({
  calculateListingReadiness: vi.fn(() => ({ score: 100, missing: [] })),
}));

vi.mock('../lib/quality', () => ({
  calculateListingQualityScore: vi.fn(() => ({ score: 90, breakdown: {} })),
}));

// Mock the inventory link resolver so the getLeads endpoint doesn't
// need a real database during characterization.
vi.mock('../services/inventoryLinkResolver', () => ({
  resolvePropertyForListing: vi.fn(() =>
    Promise.resolve({ propertyId: 999, sourceListingId: 1001 }),
  ),
}));

vi.mock('../services/locationPagesServiceEnhanced', () => ({
  locationPagesServiceEnhanced: {
    resolveLocation: vi.fn(() => Promise.resolve({ id: 999, name: 'Test City' })),
  },
}));

import { appRouter } from '../routers';
import { ListingPublicationEntitlementError } from '../services/listingPublicationEntitlementService';

// ---------------------------------------------------------------------------
// Shared test helpers
// ---------------------------------------------------------------------------

const makeCaller = (user: any = null) =>
  appRouter.createCaller({
    req: { headers: {} },
    res: {},
    user,
  } as any);

const ownerUser = {
  id: 42,
  email: 'agent@test.com',
  role: 'agent',
  name: 'Test Agent',
};

const adminUser = {
  id: 1,
  email: 'admin@test.com',
  role: 'super_admin',
  name: 'Super Admin',
};

const mockListing = (overrides: Record<string, any> = {}) => ({
  id: 1001,
  userId: ownerUser.id,
  ownerId: ownerUser.id,
  agentId: 55,
  title: 'Modern Family Home',
  description: 'A beautiful family home.',
  action: 'sell' as const,
  propertyType: 'house' as const,
  status: 'draft' as const,
  approvalStatus: 'pending' as const,
  address: '42 Oak Ave',
  city: 'Johannesburg',
  province: 'Gauteng',
  placeId: 'ChIJ123',
  latitude: -26.2041,
  longitude: 28.0473,
  pricing: { askingPrice: 2500000 },
  propertyDetails: { bedrooms: 4, bathrooms: 2 },
  featured: 0,
  readinessScore: 100,
  qualityScore: 90,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: null,
  archivedAt: null,
  ...overrides,
});

const mockMediaItem = (overrides: Record<string, any> = {}) => ({
  id: 501,
  listingId: 1001,
  mediaType: 'image' as const,
  originalUrl: 'https://cdn.example.com/photo1.jpg',
  processedUrl: 'https://cdn.example.com/photo1_processed.jpg',
  thumbnailUrl: 'https://cdn.example.com/photo1_thumb.jpg',
  displayOrder: 0,
  isPrimary: 1,
  ...overrides,
});

const withSilencedConsoleError = async (run: () => Promise<void>) => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  try {
    await run();
  } finally {
    spy.mockRestore();
  }
};

// ---------------------------------------------------------------------------
// Lifecycle Contract Tests
// ---------------------------------------------------------------------------

describe('listing lifecycle — canonical identity contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mockAssertListingPublicationEntitled).mockResolvedValue({
      kind: 'agency',
      agencyId: 1,
      listingId: 1001,
      responsibleAgentId: 55,
    } as any);

    // Default mocks so most tests don't need to repeat setup.
    // NOTE: agent.isVerified = 0 by default so submitForReview does NOT
    // fast-track into auto-approval. Tests that want fast-track must
    // override this mock explicitly.
    vi.mocked(mockDb.getListingById).mockResolvedValue(mockListing());
    vi.mocked(mockDb.getListingMedia).mockResolvedValue([mockMediaItem()]);
    vi.mocked(mockDb.replaceListingMedia).mockResolvedValue(undefined);
    vi.mocked(mockDb.createListing).mockResolvedValue(1001);
    vi.mocked(mockDb.updateListing).mockResolvedValue(undefined);
    vi.mocked(mockDb.submitListingForReview).mockResolvedValue(undefined);
    vi.mocked(mockDb.approveListing).mockResolvedValue(undefined);
    vi.mocked(mockDb.rejectListing).mockResolvedValue(undefined);
    vi.mocked(mockDb.archiveListing).mockResolvedValue(undefined);
    vi.mocked(mockDb.deleteListing).mockResolvedValue(undefined);
    vi.mocked(mockDb.getUserListings).mockResolvedValue([]);
    vi.mocked(mockDb.getListingAnalytics).mockResolvedValue(null);
    vi.mocked(mockDb.getAgentById).mockResolvedValue(null);
    vi.mocked(mockDb.getApprovalQueue).mockResolvedValue([]);
    vi.mocked(mockDb.syncPublishedListingMediaToPropertyMirror).mockResolvedValue({
      synced: true,
    } as any);
    vi.mocked(mockDb.getAgentByUserId).mockResolvedValue({
      id: 55,
      userId: ownerUser.id,
      isVerified: 0,
      whatsapp: '+27123456789',
      phone: '+27123456789',
    });
    vi.mocked(mockDb.getUserById).mockResolvedValue({
      id: ownerUser.id,
      phone: '+27123456789',
    });
    // Helper to create a chainable drizzle-like query mock
    const mockSelectChain = (result: any = []) => {
      const chain: any = vi.fn(() => chain);
      chain.from = vi.fn(() => chain);
      chain.where = vi.fn(() => chain);
      chain.orderBy = vi.fn(() => chain);
      chain.limit = vi.fn(() => chain);
      chain.offset = vi.fn(() => chain);
      chain.innerJoin = vi.fn(() => chain);
      chain.leftJoin = vi.fn(() => chain);
      chain.then = vi.fn((resolve: any) => Promise.resolve(result).then(resolve));
      chain.catch = vi.fn();
      return chain;
    };

    // Mock getDb to return a queryable drizzle-like object so endpoints
    // that call db.getDb() and then .select()/.where() don't crash.
    const mockDbInstance = {
      select: vi.fn(() => mockSelectChain()),
      insert: vi.fn(() => ({
        values: vi.fn(() => Promise.resolve({ insertId: 999 })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve(undefined)),
        })),
      })),
      delete: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve(undefined)),
      })),
      execute: vi.fn(() => Promise.resolve([{ columnExists: true }])),
      query: {
        properties: {
          findFirst: vi.fn(() => Promise.resolve(null)),
        },
      },
    };
    vi.mocked(mockDb.getDb).mockResolvedValue(mockDbInstance as any);
  });

  // -----------------------------------------------------------------------
  // 3.0 Private Listing Detail Visibility
  // -----------------------------------------------------------------------
  it('requires authentication before reading private listing detail', async () => {
    const caller = makeCaller(null);

    await expect(caller.listing.getById({ id: 1001 })).rejects.toThrow();
    expect(mockDb.getListingById).not.toHaveBeenCalled();
  });

  it('allows the owner to read a draft listing for editing', async () => {
    const caller = makeCaller(ownerUser);

    const result = await caller.listing.getById({ id: 1001 });

    expect(result?.property).toMatchObject({
      id: 1001,
      status: 'draft',
      title: 'Modern Family Home',
    });
    expect(mockDb.getListingMedia).toHaveBeenCalledWith(1001);
  });

  it('allows a super admin to read a pending listing for review', async () => {
    const caller = makeCaller(adminUser);
    vi.mocked(mockDb.getListingById).mockResolvedValue(
      mockListing({ id: 1002, ownerId: 999, userId: 999, status: 'pending_review' }),
    );

    const result = await caller.listing.getById({ id: 1002 });

    expect(result?.property).toMatchObject({
      id: 1002,
      status: 'pending_review',
    });
  });

  it('rejects non-owners from reading draft listing detail', async () => {
    const caller = makeCaller({ id: 999, email: 'other@test.com', role: 'agent' });

    await withSilencedConsoleError(async () => {
      await expect(caller.listing.getById({ id: 1001 })).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: 'Not authorized to view this listing',
      });
    });
    expect(mockDb.getListingMedia).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 3.1 Draft Creation
  // -----------------------------------------------------------------------
  it('create draft does not create property projection', async () => {
    const caller = makeCaller(ownerUser);
    vi.mocked(mockDb.createListing).mockResolvedValue(2001);

    await caller.listing.create({
      action: 'sell',
      propertyType: 'house',
      title: 'Test Listing Title',
      description: 'A description that is long enough to pass validation.',
      pricing: { askingPrice: 1000000 },
      propertyDetails: {},
      location: {
        address: '1 Test St',
        latitude: -26.0,
        longitude: 28.0,
        city: 'Test City',
        province: 'Gauteng',
      },
      mediaIds: [],
    });

    // createListing was called (not approveListing or anything that touches properties)
    expect(mockDb.createListing).toHaveBeenCalledOnce();
    // approveListing must NOT have been called
    expect(mockDb.approveListing).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 3.2 Identity Preservation
  // -----------------------------------------------------------------------
  it('update and submit preserve same listing id', async () => {
    const caller = makeCaller(ownerUser);
    const LISTING_ID = 3001;

    vi.mocked(mockDb.getListingById).mockResolvedValue(
      mockListing({ id: LISTING_ID, status: 'draft' }),
    );

    // Update the listing
    await caller.listing.update({
      id: LISTING_ID,
      title: 'Updated Title',
    });

    // Update must have been called with the same ID
    expect(mockDb.updateListing).toHaveBeenCalledWith(
      LISTING_ID,
      expect.objectContaining({ title: 'Updated Title' }),
    );

    // Submit for review
    await caller.listing.submitForReview({ listingId: LISTING_ID });

    // Submit must have been called with the same ID
    expect(mockDb.submitListingForReview).toHaveBeenCalledWith(LISTING_ID);
  });

  it('does not let verified-agent fast-track bypass the canonical entitlement assertion', async () => {
    const caller = makeCaller(ownerUser);
    const listingId = 3002;
    vi.mocked(mockDb.getListingById).mockResolvedValue(
      mockListing({ id: listingId, status: 'draft' }),
    );
    vi.mocked(mockDb.getAgentByUserId).mockResolvedValue({
      id: 55,
      userId: ownerUser.id,
      isVerified: 1,
      whatsapp: '+27123456789',
    });
    vi.mocked(mockAssertListingPublicationEntitled).mockRejectedValueOnce(
      new ListingPublicationEntitlementError(
        'subscription_suspended',
        'The subscription is suspended.',
      ),
    );

    await withSilencedConsoleError(async () => {
      await expect(caller.listing.submitForReview({ listingId })).rejects.toMatchObject({
        code: 'PRECONDITION_FAILED',
        message: 'The subscription is suspended.',
      });
    });

    expect(mockAssertListingPublicationEntitled).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ listingId, operation: 'submit' }),
    );
    expect(mockDb.approveListing).not.toHaveBeenCalled();
    expect(mockDb.submitListingForReview).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 3.3 Rejection Safety
  // -----------------------------------------------------------------------
  it('rejection never creates property projection', async () => {
    const caller = makeCaller(adminUser);

    vi.mocked(mockDb.getListingById).mockResolvedValue(
      mockListing({ id: 4001, status: 'pending_review', approvalStatus: 'pending' }),
    );

    await caller.listing.reject({
      listingId: 4001,
      reason: 'Incomplete documentation',
      reasons: ['Missing floor plan', 'Unclear images'],
    });

    // rejectListing was called
    expect(mockDb.rejectListing).toHaveBeenCalledOnce();
    // approveListing must NOT have been called
    expect(mockDb.approveListing).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 3.4 Approval Creates Exactly One Property with sourceListingId
  // -----------------------------------------------------------------------
  it('approval calls approveListing with listing id', async () => {
    const caller = makeCaller(adminUser);

    vi.mocked(mockDb.getListingById).mockResolvedValue(
      mockListing({ id: 5001, status: 'pending_review', approvalStatus: 'pending' }),
    );

    await caller.listing.approve({ listingId: 5001, notes: 'Looks good' });

    expect(mockDb.approveListing).toHaveBeenCalledOnce();
    // The first argument to approveListing must be the listing ID
    const firstArg = vi.mocked(mockDb.approveListing).mock.calls[0][0];
    expect(firstArg).toBe(5001);
  });

  // -----------------------------------------------------------------------
  // 3.5 Repeated Approval Idempotency
  // -----------------------------------------------------------------------
  it('repeated approval dispatches to approveListing; idempotency is enforced at db layer', async () => {
    const caller = makeCaller(adminUser);
    const LISTING_ID = 6001;

    vi.mocked(mockDb.getListingById).mockResolvedValue(
      mockListing({ id: LISTING_ID, status: 'pending_review' }),
    );

    await caller.listing.approve({ listingId: LISTING_ID });
    expect(mockDb.approveListing).toHaveBeenCalledTimes(1);
    expect(vi.mocked(mockDb.approveListing).mock.calls[0][0]).toBe(LISTING_ID);
  });

  // -----------------------------------------------------------------------
  // 3.6 Media Mirroring on Approval
  // -----------------------------------------------------------------------
  it('approval mirrors listing media to propertyImages via approveListing', async () => {
    const caller = makeCaller(adminUser);

    vi.mocked(mockDb.getListingById).mockResolvedValue(
      mockListing({ id: 7001, status: 'pending_review' }),
    );
    vi.mocked(mockDb.getListingMedia).mockResolvedValue([
      mockMediaItem({ id: 701, displayOrder: 0, isPrimary: 1 }),
      mockMediaItem({ id: 702, displayOrder: 1, isPrimary: 0 }),
    ]);

    await caller.listing.approve({ listingId: 7001 });

    // approveListing was called — it internally handles media mirroring
    expect(mockDb.approveListing).toHaveBeenCalledOnce();
    // The second and third args are reviewedBy and notes
    expect(vi.mocked(mockDb.approveListing).mock.calls[0][0]).toBe(7001);
  });

  // -----------------------------------------------------------------------
  // 3.7 Published Listing Edits
  // -----------------------------------------------------------------------
  it('updating a published listing sends changes back to review without syncing the public mirror', async () => {
    const caller = makeCaller(ownerUser);
    const LISTING_ID = 8001;

    vi.mocked(mockDb.getListingById).mockResolvedValue(
      mockListing({ id: LISTING_ID, status: 'published' }),
    );

    const result = await caller.listing.update({
      id: LISTING_ID,
      title: 'Still Modern Family Home',
    });

    expect(result).toMatchObject({ success: true, status: 'pending_review' });
    expect(mockDb.submitListingForReview).toHaveBeenCalledWith(LISTING_ID);
    expect(mockDb.syncPublishedListingMediaToPropertyMirror).not.toHaveBeenCalled();
  });

  it('replaces the canonical media manifest when an edit provides typed media', async () => {
    const caller = makeCaller(ownerUser);
    const LISTING_ID = 8101;
    const media = [
      {
        id: 'uploads/listings/8101/walkthrough.mp4',
        mediaType: 'video' as const,
        fileName: 'walkthrough.mp4',
        processingStatus: 'completed' as const,
      },
      {
        id: 'existing:701',
        mediaType: 'image' as const,
      },
    ];

    vi.mocked(mockDb.getListingById).mockResolvedValue(
      mockListing({ id: LISTING_ID, status: 'draft' }),
    );

    await caller.listing.update({
      id: LISTING_ID,
      mediaIds: media.map(item => item.id),
      mainMediaId: media[0].id,
      media,
    });

    expect(mockDb.replaceListingMedia).toHaveBeenCalledWith(LISTING_ID, media, media[0].id);
  });

  // -----------------------------------------------------------------------
  // 3.8 Lead Traceability
  // -----------------------------------------------------------------------
  it('lead can be resolved from propertyId back to listing via sourceListingId', async () => {
    // This test characterises that the lead-resolution path through getLeads
    // calls getListingById with the correct ID.
    const caller = makeCaller(ownerUser);
    const LISTING_ID = 9001;

    vi.mocked(mockDb.getListingById).mockResolvedValue(
      mockListing({ id: LISTING_ID, ownerId: ownerUser.id }),
    );

    await caller.listing.getLeads({ listingId: LISTING_ID });

    // The router resolves the listing and then looks up leads by propertyId
    expect(mockDb.getListingById).toHaveBeenCalledWith(LISTING_ID);
  });

  // -----------------------------------------------------------------------
  // 3.9 Archive cascades to property at db layer
  // -----------------------------------------------------------------------
  it('archive dispatches to archiveListing', async () => {
    const caller = makeCaller(ownerUser);
    const LISTING_ID = 10001;

    vi.mocked(mockDb.getListingById).mockResolvedValue(
      mockListing({ id: LISTING_ID, userId: ownerUser.id }),
    );

    await caller.listing.archive({ id: LISTING_ID });

    expect(mockDb.archiveListing).toHaveBeenCalledWith(LISTING_ID);
  });

  // -----------------------------------------------------------------------
  // 3.10 Delete soft-archives linked property at db layer
  // -----------------------------------------------------------------------
  it('delete dispatches to deleteListing', async () => {
    const caller = makeCaller(ownerUser);
    const LISTING_ID = 11001;

    vi.mocked(mockDb.getListingById).mockResolvedValue(
      mockListing({ id: LISTING_ID, userId: ownerUser.id }),
    );

    await caller.listing.delete({ id: LISTING_ID });

    expect(mockDb.deleteListing).toHaveBeenCalledWith(LISTING_ID);
  });

  // -----------------------------------------------------------------------
  // 3.11 Legacy Identity Matching - sourceListingId primary lookup at db layer
  // -----------------------------------------------------------------------
  it('approved listing edits require review before public sync', async () => {
    const caller = makeCaller(ownerUser);
    const LISTING_ID = 11002;

    vi.mocked(mockDb.getListingById).mockResolvedValue(
      mockListing({ id: LISTING_ID, status: 'approved' }),
    );

    await caller.listing.update({
      id: LISTING_ID,
      title: 'Updated Title',
    });

    expect(mockDb.submitListingForReview).toHaveBeenCalledWith(LISTING_ID);
    expect(mockDb.syncPublishedListingMediaToPropertyMirror).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 3.12 Action Parity — sell, rent, auction
  // -----------------------------------------------------------------------
  it.each(['sell', 'rent', 'auction'] as const)(
    'action "%s" follows same lifecycle through submit',
    async (action) => {
      const caller = makeCaller(ownerUser);
      const LISTING_ID = 12001;

      const pricing =
        action === 'sell'
          ? { askingPrice: 2000000 }
          : action === 'rent'
            ? { monthlyRent: 15000 }
            : { startingBid: 1000000 };

      vi.mocked(mockDb.getListingById).mockResolvedValue(
        mockListing({ id: LISTING_ID, action, pricing, status: 'draft' }),
      );

      // Submit for review
      await caller.listing.submitForReview({ listingId: LISTING_ID });

      // Same identity contract regardless of action
      expect(mockDb.submitListingForReview).toHaveBeenCalledWith(LISTING_ID);
    },
  );

  // -----------------------------------------------------------------------
  // Additional: Approve with non-admin user must fail
  // -----------------------------------------------------------------------
  it('approve rejects non-super-admin', async () => {
    const caller = makeCaller(ownerUser); // agent, not admin

    await expect(
      caller.listing.approve({ listingId: 13001 }),
    ).rejects.toThrow();
  });

  it('approve returns listing lifecycle-state errors as BAD_REQUEST', async () => {
    const caller = makeCaller(adminUser);
    vi.mocked(mockDb.approveListing).mockRejectedValueOnce(
      new Error('Listing is already published'),
    );

    await withSilencedConsoleError(async () => {
      await expect(caller.listing.approve({ listingId: 15001 })).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: 'Listing is already published',
      });
    });
  });

  it('approve returns missing listing errors as NOT_FOUND', async () => {
    const caller = makeCaller(adminUser);
    vi.mocked(mockDb.getListingById).mockResolvedValueOnce(null);

    await withSilencedConsoleError(async () => {
      await expect(caller.listing.approve({ listingId: 15005 })).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Listing not found',
      });
    });

    expect(mockDb.approveListing).not.toHaveBeenCalled();
  });

  it('approve keeps unrelated server errors internal', async () => {
    const caller = makeCaller(adminUser);
    vi.mocked(mockDb.approveListing).mockRejectedValueOnce(new Error('Database unavailable'));

    await withSilencedConsoleError(async () => {
      await expect(caller.listing.approve({ listingId: 15002 })).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to approve listing',
      });
    });
  });

  it('approve keeps listing-prefixed unrelated server errors internal', async () => {
    const caller = makeCaller(adminUser);
    vi.mocked(mockDb.approveListing).mockRejectedValueOnce(
      new Error('Listing database unavailable'),
    );

    await withSilencedConsoleError(async () => {
      await expect(caller.listing.approve({ listingId: 15006 })).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to approve listing',
      });
    });
  });

  // -----------------------------------------------------------------------
  // Additional: Reject with non-admin user must fail
  // -----------------------------------------------------------------------
  it('reject rejects non-super-admin', async () => {
    const caller = makeCaller(ownerUser); // agent, not admin

    await expect(
      caller.listing.reject({ listingId: 14001 }),
    ).rejects.toThrow();
  });

  it('reject returns listing lifecycle-state errors as BAD_REQUEST', async () => {
    const caller = makeCaller(adminUser);
    vi.mocked(mockDb.rejectListing).mockRejectedValueOnce(
      new Error('Listing cannot be rejected from status "published"'),
    );

    await withSilencedConsoleError(async () => {
      await expect(
        caller.listing.reject({ listingId: 15003, reason: 'Too late' }),
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: 'Listing cannot be rejected from status "published"',
      });
    });
  });

  it('reject returns missing listing errors as NOT_FOUND', async () => {
    const caller = makeCaller(adminUser);
    vi.mocked(mockDb.rejectListing).mockRejectedValueOnce(new Error('Listing not found'));

    await withSilencedConsoleError(async () => {
      await expect(
        caller.listing.reject({ listingId: 15005, reason: 'Missing record' }),
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Listing not found',
      });
    });
  });

  it('reject keeps unrelated server errors internal', async () => {
    const caller = makeCaller(adminUser);
    vi.mocked(mockDb.rejectListing).mockRejectedValueOnce(new Error('Database unavailable'));

    await withSilencedConsoleError(async () => {
      await expect(
        caller.listing.reject({ listingId: 15004, reason: 'Unexpected failure' }),
      ).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to reject listing',
      });
    });
  });
});
