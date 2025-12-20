/**
 * Property-Based Tests for QuickFilters Component
 * 
 * Feature: property-results-optimization, Property 1
 * 
 * Property 1: Quick filter application
 * For any quick filter preset (Pet-Friendly, Fibre Ready, Sectional Title, Under R2M, Security Estate),
 * applying it should set the correct combination of filter values
 * Validates: Requirements 2.2
 * 
 * These tests verify that the QuickFilters component correctly applies
 * preset filter combinations for the South African property market.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import { QuickFilters, QUICK_FILTER_PRESETS } from '../QuickFilters';
import type { PropertyFilters } from '../../../../shared/types';

describe('QuickFilters - Property-Based Tests', () => {
  /**
   * Property Test 1: Quick filter application
   * 
   * For any quick filter preset, when clicked, it should apply
   * the correct filter values to the filter state.
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
          'SECURITY_ESTATE'
        ),
        // Generate arbitrary initial filter state
        fc.record({
          province: fc.option(fc.constantFrom('Gauteng', 'Western Cape'), { nil: undefined }),
          city: fc.option(fc.constantFrom('Johannesburg', 'Cape Town'), { nil: undefined }),
          minPrice: fc.option(fc.integer({ min: 100000, max: 1000000 }), { nil: undefined }),
          maxPrice: fc.option(fc.integer({ min: 1000000, max: 10000000 }), { nil: undefined }),
        }),
        async (presetKey, initialFilters) => {
          const user = userEvent.setup();
          const onFilterSelect = vi.fn();
          
          // Get the preset definition
          const preset = QUICK_FILTER_PRESETS[presetKey as keyof typeof QUICK_FILTER_PRESETS];
          
          // Render component with initial filters
          render(
            <QuickFilters
              activeFilters={initialFilters as PropertyFilters}
              onFilterSelect={onFilterSelect}
            />
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
        }
      ),
      {
        numRuns: 100, // Run 100 iterations as per spec requirements
        verbose: false,
      }
    );
  });

  /**
   * Property Test: Pet-Friendly preset applies correct filter
   */
  it('Property 1: Pet-Friendly preset should set petFriendly to true', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary initial filter state
        fc.record({
          province: fc.option(fc.constantFrom('Gauteng', 'Western Cape'), { nil: undefined }),
          petFriendly: fc.option(fc.boolean(), { nil: undefined }),
        }),
        async (initialFilters) => {
          const user = userEvent.setup();
          const onFilterSelect = vi.fn();
          
          render(
            <QuickFilters
              activeFilters={initialFilters as PropertyFilters}
              onFilterSelect={onFilterSelect}
            />
          );
          
          const button = screen.getByTestId('quick-filter-pet-friendly');
          await user.click(button);
          
          expect(onFilterSelect).toHaveBeenCalledWith(
            expect.objectContaining({ petFriendly: true })
          );
          
          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    );
  });

  /**
   * Property Test: Fibre Ready preset applies correct filter
   */
  it('Property 1: Fibre Ready preset should set fibreReady to true', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          city: fc.option(fc.constantFrom('Johannesburg', 'Cape Town'), { nil: undefined }),
          fibreReady: fc.option(fc.boolean(), { nil: undefined }),
        }),
        async (initialFilters) => {
          const user = userEvent.setup();
          const onFilterSelect = vi.fn();
          
          render(
            <QuickFilters
              activeFilters={initialFilters as PropertyFilters}
              onFilterSelect={onFilterSelect}
            />
          );
          
          const button = screen.getByTestId('quick-filter-fibre-ready');
          await user.click(button);
          
          expect(onFilterSelect).toHaveBeenCalledWith(
            expect.objectContaining({ fibreReady: true })
          );
          
          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    );
  });

  /**
   * Property Test: Sectional Title preset applies correct filter
   */
  it('Property 1: Sectional Title preset should set titleType to sectional', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          suburb: fc.option(fc.array(fc.constantFrom('Sandton', 'Camps Bay'), { minLength: 1 }), { nil: undefined }),
          titleType: fc.option(fc.array(fc.constantFrom('freehold', 'sectional'), { minLength: 1 }), { nil: undefined }),
        }),
        async (initialFilters) => {
          const user = userEvent.setup();
          const onFilterSelect = vi.fn();
          
          render(
            <QuickFilters
              activeFilters={initialFilters as PropertyFilters}
              onFilterSelect={onFilterSelect}
            />
          );
          
          const button = screen.getByTestId('quick-filter-sectional-title');
          await user.click(button);
          
          expect(onFilterSelect).toHaveBeenCalledWith(
            expect.objectContaining({ titleType: ['sectional'] })
          );
          
          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    );
  });

  /**
   * Property Test: Under R2M preset applies correct filter
   */
  it('Property 1: Under R2M preset should set maxPrice to 2000000', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          minPrice: fc.option(fc.integer({ min: 100000, max: 1000000 }), { nil: undefined }),
          maxPrice: fc.option(fc.integer({ min: 2000000, max: 10000000 }), { nil: undefined }),
        }),
        async (initialFilters) => {
          const user = userEvent.setup();
          const onFilterSelect = vi.fn();
          
          render(
            <QuickFilters
              activeFilters={initialFilters as PropertyFilters}
              onFilterSelect={onFilterSelect}
            />
          );
          
          const button = screen.getByTestId('quick-filter-under-r2m');
          await user.click(button);
          
          expect(onFilterSelect).toHaveBeenCalledWith(
            expect.objectContaining({ maxPrice: 2000000 })
          );
          
          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    );
  });

  /**
   * Property Test: Security Estate preset applies correct filter
   */
  it('Property 1: Security Estate preset should set securityEstate to true', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          propertyType: fc.option(fc.array(fc.constantFrom('house', 'apartment'), { minLength: 1 }), { nil: undefined }),
          securityEstate: fc.option(fc.boolean(), { nil: undefined }),
        }),
        async (initialFilters) => {
          const user = userEvent.setup();
          const onFilterSelect = vi.fn();
          
          render(
            <QuickFilters
              activeFilters={initialFilters as PropertyFilters}
              onFilterSelect={onFilterSelect}
            />
          );
          
          const button = screen.getByTestId('quick-filter-security-estate');
          await user.click(button);
          
          expect(onFilterSelect).toHaveBeenCalledWith(
            expect.objectContaining({ securityEstate: true })
          );
          
          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    );
  });

  /**
   * Property Test: Active preset detection
   * 
   * For any preset, if its filters are active in the current state,
   * the button should show as active.
   */
  it('Property 1: should correctly detect when a preset is active', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'PET_FRIENDLY',
          'FIBRE_READY',
          'SECTIONAL_TITLE',
          'UNDER_R2M',
          'SECURITY_ESTATE'
        ),
        (presetKey) => {
          const preset = QUICK_FILTER_PRESETS[presetKey as keyof typeof QUICK_FILTER_PRESETS];
          const onFilterSelect = vi.fn();
          
          // Create active filters that match the preset
          const activeFilters = { ...preset.filters } as PropertyFilters;
          
          render(
            <QuickFilters
              activeFilters={activeFilters}
              onFilterSelect={onFilterSelect}
            />
          );
          
          const button = screen.getByTestId(`quick-filter-${preset.id}`);
          
          // Verify the button has the active data attribute
          expect(button.getAttribute('data-active')).toBe('true');
          
          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    );
  });

  /**
   * Property Test: Toggle behavior
   * 
   * For any active preset, clicking it should deactivate it by
   * clearing its filter values.
   */
  it('Property 1: should clear filters when clicking an active preset', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'PET_FRIENDLY',
          'FIBRE_READY',
          'SECTIONAL_TITLE',
          'UNDER_R2M',
          'SECURITY_ESTATE'
        ),
        async (presetKey) => {
          const user = userEvent.setup();
          const preset = QUICK_FILTER_PRESETS[presetKey as keyof typeof QUICK_FILTER_PRESETS];
          const onFilterSelect = vi.fn();
          
          // Create active filters that match the preset
          const activeFilters = { ...preset.filters } as PropertyFilters;
          
          render(
            <QuickFilters
              activeFilters={activeFilters}
              onFilterSelect={onFilterSelect}
            />
          );
          
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
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    );
  });

  /**
   * Property Test: Multiple presets can be active simultaneously
   * 
   * For any combination of presets, multiple can be active at once
   * without interfering with each other.
   */
  it('Property 1: should support multiple active presets simultaneously', () => {
    fc.assert(
      fc.property(
        // Generate a subset of presets to activate
        fc.subarray(
          ['PET_FRIENDLY', 'FIBRE_READY', 'SECTIONAL_TITLE', 'UNDER_R2M', 'SECURITY_ESTATE'],
          { minLength: 2, maxLength: 5 }
        ),
        (activePresetKeys) => {
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
            />
          );
          
          // Verify all selected presets show as active
          for (const key of activePresetKeys) {
            const preset = QUICK_FILTER_PRESETS[key as keyof typeof QUICK_FILTER_PRESETS];
            const button = screen.getByTestId(`quick-filter-${preset.id}`);
            expect(button.getAttribute('data-active')).toBe('true');
          }
          
          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    );
  });
});

</content>
</invoke>