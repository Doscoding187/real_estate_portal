import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useListingWizardStore } from '../useListingWizard';

describe('useListingWizardStore partial wizard detail updates', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useListingWizardStore());
    act(() => {
      result.current.reset();
    });
    localStorage.removeItem('listing-wizard-storage');
  });

  it('preserves sibling basicInfo values across immediate partial updates', () => {
    const { result } = renderHook(() => useListingWizardStore());

    act(() => {
      result.current.setTitle('Modern family home');
      result.current.setDescription('A complete listing description for buyers.');
      result.current.setBasicInfo({
        stockType: 'existing',
        propertyCategory: 'existing',
      });
      result.current.setBasicInfo({
        developmentAssociation: 'no_link',
        developmentName: '',
        unitTypeName: '',
      });
      result.current.setBasicInfo({
        possessionStatus: 'owner_occupied',
      });
    });

    expect(result.current.basicInfo).toMatchObject({
      stockType: 'existing',
      propertyCategory: 'existing',
      developmentAssociation: 'no_link',
      developmentName: '',
      unitTypeName: '',
      possessionStatus: 'owner_occupied',
    });
    expect(result.current.title).toBe('Modern family home');
    expect(result.current.description).toBe('A complete listing description for buyers.');
  });

  it('preserves sibling additionalInfo buckets across immediate partial updates', () => {
    const { result } = renderHook(() => useListingWizardStore());

    act(() => {
      result.current.setAdditionalInfo({
        lifestyleHighlights: ['Natural Light'],
        propertyHighlights: ['Natural Light'],
      });
      result.current.setAdditionalInfo({
        viewHighlights: ['mountain_view'],
      });
      result.current.setAdditionalInfo({
        locationHighlights: ['near_top_schools'],
      });
      result.current.setAdditionalInfo({
        additionalRooms: ['Study / Office'],
      });
    });

    expect(result.current.additionalInfo).toMatchObject({
      lifestyleHighlights: ['Natural Light'],
      propertyHighlights: ['Natural Light'],
      viewHighlights: ['mountain_view'],
      locationHighlights: ['near_top_schools'],
      additionalRooms: ['Study / Office'],
    });
  });

  it('allows individual wizard detail fields to be explicitly cleared', () => {
    const { result } = renderHook(() => useListingWizardStore());

    act(() => {
      result.current.setBasicInfo({
        stockType: 'new_build',
        propertyCategory: 'new_development',
        developmentAssociation: 'link_existing',
        developerName: 'Acme Homes',
        selectedDeveloperId: 42,
        developmentName: 'Acme Estate',
        selectedDevelopmentId: 84,
        unitTypeName: 'Type B',
      });
      result.current.setAdditionalInfo({
        lifestyleHighlights: ['Natural Light'],
        viewHighlights: ['mountain_view'],
      });
      result.current.setBasicInfo({
        stockType: 'existing',
        propertyCategory: 'existing',
        developmentAssociation: 'no_link',
        developerName: '',
        selectedDeveloperId: undefined,
        developmentName: '',
        selectedDevelopmentId: undefined,
        unitTypeName: '',
      });
      result.current.setAdditionalInfo({
        viewHighlights: [],
      });
    });

    expect(result.current.basicInfo).toMatchObject({
      stockType: 'existing',
      propertyCategory: 'existing',
      developmentAssociation: 'no_link',
      developerName: '',
      selectedDeveloperId: undefined,
      developmentName: '',
      selectedDevelopmentId: undefined,
      unitTypeName: '',
    });
    expect(result.current.additionalInfo).toMatchObject({
      lifestyleHighlights: ['Natural Light'],
      viewHighlights: [],
    });
  });

  it('preserves sibling propertyDetails values across immediate partial updates', () => {
    const { result } = renderHook(() => useListingWizardStore());

    act(() => {
      result.current.setPropertyDetails({
        bedrooms: 3,
      });
      result.current.setPropertyDetails({
        bathrooms: 2,
      });
      result.current.setPropertyDetails({
        houseAreaM2: 180,
      });
      result.current.updatePropertyDetail('parkingCount' as any, 2);
    });

    expect(result.current.propertyDetails).toMatchObject({
      bedrooms: 3,
      bathrooms: 2,
      houseAreaM2: 180,
      parkingCount: 2,
    });
  });

  it('reset clears merged wizard detail objects', () => {
    const { result } = renderHook(() => useListingWizardStore());

    act(() => {
      result.current.setBasicInfo({ stockType: 'existing' });
      result.current.setAdditionalInfo({ viewHighlights: ['mountain_view'] });
      result.current.setPropertyDetails({ bedrooms: 3 });
      result.current.reset();
    });

    expect(result.current.basicInfo).toBeUndefined();
    expect(result.current.additionalInfo).toBeUndefined();
    expect(result.current.propertyDetails).toBeUndefined();
  });
});
