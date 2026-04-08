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

describe('distribution manager visibility boundaries', () => {
  it('owner-scopes manager listViewings for non-admin actors', () => {
    const managerSection = section(
      'const managerDistributionRouter = router({',
      'const partnerDistributionRouter = router({',
    );
    const listViewings = section(
      'listViewings: protectedProcedure',
      'scheduleViewing: protectedProcedure',
      source.indexOf('const managerDistributionRouter = router({'),
    );

    expect(managerSection).toContain('const managerDistributionRouter = router({');
    expect(listViewings).toContain('conditions.push(eq(distributionViewings.managerUserId, ctx.user!.id));');
  });

  it('owner-scopes manager listValidationQueue for non-admin actors', () => {
    const listValidationQueue = section(
      'listValidationQueue: protectedProcedure',
      'validateViewing: protectedProcedure',
      source.indexOf('const managerDistributionRouter = router({'),
    );

    expect(listValidationQueue).toContain('conditions.push(eq(distributionDeals.managerUserId, ctx.user!.id));');
  });

  it('owner-scopes manager listPipeline for non-admin actors', () => {
    const listPipeline = section(
      'listPipeline: protectedProcedure.input(listDealsInput).query(async ({ ctx, input }) => {',
      '// Manager-controlled deal stage progression',
      source.indexOf('const managerDistributionRouter = router({'),
    );

    expect(listPipeline).toContain('conditions.push(eq(distributionDeals.managerUserId, ctx.user!.id));');
  });
});
