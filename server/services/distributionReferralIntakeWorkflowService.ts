import { createHash, randomUUID } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { and, desc, eq, gt, inArray, sql } from 'drizzle-orm';
import {
  distributionDeals,
  distributionManagerAssignments,
  distributionPrograms,
  distributionReferralIntakeEvidence,
  distributionReferralIntakeEvents,
  distributionReferralIntakePolicyReleases,
  distributionReferralIntakeSessions,
  distributionIdentities,
} from '../../drizzle/schema';
import {
  DISTRIBUTION_REFERRAL_EVIDENCE_MAX_UPLOAD_BYTES,
  distributionReferralIntakePolicyConfigurationSchema,
  type DistributionReferralIntakePolicyConfiguration,
} from '../../shared/distributionReferralIntake';
import { getDb } from '../db';
import {
  assertPartnerDevelopmentProgramAccess,
  assertPartnerDevelopmentReferralOpen,
} from './distributionPartnerProgramAccessService';
import {
  createDistributionReferralEvidenceStorageKey,
  deleteDistributionReferralEvidence,
  getDistributionReferralEvidenceStorageStatus,
  readDistributionReferralEvidence,
  storeDistributionReferralEvidence,
} from './distributionReferralEvidenceStorage';
import { getDevelopmentSalesProjection } from './developmentSalesProjectionService';

const MAX_DRAFT_LIFETIME_HOURS = 24 * 7;
const SUPPORTED_REVIEW_ROLES = new Set([
  'agent',
  'agency_admin',
  'property_developer',
  'service_provider',
  'super_admin',
]);

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type IntakeConfig = DistributionReferralIntakePolicyConfiguration;

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseConfiguration(value: unknown): IntakeConfig {
  const parsed = distributionReferralIntakePolicyConfigurationSchema.safeParse(
    parseJsonObject(value),
  );
  if (!parsed.success) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'The published referral intake policy is incomplete. Ask the program administrator to review it.',
    });
  }
  const config = parsed.data;
  if (config.signatureMethod !== 'in_app_acknowledgement') {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'This program uses an acknowledgement method the current intake flow cannot record.',
    });
  }
  if (config.creditReport.enabled) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Credit-report authorization is not part of this referral intake flow yet.',
    });
  }
  if (config.identityEvidence.maxFileBytes > DISTRIBUTION_REFERRAL_EVIDENCE_MAX_UPLOAD_BYTES) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: `Evidence uploads are limited to ${DISTRIBUTION_REFERRAL_EVIDENCE_MAX_UPLOAD_BYTES} bytes in this intake flow.`,
    });
  }
  const supportedRole = config.identityEvidence.authorizedRoles.some(role =>
    SUPPORTED_REVIEW_ROLES.has(role),
  );
  if (!supportedRole) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'The policy does not name a supported reviewer account role.',
    });
  }
  return config;
}

function retentionDueAt(days: number, from = new Date()) {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

function affectedRows(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  const value = (header as { affectedRows?: unknown; rowsAffected?: unknown } | null)?.affectedRows ??
    (header as { rowsAffected?: unknown } | null)?.rowsAffected ??
    0;
  return Number(value);
}

function parseSqlTimestamp(value: unknown) {
  if (value instanceof Date) return value.getTime();
  const text = String(value || '').trim();
  if (!text) return Number.NaN;
  const parsed = new Date(text.includes('T') ? text : `${text.replace(' ', 'T')}Z`);
  return parsed.getTime();
}

function getPolicyConfigFromSession(session: { configuration: unknown }) {
  return parseConfiguration(session.configuration);
}

function toPublicEvidence(row: Record<string, unknown>) {
  return {
    evidenceUuid: String(row.evidenceUuid),
    evidenceType: String(row.evidenceType),
    mimeType: row.mimeType ? String(row.mimeType) : null,
    byteSize: row.byteSize == null ? null : Number(row.byteSize),
    reviewStatus: String(row.reviewStatus),
    storageStatus: String(row.storageStatus),
    uploadedAt: String(row.createdAt || ''),
  };
}

async function loadDevelopmentPolicy(db: Db, developmentId: number) {
  const [program] = await db
    .select({
      id: distributionPrograms.id,
      isActive: distributionPrograms.isActive,
      isReferralEnabled: distributionPrograms.isReferralEnabled,
    })
    .from(distributionPrograms)
    .where(eq(distributionPrograms.developmentId, developmentId))
    .limit(1);
  if (!program || Number(program.isActive) !== 1 || Number(program.isReferralEnabled) !== 1) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'This development is not accepting partner referrals right now.',
    });
  }
  const [release] = await db
    .select()
    .from(distributionReferralIntakePolicyReleases)
    .where(
      and(
        eq(distributionReferralIntakePolicyReleases.programId, program.id),
        eq(distributionReferralIntakePolicyReleases.status, 'active'),
      ),
    )
    .orderBy(desc(distributionReferralIntakePolicyReleases.policyVersion))
    .limit(1);
  if (!release) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'This development does not have a published referral intake policy.',
    });
  }
  return { program, release, configuration: parseConfiguration(release.configuration) };
}

