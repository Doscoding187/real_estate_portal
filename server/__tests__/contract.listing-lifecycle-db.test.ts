/**
 * Phase 3B — Listing-to-Property Identity Hardening (lower-level db tests)
 *
 * Directly tests approveListing, syncPublishedListingMediaToPropertyMirror,
 * archiveListing, and deleteListing by mocking db-connection with a tracked
 * fake Drizzle instance. Verifies the actual SQL-level behaviour, not just
 * router dispatch.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Tracked fake Drizzle builder
// Records every operation so tests can assert the contract.
// ---------------------------------------------------------------------------

interface DbCall {
  type: 'insert' | 'update' | 'delete' | 'select';
  table?: string;
  values?: Record<string, unknown>;
  set?: Record<string, unknown>;
  whereCols?: string[]; // column names extracted from the WHERE predicate
}

/** Extract referenced column names from a Drizzle SQL condition object */
const extractColNames = (conds: any): string[] => {
  const names = new Set<string>();
  // Drizzle stores conditions in queryChunks; we walk those only
  const chunkWalk = (chunks: any[]) => {
    for (const chunk of chunks) {
      if (!chunk || typeof chunk !== 'object') continue;
      if (chunk.name && typeof chunk.name === 'string') names.add(chunk.name);
      if (Array.isArray(chunk.queryChunks)) chunkWalk(chunk.queryChunks);
    }
  };
  if (Array.isArray(conds?.queryChunks)) chunkWalk(conds.queryChunks);
  return [...names];
};

// Drizzle stores the table name via private symbols
const resolveTableName = (table: any): string => {
  if (!table) return 'unknown';
  for (const sym of Object.getOwnPropertySymbols(table)) {
    const val = table[sym];
    if (typeof val === 'string') return val;
  }
  if (typeof table.tableName === 'string') return table.tableName;
  if (typeof table.name === 'string') return table.name;
  return 'unknown';
};

class FakeDrizzle {
  calls: DbCall[] = [];
  transactionCount = 0;
  activeTransactionCount = 0;
  failureHook: ((call: DbCall) => Error | undefined) | undefined;
  private selectResults: Array<Record<string, unknown>[]> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.calls = [];
    this.transactionCount = 0;
    this.activeTransactionCount = 0;
    this.failureHook = undefined;
    this.selectResults = [];
  }

  setNextSelectResult(rows: Record<string, unknown>[]) {
    this.selectResults.push(rows);
    return this;
  }

  private record(call: DbCall) {
    this.calls.push(call);
    const failure = this.failureHook?.(call);
    if (failure) throw failure;
  }

  private resolveSelect(tableName: string) {
    this.record({ type: 'select', table: tableName });
    // Generic Listing lifecycle fixtures intentionally own no canonical Commercial
    // association. Preserve their queued Listing/projection expectations while
    // representing the authoritative absence of Commercial capability ownership.
    if (tableName === 'commercial_availability_listing_links') return [];
    return this.selectResults.shift() || [];
  }

  /** Drizzle: db.select({...fields}).from(table).where(...).orderBy(...).limit(...) */
  select(_fields?: Record<string, unknown>) {
    let tableName = 'unknown';
    let whereCols: string[] = [];
    const chain: any = {
      from: (table: any) => {
        tableName = resolveTableName(table);
        return chain;
      },
      where: (conds: any) => {
        whereCols = extractColNames(conds);
        return chain;
      },
      limit: (n: number) => {
        this.record({ type: 'select', table: tableName, whereCols });
        if (tableName === 'commercial_availability_listing_links') return Promise.resolve([]);
        return Promise.resolve(this.selectResults.shift() || []);
      },
      orderBy: (_order: any) => {
        // .orderBy() returns the query builder itself (chainable)
        return chain;
      },
      then: (resolve: (v: any) => void) => {
        // If awaited directly (no .limit() called), resolve immediately
        this.record({ type: 'select', table: tableName, whereCols });
        if (tableName === 'commercial_availability_listing_links') return resolve([]);
        resolve(this.selectResults.shift() || []);
      },
    };
    return chain;
  }

  insert(table: any) {
    const tableName = resolveTableName(table);
    return {
      values: (vals: Record<string, unknown>) => {
        this.record({ type: 'insert', table: tableName, values: vals });
        return Promise.resolve([{ insertId: 99999 }]);
      },
    };
  }

  update(table: any) {
    const tableName = resolveTableName(table);
    return {
      set: (vals: Record<string, unknown>) => ({
        where: (conds: any) => {
          this.record({
            type: 'update',
            table: tableName,
            set: vals,
            whereCols: extractColNames(conds),
          });
          return Promise.resolve([{ affectedRows: 1 }]);
        },
      }),
    };
  }

  delete_(table: any) {
    const tableName = resolveTableName(table);
    return {
      where: (conds: any) => {
        this.record({ type: 'delete', table: tableName, whereCols: extractColNames(conds) });
        return Promise.resolve([{ affectedRows: 1 }]);
      },
    };
  }

  delete = this.delete_;

  transaction = async <T>(callback: (tx: this) => Promise<T>) => {
    this.transactionCount += 1;
    this.activeTransactionCount += 1;
    const callsBefore = this.calls.length;
    const selectsBefore = [...this.selectResults];
    try {
      return await callback(this);
    } catch (error) {
      // Model the observable contract of a real transaction: all operations
      // issued through this executor disappear when the callback rejects.
      this.calls.splice(callsBefore);
      this.selectResults = selectsBefore;
      throw error;
    } finally {
      this.activeTransactionCount -= 1;
    }
  };
}

