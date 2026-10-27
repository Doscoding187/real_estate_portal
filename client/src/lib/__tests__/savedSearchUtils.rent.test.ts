import { describe, expect, it } from 'vitest';

import {
  getSavedSearchNotificationDescription,
  getSavedSearchSourceLabel,
} from '@/lib/savedSearchUtils';

describe('Rent saved-search presentation', () => {
  it('uses rental terminology when the saved search is a Rent journey', () => {
    expect(getSavedSearchSourceLabel({ listingType: 'rent' })).toBe('Rental Listings');
    expect(
      getSavedSearchSourceLabel({ listingType: 'rent', listingSource: 'development' }),
    ).toBe('Rental Developments');
  });

  it('keeps notification copy explicit about rental results', () => {
    expect(
      getSavedSearchNotificationDescription(
        { listingType: 'rent' },
        'weekly',
        { emailEnabled: true, inAppEnabled: true },
      ),
    ).toContain('rental listings');
  });

  it('does not turn display-text geography into a saved-search location', () => {
    const description = getSavedSearchNotificationDescription({
      listingType: 'rent',
      city: 'legacy city',
      suburb: 'legacy suburb',
      province: 'legacy province',
    });

    expect(description).toContain('rental listings');
    expect(description).not.toContain('legacy city');
    expect(description).not.toContain('legacy suburb');
    expect(description).not.toContain('legacy province');
  });
});
