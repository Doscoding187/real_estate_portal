import { beforeEach, describe, expect, it, vi } from 'vitest';
import { favorites, recentlyViewed, users } from '../../drizzle/schema';
const mocked = vi.hoisted(() => ({
  getDb: vi.fn(),
  allocateUserRecentViewTimestamp: vi.fn(),
  resolvePublicPropertyEligibilities: vi.fn(),
}));
vi.mock('../db', () => mocked);
vi.mock('../services/publicPropertyEligibilityService', () => ({
  resolvePublicPropertyEligibilities: mocked.resolvePublicPropertyEligibilities,
}));
import { guestMigrationRouter } from '../guestMigrationRouter';

// Model commit/rollback and table identity, not query call order. Real MySQL
// locking and isolation still need integration evidence.
function database() {
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
const publicResolution = (overrides: Record<string, unknown> = {}) => ({
  sourceListingId: 77,
  property: { id: 10, propertyType: 'house' },
  ...overrides,
});

describe('guest transfer transaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let allocation = 0;
    mocked.allocateUserRecentViewTimestamp.mockImplementation(async () => {
      allocation += 1;
      return `2026-09-09 00:00:00.${String(allocation).padStart(6, '0')}`;
    });
    mocked.resolvePublicPropertyEligibilities.mockResolvedValue(
      new Map([[10, publicResolution()]]),
    );
  });
  it('uses source listing identity and preserves property identity for favorites', async () => {
    const db = database();
    mocked.getDb.mockResolvedValue(db);
    expect(await caller().migrateGuestData(input)).toEqual({
      success: true,
      migratedViews: 1,
      migratedFavorites: 1,
    });
    expect(db.state.views).toEqual([{ userId: 5, listingId: 77, viewedAt: expect.any(String) }]);
    expect(db.state.favorites).toEqual([{ userId: 5, propertyId: 10 }]);
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
    { resolution: new Map() },
    { resolution: new Map([[10, publicResolution({ sourceListingId: null })]]) },
    {
      resolution: new Map([[10, publicResolution({ property: { id: 10, propertyType: 'commercial' } })]]),
    },
  ])('rejects unsupported public activity without committing', async ({ resolution }) => {
    const db = database();
    mocked.getDb.mockResolvedValue(db);
    mocked.resolvePublicPropertyEligibilities.mockResolvedValue(resolution);
    await expect(caller().migrateGuestData(input)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(db.state).toEqual({ views: [], favorites: [] });
    expect(db.transaction).not.toHaveBeenCalled();
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
