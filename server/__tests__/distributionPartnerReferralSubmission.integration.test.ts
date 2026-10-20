import { afterAll, describe, expect, it } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';
import { eq, inArray, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { appRouter } from '../routers';
import { getDb } from '../db-connection';
import { createDefaultReferralWorkflowSteps } from '../../shared/distributionReferralIntake';
import {
  DISTRIBUTION_PREVIEW_DEMO_SLUG_PREFIX,
  DISTRIBUTION_PREVIEW_DEMO_SOURCE_ATTRIBUTION,
} from '../../shared/distributionPreviewDemo';
import {
  cataloguePublishers,
  developmentRequiredDocuments,
  developmentManagerAssignments,
  distributionBrandPartnerships,
  distributionDevelopmentAccess,
  developments,
  distributionDealDocuments,
  distributionDealEvents,
  distributionDeals,
  distributionIdentities,
  distributionPrograms,
  distributionReferralIntakeEvidence,
  distributionReferralIntakeEvents,
  distributionReferralIntakePolicyReleases,
  distributionReferralIntakeSessions,
  unitTypes,
  users,
} from '../../drizzle/schema';
import { cataloguePublisherService } from '../services/cataloguePublisherService';
import {
  upsertBrandPartnership,
  upsertDevelopmentAccess,
} from '../services/distributionAccessRepository';

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
  intakePolicyReleaseIds: [] as number[],
  intakeSessionUuids: [] as string[],
  requiredDocumentIds: [] as number[],
};

