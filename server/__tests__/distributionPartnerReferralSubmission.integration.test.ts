import { afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { appRouter } from '../routers';
import { getDb } from '../db-connection';
import {
  affordabilityAssessments,
  affordabilityMatchSnapshots,
  cataloguePublishers,
  developmentRequiredDocuments,
  developmentManagerAssignments,
  distributionBrandPartnerships,
  distributionDevelopmentAccess,
  developments,
  distributionDealDocuments,
  distributionDealEvents,
  distributionDeals,
  distributionPrograms,
  unitTypes,
  users,
} from '../../drizzle/schema';
import { cataloguePublisherService } from '../services/cataloguePublisherService';
import {
  upsertBrandPartnership,
  upsertDevelopmentAccess,
} from '../services/distributionAccessRepository';

// Requires DATABASE_URL test DB; skipped in local env when not set.
const hasDb = Boolean(process.env.DATABASE_URL);
const INTEGRATION_TIMEOUT_MS = 30_000;
const describeWithDb: typeof describe = hasDb
  ? describe
  : ((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL test DB)`, fn)) as typeof describe;

const createdState = {
  userIds: [] as number[],
  cataloguePublisherIds: [] as number[],
  developmentIds: [] as number[],
  unitTypeIds: [] as string[],
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

async function insertUser(role: 'agent' | 'agency_admin' | 'visitor' | 'super_admin') {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `distribution-referral-${role}-${suffix}@example.com`;
  const [result] = await db.insert(users).values({
    email,
    role,
    firstName: 'Flow',
    lastName: 'Tester',
    name: 'Flow Tester',
    emailVerified: 1,
    onboardingComplete: 1,
  });
  const userId = Number(result.insertId);
  createdState.userIds.push(userId);
  return userId;
}

async function insertDevelopment(name: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const curatorUserId = await insertUser('super_admin');
  const publisher = await cataloguePublisherService.createPlatformReferencePublisher({
    brandName: `${name} Publisher`,
    slug: `distribution-brand-${suffix}`,
    identityType: 'developer',
    sourceAttribution: 'Publicly available referral integration fixture source',
    isVisible: true,
    createdBy: curatorUserId,
  });
  const cataloguePublisherId = Number(publisher.id);
  createdState.cataloguePublisherIds.push(cataloguePublisherId);

  const [insertResult] = await db.insert(developments).values({
    name,
    developmentType: 'residential',
    city: 'Johannesburg',
    province: 'Gauteng',
    cataloguePublisherId,
    transactionType: 'for_sale',
    isPublished: 1,
    approvalStatus: 'approved',
    publishedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    status: 'selling',
  } as any);

  const developmentId = Number((insertResult as any).insertId || 0);
  createdState.developmentIds.push(developmentId);

  const unitTypeId = randomUUID();
  await db.insert(unitTypes).values({
    id: unitTypeId,
    developmentId,
    name: 'Referral Fixture Unit',
    bedrooms: 2,
    bathrooms: '1.0',
    basePriceFrom: '1000000.00',
    isActive: 1,
    totalUnits: 1,
    availableUnits: 1,
  });
  createdState.unitTypeIds.push(unitTypeId);

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

async function insertNetworkAccess(developmentId: number, actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [development] = await db
    .select({ cataloguePublisherId: developments.cataloguePublisherId })
    .from(developments)
    .where(eq(developments.id, developmentId))
    .limit(1);
  const cataloguePublisherId = Number(development?.cataloguePublisherId || 0);
  if (!cataloguePublisherId) throw new Error('Development Catalogue Publisher missing');

  const partnership = await upsertBrandPartnership(db, {
    cataloguePublisherId,
    status: 'active',
    actorUserId,
  });
  const brandPartnershipId = Number(partnership.id);
  createdState.brandPartnershipIds.push(brandPartnershipId);

  const access = await upsertDevelopmentAccess(db, {
    developmentId,
    brandPartnershipId,
    cataloguePublisherId,
    status: 'included',
    submissionAllowed: true,
    excludedByMandate: false,
    excludedByExclusivity: false,
    actorUserId,
  });
  const accessId = Number(access.id);
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
  // Fixture cleanup runs once per file, not per test. Every entity is created
  // with a unique suffix, so no test depends on a previous test's deletion for
  // isolation. Per-test delete cascades take next-key/gap locks on the shared
  // auto-increment keyspaces (users, catalogue_publishers, developments) while
  // sibling worker files insert their own fixtures into the same gaps; under
  // the parallel disposable-DB runner this produced intermittent
  // ER_LOCK_DEADLOCK failures whose victim statement varied between runs.
  afterAll(async () => {
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
    const unitTypeIds = uniqueStringIds(createdState.unitTypeIds);
    if (unitTypeIds.length) {
      await db.delete(unitTypes).where(inArray(unitTypes.id, unitTypeIds));
    }

    if (developmentIds.length) {
      await db.delete(developments).where(inArray(developments.id, developmentIds));
    }

    const cataloguePublisherIds = uniqueIds(createdState.cataloguePublisherIds);
    if (cataloguePublisherIds.length) {
      await db
        .delete(cataloguePublishers)
        .where(inArray(cataloguePublishers.id, cataloguePublisherIds));
    }

    const userIds = uniqueIds(createdState.userIds);
    if (userIds.length) {
      await db.delete(users).where(inArray(users.id, userIds));
    }

    createdState.userIds = [];
    createdState.cataloguePublisherIds = [];
    createdState.developmentIds = [];
    createdState.unitTypeIds = [];
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
    const managerUserId = await insertUser('agent');
    const caller = createCaller(actorUserId, 'agent');

    const inactiveDevelopmentId = await insertDevelopment(`Inactive Program ${Date.now()}`);
    await insertProgram({
      developmentId: inactiveDevelopmentId,
      isActive: false,
      isReferralEnabled: true,
    });
    await insertManagerAssignment({
      developmentId: inactiveDevelopmentId,
      managerUserId,
      isPrimary: true,
      isActive: true,
    });
    await insertRequiredDocument(inactiveDevelopmentId);
    await insertNetworkAccess(inactiveDevelopmentId, actorUserId);

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
    await insertManagerAssignment({
      developmentId: disabledDevelopmentId,
      managerUserId,
      isPrimary: true,
      isActive: true,
    });
    await insertRequiredDocument(disabledDevelopmentId);
    await insertNetworkAccess(disabledDevelopmentId, actorUserId);

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
    await insertNetworkAccess(developmentId, actorUserId);

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
    await insertNetworkAccess(developmentId, actorUserId);

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
    expect(result.docProgress).toMatchObject({
      requiredCount: 1,
      verifiedRequiredCount: 0,
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
    expect(detail.docProgress).toMatchObject({
      requiredCount: 1,
      verifiedRequiredCount: 0,
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
    await insertNetworkAccess(developmentId, actorUserId);
    await insertManagerAssignment({
      developmentId,
      managerUserId: primaryManagerId,
      isPrimary: true,
      isActive: true,
    });
    await insertRequiredDocument(developmentId);
    await insertNetworkAccess(developmentId, actorUserId);

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
    await insertNetworkAccess(developmentId, actorUserId);

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
    await insertNetworkAccess(developmentId, actorUserId);

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
    await insertNetworkAccess(developmentId, actorUserId);

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
    await insertNetworkAccess(developmentId, actorAUserId);

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
  }, INTEGRATION_TIMEOUT_MS);
});
