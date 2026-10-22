import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PartnerReferralAcceleratorPage from './PartnerReferralAcceleratorPage';

const { mockUseAuth, mockUseLocation, mockSetLocation } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseLocation: vi.fn(),
  mockSetLocation: vi.fn(),
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return {
    ...actual,
    useLocation: () => mockUseLocation(),
  };
});

vi.mock('@/components/referral/ReferralAppShell', () => ({
  ReferralAppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('PartnerReferralAcceleratorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, loading: false });
    mockUseLocation.mockReturnValue(['/distribution/partner/accelerator', mockSetLocation]);
  });

  it('sends the referrer to the check fit and keeps the retired calculator out', () => {
    render(<PartnerReferralAcceleratorPage />);

    expect(screen.getByText('Check what a prospect can reach')).toBeInTheDocument();
    expect(screen.getAllByText(/final affordability assessment/i).length).toBeGreaterThan(0);
    expect(screen.queryByText('Set Gross Income')).not.toBeInTheDocument();
    expect(screen.queryByText('Calculate Snapshot')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'I have a prospect' }));

    expect(mockSetLocation).toHaveBeenCalledWith('/distribution/partner/prospect-check-fit');
  });

  it('keeps browsing by listed price available', () => {
    render(<PartnerReferralAcceleratorPage />);

    fireEvent.click(screen.getByRole('button', { name: /Find property opportunities/ }));

    expect(mockSetLocation).toHaveBeenCalledWith('/distribution/partner/developments');
  });

  it('routes back to my deals', () => {
    render(<PartnerReferralAcceleratorPage />);

    fireEvent.click(screen.getByRole('button', { name: 'My deals' }));

    expect(mockSetLocation).toHaveBeenCalledWith('/distribution/partner/referrals');
  });
});
