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
  });

  it('keeps residential Buy semantics in the existing search authority', () => {
    expect(buildConsumerJourneyUrl({ intent: 'buy', journey: 'residential', selectedLocations: [sandton], propertyType: 'house', minBedrooms: 3 })).toContain('/property-for-sale');
    expect(buildConsumerJourneyUrl({ intent: 'buy', journey: 'residential', selectedLocations: [sandton], propertyType: 'house', minBedrooms: 3 })).toContain('minBedrooms=3');
  });

  it('hands Plots & Land to its display-name API contract and canonical classification values', () => {
    const href = buildConsumerJourneyUrl({ intent: 'buy', journey: 'land', selectedLocations: [capeTown], landClassification: 'residential_stand' });
    expect(href).toContain('/plots-and-land');
    expect(href).toContain('city=Cape+Town');
    expect(href).toContain('classification=residential_stand');
    expect(href).not.toContain('minBedrooms');
  });

  it('omits invalid or Any Land classifications rather than forwarding presentation values', () => {
    const href = buildConsumerJourneyUrl({ intent: 'buy', journey: 'land', selectedLocations: [johannesburg], landClassification: 'Agricultural' });
    expect(href).not.toContain('classification=');
  });

  it('does not widen a suburb to a city when Land cannot execute that scope', () => {
    expect(buildConsumerJourneyUrl({ intent: 'buy', journey: 'land', selectedLocations: [sandton] }))
      .toBe('/plots-and-land?searchError=unsupported-location-scope');
  });

  it('keeps Farm explicitly transitional while routing through the existing contract', () => {
    expect(resolveConsumerJourney('buy', 'farm')?.status).toBe('TRANSITIONAL');
    expect(buildConsumerJourneyUrl({ intent: 'buy', journey: 'farm', selectedLocations: [sandton] })).toContain('propertyType=farm');
  });

  it('exposes Commercial only for the executable rental authority', () => {
    expect(resolveConsumerJourney('buy', 'commercial')).toBeUndefined();
    expect(buildConsumerJourneyUrl({ intent: 'rent', journey: 'commercial', selectedLocations: [sandton] })).toBe('/commercial?location=Sandton');
  });

  it('rejects specialist multi-location and Search Area handoff rather than dropping intent', () => {
    expect(buildConsumerJourneyUrl({ intent: 'buy', journey: 'land', selectedLocations: [johannesburg, capeTown] })).toContain('searchError=unsupported-location-scope');
    expect(buildConsumerJourneyUrl({ intent: 'rent', journey: 'commercial', selectedLocations: [sandton], searchScope: { kind: 'search_area', searchAreaId: 'area-1' } })).toContain('searchError=unsupported-location-scope');
  });
});
