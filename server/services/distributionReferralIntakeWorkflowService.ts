import { createHash, randomUUID } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import {
  distributionPrograms,
  distributionReferralIntakeEvidence,
  distributionReferralIntakeEvents,
  distributionReferralIntakePolicyReleases,
  distributionReferralIntakeSessions,
} from '../../drizzle/schema';
import {
  DISTRIBUTION_REFERRAL_EVIDENCE_MIME_TYPES,
  distributionReferralIntakePolicyConfigurationSchema,
} from '../../shared/distributionReferralIntake';
import { getDb } from '../db';
import {
  getDistributionReferralEvidenceStorageStatus,
  readDistributionReferralEvidence,
  storeDistributionReferralEvidence,
  type DistributionReferralEvidenceStorageAdapter,
} from './distributionReferralEvidenceStorage';

const MAX_TRPC_EVIDENCE_BYTES = 10 * 1024 * 1024;
const REQUIRED_EVIDENCE_TYPES = [
  'sharing_permission',
  'privacy_notice',
  'identity_document',
] as const;

type IntakeEvidenceType =
  | 'sharing_permission'
  | 'privacy_notice'
  | 'identity_document'
  | 'credit_authorization';
type IntakeEventType =
  | 'session_created'
  | 'evidence_uploaded'
  | 'referral_submitted'
  | 'referral_withdrawn'
  | 'referral_closed';
type DbExecutor = any;

function sqlDate(value: Date) {
  return value.toISOString().slice(0, 19).replace('T', ' ');
}

