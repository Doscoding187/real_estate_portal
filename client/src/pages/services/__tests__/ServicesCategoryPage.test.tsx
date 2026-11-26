import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const routeState = { category: 'moving' };
const mockDirectorySearch = vi.fn();
const mockSetLocation = vi.fn();

vi.mock('@/lib/trpc', () => ({
  trpc: {
    placeAuthority: {
      discover: {
        useQuery: () => ({ data: undefined, isFetching: false, isError: false }),
      },
      resolveSearchPlace: {
        useQuery: () => ({ data: undefined, isLoading: false, error: null }),
      },
    },
    servicesEngine: {
      directorySearch: {
        useQuery: (input: unknown, options?: { enabled?: boolean }) => {
          if (options?.enabled !== false) mockDirectorySearch(input);
          return { data: [], isLoading: false, error: null };
        },
      },
    },
  },
}));

vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return {
    ...actual,
    useRoute: () => [true, { category: routeState.category }],
  };
});

vi.mock('@/features/services/useServicesLocation', () => ({
  useServicesLocation: () => ({
    search: window.location.search,
    setLocation: mockSetLocation,
  }),
}));

vi.mock('@/components/EnhancedNavbar', () => ({ EnhancedNavbar: () => null }));
vi.mock('@/components/services/ServicesSiteFooter', () => ({
  ServicesSiteFooter: () => null,
}));

import ServicesCategoryPage from '../ServicesCategoryPage';

function jsonLdScripts() {
  return Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(
    script => script.textContent || '',
  );
}

describe('ServicesCategoryPage', () => {
  beforeEach(() => {
    routeState.category = 'moving';
    mockDirectorySearch.mockReset();
    mockSetLocation.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('redirects a category alias to the canonical hyphen slug while preserving the query', async () => {
    routeState.category = 'home_improvement';
    window.history.pushState(
      {},
      '',
      '/services/home_improvement?category=home_improvement&city=Pretoria',
    );

    render(<ServicesCategoryPage />);

    expect(
      screen.getByRole('heading', { name: /home improvement services/i, level: 1 }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(mockSetLocation).toHaveBeenCalledWith(
        '/services/home-improvement?category=home_improvement&city=Pretoria',
        { replace: true },
      ),
    );
  });

  it('keeps a canonical category route in place', async () => {
    window.history.pushState({}, '', '/services/moving');

    render(<ServicesCategoryPage />);

    expect(screen.getByRole('heading', { name: /moving & storage services/i })).toBeInTheDocument();
    expect(mockSetLocation).not.toHaveBeenCalled();
  });

  it('does not canonicalize topic pages', async () => {
    routeState.category = 'home-loans';
    window.history.pushState({}, '', '/services/home-loans');

    render(<ServicesCategoryPage />);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /browse providers to request/i }),
      ).toBeInTheDocument(),
    );
    expect(mockSetLocation).not.toHaveBeenCalled();
  });

  it('emits a breadcrumb list of platform-owned absolute urls', () => {
    window.history.pushState({}, '', '/services/moving');

    render(<ServicesCategoryPage />);

    const scripts = jsonLdScripts();
    expect(scripts).toHaveLength(1);
    const parsed = JSON.parse(scripts[0]);
    expect(parsed['@type']).toBe('BreadcrumbList');
    expect(parsed.itemListElement).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://www.propertylistifysa.co.za/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Services',
        item: 'https://www.propertylistifysa.co.za/services',
      },
      { '@type': 'ListItem', position: 3, name: 'Moving Services' },
    ]);
  });

  it('turns a selected plumbing focus into a full category destination and preserves server filtering', () => {
    routeState.category = 'home-improvement';
    window.history.pushState({}, '', '/services/home-improvement?query=plumbing');

    render(<ServicesCategoryPage />);

    const heroHeading = screen.getByRole('heading', {
      name: /plumbing & maintenance/i,
      level: 1,
    });
    expect(heroHeading).toBeInTheDocument();
    expect(heroHeading.tagName).toBe('H1');
    expect(
      screen.getByText(
        'From emergency repairs to installations, find plumbing professionals in your area.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Choose your area')).toHaveAttribute(
      'aria-autocomplete',
      'list',
    );
    expect(screen.getByText('What do you need?')).toBeInTheDocument();
    expect(screen.getByText('Reviewed Before Listing')).toBeInTheDocument();
    expect(screen.getByText('Local Coverage')).toBeInTheDocument();
    expect(screen.getByText('Compare Profiles')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /find professionals/i })).toBeInTheDocument();
    expect(screen.getByText(/leak repairs & plumbing/i)).toBeInTheDocument();
    expect(screen.getByText(/drainage & blockages/i)).toBeInTheDocument();
    expect(screen.getByText(/geyser repairs & replacement/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /why choose\s+property listify/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/profiles reviewed\s+before going live/i)).toBeInTheDocument();
    expect(screen.getByText(/local experts\s+in your area/i)).toBeInTheDocument();
    expect(screen.getByText(/read reviews\s+before you choose/i)).toBeInTheDocument();
    expect(screen.getByText(/dedicated support\s+when you need help/i)).toBeInTheDocument();
    expect(screen.getByText(/replacing a fixture/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view all services/i })).toBeInTheDocument();
    const maintenancePlan = screen.getByRole('button', { name: /maintenance or repair/i });
    expect(maintenancePlan).toBeInTheDocument();
    expect(screen.getByText(/do not promise emergency/i)).toBeInTheDocument();
    expect(screen.queryByText(/emergency service available/i)).not.toBeInTheDocument();
    expect(
      Array.from(document.images).map(image => image.getAttribute('src')),
    ).toContain('/images/services/plumbing-hero-kitchen-sink.jpg');
    expect(
      Array.from(document.images).map(image => image.getAttribute('src')),
    ).toContain('/images/services/plumbing-faucet-feature.jpeg');
    expect(mockDirectorySearch).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'home_improvement', query: 'plumbing' }),
    );

    fireEvent.click(maintenancePlan);

    expect(maintenancePlan).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/when you contact a provider/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    expect(mockSetLocation).toHaveBeenCalledWith(
      '/services/home-improvement?category=home_improvement&query=plumbing',
    );

    fireEvent.click(screen.getByRole('button', { name: /view all services/i }));

    expect(mockSetLocation).toHaveBeenLastCalledWith('/services/home-improvement');
  });

  it('gives a broad category its own pathways and sends a service choice into the matching directory filter', () => {
    routeState.category = 'home-improvement';
    window.history.pushState({}, '', '/services/home-improvement');

    render(<ServicesCategoryPage />);

    expect(
      screen.getByRole('heading', { name: /home improvement services/i, level: 1 }),
    ).toBeInTheDocument();
    const plumbingPathway = screen.getByRole('link', { name: /plumbing & maintenance/i });
    expect(plumbingPathway).toHaveAttribute('href', '/services/home-improvement?query=plumbing');
    expect(screen.getByText(/no published providers match this service and location yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /join as a provider/i })).toHaveAttribute(
      'href',
      '/advertise/services',
    );
    expect(document.getElementById('provider-results')).toHaveAttribute(
      'aria-label',
      'Published providers',
    );
  });
});
