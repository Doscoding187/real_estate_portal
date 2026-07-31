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

async function openSellersMenu() {
  render(<EnhancedNavbar />);
  fireEvent.click(screen.getByRole('button', { name: /for sellers/i }));
  return screen.getByRole('region', { name: 'For Sellers navigation' });
}

describe('EnhancedNavbar seller journey menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, logout: vi.fn() });
    mockUseLocation.mockReturnValue(['/', vi.fn()]);
  });

  it('uses the shared inset seller proposition card and leaves its footer separate', async () => {
    const region = await openSellersMenu();
    const sellerMenu = region.querySelector('.public-navbar__seller-menu');
    const proposition = region.querySelector(
      '.public-navbar__journey-proposition-card--sellers',
    );

    expect(sellerMenu).toBeInTheDocument();
    expect(proposition).toBeInTheDocument();
    expect(proposition).toHaveClass('public-navbar__journey-proposition-card');
    expect(region.querySelector('.public-navbar__journey-proposition-column')).toContainElement(
      proposition,
    );
    expect(sellerMenu?.querySelector(':scope > .public-navbar__seller-footer')).toBeInTheDocument();
    expect(proposition?.contains(sellerMenu?.querySelector('.public-navbar__seller-footer') ?? null)).toBe(
      false,
    );
  });

  it('retains all existing seller destinations and normal keyboard semantics', async () => {
    const region = await openSellersMenu();

    expect(within(region).getAllByRole('link', { name: 'Start selling your property' })[0]).toHaveAttribute(
      'href',
      '/advertise',
    );
    expect(within(region).getByRole('link', { name: 'Find estate agents' })).toHaveAttribute(
      'href',
      '/agents',
    );
    expect(within(region).getByRole('link', { name: 'Property developers' })).toHaveAttribute(
      'href',
      '/developers',
    );
    expect(within(region).getByRole('link', { name: 'Advertise a property' })).toHaveAttribute(
      'href',
      '/advertise',
    );
    expect(within(region).getByRole('link', { name: 'List privately' })).toHaveAttribute(
      'href',
      '/advertise',
    );
    expect(within(region).getByRole('link', { name: 'Property valuation guidance' })).toHaveAttribute(
      'href',
      '/tools/property-valuation',
    );
    expect(within(region).getAllByRole('link', { name: 'Selling guidance' })[0]).toHaveAttribute(
      'href',
      '/guides/selling-property',
    );
    expect(region.querySelectorAll('button a, a button')).toHaveLength(0);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: 'For Sellers navigation' })).not.toBeInTheDocument();
  });
});
