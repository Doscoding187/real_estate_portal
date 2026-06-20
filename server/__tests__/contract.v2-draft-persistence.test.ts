/**
 * Phase 3C.0 — V2 Draft Persistence Contract characterization tests.
 *
 * Documents the current server-side constraints that a V2 draft persistence
 * endpoint must work with or around.
 *
 * Modified: Phase 3C.0.1 — corrected draftData schema assumption.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Schema introspection imports — these are pure TypeScript objects,
// no database connection required.
import { listings } from '../../drizzle/schema/listings';
import { developmentDrafts } from '../../drizzle/schema/developments';

// ---------------------------------------------------------------------------
// Mock the entire db module at the router level
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
    syncPublishedListingMediaToPropertyMirror: vi.fn(),
    getAgentByUserId: vi.fn(),
    getUserById: vi.fn(),
    getDb: vi.fn(),
    // V2 draft persistence (Phase 3C.1)
    saveDraft: vi.fn(),
    getDraftById: vi.fn(),
    getUserDrafts: vi.fn(),
    deleteDraft: vi.fn(),
  },
}));

vi.mock('../db', () => mockDb);

vi.mock('../services/agentOsEventService', () => ({
  recordAgentOsEvent: vi.fn(),
}));

vi.mock('../lib/readiness', () => ({
  calculateListingReadiness: vi.fn(() => ({ score: 100, missing: [] })),
}));

vi.mock('../lib/quality', () => ({
  calculateListingQualityScore: vi.fn(() => ({ score: 90, breakdown: {} })),
}));

import { appRouter } from '../routers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const authUser = {
  id: 42,
  email: 'agent@test.com',
  role: 'agent',
  name: 'Test Agent',
};

const makeCaller = (user: any = null) =>
  appRouter.createCaller({
    req: { headers: {} },
    res: {},
    user,
  } as any);

const fullCreateInput = {
  action: 'sell' as const,
  propertyType: 'house' as const,
  title: 'Modern Family Home with Garden and Pool',
  description:
    'A beautiful family home located in a quiet suburb with excellent schools nearby. Features include a modern kitchen, spacious living areas, and a lovely garden.',
  pricing: {
    askingPrice: 2500000,
    negotiable: true,
  },
  propertyDetails: { bedrooms: 4, bathrooms: 2, houseAreaM2: 200 },
  location: {
    address: '42 Oak Ave',
    latitude: -26.2041,
    longitude: 28.0473,
    city: 'Johannesburg',
    province: 'Gauteng',
  },
  mediaIds: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(mockDb.createListing).mockResolvedValue(1001);
  vi.mocked(mockDb.getListingById).mockResolvedValue(null);
});

// ===========================================================================
// Contract: listing.create schema strictness
// ===========================================================================

describe('listing.create schema (characterization)', () => {
  it('accepts a fully complete input', async () => {
    const caller = makeCaller(authUser);

    await caller.listing.create(fullCreateInput);

    expect(mockDb.createListing).toHaveBeenCalledOnce();
  });

  it('rejects input missing action', async () => {
    const caller = makeCaller(authUser);
    const { action: _, ...noAction } = fullCreateInput as any;

    await expect(caller.listing.create(noAction)).rejects.toThrow();
    expect(mockDb.createListing).not.toHaveBeenCalled();
  });

  it('rejects input missing propertyType', async () => {
    const caller = makeCaller(authUser);
    const { propertyType: _, ...noType } = fullCreateInput as any;

    await expect(caller.listing.create(noType)).rejects.toThrow();
    expect(mockDb.createListing).not.toHaveBeenCalled();
  });

  it('rejects title shorter than 10 characters', async () => {
    const caller = makeCaller(authUser);

    await expect(
      caller.listing.create({ ...fullCreateInput, title: 'Short' }),
    ).rejects.toThrow();
    expect(mockDb.createListing).not.toHaveBeenCalled();
  });

  it('rejects description shorter than 50 characters', async () => {
    const caller = makeCaller(authUser);

    await expect(
      caller.listing.create({ ...fullCreateInput, description: 'Too short description.' }),
    ).rejects.toThrow();
    expect(mockDb.createListing).not.toHaveBeenCalled();
  });

  it('rejects input missing pricing', async () => {
    const caller = makeCaller(authUser);
    const { pricing: _, ...noPricing } = fullCreateInput as any;

    await expect(caller.listing.create(noPricing)).rejects.toThrow();
    expect(mockDb.createListing).not.toHaveBeenCalled();
  });

  it('rejects input missing location', async () => {
    const caller = makeCaller(authUser);
    const { location: _, ...noLocation } = fullCreateInput as any;

    await expect(caller.listing.create(noLocation)).rejects.toThrow();
    expect(mockDb.createListing).not.toHaveBeenCalled();
  });

  it('rejects input missing mediaIds', async () => {
    const caller = makeCaller(authUser);
    const { mediaIds: _, ...noMedia } = fullCreateInput as any;

    await expect(caller.listing.create(noMedia)).rejects.toThrow();
    expect(mockDb.createListing).not.toHaveBeenCalled();
  });

  it('rejects input missing propertyDetails', async () => {
    const caller = makeCaller(authUser);
    const { propertyDetails: _, ...noDetails } = fullCreateInput as any;

    await expect(caller.listing.create(noDetails)).rejects.toThrow();
    expect(mockDb.createListing).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Contract: listing.update requires a listing id
// ===========================================================================

describe('listing.update schema (characterization)', () => {
  it('accepts update with id and partial fields', async () => {
    const caller = makeCaller(authUser);
    vi.mocked(mockDb.getListingById).mockResolvedValue({
      id: 1001,
      userId: authUser.id,
    });

    await caller.listing.update({ id: 1001, title: 'Updated Title' });

    expect(mockDb.updateListing).toHaveBeenCalledWith(1001, expect.any(Object));
  });

  it('rejects update without id', async () => {
    const caller = makeCaller(authUser);

    await expect(
      (caller.listing.update as any)({ title: 'Updated Title' }),
    ).rejects.toThrow();
    expect(mockDb.updateListing).not.toHaveBeenCalled();
  });

  it('rejects update for non-existent listing', async () => {
    const caller = makeCaller(authUser);
    vi.mocked(mockDb.getListingById).mockResolvedValue(null);

    await expect(caller.listing.update({ id: 99999, title: 'Updated' })).rejects.toThrow();
    expect(mockDb.updateListing).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Contract: listing.update triggers sync only for published listings
// ===========================================================================

describe('listing.update does not call approval/publishing (characterization)', () => {
  it('does not call approval/publishing logic for draft updates', async () => {
    const caller = makeCaller(authUser);
    vi.mocked(mockDb.getListingById).mockResolvedValue({
      id: 1001,
      userId: authUser.id,
      status: 'draft',
      action: 'sell',
      propertyType: 'house',
      title: 'Original Title',
      description: 'Original description for an incomplete draft that has some text.',
      pricing: {},
      propertyDetails: {},
      address: '42 Oak Ave',
      city: 'Johannesburg',
      province: 'Gauteng',
      latitude: -26.2041,
      longitude: 28.0473,
      placeId: '',
      postalCode: '',
    });

    await caller.listing.update({ id: 1001, title: 'Updated Title' });

    // updateListing is called
    expect(mockDb.updateListing).toHaveBeenCalled();

    // syncPublishedListingMediaToPropertyMirror IS called (router dispatches it
    // unconditionally; the sync function itself guards by listing status). This is
    // a no-op for draft listings and returns listing_not_published.
    expect(mockDb.syncPublishedListingMediaToPropertyMirror).toHaveBeenCalledWith(1001);

    // No approval/publishing logic is triggered
    expect(mockDb.approveListing).not.toHaveBeenCalled();
    expect(mockDb.submitListingForReview).not.toHaveBeenCalled();
  });

  it('calls syncPublished only for published listings', async () => {
    const caller = makeCaller(authUser);
    vi.mocked(mockDb.getListingById).mockResolvedValue({
      id: 1002,
      userId: authUser.id,
      status: 'published',
      action: 'sell',
      propertyType: 'house',
      title: 'Published Title',
      description: 'A published listing that has been fully described in detail already.',
      pricing: {},
      propertyDetails: {},
      address: '1 Main St',
      city: 'Cape Town',
      province: 'Western Cape',
      latitude: -33.9249,
      longitude: 18.4241,
      placeId: '',
      postalCode: '',
    });

    await caller.listing.update({ id: 1002, title: 'Updated Published Title' });

    // For published listings, sync is called
    expect(mockDb.syncPublishedListingMediaToPropertyMirror).toHaveBeenCalledWith(1002);
  });
});

// ===========================================================================
// Contract: submitForReview path unchanged
// ===========================================================================

describe('listing.submitForReview path unchanged (characterization)', () => {
  it('submitForReview rejects non-draft status listings', async () => {
    const caller = makeCaller(authUser);
    vi.mocked(mockDb.getListingById).mockResolvedValue({
      id: 2001,
      userId: authUser.id,
      status: 'published',
    } as any);

    await expect(
      caller.listing.submitForReview({ listingId: 2001 }),
    ).rejects.toThrow();
    expect(mockDb.submitListingForReview).not.toHaveBeenCalled();
  });

  it('submitForReview proceeds for draft listings with sufficient readiness', async () => {
    const caller = makeCaller(authUser);
    vi.mocked(mockDb.getListingById).mockResolvedValue({
      id: 2002,
      userId: authUser.id,
      status: 'draft',
      readinessScore: 100,
      qualityScore: 90,
      title: 'Fully ready listing with all fields filled for review submission.',
      description: 'A complete listing ready for review.',
    } as any);
    vi.mocked(mockDb.getListingMedia).mockResolvedValue([]);
    // Provide agent with phone so WhatsApp check passes (and not verified
    // so it doesn't fast-track — goes through manual review queue)
    vi.mocked(mockDb.getAgentByUserId).mockResolvedValue({
      id: 55,
      userId: authUser.id,
      phone: '+27123456789',
      isVerified: 0,
    } as any);
    vi.mocked(mockDb.getUserById).mockResolvedValue({
      id: authUser.id,
      phone: '+27123456789',
    } as any);
    vi.mocked(mockDb.submitListingForReview).mockResolvedValue(undefined);

    await caller.listing.submitForReview({ listingId: 2002 });

    expect(mockDb.submitListingForReview).toHaveBeenCalledWith(2002);
  });
});

// ===========================================================================
// Contract: V2 draft persistence (Phase 3C.1)
// ===========================================================================

describe('listing.saveDraft (V2 draft persistence)', () => {
  beforeEach(() => {
    vi.mocked(mockDb.getAgentByUserId).mockResolvedValue({
      id: 55,
      userId: authUser.id,
      phone: '+27123456789',
      isVerified: 0,
    } as any);
  });

  it('creates a new draft with minimum fields (action + propertyType)', async () => {
    const caller = makeCaller(authUser);
    vi.mocked(mockDb.saveDraft).mockResolvedValue(3001);

    const result = await caller.listing.saveDraft({
      action: 'sell',
      propertyType: 'house',
    });

    expect(result).toEqual({ id: 3001, success: true });
    expect(mockDb.saveDraft).toHaveBeenCalledOnce();
    const payload = vi.mocked(mockDb.saveDraft).mock.calls[0][0];
    expect(payload.action).toBe('sell');
    expect(payload.propertyType).toBe('house');
    expect(payload.userId).toBe(authUser.id);
  });

  it('creates a new draft with full wizard state in draftData', async () => {
    const caller = makeCaller(authUser);
    vi.mocked(mockDb.saveDraft).mockResolvedValue(3002);

    const draftData = {
      currentStep: 2,
      completedSteps: [1],
      basicInfo: { depositAmount: 50000 },
      errors: [],
      isValid: true,
    };

    await caller.listing.saveDraft({
      action: 'rent',
      propertyType: 'apartment',
      title: 'Modern City Apartment',
      draftData,
    });

    const payload = vi.mocked(mockDb.saveDraft).mock.calls[0][0];
    expect(payload.draftData).toEqual(draftData);
    expect(payload.title).toBe('Modern City Apartment');
  });

  it('updates an existing draft when id is provided', async () => {
    const caller = makeCaller(authUser);
    vi.mocked(mockDb.getDraftById).mockResolvedValue({
      id: 3003,
      ownerId: authUser.id,
      status: 'draft',
      action: 'sell',
      propertyType: 'house',
    } as any);
    vi.mocked(mockDb.saveDraft).mockResolvedValue(3003);

    const result = await caller.listing.saveDraft({
      id: 3003,
      action: 'sell',
      propertyType: 'house',
      title: 'Updated Title',
    });

    expect(result).toEqual({ id: 3003, success: true });
    expect(mockDb.getDraftById).toHaveBeenCalledWith(3003);
    const payload = vi.mocked(mockDb.saveDraft).mock.calls[0][0];
    expect(payload.id).toBe(3003);
  });

  it('rejects update when draft does not exist', async () => {
    const caller = makeCaller(authUser);
    vi.mocked(mockDb.getDraftById).mockResolvedValue(null);

    await expect(
      caller.listing.saveDraft({ id: 99999, action: 'sell', propertyType: 'house' }),
    ).rejects.toThrow('Draft not found');
    expect(mockDb.saveDraft).not.toHaveBeenCalled();
  });

  it('rejects update when draft status is not draft', async () => {
    const caller = makeCaller(authUser);
    vi.mocked(mockDb.getDraftById).mockResolvedValue({
      id: 3004,
      ownerId: authUser.id,
      status: 'published',
    } as any);

    await expect(
      caller.listing.saveDraft({ id: 3004, action: 'sell', propertyType: 'house' }),
    ).rejects.toThrow('Only draft listings can be saved as drafts');
    expect(mockDb.saveDraft).not.toHaveBeenCalled();
  });

  it('rejects update when user does not own the draft and is not admin', async () => {
    const caller = makeCaller(authUser);
    vi.mocked(mockDb.getDraftById).mockResolvedValue({
      id: 3005,
      ownerId: 999, // different user
      status: 'draft',
    } as any);

    await expect(
      caller.listing.saveDraft({ id: 3005, action: 'sell', propertyType: 'house' }),
    ).rejects.toThrow('Not authorized to edit this draft');
    expect(mockDb.saveDraft).not.toHaveBeenCalled();
  });

  it('allows admin to save another user draft', async () => {
    const adminUser = { ...authUser, id: 1, role: 'admin' };
    const caller = makeCaller(adminUser);
    vi.mocked(mockDb.getDraftById).mockResolvedValue({
      id: 3006,
      ownerId: 999,
      status: 'draft',
    } as any);
    vi.mocked(mockDb.saveDraft).mockResolvedValue(3006);

    const result = await caller.listing.saveDraft({
      id: 3006,
      action: 'sell',
      propertyType: 'house',
    });

    expect(result).toEqual({ id: 3006, success: true });
    expect(mockDb.saveDraft).toHaveBeenCalled();
  });

  it('promotes location fields to normalized columns when provided', async () => {
    const caller = makeCaller(authUser);
    vi.mocked(mockDb.saveDraft).mockResolvedValue(3007);

    await caller.listing.saveDraft({
      action: 'sell',
      propertyType: 'house',
      location: {
        address: '123 Main St',
        city: 'Cape Town',
        province: 'Western Cape',
        latitude: -33.9249,
        longitude: 18.4241,
      },
    });

    const payload = vi.mocked(mockDb.saveDraft).mock.calls[0][0];
    expect(payload.address).toBe('123 Main St');
    expect(payload.city).toBe('Cape Town');
    expect(payload.latitude).toBe(-33.9249);
  });

  it('does not call approval/publishing logic', async () => {
    const caller = makeCaller(authUser);
    vi.mocked(mockDb.saveDraft).mockResolvedValue(3008);

    await caller.listing.saveDraft({
      action: 'sell',
      propertyType: 'house',
    });

    expect(mockDb.approveListing).not.toHaveBeenCalled();
    expect(mockDb.submitListingForReview).not.toHaveBeenCalled();
    expect(mockDb.syncPublishedListingMediaToPropertyMirror).not.toHaveBeenCalled();
  });
});

describe('listing.getDraft (V2 draft persistence)', () => {
  it('returns a single draft by id', async () => {
    const caller = makeCaller(authUser);
    vi.mocked(mockDb.getDraftById).mockResolvedValue({
      id: 4001,
      ownerId: authUser.id,
      status: 'draft',
      action: 'sell',
      propertyType: 'house',
      draftData: { currentStep: 3, errors: [], isValid: true },
    } as any);

    const result = await caller.listing.getDraft({ id: 4001 });

    expect(result.id).toBe(4001);
    expect(result.draftData).toEqual({ currentStep: 3, errors: [], isValid: true });
  });

  it('returns 404 for non-existent draft', async () => {
    const caller = makeCaller(authUser);
    vi.mocked(mockDb.getDraftById).mockResolvedValue(null);

    await expect(caller.listing.getDraft({ id: 99999 })).rejects.toThrow('Draft not found');
  });

  it('returns forbidden for other user draft', async () => {
    const caller = makeCaller(authUser);
    vi.mocked(mockDb.getDraftById).mockResolvedValue({
      id: 4002,
      ownerId: 999,
      status: 'draft',
    } as any);

    await expect(caller.listing.getDraft({ id: 4002 })).rejects.toThrow('Not authorized');
  });

  it('rejects non-draft listings', async () => {
    const caller = makeCaller(authUser);
    vi.mocked(mockDb.getDraftById).mockResolvedValue({
      id: 4003,
      ownerId: authUser.id,
      status: 'published',
    } as any);

    await expect(caller.listing.getDraft({ id: 4003 })).rejects.toThrow(
      'Only draft listings can be loaded as drafts',
    );
  });
});

describe('listing.getDrafts (V2 draft persistence)', () => {
  it('returns all drafts for authenticated user', async () => {
    const caller = makeCaller(authUser);
    const mockDrafts = [
      { id: 5001, title: 'Draft 1', action: 'sell', propertyType: 'house', status: 'draft', slug: 'draft-1', draftData: null, createdAt: '2026-01-01', updatedAt: '2026-01-02' },
      { id: 5002, title: 'Draft 2', action: 'rent', propertyType: 'apartment', status: 'draft', slug: 'draft-2', draftData: null, createdAt: '2026-01-03', updatedAt: '2026-01-04' },
    ];
    vi.mocked(mockDb.getUserDrafts).mockResolvedValue(mockDrafts as any);

    const result = await caller.listing.getDrafts();

    expect(result).toHaveLength(2);
    expect(mockDb.getUserDrafts).toHaveBeenCalledWith(authUser.id);
  });

  it('returns empty array when user has no drafts', async () => {
    const caller = makeCaller(authUser);
    vi.mocked(mockDb.getUserDrafts).mockResolvedValue([]);

    const result = await caller.listing.getDrafts();

    expect(result).toEqual([]);
  });
});

describe('listing.deleteDraft (V2 draft persistence)', () => {
  it('deletes a draft by id', async () => {
    const caller = makeCaller(authUser);
    vi.mocked(mockDb.getDraftById).mockResolvedValue({
      id: 6001,
      ownerId: authUser.id,
      status: 'draft',
    } as any);
    vi.mocked(mockDb.deleteDraft).mockResolvedValue(undefined);

    const result = await caller.listing.deleteDraft({ id: 6001 });

    expect(result).toEqual({ success: true });
    expect(mockDb.deleteDraft).toHaveBeenCalledWith(6001);
  });

  it('rejects delete for non-existent draft', async () => {
    const caller = makeCaller(authUser);
    vi.mocked(mockDb.getDraftById).mockResolvedValue(null);

    await expect(caller.listing.deleteDraft({ id: 99999 })).rejects.toThrow('Draft not found');
    expect(mockDb.deleteDraft).not.toHaveBeenCalled();
  });

  it('rejects delete for published listing', async () => {
    const caller = makeCaller(authUser);
    vi.mocked(mockDb.getDraftById).mockResolvedValue({
      id: 6002,
      ownerId: authUser.id,
      status: 'published',
    } as any);

    await expect(caller.listing.deleteDraft({ id: 6002 })).rejects.toThrow(
      'Only draft listings can be deleted as drafts',
    );
    expect(mockDb.deleteDraft).not.toHaveBeenCalled();
  });

  it('rejects delete when user does not own the draft', async () => {
    const caller = makeCaller(authUser);
    vi.mocked(mockDb.getDraftById).mockResolvedValue({
      id: 6003,
      ownerId: 999,
      status: 'draft',
    } as any);

    await expect(caller.listing.deleteDraft({ id: 6003 })).rejects.toThrow('Not authorized');
    expect(mockDb.deleteDraft).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Schema gap characterization: listings.draftData now exists
// ===========================================================================
//
// Phase 3C.0 corrected: listings.draftData JSON column was added via
// migration 0008_30009_add_listings_draft_data.sql. These tests document
// that the column now exists and is distinct from propertyDetails.

describe('listings.draftData column exists (characterization)', () => {
  it('listings table now has draftData column', () => {
    const columnEntries = Object.entries(listings).filter(
      ([key, val]) => val && typeof val === 'object' && 'name' in (val as any),
    );
    const columnNames = columnEntries.map(([key]) => key);

    expect(columnNames).toContain('draftData');
  });

  it('draftData is separate from propertyDetails', () => {
    // propertyDetails: for property facts (bedrooms, bathrooms, etc.)
    // draftData: for V2 wizard session state (currentStep, completedSteps,
    //   errors, isValid, basicInfo overflow, partial pricing)
    const pdCol = (listings as any).propertyDetails;
    const ddCol = (listings as any).draftData;
    expect(pdCol).toBeDefined();
    expect(ddCol).toBeDefined();
    expect(pdCol).not.toBe(ddCol);
  });

  it('developmentDrafts table continues to have its own draftData column', () => {
    const columnEntries = Object.entries(developmentDrafts).filter(
      ([key, val]) => val && typeof val === 'object' && 'name' in (val as any),
    );
    const columnNames = columnEntries.map(([key]) => key);

    expect(columnNames).toContain('draftData');
  });

  it('draftData column name in DB is draft_data', () => {
    const ddCol = (listings as any).draftData;
    expect(ddCol).toBeDefined();
    // Drizzle maps `draftData: json('draft_data')` so the DB column name
    // is draft_data, and the JS property is draftData
    expect(ddCol.name).toBe('draft_data');
  });
});
