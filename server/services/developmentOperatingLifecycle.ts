import { developmentApprovalQueue, developments } from '../../drizzle/schema';
import type { SubmissionValidationError } from './developmentSubmissionReadiness';

export type DevelopmentHomeLifecycleState =
  | 'live'
  | 'approved_private'
  | 'in_review'
  | 'changes_required'
  | 'rejected'
  | 'draft_ready_to_submit'
  | 'draft_action_required';

export type CanonicalDevelopmentReviewStatus = NonNullable<
  (typeof developmentApprovalQueue.$inferSelect)['status']
>;

export type DevelopmentHomeReadinessBlocker = SubmissionValidationError & {
  severity: 'critical';
};

export type DevelopmentHomeReviewRow = Pick<
  typeof developmentApprovalQueue.$inferSelect,
  'id' | 'status' | 'submittedAt' | 'reviewedAt' | 'reviewNotes' | 'rejectionReason'
>;

export function developerVisibleReviewFeedback(
  review: Pick<DevelopmentHomeReviewRow, 'status' | 'reviewNotes' | 'rejectionReason'>,
): string | null {
  if (review.status === 'changes_requested') return review.reviewNotes?.trim() || null;
  if (review.status === 'rejected') return review.rejectionReason?.trim() || null;
  return null;
}

export function deriveDevelopmentHomeLifecycleState(input: {
  approvalStatus: (typeof developments.$inferSelect)['approvalStatus'];
  isPublished: (typeof developments.$inferSelect)['isPublished'];
  blockers?: readonly DevelopmentHomeReadinessBlocker[];
  currentReviewStatus?: CanonicalDevelopmentReviewStatus | null;
  currentChangesRequestedFeedback?: string | null;
  commercialEligible?: boolean;
}): DevelopmentHomeLifecycleState {
  if (
    input.approvalStatus === 'approved' &&
    Number(input.isPublished) === 1 &&
    input.commercialEligible !== false
  ) {
    return 'live';
  }
  if (input.approvalStatus === 'approved') return 'approved_private';
  if (input.approvalStatus === 'pending') return 'in_review';
  if (input.approvalStatus === 'rejected') return 'rejected';
  if (
    input.currentReviewStatus === 'changes_requested' ||
    input.currentChangesRequestedFeedback?.trim()
  ) {
    return 'changes_required';
  }
  if ((input.blockers?.length ?? 0) === 0) return 'draft_ready_to_submit';
  return 'draft_action_required';
}

export function isDevelopmentHomePublicEligible(input: {
  approvalStatus: (typeof developments.$inferSelect)['approvalStatus'];
  isPublished: (typeof developments.$inferSelect)['isPublished'];
  commercialEligible?: boolean;
}): boolean {
  return (
    input.approvalStatus === 'approved' &&
    Number(input.isPublished) === 1 &&
    input.commercialEligible !== false
  );
}
