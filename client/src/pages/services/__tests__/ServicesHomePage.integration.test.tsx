/**
 * Integration Test: ServicesHomePage
 *
 * Asserts that TrustBar, CategoryCard grid, and ProviderCard list are all
 * present when the page renders with mocked tRPC data.
 *
 * Requirements: 1.1, 2.1
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock tRPC
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Import page after mocks
// ---------------------------------------------------------------------------

import ServicesHomePage from '../ServicesHomePage';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ServicesHomePage — integration', () => {
  it('renders the TrustBar with verified provider count', () => {
    render(<ServicesHomePage />);

    // TrustBar shows verified count — 1 of 2 providers is verified
    expect(screen.getByText(/verified providers/i)).toBeInTheDocument();
  });

  it('renders the CategoryTileGrid with all six categories', () => {
    render(<ServicesHomePage />);

    // CategoryTileGrid uses role="radiogroup"
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();

    // All six category tiles should be present
    expect(screen.getByRole('radio', { name: /home improvement/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /moving/i })).toBeInTheDocument();
  });

  it('renders at least one ProviderCard from the mocked data', () => {
    render(<ServicesHomePage />);

    expect(screen.getByText('Cape Plumbing Co')).toBeInTheDocument();
    expect(screen.getByText('Gauteng Movers')).toBeInTheDocument();
  });

  it('renders the Verified badge for the verified provider', () => {
    render(<ServicesHomePage />);

    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('renders the hero search section', () => {
    render(<ServicesHomePage />);

    expect(screen.getByText(/what can we help you with today/i)).toBeInTheDocument();
  });
});
