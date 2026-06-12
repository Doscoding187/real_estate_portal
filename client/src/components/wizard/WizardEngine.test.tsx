import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import {
  getWizardAuctionPackagingFeedback,
  getWizardPublicPreviewFeedback,
  getWizardRentalPackagingFeedback,
  WizardEngine,
} from './WizardEngine';

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

      const engineContext = screen.getByLabelText(`${engine} packaging context`);
      expect(engineContext).toBeTruthy();
      expect(engineContext).toHaveTextContent(engine);
      expect(engineContext).toHaveTextContent(signal);
      expect(engineContext).toHaveTextContent(new RegExp(outcome));
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

describe('WizardEngine rental packaging feedback', () => {
  beforeEach(() => {
    setRentalIdentityStep();
  });

  it('surfaces lease-native readiness for rental inventory', () => {
    useDevelopmentWizard.setState({
      workflowId: 'residential_rent',
      currentStepId: 'identity_market' as any,
      developmentType: 'residential',
      transactionType: 'for_rent' as any,
      unitTypes: [
        {
          id: 'rental-unit',
          name: 'Two Bed Rental',
          monthlyRentFrom: 18_500,
          depositRequired: 37_000,
          leaseTerm: '12 months',
          isFurnished: true,
          availableUnits: 8,
        },
      ] as any,
      developmentData: {
        name: 'Lease Ready Rental',
        status: 'leasing',
        developmentType: 'residential',
        transactionType: 'for_rent',
      } as any,
    });

    render(<WizardEngine />);

    expect(screen.getByLabelText('Rental packaging feedback')).toBeTruthy();
    expect(screen.getByText('Lease-ready renter journey')).toBeTruthy();
    expect(screen.getByText('6 of 6 ready')).toBeTruthy();
    expect(screen.getByText(/Rent from/i)).toBeTruthy();
    expect(screen.getByText(/Deposit from/i)).toBeTruthy();
    expect(screen.getByText('12 months lease term ready.')).toBeTruthy();
    expect(screen.getByText('Furnished option visible.')).toBeTruthy();
    expect(screen.getByText('8 rental units available.')).toBeTruthy();
    expect(screen.getByText(/rent, deposit, and lease expectations/i)).toBeTruthy();
  });

  it('shows lease-native gaps before rental qualification is clear', () => {
    const feedback = getWizardRentalPackagingFeedback({
      transactionType: 'for_rent',
      unitTypes: [
        {
          id: 'rental-unit',
          name: 'Incomplete Rental',
          monthlyRentFrom: 16_000,
          availableUnits: 0,
        },
      ],
    } as any);

    expect(feedback).toEqual([
      expect.objectContaining({
        label: 'Rent range',
        state: 'complete',
        detail: expect.stringMatching(/Rent from/i),
      }),
      expect.objectContaining({
        label: 'Deposit',
        state: 'attention',
        detail: expect.stringMatching(/deposit expectations/i),
      }),
      expect.objectContaining({
        label: 'Lease term',
        state: 'attention',
        detail: 'Add the lease term renters should expect.',
      }),
      expect.objectContaining({
        label: 'Furnished state',
        state: 'attention',
        detail: 'Confirm whether units are furnished or unfurnished.',
      }),
      expect.objectContaining({
        label: 'Availability',
        state: 'attention',
        detail: expect.stringMatching(/live leasing inventory/i),
      }),
      expect.objectContaining({
        label: 'Renter qualification',
        state: 'attention',
        detail: 'Complete rent, deposit, and lease term before qualification feels clear.',
      }),
    ]);
  });
});

describe('WizardEngine auction packaging feedback', () => {
  beforeEach(() => {
    setRentalIdentityStep();
  });

  it('surfaces bid-native readiness for auction inventory', () => {
    useDevelopmentWizard.setState({
      workflowId: 'residential_auction',
      currentStepId: 'identity_market' as any,
      developmentType: 'residential',
      transactionType: 'auction' as any,
      unitTypes: [
        {
          id: 'auction-unit',
          name: 'Auction Three Bed',
          startingBid: 920_000,
          reservePrice: 1_080_000,
          auctionStartDate: '2030-03-01T09:00:00.000Z',
          auctionEndDate: '2030-03-08T17:00:00.000Z',
          auctionStatus: 'scheduled',
          availableUnits: 2,
        },
      ] as any,
      developmentData: {
        name: 'Bid Ready Auction',
        status: 'launching-soon',
        developmentType: 'residential',
        transactionType: 'auction',
        media: {
          documents: [{ url: 'https://cdn.example.com/legal-pack.pdf' }],
        },
      } as any,
    });

    render(<WizardEngine />);

    expect(screen.getByLabelText('Auction packaging feedback')).toBeTruthy();
    expect(screen.getByText('Bid-ready auction journey')).toBeTruthy();
    expect(screen.getByText('6 of 6 ready')).toBeTruthy();
    expect(screen.getByText(/Bid from/i)).toBeTruthy();
    expect(screen.getByText('Auction window scheduled.')).toBeTruthy();
    expect(screen.getByText('Reserve tracked internally.')).toBeTruthy();
    expect(screen.getByText('scheduled lifecycle ready.')).toBeTruthy();
    expect(screen.getByText('1 bidder document attached.')).toBeTruthy();
    expect(screen.getByText('2 lots open inside a scheduled auction window.')).toBeTruthy();
  });

  it('shows auction-native gaps before bidder routing is clear', () => {
    const feedback = getWizardAuctionPackagingFeedback({
      transactionType: 'auction',
      unitTypes: [
        {
          id: 'auction-unit',
          name: 'Incomplete Auction',
          startingBid: 900_000,
          availableUnits: 0,
        },
      ],
      media: { documents: [] },
    } as any);

    expect(feedback).toEqual([
      expect.objectContaining({
        label: 'Starting bid',
        state: 'complete',
        detail: expect.stringMatching(/Bid from/i),
      }),
      expect.objectContaining({
        label: 'Auction window',
        state: 'attention',
        detail: 'Set when bidding opens and closes.',
      }),
      expect.objectContaining({
        label: 'Reserve strategy',
        state: 'attention',
        detail: 'Confirm the reserve before registration opens.',
      }),
      expect.objectContaining({
        label: 'Bidder registration',
        state: 'attention',
        detail: 'Set the auction lifecycle before bidder routing starts.',
      }),
      expect.objectContaining({
        label: 'Legal pack',
        state: 'attention',
        detail: 'Attach bidder documents, auction terms, or legal-pack material.',
      }),
      expect.objectContaining({
        label: 'Auction urgency',
        state: 'attention',
        detail: 'Pair an auction window with open lots so urgency feels real.',
      }),
    ]);
  });
});
