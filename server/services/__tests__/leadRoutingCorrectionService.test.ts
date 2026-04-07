import { describe, expect, it } from 'vitest';

import { correctLeadRouting } from '../leadRoutingCorrectionService';

describe('leadRoutingCorrectionService', () => {
  it('exports the correction entry point', () => {
    expect(typeof correctLeadRouting).toBe('function');
  });
});
