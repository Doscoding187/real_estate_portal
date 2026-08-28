import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AdditionalInformationStep } from './AdditionalInformationStep';
import { useListingWizardStore } from '@/hooks/useListingWizard';

describe('AdditionalInformationStep custom highlights', () => {
  beforeEach(() => {
    act(() => {
      useListingWizardStore.getState().reset();
      useListingWizardStore.getState().setListingIntent('sale');
      useListingWizardStore.getState().setPropertyType('house');
    });
    localStorage.removeItem('listing-wizard-storage');
  });

  afterEach(() => {
    cleanup();
  });

  it('adds and removes a display-only custom highlight without changing canonical highlights', () => {
    render(<AdditionalInformationStep />);

    const input = screen.getByTestId('custom-highlight-input');
    fireEvent.change(input, { target: { value: '  Quiet   cul-de-sac  ' } });
    fireEvent.click(screen.getByTestId('add-custom-highlight'));

    expect(screen.getByText('Quiet cul-de-sac')).toBeTruthy();
    expect(useListingWizardStore.getState().additionalInfo?.featuresContext).toMatchObject({
      highlights: [],
      customHighlights: ['Quiet cul-de-sac'],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remove Quiet cul-de-sac' }));
    expect(useListingWizardStore.getState().additionalInfo?.featuresContext).toMatchObject({
      highlights: [],
      customHighlights: [],
    });
  });

  it('submits a custom highlight with Enter and prevents a duplicate canonical label', () => {
    render(<AdditionalInformationStep />);

    const input = screen.getByTestId('custom-highlight-input');
    fireEvent.change(input, { target: { value: 'Natural light' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('That highlight is already available above.')).toBeTruthy();

    fireEvent.change(input, { target: { value: 'Sunny kitchen' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(useListingWizardStore.getState().additionalInfo?.featuresContext).toMatchObject({
      customHighlights: ['Sunny kitchen'],
    });
  });

  it('captures the direct security setting as an explicit buyer fact', () => {
    render(<AdditionalInformationStep />);

    expect(screen.getByText('Sewerage system')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Security estate'));

    expect(useListingWizardStore.getState().additionalInfo?.featuresContext).toMatchObject({
      context: { securityProfile: 'security_estate' },
    });
  });
});
