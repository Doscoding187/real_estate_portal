import type { LeadTransactionType } from './leadQualificationDisplay';

export type LeadEvidenceChecklistItem = {
  label: string;
  description: string;
  status: 'capture' | 'optional' | 'manual_review';
};

export type LeadEvidenceChecklist = {
  title: string;
  items: LeadEvidenceChecklistItem[];
};

const STATUS_ORDER: Record<LeadEvidenceChecklistItem['status'], number> = {
  capture: 0,
  manual_review: 1,
  optional: 2,
};

const SALE_ITEMS: LeadEvidenceChecklistItem[] = [
  {
    label: 'Buyer intent',
    description: 'Preferred unit, timing, price band, and purchase motivation.',
    status: 'capture',
  },
  {
    label: 'Finance path',
    description: 'Bond, cash, deposit readiness, or affordability context.',
    status: 'capture',
  },
  {
    label: 'Unit context',
    description: 'Selected unit type, availability, and quoted pricing language.',
    status: 'capture',
  },
  {
    label: 'Sale completion proof',
    description: 'Agreement, deposit, and sold-status evidence before public inventory changes.',
    status: 'manual_review',
  },
];

const RENTAL_ITEMS: LeadEvidenceChecklistItem[] = [
  {
    label: 'Rental fit',
    description: 'Rent capacity, move-in timing, household fit, and preferred unit.',
    status: 'capture',
  },
  {
    label: 'Proof of income',
    description: 'Income/employment evidence required before treating the application as ready.',
    status: 'capture',
  },
  {
    label: 'Deposit readiness',
    description: 'Deposit amount, first-month payment readiness, and occupation timing.',
    status: 'capture',
  },
  {
    label: 'Lease review',
    description: 'Signed lease and compliance checks before marking inventory as let.',
    status: 'manual_review',
  },
];

const AUCTION_ITEMS: LeadEvidenceChecklistItem[] = [
  {
    label: 'Bidder intent',
    description: 'Target lot/unit, intended bid range, and auction attendance path.',
    status: 'capture',
  },
  {
    label: 'Legal-pack access',
    description: 'Confirm the bidder has received or reviewed the required legal pack.',
    status: 'capture',
  },
  {
    label: 'Proof of funds',
    description: 'Cash contribution, finance route, or funds evidence before bidder readiness.',
    status: 'capture',
  },
  {
    label: 'Registration review',
    description: 'Manual registration and auction-term acceptance before calling the bidder ready.',
    status: 'manual_review',
  },
];

function titleFor(transactionType: LeadTransactionType): string {
  if (transactionType === 'rent') return 'Rental evidence checklist';
  if (transactionType === 'auction') return 'Auction evidence checklist';
  return 'Sale evidence checklist';
}

function itemsFor(transactionType: LeadTransactionType): LeadEvidenceChecklistItem[] {
  if (transactionType === 'rent') return RENTAL_ITEMS;
  if (transactionType === 'auction') return AUCTION_ITEMS;
  return SALE_ITEMS;
}

export function getLeadEvidenceChecklist(
  transactionType: LeadTransactionType,
): LeadEvidenceChecklist {
  return {
    title: titleFor(transactionType),
    items: itemsFor(transactionType).slice().sort((left, right) => {
      return STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
    }),
  };
}

export function getLeadEvidenceStatusLabel(status: LeadEvidenceChecklistItem['status']): string {
  if (status === 'manual_review') return 'Manual review';
  if (status === 'optional') return 'Optional';
  return 'Capture';
}