const fakeDb = new FakeDrizzle();

const { mockAssertListingPublicationEntitled, mockInvalidatePublicSearchCache } = vi.hoisted(() => ({
  mockAssertListingPublicationEntitled: vi.fn(),
  mockInvalidatePublicSearchCache: vi.fn(),
}));

// Mock db-connection BEFORE importing the db functions
vi.mock('../db-connection', () => ({
  getDb: vi.fn(() => fakeDb),
  _db: null,
}));

vi.mock('../services/listingPublicationEntitlementService', () => ({
  assertListingPublicationEntitled: mockAssertListingPublicationEntitled,
  isSameListingCommercialOwner: () => true,
}));

vi.mock('../services/propertySearchService', () => ({
  propertySearchService: {
    invalidateCache: mockInvalidatePublicSearchCache,
  },
}));

// Now import the real functions (no mock of ../db — internal calls are real)
import {
  approveListing,
  archiveListing,
  createListing,
  deleteListing,
  rejectListing,
  replaceListingMedia,
  synchronizeApprovedRevisionMedia,
  syncPublishedListingMediaToPropertyMirror,
  updateListingAgentAssignment,
} from '../db';
import { getDb } from '../db-connection';
import { assertListingPublicationEntitled } from '../services/listingPublicationEntitlementService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a listing row as returned by the select query inside getListingById().
 * The exact Drizzle shape depends on the schema, but we provide the columns
 * that approveListing/other functions destructure.
 */
const listingRow = (overrides: Record<string, any> = {}) => ({
  id: 1001,
  userId: 42,
  ownerId: 42,
  agentId: 55,
  title: 'Modern Family Home',
  description: 'A beautiful family home.',
  action: 'sell',
  propertyType: 'house',
  status: 'pending_review',
  approvalStatus: 'pending',
  askingPrice: '2500000.00',
  monthlyRent: '25000.00',
  deposit: { status: 'zero' },
  startingBid: '1500000.00',
  address: '42 Oak Ave',
  city: 'Johannesburg',
  province: 'Gauteng',
  placeId: 'ChIJ123',
  latitude: -26.2041,
  longitude: 28.0473,
  postalCode: '2000',
  pricing: JSON.stringify({ askingPrice: 2500000 }),
  propertyDetails: JSON.stringify({ bedrooms: 4, bathrooms: 2, houseAreaM2: 200 }),
  featured: 0,
  negotiable: 0,
  publishedAt: null,
  createdAt: '2026-01-01 00:00:00',
  updatedAt: '2026-01-01 00:00:00',
  ...overrides,
});

const listingMediaRow = (overrides: Record<string, any> = {}) => ({
  id: 701,
  listingId: 1001,
  mediaType: 'image',
  originalUrl: 'https://example.com/photo.jpg',
  processedUrl: 'https://example.com/photo_processed.jpg',
  isPrimary: 0,
  displayOrder: 1,
  createdAt: '2026-01-01 00:00:00',
  ...overrides,
});

