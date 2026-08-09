import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import PricingStep from './PricingStep';
import { useListingWizardStore } from '@/hooks/useListingWizard';

describe('PricingStep', () => {
  beforeEach(() => {
    act(() => {
      useListingWizardStore.getState().reset();
    });
    localStorage.removeItem('listing-wizard-storage');
  });

  afterEach(() => {
    cleanup();
  });

  it('accepts a directly typed Sale price without a bond estimate', () => {
    act(() => {
      useListingWizardStore.getState().setAction('sell');
    });
    render(<PricingStep />);

    fireEvent.change(screen.getByLabelText('Asking price in Rand'), {
      target: { value: '2500000' },
    });

    expect(useListingWizardStore.getState().pricing).toMatchObject({ askingPrice: 2_500_000 });
    expect(screen.queryByText(/monthly repayment/i)).toBeNull();
  });

  it('keeps a rental zero deposit explicit instead of treating it as missing', () => {
    act(() => {
      useListingWizardStore.getState().setAction('rent');
    });
    render(<PricingStep />);

    fireEvent.change(screen.getByLabelText('Monthly rent in Rand'), {
      target: { value: '18000' },
    });
    fireEvent.change(screen.getByLabelText('Deposit status'), {
      target: { value: 'zero' },
    });

    expect(useListingWizardStore.getState().pricing).toMatchObject({
      monthlyRent: 18_000,
      depositFact: { status: 'zero' },
    });
    expect(screen.getByText(/no deposit is required/i)).toBeInTheDocument();
  });
});
