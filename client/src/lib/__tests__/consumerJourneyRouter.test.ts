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
    expect(getConsumerJourneys('buy').map(item => item.key)).toEqual(['residential', 'land', 'farm']);
    expect(resolveConsumerJourney('buy', 'commercial')).toBeUndefined();
    expect(resolveConsumerJourney('buy', 'land')?.status).toBe('E2E_READY');
  });

  it('keeps residential Buy semantics in the existing search authority', () => {
    expect(buildConsumerJourneyUrl({ intent: 'buy', journey: 'residential', selectedLocations: [sandton], propertyType: 'house', minBedrooms: 3 })).toContain('/property-for-sale');
    expect(buildConsumerJourneyUrl({ intent: 'buy', journey: 'residential', selectedLocations: [sandton], propertyType: 'house', minBedrooms: 3 })).toContain('minBedrooms=3');
  });

  it('hands Plots & Land canonical geography and classification values', () => {
    const href = buildConsumerJourneyUrl({ intent: 'buy', journey: 'land', selectedLocations: [capeTown], landClassification: 'residential_stand' });
    expect(href).toContain('/plots-and-land');
    expect(href).toContain('locationId=city%3A21');
    expect(href).toContain('classification=residential_stand');
    expect(href).not.toContain('minBedrooms');
  });

  it('omits invalid or Any Land classifications rather than forwarding presentation values', () => {
    const href = buildConsumerJourneyUrl({ intent: 'buy', journey: 'land', selectedLocations: [johannesburg], landClassification: 'Agricultural' });
    expect(href).not.toContain('classification=');
  });

  it('preserves an exact canonical suburb scope', () => {
    expect(buildConsumerJourneyUrl({ intent: 'buy', journey: 'land', selectedLocations: [sandton] }))
      .toBe('/plots-and-land?locationId=suburb%3A34');
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

  it('forwards only supported Commercial Office decisions on handoff', () => {
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
      '/commercial?location=Sandton&minAreaM2=250&maxMonthlyBudget=100000&availability=now&backupPower=1&minParkingBays=4',
    );
  });

  it('preserves Land multi-location and Search Area intent', () => {
    expect(buildConsumerJourneyUrl({ intent: 'buy', journey: 'land', selectedLocations: [johannesburg, pretoria] })).toContain('locationIds=city%3A12');
    expect(buildConsumerJourneyUrl({ intent: 'buy', journey: 'land', selectedLocations: [johannesburg, pretoria] })).toContain('locationIds=city%3A13');
    expect(buildConsumerJourneyUrl({ intent: 'buy', journey: 'land', searchScope: { kind: 'search_area', searchAreaId: 'area-1' } })).toBe('/plots-and-land?searchAreaId=area-1');
    expect(buildConsumerJourneyUrl({ intent: 'rent', journey: 'commercial', selectedLocations: [sandton], searchScope: { kind: 'search_area', searchAreaId: 'area-1' } })).toContain('searchError=unsupported-location-scope');
  });

  it('fails closed instead of selecting a Land geography authority from mixed handoff state', () => {
    expect(
      buildConsumerJourneyUrl({
        intent: 'buy',
        journey: 'land',
        selectedLocations: [sandton],
        searchScope: { kind: 'search_area', searchAreaId: 'area-1' },
      }),
    ).toBe('/plots-and-land?searchError=unsupported-location-scope');
    expect(
      buildConsumerJourneyUrl({ intent: 'buy', journey: 'land', selectedLocations: [johannesburg, capeTown] }),
    ).toBe('/plots-and-land?searchError=unsupported-location-scope');
    expect(
      buildConsumerJourneyUrl({ intent: 'buy', journey: 'land', selectedLocations: [sandton, johannesburg] }),
    ).toBe('/plots-and-land?searchError=unsupported-location-scope');
  });
});
