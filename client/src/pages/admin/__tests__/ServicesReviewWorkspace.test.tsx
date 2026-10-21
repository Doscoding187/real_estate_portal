import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

const mockReviewMutate = vi.fn();

const queueEntry = {
  providerId: 20,
  companyName: 'Sandton Repairs',
  verificationStatus: 'pending' as const,
  isActive: true,
  directoryActive: false,
  profileExists: true,
  profileComplete: true,
  subscriptionStatus: 'trial' as const,
  activeServiceCount: 1,
  validCoverageCount: 1,
  isPublished: false,
  readyForPublication: true,
  publicationDriftDetected: false,
  blockers: [] as string[],
  headline: 'Trusted repairer',
  bio: 'Fixes roofs and geysers.',
  websiteUrl: 'https://example.co.za',
  contactEmail: 'hello@example.co.za',
  contactPhone: null,
  serviceCategories: ['home_improvement' as const],
  services: [
    {
      serviceCode: 'roofing',
      displayName: 'Roof Repairs',
      category: 'home_improvement' as const,
      minPrice: 1500,
      maxPrice: 12000,
      currency: 'ZAR',
    },
  ],
  coverageAreas: [{ province: 'Gauteng', city: 'Johannesburg', suburb: 'Sandton' }],
  createdAt: '2026-01-10 00:00:00',
};

const blockedEntry = {
  ...queueEntry,
  providerId: 21,
  companyName: 'Blocked Provider',
  verificationStatus: 'rejected' as const,
  subscriptionStatus: 'past_due' as const,
  readyForPublication: false,
  headline: 'Incomplete listing',
  bio: 'Profile is not finished.',
  contactEmail: 'blocked@example.co.za',
  blockers: ['no_active_service', 'subscription_ineligible'],
  serviceCategories: [],
  services: [],
  validCoverageCount: 0,
  coverageAreas: [],
};

let queueData = {
  entries: [queueEntry, blockedEntry],
  pagination: { page: 1, limit: 25, total: 2, totalPages: 1 },
  counts: {
    awaitingReview: 1,
    ready: 1,
    published: 0,
    blocked: 1,
    drifted: 0,
  },
};

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => ({
      servicesEngine: {
        listProviderPublicationQueue: { invalidate: vi.fn() },
        providerPublicationReadiness: { invalidate: vi.fn() },
      },
    }),
    servicesEngine: {
      listProviderPublicationQueue: {
        useQuery: () => ({ data: queueData, isLoading: false, error: null }),
      },
      reviewProviderPublication: {
        useMutation: () => ({
          mutate: mockReviewMutate,
          isPending: false,
          error: null,
        }),
      },
    },
  },
}));

import ServicesReviewWorkspace from '../ServicesReviewWorkspace';

describe('Services publication review worklist', () => {
  it('shows the provider identity and the canonical state a reviewer needs', () => {
    render(<ServicesReviewWorkspace />);

    expect(screen.getByText('Sandton Repairs')).toBeInTheDocument();
    expect(screen.getByText(/Provider #20/)).toBeInTheDocument();
    expect(screen.getByText('Trusted repairer')).toBeInTheDocument();
    expect(screen.getByText('hello@example.co.za')).toBeInTheDocument();
    expect(screen.getByText(/home_improvement/)).toBeInTheDocument();
  });

  it('shows the published service and its price range to the reviewer', () => {
    render(<ServicesReviewWorkspace />);

    const serviceItem = screen.getByText(/Roof Repairs/);

    expect(serviceItem.textContent).toContain('Roof Repairs');
    expect(serviceItem.textContent).toContain('home_improvement');
    expect(serviceItem.textContent).toMatch(/1\s?500/);
    expect(serviceItem.textContent).toMatch(/12\s?000/);
  });

  it('presents coverage as listed coverage rather than a radius or distance claim', () => {
    render(<ServicesReviewWorkspace />);

    expect(screen.getByText('Sandton, Johannesburg, Gauteng')).toBeInTheDocument();
    expect(screen.getByText(/Listed coverage \(1\)/)).toBeInTheDocument();
    expect(screen.queryByText(/km/i)).not.toBeInTheDocument();
  });

  it('names every publication blocker instead of a generic failure', () => {
    render(<ServicesReviewWorkspace />);

    const blockedItem = screen.getByText('Blocked Provider').closest('li') as HTMLElement;

    expect(within(blockedItem).getByText('No active service')).toBeInTheDocument();
    expect(
      within(blockedItem).getByText('Subscription is not trial or active'),
    ).toBeInTheDocument();
  });

  it('refuses to offer publication for a provider that is not ready', () => {
    render(<ServicesReviewWorkspace />);

    const publishButtons = screen.getAllByRole('button', { name: 'Publish' });

    expect(publishButtons[0]).toBeEnabled();
    expect(publishButtons[1]).toBeDisabled();
  });

  it('publishes through the reviewed transition', () => {
    render(<ServicesReviewWorkspace />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Publish' })[0]!);

    expect(mockReviewMutate).toHaveBeenCalledWith({
      providerId: 20,
      decision: 'publish',
      notes: undefined,
    });
  });

  it('records the reviewer note with the decision', () => {
    render(<ServicesReviewWorkspace />);

    fireEvent.change(screen.getByLabelText('Review note for Sandton Repairs'), {
      target: { value: 'Verified identity against the company registry.' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Publish' })[0]!);

    expect(mockReviewMutate).toHaveBeenCalledWith({
      providerId: 20,
      decision: 'publish',
      notes: 'Verified identity against the company registry.',
    });
  });

  it('offers withdrawal and rejection only where the state permits them', () => {
    render(<ServicesReviewWorkspace />);

    const unpublishButtons = screen.getAllByRole('button', { name: 'Unpublish' });
    const rejectButtons = screen.getAllByRole('button', { name: 'Reject' });

    expect(unpublishButtons[0]).toBeDisabled();
    expect(unpublishButtons[1]).toBeDisabled();
    expect(rejectButtons[0]).toBeEnabled();
    expect(rejectButtons[1]).toBeDisabled();
  });

  it('reports the worklist counts', () => {
    const { container } = render(<ServicesReviewWorkspace />);

    const counts = container.querySelector('dl') as HTMLElement;

    expect(within(counts).getByText('Awaiting review')).toBeInTheDocument();
    expect(within(counts).getByText('Blocked')).toBeInTheDocument();
  });
});
