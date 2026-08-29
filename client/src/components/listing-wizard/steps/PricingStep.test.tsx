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

  it('stores the tenant-facing rental terms in the versioned property contract', () => {
    act(() => {
      useListingWizardStore.getState().setAction('rent');
    });
    render(<PricingStep />);

    fireEvent.change(screen.getByLabelText('Rental availability'), {
      target: { value: 'available_from' },
    });
    fireEvent.change(screen.getByLabelText('Available from date'), {
      target: { value: '2026-10-01' },
    });
    fireEvent.change(screen.getByLabelText('Lease terms'), {
      target: { value: 'fixed_term' },
    });
    fireEvent.change(screen.getByLabelText('Minimum lease months'), {
      target: { value: '12' },
    });
    fireEvent.change(screen.getByLabelText('Utilities responsibility'), {
      target: { value: 'included' },
    });
    fireEvent.change(screen.getByLabelText('Rental furnishing'), {
      target: { value: 'furnished' },
    });

    expect(useListingWizardStore.getState().propertyDetails?.rentalTerms).toEqual({
      version: 1,
      availability: { status: 'available_from', date: '2026-10-01' },
      lease: { status: 'fixed_term', minimumMonths: 12 },
      utilities: 'included',
      furnishing: 'furnished',
    });
  });

  it('does not reset an in-progress availability date while it is being edited', () => {
    act(() => {
      useListingWizardStore.getState().setAction('rent');
    });
    render(<PricingStep />);

    fireEvent.change(screen.getByLabelText('Rental availability'), {
      target: { value: 'available_from' },
    });
    fireEvent.change(screen.getByLabelText('Available from date'), {
      target: { value: '' },
    });

    expect(useListingWizardStore.getState().propertyDetails?.rentalTerms).toMatchObject({
      version: 1,
      availability: { status: 'available_from', date: '' },
    });
  });
});
