import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useListingWizardStore } from '../useListingWizard';

describe('useListingWizardStore navigation contract', () => {
  beforeEach(() => {
    act(() => {
      useListingWizardStore.getState().reset();
    });
    localStorage.removeItem('listing-wizard-storage');
  });

  it('does not advance from Step 1 until a sale or rent intent is selected', () => {
    const { result } = renderHook(() => useListingWizardStore());

    expect(result.current.canAdvanceFromStep(1)).toBe(false);

    act(() => {
      result.current.nextStep();
    });

    expect(result.current.currentStep).toBe(1);

    act(() => {
      result.current.setListingIntent('sale');
    });

    expect(result.current.action).toBe('sell');
    expect(result.current.canAdvanceFromStep(1)).toBe(true);

    act(() => {
      result.current.nextStep();
    });

    expect(result.current.currentStep).toBe(2);
    expect(result.current.completedSteps).toEqual([1]);
  });

  it('keeps auction as legacy transport without making it a current Step 1 intent', () => {
    const { result } = renderHook(() => useListingWizardStore());

    act(() => {
      result.current.setAction('auction');
      result.current.nextStep();
    });

    expect(result.current.action).toBe('auction');
    expect(result.current.currentStep).toBe(1);
    expect(result.current.completedSteps).toEqual([]);
  });

  it('does not allow a progress jump over an incomplete prerequisite', () => {
    const { result } = renderHook(() => useListingWizardStore());

    act(() => {
      result.current.setListingIntent('rent');
      result.current.goToStep(3);
    });

    expect(result.current.currentStep).toBe(1);

    act(() => {
      result.current.nextStep();
      result.current.goToStep(3);
    });

    expect(result.current.currentStep).toBe(2);
  });

  it('allows backward navigation while guarding the next required step', () => {
    const { result } = renderHook(() => useListingWizardStore());

    act(() => {
      result.current.setListingIntent('sale');
      result.current.nextStep();
      result.current.setPropertyType('house');
      result.current.nextStep();
    });

    expect(result.current.currentStep).toBe(3);
    expect(result.current.completedSteps).toEqual([1, 2]);
    expect(result.current.canAdvanceFromStep(3)).toBe(false);

    act(() => {
      result.current.nextStep();
    });

    expect(result.current.currentStep).toBe(3);

    act(() => {
      result.current.prevStep();
    });

    expect(result.current.currentStep).toBe(2);
  });

  it('retains shared facts but removes incompatible type-derived state', () => {
    const { result } = renderHook(() => useListingWizardStore());

    act(() => {
      result.current.setPropertyType('house');
      result.current.setPropertyDetails({
        bedrooms: 3,
        bathrooms: 2,
        houseAreaM2: 210,
        erfSizeM2: 500,
      });
      result.current.setAdditionalInfo({
        furnishingStatus: 'unfurnished',
        grade: 'a_grade',
        amenitiesFeatures: ['solar'],
      });
      result.current.setBasicInfo({ propertyCategory: 'existing', landSizeUnit: 'm2' });
      result.current.setBadges(['ready_to_move']);
      result.current.setPropertyType('apartment');
    });

    expect(result.current.propertyDetails).toEqual({
      bedrooms: 3,
      bathrooms: 2,
    });
    expect(result.current.additionalInfo).toEqual({
      furnishingStatus: 'unfurnished',
      amenitiesFeatures: ['solar'],
    });
    expect(result.current.basicInfo).toBeUndefined();
    expect(result.current.badges).toEqual([]);
  });
});
