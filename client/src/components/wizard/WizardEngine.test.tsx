import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { WizardEngine } from './WizardEngine';

vi.mock('../development-wizard/phases/IdentityPhase', () => ({
  IdentityPhase: () => <div>Identity phase</div>,
}));

function setRentalIdentityStep() {
  useDevelopmentWizard.getState().reset();
  useDevelopmentWizard.setState({
    workflowId: 'residential_rent',
    currentStepId: 'identity_market',
    developmentType: 'residential',
    developmentData: {
      name: 'Manual Save Proof',
      developmentType: 'residential',
      transactionType: 'for_rent',
    } as any,
  });
}

describe('WizardEngine persistence controls', () => {
  beforeEach(() => {
    setRentalIdentityStep();
  });

  it('offers manual Save Draft before Review for create and draft journeys', () => {
    const onManualSaveDraft = vi.fn();

    render(<WizardEngine onManualSaveDraft={onManualSaveDraft} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    expect(onManualSaveDraft).toHaveBeenCalledTimes(1);
  });

  it('uses Save Progress instead of Save Draft while editing a development', () => {
    const onManualSaveDraft = vi.fn();
    const onSaveProgress = vi.fn();

    render(
      <WizardEngine
        onManualSaveDraft={onManualSaveDraft}
        onSaveProgress={onSaveProgress}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Save Draft' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save Progress' }));
    expect(onSaveProgress).toHaveBeenCalledTimes(1);
  });
});
