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
import { encodeCanonicalLocationId } from '../../shared/locationAuthority';
import type { AppRouter } from '../routers';
import {
  agencies,
  agencyAgentMemberships,
  agencyBranding,
  agents,
  billableAccounts,
  invitations,
  listingAnalytics,
  listingApprovalQueue,
  listingMedia,
  listings,
  leadDeliveries,
  leads,
  plans,
  propertyImages,
  cities,
  provinces,
  properties,
  showings,
  suburbs,
  subscriptions,
  users,
} from '../../drizzle/schema';
import { authService } from '../_core/auth';
import { createContext } from '../_core/context';
import { ENV } from '../_core/env';
import { registerLocalMediaRoutes } from '../_core/localMediaRoutes';
import { db } from '../db';
import { appRouter } from '../routers';
import agentOnboardingRouter from '../routes/agentOnboarding';

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
  outsiderAgencyId: 0,
  ownerId: 0,
  memberId: 0,
  replacementId: 0,
  outsiderId: 0,
  reviewerId: 0,
  agentId: 0,
  replacementAgentId: 0,
  listingId: 0,
  leadId: 0,
  showingId: 0,
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

function dbTimestamp(value: Date): string {
  return value.toISOString().slice(0, 19).replace('T', ' ');
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

type AgentOnboardingStatus = {
  entitlements: {
    canReceiveLeads: boolean;
    canAccessExistingLeads: boolean;
  };
};

async function agentOnboardingStatus(userId: number): Promise<AgentOnboardingStatus> {
  const response = await fetch(`${baseUrl}/api/agent/onboarding-status`, {
    headers: { cookie: await sessionCookie(userId) },
  });
  expect(response.status).toBe(200);
  return (await response.json()) as AgentOnboardingStatus;
}

async function insertUser(
  label: string,
  role: 'visitor' | 'agency_admin' | 'super_admin',
): Promise<FixtureUser> {
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
    isSubaccount: role === 'agency_admin' || role === 'super_admin' ? 0 : 1,
  } satisfies typeof users.$inferInsert);
  const id = insertId(result);
  if (!id) throw new Error(`Could not create ${label} fixture user.`);
  return { id, email, name, sessionVersion: 1 };
}

async function createActiveAgencyLaunchAccess(agencyId: number, actorUserId: number) {
  const [plan] = await db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.name, 'agency_launch_access'))
    .limit(1);
  if (!plan) throw new Error('Canonical agency Launch Access reference data is unavailable.');

  const [accountResult] = await db.insert(billableAccounts).values({
    accountKind: 'agency',
    agencyId,
  } as any);
  const accountId = insertId(accountResult);
  if (!accountId) throw new Error('Could not create agency billable-account fixture.');

  const now = new Date();
  await db.insert(subscriptions).values({
    ownerType: 'agency',
    ownerId: agencyId,
    billableAccountId: accountId,
    planId: Number(plan.id),
    status: 'active',
    currentPeriodStart: dbTimestamp(now),
    currentPeriodEnd: dbTimestamp(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)),
    cancelAtPeriodEnd: 0,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  } as any);
  return Number(plan.id);
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

  // A lead's listing reference is intentionally RESTRICTed. Remove the
  // captured enquiry (and its delivery obligation history) before removing
  // the source listing.
  if (created.leadId) {
    if (created.showingId) {
      await db.delete(showings).where(eq(showings.id, created.showingId));
    }
    await db.delete(leads).where(eq(leads.id, created.leadId));
  }

  if (created.listingId) {
    await db.delete(listingMedia).where(eq(listingMedia.listingId, created.listingId));
    await db
      .delete(listingApprovalQueue)
      .where(eq(listingApprovalQueue.listingId, created.listingId));
    await db.delete(listingAnalytics).where(eq(listingAnalytics.listingId, created.listingId));
    const propertyRows = await db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.sourceListingId, created.listingId));
    for (const property of propertyRows) {
      await db.delete(propertyImages).where(eq(propertyImages.propertyId, Number(property.id)));
    }
    await db.delete(properties).where(eq(properties.sourceListingId, created.listingId));
    await db.delete(listings).where(eq(listings.id, created.listingId));
  }
  if (created.agencyId) {
    await db
      .delete(subscriptions)
      .where(
        and(eq(subscriptions.ownerType, 'agency'), eq(subscriptions.ownerId, created.agencyId)),
      );
    await db.delete(billableAccounts).where(eq(billableAccounts.agencyId, created.agencyId));
  }
  for (const agentId of [created.agentId, created.replacementAgentId].filter(Boolean)) {
    await db
      .delete(agencyAgentMemberships)
      .where(eq(agencyAgentMemberships.agentId, agentId));
    await db.delete(agents).where(eq(agents.id, agentId));
  }
  if (created.agencyId) {
    await db.delete(agencyBranding).where(eq(agencyBranding.agencyId, created.agencyId));
    await db.delete(invitations).where(eq(invitations.agencyId, created.agencyId));
  }
  if (created.outsiderId) await db.delete(users).where(eq(users.id, created.outsiderId));
  if (created.reviewerId) await db.delete(users).where(eq(users.id, created.reviewerId));
  if (created.replacementId) await db.delete(users).where(eq(users.id, created.replacementId));
  if (created.memberId) await db.delete(users).where(eq(users.id, created.memberId));
  if (created.ownerId) await db.delete(users).where(eq(users.id, created.ownerId));
  if (created.agencyId) await db.delete(agencies).where(eq(agencies.id, created.agencyId));
  if (created.outsiderAgencyId)
    await db.delete(agencies).where(eq(agencies.id, created.outsiderAgencyId));
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
  app.use('/api/agent', agentOnboardingRouter);
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

