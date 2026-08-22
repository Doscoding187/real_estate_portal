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

  it('keeps Farm explicitly transitional while routing through the existing contract', () => {
    expect(resolveConsumerJourney('buy', 'farm')?.status).toBe('TRANSITIONAL');
    expect(buildConsumerJourneyUrl({ intent: 'buy', journey: 'farm', selectedLocations: [sandton] })).toContain('propertyType=farm');
  });

  it('exposes Commercial only for the executable rental authority', () => {
    expect(resolveConsumerJourney('buy', 'commercial')).toBeUndefined();
    expect(buildConsumerJourneyUrl({ intent: 'rent', journey: 'commercial', selectedLocations: [sandton] })).toBe('/commercial?location=Sandton');
  });

  it('preserves Land multi-location and Search Area intent', () => {
    expect(buildConsumerJourneyUrl({ intent: 'buy', journey: 'land', selectedLocations: [johannesburg, capeTown] })).toContain('locationIds=city%3A12');
    expect(buildConsumerJourneyUrl({ intent: 'buy', journey: 'land', selectedLocations: [johannesburg, capeTown] })).toContain('locationIds=city%3A21');
    expect(buildConsumerJourneyUrl({ intent: 'buy', journey: 'land', selectedLocations: [sandton], searchScope: { kind: 'search_area', searchAreaId: 'area-1' } })).toBe('/plots-and-land?searchAreaId=area-1');
    expect(buildConsumerJourneyUrl({ intent: 'rent', journey: 'commercial', selectedLocations: [sandton], searchScope: { kind: 'search_area', searchAreaId: 'area-1' } })).toContain('searchError=unsupported-location-scope');
  });
});
