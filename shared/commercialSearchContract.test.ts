import { describe, expect, it } from 'vitest';
import {
  parseCommercialSearchParams,
  sanitizeCommercialSearchFilters,
  serializeCommercialSearchParams,
} from './commercialSearchContract';

describe('Commercial public search contract', () => {
  it('keeps coherent space ranges and business-ready filters', () => {
    expect(
      sanitizeCommercialSearchFilters({
        minAreaM2: '250',
        maxAreaM2: '750',
        maxMonthlyBudget: '100000',
        availability: 'now',
        fitOutCondition: ' fitted ',
        backupPower: '1',
        backupWater: true,
        fibreConnectivity: '0',
        minParkingBays: '4',
        unsupported: 'ignored',
      }),
    ).toEqual({
      minAreaM2: 250,
      maxAreaM2: 750,
      maxMonthlyBudget: 100000,
      availability: 'now',
      fitOutCondition: 'fitted',
      backupPower: true,
      backupWater: true,
      minParkingBays: 4,
    });
  });

  it('drops contradictory or invalid values instead of widening the search', () => {
    expect(
      sanitizeCommercialSearchFilters({
        minAreaM2: 800,
        maxAreaM2: 200,
        availability: 'any',
        maxMonthlyBudget: '-1',
        minParkingBays: 'not-a-number',
      }),
    ).toEqual({});
  });

  it('round-trips only supported URL fields and boolean flags', () => {
    const params = new URLSearchParams(
      'minAreaM2=250&maxMonthlyBudget=100000&availability=future&backupPower=1&unknown=value',
    );
    const parsed = parseCommercialSearchParams(params);

    expect(parsed).toEqual({
      minAreaM2: 250,
      maxMonthlyBudget: 100000,
      availability: 'future',
      backupPower: true,
    });
    expect(serializeCommercialSearchParams(parsed).toString()).toBe(
      'minAreaM2=250&maxMonthlyBudget=100000&availability=future&backupPower=1',
    );
  });
});
