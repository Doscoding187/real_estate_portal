import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { persistManualDevelopmentDraft, useDevelopmentWizard } from './useDevelopmentWizard';

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

  describe('Canonical draft snapshot', () => {
    it('getDraftData includes workflow state, stepData, developmentData, and canonical unitTypes', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.initializeWorkflow('residential', 'for_sale');
        useDevelopmentWizard.setState({
          currentStepId: 'unit_types' as any,
          completedSteps: ['identity_market', 'configuration'] as any,
        });
        result.current.saveWorkflowStepData('unit_types' as any, {
          unitTypes: [
            {
              id: 'db-unit-1',
              name: 'Type A',
              bedrooms: 2,
              bathrooms: 2,
              priceFrom: 1500000,
              totalUnits: 10,
              availableUnits: 8,
            },
          ],
        });
      });

      const draft = result.current.getDraftData();

      expect(draft.workflowId).toBe('residential_sale');
      expect(draft.currentStepId).toBe('unit_types');
      expect(draft.completedSteps).toEqual(['identity_market', 'configuration']);
      expect(draft.stepData.unit_types.unitTypes[0].id).toBe('db-unit-1');
      expect(draft.unitTypes[0].id).toBe('db-unit-1');
      expect(draft.developmentData).toBeDefined();
      expect(draft._version).toBe('3.0');
      expect(draft._savedAt).toBeDefined();
    });

    it('manual save persists the canonical draft even when autosave is disabled', async () => {
      const draftData = {
        workflowId: 'residential_sale',
        currentStepId: 'unit_types',
        completedSteps: ['identity_market'],
      };
      const saveDraft = vi.fn(async callback => {
        await callback?.(draftData);
      });
      const mutateDraft = vi.fn(async input => ({
        id: 42,
        success: true,
        draftData: input.draftData,
      }));
      const setCurrentDraftId = vi.fn();

      const result = await persistManualDevelopmentDraft({
        saveDraft,
        mutateDraft,
        brandProfileId: 7,
        setCurrentDraftId,
      });

      expect(saveDraft).toHaveBeenCalledTimes(1);
      expect(mutateDraft).toHaveBeenCalledWith({
        brandProfileId: 7,
        draftData,
      });
      expect(setCurrentDraftId).toHaveBeenCalledWith(42);
      expect(result.success).toBe(true);
    });

    it('manual save does not treat a failed server response as success', async () => {
      const saveDraft = vi.fn(async callback => {
        await callback?.({ workflowId: 'residential_sale' });
      });
      const mutateDraft = vi.fn(async input => ({
        id: 42,
        success: false,
        draftData: input.draftData,
      }));
      const setCurrentDraftId = vi.fn();

      await expect(
        persistManualDevelopmentDraft({
          saveDraft,
          mutateDraft,
          currentDraftId: 11,
          setCurrentDraftId,
        }),
      ).rejects.toThrow('Draft save failed');

      expect(mutateDraft).toHaveBeenCalledWith({
        id: 11,
        draftData: { workflowId: 'residential_sale' },
      });
      expect(setCurrentDraftId).not.toHaveBeenCalled();
    });

    it('hydrateDevelopment restores draft workflow state and completed steps', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.hydrateDevelopment({
          _version: '3.0',
          workflowId: 'residential_sale',
          currentStepId: 'unit_types',
          completedSteps: ['identity_market', 'configuration'],
          developmentType: 'residential',
          developmentData: {
            name: 'Drafted Development',
            description: 'A draft with workflow state',
            transactionType: 'for_sale',
            status: 'selling',
            location: {
              address: '1 Main Road',
              city: 'Cape Town',
              province: 'Western Cape',
            },
            media: { photos: [], videos: [], documents: [] },
          },
          stepData: {
            identity_market: {
              name: 'Drafted Development',
              transactionType: 'for_sale',
            },
            unit_types: {
              unitTypes: [{ id: 'db-unit-1', name: 'Type A', bedrooms: 2, bathrooms: 2 }],
            },
          },
          unitTypes: [{ id: 'db-unit-1', name: 'Type A', bedrooms: 2, bathrooms: 2 }],
        });
      });

      expect(result.current.workflowId).toBe('residential_sale');
      expect(result.current.currentStepId).toBe('unit_types');
      expect(result.current.completedSteps).toEqual(['identity_market', 'configuration']);
      expect(result.current.stepData.unit_types.unitTypes[0].id).toBe('db-unit-1');
      expect(result.current.unitTypes[0].id).toBe('db-unit-1');
    });

    it('DB edit hydration ignores stale local workflow step', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        useDevelopmentWizard.setState({
          workflowId: 'residential_rent' as any,
          currentStepId: 'review_publish' as any,
          completedSteps: ['configuration', 'identity_market', 'location'] as any,
        });

        result.current.hydrateDevelopment({
          id: 123,
          name: 'DB Development',
          description: 'A DB edit row without a saved wizard snapshot',
          developmentType: 'residential',
          transactionType: 'for_sale',
          status: 'selling',
          address: '1 Main Road',
          city: 'Cape Town',
          province: 'Western Cape',
          unitTypes: [{ id: 'db-unit-1', name: 'Type A', bedrooms: 2, bathrooms: 2 }],
        });
      });

      expect(result.current.workflowId).toBeNull();
      expect(result.current.currentStepId).toBeNull();
      expect(result.current.completedSteps).toEqual([]);

      act(() => {
        result.current.initializeWorkflow('residential', 'for_sale');
      });

      expect(result.current.workflowId).toBe('residential_sale');
      expect(result.current.currentStepId).toBe('configuration');
      expect(result.current.currentStepId).not.toBe('review_publish');
    });
  });
});
