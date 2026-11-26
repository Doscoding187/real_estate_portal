import * as listingDb from '../db';

export interface ClosedPublicPropertyNotice {
  status: 'sold' | 'let';
  title: string;
  location: string;
  listingIntent: 'sale' | 'rent';
}

/**
 * A home that its lister has marked Sold or Let is no longer public supply:
 * search, rails, counts, the sitemap, place statistics and enquiries all
 * exclude it. Its direct URL stays reachable with a minimal, truthful notice
 * only (no price, no agent, no enquiry path), so a shared link does not
 * advertise an unavailable home.
 *
 * Only properties that are projected from a source listing in the same
 * closed state qualify; anything else (unpublished, draft, unknown) returns
 * null and the caller renders the ordinary not-available state.
 */
export async function resolveClosedPublicPropertyNotice(
  propertyId: number,
  dataSource: {
    getPropertyById(id: number): Promise<any>;
    getListingById(id: number): Promise<any>;
  } = listingDb,
): Promise<ClosedPublicPropertyNotice | null> {
  if (!Number.isSafeInteger(propertyId) || propertyId <= 0) return null;
  const property = await dataSource.getPropertyById(propertyId);
  if (!property || Number(property.id) !== propertyId) return null;
  const status = property.status === 'sold' ? 'sold' : property.status === 'rented' ? 'let' : null;
  if (!status || property.sourceListingId == null) return null;

  const listing = await dataSource.getListingById(Number(property.sourceListingId));
  const expectedListingStatus = status === 'sold' ? 'sold' : 'rented';
  if (
    !listing ||
    listing.status !== expectedListingStatus ||
    listing.revisionOfListingId != null ||
    listing.approvalStatus !== 'approved' ||
    ['plot', 'land', 'commercial'].includes(String(listing.propertyType))
  ) {
    return null;
  }

  const location = [...new Set([listing.suburb, listing.city].filter(Boolean))].join(', ');
  return {
    status,
    title: String(listing.title || property.title || 'Property'),
    location,
    listingIntent: status === 'sold' ? 'sale' : 'rent',
  };
}
