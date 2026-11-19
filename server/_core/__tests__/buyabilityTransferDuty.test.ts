import { describe, expect, it } from 'vitest';
import { estimateTransferDuty } from '@shared/transferDuty';
import { calculateTotalAcquisitionCosts } from '../buyabilityCalculator';

describe('buyabilityCalculator transfer duty', () => {
  it.each([1_000_000, 1_500_000, 2_500_000, 15_000_000])(
    'uses the shared SARS scale at %i',
    value => {
      expect(calculateTotalAcquisitionCosts(value).transferDuty).toBe(estimateTransferDuty(value));
    },
  );
});
