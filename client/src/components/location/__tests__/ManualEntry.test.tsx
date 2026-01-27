/**
 * Manual Entry Fallback Tests
 *
 * Tests for the manual address entry functionality in LocationAutocomplete
 * Requirements: 7.1-7.5, 11.1-11.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LocationAutocomplete } from '../LocationAutocomplete.new';

// Mock fetch for geocoding API calls
global.fetch = vi.fn();

describe('LocationAutocomplete - Manual Entry Fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Requirement 7.1: Manual Text Entry Mode', () => {
    it('should allow manual text entry without forcing selection', () => {
      const mockOnChange = vi.fn();

      render(<LocationAutocomplete value="" onChange={mockOnChange} allowManualEntry={true} />);

      const input = screen.getByRole('combobox');

      // User can type freely
      fireEvent.change(input, { target: { value: '123 Main Street, Sandton' } });

      expect(input).toHaveValue('123 Main Street, Sandton');
      // onChange should not be called yet (no selection made)
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Requirement 7.2: "Use this address" Confirmation Button', () => {
    it('should show "Use this address" button in manual mode', async () => {
      const mockOnChange = vi.fn();

      // Mock Google Maps API not being available
      (window as any).google = undefined;

      render(<LocationAutocomplete value="" onChange={mockOnChange} allowManualEntry={true} />);

      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: '123 Main Street' } });

      // Wait for manual mode to be enabled
      await waitFor(() => {
        const button = screen.queryByText(/use this address/i);
        expect(button).toBeInTheDocument();
      });
    });

    it('should trigger geocoding when "Use this address" is clicked', async () => {
      const mockOnChange = vi.fn();
      const mockGeocodeResponse = {
        result: {
          data: {
            success: true,
            result: {
              placeId: 'test-place-id',
              formattedAddress: '123 Main Street, Sandton, Johannesburg',
              geometry: {
                location: { lat: -26.1076, lng: 28.0567 },
              },
              addressComponents: [],
            },
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGeocodeResponse,
      });

      // Mock Google Maps API not being available
      (window as any).google = undefined;

      render(<LocationAutocomplete value="" onChange={mockOnChange} allowManualEntry={true} />);

      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: '123 Main Street' } });

      // Wait for button to appear
      await waitFor(() => {
        const button = screen.getByText(/use this address/i);
        expect(button).toBeInTheDocument();
      });

      const button = screen.getByText(/use this address/i);
      fireEvent.click(button);

      // Verify fetch was called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Requirement 7.3: Geocoding for Manual Entries', () => {
    it('should call geocoding API with manual address', async () => {
      const mockOnChange = vi.fn();
      const mockGeocodeResponse = {
        result: {
          data: {
            success: true,
            result: {
              placeId: 'test-place-id',
              formattedAddress: '123 Main Street, Sandton',
              geometry: {
                location: { lat: -26.1076, lng: 28.0567 },
              },
              addressComponents: [],
            },
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGeocodeResponse,
      });

      // Mock Google Maps API not being available
      (window as any).google = undefined;

      render(<LocationAutocomplete value="" onChange={mockOnChange} allowManualEntry={true} />);

      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: '123 Main Street, Sandton' } });

      await waitFor(() => {
        const button = screen.getByText(/use this address/i);
        fireEvent.click(button);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/trpc/location.geocodeAddress'),
        );
      });
    });
  });

  describe('Requirement 7.5: Mark GPS Accuracy as "Manual"', () => {
    it('should mark manual entries with gps_accuracy: "manual"', async () => {
      const mockOnChange = vi.fn();
      const mockGeocodeResponse = {
        result: {
          data: {
            success: true,
            result: {
              placeId: 'test-place-id',
              formattedAddress: '123 Main Street, Sandton',
              geometry: {
                location: { lat: -26.1076, lng: 28.0567 },
              },
              addressComponents: [],
            },
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGeocodeResponse,
      });

      // Mock Google Maps API not being available
      (window as any).google = undefined;

      render(<LocationAutocomplete value="" onChange={mockOnChange} allowManualEntry={true} />);

      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: '123 Main Street' } });

      await waitFor(() => {
        const button = screen.getByText(/use this address/i);
        fireEvent.click(button);
      });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            gps_accuracy: 'manual',
          }),
        );
      });
    });
  });

  describe('Requirement 7.5: Handle Geocoding Failures Gracefully', () => {
    it('should allow user to proceed when geocoding fails', async () => {
      const mockOnChange = vi.fn();
      const mockGeocodeResponse = {
        result: {
          data: {
            success: false,
            error: 'Geocoding failed',
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGeocodeResponse,
      });

      // Mock Google Maps API not being available
      (window as any).google = undefined;

      render(<LocationAutocomplete value="" onChange={mockOnChange} allowManualEntry={true} />);

      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: '123 Main Street' } });

      await waitFor(() => {
        const button = screen.getByText(/use this address/i);
        fireEvent.click(button);
      });

      // Should still call onChange even though geocoding failed
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            gps_accuracy: 'manual',
            latitude: 0,
            longitude: 0,
          }),
        );
      });
    });

    it('should show error message when geocoding fails', async () => {
      const mockOnChange = vi.fn();

      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      // Mock Google Maps API not being available
      (window as any).google = undefined;

      render(<LocationAutocomplete value="" onChange={mockOnChange} allowManualEntry={true} />);

      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: '123 Main Street' } });

      await waitFor(() => {
        const button = screen.getByText(/use this address/i);
        fireEvent.click(button);
      });

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/unable to geocode address/i)).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 11.1: API Unavailable Fallback', () => {
    it('should enable manual mode when Google Maps API is not loaded', () => {
      const mockOnChange = vi.fn();

      // Mock Google Maps API not being available
      (window as any).google = undefined;

      render(<LocationAutocomplete value="" onChange={mockOnChange} allowManualEntry={true} />);

      // Should show error message about API unavailability
      expect(
        screen.getByText(/location autocomplete temporarily unavailable/i),
      ).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should not show "Use this address" button when input is empty', async () => {
      const mockOnChange = vi.fn();

      // Mock Google Maps API not being available
      (window as any).google = undefined;

      render(<LocationAutocomplete value="" onChange={mockOnChange} allowManualEntry={true} />);

      // Button should not appear with empty input
      const button = screen.queryByText(/use this address/i);
      expect(button).not.toBeInTheDocument();
    });

    it('should disable input during geocoding', async () => {
      const mockOnChange = vi.fn();

      // Mock slow geocoding response
      (global.fetch as any).mockImplementationOnce(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    result: {
                      data: {
                        success: true,
                        result: {
                          placeId: 'test',
                          formattedAddress: 'Test Address',
                          geometry: { location: { lat: 0, lng: 0 } },
                          addressComponents: [],
                        },
                      },
                    },
                  }),
                }),
              100,
            ),
          ),
      );

      // Mock Google Maps API not being available
      (window as any).google = undefined;

      render(<LocationAutocomplete value="" onChange={mockOnChange} allowManualEntry={true} />);

      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: '123 Main Street' } });

      await waitFor(() => {
        const button = screen.getByText(/use this address/i);
        fireEvent.click(button);
      });

      // Input should be disabled during geocoding
      expect(input).toBeDisabled();
    });
  });
});
