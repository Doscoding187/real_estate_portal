/**
 * Property-based tests for ServicesResultsPage heading and request summary.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';
import { render, screen } from '@testing-library/react';
import {
  SERVICE_CATEGORIES,
  formatArea,
  formatCategoryLabel,
  type ServiceCategory,
} from '@/features/services/catalog';

vi.mock('@/lib/trpc', () => ({
  trpc: {
    servicesEngine: {
      recommendProviders: {
        useQuery: () => ({ data: [], isLoading: false, error: null }),
      },
      directorySearch: {
        useQuery: () => ({ data: [], isLoading: false, error: null }),
      },
      leads: {
        logEvent: {
          useMutation: () => ({ mutate: vi.fn() }),
        },
      },
      createLeadFromJourney: {
        useMutation: () => ({
          mutate: vi.fn(),
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
    useRoute: () => [true, { leadId: '42' }],
    useLocation: () => ['/services/results/42', vi.fn()],
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
      <a href={href}>{children}</a>
    ),
  };
});

vi.mock('@/lib/seo', () => ({
  applySeo: vi.fn(),
}));

import ServicesResultsPage from '../ServicesResultsPage';

function renderWithParams(params: {
  category: ServiceCategory;
  city?: string;
  province?: string;
  suburb?: string;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set('category', params.category);
  if (params.city) searchParams.set('city', params.city);
  if (params.province) searchParams.set('province', params.province);
  if (params.suburb) searchParams.set('suburb', params.suburb);

  Object.defineProperty(window, 'location', {
    value: {
      ...window.location,
      search: `?${searchParams.toString()}`,
    },
    writable: true,
    configurable: true,
  });

  return render(<ServicesResultsPage />);
}

describe('ServicesResultsPage property coverage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('heading contains the human-readable category label for every ServiceCategory', () => {
    fc.assert(
      fc.property(fc.constantFrom(...SERVICE_CATEGORIES), category => {
        const { unmount } = renderWithParams({ category: category.value });
        expect(screen.getByRole('heading', { level: 1 }).textContent ?? '').toContain(
          formatCategoryLabel(category.value),
        );
        unmount();
      }),
      { numRuns: 6 },
    );
  });

  it('heading contains the formatted location for any city/province combination', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SERVICE_CATEGORIES),
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0 && !s.includes('&') && !s.includes('=')),
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0 && !s.includes('&') && !s.includes('=')),
        (category, city, province) => {
          const { unmount } = renderWithParams({ category: category.value, city, province });
          expect(screen.getByRole('heading', { level: 1 }).textContent ?? '').toContain(
            formatArea(city, province, undefined),
          );
          unmount();
        },
      ),
      { numRuns: 20 },
    );
  });

  it('heading falls back to "your area" when no location params are provided', () => {
    fc.assert(
      fc.property(fc.constantFrom(...SERVICE_CATEGORIES), category => {
        const { unmount } = renderWithParams({ category: category.value });
        expect(screen.getByRole('heading', { level: 1 }).textContent ?? '').toContain('your area');
        unmount();
      }),
      { numRuns: 6 },
    );
  });

  it('renders notes from the lead-scoped session context in the request summary', () => {
    sessionStorage.setItem(
      'service-lead-context-42',
      JSON.stringify({
        notes: 'Please contact me after 5pm.',
      }),
    );

    renderWithParams({ category: 'home_improvement' });

    expect(screen.getByText(/please contact me after 5pm\./i)).toBeInTheDocument();
  });

  it('falls back to lead-scoped session context for location when the query string is missing it', () => {
    sessionStorage.setItem(
      'service-lead-context-42',
      JSON.stringify({
        city: 'Cape Town',
        province: 'Western Cape',
      }),
    );

    renderWithParams({ category: 'home_improvement' });

    expect(screen.getByRole('heading', { level: 1 }).textContent ?? '').toContain(
      'Cape Town, Western Cape',
    );
  });
});
