import { afterEach, describe, expect, it } from 'vitest';
import { and, eq, inArray } from 'drizzle-orm';
import { appRouter } from '../routers';
import { getDb } from '../db-connection';
import {
  developmentRequiredDocuments,
  developments,
  distributionDealDocuments,
  distributionDeals,
  distributionIdentities,
  distributionManagerAssignments,
  distributionPrograms,
  users,
} from '../../drizzle/schema';

// Requires DATABASE_URL test DB; skipped in local env when not set.
const hasDb = Boolean(process.env.DATABASE_URL);
const describeWithDb: typeof describe = hasDb
  ? describe
  : ((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL test DB)`, fn)) as typeof describe;

type SeedOptions = {
  includePrimaryAssignment?: boolean;
  requiredDocsCount?: number;
};

const createdState = {
  dealDocumentIds: [] as number[],
  dealIds: [] as number[],
  templateIds: [] as number[],
  assignmentIds: [] as number[],
  programIds: [] as number[],
  identityIds: [] as number[],
  developmentIds: [] as number[],
  userIds: [] as number[],
};

function uniqueIds(ids: number[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

async function insertUser(emailPrefix: string, role: 'visitor' | 'super_admin' = 'visitor') {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const [insertResult] = await db.insert(users).values({
    email: `${emailPrefix}-${suffix}@example.com`,
    role,
    firstName: 'Distribution',
    lastName: 'Manager',
    name: 'Distribution Manager',
    emailVerified: 1,
  });
  const userId = Number((insertResult as any).insertId || 0);
  createdState.userIds.push(userId);
  return userId;
}

async function insertManagerIdentity(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [insertResult] = await db.insert(distributionIdentities).values({
    userId,
    identityType: 'manager',
    active: 1,
    displayName: `Manager ${userId}`,
  });
  const identityId = Number((insertResult as any).insertId || 0);
  createdState.identityIds.push(identityId);
}

async function seedChecklistScenario(options: SeedOptions = {}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const requiredDocsCount = Math.max(0, options.requiredDocsCount ?? 2);
  const includePrimaryAssignment = options.includePrimaryAssignment ?? true;

  const managerUserId = await insertUser('distribution-manager');
  await insertManagerIdentity(managerUserId);

  const outsiderManagerUserId = await insertUser('distribution-outsider');
  await insertManagerIdentity(outsiderManagerUserId);

  const agentUserId = await insertUser('distribution-agent');

  const [developmentInsert] = await db.insert(developments).values({
    name: `Distribution Dev ${Date.now()}`,
    developmentType: 'residential',
    city: 'Johannesburg',
    province: 'Gauteng',
    isPublished: 1,
    approvalStatus: 'approved',
  } as any);
  const developmentId = Number((developmentInsert as any).insertId || 0);
  createdState.developmentIds.push(developmentId);

  const [programInsert] = await db.insert(distributionPrograms).values({
    developmentId,
    isActive: 1,
    isReferralEnabled: 0,
    commissionModel: 'flat_percentage',
    defaultCommissionPercent: 2.5,
    tierAccessPolicy: 'restricted',
    payoutMilestone: 'attorney_signing',
    currencyCode: 'ZAR',
  });
  const programId = Number((programInsert as any).insertId || 0);
  createdState.programIds.push(programId);

  if (includePrimaryAssignment) {
    const [assignmentInsert] = await db.insert(distributionManagerAssignments).values({
      developmentId,
      managerUserId,
      isPrimary: 1,
      isActive: 1,
      assignedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      workloadCapacity: 0,
      timezone: null,
    });
    const assignmentId = Number((assignmentInsert as any).insertId || 0);
    createdState.assignmentIds.push(assignmentId);
  }

  const templateCodes = ['id_document', 'proof_of_address', 'proof_of_income', 'bank_statement'];
  const templateIds: number[] = [];
  for (let index = 0; index < requiredDocsCount; index += 1) {
    const [templateInsert] = await db.insert(developmentRequiredDocuments).values({
      developmentId,
      documentCode: templateCodes[index] as any,
      documentLabel: `Required document ${index + 1}`,
      isRequired: 1,
      sortOrder: index,
      isActive: 1,
    });
    const templateId = Number((templateInsert as any).insertId || 0);
    templateIds.push(templateId);
    createdState.templateIds.push(templateId);
  }

  const [dealInsert] = await db.insert(distributionDeals).values({
    programId,
    developmentId,
    agentId: agentUserId,
    buyerName: 'Buyer Seed',
  });
  const dealId = Number((dealInsert as any).insertId || 0);
  createdState.dealIds.push(dealId);

  return {
    managerUserId,
    outsiderManagerUserId,
    dealId,
    developmentId,
    templateIds,
  };
}

function buildCaller(userId: number, role: 'visitor' | 'super_admin' = 'visitor') {
  return appRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: {
      id: userId,
      role,
    },
  } as any);
}

describeWithDb('distribution.manager deal checklist integration', () => {
  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    const dealDocumentIds = uniqueIds(createdState.dealDocumentIds);
    if (dealDocumentIds.length) {
      await db.delete(distributionDealDocuments).where(inArray(distributionDealDocuments.id, dealDocumentIds));
    }

    const dealIds = uniqueIds(createdState.dealIds);
    if (dealIds.length) {
      await db.delete(distributionDeals).where(inArray(distributionDeals.id, dealIds));
    }

    const templateIds = uniqueIds(createdState.templateIds);
    if (templateIds.length) {
      await db
        .delete(developmentRequiredDocuments)
        .where(inArray(developmentRequiredDocuments.id, templateIds));
    }

    const assignmentIds = uniqueIds(createdState.assignmentIds);
    if (assignmentIds.length) {
      await db
        .delete(distributionManagerAssignments)
        .where(inArray(distributionManagerAssignments.id, assignmentIds));
    }

    const programIds = uniqueIds(createdState.programIds);
    if (programIds.length) {
      await db.delete(distributionPrograms).where(inArray(distributionPrograms.id, programIds));
    }

    const identityIds = uniqueIds(createdState.identityIds);
    if (identityIds.length) {
      await db.delete(distributionIdentities).where(inArray(distributionIdentities.id, identityIds));
    }

    const developmentIds = uniqueIds(createdState.developmentIds);
    if (developmentIds.length) {
      await db.delete(developments).where(inArray(developments.id, developmentIds));
    }

    const userIds = uniqueIds(createdState.userIds);
    if (userIds.length) {
      await db.delete(users).where(inArray(users.id, userIds));
    }

    createdState.dealDocumentIds = [];
    createdState.dealIds = [];
    createdState.templateIds = [];
    createdState.assignmentIds = [];
    createdState.programIds = [];
    createdState.identityIds = [];
    createdState.developmentIds = [];
    createdState.userIds = [];
  });

  it('blocks checklist access for a manager not assigned to the development', async () => {
    const seed = await seedChecklistScenario({ includePrimaryAssignment: true, requiredDocsCount: 1 });
    const caller = buildCaller(seed.outsiderManagerUserId);

    await expect(
      caller.distribution.manager.getDealChecklist({
        dealId: seed.dealId,
      }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('returns checklist with pending statuses for assigned manager', async () => {
    const seed = await seedChecklistScenario({ includePrimaryAssignment: true, requiredDocsCount: 2 });
    const caller = buildCaller(seed.managerUserId);

    const checklist = await caller.distribution.manager.getDealChecklist({
      dealId: seed.dealId,
    });

    expect(checklist.dealId).toBe(seed.dealId);
    expect(checklist.requiredDocuments).toHaveLength(2);
    expect(checklist.requiredDocuments.every((document: any) => document.status === 'pending')).toBe(
      true,
    );
    expect(checklist.computed.requiredCount).toBe(2);
    expect(checklist.computed.verifiedRequiredCount).toBe(0);
    expect(checklist.computed.payoutReady).toBe(false);
  });

  it('upserts document status and writes audit timestamps for received and verified', async () => {
    const seed = await seedChecklistScenario({ includePrimaryAssignment: true, requiredDocsCount: 1 });
    const caller = buildCaller(seed.managerUserId);

    const receivedPayload = await caller.distribution.manager.updateDealDocumentStatus({
      dealId: seed.dealId,
      templateId: seed.templateIds[0],
      status: 'received',
      notes: 'Payslip received by manager',
    });

    const receivedDoc = receivedPayload.requiredDocuments.find(
      (document: any) => Number(document.templateId) === Number(seed.templateIds[0]),
    );
    expect(receivedDoc.status).toBe('received');
    expect(receivedDoc.receivedAt).toBeTruthy();
    expect(receivedDoc.receivedBy?.userId).toBe(seed.managerUserId);

    const verifiedPayload = await caller.distribution.manager.updateDealDocumentStatus({
      dealId: seed.dealId,
      templateId: seed.templateIds[0],
      status: 'verified',
      notes: 'Verified and approved',
    });

    const verifiedDoc = verifiedPayload.requiredDocuments.find(
      (document: any) => Number(document.templateId) === Number(seed.templateIds[0]),
    );
    expect(verifiedDoc.status).toBe('verified');
    expect(verifiedDoc.receivedAt).toBeTruthy();
    expect(verifiedDoc.verifiedAt).toBeTruthy();
    expect(verifiedDoc.receivedBy?.userId).toBe(seed.managerUserId);
    expect(verifiedDoc.verifiedBy?.userId).toBe(seed.managerUserId);

    const db = await getDb();
    const [persistedRow] = await db!
      .select({
        id: distributionDealDocuments.id,
      })
      .from(distributionDealDocuments)
      .where(
        and(
          eq(distributionDealDocuments.dealId, seed.dealId),
          eq(distributionDealDocuments.developmentRequiredDocumentId, seed.templateIds[0]),
        ),
      )
      .limit(1);

    expect(persistedRow?.id).toBeTruthy();
  });

  it('computes payout readiness true when all required docs are verified', async () => {
    const seed = await seedChecklistScenario({ includePrimaryAssignment: true, requiredDocsCount: 2 });
    const caller = buildCaller(seed.managerUserId);

    for (const templateId of seed.templateIds) {
      await caller.distribution.manager.updateDealDocumentStatus({
        dealId: seed.dealId,
        templateId,
        status: 'verified',
      });
    }

    const checklist = await caller.distribution.manager.getDealChecklist({
      dealId: seed.dealId,
    });

    expect(checklist.computed.requiredCount).toBe(2);
    expect(checklist.computed.verifiedRequiredCount).toBe(2);
    expect(checklist.computed.allRequiredVerified).toBe(true);
    expect(checklist.computed.payoutReady).toBe(true);
  });
});
