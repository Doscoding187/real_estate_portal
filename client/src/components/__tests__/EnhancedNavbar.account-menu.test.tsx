import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('wouter', () => ({
  Link: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useLocation: vi.fn(),
}));

vi.mock('@/components/LocationAutosuggest', () => ({
  LocationAutosuggest: () => <input aria-label="Location search" />,
}));

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseLocation = useLocation as ReturnType<typeof vi.fn>;

describe('EnhancedNavbar account menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocation.mockReturnValue(['/', vi.fn()]);
  });

  it('keeps login actions inside the profile menu for visitors', async () => {
    mockUseAuth.mockReturnValue({ user: null, logout: vi.fn() });

    render(<EnhancedNavbar />);

    expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument();

    const accountTriggers = screen.getAllByRole('button', { name: 'Open account menu' });
    expect(accountTriggers).toHaveLength(2);
    await userEvent.setup().click(accountTriggers[0]);

    expect(
      screen.getByText('Save properties and manage your property journey.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Log in' })).toHaveAttribute(
      'href',
      '/login?mode=signin',
    );
    expect(screen.getByRole('menuitem', { name: 'Create account' })).toHaveAttribute(
      'href',
      '/login?mode=register',
    );
  });

  it('shows the role-aware destination and logout for authenticated users', async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      user: {
        email: 'agent@example.com',
        firstName: 'Ava',
        lastName: 'Agent',
        role: 'agent',
      },
      logout,
    });

    render(<EnhancedNavbar />);
    await userEvent.setup().click(screen.getAllByRole('button', { name: 'Open account menu' })[0]);

    expect(screen.getByText('Ava Agent')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Open property agent' })).toHaveAttribute(
      'href',
      '/agent/dashboard',
    );

    fireEvent.click(screen.getByRole('menuitem', { name: 'Log out' }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
