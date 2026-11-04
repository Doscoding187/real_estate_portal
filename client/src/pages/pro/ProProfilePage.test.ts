import { describe, expect, it } from 'vitest';

import { coverageAreasToPayload, linesToServices } from './ProProfilePage';

describe('ProProfilePage structured editor preservation', () => {
  it('keeps service metadata that the compact editor does not expose', () => {
    const existing = [
      {
        id: 17,
        code: 'plumbing',
        category: 'home_improvement',
        displayName: 'Plumbing repairs',
        description: 'Existing description',
        minPrice: 250,
        maxPrice: 900,
        currency: 'ZAR',
        isActive: false,
      },
    ];

    expect(linesToServices('home_improvement, plumbing, Emergency plumbing', existing)).toEqual([
      {
        id: 17,
        category: 'home_improvement',
        code: 'plumbing',
        displayName: 'Emergency plumbing',
        description: 'Existing description',
        minPrice: 250,
        maxPrice: 900,
        currency: 'ZAR',
        isActive: false,
      },
    ]);
  });

  it('applies an explicit service availability override', () => {
    const [service] = linesToServices(
      'home_improvement, plumbing, Plumbing',
      [
        {
          id: 17,
          category: 'home_improvement',
          code: 'plumbing',
          displayName: 'Plumbing',
          isActive: false,
        },
      ],
      { plumbing: true },
    );

    expect(service.isActive).toBe(true);
  });

  it('does not transfer service metadata by array position when the code changes', () => {
    const [service] = linesToServices('home_improvement, new-service, New service', [
      {
        id: 17,
        category: 'home_improvement',
        code: 'old-service',
        displayName: 'Old service',
        description: 'Existing description',
        minPrice: 250,
        maxPrice: 900,
        currency: 'ZAR',
        isActive: false,
      },
    ]);

    expect(service.id).toBeUndefined();
    expect(service.description).toBeUndefined();
    expect(service.minPrice).toBeUndefined();
    expect(service.isActive).toBe(true);
  });

  it('omits null optional metadata from the editor payload', () => {
    const [service] = linesToServices('home_improvement, plumbing, Plumbing', [
      {
        id: 17,
        category: 'home_improvement',
        code: 'plumbing',
        displayName: 'Plumbing',
        description: null,
        minPrice: null,
        maxPrice: null,
        currency: 'ZAR',
        isActive: true,
      },
    ]);
    expect(service).toEqual({
      id: 17,
      category: 'home_improvement',
      code: 'plumbing',
      displayName: 'Plumbing',
      description: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      currency: 'ZAR',
      isActive: true,
    });
  });

  it('serializes selected canonical identities without using display labels as identity', () => {
    expect(coverageAreasToPayload([
      {
        id: 23,
        place: {
          canonicalPlaceId: 'pl-place-01-000000000000000000000001',
          label: 'Sandton, City of Johannesburg, Gauteng',
          placeType: 'suburb',
          scope: 'locality',
          administrativeContext: 'City of Johannesburg, Gauteng',
        },
        isPrimary: true,
      },
      { place: null, isPrimary: false },
    ])).toEqual([
      {
        id: 23,
        canonicalPlaceId: 'pl-place-01-000000000000000000000001',
        isPrimary: true,
      },
    ]);
  });
});
