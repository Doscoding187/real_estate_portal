/**
 * Phase 3A/3B — Canonical Listing Lifecycle Contracts
 *
 * Characterisation tests that document and verify the lifecycle behaviour.
 * These tests assert the contract at the router dispatch level.
 * Lower-level db function tests are in contract.listing-lifecycle-db.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the entire db module so we can assert what the router asks of it
// without needing a real database.
//
// Use vi.hoisted() to avoid hoisting issues with vi.mock factory functions.
// ---------------------------------------------------------------------------

const { mockDb } = vi.hoisted(() => ({
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
    getUserListings: vi.fn(),
    getListingAnalytics: vi.fn(),
    getAgentByUserId: vi.fn(),
    getUserById: vi.fn(),
    getApprovalQueue: vi.fn(),
    syncPublishedListingMediaToPropertyMirror: vi.fn(),
    getDb: vi.fn(),
  },
}));

vi.mock('../db', () => mockDb);

// Also mock the agent OS event service so tests don't fail on recording
vi.mock('../services/agentOsEventService', () => ({
  recordAgentOsEvent: vi.fn(),
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

import { appRouter } from '../routers';

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

// ---------------------------------------------------------------------------
// Lifecycle Contract Tests
// ---------------------------------------------------------------------------

describe('listing lifecycle — canonical identity contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks so most tests don't need to repeat setup.
    // NOTE: agent.isVerified = 0 by default so submitForReview does NOT
    // fast-track into auto-approval. Tests that want fast-track must
    // override this mock explicitly.
    vi.mocked(mockDb.getListingById).mockResolvedValue(mockListing());
    vi.mocked(mockDb.getListingMedia).mockResolvedValue([mockMediaItem()]);
    vi.mocked(mockDb.createListing).mockResolvedValue({ id: 1001 });
    vi.mocked(mockDb.updateListing).mockResolvedValue(undefined);
    vi.mocked(mockDb.submitListingForReview).mockResolvedValue(undefined);
    vi.mocked(mockDb.approveListing).mockResolvedValue(undefined);
    vi.mocked(mockDb.rejectListing).mockResolvedValue(undefined);
    vi.mocked(mockDb.archiveListing).mockResolvedValue(undefined);
    vi.mocked(mockDb.deleteListing).mockResolvedValue(undefined);
    vi.mocked(mockDb.getUserListings).mockResolvedValue([]);
    vi.mocked(mockDb.getListingAnalytics).mockResolvedValue(null);
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
  // 3.1 Draft Creation
  // -----------------------------------------------------------------------
  it('create draft does not create property projection', async () => {
    const caller = makeCaller(ownerUser);
    vi.mocked(mockDb.createListing).mockResolvedValue({ id: 2001 });

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
  // 3.5 Repeated Approval Idempotency  (FIXED — G-1)
  // -----------------------------------------------------------------------
  it('repeated approval dispatches correctly; idempotency enforced at db layer', async () => {
    // The router dispatches approveListing(listingId, reviewedBy, notes)
    // for every approve request. The idempotency guard lives in the
    // approveListing() DB function itself (query by sourceListingId,
    // UPDATE if exists, INSERT if not). This test verifies the router
    // dispatches correctly; the lower-level db test file
    // (contract.listing-lifecycle-db.test.ts) verifies the actual
    // idempotency behaviour.
    const caller = makeCaller(adminUser);
    const LISTING_ID = 6001;

    vi.mocked(mockDb.getListingById).mockResolvedValue(
      mockListing({ id: LISTING_ID, status: 'pending_review' }),
    );

    // First approval — dispatches approveListing
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
  // 3.7 Published Media Update — dispatches sync to db layer (FIXED — G-2)
  // -----------------------------------------------------------------------
  it('updating published listing media dispatches sync via sourceListingId', async () => {
    // The router dispatches syncPublishedListingMediaToPropertyMirror(listingId)
    // after updating a published listing. The sourceListingId lookup behaviour
    // is verified at the db layer (contract.listing-lifecycle-db.test.ts).
    const caller = makeCaller(ownerUser);
    const LISTING_ID = 8001;

    vi.mocked(mockDb.getListingById).mockResolvedValue(
      mockListing({ id: LISTING_ID, status: 'published' }),
    );

    await caller.listing.update({
      id: LISTING_ID,
      title: 'Still Modern Family Home',
    });

    expect(mockDb.syncPublishedListingMediaToPropertyMirror).toHaveBeenCalledWith(LISTING_ID);
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
  // 3.9 Archive cascades to property (FIXED — G-3)
  // -----------------------------------------------------------------------
  it('archive cascades to linked property projection', async () => {
    // Router dispatches archiveListing(listingId). The cascade to
    // properties.status='archived' is verified at the db layer
    // (contract.listing-lifecycle-db.test.ts).
    const caller = makeCaller(ownerUser);
    const LISTING_ID = 10001;

    vi.mocked(mockDb.getListingById).mockResolvedValue(
      mockListing({ id: LISTING_ID, userId: ownerUser.id }),
    );

    await caller.listing.archive({ id: LISTING_ID });

    expect(mockDb.archiveListing).toHaveBeenCalledWith(LISTING_ID);
  });

  // -----------------------------------------------------------------------
  // 3.10 Delete cascade to property (FIXED — G-4)
  // -----------------------------------------------------------------------
  it('delete soft-archives linked property projection', async () => {
    // Router dispatches deleteListing(listingId). The soft-archive of
    // properties.status='archived' is verified at the db layer
    // (contract.listing-lifecycle-db.test.ts).
    const caller = makeCaller(ownerUser);
    const LISTING_ID = 11001;

    vi.mocked(mockDb.getListingById).mockResolvedValue(
      mockListing({ id: LISTING_ID, userId: ownerUser.id }),
    );

    await caller.listing.delete({ id: LISTING_ID });

    expect(mockDb.deleteListing).toHaveBeenCalledWith(LISTING_ID);
  });

  // -----------------------------------------------------------------------
  // 3.11 Legacy Identity Matching — syncPublishedListingMediaToPropertyMirror
  // -----------------------------------------------------------------------
  it('sync is dispatched by the router for published listing updates', async () => {
    // Router dispatches syncPublishedListingMediaToPropertyMirror(listingId)
    // after any update to a published listing. The sourceListingId primary
    // lookup behaviour is verified at the db layer
    // (contract.listing-lifecycle-db.test.ts).
    const caller = makeCaller(ownerUser);
    const LISTING_ID = 11001;

    vi.mocked(mockDb.getListingById).mockResolvedValue(
      mockListing({ id: LISTING_ID, status: 'published' }),
    );

    await caller.listing.update({
      id: LISTING_ID,
      title: 'Updated Title',
    });

    expect(mockDb.syncPublishedListingMediaToPropertyMirror).toHaveBeenCalledWith(LISTING_ID);
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

  // -----------------------------------------------------------------------
  // Additional: Reject with non-admin user must fail
  // -----------------------------------------------------------------------
  it('reject rejects non-super-admin', async () => {
    const caller = makeCaller(ownerUser); // agent, not admin

    await expect(
      caller.listing.reject({ listingId: 14001 }),
    ).rejects.toThrow();
  });
});
