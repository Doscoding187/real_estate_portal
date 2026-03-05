import { afterEach, describe, expect, it } from 'vitest';
import { inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { appRouter } from '../routers';
import { getDb } from '../db-connection';
import {
  developmentManagerAssignments,
  developments,
  distributionDealDocuments,
  distributionDealEvents,
  distributionDeals,
  distributionPrograms,
  users,
} from '../../drizzle/schema';

// Requires DATABASE_URL test DB; skipped in local env when not set.
const hasDb = Boolean(process.env.DATABASE_URL);
const describeWithDb: typeof describe = hasDb
  ? describe
  : ((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL test DB)`, fn)) as typeof describe;

const createdState = {
  userIds: [] as number[],
  developmentIds: [] as number[],
  programIds: [] as number[],
  assignmentIds: [] as number[],
  dealIds: [] as number[],
};

function uniqueIds(values: number[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function createCaller(userId: number, role: 'agent' | 'agency_admin' | 'visitor' | 'super_admin') {
  return appRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: { id: userId, role },
  } as any);
}

async function insertUser(role: 'agent' | 'agency_admin' | 'visitor') {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const [insertResult] = await db.insert(users).values({
    email: `distribution-referral-${role}-${suffix}@example.com`,
    role,
    firstName: 'Flow',
    lastName: 'Tester',
    name: 'Flow Tester',
    emailVerified: 1,
  });

  const userId = Number((insertResult as any).insertId || 0);
  createdState.userIds.push(userId);
  return userId;
}

async function insertDevelopment(name: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [insertResult] = await db.insert(developments).values({
    name,
    developmentType: 'residential',
    city: 'Johannesburg',
    province: 'Gauteng',
    isPublished: 1,
    approvalStatus: 'approved',
  } as any);

  const developmentId = Number((insertResult as any).insertId || 0);
  createdState.developmentIds.push(developmentId);
  return developmentId;
}

async function insertProgram(input: {
  developmentId: number;
  isActive: boolean;
  isReferralEnabled: boolean;
  tierAccessPolicy?: 'open' | 'restricted' | 'invite_only';
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [insertResult] = await db.insert(distributionPrograms).values({
    developmentId: input.developmentId,
    isActive: input.isActive ? 1 : 0,
    isReferralEnabled: input.isReferralEnabled ? 1 : 0,
    commissionModel: 'flat_percentage',
    defaultCommissionPercent: 2.5,
    defaultCommissionAmount: null,
    tierAccessPolicy: input.tierAccessPolicy || 'open',
    payoutMilestone: 'transfer_registration',
    payoutMilestoneNotes: null,
    currencyCode: 'ZAR',
  });

  const programId = Number((insertResult as any).insertId || 0);
  createdState.programIds.push(programId);
  return programId;
}

async function insertManagerAssignment(input: {
  developmentId: number;
  managerUserId: number;
  isPrimary: boolean;
  isActive: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [insertResult] = await db.insert(developmentManagerAssignments).values({
    developmentId: input.developmentId,
    managerUserId: input.managerUserId,
    isPrimary: input.isPrimary ? 1 : 0,
    isActive: input.isActive ? 1 : 0,
    workloadCapacity: 0,
    timezone: 'Africa/Johannesburg',
  });

  const assignmentId = Number((insertResult as any).insertId || 0);
  createdState.assignmentIds.push(assignmentId);
  return assignmentId;
}

describeWithDb('distribution.partner.submitReferral integration', () => {
  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    const dealIds = uniqueIds(createdState.dealIds);
    if (dealIds.length) {
      await db.delete(distributionDealDocuments).where(inArray(distributionDealDocuments.dealId, dealIds));
      await db.delete(distributionDealEvents).where(inArray(distributionDealEvents.dealId, dealIds));
      await db.delete(distributionDeals).where(inArray(distributionDeals.id, dealIds));
    }

    const assignmentIds = uniqueIds(createdState.assignmentIds);
    if (assignmentIds.length) {
      await db
        .delete(developmentManagerAssignments)
        .where(inArray(developmentManagerAssignments.id, assignmentIds));
    }

    const programIds = uniqueIds(createdState.programIds);
    if (programIds.length) {
      await db.delete(distributionPrograms).where(inArray(distributionPrograms.id, programIds));
    }

    const developmentIds = uniqueIds(createdState.developmentIds);
    if (developmentIds.length) {
      await db.delete(developments).where(inArray(developments.id, developmentIds));
    }

    const userIds = uniqueIds(createdState.userIds);
    if (userIds.length) {
      await db.delete(users).where(inArray(users.id, userIds));
    }

    createdState.userIds = [];
    createdState.developmentIds = [];
    createdState.programIds = [];
    createdState.assignmentIds = [];
    createdState.dealIds = [];
  });

  it('blocks submission when program is inactive or referrals are disabled', async () => {
    const actorUserId = await insertUser('agent');
    const caller = createCaller(actorUserId, 'agent');

    const inactiveDevelopmentId = await insertDevelopment(`Inactive Program ${Date.now()}`);
    await insertProgram({
      developmentId: inactiveDevelopmentId,
      isActive: false,
      isReferralEnabled: true,
    });

    const inactiveError = (await caller.distribution.partner
      .submitReferral({
        developmentId: inactiveDevelopmentId,
        buyerName: 'Inactive Buyer',
      })
      .catch(error => error)) as TRPCError & {
      data?: {
        errorCode: string;
        reasons: Array<{ code: string; message: string }>;
      };
    };

    expect(inactiveError).toBeInstanceOf(TRPCError);
    expect(inactiveError.data?.errorCode).toBe('PROGRAM_NOT_ELIGIBLE');
    expect(inactiveError.data?.reasons).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'PROGRAM_INACTIVE' })]),
    );

    const disabledDevelopmentId = await insertDevelopment(`Disabled Program ${Date.now()}`);
    await insertProgram({
      developmentId: disabledDevelopmentId,
      isActive: true,
      isReferralEnabled: false,
    });

    const disabledError = (await caller.distribution.partner
      .submitReferral({
        developmentId: disabledDevelopmentId,
        buyerName: 'Disabled Buyer',
      })
      .catch(error => error)) as TRPCError & {
      data?: {
        errorCode: string;
        reasons: Array<{ code: string; message: string }>;
      };
    };

    expect(disabledError).toBeInstanceOf(TRPCError);
    expect(disabledError.data?.errorCode).toBe('PROGRAM_NOT_ELIGIBLE');
    expect(disabledError.data?.reasons).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'REFERRALS_DISABLED' })]),
    );
  });

  it('allows submission when program is eligible', async () => {
    const actorUserId = await insertUser('agent');
    const managerUserId = await insertUser('agent');
    const caller = createCaller(actorUserId, 'agent');

    const developmentId = await insertDevelopment(`Eligible Program ${Date.now()}`);
    await insertProgram({
      developmentId,
      isActive: true,
      isReferralEnabled: true,
      tierAccessPolicy: 'open',
    });
    await insertManagerAssignment({
      developmentId,
      managerUserId,
      isPrimary: true,
      isActive: true,
    });

    const result = await caller.distribution.partner.submitReferral({
      developmentId,
      buyerName: 'Eligible Buyer',
      buyerEmail: `buyer-${Date.now()}@example.com`,
    });

    createdState.dealIds.push(Number(result.dealId));

    expect(Number(result.dealId)).toBeGreaterThan(0);
    expect(result.status).toBe('submitted');
    expect(Number(result.managerUserId)).toBe(Number(managerUserId));
  });

  it('selects primary active manager for assignment', async () => {
    const actorUserId = await insertUser('agent');
    const nonPrimaryManagerId = await insertUser('agent');
    const primaryManagerId = await insertUser('agent');
    const caller = createCaller(actorUserId, 'agent');

    const developmentId = await insertDevelopment(`Primary Manager ${Date.now()}`);
    await insertProgram({
      developmentId,
      isActive: true,
      isReferralEnabled: true,
    });
    await insertManagerAssignment({
      developmentId,
      managerUserId: nonPrimaryManagerId,
      isPrimary: false,
      isActive: true,
    });
    await insertManagerAssignment({
      developmentId,
      managerUserId: primaryManagerId,
      isPrimary: true,
      isActive: true,
    });

    const result = await caller.distribution.partner.submitReferral({
      developmentId,
      buyerName: 'Primary Assigned Buyer',
      buyerPhone: `+27${Date.now().toString().slice(-9)}`,
    });

    createdState.dealIds.push(Number(result.dealId));
    expect(Number(result.managerUserId)).toBe(Number(primaryManagerId));
  });

  it('supports idempotent submission via clientReference', async () => {
    const actorUserId = await insertUser('agent');
    const caller = createCaller(actorUserId, 'agent');

    const developmentId = await insertDevelopment(`Idempotent Program ${Date.now()}`);
    await insertProgram({
      developmentId,
      isActive: true,
      isReferralEnabled: true,
    });

    const clientReference = `CLIENT-REF-${Date.now()}`;
    const first = await caller.distribution.partner.submitReferral({
      developmentId,
      buyerName: 'Idempotent Buyer',
      clientReference,
    });
    createdState.dealIds.push(Number(first.dealId));

    const second = await caller.distribution.partner.submitReferral({
      developmentId,
      buyerName: 'Idempotent Buyer',
      clientReference,
    });

    expect(Number(second.dealId)).toBe(Number(first.dealId));
    expect(Boolean((second as any).wasDuplicate)).toBe(true);
  });

  it('listMyReferrals returns only the actor own referrals', async () => {
    const actorAUserId = await insertUser('agent');
    const actorBUserId = await insertUser('agent');
    const callerA = createCaller(actorAUserId, 'agent');
    const callerB = createCaller(actorBUserId, 'agent');

    const developmentId = await insertDevelopment(`Ownership Program ${Date.now()}`);
    await insertProgram({
      developmentId,
      isActive: true,
      isReferralEnabled: true,
    });

    const actorADeal = await callerA.distribution.partner.submitReferral({
      developmentId,
      buyerName: 'Actor A Buyer',
      buyerEmail: `actor-a-${Date.now()}@example.com`,
    });
    createdState.dealIds.push(Number(actorADeal.dealId));

    const actorBDeal = await callerB.distribution.partner.submitReferral({
      developmentId,
      buyerName: 'Actor B Buyer',
      buyerEmail: `actor-b-${Date.now()}@example.com`,
    });
    createdState.dealIds.push(Number(actorBDeal.dealId));

    const actorAReferrals = await callerA.distribution.partner.listMyReferrals({
      limit: 50,
    });
    const actorADealIds = actorAReferrals.items.map(item => Number(item.dealId));

    expect(actorADealIds).toContain(Number(actorADeal.dealId));
    expect(actorADealIds).not.toContain(Number(actorBDeal.dealId));
  });
});
