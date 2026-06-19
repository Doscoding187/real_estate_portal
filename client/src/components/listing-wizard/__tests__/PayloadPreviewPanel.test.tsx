import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { PayloadPreviewPanel } from '../ui/PayloadPreviewPanel';

// Mock the Zustand store hook
const mockStore: Record<string, any> = {
  action: 'sell' as const,
  propertyType: 'house' as const,
  title: 'Modern Family Home',
  description: 'Beautiful 4-bedroom family home in a prime location with modern finishes throughout.',
  pricing: { askingPrice: 2500000, negotiable: true },
  propertyDetails: { bedrooms: 4, bathrooms: 2, houseAreaM2: 250 },
  additionalInfo: { furnishingStatus: 'fully_furnished', petPolicy: 'allowed' },
  basicInfo: { propertyCategory: 'existing', possessionStatus: 'immediate' },
  location: {
    address: '42 Oak Ave',
    latitude: -26.2041,
    longitude: 28.0473,
    city: 'Johannesburg',
    province: 'Gauteng',
    placeId: 'ChIJ123',
  },
  media: [{ id: 'media-1', url: 'https://example.com/1.jpg', type: 'image', displayOrder: 0, isPrimary: true }],
  mainMediaId: 'media-1',
  badges: [],
  currentStep: 1,
  completedSteps: [],
  errors: [],
  isValid: true,
  status: 'draft',
};

vi.mock('@/hooks/useListingWizard', () => ({
  useListingWizardStore: vi.fn(() => mockStore),
}));

// No need to mock listingPayload or listingWorkflowValidation — they are pure functions
// and should work correctly in test environment.

