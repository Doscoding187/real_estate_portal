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
  private selectResults: Array<Record<string, unknown>[]> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.calls = [];
    this.selectResults = [];
  }

  setNextSelectResult(rows: Record<string, unknown>[]) {
    this.selectResults.push(rows);
    return this;
  }

  private record(call: DbCall) {
    this.calls.push(call);
  }

  private resolveSelect(tableName: string) {
    this.record({ type: 'select', table: tableName });
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
        return Promise.resolve(this.selectResults.shift() || []);
      },
      orderBy: (_order: any) => {
        // .orderBy() returns the query builder itself (chainable)
        return chain;
      },
      then: (resolve: (v: any) => void) => {
        // If awaited directly (no .limit() called), resolve immediately
        this.record({ type: 'select', table: tableName, whereCols });
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
          this.record({ type: 'update', table: tableName, set: vals, whereCols: extractColNames(conds) });
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

  transaction = async <T>(callback: (tx: this) => Promise<T>) => callback(this);
}

const fakeDb = new FakeDrizzle();

const { mockAssertListingPublicationEntitled } = vi.hoisted(() => ({
  mockAssertListingPublicationEntitled: vi.fn(),
}));

// Mock db-connection BEFORE importing the db functions
vi.mock('../db-connection', () => ({
  getDb: vi.fn(() => fakeDb),
  _db: null,
}));

vi.mock('../services/listingPublicationEntitlementService', () => ({
  assertListingPublicationEntitled: mockAssertListingPublicationEntitled,
}));

// Now import the real functions (no mock of ../db — internal calls are real)
import {
  approveListing,
  archiveListing,
  deleteListing,
  rejectListing,
  replaceListingMedia,
  syncPublishedListingMediaToPropertyMirror,
} from '../db';
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
    fakeDb.setNextSelectResult([listingRow({ id: 5004, status: 'published', approvalStatus: 'approved' })]);

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

    const imgDeletes = fakeDb.calls.filter(c => c.type === 'delete' && c.table === 'propertyImages');
    expect(imgDeletes.length).toBeGreaterThanOrEqual(1);

    const imgInserts = fakeDb.calls.filter(c => c.type === 'insert' && c.table === 'propertyImages');
    expect(imgInserts).toHaveLength(2);
  });

  it.each(['sell', 'rent', 'auction'] as const)(
    'handles action "%s" with correct listingType mapping',
    async (action) => {
      const pricing =
        action === 'sell'
          ? JSON.stringify({ askingPrice: 3000000 })
          : action === 'rent'
            ? JSON.stringify({ monthlyRent: 25000 })
            : JSON.stringify({ startingBid: 1500000 });

      fakeDb.setNextSelectResult([
        listingRow({ id: 5100, action, pricing }),
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
  it('retains explicit existing media, removes omitted media, and preserves a new video type', async () => {
    fakeDb.setNextSelectResult([{ id: 701 }, { id: 702 }]);

    await replaceListingMedia(
      5501,
      [
        {
          id: 'uploads/listings/5501/walkthrough.mp4',
          mediaType: 'video',
          fileName: 'walkthrough.mp4',
          processingStatus: 'completed',
        },
        {
          id: 'existing:701',
          mediaType: 'image',
        },
      ],
      'uploads/listings/5501/walkthrough.mp4',
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
      displayOrder: 0,
      isPrimary: 1,
    });
    expect(updates).toHaveLength(1);
    expect(updates[0].set).toMatchObject({ displayOrder: 1, isPrimary: 0 });
    expect(fakeDb.calls.indexOf(deletes[0])).toBeLessThan(fakeDb.calls.indexOf(inserts[0]));
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
    const propSelects = fakeDb.calls.filter(
      c => c.type === 'select' && c.table === 'properties',
    );
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

    const propUpdates = fakeDb.calls.filter(
      c => c.type === 'update' && c.table === 'properties',
    );
    expect(propUpdates.length).toBeGreaterThanOrEqual(1);
    expect(propUpdates[0].set).toMatchObject({
      status: 'archived',
    });
    // Prove the cascade uses sourceListingId in its WHERE
    expect(propUpdates[0].whereCols).toContain('sourceListingId');
    expect(assertListingPublicationEntitled).not.toHaveBeenCalled();
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
      call => call.type !== 'select' && (call.table === 'properties' || call.table === 'propertyImages'),
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
      call => call.type !== 'select' && (call.table === 'properties' || call.table === 'propertyImages'),
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
      call => call.type !== 'select' && (call.table === 'properties' || call.table === 'propertyImages'),
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
    await deleteListing(10001);

    const propUpdates = fakeDb.calls.filter(
      c => c.type === 'update' && c.table === 'properties',
    );
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
