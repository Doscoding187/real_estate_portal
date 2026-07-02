import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useListingWizardStore } from '../useListingWizard';

describe('useListingWizardStore basicInfo partial updates', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useListingWizardStore());

    act(() => {
      result.current.reset();
    });

    localStorage.removeItem('listing-wizard-storage');
  });

  it('preserves sibling values across rapid partial basicInfo updates', () => {
    const { result } = renderHook(() => useListingWizardStore());

    act(() => {
      result.current.setBasicInfo({
        propertyCategory: 'existing',
        stockType: 'existing',
      });
      result.current.setBasicInfo({
        developmentAssociation: 'no_link',
      });
      result.current.setBasicInfo({
        possessionStatus: 'owner_occupied',
      });
    });

    expect(result.current.basicInfo).toMatchObject({
      propertyCategory: 'existing',
      stockType: 'existing',
      developmentAssociation: 'no_link',
      possessionStatus: 'owner_occupied',
    });
  });

  it('keeps untouched fields unchanged when updating one basicInfo field', () => {
    const { result } = renderHook(() => useListingWizardStore());

    act(() => {
      result.current.setBasicInfo({
        propertyCategory: 'new_development',
        developerName: 'Northpoint Builders',
        developmentName: 'The Ridge Estate',
      });
      result.current.setBasicInfo({
        developmentName: 'The Ridge Estate Phase 2',
      });
    });

    expect(result.current.basicInfo).toMatchObject({
      propertyCategory: 'new_development',
      developerName: 'Northpoint Builders',
      developmentName: 'The Ridge Estate Phase 2',
    });
  });

  it('still supports normal single-field basicInfo updates', () => {
    const { result } = renderHook(() => useListingWizardStore());

    act(() => {
      result.current.setBasicInfo({
        propertyCategory: 'existing',
      });
    });

    expect(result.current.basicInfo).toEqual({
      propertyCategory: 'existing',
    });
  });

  it('allows callers to explicitly clear individual basicInfo fields', () => {
    const { result } = renderHook(() => useListingWizardStore());

    act(() => {
      result.current.setBasicInfo({
        developmentName: 'The Ridge Estate',
        selectedDevelopmentId: 42,
      });
      result.current.setBasicInfo({
        developmentName: '',
        selectedDevelopmentId: undefined,
      });
    });

    expect(result.current.basicInfo).toMatchObject({
      developmentName: '',
      selectedDevelopmentId: undefined,
    });
  });
});
