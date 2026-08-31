import { randomUUID } from 'node:crypto';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { and, eq, inArray } from 'drizzle-orm';
import { resolveDatabaseAuthority } from '../_core/databaseAuthority/context';

process.env.SL_PHONE_OTP_DEV_MODE = '1';

function usesApprovedDisposableDatabase(url?: string) {
  try {
    const authority = resolveDatabaseAuthority({
      operation: 'test-fixture',
      explicitDatabaseUrl: url,
    });
    return (
      ['disposable-test', 'disposable-worktree'].includes(authority.context.targetClass) &&
      authority.context.worktree.ownershipMatches
    );
  } catch {
    return false;
  }
}

const hasTestDb = usesApprovedDisposableDatabase(process.env.DATABASE_URL);
const guardedDescribe: typeof describe = hasTestDb
  ? describe
  : (((name, fn) =>
      describe.skip(`${name} (requires an approved disposable database)`, fn)) as typeof describe);

const dbHandle = vi.hoisted(() => ({ current: undefined as any }));
vi.mock('../db-connection', async () => {
  const actual = await vi.importActual<any>('../db-connection');
  return { ...actual, getDb: async () => dbHandle.current ?? actual.getDb() };
});

import { getDb } from '../db-connection';
import { sharedLivingRouter } from '../sharedLivingRouter';
import {
  hasVerifiedPhone,
  sendPhoneVerificationOtp,
  verifyPhoneOtp,
} from '../services/sharedLivingVerificationService';
import { capturePublicLead } from '../services/publicLeadCaptureService';
import {
  agencies,
  agencyAgentMemberships,
  agents,
  cities,
  leads,
  provinces,
  slLeadContexts,
  slMessages,
  slPlaces,
  slVerifications,
  suburbs,
  users,
} from '../../drizzle/schema';

const created = {
  userIds: [] as number[],
  agencyIds: [] as number[],
  agentIds: [] as number[],
  placeIds: [] as number[],
  leadTokens: [] as string[],
};

async function insertUser(role: string, label: string): Promise<number> {
  const db = await getDb();
  const [result] = await db.insert(users).values({
    email: `sl-mvp-${label}-${randomUUID().slice(0, 8)}@example.com`,
    role,
    firstName: 'Shared',
    lastName: 'Living',
    name: `Shared Living ${label}`,
    emailVerified: 1,
    onboardingComplete: 1,
  });
  const id = Number(result.insertId);
  created.userIds.push(id);
  return id;
}

async function insertApprovedPractitioner(label: string): Promise<{
  userId: number;
  agencyId: number;
  agentId: number;
}> {
  const userId = await insertUser('agent', label);
  const db = await getDb();
  const suffix = randomUUID().slice(0, 8);
  const [agencyResult] = await db.insert(agencies).values({
    name: `Shared Living Agency ${suffix}`,
    slug: `shared-living-agency-${suffix}`,
    isVerified: 1,
  });
  const agencyId = Number(agencyResult.insertId);
  created.agencyIds.push(agencyId);
  const [agentResult] = await db.insert(agents).values({
    userId,
    agencyId,
    firstName: 'MVP',
    lastName: 'Practitioner',
    displayName: 'MVP Practitioner',
    slug: `shared-living-practitioner-${suffix}`,
    isVerified: 1,
    isFeatured: 0,
    status: 'approved',
  });
  const agentId = Number(agentResult.insertId);
  created.agentIds.push(agentId);
  await db.insert(agencyAgentMemberships).values({
    agencyId,
    agentId,
    status: 'active',
  });
  return { userId, agencyId, agentId };
}

async function canonicalAuthoringLocation(): Promise<string> {
  const db = await getDb();
  const [suburb] = await db.select({ id: suburbs.id }).from(suburbs).limit(1);
  if (suburb) return `suburb:${suburb.id}`;
  const [city] = await db.select({ id: cities.id }).from(cities).limit(1);
  if (city) return `city:${city.id}`;
  const [province] = await db.select({ id: provinces.id }).from(provinces).limit(1);
  if (province) return `province:${province.id}`;
  throw new Error(
    'The canonical geography reference data is required for Shared Living integration tests.',
  );
}

