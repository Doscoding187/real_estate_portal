import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('explore analytics authority boundary', () => {
  it('does not convert a missing canonical schema into zero-valued success data', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'server/services/exploreAnalyticsService.ts'),
      'utf8',
    );

    expect(source).toContain("code: 'PRECONDITION_FAILED'");
    expect(source).toContain('canonical schema is established');
    expect(source).not.toContain('returning empty metrics');
    expect(source).not.toContain('function emptyAggregatedMetrics');
  });
});
