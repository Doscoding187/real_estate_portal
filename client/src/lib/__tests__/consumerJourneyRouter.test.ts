import { describe, expect, it } from 'vitest';
import {
  buildConsumerJourneyUrl,
  getConsumerJourneys,
  resolveConsumerJourney,
} from '@/lib/consumerJourneyRouter';

const sandton = {
  id: 'pl-place-01-000000000000000000000001',
  canonicalLocationId: 'pl-place-01-000000000000000000000001',
  type: 'suburb' as const,
  name: 'Sandton',
  slug: 'sandton',
  provinceSlug: 'gauteng',
  citySlug: 'johannesburg',
  parentCanonicalLocationId: 'pl-place-01-000000000000000000000002',
};
const johannesburg = {
  id: 'pl-place-01-000000000000000000000002',
  canonicalLocationId: 'pl-place-01-000000000000000000000002',
  type: 'city' as const,
  name: 'Johannesburg',
  slug: 'johannesburg',
  provinceSlug: 'gauteng',
  citySlug: 'johannesburg',
  parentCanonicalLocationId: 'pl-place-01-000000000000000000000010',
};
const capeTown = {
  id: 'pl-place-01-000000000000000000000003',
  canonicalLocationId: 'pl-place-01-000000000000000000000003',
  type: 'city' as const,
  name: 'Cape Town',
  slug: 'cape-town',
  provinceSlug: 'western-cape',
  citySlug: 'cape-town',
  parentCanonicalLocationId: 'pl-place-01-000000000000000000000011',
};
const pretoria = {
  id: 'pl-place-01-000000000000000000000004',
  canonicalLocationId: 'pl-place-01-000000000000000000000004',
  type: 'city' as const,
  name: 'Pretoria',
  slug: 'pretoria',
  provinceSlug: 'gauteng',
  citySlug: 'pretoria',
  parentCanonicalLocationId: 'pl-place-01-000000000000000000000010',
};

