import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryBuilder } from 'drizzle-orm/mysql-core';
import { agents, exploreContent } from '../../drizzle/schema';
const { getDb } = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock('../db', () => ({ getDb }));
import { listPublicVideosForAgent } from '../services/agentPublicVideoService';
import { agentRouter } from '../agentRouter';

function candidateDb(ids: number[]) {
  const queries: Array<{ sql: string; params: unknown[]; limit: number }> = [];
  let columns: any;
  let predicate: any;
  let order: any;
  let joinCondition: any;
  const chain: any = {
    select: (value: any) => {
      columns = value;
      return chain;
    },
    from: () => chain,
    innerJoin: (_table: unknown, condition: unknown) => {
      joinCondition = condition;
      return chain;
    },
    where: (value: any) => {
      predicate = value;
      return chain;
    },
    orderBy: (value: any) => {
      order = value;
      return chain;
    },
    limit: async (limit: number) => {
      const query = new QueryBuilder()
        .select(columns)
        .from(exploreContent)
        .innerJoin(agents, joinCondition)
        .where(predicate)
        .orderBy(order)
        .limit(limit)
        .toSQL();
      queries.push({ ...query, limit });
      const cursor = query.params.length > 6 ? Number(query.params[5]) : undefined;
      return ids
        .filter(id => cursor == null || id < cursor)
        .sort((a, b) => b - a)
        .slice(0, limit)
        .map(id => ({
          id,
          title: `Video ${id}`,
          description: null,
          thumbnailUrl: id === 1 ? 'javascript:alert(1)' : '/posters/video.jpg',
          videoUrl: '/media/video.mp4',
        }));
    },
  };
  return { db: chain, queries };
}

describe('anonymous agent video publication boundary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('selects only agent-owned active videos for an approved profile, with actual playable media', async () => {
    const { db, queries } = candidateDb([8]);
    const page = await listPublicVideosForAgent(db, 42);
    const query = queries[0];
    expect(query.sql).toContain(
      'inner join `agents` on `agents`.`id` = `explore_content`.`creator_id`',
    );
    expect(query.sql).toContain('`agents`.`id` = ?');
    expect(query.sql).toContain('`agents`.`status` = ?');
    expect(query.sql).toContain('`explore_content`.`creator_type` = ?');
    expect(query.sql).toContain('`explore_content`.`content_type` = ?');
    expect(query.sql).toContain('`explore_content`.`is_active` = ?');
    expect(query.params.slice(0, 5)).toEqual([42, 'approved', 'agent', 'video', 1]);
    expect(query.sql).toContain("`explore_content`.`video_url` LIKE 'https://%'");
    expect(query.sql).toContain("NOT LIKE '//%'");
    expect(query.sql).not.toContain('metadata');
    expect(query.sql).not.toContain('creator_id`,');
    expect(Object.keys(page.items[0]).sort()).toEqual([
      'description',
      'id',
      'thumbnailUrl',
      'title',
      'videoUrl',
    ]);
    expect(query.limit).toBe(7);
  });

  it('reaches a larger portfolio without duplicating the cursor item', async () => {
    const { db } = candidateDb(Array.from({ length: 19 }, (_, index) => index + 1));
    const seen: number[] = [];
    let cursor: number | undefined;
    for (let count = 0; count < 4; count++) {
      const page = await listPublicVideosForAgent(db, 42, { limit: 6, cursor });
      seen.push(...page.items.map(item => item.id));
      if (!page.nextCursor) break;
      cursor = page.nextCursor;
    }
    expect(seen).toEqual(Array.from({ length: 19 }, (_, index) => 19 - index));
  });

  it('returns an empty page without inventing media and discards unsafe posters', async () => {
    expect(await listPublicVideosForAgent(candidateDb([]).db, 42)).toEqual({
      items: [],
      nextCursor: null,
    });
    const page = await listPublicVideosForAgent(candidateDb([1]).db, 42);
    expect(page.items[0].thumbnailUrl).toBeNull();
  });

  it('returns no content for a non-public slug and rejects caller-supplied publisher identities', async () => {
    const db: any = {};
    for (const name of ['select', 'from', 'where']) db[name] = () => db;
    db.limit = async () => [];
    getDb.mockResolvedValue(db);
    const caller = agentRouter.createCaller({ user: null, req: {}, res: {} } as any);
    await expect(caller.getPublicVideosForAgent({ slug: 'hidden-agent' })).resolves.toEqual({
      items: [],
      nextCursor: null,
    });
    await expect(
      caller.getPublicVideosForAgent({ slug: 'hidden-agent', direction: 'forward' }),
    ).resolves.toEqual({
      items: [],
      nextCursor: null,
    });
    await expect(
      caller.getPublicVideosForAgent({ slug: 'agent', creatorId: 999 } as any),
    ).rejects.toThrow();
    await expect(caller.getPublicVideosForAgent({ slug: 'agent', cursor: 0 })).rejects.toThrow();
    await expect(caller.getPublicVideosForAgent({ slug: 'agent', limit: 100 })).rejects.toThrow();
  });
});
