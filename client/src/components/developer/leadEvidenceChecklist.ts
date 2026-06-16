import type { LeadTransactionType } from './leadQualificationDisplay';

export type LeadEvidenceChecklistItem = {
  label: string;
  description: string;
  status: 'capture' | 'optional' | 'manual_review';
  artifactRole?: string;
};

export type LeadEvidenceChecklist = {
  title: string;
  items: LeadEvidenceChecklistItem[];
};

export type LeadEvidenceReadinessSummary = {
  title: string;
  statusLabel: string;
  summary: string;
  guardrail: string;
  captureCount: number;
  manualReviewCount: number;
  optionalCount: number;
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
    artifactRole: 'proof_of_income',
  },
  {
    label: 'Deposit readiness',
    description: 'Deposit amount, first-month payment readiness, and occupation timing.',
    status: 'capture',
    artifactRole: 'deposit_readiness',
  },
  {
    label: 'Lease review',
    description: 'Signed lease and compliance checks before marking inventory as let.',
    status: 'manual_review',
    artifactRole: 'signed_lease',
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
    artifactRole: 'legal_pack_acknowledgement',
  },
  {
    label: 'Proof of funds',
    description: 'Cash contribution, finance route, or funds evidence before bidder readiness.',
    status: 'capture',
    artifactRole: 'proof_of_funds',
  },
  {
    label: 'Registration review',
    description: 'Manual registration and auction-term acceptance before calling the bidder ready.',
    status: 'manual_review',
    artifactRole: 'bidder_registration',
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

export function getLeadEvidenceReadinessSummary(
  transactionType: LeadTransactionType,
): LeadEvidenceReadinessSummary {
  const checklist = getLeadEvidenceChecklist(transactionType);
  const captureCount = checklist.items.filter(item => item.status === 'capture').length;
  const manualReviewCount = checklist.items.filter(item => item.status === 'manual_review').length;
  const optionalCount = checklist.items.filter(item => item.status === 'optional').length;

  if (transactionType === 'rent') {
    return {
      title: 'Rental readiness model',
      statusLabel: 'Manual lease review required',
      summary: `${captureCount} rental evidence items to capture before lease readiness can be reviewed.`,
      guardrail:
        'Do not mark inventory as let or distribution-ready until proof of income, deposit readiness, and lease review are manually accepted.',
      captureCount,
      manualReviewCount,
      optionalCount,
    };
  }

  if (transactionType === 'auction') {
    return {
      title: 'Auction readiness model',
      statusLabel: 'Manual bidder review required',
      summary: `${captureCount} bidder evidence items to capture before auction readiness can be reviewed.`,
      guardrail:
        'Do not treat the bidder as registered or funds-ready until legal-pack access, proof of funds, and registration terms are manually accepted.',
      captureCount,
      manualReviewCount,
      optionalCount,
    };
  }

  return {
    title: 'Sale readiness model',
    statusLabel: 'Manual sale review required',
    summary: `${captureCount} sale evidence items to capture before sale completion can be reviewed.`,
    guardrail:
      'Do not mark inventory as sold or distribution-ready until finance path, buyer intent, and completion proof are manually accepted.',
    captureCount,
    manualReviewCount,
    optionalCount,
  };
}

export function getLeadEvidenceReviewNote(transactionType: LeadTransactionType): string {
  const checklist = getLeadEvidenceChecklist(transactionType);
  const lines = checklist.items.map(item => {
    return `- ${item.label} (${getLeadEvidenceStatusLabel(item.status)}): ${item.description}`;
  });

  return [`${checklist.title} review`, ...lines, 'Decision: pending manual review.'].join('\n');
}

export function getLeadEvidenceArtifactOptions(transactionType: LeadTransactionType) {
  return getLeadEvidenceChecklist(transactionType)
    .items
    .filter(item => item.artifactRole)
    .map(item => ({
      label: item.label,
      role: item.artifactRole as string,
      description: item.description,
      status: item.status,
    }));
}
