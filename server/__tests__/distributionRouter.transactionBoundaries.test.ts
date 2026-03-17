import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// This file intentionally asserts against the router source to keep key
// invariants from regressing without needing a DB-backed test harness.
const source = readFileSync(new URL('../distributionRouter.ts', import.meta.url), 'utf8');

function section(startMarker: string, endMarker: string, fromIndex = 0) {
  const start = source.indexOf(startMarker, fromIndex);
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('distributionRouter source invariants', () => {
  it('admin.transitionDealStage performs stage update + commission ensure + audit/event logging', () => {
    const adminTransition = section(
      'transitionDealStage: superAdminProcedure',
      'listDeals: superAdminProcedure',
    );
    expect(adminTransition).toContain('.update(distributionDeals)');
    expect(adminTransition).toContain('ensureCommissionEntryForDeal');
    expect(adminTransition).toContain('.insert(distributionDealEvents)');
    expect(adminTransition).toContain("source: 'admin.transitionDealStage'");
    expect(adminTransition).toContain("eventType: input.force ? 'override' : 'stage_transition'");
  });

  it('admin.updateCommissionEntryStatus updates entry + deal and logs an override event', () => {
    const adminUpdate = section(
      'updateCommissionEntryStatus: superAdminProcedure',
      'const managerDistributionRouter = router({',
    );
    expect(adminUpdate).toContain('.update(distributionCommissionEntries)');
    expect(adminUpdate).toContain('.update(distributionDeals)');
    expect(adminUpdate).toContain('.insert(distributionDealEvents)');
    expect(adminUpdate).toContain("source: 'admin.updateCommissionEntryStatus'");
    expect(adminUpdate).toContain("eventType: 'override'");
  });

  it('referrer.submitDeal enforces submission eligibility before manager assignment', () => {
    const referrerSection = section(
      'const referrerDistributionRouter = router({',
      'const developerDistributionRouter = router({',
    );
    const submitDealSection = section(
      'submitDeal: protectedProcedure',
      'advanceDealStage: protectedProcedure',
      referrerSection.indexOf('submitDeal: protectedProcedure'),
    );
    expect(submitDealSection).toContain('await assertDevelopmentSubmissionEligible({');
    expect(submitDealSection.indexOf('await assertDevelopmentSubmissionEligible({')).toBeLessThan(
      submitDealSection.indexOf('const managerUserId = await getPrimaryManagerUserIdForProgram'),
    );
    expect(referrerSection).toContain("submittedVia: 'referrer.submitDeal'");
    expect(source).not.toContain('if (insertedDealId > 0)');
  });
});
