import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(path: string) {
  return readFileSync(path, 'utf8');
}

describe('cross-supply projection authority', () => {
  it('keeps dedicated Commercial projection flow out of generic properties', () => {
    const source = read('server/services/commercialOfficeService.ts');
    expect(source).not.toContain('upsertCanonicalPublicPropertyProjection');
    expect(source).toContain('listingMedia');
    expect(source).toContain('submitCommercialForReview');
  });

  it('keeps Development derived rows on the development identity', () => {
    const source = read('server/services/developmentDerivedListingService.ts');
    expect(source).not.toContain('upsertCanonicalPublicPropertyProjection');
    expect(source).toContain('development');
    expect(source).toContain('unit');
  });

  it('keeps Shared Living public reads on its governed service boundary', () => {
    const source = read('server/sharedLivingRouter.ts');
    expect(source).not.toContain('properties.sourceListingId');
    expect(source).not.toContain('upsertCanonicalPublicPropertyProjection');
    expect(source).toContain('sharedLiving');
  });
});
