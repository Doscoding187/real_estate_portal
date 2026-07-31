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

describe('EnhancedNavbar Referrals entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, logout: vi.fn() });
    mockUseLocation.mockReturnValue(['/', vi.fn()]);
  });

  it('is one semantic direct link with no trigger or panel semantics', () => {
    render(<EnhancedNavbar />);

    const referrals = screen.getByRole('link', { name: 'Referrals' });
    expect(referrals.tagName).toBe('A');
    expect(referrals).toHaveAttribute('href', '/distribution-network');
    expect(referrals).not.toHaveAttribute('aria-expanded');
    expect(referrals).not.toHaveAttribute('aria-controls');
    expect(referrals.querySelector('svg')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /referrals navigation/i })).not.toBeInTheDocument();
  });

  it('closes an open mega menu on hover and remains immediately navigable on click', () => {
    render(<EnhancedNavbar />);

    fireEvent.click(screen.getByRole('button', { name: /^insights$/i }));
    expect(screen.getByRole('region', { name: 'Insights navigation' })).toBeInTheDocument();

    const referrals = screen.getByRole('link', { name: 'Referrals' });
    fireEvent.mouseEnter(referrals);
    expect(screen.queryByRole('region', { name: 'Insights navigation' })).not.toBeInTheDocument();

    fireEvent.click(referrals);
    expect(referrals).toHaveAttribute('href', '/distribution-network');
  });

  it('marks public referral routes active but not authenticated partner routes', () => {
    mockUseLocation.mockReturnValue(['/distribution-network/apply', vi.fn()]);
    const { unmount } = render(<EnhancedNavbar />);

    expect(screen.getByRole('link', { name: 'Referrals' })).toHaveAttribute('aria-current', 'page');

    unmount();
    mockUseLocation.mockReturnValue(['/distribution/partner/overview', vi.fn()]);
    render(<EnhancedNavbar />);

    expect(screen.getByRole('link', { name: 'Referrals' })).not.toHaveAttribute('aria-current');
  });

  it('exposes one public Referrals entry on mobile without operational partner links', () => {
    render(<EnhancedNavbar />);
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));

    const drawer = document.getElementById('main-platform-mobile-menu');
    expect(drawer).not.toBeNull();
    const partners = within(drawer!).getByRole('heading', { name: 'Partners' }).parentElement;
    expect(partners).not.toBeNull();
    expect(within(partners!).getAllByRole('link', { name: 'Referrals' })).toHaveLength(1);
    expect(within(partners!).getByRole('link', { name: 'Referrals' })).toHaveAttribute(
      'href',
      '/distribution-network',
    );
    expect(within(partners!).queryByRole('link', { name: /submit referral|my referrals|commissions|dashboard/i })).not.toBeInTheDocument();
  });
});
