import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

vi.mock('@/lib/trpc', () => ({
  trpc: {
    locationPages: {
      getPopularCities: { useQuery: () => ({ data: [], isLoading: false, isError: false }) },
      getCityData: { useQuery: () => ({ data: undefined, isLoading: false, isError: false }) },
    },
  },
}));

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseLocation = useLocation as ReturnType<typeof vi.fn>;

describe('EnhancedNavbar account menu', () => {
  const accountTriggerName = /Open (login and account menu|account menu for)/;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocation.mockReturnValue(['/', vi.fn()]);
  });

  it('keeps login actions inside the profile menu for visitors and does not open on hover', async () => {
    mockUseAuth.mockReturnValue({ user: null, logout: vi.fn() });

    render(<EnhancedNavbar />);

    expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument();

    const accountTriggers = screen.getAllByRole('button', { name: accountTriggerName });
    expect(accountTriggers).toHaveLength(2);
    await userEvent.setup().hover(accountTriggers[0]);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await userEvent.setup().click(accountTriggers[0]);

    expect(screen.getByText('Your Property Listify account')).toBeInTheDocument();
    expect(
      screen.getByText('Log in to save properties and manage your property journey.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Log in' })).toHaveAttribute(
      'href',
      '/login?mode=signin&next=%2F',
    );
    expect(screen.getByRole('menuitem', { name: 'Create account' })).toHaveAttribute(
      'href',
      '/login?mode=register&next=%2F',
    );

    await userEvent.setup().keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
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
    await userEvent
      .setup()
      .click(screen.getAllByRole('button', { name: accountTriggerName })[0]);

    expect(screen.getByText('Ava Agent')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Open agent workspace' })).toHaveAttribute(
      'href',
      '/agent/dashboard',
    );

    await userEvent.setup().click(screen.getByRole('menuitem', { name: 'Log out' }));
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
  });

  it('keeps the account menu open and allows retry when logout fails', async () => {
    const logout = vi.fn().mockRejectedValue(new Error('network failure'));
    mockUseAuth.mockReturnValue({
      user: { firstName: 'Ava', lastName: 'Agent', role: 'agent' },
      logout,
    });

    render(<EnhancedNavbar />);
    const user = userEvent.setup();
    await user.click(screen.getAllByRole('button', { name: accountTriggerName })[0]);
    await user.click(screen.getByRole('menuitem', { name: 'Log out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not log you out. Please try again.',
    );
    expect(screen.getByText('Ava Agent')).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: 'Log out' }));
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(2));
  });

  it('prevents duplicate logout calls while the request is pending', async () => {
    let resolveLogout!: () => void;
    const logout = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveLogout = resolve;
        }),
    );
    mockUseAuth.mockReturnValue({
      user: { firstName: 'Ava', lastName: 'Agent', role: 'agent' },
      logout,
    });

    render(<EnhancedNavbar />);
    const user = userEvent.setup();
    await user.click(screen.getAllByRole('button', { name: accountTriggerName })[0]);
    const logoutItem = screen.getByRole('menuitem', { name: 'Log out' });
    fireEvent.click(logoutItem);
    fireEvent.click(logoutItem);

    expect(logout).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Logging out…')).toBeInTheDocument();

    resolveLogout();
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('uses the neutral icon when an authenticated user has no display identity', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'visitor' }, logout: vi.fn() });

    render(<EnhancedNavbar />);
    const trigger = screen.getAllByRole('button', { name: accountTriggerName })[0];
    expect(trigger.querySelector('svg')).toBeInTheDocument();

    await userEvent.setup().click(trigger);
    expect(screen.getByRole('menuitem', { name: 'Open member dashboard' })).toHaveAttribute(
      'href',
      '/user/dashboard',
    );
  });

  it('coordinates the account dropdown with mega menus and direct navigation', async () => {
    mockUseAuth.mockReturnValue({ user: null, logout: vi.fn() });

    render(<EnhancedNavbar />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'For Buyers' }));
    expect(screen.getByRole('region', { name: 'For Buyers navigation' })).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: accountTriggerName })[0]);
    expect(screen.queryByRole('region', { name: 'For Buyers navigation' })).not.toBeInTheDocument();
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.click(document.getElementById('public-navbar-trigger-services')!);
    await waitFor(() => expect(screen.getByRole('region', { name: 'Services navigation' })).toBeInTheDocument());
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Services navigation' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Explore' }));
    expect(screen.queryByRole('region', { name: 'Services navigation' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes from an outside pointer interaction', async () => {
    mockUseAuth.mockReturnValue({ user: null, logout: vi.fn() });

    render(<EnhancedNavbar />);
    await userEvent
      .setup()
      .click(screen.getAllByRole('button', { name: accountTriggerName })[0]);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('closes after the pointer leaves the account trigger and menu', async () => {
    mockUseAuth.mockReturnValue({ user: null, logout: vi.fn() });

    render(<EnhancedNavbar />);
    const user = userEvent.setup();
    const trigger = screen.getAllByRole('button', { name: accountTriggerName })[0];

    await user.click(trigger);
    const menu = screen.getByRole('menu');
    fireEvent.mouseLeave(trigger);
    fireEvent.mouseEnter(menu);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.mouseLeave(menu);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('closes an open Advertise menu when the pointer enters the login trigger', () => {
    mockUseAuth.mockReturnValue({ user: null, logout: vi.fn() });

    render(<EnhancedNavbar />);
    const advertiseTrigger = screen.getByRole('button', { name: /Advertise & Partner/ });
    const accountTrigger = screen.getAllByRole('button', { name: accountTriggerName })[0];

    fireEvent.mouseEnter(advertiseTrigger);
    expect(screen.getByRole('region', { name: 'Advertise & Partner navigation' })).toBeInTheDocument();

    fireEvent.mouseEnter(accountTrigger);
    expect(
      screen.queryByRole('region', { name: 'Advertise & Partner navigation' }),
    ).not.toBeInTheDocument();
  });

  it('opens with Enter and Space and restores focus after Escape', async () => {
    mockUseAuth.mockReturnValue({ user: null, logout: vi.fn() });

    render(<EnhancedNavbar />);
    const user = userEvent.setup();
    const trigger = screen.getAllByRole('button', { name: accountTriggerName })[0];

    trigger.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.keyboard(' ');
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('closes the account dropdown when the mobile drawer opens', async () => {
    mockUseAuth.mockReturnValue({ user: null, logout: vi.fn() });

    render(<EnhancedNavbar />);
    const user = userEvent.setup();
    await user.click(screen.getAllByRole('button', { name: accountTriggerName })[0]);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.click(document.querySelector('button[aria-label="Open navigation menu"]')!);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(screen.getByRole('navigation', { name: 'Main platform navigation' })).toBeInTheDocument();
  });
});
