import type { LeadTransactionType } from './leadQualificationDisplay';

export type LeadStageGuidance = {
  title: string;
  nextProof: string;
  caution: string;
};

const SALE_GUIDANCE: Record<string, LeadStageGuidance> = {
  new: {
    title: 'Confirm buyer intent',
    nextProof: 'Contact the buyer, confirm preferred unit type, budget range, and finance path.',
    caution: 'Do not move this lead forward until contact details and buying intent are clear.',
  },
  qualified: {
    title: 'Prepare viewing or sales follow-up',
    nextProof: 'Confirm affordability context, preferred unit, and next viewing or brochure action.',
    caution: 'Affordability context is a sales signal, not bond approval.',
  },
  offer_made: {
    title: 'Track offer terms',
    nextProof: 'Record the offer path, unit, expected deposit timing, and decision owner.',
    caution: 'Do not treat the unit as sold until the sale outcome is confirmed.',
  },
  deal_in_progress: {
    title: 'Protect sale completion',
    nextProof: 'Track agreement, deposit, finance, and conveyancing handoff milestones.',
    caution: 'Keep public inventory truthful until the sold status is synced.',
  },
};

const RENTAL_GUIDANCE: Record<string, LeadStageGuidance> = {
  new: {
    title: 'Confirm renter intent',
    nextProof: 'Confirm preferred unit, move-in timing, household fit, and monthly rent range.',
    caution: 'Do not imply lease approval from an enquiry alone.',
  },
  qualified: {
    title: 'Check rental fit',
    nextProof: 'Review rent capacity, deposit readiness, employment/income signals, and lease timing.',
    caution: 'Rental fit is an early estimate until proof of income and application review are captured.',
  },
  offer_made: {
    title: 'Review application',
    nextProof: 'Collect application details, proof of income, deposit readiness, and occupation date.',
    caution: 'Do not mark inventory as let until the lease is accepted and signed.',
  },
  deal_in_progress: {
    title: 'Complete lease review',
    nextProof: 'Track lease acceptance, deposit payment, compliance checks, and handover timing.',
    caution: 'Distribution or payout readiness must still wait for manual review gates.',
  },
};

const AUCTION_GUIDANCE: Record<string, LeadStageGuidance> = {
  new: {
    title: 'Confirm bidder intent',
    nextProof: 'Confirm auction pack interest, bidder contactability, and target unit or lot.',
    caution: 'Do not treat enquiry interest as bidder registration.',
  },
  qualified: {
    title: 'Check bidder readiness',
    nextProof: 'Review cash contribution, bidding capacity, registration intent, and legal-pack access.',
    caution: 'Bidder readiness is not proof of funds or auction registration.',
  },
  offer_made: {
    title: 'Capture bid intent',
    nextProof: 'Confirm intended bid range, registration steps, auction terms, and legal-pack review.',
    caution: 'Do not mark the bidder ready until registration and required documents are reviewed.',
  },
  deal_in_progress: {
    title: 'Manage auction follow-up',
    nextProof: 'Track sold, passed-in, withdrawn, or post-auction negotiation outcome evidence.',
    caution: 'Auction outcomes must stay manual until legal and operating gates are proven.',
  },
};

const DEFAULT_GUIDANCE: LeadStageGuidance = {
  title: 'Work the next verified step',
  nextProof: 'Confirm the lead context, record the next action, and keep the timeline up to date.',
  caution: 'Only move the lead when the current stage has real supporting evidence.',
};

function guidanceFor(transactionType: LeadTransactionType): Record<string, LeadStageGuidance> {
  if (transactionType === 'rent') return RENTAL_GUIDANCE;
  if (transactionType === 'auction') return AUCTION_GUIDANCE;
  return SALE_GUIDANCE;
}

export function getLeadStageGuidance(
  stage: unknown,
  transactionType: LeadTransactionType,
): LeadStageGuidance {
  const key = String(stage || '').trim();
  return guidanceFor(transactionType)[key] || DEFAULT_GUIDANCE;
}
