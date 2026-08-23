/**
 * Human-readable Developer lifecycle vocabulary.
 *
 * Canonical machine states live in the database and API contracts. These
 * presentation maps translate them into one controlled commercial vocabulary
 * so no surface shows raw enum strings for identity or payment states.
 */

const COMMERCIAL_STATUS_LABELS: Record<string, string> = {
  trial: 'Trial',
  pending_payment: 'Activation required',
  payment_under_review: 'Payment under review',
  active: 'Active',
  past_due: 'Payment overdue',
  grace_period: 'Grace period',
  suspended: 'Suspended',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export function formatCommercialStatus(status?: string | null): string {
  if (!status) return 'Unavailable';
  return COMMERCIAL_STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}

const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  issued: 'Invoice issued — awaiting payment',
  submitted: 'Proof under review',
  paid: 'Paid',
  partially_paid: 'Partially paid',
  overdue: 'Overdue',
  void: 'Void',
};

export function formatInvoiceStatus(status?: string | null): string {
  if (!status) return 'Unknown';
  return INVOICE_STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}

const REVIEW_EVENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Awaiting review',
  reviewing: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
  changes_requested: 'Changes requested',
};

export function formatReviewEventStatus(status?: string | null): string {
  if (!status) return 'Unknown';
  return REVIEW_EVENT_STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}
