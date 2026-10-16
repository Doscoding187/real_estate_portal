import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  search: '?province=Gauteng',
  navigate: vi.fn(),
  profile: {} as Record<string, unknown>,
  projects: {} as Record<string, unknown>,
  directory: {} as Record<string, unknown>,
  projectLookup: vi.fn(),
  directoryLookup: vi.fn(),
}));
vi.mock('wouter', () => ({
  useSearch: () => state.search,
  useLocation: () => ['/developer/local-builder', state.navigate],
  useRoute: () => [true, { slug: 'local-builder' }],
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock('react-helmet-async', () => ({ Helmet: () => null }));
vi.mock('@/components/ListingNavbar', () => ({ ListingNavbar: () => null }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    developer: {
      getPublicDeveloperBySlug: { useQuery: () => state.profile },
      getPublicDevelopmentsForPublisher: {
        useQuery: (input: unknown, options: unknown) => {
          state.projectLookup(input, options);
          return state.projects;
        },
      },
    },
    cataloguePublisher: {
      listPublishers: {
        useQuery: (input: unknown, options: unknown) => {
          state.directoryLookup(input, options);
          return state.directory;
        },
      },
    },
  },
}));
import DeveloperPublisherPage from '../DeveloperPublisherPage';
import DeveloperDirectoryPage from '../DeveloperDirectoryPage';
const brand = {
  cataloguePublisherId: 44,
  name: 'Local Builder',
  slug: 'local-builder',
  description: 'Published project information.',
  authorityKind: 'platform_reference',
  stats: {
    isContactVerified: true,
    isOrganisationVerified: false,
    isVerified: true,
    isTrusted: false,
  },
  isClaimable: false,
};
const project = {
  id: 77,
  name: 'Local Homes',
  slug: 'local-homes',
  canonicalRoute: '/development/local-homes',
  city: 'Johannesburg',
  suburb: 'Sandton',
  images: [],
  priceFrom: 1800000,
  priceTo: 2200000,
  status: 'selling',
  transactionType: 'for_sale',
  rating: 0,
  unitTypes: [{ bedrooms: 2, priceFrom: 1800000, priceTo: 2200000 }],
};
const ready = { isLoading: false, isFetching: false, isError: false, refetch: vi.fn() };
beforeEach(() => {
  state.search = '?province=Gauteng';
  state.navigate.mockClear();
  state.projectLookup.mockClear();
  state.directoryLookup.mockClear();
  state.profile = { ...ready, data: brand };
  state.projects = { ...ready, data: [project] };
  state.directory = {
    ...ready,
    data: [
      {
        id: 44,
        brandName: 'Local Builder',
        slug: 'local-builder',
        brandTier: 'regional',
        propertyFocus: ['apartment'],
      },
    ],
  };
});
describe('Public developer profile', () => {
  it('uses the supplied unit price facts and keeps unpriced rentals on request', () => {
    state.projects = {
      ...ready,
      data: [
        {
          ...project,
          transactionType: 'for_rent',
          priceFrom: 1800000,
          unitTypes: [{ bedrooms: 2, priceFrom: null, priceTo: null }],
        },
      ],
    };
    render(<DeveloperPublisherPage />);
    expect(screen.getByText('Monthly rent on request')).toBeInTheDocument();
    expect(screen.queryByText(/R1.8m/)).not.toBeInTheDocument();
  });
  it('requests the selected province server-side and opens the actual development without a fabricated featured badge', () => {
    render(<DeveloperPublisherPage />);
    expect(state.projectLookup).toHaveBeenCalledWith(
      { cataloguePublisherId: 44, province: 'Gauteng', limit: 13, offset: 0 },
      expect.objectContaining({ enabled: true }),
    );
    expect(
      screen.getByRole('heading', { name: 'Published projects in Gauteng' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Local Homes.*View development/ })).toHaveAttribute(
      'href',
      '/development/local-homes',
    );
    expect(screen.getByRole('heading', { name: 'Local Homes' })).toBeInTheDocument();
    expect(screen.queryByText(/FEATURED DEVELOPER/)).not.toBeInTheDocument();
    expect(screen.getByText('Contact verified')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to developer directory' })).toHaveAttribute(
      'href',
      '/developers?province=Gauteng',
    );
  });
  it('distinguishes a failed project request from an empty project catalogue and retries', () => {
    const retry = vi.fn();
    state.projects = { ...ready, isError: true, refetch: retry };
    render(<DeveloperPublisherPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Published projects could not be loaded');
    expect(screen.queryByText('No published projects in Gauteng')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });
  it('keeps an empty chosen province until the visitor explicitly requests all projects', () => {
    state.projects = { ...ready, data: [] };
    render(<DeveloperPublisherPage />);
    expect(screen.getByText('No published projects in Gauteng')).toBeInTheDocument();
    expect(state.navigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'View all published projects' }));
    expect(state.navigate).toHaveBeenCalledWith('/developer/local-builder#developments');
  });
  it('distinguishes profile failure from a confirmed missing profile', () => {
    state.profile = { ...ready, isError: true, error: { data: { code: 'INTERNAL_SERVER_ERROR' } } };
    const view = render(<DeveloperPublisherPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Developer profile could not be loaded');
    view.unmount();
    state.profile = { ...ready, data: null };
    render(<DeveloperPublisherPage />);
    expect(
      screen.getByRole('heading', { name: 'Developer profile not found' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('does not widen an unsupported province to national projects', () => {
    state.search = '?province=Atlantis';
    render(<DeveloperPublisherPage />);
    expect(state.projectLookup).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ enabled: false }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a supported project province');
    expect(screen.queryByRole('heading', { name: 'Local Homes' })).not.toBeInTheDocument();
  });
  it('paginates at the server and keeps the project province', () => {
    state.projects = {
      ...ready,
      data: Array.from({ length: 13 }, (_, index) => ({
        ...project,
        id: 77 + index,
        name: 'Homes ' + index,
      })),
    };
    render(<DeveloperPublisherPage />);
    expect(screen.getAllByRole('heading', { name: /Homes \d+/ })).toHaveLength(12);
    fireEvent.click(screen.getByRole('button', { name: 'Next projects' }));
    expect(state.projectLookup).toHaveBeenLastCalledWith(
      expect.objectContaining({ province: 'Gauteng', offset: 12, limit: 13 }),
      expect.anything(),
    );
  });
});
describe('Developer directory', () => {
  it('retains project province in its API and project/profile links', () => {
    render(<DeveloperDirectoryPage />);
    expect(state.directoryLookup).toHaveBeenCalledWith(
      expect.objectContaining({ province: 'Gauteng', offset: 0, limit: 25 }),
      expect.objectContaining({ enabled: true }),
    );
    expect(screen.getByRole('link', { name: 'View projects' })).toHaveAttribute(
      'href',
      '/developer/local-builder?province=Gauteng#developments',
    );
    expect(screen.getByRole('link', { name: 'Developer profile' })).toHaveAttribute(
      'href',
      '/developer/local-builder?province=Gauteng',
    );
    expect(screen.queryByText(/trusted property developers/)).not.toBeInTheDocument();
  });
  it('shows retry for an API failure rather than a no-developers message', () => {
    const retry = vi.fn();
    state.directory = { ...ready, isError: true, refetch: retry };
    render(<DeveloperDirectoryPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Developer directory could not be loaded');
    expect(screen.queryByText('No matching developers found')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });
  it('retains the selected province when clearing other filters', () => {
    state.directory = { ...ready, data: [] };
    render(<DeveloperDirectoryPage />);
    fireEvent.change(screen.getByLabelText('Developer reach'), { target: { value: 'national' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear name and reach filters' }));
    expect(state.directoryLookup).toHaveBeenLastCalledWith(
      expect.objectContaining({ province: 'Gauteng', brandTier: undefined }),
      expect.anything(),
    );
    expect(state.navigate).not.toHaveBeenCalled();
  });
  it('paginates real requests without counting the lookahead record as displayed', () => {
    state.directory = {
      ...ready,
      data: Array.from({ length: 25 }, (_, index) => ({
        id: index + 1,
        brandName: 'Developer ' + index,
        slug: 'developer-' + index,
      })),
    };
    render(<DeveloperDirectoryPage />);
    expect(screen.getAllByRole('link', { name: 'View projects' })).toHaveLength(24);
    fireEvent.click(screen.getByRole('button', { name: 'Next developers' }));
    expect(state.directoryLookup).toHaveBeenLastCalledWith(
      expect.objectContaining({ province: 'Gauteng', offset: 24, limit: 25 }),
      expect.anything(),
    );
  });
  it('updates the location URL through an explicit province choice', () => {
    render(<DeveloperDirectoryPage />);
    fireEvent.change(screen.getByLabelText('Project province'), {
      target: { value: 'Western Cape' },
    });
    expect(state.navigate).toHaveBeenCalledWith('/developers?province=Western+Cape');
  });
});
