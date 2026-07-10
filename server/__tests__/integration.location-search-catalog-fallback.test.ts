import path from 'node:path';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import { afterEach, describe, expect, it } from 'vitest';
import { eq, like } from 'drizzle-orm';

import { locationSearchCache, properties, users } from '../../drizzle/schema';
import { getDb } from '../db';
import { appRouter } from '../routers';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: false });

function isLocalAcceptanceDatabase(databaseUrl?: string) {
  if (!databaseUrl) return false;
  try {
    const parsed = new URL(databaseUrl);
    return (
      ['localhost', '127.0.0.1'].includes(parsed.hostname) &&
      parsed.pathname.replace(/^\//, '') === 'listify_local'
    );
  } catch {
    return false;
  }
}

if (process.env.NODE_ENV === 'test' && isLocalAcceptanceDatabase(process.env.DATABASE_URL)) {
  process.env.NODE_ENV = 'development';
}

const hasDb = Boolean(process.env.DATABASE_URL);
const describeWithDb: typeof describe = hasDb
  ? describe
  : (((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL)`, fn)) as typeof describe);

const created = { userId: 0, propertyId: 0, cachePrefix: '' };

function insertId(result: any) {
  return Number(result?.insertId || result?.[0]?.insertId || 0);
}

afterEach(async () => {
  if (!hasDb) return;
  const db = await getDb();
  if (!db) return;

  if (created.cachePrefix) {
    await db
      .delete(locationSearchCache)
      .where(like(locationSearchCache.searchQuery, `${created.cachePrefix}%`));
  }
  if (created.propertyId) await db.delete(properties).where(eq(properties.id, created.propertyId));
  if (created.userId) await db.delete(users).where(eq(users.id, created.userId));

  Object.assign(created, { userId: 0, propertyId: 0, cachePrefix: '' });
});

describeWithDb('location search public-catalog fallback', () => {
  it('finds an active property city when the classic location tree has no match', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`.toLowerCase();
    const city = `Catalog City ${suffix}`;
    const province = `Catalog Province ${suffix}`;
    created.cachePrefix = `v2:${city}_all_`;

    const [userResult] = await db.insert(users).values({
      email: `catalog-location-${suffix}@example.com`,
      name: 'Catalog Location Owner',
      firstName: 'Catalog',
      lastName: 'Owner',
      phone: '+27110000002',
      role: 'agent',
      emailVerified: 1,
    } as any);
    created.userId = insertId(userResult);

    const [propertyResult] = await db.insert(properties).values({
      title: `Catalog location property ${suffix}`,
      description: 'A public property used to verify the catalog location-search fallback.',
      propertyType: 'house',
      listingType: 'sale',
      transactionType: 'sale',
      price: 2_000_000,
      area: 150,
      address: '1 Catalog Search Street',
      city,
      province,
      status: 'available',
      featured: 0,
      views: 0,
      enquiries: 0,
      ownerId: created.userId,
    } as any);
    created.propertyId = insertId(propertyResult);

    const caller = appRouter.createCaller({ req: { headers: {} }, res: {}, user: null } as any);
    const results = await caller.location.searchLocations({ query: city, type: 'all', limit: 10 });

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: city,
          type: 'city',
          provinceName: province,
        }),
      ]),
    );
  });
});
