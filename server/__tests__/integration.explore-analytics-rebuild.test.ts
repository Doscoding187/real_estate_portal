import { randomUUID } from 'node:crypto';
import path from 'node:path';
import dotenv from 'dotenv';
import { afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { exploreContent, exploreEngagements, users } from '../../drizzle/schema';
import { getDb } from '../db';
import { exploreAnalyticsService } from '../services/exploreAnalyticsService';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: false });

const hasDb = Boolean(process.env.DATABASE_URL);
const describeWithDb: typeof describe = hasDb
  ? describe
  : (((name, fn) => describe.skip(`${name} (requires DATABASE_URL)`, fn)) as typeof describe);

const created = { userId: 0, contentId: 0 };

function insertId(result: any) {
  return Number(result?.insertId || result?.[0]?.insertId || 0);
}

async function writeFixtureEvents(contentId: number, suffix: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.insert(exploreEngagements).values([
    {
      eventId: `${suffix}-view-a`,
      contentId,
      userId: created.userId,
      sessionId: `${suffix}-session-a`,
      interactionType: 'view',
      metadata: { watchTime: 30 },
    },
    {
      eventId: `${suffix}-view-b`,
      contentId,
      sessionId: `${suffix}-session-b`,
      interactionType: 'view',
      metadata: { duration: 20 },
    },
    {
      eventId: `${suffix}-complete`,
      contentId,
      userId: created.userId,
      sessionId: `${suffix}-session-a`,
      interactionType: 'complete',
      metadata: {},
    },
    {
      eventId: `${suffix}-save`,
      contentId,
      userId: created.userId,
      sessionId: `${suffix}-session-a`,
      interactionType: 'save',
      metadata: {},
    },
  ] as any);
}

afterEach(async () => {
  if (!hasDb) return;
  const db = await getDb();
  if (!db) return;
  if (created.contentId) {
    await db.delete(exploreEngagements).where(eq(exploreEngagements.contentId, created.contentId));
    await db.delete(exploreContent).where(eq(exploreContent.id, created.contentId));
  }
  if (created.userId) await db.delete(users).where(eq(users.id, created.userId));
  Object.assign(created, { userId: 0, contentId: 0 });
});

describeWithDb('Explore analytics aggregate rebuild', () => {
  it('rebuilds identical metrics directly from the retained event facts', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const suffix = randomUUID().replace(/-/g, '');

    const [userResult] = await db.insert(users).values({
      email: `explore-aggregate-${suffix}@example.com`,
      name: 'Explore Aggregate Owner',
      firstName: 'Explore',
      lastName: 'Aggregate',
      phone: '+27110000002',
      role: 'agent',
      emailVerified: 1,
    } as any);
    created.userId = insertId(userResult);

    const [contentResult] = await db.insert(exploreContent).values({
      contentType: 'listing',
      referenceId: created.userId,
      creatorId: created.userId,
      creatorType: 'user',
      title: `Aggregate rebuild ${suffix}`,
      isActive: 1,
    } as any);
    created.contentId = insertId(contentResult);

    await writeFixtureEvents(created.contentId, `${suffix}a`);
    const first = await exploreAnalyticsService.getAggregatedMetrics('all', created.userId);

    await db.delete(exploreEngagements).where(eq(exploreEngagements.contentId, created.contentId));
    await writeFixtureEvents(created.contentId, `${suffix}b`);
    const rebuilt = await exploreAnalyticsService.getAggregatedMetrics('all', created.userId);

    const expected = {
      totalViews: 2,
      totalUniqueViewers: 2,
      totalWatchTime: 50,
      totalSessions: 2,
      averageSessionDuration: 25,
      averageCompletionRate: 50,
      engagementRate: 50,
    };
    expect(first).toEqual(expected);
    expect(rebuilt).toEqual(expected);
  });
});
