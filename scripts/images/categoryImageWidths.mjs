/** Card aspect ratio (width / height). Tall 7:10 portrait (owner reference, 2026-11-12: about 210 x 300). */
export const CARD_ASPECT = 7 / 10;

/** Widths the card srcset asks for. */
export const TARGET_WIDTHS = [320, 480, 720];

/**
 * Chooses the output widths for one original. The crop to the card ratio is
 * taken from the original, so the largest honest output width is the width of
 * that crop (never more than the original width). Targets above it are skipped
 * rather than upscaled. If every target is skipped, one output at the crop
 * width is kept so the card always has an image.
 *
 * @param {number} originalWidth
 * @param {number} originalHeight
 * @param {number[]} [targets]
 * @param {number} [aspect]
 * @returns {{ widths: number[], skipped: number[], cropWidth: number }}
 */
export function selectWidths(
  originalWidth,
  originalHeight,
  targets = TARGET_WIDTHS,
  aspect = CARD_ASPECT,
) {
  const cropWidth = Math.floor(Math.min(originalWidth, originalHeight * aspect) + 1e-9);
  const widths = targets.filter(width => width <= cropWidth);
  const skipped = targets.filter(width => width > cropWidth);
  if (widths.length === 0 && cropWidth > 0) widths.push(cropWidth);
  return { widths, skipped, cropWidth };
}

/** Output height for a width at the card ratio. */
export function heightForWidth(width, aspect = CARD_ASPECT) {
  return Math.round(width / aspect);
}
