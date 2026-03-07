import { readFileSync } from 'node:fs';
import { TRPCError } from '@trpc/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProgramReadiness } from '../services/distributionProgramReadinessService';

const source = readFileSync(new URL('../distributionRouter.ts', import.meta.url), 'utf8');

const { mockGetDb, mockUpdate, mockSet, mockWhere, mockGetProgramReadinessByDevelopmentId } =
  vi.hoisted(() => ({
    mockGetDb: vi.fn(),
    mockUpdate: vi.fn(),
    mockSet: vi.fn(),
    mockWhere: vi.fn(),
    mockGetProgramReadinessByDevelopmentId: vi.fn(),
  }));

vi.mock('../db', () => ({
  getDb: mockGetDb,
}));

vi.mock('../services/distributionProgramReadinessService', () => ({
  getProgramReadinessByDevelopmentId: mockGetProgramReadinessByDevelopmentId,
}));

import { appRouter } from '../routers';

function section(startMarker: string, endMarker: string, fromIndex = 0) {
  const start = source.indexOf(startMarker, fromIndex);
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

function buildReadyReadiness(overrides: Partial<ProgramReadiness> = {}): ProgramReadiness {
  return {
    developmentId: 1001,
    programId: 501,
    canEnableReferral: true,
    blockers: [],
    state: {
      programExists: true,
      isActive: true,
      isReferralEnabled: false,
      commissionModel: 'flat_percentage',
      defaultCommissionPercent: 2.5,
      defaultCommissionAmount: null,
      payoutMilestone: 'attorney_signing',
      currencyCode: 'ZAR',
      tierAccessPolicy: 'restricted',
      hasActivePrimaryManager: true,
      requiredDocsCount: 2,
      requiredRequiredDocsCount: 1,
    },
    ...overrides,
  };
}

async function callEnable(developmentId: number, enabled: boolean) {
  const caller = appRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: { id: 1, role: 'super_admin' },
  } as any);
  return await caller.distribution.admin.setProgramReferralEnabled({ developmentId, enabled });
}

describe('distributionRouter transactional boundaries', () => {
  it('keeps admin stage transitions atomic', () => {
    const adminTransition = section(
      'transitionDealStage: superAdminProcedure',
      'listDeals: superAdminProcedure',
    );
    expect(adminTransition).toContain('await db.transaction(async tx => {');
    expect(adminTransition).toContain('.update(distributionDeals)');
    expect(adminTransition).toContain('ensureCommissionEntryForDeal');
    expect(adminTransition).toContain('.insert(distributionDealEvents)');
  });

  it('keeps admin commission status updates atomic', () => {
    const adminUpdate = section(
      'updateCommissionEntryStatus: superAdminProcedure',
      'const managerDistributionRouter = router({',
    );
    expect(adminUpdate).toContain('await db.transaction(async tx => {');
    expect(adminUpdate).toContain('.update(distributionCommissionEntries)');
    expect(adminUpdate).toContain('.update(distributionDeals)');
    expect(adminUpdate).toContain('.insert(distributionDealEvents)');
  });

  it('keeps referrer submitDeal writes inside a single transaction', () => {
    const referrerSection = section(
      'const referrerDistributionRouter = router({',
      'const developerDistributionRouter = router({',
    );
    const submitDealSection = section('submitDeal: protectedProcedure', 'advanceDealStage: protectedProcedure');
    expect(submitDealSection).toContain('await db.transaction(async tx => {');
    expect(submitDealSection).toContain('.insert(distributionDeals)');
    expect(submitDealSection).toContain('.update(distributionDeals)');
    expect(submitDealSection).toContain('.insert(distributionDealEvents)');
    expect(referrerSection).toContain("submittedVia: 'referrer.submitDeal'");
    expect(source).not.toContain('if (insertedDealId > 0)');
  });

  it('keeps referrer cancellation stage transition atomic', () => {
    const referrerSection = section(
      'const referrerDistributionRouter = router({',
      'const developerDistributionRouter = router({',
    );
    const referrerAdvance = section(
      'Referrer: cancel-only. All forward progression is manager-controlled.',
      'myPipeline: protectedProcedure',
      source.indexOf('const referrerDistributionRouter = router({'),
    );
    expect(referrerSection).toContain("source: 'referrer.advanceDealStage'");
    expect(referrerAdvance).toContain('await db.transaction(async tx => {');
    expect(referrerAdvance).toContain('.update(distributionDeals)');
    expect(referrerAdvance).toContain('.insert(distributionDealEvents)');
  });

  it('keeps manager stage transition atomic', () => {
    const managerSection = section(
      'const managerDistributionRouter = router({',
      'const referrerDistributionRouter = router({',
    );
    const managerAdvance = section(
      'advanceDealStage: protectedProcedure',
      'const referrerDistributionRouter = router({',
      source.indexOf('const managerDistributionRouter = router({'),
    );
    expect(managerSection).toContain("source: 'manager.advanceDealStage'");
    expect(managerAdvance).toContain('await db.transaction(async tx => {');
    expect(managerAdvance).toContain('.update(distributionDeals)');
    expect(managerAdvance).toContain('ensureCommissionEntryForDeal');
    expect(managerAdvance).toContain('.insert(distributionDealEvents)');
  });
});

