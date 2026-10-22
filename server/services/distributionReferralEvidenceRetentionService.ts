import { randomUUID } from 'node:crypto';
import { and, asc, eq, inArray, isNotNull, isNull, lte, ne, or, sql } from 'drizzle-orm';
import {
  distributionDealEvents,
  distributionDeals,
  distributionReferralIntakeEvidence,
  distributionReferralIntakeEvents,
  distributionReferralIntakeSessions,
} from '../../drizzle/schema';
import { getDb } from '../db';
import { getDistributionSchemaOperationStatus } from './runtimeSchemaCapabilities';
import { deleteDistributionReferralEvidence } from './distributionReferralEvidenceStorage';

const DEFAULT_BATCH_SIZE = 40;
const MAX_BATCH_SIZE = 100;
const DELETION_LEASE_MINUTES = 15;
const MAX_RETRY_DELAY_MS = 24 * 60 * 60 * 1000;
const RETAINED_REFERRAL_STATUSES = ['submitted', 'closed'] as const;
const EVIDENCE_DELETION_SESSION_STATUSES = ['submitted', 'withdrawn', 'closed', 'expired'] as const;

type DeletionCandidate = {
  id: number;
  sessionId: number;
  evidenceType: string;
  storageAdapter: 'local' | 's3' | null;
  storageKey: string | null;
  retentionDueAt: string;
  storageStatus: 'stored' | 'deleting' | 'deletion_failed' | 'deleted';
  deletionAttemptCount: number;
  deletionClaimedAt: string | null;
  deletionNextAttemptAt: string | null;
  policyVersion: number;
};

function affectedRows(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  const value = (header as { affectedRows?: unknown; rowsAffected?: unknown } | null)?.affectedRows ??
    (header as { rowsAffected?: unknown } | null)?.rowsAffected ??
    0;
  return Number(value);
}

function batchLimit(value: number | undefined): number {
  if (!Number.isInteger(value) || Number(value) < 1) return DEFAULT_BATCH_SIZE;
  return Math.min(Number(value), MAX_BATCH_SIZE);
}

function deletionErrorCode(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'name' in error &&
    typeof (error as { name?: unknown }).name === 'string'
  ) {
    const name = (error as { name: string }).name.trim();
    if (/^[A-Za-z][A-Za-z0-9_]{0,118}$/.test(name)) return name;
  }
  return 'storage_delete_failed';
}

function retryAt(attempt: number): Date {
  const delayMs = Math.min(60_000 * 2 ** Math.min(Math.max(attempt - 1, 0), 10), MAX_RETRY_DELAY_MS);
  return new Date(Date.now() + delayMs);
}

function canClaim(candidate: DeletionCandidate) {
  if (candidate.storageStatus === 'stored') return eq(distributionReferralIntakeEvidence.storageStatus, 'stored');
  if (candidate.storageStatus === 'deletion_failed') {
    return and(
      eq(distributionReferralIntakeEvidence.storageStatus, 'deletion_failed'),
      or(
        isNull(distributionReferralIntakeEvidence.deletionNextAttemptAt),
        lte(distributionReferralIntakeEvidence.deletionNextAttemptAt, sql`UTC_TIMESTAMP()`),
      ),
    );
  }
  if (candidate.storageStatus === 'deleting') {
    return and(
      eq(distributionReferralIntakeEvidence.storageStatus, 'deleting'),
      lte(
        distributionReferralIntakeEvidence.deletionClaimedAt,
        sql`DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${DELETION_LEASE_MINUTES} MINUTE)`,
      ),
    );
  }
  return eq(distributionReferralIntakeEvidence.storageStatus, 'deleted');
}

