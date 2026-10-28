import { describe, expect, it, vi } from 'vitest';
import {
  focusListingNavbarLocationInput,
  LISTING_NAVBAR_LOCATION_INPUT_IDS,
} from '../ListingNavbar';
import { buildPropertySearchUrl } from '@/lib/heroJourneySearch';
import { resolveSearchIntent } from '@/lib/searchIntent';

const johannesburgId = 'pl-place-01-21f154cd5d0954c29ec7525f';
const sandtonId = 'pl-place-01-dee61758ef3bda7cd1a258ad';

describe('ListingNavbar canonical Place selection', () => {
  it('submits exactly the selected canonical Place identity', () => {
    const href = buildPropertySearchUrl({
      transactionType: 'for-sale',
      selectedLocations: [
        {
          canonicalPlaceId: sandtonId,
          parentCanonicalPlaceId: johannesburgId,
          name: 'Sandton',
          slug: 'sandton',
          type: 'suburb',
        },
      ],
    });
    const url = new URL(href, 'https://listify.test');
    const intent = resolveSearchIntent(url.pathname, {}, url.searchParams);

    expect(url.searchParams.get('canonicalPlaceId')).toBe(sandtonId);
    expect(url.searchParams.get('locationId')).toBeNull();
    expect(url.searchParams.get('locationIds')).toBeNull();
    expect(intent.geography).toEqual({ level: 'canonical_place', canonicalPlaceId: sandtonId });
  });

  it('rejects a retired numeric geography key instead of interpreting it as Place identity', () => {
    const intent = resolveSearchIntent(
      '/property-for-sale',
      {},
      new URLSearchParams('locationId=suburb%3A34'),
    );

    expect(intent.validation?.code).toBe('invalid-place-authority');
    expect(intent.geography).toEqual({ level: 'country' });
  });

  it('focuses the visible mobile refinement input before the hidden desktop input', () => {
    const desktopInput = document.createElement('input');
    desktopInput.id = LISTING_NAVBAR_LOCATION_INPUT_IDS.desktop;
    const mobileInput = document.createElement('input');
    mobileInput.id = LISTING_NAVBAR_LOCATION_INPUT_IDS.mobile;
    mobileInput.scrollIntoView = vi.fn();
    document.body.append(desktopInput, mobileInput);

    expect(focusListingNavbarLocationInput(true)).toBe(true);
    expect(document.activeElement).toBe(mobileInput);
    expect(mobileInput.scrollIntoView).toHaveBeenCalledTimes(1);

    desktopInput.remove();
    mobileInput.remove();
  });
});
