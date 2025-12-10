/**
 * Property-Based Tests for LocationAutocomplete Component
 * 
 * These tests verify universal properties that should hold across all inputs
 * using fast-check for property-based testing.
 * 
 * Test Configuration: Minimum 100 iterations per property test
 * 
 * Uses fake timers for deterministic, fast testing of debounce logic
 */

import { describe, expect, vi, beforeEach, afterEach } from 'vitest';
import { it, fc } from '@fast-check/vitest';
import { render, waitFor, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocationAutocomplete } from '../LocationAutocomplete.new';

// Mock Google Maps API
const mockAutocompleteService = {
  getPlacePredictions: vi.fn(),
};

const mockPlacesService = {
  getDetails: vi.fn(),
};

const mockSessionToken = {};

// Helper function to render component and get input element safely
function renderLocationAutocomplete(onChange: any) {
  const result = render(
    <LocationAutocomplete
      value=""
      onChange={onChange}
      placeholder="Search location"
    />
  );
  
  // Use container query to avoid finding multiple elements across test runs
  const input = result.container.querySelector('input[role="combobox"]') as HTMLInputElement;
  
  // Input should be immediately available
  expect(input).not.toBeNull();
  
  return { ...result, input };
}

beforeEach(() => {
  // Use fake timers for deterministic testing
  vi.useFakeTimers();
  
  // Setup Google Maps mock
  global.window.google = {
    maps: {
      places: {
        AutocompleteService: vi.fn(() => mockAutocompleteService),
        PlacesService: vi.fn(() => mockPlacesService),
        AutocompleteSessionToken: vi.fn(() => mockSessionToken),
        PlacesServiceStatus: {
          OK: 'OK',
          ZERO_RESULTS: 'ZERO_RESULTS',
          ERROR: 'ERROR',
        },
      },
      Map: vi.fn(),
    },
  } as any;

  // Reset mocks
  vi.clearAllMocks();
  
  // Clear localStorage
  localStorage.clear();
});

afterEach(() => {
  // Clean up all rendered components - CRITICAL for property-based tests
  cleanup();
  
  // Restore real timers
  vi.useRealTimers();
});

