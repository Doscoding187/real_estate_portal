import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AgentStatusStrip } from './AgentStatusStrip';

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

vi.mock('wouter', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

function renderStrip() {
  return render(<AgentStatusStrip />);
}

describe('AgentStatusStrip', () => {
  it('offers Launch Access to agents who have not selected a package', async () => {
    apiFetchMock.mockResolvedValue({
      packageSelected: false,
      approvalStatus: 'approved',
      recommendedNextStep: 'select_package',
    });
    renderStrip();
    expect(await screen.findByText('Activate Launch Access')).toBeTruthy();
  });

  it('offers renewal language once the launch term has expired', async () => {
    apiFetchMock.mockResolvedValue({
      packageSelected: true,
      approvalStatus: 'approved',
      subscriptionStatus: 'expired',
      recommendedNextStep: 'renew_launch_access',
    });
    renderStrip();
    expect(await screen.findByText('Renew Launch Access')).toBeTruthy();
    expect(screen.getByText('Launch Access expired')).toBeTruthy();
  });

  it('renders evaluated CTA labels only, never raw expressions', async () => {
    apiFetchMock.mockResolvedValue({
      packageSelected: true,
      approvalStatus: 'approved',
      subscriptionStatus: 'active',
      recommendedNextStep: 'dashboard',
    });
    renderStrip();
    await waitFor(() => expect(screen.getByText('Launch Access active')).toBeTruthy());
    expect(screen.queryByText(/showRenewalCta/)).toBeNull();
    expect(screen.queryByText(/\? '/)).toBeNull();
  });

  it('reports payment review states truthfully', async () => {
    apiFetchMock.mockResolvedValue({
      packageSelected: true,
      approvalStatus: 'pending',
      subscriptionStatus: 'payment_under_review',
      recommendedNextStep: 'await_payment_review',
    });
    renderStrip();
    expect(await screen.findByText('Payment proof under review')).toBeTruthy();
  });
});
