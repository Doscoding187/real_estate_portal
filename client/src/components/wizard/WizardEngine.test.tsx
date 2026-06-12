import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { getWizardPublicPreviewFeedback, WizardEngine } from './WizardEngine';

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

describe('WizardEngine transaction engine guidance', () => {
  beforeEach(() => {
    setRentalIdentityStep();
  });

  it.each([
    {
      transactionType: 'for_sale',
      workflowId: 'residential_sale',
      engine: 'Sale Engine',
      signal: 'Sale price bands',
      outcome: 'purchase lead context',
    },
    {
      transactionType: 'for_rent',
      workflowId: 'residential_rent',
      engine: 'Rental Engine',
      signal: 'Monthly rent ranges',
      outcome: 'lease lead context',
    },
    {
      transactionType: 'auction',
      workflowId: 'residential_auction',
      engine: 'Auction Engine',
      signal: 'Auction window',
      outcome: 'auction lead context',
    },
  ])(
    'surfaces $engine commercial packaging context',
    ({ engine, outcome, signal, transactionType, workflowId }) => {
      useDevelopmentWizard.setState({
        workflowId: workflowId as any,
        currentStepId: 'identity_market' as any,
        developmentType: 'residential',
        transactionType: transactionType as any,
        developmentData: {
          name: `${engine} Proof`,
          developmentType: 'residential',
          transactionType,
        } as any,
      });

      render(<WizardEngine />);

      expect(screen.getByLabelText(`${engine} packaging context`)).toBeTruthy();
      expect(screen.getByText(engine)).toBeTruthy();
      expect(screen.getByText(signal)).toBeTruthy();
      expect(screen.getByText(new RegExp(outcome))).toBeTruthy();
      expect(screen.getByText(/market identity, launch posture, and developer promise/i)).toBeTruthy();
    },
  );
});

describe('WizardEngine public preview feedback', () => {
  beforeEach(() => {
    setRentalIdentityStep();
  });

  it('surfaces identity, highlights, and media readiness from canonical wizard data', () => {
    useDevelopmentWizard.setState({
      workflowId: 'residential_sale',
      currentStepId: 'identity_market' as any,
      developmentType: 'residential',
      transactionType: 'for_sale' as any,
      developmentData: {
        name: 'Preview Ready Sale',
        status: 'launching-soon',
        developmentType: 'residential',
        transactionType: 'for_sale',
        highlights: ['Views', 'Security', 'Walkable retail'],
        media: {
          heroImage: { url: 'https://cdn.example.com/hero.jpg' },
          photos: [{ url: 'https://cdn.example.com/gallery.jpg' }],
        },
      } as any,
    });

    render(<WizardEngine />);

    expect(screen.getByLabelText('Public preview feedback')).toBeTruthy();
    expect(screen.getByText('Buyer-facing basics before publish')).toBeTruthy();
    expect(screen.getByText('3 of 3 ready')).toBeTruthy();
    expect(screen.getByText(/Preview Ready Sale is ready to anchor the public preview/i)).toBeTruthy();
    expect(screen.getByText(/3 highlights ready for buyer-facing chips/i)).toBeTruthy();
    expect(screen.getByText(/Hero media ready with 1 gallery photo/i)).toBeTruthy();
  });

  it('shows missing preview basics before the package is public-ready', () => {
    const feedback = getWizardPublicPreviewFeedback({
      name: '',
      status: '',
      highlights: ['Only one'],
      media: { photos: [] },
    } as any);

    expect(feedback).toEqual([
      expect.objectContaining({
        label: 'Identity',
        state: 'attention',
        detail: expect.stringMatching(/Add the development name and market status/i),
      }),
      expect.objectContaining({
        label: 'Highlights',
        state: 'attention',
        detail: 'Add 2 more highlights for buyer-facing chips.',
      }),
      expect.objectContaining({
        label: 'Media',
        state: 'attention',
        detail: expect.stringMatching(/Add hero media/i),
      }),
    ]);
  });
});
