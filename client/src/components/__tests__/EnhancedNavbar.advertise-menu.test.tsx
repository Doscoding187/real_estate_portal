import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '@/_core/hooks/useAuth';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { useLocation } from 'wouter';

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('wouter', () => ({
  Link: ({
    href,
    children,
    onClick,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a
      href={href}
      {...props}
      onClick={event => {
        event.preventDefault();
        onClick?.(event);
      }}
    >
      {children}
    </a>
  ),
  useLocation: vi.fn(),
}));

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseLocation = useLocation as ReturnType<typeof vi.fn>;

function openAdvertiseMenu() {
  render(<EnhancedNavbar />);
  fireEvent.click(screen.getByRole('button', { name: /Advertise & Partner/ }));
  return screen.getByRole('region', { name: 'Advertise & Partner navigation' });
}

describe('EnhancedNavbar Advertise & Partner menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, logout: vi.fn() });
    mockUseLocation.mockReturnValue(['/', vi.fn()]);
  });

  it('renders as a mega-menu trigger with the shared contained structure', () => {
    const region = openAdvertiseMenu();
    const proposition = region.querySelector(
      '.public-navbar__journey-proposition-card--advertise',
    );

    const trigger = screen.getByRole('button', { name: /Advertise & Partner/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls', 'public-navbar-mega-panel');
    expect(region.querySelector('.public-navbar__advertise-menu')).toBeInTheDocument();
    expect(region.querySelector('.public-navbar__mega-grid')).toBeNull();
    expect(proposition).toHaveClass('public-navbar__journey-proposition-card');

    const advertiseMenu = region.querySelector('.public-navbar__advertise-menu');
    const footer = advertiseMenu?.querySelector(':scope > .public-navbar__advertise-footer');
    expect(footer).toBeInTheDocument();
    expect(proposition?.contains(footer ?? null)).toBe(false);
  });

  it('exposes the six governed commercial audiences and the /advertise hub', () => {
    const region = openAdvertiseMenu();

    expect(within(region).getByRole('link', { name: 'Explore all opportunities' })).toHaveAttribute(
      'href',
      '/advertise',
    );
    expect(
      within(region).getByRole('link', {
        name: 'Explore all advertising and partnership opportunities',
      }),
    ).toHaveAttribute('href', '/advertise');

    const audiences = [
      ['Agents', '/advertise/sell/agents'],
      ['Agencies', '/advertise/sell/agencies'],
      ['Property developers', '/advertise/sell/developers'],
      ['Banks', '/advertise/finance/banks'],
      ['Bond originators', '/advertise/finance/originators'],
      ['Service businesses', '/advertise/services'],
    ] as const;

    for (const [label, href] of audiences) {
      expect(within(region).getByRole('link', { name: label })).toHaveAttribute('href', href);
    }
  });

  it('keeps referrals, operational tools and unsupported commercial claims out', () => {
    const region = openAdvertiseMenu();

    expect(within(region).queryByRole('link', { name: /referral|distribution/i })).not.toBeInTheDocument();
    expect(within(region).queryByRole('link', { name: /dashboard|campaign|billing|commission/i })).not.toBeInTheDocument();
    expect(within(region).queryByText(/guaranteed|revenue|traffic|ROI|exclusive|instant approval/i)).not.toBeInTheDocument();
    expect(region.querySelectorAll('button a, a button')).toHaveLength(0);
  });

  it('assigns commercial funnel routes to Advertise & Partner', () => {
    mockUseLocation.mockReturnValue(['/advertise/finance/banks', vi.fn()]);
    render(<EnhancedNavbar />);

    const trigger = screen.getByRole('button', { name: /Advertise & Partner/ });
    expect(trigger).toHaveAttribute('data-active', 'true');

    fireEvent.click(trigger);
    expect(screen.getByRole('region', { name: 'Advertise & Partner navigation' })).toBeInTheDocument();
  });

  it('exposes only approved public commercial paths in the mobile section', () => {
    render(<EnhancedNavbar />);
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));

    const drawer = document.getElementById('main-platform-mobile-menu');
    expect(drawer).not.toBeNull();
    const section = within(drawer!).getByRole('heading', { name: 'Advertise & Partner' }).parentElement;
    expect(section).not.toBeNull();

    expect(within(section!).getByRole('link', { name: 'Explore all opportunities' })).toHaveAttribute(
      'href',
      '/advertise',
    );
    expect(within(section!).getByRole('link', { name: 'Agents' })).toHaveAttribute(
      'href',
      '/advertise/sell/agents',
    );
    expect(within(section!).getByRole('link', { name: 'Service businesses' })).toHaveAttribute(
      'href',
      '/advertise/services',
    );
    expect(within(section!).queryByRole('link', { name: /dashboard|campaign|billing|commission|referral/i })).not.toBeInTheDocument();
  });
});
