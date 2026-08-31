import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'server/db.ts'), 'utf8');
const commercialSource = readFileSync(
  resolve(process.cwd(), 'server/services/commercialOfficeService.ts'),
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

  it('requires the Listing Engine published state for public Commercial reads', () => {
    const resolverStart = commercialSource.indexOf('async function publicCommercialRows(');
    const resolverEnd = commercialSource.indexOf(
      '/**\n * Converts completed, governed Listing media',
      resolverStart,
    );
    const resolver = commercialSource.slice(resolverStart, resolverEnd);

    expect(resolver).toContain("eq(listings.status, 'published')");
    expect(resolver).not.toContain("inArray(listings.status, ['approved', 'published'])");
  });
});
