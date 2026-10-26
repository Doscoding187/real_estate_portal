import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { AuthorizedDatabaseOperation } from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import { assertOwnedDisposableTarget } from '../lifecycle';
import { assessAuthorizedDatabaseReadiness } from '../readiness';
import type { ResolvedDatabaseAuthority } from '../types';
import {
  DISTRIBUTION_PREVIEW_DEMO_SLUG_PREFIX,
  DISTRIBUTION_PREVIEW_DEMO_SOURCE_ATTRIBUTION,
} from '../../../../shared/distributionPreviewDemo';
import { distributionReferralIntakePolicyConfigurationSchema } from '../../../../shared/distributionReferralIntake';
import {
  assertOperation,
  queryRows,
  requireAcceptedMigrationHead,
  requireExactAdapterTarget,
  rowValue,
  stableDigest,
  withTransaction,
  type AdapterEvidence,
} from './common';
import {
  assertDistributionReferrerPreviewUser,
  DISTRIBUTION_REFERRER_PREVIEW_EMAIL,
  DISTRIBUTION_REFERRER_PREVIEW_OPEN_ID,
  resolveDistributionReferrerPreviewPassword,
} from './distributionReferrerPreviewFixture';

export const DISTRIBUTION_REFERRER_ACTIVITY_PREVIEW_VERSION =
  'distribution-referrer-activity-preview-v6' as const;

const EXPECTED_MANAGER = Object.freeze({
  openId: 'distribution-referrer-activity-manager-v1',
  email: 'preview-sales-manager@listify.local',
  name: 'Preview Sales Manager',
  firstName: 'Preview',
  lastName: 'Manager',
  loginMethod: 'email',
  emailVerified: 1,
  role: 'visitor',
  onboardingComplete: 1,
  onboardingStep: 0,
});

const EXPECTED_MANAGER_IDENTITY = Object.freeze({
  identityType: 'manager',
  active: 1,
  displayName: EXPECTED_MANAGER.name,
});

const EXPECTED_DEVELOPMENT = Object.freeze({
  slug: 'distribution-preview-ridge-estate-v1',
  name: 'Preview Ridge Estate',
  developmentType: 'residential',
  city: 'Midrand',
  province: 'Gauteng',
  suburb: 'Waterfall',
});

const EXPECTED_PROGRAM = Object.freeze({
  isReferralEnabled: 1,
  isActive: 1,
  tierAccessPolicy: 'restricted',
  defaultCommissionAmount: 25000,
  currencyCode: 'ZAR',
});

const EXPECTED_DEAL = Object.freeze({
  buyerName: 'Preview Prospect',
  currentStage: 'viewing_scheduled',
  dealAmount: 2500000,
  commissionBaseAmount: 2500000,
  referrerCommissionType: 'percentage',
  referrerCommissionValue: '1.00',
  referrerCommissionBasis: 'sale_price',
  referrerCommissionAmount: 25000,
});

const EXPECTED_VIEWING = Object.freeze({
  status: 'scheduled',
  timezone: 'Africa/Johannesburg',
  locationName: 'Preview Ridge Estate Showhouse',
  leadDays: 14,
  durationHours: 1,
});

const EXPECTED_COMMISSION_ENTRY = Object.freeze({
  triggerStage: 'contract_signed',
  entryStatus: 'pending',
  calculationBaseAmount: 2500000,
  commissionPercent: '1.00',
  commissionAmount: 25000,
  currency: 'ZAR',
});

