import { TRPCError } from '@trpc/server';
import { and, eq, inArray } from 'drizzle-orm';
import { applicationRequirements, dealRequirementStatuses, developmentDocuments, distributionDeals } from '../../drizzle/schema';
import { getDb } from '../db';

export type DealRequirementStatus =
  | 'missing'
  | 'uploaded'
  | 'pending_review'
  | 'verified'
  | 'rejected'
  | 'waived';

export type DealReadiness = {
  uploadComplete: boolean;
  verificationComplete: boolean;
  requiredTotal: number;
  uploadedCount: number;
  verifiedCount: number;
  waivedCount: number;
  pendingReviewCount: number;
  rejectedCount: number;
  missingCount: number;
};

const UPLOAD_READY_STATUSES: DealRequirementStatus[] = ['uploaded', 'pending_review', 'verified', 'waived'];
const VERIFIED_STATUSES: DealRequirementStatus[] = ['verified', 'waived'];

function asStatus(value: unknown): DealRequirementStatus {
  const text = String(value || 'missing') as DealRequirementStatus;
  if (
    text === 'missing' ||
    text === 'uploaded' ||
    text === 'pending_review' ||
    text === 'verified' ||
    text === 'rejected' ||
    text === 'waived'
  ) {
    return text;
  }
  return 'missing';
}

export async function getDealReadinessByDealId(dealId: number): Promise<DealReadiness> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [deal] = await db
    .select({ id: distributionDeals.id, developmentId: distributionDeals.developmentId })
    .from(distributionDeals)
    .where(eq(distributionDeals.id, dealId))
    .limit(1);

  if (!deal) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Distribution deal not found.' });
  }

  const requiredRequirements = await db
    .select({
      requirementId: applicationRequirements.id,
      linkedDevelopmentDocumentId: applicationRequirements.linkedDevelopmentDocumentId,
    })
    .from(applicationRequirements)
    .where(
      and(
        eq(applicationRequirements.developmentId, Number(deal.developmentId)),
        eq(applicationRequirements.isActive, 1),
        eq(applicationRequirements.required, 1),
      ),
    );

  if (!requiredRequirements.length) {
    return {
      uploadComplete: true,
      verificationComplete: true,
      requiredTotal: 0,
      uploadedCount: 0,
      verifiedCount: 0,
      waivedCount: 0,
      pendingReviewCount: 0,
      rejectedCount: 0,
      missingCount: 0,
    };
  }

  const requirementIds = requiredRequirements.map(row => Number(row.requirementId));
  const statusRows = await db
    .select({
      requirementId: dealRequirementStatuses.requirementId,
      status: dealRequirementStatuses.status,
      linkedDevelopmentDocumentId: dealRequirementStatuses.linkedDevelopmentDocumentId,
    })
    .from(dealRequirementStatuses)
    .where(and(eq(dealRequirementStatuses.dealId, dealId), inArray(dealRequirementStatuses.requirementId, requirementIds)));

  const statusByRequirementId = new Map<number, DealRequirementStatus>();
  statusRows.forEach(row => {
    statusByRequirementId.set(Number(row.requirementId), asStatus(row.status));
  });

  const linkedDocIds: number[] = Array.from(
    new Set(
      requiredRequirements
        .map(row => (row.linkedDevelopmentDocumentId === null ? null : Number(row.linkedDevelopmentDocumentId)))
        .filter((value): value is number => typeof value === 'number'),
    ),
  );

  const activeDevelopmentDocumentIds = linkedDocIds.length
    ? new Set(
        (
          await db
            .select({ id: developmentDocuments.id })
            .from(developmentDocuments)
            .where(and(inArray(developmentDocuments.id, linkedDocIds), eq(developmentDocuments.isActive, 1)))
        ).map(row => Number(row.id)),
      )
    : new Set<number>();

  let uploadedCount = 0;
  let verifiedCount = 0;
  let waivedCount = 0;
  let pendingReviewCount = 0;
  let rejectedCount = 0;
  let missingCount = 0;

  requiredRequirements.forEach(row => {
    let status = statusByRequirementId.get(Number(row.requirementId)) || 'missing';

    // Auto-satisfy linked requirement when active development asset exists.
    if (
      status === 'missing' &&
      row.linkedDevelopmentDocumentId !== null &&
      activeDevelopmentDocumentIds.has(Number(row.linkedDevelopmentDocumentId))
    ) {
      status = 'verified';
    }

    if (UPLOAD_READY_STATUSES.includes(status)) uploadedCount += 1;
    if (status === 'verified') verifiedCount += 1;
    if (status === 'waived') waivedCount += 1;
    if (status === 'pending_review') pendingReviewCount += 1;
    if (status === 'rejected') rejectedCount += 1;
    if (status === 'missing') missingCount += 1;
  });

  const requiredTotal = requiredRequirements.length;

  return {
    uploadComplete: uploadedCount === requiredTotal,
    verificationComplete: verifiedCount + waivedCount === requiredTotal,
    requiredTotal,
    uploadedCount,
    verifiedCount,
    waivedCount,
    pendingReviewCount,
    rejectedCount,
    missingCount,
  };
}

export function isVerificationComplete(status: DealRequirementStatus) {
  return VERIFIED_STATUSES.includes(status);
}
