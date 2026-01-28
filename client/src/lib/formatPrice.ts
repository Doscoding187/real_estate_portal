/**
 * Price formatting utilities for South African Rands
 * Provides compact and full formatting options
 */

/**
 * Format currency for South African Rands with full precision
 */
export function formatSARand(amount: number): string {
  return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format currency without decimals
 */
export function formatSARandShort(amount: number): string {
  return `R ${Math.round(amount).toLocaleString('en-ZA')}`;
}

/**
 * Format price in compact notation (R2M, R800k, R45k)
 * Used for cards and summary displays
 */
export function formatPriceCompact(amount: number | null | undefined): string {
  // Handle invalid inputs
  if (amount === null || amount === undefined || amount <= 0) {
    return 'Price on Request';
  }

  const absAmount = Math.abs(amount);

  // Millions (R1M+)
  if (absAmount >= 1_000_000) {
    const millions = absAmount / 1_000_000;
    // Show one decimal if it's not a whole number
    const formatted = millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1);
    return `R${formatted}M`;
  }

  // Thousands (R1k+)
  if (absAmount >= 1_000) {
    const thousands = absAmount / 1_000;
    // Show one decimal if it's not a whole number
    const formatted = thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1);
    return `R${formatted}k`;
  }

  // Less than R1k (unlikely for property, but handle it)
  return `R${Math.round(absAmount).toLocaleString('en-ZA')}`;
}

/**
 * Format price range in compact notation
 */
export function formatPriceRange(
  from: number | null | undefined,
  to: number | null | undefined,
): string {
  const fromFormatted = formatPriceCompact(from);

  // If no valid 'to' price, return single price
  if (!to || to <= 0 || to === from) {
    return fromFormatted;
  }

  const toFormatted = formatPriceCompact(to);
  return `${fromFormatted} - ${toFormatted}`;
}
