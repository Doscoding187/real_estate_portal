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

  it('explains that income-based estimates are not ready and keeps the retired calculator out', () => {
    render(<PartnerReferralAcceleratorPage />);

    expect(screen.getByText('Income-based estimates are not ready yet')).toBeInTheDocument();
    expect(screen.getByText(/finalizing the assumptions behind purchase estimates/i)).toBeInTheDocument();
    expect(screen.getByText(/does not mean a lender will approve them/i)).toBeInTheDocument();
    expect(screen.queryByText('Set Gross Income')).not.toBeInTheDocument();
    expect(screen.queryByText('Calculate Snapshot')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Find property opportunities/ }));

    expect(mockSetLocation).toHaveBeenCalledWith('/distribution/partner/developments');
  });

  it('routes back to my deals', () => {
    render(<PartnerReferralAcceleratorPage />);

    fireEvent.click(screen.getByRole('button', { name: 'My deals' }));

    expect(mockSetLocation).toHaveBeenCalledWith('/distribution/partner/referrals');
  });
});
