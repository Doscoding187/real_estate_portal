import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as South African Rand currency
 * @param amount - The amount to format (in ZAR)
 * @param options - Optional formatting options
 */
export function formatCurrency(
  amount: number,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    compact?: boolean;
  },
): string {
  if (options?.compact) {
    return formatZARCompact(amount);
  }

  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
  }).format(amount);
}

/**
 * SquareYards-style compact ZAR formatter
 * - Shows M for ≥ 1,000,000
 * - Shows k for ≥ 1,000
 * - Keeps 1 decimal only when needed (875000 → R875k, 1,250,000 → R1.3M)
 * - Strips trailing .0 (2.0M → R2M)
 */
export function formatZARCompact(value?: number | string | null): string {
  if (value === null || value === undefined) return 'R—';

  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n) || n <= 0) return 'R—';

  const abs = Math.abs(n);

  const fmt = (num: number, suffix: string) => {
    const oneDec = Math.round(num * 10) / 10; // 1 decimal
    const str = oneDec % 1 === 0 ? String(Math.trunc(oneDec)) : String(oneDec);
    return `R${str}${suffix}`;
  };

  if (abs >= 1_000_000) return fmt(n / 1_000_000, 'M');
  if (abs >= 1_000) return fmt(n / 1_000, 'k');
  return `R${Math.round(n)}`;
}

/**
 * Format a price range in compact SquareYards style
 */
export function formatPriceRangeCompact(
  from?: number | string | null,
  to?: number | string | null,
): string {
  const f = formatZARCompact(from);
  const t = formatZARCompact(to);

  // If either side is missing, just show the one that exists
  if (f === 'R—' && t === 'R—') return 'Price on request';
  if (f !== 'R—' && (t === 'R—' || to === from)) return `From ${f}`;
  return `${f} to ${t}`;
}
