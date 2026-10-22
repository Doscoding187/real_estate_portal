import { describe, expect, it } from 'vitest';
import { legalRuntimeGrantPlan } from '../legalRuntimeGrantPlan';

describe('Offline B15 runtime grant delta', () => {
  it('refuses its historical grant plan after the canonical model advances', () => {
    expect(() => legalRuntimeGrantPlan()).toThrow(
      'Place runtime grant plan refused: canonical table inventory changed.',
    );
  });
});
