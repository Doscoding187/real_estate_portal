import { describe, expect, it } from 'vitest';
import { legalRuntimeGrantPlan } from '../legalRuntimeGrantPlan';

describe('offline B15 runtime grant delta', () => {
  it('refuses the retained grant operation after the canonical inventory changes', () => {
    expect(() => legalRuntimeGrantPlan()).toThrow(
      'Place runtime grant plan refused: canonical table inventory changed.',
    );
  });
});
