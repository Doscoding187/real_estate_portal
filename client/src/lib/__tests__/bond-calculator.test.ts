import { describe, expect, it } from 'vitest';
import { SA_PRIME_RATE_LABEL, calculateTransferCosts } from '../bond-calculator';
import { estimateTransferDuty } from '../transferDuty';

describe('bond-calculator', () => {
  it('uses the shared transfer duty estimate', () => {
    for (const price of [900_000, 1_500_000, 2_500_000, 5_000_000]) {
      expect(calculateTransferCosts(price).transferDuty).toBe(estimateTransferDuty(price));
    }
  });

  it('labels the default rate as an example', () => {
    expect(SA_PRIME_RATE_LABEL).toBe('Example rate — check the current rate with your bank');
  });
});