async function assertAnyMarketableMode(developmentId: number) {
  const modes = await getMarketableModeSummary(developmentId);
  const hasMode = modes.sale.available || modes.rent.available;
  if (!hasMode) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'This development has no currently marketable sale or rental inventory.',
    });
  }
}

async function getMarketableModeSummary(developmentId: number) {
  const projection = await getDevelopmentSalesProjection(developmentId);
  const summarize = (mode: 'for_sale' | 'for_rent') => {
    const row = projection?.inventory.modes[mode];
    const available = Boolean(
      projection?.campaign.visible &&
        projection.inventory.phaseScope !== 'unscoped-hidden' &&
        row &&
        row.availableCount > 0 &&
        row.priceFrom > 0 &&
        row.priceTo >= row.priceFrom,
    );
    return {
      available,
      availableCount: available ? Number(row?.availableCount || 0) : 0,
      priceFrom: available ? Number(row?.priceFrom || 0) : null,
      priceTo: available ? Number(row?.priceTo || 0) : null,
    };
  };
  return { sale: summarize('for_sale'), rent: summarize('for_rent') };
}

async function loadPartnerSession(db: Db, input: { sessionUuid: string; partnerUserId: number }) {
  const [row] = await db
    .select({
      session: distributionReferralIntakeSessions,
      configuration: distributionReferralIntakePolicyReleases.configuration,
      developmentId: distributionPrograms.developmentId,
    })
    .from(distributionReferralIntakeSessions)
    .innerJoin(
      distributionReferralIntakePolicyReleases,
      eq(
        distributionReferralIntakePolicyReleases.id,
        distributionReferralIntakeSessions.policyReleaseId,
      ),
    )
    .innerJoin(
      distributionPrograms,
      eq(distributionPrograms.id, distributionReferralIntakePolicyReleases.programId),
    )
    .where(
      and(
        eq(distributionReferralIntakeSessions.sessionUuid, input.sessionUuid),
        eq(distributionReferralIntakeSessions.partnerUserId, input.partnerUserId),
      ),
    )
    .limit(1);
  if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Referral intake session not found.' });
  return {
    session: row.session,
    developmentId: Number(row.developmentId),
    configuration: parseConfiguration(row.configuration),
  };
}

