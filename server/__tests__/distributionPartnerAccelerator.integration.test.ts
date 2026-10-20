import { beforeEach, describe, expect, it } from 'vitest';
import { appRouter } from '../routers';

const caller = appRouter.createCaller({
  req: { headers: {} },
  res: {},
  user: { id: 1, role: 'agent' },
} as any);

const assessmentId = '00000000-0000-4000-8000-000000000000';

beforeEach(() => {
  process.env.FEATURE_DISTRIBUTION_NETWORK = 'true';
});

describe('distribution.partner accelerator retirement', () => {
  it('fails closed for income-based affordability assessments', async () => {
    await expect(
      caller.distribution.partner.createAffordabilityAssessment({
        grossIncomeMonthly: 50_000,
        deductionsMonthly: 0,
        depositAmount: 100_000,
        locationFilter: { province: 'Gauteng' },
      }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: expect.stringContaining('Income-based opportunity matching is not available yet'),
    });
  });

  it('fails closed for stored assessments and matches', async () => {
    await expect(
      caller.distribution.partner.getAffordabilityAssessment({ assessmentId }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
    await expect(
      caller.distribution.partner.getAffordabilityMatches({ assessmentId }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });

  it('fails closed for qualification pack exports', async () => {
    await expect(
      caller.distribution.partner.exportQualificationPackPdf({ assessmentId }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
    await expect(
      caller.distribution.partner.exportQualificationPackPdfForReferral({ dealId: 1 }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });

  it('fails closed for credit report requests', async () => {
    await expect(
      caller.distribution.partner.requestCreditCheckPlaceholder({
        assessmentId,
        consentGiven: true,
      }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: expect.stringContaining('Credit reports cannot be requested yet'),
    });
  });
});
