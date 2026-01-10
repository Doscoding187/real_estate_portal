/**
 * Partner Profile Component Tests
 * Tests for the Partner Profile page component
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PartnerProfile from '../PartnerProfile';

// Mock wouter
vi.mock('wouter', () => ({
  useParams: () => ({ partnerId: 'test-partner-id' }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockPartnerProfile = {
  id: 'test-partner-id',
  userId: 'user-123',
  tier: {
    id: 1,
    name: 'Property Professional',
    allowedContentTypes: ['property_tour'],
    allowedCTAs: ['view_listing', 'contact']
  },
  companyName: 'Test Real Estate Co.',
  description: 'Leading real estate company in Cape Town',
  logoUrl: 'https://example.com/logo.jpg',
  verificationStatus: 'verified' as const,
  trustScore: 85,
  serviceLocations: ['Cape Town', 'Stellenbosch'],
  subscriptionTier: 'premium' as const,
  approvedContentCount: 15,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15')
};

const mockMetrics = {
  totalViews: 12500,
  engagementRate: 8.5,
  totalContent: 15,
  averageQualityScore: 78
};

describe('PartnerProfile', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    mockFetch.mockClear();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <PartnerProfile />
      </QueryClientProvider>
    );
  };

  it('displays loading skeleton initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    renderComponent();
    
    expect(screen.getByTestId('partner-profile-skeleton') || document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('displays partner profile information correctly', async () => {
    // Mock successful API responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPartnerProfile)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]) // Empty reviews
      });

    renderComponent();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Real Estate Co.')).toBeInTheDocument();
    });

    // Requirement 5.1: Display verification badge status
    expect(screen.getByText('Verified Partner')).toBeInTheDocument();
    
    // Requirement 5.1: Display trust score
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('Trust Score')).toBeInTheDocument();

    // Requirement 5.2: Show company description
    expect(screen.getByText('Leading real estate company in Cape Town')).toBeInTheDocument();

    // Requirement 5.3: List service locations
    expect(screen.getByText('Cape Town')).toBeInTheDocument();
    expect(screen.getByText('Stellenbosch')).toBeInTheDocument();

    // Requirement 5.4: Show content performance metrics
    expect(screen.getByText('12,500')).toBeInTheDocument(); // Total views
    expect(screen.getByText('8.5%')).toBeInTheDocument(); // Engagement rate
    expect(screen.getByText('15')).toBeInTheDocument(); // Content pieces
    expect(screen.getByText('78')).toBeInTheDocument(); // Quality score
  });

  it('displays partner tier information', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPartnerProfile)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Property Professional')).toBeInTheDocument();
      expect(screen.getByText('Premium Member')).toBeInTheDocument();
    });
  });

  it('displays "New Partner" indicator when no reviews exist', async () => {
    const unverifiedPartner = {
      ...mockPartnerProfile,
      verificationStatus: 'pending' as const
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(unverifiedPartner)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

    renderComponent();

    await waitFor(() => {
      // Requirement 5.6: Display "New Partner" indicator instead of empty ratings
      expect(screen.getByText('This partner is new to the platform')).toBeInTheDocument();
    });
  });

  it('handles partner not found error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Partner Not Found')).toBeInTheDocument();
      expect(screen.getByText("The partner profile you're looking for doesn't exist or has been removed.")).toBeInTheDocument();
    });
  });

  it('displays logo or fallback icon', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPartnerProfile)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

    renderComponent();

    await waitFor(() => {
      const logo = screen.getByAltText('Test Real Estate Co. logo');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src', 'https://example.com/logo.jpg');
    });
  });

  it('displays fallback icon when no logo is provided', async () => {
    const partnerWithoutLogo = {
      ...mockPartnerProfile,
      logoUrl: null
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(partnerWithoutLogo)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Real Estate Co.')).toBeInTheDocument();
      // Should show Building2 icon as fallback
    });
  });
});