async function siblingSuburbLocationIds(): Promise<[string, string] | null> {
  const db = await getDb();
  const rows = await db.select({ id: suburbs.id, cityId: suburbs.cityId }).from(suburbs).limit(500);
  for (const row of rows) {
    const sibling = rows.find(
      candidate => candidate.id !== row.id && candidate.cityId === row.cityId,
    );
    if (sibling) return [`suburb:${row.id}`, `suburb:${sibling.id}`];
  }
  return null;
}

const callerFor = (userId: number, role: string) =>
  sharedLivingRouter.createCaller({
    req: { headers: {}, ip: '127.0.0.1' },
    res: {},
    user: { id: userId, role },
  } as any);
const adminCallerFor = (userId: number) => callerFor(userId, 'super_admin');
const publicCaller = () =>
  sharedLivingRouter.createCaller({
    req: { headers: {}, ip: '127.0.0.1' },
    res: {},
    user: null,
  } as any);

async function verifyPhone(userId: number, phone: string) {
  const otp = await sendPhoneVerificationOtp(userId, phone);
  expect(otp.status).toBe('dev_mode');
  expect((await verifyPhoneOtp(userId, phone, '000000')).status).toBe('verified');
  expect(await hasVerifiedPhone(userId)).toBe(true);
}

beforeAll(async () => {
  if (!hasTestDb) return;
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  dbHandle.current = db;
});

afterEach(async () => {
  if (!hasTestDb) return;
  const db = await getDb();
  if (!db) return;
  if (created.leadTokens.length) {
    await db.delete(leads).where(inArray(leads.captureRequestId, created.leadTokens));
    created.leadTokens = [];
  }
  if (created.placeIds.length) {
    await db
      .delete(slVerifications)
      .where(
        and(
          eq(slVerifications.subjectType, 'listing'),
          inArray(slVerifications.subjectId, created.placeIds),
        ),
      );
    await db.delete(slPlaces).where(inArray(slPlaces.id, created.placeIds));
    created.placeIds = [];
  }
  if (created.agentIds.length) {
    await db
      .delete(agencyAgentMemberships)
      .where(inArray(agencyAgentMemberships.agentId, created.agentIds));
    await db.delete(agents).where(inArray(agents.id, created.agentIds));
    created.agentIds = [];
  }
  if (created.agencyIds.length) {
    await db.delete(agencies).where(inArray(agencies.id, created.agencyIds));
    created.agencyIds = [];
  }
  if (created.userIds.length) {
    await db
      .delete(slVerifications)
      .where(
        and(
          eq(slVerifications.subjectType, 'user'),
          inArray(slVerifications.subjectId, created.userIds),
        ),
      );
    await db.delete(users).where(inArray(users.id, created.userIds));
    created.userIds = [];
  }
});