export async function getPartnerReferralIntake(input: {
  actorUserId: number;
  actorRole: string;
  developmentId: number;
  sessionUuid?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  if (input.sessionUuid) {
    const loaded = await loadPartnerSession(db, {
      sessionUuid: input.sessionUuid,
      partnerUserId: input.actorUserId,
    });
    if (loaded.developmentId !== input.developmentId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Referral intake session not found.' });
    }
    const evidenceRows = await db
      .select()
      .from(distributionReferralIntakeEvidence)
      .where(eq(distributionReferralIntakeEvidence.sessionId, loaded.session.id))
      .orderBy(desc(distributionReferralIntakeEvidence.createdAt));
    const events = await db
      .select({ eventType: distributionReferralIntakeEvents.eventType, details: distributionReferralIntakeEvents.details })
      .from(distributionReferralIntakeEvents)
      .where(eq(distributionReferralIntakeEvents.sessionId, loaded.session.id))
      .orderBy(desc(distributionReferralIntakeEvents.occurredAt));
    const submittedEvent = events.find(event => event.eventType === 'referral_submitted');
    const submittedDetails = parseJsonObject(submittedEvent?.details);
    return {
      developmentId: loaded.developmentId,
      configuration: loaded.configuration,
      marketableModes: await getMarketableModeSummary(loaded.developmentId),
      session: {
        sessionUuid: loaded.session.sessionUuid,
        status: loaded.session.status,
        policyVersion: Number(loaded.session.policyVersion),
        policyDigest: loaded.session.policyConfigurationDigest,
        draftExpiresAt: loaded.session.draftExpiresAt,
        dealId: submittedDetails?.dealId ? Number(submittedDetails.dealId) : null,
        evidence: evidenceRows.map(toPublicEvidence),
      },
      storageConfigured: getDistributionReferralEvidenceStorageStatus().configured,
      canStart: false,
    };
  }

  await assertPartnerDevelopmentProgramAccess({
    db,
    actor: { userId: input.actorUserId, role: input.actorRole },
    developmentId: input.developmentId,
  });
  await assertPartnerDevelopmentReferralOpen({ db, developmentId: input.developmentId });
  await assertAnyMarketableMode(input.developmentId);
  const { release, configuration } = await loadDevelopmentPolicy(db, input.developmentId);
  return {
    developmentId: input.developmentId,
    configuration,
    marketableModes: await getMarketableModeSummary(input.developmentId),
    activePolicy: {
      releaseId: Number(release.id),
      policyVersion: Number(release.policyVersion),
      configurationDigest: String(release.configurationDigest),
    },
    storageConfigured: getDistributionReferralEvidenceStorageStatus().configured,
    canStart: true,
    session: null,
  };
}

export async function startPartnerReferralIntake(input: {
  actorUserId: number;
  actorRole: string;
  developmentId: number;
  acceptSharingPermission: boolean;
  acknowledgePrivacyNotice: boolean;
}) {
  if (!input.acceptSharingPermission || !input.acknowledgePrivacyNotice) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Acknowledge both the information-sharing permission and privacy notice to continue.',
    });
  }
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await assertPartnerDevelopmentProgramAccess({
    db,
    actor: { userId: input.actorUserId, role: input.actorRole },
    developmentId: input.developmentId,
  });
  await assertPartnerDevelopmentReferralOpen({ db, developmentId: input.developmentId });
  await assertAnyMarketableMode(input.developmentId);

  const storage = getDistributionReferralEvidenceStorageStatus();
  if (!storage.configured) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: storage.message || 'Private evidence storage is not available.',
    });
  }

  const created = await db.transaction(async tx => {
    const [program] = await tx
      .select({
        id: distributionPrograms.id,
        isActive: distributionPrograms.isActive,
        isReferralEnabled: distributionPrograms.isReferralEnabled,
      })
      .from(distributionPrograms)
      .where(eq(distributionPrograms.developmentId, input.developmentId))
      .limit(1);
    if (!program) throw new TRPCError({ code: 'NOT_FOUND', message: 'Distribution program not found.' });
    await tx.execute(sql`SELECT id FROM distribution_programs WHERE id = ${program.id} FOR UPDATE`);
    const [lockedProgram] = await tx
      .select({
        isActive: distributionPrograms.isActive,
        isReferralEnabled: distributionPrograms.isReferralEnabled,
      })
      .from(distributionPrograms)
      .where(eq(distributionPrograms.id, program.id))
      .limit(1);
    if (!lockedProgram || Number(lockedProgram.isActive) !== 1 || Number(lockedProgram.isReferralEnabled) !== 1) {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'This development is not accepting partner referrals right now.' });
    }

    const [release] = await tx
      .select()
      .from(distributionReferralIntakePolicyReleases)
      .where(
        and(
          eq(distributionReferralIntakePolicyReleases.programId, program.id),
          eq(distributionReferralIntakePolicyReleases.status, 'active'),
        ),
      )
      .orderBy(desc(distributionReferralIntakePolicyReleases.policyVersion))
      .limit(1);
    if (!release) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'No active intake policy is published.' });
    const config = parseConfiguration(release.configuration);

    const [existing] = await tx
      .select({ sessionUuid: distributionReferralIntakeSessions.sessionUuid })
      .from(distributionReferralIntakeSessions)
      .where(
        and(
          eq(distributionReferralIntakeSessions.policyReleaseId, release.id),
          eq(distributionReferralIntakeSessions.partnerUserId, input.actorUserId),
          eq(distributionReferralIntakeSessions.status, 'draft'),
          gt(distributionReferralIntakeSessions.draftExpiresAt, sql`UTC_TIMESTAMP()`),
        ),
      )
      .orderBy(desc(distributionReferralIntakeSessions.createdAt))
      .limit(1);
    if (existing?.sessionUuid) {
      return { sessionUuid: String(existing.sessionUuid), reused: true };
    }

    const sessionUuid = randomUUID();
    const draftRetentionDays = [
      config.retention.abandonedIntake.days,
      ...(config.retention.identityEvidence.startsFrom === 'evidence_captured'
        ? [config.retention.identityEvidence.days]
        : []),
    ];
    const draftLifetimeHours = Math.min(
      MAX_DRAFT_LIFETIME_HOURS,
      Math.min(...draftRetentionDays) * 24,
    );
    const expiresAt = new Date(Date.now() + draftLifetimeHours * 60 * 60 * 1000);
    const [insertResult] = await tx
      .insert(distributionReferralIntakeSessions)
      .values({
        sessionUuid,
        policyReleaseId: release.id,
        policyVersion: Number(release.policyVersion),
        policyConfigurationDigest: String(release.configurationDigest),
        partnerUserId: input.actorUserId,
        status: 'draft',
        draftExpiresAt: expiresAt,
      })
      .$returningId();
    const sessionId = Number(insertResult.id);
    const acknowledgedAt = new Date().toISOString();
    await tx.insert(distributionReferralIntakeEvents).values({
      sessionId,
      eventType: 'session_created',
      actorUserId: input.actorUserId,
      details: {
        policyReleaseId: Number(release.id),
        policyVersion: Number(release.policyVersion),
        policyConfigurationDigest: String(release.configurationDigest),
        acknowledgementMethod: config.signatureMethod,
        sharingPermissionDocumentVersion: config.sharingPermissionDocument.version,
        privacyNoticeDocumentVersion: config.privacyNoticeDocument.version,
        sharingPermissionAccepted: true,
        privacyNoticeAcknowledged: true,
        acknowledgedAt,
        draftLifetimeHours,
      },
    });
    return { sessionUuid, reused: false };
  });

  return { ...created, developmentId: input.developmentId };
}

