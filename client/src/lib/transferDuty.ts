/**
 * South African transfer duty estimate (SARS brackets effective 1 March 2025).
 * Assumes the sale is not subject to VAT. This is an estimate, not a quote.
 */
export const TRANSFER_DUTY_LABEL = 'Transfer duty estimate using SARS rates effective 1 March 2025';

type TransferDutyBracket = {
  /** Value above which this bracket applies (exclusive lower bound). */
  floor: number;
  /** Duty payable at the floor. */
  base: number;
  /** Marginal rate applied to the value above the floor. */
  rate: number;
};

const TRANSFER_DUTY_BRACKETS: readonly TransferDutyBracket[] = [
  { floor: 0, base: 0, rate: 0 },
  { floor: 1_210_000, base: 0, rate: 0.03 },
  { floor: 1_663_800, base: 13_614, rate: 0.06 },
  { floor: 2_329_300, base: 53_544, rate: 0.08 },
  { floor: 2_994_800, base: 106_784, rate: 0.11 },
  { floor: 13_310_000, base: 1_241_456, rate: 0.13 },
];

export function estimateTransferDuty(propertyValue: number): number {
  if (!Number.isFinite(propertyValue) || propertyValue <= 0) return 0;
  let bracket = TRANSFER_DUTY_BRACKETS[0];
  for (const candidate of TRANSFER_DUTY_BRACKETS) {
    if (propertyValue > candidate.floor) bracket = candidate;
  }
  return Math.round(bracket.base + (propertyValue - bracket.floor) * bracket.rate);
}
