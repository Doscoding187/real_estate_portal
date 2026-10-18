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

export function formatPartnerDateTime(value: unknown) {
  if (!value) return 'Date not available';
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return 'Date not available';
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}
