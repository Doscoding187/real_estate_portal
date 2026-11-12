import { describe, expect, it } from 'vitest';
import {
  CARD_ASPECT,
  heightForWidth,
  selectWidths,
} from '../../../../scripts/images/categoryImageWidths.mjs';

describe('category image width selection', () => {
  it('keeps every target the card-ratio crop can supply', () => {
    expect(selectWidths(1920, 1080)).toEqual({
      widths: [320, 480, 720],
      skipped: [],
      cropWidth: 864,
    });
  });

  it('skips targets larger than the crop instead of upscaling', () => {
    const result = selectWidths(1050, 700);
    expect(result.widths).toEqual([320, 480]);
    expect(result.skipped).toEqual([720]);
    expect(result.cropWidth).toBe(560);
  });

  it('never exceeds the original width', () => {
    expect(selectWidths(400, 4000).widths).toEqual([320]);
  });

  it('keeps one output at the crop width when every target is too large', () => {
    expect(selectWidths(598, 334)).toEqual({
      widths: [267],
      skipped: [320, 480, 720],
      cropWidth: 267,
    });
  });

  it('derives the height from the card ratio', () => {
    expect(CARD_ASPECT).toBe(0.8);
    expect(heightForWidth(480)).toBe(600);
  });
});
