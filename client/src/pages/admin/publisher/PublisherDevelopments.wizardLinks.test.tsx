import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { setLocationMock } = vi.hoisted(() => ({ setLocationMock: vi.fn() }));

vi.mock('wouter', () => ({ useLocation: () => ['/admin/publisher', setLocationMock] }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/contexts/DeveloperContextProvider', () => ({
  useDeveloperContext: () => ({ selectedBrandId: 9, selectedBrand: { brandName: 'Acme' } }),
}));

const { development } = vi.hoisted(() => ({
  development: {
    identity: { id: 77, name: 'Acme Heights', slug: null, location: { locationLabels: [] } },
    lifecycle: { state: 'in_review', publicEligible: false, latestReview: null },
    readiness: { status: 'ready', blockerCount: 0 },
    inventory: { activeUnitTypeCount: 1, totalUnits: 1, availableUnits: 1 },
    leads: { capturedLeadCount: 0 },
    attention: { items: [] },
    nextAction: null,
  },
}));

vi.mock('@/lib/trpc', () => {
  const query = (data: unknown) => ({
    useQuery: () => ({ data, isLoading: false, error: null, refetch: vi.fn() }),
  });
  const mutation = { useMutation: () => ({ mutate: vi.fn(), isPending: false }) };
  return {
    trpc: {
      useUtils: () => ({ developer: { getOperatingHome: { invalidate: vi.fn() } } }),
      superAdminPublisher: {
        getOperatingHome: query({
          publisher: { sourceAttribution: null, isVisible: true },
          publication: { lastVerifiedAt: null },
          portfolio: {
            developmentCount: 1,
            readiness: { readyDevelopmentCount: 1 },
            inventory: { availableUnits: 1 },
            leads: { capturedLeadCount: 0 },
            attentionCount: 0,
            nextAction: null,
          },
          developments: [development],
        }),
        getDrafts: query([{ id: 31, draftName: 'Draft one', progress: 10 }]),
        unpublishDevelopment: mutation,
        publishDevelopment: mutation,
      },
    },
  };
});

import PublisherDevelopments from './PublisherDevelopments';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PublisherDevelopments wizard links', () => {
  it('New curated development opens the admin wizard route', () => {
    render(createElement(PublisherDevelopments));
    fireEvent.click(screen.getByRole('button', { name: /New curated development/ }));
    expect(setLocationMock).toHaveBeenCalledWith('/admin/publisher/developments/new');
  });

  it('Resume draft opens the admin wizard route with the draft id', () => {
    render(createElement(PublisherDevelopments));
    fireEvent.click(screen.getByRole('button', { name: 'Resume draft' }));
    expect(setLocationMock).toHaveBeenCalledWith('/admin/publisher/developments/new?draftId=31');
  });

  it('Edit opens the admin wizard route with the id and brand', () => {
    render(createElement(PublisherDevelopments));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(setLocationMock).toHaveBeenCalledWith(
      '/admin/publisher/developments/new?id=77&cataloguePublisherId=9',
    );
  });
});
