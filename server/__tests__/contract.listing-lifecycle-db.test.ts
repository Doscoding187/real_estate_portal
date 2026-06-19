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
    const self = this;
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
        self.record({ type: 'select', table: tableName, whereCols });
        return Promise.resolve(self.selectResults.shift() || []);
      },
      orderBy: (_order: any) => {
        // .orderBy() returns the query builder itself (chainable)
        return chain;
      },
      then: (resolve: (v: any) => void) => {
        // If awaited directly (no .limit() called), resolve immediately
        self.record({ type: 'select', table: tableName, whereCols });
        resolve(self.selectResults.shift() || []);
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
}

const fakeDb = new FakeDrizzle();

// Controllable bridge capability flag — tests can flip this to simulate
// environments where the sourceListingId column is not yet available.
let bridgeHasSourceListingId = true;

// Mock db-connection BEFORE importing the db functions
vi.mock('../db-connection', () => ({
  getDb: vi.fn(() => fakeDb),
  _db: null,
}));

// Mock the inventory link resolver — uses the controllable flag
vi.mock('../services/inventoryLinkResolver', () => ({
  getInventoryBridgeSchemaCapabilities: vi.fn(() =>
    Promise.resolve({ propertiesSourceListingIdColumn: bridgeHasSourceListingId }),
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
  bridgeHasSourceListingId = true;
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

  describe('bridge column unavailable', () => {
    it('inserts without sourceListingId when bridge column is missing', async () => {
      bridgeHasSourceListingId = false;
      fakeDb.setNextSelectResult([listingRow({ id: 5201 })]);

      await approveListing(5201, 1);

      const inserts = fakeDb.calls.filter(c => c.type === 'insert' && c.table === 'properties');
      expect(inserts).toHaveLength(1);
      // No sourceListingId in the insert values
      expect(inserts[0].values.sourceListingId).toBeUndefined();
      // No idempotency select (the bridge guard skips it)
      const propSelects = fakeDb.calls.filter(
        c => c.type === 'select' && c.table === 'properties',
      );
      // Only the getListingById select should exist, not an idempotency check
      expect(propSelects.filter(s => s.whereCols?.includes('sourceListingId'))).toHaveLength(0);
    });

    it('skips idempotency check entirely', async () => {
      bridgeHasSourceListingId = false;
      fakeDb.setNextSelectResult([listingRow({ id: 5202 })]);

      await approveListing(5202, 1);

      // No properties select should exist beyond getListingById
      const propSelects = fakeDb.calls.filter(
        c => c.type === 'select' && c.table === 'properties',
      );
      expect(propSelects).toHaveLength(0);
    });
  });
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

    // Prove the first properties select used sourceListingId in its WHERE
    const propSelects = fakeDb.calls.filter(
      c => c.type === 'select' && c.table === 'properties',
    );
    expect(propSelects.length).toBeGreaterThanOrEqual(1);
    // The first properties select is the sourceListingId lookup
    expect(propSelects[0].whereCols).toContain('sourceListingId');
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

  describe('bridge column unavailable', () => {
    it('skips sourceListingId lookup and uses legacy matching directly', async () => {
      bridgeHasSourceListingId = false;
      fakeDb.setNextSelectResult([listingRow({ id: 6004, status: 'published' })]);
      // Legacy placeId match → found (no sourceListingId query before it)
      fakeDb.setNextSelectResult([{ id: 777 }]);
      // getListingMedia → media items
      fakeDb.setNextSelectResult([listingMediaRow({ id: 803, isPrimary: 1 })]);

      const result = await syncPublishedListingMediaToPropertyMirror(6004);

      expect(result.synced).toBe(true);
      expect(result.propertyId).toBe(777);

      // No select should reference sourceListingId
      const selectsWithSourceListingId = fakeDb.calls.filter(
        c => c.type === 'select' && c.whereCols?.includes('sourceListingId'),
      );
      expect(selectsWithSourceListingId).toHaveLength(0);

      // No stamping update for sourceListingId
      const stampUpdates = fakeDb.calls.filter(
        c => c.type === 'update' && c.set?.sourceListingId,
      );
      expect(stampUpdates).toHaveLength(0);
    });

    it('legacy matching does not include isNull(sourceListingId) guard', async () => {
      bridgeHasSourceListingId = false;
      fakeDb.setNextSelectResult([listingRow({ id: 6005, status: 'published' })]);
      // Legacy placeId match → found
      fakeDb.setNextSelectResult([{ id: 888 }]);
      // getListingMedia
      fakeDb.setNextSelectResult([listingMediaRow({ id: 804, isPrimary: 1 })]);

      const result = await syncPublishedListingMediaToPropertyMirror(6005);

      expect(result.synced).toBe(true);

      // Legacy selects should NOT include sourceListingId in whereCols
      const legacySelects = fakeDb.calls.filter(c => c.type === 'select' && c.table === 'properties');
      // No select should have sourceListingId in its where clause
      legacySelects.forEach(s => {
        expect(s.whereCols).not.toContain('sourceListingId');
      });
    });
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
  });

  describe('bridge column unavailable', () => {
    it('does not cascade archive to property when bridge column is missing', async () => {
      bridgeHasSourceListingId = false;

      await archiveListing(9002);

      const propUpdates = fakeDb.calls.filter(
        c => c.type === 'update' && c.table === 'properties',
      );
      expect(propUpdates).toHaveLength(0);
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
    // Prove the soft-archive update uses sourceListingId in its WHERE
    expect(propUpdates[0].whereCols).toContain('sourceListingId');

    // Should also delete listing-related rows
    const deletes = fakeDb.calls.filter(c => c.type === 'delete');
    expect(deletes.length).toBeGreaterThanOrEqual(1);
  });

  describe('bridge column unavailable', () => {
    it('does not soft-archive property when bridge column is missing', async () => {
      bridgeHasSourceListingId = false;

      await deleteListing(10002);

      const propUpdates = fakeDb.calls.filter(
        c => c.type === 'update' && c.table === 'properties',
      );
      expect(propUpdates).toHaveLength(0);

      // But still deletes listing-related rows (unaffected by bridge)
      const deletes = fakeDb.calls.filter(c => c.type === 'delete');
      expect(deletes.length).toBeGreaterThanOrEqual(1);
    });
  });
});