function addDays(value: Date, days: number) {
  const result = new Date(value.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function fail(message: string, code: 'PRECONDITION_FAILED' | 'NOT_FOUND' | 'CONFLICT' = 'PRECONDITION_FAILED'): never {
  throw new TRPCError({ code, message });
}

function parsePolicyConfiguration(value: unknown) {
  let candidate = value;
  if (typeof value === 'string') {
    try {
      candidate = JSON.parse(value);
    } catch {
      return fail('The published referral intake policy is invalid. Ask the program manager to review it.');
    }
  }
  const parsed = distributionReferralIntakePolicyConfigurationSchema.safeParse(candidate);
  if (!parsed.success) {
    return fail('The published referral intake policy is incomplete. Ask the program manager to review it.');
  }
  return parsed.data;
}

function assertPrivateEvidenceStorageReady() {
  const status = getDistributionReferralEvidenceStorageStatus();
  if (!status.configured || !status.productionSafe) {
    return fail(status.message || 'Private referral evidence storage is not available.');
  }
  return status;
}

function assertRetentionAnchor(
  rule: { days: number; startsFrom: string } | undefined,
  expected: string,
  label: string,
) {
  if (!rule || rule.startsFrom !== expected) {
    return fail(`The published policy must retain ${label} from ${expected.replace(/_/g, ' ')}.`);
  }
  return rule.days;
}

function decodeEvidence(input: { base64Content: string; mimeType: string }, maxBytes: number) {
  const mimeType = input.mimeType.trim().toLowerCase();
  if (!(DISTRIBUTION_REFERRAL_EVIDENCE_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return fail('Upload a PDF, JPEG, PNG, or WebP document.');
  }
  if (!input.base64Content || input.base64Content.length > Math.ceil(maxBytes * 4 / 3) + 8) {
    return fail(`Each private document must be no larger than ${Math.floor(maxBytes / 1024 / 1024)} MB.`);
  }
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.base64Content)) {
    return fail('The uploaded document could not be read. Choose the file again.');
  }
  const buffer = Buffer.from(input.base64Content, 'base64');
  if (buffer.length < 1 || buffer.length > Math.min(maxBytes, MAX_TRPC_EVIDENCE_BYTES)) {
    return fail(`Each private document must be no larger than ${Math.floor(Math.min(maxBytes, MAX_TRPC_EVIDENCE_BYTES) / 1024 / 1024)} MB.`);
  }
  return { buffer, mimeType };
}

async function resolveDb(db?: DbExecutor) {
  if (db) return db;
  const connection = await getDb();
  if (!connection) throw new Error('Database not available');
  return connection;
}

async function getActivePolicy(db: DbExecutor, developmentId: number) {
  const rows = await db
    .select({
      programId: distributionPrograms.id,
      programActive: distributionPrograms.isActive,
      referralEnabled: distributionPrograms.isReferralEnabled,
      releaseId: distributionReferralIntakePolicyReleases.id,
      policyVersion: distributionReferralIntakePolicyReleases.policyVersion,
      configurationDigest: distributionReferralIntakePolicyReleases.configurationDigest,
      configuration: distributionReferralIntakePolicyReleases.configuration,
      publishedAt: distributionReferralIntakePolicyReleases.publishedAt,
    })
    .from(distributionReferralIntakePolicyReleases)
    .innerJoin(
      distributionPrograms,
      eq(distributionPrograms.id, distributionReferralIntakePolicyReleases.programId),
    )
    .where(
      and(
        eq(distributionPrograms.developmentId, developmentId),
        eq(distributionReferralIntakePolicyReleases.status, 'active'),
      ),
    )
    .orderBy(desc(distributionReferralIntakePolicyReleases.policyVersion))
    .limit(1);
  const policy = rows[0];
  if (!policy || Number(policy.programActive) !== 1 || Number(policy.referralEnabled) !== 1) {
    return fail('This Distribution opportunity is not accepting referrals.');
  }
  const configuration = parsePolicyConfiguration(policy.configuration);
  assertPrivateEvidenceStorageReady();
  return { ...policy, configuration };
}

export async function getPartnerReferralIntakeRequirements(input: {
  developmentId: number;
  db?: DbExecutor;
}) {
  const db = await resolveDb(input.db);
  const policy = await getActivePolicy(db, input.developmentId);
  return {
    developmentId: input.developmentId,
    policyVersion: Number(policy.policyVersion),
    configurationDigest: policy.configurationDigest,
    publishedAt: policy.publishedAt,
    sharingPermissionDocument: policy.configuration.sharingPermissionDocument,
    privacyNoticeDocument: policy.configuration.privacyNoticeDocument,
    sharingPurpose: policy.configuration.sharingPurpose,
    namedRecipients: policy.configuration.namedRecipients,
    signatureMethod: policy.configuration.signatureMethod,
    identityEvidence: policy.configuration.identityEvidence,
    workflowSteps: policy.configuration.workflowSteps,
    requiredEvidenceTypes: [...REQUIRED_EVIDENCE_TYPES],
    maxUploadBytes: Math.min(
      policy.configuration.identityEvidence.maxFileBytes,
      MAX_TRPC_EVIDENCE_BYTES,
    ),
    creditReport: {
      enabled: policy.configuration.creditReport.enabled,
      providerName: policy.configuration.creditReport.enabled
        ? policy.configuration.creditReport.providerName
        : null,
      authorizationDocument: policy.configuration.creditReport.enabled
        ? policy.configuration.creditReport.authorizationDocument
        : null,
    },
  };
}

export async function createPartnerReferralIntakeSession(input: {
  developmentId: number;
  partnerUserId: number;
  confirmedPermission: true;
  confirmedPrivacyNotice: true;
  db?: DbExecutor;
}) {
  const db = await resolveDb(input.db);
  const policy = await getActivePolicy(db, input.developmentId);
  const abandonedIntakeDays = assertRetentionAnchor(
    policy.configuration.retention.abandonedIntake,
    'draft_created',
    'unsubmitted evidence',
  );
  const sessionUuid = randomUUID();
  const createdAt = new Date();
  const draftExpiresAt = addDays(createdAt, abandonedIntakeDays);

  await db.transaction(async (tx: DbExecutor) => {
    await tx.insert(distributionReferralIntakeSessions).values({
      sessionUuid,
      policyReleaseId: Number(policy.releaseId),
      policyVersion: Number(policy.policyVersion),
      policyConfigurationDigest: String(policy.configurationDigest),
      partnerUserId: input.partnerUserId,
      status: 'draft',
      draftExpiresAt: sqlDate(draftExpiresAt),
    });
    const [session] = await tx
      .select({ id: distributionReferralIntakeSessions.id })
      .from(distributionReferralIntakeSessions)
      .where(eq(distributionReferralIntakeSessions.sessionUuid, sessionUuid))
      .limit(1);
    if (!session) throw new Error('Could not create the private referral intake session.');
    await tx.insert(distributionReferralIntakeEvents).values({
      sessionId: Number(session.id),
      eventType: 'session_created',
      actorUserId: input.partnerUserId,
      details: {
        developmentId: input.developmentId,
        programId: Number(policy.programId),
        policyReleaseId: Number(policy.releaseId),
        policyVersion: Number(policy.policyVersion),
        policyConfigurationDigest: String(policy.configurationDigest),
        prospectPermissionConfirmed: input.confirmedPermission,
        privacyNoticeShared: input.confirmedPrivacyNotice,
      },
    });
  });

  return {
    sessionUuid,
    status: 'draft' as const,
    policyVersion: Number(policy.policyVersion),
    draftExpiresAt: sqlDate(draftExpiresAt),
  };
}

async function getOwnedDraftSession(db: DbExecutor, sessionUuid: string, partnerUserId: number) {
  const [row] = await db
    .select({
      id: distributionReferralIntakeSessions.id,
      sessionUuid: distributionReferralIntakeSessions.sessionUuid,
      partnerUserId: distributionReferralIntakeSessions.partnerUserId,
      status: distributionReferralIntakeSessions.status,
      draftExpiresAt: distributionReferralIntakeSessions.draftExpiresAt,
      policyReleaseId: distributionReferralIntakeSessions.policyReleaseId,
      policyVersion: distributionReferralIntakeSessions.policyVersion,
      policyConfigurationDigest: distributionReferralIntakeSessions.policyConfigurationDigest,
      configuration: distributionReferralIntakePolicyReleases.configuration,
      developmentId: distributionPrograms.developmentId,
    })
    .from(distributionReferralIntakeSessions)
    .innerJoin(
      distributionReferralIntakePolicyReleases,
      eq(distributionReferralIntakePolicyReleases.id, distributionReferralIntakeSessions.policyReleaseId),
    )
    .innerJoin(
      distributionPrograms,
      eq(distributionPrograms.id, distributionReferralIntakePolicyReleases.programId),
    )
    .where(
      and(
        eq(distributionReferralIntakeSessions.sessionUuid, sessionUuid),
        eq(distributionReferralIntakeSessions.partnerUserId, partnerUserId),
      ),
    )
    .limit(1);
  if (!row) return fail('Referral intake session not found.', 'NOT_FOUND');
  if (row.status !== 'draft') return fail('This referral intake session is no longer editable.', 'CONFLICT');
  if (new Date(String(row.draftExpiresAt)).getTime() <= Date.now()) {
    return fail('This referral intake session has expired. Start a new referral intake.');
  }
  const configuration = parsePolicyConfiguration(row.configuration);
  assertPrivateEvidenceStorageReady();
  return { ...row, configuration };
}

export async function uploadPartnerReferralIntakeEvidence(input: {
  sessionUuid: string;
  partnerUserId: number;
  evidenceType: IntakeEvidenceType;
  mimeType: string;
  base64Content: string;
  db?: DbExecutor;
}) {
  const db = await resolveDb(input.db);
  const session = await getOwnedDraftSession(db, input.sessionUuid, input.partnerUserId);
  const evidenceRules = session.configuration.identityEvidence;
  if (input.evidenceType === 'credit_authorization' && !session.configuration.creditReport.enabled) {
    return fail('This program has not enabled a separate credit-report authorization step.');
  }
  if (!evidenceRules.allowedMimeTypes.includes(input.mimeType.toLowerCase() as any)) {
    return fail('This document type is not allowed by the published intake policy.');
  }
  const maxBytes = Math.min(evidenceRules.maxFileBytes, MAX_TRPC_EVIDENCE_BYTES);
  const file = decodeEvidence(input, maxBytes);
  const retentionRule = input.evidenceType === 'identity_document'
    ? session.configuration.retention.identityEvidence
    : input.evidenceType === 'credit_authorization'
      ? session.configuration.retention.creditAuthorization
      : session.configuration.retention.sharingPermission;
  const retentionDays = assertRetentionAnchor(
    retentionRule,
    input.evidenceType === 'credit_authorization' ? 'authorization_captured' : 'evidence_captured',
    input.evidenceType.replace(/_/g, ' '),
  );
  const retentionDueAt = sqlDate(addDays(new Date(), retentionDays));
  const evidenceUuid = randomUUID();
  const storageKey = `private/distribution-referrals/${session.sessionUuid}/${evidenceUuid}`;
  const stored = await storeDistributionReferralEvidence({
    storageKey,
    buffer: file.buffer,
    mimeType: file.mimeType,
  });
  const sha256 = createHash('sha256').update(file.buffer).digest('hex');

  try {
    await db.transaction(async (tx: DbExecutor) => {
      await tx.execute(
        sql`SELECT id FROM distribution_referral_intake_sessions WHERE id = ${Number(session.id)} FOR UPDATE`,
      );
      const [lockedSession] = await tx
        .select({ status: distributionReferralIntakeSessions.status })
        .from(distributionReferralIntakeSessions)
        .where(eq(distributionReferralIntakeSessions.id, Number(session.id)))
        .limit(1);
      if (lockedSession?.status !== 'draft') {
        return fail('This referral intake session is no longer editable.', 'CONFLICT');
      }
      await tx.insert(distributionReferralIntakeEvidence).values({
        evidenceUuid,
        sessionId: Number(session.id),
        evidenceType: input.evidenceType,
        storageAdapter: stored.adapter as DistributionReferralEvidenceStorageAdapter,
        storageKey: stored.storageKey,
        mimeType: file.mimeType,
        byteSize: stored.byteSize,
        sha256,
        uploadedByUserId: input.partnerUserId,
        reviewStatus: 'pending',
        storageStatus: 'stored',
        retentionDueAt,
      });
      const [evidence] = await tx
        .select({ id: distributionReferralIntakeEvidence.id })
        .from(distributionReferralIntakeEvidence)
        .where(eq(distributionReferralIntakeEvidence.evidenceUuid, evidenceUuid))
        .limit(1);
      if (!evidence) throw new Error('Could not record uploaded referral evidence.');
      await tx.insert(distributionReferralIntakeEvents).values({
        sessionId: Number(session.id),
        evidenceId: Number(evidence.id),
        eventType: 'evidence_uploaded',
        actorUserId: input.partnerUserId,
        details: {
          evidenceType: input.evidenceType,
          mimeType: file.mimeType,
          byteSize: stored.byteSize,
          sha256,
          policyVersion: Number(session.policyVersion),
          storageAdapter: stored.adapter,
        },
      });
    });
  } catch (error) {
    const { deleteDistributionReferralEvidence } = await import('./distributionReferralEvidenceStorage');
    await deleteDistributionReferralEvidence({ storageAdapter: stored.adapter, storageKey: stored.storageKey }).catch(() => undefined);
    throw error;
  }

  return {
    evidenceUuid,
    evidenceType: input.evidenceType,
    mimeType: file.mimeType,
    byteSize: stored.byteSize,
    reviewStatus: 'pending' as const,
  };
}

export async function getPartnerReferralIntakeSession(input: {
  sessionUuid: string;
  partnerUserId: number;
  db?: DbExecutor;
}) {
  const db = await resolveDb(input.db);
  const session = await getOwnedDraftSession(db, input.sessionUuid, input.partnerUserId);
  const evidence = await db
    .select({
      evidenceUuid: distributionReferralIntakeEvidence.evidenceUuid,
      evidenceType: distributionReferralIntakeEvidence.evidenceType,
      mimeType: distributionReferralIntakeEvidence.mimeType,
      byteSize: distributionReferralIntakeEvidence.byteSize,
      reviewStatus: distributionReferralIntakeEvidence.reviewStatus,
      storageStatus: distributionReferralIntakeEvidence.storageStatus,
      createdAt: distributionReferralIntakeEvidence.createdAt,
    })
    .from(distributionReferralIntakeEvidence)
    .where(eq(distributionReferralIntakeEvidence.sessionId, Number(session.id)))
    .orderBy(desc(distributionReferralIntakeEvidence.createdAt));
  const usableTypes = new Set(
    evidence
      .filter(row => row.storageStatus === 'stored' && row.reviewStatus !== 'rejected')
      .map(row => String(row.evidenceType)),
  );
  return {
    sessionUuid: session.sessionUuid,
    developmentId: Number(session.developmentId),
    policyVersion: Number(session.policyVersion),
    expiresAt: session.draftExpiresAt,
    evidence: evidence.map(row => ({
      evidenceUuid: row.evidenceUuid,
      evidenceType: row.evidenceType,
      mimeType: row.mimeType,
      byteSize: Number(row.byteSize || 0),
      reviewStatus: row.reviewStatus,
      createdAt: row.createdAt,
    })),
    requiredEvidenceComplete: REQUIRED_EVIDENCE_TYPES.every(type => usableTypes.has(type)),
  };
}

export async function getCompletePartnerReferralIntakeSession(input: {
  sessionUuid: string;
  partnerUserId: number;
  developmentId: number;
  db?: DbExecutor;
}) {
  const db = await resolveDb(input.db);
  const session = await getOwnedDraftSession(db, input.sessionUuid, input.partnerUserId);
  if (Number(session.developmentId) !== input.developmentId) {
    return fail('The referral intake documents belong to a different development.');
  }
  const currentPolicy = await getActivePolicy(db, input.developmentId);
  if (
    Number(session.policyReleaseId) !== Number(currentPolicy.releaseId) ||
    String(session.policyConfigurationDigest) !== String(currentPolicy.configurationDigest)
  ) {
    return fail('The intake policy changed. Review the current documents and start a new intake session.');
  }
  const evidence = await db
    .select({
      id: distributionReferralIntakeEvidence.id,
      evidenceUuid: distributionReferralIntakeEvidence.evidenceUuid,
      evidenceType: distributionReferralIntakeEvidence.evidenceType,
      mimeType: distributionReferralIntakeEvidence.mimeType,
      byteSize: distributionReferralIntakeEvidence.byteSize,
      sha256: distributionReferralIntakeEvidence.sha256,
      reviewStatus: distributionReferralIntakeEvidence.reviewStatus,
      storageStatus: distributionReferralIntakeEvidence.storageStatus,
    })
    .from(distributionReferralIntakeEvidence)
    .where(eq(distributionReferralIntakeEvidence.sessionId, Number(session.id)));
  const usable = evidence.filter(
    row => row.storageStatus === 'stored' && row.reviewStatus !== 'rejected',
  );
  const usableTypes = new Set(usable.map(row => String(row.evidenceType)));
  const missing = REQUIRED_EVIDENCE_TYPES.filter(type => !usableTypes.has(type));
  if (missing.length) {
    return fail(`Upload the signed sharing permission, privacy notice, and identity evidence before entering buyer details.`);
  }

  const verifiedAt = new Date().toISOString();
  return {
    id: Number(session.id),
    sessionUuid: String(session.sessionUuid),
    policyReleaseId: Number(session.policyReleaseId),
    policyVersion: Number(session.policyVersion),
    policyConfigurationDigest: String(session.policyConfigurationDigest),
    evidence: usable.map(row => ({
      evidenceUuid: String(row.evidenceUuid),
      evidenceType: String(row.evidenceType),
      mimeType: String(row.mimeType || ''),
      byteSize: Number(row.byteSize || 0),
      sha256: String(row.sha256 || ''),
      reviewStatus: String(row.reviewStatus),
    })),
    capturedAt: verifiedAt,
  };
}

export function buildReferralIntakeEvidenceSnapshot(session: {
  sessionUuid: string;
  policyReleaseId: number;
  policyVersion: number;
  policyConfigurationDigest: string;
  evidence: Array<{
    evidenceUuid: string;
    evidenceType: string;
    mimeType: string;
    byteSize: number;
    sha256: string;
  }>;
  capturedAt: string;
}) {
  return {
    sessionUuid: session.sessionUuid,
    policyReleaseId: session.policyReleaseId,
    policyVersion: session.policyVersion,
    policyConfigurationDigest: session.policyConfigurationDigest,
    evidenceCapturedAt: session.capturedAt,
    evidence: session.evidence.map(item => ({
      evidenceUuid: item.evidenceUuid,
      evidenceType: item.evidenceType,
      mimeType: item.mimeType,
      byteSize: item.byteSize,
      sha256: item.sha256,
    })),
  };
}

export async function markReferralIntakeSubmitted(input: {
  tx: DbExecutor;
  sessionId: number;
  sessionUuid: string;
  developmentId: number;
  partnerUserId: number;
  dealId: number;
  developerProjectionRevision: string;
  referralTermsSnapshotDigest: string;
}) {
  await input.tx.execute(
    sql`SELECT id FROM distribution_programs WHERE development_id = ${input.developmentId} FOR UPDATE`,
  );
  await input.tx.execute(
    sql`SELECT id FROM distribution_referral_intake_sessions WHERE id = ${input.sessionId} FOR UPDATE`,
  );
  const [session] = await input.tx
    .select({
      draftExpiresAt: distributionReferralIntakeSessions.draftExpiresAt,
      policyVersion: distributionReferralIntakeSessions.policyVersion,
      policyReleaseId: distributionReferralIntakeSessions.policyReleaseId,
      status: distributionReferralIntakeSessions.status,
      policyConfigurationDigest: distributionReferralIntakeSessions.policyConfigurationDigest,
      configuration: distributionReferralIntakePolicyReleases.configuration,
      programDevelopmentId: distributionPrograms.developmentId,
      programActive: distributionPrograms.isActive,
      referralEnabled: distributionPrograms.isReferralEnabled,
    })
    .from(distributionReferralIntakeSessions)
    .innerJoin(
      distributionReferralIntakePolicyReleases,
      eq(distributionReferralIntakePolicyReleases.id, distributionReferralIntakeSessions.policyReleaseId),
    )
    .innerJoin(
      distributionPrograms,
      eq(distributionPrograms.id, distributionReferralIntakePolicyReleases.programId),
    )
    .where(
      and(
        eq(distributionReferralIntakeSessions.id, input.sessionId),
        eq(distributionReferralIntakeSessions.sessionUuid, input.sessionUuid),
        eq(distributionReferralIntakeSessions.partnerUserId, input.partnerUserId),
      ),
    )
    .limit(1);
  if (!session || session.status !== 'draft') {
    return fail('This referral intake session has already been submitted or closed.', 'CONFLICT');
  }
  if (
    Number(session.programDevelopmentId) !== input.developmentId ||
    Number(session.programActive) !== 1 ||
    Number(session.referralEnabled) !== 1 ||
    new Date(String(session.draftExpiresAt)).getTime() <= Date.now()
  ) {
    return fail('This Distribution opportunity or intake session is no longer open.');
  }
  const [activePolicy] = await input.tx
    .select({
      id: distributionReferralIntakePolicyReleases.id,
      configurationDigest: distributionReferralIntakePolicyReleases.configurationDigest,
    })
    .from(distributionPrograms)
    .innerJoin(
      distributionReferralIntakePolicyReleases,
      eq(distributionReferralIntakePolicyReleases.programId, distributionPrograms.id),
    )
    .where(
      and(
        eq(distributionReferralIntakePolicyReleases.programId, distributionPrograms.id),
        eq(distributionReferralIntakePolicyReleases.status, 'active'),
        eq(distributionPrograms.developmentId, input.developmentId),
      ),
    )
    .limit(1);
  if (
    !activePolicy ||
    Number(activePolicy.id) !== Number(session.policyReleaseId) ||
    String(activePolicy.configurationDigest) !== String(session.policyConfigurationDigest)
  ) {
    return fail('The current intake policy changed. Review it and start a new session.');
  }
  await input.tx.execute(
    sql`SELECT id FROM distribution_referral_intake_evidence WHERE session_id = ${input.sessionId} FOR UPDATE`,
  );
  const evidenceRows = await input.tx
    .select({
      evidenceType: distributionReferralIntakeEvidence.evidenceType,
      reviewStatus: distributionReferralIntakeEvidence.reviewStatus,
      storageStatus: distributionReferralIntakeEvidence.storageStatus,
    })
    .from(distributionReferralIntakeEvidence)
    .where(eq(distributionReferralIntakeEvidence.sessionId, input.sessionId));
  const usableEvidenceTypes = new Set(
    evidenceRows
      .filter(row => row.storageStatus === 'stored' && row.reviewStatus !== 'rejected')
      .map(row => String(row.evidenceType)),
  );
  if (!REQUIRED_EVIDENCE_TYPES.every(type => usableEvidenceTypes.has(type))) {
    return fail('Required signed documents and identity evidence are missing.');
  }
  const config = parsePolicyConfiguration(session.configuration);
  const activeDays = assertRetentionAnchor(config.retention.activeReferral, 'referral_submitted', 'active referral evidence');
  const now = new Date();
  await input.tx
    .update(distributionReferralIntakeSessions)
    .set({ status: 'submitted', submittedAt: sqlDate(now) })
    .where(
      and(
        eq(distributionReferralIntakeSessions.id, input.sessionId),
        eq(distributionReferralIntakeSessions.status, 'draft'),
      ),
    );
  await input.tx
    .update(distributionReferralIntakeEvidence)
    .set({ retentionDueAt: sqlDate(addDays(now, activeDays)) })
    .where(eq(distributionReferralIntakeEvidence.sessionId, input.sessionId));
  await input.tx.insert(distributionReferralIntakeEvents).values({
    sessionId: input.sessionId,
    eventType: 'referral_submitted',
    actorUserId: input.partnerUserId,
    details: {
      dealId: input.dealId,
      developmentId: input.developmentId,
      policyReleaseId: Number(session.policyReleaseId),
      policyVersion: Number(session.policyVersion),
      developerProjectionRevision: input.developerProjectionRevision,
      referralTermsSnapshotDigest: input.referralTermsSnapshotDigest,
    },
  });
}

async function sessionIdForDeal(db: DbExecutor, dealId: number) {
  const [event] = await db
    .select({ sessionId: distributionReferralIntakeEvents.sessionId })
    .from(distributionReferralIntakeEvents)
    .where(
      and(
        eq(distributionReferralIntakeEvents.eventType, 'referral_submitted'),
        sql`JSON_UNQUOTE(JSON_EXTRACT(${distributionReferralIntakeEvents.details}, '$.dealId')) = ${String(dealId)}`,
      ),
    )
    .limit(1);
  return event?.sessionId ? Number(event.sessionId) : null;
}

export async function listDealReferralIntakeEvidence(input: {
  db?: DbExecutor;
  dealId: number;
}) {
  const db = await resolveDb(input.db);
  const sessionId = await sessionIdForDeal(db, input.dealId);
  if (!sessionId) return [];
  const rows = await db
    .select({
      evidenceUuid: distributionReferralIntakeEvidence.evidenceUuid,
      evidenceType: distributionReferralIntakeEvidence.evidenceType,
      mimeType: distributionReferralIntakeEvidence.mimeType,
      byteSize: distributionReferralIntakeEvidence.byteSize,
      reviewStatus: distributionReferralIntakeEvidence.reviewStatus,
      storageStatus: distributionReferralIntakeEvidence.storageStatus,
      createdAt: distributionReferralIntakeEvidence.createdAt,
    })
    .from(distributionReferralIntakeEvidence)
    .where(eq(distributionReferralIntakeEvidence.sessionId, sessionId))
    .orderBy(desc(distributionReferralIntakeEvidence.createdAt));
  return rows.map(row => ({
    evidenceUuid: String(row.evidenceUuid),
    evidenceType: String(row.evidenceType),
    mimeType: row.mimeType ? String(row.mimeType) : null,
    byteSize: Number(row.byteSize || 0),
    reviewStatus: String(row.reviewStatus),
    storageStatus: String(row.storageStatus),
    createdAt: row.createdAt,
  }));
}

export async function readDealReferralIntakeEvidence(input: {
  db?: DbExecutor;
  dealId: number;
  evidenceUuid: string;
}) {
  const db = await resolveDb(input.db);
  const sessionId = await sessionIdForDeal(db, input.dealId);
  if (!sessionId) return fail('Referral intake evidence is unavailable.', 'NOT_FOUND');
  const [row] = await db
    .select({
      storageAdapter: distributionReferralIntakeEvidence.storageAdapter,
      storageKey: distributionReferralIntakeEvidence.storageKey,
      mimeType: distributionReferralIntakeEvidence.mimeType,
      storageStatus: distributionReferralIntakeEvidence.storageStatus,
      reviewStatus: distributionReferralIntakeEvidence.reviewStatus,
    })
    .from(distributionReferralIntakeEvidence)
    .where(
      and(
        eq(distributionReferralIntakeEvidence.sessionId, sessionId),
        eq(distributionReferralIntakeEvidence.evidenceUuid, input.evidenceUuid),
      ),
    )
    .limit(1);
  if (
    !row ||
    row.storageStatus !== 'stored' ||
    (row.storageAdapter !== 'local' && row.storageAdapter !== 's3') ||
    !row.storageKey ||
    !row.mimeType
  ) {
    return fail('Referral intake evidence is unavailable.', 'NOT_FOUND');
  }
  const buffer = await readDistributionReferralEvidence({
    storageAdapter: row.storageAdapter,
    storageKey: String(row.storageKey),
  });
  return {
    evidenceUuid: input.evidenceUuid,
    mimeType: String(row.mimeType),
    reviewStatus: String(row.reviewStatus),
    base64Content: buffer.toString('base64'),
  };
}

export async function closeReferralIntakeForDeal(input: {
  tx: DbExecutor;
  dealId: number;
  actorUserId: number | null;
  closure: 'withdrawn' | 'closed';
}) {
  const sessionId = await sessionIdForDeal(input.tx, input.dealId);
  if (!sessionId) return false;
  const [session] = await input.tx
    .select({
      status: distributionReferralIntakeSessions.status,
      policyVersion: distributionReferralIntakeSessions.policyVersion,
      configuration: distributionReferralIntakePolicyReleases.configuration,
    })
    .from(distributionReferralIntakeSessions)
    .innerJoin(
      distributionReferralIntakePolicyReleases,
      eq(distributionReferralIntakePolicyReleases.id, distributionReferralIntakeSessions.policyReleaseId),
    )
    .where(eq(distributionReferralIntakeSessions.id, sessionId))
    .limit(1);
  if (!session || session.status !== 'submitted') return false;
  const config = parsePolicyConfiguration(session.configuration);
  const rule = input.closure === 'withdrawn'
    ? config.retention.withdrawnReferral
    : config.retention.closedReferral;
  const retentionDays = assertRetentionAnchor(
    rule,
    input.closure === 'withdrawn' ? 'referral_withdrawn' : 'referral_closed',
    'closed referral evidence',
  );
  const now = new Date();
  await input.tx
    .update(distributionReferralIntakeSessions)
    .set(
      input.closure === 'withdrawn'
        ? { status: 'withdrawn', withdrawnAt: sqlDate(now) }
        : { status: 'closed', closedAt: sqlDate(now) },
    )
    .where(
      and(
        eq(distributionReferralIntakeSessions.id, sessionId),
        eq(distributionReferralIntakeSessions.status, 'submitted'),
      ),
    );
  await input.tx
    .update(distributionReferralIntakeEvidence)
    .set({ retentionDueAt: sqlDate(addDays(now, retentionDays)) })
    .where(eq(distributionReferralIntakeEvidence.sessionId, sessionId));
  await input.tx.insert(distributionReferralIntakeEvents).values({
    sessionId,
    eventType: input.closure === 'withdrawn' ? 'referral_withdrawn' : 'referral_closed',
    actorUserId: input.actorUserId,
    details: {
      dealId: input.dealId,
      policyVersion: Number(session.policyVersion),
      retentionRule: input.closure === 'withdrawn' ? 'withdrawnReferral' : 'closedReferral',
    },
  });
  return true;
}
