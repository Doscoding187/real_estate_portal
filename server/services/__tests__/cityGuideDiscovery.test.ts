import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MySqlDialect } from 'drizzle-orm/mysql-core';
import type { SQL } from 'drizzle-orm';
const { database } = vi.hoisted(() => ({ database: vi.fn() }));
vi.mock('../../db', () => ({ getDb: database }));
import { listCityGuides } from '../cityGuideDiscoveryService';
const chain = {
  from: vi.fn(),
  innerJoin: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
};
beforeEach(() => {
  vi.clearAllMocks();
  for (const key of ['from', 'innerJoin', 'where', 'orderBy'] as const)
    chain[key].mockReturnValue(chain);
  chain.limit.mockResolvedValue([]);
  database.mockResolvedValue({ select: vi.fn(() => chain) });
});
describe('Existing city-guide discovery', () => {
  it('uses verified parent identities, existing slugs and stable editorial ordering without an inventory query', async () => {
    chain.limit.mockResolvedValue([
      {
        id: 1,
        name: 'Johannesburg',
        slug: 'johannesburg',
        provinceName: 'Gauteng',
        provinceSlug: 'gauteng',
      },
    ]);
    const data = await listCityGuides(12);
    const where = new MySqlDialect().sqlToQuery(chain.where.mock.calls[0][0] as SQL);
    expect(where.sql).toContain('`cities`.`status`');
    expect(where.sql).toContain('`provinces`.`status`');
    expect(where.params.filter(p => p === 'verified')).toHaveLength(2);
    expect(where.sql).toContain('TRIM(`cities`.`slug`)');
    expect(where.sql).not.toContain('properties');
    expect(new MySqlDialect().sqlToQuery(chain.orderBy.mock.calls[0][0] as SQL).params).toContain(
      'johannesburg',
    );
    expect(chain.limit).toHaveBeenCalledWith(12);
    expect(data).toEqual([
      {
        id: 1,
        name: 'Johannesburg',
        slug: 'johannesburg',
        provinceName: 'Gauteng',
        provinceSlug: 'gauteng',
        canonicalLocationId: 'city:1',
      },
    ]);
    expect(data[0]).not.toHaveProperty('listingCount');
  });
  it('does not fabricate a guide for empty data and does not hide query errors', async () => {
    await expect(listCityGuides()).resolves.toEqual([]);
    database.mockRejectedValue(new Error('read unavailable'));
    await expect(listCityGuides()).rejects.toThrow('read unavailable');
  });
});
