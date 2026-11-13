import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'server/db.ts'), 'utf8');
const commercialRouter = readFileSync(
  resolve(process.cwd(), 'server/commercialOfficeRouter.ts'),
  'utf8',
);

describe('Commercial listing publication boundary', () => {
  it('validates every governed public Commercial lease class, not Office only', () => {
    const resolverStart = source.indexOf('async function resolveCommercialListingApplicability(');
    const resolverEnd = source.indexOf(
      'async function validateCommercialListingPricing(',
      resolverStart,
    );
    const resolver = source.slice(resolverStart, resolverEnd);

    expect(resolver).toContain('isCommercialSpaceClass(space.spaceClass)');
    expect(resolver).toContain("availability.transactionType !== 'lease'");
    expect(resolver).toContain("kind: 'canonical_commercial'");
    expect(resolver).not.toContain("space.spaceClass !== 'office'");
    expect(source).toContain('validateCommercialListingPricing(db, listingId)');
    expect(source).not.toContain('validateCommercialOfficeListingPricing');
  });

  it('answers Commercial public reads with nothing found while authoring stays held', () => {
    const searchStart = commercialRouter.indexOf('  search: publicProcedure');
    const publicReads = commercialRouter.slice(searchStart);
    expect(commercialRouter).toContain('canonicalPlaceId');
    expect(publicReads).toContain('.query(() => [] as never[])');
    expect(publicReads).toContain("code: 'NOT_FOUND'");
    expect(publicReads).not.toContain('PRECONDITION_FAILED');
    expect(publicReads).not.toContain('requireCanonicalCommercialAssignments');
    // Authoring remains held.
    expect(commercialRouter).toContain('requireCanonicalCommercialAssignments');
    expect(commercialRouter).toContain('PRECONDITION_FAILED');
    expect(commercialRouter).not.toContain('commercialOfficeService');
  });
});
