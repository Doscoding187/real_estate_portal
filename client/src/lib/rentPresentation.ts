/**
 * Rental presentation is driven only by the authoritative listing type
 * returned with the listing. It must not infer Rent from a route, property
 * type, or an unsupported journey value.
 */
export function isExplicitRentListing(listingType: unknown): boolean {
  return listingType === 'rent';
}

export function getPrivateListingContactCopy(listingType: unknown) {
  if (isExplicitRentListing(listingType)) {
    return {
      identity: 'Private Advertiser',
      action: 'Contact Advertiser',
      role: 'Private Advertiser',
      badge: 'Private Advertiser',
      section: 'Private Advertiser Contact',
      intro: 'You are contacting the private advertiser directly through Property Listify.',
    } as const;
  }

  return {
    identity: 'Private Seller',
    action: 'Contact Seller',
    role: 'Seller',
    badge: 'Owner Listed',
    section: 'Seller Contact',
    intro: 'You are contacting the owner directly through Property Listify.',
  } as const;
}

export function withRentalPeriod(priceLabel: string, listingType: unknown): string {
  if (!isExplicitRentListing(listingType) || priceLabel === 'Price on request') {
    return priceLabel;
  }

  return `${priceLabel} / month`;
}