function deterministicUuid(label: string): string {
  const hex = stableDigest(label);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map(key => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function parseStoredJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

const EXPECTED_DEMO_PUBLISHER = Object.freeze({
  slug: `${DISTRIBUTION_PREVIEW_DEMO_SLUG_PREFIX}ridge-estate-brand-v2`,
  name: 'Preview Demo Developer (Sample)',
  authorityKind: 'platform_reference',
  publisherType: 'developer',
  sourceAttribution: DISTRIBUTION_PREVIEW_DEMO_SOURCE_ATTRIBUTION,
  isVisible: 1,
});

const EXPECTED_DEMO_DEVELOPMENT = Object.freeze({
  slug: `${DISTRIBUTION_PREVIEW_DEMO_SLUG_PREFIX}ridge-estate-v2`,
  name: 'Preview Demo Ridge Estate (Sample)',
  marketingName: 'Preview Demo Ridge Estate (Sample)',
  developmentType: 'residential',
  city: 'Midrand',
  province: 'Gauteng',
  suburb: 'Waterfall',
  transactionType: 'for_sale',
  isPublished: 1,
  approvalStatus: 'approved',
  status: 'selling',
  inventoryMode: 'itemized',
});

const EXPECTED_DEMO_UNIT_TYPES = Object.freeze([
  Object.freeze({
    id: deterministicUuid(`${DISTRIBUTION_PREVIEW_DEMO_SLUG_PREFIX}unit-2-bedroom-v2`),
    name: 'Sample 2-Bedroom Apartment',
    bedrooms: 2,
    bathrooms: '2.0',
    unitSize: 78,
    basePriceFrom: '1150000.00',
    availableUnits: 4,
    totalUnits: 6,
    displayOrder: 1,
    baseMedia: Object.freeze({
      gallery: Object.freeze([
        Object.freeze({
          id: 'demo-2-bedroom-gallery-1',
          url: '/placeholders/development_placeholder_1_1763712033438.png',
          isPrimary: true,
        }),
        Object.freeze({
          id: 'demo-2-bedroom-gallery-2',
          url: '/placeholders/development_placeholder_2_1763712057181.png',
          isPrimary: false,
        }),
      ]),
      floorPlans: Object.freeze([
        Object.freeze({
          id: 'demo-2-bedroom-plan-1',
          url: '/properties/f0xp6VWeaZSN.jpg',
          type: 'image',
          fileName: 'sample-2-bedroom-floor-plan.jpg',
        }),
      ]),
      renders: Object.freeze([
        Object.freeze({
          id: 'demo-2-bedroom-render-1',
          url: '/placeholders/development_placeholder_3_1763712078958.png',
          type: 'image',
        }),
      ]),
    }),
  }),
  Object.freeze({
    id: deterministicUuid(`${DISTRIBUTION_PREVIEW_DEMO_SLUG_PREFIX}unit-3-bedroom-v2`),
    name: 'Sample 3-Bedroom Apartment',
    bedrooms: 3,
    bathrooms: '2.0',
    unitSize: 105,
    basePriceFrom: '1650000.00',
    availableUnits: 2,
    totalUnits: 4,
    displayOrder: 2,
    baseMedia: Object.freeze({
      gallery: Object.freeze([
        Object.freeze({
          id: 'demo-3-bedroom-gallery-1',
          url: '/properties/35t5znQJ1v9V.jpg',
          isPrimary: true,
        }),
        Object.freeze({
          id: 'demo-3-bedroom-gallery-2',
          url: '/properties/40O7UI0lbxUn.jpg',
          isPrimary: false,
        }),
      ]),
      floorPlans: Object.freeze([
        Object.freeze({
          id: 'demo-3-bedroom-plan-1',
          url: '/properties/cb6IeI4pBCAG.jpg',
          type: 'image',
          fileName: 'sample-3-bedroom-floor-plan.jpg',
        }),
      ]),
      renders: Object.freeze([
        Object.freeze({
          id: 'demo-3-bedroom-render-1',
          url: '/placeholders/development_placeholder_4_1763712099609.png',
          type: 'image',
        }),
      ]),
    }),
  }),
]);

const EXPECTED_DEMO_PROGRAM = Object.freeze({
  isReferralEnabled: 1,
  isActive: 1,
  commissionModel: 'flat_percentage',
  defaultCommissionPercent: '2.50',
  referrerCommissionType: 'percentage',
  referrerCommissionValue: '2.50',
  referrerCommissionBasis: 'sale_price',
  tierAccessPolicy: 'open',
  payoutMilestone: 'transfer_registration',
  currencyCode: 'ZAR',
});

const EXPECTED_DEMO_PARTNERSHIP = Object.freeze({ status: 'active' });

const EXPECTED_DEMO_ACCESS = Object.freeze({
  status: 'included',
  submissionAllowed: 1,
  excludedByMandate: 0,
  excludedByExclusivity: 0,
});

const EXPECTED_DEMO_MANAGER_ASSIGNMENT = Object.freeze({
  isPrimary: 1,
  isActive: 1,
  workloadCapacity: 0,
  timezone: 'Africa/Johannesburg',
});

const EXPECTED_DEMO_REQUIRED_DOCUMENTS = Object.freeze([
  Object.freeze({
    category: 'client_required_document',
    documentCode: 'id_document',
    documentLabel: 'Sample buyer ID document',
    templateFileUrl: null,
    templateFileName: null,
    isRequired: 1,
    sortOrder: 1,
  }),
  Object.freeze({
    category: 'client_required_document',
    documentCode: 'proof_of_address',
    documentLabel: 'Sample proof of address',
    templateFileUrl: null,
    templateFileName: null,
    isRequired: 1,
    sortOrder: 2,
  }),
  Object.freeze({
    category: 'client_required_document',
    documentCode: 'custom',
    documentLabel: 'Sample client information sheet',
    templateFileUrl: '/properties/distribution-preview-information-sheet.pdf',
    templateFileName: 'distribution-preview-information-sheet.pdf',
    isRequired: 1,
    sortOrder: 3,
  }),
  Object.freeze({
    category: 'developer_document',
    documentCode: 'custom',
    documentLabel: 'Sample price list',
    templateFileUrl: '/properties/f0xp6VWeaZSN.jpg',
    templateFileName: 'sample-price-list.jpg',
    isRequired: 0,
    sortOrder: 4,
  }),
  Object.freeze({
    category: 'developer_document',
    documentCode: 'custom',
    documentLabel: 'Sample site plan',
    templateFileUrl: '/properties/cb6IeI4pBCAG.jpg',
    templateFileName: 'sample-site-plan.jpg',
    isRequired: 0,
    sortOrder: 5,
  }),
]);

const DEMO_POLICY_CONFIGURATION = Object.freeze({
  sharingPermissionDocument: {
    version: 'preview-demo-v3',
    title: 'Sample referral permission',
    content:
      'This synthetic preview permission records that the prospect agreed to share their details with the sample sales team for this demonstration referral.',
    downloadUrl: '/properties/distribution-preview-sharing-permission.pdf',
  },
  privacyNoticeDocument: {
    version: 'preview-demo-v3',
    title: 'Sample privacy notice',
    content:
      'This synthetic preview notice explains how a demonstration referral would treat prospect information; it is not a production privacy notice.',
    downloadUrl: '/properties/distribution-preview-privacy-notice.pdf',
  },
  sharingPurpose: 'Sample referral introduction for local preview review.',
  namedRecipients: [
    {
      name: 'Preview Sales Manager',
      organization: 'Preview Demo Developer (Sample)',
      role: 'Sales manager',
    },
  ],
  signatureMethod: 'Electronic acceptance during the preview intake session.',
  identityEvidence: {
    acceptedEvidenceTypes: ['South African ID document', 'Passport'],
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxFileBytes: 5242880,
    verificationInstructions:
      'Upload a clear copy of the identity document for this preview review.',
    authorizedRoles: ['Sales manager'],
  },
  retention: {
    abandonedIntake: { days: 30, startsFrom: 'draft_created' },
    sharingPermission: { days: 365, startsFrom: 'evidence_captured' },
    identityEvidence: { days: 365, startsFrom: 'evidence_captured' },
    activeReferral: { days: 365, startsFrom: 'referral_submitted' },
    withdrawnReferral: { days: 365, startsFrom: 'referral_withdrawn' },
    closedReferral: { days: 2555, startsFrom: 'referral_closed' },
  },
  workflowSteps: [
    {
      key: 'preview-introduction',
      title: 'Preview introduction review',
      partnerInstructions:
        'Confirm prospect consent and upload the required documents for this preview referral.',
      ownerRole: 'Sales manager',
      isBlocking: true,
    },
  ],
  creditReport: {
    enabled: false,
    providerName: null,
    providerApprovalReference: null,
    authorizationDocument: null,
  },
});

const EXPECTED_DEMO_POLICY = Object.freeze({
  policyVersion: 2,
  status: 'active',
  approvalReference: 'PREVIEW-DEMO-INTAKE-POLICY-V2',
});

const DEMO_POLICY_CONFIGURATION_DIGEST = createHash('sha256')
  .update(canonicalJson(DEMO_POLICY_CONFIGURATION), 'utf8')
  .digest('hex');

const FIXTURE_PAYLOAD = Object.freeze({
  version: DISTRIBUTION_REFERRER_ACTIVITY_PREVIEW_VERSION,
  scope: 'referrer-dashboard-sample-activity-only',
  dependency: {
    openId: DISTRIBUTION_REFERRER_PREVIEW_OPEN_ID,
    email: DISTRIBUTION_REFERRER_PREVIEW_EMAIL,
  },
  manager: EXPECTED_MANAGER,
  managerIdentity: EXPECTED_MANAGER_IDENTITY,
  development: EXPECTED_DEVELOPMENT,
  program: EXPECTED_PROGRAM,
  deal: EXPECTED_DEAL,
  viewing: EXPECTED_VIEWING,
  commissionEntry: EXPECTED_COMMISSION_ENTRY,
  demo: {
    publisher: EXPECTED_DEMO_PUBLISHER,
    development: EXPECTED_DEMO_DEVELOPMENT,
    unitTypes: EXPECTED_DEMO_UNIT_TYPES,
    program: EXPECTED_DEMO_PROGRAM,
    partnership: EXPECTED_DEMO_PARTNERSHIP,
    access: EXPECTED_DEMO_ACCESS,
    managerAssignment: EXPECTED_DEMO_MANAGER_ASSIGNMENT,
    requiredDocuments: EXPECTED_DEMO_REQUIRED_DOCUMENTS,
    intakePolicy: {
      ...EXPECTED_DEMO_POLICY,
      configurationDigest: DEMO_POLICY_CONFIGURATION_DIGEST,
    },
  },
});

export const DISTRIBUTION_REFERRER_ACTIVITY_PREVIEW_DIGEST = stableDigest(FIXTURE_PAYLOAD);

type Row = Record<string, unknown>;
type PreparedState = 'created' | 'reused';
type ViewingState = PreparedState | 'rescheduled';

export type DistributionReferrerActivityPreviewEvidence = AdapterEvidence & {
  fixture: typeof DISTRIBUTION_REFERRER_ACTIVITY_PREVIEW_VERSION;
  account: { userId: number; email: typeof DISTRIBUTION_REFERRER_PREVIEW_EMAIL };
  managerAccount: { userId: number; email: typeof EXPECTED_MANAGER.email };
  prepared: {
    manager: PreparedState;
    managerIdentity: PreparedState;
    development: PreparedState;
    program: PreparedState;
    deal: PreparedState;
    viewing: ViewingState;
    commissionEntry: PreparedState;
    demoPublisher: PreparedState;
    demoDevelopment: PreparedState;
    demoUnitTypes: PreparedState;
    demoProgram: PreparedState;
    demoPartnership: PreparedState;
    demoAccess: PreparedState;
    demoManagerAssignment: PreparedState;
    demoRequiredDocuments: PreparedState;
    demoIntakePolicy: PreparedState;
  };
  sample: {
    developmentId: number;
    programId: number;
    dealId: number;
    viewingId: number;
    commissionEntryId: number;
    viewingScheduledStartAt: string;
    demoPublisherId: number;
    demoDevelopmentId: number;
    demoProgramId: number;
    demoUnitTypeIds: string[];
    demoIntakePolicyReleaseId: number;
  };
  verified: {
    migrationHead: string;
    schemaCongruent: true;
    referrerAccount: true;
    managerAccountLogin: true;
    activeManagerIdentity: true;
    sampleDevelopmentUnpublished: true;
    restrictedReferralProgram: true;
    sampleDeal: true;
    upcomingViewingScheduled: true;
    potentialPayoutPending: true;
    noProgramGrant: true;
    noLedgerOrValidation: true;
    demoOpportunityPublished: true;
    demoInventoryGoverned: true;
    demoProgramReady: true;
    demoNetworkAccessIncluded: true;
    demoPrimaryManagerAssigned: true;
    demoIntakePolicyActive: true;
  };
};

function comparable(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function requireExact(value: unknown, expected: unknown, label: string): void {
  if (comparable(value) !== comparable(expected)) {
    throw new Error(`Distribution referrer activity preview fixture conflicts at ${label}.`);
  }
}

function requireOneOrNone(rows: Row[], label: string): Row | null {
  if (rows.length > 1) {
    throw new Error(`Distribution referrer activity preview fixture has duplicate ${label} rows.`);
  }
  return rows[0] ?? null;
}

function asPositiveId(value: unknown, label: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`Distribution referrer activity preview fixture has an invalid ${label}.`);
  }
  return id;
}

function mysqlTimestamp(value: Date): string {
  return value.toISOString().slice(0, 19).replace('T', ' ');
}

function scheduledStartInfo(value: unknown): { text: string; ms: number } {
  if (value instanceof Date) {
    return { text: value.toISOString(), ms: value.getTime() };
  }
  const text = String(value ?? '').trim();
  if (!text) return { text: '', ms: Number.NaN };
  const normalized = text.includes('T') ? text : `${text.replace(' ', 'T')}Z`;
  return { text, ms: Date.parse(normalized) };
}

function viewingWindow(now = new Date()): { start: string; end: string } {
  const start = new Date(now.getTime() + EXPECTED_VIEWING.leadDays * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + EXPECTED_VIEWING.durationHours * 60 * 60 * 1000);
  return { start: mysqlTimestamp(start), end: mysqlTimestamp(end) };
}

export function assertDistributionReferrerActivityPreviewTarget(
  authority: ResolvedDatabaseAuthority,
): void {
  assertOwnedDisposableTarget(authority);
  const { context } = authority;
  if (
    context.targetClass !== 'disposable-worktree' ||
    context.host !== '127.0.0.1' ||
    context.port !== '3307' ||
    context.databaseName !== context.worktree.expectedDatabase ||
    !context.worktree.ownershipMatches
  ) {
    throw new Error(
      'Distribution referrer activity preview fixture refused: an exact owned localhost disposable worktree database is required.',
    );
  }
}

export function assertDistributionReferrerActivityDependency(row: Row | null): void {
  if (!row) {
    throw new Error(
      'Distribution referrer activity preview fixture refused: run db:distribution-referrer-preview:prepare first.',
    );
  }
  assertDistributionReferrerPreviewUser(row);
}

export function assertDistributionReferrerActivityManager(row: Row): void {
  requireExact(rowValue(row, 'openId'), EXPECTED_MANAGER.openId, 'manager openId');
  requireExact(rowValue(row, 'email'), EXPECTED_MANAGER.email, 'manager email');
  requireExact(rowValue(row, 'name'), EXPECTED_MANAGER.name, 'manager name');
  requireExact(rowValue(row, 'firstName'), EXPECTED_MANAGER.firstName, 'manager firstName');
  requireExact(rowValue(row, 'lastName'), EXPECTED_MANAGER.lastName, 'manager lastName');
  requireExact(rowValue(row, 'loginMethod'), EXPECTED_MANAGER.loginMethod, 'manager login method');
  requireExact(rowValue(row, 'emailVerified'), EXPECTED_MANAGER.emailVerified, 'manager email verification');
  requireExact(rowValue(row, 'role'), EXPECTED_MANAGER.role, 'manager role');
  requireExact(
    rowValue(row, 'onboarding_complete'),
    EXPECTED_MANAGER.onboardingComplete,
    'manager onboarding state',
  );
  requireExact(
    rowValue(row, 'onboarding_step'),
    EXPECTED_MANAGER.onboardingStep,
    'manager onboarding step',
  );
}

export function classifyDistributionReferrerActivityManager(row: Row | null): {
  state: PreparedState;
} {
  if (!row) return { state: 'created' };
  assertDistributionReferrerActivityManager(row);
  return { state: 'reused' };
}

export function assertDistributionReferrerActivityDevelopment(row: Row): void {
  requireExact(rowValue(row, 'slug'), EXPECTED_DEVELOPMENT.slug, 'development slug');
  requireExact(rowValue(row, 'name'), EXPECTED_DEVELOPMENT.name, 'development name');
  requireExact(
    rowValue(row, 'developmentType'),
    EXPECTED_DEVELOPMENT.developmentType,
    'development type',
  );
  requireExact(rowValue(row, 'city'), EXPECTED_DEVELOPMENT.city, 'development city');
  requireExact(rowValue(row, 'province'), EXPECTED_DEVELOPMENT.province, 'development province');
  requireExact(rowValue(row, 'suburb'), EXPECTED_DEVELOPMENT.suburb, 'development suburb');
  requireExact(rowValue(row, 'isPublished'), 0, 'development publication state');
  requireExact(rowValue(row, 'approval_status'), 'draft', 'development approval status');
}

export function classifyDistributionReferrerActivityDevelopment(row: Row | null): {
  state: PreparedState;
} {
  if (!row) return { state: 'created' };
  assertDistributionReferrerActivityDevelopment(row);
  return { state: 'reused' };
}

export function assertDistributionReferrerActivityProgram(row: Row, developmentId: number): void {
  requireExact(rowValue(row, 'development_id'), developmentId, 'program development ID');
  requireExact(
    rowValue(row, 'is_referral_enabled'),
    EXPECTED_PROGRAM.isReferralEnabled,
    'program referral state',
  );
  requireExact(rowValue(row, 'is_active'), EXPECTED_PROGRAM.isActive, 'program active state');
  requireExact(
    rowValue(row, 'tier_access_policy'),
    EXPECTED_PROGRAM.tierAccessPolicy,
    'program tier access policy',
  );
  requireExact(
    rowValue(row, 'default_commission_amount'),
    EXPECTED_PROGRAM.defaultCommissionAmount,
    'program default commission amount',
  );
  requireExact(rowValue(row, 'currency_code'), EXPECTED_PROGRAM.currencyCode, 'program currency');
}

export function classifyDistributionReferrerActivityProgram(
  row: Row | null,
  developmentId: number,
): { state: PreparedState } {
  if (!row) return { state: 'created' };
  assertDistributionReferrerActivityProgram(row, developmentId);
  return { state: 'reused' };
}

export function assertDistributionReferrerActivityDeal(
  row: Row,
  expected: {
    programId: number;
    developmentId: number;
    agentId: number;
    managerId: number;
  },
): void {
  requireExact(rowValue(row, 'program_id'), expected.programId, 'deal program ID');
  requireExact(rowValue(row, 'development_id'), expected.developmentId, 'deal development ID');
  requireExact(rowValue(row, 'agent_id'), expected.agentId, 'deal agent ID');
  requireExact(rowValue(row, 'manager_user_id'), expected.managerId, 'deal manager ID');
  requireExact(rowValue(row, 'buyer_name'), EXPECTED_DEAL.buyerName, 'deal buyer name');
  requireExact(rowValue(row, 'current_stage'), EXPECTED_DEAL.currentStage, 'deal stage');
  requireExact(rowValue(row, 'deal_amount'), EXPECTED_DEAL.dealAmount, 'deal amount');
  requireExact(
    rowValue(row, 'commission_base_amount'),
    EXPECTED_DEAL.commissionBaseAmount,
    'deal commission base amount',
  );
  requireExact(
    rowValue(row, 'referrer_commission_type'),
    EXPECTED_DEAL.referrerCommissionType,
    'deal referral commission type',
  );
  requireExact(
    rowValue(row, 'referrer_commission_value'),
    EXPECTED_DEAL.referrerCommissionValue,
    'deal referral commission value',
  );
  requireExact(
    rowValue(row, 'referrer_commission_basis'),
    EXPECTED_DEAL.referrerCommissionBasis,
    'deal referral commission basis',
  );
  requireExact(
    rowValue(row, 'referrer_commission_amount'),
    EXPECTED_DEAL.referrerCommissionAmount,
    'deal referral commission amount',
  );
}

export function classifyDistributionReferrerActivityDeal(
  row: Row | null,
  expected: {
    programId: number;
    developmentId: number;
    agentId: number;
    managerId: number;
  },
): { state: PreparedState } {
  if (!row) return { state: 'created' };
  assertDistributionReferrerActivityDeal(row, expected);
  return { state: 'reused' };
}

export function assertDistributionReferrerActivityViewing(
  row: Row,
  expected: {
    dealId: number;
    programId: number;
    developmentId: number;
    agentId: number;
    managerId: number;
  },
): void {
  requireExact(rowValue(row, 'deal_id'), expected.dealId, 'viewing deal ID');
  requireExact(rowValue(row, 'program_id'), expected.programId, 'viewing program ID');
  requireExact(rowValue(row, 'development_id'), expected.developmentId, 'viewing development ID');
  requireExact(rowValue(row, 'agent_id'), expected.agentId, 'viewing agent ID');
  requireExact(rowValue(row, 'manager_user_id'), expected.managerId, 'viewing manager ID');
  requireExact(rowValue(row, 'timezone'), EXPECTED_VIEWING.timezone, 'viewing timezone');
  requireExact(rowValue(row, 'location_name'), EXPECTED_VIEWING.locationName, 'viewing location');
  requireExact(rowValue(row, 'status'), EXPECTED_VIEWING.status, 'viewing status');
}

export function assertDistributionReferrerActivityCommissionEntry(
  row: Row,
  expected: { dealId: number; programId: number; developmentId: number; agentId: number },
): void {
  requireExact(rowValue(row, 'deal_id'), expected.dealId, 'commission entry deal ID');
  requireExact(rowValue(row, 'program_id'), expected.programId, 'commission entry program ID');
  requireExact(
    rowValue(row, 'development_id'),
    expected.developmentId,
    'commission entry development ID',
  );
  requireExact(rowValue(row, 'agent_id'), expected.agentId, 'commission entry agent ID');
  requireExact(
    rowValue(row, 'trigger_stage'),
    EXPECTED_COMMISSION_ENTRY.triggerStage,
    'commission entry trigger stage',
  );
  requireExact(
    rowValue(row, 'entry_status'),
    EXPECTED_COMMISSION_ENTRY.entryStatus,
    'commission entry status',
  );
  requireExact(
    rowValue(row, 'calculation_base_amount'),
    EXPECTED_COMMISSION_ENTRY.calculationBaseAmount,
    'commission entry calculation base',
  );
  requireExact(
    rowValue(row, 'commission_percent'),
    EXPECTED_COMMISSION_ENTRY.commissionPercent,
    'commission entry percent',
  );
  requireExact(
    rowValue(row, 'commission_amount'),
    EXPECTED_COMMISSION_ENTRY.commissionAmount,
    'commission entry amount',
  );
  requireExact(
    rowValue(row, 'currency'),
    EXPECTED_COMMISSION_ENTRY.currency,
    'commission currency',
  );
}

export function assertDistributionReferrerActivityDemoPublisher(row: Row): void {
  requireExact(rowValue(row, 'slug'), EXPECTED_DEMO_PUBLISHER.slug, 'demo publisher slug');
  requireExact(rowValue(row, 'name'), EXPECTED_DEMO_PUBLISHER.name, 'demo publisher name');
  requireExact(
    rowValue(row, 'authority_kind'),
    EXPECTED_DEMO_PUBLISHER.authorityKind,
    'demo publisher authority kind',
  );
  requireExact(
    rowValue(row, 'publisher_type'),
    EXPECTED_DEMO_PUBLISHER.publisherType,
    'demo publisher type',
  );
  requireExact(
    rowValue(row, 'source_attribution'),
    EXPECTED_DEMO_PUBLISHER.sourceAttribution,
    'demo publisher source attribution',
  );
  requireExact(
    rowValue(row, 'is_visible'),
    EXPECTED_DEMO_PUBLISHER.isVisible,
    'demo publisher visibility',
  );
}

export function classifyDistributionReferrerActivityDemoPublisher(row: Row | null): {
  state: PreparedState;
} {
  if (!row) return { state: 'created' };
  assertDistributionReferrerActivityDemoPublisher(row);
  return { state: 'reused' };
}

export function assertDistributionReferrerActivityDemoDevelopment(
  row: Row,
  publisherId: number,
): void {
  requireExact(rowValue(row, 'slug'), EXPECTED_DEMO_DEVELOPMENT.slug, 'demo development slug');
  requireExact(rowValue(row, 'name'), EXPECTED_DEMO_DEVELOPMENT.name, 'demo development name');
  requireExact(
    rowValue(row, 'marketing_name'),
    EXPECTED_DEMO_DEVELOPMENT.marketingName,
    'demo development marketing name',
  );
  requireExact(
    rowValue(row, 'developmentType'),
    EXPECTED_DEMO_DEVELOPMENT.developmentType,
    'demo development type',
  );
  requireExact(rowValue(row, 'city'), EXPECTED_DEMO_DEVELOPMENT.city, 'demo development city');
  requireExact(
    rowValue(row, 'province'),
    EXPECTED_DEMO_DEVELOPMENT.province,
    'demo development province',
  );
  requireExact(
    rowValue(row, 'suburb'),
    EXPECTED_DEMO_DEVELOPMENT.suburb,
    'demo development suburb',
  );
  requireExact(
    rowValue(row, 'transaction_type'),
    EXPECTED_DEMO_DEVELOPMENT.transactionType,
    'demo development transaction type',
  );
  requireExact(
    rowValue(row, 'isPublished'),
    EXPECTED_DEMO_DEVELOPMENT.isPublished,
    'demo development publication state',
  );
  requireExact(
    rowValue(row, 'approval_status'),
    EXPECTED_DEMO_DEVELOPMENT.approvalStatus,
    'demo development approval status',
  );
  requireExact(
    rowValue(row, 'status'),
    EXPECTED_DEMO_DEVELOPMENT.status,
    'demo development status',
  );
  requireExact(
    rowValue(row, 'inventory_mode'),
    EXPECTED_DEMO_DEVELOPMENT.inventoryMode,
    'demo development inventory mode',
  );
  requireExact(
    rowValue(row, 'catalogue_publisher_id'),
    publisherId,
    'demo development publisher ID',
  );
  if (!rowValue(row, 'publishedAt')) {
    throw new Error(
      'Distribution referrer activity preview fixture demo development is unpublished.',
    );
  }
}

export function classifyDistributionReferrerActivityDemoDevelopment(
  row: Row | null,
  publisherId: number,
): { state: PreparedState } {
  if (!row) return { state: 'created' };
  assertDistributionReferrerActivityDemoDevelopment(row, publisherId);
  return { state: 'reused' };
}

function assertDemoUnitTypeScalarFields(
  row: Row,
  expected: (typeof EXPECTED_DEMO_UNIT_TYPES)[number],
): void {
  requireExact(rowValue(row, 'id'), expected.id, 'demo unit type ID');
  requireExact(rowValue(row, 'bedrooms'), expected.bedrooms, 'demo unit type bedrooms');
  requireExact(rowValue(row, 'bathrooms'), expected.bathrooms, 'demo unit type bathrooms');
  requireExact(rowValue(row, 'unit_size'), expected.unitSize, 'demo unit type size');
  requireExact(
    rowValue(row, 'base_price_from'),
    expected.basePriceFrom,
    'demo unit type base price',
  );
  requireExact(
    rowValue(row, 'available_units'),
    expected.availableUnits,
    'demo unit type available units',
  );
  requireExact(rowValue(row, 'total_units'), expected.totalUnits, 'demo unit type total units');
  requireExact(rowValue(row, 'display_order'), expected.displayOrder, 'demo unit type order');
  requireExact(rowValue(row, 'is_active'), 1, 'demo unit type active state');
}

export function assertDistributionReferrerActivityDemoUnitTypes(rows: Row[]): void {
  if (rows.length !== EXPECTED_DEMO_UNIT_TYPES.length) {
    throw new Error(
      'Distribution referrer activity preview fixture demo unit types do not match the governed set.',
    );
  }
  for (const expected of EXPECTED_DEMO_UNIT_TYPES) {
    const row = rows.find(candidate => comparable(rowValue(candidate, 'name')) === expected.name);
    if (!row) {
      throw new Error(
        `Distribution referrer activity preview fixture is missing demo unit type ${expected.name}.`,
      );
    }
    assertDemoUnitTypeScalarFields(row, expected);
    requireExact(
      canonicalJson(parseStoredJson(rowValue(row, 'base_media'))),
      canonicalJson(expected.baseMedia),
      'demo unit type media',
    );
  }
}

export function assertDistributionReferrerActivityDemoProgram(
  row: Row,
  developmentId: number,
): void {
  requireExact(rowValue(row, 'development_id'), developmentId, 'demo program development ID');
  requireExact(
    rowValue(row, 'is_referral_enabled'),
    EXPECTED_DEMO_PROGRAM.isReferralEnabled,
    'demo program referral state',
  );
  requireExact(
    rowValue(row, 'is_active'),
    EXPECTED_DEMO_PROGRAM.isActive,
    'demo program active state',
  );
  requireExact(
    rowValue(row, 'commission_model'),
    EXPECTED_DEMO_PROGRAM.commissionModel,
    'demo program commission model',
  );
  requireExact(
    rowValue(row, 'default_commission_percent'),
    EXPECTED_DEMO_PROGRAM.defaultCommissionPercent,
    'demo program default commission percent',
  );
  requireExact(
    rowValue(row, 'referrer_commission_type'),
    EXPECTED_DEMO_PROGRAM.referrerCommissionType,
    'demo program referrer commission type',
  );
  requireExact(
    rowValue(row, 'referrer_commission_value'),
    EXPECTED_DEMO_PROGRAM.referrerCommissionValue,
    'demo program referrer commission value',
  );
  requireExact(
    rowValue(row, 'referrer_commission_basis'),
    EXPECTED_DEMO_PROGRAM.referrerCommissionBasis,
    'demo program referrer commission basis',
  );
  requireExact(
    rowValue(row, 'tier_access_policy'),
    EXPECTED_DEMO_PROGRAM.tierAccessPolicy,
    'demo program tier access policy',
  );
  requireExact(
    rowValue(row, 'payout_milestone'),
    EXPECTED_DEMO_PROGRAM.payoutMilestone,
    'demo program payout milestone',
  );
  requireExact(
    rowValue(row, 'currency_code'),
    EXPECTED_DEMO_PROGRAM.currencyCode,
    'demo program currency',
  );
}

export function classifyDistributionReferrerActivityDemoProgram(
  row: Row | null,
  developmentId: number,
): { state: PreparedState } {
  if (!row) return { state: 'created' };
  assertDistributionReferrerActivityDemoProgram(row, developmentId);
  return { state: 'reused' };
}

export function assertDistributionReferrerActivityDemoPartnership(
  row: Row,
  publisherId: number,
): void {
  requireExact(
    rowValue(row, 'catalogue_publisher_id'),
    publisherId,
    'demo partnership publisher ID',
  );
  requireExact(
    rowValue(row, 'status'),
    EXPECTED_DEMO_PARTNERSHIP.status,
    'demo partnership status',
  );
}

export function classifyDistributionReferrerActivityDemoPartnership(
  row: Row | null,
  publisherId: number,
): { state: PreparedState } {
  if (!row) return { state: 'created' };
  assertDistributionReferrerActivityDemoPartnership(row, publisherId);
  return { state: 'reused' };
}

export function assertDistributionReferrerActivityDemoAccess(
  row: Row,
  expected: { developmentId: number; brandPartnershipId: number; publisherId: number },
): void {
  requireExact(
    rowValue(row, 'development_id'),
    expected.developmentId,
    'demo access development ID',
  );
  requireExact(
    rowValue(row, 'brand_partnership_id'),
    expected.brandPartnershipId,
    'demo access partnership ID',
  );
  requireExact(
    rowValue(row, 'catalogue_publisher_id'),
    expected.publisherId,
    'demo access publisher ID',
  );
  requireExact(rowValue(row, 'status'), EXPECTED_DEMO_ACCESS.status, 'demo access status');
  requireExact(
    rowValue(row, 'submission_allowed'),
    EXPECTED_DEMO_ACCESS.submissionAllowed,
    'demo access submission allowed',
  );
  requireExact(
    rowValue(row, 'excluded_by_mandate'),
    EXPECTED_DEMO_ACCESS.excludedByMandate,
    'demo access mandate exclusion',
  );
  requireExact(
    rowValue(row, 'excluded_by_exclusivity'),
    EXPECTED_DEMO_ACCESS.excludedByExclusivity,
    'demo access exclusivity exclusion',
  );
}

export function classifyDistributionReferrerActivityDemoAccess(
  row: Row | null,
  expected: { developmentId: number; brandPartnershipId: number; publisherId: number },
): { state: PreparedState } {
  if (!row) return { state: 'created' };
  assertDistributionReferrerActivityDemoAccess(row, expected);
  return { state: 'reused' };
}

export function assertDistributionReferrerActivityDemoManagerAssignment(
  row: Row,
  expected: { developmentId: number; managerUserId: number },
): void {
  requireExact(
    rowValue(row, 'development_id'),
    expected.developmentId,
    'demo manager assignment development ID',
  );
  requireExact(
    rowValue(row, 'manager_user_id'),
    expected.managerUserId,
    'demo manager assignment manager ID',
  );
  requireExact(
    rowValue(row, 'is_primary'),
    EXPECTED_DEMO_MANAGER_ASSIGNMENT.isPrimary,
    'demo manager assignment primary state',
  );
  requireExact(
    rowValue(row, 'is_active'),
    EXPECTED_DEMO_MANAGER_ASSIGNMENT.isActive,
    'demo manager assignment active state',
  );
  requireExact(
    rowValue(row, 'workload_capacity'),
    EXPECTED_DEMO_MANAGER_ASSIGNMENT.workloadCapacity,
    'demo manager assignment workload',
  );
  requireExact(
    rowValue(row, 'timezone'),
    EXPECTED_DEMO_MANAGER_ASSIGNMENT.timezone,
    'demo manager assignment timezone',
  );
}

export function classifyDistributionReferrerActivityDemoManagerAssignment(
  row: Row | null,
  expected: { developmentId: number; managerUserId: number },
): { state: PreparedState } {
  if (!row) return { state: 'created' };
  assertDistributionReferrerActivityDemoManagerAssignment(row, expected);
  return { state: 'reused' };
}

export function assertDistributionReferrerActivityDemoRequiredDocuments(rows: Row[]): void {
  for (const expected of EXPECTED_DEMO_REQUIRED_DOCUMENTS) {
    const matches = rows.filter(
      row =>
        comparable(rowValue(row, 'category')) === expected.category &&
        comparable(rowValue(row, 'document_code')) === expected.documentCode &&
        comparable(rowValue(row, 'document_label')) === expected.documentLabel,
    );
    if (matches.length !== 1) {
      throw new Error(
        `Distribution referrer activity preview fixture requires exactly one demo document ${expected.category}:${expected.documentLabel}.`,
      );
    }
    const row = matches[0];
    requireExact(rowValue(row, 'sort_order'), expected.sortOrder, 'demo document order');
    requireExact(rowValue(row, 'is_required'), expected.isRequired, 'demo document required state');
    requireExact(rowValue(row, 'is_active'), 1, 'demo document active state');
    requireExact(
      rowValue(row, 'template_file_url'),
      expected.templateFileUrl,
      'demo document template URL',
    );
    requireExact(
      rowValue(row, 'template_file_name'),
      expected.templateFileName,
      'demo document template file name',
    );
  }
  if (rows.length !== EXPECTED_DEMO_REQUIRED_DOCUMENTS.length) {
    throw new Error(
      'Distribution referrer activity preview fixture demo required documents do not match the governed set.',
    );
  }
}

export function assertDistributionReferrerActivityDemoIntakePolicy(
  row: Row,
  programId: number,
): void {
  requireExact(rowValue(row, 'program_id'), programId, 'demo intake policy program ID');
  requireExact(
    rowValue(row, 'policy_version'),
    EXPECTED_DEMO_POLICY.policyVersion,
    'demo intake policy version',
  );
  requireExact(rowValue(row, 'status'), EXPECTED_DEMO_POLICY.status, 'demo intake policy status');
  requireExact(
    rowValue(row, 'approval_reference'),
    EXPECTED_DEMO_POLICY.approvalReference,
    'demo intake policy approval reference',
  );
  requireExact(
    rowValue(row, 'configuration_digest'),
    DEMO_POLICY_CONFIGURATION_DIGEST,
    'demo intake policy configuration digest',
  );
  const rawConfiguration = rowValue(row, 'configuration');
  let parsed: unknown = rawConfiguration;
  if (typeof rawConfiguration === 'string') {
    try {
      parsed = JSON.parse(rawConfiguration);
    } catch {
      throw new Error(
        'Distribution referrer activity preview fixture demo intake policy configuration is not valid JSON.',
      );
    }
  }
  const result = distributionReferralIntakePolicyConfigurationSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      'Distribution referrer activity preview fixture demo intake policy configuration fails the canonical policy schema.',
    );
  }
  requireExact(
    canonicalJson(result.data),
    canonicalJson(DEMO_POLICY_CONFIGURATION),
    'demo intake policy configuration',
  );
}

