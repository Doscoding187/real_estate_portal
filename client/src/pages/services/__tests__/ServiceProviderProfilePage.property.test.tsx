import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const mockProfileData = vi.fn();
const mockProfileError = vi.fn();
const mockSetLocation = vi.fn();

vi.mock('@/lib/trpc', () => ({
  trpc: {
    servicesEngine: {
      getProviderPublicProfile: {
        useQuery: () => ({
          data: mockProfileData(),
          isLoading: false,
          error: mockProfileError(),
        }),
      },
    },
  },
}));

vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return {
    ...actual,
    useRoute: () => [true, { slug: 'test-provider--123' }],
    useLocation: () => ['/services/provider/test-provider--123', mockSetLocation],

    Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
      <a href={href}>{children}</a>
    ),
  };
});

vi.mock('@/components/EnhancedNavbar', () => ({ EnhancedNavbar: () => null }));

vi.mock('@/lib/seo', () => ({ applySeo: vi.fn() }));

import ServiceProviderProfilePage, {
  type ProviderWebsitePublicProfile,
} from '../ServiceProviderProfilePage';
import { applySeo } from '@/lib/seo';

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    providerId: 123,
    companyName: 'Test Provider Co',
    headline: 'We do clear property work',
    bio: 'A published provider profile',
    logoUrl: null,
    gallery: [],
    averageRating: null,
    reviewCount: 0,
    acceptingRequests: false,
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
    mockProfileError.mockReset();
    mockSetLocation.mockReset();
    vi.mocked(applySeo).mockClear();
    mockProfileData.mockReturnValue(makeProfile());
    mockProfileError.mockReturnValue(null);
    window.history.pushState({}, '', '/services/provider/test-provider--123');
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
            canonicalPlaceId: 'pl-place-01-000000000000000000000001',
            label: 'Rondebosch, Cape Town, Western Cape',
          },
        ],
      }),
    );
    render(<ServiceProviderProfilePage />);

    expect(screen.getByText('Test Provider Co')).toBeInTheDocument();
    expect(screen.getByText('Plumbing')).toBeInTheDocument();
    expect(screen.getAllByText('Rondebosch, Cape Town, Western Cape')).toHaveLength(1);
  });

  it('renders the business-site template without onboarding status or draft counts', () => {
    const previewProfile = makeProfile({
      acceptingRequests: true,
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
        {
          id: 2,
          code: 'svc2',
          displayName: 'Geyser repair',
          description: 'Repair geysers',
          category: 'home_improvement',
          minPrice: null,
          maxPrice: null,
        },
      ],
    }) as unknown as ProviderWebsitePublicProfile;

    render(
      <ServiceProviderProfilePage previewProfile={previewProfile} />,
    );

    const heroHeading = screen.getByRole('heading', { level: 1 });
    expect(heroHeading).toHaveTextContent('We do clear property work');
    expect(heroHeading).toHaveClass('lg:text-[36px]');
    expect(screen.getByText('Reliable. Experienced. Local.')).toBeInTheDocument();
    expect(within(heroHeading.closest('section')!).queryByText('A published provider profile')).not.toBeInTheDocument();
    expect(screen.queryByText('A published provider profile')).not.toBeInTheDocument();
    expect(screen.queryByText('Private draft')).not.toBeInTheDocument();
    expect(screen.queryByText('2 services in your draft')).not.toBeInTheDocument();
    expect(screen.queryByText('0 areas in your draft')).not.toBeInTheDocument();
    expect(screen.queryByText('Enquiries after approval')).not.toBeInTheDocument();
    expect(screen.queryByText('Accepting requests')).not.toBeInTheDocument();
    expect(screen.queryByText('2 published services')).not.toBeInTheDocument();
    expect(screen.queryByText('Direct request')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Get a Quote' })).toHaveLength(2);
  });

  it('uses the short business introduction as metadata only', async () => {
    const description = 'A published provider profile';
    mockProfileData.mockReturnValue(makeProfile({ bio: description }));
    render(<ServiceProviderProfilePage />);

    expect(screen.queryByText(description)).not.toBeInTheDocument();
    await waitFor(() => {
      expect(applySeo).toHaveBeenCalledWith(expect.objectContaining({ description }));
    });
  });

  it('uses a service-business headline when the provider has not supplied one', () => {
    mockProfileData.mockReturnValue(makeProfile({ headline: null }));
    render(<ServiceProviderProfilePage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Professional maintenance services for your property',
    );
  });

  it('shows multiple service chips linking to detailed pages, separate from the homepage hero', () => {
    mockProfileData.mockReturnValue(
      makeProfile({
        headline: null,
        services: [
          {
            id: 4,
            code: 'geyser_replacement',
            displayName: 'Geyser replacement',
            description: 'Replace a household geyser.',
            category: 'home_improvement',
            minPrice: null,
            maxPrice: null,
          },
          {
            id: 5,
            code: 'drain_clearing',
            displayName: 'Drain clearing',
            description: 'Clear blocked drains.',
            category: 'home_improvement',
            minPrice: null,
            maxPrice: null,
          },
        ],
      }),
    );
    render(<ServiceProviderProfilePage />);

    const hero = screen.getByRole('heading', { level: 1 }).closest('section');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Professional maintenance services for your property',
    );
    expect(within(hero!).queryByText('Geyser replacement')).not.toBeInTheDocument();
    expect(within(hero!).queryByText('Drain clearing')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Services' }));
    const geyserChip = screen.getByRole('link', { name: 'Geyser replacement' });
    const drainChip = screen.getByRole('link', { name: 'Drain clearing' });
    expect(geyserChip).toHaveAttribute('href', expect.stringContaining('/service/geyser-replacement'));
    expect(drainChip).toHaveAttribute('href', expect.stringContaining('/service/drain-clearing'));
  });

  it('shows a provider website when one is published', () => {
    mockProfileData.mockReturnValue(makeProfile({ websiteUrl: 'https://provider.example' }));
    render(<ServiceProviderProfilePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Contact' }));
    expect(screen.getByRole('link', { name: /provider website/i })).toHaveAttribute(
      'href',
      'https://provider.example',
    );
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

  it('carries the selected service and journey context into the request path', () => {
    window.history.pushState(
      {},
      '',
      '/services/provider/test-provider--123?category=home-improvement&serviceCode=plumbing&propertyId=7&listingId=8&developmentId=9&intentStage=buyer_move_ready&sourceSurface=journey_injection&sourceDetail=saved_property&reasonKey=move_ready&city=Cape%20Town&province=Western%20Cape',
    );
    mockProfileData.mockReturnValue(
      makeProfile({
        services: [
          {
            id: 1,
            code: 'plumbing',
            displayName: 'Plumbing',
            category: 'home_improvement',
            minPrice: null,
            maxPrice: null,
          },
          {
            id: 2,
            code: 'moving',
            displayName: 'Moving',
            category: 'moving',
            minPrice: null,
            maxPrice: null,
          },
        ],
      }),
    );

    render(<ServiceProviderProfilePage />);
    fireEvent.click(screen.getAllByRole('button', { name: /get a quote/i })[0]!);

    const path = mockSetLocation.mock.calls.at(-1)?.[0] || '';
    expect(path).toContain('/services/request/home-improvement?');
    expect(path).toContain('serviceCode=plumbing');
    expect(path).toContain('propertyId=7');
    expect(path).toContain('listingId=8');
    expect(path).toContain('developmentId=9');
    expect(path).toContain('intentStage=buyer_move_ready');
    expect(path).toContain('sourceSurface=journey_injection');
    expect(path).toContain('sourceDetail=saved_property');
    expect(path).toContain('reasonKey=move_ready');
    expect(path).not.toContain('city=');
    expect(path).not.toContain('province=');
  });

  it('has a clear unavailable state for unpublished providers', () => {
    mockProfileData.mockReturnValue(null);
    render(<ServiceProviderProfilePage />);
    expect(
      screen.getByRole('heading', { name: /provider profile unavailable/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /browse services/i })).toBeInTheDocument();
  });

  it('does not mistake a temporary query failure for an unpublished provider', () => {
    mockProfileData.mockReturnValue(undefined);
    mockProfileError.mockReturnValue(new Error('temporary upstream failure'));

    render(<ServiceProviderProfilePage />);

    expect(
      screen.getByRole('heading', { name: /provider profile temporarily unavailable/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/does not confirm whether the provider is published/i),
    ).toBeInTheDocument();
  });

  it('presents measured response performance only when the sample gate passes', () => {
    mockProfileData.mockReturnValue(
      makeProfile({
        responsePerformance: {
          windowDays: 90,
          measuredLeads: 2,
          medianResponseSeconds: 3600,
          sampleReady: false,
        },
      }),
    );
    render(<ServiceProviderProfilePage />);
    expect(screen.queryByText(/typical first response/i)).not.toBeInTheDocument();
  });

  it('keeps response-performance metrics out of the provider website template', () => {
    mockProfileData.mockReturnValue(
      makeProfile({
        responsePerformance: {
          windowDays: 90,
          measuredLeads: 5,
          medianResponseSeconds: 7200,
          sampleReady: true,
        },
      }),
    );
    render(<ServiceProviderProfilePage />);
    expect(screen.queryByText(/typical first response/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/median measured across 5 requests/i)).not.toBeInTheDocument();
  });
});
