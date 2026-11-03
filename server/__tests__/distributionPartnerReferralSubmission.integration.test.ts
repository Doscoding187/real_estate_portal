import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
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
  developmentPlaceAssignments,
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
  distributionProspectCheckFits,
  legalReleases,
  platformTeamRegistrations,
  platformSettings,
  unitTypes,
  userLegalAcceptances,
  users,
} from '../../drizzle/schema';
import { CANONICAL_PLATFORM_SETTINGS } from '../_core/databaseAuthority/dataAdapters/canonicalPlatformSettings';
import { cataloguePublisherService } from '../services/cataloguePublisherService';
import { recordReviewedDevelopmentPlaceAssignment } from '../services/developmentPlaceAssignmentService';
import {
  upsertBrandPartnership,
  upsertDevelopmentAccess,
} from '../services/distributionAccessRepository';
import {
  deleteDistributionReferralEvidence,
  deleteDistributionDealDocument,
  parseDistributionDealDocumentReference,
} from '../services/distributionReferralEvidenceStorage';
import { validateRegistrationLegalAcceptance } from '../services/legalAcceptancePolicy';
import { installSyntheticLegalRelease } from '../test-utils/legalReleaseFixture';

const hasDb = Boolean(process.env.DATABASE_URL);
const INTEGRATION_TIMEOUT_MS = 30_000;
const CANONICAL_TEST_PLACE_ID = 'pl-place-01-dee61758ef3bda7cd1a258ad';
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
  managerRegistrationIds: [] as number[],
  requiredDocumentIds: [] as number[],
  platformSettingKeys: [] as string[],
};
let managerLegalFixture: Awaited<ReturnType<typeof installSyntheticLegalRelease>> | undefined;

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
  await recordReviewedDevelopmentPlaceAssignment({
    developmentId,
    phaseId: null,
    placeId: CANONICAL_TEST_PLACE_ID,
    assignmentKind: 'site',
    evidenceReference: `test-fixture:distribution-referral:${suffix}`,
    reviewerUserId: curatorUserId,
  });

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
    templateFileUrl: '/api/local-media/object?key=properties%2Fdraft-1%2Fclient-info-sheet.pdf',
    templateFileName: 'CLIENT INFO SHEET.pdf',
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
      downloadUrl: '/api/local-media/object?key=properties%2Fdraft-1%2Fpopia-consent.pdf',
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

async function recordCurrentRegistrationLegalAcceptance(userId: number, bundleId: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [release] = await db
    .select()
    .from(legalReleases)
    .where(eq(legalReleases.bundleId, bundleId))
    .limit(1);
  if (!release) throw new Error('Current account registration legal release is unavailable.');

  const acceptedAt = new Date();
  const result = validateRegistrationLegalAcceptance(
    { bundleId: release.bundleId, termsAccepted: true },
    {
      formatVersion: Number(release.formatVersion),
      bundleId: release.bundleId,
      effectiveAt: release.effectiveAt,
      terms: { version: release.termsVersion, content: release.termsContent },
      privacy: { version: release.privacyVersion, content: release.privacyContent },
      status: 'approved',
      approval: {
        reference: release.approvalReference,
        actor: release.approvalActor,
        approvedAt: release.approvedAt,
        contentSha256: release.contentSha256,
      },
    },
    acceptedAt,
  );
  if (!result.ok) throw new Error(`Could not record registration acceptance: ${result.code}`);

  const evidenceId = randomUUID();
  await db.insert(userLegalAcceptances).values({
    id: evidenceId,
    userId,
    bundleId: result.acceptance.bundleId,
    termsSha256: result.acceptance.termsSha256,
    privacyNoticeSha256: result.acceptance.privacyNoticeSha256,
    releaseContentSha256: result.acceptance.releaseContentSha256,
    acceptedAt: acceptedAt.toISOString().slice(0, 23).replace('T', ' '),
    source: 'account_registration',
  });
}

