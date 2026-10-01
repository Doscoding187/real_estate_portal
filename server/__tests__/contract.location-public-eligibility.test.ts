import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('location discovery commercial-expiry boundary', () => {
  it('rechecks map and heatmap candidates through canonical public eligibility', () => {
    const source = readRepoFile('server/locationRouter.ts');

    expect(source).toContain('resolvePublicPropertyEligibilityIds');
    expect(source.match(/resolvePublicPropertyEligibilityIds\(/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain('const candidateProperties = await db');
    expect(source).toContain('const candidateRows = await db');
  });

  it('does not paginate or aggregate enhanced-location rows before expiry filtering', () => {
    const source = readRepoFile('server/enhancedLocationRouter.ts');

    expect(source).toContain('const orderedCandidates = await orderedQuery');
    expect(source).toContain('const eligibleCandidates = orderedCandidates.filter');
    expect(source).toContain('const countsByCell = new Map<string, number>()');
    expect(source).toContain('resolvePublicPropertyEligibilityIds(candidateRows.map');
    expect(source).toContain('const similarCandidates = await db');
  });

  it('keeps generic public search and development discovery on canonical eligibility', () => {
    const source = readRepoFile('server/services/globalSearchService.ts');

    expect(source).toContain('resolvePublicPropertyEligibilityIds');
    expect(source).toContain('publicDevelopmentEligibilityConditions()');
    expect(source).toContain('const candidateRows =');
  });
});
