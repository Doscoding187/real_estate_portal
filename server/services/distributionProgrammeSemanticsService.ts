type DistributionDocumentCategory = 'developer_document' | 'client_required_document';

export type DistributionProgrammeLane = 'sale' | 'rent' | 'auction';
export type DistributionProgrammeTemplateLane = DistributionProgrammeLane | 'all';
export type DistributionProgrammeParticipantType =
  | 'buyer'
  | 'renter'
  | 'bidder'
  | 'developer'
  | 'manager'
  | 'supporting';
export type DistributionProgrammeReviewOwner = 'manager' | 'admin' | 'developer' | 'system';

export type DistributionReadinessRole =
  | 'submission'
  | 'qualification'
  | 'lease'
  | 'auction_registration'
  | 'auction_terms'
  | 'payout'
  | 'supporting';

export type DistributionProgrammePayoutTrigger =
  | 'contract_signed'
  | 'bond_approved'
  | 'transfer_registered'
  | 'lease_signed'
  | 'deposit_received'
  | 'first_rent_paid'
  | 'winning_bidder_confirmed'
  | 'auction_terms_signed'
  | 'deposit_paid'
  | 'settlement_confirmed'
  | 'manual_approval';

export type DistributionProgrammeSemanticsDocument = {
  templateId: number;
  documentCode: string;
  documentLabel: string;
  category: DistributionDocumentCategory;
  isRequired: boolean;
  transactionType?: DistributionProgrammeTemplateLane | null;
  participantType?: DistributionProgrammeParticipantType | null;
  readinessRole?: DistributionReadinessRole | null;
  requiredForStage?: string | null;
  blocksPayout?: boolean | null;
  reviewOwner?: DistributionProgrammeReviewOwner | null;
  publiclyShareable?: boolean | null;
  programmeSpecific?: boolean | null;
  status?: string | null;
};

export type DistributionProgrammeSemanticsReadModel = {
  transactionLane: DistributionProgrammeLane;
  expectedRoles: DistributionReadinessRole[];
  configuredRoles: DistributionReadinessRole[];
  missingRoles: DistributionReadinessRole[];
  wrongLaneWarnings: string[];
  documentRoles: Array<{
    templateId: number;
    documentLabel: string;
    documentCode: string;
    readinessRole: DistributionReadinessRole;
    appliesToLane: boolean;
    blocksPayoutAutomation: boolean;
  }>;
  automationAllowed: false;
  automationBlockedReason: string;
  transactionRuleModel: {
    payoutTriggers: DistributionProgrammePayoutTrigger[];
    requiredConditions: string[];
    implementationStatus: 'shared_sale_shell' | 'transaction_specific_rules_required';
  };
};

