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

async function openMenu(label: RegExp, regionName: string) {
  render(<EnhancedNavbar />);
  fireEvent.click(screen.getByRole('button', { name: label }));
  return screen.getByRole('region', { name: regionName });
}

describe('EnhancedNavbar Insights menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, logout: vi.fn() });
    mockUseLocation.mockReturnValue(['/', vi.fn()]);
  });

  it('uses the shared contained Insights proposition card with a separate footer', async () => {
    const region = await openMenu(/^insights$/i, 'Insights navigation');
    const insightsMenu = region.querySelector('.public-navbar__insights-menu');
    const proposition = region.querySelector(
      '.public-navbar__journey-proposition-card--insights',
    );

    expect(insightsMenu).toBeInTheDocument();
    expect(region.querySelector('.public-navbar__mega-grid')).toBeNull();
    expect(proposition).toHaveClass('public-navbar__journey-proposition-card');
    expect(region.querySelector('.public-navbar__journey-proposition-column')).toContainElement(
      proposition,
    );
    expect(insightsMenu?.querySelector(':scope > .public-navbar__insights-footer')).toBeInTheDocument();
    expect(
      proposition?.contains(insightsMenu?.querySelector('.public-navbar__insights-footer') ?? null),
    ).toBe(false);
  });

  it('preserves governed insight and guide destinations without unsupported market claims', async () => {
    const region = await openMenu(/^insights$/i, 'Insights navigation');

    expect(within(region).getByRole('link', { name: 'Explore insights' })).toHaveAttribute(
      'href',
      '/insights/property-insights',
    );
    expect(within(region).getAllByRole('link', { name: 'Market trends' })[0]).toHaveAttribute(
      'href',
      '/insights/market-trends',
    );
    expect(within(region).getAllByRole('link', { name: 'Property insights' })[0]).toHaveAttribute(
      'href',
      '/insights/property-insights',
    );
    expect(within(region).getByRole('link', { name: 'Buying guide' })).toHaveAttribute(
      'href',
      '/guides/buying-property',
    );
    expect(within(region).getByRole('link', { name: 'Selling guide' })).toHaveAttribute(
      'href',
      '/guides/selling-property',
    );
    expect(within(region).getByRole('link', { name: 'Property Listify blog' })).toHaveAttribute(
      'href',
      '/insights/blog',
    );
    expect(
      within(region).queryByText(/real[- ]time|guaranteed|investment return|personalized advice/i),
    ).not.toBeInTheDocument();
    expect(region.querySelectorAll('button a, a button')).toHaveLength(0);
  });

  it('closes an open mega menu when Explore is hovered while preserving its direct-link semantics', async () => {
    await openMenu(/^insights$/i, 'Insights navigation');
    expect(screen.getByRole('region', { name: 'Insights navigation' })).toBeInTheDocument();

    const explore = screen.getByRole('link', { name: 'Explore' });
    expect(explore).toHaveAttribute('href', '/explore');
    expect(explore).not.toHaveAttribute('aria-controls');
    expect(explore).not.toHaveAttribute('aria-expanded');
    const badge = within(explore).getByText('NEW');
    expect(badge).toHaveClass('public-navbar__new-badge');
    expect(badge).toHaveAttribute('aria-hidden', 'true');
    fireEvent.mouseEnter(explore);
    expect(screen.queryByRole('region', { name: 'Insights navigation' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Explore navigation' })).not.toBeInTheDocument();
  });

  it('exposes only the governed Explore entry in mobile navigation', async () => {
    render(<EnhancedNavbar />);
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));

    const drawer = document.getElementById('main-platform-mobile-menu');
    expect(drawer).not.toBeNull();
    expect(within(drawer!).getByRole('link', { name: 'Explore' })).toHaveAttribute(
      'href',
      '/explore',
    );
    expect(within(drawer!).queryByRole('link', { name: 'Upload content' })).not.toBeInTheDocument();
    expect(within(drawer!).queryByRole('link', { name: 'Feed' })).not.toBeInTheDocument();
  });
});
