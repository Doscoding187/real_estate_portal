import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useDevelopmentWizard } from './useDevelopmentWizard';

describe('useDevelopmentWizard Validation Logic', () => {
  // Reset store before each test to ensure isolation
  beforeEach(() => {
    const { result } = renderHook(() => useDevelopmentWizard());
    act(() => {
      result.current.reset();
    });
  });

  describe('Phase 1: Identity Validation', () => {
    it('should fail validation if name or address is missing', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      // Initial state is empty
      const validation = result.current.validatePhase(1);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Name is required');
      expect(validation.errors).toContain('Location is required');
    });

    it('should pass validation when name and address are provided', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.setIdentity({
          name: 'Test Development',
          location: {
            address: '123 Test St',
            city: 'Test City',
            province: 'Test',
            latitude: '0',
            longitude: '0',
          },
        });
      });

      const validation = result.current.validatePhase(1);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Phase 2: Classification Validation', () => {
    it('should be valid by default as it initializes with residential', () => {
      const { result } = renderHook(() => useDevelopmentWizard());
      const validation = result.current.validatePhase(2);
      expect(validation.isValid).toBe(true);
    });

    it('should fail if type is somehow cleared', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        // @ts-ignore - forcing invalid state for test
        result.current.setClassification({ type: '' });
      });

      const validation = result.current.validatePhase(2);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Type is required');
    });
  });

  describe('Phase 3: Overview Validation', () => {
    it('should fail if highlights are fewer than 3 or description is too short', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.setOverview({
          highlights: ['One', 'Two'], // Need 3
          description: 'Too short', // Need 50 chars
        });
      });

      const validation = result.current.validatePhase(3);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Add at least 3 highlights');
      expect(validation.errors).toContain('Description must be at least 50 characters');
    });

    it('should pass with valid highlights and description', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.setOverview({
          highlights: ['One', 'Two', 'Three'],
          description:
            'This is a long enough description that should pass the validation check of fifty characters easily.',
        });
      });

      const validation = result.current.validatePhase(3);
      expect(validation.isValid).toBe(true);
    });
  });

  describe('Phase 4: Unit Types Validation', () => {
    it('should require at least one unit type for residential developments', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      // Ensure type is residential
      act(() => {
        result.current.setClassification({ type: 'residential' });
      });

      const validation = result.current.validatePhase(4);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Add at least one unit type');
    });

    it('should NOT require unit types for Land developments', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.setClassification({ type: 'land' });
      });

      const validation = result.current.validatePhase(4);
      expect(validation.isValid).toBe(true);
    });

    it('should pass if a unit type is added', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.addUnitType({
          name: 'Test Unit',
          bedrooms: 2,
          bathrooms: 2,
          parking: '1',
          basePriceFrom: 1000000,
          amenities: { standard: [], additional: [] },
          specifications: {
            builtInFeatures: { builtInWardrobes: true, tiledFlooring: true, graniteCounters: true },
            finishes: {},
            electrical: { prepaidElectricity: true },
          },
          baseMedia: { gallery: [], floorPlans: [], renders: [] },
          specs: [],
          displayOrder: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      const validation = result.current.validatePhase(4);
      expect(validation.isValid).toBe(true);
    });
  });

  describe('Final Publish Validation', () => {
    it('should validate media requirements', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      // Setup valid state for everything EXCEPT media
      act(() => {
        result.current.setIdentity({
          name: 'Valid Name',
          location: {
            address: 'Valid Address',
            city: '',
            province: '',
            latitude: '',
            longitude: '',
          },
        });
        result.current.setOverview({
          highlights: ['1', '2', '3'],
          description: 'Long enough description for validation purposes -------------------',
        });
        result.current.addUnitType({
          name: 'Unit',
          bedrooms: 1,
          bathrooms: 1,
          parking: '1',
          basePriceFrom: 100,
          amenities: { standard: [], additional: [] },
          specifications: {
            builtInFeatures: { builtInWardrobes: true, tiledFlooring: true, graniteCounters: true },
            finishes: {},
            electrical: { prepaidElectricity: true },
          },
          baseMedia: { gallery: [], floorPlans: [], renders: [] },
          specs: [],
          displayOrder: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      const validation = result.current.validateForPublish();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('At least 1 image is required');
    });

    it('should validate unit prices', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        // Add unit with 0 price
        result.current.addUnitType({
          name: 'Free Unit',
          bedrooms: 1,
          bathrooms: 1,
          parking: '1',
          basePriceFrom: 0, // Invalid
          amenities: { standard: [], additional: [] },
          specifications: {
            builtInFeatures: { builtInWardrobes: true, tiledFlooring: true, graniteCounters: true },
            finishes: {},
            electrical: { prepaidElectricity: true },
          },
          baseMedia: { gallery: [], floorPlans: [], renders: [] },
          specs: [],
          displayOrder: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        // Set type to residential so units are checked
        result.current.setClassification({ type: 'residential' });
      });

      const validation = result.current.validateForPublish();
      expect(validation.errors).toContain('All unit types must have a base price');
    });
  });
});
