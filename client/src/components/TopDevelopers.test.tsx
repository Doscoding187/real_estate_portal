import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  query: {} as Record<string, unknown>,
  refetch: vi.fn(),
  queryInput: undefined as unknown,
  queryOptions: undefined as unknown,
  developmentsEnabled: true,
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
        useQuery: (input: unknown, options: unknown) => {
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

import { TopDevelopers } from './TopDevelopers';

describe('TopDevelopers homepage section', () => {
  beforeEach(() => {
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
});
