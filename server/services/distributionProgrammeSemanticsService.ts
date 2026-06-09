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
  };
}
