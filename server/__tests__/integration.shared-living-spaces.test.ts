import { randomUUID } from 'node:crypto';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq, like, inArray } from 'drizzle-orm';

process.env.SL_PHONE_OTP_DEV_MODE = '1';

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
import {
  agencies,
  leads,
  slLeadContexts,
  slMessages,
  slPlaces,
  slSpaces,
  users,
} from '../../drizzle/schema';

const created = {
  userIds: [] as number[],
  agencyIds: [] as number[],
  placeIds: [] as number[],
  spaceIds: [] as number[],
  leadTokens: [] as string[],
};

async function insertUser(role: string, label: string): Promise<number> {
  const db = await getDb();
  const [result] = await db
    .insert(users)
    .values({
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

const listerCallerFor = (userId: number) =>
  sharedLivingRouter.createCaller({ req: { headers: {}, ip: '127.0.0.1' }, res: {}, user: { id: userId, role: 'agent' } } as any);
const adminCallerFor = (userId: number) =>
  sharedLivingRouter.createCaller({ req: { headers: {}, ip: '127.0.0.1' }, res: {}, user: { id: userId, role: 'super_admin' } } as any);
const publicCaller = () => sharedLivingRouter.createCaller({ req: { headers: {}, ip: '127.0.0.1' }, res: {}, user: null } as any);

beforeAll(async () => {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  dbHandle.current = db;
});

afterEach(async () => {
  const db = await getDb();
  if (!db) return;
  if (created.leadTokens.length) {
    await db.delete(slMessages).where(inArray(slMessages.leadId, db.select({ id: leads.id }).from(leads).where(inArray(leads.captureRequestId, created.leadTokens))));
    await db.delete(slLeadContexts).where(inArray(slLeadContexts.placeId, created.placeIds.length ? created.placeIds : [-1]));
    await db.delete(leads).where(inArray(leads.captureRequestId, created.leadTokens));
    created.leadTokens = [];
  }
  if (created.placeIds.length) {
    await db.delete(slPlaces).where(inArray(slPlaces.id, created.placeIds));
    created.placeIds = [];
  }
  if (created.spaceIds.length) {
    await db.delete(slSpaces).where(inArray(slSpaces.id, created.spaceIds));
    created.spaceIds = [];
  }
  if (created.userIds.length) {
    await db.delete(users).where(inArray(users.id, created.userIds));
    created.userIds = [];
  }
});

describe('Shared Living Spaces MVP', () => {
  it('gates authoring behind the phone-verified rung', async () => {
    const userId = await insertUser('agent', 'unverified');
    const caller = listerCallerFor(userId);

    await expect(
      caller.createDraft({
        addressLinePrivate: '12 Private Road, Johannesburg',
        placeKind: 'house',
        spaceLabel: 'Backyard room',
        accommodationType: 'backyard_room',
        marketTag: 'independent_micro',
        rentAmountMinor: 250_000,
        bills: { electricity: true, water: false, wifi: false },
      }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });

    const otp = await sendPhoneVerificationOtp(userId, '+27821110000');
    expect(otp.status).toBe('dev_mode');
    const verified = await verifyPhoneOtp(userId, '+27821110000', '000000');
    expect(verified.status).toBe('verified');
    expect(await hasVerifiedPhone(userId)).toBe(true);
  });

  it('runs the owner flow: draft -> review -> approved -> publicly searchable', async () => {
    const ownerId = await insertUser('agent', 'owner-flow');
    const moderatorId = await insertUser('super_admin', 'moderator-flow');
    await sendPhoneVerificationOtp(ownerId, '+27821110001');
    await verifyPhoneOtp(ownerId, '+27821110001', '000000');

    const caller = listerCallerFor(ownerId);
    const draft = await caller.createDraft({
      addressLinePrivate: '9 Private Close, Sandton',
      citySlug: 'johannesburg',
      suburbSlug: 'sandton',
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
    created.spaceIds.push(draft.spaceId);

    // Draft is not public yet.
    const hiddenSearch = await publicCaller().search({ accommodationTypes: ['en_suite_room'] });
    expect(hiddenSearch.items.find(item => item.slug === draft.slug)).toBeUndefined();

    await caller.submitForReview({ placeId: draft.placeId });
    const queue = await adminCallerFor(moderatorId).moderationQueue();
    expect(queue.map(item => item.id)).toContain(draft.placeId);
    await adminCallerFor(moderatorId).moderateApprove({ placeId: draft.placeId });

    // Lister flips the space available once published.
    await caller.updateSpace({ spaceId: draft.spaceId, status: 'available' });

    const found = await publicCaller().detail({ slug: draft.slug });
    expect(found).not.toBeNull();
    expect(found!.accommodationType).toBe('en_suite_room');
    // Privacy invariant: private address never leaves the database.
    expect(JSON.stringify(found)).not.toContain('9 Private Close');

    const search = await publicCaller().search({
      marketTag: 'independent_micro',
      location: 'sandton',
      minPrice: 400_000,
      maxPrice: 500_000,
    });
    expect(search.items.map(item => item.slug)).toContain(draft.slug);
  }, 60_000);

  it('fails closed on unknown geography instead of widening', async () => {
    const results = await publicCaller().search({ location: 'not-a-real-place-zz' });
    expect(results.total).toBe(0);
    const badId = await publicCaller().search({ locationIds: ['suburb:not-canonical'] });
    expect(badId.total).toBe(0);
  });

  it('creates a canonical platform-managed lead with an on-platform thread on enquiry', async () => {
    const ownerId = await insertUser('agent', 'thread-owner');
    const enquiryUserId = await insertUser('visitor', 'enquirer-seed');
    void enquiryUserId;
    await sendPhoneVerificationOtp(ownerId, '+27821110002');
    await verifyPhoneOtp(ownerId, '+27821110002', '000000');

    const lister = listerCallerFor(ownerId);
    const draft = await lister.createDraft({
      addressLinePrivate: '5 Shared Yard, Soweto',
      citySlug: 'johannesburg',
      placeKind: 'house',
      spaceLabel: 'Backyard unit 1',
      accommodationType: 'backyard_unit',
      marketTag: 'independent_micro',
      rentUnknown: true,
      bills: { electricity: false, water: false, wifi: false },
    });
    created.placeIds.push(draft.placeId);
    created.spaceIds.push(draft.spaceId);
    await lister.submitForReview({ placeId: draft.placeId });
    await lister.updateSpace({ spaceId: draft.spaceId, status: 'available' });

    const adminId = await insertUser('super_admin', 'approver-thread');
    await adminCallerFor(adminId).moderateApprove({ placeId: draft.placeId });

    const token = randomUUID();
    created.leadTokens.push(token);
    const enquiryResult = await publicCaller().enquire({
      slPlaceId: draft.placeId,
      slSpaceId: draft.spaceId,
      name: 'Test Buyer',
      email: 'buyer@example.com',
      message: 'Is this unit still available from September?',
      captureRequestId: token,
      consent: { accepted: true, version: 'test', source: 'shared_living_detail' },
    });
    expect(enquiryResult.success).toBe(true);

    const db = await getDb();
    const [lead] = await db.select().from(leads).where(eq(leads.captureRequestId, token));
    // Platform-managed custody surfaces as attention_required/manual in the
    // durable row (the response carries the custody classification).
    expect(enquiryResult.deliveryStatus).toBe('attention_required');
    expect(lead.leadDeliveryMethod).toBe('manual');

    const [context] = await db.select().from(slLeadContexts).where(eq(slLeadContexts.leadId, lead.id));
    expect(Number(context.placeId)).toBe(draft.placeId);
    expect(Number(context.spaceId)).toBe(draft.spaceId);

    // Guest replies through the capability token; contact details stay shielded.
    const view = await publicCaller().thread({ token });
    expect(view?.messages.some(message => message.body.includes('September'))).toBe(true);
    expect(JSON.stringify(view)).not.toContain('buyer@example.com');
    expect(JSON.stringify(view)).not.toContain('5 Shared Yard');

    await publicCaller().replyByToken({ token, body: 'Yes — viewing Saturday possible?' });

    // Lister engages through their authenticated workspace surface.
    const listerReply = lister.replyAsLister({ token, body: 'Saturday 10:00 works.' });
    await expect(listerReply).resolves.toMatchObject({ ok: true });

    // A stranger cannot answer another listing's thread.
    const strangerId = await insertUser('agent', 'stranger');
    await expect(
      listerCallerFor(strangerId).replyAsLister({ token, body: 'hijack' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  }, 60_000);
});