async function expireDraftSessions(db: any, limit: number): Promise<number> {
  const candidates = await db
    .select({
      id: distributionReferralIntakeSessions.id,
      policyVersion: distributionReferralIntakeSessions.policyVersion,
    })
    .from(distributionReferralIntakeSessions)
    .where(
      and(
        eq(distributionReferralIntakeSessions.status, 'draft'),
        lte(distributionReferralIntakeSessions.draftExpiresAt, sql`UTC_TIMESTAMP()`),
      ),
    )
    .orderBy(asc(distributionReferralIntakeSessions.draftExpiresAt))
    .limit(limit);

  let expired = 0;
  for (const candidate of candidates) {
    const changed = await db.transaction(async (tx: any) => {
      const updateResult = await tx
        .update(distributionReferralIntakeSessions)
        .set({
          status: 'expired',
          expiredAt: sql`UTC_TIMESTAMP()`,
        })
        .where(
          and(
            eq(distributionReferralIntakeSessions.id, Number(candidate.id)),
            eq(distributionReferralIntakeSessions.status, 'draft'),
            lte(distributionReferralIntakeSessions.draftExpiresAt, sql`UTC_TIMESTAMP()`),
          ),
        );

      if (affectedRows(updateResult) !== 1) return false;

      await tx.insert(distributionReferralIntakeEvents).values({
        sessionId: Number(candidate.id),
        eventType: 'session_expired',
        details: {
          policyVersion: Number(candidate.policyVersion),
          expiryBasis: 'pinned_draft_expiry',
        },
      });
      return true;
    });

    if (changed) expired += 1;
  }
  return expired;
}

async function selectDueEvidence(db: any, limit: number): Promise<DeletionCandidate[]> {
  const rows = await db
    .select({
      id: distributionReferralIntakeEvidence.id,
      sessionId: distributionReferralIntakeEvidence.sessionId,
      evidenceType: distributionReferralIntakeEvidence.evidenceType,
      storageAdapter: distributionReferralIntakeEvidence.storageAdapter,
      storageKey: distributionReferralIntakeEvidence.storageKey,
      retentionDueAt: distributionReferralIntakeEvidence.retentionDueAt,
      storageStatus: distributionReferralIntakeEvidence.storageStatus,
      deletionAttemptCount: distributionReferralIntakeEvidence.deletionAttemptCount,
      deletionClaimedAt: distributionReferralIntakeEvidence.deletionClaimedAt,
      deletionNextAttemptAt: distributionReferralIntakeEvidence.deletionNextAttemptAt,
      policyVersion: distributionReferralIntakeSessions.policyVersion,
    })
    .from(distributionReferralIntakeEvidence)
    .innerJoin(
      distributionReferralIntakeSessions,
      eq(distributionReferralIntakeSessions.id, distributionReferralIntakeEvidence.sessionId),
    )
    .where(
      and(
        inArray(distributionReferralIntakeSessions.status, [...EVIDENCE_DELETION_SESSION_STATUSES]),
        lte(distributionReferralIntakeEvidence.retentionDueAt, sql`UTC_TIMESTAMP()`),
        or(
          eq(distributionReferralIntakeEvidence.storageStatus, 'stored'),
          and(
            eq(distributionReferralIntakeEvidence.storageStatus, 'deletion_failed'),
            or(
              isNull(distributionReferralIntakeEvidence.deletionNextAttemptAt),
              lte(distributionReferralIntakeEvidence.deletionNextAttemptAt, sql`UTC_TIMESTAMP()`),
            ),
          ),
          and(
            eq(distributionReferralIntakeEvidence.storageStatus, 'deleting'),
            lte(
              distributionReferralIntakeEvidence.deletionClaimedAt,
              sql`DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${DELETION_LEASE_MINUTES} MINUTE)`,
            ),
          ),
        ),
      ),
    )
    .orderBy(asc(distributionReferralIntakeEvidence.retentionDueAt), asc(distributionReferralIntakeEvidence.id))
    .limit(limit);

  return rows.map((row: Record<string, unknown>) => ({
    id: Number(row.id),
    sessionId: Number(row.sessionId),
    evidenceType: String(row.evidenceType),
    storageAdapter: row.storageAdapter === 'local' || row.storageAdapter === 's3' ? row.storageAdapter : null,
    storageKey: typeof row.storageKey === 'string' ? row.storageKey : null,
    retentionDueAt: String(row.retentionDueAt),
    storageStatus: String(row.storageStatus) as DeletionCandidate['storageStatus'],
    deletionAttemptCount: Number(row.deletionAttemptCount || 0),
    deletionClaimedAt: typeof row.deletionClaimedAt === 'string' ? row.deletionClaimedAt : null,
    deletionNextAttemptAt:
      typeof row.deletionNextAttemptAt === 'string' ? row.deletionNextAttemptAt : null,
    policyVersion: Number(row.policyVersion),
  }));
}

