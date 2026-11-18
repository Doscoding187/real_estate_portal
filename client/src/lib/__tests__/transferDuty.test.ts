import { describe, expect, it } from 'vitest';
import { estimateTransferDuty, TRANSFER_DUTY_LABEL } from '../transferDuty';

describe('estimateTransferDuty (SARS, effective 1 March 2025)', () => {
  it('is zero up to and including R1,210,000', () => {
    expect(estimateTransferDuty(0)).toBe(0);
    expect(estimateTransferDuty(1_000_000)).toBe(0);
    expect(estimateTransferDuty(1_210_000)).toBe(0);
  });

  it('charges 3% above R1,210,000', () => {
    expect(estimateTransferDuty(1_210_001)).toBe(0);
    expect(estimateTransferDuty(1_500_000)).toBe(8_700);
    expect(estimateTransferDuty(1_663_800)).toBe(13_614);
  });

  it('charges R13,614 + 6% above R1,663,800', () => {
    expect(estimateTransferDuty(2_000_000)).toBe(33_786);
    expect(estimateTransferDuty(2_329_300)).toBe(53_544);
  });

  it('charges R53,544 + 8% above R2,329,300', () => {
    expect(estimateTransferDuty(2_500_000)).toBe(67_200);
    expect(estimateTransferDuty(2_994_800)).toBe(106_784);
  });

  it('charges R106,784 + 11% above R2,994,800', () => {
    expect(estimateTransferDuty(5_000_000)).toBe(327_356);
    expect(estimateTransferDuty(13_310_000)).toBe(1_241_456);
  });

  it('charges R1,241,456 + 13% above R13,310,000', () => {
    expect(estimateTransferDuty(15_000_000)).toBe(1_461_156);
  });

  it('ignores invalid values', () => {
    expect(estimateTransferDuty(Number.NaN)).toBe(0);
    expect(estimateTransferDuty(-5)).toBe(0);
  });

  it('carries the dated label', () => {
    expect(TRANSFER_DUTY_LABEL).toBe(
      'Transfer duty estimate using SARS rates effective 1 March 2025',
    );
  });
});
