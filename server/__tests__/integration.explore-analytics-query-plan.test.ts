import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { getDb } from '../db-connection';

const hasDb = Boolean(process.env.DATABASE_URL);
const describeWithDb: typeof describe = hasDb
  ? describe
  : (((name, fn) => describe.skip(`${name} (requires DATABASE_URL)`, fn)) as typeof describe);

describeWithDb('Explore analytics query plan', () => {
  it('exposes the canonical created-at/content index to the aggregate query', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const result = await db.execute(sql`
      EXPLAIN SELECT
        SUM(CASE WHEN ee.interaction_type = 'view' THEN 1 ELSE 0 END) AS total_views
      FROM explore_engagements ee
      INNER JOIN explore_content ec ON ec.id = ee.content_id
      WHERE ee.created_at >= '2026-01-01' AND ec.creator_id = 1
    `);
    const rows = Array.isArray(result) ? result[0] : result;
    const plan = (Array.isArray(rows) ? rows : []).map((row: any) => String(row.possible_keys ?? ''));
    expect(plan.join(',')).toContain('idx_explore_engagements_created_content');
  });
});
