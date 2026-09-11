import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { listingApprovalQueue, listingAnalytics, listingMedia, listings, users } from '../../drizzle/schema';
import { appRouter } from '../routers';
import { createListing, getDb } from '../db';
import { createListingMediaUploadToken } from '../services/listingMediaAuthority';

const describeDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeDatabase('listing media tenant boundary', () => {
  let ownerId = 0;
  let outsiderId = 0;
  let listingId = 0;

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;
    if (listingId) {
      await db.delete(listingMedia).where(eq(listingMedia.listingId, listingId));
      await db.delete(listingApprovalQueue).where(eq(listingApprovalQueue.listingId, listingId));
      await db.delete(listingAnalytics).where(eq(listingAnalytics.listingId, listingId));
      await db.delete(listings).where(eq(listings.id, listingId));
    }
    if (outsiderId) await db.delete(users).where(eq(users.id, outsiderId));
    if (ownerId) await db.delete(users).where(eq(users.id, ownerId));
    ownerId = 0;
    outsiderId = 0;
    listingId = 0;
  });

  it('denies an unrelated user before issuing a listing media reservation', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const suffix = randomUUID();

    const [ownerInsert] = await db.insert(users).values({
      email: `media-owner-${suffix}@invalid.example`,
      name: 'Media Owner',
      role: 'agent',
      emailVerified: 1,
    } as any);
    ownerId = Number(ownerInsert.insertId);
    const [outsiderInsert] = await db.insert(users).values({
      email: `media-outsider-${suffix}@invalid.example`,
      name: 'Media Outsider',
      role: 'agent',
      emailVerified: 1,
    } as any);
    outsiderId = Number(outsiderInsert.insertId);

    listingId = await createListing({
      userId: ownerId,
      action: 'sell',
      propertyType: 'house',
      title: `Tenant boundary listing ${suffix}`,
      description: 'Listing used for physical media custody proof.',
      pricing: { askingPrice: 1_500_000 },
      propertyDetails: { bedrooms: 3, bathrooms: 2, houseAreaM2: 140 },
      address: '1 Tenant Boundary Street',
      latitude: -26.1076,
      longitude: 28.0567,
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2001',
      placeId: null,
      slug: `tenant-boundary-${suffix}`,
      media: [],
    });

    const outsider = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: outsiderId, email: `media-outsider-${suffix}@invalid.example`, role: 'agent' },
    } as any);

    await expect(
      outsider.listing.uploadMedia({
        listingId,
        type: 'image',
        filename: 'unauthorized.jpg',
        contentType: 'image/jpeg',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    const mediaRows = await db
      .select({ id: listingMedia.id })
      .from(listingMedia)
      .where(eq(listingMedia.listingId, listingId));
    expect(mediaRows).toHaveLength(0);
  }, 30_000);

  it('rejects confirmation when the listing is deleted after token issuance', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const suffix = randomUUID();

    const [ownerInsert] = await db.insert(users).values({
      email: `media-delete-owner-${suffix}@invalid.example`,
      name: 'Media Delete Owner',
      role: 'agent',
      emailVerified: 1,
    } as any);
    ownerId = Number(ownerInsert.insertId);

    listingId = await createListing({
      userId: ownerId,
      action: 'sell',
      propertyType: 'house',
      title: `Deleted listing ${suffix}`,
      description: 'Listing used for token invalidation proof.',
      pricing: { askingPrice: 1_500_000 },
      propertyDetails: { bedrooms: 3, bathrooms: 2, houseAreaM2: 140 },
      address: '2 Deleted Listing Street',
      latitude: -26.1076,
      longitude: 28.0567,
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2001',
      placeId: null,
      slug: `deleted-listing-${suffix}`,
      media: [],
    });

    const token = createListingMediaUploadToken({
      key: `properties/${listingId}/expired.jpg`,
      mediaType: 'image',
      contentType: 'image/jpeg',
      fileName: 'expired.jpg',
      userId: ownerId,
      listingId,
    });

    await db.delete(listingAnalytics).where(eq(listingAnalytics.listingId, listingId));
    await db.delete(listingApprovalQueue).where(eq(listingApprovalQueue.listingId, listingId));
    await db.delete(listingMedia).where(eq(listingMedia.listingId, listingId));
    await db.delete(listings).where(eq(listings.id, listingId));
    listingId = 0;

    const owner = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: ownerId, email: `media-delete-owner-${suffix}@invalid.example`, role: 'agent' },
    } as any);

    await expect(owner.listing.confirmMediaUpload({ uploadToken: token })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  }, 30_000);

  it('rejects confirmation when listing custody is reassigned after token issuance', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const suffix = randomUUID();

    const [ownerInsert] = await db.insert(users).values({
      email: `media-reassigned-owner-${suffix}@invalid.example`,
      name: 'Media Reassigned Owner',
      role: 'agent',
      emailVerified: 1,
    } as any);
    ownerId = Number(ownerInsert.insertId);
    const [newOwnerInsert] = await db.insert(users).values({
      email: `media-reassigned-new-owner-${suffix}@invalid.example`,
      name: 'Media Reassigned New Owner',
      role: 'agent',
      emailVerified: 1,
    } as any);
    outsiderId = Number(newOwnerInsert.insertId);

    listingId = await createListing({
      userId: ownerId,
      action: 'sell',
      propertyType: 'house',
      title: `Reassigned listing ${suffix}`,
      description: 'Listing used for reassignment token invalidation proof.',
      pricing: { askingPrice: 1_500_000 },
      propertyDetails: { bedrooms: 3, bathrooms: 2, houseAreaM2: 140 },
      address: '3 Reassigned Listing Street',
      latitude: -26.1076,
      longitude: 28.0567,
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2001',
      placeId: null,
      slug: `reassigned-listing-${suffix}`,
      media: [],
    });

    const token = createListingMediaUploadToken({
      key: `properties/${listingId}/reassigned.jpg`,
      mediaType: 'image',
      contentType: 'image/jpeg',
      fileName: 'reassigned.jpg',
      userId: ownerId,
      listingId,
    });

    await db.update(listings).set({ ownerId: outsiderId, agentId: null, agencyId: null } as any)
      .where(eq(listings.id, listingId));

    const owner = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: ownerId, email: `media-reassigned-owner-${suffix}@invalid.example`, role: 'agent' },
    } as any);

    await expect(owner.listing.confirmMediaUpload({ uploadToken: token })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  }, 30_000);
});
