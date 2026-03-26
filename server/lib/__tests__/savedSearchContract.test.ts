import { describe, expect, it } from 'vitest';
import {
  normalizeSavedSearch,
  serializeSavedSearchCriteria,
} from '../savedSearchContract';

describe('savedSearchContract', () => {
  it('normalizes delivery preferences and strips metadata from criteria', () => {
    const result = normalizeSavedSearch({
      id: 11,
      userId: 7,
      name: 'Cape Town rentals',
      criteria: {
        city: 'Cape Town',
        listingType: 'rent',
        __deliveryPreferences: {
          emailEnabled: false,
          inAppEnabled: true,
        },
      },
      notificationFrequency: 'daily',
      createdAt: '2026-03-21T10:00:00.000Z',
      updatedAt: '2026-03-21T10:00:00.000Z',
      lastNotifiedAt: null,
    } as any);

    expect(result).toMatchObject({
      criteria: {
        city: 'Cape Town',
        listingType: 'rent',
      },
      emailEnabled: false,
      inAppEnabled: true,
    });
  });

  it('serializes delivery preferences into criteria metadata', () => {
    const result = serializeSavedSearchCriteria(
      {
        city: 'Johannesburg',
        __deliveryPreferences: {
          emailEnabled: false,
          inAppEnabled: false,
        },
      },
      {
        emailEnabled: true,
        inAppEnabled: false,
      },
    );

    expect(result).toEqual({
      city: 'Johannesburg',
      __deliveryPreferences: {
        emailEnabled: true,
        inAppEnabled: false,
      },
    });
  });
});
