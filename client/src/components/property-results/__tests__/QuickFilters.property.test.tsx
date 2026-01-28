/**
 * Property-Based Tests for QuickFilters Component
 *
 * **Feature: property-results-optimization, Property 1: Quick filter application**
 *
 * Property 1: Quick filter application
 * For any quick filter preset (Pet-Friendly, Fibre Ready, Sectional Title, Under R2M, Security Estate),
 * applying it should set the correct combination of filter values
 * **Validates: Requirements 2.2**
 *
 * These tests verify that the QuickFilters component correctly applies
 * preset filter combinations for the South African property market.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import { QuickFilters, QUICK_FILTER_PRESETS } from '../QuickFilters';
import type { PropertyFilters } from '../../../../shared/types';

describe('QuickFilters - Property-Based Tests', () => {
  afterEach(() => {
    cleanup();
  });

  /**
   * Property Test 1: Quick filter application
   *
   * For any quick filter preset, when clicked, it should apply
   * the correct filter values to the filter state.
   *
   * **Feature: property-results-optimization, Property 1: Quick filter application**
   * **Validates: Requirements 2.2**
   */
  it('Property 1: should apply correct filter values for each preset', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary preset selection
        fc.constantFrom(
          'PET_FRIENDLY',
          'FIBRE_READY',
          'SECTIONAL_TITLE',
          'UNDER_R2M',
          'SECURITY_ESTATE',
        ),
        async presetKey => {
          cleanup();
          const user = userEvent.setup();
          const onFilterSelect = vi.fn();

          // Get the preset definition
          const preset = QUICK_FILTER_PRESETS[presetKey as keyof typeof QUICK_FILTER_PRESETS];

          // Render component with empty initial filters
          render(
            <QuickFilters activeFilters={{} as PropertyFilters} onFilterSelect={onFilterSelect} />,
          );

          // Find and click the preset button
          const button = screen.getByTestId(`quick-filter-${preset.id}`);
          await user.click(button);

          // Verify the callback was called with correct filters
          expect(onFilterSelect).toHaveBeenCalledTimes(1);
          const appliedFilters = onFilterSelect.mock.calls[0][0];

          // Verify each filter in the preset was applied correctly
          for (const [key, value] of Object.entries(preset.filters)) {
            expect(appliedFilters[key as keyof PropertyFilters]).toEqual(value);
          }

          return true;
        },
      ),
      {
        numRuns: 25, // Reduced for async tests to avoid timeout
        verbose: false,
      },
    );
  }, 30000);

  /**
   * Property Test: Pet-Friendly preset applies correct filter
   * **Feature: property-results-optimization, Property 1: Quick filter application**
   * **Validates: Requirements 2.2**
   */
  it('Property 1: Pet-Friendly preset should set petFriendly to true', async () => {
    const user = userEvent.setup();
    const onFilterSelect = vi.fn();

    render(<QuickFilters activeFilters={{} as PropertyFilters} onFilterSelect={onFilterSelect} />);

    const button = screen.getByTestId('quick-filter-pet-friendly');
    await user.click(button);

    expect(onFilterSelect).toHaveBeenCalledWith(expect.objectContaining({ petFriendly: true }));
  });

  /**
   * Property Test: Fibre Ready preset applies correct filter
   * **Feature: property-results-optimization, Property 1: Quick filter application**
   * **Validates: Requirements 2.2**
   */
  it('Property 1: Fibre Ready preset should set fibreReady to true', async () => {
    const user = userEvent.setup();
    const onFilterSelect = vi.fn();

    render(<QuickFilters activeFilters={{} as PropertyFilters} onFilterSelect={onFilterSelect} />);

    const button = screen.getByTestId('quick-filter-fibre-ready');
    await user.click(button);

    expect(onFilterSelect).toHaveBeenCalledWith(expect.objectContaining({ fibreReady: true }));
  });

  /**
   * Property Test: Sectional Title preset applies correct filter
   * **Feature: property-results-optimization, Property 1: Quick filter application**
   * **Validates: Requirements 2.2**
   */
  it('Property 1: Sectional Title preset should set titleType to sectional', async () => {
    const user = userEvent.setup();
    const onFilterSelect = vi.fn();

    render(<QuickFilters activeFilters={{} as PropertyFilters} onFilterSelect={onFilterSelect} />);

    const button = screen.getByTestId('quick-filter-sectional-title');
    await user.click(button);

    expect(onFilterSelect).toHaveBeenCalledWith(
      expect.objectContaining({ titleType: ['sectional'] }),
    );
  });

  /**
   * Property Test: Under R2M preset applies correct filter
   * **Feature: property-results-optimization, Property 1: Quick filter application**
   * **Validates: Requirements 2.2**
   */
  it('Property 1: Under R2M preset should set maxPrice to 2000000', async () => {
    const user = userEvent.setup();
    const onFilterSelect = vi.fn();

    render(<QuickFilters activeFilters={{} as PropertyFilters} onFilterSelect={onFilterSelect} />);

    const button = screen.getByTestId('quick-filter-under-r2m');
    await user.click(button);

    expect(onFilterSelect).toHaveBeenCalledWith(expect.objectContaining({ maxPrice: 2000000 }));
  });

  /**
   * Property Test: Security Estate preset applies correct filter
   * **Feature: property-results-optimization, Property 1: Quick filter application**
   * **Validates: Requirements 2.2**
   */
  it('Property 1: Security Estate preset should set securityEstate to true', async () => {
    const user = userEvent.setup();
    const onFilterSelect = vi.fn();

    render(<QuickFilters activeFilters={{} as PropertyFilters} onFilterSelect={onFilterSelect} />);

    const button = screen.getByTestId('quick-filter-security-estate');
    await user.click(button);

    expect(onFilterSelect).toHaveBeenCalledWith(expect.objectContaining({ securityEstate: true }));
  });

  /**
   * Property Test: Active preset detection
   *
   * For any preset, if its filters are active in the current state,
   * the button should show as active.
   *
   * **Feature: property-results-optimization, Property 1: Quick filter application**
   * **Validates: Requirements 2.2**
   */
  it('Property 1: should correctly detect when a preset is active', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'PET_FRIENDLY',
          'FIBRE_READY',
          'SECTIONAL_TITLE',
          'UNDER_R2M',
          'SECURITY_ESTATE',
        ),
        presetKey => {
          cleanup();
          const preset = QUICK_FILTER_PRESETS[presetKey as keyof typeof QUICK_FILTER_PRESETS];
          const onFilterSelect = vi.fn();

          // Create active filters that match the preset
          const activeFilters = { ...preset.filters } as PropertyFilters;

          render(<QuickFilters activeFilters={activeFilters} onFilterSelect={onFilterSelect} />);

          const button = screen.getByTestId(`quick-filter-${preset.id}`);

          // Verify the button has the active data attribute
          expect(button.getAttribute('data-active')).toBe('true');

          return true;
        },
      ),
      {
        numRuns: 100,
        verbose: false,
      },
    );
  });

  /**
   * Property Test: Toggle behavior
   *
   * For any active preset, clicking it should deactivate it by
   * clearing its filter values.
   *
   * **Feature: property-results-optimization, Property 1: Quick filter application**
   * **Validates: Requirements 2.2**
   */
  it('Property 1: should clear filters when clicking an active preset', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'PET_FRIENDLY',
          'FIBRE_READY',
          'SECTIONAL_TITLE',
          'UNDER_R2M',
          'SECURITY_ESTATE',
        ),
        async presetKey => {
          cleanup();
          const user = userEvent.setup();
          const preset = QUICK_FILTER_PRESETS[presetKey as keyof typeof QUICK_FILTER_PRESETS];
          const onFilterSelect = vi.fn();

          // Create active filters that match the preset
          const activeFilters = { ...preset.filters } as PropertyFilters;

          render(<QuickFilters activeFilters={activeFilters} onFilterSelect={onFilterSelect} />);

          const button = screen.getByTestId(`quick-filter-${preset.id}`);
          await user.click(button);

          // Verify the callback was called to clear the filters
          expect(onFilterSelect).toHaveBeenCalledTimes(1);
          const clearedFilters = onFilterSelect.mock.calls[0][0];

          // Verify each filter in the preset was set to undefined
          for (const key of Object.keys(preset.filters)) {
            expect(clearedFilters[key as keyof PropertyFilters]).toBeUndefined();
          }

          return true;
        },
      ),
      {
        numRuns: 25, // Reduced for async tests to avoid timeout
        verbose: false,
      },
    );
  }, 30000);

  /**
   * Property Test: Multiple presets can be active simultaneously
   *
   * For any combination of presets, multiple can be active at once
   * without interfering with each other.
   *
   * **Feature: property-results-optimization, Property 1: Quick filter application**
   * **Validates: Requirements 2.2**
   */
  it('Property 1: should support multiple active presets simultaneously', () => {
    fc.assert(
      fc.property(
        // Generate a subset of presets to activate
        fc.subarray(
          ['PET_FRIENDLY', 'FIBRE_READY', 'SECTIONAL_TITLE', 'UNDER_R2M', 'SECURITY_ESTATE'],
          { minLength: 2, maxLength: 5 },
        ),
        activePresetKeys => {
          cleanup();
          const onFilterSelect = vi.fn();

          // Combine filters from all selected presets
          const combinedFilters: Partial<PropertyFilters> = {};
          for (const key of activePresetKeys) {
            const preset = QUICK_FILTER_PRESETS[key as keyof typeof QUICK_FILTER_PRESETS];
            Object.assign(combinedFilters, preset.filters);
          }

          render(
            <QuickFilters
              activeFilters={combinedFilters as PropertyFilters}
              onFilterSelect={onFilterSelect}
            />,
          );

          // Verify all selected presets show as active
          for (const key of activePresetKeys) {
            const preset = QUICK_FILTER_PRESETS[key as keyof typeof QUICK_FILTER_PRESETS];
            const button = screen.getByTestId(`quick-filter-${preset.id}`);
            expect(button.getAttribute('data-active')).toBe('true');
          }

          return true;
        },
      ),
      {
        numRuns: 100,
        verbose: false,
      },
    );
  });
});
