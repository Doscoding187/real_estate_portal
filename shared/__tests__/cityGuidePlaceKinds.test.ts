import { describe, expect, it } from 'vitest';
import { CITY_GUIDE_CONTENT, getCityGuideContent } from '../cityGuideContent';
import { SUBURB_GUIDE_PILOT } from '../suburbGuidePolicy';

/**
 * A place reference in a guide must be typed with the level it actually has, otherwise the
 * canonical lookup refuses it and the guide silently shows plain text where a link belongs.
 *
 * The pilot suburb is the reference case: Sandton is a suburb of Johannesburg, so it must be
 * typed as a suburb everywhere the Johannesburg guide names it.
 */
describe('city guide place kinds', () => {
  const johannesburg = getCityGuideContent('gauteng', 'johannesburg')!;

  it('types the pilot suburb as a suburb everywhere the city guide names it', () => {
    const mentions = johannesburg.collections.flatMap(collection =>
      collection.places
        .filter(place => place.name === 'Sandton')
        .map(place => ({ collection: collection.id, place })),
    );

    expect(mentions.length).toBeGreaterThan(0);
    for (const mention of mentions) {
      expect(mention.place.kind, `${mention.collection} must type Sandton as a suburb`).toBe(
        'suburb',
      );
    }
  });

  it('never types the pilot suburb as a city', () => {
    for (const guide of CITY_GUIDE_CONTENT) {
      for (const collection of guide.collections) {
        for (const place of collection.places) {
          if (place.name === 'Sandton') {
            expect(place.kind).not.toBe('city');
          }
        }
      }
    }
  });

  it('keeps the pilot suburb name consistent with the pilot policy', () => {
    expect(SUBURB_GUIDE_PILOT.suburbSlug).toBe('sandton');
    expect(SUBURB_GUIDE_PILOT.citySlug).toBe('johannesburg');
    expect(SUBURB_GUIDE_PILOT.provinceSlug).toBe('gauteng');
  });

  it('gives every place reference a level and a caption', () => {
    for (const guide of CITY_GUIDE_CONTENT) {
      for (const collection of guide.collections) {
        for (const place of collection.places) {
          expect(['city', 'suburb']).toContain(place.kind);
          expect(place.name.trim().length).toBeGreaterThan(0);
          expect(place.caption.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });
});
