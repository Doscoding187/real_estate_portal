import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  user: { id: 21, role: 'property_developer' as string },
  publisherContext: null as null | { cataloguePublisherId: number },
  developmentsQuery: {
    data: [] as Array<Record<string, unknown>>,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
  developerDetailQuery: {
    data: null as unknown,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
  publisherDetailQuery: {
    data: null as unknown,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
  salesResourcesQuery: {
    data: { canManage: true, resources: [] as Array<Record<string, unknown>> },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
  shareSalesResource: { mutate: vi.fn(), isPending: false },
  unshareSalesResource: { mutate: vi.fn(), isPending: false },
  developerDetailInput: vi.fn(),
  publisherDetailInput: vi.fn(),
  setLocation: vi.fn(),
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({ user: mocks.user, loading: false }),
}));

vi.mock('@/hooks/usePublisherContext', () => ({
  usePublisherContext: () => ({ context: mocks.publisherContext }),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/developer/documents', mocks.setLocation],
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    developer: {
      getDevelopments: {
        useQuery: () => mocks.developmentsQuery,
      },
      getDevelopment: {
        useQuery: (input: unknown, options: unknown) => {
          mocks.developerDetailInput(input, options);
          return mocks.developerDetailQuery;
        },
      },
      getDevelopmentSalesResources: {
        useQuery: () => mocks.salesResourcesQuery,
      },
      shareDevelopmentSalesResource: {
        useMutation: () => mocks.shareSalesResource,
      },
      unshareDevelopmentSalesResource: {
        useMutation: () => mocks.unshareSalesResource,
      },
    },
    superAdminPublisher: {
      getDevelopmentById: {
        useQuery: (input: unknown, options: unknown) => {
          mocks.publisherDetailInput(input, options);
          return mocks.publisherDetailQuery;
        },
      },
    },
  },
}));

import ProjectLibrary from './ProjectLibrary';

const project = {
  id: 41,
  name: 'Maple Grove',
  city: 'Johannesburg',
  province: 'Gauteng',
  isPublished: 1,
};

function configureProject(data: unknown) {
  mocks.developmentsQuery.data = [project];
  mocks.developmentsQuery.isLoading = false;
  mocks.developmentsQuery.isError = false;
  mocks.developerDetailQuery.data = data;
  mocks.developerDetailQuery.isLoading = false;
  mocks.developerDetailQuery.isError = false;
  mocks.publisherDetailQuery.data = data;
  mocks.publisherDetailQuery.isLoading = false;
  mocks.publisherDetailQuery.isError = false;
}

describe('Developer Project Library', () => {
  beforeEach(() => {
    mocks.user = { id: 21, role: 'property_developer' };
    mocks.publisherContext = null;
    mocks.developmentsQuery.data = [project];
    mocks.developmentsQuery.isLoading = false;
    mocks.developmentsQuery.isError = false;
    mocks.developerDetailQuery.data = null;
    mocks.developerDetailQuery.isLoading = false;
    mocks.developerDetailQuery.isError = false;
    mocks.publisherDetailQuery.data = null;
    mocks.publisherDetailQuery.isLoading = false;
    mocks.publisherDetailQuery.isError = false;
    mocks.developerDetailInput.mockClear();
    mocks.publisherDetailInput.mockClear();
    mocks.setLocation.mockClear();
    window.history.pushState({}, '', '/developer/documents');
  });

  it('shows only attached development assets and filters them by useful category', async () => {
    configureProject({
      media: {
        brochures: [
          {
            fileName: 'Maple Grove brochure.pdf',
            url: '/media/maple-grove/brochure.pdf',
            fileSize: 2048,
            uploadedAt: '2026-10-15T09:00:00.000Z',
          },
        ],
        photos: [{ fileName: 'Show home.jpg', url: '/media/maple-grove/show-home.jpg' }],
        videos: [{ fileName: 'Project tour.mp4', url: '/media/maple-grove/tour.mp4' }],
      },
      floorPlans: JSON.stringify([
        { fileName: 'Site plan.pdf', url: '/media/maple-grove/site-plan.pdf' },
      ]),
      unitTypes: [
        {
          name: 'Two-bedroom apartment',
          baseMedia: {
            floorPlans: [{ fileName: 'Unit plan.pdf', url: '/media/maple-grove/unit-plan.pdf' }],
          },
        },
      ],
    });

    render(<ProjectLibrary />);

    expect(await screen.findByText('Maple Grove brochure.pdf')).toBeInTheDocument();
    expect(screen.getByText('Show home.jpg')).toBeInTheDocument();
    expect(screen.getByText('Project tour.mp4')).toBeInTheDocument();
    expect(screen.getByText('Site plan.pdf')).toBeInTheDocument();
    expect(screen.getByText('Two-bedroom apartment · Unit plan.pdf')).toBeInTheDocument();
    expect(screen.getByText('Published development')).toBeInTheDocument();
    expect(mocks.developerDetailInput).toHaveBeenCalledWith(
      { id: 41 },
      { enabled: true, retry: false, refetchOnWindowFocus: false },
    );

    fireEvent.click(screen.getByRole('button', { name: /Plans/ }));
    expect(screen.getByText('Site plan.pdf')).toBeInTheDocument();
    expect(screen.getByText('Two-bedroom apartment · Unit plan.pdf')).toBeInTheDocument();
    expect(screen.queryByText('Maple Grove brochure.pdf')).not.toBeInTheDocument();
  });

  it('uses the active publisher-scoped read for platform curators', async () => {
    mocks.user = { id: 1, role: 'super_admin' };
    mocks.publisherContext = { cataloguePublisherId: 912 };
    configureProject({
      media: { brochures: [{ fileName: 'Partner pack.pdf', url: '/media/pack.pdf' }] },
    });

    render(<ProjectLibrary />);

    expect(await screen.findByText('Partner pack.pdf')).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.publisherDetailInput).toHaveBeenCalledWith(
        { cataloguePublisherId: 912, developmentId: 41 },
        { enabled: true, retry: false, refetchOnWindowFocus: false },
      );
    });
    expect(mocks.developerDetailInput).toHaveBeenCalledWith(
      { id: 41 },
      { enabled: false, retry: false, refetchOnWindowFocus: false },
    );
  });

  it('does not render an unsafe file URL as a link', async () => {
    configureProject({
      media: { brochures: [{ fileName: 'Legacy file.pdf', url: 'javascript:alert(1)' }] },
    });

    render(<ProjectLibrary />);

    expect(await screen.findByText('Legacy file.pdf')).toBeInTheDocument();
    expect(screen.getByText('File link unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Legacy file/ })).not.toBeInTheDocument();
  });

  it('shows a recoverable error instead of treating a failed project query as an empty library', () => {
    mocks.developmentsQuery.isError = true;

    render(<ProjectLibrary />);

    expect(screen.getByText('Project library unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Create a development first')).not.toBeInTheDocument();
  });
});
