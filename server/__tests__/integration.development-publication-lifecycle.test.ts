import { afterEach, describe, expect, it, vi } from 'vitest';
import { and, eq, inArray } from 'drizzle-orm';

const { mockSearchProperties } = vi.hoisted(() => ({
  mockSearchProperties: vi.fn(),
}));

vi.mock('../services/propertySearchService', () => ({
  propertySearchService: {
    searchProperties: mockSearchProperties,
  },
}));

import { appRouter } from '../routers';
import { getDb } from '../db-connection';
import {
  developmentApprovalQueue,
  developers,
  developments,
  unitTypes,
  users,
} from '../../drizzle/schema';
import { developmentService } from '../services/developmentService';

const hasDb = Boolean(process.env.DATABASE_URL);
const describeWithDb: typeof describe = hasDb
  ? describe
  : (((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL)`, fn)) as typeof describe);

type Fixture = {
  userId: number;
  developerId?: number;
  developmentIds: number[];
};

const fixtures: Fixture[] = [];

async function createFixture(role: 'property_developer' | 'super_admin' = 'property_developer') {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const [userResult] = await db.insert(users).values({
    email: `development-lifecycle-${role}-${suffix}@example.com`,
    role,
    firstName: 'Development',
    lastName: 'Lifecycle',
    name: `${role} lifecycle user`,
    emailVerified: 1,
  });
  const fixture: Fixture = { userId: Number(userResult.insertId), developmentIds: [] };

  if (role === 'property_developer') {
    const [developerResult] = await db.insert(developers).values({
      userId: fixture.userId,
      name: `Lifecycle Developer ${suffix}`,
      email: `development-lifecycle-developer-${suffix}@example.com`,
      category: 'residential',
      status: 'approved',
      isVerified: 1,
    });
    fixture.developerId = Number(developerResult.insertId);
  }

  fixtures.push(fixture);
  return fixture;
}

async function createDevelopmentFor(
  fixture: Fixture,
  options: {
    description?: string;
    suffix?: string;
    images?: unknown[];
    unitTypes?: unknown[];
    ownershipType?: string;
    transactionType?: 'for_sale' | 'auction';
  } = {},
) {
  const suffix = options.suffix ?? `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const development = await developmentService.createDevelopment(fixture.userId, {
    name: `Lifecycle Development ${suffix}`,
    developmentType: 'residential',
    transactionType: options.transactionType ?? 'for_sale',
    city: 'Johannesburg',
    province: 'Gauteng',
    suburb: 'Berea',
    address: '1 Lifecycle Road, Berea',
    status: 'selling',
    ownershipType: options.ownershipType ?? 'sectional-title',
    highlights: ['Secure estate', 'Close to transport', 'Energy efficient'],
    description:
      options.description ??
      'A valid description for the developer submission flow with enough persisted detail to pass review.',
    images: options.images ?? [{ url: 'https://example.com/lifecycle-hero.jpg', category: 'hero' }],
    unitTypes: options.unitTypes ?? [
      {
        name: 'Two Bedroom Apartment',
        bedrooms: 2,
        bathrooms: 2,
        unitSize: 70,
        priceFrom: 1200000,
        totalUnits: 10,
        availableUnits: 10,
        parkingType: 'none',
        parkingBays: 0,
      },
    ],
  } as any);

  fixture.developmentIds.push(Number(development.id));
  return development;
}

function callerFor(userId: number, role: 'property_developer' | 'super_admin') {
  return appRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: { id: userId, role },
  } as any);
}

