import express from 'express';
import { createServer, type Server } from 'node:http';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import {
  developments,
  leads,
  unitTypes,
  users,
} from '../../drizzle/schema';
import { appRouter } from '../routers';
import { getDb } from '../db-connection';
import { registerLocalMediaRoutes } from '../_core/localMediaRoutes';
import { buildLocalMediaPublicUrl, createMediaStorageKey } from '../_core/mediaStorage';
import { createDeveloperMediaUploadReceipt } from '../services/developerMediaAuthority';
import {
  createDeveloperTestContext,
  deleteDeveloperTestContext,
  type DeveloperTestContext,
} from '../test-utils/developerTestContext';

const hasDb = Boolean(process.env.DATABASE_URL);
const describeWithDb: typeof describe = hasDb
  ? describe
  : (((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL)`, fn)) as typeof describe);

const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL0uQAAAABJRU5ErkJggg==',
  'base64',
);

type Fixture = {
  userId: number;
  context: DeveloperTestContext;
  developmentIds: number[];
};

const fixtures: Fixture[] = [];
let mediaServer: Server;
let mediaOrigin: string;

function callerFor(userId: number) {
  return appRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: { id: userId, role: 'property_developer' },
  } as any);
}

async function createFixture(label: string): Promise<Fixture> {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed.');
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const email = `b06-media-${label}-${suffix}@example.com`;
  const [userResult] = await db.insert(users).values({
    email,
    name: `B06 ${label} Media Owner`,
    firstName: 'B06',
    lastName: label,
    role: 'property_developer',
    emailVerified: 1,
  });
  const userId = Number(userResult.insertId);
  const context = await createDeveloperTestContext({
    userId,
    name: `B06 ${label} Media Developer`,
    email,
  });
  const fixture = { userId, context, developmentIds: [] };
  fixtures.push(fixture);
  return fixture;
}

async function uploadThroughLocalRoute(reservation: { uploadUrl: string }, body = onePixelPng) {
  const response = await fetch(`${mediaOrigin}${reservation.uploadUrl}`, {
    method: 'PUT',
    headers: { 'content-type': 'image/png' },
    body,
  });
  expect(response.status).toBe(200);
}

async function reserveUploadAndConfirm(
  caller: ReturnType<typeof callerFor>,
  input: {
    category: 'development_image' | 'unit_gallery';
    developmentId?: number;
    unitId?: string;
    filename?: string;
  },
) {
  const reservation = await caller.developer.reserveMediaUpload({
    filename: input.filename ?? `${input.category}-${Date.now()}.png`,
    contentType: 'image/png',
    category: input.category,
    ...(input.developmentId ? { developmentId: input.developmentId } : {}),
    ...(input.unitId ? { unitId: input.unitId } : {}),
  });
  await uploadThroughLocalRoute(reservation);
  return caller.developer.confirmMediaUpload({ uploadReceipt: reservation.uploadReceipt });
}

function developmentInput(name: string, images: unknown[]) {
  return {
    name,
    developmentType: 'residential' as const,
    transactionType: 'for_sale' as const,
    city: 'Johannesburg',
    province: 'Gauteng',
    suburb: 'Berea',
    address: '1 B06 Media Authority Road',
    status: 'selling',
    ownershipType: 'sectional-title',
    description: 'A complete Developer media authority fixture with legitimate residential inventory.',
    highlights: ['Secure estate', 'Close to transport', 'Energy efficient'],
    images,
    unitTypes: [
      {
        name: 'Two Bedroom Apartment',
        bedrooms: 2,
        bathrooms: 2,
        unitSize: 70,
        priceFrom: 1_200_000,
        totalUnits: 10,
        availableUnits: 10,
        parkingType: 'none',
        parkingBays: 0,
      },
    ],
  };
}

describeWithDb('B06 Developer confirmed media authority', () => {
  beforeAll(async () => {
    const app = express();
    registerLocalMediaRoutes(app);
    mediaServer = createServer(app);
    await new Promise<void>(resolve => mediaServer.listen(0, '127.0.0.1', resolve));
    const address = mediaServer.address();
    if (!address || typeof address === 'string') {
      throw new Error('Developer media test server did not expose a port.');
    }
    mediaOrigin = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      mediaServer.close(error => (error ? reject(error) : resolve())),
    );
  });

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;
    while (fixtures.length > 0) {
      const fixture = fixtures.pop()!;
      if (fixture.developmentIds.length > 0) {
        await db.delete(leads).where(eq(leads.developmentId, fixture.developmentIds[0]));
        await db.delete(unitTypes).where(eq(unitTypes.developmentId, fixture.developmentIds[0]));
        for (const developmentId of fixture.developmentIds) {
          await db.delete(developments).where(eq(developments.id, developmentId));
        }
      }
      await deleteDeveloperTestContext(fixture.context);
      await db.delete(users).where(eq(users.id, fixture.userId));
    }
  });

  it('requires reserve → actual upload → confirm → owned attachment and preserves authorised media on edit', async () => {
    const owner = await createFixture('owner');
    const other = await createFixture('other');
    const ownerCaller = callerFor(owner.userId);
    const otherCaller = callerFor(other.userId);

    const pending = await ownerCaller.developer.reserveMediaUpload({
      filename: 'unconfirmed.png',
      contentType: 'image/png',
      category: 'development_image',
    });
    await expect(
      ownerCaller.developer.createDevelopment(
        developmentInput('B06 Unconfirmed', [{ url: 'https://example.test/unconfirmed.png', uploadReceipt: pending.uploadReceipt }]),
      ),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    const confirmed = await reserveUploadAndConfirm(ownerCaller, { category: 'development_image' });
    const otherConfirmed = await reserveUploadAndConfirm(otherCaller, {
      category: 'development_image',
    });

    await expect(
      ownerCaller.developer.createDevelopment(
        developmentInput('B06 Foreign Receipt', [otherConfirmed]),
      ),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(
      ownerCaller.developer.createDevelopment(
        developmentInput('B06 Invented URL', [{ url: 'https://example.test/invented.png' }]),
      ),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(otherCaller.developer.confirmMediaUpload({ uploadReceipt: pending.uploadReceipt })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });

    const created = await ownerCaller.developer.createDevelopment({
      ...developmentInput('B06 Confirmed Media Development', [confirmed]),
      // Client ownership claims must be ignored before the write boundary.
      cataloguePublisherId: other.context.cataloguePublisherId,
      developerId: other.context.organisationId,
      ownerType: 'platform',
    });
    const developmentId = Number(created.development.id);
    owner.developmentIds.push(developmentId);

    const db = await getDb();
    if (!db) throw new Error('Database connection failed.');
    const [persisted] = await db
      .select({ images: developments.images, cataloguePublisherId: developments.cataloguePublisherId })
      .from(developments)
      .where(eq(developments.id, developmentId));
    const persistedImages = JSON.parse(String(persisted.images));
    expect(persisted).toMatchObject({ cataloguePublisherId: owner.context.cataloguePublisherId });
    expect(persistedImages).toEqual([
      expect.objectContaining({
        url: confirmed.url,
        storageKey: confirmed.key,
        mediaReceipt: confirmed.uploadReceipt,
      }),
    ]);

    await ownerCaller.developer.updateDevelopment({
      id: developmentId,
      data: { images: persistedImages },
    });
    const [retained] = await db
      .select({ images: developments.images })
      .from(developments)
      .where(eq(developments.id, developmentId));
    expect(JSON.parse(String(retained.images))).toEqual(persistedImages);
  });

  it('binds unit gallery media to the owned development and persisted unit while denying foreign scopes', async () => {
    const owner = await createFixture('unit-owner');
    const other = await createFixture('unit-other');
    const ownerCaller = callerFor(owner.userId);
    const otherCaller = callerFor(other.userId);
    const hero = await reserveUploadAndConfirm(ownerCaller, { category: 'development_image' });
    const created = await ownerCaller.developer.createDevelopment(
      developmentInput('B06 Unit Media Development', [hero]),
    );
    const developmentId = Number(created.development.id);
    owner.developmentIds.push(developmentId);

    const db = await getDb();
    if (!db) throw new Error('Database connection failed.');
    const [unit] = await db
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, developmentId))
      .limit(1);
    if (!unit) throw new Error('Expected a persisted unit type.');

    const unitGallery = await reserveUploadAndConfirm(ownerCaller, {
      category: 'unit_gallery',
      developmentId,
      unitId: unit.id,
    });
    await ownerCaller.developer.updateDevelopment({
      id: developmentId,
      data: {
        unitTypes: [
          {
            id: unit.id,
            name: unit.name,
            bedrooms: unit.bedrooms,
            bathrooms: Number(unit.bathrooms),
            unitSize: unit.unitSize,
            priceFrom: Number(unit.priceFrom),
            totalUnits: unit.totalUnits,
            availableUnits: unit.availableUnits,
            reservedUnits: unit.reservedUnits,
            parkingType: unit.parkingType || 'none',
            parkingBays: unit.parkingBays,
            baseMedia: { gallery: [unitGallery], floorPlans: [] },
          },
        ],
      },
    });
    const [updatedUnit] = await db.select().from(unitTypes).where(eq(unitTypes.id, unit.id));
    const baseMedia = JSON.parse(String(updatedUnit.baseMedia));
    expect(baseMedia.gallery).toEqual([
      expect.objectContaining({ storageKey: unitGallery.key, mediaReceipt: unitGallery.uploadReceipt }),
    ]);

    await expect(
      otherCaller.developer.reserveMediaUpload({
        filename: 'foreign-development.png',
        contentType: 'image/png',
        category: 'unit_gallery',
        developmentId,
        unitId: unit.id,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });

    const otherHero = await reserveUploadAndConfirm(otherCaller, { category: 'development_image' });
    const otherDevelopment = await otherCaller.developer.createDevelopment(
      developmentInput('B06 Other Unit Development', [otherHero]),
    );
    const otherDevelopmentId = Number(otherDevelopment.development.id);
    other.developmentIds.push(otherDevelopmentId);
    const [otherUnit] = await db
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, otherDevelopmentId))
      .limit(1);
    if (!otherUnit) throw new Error('Expected an unrelated persisted unit type.');

    await expect(
      ownerCaller.developer.reserveMediaUpload({
        filename: 'foreign-unit.png',
        contentType: 'image/png',
        category: 'unit_gallery',
        developmentId,
        unitId: otherUnit.id,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('rejects missing and expired confirmed receipts at the shared development write boundary', async () => {
    const owner = await createFixture('missing-object');
    const ownerCaller = callerFor(owner.userId);
    const missingKey = createMediaStorageKey(`missing-${Date.now()}.png`, `draft-${owner.userId}`);
    const missingReceipt = createDeveloperMediaUploadReceipt({
      key: missingKey,
      mediaType: 'image',
      contentType: 'image/png',
      fileName: 'missing.png',
      userId: owner.userId,
      organisationId: owner.context.organisationId,
      publisherId: owner.context.cataloguePublisherId,
      developmentId: null,
      unitId: null,
      category: 'development_image',
      fileSize: onePixelPng.length,
      confirmed: true,
    });
    const expiredReceipt = createDeveloperMediaUploadReceipt(
      {
        key: createMediaStorageKey(`expired-${Date.now()}.png`, `draft-${owner.userId}`),
        mediaType: 'image',
        contentType: 'image/png',
        fileName: 'expired.png',
        userId: owner.userId,
        organisationId: owner.context.organisationId,
        publisherId: owner.context.cataloguePublisherId,
        developmentId: null,
        unitId: null,
        category: 'development_image',
        fileSize: onePixelPng.length,
        confirmed: true,
      },
      { now: 1_000, ttlSeconds: 1 },
    );

    await expect(
      ownerCaller.developer.createDevelopment(
        developmentInput('B06 Missing Object', [
          { url: buildLocalMediaPublicUrl(missingKey), storageKey: missingKey, uploadReceipt: missingReceipt },
        ]),
      ),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(
      ownerCaller.developer.createDevelopment(
        developmentInput('B06 Expired Receipt', [
          { url: 'https://example.test/expired.png', uploadReceipt: expiredReceipt },
        ]),
      ),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});
