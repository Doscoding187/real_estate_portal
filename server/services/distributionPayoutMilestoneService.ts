import { DISTRIBUTION_DEAL_STAGE_VALUES } from '../../drizzle/schema';

type DistributionDealStage = (typeof DISTRIBUTION_DEAL_STAGE_VALUES)[number];

type PayoutMilestone =
  | 'attorney_instruction'
  | 'attorney_signing'
  | 'bond_approval'
  | 'transfer_registration'
  | 'occupation'
  | 'custom';

type DealDocumentStatus = 'pending' | 'received' | 'verified' | 'rejected';

type ChecklistDocument = {
  documentCode: string;
  status: DealDocumentStatus;
};

type EvaluatePayoutMilestoneInput = {
  payoutMilestone: string | null;
  currentStage: string | null;
  documents: ChecklistDocument[];
};

export type PayoutMilestoneEvaluation = {
  supported: boolean;
  satisfied: boolean;
  blockers: string[];
};

const STAGE_ORDER = new Map<DistributionDealStage, number>(
  DISTRIBUTION_DEAL_STAGE_VALUES.map((stage, index) => [stage, index]),
);

function hasVerifiedDocument(documents: ChecklistDocument[], documentCode: string) {
  return documents.some(
    document => document.documentCode === documentCode && document.status === 'verified',
  );
}

function isStageAtOrBeyond(currentStage: string | null, minimumStage: DistributionDealStage) {
  if (!currentStage) return false;
  const currentRank = STAGE_ORDER.get(currentStage as DistributionDealStage);
  const minimumRank = STAGE_ORDER.get(minimumStage);
  if (typeof currentRank !== 'number' || typeof minimumRank !== 'number') {
    return false;
  }
  return currentRank >= minimumRank;
}

export function evaluatePayoutMilestone(
  input: EvaluatePayoutMilestoneInput,
): PayoutMilestoneEvaluation {
  const payoutMilestone = input.payoutMilestone as PayoutMilestone | null;

  if (!payoutMilestone) {
    return {
      supported: true,
      satisfied: false,
      blockers: ['Payout milestone is not configured for this program.'],
    };
  }

  switch (payoutMilestone) {
    case 'attorney_instruction':
      return hasVerifiedDocument(input.documents, 'attorney_instruction_letter')
        ? { supported: true, satisfied: true, blockers: [] }
        : {
            supported: true,
            satisfied: false,
            blockers: ['Payout milestone requires a verified attorney instruction letter.'],
          };

    case 'bond_approval':
      return isStageAtOrBeyond(input.currentStage, 'bond_approved')
        ? { supported: true, satisfied: true, blockers: [] }
        : {
            supported: true,
            satisfied: false,
            blockers: ['Payout milestone requires the deal to reach bond approval.'],
          };

    case 'transfer_registration':
      return hasVerifiedDocument(input.documents, 'transfer_documents')
        ? { supported: true, satisfied: true, blockers: [] }
        : {
            supported: true,
            satisfied: false,
            blockers: ['Payout milestone requires verified transfer documents.'],
          };

    case 'attorney_signing':
    case 'occupation':
    case 'custom':
      return {
        supported: false,
        satisfied: true,
        blockers: [],
      };

    default:
      return {
        supported: true,
        satisfied: false,
        blockers: [`Unsupported payout milestone "${payoutMilestone}".`],
      };
  }
}