export function classifyDistributionReferrerActivityDemoIntakePolicy(
  row: Row | null,
  programId: number,
): { state: PreparedState } {
  if (!row) return { state: 'created' };
  assertDistributionReferrerActivityDemoIntakePolicy(row, programId);
  return { state: 'reused' };
}

async function findReferrerUser(connection: AuthoritySqlConnection): Promise<Row | null> {
  const rows = await queryRows(
    connection,
    `SELECT id, openId, email, passwordHash, name, firstName, lastName, phone,
            loginMethod, emailVerified, role, agencyId, isSubaccount,
            onboarding_complete, onboarding_step
       FROM users
      WHERE email = ? OR openId = ?
      ORDER BY id`,
    [DISTRIBUTION_REFERRER_PREVIEW_EMAIL, DISTRIBUTION_REFERRER_PREVIEW_OPEN_ID],
  );
  return requireOneOrNone(rows, 'individual referrer user');
}

async function findManagerUser(connection: AuthoritySqlConnection): Promise<Row | null> {
  const rows = await queryRows(
    connection,
    `SELECT id, openId, email, passwordHash, name, firstName, lastName, loginMethod,
            emailVerified, role, onboarding_complete, onboarding_step
       FROM users
      WHERE email = ? OR openId = ?
      ORDER BY id`,
    [EXPECTED_MANAGER.email, EXPECTED_MANAGER.openId],
  );
  return requireOneOrNone(rows, 'sample manager user');
}

