import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import { applicationRequirements, dealRequirementStatuses, developmentDocuments, distributionDeals } from '../../drizzle/schema';
import { getDb } from '../db';

export type DealRequirementStatus =
  | 'missing'
  | 'uploaded'
  | 'pending_review'
  | 'verified'
  | 'rejected'
  | 'waived';

export type DealRequirementStatusSource = 'user_upload' | 'manager_review' | 'linked_development_document';

export type TransitionActorRole = 'referrer' | 'manager' | 'developer_admin' | 'system';

export type DealRequirementTransitionInput = {
  dealId: number;
  requirementId: number;
  toStatus: DealRequirementStatus;
  actorUserId: number | null;
  actorRole: TransitionActorRole;
  source?: DealRequirementStatusSource;
  uploadedFileStorageKey?: string | null;
  uploadedFileUrl?: string | null;
  uploadedFileName?: string | null;
  rejectionReason?: string | null;
  notes?: string | null;
};

export type DealRequirementTransitionResult = {
  dealId: number;
  requirementId: number;
  fromStatus: DealRequirementStatus;
  toStatus: DealRequirementStatus;
};

const STATUS_ORDER = ['missing', 'uploaded', 'pending_review', 'verified', 'rejected', 'waived'] as const;

function statusOrMissing(value: unknown): DealRequirementStatus {
  const text = String(value || 'missing') as DealRequirementStatus;
  return (STATUS_ORDER as readonly string[]).includes(text) ? text : 'missing';
}

function nowSql() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export function assertValidStatusTransition(
  fromStatus: DealRequirementStatus,
  toStatus: DealRequirementStatus,
  actorRole: TransitionActorRole,
) {
  if (toStatus === 'waived') {
    if (actorRole !== 'manager' && actorRole !== 'developer_admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Only managers or developer admins can waive requirements.' });
    }
    return;
  }

  if (toStatus === 'uploaded') {
    if (fromStatus === 'verified') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot upload against an already verified requirement without reset/waive flow.',
      });
    }
    return;
  }

  if (toStatus === 'pending_review') {
    if (fromStatus !== 'uploaded') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only uploaded requirements can move to pending_review.' });
    }
    return;
  }

  if (toStatus === 'verified') {
    if (fromStatus !== 'pending_review') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot verify requirement unless it is pending_review.' });
    }
    if (actorRole !== 'manager' && actorRole !== 'developer_admin' && actorRole !== 'system') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Only reviewers can verify requirements.' });
    }
    return;
  }

  if (toStatus === 'rejected') {
    if (fromStatus !== 'uploaded' && fromStatus !== 'pending_review') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot reject requirement unless uploaded or pending_review.' });
    }
    if (actorRole !== 'manager' && actorRole !== 'developer_admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Only reviewers can reject requirements.' });
    }
    return;
  }

  if (toStatus === 'missing') {
    if (actorRole !== 'manager' && actorRole !== 'developer_admin' && actorRole !== 'system') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Only reviewers can reset a requirement to missing.' });
    }
    return;
  }
}

export async function transitionDealRequirementStatus(
  input: DealRequirementTransitionInput,
): Promise<DealRequirementTransitionResult> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db.transaction(async tx => {
    const [deal] = await tx
      .select({ id: distributionDeals.id, developmentId: distributionDeals.developmentId })
      .from(distributionDeals)
      .where(eq(distributionDeals.id, input.dealId))
      .limit(1);

    if (!deal) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Distribution deal not found.' });
    }

    const [requirement] = await tx
      .select({
        id: applicationRequirements.id,
        developmentId: applicationRequirements.developmentId,
        linkedDevelopmentDocumentId: applicationRequirements.linkedDevelopmentDocumentId,
      })
      .from(applicationRequirements)
      .where(eq(applicationRequirements.id, input.requirementId))
      .limit(1);

    if (!requirement || Number(requirement.developmentId) !== Number(deal.developmentId)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Requirement does not belong to this deal development.' });
    }

    const [existing] = await tx
      .select({
        id: dealRequirementStatuses.id,
        status: dealRequirementStatuses.status,
      })
      .from(dealRequirementStatuses)
      .where(
        and(
          eq(dealRequirementStatuses.dealId, input.dealId),
          eq(dealRequirementStatuses.requirementId, input.requirementId),
        ),
      )
      .limit(1);

    const fromStatus = statusOrMissing(existing?.status);
    assertValidStatusTransition(fromStatus, input.toStatus, input.actorRole);

    const timestamp = nowSql();

    const isReviewStatus = input.toStatus === 'verified' || input.toStatus === 'rejected' || input.toStatus === 'waived';
    const baseUpdate = {
      status: input.toStatus,
      uploadedFileStorageKey: input.uploadedFileStorageKey ?? null,
      uploadedFileUrl: input.uploadedFileUrl ?? null,
      uploadedFileName: input.uploadedFileName ?? null,
      linkedDevelopmentDocumentId:
        input.source === 'linked_development_document'
          ? (requirement.linkedDevelopmentDocumentId ?? null)
          : null,
      submittedBy:
        input.toStatus === 'uploaded' || input.toStatus === 'pending_review' ? (input.actorUserId ?? null) : null,
      submittedAt: input.toStatus === 'uploaded' || input.toStatus === 'pending_review' ? timestamp : null,
      reviewedBy: isReviewStatus ? (input.actorUserId ?? null) : null,
      reviewedAt: isReviewStatus ? timestamp : null,
      rejectionReason: input.toStatus === 'rejected' ? (input.rejectionReason || null) : null,
      notes: input.notes || null,
      updatedAt: timestamp,
    };

    if (!existing) {
      await tx.insert(dealRequirementStatuses).values({
        dealId: input.dealId,
        requirementId: input.requirementId,
        createdAt: timestamp,
        ...baseUpdate,
      });
    } else {
      await tx
        .update(dealRequirementStatuses)
        .set(baseUpdate)
        .where(eq(dealRequirementStatuses.id, Number(existing.id)));
    }

    return {
      dealId: input.dealId,
      requirementId: input.requirementId,
      fromStatus,
      toStatus: input.toStatus,
    };
  });
}

export async function autoVerifyRequirementFromLinkedDevelopmentDocument(input: {
  dealId: number;
  requirementId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [requirement] = await db
    .select({
      linkedDevelopmentDocumentId: applicationRequirements.linkedDevelopmentDocumentId,
    })
    .from(applicationRequirements)
    .where(eq(applicationRequirements.id, input.requirementId))
    .limit(1);

  if (!requirement?.linkedDevelopmentDocumentId) return null;

  const [asset] = await db
    .select({ id: developmentDocuments.id, isActive: developmentDocuments.isActive })
    .from(developmentDocuments)
    .where(eq(developmentDocuments.id, Number(requirement.linkedDevelopmentDocumentId)))
    .limit(1);

  if (!asset || Number(asset.isActive) !== 1) return null;

  return transitionDealRequirementStatus({
    dealId: input.dealId,
    requirementId: input.requirementId,
    toStatus: 'verified',
    actorUserId: null,
    actorRole: 'system',
    source: 'linked_development_document',
    notes: 'AUTO_VERIFIED: linked_development_document',
  });
}
