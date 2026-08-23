import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { useAuthMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
}));

vi.mock('wouter', () => ({
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} data-testid={typeof href === 'string' ? `link-${href}` : 'link-unknown'}>
      {children}
    </a>
  ),
  useLocation: () => ['/agency/setup', vi.fn()],
  useSearch: () => '',
}));

import AgencySetupAccountBoundary from '../AgencySetupAccountBoundary';

beforeEach(() => {
  useAuthMock.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('Agency setup assisted account boundary', () => {
  it('gives a signed-in agent an actionable Agency conversion path instead of a silent bounce', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: true, user: { role: 'agent' }, loading: false });
    render(<AgencySetupAccountBoundary />);

    expect(
      screen.getByText(/Agency setup needs an Agency owner account/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/signed in as an Agent account/i)).toBeInTheDocument();

    const registerLink = screen.getByTestId(
      'link-/login?mode=register&next=%2Fagency%2Fsetup&role=agency_admin',
    );
    expect(registerLink).toHaveAttribute(
      'href',
      '/login?mode=register&next=%2Fagency%2Fsetup&role=agency_admin',
    );
    expect(screen.getByText(/Back to the Agency overview/i)).toBeInTheDocument();
    expect(screen.getByText(/Continue to Agent Launch Access/i)).toBeInTheDocument();
  });

  it('explains the boundary for other non-agency roles without the agent cross-sell', () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      user: { role: 'property_developer' },
      loading: false,
    });
    render(<AgencySetupAccountBoundary />);

    expect(screen.getByText(/signed in as a Developer account/i)).toBeInTheDocument();
    expect(screen.queryByText(/Agent Launch Access/i)).not.toBeInTheDocument();
  });

  it('does not mutate or imply mutation of the current account', () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      user: { role: 'service_provider' },
      loading: false,
    });
    render(<AgencySetupAccountBoundary />);

    expect(screen.getByText(/Your current sign-in stays active/i)).toBeInTheDocument();
  });
});
