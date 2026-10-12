import { describe, expect, it } from 'vitest';

import { linesToLocations, linesToServices } from './ProProfilePage';

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
    const [location] = linesToLocations('Sandton, Johannesburg, Gauteng', [
      {
        id: 23,
        suburb: 'Sandton',
        city: 'Johannesburg',
        province: 'Gauteng',
        countryCode: 'ZA',
        postalCode: null,
        radiusKm: 25,
        isPrimary: true,
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
    expect(location?.postalCode).toBeUndefined();
  });

  it('matches a location by the complete normalized geographic tuple', () => {
    const existing = [
      {
        id: 23,
        suburb: 'Sandton',
        city: 'Johannesburg',
        province: 'Gauteng',
        countryCode: 'ZA',
        postalCode: '2196',
        radiusKm: 40,
        isPrimary: true,
      },
      {
        id: 24,
        suburb: 'Arcadia',
        city: 'Pretoria',
        province: 'Gauteng',
        countryCode: 'ZA',
        postalCode: '0008',
        radiusKm: 20,
        isPrimary: false,
      },
    ];

    expect(linesToLocations('Sandton, Johannesburg, Gauteng', existing)[0]).toMatchObject({
      id: 23,
      postalCode: '2196',
      radiusKm: 40,
    });
  });

  it('keeps canonical location metadata that the compact editor does not expose', () => {
    const existing = [
      {
        id: 23,
        suburb: 'Sandton',
        city: 'Johannesburg',
        province: 'Gauteng',
        countryCode: 'ZA',
        postalCode: '2196',
        radiusKm: 40,
        isPrimary: true,
      },
    ];

    expect(linesToLocations('Sandton, Johannesburg, Gauteng', existing)).toEqual([
      {
        id: 23,
        suburb: 'Sandton',
        city: 'Johannesburg',
        province: 'Gauteng',
        countryCode: 'ZA',
        postalCode: '2196',
        radiusKm: 40,
        isPrimary: true,
      },
    ]);
  });
});
