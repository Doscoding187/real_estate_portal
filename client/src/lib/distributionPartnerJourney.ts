export type PartnerViewingRecord = {
  dealId: number | string;
  status?: string | null;
  scheduledStartAt?: string | Date | null;
};

export function findScheduledPartnerViewing(
  dealId: number,
  viewings: PartnerViewingRecord[],
) {
  return viewings.find(
    viewing =>
      Number(viewing.dealId) === dealId &&
      String(viewing.status || '').toLowerCase() === 'scheduled',
  );
}

export function formatPartnerDealStatus(
  statusValue: unknown,
  dealId: number,
  viewings: PartnerViewingRecord[] = [],
) {
  const status = String(statusValue || '').trim().toLowerCase();

  if (!status || status === 'submitted' || status === 'lead' || status === 'viewing_scheduled') {
    const viewing = findScheduledPartnerViewing(dealId, viewings);
    if (!viewing) return 'Referral received';

    const timestamp = new Date(String(viewing.scheduledStartAt || '')).getTime();
    if (!Number.isFinite(timestamp)) return 'Viewing booked';
    return timestamp < Date.now() ? 'Viewing outcome pending' : 'Viewing booked';
  }

  const labels: Record<string, string> = {
    viewing_completed: 'Viewing completed',
    application_submitted: 'Application submitted',
    contract_signed: 'Agreement signed',
    bond_approved: 'Home finance approved',
    commission_pending: 'Referral payout pending',
    commission_paid: 'Referral payout paid',
    cancelled: 'Closed',
  };

  return labels[status] || 'Progress update pending';
}

export function formatPartnerDealGuidance(
  statusValue: unknown,
  dealId: number,
  viewings: PartnerViewingRecord[] = [],
) {
  const status = String(statusValue || '').trim().toLowerCase();

  if (status === 'commission_paid') {
    return 'A referral payout has been recorded. See the payout page for its payment details.';
  }
  if (status === 'commission_pending') {
    return 'The referral has reached its payout stage. Approval and payment updates will appear when they are recorded.';
  }

  if (status === 'viewing_scheduled') {
    const viewing = findScheduledPartnerViewing(dealId, viewings);
    if (viewing) {
      const date = new Date(String(viewing.scheduledStartAt || ''));
      const formattedDate = Number.isNaN(date.getTime())
        ? 'the scheduled time'
        : new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
      return date.getTime() < Date.now()
        ? `A viewing was booked for ${formattedDate}. Its outcome has not been recorded yet.`
        : `A viewing has been booked for ${formattedDate}.`;
    }
  }

  if (status === 'viewing_completed') {
    return 'The viewing is recorded as complete. The responsible team will add the next step when it is confirmed.';
  }
  if (status === 'application_submitted') {
    return 'The application is recorded as submitted. Follow this page for the next confirmed update.';
  }
  if (status === 'contract_signed') {
    return 'The signed agreement milestone is recorded. Follow this page for the next confirmed update.';
  }
  if (status === 'bond_approved') {
    return 'Home finance approval is recorded. Follow the remaining transaction updates here.';
  }
  if (status === 'cancelled') {
    return 'This deal is closed. Review the timeline for its recorded outcome.';
  }

  return 'Your referral has been received. The responsible team will confirm the next step here.';
}

export function summarizePartnerReferralWorkflow(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const workflow = value as Record<string, unknown>;
  if (workflow.verified !== true || !Array.isArray(workflow.steps) || !Array.isArray(workflow.progress)) {
    return null;
  }

  const progressByStepKey = new Map(
    workflow.progress.flatMap((item: any) =>
      item && typeof item === 'object' && item.stepKey
        ? [[String(item.stepKey), item] as const]
        : [],
    ),
  );
  const nextStep = workflow.steps.find((step: any) => {
    if (!step || typeof step !== 'object') return false;
    const progress: any = progressByStepKey.get(String(step.stepKey));
    return !['completed', 'not_applicable'].includes(String(progress?.status || 'not_started'));
  }) as any;

  if (!nextStep) {
    return workflow.steps.length
      ? 'All saved process steps are complete. Follow the deal for the next confirmed milestone.'
      : null;
  }

  const progress: any = progressByStepKey.get(String(nextStep.stepKey));
  const statusLabels: Record<string, string> = {
    not_started: 'Not started',
    in_progress: 'In progress',
    waiting: 'Waiting',
    completed: 'Completed',
    not_applicable: 'Not needed',
  };
  const status = String(progress?.status || 'not_started');
  const label = String(nextStep.stepLabel || 'Next process step');
  const update = String(progress?.partnerUpdate || '').trim();
  return `${label} · ${statusLabels[status] || 'Progress update pending'}${update ? `: ${update}` : ''}`;
}