async function findManagerIdentity(
  connection: AuthoritySqlConnection,
  userId: number,
): Promise<Row | null> {
  const rows = await queryRows(
    connection,
    `SELECT id, user_id, identity_type, active, display_name
       FROM distribution_identities
      WHERE user_id = ? AND identity_type = ?
      ORDER BY id`,
    [userId, EXPECTED_MANAGER_IDENTITY.identityType],
  );
  return requireOneOrNone(rows, 'sample manager identity');
}

export function assertDistributionReferrerActivityManagerIdentity(
  row: Row,
  expectedUserId: number,
): void {
  requireExact(rowValue(row, 'user_id'), expectedUserId, 'manager identity user ID');
  requireExact(
    rowValue(row, 'identity_type'),
    EXPECTED_MANAGER_IDENTITY.identityType,
    'manager identity type',
  );
  requireExact(rowValue(row, 'active'), EXPECTED_MANAGER_IDENTITY.active, 'manager identity active state');
  requireExact(
    rowValue(row, 'display_name'),
    EXPECTED_MANAGER_IDENTITY.displayName,
    'manager identity display name',
  );
}

export function classifyDistributionReferrerActivityManagerIdentity(
  row: Row | null,
  userId: number,
): { state: PreparedState } {
  if (!row) return { state: 'created' };
  assertDistributionReferrerActivityManagerIdentity(row, userId);
  return { state: 'reused' };
}

async function findDevelopment(connection: AuthoritySqlConnection): Promise<Row | null> {
  const rows = await queryRows(
    connection,
    `SELECT id, name, slug, developmentType, city, province, suburb, isPublished, approval_status
       FROM developments
      WHERE slug = ?
      ORDER BY id`,
    [EXPECTED_DEVELOPMENT.slug],
  );
  return requireOneOrNone(rows, 'sample development');
}