export function normalizeDistributionProgrammeLane(transactionType: unknown): DistributionProgrammeLane {
  const normalized = String(transactionType || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (['for_rent', 'rent', 'rental', 'to_rent'].includes(normalized)) return 'rent';
  if (['auction', 'on_auction'].includes(normalized)) return 'auction';
  return 'sale';
}

function roleLabel(role: DistributionReadinessRole) {
  return role.replace(/_/g, ' ');
}

function normalizedDocumentText(document: DistributionProgrammeSemanticsDocument) {
  return `${document.documentCode} ${document.documentLabel}`.toLowerCase();
}

function inferReadinessRole(
  lane: DistributionProgrammeLane,
  document: DistributionProgrammeSemanticsDocument,
): DistributionReadinessRole {
  if (document.readinessRole && document.readinessRole !== 'supporting') {
    return document.readinessRole;
  }

  const text = normalizedDocumentText(document);
  const code = String(document.documentCode || '').toLowerCase();

  if (document.category === 'developer_document') return 'supporting';
  if (code === 'id_document' || code === 'proof_of_address') return 'submission';

  if (
    code === 'proof_of_income' ||
    code === 'bank_statement' ||
    code === 'pre_approval' ||
    text.includes('proof of funds') ||
    text.includes('fica')
  ) {
    return 'qualification';
  }

  if (lane === 'rent') {
    if (text.includes('lease')) return 'lease';
    if (text.includes('deposit') || text.includes('first rent')) return 'payout';
  }

  if (lane === 'auction') {
    if (text.includes('registration')) return 'auction_registration';
    if (text.includes('auction term') || text.includes('terms acceptance')) return 'auction_terms';
    if (text.includes('winning bidder') || text.includes('deposit') || text.includes('settlement')) {
      return 'payout';
    }
  }

  if (
    code === 'signed_offer_to_purchase' ||
    code === 'sale_agreement' ||
    code === 'attorney_instruction_letter' ||
    code === 'transfer_documents' ||
    text.includes('signed offer') ||
    text.includes('sale agreement') ||
    text.includes('transfer')
  ) {
    return 'payout';
  }

  return 'supporting';
}

function documentAppliesToLane(
  lane: DistributionProgrammeLane,
  document: DistributionProgrammeSemanticsDocument,
) {
  if (document.transactionType && document.transactionType !== 'all') {
    return document.transactionType === lane;
  }

  const text = normalizedDocumentText(document);
  const code = String(document.documentCode || '').toLowerCase();
  const saleOnly =
    code === 'signed_offer_to_purchase' ||
    code === 'sale_agreement' ||
    code === 'attorney_instruction_letter' ||
    code === 'transfer_documents' ||
    text.includes('sale agreement') ||
    text.includes('offer to purchase') ||
    text.includes('bond approval') ||
    text.includes('transfer');
  const rentalOnly = text.includes('lease') || text.includes('first rent');
  const auctionOnly =
    text.includes('bidder') ||
    text.includes('auction') ||
    text.includes('legal pack') ||
    text.includes('registration');

  if (lane === 'sale') return !rentalOnly && !auctionOnly;
  if (lane === 'rent') return !saleOnly && !auctionOnly;
  return !saleOnly && !rentalOnly;
}

function expectedRolesForLane(lane: DistributionProgrammeLane): DistributionReadinessRole[] {
  if (lane === 'rent') return ['submission', 'qualification', 'lease', 'payout'];
  if (lane === 'auction') {
    return ['submission', 'qualification', 'auction_registration', 'auction_terms', 'payout'];
  }
  return ['submission', 'qualification', 'payout'];
}

function transactionRuleModelForLane(
  lane: DistributionProgrammeLane,
): DistributionProgrammeSemanticsReadModel['transactionRuleModel'] {
  if (lane === 'rent') {
    return {
      payoutTriggers: ['lease_signed', 'deposit_received', 'first_rent_paid', 'manual_approval'],
      requiredConditions: [
        'Rental programme payout trigger is explicitly selected.',
        'Rental document templates define renter, lease, and payout readiness roles.',
        'Lease, deposit, or first-rent evidence is verified when required by the selected trigger.',
        'Manager manual rental readiness review is accepted.',
        'DLE let outcome is linked as review context or explicitly configured as a required condition.',
      ],
      implementationStatus: 'transaction_specific_rules_required',
    };
  }

  if (lane === 'auction') {
    return {
      payoutTriggers: [
        'winning_bidder_confirmed',
        'auction_terms_signed',
        'deposit_paid',
        'settlement_confirmed',
        'manual_approval',
      ],
      requiredConditions: [
        'Auction programme payout trigger is explicitly selected.',
        'Auction document templates define bidder, registration, terms, and payout readiness roles.',
        'Winning-bidder, auction-terms, deposit, or settlement evidence is verified when required by the selected trigger.',
        'Manager manual auction bidder readiness review is accepted.',
        'DLE auction sold outcome is linked as review context or explicitly configured as a required condition.',
      ],
      implementationStatus: 'transaction_specific_rules_required',
    };
  }

  return {
    payoutTriggers: ['contract_signed', 'bond_approved', 'transfer_registered', 'manual_approval'],
    requiredConditions: [
      'Required buyer documents are verified.',
      'Configured distribution payout milestone is satisfied.',
      'Manager or admin review accepts the deal for reward movement.',
      'Commission entry creation uses the configured programme amount model.',
    ],
    implementationStatus: 'shared_sale_shell',
  };
}

export function buildDistributionProgrammeSemanticsReadModel(input: {
  transactionType: unknown;
  documents: DistributionProgrammeSemanticsDocument[];
}): DistributionProgrammeSemanticsReadModel {
  const transactionLane = normalizeDistributionProgrammeLane(input.transactionType);
  const expectedRoles = expectedRolesForLane(transactionLane);
  const documentRoles = input.documents
    .filter(document => document.isRequired)
    .map(document => {
      const readinessRole = inferReadinessRole(transactionLane, document);
      const appliesToLane = documentAppliesToLane(transactionLane, document);
      return {
        templateId: Number(document.templateId),
        documentLabel: String(document.documentLabel || ''),
        documentCode: String(document.documentCode || ''),
        readinessRole,
        appliesToLane,
        blocksPayoutAutomation:
          typeof document.blocksPayout === 'boolean'
            ? appliesToLane && document.blocksPayout
            : appliesToLane && readinessRole !== 'supporting' && readinessRole !== 'submission',
      };
    });

  const configuredRoles = Array.from(
    new Set(
      documentRoles
        .filter(document => document.appliesToLane)
        .map(document => document.readinessRole)
        .filter(role => expectedRoles.includes(role)),
    ),
  );
  const missingRoles = expectedRoles.filter(role => !configuredRoles.includes(role));
  const wrongLaneWarnings = documentRoles
    .filter(document => !document.appliesToLane)
    .map(
      document =>
        `${document.documentLabel || document.documentCode} looks like a ${roleLabel(
          document.readinessRole,
        )} document for another transaction lane.`,
    );

  return {
    transactionLane,
    expectedRoles,
    configuredRoles,
    missingRoles,
    wrongLaneWarnings,
    documentRoles,
    automationAllowed: false,
    automationBlockedReason:
      'Readiness metadata is display-only until programme terms, document review rules, and payout triggers are explicitly configured.',
    transactionRuleModel: transactionRuleModelForLane(transactionLane),
  };
}