describe('LocationAutocomplete Property-Based Tests', () => {
  /**
   * Property 13: Debounce delay enforcement
   * Feature: google-places-autocomplete-integration, Property 13: Debounce delay enforcement
   * Validates: Requirements 5.1
   * 
   * For any sequence of rapid keystrokes in the location field,
   * API requests should only be made after 300ms of inactivity
   */
  describe('Property 13: Debounce delay enforcement', () => {
    it.prop([
      fc.string({ minLength: 3, maxLength: 10 }).filter(s => s.trim().length >= 3),
    ], { numRuns: 100 })(
      'should only make API request after 300ms delay for any valid input',
      async (searchQuery) => {
        const onChange = vi.fn();
        const user = userEvent.setup({ delay: null }); // No delay with fake timers

        // Mock API response
        mockAutocompleteService.getPlacePredictions.mockImplementation((request, callback) => {
          callback([], 'OK');
        });

        const { input, unmount } = renderLocationAutocomplete(onChange);

        // Type the search query
        await user.type(input, searchQuery);

        // Immediately after typing, API should not be called yet
        expect(mockAutocompleteService.getPlacePredictions).not.toHaveBeenCalled();

        // Advance timers by 299ms - should still not call API
        act(() => {
          vi.advanceTimersByTime(299);
        });
        expect(mockAutocompleteService.getPlacePredictions).not.toHaveBeenCalled();

        // Advance by 1 more ms to reach 300ms - should now call API
        act(() => {
          vi.advanceTimersByTime(1);
        });

        // After debounce delay, API should be called exactly once
        expect(mockAutocompleteService.getPlacePredictions).toHaveBeenCalledTimes(1);
        
        unmount();
      }
    );

    it.prop([
      fc.string({ minLength: 3, maxLength: 10 }).filter(s => s.trim().length >= 3),
    ], { numRuns: 100 })(
      'should reset debounce timer on each keystroke',
      async (searchQuery) => {
        const onChange = vi.fn();
        const user = userEvent.setup({ delay: null }); // No delay with fake timers

        // Mock API response
        mockAutocompleteService.getPlacePredictions.mockImplementation((request, callback) => {
          callback([], 'OK');
        });

        const { input, unmount } = renderLocationAutocomplete(onChange);

        // Type each character individually to simulate rapid typing
        for (let i = 0; i < searchQuery.length; i++) {
          await user.type(input, searchQuery[i]);
          
          // Advance time by 100ms (less than debounce delay)
          act(() => {
            vi.advanceTimersByTime(100);
          });
          
          // Should not call API yet
          expect(mockAutocompleteService.getPlacePredictions).not.toHaveBeenCalled();
        }

        // Now advance past the debounce delay after last keystroke
        act(() => {
          vi.advanceTimersByTime(300);
        });

        // Should be called exactly once after all typing is done
        expect(mockAutocompleteService.getPlacePredictions).toHaveBeenCalledTimes(1);
        
        unmount();
      }
    );
  });

  /**
   * Property 1: Minimum input length triggers autocomplete
   * Feature: google-places-autocomplete-integration, Property 1: Minimum input length triggers autocomplete
   * Validates: Requirements 1.2
   * 
   * For any user input string, autocomplete suggestions should only be
   * fetched when the string length is >= 3 characters
   */
  describe('Property 1: Minimum input length triggers autocomplete', () => {
    it.prop([
      fc.string({ minLength: 1, maxLength: 2 }).filter(s => s.trim().length > 0),
    ], { numRuns: 100 })(
      'should NOT fetch suggestions for input with less than 3 characters',
      async (shortInput) => {
        const onChange = vi.fn();
        const user = userEvent.setup({ delay: null });

        const { input, unmount } = renderLocationAutocomplete(onChange);

        // Type short input
        await user.type(input, shortInput);

        // Advance past debounce delay
        act(() => {
          vi.advanceTimersByTime(300);
        });

        // Should not call API for short input
        expect(mockAutocompleteService.getPlacePredictions).not.toHaveBeenCalled();
        
        unmount();
      }
    );

    it.prop([
      fc.string({ minLength: 3, maxLength: 15 }).filter(s => s.trim().length >= 3),
    ], { numRuns: 100 })(
      'should fetch suggestions for input with 3 or more characters',
      async (validInput) => {
        const onChange = vi.fn();
        const user = userEvent.setup({ delay: null });

        // Mock successful API response
        mockAutocompleteService.getPlacePredictions.mockImplementation((request, callback) => {
          callback([], 'OK');
        });

        const { input, unmount } = renderLocationAutocomplete(onChange);

        // Type valid input
        await user.type(input, validInput);

        // Advance past debounce delay
        act(() => {
          vi.advanceTimersByTime(300);
        });

        // Should call API for valid length input
        expect(mockAutocompleteService.getPlacePredictions).toHaveBeenCalled();
        
        unmount();
      }
    );

    it.prop([
      fc.integer({ min: 1, max: 2 }),
      fc.integer({ min: 3, max: 8 }),
    ], { numRuns: 100 })(
      'should transition from no-fetch to fetch when crossing 3-character threshold',
      async (shortLength, longLength) => {
        const onChange = vi.fn();
        const user = userEvent.setup({ delay: null });

        // Mock successful API response
        mockAutocompleteService.getPlacePredictions.mockImplementation((request, callback) => {
          callback([], 'OK');
        });

        const { input, unmount } = renderLocationAutocomplete(onChange);

        // Type short input (below threshold)
        const shortInput = 'a'.repeat(shortLength);
        await user.type(input, shortInput);
        
        // Advance past debounce delay
        act(() => {
          vi.advanceTimersByTime(300);
        });

        // Should not call API
        expect(mockAutocompleteService.getPlacePredictions).not.toHaveBeenCalled();

        // Now type more to cross threshold
        const additionalChars = 'b'.repeat(longLength - shortLength);
        await user.type(input, additionalChars);
        
        // Advance past debounce delay again
        act(() => {
          vi.advanceTimersByTime(300);
        });

        // Should now call API
        expect(mockAutocompleteService.getPlacePredictions).toHaveBeenCalled();
        
        unmount();
      }
    );
  });

  /**
   * Property 2: Suggestion display cap
   * Feature: google-places-autocomplete-integration, Property 2: Suggestion display cap
   * Validates: Requirements 1.3
   * 
   * For any API response containing autocomplete suggestions,
   * the UI should display at most 5 suggestions regardless of how many the API returns
   */
  describe('Property 2: Suggestion display cap', () => {
    it.prop([
      fc.integer({ min: 6, max: 15 }), // Number of predictions returned by API
    ], { numRuns: 100 })(
      'should display at most 5 suggestions when API returns more',
      async (numPredictions) => {
        const onChange = vi.fn();
        const user = userEvent.setup({ delay: null });

        // Generate mock predictions with valid data
        const mockPredictions = Array.from({ length: numPredictions }, (_, i) => ({
          place_id: `place_${i}`,
          description: `Location ${i}`,
          structured_formatting: {
            main_text: `Location ${i}`,
            secondary_text: `South Africa`,
          },
        }));

        // Mock API to return many predictions
        mockAutocompleteService.getPlacePredictions.mockImplementation((request, callback) => {
          callback(mockPredictions, 'OK');
        });

        const { input, container, unmount } = renderLocationAutocomplete(onChange);

        // Type valid input
        await user.type(input, 'test');

        // Advance timers to trigger debounce and allow state updates
        await act(async () => {
          vi.advanceTimersByTime(300);
          // Allow React to process state updates
          await Promise.resolve();
        });

        // Count displayed suggestions
        const options = container.querySelectorAll('[role="option"]');
        
        // Should display at most 5 suggestions
        expect(options.length).toBeLessThanOrEqual(5);
        expect(options.length).toBe(Math.min(5, numPredictions));
        
        unmount();
      }
    );

    it.prop([
      fc.integer({ min: 1, max: 5 }), // Number of predictions (within cap)
    ], { numRuns: 100 })(
      'should display all suggestions when API returns 5 or fewer',
      async (numPredictions) => {
        const onChange = vi.fn();
        const user = userEvent.setup({ delay: null });

        // Generate mock predictions with valid data
        const mockPredictions = Array.from({ length: numPredictions }, (_, i) => ({
          place_id: `place_${i}`,
          description: `Location ${i}`,
          structured_formatting: {
            main_text: `Location ${i}`,
            secondary_text: `South Africa`,
          },
        }));

        // Mock API to return predictions
        mockAutocompleteService.getPlacePredictions.mockImplementation((request, callback) => {
          callback(mockPredictions, 'OK');
        });

        const { input, container, unmount } = renderLocationAutocomplete(onChange);

        // Type valid input
        await user.type(input, 'test');

        // Advance timers to trigger debounce and allow state updates
        await act(async () => {
          vi.advanceTimersByTime(300);
          // Allow React to process state updates
          await Promise.resolve();
        });

        // Count displayed suggestions
        const options = container.querySelectorAll('[role="option"]');
        
        // Should display exactly the number returned (since it's <= 5)
        expect(options.length).toBe(numPredictions);
        
        unmount();
      }
    );

    it.prop([
      fc.array(
        fc.record({
          place_id: fc.string({ minLength: 5, maxLength: 20 }),
          main_text: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          secondary_text: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
        }),
        { minLength: 10, maxLength: 20 }
      ),
    ], { numRuns: 100 })(
      'should always cap at 5 regardless of prediction content',
      async (predictionData) => {
        const onChange = vi.fn();
        const user = userEvent.setup({ delay: null });

        // Convert to proper prediction format - filter out any invalid data
        const mockPredictions = predictionData
          .filter(p => p.main_text.trim().length > 0 && p.secondary_text.trim().length > 0)
          .map(p => ({
            place_id: p.place_id,
            description: `${p.main_text}, ${p.secondary_text}`,
            structured_formatting: {
              main_text: p.main_text,
              secondary_text: p.secondary_text,
            },
          }));

        // Skip if we don't have enough valid predictions
        if (mockPredictions.length < 6) {
          return;
        }

        // Mock API to return predictions
        mockAutocompleteService.getPlacePredictions.mockImplementation((request, callback) => {
          callback(mockPredictions, 'OK');
        });

        const { input, container, unmount } = renderLocationAutocomplete(onChange);

        // Type valid input
        await user.type(input, 'test');

        // Advance timers to trigger debounce and allow state updates
        await act(async () => {
          vi.advanceTimersByTime(300);
          // Allow React to process state updates
          await Promise.resolve();
        });

        // Count displayed suggestions
        const options = container.querySelectorAll('[role="option"]');
        
        // Should never exceed 5
        expect(options.length).toBeLessThanOrEqual(5);
        
        unmount();
      }
    );
  });
});