async function inviteAndOnboardManager(input: { managerUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [manager] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, input.managerUserId))
    .limit(1);
  if (!manager?.email) throw new Error('Manager account email is missing.');

  const legalBundleId = managerLegalFixture?.registrationChoice.bundleId;
  if (!legalBundleId) throw new Error('Synthetic registration legal fixture is unavailable.');
  await recordCurrentRegistrationLegalAcceptance(input.managerUserId, legalBundleId);
  const inviterUserId = await insertUser('super_admin');
  const adminCaller = createCaller(inviterUserId, 'super_admin');
  const invitation = await adminCaller.distribution.admin.createManagerInvite({
    fullName: 'Referral Journey Manager',
    email: manager.email,
    phone: '+27110000001',
    company: 'Referral Journey Test',
    currentRole: 'Sales manager',
  });
  createdState.managerRegistrationIds.push(invitation.registrationId);

  const token = new URL(invitation.inviteUrl).searchParams.get('token');
  if (!token) throw new Error('Manager invite did not produce a signed invite token.');

  const managerCaller = createCaller(input.managerUserId, 'visitor');
  const inviteDetails = await managerCaller.distribution.getManagerInvite({ token });
  expect(inviteDetails).toMatchObject({
    email: manager.email,
    status: 'pending',
    canComplete: true,
  });

  const accepted = await managerCaller.distribution.completeManagerInviteRegistration({
    token,
    fullName: 'Referral Journey Manager',
    phone: '+27110000001',
    currentRole: 'Sales manager',
  });
  expect(accepted).toMatchObject({
    success: true,
    userId: input.managerUserId,
    redirectPath: '/distribution/manager',
  });

  const [registration] = await db
    .select({ status: platformTeamRegistrations.status, userId: platformTeamRegistrations.userId })
    .from(platformTeamRegistrations)
    .where(eq(platformTeamRegistrations.id, invitation.registrationId))
    .limit(1);
  expect(registration).toMatchObject({ status: 'approved', userId: input.managerUserId });

  return { managerCaller, adminCaller };
}

async function ensureCanonicalPrimeRate() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [existing] = await db
    .select({ id: platformSettings.id })
    .from(platformSettings)
    .where(eq(platformSettings.settingKey, 'sarb_prime_rate'))
    .limit(1);
  if (existing) return;

  const seed = CANONICAL_PLATFORM_SETTINGS.find(setting => setting.settingKey === 'sarb_prime_rate');
  if (!seed) throw new Error('Canonical prime rate seed missing');
  await db.insert(platformSettings).values({
    settingKey: seed.settingKey,
    settingValue: seed.settingValue,
    description: seed.description,
    category: seed.category,
    isPublic: seed.isPublic,
  });
  createdState.platformSettingKeys.push(seed.settingKey);
}

async function seedScenario(input?: {
  isActive?: boolean;
  isReferralEnabled?: boolean;
  includeSecondaryManagerFirst?: boolean;
  managerInviteOnboarding?: boolean;
}) {
  const actorUserId = await insertUser('agent');
  await insertReferrerIdentity(actorUserId);
  const managerUserId = await insertUser(input?.managerInviteOnboarding ? 'visitor' : 'agent');
  const managerJourney = input?.managerInviteOnboarding
    ? await inviteAndOnboardManager({ managerUserId })
    : null;
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

  if (managerJourney) {
    await managerJourney.adminCaller.distribution.admin.assignManagerToDevelopment({
      programId,
      managerUserId,
      isPrimary: true,
      workloadCapacity: 0,
      timezone: 'Africa/Johannesburg',
      isActive: true,
    });
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const [assignment] = await db
      .select({ id: developmentManagerAssignments.id })
      .from(developmentManagerAssignments)
      .where(
        and(
          eq(developmentManagerAssignments.developmentId, developmentId),
          eq(developmentManagerAssignments.managerUserId, managerUserId),
        ),
      )
      .limit(1);
    if (!assignment) throw new Error('Manager development assignment could not be recorded.');
    createdState.assignmentIds.push(Number(assignment.id));
  } else {
    await insertManagerAssignment({
      developmentId,
      managerUserId,
      isPrimary: true,
      isActive: true,
    });
  }
  const templateId = await insertRequiredDocument(developmentId);
  await insertNetworkAccess(developmentId, actorUserId);
  await insertActiveIntakePolicy(programId, actorUserId);
  const intakeSessionUuid = await completeIntake({ caller, developmentId });

  return {
    actorUserId,
    managerUserId,
    managerCaller: managerJourney?.managerCaller,
    caller,
    developmentId,
    programId,
    templateId,
    intakeSessionUuid,
  };
}

