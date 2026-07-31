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

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseLocation = useLocation as ReturnType<typeof vi.fn>;

function openServicesMenu() {
  render(<EnhancedNavbar />);
  fireEvent.click(screen.getByRole('button', { name: /^services$/i }));
  return screen.getByRole('region', { name: 'Services navigation' });
}

describe('EnhancedNavbar Services menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, logout: vi.fn() });
    mockUseLocation.mockReturnValue(['/', vi.fn()]);
  });

  it('renders the contained Services journey card and separate footer', () => {
    const region = openServicesMenu();
    const servicesMenu = region.querySelector('.public-navbar__services-menu');
    const proposition = region.querySelector(
      '.public-navbar__journey-proposition-card--services',
    );

    expect(servicesMenu).toBeInTheDocument();
    expect(region.querySelector('.public-navbar__mega-grid')).toBeNull();
    expect(proposition).toHaveClass('public-navbar__journey-proposition-card');
    expect(region.querySelector('.public-navbar__journey-proposition-column')).toContainElement(
      proposition,
    );

    const footer = servicesMenu?.querySelector(':scope > .public-navbar__services-footer');
    expect(footer).toBeInTheDocument();
    expect(proposition?.contains(footer ?? null)).toBe(false);
  });

  it('uses the Services task journey and all six canonical category routes', () => {
    const region = openServicesMenu();

    expect(within(region).getByRole('link', { name: 'Browse all services' })).toHaveAttribute(
      'href',
      '/services',
    );
    expect(within(region).getByRole('link', { name: 'Browse all property services' })).toHaveAttribute(
      'href',
      '/services',
    );

    const categories = [
      ['Home Improvement', '/services/home-improvement'],
      ['Moving Services', '/services/moving'],
      ['Inspection & Compliance', '/services/inspection-compliance'],
      ['Finance & Legal', '/services/finance-legal'],
      ['Insurance', '/services/insurance'],
      ['Media & Marketing', '/services/media-marketing'],
    ] as const;

    for (const [label, href] of categories) {
      expect(within(region).getByRole('link', { name: label })).toHaveAttribute('href', href);
    }

    expect(within(region).getByText('Choose the service you need.')).toBeInTheDocument();
    expect(within(region).getByText('Add your location and project details.')).toBeInTheDocument();
    expect(
      within(region).getByText('Continue into the guided service journey.'),
    ).toBeInTheDocument();
  });

  it('does not expose provider acquisition, unsupported claims or nested controls', () => {
    const region = openServicesMenu();

    expect(within(region).queryByText(/become a provider|provider dashboard|advertise/i)).not.toBeInTheDocument();
    expect(within(region).queryByText(/trusted|verified|vetted|instant quote|guaranteed/i)).not.toBeInTheDocument();
    expect(region.querySelectorAll('button a, a button')).toHaveLength(0);
  });

  it('keeps mobile Services navigation on the same governed category authority', () => {
    render(<EnhancedNavbar />);
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));

    const drawer = document.getElementById('main-platform-mobile-menu');
    expect(drawer).not.toBeNull();
    const mobileServices = within(drawer!).getByRole('heading', { name: 'Services' }).parentElement;
    expect(mobileServices).not.toBeNull();

    expect(within(mobileServices!).getByRole('link', { name: 'Browse all property services' })).toHaveAttribute(
      'href',
      '/services',
    );
    expect(within(mobileServices!).getByRole('link', { name: 'Home Improvement' })).toHaveAttribute(
      'href',
      '/services/home-improvement',
    );
    expect(within(mobileServices!).getByRole('link', { name: 'Media & Marketing' })).toHaveAttribute(
      'href',
      '/services/media-marketing',
    );
    expect(within(mobileServices!).queryByRole('link', { name: /become a provider/i })).not.toBeInTheDocument();
  });
});
