import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDb, recorded } = vi.hoisted(() => ({
  getDb: vi.fn(),
  recorded: { inListSizes: [] as number[] },
}));
vi.mock('../../db', () => ({ getDb }));
vi.mock('drizzle-orm', async importOriginal => {
  const original = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...original,
    inArray: (column: any, values: any) => {
      if (Array.isArray(values)) recorded.inListSizes.push(values.length);
      return original.inArray(column, values);
    },
  };
});

import { listDevelopmentIdsForCanonicalPlaces } from '../developmentPlaceAssignmentService';

const placeId = (n: number) => `pl-place-01-${n.toString(16).padStart(24, '0')}`;

describe('listDevelopmentIdsForCanonicalPlaces', () => {
  beforeEach(() => {
    recorded.inListSizes = [];
    getDb.mockResolvedValue({
      select: () => {
        const query: any = {
          from: () => query,
          leftJoin: () => query,
          where: async () => [],
        };
        return query;
      },
    });
  });

  it('splits a large place list into IN lists of at most 500 and dedupes the ids', async () => {
    const ids = Array.from({ length: 1100 }, (_, i) => placeId(i + 1));
    expect(await listDevelopmentIdsForCanonicalPlaces([...ids, ...ids.slice(0, 50)])).toEqual([]);
    expect(recorded.inListSizes).toEqual([500, 500, 100]);
  });

  it('a small list is one query', async () => {
    await listDevelopmentIdsForCanonicalPlaces([placeId(1), placeId(2), placeId(1)]);
    expect(recorded.inListSizes).toEqual([2]);
  });
});
