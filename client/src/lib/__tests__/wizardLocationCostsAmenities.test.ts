import { describe, expect, it } from 'vitest';
import {
  addCustomAmenity,
  addHighlight,
  derivedLocationText,
  amenityChipsByGroup,
  cardHighlightSplit,
  estimatedAmount,
  highlightChoices,
  highlightSuggestions,
  levyChoiceOf,
  levyPatch,
  parseMonthlyAmount,
  ratesPatch,
  submitAddress,
  suburbAssignmentRequest,
  toggleAmenity,
  toggleHighlight,
  validateAmenitiesStep,
  validateLocationStep,
} from '../wizardLocationCostsAmenities';
import { buildDevelopmentSubmitPayload } from '../developmentSubmitPayload';
import { residentialSaleWorkflow } from '../workflows/residential-sale';
import { iconForAmenity, FALLBACK_ICON } from '@/components/wizard/wizardIcons';

describe('location validation agrees with the server', () => {
  it('requires the address and the map pin (the server readiness rule)', () => {
    expect(validateLocationStep({}).map(e => e.field)).toEqual(['address', 'latitude', 'longitude']);
    expect(validateLocationStep({ address: '1 Main Road' }).map(e => e.field)).toEqual([
      'latitude',
      'longitude',
    ]);
    expect(validateLocationStep({ address: '1 Main Road', latitude: '-26.05', longitude: '28.0' })).toEqual([]);
  });

  it('coordinates must be a valid pair', () => {
    const base = { address: '1 Main Road' };
    expect(validateLocationStep({ ...base, latitude: '-26.05' }).map(e => e.field)).toEqual(['longitude']);
    expect(validateLocationStep({ ...base, latitude: '120', longitude: '28' }).map(e => e.field)).toEqual(['latitude']);
  });

  it('the sale workflow Location step blocks Continue without a pin', () => {
    const step = residentialSaleWorkflow.steps.find(s => s.id === 'location')!;
    expect(step.validate!({ location: { address: '1 Main Road' } } as any).valid).toBe(false);
    expect(
      step.validate!({ location: { address: '1 Main Road', latitude: '-26.05', longitude: '28.0' } } as any).valid,
    ).toBe(true);
  });

  it('an address without a pin blocks with a clear message; no-street plus a pin passes', () => {
    const issues = validateLocationStep({ address: '1 Main Road' });
    expect(issues.map(e => e.field)).toEqual(['latitude', 'longitude']);
    expect(issues[0].message).toMatch(/drop the map pin/i);
    expect(validateLocationStep({ noOfficialStreet: true, latitude: '-26.05', longitude: '28.0' })).toEqual([]);
    expect(validateLocationStep({ noOfficialStreet: true }).map(e => e.field)).toEqual(['latitude', 'longitude']);
  });

  it('costs not given are null in estateSpecs, never 0', () => {
    const payload = buildDevelopmentSubmitPayload({
      amenities: [],
      wizardData: {
        developmentType: 'residential',
        transactionType: 'for_sale',
        name: 'Baltimore',
        location: { address: '1 Main Road', latitude: '-26.05', longitude: '28.0' },
        hasGoverningBody: false,
        media: {},
        unitTypes: [],
      },
    } as any);
    expect(payload.estateSpecs).toMatchObject({
      levyRange: { min: null, max: null },
      rightsAndTaxes: { min: null, max: null },
    });
  });

  it('rejects a 0,0 pin', () => {
    const issues = validateLocationStep({ address: '1 Main Road', latitude: '0', longitude: '0' });
    expect(issues).toEqual([{ field: 'latitude', message: 'Place the pin on the development' }]);
  });

  it('a no-street development is submitted with an empty address and the flag, never a made-up address', () => {
    const loc = { noOfficialStreet: true, latitude: '-26.05', longitude: '28.0' };
    expect(submitAddress(loc)).toBe('');
    expect(submitAddress({ address: ' 1 Main Road ', ...loc })).toBe('1 Main Road');
    expect(submitAddress({ latitude: '1', longitude: '2' })).toBeUndefined();
    const payload = buildDevelopmentSubmitPayload({
      amenities: [],
      wizardData: {
        developmentType: 'residential',
        transactionType: 'for_sale',
        name: 'Baltimore',
        location: loc,
        media: {},
        unitTypes: [],
      },
    } as any);
    expect(payload.address).toBe('');
    expect(JSON.stringify(payload)).not.toContain('no street address yet');
    expect(payload.latitude).toBe('-26.05');
    expect(payload.estateSpecs).toMatchObject({ noStreetAddress: true });
  });

  it('describes the derived location, or says it could not match', () => {
    expect(derivedLocationText({ suburb: 'North Riding', city: 'Johannesburg' })).toBe(
      'Location buyers see: North Riding, Johannesburg — from the map pin',
    );
    expect(derivedLocationText(null)).toMatch(/couldn’t match this pin/);
    expect(derivedLocationText({ suburb: 'North Riding', city: 'Johannesburg' }, 'developer')).toBe(
      'Suggested suburb: North Riding, Johannesburg — a reviewer confirms it',
    );
  });
});