export function summarizeActivePartnerDealWorkflow(value: unknown, statusValue: unknown) {
  const status = String(statusValue || '').trim().toLowerCase();
  if (['commission_pending', 'commission_paid', 'cancelled'].includes(status)) return null;
  return summarizePartnerReferralWorkflow(value);
}

const PARTNER_EVENT_LABELS: Record<string, string> = {
  system: 'Referral update recorded',
  stage_transition: 'Deal progress updated',
  override: 'Deal progress corrected',
  note: 'Team update added',
  validation: 'Referral details checked',
};

export function formatPartnerDealEvent(value: unknown) {
  const event = String(value || '').trim().toLowerCase();
  if (PARTNER_EVENT_LABELS[event]) return PARTNER_EVENT_LABELS[event];
  if (!event) return 'Referral update recorded';
  return event
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());
}

export function formatPartnerEventSource(roleValue: unknown) {
  const role = String(roleValue || '').trim().toLowerCase();
  if (role === 'system') return 'System update';
  if (['manager', 'distribution_manager', 'super_admin', 'admin'].includes(role)) {
    return 'Property Listify team';
  }
  if (['developer', 'developer_admin', 'developer_user'].includes(role)) {
    return 'Developer team';
  }
  if (role) return 'Referral partner';
  return 'Team update';
}

export function formatPartnerProcessOwner(ownerRole: unknown) {
  const owner = String(ownerRole || '').trim();
  if (!owner) return null;

  const normalized = owner.toLowerCase().replace(/[\s_-]+/g, ' ');
  const knownLabels: Record<string, string> = {
    partner: 'You',
    referrer: 'You',
    'referral partner': 'You',
    'distribution team': 'Property Listify team',
    'distribution manager': 'Property Listify team',
    manager: 'Property Listify team',
    admin: 'Property Listify team',
    developer: 'Developer team',
    'developer team': 'Developer team',
  };

  return knownLabels[normalized] || owner.replace(/[_-]+/g, ' ');
}

export type PartnerPayoutRecordState =
  | 'potential'
  | 'pending_approval'
  | 'approved'
  | 'paid'
  | 'cancelled'
  | 'deal_closed'
  | 'needs_review'
  | 'unknown';

const PARTNER_PAYOUT_PRE_ELIGIBILITY_STAGES = new Set([
  'viewing_scheduled',
  'viewing_completed',
  'application_submitted',
  'contract_signed',
  'bond_approved',
]);

export function getPartnerPayoutRecordState(
  entryStatusValue: unknown,
  dealStageValue: unknown,
): PartnerPayoutRecordState {
  const entryStatus = String(entryStatusValue || '').trim().toLowerCase();
  const dealStage = String(dealStageValue || '').trim().toLowerCase();

  if (entryStatus === 'paid') {
    return dealStage === 'commission_paid' ? 'paid' : 'needs_review';
  }
  if (entryStatus === 'approved') {
    return dealStage === 'commission_pending' ? 'approved' : 'needs_review';
  }
  if (entryStatus === 'cancelled') {
    return dealStage === 'cancelled' ? 'cancelled' : 'needs_review';
  }
  if (entryStatus !== 'pending' || !dealStage) return 'unknown';
  if (dealStage === 'commission_pending') return 'pending_approval';
  if (dealStage === 'commission_paid') return 'needs_review';
  if (dealStage === 'cancelled') return 'deal_closed';
  return PARTNER_PAYOUT_PRE_ELIGIBILITY_STAGES.has(dealStage) ? 'potential' : 'unknown';
}

export function formatPartnerPayoutRecordState(state: PartnerPayoutRecordState) {
  const labels: Record<PartnerPayoutRecordState, string> = {
    potential: 'Awaiting eligibility trigger',
    pending_approval: 'Pending approval',
    approved: 'Approved for payment',
    paid: 'Paid',
    cancelled: 'Cancelled',
    deal_closed: 'Deal closed before eligibility',
    needs_review: 'Payout status needs review',
    unknown: 'Update pending',
  };
  return labels[state];
}

export function describePartnerPayoutRecordState(state: PartnerPayoutRecordState) {
  const descriptions: Record<PartnerPayoutRecordState, string> = {
    potential: 'This amount follows the saved terms. The eligibility trigger has not been recorded.',
    pending_approval: 'The eligibility trigger is recorded. The payout is waiting for approval.',
    approved: 'This payout is approved. Payment timing is not specified in the saved terms.',
    paid: 'Payment has been recorded.',
    cancelled: 'This payout record was cancelled.',
    deal_closed: 'The deal closed before the payout eligibility trigger was recorded.',
    needs_review: 'The payout record and deal progress do not match. The Property Listify team needs to check it.',
    unknown: 'The payout status is not available yet.',
  };
  return descriptions[state];
}

export function formatPartnerDateTime(value: unknown) {
  if (!value) return 'Date not available';
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return 'Date not available';
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}