describe('consumer journey router', () => {
  it('exposes only executable Buy choices', () => {
    expect(getConsumerJourneys('buy').map(item => item.key)).toEqual([
      'residential',
      'land',
      'farm',
    ]);
    expect(resolveConsumerJourney('buy', 'commercial')).toBeUndefined();
    expect(resolveConsumerJourney('buy', 'land')?.destination).toBe('/plots-and-land');
  });

  it('keeps residential Buy semantics in the existing search authority', () => {
    expect(
      buildConsumerJourneyUrl({
        intent: 'buy',
        journey: 'residential',
        selectedLocations: [sandton],
        propertyType: 'house',
        minBedrooms: 3,
      }),
    ).toContain('/property-for-sale');
    expect(
      buildConsumerJourneyUrl({
        intent: 'buy',
        journey: 'residential',
        selectedLocations: [sandton],
        propertyType: 'house',
        minBedrooms: 3,
      }),
    ).toContain('minBedrooms=3');
  });

  it('preserves one canonical Land geography authority and rejects mixed authorities', () => {
    const requests = [
      {
        intent: 'buy' as const,
        journey: 'land' as const,
        selectedLocations: [capeTown],
        landClassification: 'residential_stand',
      },
      {
        intent: 'buy' as const,
        journey: 'land' as const,
        selectedLocations: [johannesburg],
        landClassification: 'Agricultural',
      },
      { intent: 'buy' as const, journey: 'land' as const, selectedLocations: [sandton] },
      {
        intent: 'buy' as const,
        journey: 'land' as const,
        selectedLocations: [johannesburg, pretoria],
      },
      {
        intent: 'buy' as const,
        journey: 'land' as const,
        searchScope: { kind: 'search_area', searchAreaId: 'area-1' } as never,
      },
      {
        intent: 'buy' as const,
        journey: 'land' as const,
        selectedLocations: [sandton],
        searchScope: { kind: 'search_area', searchAreaId: 'area-1' } as never,
      },
    ];

    expect(buildConsumerJourneyUrl(requests[0])).toBe(
      '/plots-and-land?canonicalPlaceId=pl-place-01-000000000000000000000003&classification=residential_stand',
    );
    expect(buildConsumerJourneyUrl(requests[1])).toBe(
      '/plots-and-land?canonicalPlaceId=pl-place-01-000000000000000000000002',
    );
    expect(buildConsumerJourneyUrl(requests[2])).toBe(
      '/plots-and-land?canonicalPlaceId=pl-place-01-000000000000000000000001',
    );
    const siblings = new URL(buildConsumerJourneyUrl(requests[3]), 'https://example.com');
    expect(siblings.searchParams.getAll('canonicalPlaceIds')).toEqual([
      'pl-place-01-000000000000000000000002',
      'pl-place-01-000000000000000000000004',
    ]);
    expect(siblings.searchParams.has('city')).toBe(false);
    expect(buildConsumerJourneyUrl(requests[4])).toBe(
      '/plots-and-land?searchError=unsupported-location-scope',
    );
    expect(buildConsumerJourneyUrl(requests[5])).toBe(
      '/plots-and-land?searchError=unsupported-location-scope',
    );
  });

  it('routes Farms & Smallholdings to its dedicated specialist journey', () => {
    expect(resolveConsumerJourney('buy', 'farm')?.status).toBe('E2E_READY');
    expect(resolveConsumerJourney('rent', 'farm')?.destination).toBe('/farms-and-smallholdings');

    const href = buildConsumerJourneyUrl({
      intent: 'buy',
      journey: 'farm',
      selectedLocations: [sandton],
      minSize: 10000,
    });
    expect(href).toContain('/farms-and-smallholdings');
    expect(href).toContain('listingType=sale');
    expect(href).toContain('canonicalPlaceId=pl-place-01-000000000000000000000001');
    expect(href).toContain('minLandSize=10000');
    expect(href).not.toContain('propertyType=');
  });

  it('fails closed on unsupported Farm geography instead of widening into a Homes search', () => {
    expect(buildConsumerJourneyUrl({ intent: 'rent', journey: 'farm' })).toBe(
      '/farms-and-smallholdings?searchError=unsupported-location-scope',
    );
  });

  it('exposes Commercial only for the executable rental authority', () => {
    expect(resolveConsumerJourney('buy', 'commercial')).toBeUndefined();
    expect(
      buildConsumerJourneyUrl({
        intent: 'rent',
        journey: 'commercial',
        selectedLocations: [sandton],
      }),
    ).toBe('/commercial?canonicalPlaceId=pl-place-01-000000000000000000000001');
    const commercialSiblingScope = buildConsumerJourneyUrl({
      intent: 'rent',
      journey: 'commercial',
      selectedLocations: [johannesburg, capeTown],
    });
    expect(commercialSiblingScope).toContain('searchError=unsupported-location-scope');
  });

  it('forwards only supported Commercial decisions with canonical location identity', () => {
    const href = buildConsumerJourneyUrl({
      intent: 'rent',
      journey: 'commercial',
      selectedLocations: [sandton],
      commercialFilters: {
        minAreaM2: 250,
        maxMonthlyBudget: 100_000,
        availability: 'now',
        minParkingBays: 4,
        backupPower: true,
      },
    });

    expect(href).toBe(
      '/commercial?canonicalPlaceId=pl-place-01-000000000000000000000001&minAreaM2=250&maxMonthlyBudget=100000&availability=now&backupPower=1&minParkingBays=4',
    );
  });

  it('continues to reject unsupported Commercial search-area handoffs', () => {
    expect(
      buildConsumerJourneyUrl({
        intent: 'rent',
        journey: 'commercial',
        selectedLocations: [sandton],
        searchScope: { kind: 'search_area', searchAreaId: 'area-1' } as never,
      }),
    ).toContain('searchError=unsupported-location-scope');
  });
});