async function claimEvidence(db: any, candidate: DeletionCandidate, leaseToken: string): Promise<boolean> {
  const result = await db
    .update(distributionReferralIntakeEvidence)
    .set({
      storageStatus: 'deleting',
      deletionClaimedAt: sql`UTC_TIMESTAMP()`,
      deletionLeaseToken: leaseToken,
      deletionAttemptCount: sql`${distributionReferralIntakeEvidence.deletionAttemptCount} + 1`,
      deletionNextAttemptAt: null,
      deletionLastErrorCode: null,
    })
    .where(
      and(
        eq(distributionReferralIntakeEvidence.id, candidate.id),
        lte(distributionReferralIntakeEvidence.retentionDueAt, sql`UTC_TIMESTAMP()`),
        canClaim(candidate),
      ),
    );
  return affectedRows(result) === 1;
}

async function completeEvidenceDeletion(
  db: any,
  candidate: DeletionCandidate,
  leaseToken: string,
): Promise<boolean> {
  return db.transaction(async (tx: any) => {
    const updateResult = await tx
      .update(distributionReferralIntakeEvidence)
      .set({
        storageStatus: 'deleted',
        storageAdapter: null,
        storageKey: null,
        mimeType: null,
        byteSize: null,
        sha256: null,
        deletionClaimedAt: null,
        deletionLeaseToken: null,
        deletionNextAttemptAt: null,
        deletionLastErrorCode: null,
        deletedAt: sql`UTC_TIMESTAMP()`,
      })
      .where(
        and(
          eq(distributionReferralIntakeEvidence.id, candidate.id),
          eq(distributionReferralIntakeEvidence.storageStatus, 'deleting'),
          eq(distributionReferralIntakeEvidence.deletionLeaseToken, leaseToken),
        ),
      );

    if (affectedRows(updateResult) !== 1) return false;

    await tx.insert(distributionReferralIntakeEvents).values({
      sessionId: candidate.sessionId,
      evidenceId: candidate.id,
      eventType: 'evidence_deleted',
      details: {
        evidenceType: candidate.evidenceType,
        policyVersion: candidate.policyVersion,
        retentionDueAt: candidate.retentionDueAt,
        storageAdapter: candidate.storageAdapter,
        deletionReason: 'retention_due',
      },
    });
    return true;
  });
}

async function recordEvidenceDeletionFailure(
  db: any,
  candidate: DeletionCandidate,
  leaseToken: string,
  errorCode: string,
  attempt: number,
): Promise<boolean> {
  const nextAttemptAt = retryAt(attempt);
  return db.transaction(async (tx: any) => {
    const updateResult = await tx
      .update(distributionReferralIntakeEvidence)
      .set({
        storageStatus: 'deletion_failed',
        deletionClaimedAt: null,
        deletionLeaseToken: null,
        deletionNextAttemptAt: nextAttemptAt,
        deletionLastErrorCode: errorCode,
      })
      .where(
        and(
          eq(distributionReferralIntakeEvidence.id, candidate.id),
          eq(distributionReferralIntakeEvidence.storageStatus, 'deleting'),
          eq(distributionReferralIntakeEvidence.deletionLeaseToken, leaseToken),
        ),
      );

    if (affectedRows(updateResult) !== 1) return false;

    await tx.insert(distributionReferralIntakeEvents).values({
      sessionId: candidate.sessionId,
      evidenceId: candidate.id,
      eventType: 'evidence_deletion_failed',
      details: {
        evidenceType: candidate.evidenceType,
        policyVersion: candidate.policyVersion,
        errorCode,
        attempt,
        retryAt: nextAttemptAt.toISOString(),
      },
    });
    return true;
  });
}

