import { describe, expect, it } from 'vitest';
import {
  getNearbyAmenityCategoryConfig,
  isExcludedNearbyAmenity,
  passesNearbyAmenityQualityGate,
  rankNearbyAmenities,
  type NearbyAmenity,
} from './nearbyAmenities';

function amenity(overrides: Partial<NearbyAmenity>): NearbyAmenity {
  return {
    id: 'place-1',
    placeId: 'place-1',
    name: 'Place',
    category: 'education',
    googleType: 'school',
    address: '1 Road',
    latitude: -26.1,
    longitude: 28.05,
    distance: '0.5 km',
    distanceValue: 0.5,
    rating: 4.5,
    userRatingsTotal: 100,
    ...overrides,
  };
}

describe('nearby amenity governance', () => {
  it('excludes convenience businesses and spaza-style names', () => {
    expect(
      isExcludedNearbyAmenity({
        name: 'Sandton Spaza Shop',
        types: ['school'],
      }),
    ).toBe(true);
    expect(
      isExcludedNearbyAmenity({
        name: 'Corner Store',
        types: ['convenience_store'],
      }),
    ).toBe(true);
    expect(isExcludedNearbyAmenity({ name: 'Sandton High School', types: ['school'] })).toBe(false);
  });

  it('requires the category quality gate, allowing unrated transport but not unrated schools', () => {
    const education = getNearbyAmenityCategoryConfig('education');
    const transport = getNearbyAmenityCategoryConfig('transport');

    expect(
      passesNearbyAmenityQualityGate(
        { name: 'School', rating: 3.9, userRatingsTotal: 80 },
        education,
      ),
    ).toBe(false);
    expect(
      passesNearbyAmenityQualityGate(
        { name: 'School', rating: 4.2, userRatingsTotal: 5 },
        education,
      ),
    ).toBe(false);
    expect(
      passesNearbyAmenityQualityGate(
        { name: 'School', rating: 4.2, userRatingsTotal: 30 },
        education,
      ),
    ).toBe(true);
    expect(
      passesNearbyAmenityQualityGate(
        { name: 'School', rating: null, userRatingsTotal: null },
        education,
      ),
    ).toBe(false);
    expect(
      passesNearbyAmenityQualityGate(
        { name: 'Station', rating: null, userRatingsTotal: null },
        transport,
      ),
    ).toBe(true);
  });

  it('deduplicates places, caps each category, and orders categories predictably', () => {
    const rows = [
      amenity({ id: 'school-far', placeId: 'school-far', distanceValue: 2 }),
      amenity({ id: 'school-near', placeId: 'school-near', distanceValue: 0.3 }),
      amenity({
        id: 'school-near',
        placeId: 'school-near',
        distanceValue: 0.3,
        category: 'education',
      }),
      amenity({
        id: 'mall',
        placeId: 'mall',
        name: 'Mall',
        category: 'shopping',
        googleType: 'shopping_mall',
        distanceValue: 0.4,
      }),
      amenity({
        id: 'station',
        placeId: 'station',
        name: 'Station',
        category: 'transport',
        googleType: 'transit_station',
        distanceValue: 0.1,
      }),
    ];

    const ranked = rankNearbyAmenities(rows, 30);

    expect(ranked.filter(row => row.placeId === 'school-near')).toHaveLength(1);
    expect(ranked.map(row => row.category)).toEqual([
      'education',
      'education',
      'shopping',
      'transport',
    ]);
    expect(ranked[0].placeId).toBe('school-near');
  });

  it('honours the total result limit after category caps', () => {
    const rows = Array.from({ length: 8 }, (_, index) =>
      amenity({
        id: `school-${index}`,
        placeId: `school-${index}`,
        distanceValue: index + 1,
      }),
    );

    expect(rankNearbyAmenities(rows, 3)).toHaveLength(3);
  });
});
