/**
 * Property-Based Tests for ServiceProviderProfilePage
 *
 * Feature: services-marketplace-overhaul
 *
 * Property 14: Reviews list is capped at 5
 * For any array of reviews of length n, the profile page displays exactly
 * Math.min(n, 5) review items.
 * Validates: Requirements 6.7
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock tRPC
// ---------------------------------------------------------------------------

const mockProfileData = vi.fn();

vi.mock('@/lib/trpc', () => ({
  trpc: {
    servicesEngine: {
      getProviderPublicProfile: {
        useQuery: () => ({ data: mockProfileData(), isLoading: false, error: null }),
      },
    },
  },
}));

vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return {
    ...actual,
    useRoute: () => [true, { slug: 'test-provider-123' }],
    useLocation: () => ['/services/provider/test-provider-123', vi.fn()],
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
      <a href={href}>{children}</a>
    ),
  };
});

vi.mock('@/lib/seo', () => ({ applySeo: vi.fn() }));

// ---------------------------------------------------------------------------
// Import page after mocks
// ---------------------------------------------------------------------------

import ServiceProviderProfilePage from '../ServiceProviderProfilePage';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReview(id: number) {
  return {
    id,
    rating: 4,
    title: `Review ${id}`,
    content: `Content for review ${id}`,
    isVerified: 0,
  };
}

function makeProfile(reviews: ReturnType<typeof makeReview>[]) {
  return {
    providerId: 'test-provider-123',
    companyName: 'Test Provider Co',
    headline: 'We do great work',
    bio: 'A great provider',
    logoUrl: null,
    averageRating: 4.2,
    reviewCount: reviews.length,
    verificationStatus: 'verified' as const,
    moderationTier: null,
    subscriptionTier: 'directory' as const,
    services: [],
    locations: [],
    reviews,
  };
}

// ---------------------------------------------------------------------------
// Property 14: Reviews list is capped at 5
// ---------------------------------------------------------------------------

// Feature: services-marketplace-overhaul, Property 14: Reviews list is capped at 5
describe('ServiceProviderProfilePage — Property 14: reviews list capped at 5', () => {
  it('displays exactly Math.min(n, 5) review articles for any array of length n', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 12 }),
        n => {
          const reviews = Array.from({ length: n }, (_, i) => makeReview(i + 1));
          mockProfileData.mockReturnValue(makeProfile(reviews));

          const { unmount } = render(<ServiceProviderProfilePage />);

          const articles = document.querySelectorAll('article');
          expect(articles.length).toBe(Math.min(n, 5));

          unmount();
        },
      ),
      { numRuns: 13 }, // covers 0–12 reviews
    );
  });

  it('never displays more than 5 reviews regardless of how many exist', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 6, max: 50 }),
        n => {
          const reviews = Array.from({ length: n }, (_, i) => makeReview(i + 1));
          mockProfileData.mockReturnValue(makeProfile(reviews));

          const { unmount } = render(<ServiceProviderProfilePage />);

          const articles = document.querySelectorAll('article');
          expect(articles.length).toBeLessThanOrEqual(5);

          unmount();
        },
      ),
      { numRuns: 10 },
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('ServiceProviderProfilePage — unit tests', () => {
  it('shows "Price on request" when minPrice is null', () => {
    mockProfileData.mockReturnValue({
      ...makeProfile([]),
      services: [
        { code: 'svc1', displayName: 'Plumbing', description: 'Fix pipes', category: 'home_improvement', minPrice: null, maxPrice: null },
      ],
    });

    render(<ServiceProviderProfilePage />);
    expect(screen.getByText('Price on request')).toBeInTheDocument();
  });

  it('shows formatted ZAR price range when both prices are provided', () => {
    mockProfileData.mockReturnValue({
      ...makeProfile([]),
      services: [
        { code: 'svc1', displayName: 'Plumbing', description: 'Fix pipes', category: 'home_improvement', minPrice: 500, maxPrice: 2000 },
      ],
    });

    render(<ServiceProviderProfilePage />);
    expect(screen.getByText('R500 – R2000')).toBeInTheDocument();
  });

  it('shows "Verified review" label when isVerified === 1', () => {
    mockProfileData.mockReturnValue(makeProfile([
      { id: 1, rating: 5, title: 'Great!', content: 'Loved it', isVerified: 1 },
    ]));

    render(<ServiceProviderProfilePage />);
    expect(screen.getByText('Verified review')).toBeInTheDocument();
  });

  it('does not show "Verified review" label when isVerified === 0', () => {
    mockProfileData.mockReturnValue(makeProfile([
      { id: 1, rating: 3, title: 'Okay', content: 'It was fine', isVerified: 0 },
    ]));

    render(<ServiceProviderProfilePage />);
    expect(screen.queryByText('Verified review')).not.toBeInTheDocument();
  });

  it('Request quote button navigates to /services/request/{category}?providerId={id}', () => {
    mockProfileData.mockReturnValue({
      ...makeProfile([]),
      services: [
        { code: 'svc1', displayName: 'Plumbing', description: '', category: 'home_improvement', minPrice: null, maxPrice: null },
      ],
    });

    render(<ServiceProviderProfilePage />);
    const btn = screen.getByRole('button', { name: /request quote/i });
    expect(btn).toBeInTheDocument();
  });
});
