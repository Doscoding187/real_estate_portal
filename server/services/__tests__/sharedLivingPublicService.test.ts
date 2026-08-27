import { describe, expect, it } from 'vitest';
import { projectPublicSpace } from '../sharedLivingPublicService';

describe('projectPublicSpace', () => {
  it('preserves current JSON bill-inclusion facts in the public projection', () => {
    const projected = projectPublicSpace({
      placeId: 1,
      spaceId: 2,
      spaceSlug: 'review-space',
      label: 'Review space',
      accommodationType: 'private_room',
      marketTag: 'room_share',
      rentableAreaM2: 12,
      furnishedState: 'furnished',
      bathroomAccess: 'shared',
      parkingBays: 0,
      placeKind: 'house',
      suburbName: 'Sandton',
      cityName: 'Johannesburg',
      provinceName: 'Gauteng',
      latitude: null,
      longitude: null,
      geoPrecision: 'suburb',
      rentAmountMinor: 680000,
      rentUnknown: 0,
      billsIncludedJson: { electricity: true, water: true, wifi: true },
      depositMinor: null,
      availableFrom: '2026-09-01',
      description: null,
    });

    expect(projected.billsIncluded).toEqual({ electricity: true, water: true, wifi: true });
  });
});