describe('PayloadPreviewPanel', () => {
  beforeEach(() => {
    // Enable dev mode so the panel renders
    (import.meta as any).env.DEV = true;
  });

  it('renders collapsed toggle button', () => {
    render(<PayloadPreviewPanel />);
    expect(screen.getByText('Payload')).toBeTruthy();
    expect(screen.queryByText('V2 Payload Preview')).toBeNull();
  });

  it('expands panel when toggle button is clicked', () => {
    render(<PayloadPreviewPanel />);
    fireEvent.click(screen.getByText('Payload'));
    expect(screen.getByText('V2 Payload Preview')).toBeTruthy();
    expect(screen.getByText('Payload')).toBeTruthy(); // Tab header
    expect(screen.getByText('Validation')).toBeTruthy(); // Tab header
  });

  it('displays action and property type in header', () => {
    render(<PayloadPreviewPanel />);
    fireEvent.click(screen.getByText('Payload'));
    // The header shows "sell / house"
    expect(screen.getByText(/sell \/ house/)).toBeTruthy();
  });

  it('shows payload JSON in payload tab', () => {
    render(<PayloadPreviewPanel />);
    fireEvent.click(screen.getByText('Payload'));
    // The JSON should contain the asking price and title
    expect(screen.getByText(/2500000/)).toBeTruthy();
    expect(screen.getByText(/Modern Family Home/)).toBeTruthy();
    // Should include merged propertyDetails + additionalInfo
    expect(screen.getByText(/fully_furnished/)).toBeTruthy();
    // basicInfo fields should NOT be in payload
    expect(screen.queryByText(/possessionStatus/)).toBeNull();
  });

  it('shows validation results in validation tab', async () => {
    render(<PayloadPreviewPanel />);
    fireEvent.click(screen.getByText('Payload')); // Open panel first

    // Switch to validation tab
    fireEvent.click(screen.getByText('Validation'));

    // Since we have valid data, should show success after async resolves
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Should show either "All checks passed" or the count of issues
    const successElement = screen.queryByText(/All checks passed/);
    const issuesElement = screen.queryByText(/issue/);
    expect(successElement || issuesElement).toBeTruthy();
  });

  it('closes panel when close button is clicked', () => {
    render(<PayloadPreviewPanel />);
    fireEvent.click(screen.getByText('Payload'));
    expect(screen.getByText('V2 Payload Preview')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Close preview panel'));
    expect(screen.queryByText('V2 Payload Preview')).toBeNull();
  });

  it('shows meta information in footer', () => {
    render(<PayloadPreviewPanel />);
    fireEvent.click(screen.getByText('Payload'));
    expect(screen.getByText(/Action: sell/)).toBeTruthy();
    expect(screen.getByText(/bytes/)).toBeTruthy();
  });

  describe('dry run tab', () => {
    it('shows Dry Run tab button', () => {
      render(<PayloadPreviewPanel />);
      fireEvent.click(screen.getByText('Payload'));
      expect(screen.getByText('Dry Run')).toBeTruthy();
    });

    it('shows no-backend warning', () => {
      render(<PayloadPreviewPanel />);
      fireEvent.click(screen.getByText('Payload'));
      fireEvent.click(screen.getByText('Dry Run'));
      expect(screen.getByText(/No backend called/)).toBeTruthy();
    });

    it('shows Run Dry Submit button', () => {
      render(<PayloadPreviewPanel />);
      fireEvent.click(screen.getByText('Payload'));
      fireEvent.click(screen.getByText('Dry Run'));
      expect(screen.getByText('Run Dry Submit')).toBeTruthy();
    });

    it('runs dry submit and shows PASS for valid data', async () => {
      render(<PayloadPreviewPanel />);
      fireEvent.click(screen.getByText('Payload'));
      fireEvent.click(screen.getByText('Dry Run'));

      await act(async () => {
        fireEvent.click(screen.getByText('Run Dry Submit'));
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(screen.getByText(/PASS/)).toBeTruthy();
      // Shows payload summary fields
      expect(screen.getByText(/Payload Summary/)).toBeTruthy();
    });

    it('shows payload byte size after dry run', async () => {
      render(<PayloadPreviewPanel />);
      fireEvent.click(screen.getByText('Payload'));
      fireEvent.click(screen.getByText('Dry Run'));

      await act(async () => {
        fireEvent.click(screen.getByText('Run Dry Submit'));
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // At least one element contains "bytes" (dry run summary uses it, footer uses it)
      expect(screen.getAllByText(/bytes/).length).toBeGreaterThan(0);
    });

    it('shows Re-run button after dry run', async () => {
      render(<PayloadPreviewPanel />);
      fireEvent.click(screen.getByText('Payload'));
      fireEvent.click(screen.getByText('Dry Run'));

      await act(async () => {
        fireEvent.click(screen.getByText('Run Dry Submit'));
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(screen.getByText('Re-run')).toBeTruthy();
    });
  });

  describe('readiness tab', () => {
    it('shows Readiness tab button', () => {
      render(<PayloadPreviewPanel />);
      fireEvent.click(screen.getByText('Payload'));
      expect(screen.getByText('Readiness')).toBeTruthy();
    });

    it('shows no-backend warning on readiness tab', () => {
      render(<PayloadPreviewPanel />);
      fireEvent.click(screen.getByText('Payload'));
      fireEvent.click(screen.getByText('Readiness'));
      expect(screen.getByText(/No backend called/)).toBeTruthy();
    });

    it('shows running state initially', async () => {
      render(<PayloadPreviewPanel />);
      fireEvent.click(screen.getByText('Payload'));
      fireEvent.click(screen.getByText('Readiness'));
      expect(screen.getByText(/Running readiness check/)).toBeTruthy();
    });

    it('shows READY for valid data after async resolves', async () => {
      render(<PayloadPreviewPanel />);
      fireEvent.click(screen.getByText('Payload'));
      fireEvent.click(screen.getByText('Readiness'));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
      });

      expect(screen.getByText(/READY/)).toBeTruthy();
    });

    it('shows scores after readiness check', async () => {
      render(<PayloadPreviewPanel />);
      fireEvent.click(screen.getByText('Payload'));
      fireEvent.click(screen.getByText('Readiness'));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
      });

      // Look for score values rather than labels to avoid multi-match
      expect(screen.getByText(/% \(poor\)/)).toBeTruthy();
      expect(screen.getByText(/0 errors/)).toBeTruthy();
    });
  });
});
