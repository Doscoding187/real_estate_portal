import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

function extractBalancedCalls(source: string, expression: string): string[] {
  const calls: string[] = [];
  let cursor = 0;

  while (cursor < source.length) {
    const start = source.indexOf(expression, cursor);
    if (start < 0) break;
    const openingParenthesis = source.indexOf('(', start + expression.length);
    let depth = 0;
    let end = openingParenthesis;
    for (; end < source.length; end += 1) {
      if (source[end] === '(') depth += 1;
      if (source[end] === ')') depth -= 1;
      if (depth === 0) break;
    }
    calls.push(source.slice(start, end + 1));
    cursor = end + 1;
  }

  return calls;
}

describe('public Buy entry eligibility contract', () => {
  it('keeps every manual homepage feed branch on canonical public-only search', () => {
    const source = readFileSync(path.resolve(process.cwd(), 'server/developerRouter.ts'), 'utf8');
    const start = source.indexOf('getHomeTrendingFeed: publicProcedure');
    const end = source.indexOf('getPublicDevelopmentBySlug: publicProcedure', start);
    const homeFeed = source.slice(start, end);
    const manualSearchCalls = extractBalancedCalls(
      homeFeed,
      'propertySearchService.searchProperties',
    );

    expect(manualSearchCalls).toHaveLength(2);
    manualSearchCalls.forEach(call => {
      expect(call).toContain('{ publicOnly: true }');
    });
  });
});
