import { describe, expect, it } from 'vitest';
import {
  getPrivateListingContactCopy,
  isExplicitRentListing,
  withRentalPeriod,
} from '@/lib/rentPresentation';

describe('rental presentation authority', () => {
  it('adds a monthly qualifier only for an explicit rent listing type', () => {
    expect(isExplicitRentListing('rent')).toBe(true);
    expect(withRentalPeriod('R 12 000', 'rent')).toBe('R 12 000 / month');
    expect(withRentalPeriod('R 1 200 000', 'sale')).toBe('R 1 200 000');
  });

  it.each(['shared_living', 'developments', 'plot_land', 'commercial', 'unknown', undefined])(
    'does not turn unsupported listing state %s into Rent presentation',
    listingType => {
      expect(isExplicitRentListing(listingType)).toBe(false);
      expect(withRentalPeriod('R 12 000', listingType)).toBe('R 12 000');
    },
  );

  it('does not append a rental period to an unavailable price', () => {
    expect(withRentalPeriod('Price on request', 'rent')).toBe('Price on request');
  });

  it('uses fetched listing type rather than stale Rent context for detail presentation', () => {
    const staleSearchJourney = 'rent';

    expect(isExplicitRentListing(staleSearchJourney)).toBe(true);
    expect(isExplicitRentListing('sale')).toBe(false);
    expect(withRentalPeriod('R 1,200,000', 'sale')).toBe('R 1,200,000');
    expect(getPrivateListingContactCopy('sale')).toMatchObject({
      identity: 'Private Seller',
      action: 'Contact Seller',
    });
    expect(getPrivateListingContactCopy('rent')).toMatchObject({
      identity: 'Private Advertiser',
      action: 'Contact Advertiser',
    });
  });
});
