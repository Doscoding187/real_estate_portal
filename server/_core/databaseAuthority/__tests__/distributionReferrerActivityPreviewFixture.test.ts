import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertDistributionReferrerActivityCommissionEntry,
  assertDistributionReferrerActivityDependency,
  assertDistributionReferrerActivityDevelopment,
  assertDistributionReferrerActivityPreviewTarget,
  assertDistributionReferrerActivityViewing,
  classifyDistributionReferrerActivityDeal,
  classifyDistributionReferrerActivityDevelopment,
  classifyDistributionReferrerActivityManager,
  classifyDistributionReferrerActivityProgram,
  DISTRIBUTION_REFERRER_ACTIVITY_PREVIEW_DIGEST,
  DISTRIBUTION_REFERRER_ACTIVITY_PREVIEW_VERSION,
} from '../dataAdapters/distributionReferrerActivityPreviewFixture';

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

describe('Distribution referrer activity preview adapter', () => {
  it('declares a versioned dashboard sample-activity fixture without touching inventory or grants', () => {
    expect(DISTRIBUTION_REFERRER_ACTIVITY_PREVIEW_VERSION).toBe(
      'distribution-referrer-activity-preview-v1',
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
    expect(source).not.toMatch(/UPDATE\s+developments/i);
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
});
