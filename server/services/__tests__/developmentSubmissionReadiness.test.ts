import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { validatePersistedSubmissionReadiness } from '../developmentSubmissionReadiness';

const validDevelopment = {
  name: 'Harbour Heights',
  address: '1 Harbour Road',
  description:
    'A valid persisted description that contains more than fifty characters for submission.',
  ownershipType: 'sectional-title',
  developmentType: 'residential',
  transactionType: 'for_sale',
  images: JSON.stringify([{ url: 'https://example.com/hero.jpg' }]),
  highlights: JSON.stringify(['One', 'Two', 'Three']),
};

const validUnit = {
  name: 'Two bedroom apartment',
  label: null,
  isActive: 1,
  totalUnits: 10,
  availableUnits: 10,
  reservedUnits: 0,
  priceFrom: '1000000',
  basePriceFrom: '1000000',
  monthlyRentFrom: null,
  monthlyRentTo: null,
  startingBid: null,
  auctionStartDate: null,
  auctionEndDate: null,
  reservePrice: null,
};

describe('development persisted submission readiness', () => {
  it('returns zero blockers for the same valid persisted data the submission mutation accepts', () => {
    expect(
      validatePersistedSubmissionReadiness(validDevelopment as never, [validUnit] as never),
    ).toEqual([]);
  });

  it('returns the exact persisted submission blocker for invalid data', () => {
    expect(
      validatePersistedSubmissionReadiness(
        { ...validDevelopment, description: '' } as never,
        [validUnit] as never,
      ),
    ).toEqual(
      expect.arrayContaining([
        { field: 'description', message: 'Description must contain at least 50 characters.' },
      ]),
    );
  });

  it('is the shared authority used by the DOE-S0 mutation and the Home query', () => {
    const service = readFileSync(
      path.resolve(process.cwd(), 'server/services/developmentService.ts'),
      'utf8',
    );
    const router = readFileSync(path.resolve(process.cwd(), 'server/developerRouter.ts'), 'utf8');

    expect(service).toContain("from './developmentSubmissionReadiness'");
    expect(router).toContain("from './services/developmentSubmissionReadiness'");
    expect(service).toContain(
      'validatePersistedSubmissionReadiness(ownedDevelopment, persistedUnits)',
    );
    expect(router).toContain('validatePersistedSubmissionReadiness(');
  });
});