describe('suburb assignment request (derived place)', () => {
  it('records the derived Place as a site assignment for the saved development', () => {
    expect(suburbAssignmentRequest(77, { suburbPlaceId: 'place_1', suburbLabel: 'North Riding' })).toEqual({
      developmentId: 77,
      phaseId: null,
      placeId: 'place_1',
      evidenceReference: expect.any(String),
    });
  });
  it('is null with no derived place, no development id, or an already recorded one', () => {
    expect(suburbAssignmentRequest(77, {})).toBeNull();
    expect(suburbAssignmentRequest(0, { suburbPlaceId: 'place_1' })).toBeNull();
    expect(
      suburbAssignmentRequest(77, { suburbPlaceId: 'place_1', suburbAssignedPlaceId: 'place_1' }),
    ).toBeNull();
  });
});

describe('monthly costs mapping', () => {
  it('parses one estimated amount from typed text', () => {
    expect(parseMonthlyAmount('R 1 250')).toBe(1250);
    expect(parseMonthlyAmount('')).toBe(0);
  });

  it('rates are one amount saved as min = max', () => {
    expect(ratesPatch(900)).toEqual({ rightsAndTaxes: { min: 900, max: 900 } });
    expect(estimatedAmount({ min: 900, max: 900 })).toBe(900);
    expect(estimatedAmount({ min: 0, max: 0 })).toBe(0);
  });

  it('levy chips map to the governance fields; No levy zeroes the amount and keeps other values', () => {
    expect(levyPatch('hoa', 1800)).toEqual({
      hasGoverningBody: true,
      governanceType: 'hoa',
      levyRange: { min: 1800, max: 1800 },
    });
    expect(levyPatch('body_corporate', 2100)).toMatchObject({ governanceType: 'body_corporate' });
    const none = levyPatch('none', 0);
    expect(none).toMatchObject({ hasGoverningBody: false, levyRange: { min: null, max: null } });
    expect(ratesPatch(0)).toEqual({ rightsAndTaxes: { min: null, max: null } });
    expect(levyPatch('hoa', 0)).toMatchObject({ levyRange: { min: null, max: null } });
    expect(none).not.toHaveProperty('architecturalGuidelines');
    expect(levyChoiceOf({ hasGoverningBody: true, governanceType: 'hoa' })).toBe('hoa');
    expect(levyChoiceOf({ hasGoverningBody: true, governanceType: 'body_corporate' })).toBe(
      'body_corporate',
    );
    expect(levyChoiceOf({ hasGoverningBody: false })).toBe('none');
    expect(levyChoiceOf({})).toBeNull();
  });

  it('reaches the existing columns and estateSpecs in the submit payload', () => {
    const payload = buildDevelopmentSubmitPayload({
      amenities: [],
      wizardData: {
        developmentType: 'residential',
        transactionType: 'for_sale',
        name: 'Baltimore',
        location: { address: '1 Main Road' },
        hasGoverningBody: true,
        governanceType: 'hoa',
        monthlyLevyFrom: 1800,
        monthlyLevyTo: 1800,
        ratesFrom: 900,
        ratesTo: 900,
        media: {},
        unitTypes: [],
      },
    } as any);
    expect(payload.ratesFrom).toBe(900);
    expect(payload.ratesTo).toBe(900);
    expect(payload.monthlyLevyFrom).toBe(1800);
    expect(payload.monthlyLevyTo).toBe(1800);
    expect(payload.estateSpecs).toMatchObject({
      hasHOA: true,
      governanceType: 'hoa',
      levyRange: { min: 1800, max: 1800 },
      rightsAndTaxes: { min: 900, max: 900 },
    });
  });
});