describe('distribution.admin.setProgramReferralEnabled readiness gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FEATURE_DISTRIBUTION_NETWORK = 'true';

    mockWhere.mockResolvedValue({ affectedRows: 1 });
    mockSet.mockReturnValue({ where: mockWhere });
    mockUpdate.mockReturnValue({ set: mockSet });
    mockGetDb.mockResolvedValue({
      update: mockUpdate,
    });
  });

  async function expectBlocked(readiness: ProgramReadiness, blockerCode: string) {
    mockGetProgramReadinessByDevelopmentId.mockResolvedValue(readiness);

    const error = (await callEnable(readiness.developmentId, true).catch(err => err)) as TRPCError & {
      data?: {
        errorCode: string;
        blockers: Array<{ code: string; message: string }>;
      };
    };

    expect(error).toBeInstanceOf(TRPCError);
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.data?.errorCode).toBe('PROGRAM_NOT_READY');
    expect(error.data?.blockers).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: blockerCode })]),
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  }

  it('fails when no program exists', async () => {
    await expectBlocked(
      buildReadyReadiness({
        canEnableReferral: false,
        programId: null,
        blockers: [
          {
            code: 'PROGRAM_MISSING',
            message: 'Create a partner program for this development before enabling referrals.',
          },
        ],
        state: {
          ...buildReadyReadiness().state,
          programExists: false,
          isActive: false,
        },
      }),
      'PROGRAM_MISSING',
    );
  });

  it('fails when program is inactive', async () => {
    await expectBlocked(
      buildReadyReadiness({
        canEnableReferral: false,
        blockers: [
          {
            code: 'PROGRAM_INACTIVE',
            message: 'Activate the program before enabling referrals.',
          },
        ],
        state: {
          ...buildReadyReadiness().state,
          isActive: false,
        },
      }),
      'PROGRAM_INACTIVE',
    );
  });

  it('fails when commission is missing for flat_percentage', async () => {
    await expectBlocked(
      buildReadyReadiness({
        canEnableReferral: false,
        blockers: [
          {
            code: 'COMMISSION_MISSING',
            message: 'Set a default commission percentage greater than 0.',
          },
        ],
        state: {
          ...buildReadyReadiness().state,
          commissionModel: 'flat_percentage',
          defaultCommissionPercent: null,
        },
      }),
      'COMMISSION_MISSING',
    );
  });

  it('fails when payout milestone is missing', async () => {
    await expectBlocked(
      buildReadyReadiness({
        canEnableReferral: false,
        blockers: [
          {
            code: 'PAYOUT_MILESTONE_MISSING',
            message: 'Choose when payout is triggered for this program.',
          },
        ],
        state: {
          ...buildReadyReadiness().state,
          payoutMilestone: null,
        },
      }),
      'PAYOUT_MILESTONE_MISSING',
    );
  });

  it('fails when no primary active manager is assigned', async () => {
    await expectBlocked(
      buildReadyReadiness({
        canEnableReferral: false,
        blockers: [
          {
            code: 'MANAGER_MISSING',
            message: 'Assign an active primary manager to this development.',
          },
        ],
        state: {
          ...buildReadyReadiness().state,
          hasActivePrimaryManager: false,
        },
      }),
      'MANAGER_MISSING',
    );
  });

  it('fails when required docs are missing', async () => {
    await expectBlocked(
      buildReadyReadiness({
        canEnableReferral: false,
        blockers: [
          {
            code: 'REQUIRED_DOCS_MISSING',
            message: 'Add at least one active required document template for this development.',
          },
        ],
        state: {
          ...buildReadyReadiness().state,
          requiredDocsCount: 0,
          requiredRequiredDocsCount: 0,
        },
      }),
      'REQUIRED_DOCS_MISSING',
    );
  });

  it('succeeds when all readiness requirements are satisfied', async () => {
    const readiness = buildReadyReadiness();
    mockGetProgramReadinessByDevelopmentId.mockResolvedValue(readiness);

    const result = await callEnable(readiness.developmentId, true);

    expect(result).toMatchObject({
      success: true,
      developmentId: readiness.developmentId,
      programId: readiness.programId,
      enabled: true,
    });
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});
