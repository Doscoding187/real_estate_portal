import { describe, expect, it } from 'vitest';

import {
  RENTAL_TERMS_VERSION,
  createDefaultRentalTerms,
  normalizeRentalTerms,
  validateRentalTerms,
} from '../rental-terms-contract';

describe('rental terms contract', () => {
  it('uses explicit unknowns for a new rental rather than guessing from legacy fields', () => {
    expect(createDefaultRentalTerms()).toEqual({
      version: RENTAL_TERMS_VERSION,
      availability: { status: 'to_confirm' },
      lease: { status: 'to_confirm' },
      utilities: 'to_confirm',
      furnishing: 'to_confirm',
    });
    expect(normalizeRentalTerms({ utilitiesIncluded: 0, leaseTerms: '12 months' })).toBeUndefined();
  });

  it('normalizes complete, tenant-facing terms', () => {
    expect(
      normalizeRentalTerms({
        version: RENTAL_TERMS_VERSION,
        availability: { status: 'available_from', date: '2026-09-01' },
        lease: { status: 'fixed_term', minimumMonths: 12 },
        utilities: 'partially_included',
        furnishing: 'partly_furnished',
        ignoredFutureField: 'does not cross the contract boundary',
      }),
    ).toEqual({
      version: RENTAL_TERMS_VERSION,
      availability: { status: 'available_from', date: '2026-09-01' },
      lease: { status: 'fixed_term', minimumMonths: 12 },
      utilities: 'partially_included',
      furnishing: 'partly_furnished',
    });
  });

  it('rejects malformed dates and invalid fixed lease periods', () => {
    expect(
      normalizeRentalTerms({
        version: RENTAL_TERMS_VERSION,
        availability: { status: 'available_from', date: '2026-02-30' },
        lease: { status: 'fixed_term', minimumMonths: 12 },
        utilities: 'included',
        furnishing: 'furnished',
      }),
    ).toBeUndefined();
    expect(
      validateRentalTerms(
        {
          version: RENTAL_TERMS_VERSION,
          availability: { status: 'available_now' },
          lease: { status: 'fixed_term', minimumMonths: 0 },
          utilities: 'included',
          furnishing: 'furnished',
        },
        { mode: 'publish' },
      ),
    ).toHaveLength(1);
  });

  it('requires the contract before a rental can publish but permits an unfinished draft', () => {
    expect(validateRentalTerms(undefined, { mode: 'draft' })).toEqual([]);
    expect(validateRentalTerms(undefined, { mode: 'publish' })).toEqual([
      expect.objectContaining({ field: 'rentalTerms' }),
    ]);
  });
});