export async function uploadPartnerReferralIdentityEvidence(input: {
  actorUserId: number;
  sessionUuid: string;
  evidenceLabel: string;
  mimeType: string;
  contentBase64: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const loaded = await loadPartnerSession(db, {
    sessionUuid: input.sessionUuid,
    partnerUserId: input.actorUserId,
  });
    if (loaded.session.status !== 'draft' || parseSqlTimestamp(loaded.session.draftExpiresAt) <= Date.now()) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'This referral intake draft is no longer open.' });
  }
  const evidenceLabel = input.evidenceLabel.trim();
  if (!loaded.configuration.identityEvidence.acceptedEvidenceTypes.includes(evidenceLabel)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Choose an evidence type listed in this program’s policy.' });
  }
  const mimeType = input.mimeType.trim().toLowerCase();
  if (!loaded.configuration.identityEvidence.allowedMimeTypes.includes(mimeType as any)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'This file type is not allowed by the program policy.' });
  }
  const encoded = input.contentBase64.replace(/^data:[^,]+;base64,/i, '').trim();
  if (!encoded || encoded.length > Math.ceil(DISTRIBUTION_REFERRAL_EVIDENCE_MAX_UPLOAD_BYTES * 4 / 3) + 8 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'This file is empty or exceeds the upload size limit.' });
  }
  const buffer = Buffer.from(encoded, 'base64');
  if (
    buffer.length < 1 ||
    buffer.length > Math.min(
      DISTRIBUTION_REFERRAL_EVIDENCE_MAX_UPLOAD_BYTES,
      loaded.configuration.identityEvidence.maxFileBytes,
    ) ||
    buffer.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, '')
  ) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'This file is empty, invalid, or exceeds the upload size limit.' });
  }

  const evidenceUuid = randomUUID();
  const storageKey = createDistributionReferralEvidenceStorageKey(
    String(loaded.session.sessionUuid),
    evidenceUuid,
  );
  const stored = await storeDistributionReferralEvidence({ storageKey, buffer, mimeType });
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  const identityRule = loaded.configuration.retention.identityEvidence;
  const dueAt = identityRule.startsFrom === 'evidence_captured'
    ? retentionDueAt(identityRule.days)
    : retentionDueAt(
        loaded.configuration.retention.abandonedIntake.days,
        new Date(parseSqlTimestamp(loaded.session.createdAt)),
      );
  try {
    const created = await db.transaction(async tx => {
      const [current] = await tx
        .select({ id: distributionReferralIntakeSessions.id, status: distributionReferralIntakeSessions.status, draftExpiresAt: distributionReferralIntakeSessions.draftExpiresAt })
        .from(distributionReferralIntakeSessions)
        .where(eq(distributionReferralIntakeSessions.sessionUuid, input.sessionUuid))
        .limit(1);
      if (
        !current ||
        Number(current.id) !== Number(loaded.session.id) ||
        current.status !== 'draft' ||
        parseSqlTimestamp(current.draftExpiresAt) <= Date.now()
      ) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'This referral intake draft is no longer open.' });
      }
      const [inserted] = await tx
        .insert(distributionReferralIntakeEvidence)
        .values({
          evidenceUuid,
          sessionId: loaded.session.id,
          evidenceType: 'identity_document',
          storageAdapter: stored.adapter,
          storageKey: stored.storageKey,
          mimeType,
          byteSize: stored.byteSize,
          sha256,
          uploadedByUserId: input.actorUserId,
          reviewStatus: 'pending',
          storageStatus: 'stored',
          retentionDueAt: dueAt,
        })
        .$returningId();
      await tx.insert(distributionReferralIntakeEvents).values({
        sessionId: loaded.session.id,
        evidenceId: inserted.id,
        eventType: 'evidence_uploaded',
        actorUserId: input.actorUserId,
        details: {
          evidenceType: 'identity_document',
          mimeType,
          byteSize: stored.byteSize,
          sha256,
          policyVersion: Number(loaded.session.policyVersion),
        },
      });
      return Number(inserted.id);
    });
    return { evidenceUuid, evidenceId: created, reviewStatus: 'pending' as const };
  } catch (error) {
    await deleteDistributionReferralEvidence({
      storageAdapter: stored.adapter,
      storageKey: stored.storageKey,
    }).catch(() => undefined);
    throw error;
  }
}

