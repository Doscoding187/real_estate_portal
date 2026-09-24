import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

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
    useRoute: () => [true, { slug: 'test-provider--123' }],
    useLocation: () => ['/services/provider/test-provider--123', vi.fn()],
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
      <a href={href}>{children}</a>
    ),
  };
});

vi.mock('@/lib/seo', () => ({ applySeo: vi.fn() }));

import ServiceProviderProfilePage from '../ServiceProviderProfilePage';

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    providerId: 123,
    companyName: 'Test Provider Co',
    headline: 'We do clear property work',
    bio: 'A published provider profile',
    logoUrl: null,
    isPublished: true,
    publicationStatus: 'published',
    verificationStatus: 'verified' as const,
    services: [],
    locations: [],
    reviews: [],
    ...overrides,
  };
}

describe('ServiceProviderProfilePage', () => {
  beforeEach(() => {
    mockProfileData.mockReset();
    mockProfileData.mockReturnValue(makeProfile());
  });

  it('renders published service and coverage details', () => {
    mockProfileData.mockReturnValue(
      makeProfile({
        services: [
          {
            id: 1,
            code: 'svc1',
            displayName: 'Plumbing',
            description: 'Fix pipes',
            category: 'home_improvement',
            minPrice: null,
            maxPrice: null,
          },
        ],
        locations: [
          {
            id: 1,
            suburb: 'Rondebosch',
            city: 'Cape Town',
            province: 'Western Cape',
            radiusKm: 25,
          },
        ],
      }),
    );
    render(<ServiceProviderProfilePage />);

    expect(screen.getByText('Test Provider Co')).toBeInTheDocument();
    expect(screen.getByText('Plumbing')).toBeInTheDocument();
    expect(screen.getByText('Rondebosch, Cape Town, Western Cape')).toBeInTheDocument();
  });

  it('shows a provider website when one is published', () => {
    mockProfileData.mockReturnValue(makeProfile({ websiteUrl: 'https://provider.example' }));
    render(<ServiceProviderProfilePage />);
    expect(screen.getByRole('link', { name: /visit provider website/i })).toHaveAttribute(
      'href',
      'https://provider.example',
    );
  });

  it('shows price on request when no range is published', () => {
    mockProfileData.mockReturnValue(
      makeProfile({
        services: [
          {
            id: 1,
            code: 'svc1',
            displayName: 'Plumbing',
            description: '',
            category: 'home_improvement',
            minPrice: null,
            maxPrice: null,
          },
        ],
      }),
    );
    render(<ServiceProviderProfilePage />);
    expect(screen.getByText('Price on request')).toBeInTheDocument();
  });

  it('shows a formatted price range when the provider publishes one', () => {
    mockProfileData.mockReturnValue(
      makeProfile({
        services: [
          {
            id: 1,
            code: 'svc1',
            displayName: 'Plumbing',
            description: '',
            category: 'home_improvement',
            minPrice: 500,
            maxPrice: 2000,
          },
        ],
      }),
    );
    render(<ServiceProviderProfilePage />);
    expect(screen.getByText('R500 – R2000')).toBeInTheDocument();
  });

  it('shows published feedback without adding a second trust badge', () => {
    mockProfileData.mockReturnValue(
      makeProfile({
        reviews: [{ id: 1, title: 'Great', content: 'Helpful' }],
      }),
    );
    render(<ServiceProviderProfilePage />);
    expect(screen.getByText('Great')).toBeInTheDocument();
    expect(screen.queryByText('Verified review')).not.toBeInTheDocument();
  });

  it('does not render a review link when no feedback is published', () => {
    render(<ServiceProviderProfilePage />);
    expect(screen.queryByRole('link', { name: /published feedback/i })).not.toBeInTheDocument();
  });

  it('does not expose private contact fields in the public profile', () => {
    mockProfileData.mockReturnValue(
      makeProfile({ contactEmail: 'private@example.com', contactPhone: '+27 11 000 0000' }),
    );
    render(<ServiceProviderProfilePage />);
    expect(screen.queryByText('private@example.com')).not.toBeInTheDocument();
    expect(screen.queryByText('+27 11 000 0000')).not.toBeInTheDocument();
  });

  it('has a clear unavailable state for unpublished providers', () => {
    mockProfileData.mockReturnValue(null);
    render(<ServiceProviderProfilePage />);
    expect(
      screen.getByRole('heading', { name: /provider profile unavailable/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /browse services/i })).toBeInTheDocument();
  });
});
