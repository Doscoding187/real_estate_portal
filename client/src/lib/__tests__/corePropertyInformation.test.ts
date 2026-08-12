import { describe, expect, it } from 'vitest';
import {
  buildCanonicalCorePropertyDetails,
  buildCorePropertyInformation,
  normalizeFarmLandArea,
  retainCorePropertyInformationForType,
  validateCorePropertyInformation,
} from '@/../../shared/core-property-information';

describe('core property information contract', () => {
  it('normalizes farm area without losing the entered source unit', () => {
    expect(normalizeFarmLandArea(2, 'hectares')).toEqual({
      status: 'known',
      value: 2,
      sourceUnit: 'hectares',
      normalizedM2: 20_000,
    });
    expect(normalizeFarmLandArea(1, 'acres')?.normalizedM2).toBeCloseTo(4046.86, 2);
  });

  it('keeps ground floor zero distinct from an unknown floor', () => {
    const details = {
      corePropertyInformation: {
        version: 1,
        bedrooms: { status: 'known', value: 2 },
        bathrooms: { status: 'known', value: 1 },
        internalArea: { status: 'known', valueM2: 70, unit: 'm2' },
        floorLevel: { status: 'known', value: 0 },
      },
    };
    expect(validateCorePropertyInformation('sale', 'apartment', details)).toEqual([]);
    expect(buildCorePropertyInformation('apartment', details).floorLevel).toEqual({
      status: 'known',
      value: 0,
    });
  });

  it('requires a house erf area separately from internal area', () => {
    const issues = validateCorePropertyInformation('rent', 'house', {
      corePropertyInformation: {
        version: 1,
        bedrooms: { status: 'known', value: 3 },
        bathrooms: { status: 'known', value: 2 },
        internalArea: { status: 'known', valueM2: 180, unit: 'm2' },
      },
    });
    expect(issues.map(issue => issue.field)).toContain('erfArea');
    expect(issues.map(issue => issue.field)).not.toContain('internalArea');
  });

  it('requires residential farm facts only when a residence is included', () => {
    const landOnly = validateCorePropertyInformation('sale', 'farm', {
      corePropertyInformation: {
        version: 1,
        farmUse: 'crop_farm',
        farmLandArea: { status: 'known', value: 10, sourceUnit: 'hectares', normalizedM2: 100_000 },
        residenceIncluded: false,
      },
    });
    expect(landOnly).toEqual([]);

    const withResidence = validateCorePropertyInformation('sale', 'farm', {
      corePropertyInformation: {
        version: 1,
        farmUse: 'smallholding',
        farmLandArea: { status: 'known', value: 1, sourceUnit: 'hectares', normalizedM2: 10_000 },
        residenceIncluded: true,
      },
    });
    expect(withResidence.map(issue => issue.field)).toEqual(
      expect.arrayContaining(['bedrooms', 'bathrooms', 'internalArea']),
    );
  });

  it('reads legacy fields and emits canonical aliases without conflating areas', () => {
    const details = buildCanonicalCorePropertyDetails('house', {
      bedrooms: 4,
      bathrooms: 2,
      houseAreaM2: 240,
      erfSizeM2: 600,
    });
    expect(details.corePropertyInformation).toMatchObject({
      internalArea: { status: 'known', valueM2: 240, unit: 'm2' },
      erfArea: { status: 'known', valueM2: 600, unit: 'm2' },
    });
    expect(details.internalAreaM2).toBe(240);
    expect(details.erfAreaM2).toBe(600);
  });

  it('removes house land semantics when changing to apartment', () => {
    const retained = retainCorePropertyInformationForType('house', 'apartment', {
      bedrooms: 3,
      bathrooms: 2,
      houseAreaM2: 180,
      erfSizeM2: 500,
    });
    expect(retained).toMatchObject({
      bedrooms: { status: 'known', value: 3 },
      internalArea: { status: 'known', valueM2: 180 },
    });
    expect(retained).not.toHaveProperty('erfArea');
  });

  it.each(
    [
      'apartment',
      'house',
      'townhouse',
      'cluster_home',
      'farm',
    ].flatMap(propertyType => ['sale', 'rent'].map(intent => [intent, propertyType])),
  )('accepts the complete %s/%s core contract', (intent, propertyType) => {
    const details =
      propertyType === 'farm'
        ? {
            corePropertyInformation: {
              version: 1,
              farmUse: 'smallholding',
              farmLandArea: {
                status: 'known',
                value: 1,
                sourceUnit: 'hectares',
                normalizedM2: 10_000,
              },
              residenceIncluded: false,
            },
          }
        : {
            corePropertyInformation: {
              version: 1,
              bedrooms: { status: 'known', value: 3 },
              bathrooms: { status: 'known', value: 2 },
              internalArea: { status: 'known', valueM2: 120, unit: 'm2' },
              ...(propertyType === 'house'
                ? { erfArea: { status: 'known', valueM2: 500, unit: 'm2' } }
                : {}),
            },
          };

    expect(validateCorePropertyInformation(intent, propertyType, details)).toEqual([]);
  });
});
