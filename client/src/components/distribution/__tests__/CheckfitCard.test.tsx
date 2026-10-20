import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveCheckfitSnapshot, type CheckfitSnapshot } from '../distributionCheckfitStorage';
import { CheckfitCard } from '../CheckfitCard';

const { mockMutate, mockUseMutation } = vi.hoisted(() => ({
  mockMutate: vi.fn(),
  mockUseMutation: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    distribution: {
      calculateCheckfit: {
        useMutation: (...args: unknown[]) => mockUseMutation(...args),
      },
    },
  },
}));

const AVAILABLE_OUTCOME = {
  available: true,
  policyVersion: 'checkfit_v1',
  assumptions: {
    annualInterestRate: 10.5,
    rateSource: 'sarb_prime_rate',
    rateSourceLabel: 'SARB prime rate (platform settings)',
    rateUpdatedAt: '2026-10-01T00:00:00.000Z',
    termMonths: 240,
    repaymentAllowanceRatio: 0.3,
  },
  inputs: { grossMonthlyIncome: 50_000, monthlyDebts: 0, deposit: 0 },
  result: {
    repaymentAllowanceMonthly: 15_000,
    estimatedLoanAmount: 1_502_434,
    estimatedPurchasePrice: 1_502_434,
  },
  disclaimers: ['Indicative estimate only. Not a final bond approval.'],
};

const UNAVAILABLE_OUTCOME = {
  available: false,
  policyVersion: 'checkfit_v1',
  unavailableReason: 'prime_rate_unavailable',
  disclaimers: ['Indicative estimate only. Not a final bond approval.'],
};

function latestOnSuccess() {
  const call = mockMutate.mock.calls.at(-1);
  if (!call) throw new Error('mutation was not invoked');
  return call[1].onSuccess as (data: unknown) => void;
}

describe('CheckfitCard', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      data: undefined,
    });
  });

  it('requires a gross monthly income before requesting a check-fit', () => {
    render(<CheckfitCard marketMode="sale" onStartIntroduction={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /check indicative range/i }));
    expect(mockMutate).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/gross monthly income/i);
  });

  it('requests the check-fit with whole rand inputs and renders the indicative result', () => {
    render(<CheckfitCard marketMode="sale" onStartIntroduction={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/gross monthly income/i), {
      target: { value: '50 000' },
    });
    fireEvent.click(screen.getByRole('button', { name: /check indicative range/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      { grossMonthlyIncome: 50_000, monthlyDebts: 0, deposit: 0 },
      expect.anything(),
    );

    act(() => latestOnSuccess()(AVAILABLE_OUTCOME));
    expect(screen.getAllByText(/R1\s?502\s?434/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Indicative estimate only/i)).toBeInTheDocument();
    expect(screen.getByText(/10\.50%/)).toBeInTheDocument();
  });

  it('shows a clear unavailable state without guessing a rate', () => {
    render(<CheckfitCard marketMode="sale" onStartIntroduction={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/gross monthly income/i), {
      target: { value: '40000' },
    });
    fireEvent.click(screen.getByRole('button', { name: /check indicative range/i }));
    act(() => latestOnSuccess()(UNAVAILABLE_OUTCOME));
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
  });

  it('restores the saved in-browser check-fit for a returning visitor', () => {
    const snapshot: CheckfitSnapshot = {
      version: 1,
      savedAt: '2026-10-19T09:00:00.000Z',
      policyVersion: 'checkfit_v1',
      inputs: { grossMonthlyIncome: 50_000, monthlyDebts: 0, deposit: 0 },
      assumptions: {
        annualInterestRate: 10.5,
        rateUpdatedAt: '2026-10-01T00:00:00.000Z',
        termMonths: 240,
        repaymentAllowanceRatio: 0.3,
      },
      result: {
        repaymentAllowanceMonthly: 15_000,
        estimatedLoanAmount: 1_502_434,
        estimatedPurchasePrice: 1_502_434,
      },
      disclaimers: ['Indicative estimate only. Not a final bond approval.'],
    };
    saveCheckfitSnapshot(snapshot);

    render(<CheckfitCard marketMode="sale" onStartIntroduction={vi.fn()} />);
    expect(screen.getAllByText(/R1\s?502\s?434/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Saved in this browser/i)).toBeInTheDocument();
  });

  it('states the rental model is unavailable while browsing rentals', () => {
    render(<CheckfitCard marketMode="rent" onStartIntroduction={vi.fn()} />);
    expect(screen.getByText(/rental affordability uses a separate model/i)).toBeInTheDocument();
  });

  it('routes the start-an-introduction action to the caller', () => {
    const onStartIntroduction = vi.fn();
    render(<CheckfitCard marketMode="sale" onStartIntroduction={onStartIntroduction} />);
    fireEvent.click(screen.getByRole('button', { name: /start an introduction/i }));
    expect(onStartIntroduction).toHaveBeenCalledTimes(1);
  });
});
