import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AgentListings from './AgentListings';

const harness = vi.hoisted(() => ({ navigate: vi.fn() }));
const privateListings = Array.from({ length: 50 }, (_, i) => ({
  id: 100 + i,
  title: `Fixture home ${String(i + 1).padStart(2, '0')}`,
  status: 'pending_review',
  approvalStatus: 'pending',
  propertyType: 'house',
  address: 'Example Street',
  suburb: 'Fixture suburb',
  pricing: { askingPrice: 100000 + i * 1000 },
  propertyDetails: {
    bedrooms: 3,
    bathrooms: 2,
    houseAreaM2: 99,
    erfSizeM2: 400,
    corePropertyInformation: {
      version: 1,
      internalArea: { status: 'known', valueM2: 70, unit: 'm2' },
      erfArea: { status: 'known', valueM2: 300, unit: 'm2' },
    },
  },
}));
vi.mock('@/_core/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 1, role: 'agent' } }) }));
vi.mock('@/components/agent/AgentAppShell', () => ({
  AgentAppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return {
    ...actual,
    useLocation: () => ['/agent/listings', harness.navigate],
  };
});
vi.mock('@/hooks/useAgentOnboardingStatus', () => ({
  useAgentOnboardingStatus: () => ({
    status: {
      dashboardUnlocked: true,
      fullFeaturesUnlocked: true,
      entitlements: { canPublishListings: true },
    },
    isLoading: false,
  }),
}));
vi.mock('@/lib/agentJourney', () => ({
  getAgentJourneyAction: () => ({ waiting: false }),
  isAgentProfileJourneyStep: () => false,
  getAgentProfileCompletionDescription: () => '',
}));
vi.mock('@/lib/readiness', () => ({
  calculateListingReadiness: () => ({ score: 100, missing: {} }),
}));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    useContext: () => ({
      agent: { getMyListings: { invalidate: vi.fn() } },
      listing: { myListings: { invalidate: vi.fn() } },
    }),
    listing: {
      myListings: {
        useQuery: () => ({ data: privateListings, isLoading: false, refetch: vi.fn() }),
      },
      delete: { useMutation: () => ({ mutate: vi.fn() }) },
    },
    agent: {
      getMyListings: {
        useQuery: () => ({
          data: [
            {
              id: 900,
              sourceListingId: 217,
              title: 'Public fixture home',
              status: 'available',
              price: 500000,
              enquiries: 2,
              bedrooms: 3,
              bathrooms: 2,
              area: 90,
              internalAreaM2: '100.00',
              erfSizeM2: '500.00',
            },
          ],
          isLoading: false,
        }),
      },
      deleteProperty: { useMutation: () => ({ mutate: vi.fn() }) },
    },
  },
}));

beforeEach(() => {
  privateListings[0].propertyDetails.corePropertyInformation.erfArea.status = 'known';
  window.history.replaceState({}, '', '/agent/listings?tab=pending');
});
describe('agent inventory presentation (mocked frontend data)', () => {
  it('pages 50 loaded listings and resets to the first page when searching', () => {
    render(<AgentListings />);
    expect(screen.getAllByRole('article')).toHaveLength(12);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByText('Showing 49–50 of 50 loaded listings')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search loaded listings' }), {
      target: { value: 'home 01' },
    });
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByText('Showing 1–1 of 1 loaded listings')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Listing pages' })).not.toBeInTheDocument();
  });
  it('preserves the private source ID and exposes no public-view action for a pending listing', () => {
    render(<AgentListings />);
    const row = within(screen.getByRole('article', { name: 'Fixture home 01' }));
    fireEvent.click(row.getByRole('button', { name: 'Edit listing' }));
    expect(harness.navigate).toHaveBeenCalledWith('/listings/create?id=100&edit=true');
    expect(screen.queryByText('View public listing')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Grid', exact: true }));
    expect(screen.getAllByText('Private until approved and published')).toHaveLength(12);
  });
  it('uses canonical floor and yard values in listing order, keeping the two sizes distinct', () => {
    render(<AgentListings />);
    const details = within(screen.getByRole('article', { name: 'Fixture home 01' })).getByLabelText(
      'Property details',
    );
    expect(Array.from(details.children).map(item => item.getAttribute('aria-label'))).toEqual([
      'Floor size 70 square metres',
      '3 bedrooms',
      '2 bathrooms',
      'Erf or yard size 300 square metres',
    ]);
    expect(details).toHaveTextContent('70 m² floor');
    expect(details).toHaveTextContent('300 m² erf/yard');
    expect(details).not.toHaveTextContent('99 m²');
    expect(details).not.toHaveTextContent('400 m²');
  });
  it('does not show a stale yard alias when the canonical yard size is unknown', () => {
    privateListings[0].propertyDetails.corePropertyInformation.erfArea.status = 'unknown';
    render(<AgentListings />);
    const row = within(screen.getByRole('article', { name: 'Fixture home 01' }));
    expect(row.queryByLabelText(/Erf or yard size/)).not.toBeInTheDocument();
  });
  it('edits an active listing through its source ID rather than the public property ID', () => {
    window.history.replaceState({}, '', '/agent/listings');
    render(<AgentListings />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit listing' }));
    expect(harness.navigate).toHaveBeenCalledWith('/listings/create?id=217&edit=true');
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText('2 enquiries')).toBeInTheDocument();
    expect(screen.getByLabelText('Floor size 100.00 square metres')).toBeInTheDocument();
    expect(screen.getByLabelText('Erf or yard size 500.00 square metres')).toBeInTheDocument();
  });
});
