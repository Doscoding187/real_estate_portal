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

describe('EnhancedNavbar renter discovery menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, logout: vi.fn() });
    mockUseLocation.mockReturnValue(['/', vi.fn()]);
  });

  it('keeps the Rent entry point hidden while the canonical journey gate is off', () => {
    render(<EnhancedNavbar />);

    expect(screen.queryByRole('button', { name: /for renters/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'For Renters navigation' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Browse all rentals' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Compare rentals' })).not.toBeInTheDocument();
  });

  it('does not expose Rent destinations from the mobile drawer either', () => {
    render(<EnhancedNavbar />);
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));

    const drawer = document.getElementById('main-platform-mobile-menu');
    expect(drawer).not.toBeNull();
    expect(
      within(drawer!)
        .queryAllByRole('link')
        .some(link => link.getAttribute('href')?.startsWith('/property-to-rent')),
    ).toBe(false);
    expect(within(drawer!).queryByRole('link', { name: 'Compare rentals' })).not.toBeInTheDocument();
    expect(within(drawer!).queryByText('For Renters')).not.toBeInTheDocument();
  });
});
