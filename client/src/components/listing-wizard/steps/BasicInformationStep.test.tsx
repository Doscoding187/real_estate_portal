import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import BasicInformationStep from './BasicInformationStep';
import { useListingWizardStore } from '@/hooks/useListingWizard';

describe('BasicInformationStep direct numeric entry', () => {
  beforeEach(() => {
    act(() => {
      useListingWizardStore.getState().reset();
      useListingWizardStore.getState().setListingIntent('sale');
    });
    localStorage.removeItem('listing-wizard-storage');
  });

  afterEach(() => {
    cleanup();
  });

  it('keeps direct decimal input intact while typing and commits the canonical value', () => {
    act(() => {
      useListingWizardStore.getState().setPropertyType('apartment');
    });
    render(<BasicInformationStep />);

    const bedrooms = screen.getByLabelText(/Bedrooms/);
    const internalArea = screen.getByLabelText(/Internal \/ unit area/);
    expect(bedrooms.getAttribute('data-numeric-entry')).toBe('direct');
    expect(bedrooms.getAttribute('inputmode')).toBe('numeric');
    expect(internalArea.getAttribute('inputmode')).toBe('decimal');

    fireEvent.change(bedrooms, { target: { value: '2' } });
    fireEvent.change(internalArea, { target: { value: '120.5' } });
    fireEvent.blur(internalArea);

    expect((bedrooms as HTMLInputElement).value).toBe('2');
    expect((internalArea as HTMLInputElement).value).toBe('120.5');
    expect(useListingWizardStore.getState().propertyDetails?.corePropertyInformation).toMatchObject({
      bedrooms: { status: 'known', value: 2 },
      internalArea: { status: 'known', valueM2: 120.5, unit: 'm2' },
    });
  });

  it('preserves zero and unknown as distinct numeric states', () => {
    act(() => {
      useListingWizardStore.getState().setPropertyType('house');
    });
    render(<BasicInformationStep />);

    const bedrooms = screen.getByLabelText(/Bedrooms/);
    fireEvent.change(bedrooms, { target: { value: '0' } });
    fireEvent.blur(bedrooms);
    expect(
      useListingWizardStore.getState().propertyDetails?.corePropertyInformation?.bedrooms,
    ).toEqual({ status: 'known', value: 0 });

    fireEvent.change(bedrooms, { target: { value: '' } });
    fireEvent.blur(bedrooms);
    expect(
      useListingWizardStore.getState().propertyDetails?.corePropertyInformation?.bedrooms,
    ).toEqual({ status: 'unknown' });
  });

  it('accepts large direct land values for houses and farms', () => {
    act(() => {
      useListingWizardStore.getState().setPropertyType('house');
    });
    const houseView = render(<BasicInformationStep />);
    const erfArea = screen.getByLabelText(/Erf \/ stand area/);
    fireEvent.change(erfArea, { target: { value: '850' } });
    fireEvent.blur(erfArea);
    expect((erfArea as HTMLInputElement).value).toBe('850');
    expect(useListingWizardStore.getState().propertyDetails?.corePropertyInformation).toMatchObject({
      erfArea: { status: 'known', valueM2: 850, unit: 'm2' },
    });
    houseView.unmount();

    act(() => {
      useListingWizardStore.getState().reset();
      useListingWizardStore.getState().setListingIntent('sale');
      useListingWizardStore.getState().setPropertyType('farm');
    });
    render(<BasicInformationStep />);
    const farmArea = screen.getByLabelText(/Total farm \/ land area/);
    fireEvent.change(farmArea, { target: { value: '1500' } });
    fireEvent.blur(farmArea);

    expect((farmArea as HTMLInputElement).value).toBe('1500');
    expect(useListingWizardStore.getState().propertyDetails?.corePropertyInformation).toMatchObject({
      farmLandArea: {
        status: 'known',
        value: 1500,
        sourceUnit: 'hectares',
        normalizedM2: 15000000,
      },
    });
  });
});
