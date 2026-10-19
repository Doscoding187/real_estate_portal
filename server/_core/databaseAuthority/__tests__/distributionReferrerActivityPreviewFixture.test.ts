import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertDistributionReferrerActivityCommissionEntry,
  assertDistributionReferrerActivityDemoAccess,
  assertDistributionReferrerActivityDemoDevelopment,
  assertDistributionReferrerActivityDemoIntakePolicy,
  assertDistributionReferrerActivityDemoProgram,
  assertDistributionReferrerActivityDemoPublisher,
  assertDistributionReferrerActivityDemoRequiredDocuments,
  assertDistributionReferrerActivityDemoUnitTypes,
  assertDistributionReferrerActivityDependency,
  assertDistributionReferrerActivityDevelopment,
  assertDistributionReferrerActivityPreviewTarget,
  assertDistributionReferrerActivityViewing,
  classifyDistributionReferrerActivityDeal,
  classifyDistributionReferrerActivityDemoAccess,
  classifyDistributionReferrerActivityDemoDevelopment,
  classifyDistributionReferrerActivityDemoIntakePolicy,
  classifyDistributionReferrerActivityDemoManagerAssignment,
  classifyDistributionReferrerActivityDemoPartnership,
  classifyDistributionReferrerActivityDemoProgram,
  classifyDistributionReferrerActivityDemoPublisher,
  classifyDistributionReferrerActivityDevelopment,
  classifyDistributionReferrerActivityManager,
  classifyDistributionReferrerActivityProgram,
  DISTRIBUTION_REFERRER_ACTIVITY_PREVIEW_DIGEST,
  DISTRIBUTION_REFERRER_ACTIVITY_PREVIEW_VERSION,
} from '../dataAdapters/distributionReferrerActivityPreviewFixture';
import { stableDigest } from '../dataAdapters/common';

const EXPECTED_DATABASE = 'listify_wt_distribution_preview_0123456789ab';
const authority = (overrides: Record<string, unknown> = {}) =>
  ({
    context: {
      targetClass: 'disposable-worktree',
      host: '127.0.0.1',
      port: '3307',
      databaseName: EXPECTED_DATABASE,
      worktree: {
        expectedDatabase: EXPECTED_DATABASE,
        ownershipMatches: true,
      },
      ...overrides,
    },
  }) as any;

const expectedReferrer = {
  id: 501,
  openId: 'distribution-individual-referrer-preview-v1',
  email: 'individual-referrer@listify.local',
  name: 'Individual Referrer Preview',
  firstName: 'Individual',
  lastName: 'Referrer',
  phone: null,
  loginMethod: 'email',
  emailVerified: 1,
  role: 'visitor',
  agencyId: null,
  isSubaccount: 0,
  onboarding_complete: 1,
  onboarding_step: 0,
};

const expectedManager = {
  id: 601,
  openId: 'distribution-referrer-activity-manager-v1',
  email: 'preview-sales-manager@listify.local',
  name: 'Preview Sales Manager',
  firstName: 'Preview',
  lastName: 'Manager',
  role: 'visitor',
};

const expectedDevelopment = {
  id: 701,
  name: 'Preview Ridge Estate',
  slug: 'distribution-preview-ridge-estate-v1',
  developmentType: 'residential',
  city: 'Midrand',
  province: 'Gauteng',
  suburb: 'Waterfall',
  isPublished: 0,
  approval_status: 'draft',
};

const expectedProgram = {
  id: 901,
  development_id: 701,
  is_referral_enabled: 1,
  is_active: 1,
  tier_access_policy: 'restricted',
  default_commission_amount: 25000,
  currency_code: 'ZAR',
};

const dealIds = { programId: 901, developmentId: 701, agentId: 501, managerId: 601 };

