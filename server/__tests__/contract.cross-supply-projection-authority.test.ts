import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(path: string) {
  return readFileSync(path, 'utf8');
}

describe('cross-supply projection authority', () => {
  it('retires the legacy Commercial read and write service', () => {
    expect(existsSync('server/services/commercialOfficeService.ts')).toBe(false);
    const source = read('server/commercialOfficeRouter.ts');
    expect(source).toContain('canonicalPlaceId');
    expect(source).toContain('requireCanonicalCommercialAssignments');
    expect(source).not.toContain('commercialOfficeService');
  });

  it('retires the legacy Development listing projection', () => {
    expect(existsSync('server/services/developmentDerivedListingService.ts')).toBe(false);
    const source = read('server/services/publicDevelopmentSearchService.ts');
    expect(source).toContain('PUBLIC_DEVELOPMENT_CANONICAL_ASSIGNMENT_BLOCKER');
    expect(source).toContain('items: []');
  });

  it('keeps Shared Living public reads on its governed service boundary', () => {
    const source = read('server/sharedLivingRouter.ts');
    expect(source).not.toContain('properties.sourceListingId');
    expect(source).not.toContain('upsertCanonicalPublicPropertyProjection');
    expect(source).toContain('sharedLiving');
  });
});
