import { describe, expect, it } from 'vitest';
import { canonicalPlaceRuntimeGrantPlan } from '../canonicalPlaceRuntimeGrants';

describe('retained canonical Place runtime grant release', () => {
  it('refuses to extend its reviewed footprint after the canonical inventory changes', () => {
    expect(() => canonicalPlaceRuntimeGrantPlan()).toThrow(
      'Place runtime grant plan refused: canonical table inventory changed.',
    );
  });
});