const expectedDeal = {
  id: 801,
  program_id: 901,
  development_id: 701,
  agent_id: 501,
  manager_user_id: 601,
  buyer_name: 'Preview Prospect',
  current_stage: 'viewing_scheduled',
  deal_amount: 2500000,
  commission_base_amount: 2500000,
  referrer_commission_type: 'percentage',
  referrer_commission_value: '1.00',
  referrer_commission_basis: 'sale_price',
  referrer_commission_amount: 25000,
};

const expectedViewing = {
  id: 1001,
  deal_id: 801,
  program_id: 901,
  development_id: 701,
  agent_id: 501,
  manager_user_id: 601,
  scheduled_start_at: '2030-01-01 10:00:00',
  timezone: 'Africa/Johannesburg',
  location_name: 'Preview Ridge Estate Showhouse',
  status: 'scheduled',
};

const expectedCommissionEntry = {
  id: 1101,
  deal_id: 801,
  program_id: 901,
  development_id: 701,
  agent_id: 501,
  trigger_stage: 'contract_signed',
  entry_status: 'pending',
  calculation_base_amount: 2500000,
  commission_percent: '1.00',
  commission_amount: 25000,
  currency: 'ZAR',
};

const deterministicUuid = (label: string): string => {
  const hex = stableDigest(label);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
};

const demoPublisher = {
  id: 1201,
  authority_kind: 'platform_reference',
  publisher_type: 'developer',
  name: 'Preview Demo Developer (Sample)',
  slug: 'distribution-preview-demo-ridge-estate-brand-v2',
  source_attribution: 'Property Listify governed preview fixture (synthetic demonstration data)',
  is_visible: 1,
};

const demoDevelopment = {
  id: 1202,
  catalogue_publisher_id: 1201,
  name: 'Preview Demo Ridge Estate (Sample)',
  marketing_name: 'Preview Demo Ridge Estate (Sample)',
  slug: 'distribution-preview-demo-ridge-estate-v2',
  developmentType: 'residential',
  city: 'Midrand',
  province: 'Gauteng',
  suburb: 'Waterfall',
  transaction_type: 'for_sale',
  isPublished: 1,
  publishedAt: '2026-01-01 08:00:00',
  approval_status: 'approved',
  status: 'selling',
  inventory_mode: 'itemized',
};

const demoUnitTypes = [
  {
    id: deterministicUuid('distribution-preview-demo-unit-2-bedroom-v2'),
    name: 'Sample 2-Bedroom Apartment',
    bedrooms: 2,
    bathrooms: '2.0',
    unit_size: 78,
    base_price_from: '1150000.00',
    available_units: 4,
    total_units: 6,
    display_order: 1,
    is_active: 1,
  },
  {
    id: deterministicUuid('distribution-preview-demo-unit-3-bedroom-v2'),
    name: 'Sample 3-Bedroom Apartment',
    bedrooms: 3,
    bathrooms: '2.0',
    unit_size: 105,
    base_price_from: '1650000.00',
    available_units: 2,
    total_units: 4,
    display_order: 2,
    is_active: 1,
  },
];

const demoProgram = {
  id: 1204,
  development_id: 1202,
  is_referral_enabled: 1,
  is_active: 1,
  commission_model: 'flat_percentage',
  default_commission_percent: '2.50',
  referrer_commission_type: 'percentage',
  referrer_commission_value: '2.50',
  referrer_commission_basis: 'sale_price',
  tier_access_policy: 'open',
  payout_milestone: 'transfer_registration',
  currency_code: 'ZAR',
};

const demoPartnership = { id: 1205, catalogue_publisher_id: 1201, status: 'active' };

const demoAccess = {
  id: 1206,
  development_id: 1202,
  brand_partnership_id: 1205,
  catalogue_publisher_id: 1201,
  status: 'included',
  submission_allowed: 1,
  excluded_by_mandate: 0,
  excluded_by_exclusivity: 0,
};