const configureRevisionApproval = (
  revisionId = 5602,
  originalId = 5601,
  revisionOverrides: Record<string, any> = {},
) => {
  fakeDb.setNextSelectResult([
    listingRow({
      id: revisionId,
      status: 'pending_review',
      approvalStatus: 'pending',
      revisionOfListingId: originalId,
      propertyDetails: { bedrooms: 4, bathrooms: 2 },
      ...revisionOverrides,
    }),
  ]);
  fakeDb.setNextSelectResult([
    listingRow({
      id: originalId,
      status: 'published',
      approvalStatus: 'approved',
      revisionOfListingId: null,
    }),
  ]);
  fakeDb.setNextSelectResult([
    listingMediaRow({
      id: 801,
      listingId: revisionId,
      mediaType: 'image',
      originalUrl: 'revision-new.jpg',
      processedUrl: 'revision-new-processed.jpg',
      isPrimary: 1,
      displayOrder: 0,
    }),
    listingMediaRow({
      id: 802,
      listingId: revisionId,
      mediaType: 'video',
      originalUrl: 'revision-video.webm',
      isPrimary: 0,
      displayOrder: 1,
    }),
  ]);
  // Complete public projection upsert for the original canonical source.
  fakeDb.setNextSelectResult([{ id: 777 }]);
  // Public media synchronization resolves the freshly promoted source again.
  fakeDb.setNextSelectResult([
    listingRow({
      id: originalId,
      status: 'published',
      approvalStatus: 'approved',
      revisionOfListingId: null,
    }),
  ]);
  fakeDb.setNextSelectResult([{ id: 777 }]);
  fakeDb.setNextSelectResult([
    listingMediaRow({
      id: 701,
      listingId: originalId,
      originalUrl: 'approved-old.jpg',
      processedUrl: 'approved-old-processed.jpg',
      isPrimary: 1,
      displayOrder: 0,
    }),
  ]);
};

/** How many select results to configure for getListingById() to succeed */
const SELECTS_GET_LISTING_BY_ID = 1; // db.select().from(listings).where(id).limit(1)

beforeEach(() => {
  fakeDb.reset();
  vi.clearAllMocks();
  vi.mocked(mockAssertListingPublicationEntitled).mockResolvedValue({
    kind: 'agency',
    agencyId: 1,
    listingId: 1001,
    responsibleAgentId: 55,
  } as any);
  vi.mocked(mockInvalidatePublicSearchCache).mockResolvedValue(undefined);
});

// ===========================================================================
// createListing — seller-prospect custody contract
// ===========================================================================

describe('createListing (lower-level)', () => {
  it('persists the validated seller-prospect assignee for an agency-manager conversion', async () => {
    fakeDb.setNextSelectResult([]); // The acting agency manager has no agent profile.
    fakeDb.setNextSelectResult([{ agencyId: 77, role: 'agency_admin' }]);
    fakeDb.setNextSelectResult([{ id: 55 }]); // Assigned, approved agency agent.
    fakeDb.setNextSelectResult([
      {
        id: 901,
        stage: 'qualified',
        convertedListingId: null,
        assignedAgentId: 55,
      },
    ]);

    await createListing({
      userId: 100,
      action: 'sell',
      propertyType: 'house',
      title: 'Seller conversion home',
      description: 'An agency-managed seller conversion.',
      pricing: { askingPrice: 2_500_000 },
      propertyDetails: {},
      city: 'Johannesburg',
      province: 'Gauteng',
      slug: 'seller-conversion-ts-fixed',
      media: [],
      sellerProspectConversion: {
        sellerProspectId: 901,
        agencyId: 77,
        assignedAgentId: 55,
        actorUserId: 100,
      },
    });

    const listingInsert = fakeDb.calls.find(
      call => call.type === 'insert' && call.table === 'listings',
    );
    expect(listingInsert?.values).toMatchObject({
      ownerId: 100,
      agencyId: 77,
      agentId: 55,
    });
    const conversionActivity = fakeDb.calls.find(
      call => call.type === 'insert' && call.table === 'seller_prospect_activities',
    );
    expect(conversionActivity?.values?.metadata).toEqual({
      listingId: 99999,
      assignedAgentId: 55,
    });
  });
});

// ===========================================================================
// approveListing — lower-level contract tests
// ===========================================================================

