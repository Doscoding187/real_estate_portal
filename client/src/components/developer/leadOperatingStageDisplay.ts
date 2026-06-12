import type { LeadTransactionType } from './leadQualificationDisplay';

const SALE_STAGE_LABELS: Record<string, string> = {
  new: 'New buyer lead',
  contacted: 'Buyer contacted',
  qualified: 'Buyer qualified',
  viewing_scheduled: 'Viewing scheduled',
  viewing_completed: 'Viewing completed',
  offer_made: 'Offer made',
  deal_in_progress: 'Sale in progress',
  closed_won: 'Sold',
  closed_lost: 'Buyer follow-up closed',
  spam: 'Spam',
  duplicate: 'Duplicate',
  archived: 'Archived',
};

const RENTAL_STAGE_LABELS: Record<string, string> = {
  new: 'New renter lead',
  contacted: 'Renter contacted',
  qualified: 'Rental fit checked',
  viewing_scheduled: 'Viewing scheduled',
  viewing_completed: 'Viewing completed',
  offer_made: 'Application received',
  deal_in_progress: 'Lease review',
  closed_won: 'Let',
  closed_lost: 'Rental follow-up closed',
  spam: 'Spam',
  duplicate: 'Duplicate',
  archived: 'Archived',
};

const AUCTION_STAGE_LABELS: Record<string, string> = {
  new: 'New bidder lead',
  contacted: 'Bidder contacted',
  qualified: 'Bidder readiness checked',
  viewing_scheduled: 'Pack review scheduled',
  viewing_completed: 'Pack review completed',
  offer_made: 'Bid intent captured',
  deal_in_progress: 'Auction follow-up',
  closed_won: 'Sold at auction',
  closed_lost: 'Auction follow-up closed',
  spam: 'Spam',
  duplicate: 'Duplicate',
  archived: 'Archived',
};

const SALE_NEXT_ACTION_LABELS: Record<string, string> = {
  call: 'Call buyer',
  email: 'Email buyer',
  whatsapp: 'WhatsApp buyer',
  schedule_viewing: 'Schedule viewing',
  send_brochure: 'Send brochure',
  other: 'Other',
};

const RENTAL_NEXT_ACTION_LABELS: Record<string, string> = {
  call: 'Call renter',
  email: 'Email renter',
  whatsapp: 'WhatsApp renter',
  schedule_viewing: 'Schedule rental viewing',
  send_brochure: 'Send rental pack',
  other: 'Other',
};

const AUCTION_NEXT_ACTION_LABELS: Record<string, string> = {
  call: 'Call bidder',
  email: 'Email bidder',
  whatsapp: 'WhatsApp bidder',
  schedule_viewing: 'Schedule pack review',
  send_brochure: 'Send auction pack',
  other: 'Other',
};

function labelsFor(transactionType: LeadTransactionType, kind: 'stage' | 'action') {
  if (kind === 'action') {
    if (transactionType === 'rent') return RENTAL_NEXT_ACTION_LABELS;
    if (transactionType === 'auction') return AUCTION_NEXT_ACTION_LABELS;
    return SALE_NEXT_ACTION_LABELS;
  }

  if (transactionType === 'rent') return RENTAL_STAGE_LABELS;
  if (transactionType === 'auction') return AUCTION_STAGE_LABELS;
  return SALE_STAGE_LABELS;
}

function prettify(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getLeadStageDisplayLabel(
  stage: unknown,
  transactionType: LeadTransactionType,
): string {
  const key = String(stage || '').trim();
  if (!key) return 'Unknown stage';
  return labelsFor(transactionType, 'stage')[key] || prettify(key);
}

export function getLeadNextActionDisplayLabel(
  action: unknown,
  transactionType: LeadTransactionType,
): string {
  const key = String(action || '').trim();
  if (!key) return 'Follow up';
  return labelsFor(transactionType, 'action')[key] || prettify(key);
}
