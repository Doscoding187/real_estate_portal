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
}

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
    const self = this;
    let tableName = 'unknown';
    const chain: any = {
      from: (table: any) => {
        tableName = resolveTableName(table);
        return chain;
      },
      where: () => {
        // Return the same chain so .limit()/.orderBy() chain back
        return chain;
      },
      limit: (n: number) => {
        const result = self.resolveSelect(tableName);
        return Promise.resolve(result);
      },
      orderBy: (_order: any) => {
        // .orderBy() returns the query builder itself (chainable)
        return chain;
      },
      then: (resolve: (v: any) => void) => {
        // If awaited directly (no .limit() called), resolve immediately
        const result = self.resolveSelect(tableName);
        resolve(result);
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
        where: () => {
          this.record({ type: 'update', table: tableName, set: vals });
          return Promise.resolve([{ affectedRows: 1 }]);
        },
      }),
    };
  }

  delete_(table: any) {
    const tableName = resolveTableName(table);
    return {
      where: () => {
        this.record({ type: 'delete', table: tableName });
        return Promise.resolve([{ affectedRows: 1 }]);
      },
    };
  }

  delete = this.delete_;
}

const fakeDb = new FakeDrizzle();

// Mock db-connection BEFORE importing the db functions
vi.mock('../db-connection', () => ({
  getDb: vi.fn(() => fakeDb),
  _db: null,
}));

// Mock the inventory link resolver so approveListing doesn't crash
vi.mock('../services/inventoryLinkResolver', () => ({
  getInventoryBridgeSchemaCapabilities: vi.fn(() =>
    Promise.resolve({ propertiesSourceListingIdColumn: true }),
  ),
}));

// Now import the real functions (no mock of ../db — internal calls are real)
import {
  approveListing,
  archiveListing,
  deleteListing,
  syncPublishedListingMediaToPropertyMirror,
} from '../db';

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
// syncPublishedListingMediaToPropertyMirror — lower-level tests
// ===========================================================================

describe('syncPublishedListingMediaToPropertyMirror (lower-level)', () => {
  it('queries by sourceListingId as primary lookup', async () => {
    // getListingById → returns published listing
    fakeDb.setNextSelectResult([listingRow({ id: 6001, status: 'published' })]);
    // sourceListingId query → property found
    fakeDb.setNextSelectResult([{ id: 777 }]);
    // sourceListingId column check → exists
    fakeDb.setNextSelectResult([{ id: 777, sourceListingId: 6001 }]);
    // getListingMedia → media items
    fakeDb.setNextSelectResult([listingMediaRow({ id: 801, isPrimary: 1 })]);

    const result = await syncPublishedListingMediaToPropertyMirror(6001);

    expect(result.synced).toBe(true);
    expect(result.propertyId).toBe(777);

    const selects = fakeDb.calls.filter(c => c.type === 'select');
    expect(selects.filter(s => s.table === 'properties').length).toBeGreaterThanOrEqual(1);
  });

  it('stamps sourceListingId on legacy-matched property', async () => {
    fakeDb.setNextSelectResult([listingRow({ id: 6002, status: 'published' })]);
    // sourceListingId query → nothing found
    fakeDb.setNextSelectResult([]);
    // Legacy placeId match → found
    fakeDb.setNextSelectResult([{ id: 888 }]);
    // sourceListingId column check → null (legacy)
    fakeDb.setNextSelectResult([{ id: 888, sourceListingId: null }]);
    // getListingMedia → media items
    fakeDb.setNextSelectResult([listingMediaRow({ id: 802, isPrimary: 1 })]);

    const result = await syncPublishedListingMediaToPropertyMirror(6002);

    expect(result.synced).toBe(true);

    // Should have stamped sourceListingId
    const updates = fakeDb.calls.filter(c => c.type === 'update' && c.table === 'properties');
    const sourceListingIdUpdate = updates.find(u => u.set?.sourceListingId === 6002);
    expect(sourceListingIdUpdate).toBeTruthy();
  });

  it('returns synced:false if no property mirror found', async () => {
    fakeDb.setNextSelectResult([listingRow({ id: 6003, status: 'published' })]);
    // sourceListingId query → nothing
    fakeDb.setNextSelectResult([]);
    // Legacy placeId match → nothing (no normalized placeId on this listing)
    // (the code checks listing.placeId first, which is 'ChIJ123', so it enters the placeId branch)
    fakeDb.setNextSelectResult([]);
    // Legacy identity match → nothing
    fakeDb.setNextSelectResult([]);

    const result = await syncPublishedListingMediaToPropertyMirror(6003);

    expect(result.synced).toBe(false);
    expect(result.reason).toBe('property_mirror_not_found');
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

    // Should also delete listing-related rows
    const deletes = fakeDb.calls.filter(c => c.type === 'delete');
    expect(deletes.length).toBeGreaterThanOrEqual(1);
  });
});
