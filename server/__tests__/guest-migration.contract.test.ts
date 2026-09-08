import { beforeEach, describe, expect, it, vi } from 'vitest';
import { favorites, recentlyViewed, properties, users } from '../../drizzle/schema';
const mocked = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock('../db', () => mocked);
import { guestMigrationRouter } from '../guestMigrationRouter';

// Model commit/rollback and table identity, not query call order. Real MySQL
// locking and isolation still need integration evidence.
function database(rows = [{ id: 10, sourceListingId: 77, propertyType: 'house' }]) {
  const state = { views: [] as any[], favorites: [] as any[] };
  let failFavorites = false;
  let tail = Promise.resolve();
  return {
    state,
    failFavorites: () => {
      failFavorites = true;
    },
    transaction: vi.fn(async (run: (tx: any) => Promise<unknown>) => {
      const prior = tail;
      let release!: () => void;
      tail = new Promise<void>(resolve => {
        release = resolve;
      });
      await prior;
      const draft = structuredClone(state);
      const tx = {
        select: () => ({
          from: (table: unknown) => ({
            where: () => {
              if (table === users) return { for: async () => [{ id: 5 }] };
              if (table === properties) return Promise.resolve(rows);
              if (table === recentlyViewed) return Promise.resolve(draft.views);
              if (table === favorites) return Promise.resolve(draft.favorites);
              throw new Error('Unexpected table');
            },
          }),
        }),
        insert: (table: unknown) => ({
          values: async (row: any) => {
            if (table === favorites && failFavorites) throw new Error('Write failed');
            (table === favorites ? draft.favorites : draft.views).push(row);
          },
        }),
      };
      try {
        const result = await run(tx);
        Object.assign(state, draft);
        return result;
      } finally {
        release();
      }
    }),
  };
}
const caller = (user: any = { id: 5 }) =>
  guestMigrationRouter.createCaller({ user, req: {}, res: {} } as any);
const input = { viewedProperties: [10, 10], favoriteProperties: [10, 10] };

describe('guest transfer transaction', () => {
  beforeEach(() => vi.clearAllMocks());
  it('uses source listing identity and preserves property identity for favorites', async () => {
    const db = database();
    mocked.getDb.mockResolvedValue(db);
    expect(await caller().migrateGuestData(input)).toEqual({
      success: true,
      migratedViews: 1,
      migratedFavorites: 1,
    });
    expect(db.state.views).toEqual([{ userId: 5, listingId: 77, viewedAt: expect.any(String) }]);
    expect(db.state.favorites).toEqual([
      { userId: 5, propertyId: 10, createdAt: expect.any(String) },
    ]);
  });
  it('does not commit views if a later favorite write fails', async () => {
    const db = database();
    db.failFavorites();
    mocked.getDb.mockResolvedValue(db);
    await expect(caller().migrateGuestData(input)).rejects.toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
    });
    expect(db.state).toEqual({ views: [], favorites: [] });
  });
  it('returns zero new records on replay', async () => {
    const db = database();
    mocked.getDb.mockResolvedValue(db);
    await caller().migrateGuestData(input);
    expect(await caller().migrateGuestData(input)).toEqual({
      success: true,
      migratedViews: 0,
      migratedFavorites: 0,
    });
  });
  it.each([
    { rows: [] },
    { rows: [{ id: 10, sourceListingId: null, propertyType: 'house' }] },
    { rows: [{ id: 10, sourceListingId: 77, propertyType: 'commercial' }] },
  ])('rejects unsupported identity without committing', async ({ rows }) => {
    const db = database(rows as any);
    mocked.getDb.mockResolvedValue(db);
    await expect(caller().migrateGuestData(input)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(db.state).toEqual({ views: [], favorites: [] });
  });
  it('rejects invalid and oversized inputs before opening the database', async () => {
    for (const ids of [[-1], [1.2], Array(501).fill(10)]) {
      await expect(caller().migrateGuestData({ viewedProperties: ids })).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    }
    expect(mocked.getDb).not.toHaveBeenCalled();
  });
  it('rejects anonymous transfer', async () => {
    await expect(caller(null).migrateGuestData(input)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(mocked.getDb).not.toHaveBeenCalled();
  });
});
