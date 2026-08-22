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

describe('consumer journey router', () => {
  it('exposes only executable Buy choices', () => {
    expect(getConsumerJourneys('buy').map(item => item.key)).toEqual(['residential', 'land', 'farm']);
    expect(resolveConsumerJourney('buy', 'commercial')).toBeUndefined();
  });

  it('keeps residential Buy semantics in the existing search authority', () => {
    expect(buildConsumerJourneyUrl({ intent: 'buy', journey: 'residential', selectedLocations: [sandton], propertyType: 'house', minBedrooms: 3 })).toContain('/property-for-sale');
    expect(buildConsumerJourneyUrl({ intent: 'buy', journey: 'residential', selectedLocations: [sandton], propertyType: 'house', minBedrooms: 3 })).toContain('minBedrooms=3');
  });

  it('hands Plots & Land to Land and preserves canonical location context', () => {
    const href = buildConsumerJourneyUrl({ intent: 'buy', journey: 'land', selectedLocations: [johannesburg] });
    expect(href).toContain('/plots-and-land');
    expect(href).toContain('locationId=city%3A12');
    expect(href).toContain('city=johannesburg');
    expect(href).not.toContain('minBedrooms');
  });

  it('does not widen a suburb to a city when Land cannot execute that scope', () => {
    expect(buildConsumerJourneyUrl({ intent: 'buy', journey: 'land', selectedLocations: [sandton] }))
      .toBe('/plots-and-land?searchError=canonical-location-required');
  });

  it('keeps Farm explicitly transitional while routing through the existing contract', () => {
    expect(resolveConsumerJourney('buy', 'farm')?.status).toBe('TRANSITIONAL');
    expect(buildConsumerJourneyUrl({ intent: 'buy', journey: 'farm', selectedLocations: [sandton] })).toContain('propertyType=farm');
  });

  it('exposes Commercial only for the executable rental authority', () => {
    expect(resolveConsumerJourney('buy', 'commercial')).toBeUndefined();
    expect(buildConsumerJourneyUrl({ intent: 'rent', journey: 'commercial', selectedLocations: [sandton] })).toContain('/commercial?');
  });
});