describeWithDb('Developer development publication lifecycle integration', () => {
  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    while (fixtures.length > 0) {
      const fixture = fixtures.pop()!;
      if (fixture.developmentIds.length > 0) {
        await db
          .delete(developmentApprovalQueue)
          .where(inArray(developmentApprovalQueue.developmentId, fixture.developmentIds));
        await db.delete(unitTypes).where(inArray(unitTypes.developmentId, fixture.developmentIds));
        await db.delete(developments).where(inArray(developments.id, fixture.developmentIds));
      }
      if (fixture.developerId) {
        await db.delete(developers).where(eq(developers.id, fixture.developerId));
      }
      await db.delete(users).where(eq(users.id, fixture.userId));
    }
  });

  it('submits an owned development for review and exposes it publicly only after admin approval', async () => {
    const owner = await createFixture();
    const reviewer = await createFixture('super_admin');
    const development = await createDevelopmentFor(owner);
    const developmentId = Number(development.id);

    const ownerCaller = callerFor(owner.userId, 'property_developer');
    const submission = await ownerCaller.developer.publishDevelopment({ id: developmentId });

    expect(submission).toMatchObject({ approvalStatus: 'pending', isPublished: 0 });
    const db = await getDb();
    const [pendingReview] = await db!
      .select()
      .from(developmentApprovalQueue)
      .where(eq(developmentApprovalQueue.developmentId, developmentId));
    expect(pendingReview).toMatchObject({ status: 'pending', submissionType: 'initial' });
    expect(await developmentService.getPublicDevelopmentBySlug(String(developmentId))).toBeNull();
    expect(await developmentService.getPublicDevelopment(developmentId)).toBeNull();
    expect(
      (await developmentService.listPublicDevelopments({ developerId: owner.developerId })).some(
        item => Number(item.id) === developmentId,
      ),
    ).toBe(false);

    await expect(
      ownerCaller.admin.adminApproveDevelopment({ developmentId }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    const reviewerCaller = callerFor(reviewer.userId, 'super_admin');
    await reviewerCaller.admin.adminApproveDevelopment({ developmentId });

    const [approvedReview] = await db!
      .select()
      .from(developmentApprovalQueue)
      .where(eq(developmentApprovalQueue.id, pendingReview.id));
    expect(approvedReview).toMatchObject({ status: 'approved', reviewedBy: reviewer.userId });
    expect(approvedReview.reviewedAt).toBeTruthy();

    expect(
      await developmentService.getPublicDevelopmentBySlug(String(developmentId)),
    ).toMatchObject({
      id: developmentId,
      approvalStatus: 'approved',
      isPublished: 1,
    });
    expect(await developmentService.getPublicDevelopment(developmentId)).toMatchObject({
      id: developmentId,
      isPublished: 1,
    });
    expect(
      (await developmentService.listPublicDevelopments({ developerId: owner.developerId })).some(
        item => Number(item.id) === developmentId,
      ),
    ).toBe(true);
  });

  it('does not transition incomplete development data to pending through the active developer procedure', async () => {
    const owner = await createFixture();
    const development = await createDevelopmentFor(owner, { description: '' });
    const developmentId = Number(development.id);

    await expect(
      callerFor(owner.userId, 'property_developer').developer.publishDevelopment({
        id: developmentId,
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Development is not ready for submission.',
    });

    const db = await getDb();
    const [unchanged] = await db!
      .select({
        approvalStatus: developments.approvalStatus,
        isPublished: developments.isPublished,
      })
      .from(developments)
      .where(eq(developments.id, developmentId))
      .limit(1);

    expect(unchanged).toMatchObject({ approvalStatus: 'draft', isPublished: 0 });
  });

  it('hides foreign and missing unpublish targets while preserving approval on owner unpublish', async () => {
    const owner = await createFixture();
    const otherDeveloper = await createFixture();
    const reviewer = await createFixture('super_admin');
    const development = await createDevelopmentFor(owner);
    const developmentId = Number(development.id);

    await callerFor(owner.userId, 'property_developer').developer.publishDevelopment({
      id: developmentId,
    });
    await callerFor(reviewer.userId, 'super_admin').admin.adminApproveDevelopment({
      developmentId,
    });

    await expect(
      callerFor(otherDeveloper.userId, 'property_developer').developer.unpublishDevelopment({
        id: developmentId,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'Development not found' });

    const db = await getDb();
    const [afterForeignAttempt] = await db!
      .select({
        approvalStatus: developments.approvalStatus,
        isPublished: developments.isPublished,
      })
      .from(developments)
      .where(eq(developments.id, developmentId))
      .limit(1);
    expect(afterForeignAttempt).toMatchObject({ approvalStatus: 'approved', isPublished: 1 });

    await expect(
      callerFor(otherDeveloper.userId, 'property_developer').developer.unpublishDevelopment({
        id: 999999999,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'Development not found' });

    await callerFor(owner.userId, 'property_developer').developer.unpublishDevelopment({
      id: developmentId,
    });

    const [afterOwnerUnpublish] = await db!
      .select({
        approvalStatus: developments.approvalStatus,
        isPublished: developments.isPublished,
      })
      .from(developments)
      .where(eq(developments.id, developmentId))
      .limit(1);
    expect(afterOwnerUnpublish).toMatchObject({ approvalStatus: 'approved', isPublished: 0 });
    expect(await developmentService.getPublicDevelopmentBySlug(String(developmentId))).toBeNull();
    expect(await developmentService.getPublicDevelopment(developmentId)).toBeNull();
    expect(
      (await developmentService.listPublicDevelopments({ developerId: owner.developerId })).some(
        item => Number(item.id) === developmentId,
      ),
    ).toBe(false);
  });

  it('denies draft and rejected developments through all public development reads', async () => {
    const owner = await createFixture();
    const reviewer = await createFixture('super_admin');
    const development = await createDevelopmentFor(owner);
    const developmentId = Number(development.id);

    expect(await developmentService.getPublicDevelopmentBySlug(String(developmentId))).toBeNull();
    expect(await developmentService.getPublicDevelopment(developmentId)).toBeNull();
    expect(
      (await developmentService.listPublicDevelopments({ developerId: owner.developerId })).some(
        item => Number(item.id) === developmentId,
      ),
    ).toBe(false);

    await callerFor(owner.userId, 'property_developer').developer.publishDevelopment({
      id: developmentId,
    });
    await developmentService.rejectDevelopment(
      developmentId,
      reviewer.userId,
      'Missing compliance proof',
    );

    expect(await developmentService.getPublicDevelopmentBySlug(String(developmentId))).toBeNull();
    expect(await developmentService.getPublicDevelopment(developmentId)).toBeNull();
    expect(
      (await developmentService.listPublicDevelopments({ developerId: owner.developerId })).some(
        item => Number(item.id) === developmentId,
      ),
    ).toBe(false);
  });

  it('returns requested changes to draft with persisted reviewer feedback', async () => {
    const owner = await createFixture();
    const reviewer = await createFixture('super_admin');
    const development = await createDevelopmentFor(owner);
    const developmentId = Number(development.id);
    const feedback = 'Please add a verified hero image and resubmit.';

    await callerFor(owner.userId, 'property_developer').developer.publishDevelopment({
      id: developmentId,
    });
    await callerFor(reviewer.userId, 'super_admin').admin.adminRequestChanges({
      developmentId,
      feedback,
    });

    const db = await getDb();
    const [revision] = await db!
      .select({
        approvalStatus: developments.approvalStatus,
        isPublished: developments.isPublished,
        rejectionNote: developments.rejectionNote,
      })
      .from(developments)
      .where(eq(developments.id, developmentId))
      .limit(1);

    expect(revision).toMatchObject({
      approvalStatus: 'draft',
      isPublished: 0,
      rejectionNote: feedback,
    });
    expect(await developmentService.getPublicDevelopmentBySlug(String(developmentId))).toBeNull();
  });

  it('preserves a completed changes-requested row and creates an update row on resubmission', async () => {
    const owner = await createFixture();
    const reviewer = await createFixture('super_admin');
    const development = await createDevelopmentFor(owner);
    const developmentId = Number(development.id);

    await callerFor(owner.userId, 'property_developer').developer.publishDevelopment({
      id: developmentId,
    });
    await callerFor(reviewer.userId, 'super_admin').admin.adminRequestChanges({
      developmentId,
      feedback: 'Add a clearer media caption.',
    });
    await callerFor(owner.userId, 'property_developer').developer.publishDevelopment({
      id: developmentId,
    });

    const db = await getDb();
    const reviews = await db!
      .select()
      .from(developmentApprovalQueue)
      .where(eq(developmentApprovalQueue.developmentId, developmentId));
    expect(reviews).toHaveLength(2);
    expect(reviews.map(row => row.status)).toEqual(
      expect.arrayContaining(['changes_requested', 'pending']),
    );
    expect(reviews.map(row => row.submissionType)).toEqual(
      expect.arrayContaining(['initial', 'update']),
    );
  });

  it('denies every self-review decision without changing the pending review', async () => {
    const owner = await createFixture();
    const development = await createDevelopmentFor(owner);
    const developmentId = Number(development.id);
    await callerFor(owner.userId, 'property_developer').developer.publishDevelopment({
      id: developmentId,
    });

    for (const decide of [
      () => developmentService.approveDevelopment(developmentId, owner.userId),
      () => developmentService.rejectDevelopment(developmentId, owner.userId, 'No'),
      () => developmentService.requestChanges(developmentId, owner.userId, 'Change this'),
    ]) {
      await expect(decide()).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: 'A submitter cannot review their own development submission.',
      });
    }
    const db = await getDb();
    const [queue] = await db!
      .select()
      .from(developmentApprovalQueue)
      .where(eq(developmentApprovalQueue.developmentId, developmentId));
    const [projection] = await db!
      .select({
        approvalStatus: developments.approvalStatus,
        isPublished: developments.isPublished,
      })
      .from(developments)
      .where(eq(developments.id, developmentId));
    expect(queue).toMatchObject({
      status: 'pending',
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
      rejectionReason: null,
    });
    expect(projection).toMatchObject({ approvalStatus: 'pending', isPublished: 0 });
  });

  it('serializes duplicate submissions and leaves exactly one unresolved row', async () => {
    const owner = await createFixture();
    const development = await createDevelopmentFor(owner);
    const developmentId = Number(development.id);
    const caller = callerFor(owner.userId, 'property_developer');
    const results = await Promise.allSettled([
      caller.developer.publishDevelopment({ id: developmentId }),
      caller.developer.publishDevelopment({ id: developmentId }),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find(result => result.status === 'rejected');
    expect(rejected).toMatchObject({ reason: { code: 'CONFLICT' } });
    const db = await getDb();
    const rows = await db!
      .select()
      .from(developmentApprovalQueue)
      .where(
        and(
          eq(developmentApprovalQueue.developmentId, developmentId),
          inArray(developmentApprovalQueue.status, ['pending', 'reviewing']),
        ),
      );
    expect(rows).toHaveLength(1);
  });

  it('rejects review with zero unresolved rows without changing the development', async () => {
    const owner = await createFixture();
    const reviewer = await createFixture('super_admin');
    const development = await createDevelopmentFor(owner);
    const id = Number(development.id);
    await expect(developmentService.approveDevelopment(id, reviewer.userId)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Development must have exactly one unresolved review record.',
    });
    const db = await getDb();
    const [row] = await db!.select().from(developments).where(eq(developments.id, id));
    expect(row).toMatchObject({ approvalStatus: 'draft', isPublished: 0, publishedAt: null });
  });

  it('fails safely when corruption creates multiple unresolved rows', async () => {
    const owner = await createFixture();
    const reviewer = await createFixture('super_admin');
    const development = await createDevelopmentFor(owner);
    const id = Number(development.id);
    await callerFor(owner.userId, 'property_developer').developer.publishDevelopment({ id });
    const db = await getDb();
    await db!.insert(developmentApprovalQueue).values({
      developmentId: id,
      submittedBy: owner.userId,
      status: 'pending',
      submissionType: 'update',
    });
    await expect(developmentService.approveDevelopment(id, reviewer.userId)).rejects.toMatchObject({
      code: 'CONFLICT',
    });
    const rows = await db!
      .select()
      .from(developmentApprovalQueue)
      .where(eq(developmentApprovalQueue.developmentId, id));
    expect(rows).toHaveLength(2);
    expect(
      rows.every(
        row => row.status === 'pending' && row.reviewedBy === null && row.reviewedAt === null,
      ),
    ).toBe(true);
  });

  it('rejects an ordinary sequential duplicate submission', async () => {
    const owner = await createFixture();
    const development = await createDevelopmentFor(owner);
    const id = Number(development.id);
    const caller = callerFor(owner.userId, 'property_developer');
    await caller.developer.publishDevelopment({ id });
    await expect(caller.developer.publishDevelopment({ id })).rejects.toMatchObject({
      code: 'CONFLICT',
      message: 'Development already has an unresolved review submission.',
    });
    const db = await getDb();
    expect(
      await db!
        .select()
        .from(developmentApprovalQueue)
        .where(eq(developmentApprovalQueue.developmentId, id)),
    ).toHaveLength(1);
  });

  it('serializes conflicting concurrent review decisions', async () => {
    const owner = await createFixture();
    const approver = await createFixture('super_admin');
    const reviser = await createFixture('super_admin');
    const development = await createDevelopmentFor(owner);
    const id = Number(development.id);
    await callerFor(owner.userId, 'property_developer').developer.publishDevelopment({ id });
    const feedback = 'Clarify the development brochure.';
    const results = await Promise.allSettled([
      developmentService.approveDevelopment(id, approver.userId),
      developmentService.requestChanges(id, reviser.userId, feedback),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find(result => result.status === 'rejected');
    expect(rejected).toMatchObject({
      reason: { code: expect.stringMatching(/CONFLICT|BAD_REQUEST/) },
    });
    const db = await getDb();
    const [queue] = await db!
      .select()
      .from(developmentApprovalQueue)
      .where(eq(developmentApprovalQueue.developmentId, id));
    const [projection] = await db!.select().from(developments).where(eq(developments.id, id));
    expect(['approved', 'changes_requested']).toContain(queue.status);
    expect(queue.reviewedBy).toBeTruthy();
    expect(queue.reviewedAt).toBeTruthy();
    if (queue.status === 'approved')
      expect(projection).toMatchObject({
        approvalStatus: 'approved',
        isPublished: 1,
        rejectionNote: null,
      });
    else
      expect(projection).toMatchObject({
        approvalStatus: 'draft',
        isPublished: 0,
        rejectionNote: feedback,
      });
  });

  it('accepts canonical ownership and rejects an arbitrary ownership value atomically', async () => {
    const owner = await createFixture();
    const valid = await createDevelopmentFor(owner, { ownershipType: 'life-rights' });
    await callerFor(owner.userId, 'property_developer').developer.publishDevelopment({ id: Number(valid.id) });
    const invalid = await createDevelopmentFor(owner, { ownershipType: 'made-up-title' });
    await expect(callerFor(owner.userId, 'property_developer').developer.publishDevelopment({ id: Number(invalid.id) })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    const db = await getDb();
    expect(await db!.select().from(developmentApprovalQueue).where(eq(developmentApprovalQueue.developmentId, Number(invalid.id)))).toHaveLength(0);
  });

  it('enforces auction terms and permits an omitted reserve', async () => {
    const owner = await createFixture();
    const futureStart = '2099-01-01T10:00:00.000Z'; const futureEnd = '2099-01-02T10:00:00.000Z';
    const unit = (overrides: Record<string, unknown> = {}) => ({ name: 'Auction unit', priceFrom: 1, totalUnits: 1, availableUnits: 1, startingBid: 100, auctionStartDate: futureStart, auctionEndDate: futureEnd, ...overrides });
    const invalid = await createDevelopmentFor(owner, { transactionType: 'auction', unitTypes: [unit({ reservePrice: 50 })] });
    await expect(callerFor(owner.userId, 'property_developer').developer.publishDevelopment({ id: Number(invalid.id) })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    const valid = await createDevelopmentFor(owner, { transactionType: 'auction', unitTypes: [unit()] });
    await callerFor(owner.userId, 'property_developer').developer.publishDevelopment({ id: Number(valid.id) });
    const db = await getDb(); expect(await db!.select().from(developmentApprovalQueue).where(eq(developmentApprovalQueue.developmentId, Number(valid.id)))).toHaveLength(1);
  });

  it('enforces every persisted auction failure atomically and accepts canonical reserve variants', async () => {
    const owner = await createFixture();
    const start = '2099-06-01T10:00:00.000Z'; const end = '2099-06-02T10:00:00.000Z';
    const base = { name: 'Auction matrix unit', totalUnits: 1, availableUnits: 1, startingBid: 100, auctionStartDate: start, auctionEndDate: end };
    const invalidCases: Array<[string, Record<string, unknown>]> = [
      ['missing bid', { startingBid: undefined }], ['zero bid', { startingBid: 0 }], ['negative bid', { startingBid: -1 }],
      ['invalid start', { auctionStartDate: 'not-a-date' }], ['past start', { auctionStartDate: '2000-01-01T10:00:00.000Z' }], ['missing end', { auctionEndDate: undefined }],
      ['invalid end', { auctionEndDate: 'not-a-date' }], ['end before start', { auctionEndDate: '2099-05-01T10:00:00.000Z' }], ['end equal start', { auctionEndDate: start }],
      ['zero reserve', { reservePrice: 0 }], ['negative reserve', { reservePrice: -1 }], ['reserve below bid', { reservePrice: 99 }],
    ];
    const db = await getDb();
    for (const [_name, overrides] of invalidCases) {
      const development = await createDevelopmentFor(owner, { transactionType: 'auction', unitTypes: [{ ...base, ...overrides }] }); const id = Number(development.id);
      await expect(callerFor(owner.userId, 'property_developer').developer.publishDevelopment({ id })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
      const [projection] = await db!.select().from(developments).where(eq(developments.id, id));
      expect(projection).toMatchObject({ approvalStatus: 'draft', isPublished: 0, publishedAt: null, rejectionNote: null });
      expect(await db!.select().from(developmentApprovalQueue).where(eq(developmentApprovalQueue.developmentId, id))).toHaveLength(0);
    }
    for (const reservePrice of [undefined, 100, 150]) {
      const development = await createDevelopmentFor(owner, { transactionType: 'auction', unitTypes: [{ ...base, reservePrice }] }); const id = Number(development.id);
      await callerFor(owner.userId, 'property_developer').developer.publishDevelopment({ id });
      expect(await db!.select().from(developmentApprovalQueue).where(eq(developmentApprovalQueue.developmentId, id))).toHaveLength(1);
    }
  });
});