function uniqueIds(values: number[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function uniqueStringIds(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map(key => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
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

async function insertReferrerIdentity(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.insert(distributionIdentities).values({
    userId,
    identityType: 'referrer',
    active: 1,
    displayName: `Referrer ${userId}`,
  });
}

async function insertDevelopment(name: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const curatorUserId = await insertUser('super_admin');
  const demoSlug = `${DISTRIBUTION_PREVIEW_DEMO_SLUG_PREFIX}${suffix}`;
  const publisher = await cataloguePublisherService.createPlatformReferencePublisher({
    brandName: `${name} Publisher`,
    slug: `distribution-brand-${suffix}`,
    identityType: 'developer',
    sourceAttribution: DISTRIBUTION_PREVIEW_DEMO_SOURCE_ATTRIBUTION,
    isVisible: true,
    createdBy: curatorUserId,
  });
  const cataloguePublisherId = Number(publisher.id);
  createdState.cataloguePublisherIds.push(cataloguePublisherId);

  const [insertResult] = await db.insert(developments).values({
    name,
    slug: demoSlug,
    developmentType: 'residential',
    city: 'Johannesburg',
    province: 'Gauteng',
    cataloguePublisherId,
    transactionType: 'for_sale',
    inventoryMode: 'aggregate',
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
    referrerCommissionType: 'percentage',
    referrerCommissionValue: '2.50',
    referrerCommissionBasis: 'sale_price',
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

function buildPolicyConfiguration() {
  return {
    sharingPermissionDocument: {
      version: '1.0',
      title: 'Prospect sharing permission',
      content: 'The prospect agrees that their details may be shared with the developer.',
    },
    privacyNoticeDocument: {
      version: '1.0',
      title: 'Privacy notice',
      content: 'The prospect has received the privacy notice for this referral.',
    },
    sharingPurpose: 'To introduce the prospect to the developer sales team.',
    namedRecipients: [
      {
        name: 'Developer Sales Lead',
        organization: 'Developer Sales',
        role: 'Sales lead',
      },
    ],
    signatureMethod: 'Signed electronic acknowledgement',
    identityEvidence: {
      acceptedEvidenceTypes: ['South African identity document'],
      allowedMimeTypes: ['application/pdf', 'image/png'],
      maxFileBytes: 1024 * 1024,
      verificationInstructions: 'Verify that the identity document matches the prospect.',
      authorizedRoles: ['Developer team'],
    },
    retention: {
      abandonedIntake: { days: 30, startsFrom: 'draft_created' },
      sharingPermission: { days: 365, startsFrom: 'evidence_captured' },
      identityEvidence: { days: 365, startsFrom: 'evidence_captured' },
      activeReferral: { days: 365, startsFrom: 'referral_submitted' },
      withdrawnReferral: { days: 365, startsFrom: 'referral_withdrawn' },
      closedReferral: { days: 365, startsFrom: 'referral_closed' },
    },
    workflowSteps: createDefaultReferralWorkflowSteps(),
    creditReport: {
      enabled: false,
      providerName: null,
      providerApprovalReference: null,
      authorizationDocument: null,
    },
  };
}

async function insertActiveIntakePolicy(programId: number, actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const configuration = buildPolicyConfiguration();
  const configurationDigest = createHash('sha256')
    .update(canonicalJson(configuration), 'utf8')
    .digest('hex');

  const [insertResult] = await db.insert(distributionReferralIntakePolicyReleases).values({
    programId,
    policyVersion: 1,
    status: 'active',
    configuration: configuration as any,
    configurationDigest,
    approvalReference: `TEST-APPROVAL-${Date.now()}`,
    publishedBy: actorUserId,
    publishedAt: sql`CURRENT_TIMESTAMP`,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  });

  const releaseId = Number((insertResult as any).insertId || 0);
  createdState.intakePolicyReleaseIds.push(releaseId);
  return releaseId;
}

function evidenceBase64() {
  return Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
    'utf8',
  ).toString('base64');
}

async function completeIntake(input: {
  caller: ReturnType<typeof createCaller>;
  developmentId: number;
}) {
  const session = await input.caller.distribution.partner.createReferralIntakeSession({
    developmentId: input.developmentId,
    confirmedPermission: true,
    confirmedPrivacyNotice: true,
  });
  createdState.intakeSessionUuids.push(session.sessionUuid);

  const base64Content = evidenceBase64();
  for (const evidenceType of [
    'sharing_permission',
    'privacy_notice',
    'identity_document',
  ] as const) {
    await input.caller.distribution.partner.uploadReferralIntakeEvidence({
      sessionUuid: session.sessionUuid,
      evidenceType,
      mimeType: 'application/pdf',
      base64Content,
    });
  }

  return session.sessionUuid;
}

async function seedScenario(input?: {
  isActive?: boolean;
  isReferralEnabled?: boolean;
  includeSecondaryManagerFirst?: boolean;
}) {
  const actorUserId = await insertUser('agent');
  await insertReferrerIdentity(actorUserId);
  const managerUserId = await insertUser('agent');
  const caller = createCaller(actorUserId, 'agent');

  const developmentId = await insertDevelopment(`Referral Flow ${Date.now()}`);
  const programId = await insertProgram({
    developmentId,
    isActive: input?.isActive ?? true,
    isReferralEnabled: input?.isReferralEnabled ?? true,
  });

  if (input?.includeSecondaryManagerFirst) {
    const nonPrimaryManagerId = await insertUser('agent');
    await insertManagerAssignment({
      developmentId,
      managerUserId: nonPrimaryManagerId,
      isPrimary: false,
      isActive: true,
    });
  }

  await insertManagerAssignment({
    developmentId,
    managerUserId,
    isPrimary: true,
    isActive: true,
  });
  const templateId = await insertRequiredDocument(developmentId);
  await insertNetworkAccess(developmentId, actorUserId);
  await insertActiveIntakePolicy(programId, actorUserId);
  const intakeSessionUuid = await completeIntake({ caller, developmentId });

  return {
    actorUserId,
    managerUserId,
    caller,
    developmentId,
    programId,
    templateId,
    intakeSessionUuid,
  };
}

describeWithDb('distribution.partner.submitReferral integration', () => {
  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    const dealIds = uniqueIds(createdState.dealIds);
    if (dealIds.length) {
      await db.delete(distributionDealDocuments).where(inArray(distributionDealDocuments.dealId, dealIds));
      await db.delete(distributionDealEvents).where(inArray(distributionDealEvents.dealId, dealIds));
      await db.delete(distributionDeals).where(inArray(distributionDeals.id, dealIds));
    }

    const sessionUuids = uniqueStringIds(createdState.intakeSessionUuids);
    if (sessionUuids.length) {
      const sessions = await db
        .select({ id: distributionReferralIntakeSessions.id })
        .from(distributionReferralIntakeSessions)
        .where(inArray(distributionReferralIntakeSessions.sessionUuid, sessionUuids));
      const sessionIds = sessions.map(row => Number(row.id));
      if (sessionIds.length) {
        await db
          .delete(distributionReferralIntakeEvidence)
          .where(inArray(distributionReferralIntakeEvidence.sessionId, sessionIds));
        await db
          .delete(distributionReferralIntakeEvents)
          .where(inArray(distributionReferralIntakeEvents.sessionId, sessionIds));
        await db
          .delete(distributionReferralIntakeSessions)
          .where(inArray(distributionReferralIntakeSessions.id, sessionIds));
      }
    }

    const intakePolicyReleaseIds = uniqueIds(createdState.intakePolicyReleaseIds);
    if (intakePolicyReleaseIds.length) {
      await db
        .delete(distributionReferralIntakePolicyReleases)
        .where(inArray(distributionReferralIntakePolicyReleases.id, intakePolicyReleaseIds));
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
      await db
        .delete(distributionDevelopmentAccess)
        .where(inArray(distributionDevelopmentAccess.id, accessIds));
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
    createdState.intakePolicyReleaseIds = [];
    createdState.intakeSessionUuids = [];
    createdState.requiredDocumentIds = [];
  });

  it('blocks submission when the program is inactive or referrals are disabled', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const inactiveScenario = await seedScenario();
    await db
      .update(distributionPrograms)
      .set({ isActive: 0 })
      .where(eq(distributionPrograms.id, inactiveScenario.programId));

    const inactiveError = (await inactiveScenario.caller.distribution.partner
      .submitReferral({
        developmentId: inactiveScenario.developmentId,
        marketMode: 'sale',
        intakeSessionUuid: inactiveScenario.intakeSessionUuid,
        buyerName: 'Inactive Buyer',
      })
      .catch(error => error)) as TRPCError;

    expect(inactiveError).toBeInstanceOf(TRPCError);
    expect(inactiveError.code).toBe('FORBIDDEN');
    expect(inactiveError.message).toContain('not part of the active referral network');

    const disabledScenario = await seedScenario();
    await db
      .update(distributionPrograms)
      .set({ isReferralEnabled: 0 })
      .where(eq(distributionPrograms.id, disabledScenario.programId));

    const disabledError = (await disabledScenario.caller.distribution.partner
      .submitReferral({
        developmentId: disabledScenario.developmentId,
        marketMode: 'sale',
        intakeSessionUuid: disabledScenario.intakeSessionUuid,
        buyerName: 'Disabled Buyer',
      })
      .catch(error => error)) as TRPCError;

    expect(disabledError).toBeInstanceOf(TRPCError);
    expect(disabledError.code).toBe('FORBIDDEN');
    expect(disabledError.message).toContain('not part of the active referral network');
  }, INTEGRATION_TIMEOUT_MS);

  it('allows submission when program is eligible', async () => {
    const scenario = await seedScenario();

    const result = await scenario.caller.distribution.partner.submitReferral({
      developmentId: scenario.developmentId,
      marketMode: 'sale',
      intakeSessionUuid: scenario.intakeSessionUuid,
      buyerName: 'Eligible Buyer',
      buyerEmail: `buyer-${Date.now()}@example.com`,
    });

    createdState.dealIds.push(Number(result.dealId));

    expect(Number(result.dealId)).toBeGreaterThan(0);
    expect(result.status).toBe('submitted');
    expect(Number(result.managerUserId)).toBe(Number(scenario.managerUserId));
  }, INTEGRATION_TIMEOUT_MS);

  it('requires the complete intake evidence before submission', async () => {
    const actorUserId = await insertUser('agent');
    await insertReferrerIdentity(actorUserId);
    const managerUserId = await insertUser('agent');
    const caller = createCaller(actorUserId, 'agent');

    const developmentId = await insertDevelopment(`Incomplete Intake ${Date.now()}`);
    const programId = await insertProgram({
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
    await insertActiveIntakePolicy(programId, actorUserId);

    const session = await caller.distribution.partner.createReferralIntakeSession({
      developmentId,
      confirmedPermission: true,
      confirmedPrivacyNotice: true,
    });
    createdState.intakeSessionUuids.push(session.sessionUuid);

    const error = (await caller.distribution.partner
      .submitReferral({
        developmentId,
        marketMode: 'sale',
        intakeSessionUuid: session.sessionUuid,
        buyerName: 'Incomplete Buyer',
      })
      .catch(err => err)) as TRPCError;

    expect(error).toBeInstanceOf(TRPCError);
    expect(error.code).toBe('PRECONDITION_FAILED');
    expect(error.message).toContain('Upload the signed sharing permission');
  }, INTEGRATION_TIMEOUT_MS);

  it('keeps secure application-document upload paused', async () => {
    const scenario = await seedScenario();
    const submitted = await scenario.caller.distribution.partner.submitReferral({
      developmentId: scenario.developmentId,
      marketMode: 'sale',
      intakeSessionUuid: scenario.intakeSessionUuid,
      buyerName: 'Document Buyer',
      buyerEmail: `document-buyer-${Date.now()}@example.com`,
    });
    createdState.dealIds.push(Number(submitted.dealId));

    await expect(
      scenario.caller.distribution.partner.submitReferralDocument({
        dealId: Number(submitted.dealId),
        templateId: scenario.templateId,
      }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: expect.stringContaining('Secure deal-document storage'),
    });
  }, INTEGRATION_TIMEOUT_MS);

  it('selects primary active manager for assignment', async () => {
    const scenario = await seedScenario({ includeSecondaryManagerFirst: true });

    const result = await scenario.caller.distribution.partner.submitReferral({
      developmentId: scenario.developmentId,
      marketMode: 'sale',
      intakeSessionUuid: scenario.intakeSessionUuid,
      buyerName: 'Primary Assigned Buyer',
      buyerPhone: `+27${Date.now().toString().slice(-9)}`,
    });

    createdState.dealIds.push(Number(result.dealId));
    expect(Number(result.managerUserId)).toBe(Number(scenario.managerUserId));
  }, INTEGRATION_TIMEOUT_MS);

  it('supports idempotent submission via clientReference', async () => {
    const scenario = await seedScenario();
    const clientReference = `CLIENT-REF-${Date.now()}`;

    const first = await scenario.caller.distribution.partner.submitReferral({
      developmentId: scenario.developmentId,
      marketMode: 'sale',
      intakeSessionUuid: scenario.intakeSessionUuid,
      buyerName: 'Idempotent Buyer',
      clientReference,
    });
    createdState.dealIds.push(Number(first.dealId));

    const second = await scenario.caller.distribution.partner.submitReferral({
      developmentId: scenario.developmentId,
      marketMode: 'sale',
      intakeSessionUuid: scenario.intakeSessionUuid,
      buyerName: 'Idempotent Buyer',
      clientReference,
    });

    expect(Number(second.dealId)).toBe(Number(first.dealId));
    expect(Boolean((second as any).wasDuplicate)).toBe(true);
  }, INTEGRATION_TIMEOUT_MS);

  it('listMyReferrals returns only the actor own referrals', async () => {
    const scenario = await seedScenario();
    const actorBUserId = await insertUser('agent');
    await insertReferrerIdentity(actorBUserId);
    const callerB = createCaller(actorBUserId, 'agent');
    const sessionB = await completeIntake({
      caller: callerB,
      developmentId: scenario.developmentId,
    });

    const actorADeal = await scenario.caller.distribution.partner.submitReferral({
      developmentId: scenario.developmentId,
      marketMode: 'sale',
      intakeSessionUuid: scenario.intakeSessionUuid,
      buyerName: 'Actor A Buyer',
      buyerEmail: `actor-a-${Date.now()}@example.com`,
    });
    createdState.dealIds.push(Number(actorADeal.dealId));

    const actorBDeal = await callerB.distribution.partner.submitReferral({
      developmentId: scenario.developmentId,
      marketMode: 'sale',
      intakeSessionUuid: sessionB,
      buyerName: 'Actor B Buyer',
      buyerEmail: `actor-b-${Date.now()}@example.com`,
    });
    createdState.dealIds.push(Number(actorBDeal.dealId));

    const actorAReferrals = await scenario.caller.distribution.partner.listMyReferrals({
      limit: 50,
    });
    const actorADealIds = actorAReferrals.items.map(item => Number(item.dealId));

    expect(actorADealIds).toContain(Number(actorADeal.dealId));
    expect(actorADealIds).not.toContain(Number(actorBDeal.dealId));
  }, INTEGRATION_TIMEOUT_MS);
});
