import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { place, placeName, slListingAuthorities, users } from '../../../drizzle/schema';
import { ENV } from '../../_core/env';
import { registerLocalMediaRoutes } from '../../_core/localMediaRoutes';
import { createMediaStorageKey } from '../../_core/mediaStorage';
import { getDb, shutdownDb } from '../../db-connection';
import { uploadRouter } from '../../uploadRouter';
import { sharedLivingRouter } from '../../sharedLivingRouter';

const runDisposableJourney = process.env.SHARED_LIVING_DB_PROOF === '1';
const pixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7ioAAAAASUVORK5CYII=',
  'base64',
);

describe.runIf(runDisposableJourney)('Shared Living agent-to-seeker database journey', () => {
  let db: NonNullable<Awaited<ReturnType<typeof getDb>>>;
  let mediaRoot = '';
  let mediaServer: Server | null = null;
  let mediaBaseUrl = '';
  let originalMediaAdapter = ENV.mediaStorageAdapter;
  let originalMediaDirectory = ENV.mediaLocalStorageDir;
  let originalMediaSecret: string | undefined;

  const suffix = randomUUID();
  let agentUserId = 0;
  let secondAgentUserId = 0;
  let reviewerUserId = 0;
  let residenceId = 0;
  let authorityId = 0;
  let evidenceId = 0;
  let canonicalPlaceId = '';
  let firstSpaceId = 0;
  let secondSpaceId = 0;
  let firstSpaceSlug = '';
  let secondSpaceSlug = '';
  let leadId = 0;

  const context = (user: { id: number; role: string } | null) => ({
    user,
    req: { headers: {} },
    res: {},
    requestId: `shared-living-db-proof-${suffix}`,
  }) as any;

  const uploadFile = async (url: string, contentType: string, body: Buffer) => {
    const response = await fetch(`${mediaBaseUrl}${url}`, {
      method: 'PUT',
      headers: { 'content-type': contentType },
      body: new Blob([body], { type: contentType }),
    });
    if (!response.ok) throw new Error(`Local media upload failed (${response.status}).`);
    return response.json() as Promise<{ key: string }>;
  };

  beforeAll(async () => {
    const connection = await getDb();
    if (!connection) throw new Error('The approved disposable Shared Living database is unavailable.');
    db = connection;

    // The authority wrapper provides a disposable worktree DATABASE_URL. The
    // test refuses to run in a normal unit-test process without its explicit
    // opt-in, and local media is isolated in a temporary directory.
    if (process.env.NODE_ENV !== 'test' || process.env.APP_ENV !== 'test') {
      throw new Error('Shared Living DB proof requires the test runtime.');
    }
    mediaRoot = await mkdtemp(join(tmpdir(), 'property-listify-shared-living-proof-'));
    originalMediaAdapter = ENV.mediaStorageAdapter;
    originalMediaDirectory = ENV.mediaLocalStorageDir;
    originalMediaSecret = process.env.MEDIA_UPLOAD_TOKEN_SECRET;
    ENV.mediaStorageAdapter = 'local';
    ENV.mediaLocalStorageDir = mediaRoot;
    process.env.MEDIA_UPLOAD_TOKEN_SECRET = `shared-living-proof-${suffix}`;

    const app = express();
    registerLocalMediaRoutes(app);
    mediaServer = createServer(app);
    await new Promise<void>(resolve => mediaServer!.listen(0, '127.0.0.1', resolve));
    const address = mediaServer.address();
    if (!address || typeof address === 'string') throw new Error('Shared Living media test server failed to start.');
    mediaBaseUrl = `http://127.0.0.1:${address.port}`;

    const createUser = async (role: 'agent' | 'super_admin', label: string) => {
      const email = `${label}-${suffix}@example.invalid`;
      const [row] = await db.insert(users).values({
        email,
        name: `Disposable Shared Living ${label}`,
        role,
        emailVerified: 1,
      } as any);
      return Number(row.insertId);
    };
    agentUserId = await createUser('agent', 'agent');
    secondAgentUserId = await createUser('agent', 'other-agent');
    // Reuse the stable synthetic reviewer row across reruns. This test calls
    // the router with an explicit reviewer context and must not leave an extra
    // super-admin role in the disposable database for unrelated authority
    // suites that assert the canonical administrator set.
    const [reviewerFixture] = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.name, 'Disposable Shared Living reviewer'))
      .limit(1);
    if (reviewerFixture) {
      reviewerUserId = Number(reviewerFixture.id);
      await db.update(users).set({ role: 'super_admin' }).where(eq(users.id, reviewerUserId));
    } else {
      reviewerUserId = await createUser('super_admin', 'reviewer');
    }

    // A prior interrupted run may have stopped after publication. Hold only
    // test-owned residences whose synthetic account has the exact fixture name;
    // this preserves the inventory and historical leads instead of deleting it.
    const priorTestAuthorities = await db.select({ authorityId: slListingAuthorities.id })
      .from(slListingAuthorities)
      .innerJoin(users, eq(users.id, slListingAuthorities.agentUserId))
      .where(and(
        eq(users.name, 'Disposable Shared Living agent'),
        eq(slListingAuthorities.status, 'approved'),
      ));
    const recoveryReviewer = sharedLivingRouter.createCaller(context({ id: reviewerUserId, role: 'super_admin' }));
    for (const prior of priorTestAuthorities) {
      await recoveryReviewer.revokeAuthority({
        authorityId: prior.authorityId,
        reason: 'Holding an interrupted disposable Shared Living integration fixture.',
      });
    }

    const [canonical] = await db.select({ placeId: place.placeId })
      .from(place)
      .innerJoin(placeName, and(
        eq(placeName.placeId, place.placeId),
        eq(placeName.nameRole, 'preferred_public'),
        eq(placeName.nameState, 'active'),
      ))
      .where(and(
        eq(place.lifecycleStatus, 'active'),
        eq(place.verificationStatus, 'verified'),
        eq(place.searchEligible, 1),
        eq(place.publicationEligible, 1),
      ))
      .limit(1);
    if (!canonical) throw new Error('No admitted, publication-eligible canonical Place is available in the disposable database.');
    canonicalPlaceId = canonical.placeId;
  }, 30_000);

  afterAll(async () => {
    if (db && reviewerUserId && authorityId) {
      const [authority] = await db.select({ status: slListingAuthorities.status })
        .from(slListingAuthorities)
        .where(eq(slListingAuthorities.id, authorityId))
        .limit(1);
      if (authority?.status === 'approved') {
        const recoveryReviewer = sharedLivingRouter.createCaller(context({ id: reviewerUserId, role: 'super_admin' }));
        await recoveryReviewer.revokeAuthority({
          authorityId,
          reason: 'Holding the disposable Shared Living integration fixture after verification.',
        });
      }
    }
    if (db && reviewerUserId) {
      await db.update(users).set({ role: 'agent' }).where(eq(users.id, reviewerUserId));
    }
    if (mediaServer) await new Promise<void>((resolve, reject) => mediaServer!.close(error => error ? reject(error) : resolve()));
    ENV.mediaStorageAdapter = originalMediaAdapter;
    ENV.mediaLocalStorageDir = originalMediaDirectory;
    if (originalMediaSecret === undefined) delete process.env.MEDIA_UPLOAD_TOKEN_SECRET;
    else process.env.MEDIA_UPLOAD_TOKEN_SECRET = originalMediaSecret;
    if (mediaRoot) await rm(mediaRoot, { recursive: true, force: true });
    await shutdownDb();
  });

  it('creates, reviews, publishes, discovers, enquires and revokes an agent-managed multi-space residence', async () => {
    const agent = sharedLivingRouter.createCaller(context({ id: agentUserId, role: 'agent' }));
    const secondAgent = sharedLivingRouter.createCaller(context({ id: secondAgentUserId, role: 'agent' }));
    const reviewer = sharedLivingRouter.createCaller(context({ id: reviewerUserId, role: 'super_admin' }));
    const seeker = sharedLivingRouter.createCaller(context(null));
    const upload = uploadRouter.createCaller(context({ id: agentUserId, role: 'agent' }));

    const today = new Date().toISOString().slice(0, 10);
    const expires = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const draft = await agent.createDraft({
      residenceName: `Disposable Shared Residence ${suffix.slice(0, 8)}`,
      addressLinePrivate: `17 Confidential Road ${suffix.slice(0, 8)}`,
      canonicalPlaceId,
      placeKind: 'student_residence',
      description: 'A disposable integration residence with separately managed student spaces.',
      responsiblePartyRole: 'operator',
      responsiblePartyName: 'Test Residence Operator',
      responsiblePartyEmail: `operator-${suffix}@example.invalid`,
      authorityEffectiveDate: today,
      authorityExpiryDate: expires,
    });
    residenceId = draft.placeId;
    authorityId = draft.authorityId;

    const evidenceTarget = await agent.mandateEvidenceUploadTarget({
      placeId: residenceId,
      fileName: 'signed-test-mandate.png',
      contentType: 'image/png',
    });
    await uploadFile(evidenceTarget.url, 'image/png', pixelPng);
    const evidence = await agent.attachMandateEvidence({ authorityId, uploadToken: evidenceTarget.uploadToken });
    evidenceId = evidence.evidenceId;
    await agent.submitMandateForReview({ authorityId });
    expect(await reviewer.reviewAuthority({ authorityId, decision: 'approve' })).toMatchObject({ status: 'approved' });

    const spaceInput = {
      placeId: residenceId,
      description: 'A furnished student accommodation space with secure access and shared facilities.',
      marketTag: 'student' as const,
      rentUnknown: false,
      availabilityStatus: 'available' as const,
      availableFrom: today,
      occupancyCount: 1,
      furnishedState: 'furnished' as const,
      bathroomAccess: 'shared' as const,
      bills: { electricity: 'to_be_confirmed' as const, water: 'included' as const, wifi: 'included' as const },
      facilities: ['bed', 'desk'],
    };
    const firstSpace = await agent.addSpace({
      ...spaceInput,
      label: `Single student room ${suffix.slice(0, 6)}`,
      accommodationType: 'private_room',
      rentAmountMinor: 650000,
      rentBasis: 'per_space',
    });
    const secondSpace = await agent.addSpace({
      ...spaceInput,
      label: `Shared student room ${suffix.slice(0, 6)}`,
      accommodationType: 'shared_room',
      rentAmountMinor: 350000,
      rentBasis: 'per_person',
      occupancyCount: 2,
    });
    firstSpaceId = firstSpace.spaceId;
    secondSpaceId = secondSpace.spaceId;
    firstSpaceSlug = firstSpace.slug;
    secondSpaceSlug = secondSpace.slug;

    await expect(secondAgent.updateSpace({ spaceId: firstSpaceId, label: 'Unauthorized edit attempt' }))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });

    for (const spaceId of [firstSpaceId, secondSpaceId]) {
      const target = await upload.presign({ filename: `space-${spaceId}.png`, contentType: 'image/png' });
      await uploadFile(target.url, 'image/png', pixelPng);
      await agent.attachMedia({ scope: 'space', entityId: spaceId, key: target.key, contentType: 'image/png' });
    }
    await agent.saveResidenceFacilities({ placeId: residenceId, facilities: ['secure_parking', 'study_area'] });

    // The draft remains private before submission and review.
    expect((await seeker.search({ marketTag: 'student' })).items.map(item => item.id))
      .not.toContain(firstSpaceId);
    await agent.submitForReview({ placeId: residenceId });
    await reviewer.moderateApprove({ placeId: residenceId, subjectType: 'space', spaceId: firstSpaceId });
    await reviewer.moderateApprove({ placeId: residenceId, subjectType: 'space', spaceId: secondSpaceId });
    await reviewer.moderateApprove({ placeId: residenceId, subjectType: 'residence' });

    const publicSpaces = await seeker.search({ marketTag: 'student', canonicalPlaceId });
    const publishedFirst = publicSpaces.items.find(item => item.id === firstSpaceId);
    const publishedSecond = publicSpaces.items.find(item => item.id === secondSpaceId);
    expect(publishedFirst).toMatchObject({ rentAmountMinor: 650000, rentBasis: 'per_space', availabilityStatus: 'available' });
    expect(publishedSecond).toMatchObject({ rentAmountMinor: 350000, rentBasis: 'per_person', occupancyCount: 2 });
    expect(JSON.stringify(publicSpaces)).not.toContain('Confidential Road');

    const firstDetail = await seeker.detail({ slug: firstSpaceSlug });
    const secondDetail = await seeker.detail({ slug: secondSpaceSlug });
    expect(firstDetail).toMatchObject({ rentAmountMinor: 650000, rentBasis: 'per_space', sharedFacilities: ['secure_parking', 'study_area'] });
    expect(secondDetail).toMatchObject({ rentAmountMinor: 350000, rentBasis: 'per_person', occupancyCount: 2 });
    expect(firstDetail).not.toHaveProperty('addressLinePrivate');
    expect(secondDetail).not.toHaveProperty('addressLinePrivate');
    expect(firstDetail.images.length).toBeGreaterThan(0);
    expect(secondDetail.images.length).toBeGreaterThan(0);

    const captureRequestId = randomUUID();
    const enquiry = await seeker.enquire({
      slPlaceId: residenceId,
      slSpaceId: secondSpaceId,
      name: 'Disposable Shared Living Seeker',
      email: `seeker-${suffix}@example.invalid`,
      message: 'I would like to ask about the shared student room.',
      captureRequestId,
      consent: { accepted: true, version: 'shared-living-test-v1', source: 'integration-test' },
    });
    expect(enquiry).toMatchObject({ success: true, delivered: true, supplyOrigin: 'shared_living' });
    leadId = enquiry.leadId;
    const threads = await agent.myListerThreads();
    expect(threads.some(thread => thread.leadId === leadId)).toBe(true);
    expect((await agent.listerThread({ token: captureRequestId })).messages.some(message => message.body.includes('shared student room'))).toBe(true);

    await reviewer.revokeAuthority({ authorityId, reason: 'Disposable integration journey completed.' });
    expect((await seeker.search({ marketTag: 'student', canonicalPlaceId })).items.map(item => item.id))
      .not.toContain(firstSpaceId);
    await expect(seeker.enquire({
      slPlaceId: residenceId,
      slSpaceId: secondSpaceId,
      name: 'Disposable Shared Living Seeker',
      email: `seeker-${suffix}@example.invalid`,
      message: 'This enquiry must be rejected after mandate revocation.',
      captureRequestId: randomUUID(),
      consent: { accepted: true, version: 'shared-living-test-v1', source: 'integration-test' },
    })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect((await agent.myListerThreads()).some(thread => thread.leadId === leadId)).toBe(true);
    await expect(agent.replyAsLister({ token: captureRequestId, body: 'This reply is no longer authorized.' }))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });

    const persisted = await agent.myPlaces();
    const residence = persisted.find(item => item.id === residenceId);
    expect(residence?.publicationStatus).toBe('held');
    expect(residence?.spaces.map(space => space.id)).toEqual(expect.arrayContaining([firstSpaceId, secondSpaceId]));
    expect(evidenceId).toBeGreaterThan(0);
  }, 60_000);
});
