/**
 * Integration Test: ServicesHomePage
 *
 * Asserts that the redesigned services homepage still renders its core
 * hero, category navigation, and provider proof points with mocked tRPC data.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockProviders = [
  {
    providerId: 'prov-1',
    companyName: 'Cape Plumbing Co',
    verificationStatus: 'verified',
    subscriptionTier: 'directory_explore',
    averageRating: 4.5,
    reviewCount: 12,
    services: [{ category: 'home_improvement', code: 'plumbing', displayName: 'Plumbing' }],
    locations: [{ suburb: 'Rondebosch', city: 'Cape Town', province: 'Western Cape', radiusKm: 30 }],
    logoUrl: null,
    moderationTier: null,
  },
  {
    providerId: 'prov-2',
    companyName: 'Gauteng Movers',
    verificationStatus: 'pending',
    subscriptionTier: 'directory',
    averageRating: 3.8,
    reviewCount: 5,
    services: [{ category: 'moving', code: 'moving', displayName: 'Residential Moving' }],
    locations: [{ suburb: 'Sandton', city: 'Johannesburg', province: 'Gauteng', radiusKm: 50 }],
    logoUrl: null,
    moderationTier: null,
  },
];

vi.mock('@/lib/trpc', () => ({
  trpc: {
    servicesEngine: {
      directorySearch: {
        useQuery: () => ({ data: mockProviders, isLoading: false, error: null }),
      },
    },
  },
}));

vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return {
    ...actual,
    useLocation: () => ['/services', vi.fn()],
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
      <a href={href}>{children}</a>
    ),
  };
});

vi.mock('@/lib/seo', () => ({ applySeo: vi.fn() }));

import ServicesHomePage from '../ServicesHomePage';

describe('ServicesHomePage - integration', () => {
  it('renders the hero trust metrics with verified provider count', () => {
    render(<ServicesHomePage />);

    expect(screen.getAllByText(/verified providers/i).length).toBeGreaterThan(0);
  });

  it('renders the redesigned category navigation', () => {
    render(<ServicesHomePage />);

    expect(screen.getByRole('combobox', { name: /category/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /home improvement/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /moving services/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /general handyman/i })).toBeInTheDocument();
  });

  it('renders provider proof points from the mocked data', () => {
    render(<ServicesHomePage />);

    expect(screen.getAllByText('Cape Plumbing Co').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Gauteng Movers').length).toBeGreaterThan(0);
  });

  it('renders the verified badge for the verified provider', () => {
    render(<ServicesHomePage />);

    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('renders the redesigned hero search section', () => {
    render(<ServicesHomePage />);

    expect(screen.getByText(/trusted pros for every stage of your/i)).toBeInTheDocument();
    expect(screen.getByText(/property services marketplace/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/suburb, city, province/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /find a pro/i }).length).toBeGreaterThan(0);
  });
});