async function assertEvidenceReviewer(db: Db, input: {
  userId: number;
  role: string;
  developmentId: number;
  configuration: IntakeConfig;
}) {
  if (!input.configuration.identityEvidence.authorizedRoles.includes(input.role as any)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Your account role is not authorized to review this evidence.' });
  }
  const [identity] = await db
    .select({ id: distributionIdentities.id })
    .from(distributionIdentities)
    .where(
      and(
        eq(distributionIdentities.userId, input.userId),
        eq(distributionIdentities.identityType, 'manager'),
        eq(distributionIdentities.active, 1),
      ),
    )
    .limit(1);
  if (!identity && input.role !== 'super_admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'An active Distribution manager identity is required.' });
  }
  if (input.role !== 'super_admin') {
    const [assignment] = await db
      .select({ id: distributionManagerAssignments.id })
      .from(distributionManagerAssignments)
      .where(
        and(
          eq(distributionManagerAssignments.managerUserId, input.userId),
          eq(distributionManagerAssignments.developmentId, input.developmentId),
          eq(distributionManagerAssignments.isActive, 1),
        ),
      )
      .limit(1);
    if (!assignment) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not assigned to this development.' });
    }
  }
}

export async function listReferralEvidenceReviewQueue(input: {
  actorUserId: number;
  actorRole: string;
  limit: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const developmentRows = input.actorRole === 'super_admin'
    ? null
    : await db
        .select({ developmentId: distributionManagerAssignments.developmentId })
        .from(distributionManagerAssignments)
        .where(
          and(
            eq(distributionManagerAssignments.managerUserId, input.actorUserId),
            eq(distributionManagerAssignments.isActive, 1),
          ),
        );
  const developmentIds = developmentRows?.map(row => Number(row.developmentId)) || [];
  if (developmentRows && developmentIds.length === 0) return [];

  const conditions = [
    eq(distributionReferralIntakeSessions.status, 'draft'),
    eq(distributionReferralIntakeEvidence.evidenceType, 'identity_document'),
    gt(distributionReferralIntakeSessions.draftExpiresAt, sql`UTC_TIMESTAMP()`),
  ];
  if (developmentIds.length) conditions.push(inArray(distributionPrograms.developmentId, developmentIds) as any);
  const rows = await db
    .select({
      evidenceUuid: distributionReferralIntakeEvidence.evidenceUuid,
      evidenceType: distributionReferralIntakeEvidence.evidenceType,
      mimeType: distributionReferralIntakeEvidence.mimeType,
      byteSize: distributionReferralIntakeEvidence.byteSize,
      sha256: distributionReferralIntakeEvidence.sha256,
      evidenceCreatedAt: distributionReferralIntakeEvidence.createdAt,
      reviewStatus: distributionReferralIntakeEvidence.reviewStatus,
      storageStatus: distributionReferralIntakeEvidence.storageStatus,
      sessionId: distributionReferralIntakeSessions.id,
      sessionUuid: distributionReferralIntakeSessions.sessionUuid,
      policyVersion: distributionReferralIntakeSessions.policyVersion,
      partnerUserId: distributionReferralIntakeSessions.partnerUserId,
      developmentId: distributionPrograms.developmentId,
      configuration: distributionReferralIntakePolicyReleases.configuration,
    })
    .from(distributionReferralIntakeEvidence)
    .innerJoin(
      distributionReferralIntakeSessions,
      eq(distributionReferralIntakeSessions.id, distributionReferralIntakeEvidence.sessionId),
    )
    .innerJoin(
      distributionReferralIntakePolicyReleases,
      eq(distributionReferralIntakePolicyReleases.id, distributionReferralIntakeSessions.policyReleaseId),
    )
    .innerJoin(
      distributionPrograms,
      eq(distributionPrograms.id, distributionReferralIntakePolicyReleases.programId),
    )
    .where(and(...conditions))
    .orderBy(desc(distributionReferralIntakeEvidence.createdAt), desc(distributionReferralIntakeEvidence.id))
    .limit(input.limit * 5);

  const latestBySession = new Map<number, (typeof rows)[number]>();
  for (const row of rows) {
    const sessionId = Number(row.sessionId);
    if (!latestBySession.has(sessionId)) latestBySession.set(sessionId, row);
  }

  const authorized = [];
  for (const row of latestBySession.values()) {
    if (row.reviewStatus !== 'pending' || row.storageStatus !== 'stored') continue;
    const configuration = parseConfiguration(row.configuration);
    try {
      await assertEvidenceReviewer(db, {
        userId: input.actorUserId,
        role: input.actorRole,
        developmentId: Number(row.developmentId),
        configuration,
      });
      authorized.push({
        evidenceUuid: String(row.evidenceUuid),
        sessionUuid: String(row.sessionUuid),
        evidenceType: String(row.evidenceType),
        mimeType: row.mimeType ? String(row.mimeType) : null,
        byteSize: Number(row.byteSize || 0),
        sha256: String(row.sha256 || ''),
        uploadedAt: String(row.evidenceCreatedAt),
        policyVersion: Number(row.policyVersion),
        developmentId: Number(row.developmentId),
        partnerUserId: Number(row.partnerUserId || 0),
      });
    } catch (error) {
      if (!(error instanceof TRPCError) || error.code !== 'FORBIDDEN') throw error;
    }
    if (authorized.length >= input.limit) break;
  }
  return authorized;
}

async function loadReviewerEvidence(db: Db, input: {
  evidenceUuid: string;
  actorUserId: number;
  actorRole: string;
}) {
  const [row] = await db
    .select({
      evidence: distributionReferralIntakeEvidence,
      session: distributionReferralIntakeSessions,
      configuration: distributionReferralIntakePolicyReleases.configuration,
      developmentId: distributionPrograms.developmentId,
    })
    .from(distributionReferralIntakeEvidence)
    .innerJoin(
      distributionReferralIntakeSessions,
      eq(distributionReferralIntakeSessions.id, distributionReferralIntakeEvidence.sessionId),
    )
    .innerJoin(
      distributionReferralIntakePolicyReleases,
      eq(distributionReferralIntakePolicyReleases.id, distributionReferralIntakeSessions.policyReleaseId),
    )
    .innerJoin(
      distributionPrograms,
      eq(distributionPrograms.id, distributionReferralIntakePolicyReleases.programId),
    )
    .where(eq(distributionReferralIntakeEvidence.evidenceUuid, input.evidenceUuid))
    .limit(1);
  if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Referral evidence not found.' });
  if (
    row.session.status !== 'draft' ||
    parseSqlTimestamp(row.session.draftExpiresAt) <= Date.now()
  ) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'This evidence review session is no longer open.' });
  }
  const configuration = parseConfiguration(row.configuration);
  await assertEvidenceReviewer(db, {
    userId: input.actorUserId,
    role: input.actorRole,
    developmentId: Number(row.developmentId),
    configuration,
  });
  return { ...row, configuration, developmentId: Number(row.developmentId) };
}

