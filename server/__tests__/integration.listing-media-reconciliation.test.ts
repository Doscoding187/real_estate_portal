import path from 'node:path';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import { afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import {
  listingAnalytics,
  listingApprovalQueue,
  listingMedia,
  listings,
  users,
} from '../../drizzle/schema';
import { createListing, getDb, replaceListingMedia } from '../db';

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

const created = { userId: 0, listingId: 0 };

function insertId(result: any) {
  return Number(result?.insertId || result?.[0]?.insertId || 0);
}

afterEach(async () => {
  if (!hasDb) return;
  const db = await getDb();
  if (!db) return;

  if (created.listingId) {
    await db.delete(listingMedia).where(eq(listingMedia.listingId, created.listingId));
    await db.delete(listingApprovalQueue).where(eq(listingApprovalQueue.listingId, created.listingId));
    await db.delete(listingAnalytics).where(eq(listingAnalytics.listingId, created.listingId));
    await db.delete(listings).where(eq(listings.id, created.listingId));
  }
  if (created.userId) await db.delete(users).where(eq(users.id, created.userId));

  Object.assign(created, { userId: 0, listingId: 0 });
});

describeWithDb('listing media reconciliation', () => {
  it('retains explicit media, removes omitted media, and preserves video type and primary order', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;

    const [userResult] = await db.insert(users).values({
      email: `listing-media-${suffix}@example.com`,
      name: 'Listing Media Owner',
      firstName: 'Listing',
      lastName: 'Media',
      phone: '+27110000001',
      role: 'agent',
      emailVerified: 1,
    } as any);
    created.userId = insertId(userResult);

    created.listingId = await createListing({
      userId: created.userId,
      action: 'sell',
      propertyType: 'house',
      title: `Media reconciliation home ${suffix}`,
      description: 'A complete listing used to verify canonical listing media reconciliation.',
      pricing: { askingPrice: 2_500_000 },
      propertyDetails: { bedrooms: 3, bathrooms: 2, houseAreaM2: 180 },
      address: '1 Listing Media Street',
      latitude: -26.1076,
      longitude: 28.0567,
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2001',
      placeId: null,
      slug: `listing-media-home-${suffix}`.replace(/[^a-z0-9-]/g, '-'),
      media: [
        {
          url: `uploads/listings/${suffix}/front.jpg`,
          type: 'image',
          displayOrder: 0,
          isPrimary: true,
          processingStatus: 'completed',
        },
        {
          url: `uploads/listings/${suffix}/tour.mp4`,
          type: 'video',
          displayOrder: 1,
          isPrimary: false,
          processingStatus: 'completed',
        },
      ],
    });

    const initialMedia = await db
      .select()
      .from(listingMedia)
      .where(eq(listingMedia.listingId, created.listingId));
    const front = initialMedia.find(item => item.mediaType === 'image');
    const tour = initialMedia.find(item => item.mediaType === 'video');
    expect(front).toBeDefined();
    expect(tour).toBeDefined();

    const kitchenKey = `uploads/listings/${suffix}/kitchen.jpg`;
    await replaceListingMedia(
      created.listingId,
      [
        {
          id: kitchenKey,
          mediaType: 'image',
          fileName: 'kitchen.jpg',
          processingStatus: 'completed',
        },
        {
          id: `existing:${tour!.id}`,
          mediaType: 'video',
        },
      ],
      kitchenKey,
    );

    const reconciled = await db
      .select()
      .from(listingMedia)
      .where(eq(listingMedia.listingId, created.listingId))
      .orderBy(listingMedia.displayOrder);

    expect(reconciled).toHaveLength(2);
    expect(reconciled.find(item => item.id === front!.id)).toBeUndefined();
    expect(reconciled).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          originalUrl: kitchenKey,
          mediaType: 'image',
          displayOrder: 0,
          isPrimary: 1,
        }),
        expect.objectContaining({
          id: tour!.id,
          mediaType: 'video',
          displayOrder: 1,
          isPrimary: 0,
        }),
      ]),
    );
  });
});
