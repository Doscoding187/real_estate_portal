import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import express from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTRPCProxyClient, httpLink } from '@trpc/client';
import superjson from 'superjson';
import { and, eq } from 'drizzle-orm';

import { COOKIE_NAME } from '../../shared/const';
import type { AppRouter } from '../routers';
import {
  agencies,
  agencyAgentMemberships,
  agencyBranding,
  agents,
  invitations,
  listingAnalytics,
  listingApprovalQueue,
  listingMedia,
  listings,
  cities,
  provinces,
  properties,
  suburbs,
  users,
} from '../../drizzle/schema';
import { authService } from '../_core/auth';
import { createContext } from '../_core/context';
import { ENV } from '../_core/env';
import { registerLocalMediaRoutes } from '../_core/localMediaRoutes';
import { db } from '../db';
import { appRouter } from '../routers';

const describeWithDb: typeof describe = process.env.DATABASE_URL
  ? describe
  : (((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL disposable DB)`, fn)) as typeof describe);

const priorJwtSecret = vi.hoisted(() => {
  const prior = process.env.JWT_SECRET;
  if (!prior) process.env.JWT_SECRET = 'agency-listing-preparation-test-secret';
  return prior;
});

const priorMediaAdapter = ENV.mediaStorageAdapter;
const priorMediaDirectory = ENV.mediaLocalStorageDir;

type FixtureUser = { id: number; email: string; name: string; sessionVersion: number };

const created = {
  agencyId: 0,
  ownerId: 0,
  memberId: 0,
  outsiderId: 0,
  agentId: 0,
  listingId: 0,
};

let mediaRoot = '';
let server: Server | null = null;
let baseUrl = '';

function insertId(result: unknown): number {
  const entry = Array.isArray(result)
    ? (result[0] as { insertId?: unknown } | undefined)
    : (result as { insertId?: unknown } | undefined);
  const value = Number(entry?.insertId ?? 0);
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}

function trpcClient(cookie: string) {
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpLink({
        url: `${baseUrl}/api/trpc`,
        transformer: superjson,
        headers: () => ({
          cookie,
          'x-request-id': `agency-listing-preparation-${randomUUID()}`,
        }),
      }),
    ],
  });
}

async function sessionCookie(userId: number): Promise<string> {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      sessionVersion: users.sessionVersion,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user?.email) throw new Error(`Missing fixture user ${userId}.`);
  const token = await authService.createSessionToken(
    Number(user.id),
    user.email,
    user.name || user.email,
    Number(user.sessionVersion),
  );
  return `${COOKIE_NAME}=${token}`;
}

async function insertUser(label: string, role: 'visitor' | 'agency_admin'): Promise<FixtureUser> {
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const email = `${label.toLowerCase()}-${suffix}@example.test`;
  const name = `${label} ${suffix}`;
  const [result] = await db.insert(users).values({
    email,
    name,
    firstName: label,
    lastName: 'Fixture',
    phone: '+27115550123',
    role,
    emailVerified: 1,
    sessionVersion: 1,
    isSubaccount: role === 'agency_admin' ? 0 : 1,
  } satisfies typeof users.$inferInsert);
  const id = insertId(result);
  if (!id) throw new Error(`Could not create ${label} fixture user.`);
  return { id, email, name, sessionVersion: 1 };
}

async function canonicalSandtonLocation() {
  const [location] = await db
    .select({ provinceId: provinces.id, cityId: cities.id, suburbId: suburbs.id })
    .from(provinces)
    .innerJoin(cities, eq(cities.provinceId, provinces.id))
    .innerJoin(suburbs, eq(suburbs.cityId, cities.id))
    .where(
      and(
        eq(provinces.slug, 'gauteng'),
        eq(cities.slug, 'johannesburg'),
        eq(suburbs.slug, 'sandton'),
      ),
    )
    .limit(1);
  if (!location) throw new Error('Canonical Gauteng/Johannesburg/Sandton data is required.');
  return location;
}

async function cleanup() {
  if (!process.env.DATABASE_URL) return;

  if (created.listingId) {
    await db.delete(listingMedia).where(eq(listingMedia.listingId, created.listingId));
    await db
      .delete(listingApprovalQueue)
      .where(eq(listingApprovalQueue.listingId, created.listingId));
    await db.delete(listingAnalytics).where(eq(listingAnalytics.listingId, created.listingId));
    await db.delete(properties).where(eq(properties.sourceListingId, created.listingId));
    await db.delete(listings).where(eq(listings.id, created.listingId));
  }
  if (created.agentId) {
    await db
      .delete(agencyAgentMemberships)
      .where(eq(agencyAgentMemberships.agentId, created.agentId));
    await db.delete(agents).where(eq(agents.id, created.agentId));
  }
  if (created.agencyId) {
    await db.delete(agencyBranding).where(eq(agencyBranding.agencyId, created.agencyId));
    await db.delete(invitations).where(eq(invitations.agencyId, created.agencyId));
  }
  if (created.outsiderId) await db.delete(users).where(eq(users.id, created.outsiderId));
  if (created.memberId) await db.delete(users).where(eq(users.id, created.memberId));
  if (created.ownerId) await db.delete(users).where(eq(users.id, created.ownerId));
  if (created.agencyId) await db.delete(agencies).where(eq(agencies.id, created.agencyId));
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL) return;

  mediaRoot = await mkdtemp(`${tmpdir()}/property-listify-agency-media-`);
  vi.stubEnv('MEDIA_STORAGE_ADAPTER', 'local');
  vi.stubEnv('MEDIA_LOCAL_STORAGE_DIR', mediaRoot);
  vi.stubEnv('MEDIA_UPLOAD_TOKEN_SECRET', 'agency-listing-preparation-media-secret');
  ENV.mediaStorageAdapter = 'local';
  ENV.mediaLocalStorageDir = mediaRoot;

  const app = express();
  registerLocalMediaRoutes(app);
  app.use(express.json({ limit: '50mb' }));
  app.use(
    '/api/trpc',
    (await import('@trpc/server/adapters/express')).createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );
  server = createServer(app);
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Acceptance server has no address.');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) =>
      server!.close(error => (error ? reject(error) : resolve())),
    );
  }
  await cleanup();
  if (mediaRoot) await rm(mediaRoot, { recursive: true, force: true });
  ENV.mediaStorageAdapter = priorMediaAdapter;
  ENV.mediaLocalStorageDir = priorMediaDirectory;
  vi.unstubAllEnvs();
  if (priorJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = priorJwtSecret;
});

describeWithDb('agency listing preparation acceptance', () => {
  it('creates a real private draft with confirmed media/geography and denies publication before activation', async () => {
    const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const [agencyResult] = await db.insert(agencies).values({
      name: `Preparation Agency ${suffix}`,
      slug: `preparation-agency-${suffix}`,
      email: `preparation-agency-${suffix}@example.test`,
      city: 'Johannesburg',
      province: 'Gauteng',
      subscriptionPlan: 'free',
      subscriptionStatus: 'pending_payment',
      isVerified: 1,
    } satisfies typeof agencies.$inferInsert);
    created.agencyId = insertId(agencyResult);
    if (!created.agencyId) throw new Error('Could not create agency fixture.');

    const owner = await insertUser('PreparationOwner', 'agency_admin');
    const member = await insertUser('PreparationMember', 'visitor');
    created.ownerId = owner.id;
    created.memberId = member.id;
    await db
      .update(users)
      .set({ agencyId: created.agencyId, isSubaccount: 0 })
      .where(eq(users.id, owner.id));
    await db.insert(agencyBranding).values({
      agencyId: created.agencyId,
      companyName: `Preparation Agency ${suffix}`,
      primaryColor: '#0f766e',
      secondaryColor: '#334155',
      isEnabled: 1,
    } satisfies typeof agencyBranding.$inferInsert);

    const invitationToken = `preparation-${randomUUID()}`;
    await db.insert(invitations).values({
      agencyId: created.agencyId,
      invitedBy: owner.id,
      email: member.email,
      role: 'agent',
      token: invitationToken,
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' '),
    } satisfies typeof invitations.$inferInsert);

    const preAccept = trpcClient(await sessionCookie(member.id));
    await expect(preAccept.invitation.accept.mutate({ token: invitationToken })).resolves.toEqual({
      success: true,
    });

    const [agent] = await db
      .select({ id: agents.id, status: agents.status, agencyId: agents.agencyId })
      .from(agents)
      .where(eq(agents.userId, member.id))
      .limit(1);
    if (!agent) throw new Error('Canonical invitation acceptance did not create an agent profile.');
    created.agentId = Number(agent.id);
    expect(agent).toMatchObject({ status: 'approved', agencyId: created.agencyId });

    const memberApi = trpcClient(await sessionCookie(member.id));
    const ownerApi = trpcClient(await sessionCookie(owner.id));
    const outsider = await insertUser('PreparationOutsider', 'visitor');
    created.outsiderId = outsider.id;
    const outsiderApi = trpcClient(await sessionCookie(outsider.id));

    const location = await canonicalSandtonLocation();
    const mediaManifest: Array<{
      id: string;
      mediaType: 'image';
      uploadToken: string;
      fileName: string;
      fileSize: number;
    }> = [];

    for (let index = 0; index < 5; index += 1) {
      const fileName = `agency-home-${index + 1}.png`;
      const reservation = await memberApi.listing.uploadMedia.mutate({
        type: 'image',
        filename: fileName,
        contentType: 'image/png',
      });
      const body = Buffer.from(`agency-listing-media-${index + 1}-${suffix}`);
      const uploadResponse = await fetch(`${baseUrl}${reservation.uploadUrl}`, {
        method: 'PUT',
        headers: { 'content-type': 'image/png', 'content-length': String(body.length) },
        body,
      });
      expect(uploadResponse.status).toBe(200);

      const confirmed = await memberApi.listing.confirmMediaUpload.mutate({
        uploadToken: reservation.uploadToken,
      });
      expect(confirmed).toMatchObject({ mediaId: reservation.mediaId, fileSize: body.length });
      mediaManifest.push({
        id: reservation.mediaId,
        mediaType: 'image',
        uploadToken: confirmed.uploadToken,
        fileName,
        fileSize: body.length,
      });
    }

    const description =
      'A carefully prepared family home in Sandton with verified private address details, clear pricing, and enough context for a reviewer to assess the inventory before commercial activation.';
    const propertyDetails = {
      corePropertyInformation: {
        version: 1,
        bedrooms: { status: 'known', value: 3 },
        bathrooms: { status: 'known', value: 2 },
        internalArea: { status: 'known', valueM2: 180, unit: 'm2' },
        erfArea: { status: 'known', valueM2: 620, unit: 'm2' },
      },
    };
    const listingInput = {
      action: 'sell' as const,
      propertyType: 'house' as const,
      title: `Private Sandton family home ${suffix}`,
      description,
      pricing: { askingPrice: 2_450_000, negotiability: 'not_negotiable' as const },
      propertyDetails,
      location: {
        address: '18 Example Avenue',
        latitude: -26.1076,
        longitude: 28.0567,
        city: 'Johannesburg',
        suburb: 'Sandton',
        province: 'Gauteng',
        postalCode: '2196',
        provinceId: Number(location.provinceId),
        cityId: Number(location.cityId),
        suburbId: Number(location.suburbId),
        privateAddress: {
          streetNumber: '18',
          streetName: 'Example Avenue',
          postalCode: '2196',
        },
        coordinateSource: 'manual_confirmed' as const,
        locationConfirmationState: 'confirmed' as const,
        publicLocationPrecision: 'approximate' as const,
      },
      mediaIds: mediaManifest.map(item => item.id),
      mainMediaId: mediaManifest[0].id,
      media: mediaManifest,
    };

    const createdListing = await memberApi.listing.create.mutate(listingInput);
    created.listingId = Number(createdListing.id);
    expect(createdListing).toMatchObject({ id: created.listingId, status: 'draft' });

    const [stored] = await db
      .select({
        id: listings.id,
        ownerId: listings.ownerId,
        agentId: listings.agentId,
        agencyId: listings.agencyId,
        status: listings.status,
        approvalStatus: listings.approvalStatus,
        provinceId: listings.provinceId,
        cityId: listings.cityId,
        suburbId: listings.suburbId,
        locationConfirmationState: listings.locationConfirmationState,
        coordinateSource: listings.coordinateSource,
      })
      .from(listings)
      .where(eq(listings.id, created.listingId))
      .limit(1);
    expect(stored).toMatchObject({
      id: created.listingId,
      ownerId: member.id,
      agentId: created.agentId,
      agencyId: created.agencyId,
      status: 'draft',
      approvalStatus: 'pending',
      provinceId: Number(location.provinceId),
      cityId: Number(location.cityId),
      suburbId: Number(location.suburbId),
      locationConfirmationState: 'confirmed',
      coordinateSource: 'manual_confirmed',
    });

    const mediaRows = await db
      .select({
        originalUrl: listingMedia.originalUrl,
        processingStatus: listingMedia.processingStatus,
      })
      .from(listingMedia)
      .where(eq(listingMedia.listingId, created.listingId));
    expect(mediaRows).toHaveLength(5);
    expect(mediaRows.every(row => row.processingStatus === 'completed')).toBe(true);

    const delivered = await fetch(
      `${baseUrl}/api/local-media/object?key=${encodeURIComponent(mediaManifest[0].id)}`,
    );
    expect(delivered.status).toBe(200);
    expect(await delivered.text()).toContain(`agency-listing-media-1-${suffix}`);

    const reopened = await memberApi.listing.getById.query({ id: created.listingId });
    expect(reopened?.property).toMatchObject({
      id: created.listingId,
      title: listingInput.title,
      status: 'draft',
      agencyId: created.agencyId,
    });
    expect(reopened?.media).toHaveLength(5);

    await memberApi.listing.update.mutate({
      id: created.listingId,
      title: `Updated private Sandton family home ${suffix}`,
      description,
    });
    const reopenedAfterEdit = await memberApi.listing.getById.query({ id: created.listingId });
    expect(reopenedAfterEdit?.property.title).toBe(`Updated private Sandton family home ${suffix}`);

    await expect(
      outsiderApi.listing.getById.query({ id: created.listingId }),
    ).rejects.toMatchObject({
      data: { code: 'FORBIDDEN' },
    });
    await expect(
      outsiderApi.listing.uploadMedia.mutate({
        listingId: created.listingId,
        type: 'image',
        filename: 'foreign.png',
        contentType: 'image/png',
      }),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });

    await expect(
      memberApi.listing.submitForReview.mutate({ listingId: created.listingId }),
    ).rejects.toMatchObject({
      data: { code: 'PRECONDITION_FAILED' },
    });
    const [stillPrivate] = await db
      .select({ status: listings.status, approvalStatus: listings.approvalStatus })
      .from(listings)
      .where(eq(listings.id, created.listingId))
      .limit(1);
    expect(stillPrivate).toEqual({ status: 'draft', approvalStatus: 'pending' });
    expect(
      await db
        .select({ id: properties.id })
        .from(properties)
        .where(eq(properties.sourceListingId, created.listingId)),
    ).toEqual([]);

    // The agency owner has workspace visibility, but the agent remains the
    // listing's canonical content custodian. This prevents a broad tenant
    // shortcut from being mistaken for member ownership.
    await expect(ownerApi.listing.getById.query({ id: created.listingId })).resolves.toMatchObject({
      property: { id: created.listingId },
    });
  }, 60_000);
});