describeWithDb('distribution.partner.submitReferral integration', () => {
  beforeAll(async () => {
    if (hasDb) managerLegalFixture = await installSyntheticLegalRelease();
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) {
      await managerLegalFixture?.cleanup();
      return;
    }

    const dealIds = uniqueIds(createdState.dealIds);
    if (dealIds.length) {
      const storedRows = await db
        .select({ submittedFileUrl: distributionDealDocuments.submittedFileUrl })
        .from(distributionDealDocuments)
        .where(inArray(distributionDealDocuments.dealId, dealIds));
      for (const row of storedRows) {
        const reference = parseDistributionDealDocumentReference(row.submittedFileUrl);
        if (reference) {
          await deleteDistributionDealDocument(reference).catch(() => undefined);
        }
      }
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
        const storedEvidence = await db
          .select({
            storageAdapter: distributionReferralIntakeEvidence.storageAdapter,
            storageKey: distributionReferralIntakeEvidence.storageKey,
          })
          .from(distributionReferralIntakeEvidence)
          .where(inArray(distributionReferralIntakeEvidence.sessionId, sessionIds));
        for (const row of storedEvidence) {
          if (
            (row.storageAdapter === 'local' || row.storageAdapter === 's3') &&
            row.storageKey
          ) {
            await deleteDistributionReferralEvidence({
              storageAdapter: row.storageAdapter,
              storageKey: row.storageKey,
            }).catch(() => undefined);
          }
        }
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
      await db
        .delete(developmentPlaceAssignments)
        .where(inArray(developmentPlaceAssignments.developmentId, developmentIds));
      await db.delete(developments).where(inArray(developments.id, developmentIds));
    }

    const cataloguePublisherIds = uniqueIds(createdState.cataloguePublisherIds);
    if (cataloguePublisherIds.length) {
      await db
        .delete(cataloguePublishers)
        .where(inArray(cataloguePublishers.id, cataloguePublisherIds));
    }

    const managerRegistrationIds = uniqueIds(createdState.managerRegistrationIds);
    if (managerRegistrationIds.length) {
      await db
        .delete(platformTeamRegistrations)
        .where(inArray(platformTeamRegistrations.id, managerRegistrationIds));
    }

    // The CI runtime role cannot delete legal evidence. The fixture authority
    // owns cleanup of its synthetic release and every acceptance tied to it.
    await managerLegalFixture?.cleanup();

    const userIds = uniqueIds(createdState.userIds);
    if (userIds.length) {
      await db.delete(users).where(inArray(users.id, userIds));
    }

    for (const settingKey of uniqueStringIds(createdState.platformSettingKeys)) {
      await db.delete(platformSettings).where(eq(platformSettings.settingKey, settingKey));
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
    createdState.managerRegistrationIds = [];
    createdState.requiredDocumentIds = [];
    createdState.platformSettingKeys = [];
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

    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const [deal] = await db
      .select({ currentStage: distributionDeals.currentStage })
      .from(distributionDeals)
      .where(eq(distributionDeals.id, Number(result.dealId)))
      .limit(1);
    expect(deal?.currentStage).toBe('referral_received');

    const [initialEvent] = await db
      .select({
        fromStage: distributionDealEvents.fromStage,
        toStage: distributionDealEvents.toStage,
      })
      .from(distributionDealEvents)
      .where(eq(distributionDealEvents.dealId, Number(result.dealId)))
      .orderBy(asc(distributionDealEvents.id))
      .limit(1);
    expect(initialEvent).toMatchObject({
      fromStage: null,
      toStage: 'referral_received',
    });
  }, INTEGRATION_TIMEOUT_MS);

  it('onboards the invited manager, assigns the development, and exposes submitted checklist and intake evidence', async () => {
    const scenario = await seedScenario({ managerInviteOnboarding: true });
    const managerCaller = scenario.managerCaller;
    if (!managerCaller) throw new Error('Manager invite onboarding did not return a manager caller.');

    const submitted = await scenario.caller.distribution.partner.submitReferral({
      developmentId: scenario.developmentId,
      marketMode: 'sale',
      intakeSessionUuid: scenario.intakeSessionUuid,
      buyerName: 'Manager Handoff Buyer',
      buyerEmail: `manager-handoff-${Date.now()}@example.com`,
    });
    const dealId = Number(submitted.dealId);
    createdState.dealIds.push(dealId);
    expect(Number(submitted.managerUserId)).toBe(scenario.managerUserId);

    const assignments = await managerCaller.distribution.manager.myAssignments();
    expect(assignments.some(row => Number(row.developmentId) === scenario.developmentId)).toBe(true);

    const deals = await managerCaller.distribution.manager.listDealsForDevelopment({
      developmentId: scenario.developmentId,
      statusFilter: 'all',
      limit: 50,
    });
    expect(deals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dealId,
          docs: expect.objectContaining({
            requiredCount: 1,
            verifiedRequiredCount: 0,
            snapshotAvailable: true,
          }),
        }),
      ]),
    );

    const checklist = await managerCaller.distribution.manager.getDealChecklist({ dealId });
    expect(checklist.dealId).toBe(dealId);
    expect(checklist.requiredDocuments).toHaveLength(1);
    expect(checklist.requiredDocuments[0]).toMatchObject({
      status: 'pending',
      isRequired: true,
    });

    const evidence = await managerCaller.distribution.manager.listDealReferralIntakeEvidence({
      dealId,
    });
    expect(evidence.map(item => item.evidenceType)).toEqual(
      expect.arrayContaining(['sharing_permission', 'privacy_notice', 'identity_document']),
    );
    const downloadedEvidence = await managerCaller.distribution.manager.downloadDealReferralIntakeEvidence({
      dealId,
      evidenceUuid: evidence[0].evidenceUuid,
    });
    expect(downloadedEvidence.mimeType).toBe('application/pdf');
    expect(Buffer.from(downloadedEvidence.base64Content, 'base64').toString('utf8')).toContain(
      '%PDF-1.4',
    );
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

  it('uploads and downloads application documents through private storage', async () => {
    const scenario = await seedScenario();
    const submitted = await scenario.caller.distribution.partner.submitReferral({
      developmentId: scenario.developmentId,
      marketMode: 'sale',
      intakeSessionUuid: scenario.intakeSessionUuid,
      buyerName: 'Document Buyer',
      buyerEmail: `document-buyer-${Date.now()}@example.com`,
    });
    createdState.dealIds.push(Number(submitted.dealId));
    const fileBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n');

    await scenario.caller.distribution.partner.submitReferralDocument({
      dealId: Number(submitted.dealId),
      templateId: scenario.templateId,
      file: {
        fileName: 'sharing-permission.pdf',
        mimeType: 'application/pdf',
        byteSize: fileBuffer.length,
        base64Content: fileBuffer.toString('base64'),
      },
    });

    const referral = await scenario.caller.distribution.partner.getReferral({
      dealId: Number(submitted.dealId),
    });
    const uploadedDocument = referral.applicationDocuments.find(
      document => Number(document.templateId) === Number(scenario.templateId),
    );
    expect(uploadedDocument?.status).toBe('received');
    expect(uploadedDocument?.hasFile).toBe(true);
    expect(uploadedDocument?.submittedFileName).toBe('sharing-permission.pdf');
    expect(JSON.stringify(referral)).not.toContain('private-deal-document');

    const downloaded = await scenario.caller.distribution.partner.downloadReferralDocument({
      dealId: Number(submitted.dealId),
      templateId: scenario.templateId,
    });
    expect(downloaded.fileName).toBe('sharing-permission.pdf');
    expect(Buffer.from(downloaded.base64Content, 'base64').equals(fileBuffer)).toBe(true);

    const otherUserId = await insertUser('agent');
    await insertReferrerIdentity(otherUserId);
    const otherCaller = createCaller(otherUserId, 'agent');
    await expect(
      otherCaller.distribution.partner.downloadReferralDocument({
        dealId: Number(submitted.dealId),
        templateId: scenario.templateId,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      otherCaller.distribution.partner.submitReferralDocument({
        dealId: Number(submitted.dealId),
        templateId: scenario.templateId,
        file: {
          fileName: 'other-referrer.pdf',
          mimeType: 'application/pdf',
          byteSize: fileBuffer.length,
          base64Content: fileBuffer.toString('base64'),
        },
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  }, INTEGRATION_TIMEOUT_MS);

  it('rejects application documents whose extension does not match the selected type', async () => {
    const scenario = await seedScenario();
    const submitted = await scenario.caller.distribution.partner.submitReferral({
      developmentId: scenario.developmentId,
      marketMode: 'sale',
      intakeSessionUuid: scenario.intakeSessionUuid,
      buyerName: 'Mismatched Document Buyer',
      buyerEmail: `mismatched-document-buyer-${Date.now()}@example.com`,
    });
    createdState.dealIds.push(Number(submitted.dealId));

    await expect(
      scenario.caller.distribution.partner.submitReferralDocument({
        dealId: Number(submitted.dealId),
        templateId: scenario.templateId,
        file: {
          fileName: 'sharing-permission.txt',
          mimeType: 'application/pdf',
          byteSize: 8,
          base64Content: Buffer.from('%PDF-1.4').toString('base64'),
        },
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Upload a PDF, JPEG, PNG, or WebP document.',
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
  it('gives the referrer the prospect documents to download and sign', async () => {
    const scenario = await seedScenario();

    const packs = await scenario.caller.distribution.partner.getProspectDocumentPacks({
      developmentIds: [scenario.developmentId],
    });

    expect(packs).toHaveLength(1);
    expect(packs[0].downloads.map(download => download.label)).toEqual(
      expect.arrayContaining(['Prospect sharing permission', 'Buyer ID document']),
    );
    expect(
      packs[0].downloads.find(download => download.label === 'Buyer ID document')?.url,
    ).toContain('client-info-sheet.pdf');
    expect(packs[0].uploads.map(upload => upload.evidenceType)).toEqual([
      'sharing_permission',
      'privacy_notice',
      'identity_document',
    ]);
  });

  it('records a prospect check fit and names the developments the prospect qualifies for', async () => {
    await ensureCanonicalPrimeRate();
    const scenario = await seedScenario();

    const checkFit = await scenario.caller.distribution.partner.createProspectCheckFit({
      prospectName: 'Thandi Mokoena',
      grossIncomeMonthly: 50000,
    });

    expect(checkFit.policyVersion).toBe('prospect_check_fit_v1');
    expect(checkFit.prospectName).toBe('Thandi Mokoena');
    expect(checkFit.assumptions).toMatchObject({
      termMonths: 240,
      repaymentAllowanceRatio: 0.3,
      applicantCount: 1,
      jointAssessment: false,
      approvalReference: 'EDWARD-CHECKFIT-MODEL-2026-10-21',
    });
    expect(checkFit.outputs).toMatchObject({
      combinedGrossIncomeMonthly: 50000,
      repaymentAllowanceMonthly: 15000,
      estimatedPurchasePrice: 1502434,
    });

    const match = checkFit.matches.find(
      candidate => candidate.developmentId === scenario.developmentId,
    );
    expect(match).toMatchObject({
      qualified: true,
      entryPrice: 1000000,
      developmentName: expect.any(String),
    });
    expect(checkFit.outputs.qualifiedDevelopmentCount).toBeGreaterThan(0);

    const stored = await scenario.caller.distribution.partner.listProspectCheckFits({ limit: 10 });
    expect(stored.map(record => record.id)).toContain(checkFit.id);
  }, INTEGRATION_TIMEOUT_MS);

  it('assesses a joint application as one combined income', async () => {
    await ensureCanonicalPrimeRate();
    const scenario = await seedScenario();

    const checkFit = await scenario.caller.distribution.partner.createProspectCheckFit({
      prospectName: 'Thandi Mokoena',
      grossIncomeMonthly: 30000,
      coApplicantName: 'Sipho Mokoena',
      coApplicantGrossIncomeMonthly: 20000,
    });

    expect(checkFit.prospectName).toBe('Thandi Mokoena');
    expect(checkFit.coApplicantName).toBe('Sipho Mokoena');
    expect(checkFit.assumptions).toMatchObject({ applicantCount: 2, jointAssessment: true });
    expect(checkFit.outputs).toMatchObject({
      combinedGrossIncomeMonthly: 50000,
      repaymentAllowanceMonthly: 15000,
      estimatedPurchasePrice: 1502434,
    });
  }, INTEGRATION_TIMEOUT_MS);

  it('attaches the prospect check fit to the referral and locks it to that referral', async () => {
    await ensureCanonicalPrimeRate();
    const scenario = await seedScenario();
    const checkFit = await scenario.caller.distribution.partner.createProspectCheckFit({
      prospectName: 'Thandi Mokoena',
      grossIncomeMonthly: 50000,
    });

    const result = await scenario.caller.distribution.partner.submitReferral({
      developmentId: scenario.developmentId,
      marketMode: 'sale',
      intakeSessionUuid: scenario.intakeSessionUuid,
      buyerName: 'Checked Buyer',
      buyerEmail: `checked-${Date.now()}@example.com`,
      checkFitId: checkFit.id,
    });
    createdState.dealIds.push(Number(result.dealId));

    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const [deal] = await db
      .select({
        prospectCheckFitId: distributionDeals.prospectCheckFitId,
        affordabilityPurchasePrice: distributionDeals.affordabilityPurchasePrice,
      })
      .from(distributionDeals)
      .where(eq(distributionDeals.id, Number(result.dealId)))
      .limit(1);
    expect(deal?.prospectCheckFitId).toBe(checkFit.id);
    expect(deal?.affordabilityPurchasePrice).toBe(1502434);

    const [locked] = await db
      .select({
        lockedAt: distributionProspectCheckFits.lockedAt,
        lockedByDealId: distributionProspectCheckFits.lockedByDealId,
      })
      .from(distributionProspectCheckFits)
      .where(eq(distributionProspectCheckFits.id, checkFit.id))
      .limit(1);
    expect(locked?.lockedAt).toBeTruthy();
    expect(Number(locked?.lockedByDealId)).toBe(Number(result.dealId));

    const secondIntakeSessionUuid = await completeIntake({
      caller: scenario.caller,
      developmentId: scenario.developmentId,
    });
    const reuseError = (await scenario.caller.distribution.partner
      .submitReferral({
        developmentId: scenario.developmentId,
        marketMode: 'sale',
        intakeSessionUuid: secondIntakeSessionUuid,
        buyerName: 'Second Buyer',
        buyerEmail: `second-${Date.now()}@example.com`,
        checkFitId: checkFit.id,
      })
      .catch(error => error)) as TRPCError;

    expect(reuseError).toBeInstanceOf(TRPCError);
    expect(reuseError.code).toBe('PRECONDITION_FAILED');
    expect(reuseError.message).toContain('already attached to a referral');
  }, INTEGRATION_TIMEOUT_MS);

  it('updates the same check fit instead of recording a duplicate for the same prospect', async () => {
    const scenario = await seedScenario();

    const first = await scenario.caller.distribution.partner.createProspectCheckFit({
      prospectName: 'Thandi Mokoena',
      grossIncomeMonthly: 50000,
    });
    const second = await scenario.caller.distribution.partner.createProspectCheckFit({
      prospectName: 'Thandi Mokoena',
      grossIncomeMonthly: 50000,
    });

    expect(second.id).toBe(first.id);

    const listed = await scenario.caller.distribution.partner.listProspectCheckFits({ limit: 20 });
    expect(listed.map(record => record.id)).toEqual([first.id]);
  });

  it('refuses a check fit that did not qualify for the selected opportunity', async () => {
    await ensureCanonicalPrimeRate();
    const scenario = await seedScenario();
    const checkFit = await scenario.caller.distribution.partner.createProspectCheckFit({
      prospectName: 'Nomvula Sibiya',
      grossIncomeMonthly: 10000,
    });

    const error = (await scenario.caller.distribution.partner
      .submitReferral({
        developmentId: scenario.developmentId,
        marketMode: 'sale',
        intakeSessionUuid: scenario.intakeSessionUuid,
        buyerName: 'Unqualified Buyer',
        buyerEmail: `unqualified-${Date.now()}@example.com`,
        checkFitId: checkFit.id,
      })
      .catch(error => error)) as TRPCError;

    expect(error).toBeInstanceOf(TRPCError);
    expect(error.code).toBe('PRECONDITION_FAILED');
    expect(error.message).toContain('did not qualify');
  }, INTEGRATION_TIMEOUT_MS);
});