async function findProgram(
  connection: AuthoritySqlConnection,
  developmentId: number,
): Promise<Row | null> {
  const rows = await queryRows(
    connection,
    `SELECT id, development_id, is_referral_enabled, is_active, tier_access_policy,
            default_commission_amount, currency_code
       FROM distribution_programs
      WHERE development_id = ?
      ORDER BY id`,
    [developmentId],
  );
  return requireOneOrNone(rows, 'sample distribution program');
}

async function findDeal(
  connection: AuthoritySqlConnection,
  agentId: number,
  developmentId: number,
): Promise<Row | null> {
  const rows = await queryRows(
    connection,
    `SELECT id, program_id, development_id, agent_id, manager_user_id, buyer_name,
            current_stage, deal_amount, commission_base_amount, referrer_commission_type,
            referrer_commission_value, referrer_commission_basis, referrer_commission_amount,
            commission_status
       FROM distribution_deals
      WHERE agent_id = ? AND development_id = ? AND buyer_name = ?
      ORDER BY id`,
    [agentId, developmentId, EXPECTED_DEAL.buyerName],
  );
  return requireOneOrNone(rows, 'sample distribution deal');
}

async function findViewing(
  connection: AuthoritySqlConnection,
  dealId: number,
): Promise<Row | null> {
  const rows = await queryRows(
    connection,
    `SELECT id, deal_id, program_id, development_id, agent_id, manager_user_id,
            scheduled_start_at, scheduled_end_at, timezone, location_name, status, reschedule_count
       FROM distribution_viewings
      WHERE deal_id = ?
      ORDER BY id`,
    [dealId],
  );
  return requireOneOrNone(rows, 'sample distribution viewing');
}

async function findCommissionEntry(
  connection: AuthoritySqlConnection,
  dealId: number,
): Promise<Row | null> {
  const rows = await queryRows(
    connection,
    `SELECT id, deal_id, program_id, development_id, agent_id, trigger_stage, entry_status,
            calculation_base_amount, commission_percent, commission_amount, currency
       FROM distribution_commission_entries
      WHERE deal_id = ? AND trigger_stage = ?
      ORDER BY id`,
    [dealId, EXPECTED_COMMISSION_ENTRY.triggerStage],
  );
  return requireOneOrNone(rows, 'sample commission entry');
}

async function findDemoPublisher(connection: AuthoritySqlConnection): Promise<Row | null> {
  const rows = await queryRows(
    connection,
    `SELECT id, authority_kind, publisher_type, name, slug, source_attribution, is_visible
       FROM catalogue_publishers
      WHERE slug = ?
      ORDER BY id`,
    [EXPECTED_DEMO_PUBLISHER.slug],
  );
  return requireOneOrNone(rows, 'demo catalogue publisher');
}

async function findDemoDevelopment(connection: AuthoritySqlConnection): Promise<Row | null> {
  const rows = await queryRows(
    connection,
    `SELECT id, catalogue_publisher_id, name, marketing_name, slug, developmentType, city,
            province, suburb, transaction_type, isPublished, publishedAt, approval_status,
            status, inventory_mode
       FROM developments
      WHERE slug = ?
      ORDER BY id`,
    [EXPECTED_DEMO_DEVELOPMENT.slug],
  );
  return requireOneOrNone(rows, 'demo development');
}

async function listDemoUnitTypes(
  connection: AuthoritySqlConnection,
  developmentId: number,
): Promise<Row[]> {
  return await queryRows(
    connection,
    `SELECT id, name, bedrooms, bathrooms, unit_size, base_price_from, available_units,
            total_units, display_order, is_active, base_media
       FROM unit_types
      WHERE development_id = ?
      ORDER BY display_order, id`,
    [developmentId],
  );
}

async function findDemoProgram(
  connection: AuthoritySqlConnection,
  developmentId: number,
): Promise<Row | null> {
  const rows = await queryRows(
    connection,
    `SELECT id, development_id, is_referral_enabled, is_active, commission_model,
            default_commission_percent, referrer_commission_type, referrer_commission_value,
            referrer_commission_basis, tier_access_policy, payout_milestone, currency_code
       FROM distribution_programs
      WHERE development_id = ?
      ORDER BY id`,
    [developmentId],
  );
  return requireOneOrNone(rows, 'demo distribution program');
}

async function findDemoPartnership(
  connection: AuthoritySqlConnection,
  publisherId: number,
): Promise<Row | null> {
  const rows = await queryRows(
    connection,
    `SELECT id, catalogue_publisher_id, status
       FROM distribution_brand_partnerships
      WHERE catalogue_publisher_id = ?
      ORDER BY id`,
    [publisherId],
  );
  return requireOneOrNone(rows, 'demo brand partnership');
}

async function findDemoAccess(
  connection: AuthoritySqlConnection,
  developmentId: number,
): Promise<Row | null> {
  const rows = await queryRows(
    connection,
    `SELECT id, development_id, brand_partnership_id, catalogue_publisher_id, status,
            submission_allowed, excluded_by_mandate, excluded_by_exclusivity
       FROM distribution_development_access
      WHERE development_id = ?
      ORDER BY id`,
    [developmentId],
  );
  return requireOneOrNone(rows, 'demo development access');
}

async function findDemoManagerAssignment(
  connection: AuthoritySqlConnection,
  developmentId: number,
  managerUserId: number,
): Promise<Row | null> {
  const rows = await queryRows(
    connection,
    `SELECT id, development_id, manager_user_id, is_primary, workload_capacity, timezone, is_active
       FROM development_manager_assignments
      WHERE development_id = ? AND manager_user_id = ?
      ORDER BY id`,
    [developmentId, managerUserId],
  );
  return requireOneOrNone(rows, 'demo manager assignment');
}

async function listDemoRequiredDocuments(
  connection: AuthoritySqlConnection,
  developmentId: number,
): Promise<Row[]> {
  return await queryRows(
    connection,
    `SELECT id, document_code, document_label, category, template_file_url, template_file_name,
            sort_order, is_required, is_active
       FROM development_required_documents
      WHERE development_id = ?
      ORDER BY sort_order, id`,
    [developmentId],
  );
}

async function findDemoIntakePolicy(
  connection: AuthoritySqlConnection,
  programId: number,
): Promise<Row | null> {
  const rows = await queryRows(
    connection,
    `SELECT id, program_id, policy_version, status, configuration, configuration_digest,
            approval_reference, published_at
       FROM distribution_referral_intake_policy_releases
      WHERE program_id = ? AND status = 'active'
      ORDER BY policy_version DESC, id`,
    [programId],
  );
  return requireOneOrNone(rows, 'demo intake policy release');
}

async function insertIdOf(
  connection: AuthoritySqlConnection,
  statement: string,
  values: readonly unknown[],
  label: string,
): Promise<number> {
  const result = await connection.execute(statement, values);
  const header = Array.isArray(result)
    ? (result[0] as { insertId?: unknown } | undefined)
    : (result as { insertId?: unknown } | null);
  return asPositiveId(header?.insertId, `created ${label} ID`);
}

async function passwordHashMatches(password: string, hash: unknown): Promise<boolean> {
  if (typeof hash !== 'string' || !hash) return false;
  return bcrypt.compare(password, hash);
}

