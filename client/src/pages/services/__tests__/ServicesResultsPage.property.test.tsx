import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';
import { render, screen } from '@testing-library/react';
import {
  SERVICE_CATEGORIES,
  formatCategoryLabel,
  type ServiceCategory,
} from '@/features/services/catalog';

const mockLead = vi.fn();
const PLACE_ID = 'pl-place-01-000000000000000000000000';

vi.mock('@/lib/trpc', () => ({
  trpc: {
    servicesEngine: {
      getLead: {
        useQuery: () => ({ data: mockLead(), isLoading: false, error: null }),
      },
    },
  },
}));

vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return {
    ...actual,
    useRoute: () => [true, { leadId: '42' }],
    useLocation: () => ['/services/results/42', vi.fn()],
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
      <a href={href}>{children}</a>
    ),
  };
});

vi.mock('@/lib/seo', () => ({ applySeo: vi.fn() }));

import ServicesResultsPage from '../ServicesResultsPage';

function makeLead(category: ServiceCategory = 'home_improvement') {
  return {
    id: 42,
    serviceCategory: category,
    sourceSurface: 'directory',
    intentStage: 'general',
    propertyId: null,
    listingId: null,
    developmentId: null,
    location: { canonicalPlaceId: PLACE_ID, label: 'Rondebosch, Cape Town, Western Cape' },
    notes: 'Please contact me after 5pm.',
    context: null,
    status: 'new',
    createdAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-01-10T00:00:00.000Z',
    requester: { name: 'Test requester' },
    providerResponse: {
      status: 'new',
      note: 'We can call after 5pm.',
      createdAt: '2026-01-10T00:00:00.000Z',
    },
    provider: {
      providerId: 7,
      companyName: 'Cape Plumbing Co',
      headline: 'Plumbing for property transfers',
      verificationStatus: 'verified',
      logoUrl: null,
      services: [{ category: 'home_improvement', code: 'plumbing', displayName: 'Plumbing' }],
      locations: [{ canonicalPlaceId: PLACE_ID, label: 'Rondebosch, Cape Town, Western Cape' }],
      reviews: [],
    },
  };
}

describe('ServicesResultsPage', () => {
  beforeEach(() => {
    mockLead.mockReset();
    mockLead.mockReturnValue(makeLead());
    sessionStorage.clear();
  });

  it('renders the server-authoritative provider and request state', () => {
    render(<ServicesResultsPage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Your request is with Cape Plumbing Co',
    );
    expect(screen.getByText('Request received')).toBeInTheDocument();
    expect(screen.getByText('Cape Plumbing Co')).toBeInTheDocument();
    expect(screen.getByText('Please contact me after 5pm.')).toBeInTheDocument();
  });

  it('shows a provider response when the provider has recorded one', () => {
    render(<ServicesResultsPage />);
    expect(screen.getByText('Provider response')).toBeInTheDocument();
    expect(screen.getByText('We can call after 5pm.')).toBeInTheDocument();
  });

  it('does not expose a second request action after the request is saved', () => {
    render(<ServicesResultsPage />);
    expect(screen.queryByRole('button', { name: /request service/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start another request/i })).toBeInTheDocument();
  });

  it('renders the human-readable category for every supported category', () => {
    fc.assert(
      fc.property(fc.constantFrom(...SERVICE_CATEGORIES), category => {
        mockLead.mockReturnValue(makeLead(category.value));
        const { unmount } = render(<ServicesResultsPage />);
        expect(screen.getByText(formatCategoryLabel(category.value))).toBeInTheDocument();
        unmount();
      }),
      { numRuns: 6 },
    );
  });

  it('renders the server Place label and safely handles a missing Place', () => {
    mockLead.mockReturnValue({
      ...makeLead(),
      location: { canonicalPlaceId: null, label: null },
    });
    const { unmount } = render(<ServicesResultsPage />);
    expect(screen.getByText('Selected Place unavailable')).toBeInTheDocument();
    unmount();

    mockLead.mockReturnValue({
      ...makeLead(),
      location: { canonicalPlaceId: PLACE_ID, label: 'Durban, KwaZulu-Natal' },
    });
    render(<ServicesResultsPage />);
    expect(screen.getByText('Durban, KwaZulu-Natal')).toBeInTheDocument();
  });

  it('shows a clear unavailable state when the lead cannot be loaded', () => {
    mockLead.mockReturnValue(null);
    render(<ServicesResultsPage />);
    expect(
      screen.getByRole('heading', { name: /could not load this request/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /browse services/i })).toBeInTheDocument();
  });
});
