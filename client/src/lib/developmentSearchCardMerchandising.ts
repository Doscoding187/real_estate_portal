export type DevelopmentSearchCardListingType = 'sale' | 'rent' | 'auction';

export function normalizeDevelopmentSearchCardListingType(
  value?: string | null,
): DevelopmentSearchCardListingType {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (['rent', 'rental', 'to_rent', 'for_rent', 'rent_to_buy'].includes(normalized)) {
    return 'rent';
  }
  if (['auction', 'auctions'].includes(normalized)) return 'auction';
  return 'sale';
}

function toNonNegativeInt(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.trunc(parsed));
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function getDevelopmentSearchCardAvailabilityLabel(input: {
  listingType?: DevelopmentSearchCardListingType | null;
  totalUnits?: number | null;
  availableUnits?: number | null;
  auctionStatus?: string | null;
}): string | null {
  const listingType = normalizeDevelopmentSearchCardListingType(input.listingType);
  const availableUnits = toNonNegativeInt(input.availableUnits);
  const totalUnits = toNonNegativeInt(input.totalUnits);
  const auctionStatus = String(input.auctionStatus || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (listingType === 'auction') {
    if (auctionStatus === 'sold') return 'Sold at auction';
    if (auctionStatus === 'passed_in') return 'Passed in';
    if (auctionStatus === 'withdrawn') return 'Withdrawn';
    if (auctionStatus === 'active') return 'Auction active';
    if (auctionStatus === 'registration_open') return 'Registration open';
    if (availableUnits === null) return null;
    if (availableUnits > 0) return `${pluralize(availableUnits, 'lot')} open`;
    return totalUnits && totalUnits > 0 ? 'Registration closed' : 'Auction availability on request';
  }

  if (availableUnits === null) return null;

  if (listingType === 'rent') {
    if (availableUnits > 0) return `${pluralize(availableUnits, 'rental')} available`;
    return totalUnits && totalUnits > 0 ? 'Fully let' : 'Rental availability on request';
  }

  if (availableUnits > 0) return `${availableUnits} available`;
  return totalUnits && totalUnits > 0 ? 'Sold out' : 'Availability on request';
}

export function getDevelopmentSearchCardContactLabel(input: {
  listingType?: DevelopmentSearchCardListingType | null;
  isDevelopmentListing?: boolean;
  isPrivateListing?: boolean;
}): string {
  if (!input.isDevelopmentListing) {
    return input.isPrivateListing ? 'Contact Seller' : 'Contact Agent';
  }

  const listingType = normalizeDevelopmentSearchCardListingType(input.listingType);
  if (listingType === 'rent') return 'Contact Leasing Team';
  if (listingType === 'auction') return 'Contact Auction Team';
  return 'Contact Developer';
}
