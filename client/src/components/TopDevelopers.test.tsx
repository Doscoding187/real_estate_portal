import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  query: {} as Record<string, unknown>,
  refetch: vi.fn(),
  queryInput: undefined as unknown,
  queryOptions: undefined as unknown,
  developmentsEnabled: true,
  provinceQuery: {} as Record<string, unknown>,
  inputs: [] as unknown[],
  provinceOptions: undefined as unknown,
}));

vi.stubGlobal(
  'ResizeObserver',
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

vi.mock('@/lib/trpc', () => ({
  trpc: {
    cataloguePublisher: {
      listPublishers: {
        useQuery: (input: { provincePlaceId?: string }, options: unknown) => {
          testState.inputs.push(input);
          if (input.provincePlaceId) {
            testState.provinceOptions = options;
            return testState.provinceQuery;
          }
          testState.queryInput = input;
          testState.queryOptions = options;
          return testState.query;
        },
      },
    },
  },
}));

vi.mock('wouter', () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/publicNavigation', () => ({
  isHomepageHeroJourneyEnabled: () => testState.developmentsEnabled,
}));

import { TopDevelopers, resetDevelopersLegacyMode } from './TopDevelopers';
import { HOME_PROVINCES } from '@/lib/homeProvinceOptions';

describe('TopDevelopers homepage section', () => {
  beforeEach(() => {
    resetDevelopersLegacyMode();
    testState.inputs = [];
    testState.provinceQuery = {
      data: undefined,
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: testState.refetch,
    };
    testState.refetch.mockReset();
    testState.refetch.mockResolvedValue(undefined);
    testState.queryInput = undefined;
    testState.queryOptions = undefined;
    testState.developmentsEnabled = true;
    testState.query = {
      data: undefined,
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: testState.refetch,
    };
  });

  it('uses compact horizontal profile skeletons while loading', () => {
    testState.query = { ...testState.query, isLoading: true };

    render(<TopDevelopers />);

    const loading = screen.getByTestId('developer-feed-loading');
    const skeletons = within(loading).getAllByTestId('developer-profile-skeleton');
    expect(skeletons).toHaveLength(3);
    expect(skeletons[0]).toHaveClass('flex-[0_0_78%]');
  });

  it('shows a plain error line with Try again', () => {
    testState.query = { ...testState.query, isError: true };

    render(<TopDevelopers />);

    expect(screen.getByRole('alert')).toHaveTextContent('Developer profiles could not be loaded.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(testState.refetch).toHaveBeenCalledTimes(1);
  });

  it('keeps the section with an honest empty state and two ways forward', () => {
    testState.query = { ...testState.query, data: [] };

    render(<TopDevelopers />);

    expect(
      screen.getByRole('heading', { name: 'Explore real estate developers' }),
    ).toBeInTheDocument();
    expect(screen.getByText('No developers are listed yet.')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Talk to us about listing your development/ }),
    ).toHaveAttribute('href', '/contact');
    expect(
      screen.getByRole('link', { name: 'See developers across South Africa' }),
    ).toHaveAttribute('href', '/developers');
  });

  it('shows the same empty state, with no profiles and no query, while developments are held', () => {
    testState.developmentsEnabled = false;
    testState.query = {
      ...testState.query,
      data: [{ id: 1, slug: 'local-builder', brandName: 'Local Builder', developmentCount: 3 }],
    };

    render(<TopDevelopers />);

    expect(screen.getByText('No developers are listed yet.')).toBeInTheDocument();
    expect(screen.queryByText('Local Builder')).not.toBeInTheDocument();
    expect(testState.queryOptions).toEqual({ enabled: false });
  });

  it('asks for the national list and has no area filter box', () => {
    testState.query = {
      ...testState.query,
      data: [{ id: 1, slug: 'local-builder', brandName: 'Local Builder', developmentCount: 3 }],
    };

    render(<TopDevelopers />);

    expect(testState.queryInput).toEqual({ limit: 12 });
    expect(screen.queryByText('Filter projects by area')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('renders developer cards as real links with a count only when the data has one', () => {
    testState.query = {
      ...testState.query,
      data: [
        {
          id: 1,
          slug: 'local-builder',
          brandName: 'Local Builder',
          logoUrl: 'https://example.test/logo.png',
          developmentCount: 3,
        },
        { id: 2, slug: 'no-count', brandName: 'No Count Homes', developmentCount: null },
      ],
    };

    render(<TopDevelopers />);

    expect(screen.getByRole('img', { name: 'Local Builder logo' })).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Public projects')).toBeInTheDocument();
    expect(screen.getAllByText('Public projects')).toHaveLength(1);
    const viewDeveloper = screen.getAllByRole('link', { name: /View Developer/ });
    expect(viewDeveloper[0]).toHaveAttribute('href', '/developer/local-builder');
    expect(screen.getAllByRole('link', { name: /View projects/ })[0]).toHaveAttribute(
      'href',
      '/developer/local-builder#developments',
    );
    expect(screen.getByRole('link', { name: /Explore All Developers/ })).toHaveAttribute(
      'href',
      '/developers',
    );
  });

  describe('province mode', () => {
    const gauteng = HOME_PROVINCES[0].placeId;
    const badRequest = Object.assign(new Error('Unrecognized key'), {
      data: { code: 'BAD_REQUEST' },
    });

    it('asks for the selected province and shows the province heading, stats and rows', () => {
      testState.provinceQuery = {
        ...testState.provinceQuery,
        data: [
          {
            id: 1,
            slug: 'local-builder',
            brandName: 'Local Builder',
            developmentCount: 9,
            activeDevelopments: 4,
            sellingNow: 2,
            launchingSoon: 1,
          },
          { id: 2, slug: 'bare', brandName: 'Bare Homes' },
        ],
      };

      render(<TopDevelopers selectedProvince="Gauteng" />);

      expect(testState.inputs).toContainEqual({ provincePlaceId: gauteng, limit: 12 });
      expect(
        screen.getByRole('heading', { name: 'Developers building in Gauteng' }),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Explore developers with approved, published projects in Gauteng.'),
      ).toBeInTheDocument();
      expect(screen.getAllByText('Active in Gauteng')).toHaveLength(1);
      expect(screen.getAllByText('Selling now')).toHaveLength(1);
      expect(screen.getAllByText('Active developments')).toHaveLength(1);
      expect(screen.getAllByText('Launching soon')).toHaveLength(1);
      expect(screen.getAllByRole('link', { name: /View local projects/ })).toHaveLength(2);
      expect(screen.queryByText('Public projects')).not.toBeInTheDocument();
    });

    it('shows the province empty state with the contact action and national link', () => {
      testState.provinceQuery = { ...testState.provinceQuery, data: [] };

      render(<TopDevelopers selectedProvince="Limpopo" />);

      expect(screen.getByText('No developers are listed in Limpopo yet.')).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /Talk to us about listing your development/ }),
      ).toHaveAttribute('href', '/contact');
      expect(
        screen.getByRole('link', { name: 'See developers across South Africa' }),
      ).toHaveAttribute('href', '/developers');
    });

    it('falls back to the national list when an older API rejects provincePlaceId', () => {
      testState.provinceQuery = { ...testState.provinceQuery, isError: true, error: badRequest };
      testState.query = {
        ...testState.query,
        data: [{ id: 1, slug: 'local-builder', brandName: 'Local Builder', developmentCount: 3 }],
      };

      render(<TopDevelopers selectedProvince="Gauteng" />);

      expect(
        screen.getByRole('heading', { name: 'Explore real estate developers' }),
      ).toBeInTheDocument();
      expect(screen.getByText('Public projects')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(testState.queryInput).toEqual({ limit: 12 });
      expect(testState.queryOptions).toEqual({ enabled: true });
    });

    it('remembers the fallback so a later province does not ask the province query again', () => {
      testState.provinceQuery = { ...testState.provinceQuery, isError: true, error: badRequest };
      testState.query = {
        ...testState.query,
        data: [{ id: 1, slug: 'local-builder', brandName: 'Local Builder', developmentCount: 3 }],
      };
      const first = render(<TopDevelopers selectedProvince="Gauteng" />);
      first.unmount();
      testState.inputs = [];

      render(<TopDevelopers selectedProvince="Western Cape" />);

      expect(
        screen.getByRole('heading', { name: 'Explore real estate developers' }),
      ).toBeInTheDocument();
      expect(testState.provinceOptions).toEqual({ enabled: false, retry: false });
    });

    it('shows the error line for any other province error', () => {
      testState.provinceQuery = {
        ...testState.provinceQuery,
        isError: true,
        error: Object.assign(new Error('boom'), { data: { code: 'INTERNAL_SERVER_ERROR' } }),
      };

      render(<TopDevelopers selectedProvince="Gauteng" />);

      expect(screen.getByRole('alert')).toHaveTextContent('Developer profiles could not be loaded.');
    });
  });
});