export async function readReferralEvidenceForReview(input: {
  evidenceUuid: string;
  actorUserId: number;
  actorRole: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const row = await loadReviewerEvidence(db, input);
  if (row.evidence.storageStatus !== 'stored' || !row.evidence.storageAdapter || !row.evidence.storageKey) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'This evidence file is no longer available.' });
  }
  const buffer = await readDistributionReferralEvidence({
    storageAdapter: row.evidence.storageAdapter,
    storageKey: row.evidence.storageKey,
  });
  return {
    evidenceUuid: String(row.evidence.evidenceUuid),
    mimeType: String(row.evidence.mimeType || 'application/octet-stream'),
    contentBase64: buffer.toString('base64'),
  };
}

export async function reviewReferralEvidence(input: {
  evidenceUuid: string;
  actorUserId: number;
  actorRole: string;
  reviewStatus: 'verified' | 'rejected';
  rejectionReasonCode?: 'unreadable' | 'wrong_document_type' | 'expired' | 'mismatch' | 'other';
}) {
  if (input.reviewStatus === 'rejected' && !input.rejectionReasonCode) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Choose a reason code when rejecting evidence.' });
  }
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const loaded = await loadReviewerEvidence(db, input);
  if (loaded.evidence.reviewStatus !== 'pending' || loaded.evidence.storageStatus !== 'stored') {
    throw new TRPCError({ code: 'CONFLICT', message: 'This evidence has already been reviewed or is unavailable.' });
  }

  return await db.transaction(async tx => {
    const [latestEvidence] = await tx
      .select({ id: distributionReferralIntakeEvidence.id })
      .from(distributionReferralIntakeEvidence)
      .where(
        and(
          eq(distributionReferralIntakeEvidence.sessionId, loaded.session.id),
          eq(distributionReferralIntakeEvidence.evidenceType, 'identity_document'),
        ),
      )
      .orderBy(desc(distributionReferralIntakeEvidence.createdAt), desc(distributionReferralIntakeEvidence.id))
      .limit(1);
    if (Number(latestEvidence?.id || 0) !== Number(loaded.evidence.id)) {
      throw new TRPCError({ code: 'CONFLICT', message: 'A newer evidence file was uploaded. Review the latest file instead.' });
    }
    const updateResult = await tx
      .update(distributionReferralIntakeEvidence)
      .set({ reviewStatus: input.reviewStatus })
      .where(
        and(
          eq(distributionReferralIntakeEvidence.id, loaded.evidence.id),
          eq(distributionReferralIntakeEvidence.reviewStatus, 'pending'),
          eq(distributionReferralIntakeEvidence.storageStatus, 'stored'),
        ),
      );
    const header = Array.isArray(updateResult) ? updateResult[0] : updateResult;
    if (Number((header as any)?.affectedRows ?? 0) !== 1) {
      throw new TRPCError({ code: 'CONFLICT', message: 'This evidence was reviewed by someone else. Refresh the queue.' });
    }
    await tx.insert(distributionReferralIntakeEvents).values({
      sessionId: loaded.session.id,
      evidenceId: loaded.evidence.id,
      eventType: 'evidence_reviewed',
      actorUserId: input.actorUserId,
      details: {
        evidenceType: 'identity_document',
        reviewStatus: input.reviewStatus,
        policyVersion: Number(loaded.session.policyVersion),
        policyConfigurationDigest: String(loaded.session.policyConfigurationDigest),
        rejectionReasonCode: input.reviewStatus === 'rejected' ? input.rejectionReasonCode : null,
      },
    });
    return { success: true as const, evidenceUuid: input.evidenceUuid, reviewStatus: input.reviewStatus };
  });
}

