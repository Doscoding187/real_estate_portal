import { describe, expect, it } from 'vitest';
import {
  buildConsumerJourneyUrl,
  getConsumerJourneys,
  resolveConsumerJourney,
} from '@/lib/consumerJourneyRouter';

const sandton = {
  id: 'suburb:34', canonicalLocationId: 'suburb:34', type: 'suburb' as const,
  name: 'Sandton', slug: 'sandton', provinceSlug: 'gauteng', citySlug: 'johannesburg',
};
const johannesburg = {
  id: 'city:12', canonicalLocationId: 'city:12', type: 'city' as const,
  name: 'Johannesburg', slug: 'johannesburg', provinceSlug: 'gauteng', citySlug: 'johannesburg',
};
const capeTown = {
  id: 'city:21', canonicalLocationId: 'city:21', type: 'city' as const,
  name: 'Cape Town', slug: 'cape-town', provinceSlug: 'western-cape', citySlug: 'cape-town',
};
const pretoria = {
  id: 'city:13', canonicalLocationId: 'city:13', type: 'city' as const,
  name: 'Pretoria', slug: 'pretoria', provinceSlug: 'gauteng', citySlug: 'pretoria',
};

describe('consumer journey router', () => {
  it('exposes only executable Buy choices', () => {
    expect(getConsumerJourneys('buy').map(item => item.key)).toEqual(['residential', 'farm']);
    expect(resolveConsumerJourney('buy', 'commercial')).toBeUndefined();
    expect(resolveConsumerJourney('buy', 'land')).toBeUndefined();
  });

  it('keeps residential Buy semantics in the existing search authority', () => {
    expect(buildConsumerJourneyUrl({ intent: 'buy', journey: 'residential', selectedLocations: [sandton], propertyType: 'house', minBedrooms: 3 })).toContain('/property-for-sale');
    expect(buildConsumerJourneyUrl({ intent: 'buy', journey: 'residential', selectedLocations: [sandton], propertyType: 'house', minBedrooms: 3 })).toContain('minBedrooms=3');
  });

  it('hands every stale Land request to the contained direct route without forwarding geography or filters', () => {
    const requests = [
      { intent: 'buy' as const, journey: 'land' as const, selectedLocations: [capeTown], landClassification: 'residential_stand' },
      { intent: 'buy' as const, journey: 'land' as const, selectedLocations: [johannesburg], landClassification: 'Agricultural' },
      { intent: 'buy' as const, journey: 'land' as const, selectedLocations: [sandton] },
      { intent: 'buy' as const, journey: 'land' as const, selectedLocations: [johannesburg, pretoria] },
      { intent: 'buy' as const, journey: 'land' as const, searchScope: { kind: 'search_area' as const, searchAreaId: 'area-1' } },
      {
        intent: 'buy' as const,
        journey: 'land' as const,
        selectedLocations: [sandton],
        searchScope: { kind: 'search_area' as const, searchAreaId: 'area-1' },
      },
    ];

    for (const request of requests) {
      expect(buildConsumerJourneyUrl(request)).toBe('/plots-and-land');
    }
  });

  it('routes Farms & Smallholdings to its dedicated specialist journey', () => {
    expect(resolveConsumerJourney('buy', 'farm')?.status).toBe('E2E_READY');
    expect(resolveConsumerJourney('rent', 'farm')?.destination).toBe('/farms-and-smallholdings');

    const href = buildConsumerJourneyUrl({ intent: 'buy', journey: 'farm', selectedLocations: [sandton], minSize: 10000 });
    expect(href).toContain('/farms-and-smallholdings');
    expect(href).toContain('listingType=sale');
    expect(href).toContain('locationId=suburb%3A34');
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
    expect(buildConsumerJourneyUrl({ intent: 'rent', journey: 'commercial', selectedLocations: [sandton] })).toBe('/commercial?locationIds=suburb%3A34');
    const commercialSiblingScope = buildConsumerJourneyUrl({
      intent: 'rent',
      journey: 'commercial',
      selectedLocations: [johannesburg, capeTown],
    });
    expect(commercialSiblingScope).toContain('locationIds=city%3A12');
    expect(commercialSiblingScope).toContain('locationIds=city%3A21');
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
      '/commercial?locationIds=suburb%3A34&minAreaM2=250&maxMonthlyBudget=100000&availability=now&backupPower=1&minParkingBays=4',
    );
  });

  it('continues to reject unsupported Commercial search-area handoffs', () => {
    expect(buildConsumerJourneyUrl({ intent: 'rent', journey: 'commercial', selectedLocations: [sandton], searchScope: { kind: 'search_area', searchAreaId: 'area-1' } })).toContain('searchError=unsupported-location-scope');
  });
});
