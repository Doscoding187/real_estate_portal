import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MySqlDialect } from 'drizzle-orm/mysql-core';
const { database, search } = vi.hoisted(() => ({ database: vi.fn(), search: vi.fn() }));
vi.mock('../../db', () => ({ getDb: database }));
vi.mock('../publicSearchService', () => ({ publicSearchService: { searchInventory: search } }));
import { getProvinceGuideInventory, getProvinceGuidePlaces } from '../provinceGuideService';
const chain = { from: vi.fn(), where: vi.fn(), limit: vi.fn(), orderBy: vi.fn() };
beforeEach(() => {
  for (const method of ['from', 'where'] as const) chain[method].mockReturnValue(chain);
  chain.limit.mockResolvedValue([{ id: 3, name: 'Gauteng', slug: 'gauteng' }]);
  chain.orderBy.mockResolvedValue([{ id: 18, name: 'Pretoria', slug: 'pretoria' }]);
  database.mockResolvedValue({ select: vi.fn(() => chain) });
});
describe('Province guide geography and platform availability', () => {
  it('resolves exact verified parent/child identities without depending on inventory', async () => {
    const result = await getProvinceGuidePlaces('gauteng');
    expect(result?.province.canonicalLocationId).toBe('province:3');
    expect(result?.cities[0].canonicalLocationId).toBe('city:18');
    const dialect = new MySqlDialect();
    const parent = dialect.sqlToQuery(chain.where.mock.calls[0][0]);
    const child = dialect.sqlToQuery(chain.where.mock.calls[1][0]);
    expect(parent.params).toEqual(['gauteng', 'verified']);
    expect(child.params).toContain('verified');
    expect(child.params).toContain(3);
    expect(child.sql).toContain('`cities`.`provinceId`');
    expect(search).not.toHaveBeenCalled();
  });
  it('does not guess between duplicate city identities', async () => {
    chain.orderBy.mockResolvedValue([
      { id: 18, name: 'Pretoria', slug: 'pretoria' },
      { id: 19, name: 'Pretoria', slug: 'pretoria' },
    ]);
    expect((await getProvinceGuidePlaces('gauteng'))?.cities).toEqual([]);
  });
  it('does not widen an unresolved or ambiguous province', async () => {
    chain.limit.mockResolvedValue([]);
    expect(await getProvinceGuideInventory('gauteng')).toBeNull();
    expect(search).not.toHaveBeenCalled();
    chain.limit.mockResolvedValue([{ id: 3 }, { id: 4 }]);
    expect(await getProvinceGuidePlaces('gauteng')).toBeNull();
  });
  it('keeps partial failure distinct from genuine zero and uses one canonical authority', async () => {
    search.mockResolvedValueOnce({ total: 0 }).mockRejectedValueOnce(new Error('unavailable'));
    const result = await getProvinceGuideInventory('gauteng');
    expect(result?.sale).toEqual({ state: 'ready', total: 0 });
    expect(result?.rent).toEqual({ state: 'unavailable', total: null });
    expect(search.mock.calls.map(([input]) => input)).toEqual([
      { locationId: 'province:3', listingType: 'sale', page: 0, pageSize: 1 },
      { locationId: 'province:3', listingType: 'rent', page: 0, pageSize: 1 },
    ]);
    expect(result?.scope).toBe('province:3');
  });
  it('rejects invalid counts instead of presenting them as market data', async () => {
    search.mockResolvedValueOnce({ total: NaN }).mockResolvedValueOnce({ total: -1 });
    const result = await getProvinceGuideInventory('gauteng');
    expect(result?.sale.total).toBeNull();
    expect(result?.rent.total).toBeNull();
  });
  it('does not publish generic content for unresearched provinces', async () => {
    expect(await getProvinceGuidePlaces('western-cape')).toBeNull();
    expect(database).not.toHaveBeenCalled();
  });
});