export async function lockAndValidateReferralIntakeSession(tx: any, input: {
  actorUserId: number;
  developmentId: number;
  sessionUuid: string;
}) {
  await tx.execute(
    sql`SELECT id FROM distribution_referral_intake_sessions WHERE session_uuid = ${input.sessionUuid} FOR UPDATE`,
  );
  const [row] = await tx
    .select({
      session: distributionReferralIntakeSessions,
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
        eq(distributionReferralIntakeSessions.sessionUuid, input.sessionUuid),
        eq(distributionReferralIntakeSessions.partnerUserId, input.actorUserId),
      ),
    )
    .limit(1);
  if (!row || Number(row.developmentId) !== input.developmentId) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Referral intake session not found.' });
  }
  if (
    row.session.status !== 'draft' ||
    parseSqlTimestamp(row.session.draftExpiresAt) <= Date.now()
  ) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'This referral intake draft is no longer open.' });
  }
  const configuration = getPolicyConfigFromSession({ configuration: row.configuration });
  const [acknowledgement] = await tx
    .select({ details: distributionReferralIntakeEvents.details })
    .from(distributionReferralIntakeEvents)
    .where(
      and(
        eq(distributionReferralIntakeEvents.sessionId, row.session.id),
        eq(distributionReferralIntakeEvents.eventType, 'session_created'),
      ),
    )
    .limit(1);
  const acknowledgementDetails = parseJsonObject(acknowledgement?.details);
  if (
    acknowledgementDetails?.sharingPermissionAccepted !== true ||
    acknowledgementDetails?.privacyNoticeAcknowledged !== true ||
    acknowledgementDetails?.policyConfigurationDigest !== row.session.policyConfigurationDigest
  ) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'The required policy acknowledgements are missing.' });
  }
  const [identityEvidence] = await tx
    .select()
    .from(distributionReferralIntakeEvidence)
    .where(
      and(
        eq(distributionReferralIntakeEvidence.sessionId, row.session.id),
        eq(distributionReferralIntakeEvidence.evidenceType, 'identity_document'),
      ),
    )
    .orderBy(desc(distributionReferralIntakeEvidence.createdAt))
    .limit(1);
  if (!identityEvidence || identityEvidence.reviewStatus !== 'verified' || identityEvidence.storageStatus !== 'stored') {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'A program-authorized reviewer must verify the latest identity evidence before referral submission.',
    });
  }
  return {
    sessionId: Number(row.session.id),
    policyVersion: Number(row.session.policyVersion),
    policyDigest: String(row.session.policyConfigurationDigest),
    configuration,
    identityEvidence,
  };
}

