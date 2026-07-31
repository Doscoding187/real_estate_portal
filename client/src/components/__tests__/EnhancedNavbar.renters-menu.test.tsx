import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

async function openRentersMenu() {
  render(<EnhancedNavbar />);
  fireEvent.click(screen.getByRole('button', { name: /for renters/i }));
  return screen.getByRole('region', { name: 'For Renters navigation' });
}

describe('EnhancedNavbar renter discovery menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, logout: vi.fn() });
    mockUseLocation.mockReturnValue(['/', vi.fn()]);
  });

  it('renders the differentiated renter journey with supported canonical destinations', async () => {
    const region = await openRentersMenu();

    expect(region.querySelector('.public-navbar__renter-menu')).toBeInTheDocument();
    expect(region.querySelector('.public-navbar__mega-grid')).toBeNull();
    expect(within(region).getAllByRole('link', { name: 'Find rentals in my budget' })).toHaveLength(1);
    expect(within(region).getByRole('link', { name: 'Find rentals in my budget' })).toHaveAttribute(
      'href',
      '/property-to-rent',
    );
    expect(within(region).getByRole('link', { name: 'Browse all rentals' })).toHaveAttribute(
      'href',
      '/property-to-rent',
    );
    expect(within(region).getByRole('link', { name: 'Apartments for rent' })).toHaveAttribute(
      'href',
      '/property-to-rent?propertyType=apartment',
    );
    expect(within(region).getByRole('link', { name: 'Townhouses' })).toHaveAttribute(
      'href',
      '/property-to-rent?propertyType=townhouse',
    );
    expect(within(region).getByRole('link', { name: 'Rooms and shared living' })).toHaveAttribute(
      'href',
      '/property-to-rent?propertyType=shared_living',
    );
    expect(
      within(region).getByRole('link', { name: 'Commercial property to rent' }),
    ).toHaveAttribute('href', '/property-to-rent?propertyType=commercial');
    expect(within(region).queryByText(/student accommodation/i)).not.toBeInTheDocument();
    expect(within(region).queryByText(/short-term rentals/i)).not.toBeInTheDocument();
  });

  it('presents rental outcomes as information and keeps visitor account access honest', async () => {
    const region = await openRentersMenu();

    for (const label of [
      'Monthly rental budget',
      'Areas that may fit your budget',
      'Matching rental properties',
    ]) {
      const outcome = within(region).getByText(label);
      expect(outcome.closest('a, button')).toBeNull();
    }

    expect(within(region).getByRole('link', { name: 'Saved rentals' })).toHaveAttribute(
      'href',
      '/favorites',
    );
    expect(within(region).getByRole('link', { name: 'Compare rentals' })).toHaveAttribute(
      'href',
      '/compare',
    );
    expect(within(region).getByRole('link', { name: 'Find a letting agent' })).toHaveAttribute(
      'href',
      '/agents',
    );
    expect(within(region).getByText(/save, compare and manage your rental journey/i)).toBeInTheDocument();
    expect(within(region).getByRole('link', { name: 'Sign in to continue' })).toHaveAttribute(
      'href',
      '/login?mode=signin&next=/favorites',
    );
    expect(within(region).queryByText(/rental alerts/i)).not.toBeInTheDocument();
    expect(within(region).queryByText(/my enquiries/i)).not.toBeInTheDocument();
  });

  it('does not prompt authenticated renters to sign in and retains renter workspace links', async () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'renter@example.com', firstName: 'Ava', role: 'visitor' },
      logout: vi.fn(),
    });

    const region = await openRentersMenu();
    expect(within(region).queryByRole('link', { name: 'Sign in to continue' })).not.toBeInTheDocument();
    expect(within(region).getByRole('link', { name: 'Saved rentals' })).toHaveAttribute(
      'href',
      '/favorites',
    );
  });

  it('keeps its footer, keyboard behaviour, and interactive semantics intact', async () => {
    const region = await openRentersMenu();

    expect(within(region).getByRole('link', { name: 'Explore shared living' })).toHaveAttribute(
      'href',
      '/property-to-rent?propertyType=shared_living',
    );
    expect(region.querySelectorAll('button a, a button')).toHaveLength(0);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: 'For Renters navigation' })).not.toBeInTheDocument();
  });

  it('exposes the governed renter destinations in mobile navigation', async () => {
    render(<EnhancedNavbar />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Open navigation menu' }));

    const drawer = document.getElementById('main-platform-mobile-menu');
    expect(drawer).not.toBeNull();
    expect(within(drawer!).getByRole('link', { name: 'Browse all rentals' })).toHaveAttribute(
      'href',
      '/property-to-rent',
    );
    expect(within(drawer!).getByRole('link', { name: 'Rooms and shared living' })).toHaveAttribute(
      'href',
      '/property-to-rent?propertyType=shared_living',
    );
    expect(within(drawer!).getByRole('link', { name: /Saved rentals/ })).toHaveAttribute(
      'href',
      '/favorites',
    );
  });
});