async function deleteDueEvidence(db: any, limit: number) {
  const candidates = await selectDueEvidence(db, limit);
  let deleted = 0;
  let failed = 0;

  for (const candidate of candidates) {
    const leaseToken = randomUUID();
    if (!(await claimEvidence(db, candidate, leaseToken))) continue;

    const attempt = candidate.deletionAttemptCount + 1;
    try {
      if (!candidate.storageAdapter || !candidate.storageKey) {
        const error = new Error('Storage locator is missing.');
        error.name = 'MissingStorageLocator';
        throw error;
      }
      await deleteDistributionReferralEvidence({
        storageAdapter: candidate.storageAdapter,
        storageKey: candidate.storageKey,
      });
      if (await completeEvidenceDeletion(db, candidate, leaseToken)) deleted += 1;
    } catch (error) {
      const errorCode = deletionErrorCode(error);
      if (
        await recordEvidenceDeletionFailure(
          db,
          candidate,
          leaseToken,
          errorCode,
          attempt,
        )
      ) {
        failed += 1;
        console.error('[DistributionEvidenceRetention] Evidence deletion failed.', {
          evidenceId: candidate.id,
          errorCode,
          attempt,
        });
      }
    }
  }

  return { scanned: candidates.length, deleted, failed };
}

function jsonObject(value: unknown): Record<string, unknown> | null {
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

function timestampMs(value: unknown) {
  const raw = String(value || '');
  if (!raw) return Number.NaN;
  return new Date(raw.includes('T') ? raw : `${raw.replace(' ', 'T')}Z`).getTime();
}

async function anonymizeDueReferralBuyerData(db: any, limit: number) {
  const sessions = await db
    .select({
      sessionId: distributionReferralIntakeSessions.id,
      status: distributionReferralIntakeSessions.status,
      policyVersion: distributionReferralIntakeSessions.policyVersion,
    })
    .from(distributionReferralIntakeSessions)
    .where(inArray(distributionReferralIntakeSessions.status, [...RETAINED_REFERRAL_STATUSES]))
    .orderBy(asc(distributionReferralIntakeSessions.updatedAt))
    .limit(limit * 3);

  const candidates: Array<{ sessionId: number; dealId: number; policyVersion: number; dueAt: string }> = [];
  for (const session of sessions) {
    const events = await db
      .select({ eventType: distributionReferralIntakeEvents.eventType, details: distributionReferralIntakeEvents.details })
      .from(distributionReferralIntakeEvents)
      .where(
        and(
          eq(distributionReferralIntakeEvents.sessionId, Number(session.sessionId)),
          inArray(distributionReferralIntakeEvents.eventType, ['referral_submitted', 'referral_closed']),
        ),
      )
      .orderBy(asc(distributionReferralIntakeEvents.occurredAt));
    const submitted = events.find((event: any) => event.eventType === 'referral_submitted');
    const closure = [...events].reverse().find((event: any) => event.eventType === 'referral_closed');
    const submittedDetails = jsonObject(submitted?.details);
    const closeDetails = jsonObject(closure?.details);
    const dealId = Number(submittedDetails?.dealId || 0);
    const dueAt = session.status === 'closed'
      ? String(closeDetails?.buyerDataRetentionDueAt || submittedDetails?.buyerDataRetentionDueAt || '')
      : String(submittedDetails?.buyerDataRetentionDueAt || '');
    if (dealId > 0 && dueAt && timestampMs(dueAt) <= Date.now()) {
      candidates.push({ sessionId: Number(session.sessionId), dealId, policyVersion: Number(session.policyVersion), dueAt });
    }
  }
  if (!candidates.length) return { scanned: sessions.length, anonymized: 0 };

  const candidateDealIds = candidates.map(candidate => candidate.dealId);
  const alreadyProcessed = await db
    .select({ dealId: distributionDealEvents.dealId })
    .from(distributionDealEvents)
    .where(
      and(
        inArray(distributionDealEvents.dealId, candidateDealIds),
        sql`JSON_UNQUOTE(JSON_EXTRACT(${distributionDealEvents.metadata}, '$.source')) = 'distribution.referralRetention'`,
      ),
    );
  const processedDealIds = new Set(alreadyProcessed.map((row: any) => Number(row.dealId)));
  let anonymized = 0;
  for (const candidate of candidates.slice(0, limit)) {
    if (processedDealIds.has(candidate.dealId)) continue;
    const changed = await db.transaction(async (tx: any) => {
      const [deal] = await tx
        .select({ id: distributionDeals.id, currentStage: distributionDeals.currentStage })
        .from(distributionDeals)
        .where(eq(distributionDeals.id, candidate.dealId))
        .limit(1);
      if (!deal) return false;
      const updateResult = await tx
        .update(distributionDeals)
        .set({
          buyerName: 'Buyer details removed',
          buyerEmail: null,
          buyerPhone: null,
          externalRef: null,
        })
        .where(
          and(
            eq(distributionDeals.id, candidate.dealId),
            or(
              ne(distributionDeals.buyerName, 'Buyer details removed'),
              isNotNull(distributionDeals.buyerEmail),
              isNotNull(distributionDeals.buyerPhone),
              isNotNull(distributionDeals.externalRef),
            ),
          ),
        );
      if (affectedRows(updateResult) !== 1) return false;
      await tx.insert(distributionDealEvents).values({
        dealId: candidate.dealId,
        fromStage: deal.currentStage,
        toStage: deal.currentStage,
        eventType: 'system',
        actorUserId: null,
        metadata: {
          source: 'distribution.referralRetention',
          sessionId: candidate.sessionId,
          policyVersion: candidate.policyVersion,
          retentionDueAt: candidate.dueAt,
          removedFields: ['buyerName', 'buyerEmail', 'buyerPhone', 'externalRef'],
        } as any,
        notes: 'Buyer contact details removed under the program retention schedule.',
      });
      return true;
    });
    if (changed) anonymized += 1;
  }
  return { scanned: sessions.length, anonymized };
}

export type DistributionReferralEvidenceRetentionSweep = {
  ready: boolean;
  blockedBySchema: string[];
  expiredSessions: number;
  scannedEvidence: number;
  deletedEvidence: number;
  failedEvidenceDeletions: number;
  anonymizedBuyerRecords: number;
};

export async function runDistributionReferralEvidenceRetentionSweep(input?: {
  batchSize?: number;
}): Promise<DistributionReferralEvidenceRetentionSweep> {
  const schemaStatus = await getDistributionSchemaOperationStatus(
    'distribution.referralEvidenceRetention',
  );
  if (!schemaStatus.ready) {
    return {
      ready: false,
      blockedBySchema: schemaStatus.missingItems,
      expiredSessions: 0,
      scannedEvidence: 0,
      deletedEvidence: 0,
      failedEvidenceDeletions: 0,
      anonymizedBuyerRecords: 0,
    };
  }

  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const limit = batchLimit(input?.batchSize);
  const expiredSessions = await expireDraftSessions(db, limit);
  const evidence = await deleteDueEvidence(db, limit);
  const buyerData = await anonymizeDueReferralBuyerData(db, limit);
  return {
    ready: true,
    blockedBySchema: [],
    expiredSessions,
    scannedEvidence: evidence.scanned,
    deletedEvidence: evidence.deleted,
    failedEvidenceDeletions: evidence.failed,
    anonymizedBuyerRecords: buyerData.anonymized,
  };
}
