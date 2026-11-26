import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { BasicsPhase } from './BasicsPhase';
import { AboutPhase } from './AboutPhase';

const store = () => useDevelopmentWizard.getState();

describe('BasicsPhase', () => {
  beforeEach(() => {
    localStorage.clear();
    store().reset();
  });

  it('asks only for the setting; the old Development Type, Freehold Category and Sub-Type are gone', () => {
    render(<BasicsPhase />);
    expect(screen.getByText('What is the setting?')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Standalone/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Gated community/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Security estate/ })).toBeInTheDocument();
    expect(screen.queryByText('Development Type')).not.toBeInTheDocument();
    expect(screen.queryByText('Freehold Category')).not.toBeInTheDocument();
    expect(screen.queryByText('Property Sub-Type')).not.toBeInTheDocument();
    expect(screen.queryByText(/Residential Estate/)).not.toBeInTheDocument();
    expect(screen.queryByText(/retirement/i)).not.toBeInTheDocument();
    // The estate kinds only appear for a security estate.
    expect(screen.queryByText(/What kind of security estate/)).not.toBeInTheDocument();
  });

  it('Security estate reveals nine single-select kinds with Standard preselected', () => {
    render(<BasicsPhase />);
    fireEvent.click(screen.getByRole('radio', { name: /Security estate/ }));

    const group = screen.getByRole('radiogroup', { name: 'Kind of security estate' });
    const options = within(group).getAllByRole('radio');
    expect(options).toHaveLength(9);
    expect(options[0]).toHaveAccessibleName(/Standard security estate/);
    expect(options[0]).toHaveAttribute('aria-checked', 'true');
    expect(options.filter(o => o.getAttribute('aria-checked') === 'true')).toHaveLength(1);

    // Single select: choosing Golf un-chooses Standard.
    fireEvent.click(within(group).getByRole('radio', { name: /Golf estate/ }));
    const after = within(group).getAllByRole('radio');
    expect(after.filter(o => o.getAttribute('aria-checked') === 'true')).toHaveLength(1);
    expect(within(group).getByRole('radio', { name: /Golf estate/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(within(group).getByRole('radio', { name: /Standard security estate/ })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('saves the answer in the configuration step and as the older community type', () => {
    render(<BasicsPhase />);
    fireEvent.click(screen.getByRole('radio', { name: /Security estate/ }));
    expect(store().stepData.configuration).toMatchObject({
      setting: 'estate',
      estateType: 'standard',
    });
    expect(store().residentialConfig.communityTypes).toEqual(['security_estate_general']);

    fireEvent.click(screen.getByRole('radio', { name: /Golf estate/ }));
    expect(store().stepData.configuration?.estateType).toBe('golf');
    expect(store().residentialConfig.communityTypes).toEqual(['golf_estate']);

    fireEvent.click(screen.getByRole('radio', { name: /Gated community/ }));
    expect(store().stepData.configuration?.setting).toBe('gated');
    expect(store().stepData.configuration?.estateType).toBeUndefined();
    expect(store().residentialConfig.communityTypes).toEqual(['housing_estate_non_security']);
    expect(screen.queryByText(/What kind of security estate/)).not.toBeInTheDocument();
  });

  it('has no sale/rent toggle (the transaction comes from the start screen) and keeps the workflow', () => {
    store().initializeWorkflow('residential', 'for_rent');
    render(<BasicsPhase />);
    expect(screen.queryByText(/Mostly for/)).not.toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'Sale or rent' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /Standalone/ }));
    expect(store().workflowId).toBe('residential_rent');
    expect(store().stepData.configuration?.setting).toBe('standalone');
  });
});

describe('AboutPhase', () => {
  beforeEach(() => {
    localStorage.clear();
    store().reset();
    store().initializeWorkflow('residential', 'for_sale');
  });

  it('asks for a single tagline of at most 100 characters, with a counter', () => {
    render(<AboutPhase />);
    expect(screen.getAllByLabelText(/Tagline/)).toHaveLength(1);
    const tagline = screen.getByLabelText('Tagline') as HTMLInputElement;
    expect(tagline.maxLength).toBe(100);
    fireEvent.change(tagline, { target: { value: 'Freestanding family homes' } });
    expect(screen.getByTestId('tagline-counter')).toHaveTextContent('25 of 100');
    expect(store().getWizardData().subtitle).toBe('Freestanding family homes');
    expect(store().stepData.marketing_summary?.tagline).toBe('Freestanding family homes');
    // The old second tagline field and "Nature of Development" are gone.
    expect(screen.queryByText(/Subtitle/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Nature of Development/)).not.toBeInTheDocument();
  });

  it('shows the name hint and an optional Phase that replaces Nature (nature becomes phase)', () => {
    render(<AboutPhase />);
    expect(screen.getByText(/Shown on cards, the development page and Google/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Phase \(optional\)/), { target: { value: 'Phase 2' } });
    expect(store().getWizardData().phaseLabel).toBe('Phase 2');
    expect(store().getWizardData().nature).toBe('phase');
    fireEvent.change(screen.getByLabelText(/Phase \(optional\)/), { target: { value: '' } });
    expect(store().getWizardData().nature).toBe('new');
  });

  it('has four status cards and reveals only the dates that apply', () => {
    render(<AboutPhase />);
    const group = screen.getByRole('radiogroup', { name: 'Sales status' });
    expect(within(group).getAllByRole('radio')).toHaveLength(4);
    // Nothing chosen yet: no date fields.
    expect(screen.queryByLabelText('Launching (month)')).not.toBeInTheDocument();
    expect(screen.queryByText('Homes are handed over in phases')).not.toBeInTheDocument();

    fireEvent.click(within(group).getByRole('radio', { name: /Launching soon/ }));
    expect(screen.getByLabelText('Launching (month)')).toBeInTheDocument();
    expect(screen.queryByText('Homes are handed over in phases')).not.toBeInTheDocument();
    expect(store().getWizardData().status).toBe('launching-soon');

    fireEvent.click(within(group).getByRole('radio', { name: /off-plan/ }));
    expect(screen.queryByLabelText('Launching (month)')).not.toBeInTheDocument();
    expect(screen.getByText('Homes are handed over in phases')).toBeInTheDocument();
    expect(store().getWizardData().status).toBe('selling');
    expect(store().getWizardData().salesStage).toBe('off_plan');

    fireEvent.click(within(group).getByRole('radio', { name: /ready to move in/ }));
    expect(screen.queryByText('Homes are handed over in phases')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Expected completion')).not.toBeInTheDocument();
    expect(store().getWizardData().status).toBe('selling');
    expect(store().getWizardData().salesStage).toBe('ready');

    fireEvent.click(within(group).getByRole('radio', { name: /Sold out/ }));
    expect(screen.queryByLabelText('Launching (month)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Expected completion')).not.toBeInTheDocument();
    expect(store().getWizardData().status).toBe('sold-out');
  });

  it('phased handovers: toggle swaps Expected completion for first handover + final completion', () => {
    render(<AboutPhase />);
    fireEvent.click(screen.getByRole('radio', { name: /off-plan/ }));

    // Toggle off: one expected completion.
    expect(screen.getByLabelText('Expected completion')).toBeInTheDocument();
    expect(screen.queryByLabelText('First homes handed over from')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Homes are handed over in phases'));
    expect(screen.queryByLabelText('Expected completion')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('First homes handed over from'), {
      target: { value: '2027-03' },
    });
    fireEvent.change(screen.getByLabelText('Final completion'), { target: { value: '2029-12' } });

    const data = store().getWizardData();
    expect(data.handoverDuringConstruction).toBe(true);
    expect(String(data.expectedFirstHandoverDate)).toBe('2027-03-01');
    expect(String(data.completionDate)).toBe('2029-12-01');

    // Back to a single date: the first-handover date is dropped.
    fireEvent.click(screen.getByLabelText('Homes are handed over in phases'));
    expect(store().getWizardData().handoverDuringConstruction).toBe(false);
    expect(store().getWizardData().expectedFirstHandoverDate).toBeNull();
    expect(screen.getByLabelText('Expected completion')).toBeInTheDocument();
  });

  it('ownership is asked once and can be "Varies by house type"', () => {
    render(<AboutPhase />);
    for (const label of [
      'Full title',
      'Sectional title',
      'Life rights',
      'Leasehold',
      'Share block',
      'Varies by house type',
    ]) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Varies by house type' }));
    expect(store().getWizardData().ownershipTypes).toEqual(['varies']);
    expect(screen.getByText(/asked for each house type/)).toBeInTheDocument();

    // Single choice: picking another replaces it.
    fireEvent.click(screen.getByRole('button', { name: 'Share block' }));
    expect(store().getWizardData().ownershipTypes).toEqual(['share-block']);
  });

  it('no longer asks for highlights: they moved to the end of the Amenities step', () => {
    render(<AboutPhase />);
    expect(screen.queryByText('Highlights (temporary)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Add your own highlight')).not.toBeInTheDocument();
  });

  it('description counter explains the 50-character minimum', () => {
    render(<AboutPhase />);
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Too short' } });
    expect(screen.getByTestId('description-counter')).toHaveTextContent('At least 50 characters');
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'x'.repeat(60) },
    });
    expect(screen.getByTestId('description-counter')).toHaveTextContent('60 characters');
  });
});
