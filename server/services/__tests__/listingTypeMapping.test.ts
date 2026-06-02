import { describe, expect, it } from 'vitest';

import { mapPropertyListingTypeToTransactionType } from '../listingTypeMapping';

describe('property listing type mutation mapping', () => {
  it.each([
    ['sale', 'sale'],
    ['rent', 'rent'],
    ['rent_to_buy', 'rent'],
    ['shared_living', 'rent'],
    ['auction', 'auction'],
  ] as const)('maps %s listing mutations to %s transaction type', (listingType, transactionType) => {
    expect(mapPropertyListingTypeToTransactionType(listingType)).toBe(transactionType);
  });
});
