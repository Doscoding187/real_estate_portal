import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const mockUpdateMutate = vi.fn();
const mockStatus = {
  hasProviderIdentity: true,
  profileConfigured: true,
  servicesConfigured: true,
  locationsConfigured: true,
  onboardingStep: 4,
  dashboardUnlocked: true,
  hasAssignedRequests: false,
  fullFeaturesUnlocked: true,
  recommendedNextStep: '/service/dashboard',
  provider: {
    providerId: 20,
    companyName: 'Provider Company',
    verificationStatus: 'verified' as const,
    isPublished: true,
    publicationStatus: 'published' as const,
    subscriptionTier: 'directory' as const,
    subscriptionStatus: 'trial' as const,
  },
};

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    loading: false,
    user: { id: 99, role: 'service_provider' },
  }),
}));

vi.mock('@/hooks/useServiceProviderOnboardingStatus', () => ({
  useServiceProviderOnboardingStatus: () => ({ status: mockStatus, isLoading: false }),
}));

vi.mock('@/components/services/ProNavigation', () => ({ ProNavigation: () => null }));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    servicesEngine: {
      myProviderDashboard: {
        useQuery: () => ({
          data: { totalLeads: 1, activePipeline: 1, conversionRate: 0 },
          isLoading: false,
          error: null,
        }),
      },
      myProviderLeads: {
        useQuery: () => ({
          data: [
            {
              id: 7,
              serviceCategory: 'home_improvement',
              serviceCode: 'plumbing',

              requesterName: 'Requester Name',
              requesterEmail: 'requester@example.com',
              requesterPhone: '+27 11 000 0000',
              geoSuburb: 'Sandton',
              geoCity: 'Johannesburg',
              geoProvince: 'Gauteng',
              notes: 'Need a repair before transfer.',
              status: 'new',
              createdAt: '2026-01-10 00:00:00',
            },
          ],
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
      updateMyLeadStatus: {
        useMutation: () => ({
          mutate: mockUpdateMutate,
          isPending: false,
          error: null,
        }),
      },
    },
  },
}));

vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return {
    ...actual,
    useLocation: () => ['/service/dashboard', vi.fn()],
  };
});

vi.mock('@/lib/seo', () => ({ applySeo: vi.fn() }));

import ProDashboardPage from './ProDashboardPage';

describe('ProDashboardPage Services V1 inbox', () => {
  it('shows the assigned requester contact and project context', () => {
    render(<ProDashboardPage />);

    expect(screen.getByText(/Requester Name/)).toBeInTheDocument();
    expect(screen.getByText(/plumbing/)).toBeInTheDocument();

    expect(screen.getByText(/requester@example.com/)).toBeInTheDocument();
    expect(screen.getByText(/Need a repair before transfer/)).toBeInTheDocument();
    expect(screen.getByText('Sandton, Johannesburg, Gauteng')).toBeInTheDocument();
  });

  it('keeps unpublished providers out of the workspace', () => {
    mockStatus.dashboardUnlocked = false;
    mockStatus.provider.isPublished = false;

    render(<ProDashboardPage />);

    expect(screen.getByRole('heading', { name: /workspace not available/i })).toBeInTheDocument();
    expect(screen.queryByText('Request inbox')).not.toBeInTheDocument();

    mockStatus.dashboardUnlocked = true;
    mockStatus.provider.isPublished = true;
  });

  it('does not render the workspace before publication', () => {
    const previous = mockStatus.dashboardUnlocked;
    mockStatus.dashboardUnlocked = false;

    render(<ProDashboardPage />);

    expect(screen.getByText(/provider workspace not available/i)).toBeInTheDocument();
    mockStatus.dashboardUnlocked = previous;
  });

  it('retains custody of assigned requests after depublication', () => {
    mockStatus.dashboardUnlocked = true;
    mockStatus.hasAssignedRequests = true;
    mockStatus.provider.isPublished = false;

    render(<ProDashboardPage />);

    expect(screen.getByText('Request inbox')).toBeInTheDocument();

    mockStatus.dashboardUnlocked = true;
    mockStatus.hasAssignedRequests = false;
    mockStatus.provider.isPublished = true;
  });

  it('offers a provider response action for the assigned request', () => {
    render(<ProDashboardPage />);

    fireEvent.click(screen.getByRole('button', { name: /mark accepted/i }));

    expect(mockUpdateMutate).toHaveBeenCalledWith({
      leadId: 7,
      status: 'accepted',
      note: 'Marked Accepted from provider workspace',
    });
  });
});
