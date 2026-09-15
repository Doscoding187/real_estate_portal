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
  it('offers private preparation to agents while commercial activation is disabled', async () => {
    apiFetchMock.mockResolvedValue({
      packageSelected: false,
      approvalStatus: 'approved',
      recommendedNextStep: 'select_package',
    });
    renderStrip();
    expect(await screen.findByText('Continue preparation')).toBeTruthy();
    expect(screen.getByText('Preparation-only onboarding')).toBeTruthy();
  });

  it('keeps expired commercial state in preparation-only handling', async () => {
    apiFetchMock.mockResolvedValue({
      packageSelected: true,
      approvalStatus: 'approved',
      subscriptionStatus: 'expired',
      recommendedNextStep: 'renew_launch_access',
    });
    renderStrip();
    expect(await screen.findByText('Continue preparation')).toBeTruthy();
    expect(screen.getByText('Preparation-only onboarding')).toBeTruthy();
  });

  it('renders evaluated CTA labels only, never raw expressions', async () => {
    apiFetchMock.mockResolvedValue({
      packageSelected: true,
      approvalStatus: 'approved',
      subscriptionStatus: 'active',
      recommendedNextStep: 'dashboard',
    });
    renderStrip();
    await waitFor(() => expect(screen.getByText('Preparation-only onboarding')).toBeTruthy());
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
    expect(await screen.findByText('Preparation-only onboarding')).toBeTruthy();
  });

  it('keeps an agency member in the agency activation path', async () => {
    apiFetchMock.mockResolvedValue({
      packageSelected: true,
      approvalStatus: 'approved',
      subscriptionStatus: 'pending_payment',
      recommendedNextStep: 'await_agency_activation',
    });
    renderStrip();
    expect(await screen.findByText('Preparation-only onboarding')).toBeTruthy();
    expect(screen.getByText('Return to dashboard')).toBeTruthy();
  });
});