describeWithDb('agency listing publication lifecycle acceptance', () => {
  it('preserves review feedback, rechecks entitlement, and publishes one coherent agency projection', async () => {
    const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const [agencyResult] = await db.insert(agencies).values({
      name: `Publication Agency ${suffix}`,
      slug: `publication-agency-${suffix}`,
      email: `publication-agency-${suffix}@example.test`,
      city: 'Johannesburg',
      province: 'Gauteng',
      subscriptionPlan: 'free',
      subscriptionStatus: 'pending_payment',
      isVerified: 1,
    } satisfies typeof agencies.$inferInsert);
    created.agencyId = insertId(agencyResult);
    if (!created.agencyId) throw new Error('Could not create agency fixture.');

    const owner = await insertUser('PublicationOwner', 'agency_admin');
    const member = await insertUser('PublicationMember', 'visitor');
    const reviewer = await insertUser('PublicationReviewer', 'super_admin');
    created.ownerId = owner.id;
    created.memberId = member.id;
    created.reviewerId = reviewer.id;

    await db
      .update(users)
      .set({ agencyId: created.agencyId, isSubaccount: 0 })
      .where(eq(users.id, owner.id));
    await db.insert(agencyBranding).values({
      agencyId: created.agencyId,
      companyName: `Publication Agency ${suffix}`,
      primaryColor: '#0f766e',
      secondaryColor: '#334155',
      isEnabled: 1,
    } satisfies typeof agencyBranding.$inferInsert);
    await createActiveAgencyLaunchAccess(created.agencyId, owner.id);

    const invitationToken = `publication-${randomUUID()}`;
    await db.insert(invitations).values({
      agencyId: created.agencyId,
      invitedBy: owner.id,
      email: member.email,
      role: 'agent',
      token: invitationToken,
      status: 'pending',
      expiresAt: dbTimestamp(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    } satisfies typeof invitations.$inferInsert);

    const memberApi = trpcClient(await sessionCookie(member.id));
    const ownerApi = trpcClient(await sessionCookie(owner.id));
    const reviewerApi = trpcClient(await sessionCookie(reviewer.id));
    const publicApi = trpcClient('');
    await expect(memberApi.invitation.accept.mutate({ token: invitationToken })).resolves.toEqual({
      success: true,
    });

    const [agent] = await db
      .select({
        id: agents.id,
        userId: agents.userId,
        agencyId: agents.agencyId,
        status: agents.status,
        isVerified: agents.isVerified,
      })
      .from(agents)
      .where(eq(agents.userId, member.id))
      .limit(1);
    if (!agent) throw new Error('Canonical invitation acceptance did not create an agent profile.');
    created.agentId = Number(agent.id);
    expect(agent).toMatchObject({
      userId: member.id,
      agencyId: created.agencyId,
      status: 'approved',
      isVerified: 0,
    });

    const [individualSubscription] = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(and(eq(subscriptions.ownerType, 'agent'), eq(subscriptions.ownerId, member.id)))
      .limit(1);
    expect(individualSubscription).toBeUndefined();

    const location = await canonicalSandtonLocation();
    const canonicalSuburbId = encodeCanonicalLocationId('suburb', Number(location.suburbId));
    const mediaManifest: Array<{
      id: string;
      mediaType: 'image';
      uploadToken: string;
      fileName: string;
      fileSize: number;
    }> = [];
    for (let index = 0; index < 5; index += 1) {
      const fileName = `publication-home-${index + 1}.png`;
      const reservation = await memberApi.listing.uploadMedia.mutate({
        type: 'image',
        filename: fileName,
        contentType: 'image/png',
      });
      const body = Buffer.from(`publication-media-${index + 1}-${suffix}`);
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

    const title = `Reviewable Sandton family home ${suffix}`;
    const description =
      'A reviewable family home with verified private address details, clear pricing, and enough context for a reviewer to assess the agency inventory.';
    const listingInput = {
      action: 'sell' as const,
      propertyType: 'house' as const,
      title,
      description,
      pricing: { askingPrice: 2_450_000, negotiability: 'not_negotiable' as const },
      propertyDetails: {
        corePropertyInformation: {
          version: 1,
          bedrooms: { status: 'known', value: 3 },
          bathrooms: { status: 'known', value: 2 },
          internalArea: { status: 'known', valueM2: 180, unit: 'm2' },
          erfArea: { status: 'known', valueM2: 620, unit: 'm2' },
        },
      },
      location: {
        address: '18 Review Avenue',
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
          streetName: 'Review Avenue',
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

    // Submission is a real API lifecycle transition, and the reviewer queue is
    // the persisted handoff rather than a client-side status.
    await expect(
      memberApi.listing.submitForReview.mutate({ listingId: created.listingId }),
    ).resolves.toMatchObject({
      success: true,
      status: 'pending_review',
    });
    const [pending] = await db
      .select({ status: listings.status, approvalStatus: listings.approvalStatus })
      .from(listings)
      .where(eq(listings.id, created.listingId))
      .limit(1);
    expect(pending).toEqual({ status: 'pending_review', approvalStatus: 'pending' });
    const firstQueue = await reviewerApi.listing.getApprovalQueue.query({
      status: 'pending',
      limit: 50,
      offset: 0,
    });
    expect(firstQueue.some(item => Number(item.listingId) === created.listingId)).toBe(true);

    const outsider = await insertUser('PublicationOutsider', 'visitor');
    created.outsiderId = outsider.id;
    const outsiderApi = trpcClient(await sessionCookie(outsider.id));
    await expect(
      outsiderApi.listing.reject.mutate({ listingId: created.listingId, reason: 'forged review' }),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });

    // Give the unrelated principal a real, verified tenant so the lead scope
    // check proves isolation rather than relying only on a role rejection.
    const [outsiderAgencyResult] = await db.insert(agencies).values({
      name: `Unrelated Agency ${suffix}`,
      slug: `unrelated-agency-${suffix}`,
      email: `unrelated-agency-${suffix}@example.test`,
      city: 'Cape Town',
      province: 'Western Cape',
      subscriptionPlan: 'free',
      subscriptionStatus: 'pending_payment',
      isVerified: 1,
    } satisfies typeof agencies.$inferInsert);
    created.outsiderAgencyId = insertId(outsiderAgencyResult);
    if (!created.outsiderAgencyId) throw new Error('Could not create unrelated agency fixture.');
    await db
      .update(users)
      .set({ agencyId: created.outsiderAgencyId, role: 'agency_admin', isSubaccount: 0 })
      .where(eq(users.id, outsider.id));
    const unrelatedAgencyApi = trpcClient(await sessionCookie(outsider.id));

    await expect(
      reviewerApi.listing.reject.mutate({
        listingId: created.listingId,
        reason: 'Missing disclosure detail',
        reasons: ['disclosure', 'description'],
        note: 'Add the disclosure and clarify the property description before resubmission.',
      }),
    ).resolves.toEqual({ success: true });
    const [rejected] = await db
      .select({
        status: listings.status,
        approvalStatus: listings.approvalStatus,
        rejectionReason: listings.rejectionReason,
        rejectionReasons: listings.rejectionReasons,
        rejectionNote: listings.rejectionNote,
      })
      .from(listings)
      .where(eq(listings.id, created.listingId))
      .limit(1);
    expect(rejected).toMatchObject({
      status: 'rejected',
      approvalStatus: 'rejected',
      rejectionReason: 'Missing disclosure detail',
      rejectionReasons: JSON.stringify(['disclosure', 'description']),
      rejectionNote: 'Add the disclosure and clarify the property description before resubmission.',
    });
    const [rejectedQueue] = await db
      .select({
        status: listingApprovalQueue.status,
        rejectionReason: listingApprovalQueue.rejectionReason,
      })
      .from(listingApprovalQueue)
      .where(eq(listingApprovalQueue.listingId, created.listingId))
      .limit(1);
    expect(rejectedQueue).toMatchObject({
      status: 'rejected',
      rejectionReason: 'Missing disclosure detail',
    });

    const reopened = await memberApi.listing.getById.query({ id: created.listingId });
    expect(reopened?.property).toMatchObject({
      id: created.listingId,
      status: 'rejected',
      rejectionReason: 'Missing disclosure detail',
    });
    expect(reopened?.media).toHaveLength(5);

    await memberApi.listing.update.mutate({
      id: created.listingId,
      title: `${title} — corrected`,
      description: `${description} Disclosure details have been added for review.`,
    });
    const corrected = await memberApi.listing.getById.query({ id: created.listingId });
    expect(corrected?.property.title).toBe(`${title} — corrected`);
    await expect(
      memberApi.listing.submitForReview.mutate({ listingId: created.listingId }),
    ).resolves.toMatchObject({
      success: true,
      status: 'pending_review',
    });

    const queueAfterResubmission = await db
      .select({ id: listingApprovalQueue.id, status: listingApprovalQueue.status })
      .from(listingApprovalQueue)
      .where(eq(listingApprovalQueue.listingId, created.listingId));
    expect(queueAfterResubmission).toHaveLength(2);
    expect(queueAfterResubmission.map(row => row.status).sort()).toEqual(['pending', 'rejected']);

    // A review decision cannot race past an entitlement change. The fixture
    // changes only the isolated canonical row; no payment or activation route
    // is invoked by this acceptance test.
    await db
      .update(subscriptions)
      .set({ status: 'suspended' })
      .where(
        and(eq(subscriptions.ownerType, 'agency'), eq(subscriptions.ownerId, created.agencyId)),
      );
    await expect(
      reviewerApi.listing.approve.mutate({
        listingId: created.listingId,
        notes: 'should remain private',
      }),
    ).rejects.toMatchObject({ data: { code: 'PRECONDITION_FAILED' } });
    const [stillPending] = await db
      .select({ status: listings.status, approvalStatus: listings.approvalStatus })
      .from(listings)
      .where(eq(listings.id, created.listingId))
      .limit(1);
    expect(stillPending).toEqual({ status: 'pending_review', approvalStatus: 'pending' });
    expect(
      await db
        .select({ id: properties.id })
        .from(properties)
        .where(eq(properties.sourceListingId, created.listingId)),
    ).toEqual([]);

    const privateSearch = await publicApi.properties.searchPublicInventory.query({
      locationId: canonicalSuburbId,
      propertyType: 'house',
      listingType: 'sale',
      listingSource: 'manual',
      page: 0,
      pageSize: 50,
    });
    expect(privateSearch.locationState).toBe('resolved');
    expect(privateSearch.cards.some(card => card.title === `${title} — corrected`)).toBe(false);

    await expect(
      publicApi.properties.searchPublicInventory.query({
        locationId: canonicalSuburbId,
        city: 'johannesburg',
        propertyType: 'house',
        listingType: 'sale',
        listingSource: 'manual',
      }),
    ).rejects.toMatchObject({ data: { code: 'BAD_REQUEST' } });

    await db
      .update(subscriptions)
      .set({
        status: 'active',
        currentPeriodEnd: dbTimestamp(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      })
      .where(
        and(eq(subscriptions.ownerType, 'agency'), eq(subscriptions.ownerId, created.agencyId)),
      );

    await expect(
      reviewerApi.listing.approve.mutate({
        listingId: created.listingId,
        notes: 'Corrected disclosure reviewed and approved.',
      }),
    ).resolves.toEqual({ success: true });

    const [published] = await db
      .select({
        status: listings.status,
        approvalStatus: listings.approvalStatus,
        title: listings.title,
        publishedAt: listings.publishedAt,
      })
      .from(listings)
      .where(eq(listings.id, created.listingId))
      .limit(1);
    expect(published).toMatchObject({
      status: 'published',
      approvalStatus: 'approved',
      title: `${title} — corrected`,
    });
    expect(published?.publishedAt).toBeTruthy();

    const [property] = await db
      .select({
        id: properties.id,
        sourceListingId: properties.sourceListingId,
        title: properties.title,
        status: properties.status,
        ownerId: properties.ownerId,
        agentId: properties.agentId,
        provinceId: properties.provinceId,
        cityId: properties.cityId,
        suburbId: properties.suburbId,
      })
      .from(properties)
      .where(eq(properties.sourceListingId, created.listingId))
      .limit(1);
    expect(property).toMatchObject({
      sourceListingId: created.listingId,
      title: `${title} — corrected`,
      status: 'available',
      ownerId: member.id,
      agentId: created.agentId,
      provinceId: Number(location.provinceId),
      cityId: Number(location.cityId),
      suburbId: Number(location.suburbId),
    });
    if (!property)
      throw new Error('Approval did not create the canonical public property projection.');

    const mirroredImages = await db
      .select({ imageUrl: propertyImages.imageUrl, isPrimary: propertyImages.isPrimary })
      .from(propertyImages)
      .where(eq(propertyImages.propertyId, Number(property.id)));
    expect(mirroredImages).toHaveLength(5);
    expect(mirroredImages.filter(image => Number(image.isPrimary) === 1)).toHaveLength(1);

    const publicDetail = await publicApi.properties.getById.query({ id: Number(property.id) });
    expect(publicDetail.property).toMatchObject({
      id: Number(property.id),
      title: `${title} — corrected`,
      city: 'Johannesburg',
      province: 'Gauteng',
      publicIdentity: {
        role: 'agent',
        agentId: created.agentId,
        agencyId: created.agencyId,
      },
    });
    expect(publicDetail.images).toHaveLength(5);
    expect(publicDetail.media).toHaveLength(5);
    expect(publicDetail.property.detailPresentation.location).toMatchObject({
      precision: 'approximate',
    });
    expect(publicDetail.property.detailPresentation.location.label).toContain('Sandton');

    const publicSearch = await publicApi.properties.searchPublicInventory.query({
      locationId: canonicalSuburbId,
      propertyType: 'house',
      listingType: 'sale',
      listingSource: 'manual',
      page: 0,
      pageSize: 50,
    });
    expect(publicSearch).toMatchObject({
      locationState: 'resolved',
      locationContext: {
        type: 'suburb',
        name: 'Sandton',
        slug: 'sandton',
        confidence: 'exact',
        fallbackLevel: 'none',
        hierarchy: { province: 'Gauteng', city: 'Johannesburg', suburb: 'Sandton' },
        ids: {
          provinceId: Number(location.provinceId),
          cityId: Number(location.cityId),
          suburbId: Number(location.suburbId),
        },
      },
    });
    const publicCard = publicSearch.cards.find(
      card => card.propertyId === Number(property.id) || card.title === `${title} — corrected`,
    );
    expect(publicCard).toMatchObject({
      kind: 'property',
      propertyId: Number(property.id),
      title: `${title} — corrected`,
      city: 'Johannesburg',
      suburb: 'Sandton',
      province: 'Gauteng',
      propertyType: 'house',
      listingType: 'sale',
      listingSource: 'manual',
    });
    expect(publicCard?.images).toHaveLength(5);

    // Goal 7: the public HTTP enquiry path must create one durable custody
    // record for the assigned agency agent. The caller cannot select a
    // recipient; the server derives it from the approved projection.
    const enquiryInput = {
      propertyId: Number(property.id),
      name: `Prospect ${suffix}`,
      email: `prospect-${suffix}@example.test`,
      phone: '+27825550199',
      message: 'Please arrange a viewing for this Sandton home.',
      leadType: 'inquiry' as const,
      source: 'property_detail',
      leadSource: 'property_detail',
      sourceSurface: 'property_detail_contact_modal',
      captureRequestId: `agency-goal-7-${suffix}`,
      consent: {
        accepted: true as const,
        version: 'launch-privacy-1',
        source: 'property_detail_contact_modal',
      },
    };
    const captured = await publicApi.leads.create.mutate(enquiryInput);
    expect(captured).toMatchObject({
      success: true,
      delivered: true,
      deliveryStatus: 'delivered',
      deliveryMethod: 'crm_export',
      supplyOrigin: 'customer_managed',
      leadCustody: 'verified_customer_recipient',
      recipientType: 'agent',
      recipientId: created.agentId,
    });
    expect(captured.duplicate).toBeUndefined();
    created.leadId = Number(captured.leadId);
    expect(created.leadId).toBeGreaterThan(0);

    const [storedLead] = await db
      .select({
        id: leads.id,
        propertyId: leads.propertyId,
        agencyId: leads.agencyId,
        agentId: leads.agentId,
        name: leads.name,
        email: leads.email,
        message: leads.message,
        captureRequestId: leads.captureRequestId,
        consentVersion: leads.consentVersion,
        consentSource: leads.consentSource,
        deliveryStatus: leads.deliveryStatus,
        leadDeliveryMethod: leads.leadDeliveryMethod,
      })
      .from(leads)
      .where(eq(leads.id, created.leadId))
      .limit(1);
    expect(storedLead).toMatchObject({
      id: created.leadId,
      propertyId: Number(property.id),
      agencyId: created.agencyId,
      agentId: created.agentId,
      name: `Prospect ${suffix}`,
      email: `prospect-${suffix}@example.test`,
      message: 'Please arrange a viewing for this Sandton home.',
      captureRequestId: enquiryInput.captureRequestId,
      consentVersion: 'launch-privacy-1',
      consentSource: 'property_detail_contact_modal',
      deliveryStatus: 'delivered',
      leadDeliveryMethod: 'crm_export',
    });

    const [storedDelivery] = await db
      .select({
        leadId: leadDeliveries.leadId,
        purpose: leadDeliveries.purpose,
        state: leadDeliveries.state,
        channel: leadDeliveries.channel,
        recipientType: leadDeliveries.recipientType,
        recipientAgentId: leadDeliveries.recipientAgentId,
        recipientAgencyId: leadDeliveries.recipientAgencyId,
      })
      .from(leadDeliveries)
      .where(and(eq(leadDeliveries.leadId, created.leadId), eq(leadDeliveries.purpose, 'primary_custody')))
      .limit(1);
    expect(storedDelivery).toMatchObject({
      leadId: created.leadId,
      purpose: 'primary_custody',
      state: 'completed',
      channel: 'crm_export',
      recipientType: 'agent',
      recipientAgentId: created.agentId,
    });
    expect(storedDelivery?.recipientAgencyId).toBeNull();

    const replayed = await publicApi.leads.create.mutate(enquiryInput);
    expect(replayed).toMatchObject({
      success: true,
      leadId: created.leadId,
      duplicate: true,
      recipientType: 'agent',
      recipientId: created.agentId,
    });
    await expect(
      publicApi.leads.create.mutate({ ...enquiryInput, message: 'Tampered replay payload.' }),
    ).rejects.toMatchObject({ data: { code: 'CONFLICT' } });
    expect(
      await db
        .select({ id: leads.id })
        .from(leads)
        .where(eq(leads.captureRequestId, enquiryInput.captureRequestId)),
    ).toHaveLength(1);

    // Both legitimate operating surfaces can see the custodied lead, while a
    // verified administrator from another tenant sees neither the row nor its
    // delivery retry authority.
    const agencyLeads = await ownerApi.agency.getLeads.query({ status: 'all', limit: 50 });
    expect(agencyLeads.some(lead => Number(lead.id) === created.leadId)).toBe(true);
    await expect(ownerApi.agency.getLeadDetail.query({ leadId: created.leadId })).resolves.toMatchObject({
      id: created.leadId,
      agencyId: created.agencyId,
      agentId: created.agentId,
    });
    const memberAgentApi = trpcClient(await sessionCookie(member.id));
    const agentLeads = await memberAgentApi.agent.getMyLeads.query({ status: 'all', limit: 100 });
    expect(agentLeads.some(lead => Number(lead.id) === created.leadId)).toBe(true);
    await expect(unrelatedAgencyApi.agency.getLeads.query({ status: 'all', limit: 50 })).resolves.toEqual([]);
    await expect(
      unrelatedAgencyApi.agency.getLeadDetail.query({ leadId: created.leadId }),
    ).rejects.toMatchObject({ data: { code: 'NOT_FOUND' } });
    await expect(
      unrelatedAgencyApi.leads.retryDelivery.mutate({ leadId: created.leadId }),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });

    // Goal 8: the assigned agent can work durable custody through the agent
    // workspace, and agency oversight sees the same shared record.
    const initialPipeline = await memberAgentApi.agent.getLeadsPipeline.query({
      filters: { propertyId: Number(property.id) },
    });
    expect(initialPipeline.new.some(lead => Number(lead.id) === created.leadId)).toBe(true);
    await expect(
      memberAgentApi.agent.addLeadActivity.mutate({
        leadId: created.leadId,
        activityType: 'call',
        description: 'Prospect requested a preferred viewing window.',
      }),
    ).resolves.toEqual({ success: true });
    await expect(
      memberAgentApi.agent.moveLeadToStage.mutate({
        leadId: created.leadId,
        targetStage: 'contacted',
        notes: 'Prospect reached by phone.',
      }),
    ).resolves.toEqual({ success: true });
    const scheduledFollowUp = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await expect(
      memberAgentApi.agent.setLeadFollowUp.mutate({
        leadId: created.leadId,
        nextFollowUp: scheduledFollowUp,
        note: 'Confirm the viewing window with the prospect.',
      }),
    ).resolves.toMatchObject({ success: true });
    const memberFollowUps = await memberAgentApi.agent.getMyFollowUps.query({ limit: 20 });
    expect(memberFollowUps.some(lead => Number(lead.id) === created.leadId)).toBe(true);
    const ownerObservedCustody = await ownerApi.agency.getLeadDetail.query({
      leadId: created.leadId,
    });
    expect(ownerObservedCustody).toMatchObject({
      id: created.leadId,
      agentId: created.agentId,
    });
    expect(ownerObservedCustody.nextFollowUp).toBeTruthy();
    expect(
      ownerObservedCustody.activities.some(
        activity => activity.description === 'Prospect requested a preferred viewing window.',
      ),
    ).toBe(true);

    // The commercial term may pause new marketplace routing, but it must not
    // strand the legitimate assignee from their existing custody. This only
    // changes the disposable fixture's canonical term; no payment or
    // entitlement activation path is invoked.
    await db
      .update(subscriptions)
      .set({ currentPeriodEnd: dbTimestamp(new Date(Date.now() - 60_000)) })
      .where(
        and(eq(subscriptions.ownerType, 'agency'), eq(subscriptions.ownerId, created.agencyId)),
      );
    const expiredMemberStatus = await agentOnboardingStatus(member.id);
    expect(expiredMemberStatus.entitlements).toMatchObject({
      canReceiveLeads: false,
      canAccessExistingLeads: true,
    });
    const expiredPipeline = await memberAgentApi.agent.getLeadsPipeline.query({
      filters: { propertyId: Number(property.id) },
    });
    expect(expiredPipeline.contacted.some(lead => Number(lead.id) === created.leadId)).toBe(true);
    await expect(
      memberAgentApi.agent.addLeadActivity.mutate({
        leadId: created.leadId,
        activityType: 'email',
        description: 'Sent the prospect the available viewing times.',
      }),
    ).resolves.toEqual({ success: true });
    const bookedShowing = await memberAgentApi.agent.bookShowing.mutate({
      listingId: created.listingId,
      leadId: created.leadId,
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      visitorName: `Prospect ${suffix}`,
      notes: 'Viewing arranged while the commercial term is paused.',
    });
    expect(bookedShowing).toMatchObject({ success: true });
    created.showingId = Number(bookedShowing.showingId);
    expect(created.showingId).toBeGreaterThan(0);

    // Reassignment uses the existing canonical invitation and membership
    // path. The replacement has no individual subscription and no optional
    // verification badge, yet can continue the agency's custodied work.
    const replacement = await insertUser('PublicationReplacement', 'visitor');
    created.replacementId = replacement.id;
    const replacementInvitationToken = `publication-replacement-${randomUUID()}`;
    await db.insert(invitations).values({
      agencyId: created.agencyId,
      invitedBy: owner.id,
      email: replacement.email,
      role: 'agent',
      token: replacementInvitationToken,
      status: 'pending',
      expiresAt: dbTimestamp(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    } satisfies typeof invitations.$inferInsert);
    const replacementApi = trpcClient(await sessionCookie(replacement.id));
    await expect(
      replacementApi.invitation.accept.mutate({ token: replacementInvitationToken }),
    ).resolves.toEqual({ success: true });
    const [replacementAgent] = await db
      .select({
        id: agents.id,
        agencyId: agents.agencyId,
        status: agents.status,
        isVerified: agents.isVerified,
      })
      .from(agents)
      .where(eq(agents.userId, replacement.id))
      .limit(1);
    if (!replacementAgent) throw new Error('Replacement invitation did not create an agent profile.');
    created.replacementAgentId = Number(replacementAgent.id);
    expect(replacementAgent).toMatchObject({
      agencyId: created.agencyId,
      status: 'approved',
      isVerified: 0,
    });
    expect(
      await db
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.ownerType, 'agent'),
            eq(subscriptions.ownerId, replacement.id),
          ),
        ),
    ).toEqual([]);
    expect((await agentOnboardingStatus(replacement.id)).entitlements).toMatchObject({
      canReceiveLeads: false,
      canAccessExistingLeads: true,
    });

    await expect(
      ownerApi.agency.setAgentMembershipStatus.mutate({
        userId: member.id,
        status: 'suspended',
        reassignToUserId: replacement.id,
      }),
    ).resolves.toEqual({ success: true });
    const [reassignedLead] = await db
      .select({
        id: leads.id,
        agencyId: leads.agencyId,
        agentId: leads.agentId,
        captureRequestId: leads.captureRequestId,
      })
      .from(leads)
      .where(eq(leads.id, created.leadId))
      .limit(1);
    expect(reassignedLead).toMatchObject({
      id: created.leadId,
      agencyId: created.agencyId,
      agentId: created.replacementAgentId,
      captureRequestId: enquiryInput.captureRequestId,
    });
    const [reassignedShowing] = await db
      .select({ agentId: showings.agentId, leadId: showings.leadId, status: showings.status })
      .from(showings)
      .where(eq(showings.id, created.showingId))
      .limit(1);
    expect(reassignedShowing).toMatchObject({
      agentId: created.replacementAgentId,
      leadId: created.leadId,
      status: 'confirmed',
    });
    const [formerMembership] = await db
      .select({ status: agencyAgentMemberships.status, effectiveTo: agencyAgentMemberships.effectiveTo })
      .from(agencyAgentMemberships)
      .where(eq(agencyAgentMemberships.agentId, created.agentId))
      .limit(1);
    expect(formerMembership).toMatchObject({ status: 'suspended' });
    expect(formerMembership?.effectiveTo).toBeTruthy();
    await expect(
      memberAgentApi.agent.getMyLeads.query({ status: 'all', limit: 100 }),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
    await expect(
      memberAgentApi.agency.getLeadDetail.query({ leadId: created.leadId }),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });

    const replacementLeads = await replacementApi.agent.getMyLeads.query({
      status: 'all',
      limit: 100,
    });
    expect(replacementLeads.some(lead => Number(lead.id) === created.leadId)).toBe(true);
    const replacementFollowUps = await replacementApi.agent.getMyFollowUps.query({ limit: 20 });
    expect(replacementFollowUps.some(lead => Number(lead.id) === created.leadId)).toBe(true);
    const replacementShowings = await replacementApi.agent.getMyShowings.query({
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'all',
    });
    expect(replacementShowings.some(showing => Number(showing.id) === created.showingId)).toBe(true);
    const replacementNotifications = await replacementApi.agent.getNotifications.query({
      limit: 20,
      unreadOnly: false,
    });
    expect(
      replacementNotifications.some(
        notification => notification.title === 'Agency customer work reassigned to you',
      ),
    ).toBe(true);
    await expect(
      replacementApi.agent.addLeadActivity.mutate({
        leadId: created.leadId,
        activityType: 'note',
        description: 'Replacement agent accepted the scheduled follow-up.',
      }),
    ).resolves.toEqual({ success: true });
    const ownerAfterReassignment = await ownerApi.agency.getLeadDetail.query({
      leadId: created.leadId,
    });
    expect(ownerAfterReassignment).toMatchObject({
      id: created.leadId,
      agentId: created.replacementAgentId,
    });
    expect(
      ownerAfterReassignment.activities.some(
        activity => activity.description === 'Replacement agent accepted the scheduled follow-up.',
      ),
    ).toBe(true);
    const [deliveryAfterReassignment] = await db
      .select({ recipientAgentId: leadDeliveries.recipientAgentId, state: leadDeliveries.state })
      .from(leadDeliveries)
      .where(
        and(
          eq(leadDeliveries.leadId, created.leadId),
          eq(leadDeliveries.purpose, 'primary_custody'),
        ),
      )
      .limit(1);
    expect(deliveryAfterReassignment).toMatchObject({
      recipientAgentId: created.agentId,
      state: 'completed',
    });
    expect(
      await db
        .select({ id: leads.id })
        .from(leads)
        .where(eq(leads.captureRequestId, enquiryInput.captureRequestId)),
    ).toHaveLength(1);

    const finalQueue = await db
      .select({
        id: listingApprovalQueue.id,
        status: listingApprovalQueue.status,
        reviewNotes: listingApprovalQueue.reviewNotes,
      })
      .from(listingApprovalQueue)
      .where(eq(listingApprovalQueue.listingId, created.listingId));
    expect(finalQueue).toHaveLength(2);
    expect(finalQueue.map(row => row.status).sort()).toEqual(['approved', 'rejected']);
    expect(finalQueue.find(row => row.status === 'approved')?.reviewNotes).toContain(
      'Corrected disclosure',
    );

    // Agency administrators retain private custody of the source listing, but
    // public detail is served from the approved projection above.
    await expect(ownerApi.listing.getById.query({ id: created.listingId })).resolves.toMatchObject({
      property: { id: created.listingId, status: 'published' },
    });
  }, 90_000);
});
