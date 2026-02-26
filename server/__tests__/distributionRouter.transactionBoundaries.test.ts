import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../distributionRouter.ts', import.meta.url), 'utf8');

function section(startMarker: string, endMarker: string, fromIndex = 0) {
  const start = source.indexOf(startMarker, fromIndex);
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
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
    expect(referrerSection).toContain('submittedVia: \'referrer.submitDeal\'');
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
    expect(referrerSection).toContain('source: \'referrer.advanceDealStage\'');
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
    expect(managerSection).toContain('source: \'manager.advanceDealStage\'');
    expect(managerAdvance).toContain('await db.transaction(async tx => {');
    expect(managerAdvance).toContain('.update(distributionDeals)');
    expect(managerAdvance).toContain('ensureCommissionEntryForDeal');
    expect(managerAdvance).toContain('.insert(distributionDealEvents)');
  });
});
