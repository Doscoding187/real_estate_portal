import { afterEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { appRouter } from '../routers';
import { getDb } from '../db-connection';
import {
  affordabilityAssessments,
  affordabilityMatchSnapshots,
  developerBrandProfiles,
  developmentRequiredDocuments,
  developmentManagerAssignments,
  distributionBrandPartnerships,
  distributionDevelopmentAccess,
  developments,
  distributionDealDocuments,
  distributionDealEvents,
  distributionDeals,
  distributionPrograms,
  users,
} from '../../drizzle/schema';

// Requires DATABASE_URL test DB; skipped in local env when not set.
const hasDb = Boolean(process.env.DATABASE_URL);
const INTEGRATION_TIMEOUT_MS = 30_000;
const describeWithDb: typeof describe = hasDb
  ? describe
  : ((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL test DB)`, fn)) as typeof describe;

const createdState = {
  userIds: [] as number[],
  brandProfileIds: [] as number[],
  developmentIds: [] as number[],
  programIds: [] as number[],
  brandPartnershipIds: [] as number[],
  accessIds: [] as number[],
  assignmentIds: [] as number[],
  dealIds: [] as number[],
  assessmentIds: [] as string[],
  snapshotIds: [] as string[],
  requiredDocumentIds: [] as number[],
};

function uniqueIds(values: number[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function uniqueStringIds(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function createCaller(userId: number, role: 'agent' | 'agency_admin' | 'visitor' | 'super_admin') {
  return appRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: { id: userId, role },
  } as any);
}

function expectDocProgressV2Shape(docProgress: any) {
  expect(docProgress).toMatchObject({
    requiredCount: expect.any(Number),
    uploadedRequiredCount: expect.any(Number),
    verifiedRequiredCount: expect.any(Number),
    pendingReviewCount: expect.any(Number),
    rejectedCount: expect.any(Number),
    missingCount: expect.any(Number),
    uploadComplete: expect.any(Boolean),
    verificationComplete: expect.any(Boolean),
  });
}

async function insertUser(role: 'agent' | 'agency_admin' | 'visitor') {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `distribution-referral-${role}-${suffix}@example.com`;
  const [columnRows] = await db.execute(`SHOW COLUMNS FROM users`);
  const availableColumns = new Set(
    (Array.isArray(columnRows) ? columnRows : []).map((row: any) => String(row.Field || '')),
  );
  const valuesByColumn = new Map<string, any>([
    ['email', email],
    ['role', role],
    ['firstName', 'Flow'],
    ['lastName', 'Tester'],
    ['name', 'Flow Tester'],
    ['emailVerified', 1],
    ['trialStatus', 'none'],
  ]);
  const insertColumns = Array.from(valuesByColumn.keys()).filter(column =>
    availableColumns.has(column),
  );
  const insertValues = insertColumns.map(column => valuesByColumn.get(column));
  const valuesSql = sql.join(insertValues.map(value => sql`${value}`), sql`, `);
  const [insertResult] = await db.execute(
    sql`INSERT INTO users (${sql.raw(insertColumns.join(', '))}) VALUES (${valuesSql})`,
  );

  const userId = Number((insertResult as any).insertId || 0);
  createdState.userIds.push(userId);
  return userId;
}

async function insertDevelopment(name: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const [brandInsertResult] = await db.insert(developerBrandProfiles).values({
    brandName: `${name} Brand`,
    slug: `distribution-brand-${suffix}`,
    ownerType: 'platform',
    profileType: 'industry_reference',
    isVisible: 1,
    identityType: 'developer',
  } as any);
  const brandProfileId = Number((brandInsertResult as any).insertId || 0);
  createdState.brandProfileIds.push(brandProfileId);

  const [insertResult] = await db.insert(developments).values({
    name,
    developmentType: 'residential',
    city: 'Johannesburg',
    province: 'Gauteng',
    developerBrandProfileId: brandProfileId,
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

async function insertNetworkAccess(developmentId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [development] = await db
    .select({ brandProfileId: developments.developerBrandProfileId })
    .from(developments)
    .where(eq(developments.id, developmentId))
    .limit(1);
  const brandProfileId = Number(development?.brandProfileId || 0);
  if (!brandProfileId) throw new Error('Development brand profile missing');

  const [existingPartnership] = await db
    .select({ id: distributionBrandPartnerships.id })
    .from(distributionBrandPartnerships)
    .where(eq(distributionBrandPartnerships.brandProfileId, brandProfileId))
    .limit(1);

  let brandPartnershipId = Number(existingPartnership?.id || 0);
  if (!brandPartnershipId) {
    const [partnershipInsert] = await db.insert(distributionBrandPartnerships).values({
      brandProfileId,
      status: 'active',
      partneredAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });
    brandPartnershipId = Number((partnershipInsert as any).insertId || 0);
    createdState.brandPartnershipIds.push(brandPartnershipId);
  }

  const [existingAccess] = await db
    .select({ id: distributionDevelopmentAccess.id })
    .from(distributionDevelopmentAccess)
    .where(
      and(
        eq(distributionDevelopmentAccess.developmentId, developmentId),
        eq(distributionDevelopmentAccess.brandPartnershipId, brandPartnershipId),
      ),
    )
    .limit(1);

  const existingAccessId = Number(existingAccess?.id || 0);
  if (existingAccessId) return existingAccessId;

  const [accessInsert] = await db.insert(distributionDevelopmentAccess).values({
    developmentId,
    brandPartnershipId,
    brandProfileId,
    status: 'included',
    submissionAllowed: 1,
    excludedByMandate: 0,
    excludedByExclusivity: 0,
    includedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
  });
  const accessId = Number((accessInsert as any).insertId || 0);
  createdState.accessIds.push(accessId);
  return accessId;
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

async function insertRequiredDocument(developmentId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [insertResult] = await db.insert(developmentRequiredDocuments).values({
    developmentId,
    documentCode: 'id_document',
    documentLabel: 'Buyer ID document',
    category: 'client_required_document',
    isRequired: 1,
    isActive: 1,
    sortOrder: 1,
  });

  const documentId = Number((insertResult as any).insertId || 0);
  createdState.requiredDocumentIds.push(documentId);
  return documentId;
}

async function insertAssessment(input: {
  actorUserId: number;
  purchasePrice: number;
  includeSnapshot?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const id = randomUUID();
  await db.insert(affordabilityAssessments).values({
    id,
    actorUserId: input.actorUserId,
    grossIncomeMonthly: 50000,
    deductionsMonthly: 0,
    depositAmount: 0,
    assumptionsJson: {
      interestRateAnnual: 11.75,
      termMonths: 240,
      maxRepaymentRatio: 0.3,
      calcVersion: 'v1',
    } as any,
    outputsJson: {
      maxMonthlyRepayment: 15000,
      indicativeLoanAmount: input.purchasePrice,
      indicativePurchaseMin: input.purchasePrice,
      indicativePurchaseMax: input.purchasePrice,
      purchasePrice: input.purchasePrice,
      confidenceLabel: 'Indicative - needs credit verification',
      confidenceLevel: 'standard',
    } as any,
    locationFilterJson: null,
  });
  createdState.assessmentIds.push(id);

  let snapshotId: string | null = null;
  if (input.includeSnapshot) {
    snapshotId = randomUUID();
    await db.insert(affordabilityMatchSnapshots).values({
      id: snapshotId,
      assessmentId: id,
      matchesJson: {
        assessmentId: id,
        generatedAt: new Date().toISOString(),
        purchasePrice: input.purchasePrice,
        matches: [],
      } as any,
    });
    createdState.snapshotIds.push(snapshotId);
  }

  return {
    assessmentId: id,
    matchSnapshotId: snapshotId,
  };
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

    const snapshotIds = uniqueStringIds(createdState.snapshotIds);
    if (snapshotIds.length) {
      await db.delete(affordabilityMatchSnapshots).where(inArray(affordabilityMatchSnapshots.id, snapshotIds));
    }

    const assessmentIds = uniqueStringIds(createdState.assessmentIds);
    if (assessmentIds.length) {
      await db.delete(affordabilityAssessments).where(inArray(affordabilityAssessments.id, assessmentIds));
    }

    const assignmentIds = uniqueIds(createdState.assignmentIds);
    if (assignmentIds.length) {
      await db
        .delete(developmentManagerAssignments)
        .where(inArray(developmentManagerAssignments.id, assignmentIds));
    }

    const requiredDocumentIds = uniqueIds(createdState.requiredDocumentIds);
    if (requiredDocumentIds.length) {
      await db
        .delete(developmentRequiredDocuments)
        .where(inArray(developmentRequiredDocuments.id, requiredDocumentIds));
    }

    const accessIds = uniqueIds(createdState.accessIds);
    if (accessIds.length) {
      await db.delete(distributionDevelopmentAccess).where(inArray(distributionDevelopmentAccess.id, accessIds));
    }

    const brandPartnershipIds = uniqueIds(createdState.brandPartnershipIds);
    if (brandPartnershipIds.length) {
      await db
        .delete(distributionBrandPartnerships)
        .where(inArray(distributionBrandPartnerships.id, brandPartnershipIds));
    }

    const programIds = uniqueIds(createdState.programIds);
    if (programIds.length) {
      await db.delete(distributionPrograms).where(inArray(distributionPrograms.id, programIds));
    }

    const developmentIds = uniqueIds(createdState.developmentIds);
    if (developmentIds.length) {
      await db.delete(developments).where(inArray(developments.id, developmentIds));
    }

    const brandProfileIds = uniqueIds(createdState.brandProfileIds);
    if (brandProfileIds.length) {
      await db
        .delete(developerBrandProfiles)
        .where(inArray(developerBrandProfiles.id, brandProfileIds));
    }

    const userIds = uniqueIds(createdState.userIds);
    if (userIds.length) {
      await db.delete(users).where(inArray(users.id, userIds));
    }

    createdState.userIds = [];
    createdState.brandProfileIds = [];
    createdState.developmentIds = [];
    createdState.programIds = [];
    createdState.brandPartnershipIds = [];
    createdState.accessIds = [];
    createdState.assignmentIds = [];
    createdState.dealIds = [];
    createdState.assessmentIds = [];
    createdState.snapshotIds = [];
    createdState.requiredDocumentIds = [];
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
  }, INTEGRATION_TIMEOUT_MS);

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
    await insertRequiredDocument(developmentId);
    await insertNetworkAccess(developmentId);

    const result = await caller.distribution.partner.submitReferral({
      developmentId,
      buyerName: 'Eligible Buyer',
      buyerEmail: `buyer-${Date.now()}@example.com`,
    });

    createdState.dealIds.push(Number(result.dealId));

    expect(Number(result.dealId)).toBeGreaterThan(0);
    expect(result.status).toBe('submitted');
    expect(Number(result.managerUserId)).toBe(Number(managerUserId));
  }, INTEGRATION_TIMEOUT_MS);

  it('allows the submitting referrer to upload application documents for manager review', async () => {
    const actorUserId = await insertUser('agent');
    const managerUserId = await insertUser('agent');
    const caller = createCaller(actorUserId, 'agent');

    const developmentId = await insertDevelopment(`Document Upload ${Date.now()}`);
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
    const documentId = await insertRequiredDocument(developmentId);
    await insertNetworkAccess(developmentId);

    const submitted = await caller.distribution.partner.submitReferral({
      developmentId,
      buyerName: 'Document Buyer',
      buyerEmail: `document-buyer-${Date.now()}@example.com`,
    });
    createdState.dealIds.push(Number(submitted.dealId));

    const result = await caller.distribution.partner.submitReferralDocument({
      dealId: Number(submitted.dealId),
      templateId: documentId,
      submittedFileUrl: 'https://example.com/signed-id.pdf',
      submittedFileName: 'signed-id.pdf',
    });

    expect(result.success).toBe(true);
    expectDocProgressV2Shape(result.docProgress);
    expect(result.docProgress).toMatchObject({
      requiredCount: 1,
      uploadedRequiredCount: 1,
      verifiedRequiredCount: 0,
      pendingReviewCount: 1,
      rejectedCount: 0,
      missingCount: 0,
      uploadComplete: true,
      verificationComplete: false,
    });
    expect(result.applicationDocuments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          templateId: documentId,
          status: 'received',
          submittedFileName: 'signed-id.pdf',
        }),
      ]),
    );

    const detail = await caller.distribution.partner.getReferral({ dealId: Number(submitted.dealId) });
    expectDocProgressV2Shape(detail.docProgress);
    expect(detail.docProgress).toMatchObject({
      requiredCount: 1,
      uploadedRequiredCount: 1,
      verifiedRequiredCount: 0,
      pendingReviewCount: 1,
      rejectedCount: 0,
      missingCount: 0,
      uploadComplete: true,
      verificationComplete: false,
    });
    expect(detail.applicationDocuments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          templateId: documentId,
          status: 'received',
          submittedFileUrl: 'https://example.com/signed-id.pdf',
        }),
      ]),
    );
  }, INTEGRATION_TIMEOUT_MS);

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
    await insertRequiredDocument(developmentId);
    await insertNetworkAccess(developmentId);
    await insertManagerAssignment({
      developmentId,
      managerUserId: primaryManagerId,
      isPrimary: true,
      isActive: true,
    });
    await insertRequiredDocument(developmentId);
    await insertNetworkAccess(developmentId);

    const result = await caller.distribution.partner.submitReferral({
      developmentId,
      buyerName: 'Primary Assigned Buyer',
      buyerPhone: `+27${Date.now().toString().slice(-9)}`,
    });

    createdState.dealIds.push(Number(result.dealId));
    expect(Number(result.managerUserId)).toBe(Number(primaryManagerId));
  }, INTEGRATION_TIMEOUT_MS);

  it('supports idempotent submission via clientReference', async () => {
    const actorUserId = await insertUser('agent');
    const managerUserId = await insertUser('agent');
    const caller = createCaller(actorUserId, 'agent');

    const developmentId = await insertDevelopment(`Idempotent Program ${Date.now()}`);
    await insertProgram({
      developmentId,
      isActive: true,
      isReferralEnabled: true,
    });
    await insertManagerAssignment({
      developmentId,
      managerUserId,
      isPrimary: true,
      isActive: true,
    });
    await insertRequiredDocument(developmentId);
    await insertNetworkAccess(developmentId);

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
  }, INTEGRATION_TIMEOUT_MS);

  it("blocks attaching another partner's assessmentId", async () => {
    const ownerUserId = await insertUser('agent');
    const actorUserId = await insertUser('agent');
    const managerUserId = await insertUser('agent');
    const caller = createCaller(actorUserId, 'agent');

    const developmentId = await insertDevelopment(`Assessment Ownership ${Date.now()}`);
    await insertProgram({
      developmentId,
      isActive: true,
      isReferralEnabled: true,
    });
    await insertManagerAssignment({
      developmentId,
      managerUserId,
      isPrimary: true,
      isActive: true,
    });
    await insertRequiredDocument(developmentId);
    await insertNetworkAccess(developmentId);

    const assessment = await insertAssessment({
      actorUserId: ownerUserId,
      purchasePrice: 1200000,
      includeSnapshot: false,
    });

    const error = (await caller.distribution.partner
      .submitReferral({
        developmentId,
        buyerName: 'Ownership Blocked',
        assessmentId: assessment.assessmentId,
      })
      .catch(err => err)) as TRPCError;

    expect(error).toBeInstanceOf(TRPCError);
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.message).toContain('assessmentId is invalid or not accessible');
  }, INTEGRATION_TIMEOUT_MS);

  it('attaching assessment creates snapshot when missing and stores lock linkage', async () => {
    const actorUserId = await insertUser('agent');
    const managerUserId = await insertUser('agent');
    const caller = createCaller(actorUserId, 'agent');
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const developmentId = await insertDevelopment(`Assessment Attach ${Date.now()}`);
    await insertProgram({
      developmentId,
      isActive: true,
      isReferralEnabled: true,
    });
    await insertManagerAssignment({
      developmentId,
      managerUserId,
      isPrimary: true,
      isActive: true,
    });
    await insertRequiredDocument(developmentId);
    await insertNetworkAccess(developmentId);

    const assessment = await insertAssessment({
      actorUserId,
      purchasePrice: 1350000,
      includeSnapshot: false,
    });

    const beforeSnapshots = await db
      .select({ id: affordabilityMatchSnapshots.id })
      .from(affordabilityMatchSnapshots)
      .where(eq(affordabilityMatchSnapshots.assessmentId, assessment.assessmentId));
    expect(beforeSnapshots.length).toBe(0);

    const result = await caller.distribution.partner.submitReferral({
      developmentId,
      buyerName: 'Snapshot Attach Buyer',
      assessmentId: assessment.assessmentId,
    });
    createdState.dealIds.push(Number(result.dealId));

    const [deal] = await db
      .select({
        assessmentId: distributionDeals.affordabilityAssessmentId,
        matchSnapshotId: distributionDeals.affordabilityMatchSnapshotId,
        affordabilityPurchasePrice: distributionDeals.affordabilityPurchasePrice,
      })
      .from(distributionDeals)
      .where(eq(distributionDeals.id, Number(result.dealId)))
      .limit(1);

    expect(String(deal?.assessmentId || '')).toBe(assessment.assessmentId);
    expect(String(deal?.matchSnapshotId || '')).not.toBe('');
    expect(Number(deal?.affordabilityPurchasePrice || 0)).toBeGreaterThan(0);

    const snapshotRows = await db
      .select({
        id: affordabilityMatchSnapshots.id,
      })
      .from(affordabilityMatchSnapshots)
      .where(eq(affordabilityMatchSnapshots.assessmentId, assessment.assessmentId));
    expect(snapshotRows.length).toBe(1);
    createdState.snapshotIds.push(String(snapshotRows[0].id));

    const [assessmentRow] = await db
      .select({
        lockedAt: affordabilityAssessments.lockedAt,
        lockedByDealId: affordabilityAssessments.lockedByDealId,
      })
      .from(affordabilityAssessments)
      .where(eq(affordabilityAssessments.id, assessment.assessmentId))
      .limit(1);
    expect(assessmentRow?.lockedAt).toBeTruthy();
    expect(Number(assessmentRow?.lockedByDealId || 0)).toBe(Number(result.dealId));

    const affordabilityEvents = await db
      .select({
        note: distributionDealEvents.notes,
      })
      .from(distributionDealEvents)
      .where(eq(distributionDealEvents.dealId, Number(result.dealId)));
    expect(
      affordabilityEvents.some(event => String(event.note || '').includes('Affordability Snapshot Attached')),
    ).toBe(true);
  }, INTEGRATION_TIMEOUT_MS);

  it('listMyReferrals returns only the actor own referrals', async () => {
    const actorAUserId = await insertUser('agent');
    const actorBUserId = await insertUser('agent');
    const managerUserId = await insertUser('agent');
    const callerA = createCaller(actorAUserId, 'agent');
    const callerB = createCaller(actorBUserId, 'agent');

    const developmentId = await insertDevelopment(`Ownership Program ${Date.now()}`);
    await insertProgram({
      developmentId,
      isActive: true,
      isReferralEnabled: true,
    });
    await insertManagerAssignment({
      developmentId,
      managerUserId,
      isPrimary: true,
      isActive: true,
    });
    await insertRequiredDocument(developmentId);
    await insertNetworkAccess(developmentId);

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
    expect(actorAReferrals.items.length).toBeGreaterThan(0);
    expectDocProgressV2Shape(actorAReferrals.items[0]?.docProgress);
    const actorADealIds = actorAReferrals.items.map(item => Number(item.dealId));

    expect(actorADealIds).toContain(Number(actorADeal.dealId));
    expect(actorADealIds).not.toContain(Number(actorBDeal.dealId));
  }, INTEGRATION_TIMEOUT_MS);
});
