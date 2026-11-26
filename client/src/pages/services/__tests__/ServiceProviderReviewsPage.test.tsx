import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

const mockProfileData = vi.fn();
const mockProfileError = vi.fn();
const mockReviewsData = vi.fn();
const mockReviewsError = vi.fn();

vi.mock('@/lib/trpc', () => ({
  trpc: {
    servicesEngine: {
      getProviderPublicProfile: {
        useQuery: () => ({
          data: mockProfileData(),
          error: mockProfileError(),
          isLoading: false,
        }),
      },
      getProviderReviews: {
        useQuery: () => ({
          data: mockReviewsData(),
          error: mockReviewsError(),
          isLoading: false,
        }),
      },
      getProviderReviewEligibility: {
        useQuery: () => ({ data: null, error: null, isLoading: false }),
      },
      submitProviderReview: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
      reportProviderReview: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
    useUtils: () => ({
      servicesEngine: {
        getProviderReviews: { invalidate: vi.fn() },
        getProviderPublicProfile: { invalidate: vi.fn() },
        getProviderReviewEligibility: { invalidate: vi.fn() },
      },
    }),
  },
}));

vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return {
    ...actual,
    useRoute: () => [true, { providerId: '123' }],
    Link: ({ href, children }: { href: string; children: ReactNode }) => (
      <a href={href}>{children}</a>
    ),
  };
});

vi.mock('@/_core/hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/features/services/useServicesLocation', () => ({
  useServicesLocation: () => ({ search: '' }),
}));
vi.mock('@/components/ApiAvailabilityBoundary', () => ({
  useApiAvailability: () => ({ isUnavailable: false }),
}));
vi.mock('@/components/EnhancedNavbar', () => ({ EnhancedNavbar: () => null }));
vi.mock('@/components/services/ServicesSiteFooter', () => ({ ServicesSiteFooter: () => null }));
vi.mock('@/components/services/ProviderShowcaseCard', () => ({
  ProviderRating: () => null,
  StarRating: () => null,
}));
vi.mock('@/lib/seo', () => ({ applySeo: vi.fn() }));

import ServiceProviderReviewsPage from '../ServiceProviderReviewsPage';

describe('ServiceProviderReviewsPage availability truth', () => {
  beforeEach(() => {
    mockProfileData.mockReset();
    mockProfileError.mockReset();
    mockReviewsData.mockReset();
    mockReviewsError.mockReset();
    mockProfileData.mockReturnValue(undefined);
    mockReviewsData.mockReturnValue([]);
    mockProfileError.mockReturnValue(null);
    mockReviewsError.mockReturnValue(null);
  });

  it('does not mistake a temporary provider lookup failure for unpublished content', () => {
    mockProfileError.mockReturnValue(new Error('temporary upstream failure'));

    render(<ServiceProviderReviewsPage />);

    expect(
      screen.getByRole('heading', { name: /provider reviews temporarily unavailable/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/does not confirm whether the provider is published/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse services/i })).toHaveAttribute(
      'href',
      '/services',
    );
  });
});