describe('approveListing (lower-level)', () => {
  it('inserts a property projection for a pending_review listing', async () => {
    // getListingById select
    fakeDb.setNextSelectResult([listingRow({ id: 5001 })]);
    // idempotency check select (no existing property)
    fakeDb.setNextSelectResult([]);

    await approveListing(5001, 1);

    const inserts = fakeDb.calls.filter(c => c.type === 'insert' && c.table === 'properties');
    expect(inserts).toHaveLength(1);
    expect(inserts[0].values).toMatchObject({
      sourceListingId: 5001,
      title: 'Modern Family Home',
    });
  });

  it('stamps sourceListingId on the property projection', async () => {
    fakeDb.setNextSelectResult([listingRow({ id: 5002 })]);
    fakeDb.setNextSelectResult([]);

    await approveListing(5002, 1);

    const inserts = fakeDb.calls.filter(c => c.type === 'insert' && c.table === 'properties');
    expect(inserts[0].values.sourceListingId).toBe(5002);
  });

  it('upserts — updates existing property on second call (idempotency)', async () => {
    // First approval — no existing property
    fakeDb.setNextSelectResult([listingRow({ id: 5003 })]);
    fakeDb.setNextSelectResult([]);
    await approveListing(5003, 1);

    const inserts = fakeDb.calls.filter(c => c.type === 'insert' && c.table === 'properties');
    expect(inserts).toHaveLength(1);

    // Second approval — existing property found → UPDATE
    fakeDb.reset();
    fakeDb.setNextSelectResult([listingRow({ id: 5003 })]);
    fakeDb.setNextSelectResult([{ id: 999 }]); // found existing property

    await approveListing(5003, 1);

    const secondInserts = fakeDb.calls.filter(c => c.type === 'insert' && c.table === 'properties');
    const propUpdates = fakeDb.calls.filter(c => c.type === 'update' && c.table === 'properties');

    expect(secondInserts).toHaveLength(0);
    expect(propUpdates.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects approval for already-published listing (state guard)', async () => {
    fakeDb.setNextSelectResult([
      listingRow({ id: 5004, status: 'published', approvalStatus: 'approved' }),
    ]);

    await expect(approveListing(5004, 1)).rejects.toThrow('already published');

    // No DB writes (other than the initial getListingById select)
    const writes = fakeDb.calls.filter(c => c.type !== 'select');
    expect(writes).toHaveLength(0);
  });

  it('replaces propertyImages on approval', async () => {
    fakeDb.setNextSelectResult([listingRow({ id: 5005 })]);
    fakeDb.setNextSelectResult([]); // no existing property → insert
    // getListingMedia select + subsequent queries...
    // We need enough select results for the media items query
    fakeDb.setNextSelectResult([
      listingMediaRow({ id: 701, isPrimary: 1 }),
      listingMediaRow({ id: 702, isPrimary: 0 }),
    ]);

    await approveListing(5005, 1);

    const imgDeletes = fakeDb.calls.filter(
      c => c.type === 'delete' && c.table === 'propertyImages',
    );
    expect(imgDeletes.length).toBeGreaterThanOrEqual(1);

    const imgInserts = fakeDb.calls.filter(
      c => c.type === 'insert' && c.table === 'propertyImages',
    );
    expect(imgInserts).toHaveLength(2);
  });

  it('approves a revision through one transaction and synchronizes the same property mirror', async () => {
    configureRevisionApproval();

    await approveListing(5602, 990005);

    expect(fakeDb.transactionCount).toBe(1);
    expect(fakeDb.activeTransactionCount).toBe(0);
    expect(fakeDb.calls.filter(c => c.type === 'insert' && c.table === 'listing_media')).toHaveLength(
      2,
    );
    expect(fakeDb.calls.filter(c => c.type === 'insert' && c.table === 'propertyImages')).toHaveLength(
      1,
    );
    expect(
      fakeDb.calls.some(
        call =>
          call.type === 'update' &&
          call.table === 'listing_approval_queue' &&
          call.set?.status === 'approved',
      ),
    ).toBe(true);
    expect(
      fakeDb.calls.some(
        call =>
          call.type === 'update' &&
          call.table === 'listings' &&
          call.set?.status === 'archived',
      ),
    ).toBe(true);
    expect(mockInvalidatePublicSearchCache).toHaveBeenCalledOnce();
  });

  it('promotes a revised intent, taxonomy, pricing, facts, location and media as one canonical snapshot', async () => {
    configureRevisionApproval(5602, 5601, {
      action: 'rent',
      propertyType: 'townhouse',
      title: 'Revised coastal townhouse',
      description: 'The complete approved revision.',
      // These stale Sale columns came from the cloned live row and must be
      // cleared when Rent becomes the canonical intent.
      askingPrice: '2500000.00',
      transferCostEstimate: '125000.00',
      monthlyRent: '18500.00',
      deposit: '37000.00',
      leaseTerms: '12 months',
      availableFrom: '2026-09-01 00:00:00',
      utilitiesIncluded: 1,
      propertyDetails: {
        bedrooms: 3,
        bathrooms: 2,
        unitSizeM2: 135,
        amenities: ['Balcony'],
        // A cloned embedded contract must not override current authored
        // pricing at the publication boundary.
        pricingContract: {
          version: 1,
          intent: 'rent',
          monthlyRent: 11000,
          deposit: { status: 'known', amount: 11000 },
        },
      },
      address: '8 Ocean View',
      privateAddress: { streetNumber: '8', streetName: 'Ocean View' },
      latitude: '-33.9181000',
      longitude: '18.3852000',
      city: 'Cape Town',
      suburb: 'Sea Point',
      province: 'Western Cape',
      postalCode: '8005',
      provinceId: 1,
      cityId: 2,
      suburbId: 3,
      coordinateSource: 'manual_confirmed',
      locationConfirmationState: 'confirmed',
      publicLocationPrecision: 'exact',
    });

    await approveListing(5602, 990005);

    const promotedSource = fakeDb.calls.find(
      call =>
        call.type === 'update' &&
        call.table === 'listings' &&
        call.set?.status === 'published',
    );
    expect(promotedSource?.set).toMatchObject({
      action: 'rent',
      propertyType: 'townhouse',
      title: 'Revised coastal townhouse',
      askingPrice: null,
      transferCostEstimate: null,
      monthlyRent: '18500.00',
      deposit: '37000.00',
      leaseTerms: '12 months',
      city: 'Cape Town',
      suburb: 'Sea Point',
      provinceId: 1,
      cityId: 2,
      suburbId: 3,
      mainMediaId: 99999,
      mainMediaType: 'image',
    });
    expect((promotedSource?.set?.propertyDetails as any)?.pricingContract).toMatchObject({
      intent: 'rent',
      monthlyRent: 18500,
    });
    expect((promotedSource?.set?.propertyDetails as any)?.corePropertyInformation).toMatchObject({
      bedrooms: { status: 'known', value: 3 },
      bathrooms: { status: 'known', value: 2 },
      internalArea: { status: 'known', valueM2: 135, unit: 'm2' },
    });

    const publicProjection = fakeDb.calls.find(
      call =>
        call.type === 'update' &&
        call.table === 'properties' &&
        call.set?.sourceListingId === 5601,
    );
    expect(publicProjection?.set).toMatchObject({
      sourceListingId: 5601,
      listingType: 'rent',
      transactionType: 'rent',
      propertyType: 'townhouse',
      price: 18500,
      bedrooms: 3,
      bathrooms: 2,
      area: 135,
      internalAreaM2: 135,
      city: 'Cape Town',
      province: 'Western Cape',
      provinceId: 1,
      cityId: 2,
      suburbId: 3,
      publicAddress: '8 Ocean View, Sea Point, Cape Town, Western Cape',
      publicLocationPrecision: 'exact',
    });
    expect(JSON.parse(String(publicProjection?.set?.propertySettings))).toMatchObject({
      pricingContract: { intent: 'rent', monthlyRent: 18500 },
      corePropertyInformation: {
        bedrooms: { status: 'known', value: 3 },
        internalArea: { status: 'known', valueM2: 135, unit: 'm2' },
      },
    });
  });

  it.each([
    ['before revision media promotion', (call: DbCall) => call.type === 'delete' && call.table === 'listing_media'],
    [
      'after revision media promotion and before public mirror lookup',
      (call: DbCall) => call.type === 'select' && call.table === 'properties',
    ],
    [
      'during public propertyImages synchronization',
      (call: DbCall) => call.type === 'delete' && call.table === 'propertyImages',
    ],
    [
      'after public projection and before queue transition',
      (call: DbCall) => call.type === 'update' && call.table === 'listing_approval_queue',
    ],
  ])('rolls back the complete revision approval when failure occurs %s', async (_stage, failure) => {
    configureRevisionApproval();
    fakeDb.failureHook = call =>
      failure(call) ? new Error(`fault injected: ${_stage}`) : undefined;

    await expect(approveListing(5602, 990005)).rejects.toThrow(`fault injected: ${_stage}`);

    expect(fakeDb.transactionCount).toBe(1);
    expect(fakeDb.activeTransactionCount).toBe(0);
    expect(fakeDb.calls.filter(call => call.type !== 'select')).toHaveLength(0);
  });

  it('does not open a competing connection or nested transaction for approval media synchronization', async () => {
    configureRevisionApproval();

    await approveListing(5602, 990005);

    // The outer approval transaction is the only transaction. If either
    // synchronization helper called getDb()/transaction independently, this
    // count would be greater than one and the real agency lock could deadlock.
    expect(fakeDb.transactionCount).toBe(1);
    expect(fakeDb.activeTransactionCount).toBe(0);
    expect(vi.mocked(getDb)).toHaveBeenCalledTimes(1);
  });

  it.each(['sell', 'rent', 'auction'] as const)(
    'handles action "%s" with correct listingType mapping',
    async action => {
      const pricing =
        action === 'sell'
          ? JSON.stringify({ askingPrice: 3000000 })
          : action === 'rent'
            ? JSON.stringify({ monthlyRent: 25000 })
            : JSON.stringify({ startingBid: 1500000 });

      fakeDb.setNextSelectResult([
        listingRow({
          id: 5100,
          action,
          pricing,
          ...(action === 'rent'
            ? { monthlyRent: '25000.00', deposit: 0 }
            : {}),
        }),
      ]);
      fakeDb.setNextSelectResult([]); // no existing property

      await approveListing(5100, 1);

      const inserts = fakeDb.calls.filter(c => c.type === 'insert' && c.table === 'properties');
      const expectedType = action === 'sell' ? 'sale' : action === 'rent' ? 'rent' : 'auction';
      expect(inserts[0].values.listingType).toBe(expectedType);
    },
  );
});

// ===========================================================================
// replaceListingMedia — lower-level canonical manifest tests
// ===========================================================================

describe('replaceListingMedia (lower-level)', () => {
  it('retains an image primary, removes omitted media, and preserves a new video type', async () => {
    fakeDb.setNextSelectResult([{ id: 701 }, { id: 702 }]);

    await replaceListingMedia(
      5501,
      [
        {
          id: 'existing:701',
          mediaType: 'image',
        },
        {
          id: 'uploads/listings/5501/walkthrough.mp4',
          mediaType: 'video',
          fileName: 'walkthrough.mp4',
          processingStatus: 'completed',
        },
      ],
      'existing:701',
    );

    const deletes = fakeDb.calls.filter(c => c.type === 'delete' && c.table === 'listing_media');
    const inserts = fakeDb.calls.filter(c => c.type === 'insert' && c.table === 'listing_media');
    const updates = fakeDb.calls.filter(c => c.type === 'update' && c.table === 'listing_media');

    expect(deletes).toHaveLength(1);
    expect(inserts).toHaveLength(1);
    expect(inserts[0].values).toMatchObject({
      listingId: 5501,
      originalUrl: 'uploads/listings/5501/walkthrough.mp4',
      mediaType: 'video',
      displayOrder: 1,
      isPrimary: 0,
    });
    expect(updates).toHaveLength(1);
    expect(updates[0].set).toMatchObject({ displayOrder: 0, isPrimary: 1 });
    expect(fakeDb.calls.indexOf(deletes[0])).toBeLessThan(fakeDb.calls.indexOf(inserts[0]));
  });

  it('rejects a video as the requested primary media', async () => {
    fakeDb.setNextSelectResult([]);

    await expect(
      replaceListingMedia(
        5501,
        [
          {
            id: 'uploads/listings/5501/walkthrough.mp4',
            mediaType: 'video',
            fileName: 'walkthrough.mp4',
            processingStatus: 'completed',
          },
        ],
        'uploads/listings/5501/walkthrough.mp4',
      ),
    ).rejects.toThrow('Listing primary media must be a completed image');

    const writes = fakeDb.calls.filter(c => c.type !== 'select');
    expect(writes).toHaveLength(0);
  });

  it('copies the approved revision snapshot and recalculates a safe image primary', async () => {
    fakeDb.setNextSelectResult([
      listingMediaRow({
        id: 801,
        listingId: 5602,
        mediaType: 'video',
        isPrimary: 1,
        displayOrder: 0,
      }),
      listingMediaRow({
        id: 802,
        listingId: 5602,
        mediaType: 'image',
        isPrimary: 0,
        displayOrder: 1,
      }),
    ]);

    await expect(synchronizeApprovedRevisionMedia(5601, 5602)).resolves.toMatchObject({
      copied: 2,
      primaryMediaId: 802,
    });

    const inserts = fakeDb.calls.filter(c => c.type === 'insert' && c.table === 'listing_media');
    expect(inserts).toHaveLength(2);
    expect(inserts[0].values).toMatchObject({ listingId: 5601, mediaType: 'video', isPrimary: 0 });
    expect(inserts[1].values).toMatchObject({ listingId: 5601, mediaType: 'image', isPrimary: 1 });
  });

  it('rejects an existing-media token that belongs to another listing', async () => {
    fakeDb.setNextSelectResult([{ id: 701 }]);

    await expect(
      replaceListingMedia(5502, [{ id: 'existing:999', mediaType: 'image' }], 'existing:999'),
    ).rejects.toThrow('Listing media does not belong to this listing');

    const writes = fakeDb.calls.filter(c => c.type !== 'select');
    expect(writes).toHaveLength(0);
  });
});

// ===========================================================================
// syncPublishedListingMediaToPropertyMirror — lower-level tests
// ===========================================================================

describe('syncPublishedListingMediaToPropertyMirror (lower-level)', () => {
  it('queries by sourceListingId as the sole canonical lookup', async () => {
    // getListingById → returns published listing
    fakeDb.setNextSelectResult([listingRow({ id: 6001, status: 'published' })]);
    // sourceListingId query → property found
    fakeDb.setNextSelectResult([{ id: 777 }]);
    // getListingMedia → media items
    fakeDb.setNextSelectResult([listingMediaRow({ id: 801, isPrimary: 1 })]);

    const result = await syncPublishedListingMediaToPropertyMirror(6001);

    expect(result.synced).toBe(true);
    expect(result.propertyId).toBe(777);

    // Prove the first properties select used sourceListingId in its WHERE
    const propSelects = fakeDb.calls.filter(c => c.type === 'select' && c.table === 'properties');
    expect(propSelects.length).toBeGreaterThanOrEqual(1);
    // The first properties select is the sourceListingId lookup
    expect(propSelects[0].whereCols).toContain('sourceListingId');
  });

  it('returns synced:false if no property mirror found', async () => {
    fakeDb.setNextSelectResult([listingRow({ id: 6003, status: 'published' })]);
    // Canonical sourceListingId lookup → no property projection
    fakeDb.setNextSelectResult([]);

    const result = await syncPublishedListingMediaToPropertyMirror(6003);

    expect(result.synced).toBe(false);
    expect(result.reason).toBe('property_mirror_not_found');
  });
});

// ===========================================================================
// rejectListing — lower-level test
// ===========================================================================

describe('rejectListing (lower-level)', () => {
  it('rejects a pending_review listing and updates the approval queue', async () => {
    fakeDb.setNextSelectResult([listingRow({ id: 8001, status: 'pending_review' })]);

    await rejectListing(8001, 1, 'Incomplete documentation', ['Missing floor plan'], 'Try again');

    const listingUpdates = fakeDb.calls.filter(c => c.type === 'update' && c.table === 'listings');
    expect(listingUpdates).toHaveLength(1);
    expect(listingUpdates[0].set).toMatchObject({
      status: 'rejected',
      approvalStatus: 'rejected',
      rejectionReason: 'Incomplete documentation',
      rejectionNote: 'Try again',
    });

    const queueUpdates = fakeDb.calls.filter(
      c => c.type === 'update' && c.table === 'listing_approval_queue',
    );
    expect(queueUpdates).toHaveLength(1);
    expect(queueUpdates[0].set).toMatchObject({
      status: 'rejected',
      rejectionReason: 'Incomplete documentation',
    });
    expect(assertListingPublicationEntitled).not.toHaveBeenCalled();
  });

  it('rejects wrong-state listings before mutating records', async () => {
    fakeDb.setNextSelectResult([
      listingRow({ id: 8002, status: 'published', approvalStatus: 'approved' }),
    ]);

    await expect(rejectListing(8002, 1, 'Too late')).rejects.toThrow(
      'cannot be rejected from status "published"',
    );

    const writes = fakeDb.calls.filter(c => c.type !== 'select');
    expect(writes).toHaveLength(0);
  });
});

// ===========================================================================
// archiveListing — lower-level test
// ===========================================================================

describe('archiveListing (lower-level)', () => {
  it('cascades archive status to linked property projection', async () => {
    await archiveListing(9001);

    const listingUpdates = fakeDb.calls.filter(c => c.type === 'update' && c.table === 'listings');
    const propUpdates = fakeDb.calls.filter(c => c.type === 'update' && c.table === 'properties');
    expect(listingUpdates[0].set).toMatchObject({
      status: 'archived',
    });
    expect(propUpdates.length).toBeGreaterThanOrEqual(1);
    expect(propUpdates[0].set).toMatchObject({
      status: 'archived',
    });
    // Prove the cascade uses sourceListingId in its WHERE
    expect(propUpdates[0].whereCols).toContain('sourceListingId');
    expect(assertListingPublicationEntitled).not.toHaveBeenCalled();
  });

  it('updates authored agent custody and the linked public projection together', async () => {
    await updateListingAgentAssignment(9002, 77);

    const listingUpdates = fakeDb.calls.filter(c => c.type === 'update' && c.table === 'listings');
    const propUpdates = fakeDb.calls.filter(c => c.type === 'update' && c.table === 'properties');

    expect(listingUpdates[0]).toMatchObject({
      set: { agentId: 77 },
    });
    expect(listingUpdates[0].whereCols).toContain('id');
    expect(propUpdates[0]).toMatchObject({
      set: { agentId: 77 },
    });
    expect(propUpdates[0].whereCols).toContain('sourceListingId');
  });
});

// ===========================================================================
// publication entitlement — lower-level final guard
// ===========================================================================

describe('listing publication entitlement final guard', () => {
  it('prevents a direct approval call from creating a public property when entitlement fails', async () => {
    fakeDb.setNextSelectResult([listingRow({ id: 9101, status: 'pending_review' })]);
    vi.mocked(mockAssertListingPublicationEntitled).mockRejectedValueOnce(
      new Error('Subscription activation is required before this listing can be submitted.'),
    );

    await expect(approveListing(9101, 1)).rejects.toThrow('Subscription activation');

    const publicWrites = fakeDb.calls.filter(
      call =>
        call.type !== 'select' && (call.table === 'properties' || call.table === 'propertyImages'),
    );
    expect(publicWrites).toHaveLength(0);
  });

  it('prevents persistence-layer fast-track approval from creating a public projection when entitlement fails', async () => {
    fakeDb.setNextSelectResult([listingRow({ id: 9103, status: 'draft' })]);
    vi.mocked(mockAssertListingPublicationEntitled).mockRejectedValueOnce(
      new Error('The subscription period has ended.'),
    );

    await expect(approveListing(9103, 1, undefined, 'fast_track')).rejects.toThrow(
      'subscription period has ended',
    );

    const publicWrites = fakeDb.calls.filter(
      call =>
        call.type !== 'select' && (call.table === 'properties' || call.table === 'propertyImages'),
    );
    expect(publicWrites).toHaveLength(0);
    expect(assertListingPublicationEntitled).toHaveBeenCalledWith(
      fakeDb,
      expect.objectContaining({ listingId: 9103, operation: 'fast_track' }),
    );
  });

  it('rechecks entitlement at administrative approval after submission and prevents public writes', async () => {
    fakeDb.setNextSelectResult([listingRow({ id: 9104, status: 'pending_review' })]);
    vi.mocked(mockAssertListingPublicationEntitled).mockRejectedValueOnce(
      new Error('The subscription is suspended.'),
    );

    await expect(approveListing(9104, 1)).rejects.toThrow('subscription is suspended');

    const publicWrites = fakeDb.calls.filter(
      call =>
        call.type !== 'select' && (call.table === 'properties' || call.table === 'propertyImages'),
    );
    expect(publicWrites).toHaveLength(0);
    expect(assertListingPublicationEntitled).toHaveBeenCalledWith(
      fakeDb,
      expect.objectContaining({ listingId: 9104, operation: 'admin_approval' }),
    );
  });

  it('uses the same entitlement assertion for public media synchronization', async () => {
    fakeDb.setNextSelectResult([listingRow({ id: 9102, status: 'published' })]);
    fakeDb.setNextSelectResult([]);
    fakeDb.setNextSelectResult([]);
    fakeDb.setNextSelectResult([]);

    await syncPublishedListingMediaToPropertyMirror(9102);

    expect(assertListingPublicationEntitled).toHaveBeenCalledWith(
      fakeDb,
      expect.objectContaining({ listingId: 9102, operation: 'public_media_sync' }),
    );
  });
});

// ===========================================================================
// deleteListing — lower-level test
// ===========================================================================

describe('deleteListing (lower-level)', () => {
  it('soft-archives linked property projection before deleting listing', async () => {
    fakeDb.setNextSelectResult([listingRow({ id: 10001, status: 'draft' })]);
    await deleteListing(10001);

    const propUpdates = fakeDb.calls.filter(c => c.type === 'update' && c.table === 'properties');
    expect(propUpdates.length).toBeGreaterThanOrEqual(1);
    expect(propUpdates[0].set).toMatchObject({
      status: 'archived',
    });
    // Prove the soft-archive update uses sourceListingId in its WHERE
    expect(propUpdates[0].whereCols).toContain('sourceListingId');

    // Should also delete listing-related rows
    const deletes = fakeDb.calls.filter(c => c.type === 'delete');
    expect(deletes.length).toBeGreaterThanOrEqual(1);
  });
});