async function ensureManagerUser(
  connection: AuthoritySqlConnection,
  password: string,
): Promise<{ id: number; state: PreparedState }> {
  const existing = await findManagerUser(connection);
  const classification = classifyDistributionReferrerActivityManager(existing);
  if (existing) {
    const id = asPositiveId(rowValue(existing, 'id'), 'manager user ID');
    if (await passwordHashMatches(password, rowValue(existing, 'passwordHash'))) {
      return { id, state: classification.state };
    }

    const existingHash = rowValue(existing, 'passwordHash');
    if (existingHash !== null && existingHash !== undefined && String(existingHash).length > 0) {
      throw new Error(
        'Distribution referrer activity preview fixture refuses to rotate a conflicting manager password.',
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await connection.execute(
      'UPDATE users SET passwordHash = ? WHERE id = ? AND (passwordHash IS NULL OR passwordHash = ?)',
      [passwordHash, id, ''],
    );
    const updated = await findManagerUser(connection);
    if (!updated || !(await passwordHashMatches(password, rowValue(updated, 'passwordHash')))) {
      throw new Error('Distribution referrer activity preview manager login could not be provisioned.');
    }
    return {
      id,
      state: classification.state,
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = await insertIdOf(
    connection,
    `INSERT INTO users
      (openId, email, passwordHash, name, firstName, lastName, phone, loginMethod,
       emailVerified, role, plan, trialStatus, onboarding_complete, onboarding_step,
       subscription_tier, subscription_status, agencyId, isSubaccount,
       passwordResetToken, passwordResetTokenExpiresAt, emailVerificationToken)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, 'trial', 'active', ?, ?,
             'free', 'trial', NULL, 0, NULL, NULL, NULL)`,
    [
      EXPECTED_MANAGER.openId,
      EXPECTED_MANAGER.email,
      passwordHash,
      EXPECTED_MANAGER.name,
      EXPECTED_MANAGER.firstName,
      EXPECTED_MANAGER.lastName,
      EXPECTED_MANAGER.loginMethod,
      EXPECTED_MANAGER.emailVerified,
      EXPECTED_MANAGER.role,
      EXPECTED_MANAGER.onboardingComplete,
      EXPECTED_MANAGER.onboardingStep,
    ],
    'manager user',
  );
  return { id, state: 'created' };
}

async function ensureManagerIdentity(
  connection: AuthoritySqlConnection,
  userId: number,
): Promise<{ id: number; state: PreparedState }> {
  const existing = await findManagerIdentity(connection, userId);
  const classification = classifyDistributionReferrerActivityManagerIdentity(existing, userId);
  if (existing) {
    return {
      id: asPositiveId(rowValue(existing, 'id'), 'manager identity ID'),
      state: classification.state,
    };
  }

  const id = await insertIdOf(
    connection,
    `INSERT INTO distribution_identities (user_id, identity_type, active, display_name)
     VALUES (?, ?, ?, ?)`,
    [
      userId,
      EXPECTED_MANAGER_IDENTITY.identityType,
      EXPECTED_MANAGER_IDENTITY.active,
      EXPECTED_MANAGER_IDENTITY.displayName,
    ],
    'manager identity',
  );
  return { id, state: 'created' };
}

async function ensureDevelopment(
  connection: AuthoritySqlConnection,
): Promise<{ id: number; state: PreparedState }> {
  const existing = await findDevelopment(connection);
  const classification = classifyDistributionReferrerActivityDevelopment(existing);
  if (existing) {
    return {
      id: asPositiveId(rowValue(existing, 'id'), 'development ID'),
      state: classification.state,
    };
  }

  const id = await insertIdOf(
    connection,
    `INSERT INTO developments
      (name, slug, developmentType, city, province, suburb, isPublished, approval_status)
     VALUES (?, ?, ?, ?, ?, ?, 0, 'draft')`,
    [
      EXPECTED_DEVELOPMENT.name,
      EXPECTED_DEVELOPMENT.slug,
      EXPECTED_DEVELOPMENT.developmentType,
      EXPECTED_DEVELOPMENT.city,
      EXPECTED_DEVELOPMENT.province,
      EXPECTED_DEVELOPMENT.suburb,
    ],
    'sample development',
  );
  return { id, state: 'created' };
}

async function ensureProgram(
  connection: AuthoritySqlConnection,
  developmentId: number,
): Promise<{ id: number; state: PreparedState }> {
  const existing = await findProgram(connection, developmentId);
  const classification = classifyDistributionReferrerActivityProgram(existing, developmentId);
  if (existing) {
    return {
      id: asPositiveId(rowValue(existing, 'id'), 'program ID'),
      state: classification.state,
    };
  }

  const id = await insertIdOf(
    connection,
    `INSERT INTO distribution_programs
      (development_id, is_referral_enabled, is_active, tier_access_policy,
       default_commission_amount, currency_code)
     VALUES (?, 1, 1, 'restricted', 25000, 'ZAR')`,
    [developmentId],
    'sample distribution program',
  );
  return { id, state: 'created' };
}

async function ensureDeal(
  connection: AuthoritySqlConnection,
  expected: { programId: number; developmentId: number; agentId: number; managerId: number },
): Promise<{ id: number; state: PreparedState }> {
  const existing = await findDeal(connection, expected.agentId, expected.developmentId);
  const classification = classifyDistributionReferrerActivityDeal(existing, expected);
  if (existing) {
    return { id: asPositiveId(rowValue(existing, 'id'), 'deal ID'), state: classification.state };
  }

  const id = await insertIdOf(
    connection,
    `INSERT INTO distribution_deals
      (program_id, development_id, agent_id, manager_user_id, buyer_name, deal_amount,
       commission_base_amount, referrer_commission_type, referrer_commission_value,
       referrer_commission_basis, referrer_commission_amount, current_stage,
       commission_trigger_stage, commission_status)
     VALUES (?, ?, ?, ?, ?, 2500000, 2500000, 'percentage', '1.00', 'sale_price', 25000,
             'viewing_scheduled', 'contract_signed', 'not_ready')`,
    [
      expected.programId,
      expected.developmentId,
      expected.agentId,
      expected.managerId,
      EXPECTED_DEAL.buyerName,
    ],
    'sample distribution deal',
  );
  return { id, state: 'created' };
}

async function ensureViewing(
  connection: AuthoritySqlConnection,
  expected: {
    dealId: number;
    programId: number;
    developmentId: number;
    agentId: number;
    managerId: number;
  },
): Promise<{ id: number; state: ViewingState; scheduledStartAt: string }> {
  const existing = await findViewing(connection, expected.dealId);
  if (existing) {
    assertDistributionReferrerActivityViewing(existing, expected);
    const id = asPositiveId(rowValue(existing, 'id'), 'viewing ID');
    const scheduled = scheduledStartInfo(rowValue(existing, 'scheduled_start_at'));
    if (Number.isFinite(scheduled.ms) && scheduled.ms >= Date.now()) {
      return { id, state: 'reused', scheduledStartAt: scheduled.text };
    }
    const window = viewingWindow();
    await connection.execute(
      `UPDATE distribution_viewings
          SET scheduled_start_at = ?, scheduled_end_at = ?, reschedule_count = reschedule_count + 1
        WHERE id = ?`,
      [window.start, window.end, id],
    );
    return { id, state: 'rescheduled', scheduledStartAt: window.start };
  }

  const window = viewingWindow();
  const id = await insertIdOf(
    connection,
    `INSERT INTO distribution_viewings
      (deal_id, program_id, development_id, agent_id, manager_user_id, scheduled_start_at,
       scheduled_end_at, timezone, location_name, status, scheduled_by_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Africa/Johannesburg', ?, 'scheduled', ?)`,
    [
      expected.dealId,
      expected.programId,
      expected.developmentId,
      expected.agentId,
      expected.managerId,
      window.start,
      window.end,
      EXPECTED_VIEWING.locationName,
      expected.managerId,
    ],
    'sample distribution viewing',
  );
  return { id, state: 'created', scheduledStartAt: window.start };
}

async function ensureCommissionEntry(
  connection: AuthoritySqlConnection,
  expected: { dealId: number; programId: number; developmentId: number; agentId: number },
): Promise<{ id: number; state: PreparedState }> {
  const existing = await findCommissionEntry(connection, expected.dealId);
  if (existing) {
    assertDistributionReferrerActivityCommissionEntry(existing, expected);
    return {
      id: asPositiveId(rowValue(existing, 'id'), 'commission entry ID'),
      state: 'reused',
    };
  }

  const id = await insertIdOf(
    connection,
    `INSERT INTO distribution_commission_entries
      (deal_id, program_id, development_id, agent_id, calculation_base_amount, commission_percent,
       commission_amount, currency, trigger_stage, entry_status)
     VALUES (?, ?, ?, ?, 2500000, '1.00', 25000, 'ZAR', 'contract_signed', 'pending')`,
    [expected.dealId, expected.programId, expected.developmentId, expected.agentId],
    'sample commission entry',
  );
  return { id, state: 'created' };
}

async function ensureDemoPublisher(
  connection: AuthoritySqlConnection,
): Promise<{ id: number; state: PreparedState }> {
  const existing = await findDemoPublisher(connection);
  const classification = classifyDistributionReferrerActivityDemoPublisher(existing);
  if (existing) {
    return {
      id: asPositiveId(rowValue(existing, 'id'), 'demo publisher ID'),
      state: classification.state,
    };
  }

  const id = await insertIdOf(
    connection,
    `INSERT INTO catalogue_publishers
      (authority_kind, publisher_type, developer_organisation_id, name, slug, source_attribution,
       is_visible)
     VALUES ('platform_reference', 'developer', NULL, ?, ?, ?, 1)`,
    [
      EXPECTED_DEMO_PUBLISHER.name,
      EXPECTED_DEMO_PUBLISHER.slug,
      EXPECTED_DEMO_PUBLISHER.sourceAttribution,
    ],
    'demo catalogue publisher',
  );
  return { id, state: 'created' };
}

async function ensureDemoDevelopment(
  connection: AuthoritySqlConnection,
  publisherId: number,
): Promise<{ id: number; state: PreparedState }> {
  const existing = await findDemoDevelopment(connection);
  const classification = classifyDistributionReferrerActivityDemoDevelopment(existing, publisherId);
  if (existing) {
    return {
      id: asPositiveId(rowValue(existing, 'id'), 'demo development ID'),
      state: classification.state,
    };
  }

  const id = await insertIdOf(
    connection,
    `INSERT INTO developments
      (catalogue_publisher_id, name, marketing_name, slug, developmentType, city, province,
       suburb, transaction_type, isPublished, publishedAt, approval_status, status,
       inventory_mode)
     VALUES (?, ?, ?, ?, 'residential', ?, ?, ?, 'for_sale', 1, ?, 'approved', 'selling',
             'itemized')`,
    [
      publisherId,
      EXPECTED_DEMO_DEVELOPMENT.name,
      EXPECTED_DEMO_DEVELOPMENT.marketingName,
      EXPECTED_DEMO_DEVELOPMENT.slug,
      EXPECTED_DEMO_DEVELOPMENT.city,
      EXPECTED_DEMO_DEVELOPMENT.province,
      EXPECTED_DEMO_DEVELOPMENT.suburb,
      mysqlTimestamp(new Date()),
    ],
    'demo development',
  );
  return { id, state: 'created' };
}

async function ensureDemoUnitTypes(
  connection: AuthoritySqlConnection,
  developmentId: number,
): Promise<{ state: PreparedState }> {
  const existing = await listDemoUnitTypes(connection, developmentId);
  if (existing.length > 0) {
    if (existing.length !== EXPECTED_DEMO_UNIT_TYPES.length) {
      throw new Error(
        'Distribution referrer activity preview fixture demo unit types do not match the governed set.',
      );
    }
    let mediaUpdated = false;
    for (const expected of EXPECTED_DEMO_UNIT_TYPES) {
      const row = existing.find(
        candidate => comparable(rowValue(candidate, 'name')) === expected.name,
      );
      if (!row) {
        throw new Error(
          `Distribution referrer activity preview fixture is missing demo unit type ${expected.name}.`,
        );
      }
      assertDemoUnitTypeScalarFields(row, expected);
      const storedMedia = parseStoredJson(rowValue(row, 'base_media'));
      if (canonicalJson(storedMedia) !== canonicalJson(expected.baseMedia)) {
        await connection.execute(`UPDATE unit_types SET base_media = ? WHERE id = ?`, [
          JSON.stringify(expected.baseMedia),
          expected.id,
        ]);
        mediaUpdated = true;
      }
    }
    return { state: mediaUpdated ? 'created' : 'reused' };
  }

  for (const unitType of EXPECTED_DEMO_UNIT_TYPES) {
    await connection.execute(
      `INSERT INTO unit_types
        (id, development_id, name, bedrooms, bathrooms, unit_size, base_price_from,
         available_units, total_units, display_order, is_active, base_media)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        unitType.id,
        developmentId,
        unitType.name,
        unitType.bedrooms,
        unitType.bathrooms,
        unitType.unitSize,
        unitType.basePriceFrom,
        unitType.availableUnits,
        unitType.totalUnits,
        unitType.displayOrder,
        JSON.stringify(unitType.baseMedia),
      ],
    );
  }
  return { state: 'created' };
}

async function ensureDemoProgram(
  connection: AuthoritySqlConnection,
  developmentId: number,
): Promise<{ id: number; state: PreparedState }> {
  const existing = await findDemoProgram(connection, developmentId);
  const classification = classifyDistributionReferrerActivityDemoProgram(existing, developmentId);
  if (existing) {
    return {
      id: asPositiveId(rowValue(existing, 'id'), 'demo program ID'),
      state: classification.state,
    };
  }

  const id = await insertIdOf(
    connection,
    `INSERT INTO distribution_programs
      (development_id, is_referral_enabled, is_active, commission_model,
       default_commission_percent, referrer_commission_type, referrer_commission_value,
       referrer_commission_basis, tier_access_policy, payout_milestone, currency_code)
     VALUES (?, 1, 1, 'flat_percentage', '2.50', 'percentage', '2.50', 'sale_price', 'open',
             'transfer_registration', 'ZAR')`,
    [developmentId],
    'demo distribution program',
  );
  return { id, state: 'created' };
}

async function ensureDemoPartnership(
  connection: AuthoritySqlConnection,
  publisherId: number,
): Promise<{ id: number; state: PreparedState }> {
  const existing = await findDemoPartnership(connection, publisherId);
  const classification = classifyDistributionReferrerActivityDemoPartnership(existing, publisherId);
  if (existing) {
    return {
      id: asPositiveId(rowValue(existing, 'id'), 'demo partnership ID'),
      state: classification.state,
    };
  }

  const id = await insertIdOf(
    connection,
    `INSERT INTO distribution_brand_partnerships (catalogue_publisher_id, status, partnered_at)
     VALUES (?, 'active', ?)`,
    [publisherId, mysqlTimestamp(new Date())],
    'demo brand partnership',
  );
  return { id, state: 'created' };
}

async function ensureDemoAccess(
  connection: AuthoritySqlConnection,
  expected: { developmentId: number; brandPartnershipId: number; publisherId: number },
): Promise<{ id: number; state: PreparedState }> {
  const existing = await findDemoAccess(connection, expected.developmentId);
  const classification = classifyDistributionReferrerActivityDemoAccess(existing, expected);
  if (existing) {
    return {
      id: asPositiveId(rowValue(existing, 'id'), 'demo access ID'),
      state: classification.state,
    };
  }

  const id = await insertIdOf(
    connection,
    `INSERT INTO distribution_development_access
      (development_id, brand_partnership_id, catalogue_publisher_id, status, submission_allowed,
       excluded_by_mandate, excluded_by_exclusivity, included_at)
     VALUES (?, ?, ?, 'included', 1, 0, 0, ?)`,
    [
      expected.developmentId,
      expected.brandPartnershipId,
      expected.publisherId,
      mysqlTimestamp(new Date()),
    ],
    'demo development access',
  );
  return { id, state: 'created' };
}

async function ensureDemoManagerAssignment(
  connection: AuthoritySqlConnection,
  developmentId: number,
  managerUserId: number,
): Promise<{ id: number; state: PreparedState }> {
  const expected = { developmentId, managerUserId };
  const existing = await findDemoManagerAssignment(connection, developmentId, managerUserId);
  const classification = classifyDistributionReferrerActivityDemoManagerAssignment(
    existing,
    expected,
  );
  if (existing) {
    return {
      id: asPositiveId(rowValue(existing, 'id'), 'demo manager assignment ID'),
      state: classification.state,
    };
  }

  const id = await insertIdOf(
    connection,
    `INSERT INTO development_manager_assignments
      (development_id, manager_user_id, is_primary, workload_capacity, timezone, is_active)
     VALUES (?, ?, 1, 0, 'Africa/Johannesburg', 1)`,
    [developmentId, managerUserId],
    'demo manager assignment',
  );
  return { id, state: 'created' };
}

async function ensureDemoRequiredDocuments(
  connection: AuthoritySqlConnection,
  developmentId: number,
): Promise<{ state: PreparedState }> {
  const existing = await listDemoRequiredDocuments(connection, developmentId);
  let inserted = 0;
  let updated = 0;

  for (const document of EXPECTED_DEMO_REQUIRED_DOCUMENTS) {
    const matches = existing.filter(
      row =>
        comparable(rowValue(row, 'category')) === document.category &&
        comparable(rowValue(row, 'document_code')) === document.documentCode &&
        comparable(rowValue(row, 'document_label')) === document.documentLabel,
    );
    if (matches.length > 1) {
      throw new Error(
        `Distribution referrer activity preview fixture requires exactly one demo document ${document.category}:${document.documentLabel}.`,
      );
    }
    if (matches.length === 1) {
      const row = matches[0];
      const needsUpdate =
        comparable(rowValue(row, 'template_file_url')) !== comparable(document.templateFileUrl) ||
        comparable(rowValue(row, 'template_file_name')) !== comparable(document.templateFileName) ||
        comparable(rowValue(row, 'is_required')) !== comparable(document.isRequired) ||
        comparable(rowValue(row, 'sort_order')) !== comparable(document.sortOrder) ||
        comparable(rowValue(row, 'is_active')) !== '1';
      if (!needsUpdate) continue;

      await connection.execute(
        `UPDATE development_required_documents
            SET template_file_url = ?, template_file_name = ?, is_required = ?,
                sort_order = ?, is_active = 1
          WHERE id = ?`,
        [
          document.templateFileUrl,
          document.templateFileName,
          document.isRequired,
          document.sortOrder,
          asPositiveId(rowValue(row, 'id'), 'demo document ID'),
        ],
      );
      updated += 1;
      continue;
    }

    await connection.execute(
      `INSERT INTO development_required_documents
        (development_id, document_code, document_label, category, template_file_url,
         template_file_name, is_required, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        developmentId,
        document.documentCode,
        document.documentLabel,
        document.category,
        document.templateFileUrl,
        document.templateFileName,
        document.isRequired,
        document.sortOrder,
      ],
    );
    inserted += 1;
  }

  const rows = await listDemoRequiredDocuments(connection, developmentId);
  assertDistributionReferrerActivityDemoRequiredDocuments(rows);
  return { state: inserted > 0 || updated > 0 ? 'created' : 'reused' };
}

async function ensureDemoIntakePolicy(
  connection: AuthoritySqlConnection,
  programId: number,
): Promise<{ id: number; state: PreparedState }> {
  const existing = await findDemoIntakePolicy(connection, programId);
  if (existing) {
    const versionMatches =
      Number(rowValue(existing, 'policy_version')) === EXPECTED_DEMO_POLICY.policyVersion;
    const digestMatches =
      String(rowValue(existing, 'configuration_digest')) === DEMO_POLICY_CONFIGURATION_DIGEST;
    const statusMatches = String(rowValue(existing, 'status')) === EXPECTED_DEMO_POLICY.status;
    if (versionMatches && digestMatches && statusMatches) {
      assertDistributionReferrerActivityDemoIntakePolicy(existing, programId);
      return {
        id: asPositiveId(rowValue(existing, 'id'), 'demo intake policy release ID'),
        state: 'reused',
      };
    }
    await connection.execute(
      `UPDATE distribution_referral_intake_policy_releases
          SET status = 'retired'
        WHERE program_id = ? AND status = 'active'`,
      [programId],
    );
  }

  const id = await insertIdOf(
    connection,
    `INSERT INTO distribution_referral_intake_policy_releases
      (program_id, policy_version, status, configuration, configuration_digest,
       approval_reference, published_at)
     VALUES (?, ?, 'active', ?, ?, ?, ?)`,
    [
      programId,
      EXPECTED_DEMO_POLICY.policyVersion,
      JSON.stringify(DEMO_POLICY_CONFIGURATION),
      DEMO_POLICY_CONFIGURATION_DIGEST,
      EXPECTED_DEMO_POLICY.approvalReference,
      mysqlTimestamp(new Date()),
    ],
    'demo intake policy release',
  );
  return { id, state: 'created' };
}

async function assertNoProgramGrantOrAgentProfile(
  connection: AuthoritySqlConnection,
  userId: number,
): Promise<void> {
  const agents = await queryRows(connection, 'SELECT id FROM agents WHERE userId = ? ORDER BY id', [
    userId,
  ]);
  if (agents.length) {
    throw new Error('Distribution referrer activity preview fixture refuses an agent profile.');
  }
  const grants = await queryRows(
    connection,
    'SELECT id FROM distribution_agent_access WHERE agent_id = ? ORDER BY id',
    [userId],
  );
  if (grants.length) {
    throw new Error('Distribution referrer activity preview fixture refuses program grants.');
  }
}

async function requireCurrentCongruentSchema(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
  migrationHead: string;
}): Promise<void> {
  const readiness = await assessAuthorizedDatabaseReadiness({
    authority: input.authority,
    connection: input.connection,
    authorization: input.decision,
  });
  if (
    readiness.layers.targetConnectivity.state !== 'ready' ||
    readiness.layers.migrationHead.state !== 'ready' ||
    readiness.layers.schemaCongruent.state !== 'ready'
  ) {
    throw new Error(
      `Distribution referrer activity preview fixture refused: exact target, current migration head ${input.migrationHead}, and schema congruency are required.`,
    );
  }
}

async function verifyFixture(input: {
  connection: AuthoritySqlConnection;
  referrerUserId: number;
  managerPassword: string;
  migrationHead: string;
}): Promise<{
  verified: DistributionReferrerActivityPreviewEvidence['verified'];
  sample: DistributionReferrerActivityPreviewEvidence['sample'];
}> {
  const referrer = await findReferrerUser(input.connection);
  assertDistributionReferrerActivityDependency(referrer);
  requireExact(rowValue(referrer!, 'id'), input.referrerUserId, 'referrer user ID');
  await assertNoProgramGrantOrAgentProfile(input.connection, input.referrerUserId);

  const manager = await findManagerUser(input.connection);
  if (!manager)
    throw new Error('Distribution referrer activity preview fixture manager is missing.');
  assertDistributionReferrerActivityManager(manager);
  const managerId = asPositiveId(rowValue(manager, 'id'), 'manager user ID');
  if (!(await passwordHashMatches(input.managerPassword, rowValue(manager, 'passwordHash')))) {
    throw new Error(
      'Distribution referrer activity preview fixture manager password hash does not match the local secret.',
    );
  }

  const managerIdentity = await findManagerIdentity(input.connection, managerId);
  if (!managerIdentity) {
    throw new Error('Distribution referrer activity preview fixture manager identity is missing.');
  }
  assertDistributionReferrerActivityManagerIdentity(managerIdentity, managerId);

  const development = await findDevelopment(input.connection);
  if (!development) {
    throw new Error('Distribution referrer activity preview fixture development is missing.');
  }
  assertDistributionReferrerActivityDevelopment(development);
  const developmentId = asPositiveId(rowValue(development, 'id'), 'development ID');

  const program = await findProgram(input.connection, developmentId);
  if (!program)
    throw new Error('Distribution referrer activity preview fixture program is missing.');
  assertDistributionReferrerActivityProgram(program, developmentId);
  const programId = asPositiveId(rowValue(program, 'id'), 'program ID');

  const deal = await findDeal(input.connection, input.referrerUserId, developmentId);
  if (!deal) throw new Error('Distribution referrer activity preview fixture deal is missing.');
  assertDistributionReferrerActivityDeal(deal, {
    programId,
    developmentId,
    agentId: input.referrerUserId,
    managerId,
  });
  const dealId = asPositiveId(rowValue(deal, 'id'), 'deal ID');

  const viewing = await findViewing(input.connection, dealId);
  if (!viewing)
    throw new Error('Distribution referrer activity preview fixture viewing is missing.');
  assertDistributionReferrerActivityViewing(viewing, {
    dealId,
    programId,
    developmentId,
    agentId: input.referrerUserId,
    managerId,
  });
  const viewingId = asPositiveId(rowValue(viewing, 'id'), 'viewing ID');
  const scheduled = scheduledStartInfo(rowValue(viewing, 'scheduled_start_at'));
  if (!Number.isFinite(scheduled.ms) || scheduled.ms < Date.now()) {
    throw new Error('Distribution referrer activity preview fixture viewing is not upcoming.');
  }

  const entry = await findCommissionEntry(input.connection, dealId);
  if (!entry) {
    throw new Error('Distribution referrer activity preview fixture commission entry is missing.');
  }
  assertDistributionReferrerActivityCommissionEntry(entry, {
    dealId,
    programId,
    developmentId,
    agentId: input.referrerUserId,
  });
  const commissionEntryId = asPositiveId(rowValue(entry, 'id'), 'commission entry ID');

  const demoPublisher = await findDemoPublisher(input.connection);
  if (!demoPublisher) {
    throw new Error('Distribution referrer activity preview fixture demo publisher is missing.');
  }
  assertDistributionReferrerActivityDemoPublisher(demoPublisher);
  const demoPublisherId = asPositiveId(rowValue(demoPublisher, 'id'), 'demo publisher ID');

  const demoDevelopment = await findDemoDevelopment(input.connection);
  if (!demoDevelopment) {
    throw new Error('Distribution referrer activity preview fixture demo development is missing.');
  }
  assertDistributionReferrerActivityDemoDevelopment(demoDevelopment, demoPublisherId);
  const demoDevelopmentId = asPositiveId(rowValue(demoDevelopment, 'id'), 'demo development ID');

  const demoUnitTypes = await listDemoUnitTypes(input.connection, demoDevelopmentId);
  assertDistributionReferrerActivityDemoUnitTypes(demoUnitTypes);

  const demoProgram = await findDemoProgram(input.connection, demoDevelopmentId);
  if (!demoProgram) {
    throw new Error('Distribution referrer activity preview fixture demo program is missing.');
  }
  assertDistributionReferrerActivityDemoProgram(demoProgram, demoDevelopmentId);
  const demoProgramId = asPositiveId(rowValue(demoProgram, 'id'), 'demo program ID');

  const demoPartnership = await findDemoPartnership(input.connection, demoPublisherId);
  if (!demoPartnership) {
    throw new Error('Distribution referrer activity preview fixture demo partnership is missing.');
  }
  assertDistributionReferrerActivityDemoPartnership(demoPartnership, demoPublisherId);
  const demoPartnershipId = asPositiveId(rowValue(demoPartnership, 'id'), 'demo partnership ID');

  const demoAccess = await findDemoAccess(input.connection, demoDevelopmentId);
  if (!demoAccess) {
    throw new Error(
      'Distribution referrer activity preview fixture demo development access is missing.',
    );
  }
  assertDistributionReferrerActivityDemoAccess(demoAccess, {
    developmentId: demoDevelopmentId,
    brandPartnershipId: demoPartnershipId,
    publisherId: demoPublisherId,
  });

  const demoManagerAssignment = await findDemoManagerAssignment(
    input.connection,
    demoDevelopmentId,
    managerId,
  );
  if (!demoManagerAssignment) {
    throw new Error(
      'Distribution referrer activity preview fixture demo manager assignment is missing.',
    );
  }
  assertDistributionReferrerActivityDemoManagerAssignment(demoManagerAssignment, {
    developmentId: demoDevelopmentId,
    managerUserId: managerId,
  });

  const demoRequiredDocuments = await listDemoRequiredDocuments(
    input.connection,
    demoDevelopmentId,
  );
  assertDistributionReferrerActivityDemoRequiredDocuments(demoRequiredDocuments);

  const demoIntakePolicy = await findDemoIntakePolicy(input.connection, demoProgramId);
  if (!demoIntakePolicy) {
    throw new Error(
      'Distribution referrer activity preview fixture demo intake policy is missing.',
    );
  }
  assertDistributionReferrerActivityDemoIntakePolicy(demoIntakePolicy, demoProgramId);
  const demoIntakePolicyReleaseId = asPositiveId(
    rowValue(demoIntakePolicy, 'id'),
    'demo intake policy release ID',
  );

  const validations = await queryRows(
    input.connection,
    'SELECT id FROM distribution_viewing_validations WHERE deal_id = ? ORDER BY id',
    [dealId],
  );
  const ledger = await queryRows(
    input.connection,
    'SELECT id FROM distribution_commission_ledger WHERE distribution_deal_id = ? ORDER BY id',
    [dealId],
  );
  if (validations.length || ledger.length) {
    throw new Error(
      'Distribution referrer activity preview fixture refuses sample validation or ledger rows.',
    );
  }

  return {
    verified: {
      migrationHead: input.migrationHead,
      schemaCongruent: true,
      referrerAccount: true,
      managerAccountLogin: true,
      activeManagerIdentity: true,
      sampleDevelopmentUnpublished: true,
      restrictedReferralProgram: true,
      sampleDeal: true,
      upcomingViewingScheduled: true,
      potentialPayoutPending: true,
      noProgramGrant: true,
      noLedgerOrValidation: true,
      demoOpportunityPublished: true,
      demoInventoryGoverned: true,
      demoProgramReady: true,
      demoNetworkAccessIncluded: true,
      demoPrimaryManagerAssigned: true,
      demoIntakePolicyActive: true,
    },
    sample: {
      developmentId,
      programId,
      dealId,
      viewingId,
      commissionEntryId,
      viewingScheduledStartAt: scheduled.text,
      demoPublisherId,
      demoDevelopmentId,
      demoProgramId,
      demoUnitTypeIds: demoUnitTypes.map(row => String(rowValue(row, 'id'))),
      demoIntakePolicyReleaseId,
    },
  };
}

function evidenceBase(authority: ResolvedDatabaseAuthority): AdapterEvidence {
  return {
    ...requireExactAdapterTarget(authority),
    adapter: 'distribution-referrer-activity-preview',
    version: DISTRIBUTION_REFERRER_ACTIVITY_PREVIEW_VERSION,
    digest: DISTRIBUTION_REFERRER_ACTIVITY_PREVIEW_DIGEST,
  };
}

export async function prepareDistributionReferrerActivityPreviewFixture(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
}): Promise<DistributionReferrerActivityPreviewEvidence> {
  assertOperation(input.decision, ['demo-seed']);
  assertDistributionReferrerActivityPreviewTarget(input.authority);
  const base = evidenceBase(input.authority);
  const manifest = await requireAcceptedMigrationHead({
    authority: input.authority,
    connection: input.connection,
  });
  await requireCurrentCongruentSchema({
    ...input,
    migrationHead: manifest.document.expectedHead,
  });

  const referrer = await findReferrerUser(input.connection);
  assertDistributionReferrerActivityDependency(referrer);
  const referrerUserId = asPositiveId(rowValue(referrer!, 'id'), 'referrer user ID');
  const managerPassword = resolveDistributionReferrerPreviewPassword();

  const prepared = await withTransaction(input.connection, async () => {
    const manager = await ensureManagerUser(input.connection, managerPassword);
    const managerIdentity = await ensureManagerIdentity(input.connection, manager.id);
    const development = await ensureDevelopment(input.connection);
    const program = await ensureProgram(input.connection, development.id);
    const deal = await ensureDeal(input.connection, {
      programId: program.id,
      developmentId: development.id,
      agentId: referrerUserId,
      managerId: manager.id,
    });
    const viewing = await ensureViewing(input.connection, {
      dealId: deal.id,
      programId: program.id,
      developmentId: development.id,
      agentId: referrerUserId,
      managerId: manager.id,
    });
    const commissionEntry = await ensureCommissionEntry(input.connection, {
      dealId: deal.id,
      programId: program.id,
      developmentId: development.id,
      agentId: referrerUserId,
    });
    const demoPublisher = await ensureDemoPublisher(input.connection);
    const demoDevelopment = await ensureDemoDevelopment(input.connection, demoPublisher.id);
    const demoUnitTypes = await ensureDemoUnitTypes(input.connection, demoDevelopment.id);
    const demoProgram = await ensureDemoProgram(input.connection, demoDevelopment.id);
    const demoPartnership = await ensureDemoPartnership(input.connection, demoPublisher.id);
    const demoAccess = await ensureDemoAccess(input.connection, {
      developmentId: demoDevelopment.id,
      brandPartnershipId: demoPartnership.id,
      publisherId: demoPublisher.id,
    });
    const demoManagerAssignment = await ensureDemoManagerAssignment(
      input.connection,
      demoDevelopment.id,
      manager.id,
    );
    const demoRequiredDocuments = await ensureDemoRequiredDocuments(
      input.connection,
      demoDevelopment.id,
    );
    const demoIntakePolicy = await ensureDemoIntakePolicy(input.connection, demoProgram.id);
    return {
      manager,
      managerIdentity,
      development,
      program,
      deal,
      viewing,
      commissionEntry,
      demoPublisher,
      demoDevelopment,
      demoUnitTypes,
      demoProgram,
      demoPartnership,
      demoAccess,
      demoManagerAssignment,
      demoRequiredDocuments,
      demoIntakePolicy,
    };
  });

  const result = await verifyFixture({
    connection: input.connection,
    referrerUserId,
    managerPassword,
    migrationHead: manifest.document.expectedHead,
  });

  const manager = await findManagerUser(input.connection);
  if (!manager) throw new Error('Distribution referrer activity preview fixture manager is missing.');

  return {
    ...base,
    fixture: DISTRIBUTION_REFERRER_ACTIVITY_PREVIEW_VERSION,
    account: { userId: referrerUserId, email: DISTRIBUTION_REFERRER_PREVIEW_EMAIL },
    managerAccount: {
      userId: asPositiveId(rowValue(manager, 'id'), 'manager user ID'),
      email: EXPECTED_MANAGER.email,
    },
    prepared: {
      manager: prepared.manager.state,
      managerIdentity: prepared.managerIdentity.state,
      development: prepared.development.state,
      program: prepared.program.state,
      deal: prepared.deal.state,
      viewing: prepared.viewing.state,
      commissionEntry: prepared.commissionEntry.state,
      demoPublisher: prepared.demoPublisher.state,
      demoDevelopment: prepared.demoDevelopment.state,
      demoUnitTypes: prepared.demoUnitTypes.state,
      demoProgram: prepared.demoProgram.state,
      demoPartnership: prepared.demoPartnership.state,
      demoAccess: prepared.demoAccess.state,
      demoManagerAssignment: prepared.demoManagerAssignment.state,
      demoRequiredDocuments: prepared.demoRequiredDocuments.state,
      demoIntakePolicy: prepared.demoIntakePolicy.state,
    },
    sample: result.sample,
    verified: result.verified,
  };
}

export async function verifyDistributionReferrerActivityPreviewFixture(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
}): Promise<DistributionReferrerActivityPreviewEvidence> {
  assertOperation(input.decision, ['verification', 'browser-verification']);
  assertDistributionReferrerActivityPreviewTarget(input.authority);
  const base = evidenceBase(input.authority);
  const manifest = await requireAcceptedMigrationHead({
    authority: input.authority,
    connection: input.connection,
  });
  await requireCurrentCongruentSchema({
    ...input,
    migrationHead: manifest.document.expectedHead,
  });

  const referrer = await findReferrerUser(input.connection);
  assertDistributionReferrerActivityDependency(referrer);
  const referrerUserId = asPositiveId(rowValue(referrer!, 'id'), 'referrer user ID');
  const managerPassword = resolveDistributionReferrerPreviewPassword();

  const result = await verifyFixture({
    connection: input.connection,
    referrerUserId,
    managerPassword,
    migrationHead: manifest.document.expectedHead,
  });

  const manager = await findManagerUser(input.connection);
  if (!manager) throw new Error('Distribution referrer activity preview fixture manager is missing.');

  return {
    ...base,
    fixture: DISTRIBUTION_REFERRER_ACTIVITY_PREVIEW_VERSION,
    account: { userId: referrerUserId, email: DISTRIBUTION_REFERRER_PREVIEW_EMAIL },
    managerAccount: {
      userId: asPositiveId(rowValue(manager, 'id'), 'manager user ID'),
      email: EXPECTED_MANAGER.email,
    },
    prepared: {
      manager: 'reused',
      managerIdentity: 'reused',
      development: 'reused',
      program: 'reused',
      deal: 'reused',
      viewing: 'reused',
      commissionEntry: 'reused',
      demoPublisher: 'reused',
      demoDevelopment: 'reused',
      demoUnitTypes: 'reused',
      demoProgram: 'reused',
      demoPartnership: 'reused',
      demoAccess: 'reused',
      demoManagerAssignment: 'reused',
      demoRequiredDocuments: 'reused',
      demoIntakePolicy: 'reused',
    },
    sample: result.sample,
    verified: result.verified,
  };
}