const demoManagerAssignment = {
  id: 1207,
  development_id: 1202,
  manager_user_id: 601,
  is_primary: 1,
  workload_capacity: 0,
  timezone: 'Africa/Johannesburg',
  is_active: 1,
};

const demoRequiredDocuments = [
  {
    id: 1208,
    document_code: 'id_document',
    document_label: 'Sample buyer ID document',
    category: 'client_required_document',
    sort_order: 1,
    is_required: 1,
    is_active: 1,
  },
  {
    id: 1209,
    document_code: 'proof_of_address',
    document_label: 'Sample proof of address',
    category: 'client_required_document',
    sort_order: 2,
    is_required: 1,
    is_active: 1,
  },
];

const demoIntakePolicy = {
  id: 1210,
  program_id: 1204,
  policy_version: 1,
  status: 'active',
  configuration: {},
  configuration_digest: 'f'.repeat(64),
  approval_reference: 'PREVIEW-DEMO-INTAKE-POLICY-V2',
  published_at: '2026-01-01 08:00:00',
};

describe('Distribution referrer activity preview adapter', () => {
  it('declares a versioned dashboard sample-activity plus governed demo fixture without touching grants', () => {
    expect(DISTRIBUTION_REFERRER_ACTIVITY_PREVIEW_VERSION).toBe(
      'distribution-referrer-activity-preview-v2',
    );
    expect(DISTRIBUTION_REFERRER_ACTIVITY_PREVIEW_DIGEST).toMatch(/^[a-f0-9]{64}$/);
    const source = readFileSync(
      join(
        process.cwd(),
        'server/_core/databaseAuthority/dataAdapters/distributionReferrerActivityPreviewFixture.ts',
      ),
      'utf8',
    );
    expect(source).toContain('assessAuthorizedDatabaseReadiness');
    expect(source).toContain('layers.schemaCongruent.state !== \'ready\'');
    expect(source).toContain('db:distribution-referrer-preview:prepare');
    expect(source).toContain('INSERT INTO catalogue_publishers');
    expect(source).toContain('INSERT INTO unit_types');
    expect(source).toContain('INSERT INTO distribution_referral_intake_policy_releases');
    expect(source).not.toMatch(/UPDATE\s+developments/i);
    expect(source).not.toMatch(/UPDATE\s+unit_types/i);
    expect(source).not.toMatch(/DELETE\s+FROM/i);
    expect(source).not.toMatch(
      /INSERT\s+INTO\s+distribution_(agent_access|commission_ledger|viewing_validations)/i,
    );
  });

  it.each([
    ['wrong host', { host: 'localhost' }],
    ['wrong port', { port: '3306' }],
    ['wrong database', { databaseName: 'listify_local' }],
    ['wrong classification', { targetClass: 'production' }],
    [
      'wrong ownership',
      {
        worktree: {
          expectedDatabase: EXPECTED_DATABASE,
          ownershipMatches: false,
        },
      },
    ],
  ])('rejects %s before provisioning', (_label, overrides) => {
    expect(() => assertDistributionReferrerActivityPreviewTarget(authority(overrides))).toThrow();
  });

  it('accepts only an exact-owned disposable worktree target', () => {
    expect(() => assertDistributionReferrerActivityPreviewTarget(authority())).not.toThrow();
  });

  it('requires the prepared individual referrer account as its only dependency', () => {
    expect(() => assertDistributionReferrerActivityDependency(null)).toThrow(
      'db:distribution-referrer-preview:prepare',
    );
    expect(() => assertDistributionReferrerActivityDependency(expectedReferrer)).not.toThrow();
    expect(() =>
      assertDistributionReferrerActivityDependency({ ...expectedReferrer, role: 'agent' }),
    ).toThrow('user base role');
  });

  it('creates or reuses only the exact sample manager account', () => {
    expect(classifyDistributionReferrerActivityManager(null)).toEqual({ state: 'created' });
    expect(classifyDistributionReferrerActivityManager(expectedManager)).toEqual({
      state: 'reused',
    });
    expect(() =>
      classifyDistributionReferrerActivityManager({
        ...expectedManager,
        email: 'someone-else@listify.local',
      }),
    ).toThrow('manager email');
  });

  it('creates or reuses only the exact unpublished sample development', () => {
    expect(classifyDistributionReferrerActivityDevelopment(null)).toEqual({ state: 'created' });
    expect(classifyDistributionReferrerActivityDevelopment(expectedDevelopment)).toEqual({
      state: 'reused',
    });
    expect(() => assertDistributionReferrerActivityDevelopment(expectedDevelopment)).not.toThrow();
    expect(() =>
      classifyDistributionReferrerActivityDevelopment({
        ...expectedDevelopment,
        name: 'Mall of Africa',
      }),
    ).toThrow('development name');
    expect(() =>
      classifyDistributionReferrerActivityDevelopment({
        ...expectedDevelopment,
        isPublished: 1,
      }),
    ).toThrow('development publication state');
  });

  it('creates or reuses only the exact restricted referral program', () => {
    expect(classifyDistributionReferrerActivityProgram(null, 701)).toEqual({ state: 'created' });
    expect(classifyDistributionReferrerActivityProgram(expectedProgram, 701)).toEqual({
      state: 'reused',
    });
    expect(() =>
      classifyDistributionReferrerActivityProgram(
        { ...expectedProgram, tier_access_policy: 'open' },
        701,
      ),
    ).toThrow('program tier access policy');
    expect(() =>
      classifyDistributionReferrerActivityProgram(expectedProgram, 702),
    ).toThrow('program development ID');
  });

  it('creates or reuses only the exact sample deal at the viewing_scheduled stage', () => {
    expect(classifyDistributionReferrerActivityDeal(null, dealIds)).toEqual({ state: 'created' });
    expect(classifyDistributionReferrerActivityDeal(expectedDeal, dealIds)).toEqual({
      state: 'reused',
    });
    expect(() =>
      classifyDistributionReferrerActivityDeal(
        { ...expectedDeal, current_stage: 'contract_signed' },
        dealIds,
      ),
    ).toThrow('deal stage');
    expect(() =>
      classifyDistributionReferrerActivityDeal({ ...expectedDeal, agent_id: 999 }, dealIds),
    ).toThrow('deal agent ID');
  });

  it('requires the scheduled sample viewing for the exact deal', () => {
    expect(() =>
      assertDistributionReferrerActivityViewing(expectedViewing, {
        dealId: 801,
        programId: 901,
        developmentId: 701,
        agentId: 501,
        managerId: 601,
      }),
    ).not.toThrow();
    expect(() =>
      assertDistributionReferrerActivityViewing(
        { ...expectedViewing, status: 'cancelled' },
        { dealId: 801, programId: 901, developmentId: 701, agentId: 501, managerId: 601 },
      ),
    ).toThrow('viewing status');
  });

  it('requires the pending pre-eligibility commission entry for the exact deal', () => {
    expect(() =>
      assertDistributionReferrerActivityCommissionEntry(expectedCommissionEntry, {
        dealId: 801,
        programId: 901,
        developmentId: 701,
        agentId: 501,
      }),
    ).not.toThrow();
    expect(() =>
      assertDistributionReferrerActivityCommissionEntry(
        { ...expectedCommissionEntry, entry_status: 'paid' },
        { dealId: 801, programId: 901, developmentId: 701, agentId: 501 },
      ),
    ).toThrow('commission entry status');
    expect(() =>
      assertDistributionReferrerActivityCommissionEntry(
        { ...expectedCommissionEntry, trigger_stage: 'bond_approved' },
        { dealId: 801, programId: 901, developmentId: 701, agentId: 501 },
      ),
    ).toThrow('commission entry trigger stage');
  });

  it('creates or reuses only the exact governed demo publisher', () => {
    expect(classifyDistributionReferrerActivityDemoPublisher(null)).toEqual({ state: 'created' });
    expect(classifyDistributionReferrerActivityDemoPublisher(demoPublisher)).toEqual({
      state: 'reused',
    });
    expect(() =>
      assertDistributionReferrerActivityDemoPublisher(demoPublisher),
    ).not.toThrow();
    expect(() =>
      classifyDistributionReferrerActivityDemoPublisher({
        ...demoPublisher,
        source_attribution: 'Some other attribution',
      }),
    ).toThrow('demo publisher source attribution');
  });

  it('creates or reuses only the exact published governed demo development', () => {
    expect(classifyDistributionReferrerActivityDemoDevelopment(null, 1201)).toEqual({
      state: 'created',
    });
    expect(classifyDistributionReferrerActivityDemoDevelopment(demoDevelopment, 1201)).toEqual({
      state: 'reused',
    });
    expect(() =>
      assertDistributionReferrerActivityDemoDevelopment(demoDevelopment, 1201),
    ).not.toThrow();
    expect(() =>
      classifyDistributionReferrerActivityDemoDevelopment(
        { ...demoDevelopment, name: 'Preview Ridge Estate' },
        1201,
      ),
    ).toThrow('demo development name');
    expect(() =>
      classifyDistributionReferrerActivityDemoDevelopment(
        { ...demoDevelopment, publishedAt: null },
        1201,
      ),
    ).toThrow('unpublished');
    expect(() =>
      classifyDistributionReferrerActivityDemoDevelopment(
        { ...demoDevelopment, catalogue_publisher_id: 999 },
        1201,
      ),
    ).toThrow('demo development publisher ID');
  });

  it('requires the exact governed demo unit-type set', () => {
    expect(() => assertDistributionReferrerActivityDemoUnitTypes(demoUnitTypes)).not.toThrow();
    expect(() => assertDistributionReferrerActivityDemoUnitTypes([demoUnitTypes[0]])).toThrow(
      'do not match the governed set',
    );
    expect(() =>
      assertDistributionReferrerActivityDemoUnitTypes([
        { ...demoUnitTypes[0], available_units: 5 },
        demoUnitTypes[1],
      ]),
    ).toThrow('demo unit type available units');
    expect(() =>
      assertDistributionReferrerActivityDemoUnitTypes([
        demoUnitTypes[0],
        { ...demoUnitTypes[1], name: 'Sample 4-Bedroom Apartment' },
      ]),
    ).toThrow('missing demo unit type');
  });

  it('creates or reuses only the exact open demo referral program', () => {
    expect(classifyDistributionReferrerActivityDemoProgram(null, 1202)).toEqual({
      state: 'created',
    });
    expect(classifyDistributionReferrerActivityDemoProgram(demoProgram, 1202)).toEqual({
      state: 'reused',
    });
    expect(() =>
      assertDistributionReferrerActivityDemoProgram(demoProgram, 1202),
    ).not.toThrow();
    expect(() =>
      classifyDistributionReferrerActivityDemoProgram(
        { ...demoProgram, tier_access_policy: 'restricted' },
        1202,
      ),
    ).toThrow('demo program tier access policy');
    expect(() =>
      classifyDistributionReferrerActivityDemoProgram(
        { ...demoProgram, is_referral_enabled: 0 },
        1202,
      ),
    ).toThrow('demo program referral state');
    expect(() =>
      classifyDistributionReferrerActivityDemoProgram(demoProgram, 1203),
    ).toThrow('demo program development ID');
  });

  it('creates or reuses only the exact active demo brand partnership', () => {
    expect(classifyDistributionReferrerActivityDemoPartnership(null, 1201)).toEqual({
      state: 'created',
    });
    expect(classifyDistributionReferrerActivityDemoPartnership(demoPartnership, 1201)).toEqual({
      state: 'reused',
    });
    expect(() =>
      classifyDistributionReferrerActivityDemoPartnership(
        { ...demoPartnership, status: 'pending' },
        1201,
      ),
    ).toThrow('demo partnership status');
  });

  it('requires the exact included demo development access grant', () => {
    const expected = {
      developmentId: 1202,
      brandPartnershipId: 1205,
      publisherId: 1201,
    };
    expect(classifyDistributionReferrerActivityDemoAccess(null, expected)).toEqual({
      state: 'created',
    });
    expect(classifyDistributionReferrerActivityDemoAccess(demoAccess, expected)).toEqual({
      state: 'reused',
    });
    expect(() => assertDistributionReferrerActivityDemoAccess(demoAccess, expected)).not.toThrow();
    expect(() =>
      assertDistributionReferrerActivityDemoAccess(
        { ...demoAccess, submission_allowed: 0 },
        expected,
      ),
    ).toThrow('demo access submission allowed');
    expect(() =>
      assertDistributionReferrerActivityDemoAccess(
        { ...demoAccess, excluded_by_mandate: 1 },
        expected,
      ),
    ).toThrow('demo access mandate exclusion');
  });

  it('requires the exact primary demo manager assignment', () => {
    const expected = { developmentId: 1202, managerUserId: 601 };
    expect(classifyDistributionReferrerActivityDemoManagerAssignment(null, expected)).toEqual({
      state: 'created',
    });
    expect(classifyDistributionReferrerActivityDemoManagerAssignment(demoManagerAssignment, expected)).toEqual({
      state: 'reused',
    });
    expect(() =>
      classifyDistributionReferrerActivityDemoManagerAssignment(
        { ...demoManagerAssignment, is_primary: 0 },
        expected,
      ),
    ).toThrow('demo manager assignment primary state');
    expect(() =>
      classifyDistributionReferrerActivityDemoManagerAssignment(
        { ...demoManagerAssignment, manager_user_id: 999 },
        expected,
      ),
    ).toThrow('demo manager assignment manager ID');
  });

  it('requires the exact governed demo required-document set', () => {
    expect(() =>
      assertDistributionReferrerActivityDemoRequiredDocuments(demoRequiredDocuments),
    ).not.toThrow();
    expect(() =>
      assertDistributionReferrerActivityDemoRequiredDocuments([demoRequiredDocuments[0]]),
    ).toThrow('exactly one demo document proof_of_address');
    expect(() =>
      assertDistributionReferrerActivityDemoRequiredDocuments([
        demoRequiredDocuments[0],
        { ...demoRequiredDocuments[1], document_label: 'Something else' },
      ]),
    ).toThrow('demo document label');
    expect(() =>
      assertDistributionReferrerActivityDemoRequiredDocuments([
        ...demoRequiredDocuments,
        {
          ...demoRequiredDocuments[0],
          id: 1211,
          document_code: 'proof_of_income',
        },
      ]),
    ).toThrow('do not match the governed set');
  });

  it('creates or reuses only the exact active demo intake policy release', () => {
    expect(classifyDistributionReferrerActivityDemoIntakePolicy(null, 1204)).toEqual({
      state: 'created',
    });
    expect(() =>
      classifyDistributionReferrerActivityDemoIntakePolicy(
        { ...demoIntakePolicy, program_id: 999 },
        1204,
      ),
    ).toThrow('demo intake policy program ID');
    expect(() =>
      assertDistributionReferrerActivityDemoIntakePolicy(
        { ...demoIntakePolicy, approval_reference: 'OTHER' },
        1204,
      ),
    ).toThrow('demo intake policy approval reference');
    expect(() =>
      assertDistributionReferrerActivityDemoIntakePolicy(
        { ...demoIntakePolicy, configuration_digest: 'a'.repeat(64) },
        1204,
      ),
    ).toThrow('demo intake policy configuration digest');
  });
});
