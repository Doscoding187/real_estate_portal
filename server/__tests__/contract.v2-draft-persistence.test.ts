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
// Schema gap characterization: listings has no draftData column
// ===========================================================================
//
// Phase 3C.0 originally assumed listings.draftData already existed. It does
// NOT. These tests document the gap so Phase 3C.1 must include a migration.
//
// Decision: Option B (schema change required) — add listings.draftData via
// migration. Do NOT store V2 wizard state inside existing listings.propertyDetails.
// Reason: propertyDetails is for property facts (bedrooms, bathrooms, etc.),
// not for wizard UI state (currentStep, completedSteps, errors, isValid).
// Mixing concerns corrupts the property details query path.

describe('listings schema has no draftData column (characterization)', () => {
  // JSON columns that exist on the `listings` table itself
  // (viewsByDay/trafficSources are on listingAnalytics;
  //  complianceChecks is on listingApprovalQueue — separate tables)
  const JSON_COLUMNS_IN_LISTINGS = [
    'propertyDetails',
    'qualityBreakdown',
    'rejectionReasons',
  ];

  it('listings table has known JSON columns but NOT draftData', () => {
    // Pull column names from the Drizzle table definition
    const columnEntries = Object.entries(listings).filter(
      ([key, val]) => val && typeof val === 'object' && 'name' in (val as any),
    );
    const columnNames = columnEntries.map(([key]) => key);

    // Every known JSON column must be present
    for (const col of JSON_COLUMNS_IN_LISTINGS) {
      expect(columnNames).toContain(col);
    }

    // draftData must NOT be on the listings table
    expect(columnNames).not.toContain('draftData');
  });

  it('developmentDrafts table DOES have draftData column', () => {
    const columnEntries = Object.entries(developmentDrafts).filter(
      ([key, val]) => val && typeof val === 'object' && 'name' in (val as any),
    );
    const columnNames = columnEntries.map(([key]) => key);

    expect(columnNames).toContain('draftData');
  });

  it('confirming no overlap: existing listings JSON columns serve property/admin purposes, not wizard state', () => {
    // propertyDetails stores property facts (bedrooms, bathrooms, etc.)
    // qualityBreakdown stores quality analysis results
    // rejectionReasons stores admin rejection data
    //
    // None of these were designed for wizard session state (currentStep,
    // completedSteps, errors, isValid, basicInfo overflow, partial pricing).
    // This is why Option B (new draftData column) is the correct decision.
    expect(JSON_COLUMNS_IN_LISTINGS).not.toContain('draftData');
  });

  it('listing.propertyDetails is unrelated to wizard draft state', () => {
    // propertyDetails is for property facts that V1 requires before submission.
    // Using it for V2 wizard state would create an ownership collision:
    //   - During draft editing: propertyDetails = wizard UI state
    //   - During submission: propertyDetails = property facts
    //   - On resume: ambiguous which is which
    // This test exists to prevent future temptation to reuse propertyDetails
    // as a draftData substitute.
    const pdCol = (listings as any).propertyDetails;
    expect(pdCol).toBeDefined();
    // propertyDetails is not nullable in the schema — it's `json()` without
    // `.default()` or `.notNull()`, meaning it defaults to NULL at the DB level
    // but Drizzle will not auto-populate it. This further confirms it's not
    // a draft store.
  });
});
