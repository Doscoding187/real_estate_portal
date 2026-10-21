import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockProviders = [
  {
    providerId: 1,
    companyName: 'Cape Plumbing Co',
    verificationStatus: 'verified',
    subscriptionTier: 'directory',
    services: [{ category: 'home_improvement', code: 'plumbing', displayName: 'Plumbing' }],
    locations: [
      { suburb: 'Rondebosch', city: 'Cape Town', province: 'Western Cape', radiusKm: 30 },
    ],
    logoUrl: null,
    moderationTier: null,
  },
  {
    providerId: 2,
    companyName: 'Gauteng Movers',
    verificationStatus: 'verified',
    subscriptionTier: 'directory',
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

describe('ServicesHomePage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('presents the directory as a property-professional discovery surface', () => {
    render(<ServicesHomePage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Trusted local service providers for your property and home',
    );
    expect(screen.getByRole('combobox', { name: /service category/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. Gauteng, Sandton/i)).toBeInTheDocument();
  });

  it('renders real provider records and the platform verification signal', () => {
    render(<ServicesHomePage />);

    expect(screen.getAllByText('Cape Plumbing Co').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Gauteng Movers').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Platform verified').length).toBeGreaterThan(0);
  });

  it('does not show fabricated customer proof or satisfaction guarantees', () => {
    render(<ServicesHomePage />);

    expect(screen.queryByText(/customer proof/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/satisfaction.*guaranteed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Nomsa K\./i)).not.toBeInTheDocument();
  });

  it('does not present ratings, review counts or paid placement', () => {
    render(<ServicesHomePage />);

    // A review count always carries a number next to the word.
    expect(screen.queryByText(/\d+\s*reviews?/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\brated\b/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/sponsored|featured placement|top provider/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/per month|\/month|R\d+\s*\/mo/i)).not.toBeInTheDocument();
  });

  it('keeps a clear request entry point', () => {
    render(<ServicesHomePage />);
    expect(screen.getAllByRole('button', { name: /search/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /view all providers/i }).length).toBeGreaterThan(
      0,
    );
  });
});
