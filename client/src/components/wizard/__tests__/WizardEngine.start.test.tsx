import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/development-wizard/phases/LocationPhase', () => ({
  LocationPhase: () => <div>Location body</div>,
}));
vi.mock('@/components/development-wizard/phases/EstateProfilePhase', () => ({
  EstateProfilePhase: () => <div>Costs body</div>,
}));
vi.mock('@/components/development-wizard/phases/AmenitiesPhase', () => ({
  AmenitiesPhase: () => <div>Amenities body</div>,
}));
vi.mock('@/components/development-wizard/phases/OverviewPhase', () => ({
  OverviewPhase: () => <div>Overview body</div>,
}));
vi.mock('@/components/development-wizard/phases/MediaPhase', () => ({
  MediaPhase: () => <div>Media body</div>,
}));
vi.mock('@/components/development-wizard/phases/UnitTypesPhase', () => ({
  UnitTypesPhase: () => <div>Units body</div>,
}));
vi.mock('@/components/development-wizard/phases/FinalisationPhase', () => ({
  FinalisationPhase: () => <div>Review body</div>,
}));

import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { WizardEngine } from '../WizardEngine';

const store = () => useDevelopmentWizard.getState();

describe('WizardEngine start screen', () => {
  beforeEach(() => {
    localStorage.clear();
    store().reset();
  });

  it('shows nothing numbered before Start', () => {
    render(<WizardEngine />);
    expect(screen.getByText('What are you listing?')).toBeInTheDocument();
    expect(screen.getByText('What kind of property?')).toBeInTheDocument();
    expect(screen.queryByText(/Step \d+ of/)).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Wizard steps' })?.querySelectorAll('li')).toHaveLength(0);
    expect(screen.queryByText('Basics')).not.toBeInTheDocument();
    expect(store().workflowId).toBeNull();
  });

  it('offers only For sale / To rent and only Residential; auction and other kinds are hidden', () => {
    render(<WizardEngine />);
    expect(screen.getByRole('radio', { name: /For sale/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /To rent/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Residential/ })).toBeInTheDocument();
    for (const hidden of [/Auction/, /Commercial/, /Mixed/, /Land/, /Not available/]) {
      expect(screen.queryByText(hidden)).not.toBeInTheDocument();
    }
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
  });

  it('the preview shows the transaction badge from the answer, before Start', () => {
    render(<WizardEngine />);
    fireEvent.click(screen.getByRole('radio', { name: /To rent/ }));
    expect(screen.getByTestId('preview-transaction')).toHaveTextContent('To rent');
    fireEvent.click(screen.getByRole('radio', { name: /For sale/ }));
    expect(screen.getByTestId('preview-transaction')).toHaveTextContent('For sale');
  });

  it('Start begins the sale workflow at Step 1 of 8, with no transaction toggle in Basics', () => {
    render(<WizardEngine />);
    fireEvent.click(screen.getByRole('radio', { name: /For sale/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(store().workflowId).toBe('residential_sale');
    expect(screen.getAllByText(/Step 1 of 8/).length).toBeGreaterThan(0);
    expect(screen.getByText('What is the setting?')).toBeInTheDocument();
    expect(screen.queryByText(/Mostly for (sale|rent)/)).not.toBeInTheDocument();
  });

  it('To rent starts the rent workflow in the same shell', () => {
    render(<WizardEngine />);
    fireEvent.click(screen.getByRole('radio', { name: /To rent/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(store().workflowId).toBe('residential_rent');
    expect(store().transactionType).toBe('for_rent');
    expect(screen.getAllByText(/Step 1 of 8/).length).toBeGreaterThan(0);
  });

  it('a resumed draft (workflow already known) skips the start screen', () => {
    store().initializeWorkflow('residential', 'for_sale');
    render(<WizardEngine />);
    expect(screen.queryByText('What are you listing?')).not.toBeInTheDocument();
    expect(screen.getByText('What is the setting?')).toBeInTheDocument();
  });

  it('Back from step 1 returns to the start screen; changing the answer after data warns first', () => {
    store().initializeWorkflow('residential', 'for_sale');
    store().saveWorkflowStepData('configuration', { setting: 'standalone' });
    render(<WizardEngine />);

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('What are you listing?')).toBeInTheDocument();
    expect(screen.queryByText(/Step \d+ of/)).not.toBeInTheDocument();
    // The current answer is shown.
    expect(screen.getByRole('radio', { name: /For sale/ })).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('radio', { name: /To rent/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/may not apply/);
    expect(store().workflowId).toBe('residential_sale');

    fireEvent.click(screen.getByRole('button', { name: 'Change anyway' }));
    expect(store().workflowId).toBe('residential_rent');
    // Entered answers are kept.
    expect(store().stepData.configuration?.setting).toBe('standalone');
    expect(screen.getByText('What is the setting?')).toBeInTheDocument();
  });

  it('Back then Continue with the same answer returns to the same step without a warning', () => {
    store().initializeWorkflow('residential', 'for_sale');
    render(<WizardEngine />);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('What is the setting?')).toBeInTheDocument();
  });
});
