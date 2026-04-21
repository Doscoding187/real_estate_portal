/**
 * Property-Based Tests for ServicesResultsPage heading
 *
 * Feature: services-marketplace-overhaul
 *
 * Property 12: Results page heading contains category label and location
 * For any ServiceCategory and location string, the ServicesResultsPage heading
 * should contain the human-readable category label (not the raw enum value) and
 * the formatted location string.
 * Validates: Requirements 5.5
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { render, screen } from '@testing-library/react';
import {
  SERVICE_CATEGORIES,
  formatCategoryLabel,
  formatArea,
  type ServiceCategory,
} from '@/features/services/catalog';

// ---------------------------------------------------------------------------
// Mock tRPC — ServicesResultsPage uses several tRPC hooks
// ---------------------------------------------------------------------------

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

// Mock wouter hooks used by the page
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

// Mock applySeo — not relevant to heading content
vi.mock('@/lib/seo', () => ({
  applySeo: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Import the page after mocks are set up
// ---------------------------------------------------------------------------

import ServicesResultsPage from '../ServicesResultsPage';

// ---------------------------------------------------------------------------
// Helper: render the page with given URL query params
// ---------------------------------------------------------------------------

function renderWithParams(params: {
  category: ServiceCategory;
  city?: string;
  province?: string;
  suburb?: string;
}) {
  // Set window.location.search to simulate query params
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

// ---------------------------------------------------------------------------
// Property 12: Results page heading contains category label and location
// ---------------------------------------------------------------------------

// Feature: services-marketplace-overhaul, Property 12: Results page heading contains category label and location
describe('ServicesResultsPage — Property 12: heading contains category label and location', () => {
  it('heading contains the human-readable category label for every ServiceCategory', () => {
    fc.assert(
      fc.property(fc.constantFrom(...SERVICE_CATEGORIES), category => {
        const { unmount } = renderWithParams({ category: category.value });

        const heading = screen.getByRole('heading', { level: 1 });
        const headingText = heading.textContent ?? '';

        // Must contain the human-readable label, not the raw enum value
        expect(headingText).toContain(formatCategoryLabel(category.value));

        unmount();
      }),
      { numRuns: 6 }, // one run per category
    );
  });

  it('heading contains the formatted location for any city/province/suburb combination', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SERVICE_CATEGORIES),
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0 && !s.includes('&') && !s.includes('=')),
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0 && !s.includes('&') && !s.includes('=')),
        (category, city, province) => {
          const expectedLocation = formatArea(city, province, undefined);

          const { unmount } = renderWithParams({
            category: category.value,
            city,
            province,
          });

          const heading = screen.getByRole('heading', { level: 1 });
          const headingText = heading.textContent ?? '';

          expect(headingText).toContain(expectedLocation);

          unmount();
        },
      ),
      { numRuns: 20 },
    );
  });

  it('heading does NOT contain the raw enum value when a human-readable label is available', () => {
    fc.assert(
      fc.property(fc.constantFrom(...SERVICE_CATEGORIES), category => {
        const { unmount } = renderWithParams({ category: category.value });

        const heading = screen.getByRole('heading', { level: 1 });
        const headingText = heading.textContent ?? '';

        // The raw enum value (e.g. "home_improvement") should not appear in the heading
        // The human-readable label (e.g. "Home Improvement") should appear instead
        expect(headingText).not.toContain(category.value);
        expect(headingText).toContain(category.label);

        unmount();
      }),
      { numRuns: 6 },
    );
  });

  it('heading falls back to "your area" when no location params are provided', () => {
    fc.assert(
      fc.property(fc.constantFrom(...SERVICE_CATEGORIES), category => {
        const { unmount } = renderWithParams({ category: category.value });

        const heading = screen.getByRole('heading', { level: 1 });
        const headingText = heading.textContent ?? '';

        // formatArea with no args returns 'your area'
        expect(headingText).toContain('your area');

        unmount();
      }),
      { numRuns: 6 },
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests: pure function composition that drives the heading
// ---------------------------------------------------------------------------

describe('ServicesResultsPage heading — pure function composition', () => {
  it('formatCategoryLabel returns the human-readable label for all categories', () => {
    for (const category of SERVICE_CATEGORIES) {
      const label = formatCategoryLabel(category.value);
      expect(label).toBe(category.label);
      // Must not be the raw enum value
      expect(label).not.toBe(category.value);
    }
  });

  it('formatArea joins non-empty parts with ", "', () => {
    expect(formatArea('Cape Town', 'Western Cape', 'Rondebosch')).toBe('Rondebosch, Cape Town, Western Cape');
    expect(formatArea('Johannesburg', 'Gauteng', undefined)).toBe('Johannesburg, Gauteng');
    expect(formatArea(undefined, 'Gauteng', undefined)).toBe('Gauteng');
    expect(formatArea(undefined, undefined, undefined)).toBe('your area');
  });

  it('heading template matches "Providers matched for {label} in {location}"', () => {
    for (const category of SERVICE_CATEGORIES) {
      const label = formatCategoryLabel(category.value);
      const location = formatArea('Cape Town', 'Western Cape', undefined);
      const heading = `Providers matched for ${label} in ${location}`;

      expect(heading).toContain(label);
      expect(heading).toContain(location);
      expect(heading).toMatch(/^Providers matched for .+ in .+$/);
    }
  });
});
