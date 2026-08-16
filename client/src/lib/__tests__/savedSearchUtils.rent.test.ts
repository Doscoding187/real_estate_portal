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
});
