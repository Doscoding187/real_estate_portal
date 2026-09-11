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

  it('aggregates engagement metrics in SQL rather than loading event rows', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'server/services/exploreAnalyticsService.ts'),
      'utf8',
    );
    const aggregatePath = source.slice(
      source.indexOf('async getAggregatedMetrics('),
      source.indexOf('\n  }\n}\n\nexport const exploreAnalyticsService'),
    );

    expect(aggregatePath).toContain('COUNT(DISTINCT');
    expect(aggregatePath).toContain('SUM(CASE WHEN');
    expect(aggregatePath).toContain('JSON_EXTRACT');
    expect(aggregatePath).not.toContain('engagements.filter');
  });
});
