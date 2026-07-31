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

async function openBuyersMenu() {
  render(<EnhancedNavbar />);
  fireEvent.click(screen.getByRole('button', { name: /for buyers/i }));
  return screen.getByRole('region', { name: 'For Buyers navigation' });
}

describe('EnhancedNavbar buyer discovery menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, logout: vi.fn() });
    mockUseLocation.mockReturnValue(['/', vi.fn()]);
  });

  it('opens the buyer menu with canonical discovery and action destinations', async () => {
    const region = await openBuyersMenu();

    expect(region.querySelector('.public-navbar__buyer-menu')).toBeInTheDocument();
    expect(region.querySelector('.public-navbar__mega-grid')).toBeNull();
    expect(within(region).getByRole('link', { name: 'Browse properties for sale' })).toHaveAttribute(
      'href',
      '/property-for-sale',
    );
    expect(within(region).getAllByRole('link', { name: 'New developments' })[0]).toHaveAttribute(
      'href',
      '/new-developments',
    );
    expect(within(region).getByRole('link', { name: 'Plots and land' })).toHaveAttribute(
      'href',
      '/property-for-sale?propertyType=plot',
    );
    expect(within(region).getByRole('link', { name: 'Commercial property' })).toHaveAttribute(
      'href',
      '/property-for-sale?propertyType=commercial',
    );
    expect(within(region).getByRole('link', { name: 'Check my buying power' })).toHaveAttribute(
      'href',
      '/tools/affordability-calculator',
    );
    expect(within(region).getAllByRole('link', { name: 'New developments' })).toHaveLength(2);
  });

  it('presents Buyability outcomes as information and keeps shortlist access honest for visitors', async () => {
    const region = await openBuyersMenu();

    const primary = within(region).getByRole('link', { name: 'Check my buying power' });
    expect(primary).toHaveClass('public-navbar__buyer-primary-action');

    for (const label of [
      'Possible price range',
      'Estimated monthly repayment',
      'Matching 2-, 3- and 4-bedroom homes',
    ]) {
      const outcome = within(region).getByText(label);
      expect(outcome.closest('a')).toBeNull();
    }
    expect(
      within(region).queryByRole('link', { name: 'Estimate bond repayments' }),
    ).not.toBeInTheDocument();

    const saved = within(region).getByRole('link', { name: /Saved properties/ });
    expect(saved).toHaveAttribute('href', '/favorites');
    expect(within(region).getByRole('link', { name: 'Sign in to continue' })).toHaveAttribute(
      'href',
      '/login?mode=signin',
    );
    expect(within(region).queryByRole('link', { name: /viewings/i })).not.toBeInTheDocument();
  });

  it('does not prompt authenticated buyers to sign in', async () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'buyer@example.com', firstName: 'Ava', role: 'visitor' },
      logout: vi.fn(),
    });

    const region = await openBuyersMenu();
    expect(within(region).queryByRole('link', { name: 'Sign in to continue' })).not.toBeInTheDocument();
    expect(within(region).getByRole('link', { name: 'Saved properties' })).toHaveAttribute(
      'href',
      '/favorites',
    );
  });

  it('does not nest links inside buttons and closes on Escape', async () => {
    const region = await openBuyersMenu();

    expect(region.querySelectorAll('button a, a button')).toHaveLength(0);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: 'For Buyers navigation' })).not.toBeInTheDocument();
  });

  it('exposes the same governed buyer destinations in mobile navigation', async () => {
    render(<EnhancedNavbar />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Open navigation menu' }));

    const drawer = document.getElementById('main-platform-mobile-menu');
    expect(drawer).not.toBeNull();
    expect(within(drawer!).getByRole('link', { name: 'Browse properties for sale' })).toHaveAttribute(
      'href',
      '/property-for-sale',
    );
    expect(within(drawer!).getByRole('link', { name: /Saved properties/ })).toHaveAttribute(
      'href',
      '/favorites',
    );
    expect(within(drawer!).getByRole('link', { name: 'New developments' })).toHaveAttribute(
      'href',
      '/new-developments',
    );
  });
});
