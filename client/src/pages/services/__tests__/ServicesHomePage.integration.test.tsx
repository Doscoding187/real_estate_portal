import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const mockProviders = [
  {
    providerId: 1,
    companyName: 'Cape Plumbing Co',
    verificationStatus: 'verified',
    subscriptionTier: 'directory',
    services: [{ category: 'home_improvement', code: 'plumbing', displayName: 'Plumbing' }],
    locations: [
      {
        canonicalPlaceId: 'pl-place-01-000000000000000000000001',
        label: 'Rondebosch, Cape Town, Western Cape',
      },
    ],
    logoUrl: null,
    moderationTier: null,
    averageRating: 4.8,
    reviewCount: 12,
    acceptingRequests: true,
    createdAt: '2024-03-01T00:00:00.000Z',
  },
  {
    providerId: 2,
    companyName: 'Gauteng Movers',
    verificationStatus: 'verified',
    subscriptionTier: 'directory',
    services: [{ category: 'moving', code: 'moving', displayName: 'Residential Moving' }],
    locations: [
      {
        canonicalPlaceId: 'pl-place-01-000000000000000000000002',
        label: 'Sandton, Johannesburg, Gauteng',
      },
    ],
    logoUrl: null,
    moderationTier: null,
    averageRating: 0,
    reviewCount: 0,
    acceptingRequests: true,
    createdAt: '2025-01-15T00:00:00.000Z',
  },
];

vi.mock('@/lib/trpc', () => ({
  trpc: {
    placeAuthority: {
      discover: {
        useQuery: () => ({ data: { query: '', outcome: 'none', results: [] }, isFetching: false }),
      },
      resolveSearchPlace: {
        useQuery: () => ({ data: null, isLoading: false, error: null }),
      },
    },
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

vi.mock('@/components/EnhancedNavbar', () => ({
  EnhancedNavbar: () => <nav aria-label="Main platform navigation" />,
}));

import ServicesHomePage from '../ServicesHomePage';

describe('ServicesHomePage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('presents the directory as a property-professional discovery surface', () => {
    render(<ServicesHomePage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /property services for every step/i,
    );
    expect(screen.getByRole('combobox', { name: /service category/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Choose an approved Place/i)).toBeInTheDocument();
  });

  it('requires a deliberate service choice before the hero search can run', () => {
    render(<ServicesHomePage />);

    const serviceSelect = screen.getByRole('combobox', { name: /service category/i });
    const searchButton = screen.getByRole('button', { name: /^search$/i });

    expect(serviceSelect).toHaveValue('');
    expect(searchButton).toBeDisabled();

    fireEvent.change(serviceSelect, { target: { value: 'plumbing' } });

    expect(serviceSelect).toHaveValue('plumbing');
    expect(searchButton).toBeEnabled();
  });

  it('renders real provider records and the platform verification signal', () => {
    render(<ServicesHomePage />);

    expect(screen.getAllByText('Cape Plumbing Co').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Gauteng Movers').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/verified/i).length).toBeGreaterThan(0);
  });

  it('renders the published rating aggregate without inventing proof for a new provider', () => {
    render(<ServicesHomePage />);

    expect(screen.getAllByText('4.8').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/12 reviews/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/no published reviews yet/i).length).toBeGreaterThan(0);
  });

  it('partitions ranked services between the rail and the remaining directory', () => {
    render(<ServicesHomePage />);

    expect(screen.getByRole('heading', { name: /explore more services/i })).toBeInTheDocument();
    const plumbingLinks = screen.getAllByRole('link', { name: /plumbing & maintenance/i });
    expect(plumbingLinks).toHaveLength(1);
    expect(plumbingLinks[0]).toHaveAttribute('href', expect.stringContaining('query=plumbing'));
    expect(screen.getAllByRole('link', { name: /inspections & compliance/i })).toHaveLength(1);
    expect(screen.queryByText('Start with what you need done')).not.toBeInTheDocument();
  });

  it('does not show fabricated customer proof or satisfaction guarantees', () => {
    render(<ServicesHomePage />);

    expect(screen.queryByText(/customer proof/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/satisfaction.*guaranteed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Nomsa K\./i)).not.toBeInTheDocument();
  });

  it('does not present paid placement or subscription pricing', () => {
    render(<ServicesHomePage />);

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
