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
  it('checks approved photos before selecting the homepage candidate page', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'server/services/propertySearchService.ts'),
      'utf8',
    );
    const photoCheck = source.indexOf('resolution.images.some');
    const pageSelection = source.indexOf('eligiblePageIds = eligibleIds.slice');
    expect(photoCheck).toBeGreaterThan(0);
    expect(pageSelection).toBeGreaterThan(photoCheck);
  });
  it('keeps every manual homepage feed branch on canonical public-only search', () => {
    const source = readFileSync(path.resolve(process.cwd(), 'server/developerRouter.ts'), 'utf8');
    const start = source.indexOf('getHomeTrendingFeed: publicProcedure');
    const end = source.indexOf('getPublicDevelopmentBySlug: publicProcedure', start);
    const homeFeed = source.slice(start, end);
    const manualSearchCalls = extractBalancedCalls(
      homeFeed,
      'propertySearchService.searchProperties',
    );

    expect(manualSearchCalls.length).toBeGreaterThanOrEqual(1);
    manualSearchCalls.forEach(call => {
      expect(call).toContain('publicOnly: true');
      expect(call).toContain('requirePhoto: true');
      expect(call).toContain('canonicalPlaceIds: [input.canonicalPlaceId]');
    });
  });

  it('accepts only the canonical Place feed contract', () => {
    const source = readFileSync(path.resolve(process.cwd(), 'server/developerRouter.ts'), 'utf8');
    const start = source.indexOf('getHomeTrendingFeed: publicProcedure');
    const end = source.indexOf('getPublicDevelopmentBySlug: publicProcedure', start);
    const homeFeed = source.slice(start, end);

    expect(homeFeed).toContain("tab: z.enum(['buy', 'rent', 'developments'])");
    expect(homeFeed).toContain('canonicalPlaceId: z.string()');
    expect(homeFeed).toContain('.strict()');
    expect(homeFeed).not.toMatch(/\b(province|city|suburb):/);
  });

  it('keeps the selected Place exact and never widens an empty result', () => {
    const source = readFileSync(path.resolve(process.cwd(), 'server/developerRouter.ts'), 'utf8');
    const start = source.indexOf('getHomeTrendingFeed: publicProcedure');
    const end = source.indexOf('getPublicDevelopmentBySlug: publicProcedure', start);
    const homeFeed = source.slice(start, end);

    expect(homeFeed).toContain('canonicalPlaceIds: [input.canonicalPlaceId]');
    expect(homeFeed).toContain('canonicalPlaceId: input.canonicalPlaceId');
    expect(homeFeed).toContain('usedFallback: false');
    expect(homeFeed).not.toContain('locationCandidates');
  });
});