export async function markReferralIntakeSessionSubmitted(tx: any, input: {
  sessionId: number;
  actorUserId: number;
  dealId: number;
  marketMode: 'sale' | 'rent';
  projectionRevision: string;
  termsDigest: string;
  policyVersion: number;
  policyDigest: string;
  configuration: IntakeConfig;
}) {
  const updateResult = await tx
    .update(distributionReferralIntakeSessions)
    .set({ status: 'submitted', submittedAt: sql`UTC_TIMESTAMP()` })
    .where(
      and(
        eq(distributionReferralIntakeSessions.id, input.sessionId),
        eq(distributionReferralIntakeSessions.status, 'draft'),
        gt(distributionReferralIntakeSessions.draftExpiresAt, sql`UTC_TIMESTAMP()`),
      ),
    );
  if (affectedRows(updateResult) !== 1) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'This intake session has expired or was submitted in another request.',
    });
  }
  const submittedAt = new Date();
  const identityRetention = input.configuration.retention.identityEvidence;
  if (identityRetention.startsFrom === 'referral_submitted') {
    await tx
      .update(distributionReferralIntakeEvidence)
      .set({ retentionDueAt: retentionDueAt(identityRetention.days, submittedAt) })
      .where(
        and(
          eq(distributionReferralIntakeEvidence.sessionId, input.sessionId),
          eq(distributionReferralIntakeEvidence.evidenceType, 'identity_document'),
          eq(distributionReferralIntakeEvidence.reviewStatus, 'verified'),
          eq(distributionReferralIntakeEvidence.storageStatus, 'stored'),
        ),
      );
  }
  const buyerRetention = input.configuration.retention.activeReferral;
  await tx.insert(distributionReferralIntakeEvents).values({
    sessionId: input.sessionId,
    eventType: 'referral_submitted',
    actorUserId: input.actorUserId,
    details: {
      dealId: input.dealId,
      marketMode: input.marketMode,
      developerProjectionRevision: input.projectionRevision,
      termsDigest: input.termsDigest,
      policyVersion: input.policyVersion,
      policyConfigurationDigest: input.policyDigest,
      buyerDataRetentionDueAt: retentionDueAt(buyerRetention.days, submittedAt).toISOString(),
    },
  });
}

export async function closeReferralIntakeForDeal(tx: any, input: {
  dealId: number;
  actorUserId: number | null;
  reason: 'deal_cancelled';
}) {
  const rows = await tx
    .select({
      sessionId: distributionReferralIntakeEvents.sessionId,
      details: distributionReferralIntakeEvents.details,
    })
    .from(distributionReferralIntakeEvents)
    .where(
      and(
        eq(distributionReferralIntakeEvents.eventType, 'referral_submitted'),
        sql`JSON_UNQUOTE(JSON_EXTRACT(${distributionReferralIntakeEvents.details}, '$.dealId')) = ${String(input.dealId)}`,
      ),
    );
  for (const row of rows) {
    const details = parseJsonObject(row.details);
    if (Number(details?.dealId || 0) !== input.dealId) continue;
    const [session] = await tx
      .select({
        id: distributionReferralIntakeSessions.id,
        status: distributionReferralIntakeSessions.status,
        policyReleaseId: distributionReferralIntakeSessions.policyReleaseId,
        policyVersion: distributionReferralIntakeSessions.policyVersion,
      })
      .from(distributionReferralIntakeSessions)
      .where(eq(distributionReferralIntakeSessions.id, Number(row.sessionId)))
      .limit(1);
    if (!session || session.status !== 'submitted') continue;
    const [release] = await tx
      .select({ configuration: distributionReferralIntakePolicyReleases.configuration })
      .from(distributionReferralIntakePolicyReleases)
      .where(eq(distributionReferralIntakePolicyReleases.id, session.policyReleaseId))
      .limit(1);
    let config: IntakeConfig | null = null;
    try {
      config = release ? parseConfiguration(release.configuration) : null;
    } catch {
      // A closed deal must still close its intake session. If retained policy
      // data is malformed, leave the previously scheduled evidence deadlines
      // intact rather than inventing a new retention period.
    }
    const closeRule = config?.retention.closedReferral;
    const previousBuyerDataRetentionDueAt =
      typeof details?.buyerDataRetentionDueAt === 'string'
        ? details.buyerDataRetentionDueAt
        : null;
    const buyerDataRetentionDueAt = closeRule?.startsFrom === 'referral_closed'
      ? retentionDueAt(closeRule.days).toISOString()
      : previousBuyerDataRetentionDueAt;
    const updateResult = await tx
      .update(distributionReferralIntakeSessions)
      .set({ status: 'closed', closedAt: sql`UTC_TIMESTAMP()` })
      .where(
        and(
          eq(distributionReferralIntakeSessions.id, session.id),
          eq(distributionReferralIntakeSessions.status, 'submitted'),
        ),
      );
    if (affectedRows(updateResult) !== 1) continue;
    if (closeRule?.startsFrom === 'referral_closed') {
      await tx
        .update(distributionReferralIntakeEvidence)
        .set({ retentionDueAt: retentionDueAt(closeRule.days) })
        .where(
          and(
            eq(distributionReferralIntakeEvidence.sessionId, session.id),
            eq(distributionReferralIntakeEvidence.storageStatus, 'stored'),
          ),
        );
    }
    await tx.insert(distributionReferralIntakeEvents).values({
      sessionId: session.id,
      eventType: 'referral_closed',
      actorUserId: input.actorUserId,
      details: {
        dealId: input.dealId,
        closureReason: input.reason,
        policyVersion: Number(session.policyVersion),
        buyerDataRetentionDueAt,
      },
    });
  }
}