describe('amenities', () => {
  it('toggles a known amenity by registry key', () => {
    const on = toggleAmenity([], {}, 'clubhouse');
    expect(on.amenities).toEqual(['clubhouse']);
    expect(toggleAmenity(on.amenities, on.customGroups, 'clubhouse').amenities).toEqual([]);
  });

  it('add-your-own makes a ticked custom chip in the chosen group, with the fallback icon', () => {
    const result = addCustomAmenity([], {}, 'security', 'Dog wash');
    expect(result.status).toBe('added');
    if (result.status !== 'added') return;
    expect(result.amenities).toEqual(['Dog wash']);
    const chips = amenityChipsByGroup(result.amenities, result.customGroups);
    expect(chips.security).toContain('Dog wash');
    expect(chips.lifestyle).not.toContain('Dog wash');
    expect(iconForAmenity('Dog wash')).toBe(FALLBACK_ICON);
    // Untick removes it.
    expect(toggleAmenity(result.amenities, result.customGroups, 'Dog wash').amenities).toEqual([]);
  });

  it('a custom label that is a registry amenity ticks the registry key; duplicates are refused', () => {
    const known = addCustomAmenity([], {}, 'lifestyle', 'clubhouse');
    expect(known).toMatchObject({ status: 'known', amenities: ['clubhouse'] });
    expect(addCustomAmenity(['clubhouse'], {}, 'lifestyle', 'Clubhouse').status).toBe('duplicate');
    expect(addCustomAmenity([], {}, 'lifestyle', '   ').status).toBe('empty');
  });

  it('known icons resolve and an unknown label gets the star', () => {
    expect(iconForAmenity('Swimming Pool')).not.toBe(FALLBACK_ICON);
    expect(iconForAmenity('Electric Fencing')).not.toBe(FALLBACK_ICON);
    expect(iconForAmenity('Helipad')).toBe(FALLBACK_ICON);
  });

  it('an already ticked registry amenity outside the three lists still shows, in its category group', () => {
    const chips = amenityChipsByGroup(['biometric_access', 'visitor_parking'], {});
    expect(chips.security).toContain('biometric_access');
    expect(chips.home).toContain('visitor_parking');
  });
});

describe('highlights', () => {
  it('suggests only from entered facts', () => {
    expect(highlightSuggestions({})).toEqual([]);
    expect(
      highlightSuggestions({
        setting: 'estate',
        estateType: 'golf',
        ownershipTypes: ['full-title'],
        amenities: ['clubhouse', 'Helipad', 'biometric_access'],
      }),
    ).toEqual(['Golf estate', 'Full title', 'Clubhouse', 'Helipad']);
    expect(highlightSuggestions({ setting: 'estate', estateType: 'standard' })).toEqual([
      'Security estate',
    ]);
    // No generic unverifiable suggestions.
    expect(highlightSuggestions({ setting: 'standalone' })).not.toContain('Family friendly');
  });

  it('keeps a chosen highlight tappable even when it is not a suggestion', () => {
    expect(highlightChoices(['Clubhouse'], ['Near schools'])).toEqual(['Clubhouse', 'Near schools']);
  });

  it('toggles, caps the text at 24 characters and the list at 8', () => {
    expect(toggleHighlight([], 'Clubhouse')).toEqual(['Clubhouse']);
    expect(toggleHighlight(['Clubhouse'], 'clubhouse')).toEqual([]);
    const added = addHighlight([], 'x'.repeat(40));
    expect(added.status === 'added' && added.highlights[0]).toHaveLength(24);
    const eight = Array.from({ length: 8 }, (_, i) => `Tag ${i}`);
    expect(toggleHighlight(eight, 'Ninth')).toEqual(eight);
    expect(addHighlight(eight, 'Ninth').status).toBe('full');
    expect(addHighlight(['Clubhouse'], 'CLUBHOUSE').status).toBe('duplicate');
  });

  it('needs at least three to publish, same as the server', () => {
    expect(validateAmenitiesStep({ highlights: ['A', 'B'] }).map(e => e.field)).toEqual(['highlights']);
    expect(validateAmenitiesStep({ highlights: ['A', 'B', 'C'] })).toEqual([]);
    expect(validateAmenitiesStep({ keySellingPoints: ['A', 'B', ' '] })).toHaveLength(1);
    const step = residentialSaleWorkflow.steps.find(s => s.id === 'amenities_features')!;
    expect(step.validate!({ highlights: ['A'] } as any).valid).toBe(false);
    expect(step.validate!({ highlights: ['A', 'B', 'C'] } as any).valid).toBe(true);
  });

  it('the card shows the first three and "+N more"', () => {
    expect(cardHighlightSplit(['a', 'b', 'c', 'd', 'e'])).toEqual({ shown: ['a', 'b', 'c'], more: 2 });
  });

  it('highlights reach the payload from the existing field', () => {
    const payload = buildDevelopmentSubmitPayload({
      amenities: ['clubhouse', 'Dog wash'],
      wizardData: {
        developmentType: 'residential',
        transactionType: 'for_sale',
        name: 'Baltimore',
        location: { address: '1 Main Road' },
        amenities: ['clubhouse', 'Dog wash'],
        highlights: ['Clubhouse', 'Golf estate', 'Dog wash'],
        media: {},
        unitTypes: [],
      },
    } as any);
    expect(payload.highlights).toEqual(['Clubhouse', 'Golf estate', 'Dog wash']);
    expect(payload.amenities).toEqual(['clubhouse', 'Dog wash']);
  });
});
