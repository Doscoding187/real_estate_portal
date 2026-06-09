export type PartnerProgramTermsTransactionType = 'sale' | 'rent' | 'auction';

export function normalizePartnerProgramTermsTransactionType(
  value: unknown,
): PartnerProgramTermsTransactionType {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (normalized === 'rent' || normalized === 'for_rent' || normalized === 'to_rent') {
    return 'rent';
  }
  if (normalized === 'auction' || normalized === 'on_auction') return 'auction';
  return 'sale';
}

export function getPartnerProgramTermsCopy(transactionType: unknown) {
  const lane = normalizePartnerProgramTermsTransactionType(transactionType);

  if (lane === 'rent') {
    return {
      participantLabel: 'Renter',
      participantLower: 'renter',
      participantPlural: 'renters',
      documentOwnerLabel: 'Renter requirements',
      documentOwnerDescription:
        'Application documents are what the renter must provide. Supporting files are what you can share with the renter before submitting.',
      supportingPackDescription:
        'Plans, maps, specifications, rent lists, and other renter-facing files.',
      applicationDocumentsDescription:
        'These are the renter documents needed for qualification and programme progress.',
      supportingPackSummaryLabel: 'renter-ready',
    };
  }

  if (lane === 'auction') {
    return {
      participantLabel: 'Bidder',
      participantLower: 'bidder',
      participantPlural: 'bidders',
      documentOwnerLabel: 'Bidder requirements',
      documentOwnerDescription:
        'Application documents are what the bidder must provide. Supporting files are what you can share with the bidder before submitting.',
      supportingPackDescription:
        'Plans, maps, specifications, auction packs, and other bidder-facing files.',
      applicationDocumentsDescription:
        'These are the bidder documents needed for registration readiness and programme progress.',
      supportingPackSummaryLabel: 'bidder-ready',
    };
  }

  return {
    participantLabel: 'Buyer',
    participantLower: 'buyer',
    participantPlural: 'buyers',
    documentOwnerLabel: 'Buyer requirements',
    documentOwnerDescription:
      'Application documents are what the buyer must provide. Supporting files are what you can share with the buyer before submitting.',
    supportingPackDescription:
      'Plans, maps, specifications, price lists, and other buyer-facing files.',
    applicationDocumentsDescription:
      'These are the buyer documents needed for qualification and payout progress.',
    supportingPackSummaryLabel: 'buyer-ready',
  };
}

export function getPartnerProgramSemanticsCopy(transactionType: unknown) {
  const lane = normalizePartnerProgramTermsTransactionType(transactionType);

  if (lane === 'rent') {
    return {
      heading: 'Rental programme semantics',
      summary:
        'Rental rewards stay under manager review until lease, deposit, and rental document rules are configured.',
      readinessLabel: 'Lease readiness needed',
      readinessItems: ['Lease signed', 'Deposit received', 'Rental documents verified'],
      guardrail:
        'A let outcome can support review, but it does not prove reward readiness by itself.',
    };
  }

  if (lane === 'auction') {
    return {
      heading: 'Auction programme semantics',
      summary:
        'Auction rewards stay under manager review until bidder, auction-term, and outcome rules are configured.',
      readinessLabel: 'Bidder readiness needed',
      readinessItems: ['Bidder approved', 'Auction terms accepted', 'Winning bidder confirmed'],
      guardrail:
        'An auction sold outcome can support review, but it does not prove reward readiness by itself.',
    };
  }

  return {
    heading: 'Sale programme semantics',
    summary:
      'Sale is the current baseline for configured programme rewards and payout milestones.',
    readinessLabel: 'Sale readiness baseline',
    readinessItems: ['Buyer documents', 'Configured sale milestone', 'Manager approval where required'],
    guardrail:
      'Reward readiness still follows the configured programme terms and distribution review.',
  };
}
