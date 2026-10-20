import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PartnerHowItWorksPage from './PartnerHowItWorksPage';

const { mockSetLocation } = vi.hoisted(() => ({ mockSetLocation: vi.fn() }));

vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return {
    ...actual,
    useLocation: () => ['/distribution/partner/how-it-works', mockSetLocation],
  };
});

vi.mock('@/components/referral/ReferralAppShell', () => ({
  ReferralAppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('PartnerHowItWorksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('explains the journey with contract-true claims', () => {
    render(<PartnerHowItWorksPage />);

    expect(screen.getByRole('heading', { name: 'How referrals work' })).toBeInTheDocument();
    expect(screen.getByText('Understand their needs')).toBeInTheDocument();
    expect(screen.getByText('Find suitable properties')).toBeInTheDocument();
    expect(screen.getByText("Introduce when they're ready")).toBeInTheDocument();
    expect(screen.getByText(/Preliminary affordability is not active yet/)).toBeInTheDocument();
    expect(screen.getByText(/does not mean a viewing is booked/)).toBeInTheDocument();
    expect(screen.getByText(/a payment date appears only when/)).toBeInTheDocument();
  });

  it('routes back to overview and to opportunities', () => {
    render(<PartnerHowItWorksPage />);

    fireEvent.click(screen.getAllByRole('button', { name: /Back to overview/ })[0]);
    expect(mockSetLocation).toHaveBeenCalledWith('/distribution/partner/overview');

    fireEvent.click(screen.getByRole('button', { name: /Find opportunities/ }));
    expect(mockSetLocation).toHaveBeenCalledWith('/distribution/partner/developments');
  });
});
