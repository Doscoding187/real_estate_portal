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

describe('EnhancedNavbar Professionals journey menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, logout: vi.fn() });
    mockUseLocation.mockReturnValue(['/', vi.fn()]);
  });

  it('uses the shared inset Professionals proposition card and a separate footer', async () => {
    const region = await openMenu(/^professionals$/i, 'Professionals navigation');
    const professionalsMenu = region.querySelector('.public-navbar__professionals-menu');
    const proposition = region.querySelector(
      '.public-navbar__journey-proposition-card--professionals',
    );

    expect(professionalsMenu).toBeInTheDocument();
    expect(proposition).toBeInTheDocument();
    expect(proposition).toHaveClass('public-navbar__journey-proposition-card');
    expect(region.querySelector('.public-navbar__journey-proposition-column')).toContainElement(
      proposition,
    );
    expect(
      professionalsMenu?.querySelector(':scope > .public-navbar__professionals-footer'),
    ).toBeInTheDocument();
    expect(
      proposition?.contains(
        professionalsMenu?.querySelector('.public-navbar__professionals-footer') ?? null,
      ),
    ).toBe(false);
  });

  it('preserves professional and partnership destinations without unsupported trust claims', async () => {
    const region = await openMenu(/^professionals$/i, 'Professionals navigation');

    expect(within(region).getByRole('link', { name: 'Agents' })).toHaveAttribute(
      'href',
      '/agents',
    );
    expect(within(region).getByRole('link', { name: 'Developers' })).toHaveAttribute(
      'href',
      '/developers',
    );
    expect(within(region).getByRole('link', { name: 'Service providers' })).toHaveAttribute(
      'href',
      '/services',
    );
    expect(within(region).getAllByRole('link', { name: 'Referrals and distribution' })[0]).toHaveAttribute(
      'href',
      '/distribution-network',
    );
    expect(within(region).getByRole('link', { name: 'Agent onboarding' })).toHaveAttribute(
      'href',
      '/advertise/sell/agents',
    );
    expect(within(region).getByRole('link', { name: 'Developer onboarding' })).toHaveAttribute(
      'href',
      '/advertise/sell/developers',
    );
    expect(within(region).getByRole('link', { name: 'Service provider onboarding' })).toHaveAttribute(
      'href',
      '/advertise/services',
    );
    expect(within(region).queryByText(/verified|guaranteed|response time/i)).not.toBeInTheDocument();
    expect(region.querySelectorAll('button a, a button')).toHaveLength(0);
  });

  it('keeps Services on its distinct governed task-menu presentation', async () => {
    const region = await openMenu(/^services$/i, 'Services navigation');

    expect(region).toHaveAttribute('aria-label', 'Services navigation');
    expect(region.querySelector('.public-navbar__professionals-menu')).toBeNull();
    expect(region.querySelector('.public-navbar__services-menu')).toBeInTheDocument();
    expect(region.querySelector('.public-navbar__mega-grid')).toBeNull();
    expect(within(region).getByRole('link', { name: 'Browse all services' })).toHaveAttribute(
      'href',
      '/services',
    );
  });
});
