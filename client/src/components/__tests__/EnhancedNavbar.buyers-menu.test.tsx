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

  it('opens the buyer menu with canonical discovery destinations', async () => {
    const region = await openBuyersMenu();

    expect(region.querySelector('.public-navbar__buyer-menu')).toBeInTheDocument();
    expect(region.querySelector('.public-navbar__mega-grid')).toBeNull();
    expect(
      within(region).getByRole('link', { name: 'Browse properties for sale' }),
    ).toHaveAttribute('href', '/property-for-sale');
    const developmentsLinks = within(region).getAllByRole('link', { name: 'New developments' });
    expect(developmentsLinks).toHaveLength(1);
    expect(developmentsLinks[0]).toHaveAttribute('href', '/new-developments');
    expect(within(region).getByRole('link', { name: 'Plots and land' })).toHaveAttribute(
      'href',
      '/plots-and-land',
    );
    expect(within(region).getByRole('link', { name: 'Commercial property' })).toHaveAttribute(
      'href',
      '/property-for-sale?propertyType=commercial',
    );
    expect(within(region).getByRole('link', { name: 'Plan my buying budget' })).toHaveAttribute(
      'href',
      '/guides/buying-property',
    );
  });

  it('presents the buying guide truthfully and keeps shortlist access honest for visitors', async () => {
    const region = await openBuyersMenu();

    const primary = within(region).getByRole('link', { name: 'Plan my buying budget' });
    expect(primary).toHaveClass('public-navbar__buyer-primary-action');
    expect(primary).toHaveAttribute('href', '/guides/buying-property');

    for (const label of [
      'Income, expenses and deposit factors',
      'Bond, transfer and ownership costs',
      'Questions to ask before you enquire',
    ]) {
      const outcome = within(region).getByText(label);
      expect(outcome.closest('a')).toBeNull();
    }
    expect(
      within(region).queryByText('Matching 2-, 3- and 4-bedroom homes'),
    ).not.toBeInTheDocument();
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
    expect(
      within(region).queryByRole('link', { name: 'Sign in to continue' }),
    ).not.toBeInTheDocument();
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
    expect(
      within(drawer!).getByRole('link', { name: 'Browse properties for sale' }),
    ).toHaveAttribute('href', '/property-for-sale');
    expect(within(drawer!).getByRole('link', { name: /Saved properties/ })).toHaveAttribute(
      'href',
      '/favorites',
    );
    const developmentsLinks = within(drawer!).getAllByRole('link', { name: 'New developments' });
    expect(developmentsLinks).toHaveLength(1);
    expect(developmentsLinks[0]).toHaveAttribute('href', '/new-developments');
  });
});
