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

  it('keeps inventory and Development discovery on canonical Place eligibility', () => {
    const propertySearch = readRepoFile('server/services/propertySearchService.ts');
    const developmentSearch = readRepoFile('server/services/publicDevelopmentSearchService.ts');

    expect(propertySearch).toContain('properties.canonicalPlaceId');
    expect(propertySearch).toContain('resolvePublicPropertyEligibilities(');
    expect(propertySearch).toContain('loadCanonicalPlaceSearchProjection(');
    expect(developmentSearch).toContain('publicDevelopmentEligibilityConditions()');
    expect(developmentSearch).toContain('listDevelopmentIdsForCanonicalPlace(');
  });
});
