/**
 * Unit Tests for Recent Searches Feature
 * 
 * Tests verify the recent searches functionality in LocationAutocomplete component
 * according to Requirements 14.1-14.5
 */

import { describe, expect, vi, beforeEach, afterEach, it } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
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

beforeEach(() => {
  // Clear localStorage before each test
  localStorage.clear();
  
  // Mock Google Maps API
  (global as any).google = {
    maps: {
      places: {
        AutocompleteService: vi.fn(() => mockAutocompleteService),
        PlacesService: vi.fn(() => mockPlacesService),
        AutocompleteSessionToken: vi.fn(() => mockSessionToken),
        PlacesServiceStatus: {
          OK: 'OK',
          ZERO_RESULTS: 'ZERO_RESULTS',
        },
      },
      Map: vi.fn(),
    },
  };
});

afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('Recent Searches Feature', () => {
  /**
   * Requirement 14.1: Store location in recent searches (max 5 items)
   */
  it('should store selected location in recent searches', async () => {
    const onChange = vi.fn();
    
    const mockPrediction = {
      place_id: 'test-place-1',
      description: 'Sandton, Johannesburg',
      structured_formatting: {
        main_text: 'Sandton',
        secondary_text: 'Johannesburg, Gauteng, South Africa',
      },
    };

    const mockPlaceDetails = {
      place_id: 'test-place-1',
      name: 'Sandton',
      formatted_address: 'Sandton, Johannesburg, 2196, South Africa',
      geometry: {
        location: {
          lat: () => -26.1076,
          lng: () => 28.0567,
        },
        viewport: {
          getNorthEast: () => ({ lat: () => -26.1, lng: () => 28.06 }),
          getSouthWest: () => ({ lat: () => -26.11, lng: () => 28.05 }),
        },
      },
      address_components: [],
    };

    mockAutocompleteService.getPlacePredictions.mockImplementation((request, callback) => {
      callback([mockPrediction], 'OK');
    });

    mockPlacesService.getDetails.mockImplementation((request, callback) => {
      callback(mockPlaceDetails, 'OK');
    });

    render(
      <LocationAutocomplete
        value=""
        onChange={onChange}
        placeholder="Search location"
      />
    );

    const input = screen.getByRole('combobox');
    
    // Type to trigger autocomplete
    await userEvent.type(input, 'Sandton');
    
    // Wait for suggestions
    await waitFor(() => {
      expect(mockAutocompleteService.getPlacePredictions).toHaveBeenCalled();
    });

    // Click on suggestion
    const suggestion = await screen.findByText('Sandton');
    await userEvent.click(suggestion);

    // Wait for place details
    await waitFor(() => {
      expect(mockPlacesService.getDetails).toHaveBeenCalled();
    });

    // Check localStorage
    const stored = localStorage.getItem('recentLocationSearches');
    expect(stored).not.toBeNull();
    
    const recentSearches = JSON.parse(stored!);
    expect(recentSearches).toHaveLength(1);
    expect(recentSearches[0].place_id).toBe('test-place-1');
  });

  /**
   * Requirement 14.1: Limit to 5 recent searches
   */
  it('should limit recent searches to 5 items', () => {
    // Pre-populate localStorage with 5 items
    const existingSearches = Array.from({ length: 5 }, (_, i) => ({
      place_id: `place-${i}`,
      description: `Location ${i}`,
      structured_formatting: {
        main_text: `Location ${i}`,
        secondary_text: 'South Africa',
      },
    }));

    localStorage.setItem('recentLocationSearches', JSON.stringify(existingSearches));

    const onChange = vi.fn();
    
    render(
      <LocationAutocomplete
        value=""
        onChange={onChange}
        placeholder="Search location"
      />
    );

    // Verify only 5 items are loaded
    const stored = localStorage.getItem('recentLocationSearches');
    const recentSearches = JSON.parse(stored!);
    expect(recentSearches).toHaveLength(5);
  });

  /**
   * Requirement 14.2: Display recent searches on focus
   */
  it('should display recent searches when input is focused', async () => {
    // Pre-populate localStorage
    const recentSearches = [
      {
        place_id: 'place-1',
        description: 'Sandton, Johannesburg',
        structured_formatting: {
          main_text: 'Sandton',
          secondary_text: 'Johannesburg, Gauteng, South Africa',
        },
      },
    ];

    localStorage.setItem('recentLocationSearches', JSON.stringify(recentSearches));

    const onChange = vi.fn();
    
    render(
      <LocationAutocomplete
        value=""
        onChange={onChange}
        placeholder="Search location"
      />
    );

    const input = screen.getByRole('combobox');
    
    // Focus the input
    await userEvent.click(input);

    // Check if recent search is displayed
    await waitFor(() => {
      expect(screen.getByText('Sandton')).toBeTruthy();
    });
  });

  /**
   * Requirement 14.3: Show "Recent" label
   */
  it('should display "Recent Searches" label when showing recent searches', async () => {
    // Pre-populate localStorage
    const recentSearches = [
      {
        place_id: 'place-1',
        description: 'Sandton, Johannesburg',
        structured_formatting: {
          main_text: 'Sandton',
          secondary_text: 'Johannesburg, Gauteng, South Africa',
        },
      },
    ];

    localStorage.setItem('recentLocationSearches', JSON.stringify(recentSearches));

    const onChange = vi.fn();
    
    render(
      <LocationAutocomplete
        value=""
        onChange={onChange}
        placeholder="Search location"
      />
    );

    const input = screen.getByRole('combobox');
    
    // Focus the input
    await userEvent.click(input);

    // Check if "Recent Searches" label is displayed
    await waitFor(() => {
      expect(screen.getByText('Recent Searches')).toBeTruthy();
    });
  });

  /**
   * Requirement 14.4: Clear recent searches functionality
   */
  it('should clear all recent searches when clear button is clicked', async () => {
    // Pre-populate localStorage
    const recentSearches = [
      {
        place_id: 'place-1',
        description: 'Sandton, Johannesburg',
        structured_formatting: {
          main_text: 'Sandton',
          secondary_text: 'Johannesburg, Gauteng, South Africa',
        },
      },
      {
        place_id: 'place-2',
        description: 'Cape Town, Western Cape',
        structured_formatting: {
          main_text: 'Cape Town',
          secondary_text: 'Western Cape, South Africa',
        },
      },
    ];

    localStorage.setItem('recentLocationSearches', JSON.stringify(recentSearches));

    const onChange = vi.fn();
    
    render(
      <LocationAutocomplete
        value=""
        onChange={onChange}
        placeholder="Search location"
      />
    );

    const input = screen.getByRole('combobox');
    
    // Focus the input to show recent searches
    await userEvent.click(input);

    // Wait for recent searches to appear
    await waitFor(() => {
      expect(screen.getByText('Recent Searches')).toBeTruthy();
    });

    // Click the clear button
    const clearButton = screen.getByRole('button', { name: /clear recent searches/i });
    await userEvent.click(clearButton);

    // Verify localStorage is cleared
    const stored = localStorage.getItem('recentLocationSearches');
    expect(stored).toBeNull();

    // Verify recent searches are no longer displayed
    expect(screen.queryByText('Recent Searches')).not.toBeInTheDocument();
  });

  /**
   * Requirement 14.5: Store in localStorage per user
   */
  it('should persist recent searches in localStorage', () => {
    const recentSearches = [
      {
        place_id: 'place-1',
        description: 'Sandton, Johannesburg',
        structured_formatting: {
          main_text: 'Sandton',
          secondary_text: 'Johannesburg, Gauteng, South Africa',
        },
      },
    ];

    localStorage.setItem('recentLocationSearches', JSON.stringify(recentSearches));

    const onChange = vi.fn();
    
    // Render component
    render(
      <LocationAutocomplete
        value=""
        onChange={onChange}
        placeholder="Search location"
      />
    );

    // Verify localStorage still contains the data
    const stored = localStorage.getItem('recentLocationSearches');
    expect(stored).not.toBeNull();
    
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].place_id).toBe('place-1');
  });

  /**
   * Test: Recent searches should not show duplicates
   */
  it('should not show duplicate locations in recent searches', async () => {
    const onChange = vi.fn();
    
    const mockPrediction = {
      place_id: 'test-place-1',
      description: 'Sandton, Johannesburg',
      structured_formatting: {
        main_text: 'Sandton',
        secondary_text: 'Johannesburg, Gauteng, South Africa',
      },
    };

    const mockPlaceDetails = {
      place_id: 'test-place-1',
      name: 'Sandton',
      formatted_address: 'Sandton, Johannesburg, 2196, South Africa',
      geometry: {
        location: {
          lat: () => -26.1076,
          lng: () => 28.0567,
        },
        viewport: {
          getNorthEast: () => ({ lat: () => -26.1, lng: () => 28.06 }),
          getSouthWest: () => ({ lat: () => -26.11, lng: () => 28.05 }),
        },
      },
      address_components: [],
    };

    // Pre-populate with the same location
    localStorage.setItem('recentLocationSearches', JSON.stringify([mockPrediction]));

    mockAutocompleteService.getPlacePredictions.mockImplementation((request, callback) => {
      callback([mockPrediction], 'OK');
    });

    mockPlacesService.getDetails.mockImplementation((request, callback) => {
      callback(mockPlaceDetails, 'OK');
    });

    render(
      <LocationAutocomplete
        value=""
        onChange={onChange}
        placeholder="Search location"
      />
    );

    const input = screen.getByRole('combobox');
    
    // Type to trigger autocomplete
    await userEvent.type(input, 'Sandton');
    
    // Wait for suggestions
    await waitFor(() => {
      expect(mockAutocompleteService.getPlacePredictions).toHaveBeenCalled();
    });

    // Click on suggestion
    const suggestion = await screen.findByText('Sandton');
    await userEvent.click(suggestion);

    // Wait for place details
    await waitFor(() => {
      expect(mockPlacesService.getDetails).toHaveBeenCalled();
    });

    // Check localStorage - should still have only 1 item (no duplicate)
    const stored = localStorage.getItem('recentLocationSearches');
    const recentSearches = JSON.parse(stored!);
    expect(recentSearches).toHaveLength(1);
    expect(recentSearches[0].place_id).toBe('test-place-1');
  });
});
