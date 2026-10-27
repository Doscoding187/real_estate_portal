import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('map inventory uses the canonical public search path', () => {
  it('does not expose legacy map, heatmap, or duplicate location router paths', () => {
    const locationRouter = readRepoFile('server/locationRouter.ts');
    const rootRouter = readRepoFile('server/routers.ts');

    expect(locationRouter).not.toContain('getPropertiesOnMap:');
    expect(locationRouter).not.toContain('getPropertyHeatmap:');
    expect(locationRouter).not.toContain('calculateDistance:');
    expect(rootRouter).not.toContain('enhancedLocation');
  });

  it('keeps generic public search and development discovery on canonical eligibility', () => {
    const source = readRepoFile('server/services/globalSearchService.ts');

    expect(source).toContain('resolvePublicPropertyEligibilityIds');
    expect(source).toContain('publicDevelopmentEligibilityConditions()');
    expect(source).toContain('const candidateRows =');
  });
});
