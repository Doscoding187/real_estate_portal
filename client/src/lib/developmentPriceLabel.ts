/** The compact price the development cards show: "R1.93m", "R16k". */
export function formatDevelopmentCardPrice(price: number): string {
  const compactPrice = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 3,
  }).format(price);
  return `R${compactPrice.toLowerCase()}`;
}

/** "R1.93m" for sale, "R16k / month" for rent (same wording as the cards). */
export function developmentPriceLabel(
  price: number,
  transactionType: 'for_sale' | 'for_rent' | string | null | undefined,
): string {
  return `${formatDevelopmentCardPrice(price)}${transactionType === 'for_rent' ? ' / month' : ''}`;
}
