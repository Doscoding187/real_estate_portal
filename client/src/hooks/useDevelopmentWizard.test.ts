import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useDevelopmentWizard } from './useDevelopmentWizard';

describe('useDevelopmentWizard Validation Logic', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useDevelopmentWizard());
    act(() => {
      result.current.reset();
    });
  });

  describe('Current Phase Mapping', () => {
    it('phase 1 requires a represented developer brand for marketing agencies', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      const validation = result.current.validatePhase(1);
      act(() => {
        result.current.setListingIdentity({ identityType: 'marketing_agency' });
      });

      const invalid = result.current.validatePhase(1);
      expect(invalid.isValid).toBe(false);
      expect(invalid.errors).toContain('Select the Developer Brand you are representing');

      act(() => {
        result.current.setListingIdentity({ developerBrandProfileId: 123 });
      });

      const valid = result.current.validatePhase(1);
      expect(valid.isValid).toBe(true);
    });

    it('phase 4 enforces core identity/market fields', () => {
      const { result } = renderHook(() => useDevelopmentWizard());
      const validation = result.current.validatePhase(4);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Development name is required');
      expect(validation.errors).toContain('Please select at least one ownership type');
    });

    it('phase 5 enforces location address and city', () => {
      const { result } = renderHook(() => useDevelopmentWizard());
      const invalid = result.current.validatePhase(5);
      expect(invalid.isValid).toBe(false);
      expect(invalid.errors).toContain('Location is required');
      expect(invalid.errors).toContain('City is required');

      act(() => {
        result.current.setIdentity({
          location: {
            address: '123 Main Road',
            city: 'Cape Town',
            province: 'Western Cape',
            latitude: '-33.9',
            longitude: '18.4',
          },
        });
      });

      const valid = result.current.validatePhase(5);
      expect(valid.isValid).toBe(true);
    });

    it('phase 8 enforces highlights/description only', () => {
      const { result } = renderHook(() => useDevelopmentWizard());
      act(() => {
        result.current.setIdentity({
          status: 'selling',
          highlights: ['One', 'Two'],
          description: 'Too short',
        });
      });

      const validation = result.current.validatePhase(8);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Add at least 3 key selling points');
      expect(validation.errors).toContain('Description must be at least 50 characters');
    });

    it('phase 9 enforces hero image and at least one brochure/document', () => {
      const { result } = renderHook(() => useDevelopmentWizard());
      const validation = result.current.validatePhase(9);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Hero image is required');
      expect(validation.errors).toContain('Add at least 1 brochure or document');
    });

    it('phase 10 requires unit types for non-land and skips for land', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      const requiresUnits = result.current.validatePhase(10);
      expect(requiresUnits.isValid).toBe(false);
      expect(requiresUnits.errors).toContain('Add at least one unit type');

      act(() => {
        result.current.setClassification({ type: 'land' });
      });
      const landValidation = result.current.validatePhase(10);
      expect(landValidation.isValid).toBe(true);
    });

    it('phase 10 passes with at least one unit for residential', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.setClassification({ type: 'residential' });
        result.current.addUnitType({
          name: 'Unit A',
          bedrooms: 2,
          bathrooms: 2,
          parkingType: 'carport',
          parkingBays: 1,
          priceFrom: 1000000,
          priceTo: 1200000,
          totalUnits: 10,
          availableUnits: 10,
          reservedUnits: 0,
          amenities: { standard: [], additional: [] },
        });
      });

      const validation = result.current.validatePhase(10);
      expect(validation.isValid).toBe(true);
    });
  });

  describe('Final Publish Validation', () => {
    it('should enforce image requirement', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.setIdentity({
          name: 'Valid Development',
          ownershipType: 'sectional-title',
          transactionType: 'for_sale',
          location: {
            address: '123 Main Road',
            city: 'Cape Town',
            province: 'Western Cape',
            latitude: '-33.9',
            longitude: '18.4',
          },
          highlights: ['A', 'B', 'C', 'D'],
          description:
            'This description is long enough to pass publish validation requirements for summaries.',
        });
        result.current.addUnitType({
          name: 'Unit A',
          bedrooms: 1,
          bathrooms: 1,
          parkingType: 'carport',
          parkingBays: 1,
          priceFrom: 1000000,
          priceTo: 1100000,
          totalUnits: 10,
          availableUnits: 9,
          reservedUnits: 1,
          amenities: { standard: [], additional: [] },
        });
      });

      const validation = result.current.validateForPublish();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('At least 1 image is required');
    });
  });
});
