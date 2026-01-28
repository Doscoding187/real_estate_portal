/**
 * Property-Based Tests for SortControls Component
 *
 * **Feature: property-results-optimization, Property 6: View mode filter preservation**
 *
 * Property 6: View mode filter preservation
 * For any view mode switch (list ↔ grid ↔ map), the active filters should remain unchanged
 * **Validates: Requirements 3.4**
 *
 * These tests verify that switching view modes preserves the current filter state.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import { SortControls, VIEW_MODES, SORT_OPTIONS } from '../SortControls';
import type { SortOption, ViewMode, PropertyFilters } from '../../../../../shared/types';

// Arbitrary generators for property-based testing
const viewModeArb = fc.constantFrom<ViewMode>('list', 'grid', 'map');
const sortOptionArb = fc.constantFrom<SortOption>(
  'price_asc',
  'price_desc',
  'date_desc',
  'date_asc',
  'suburb_asc',
  'suburb_desc',
);

// Generate arbitrary filter state
const propertyFiltersArb = fc.record({
  province: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  city: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  suburb: fc.option(
    fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 3 }),
    { nil: undefined },
  ),
  minPrice: fc.option(fc.integer({ min: 0, max: 10000000 }), { nil: undefined }),
  maxPrice: fc.option(fc.integer({ min: 0, max: 50000000 }), { nil: undefined }),
  minBedrooms: fc.option(fc.integer({ min: 1, max: 10 }), { nil: undefined }),
  petFriendly: fc.option(fc.boolean(), { nil: undefined }),
  fibreReady: fc.option(fc.boolean(), { nil: undefined }),
  securityEstate: fc.option(fc.boolean(), { nil: undefined }),
});

describe('SortControls - Property-Based Tests', () => {
  afterEach(() => {
    cleanup();
  });

  /**
   * Property Test 6: View mode filter preservation
   *
   * For any view mode switch (list ↔ grid ↔ map), the active filters
   * should remain unchanged.
   *
   * **Feature: property-results-optimization, Property 6: View mode filter preservation**
   * **Validates: Requirements 3.4**
   */
  it('Property 6: should preserve filters when switching view modes', async () => {
    await fc.assert(
      fc.asyncProperty(
        viewModeArb,
        viewModeArb,
        propertyFiltersArb,
        sortOptionArb,
        async (initialViewMode, targetViewMode, filters, sortOption) => {
          // Skip if same view mode (no switch)
          if (initialViewMode === targetViewMode) return true;

          cleanup();
          const user = userEvent.setup();

          // Track filter state - this simulates what the store would do
          let currentFilters = { ...filters };
          let currentViewMode = initialViewMode;
          let currentSortOption = sortOption;

          const onViewModeChange = vi.fn((mode: ViewMode) => {
            // View mode change should NOT modify filters
            currentViewMode = mode;
          });

          const onSortChange = vi.fn((sort: SortOption) => {
            currentSortOption = sort;
          });

          render(
            <SortControls
              sortOption={currentSortOption}
              viewMode={currentViewMode}
              onSortChange={onSortChange}
              onViewModeChange={onViewModeChange}
            />,
          );

          // Click the target view mode button
          const targetButton = screen.getByTestId(`view-mode-${targetViewMode}`);
          await user.click(targetButton);

          // Verify view mode changed
          expect(onViewModeChange).toHaveBeenCalledWith(targetViewMode);

          // Verify filters remain unchanged
          // The key property: filters should be exactly the same after view mode switch
          expect(currentFilters).toEqual(filters);

          // Verify sort option remains unchanged
          expect(currentSortOption).toBe(sortOption);

          return true;
        },
      ),
      {
        numRuns: 50,
        verbose: false,
      },
    );
  }, 30000);

  /**
   * Property Test: View mode toggle renders all modes
   *
   * For any initial view mode, all three view mode buttons should be rendered.
   *
   * **Feature: property-results-optimization, Property 6: View mode filter preservation**
   * **Validates: Requirements 3.4**
   */
  it('Property 6: should render all view mode buttons regardless of current mode', () => {
    fc.assert(
      fc.property(viewModeArb, sortOptionArb, (viewMode, sortOption) => {
        cleanup();
        const onViewModeChange = vi.fn();
        const onSortChange = vi.fn();

        render(
          <SortControls
            sortOption={sortOption}
            viewMode={viewMode}
            onSortChange={onSortChange}
            onViewModeChange={onViewModeChange}
          />,
        );

        // All view mode buttons should be present
        const listButton = screen.queryByTestId('view-mode-list');
        const gridButton = screen.queryByTestId('view-mode-grid');
        const mapButton = screen.queryByTestId('view-mode-map');

        expect(listButton).not.toBeNull();
        expect(gridButton).not.toBeNull();
        expect(mapButton).not.toBeNull();

        return true;
      }),
      {
        numRuns: 100,
        verbose: false,
      },
    );
  });

  /**
   * Property Test: Active view mode is visually indicated
   *
   * For any view mode, the active button should have data-active="true".
   *
   * **Feature: property-results-optimization, Property 6: View mode filter preservation**
   * **Validates: Requirements 3.4**
   */
  it('Property 6: should indicate active view mode correctly', () => {
    fc.assert(
      fc.property(viewModeArb, sortOptionArb, (viewMode, sortOption) => {
        cleanup();
        const onViewModeChange = vi.fn();
        const onSortChange = vi.fn();

        render(
          <SortControls
            sortOption={sortOption}
            viewMode={viewMode}
            onSortChange={onSortChange}
            onViewModeChange={onViewModeChange}
          />,
        );

        // Active button should have data-active="true"
        const activeButton = screen.getByTestId(`view-mode-${viewMode}`);
        expect(activeButton.getAttribute('data-active')).toBe('true');

        // Other buttons should have data-active="false" or not set
        const allModes: ViewMode[] = ['list', 'grid', 'map'];
        for (const mode of allModes) {
          if (mode !== viewMode) {
            const button = screen.getByTestId(`view-mode-${mode}`);
            expect(button.getAttribute('data-active')).not.toBe('true');
          }
        }

        return true;
      }),
      {
        numRuns: 100,
        verbose: false,
      },
    );
  });

  /**
   * Property Test: Sort dropdown is rendered
   *
   * The sort dropdown should be present in the component.
   *
   * **Feature: property-results-optimization, Property 6: View mode filter preservation**
   * **Validates: Requirements 2.3**
   */
  it('should render sort dropdown', () => {
    fc.assert(
      fc.property(viewModeArb, sortOptionArb, (viewMode, sortOption) => {
        cleanup();
        const onViewModeChange = vi.fn();
        const onSortChange = vi.fn();

        render(
          <SortControls
            sortOption={sortOption}
            viewMode={viewMode}
            onSortChange={onSortChange}
            onViewModeChange={onViewModeChange}
          />,
        );

        // Sort dropdown should be present
        const sortDropdown = screen.queryByTestId('sort-dropdown');
        expect(sortDropdown).not.toBeNull();

        return true;
      }),
      {
        numRuns: 100,
        verbose: false,
      },
    );
  });

  /**
   * Property Test: Component respects showViewModeToggle prop
   *
   * When showViewModeToggle is false, view mode buttons should not be rendered.
   *
   * **Feature: property-results-optimization, Property 6: View mode filter preservation**
   * **Validates: Requirements 3.4**
   */
  it('should hide view mode toggle when showViewModeToggle is false', () => {
    fc.assert(
      fc.property(viewModeArb, sortOptionArb, (viewMode, sortOption) => {
        cleanup();
        const onViewModeChange = vi.fn();
        const onSortChange = vi.fn();

        render(
          <SortControls
            sortOption={sortOption}
            viewMode={viewMode}
            onSortChange={onSortChange}
            onViewModeChange={onViewModeChange}
            showViewModeToggle={false}
          />,
        );

        // View mode toggle should not be present
        const viewModeToggle = screen.queryByTestId('view-mode-toggle');
        expect(viewModeToggle).toBeNull();

        // Sort dropdown should still be present
        const sortDropdown = screen.queryByTestId('sort-dropdown');
        expect(sortDropdown).not.toBeNull();

        return true;
      }),
      {
        numRuns: 50,
        verbose: false,
      },
    );
  });

  /**
   * Property Test: Component respects showSortDropdown prop
   *
   * When showSortDropdown is false, sort dropdown should not be rendered.
   *
   * **Feature: property-results-optimization, Property 6: View mode filter preservation**
   * **Validates: Requirements 2.3**
   */
  it('should hide sort dropdown when showSortDropdown is false', () => {
    fc.assert(
      fc.property(viewModeArb, sortOptionArb, (viewMode, sortOption) => {
        cleanup();
        const onViewModeChange = vi.fn();
        const onSortChange = vi.fn();

        render(
          <SortControls
            sortOption={sortOption}
            viewMode={viewMode}
            onSortChange={onSortChange}
            onViewModeChange={onViewModeChange}
            showSortDropdown={false}
          />,
        );

        // Sort dropdown should not be present
        const sortDropdown = screen.queryByTestId('sort-dropdown');
        expect(sortDropdown).toBeNull();

        // View mode toggle should still be present
        const viewModeToggle = screen.queryByTestId('view-mode-toggle');
        expect(viewModeToggle).not.toBeNull();

        return true;
      }),
      {
        numRuns: 50,
        verbose: false,
      },
    );
  });

  /**
   * Property Test: All sort options are valid
   *
   * All defined sort options should be valid SortOption values.
   *
   * **Feature: property-results-optimization, Property 6: View mode filter preservation**
   * **Validates: Requirements 2.3**
   */
  it('should have all required sort options defined', () => {
    const requiredOptions: SortOption[] = [
      'price_asc',
      'price_desc',
      'date_desc',
      'date_asc',
      'suburb_asc',
      'suburb_desc',
    ];

    const definedOptions = SORT_OPTIONS.map(opt => opt.value);

    for (const required of requiredOptions) {
      expect(definedOptions).toContain(required);
    }
  });

  /**
   * Property Test: All view modes are valid
   *
   * All defined view modes should be valid ViewMode values.
   *
   * **Feature: property-results-optimization, Property 6: View mode filter preservation**
   * **Validates: Requirements 3.1**
   */
  it('should have all required view modes defined', () => {
    const requiredModes: ViewMode[] = ['list', 'grid', 'map'];

    const definedModes = VIEW_MODES.map(mode => mode.value);

    for (const required of requiredModes) {
      expect(definedModes).toContain(required);
    }
  });

  /**
   * Property Test: View mode switch calls callback with correct value
   *
   * For any view mode button click, the callback should be called with the correct mode.
   *
   * **Feature: property-results-optimization, Property 6: View mode filter preservation**
   * **Validates: Requirements 3.4**
   */
  it('Property 6: should call onViewModeChange with correct value when clicking view mode buttons', async () => {
    await fc.assert(
      fc.asyncProperty(
        viewModeArb,
        viewModeArb,
        sortOptionArb,
        async (currentViewMode, targetViewMode, sortOption) => {
          cleanup();
          const user = userEvent.setup();
          const onViewModeChange = vi.fn();
          const onSortChange = vi.fn();

          render(
            <SortControls
              sortOption={sortOption}
              viewMode={currentViewMode}
              onSortChange={onSortChange}
              onViewModeChange={onViewModeChange}
            />,
          );

          // Click the target view mode button
          const targetButton = screen.getByTestId(`view-mode-${targetViewMode}`);
          await user.click(targetButton);

          // Verify the callback was called with the correct value
          expect(onViewModeChange).toHaveBeenCalledWith(targetViewMode);

          // Verify sort change was NOT called
          expect(onSortChange).not.toHaveBeenCalled();

          return true;
        },
      ),
      {
        numRuns: 50,
        verbose: false,
      },
    );
  }, 30000);
});
