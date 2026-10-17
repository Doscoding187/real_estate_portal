import { randomUUID } from 'node:crypto';
import { and, asc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import {
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
const TERMINAL_SESSION_STATUSES = ['withdrawn', 'closed', 'expired'] as const;

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
        inArray(distributionReferralIntakeSessions.status, [...TERMINAL_SESSION_STATUSES]),
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

export type DistributionReferralEvidenceRetentionSweep = {
  ready: boolean;
  blockedBySchema: string[];
  expiredSessions: number;
  scannedEvidence: number;
  deletedEvidence: number;
  failedEvidenceDeletions: number;
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
    };
  }

  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const limit = batchLimit(input?.batchSize);
  const expiredSessions = await expireDraftSessions(db, limit);
  const evidence = await deleteDueEvidence(db, limit);
  return {
    ready: true,
    blockedBySchema: [],
    expiredSessions,
    scannedEvidence: evidence.scanned,
    deletedEvidence: evidence.deleted,
    failedEvidenceDeletions: evidence.failed,
  };
}