guardedDescribe('Shared Living Spaces MVP', () => {
  it('allows a private owner to save a canonical draft before phone verification, but gates review submission', async () => {
    const ownerId = await insertUser('visitor', 'unverified-owner');
    const locationId = await canonicalAuthoringLocation();
    const owner = callerFor(ownerId, 'visitor');

    const draft = await owner.createDraft({
      addressLinePrivate: '12 Private Road, Johannesburg',
      locationId,
      placeKind: 'house',
      spaceLabel: 'Backyard room',
      accommodationType: 'backyard_room',
      marketTag: 'independent_micro',
      rentAmountMinor: 250_000,
      bills: { electricity: true, water: false, wifi: false },
    });
    created.placeIds.push(draft.placeId);

    await expect(owner.submitForReview({ placeId: draft.placeId })).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
    });
    await verifyPhone(ownerId, '+27821110000');
  });

  it('rejects a practitioner authoring attempt without a mandate instead of treating it as an owner listing', async () => {
    const agentId = await insertUser('agent', 'missing-mandate');
    const locationId = await canonicalAuthoringLocation();
    await expect(
      callerFor(agentId, 'agent').createDraft({
        addressLinePrivate: '12 Practitioner Road, Johannesburg',
        locationId,
        placeKind: 'house',
        spaceLabel: 'Client room',
        accommodationType: 'private_room',
        marketTag: 'room_share',
        rentAmountMinor: 300_000,
        bills: { electricity: false, water: false, wifi: false },
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: expect.stringContaining('mandate reference'),
    });
  });

  it('publishes an approved practitioner listing only while its mandate and canonical agency membership remain current', async () => {
    const practitioner = await insertApprovedPractitioner('approved-practitioner');
    const moderatorId = await insertUser('super_admin', 'practitioner-moderator');
    const locationId = await canonicalAuthoringLocation();
    const lister = callerFor(practitioner.userId, 'agent');
    const draft = await lister.createDraft({
      addressLinePrivate: '41 Mandate Lane, Johannesburg',
      locationId,
      placeKind: 'apartment',
      spaceLabel: 'Managed studio',
      accommodationType: 'bachelor_studio',
      marketTag: 'independent_micro',
      rentAmountMinor: 620_000,
      bills: { electricity: false, water: true, wifi: true },
      mandateReference: 'MANDATE-SL-2026-001',
    });
    created.placeIds.push(draft.placeId);
    await verifyPhone(practitioner.userId, '+27821110003');
    await lister.submitForReview({ placeId: draft.placeId });

    const db = await getDb();
    await db
      .update(agencyAgentMemberships)
      .set({ effectiveTo: new Date(Date.now() - 60_000) })
      .where(eq(agencyAgentMemberships.agentId, practitioner.agentId));
    await expect(
      adminCallerFor(moderatorId).moderateApprove({ placeId: draft.placeId }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: expect.stringContaining('active agency membership'),
    });

    await db
      .update(agencyAgentMemberships)
      .set({ effectiveTo: null })
      .where(eq(agencyAgentMemberships.agentId, practitioner.agentId));
    await adminCallerFor(moderatorId).moderateApprove({ placeId: draft.placeId });
    await expect(publicCaller().detail({ slug: draft.slug })).resolves.toMatchObject({
      attribution: {
        kind: 'practitioner',
        name: 'MVP Practitioner',
        agencyName: expect.stringContaining('Shared Living Agency'),
      },
      trust: { relationshipVerified: true, propertyVerified: true },
    });
  }, 60_000);

  it('runs owner inventory through draft, review, approval, exact canonical search, and direct public detail', async () => {
    const ownerId = await insertUser('visitor', 'owner-flow');
    const moderatorId = await insertUser('super_admin', 'moderator-flow');
    const locationId = await canonicalAuthoringLocation();
    const owner = callerFor(ownerId, 'visitor');

    const draft = await owner.createDraft({
      addressLinePrivate: '9 Private Close, Sandton',
      locationId,
      placeKind: 'house',
      description: 'Quiet home, one room available.',
      spaceLabel: 'En-suite back room',
      accommodationType: 'en_suite_room',
      marketTag: 'independent_micro',
      rentAmountMinor: 450_000,
      bills: { electricity: true, water: true, wifi: true },
      occupantsCount: 2,
    });
    created.placeIds.push(draft.placeId);

    const extraSpace = await owner.addSpace({
      placeId: draft.placeId,
      spaceLabel: 'Garden cottage',
      accommodationType: 'garden_cottage',
      marketTag: 'independent_micro',
      rentAmountMinor: 500_000,
      bills: { electricity: true, water: true, wifi: false },
    });
    const authorInventory = await owner.myPlaces();
    expect(authorInventory.places).toHaveLength(1);
    expect(authorInventory.places[0].spaces.map(space => space.slug)).toEqual(
      expect.arrayContaining([draft.slug, extraSpace.slug]),
    );

    // A draft is absent from public discovery even with an exact location identity.
    const hidden = await publicCaller().search({
      locationId,
      accommodationTypes: ['en_suite_room'],
    });
    expect(hidden.items.map(item => item.slug)).not.toContain(draft.slug);

    await verifyPhone(ownerId, '+27821110001');
    await owner.submitForReview({ placeId: draft.placeId });
    const moderationItem = (await adminCallerFor(moderatorId).moderationQueue()).find(
      item => item.id === draft.placeId,
    );
    expect(moderationItem).toMatchObject({ locationDisplay: expect.any(String) });
    expect(moderationItem?.spaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'En-suite back room', rentAmountMinor: 450_000 }),
      ]),
    );
    expect(JSON.stringify(moderationItem)).not.toContain('9 Private Close');
    await adminCallerFor(moderatorId).moderateApprove({ placeId: draft.placeId });

    const found = await publicCaller().detail({ slug: draft.slug });
    expect(found).toMatchObject({
      accommodationType: 'en_suite_room',
      locationDisplay: expect.any(String),
      trust: { phoneVerified: true, propertyVerified: true },
    });
    // Privacy invariant: neither a private address nor coordinates leave the public DTO.
    expect(JSON.stringify(found)).not.toContain('9 Private Close');
    expect(found?.coordinates).toBeNull();

    const search = await publicCaller().search({
      marketTag: 'independent_micro',
      locationId,
      minPrice: 4_000,
      maxPrice: 4_750,
      billsElectricity: true,
      accommodationTypes: ['en_suite_room'],
    });
    expect(search.items.map(item => item.slug)).toContain(draft.slug);
    expect(search.items.find(item => item.slug === draft.slug)?.rentAmountMinor).toBe(450_000);

    // Material public facts cannot bypass the publication boundary after go-live.
    await owner.updateSpace({ spaceId: draft.spaceId, rentAmountMinor: 475_000 });
    expect((await owner.myPlaces()).places[0]?.status).toBe('pending_review');
    expect(await publicCaller().detail({ slug: draft.slug })).toBeNull();
    await adminCallerFor(moderatorId).moderateApprove({ placeId: draft.placeId });
    expect((await publicCaller().detail({ slug: draft.slug }))?.rentAmountMinor).toBe(475_000);
  }, 60_000);

  it('fails closed for legacy display geography, unknown IDs, and mixed search or lead authorities', async () => {
    await expect(
      publicCaller().search({ location: 'not-a-real-place-zz' } as any),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    await expect(publicCaller().search({ locationId: 'suburb:99999999' })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: expect.stringContaining('canonical location catalogue'),
    });
    await expect(
      publicCaller().search({ locationId: 'city:1', locationIds: ['city:1', 'city:2'] }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(
      capturePublicLead({
        slPlaceId: 1,
        slSpaceId: 1,
        listingId: 1,
        name: 'Authority probe',
        email: 'authority-probe@example.com',
        message: 'This must not choose between unrelated lead authorities.',
        captureRequestId: randomUUID(),
        consent: { accepted: true, version: 'test', source: 'shared_living_detail' },
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: expect.stringContaining('one canonical enquiry authority'),
    });

    const siblings = await siblingSuburbLocationIds();
    if (siblings) {
      await expect(publicCaller().search({ locationIds: siblings })).resolves.toMatchObject({
        locationState: 'canonical',
      });
    }
  });

  it('persists an enquiry atomically, delivers it to the owner inbox, and keeps retries and replies scoped', async () => {
    const ownerId = await insertUser('visitor', 'thread-owner');
    const strangerId = await insertUser('visitor', 'thread-stranger');
    const moderatorId = await insertUser('super_admin', 'thread-moderator');
    const locationId = await canonicalAuthoringLocation();
    const owner = callerFor(ownerId, 'visitor');
    const draft = await owner.createDraft({
      addressLinePrivate: '5 Shared Yard, Soweto',
      locationId,
      placeKind: 'house',
      spaceLabel: 'Backyard unit 1',
      accommodationType: 'backyard_unit',
      marketTag: 'independent_micro',
      rentUnknown: true,
      bills: { electricity: false, water: false, wifi: false },
    });
    created.placeIds.push(draft.placeId);
    await verifyPhone(ownerId, '+27821110002');
    await owner.submitForReview({ placeId: draft.placeId });
    await adminCallerFor(moderatorId).moderateApprove({ placeId: draft.placeId });

    const token = randomUUID();
    created.leadTokens.push(token);
    const enquiryInput = {
      slPlaceId: draft.placeId,
      slSpaceId: draft.spaceId,
      name: 'Test Buyer',
      email: 'buyer@example.com',
      message: 'Is this unit still available from September?',
      captureRequestId: token,
      consent: { accepted: true as const, version: 'test', source: 'shared_living_detail' },
    };
    const enquiry = await publicCaller().enquire(enquiryInput);
    expect(enquiry).toMatchObject({
      success: true,
      delivered: true,
      deliveryStatus: 'delivered',
      recipientId: ownerId,
      leadCustody: 'platform_managed',
    });

    const db = await getDb();
    const [lead] = await db.select().from(leads).where(eq(leads.captureRequestId, token));
    expect(lead.leadDeliveryMethod).toBe('manual');
    expect(lead.deliveryStatus).toBe('delivered');
    const [context] = await db
      .select()
      .from(slLeadContexts)
      .where(eq(slLeadContexts.leadId, lead.id));
    expect(Number(context.placeId)).toBe(draft.placeId);
    expect(Number(context.spaceId)).toBe(draft.spaceId);
    const messages = await db.select().from(slMessages).where(eq(slMessages.leadId, lead.id));
    expect(messages).toHaveLength(1);
    expect(messages[0].body).toBe(enquiryInput.message);
    expect(messages[0].body).not.toContain(enquiryInput.email);

    const replay = await publicCaller().enquire(enquiryInput);
    expect(replay).toMatchObject({ success: true, duplicate: true, leadId: enquiry.leadId });
    expect(await db.select().from(slMessages).where(eq(slMessages.leadId, lead.id))).toHaveLength(
      1,
    );

    const publicThread = await publicCaller().thread({ token });
    expect(publicThread?.messages.some(message => message.body.includes('September'))).toBe(true);
    expect(JSON.stringify(publicThread)).not.toContain(enquiryInput.email);
    expect(JSON.stringify(publicThread)).not.toContain('5 Shared Yard');

    const inbox = await owner.myListerThreads();
    expect(inbox.map(item => item.token)).toContain(token);
    await expect(
      owner.replyAsLister({ token, body: 'Saturday 10:00 works.' }),
    ).resolves.toMatchObject({
      ok: true,
    });
    await expect(
      callerFor(strangerId, 'visitor').replyAsLister({ token, body: 'hijack' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    // A capture ID from another lead domain cannot be used as a Shared Living
    // guest-message capability.
    const unrelatedToken = randomUUID();
    created.leadTokens.push(unrelatedToken);
    const [unrelatedResult] = await db.insert(leads).values({
      name: 'Unrelated prospect',
      email: 'unrelated@example.com',
      captureRequestId: unrelatedToken,
    });
    const unrelatedLeadId = Number(unrelatedResult.insertId);
    await expect(
      publicCaller().replyByToken({ token: unrelatedToken, body: 'cross-domain write attempt' }),
    ).resolves.toEqual({ ok: false, reason: 'Thread not found.' });
    await expect(
      db.select().from(slMessages).where(eq(slMessages.leadId, unrelatedLeadId)),
    ).resolves.toHaveLength(0);
  }, 60_000);
});
