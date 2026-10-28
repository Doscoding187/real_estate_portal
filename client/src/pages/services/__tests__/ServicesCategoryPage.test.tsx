import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

const routeState = { category: 'moving' };
const mockDirectorySearch = vi.fn();
const mockSetLocation = vi.fn();

vi.mock('@/lib/trpc', () => ({
  trpc: {
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

    expect(screen.getByRole('heading', { name: /services providers/i })).toBeInTheDocument();
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

    expect(screen.getByRole('heading', { name: /services providers/i })).toBeInTheDocument();
    expect(mockSetLocation).not.toHaveBeenCalled();
  });

  it('does not canonicalize topic pages', async () => {
    routeState.category = 'home-loans';
    window.history.pushState({}, '', '/services/home-loans');

    render(<ServicesCategoryPage />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /browse providers to request/i })).toBeInTheDocument(),
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
});
