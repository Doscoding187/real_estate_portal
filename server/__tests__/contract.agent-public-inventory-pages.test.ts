import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryBuilder } from 'drizzle-orm/mysql-core';
const { resolve, getDb, projection } = vi.hoisted(() => ({
  resolve: vi.fn(),
  getDb: vi.fn(),
  projection: vi.fn(),
}));
vi.mock('../services/publicPropertyEligibilityService', () => ({
  resolvePublicPropertyEligibilities: resolve,
}));
vi.mock('../services/canonicalPlaceSearchService', () => ({
  loadCanonicalPlaceSearchProjection: projection,
  canonicalPlaceSearchMembers: (execution: { placeId: string }) => [execution.placeId],
}));
vi.mock('../db', () => ({ getDb }));
import {
  pagePublicInventoryForAgent,
  listPublicInventoryLocationsForAgent,
} from '../services/agentPublicProfileService';
import { agentRouter } from '../agentRouter';
import { properties } from '../../drizzle/schema';

function publicResolution(id: number) {
  return {
    property: {
      id,
      title: `Property ${id}`,
      listingType: 'sale',
      price: 1000000,
      propertyType: 'house',
      canonicalPlaceId: 'pl-place-01-dee61758ef3bda7cd1a258ad',
    },
    images: [],
    media: [],
    sourceListingId: id + 1000,
    authority: 'approved_listing',
    publicAuthority: 'public_property_eligibility',
    publicIdentity: { role: 'agent', provenance: 'agent', name: 'Jane' },
    custody: { agentId: 42 },
  };
}
function candidateDb(ids: number[]) {
  let predicate: any;
  const conditions: string[] = [];
  const limits: number[] = [];
  let ascending = false;
  const query: any = {};
  for (const name of ['select', 'from', 'leftJoin']) query[name] = () => query;
  query.where = (condition: any) => {
    predicate = condition;
    return query;
  };
  query.orderBy = (order: any) => {
    const sql = new QueryBuilder()
      .select({ id: properties.id })
      .from(properties)
      .orderBy(order)
      .toSQL();
    ascending = sql.sql.includes(' asc');
    return query;
  };
  query.limit = (limit: number) => {
    const sql = new QueryBuilder()
      .select({ id: properties.id })
      .from(properties)
      .where(predicate)
      .toSQL();
    conditions.push(sql.sql);
    limits.push(limit);
    const cursorMatch = sql.sql.match(/`properties`.`id` (>|<) \?/);
    // The cursor is the first parameter after the two attribution IDs.
    const cursor = cursorMatch ? Number(sql.params[2]) : undefined;
    const matching = ids.filter(id => cursor == null || (ascending ? id > cursor : id < cursor));
    return Promise.resolve(
      [...matching]
        .sort((a, b) => (ascending ? a - b : b - a))
        .slice(0, limit)
        .map(id => ({ id })),
    );
  };
  return { db: query, conditions, limits };
}
const defaults = { limit: 12, sort: 'newest' as const };
describe('agent public inventory pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    projection.mockImplementation(async (_db: unknown, options: { placeIds: string[] }) => ({
      executions: new Map(options.placeIds.map(id => [id, { placeId: id, scope: 'locality' }])),
      labels: new Map(
        options.placeIds.map(id => [id, { label: 'Sandton, Johannesburg, Gauteng' }]),
      ),
    }));
    resolve.mockImplementation(
      async (ids: number[]) => new Map(ids.map(id => [id, publicResolution(id)])),
    );
  });
  it('makes more than 24 listings reachable without duplicate or skipped properties', async () => {
    const { db } = candidateDb(Array.from({ length: 85 }, (_, i) => i + 1));
    const seen: number[] = [];
    let cursor: number | undefined;
    for (let page = 0; page < 10; page++) {
      const result = await pagePublicInventoryForAgent(db, 42, { ...defaults, cursor });
      seen.push(...result.items.map(item => Number(item.id)));
      if (result.nextCursor == null) break;
      cursor = result.nextCursor;
    }
    expect(seen).toEqual(Array.from({ length: 85 }, (_, i) => 85 - i));
    expect(new Set(seen).size).toBe(85);
  });
  it('scans past unpublished candidates while retaining only public DTO fields', async () => {
    resolve.mockImplementation(
      async (ids: number[]) =>
        new Map(ids.filter(id => id < 5).map(id => [id, publicResolution(id)])),
    );
    const { db, limits } = candidateDb(Array.from({ length: 80 }, (_, i) => i + 1));
    const page = await pagePublicInventoryForAgent(db, 42, { ...defaults });
    expect(page.items.map(item => Number(item.id))).toEqual([4, 3, 2, 1]);
    expect(limits).toEqual([60, 60]);
    expect(page.nextCursor).toBeNull();
    expect(page.items[0]).not.toHaveProperty('sourceListingId');
    expect(page.items[0]).not.toHaveProperty('custody');
  });
  it('filters by one canonical area and transaction intent in the query', async () => {
    const { db, conditions } = candidateDb([9]);
    await pagePublicInventoryForAgent(db, 42, {
      ...defaults,
      canonicalPlaceId: 'pl-place-01-dee61758ef3bda7cd1a258ad',
      listingType: 'rent',
    });
    expect(conditions[0]).toContain('`properties`.`canonical_place_id` in (?)');
    expect(conditions[0]).not.toContain('`properties`.`suburbId`');
    expect(conditions[0]).toContain('`properties`.`listingType` = ?');
    expect(conditions[0]).toContain('`properties`.`agentId` = ? or `listings`.`agentId` = ?');
  });
  it('supports oldest-first pages and excludes the previous cursor', async () => {
    const { db } = candidateDb([1, 2, 3, 4]);
    const first = await pagePublicInventoryForAgent(db, 42, { limit: 2, sort: 'oldest' });
    const second = await pagePublicInventoryForAgent(db, 42, {
      limit: 2,
      sort: 'oldest',
      cursor: first.nextCursor!,
    });
    expect(first.items.map(item => Number(item.id))).toEqual([1, 2]);
    expect(second.items.map(item => Number(item.id))).toEqual([3, 4]);
    expect(second.nextCursor).toBeNull();
  });
  it('bounds one request even when no candidate passes eligibility', async () => {
    resolve.mockResolvedValue(new Map());
    const { db, limits } = candidateDb(Array.from({ length: 800 }, (_, i) => i + 1));
    const page = await pagePublicInventoryForAgent(db, 42, defaults);
    expect(page.items).toEqual([]);
    expect(limits).toHaveLength(10);
    expect(page.nextCursor).toBe(201);
  });
  it('derives location choices only from eligible public inventory and authoritative labels', async () => {
    resolve.mockImplementation(
      async (ids: number[]) =>
        new Map(ids.filter(id => id === 7).map(id => [id, publicResolution(id)])),
    );
    const { db } = candidateDb([7, 8]);
    expect(await listPublicInventoryLocationsForAgent(db, 42)).toEqual([
      {
        canonicalPlaceId: 'pl-place-01-dee61758ef3bda7cd1a258ad',
        label: 'Sandton, Johannesburg, Gauteng',
      },
    ]);
    expect(projection).toHaveBeenCalledWith(db, {
      placeIds: ['pl-place-01-dee61758ef3bda7cd1a258ad'],
    });
  });
  it('refuses a place without an executable scope instead of widening to display text', async () => {
    projection.mockResolvedValue({ executions: new Map(), labels: new Map() });
    const { db, conditions } = candidateDb([7]);
    expect(
      await pagePublicInventoryForAgent(db, 42, {
        ...defaults,
        canonicalPlaceId: 'pl-place-01-dee61758ef3bda7cd1a258ad',
      }),
    ).toEqual({ items: [], nextCursor: null });
    expect(conditions).toEqual([]);
    expect(resolve).not.toHaveBeenCalled();
  });
  it('returns no inventory for an unavailable agent and rejects mixed/display geography inputs', async () => {
    const query: any = {};
    for (const name of ['select', 'from', 'where']) query[name] = () => query;
    query.limit = async () => [];
    getDb.mockResolvedValue(query);
    const caller = agentRouter.createCaller({ user: null, req: {}, res: {} } as never);
    await expect(
      caller.getPublicInventoryPageForAgent({ slug: 'unavailable-agent' }),
    ).resolves.toEqual({ items: [], nextCursor: null });
    await expect(
      caller.getPublicInventoryPageForAgent({ slug: 'jane-agent', canonicalPlaceId: 'Sandton' }),
    ).rejects.toThrow();
    await expect(
      caller.getPublicInventoryPageForAgent({
        slug: 'jane-agent',
        canonicalPlaceId: 'pl-place-01-dee61758ef3bda7cd1a258ad',
        city: 'Sandton',
      } as never),
    ).rejects.toThrow();
    expect(resolve).not.toHaveBeenCalled();
  });
});
