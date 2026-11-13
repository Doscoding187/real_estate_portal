export const CARD_ASPECT: number;
export const TARGET_WIDTHS: number[];
export function selectWidths(
  originalWidth: number,
  originalHeight: number,
  targets?: number[],
  aspect?: number,
): { widths: number[]; skipped: number[]; cropWidth: number };
export function heightForWidth(width: number, aspect?: number): number;
