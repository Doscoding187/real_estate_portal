import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

const routeContext = {
  slug: 'test-provider--123',
  service: 'plumbing',
};
const mockProfileData = vi.fn();
const mockSetLocation = vi.fn();
const applySeoMock = vi.fn();

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
    useRoute: () => [true, { slug: routeContext.slug, service: routeContext.service }],
    useLocation: () => [
      `/services/provider/${routeContext.slug}/service/${routeContext.service}`,
      mockSetLocation,
    ],
    Link: ({ href, children }: { href: string; children: ReactNode }) => (
      <a href={href}>{children}</a>
    ),
  };
});

vi.mock('@/components/EnhancedNavbar', () => ({ EnhancedNavbar: () => null }));
vi.mock('@/components/services/ServicesSiteFooter', () => ({
  ServicesSiteFooter: () => null,
}));
vi.mock('@/lib/seo', () => ({ applySeo: (...args: unknown[]) => applySeoMock(...args) }));

import ProviderServiceDetailPage from '../ProviderServiceDetailPage';

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
    acceptingRequests: true,
    websiteUrl: null,
    isPublished: true,
    publicationStatus: 'published',
    verificationStatus: 'verified' as const,
    responsePerformance: null,
    services: [
      {
        id: 1,
        code: 'plumbing',
        displayName: 'Plumbing',
        description: 'Fix pipes and fittings.',
        category: 'home_improvement',
        minPrice: 500,
        maxPrice: 2000,
        currency: 'ZAR',
      },
      {
        id: 2,
        code: 'painting',
        displayName: 'Painting',
        description: null,
        category: 'home_improvement',
        minPrice: null,
        maxPrice: null,
        currency: 'ZAR',
      },
    ],
    locations: [
      {
        id: 1,
        suburb: 'Rondebosch',
        city: 'Cape Town',
        province: 'Western Cape',
        isPrimary: 1,
      },
    ],
    reviews: [],
    ...overrides,
  };
}

describe('ProviderServiceDetailPage contract', () => {
  beforeEach(() => {
    applySeoMock.mockReset();
    mockProfileData.mockReset();
    mockProfileData.mockReturnValue(makeProfile());
    routeContext.slug = 'test-provider--123';
    routeContext.service = 'plumbing';
    window.history.pushState({}, '', '/services/provider/test-provider--123/service/plumbing');
  });

  it('presents the offering, listed coverage, and honest price range', () => {
    render(<ProviderServiceDetailPage />);

    expect(screen.getByRole('heading', { level: 1, name: /plumbing/i })).toBeInTheDocument();
    expect(screen.getByText('Fix pipes and fittings.')).toBeInTheDocument();
    expect(screen.getByText(/R500 – R2000/)).toBeInTheDocument();
    expect(screen.getByText('Rondebosch')).toBeInTheDocument();
    expect(screen.getAllByText('Platform verified').length).toBeGreaterThan(0);
  });

  it('states price on request honestly when no range is published', () => {
    mockProfileData.mockReturnValue(
      makeProfile({
        services: [
          {
            id: 1,
            code: 'plumbing',
            displayName: 'Plumbing',
            description: null,
            category: 'home_improvement',
            minPrice: null,
            maxPrice: null,
            currency: 'ZAR',
          },
        ],
      }),
    );
    render(<ProviderServiceDetailPage />);

    expect(screen.getAllByText('Price on request')).toHaveLength(1);
  });

  it('routes the enquiry to the existing request authority with the correct service context', () => {
    render(<ProviderServiceDetailPage />);

    const requestLink = screen
      .getAllByRole('link', { name: /request this service/i })
      .find(anchor => (anchor as HTMLAnchorElement).href.includes('/services/request/'));
    expect(requestLink).toBeTruthy();
    expect(decodeURIComponent(requestLink!.getAttribute('href') || '')).toContain(
      '/services/request/home-improvement',
    );
    expect(requestLink?.getAttribute('href') || '').toContain('serviceCode=plumbing');
    expect(requestLink?.getAttribute('href') || '').toContain('providerId=123');
  });

  it('cross-links every published service on the provider presence', () => {
    render(<ProviderServiceDetailPage />);

    expect(screen.getByRole('link', { name: 'Painting' })).toHaveAttribute(
      'href',
      '/services/provider/test-provider--123/service/painting',
    );
    expect(screen.getByRole('link', { name: 'Plumbing' })).toHaveAttribute(
      'href',
      '/services/provider/test-provider--123/service/plumbing',
    );
  });

  it('carries journey context through to the enquiry', () => {
    window.history.pushState(
      {},
      '',
      '/services/provider/test-provider--123/service/plumbing?propertyId=7&listingId=8&intentStage=buyer_move_ready&sourceSurface=journey_injection',
    );
    render(<ProviderServiceDetailPage />);

    const requestLink = screen
      .getAllByRole('link', { name: /request this service/i })
      .find(anchor => (anchor as HTMLAnchorElement).href.includes('/services/request/'))!;
    expect(requestLink.getAttribute('href') || '').toContain('propertyId=7');
    expect(requestLink.getAttribute('href') || '').toContain('intentStage=buyer_move_ready');
  });

  it('renders only sample-gated measured response evidence and recomputed aggregates', () => {
    mockProfileData.mockReturnValue(
      makeProfile({
        averageRating: 4.5,
        reviewCount: 2,
        responsePerformance: {
          windowDays: 90,
          measuredLeads: 1,
          medianResponseSeconds: 7200,
          sampleReady: false,
        },
      }),
    );
    render(<ProviderServiceDetailPage />);

    expect(screen.queryByText(/typical first response/i)).not.toBeInTheDocument();
    expect(screen.getByText(/4.5/)).toBeInTheDocument();
  });

  it('publishes canonical metadata plus Service and breadcrumb structured data', () => {
    render(<ProviderServiceDetailPage />);

    const call = applySeoMock.mock.calls.at(-1)?.[0] as
      | {
          title: string;
          canonicalPath: string;
          structuredData: Array<Record<string, unknown>>;
        }
      | undefined;
    expect(call).toBeTruthy();
    expect(call.title).toBe('Test Provider Co · Plumbing | Property Listify Services');
    expect(call.canonicalPath).toBe('/services/provider/test-provider--123/service/plumbing');
    const types = call.structuredData.map(item => item['@type']);
    expect(types).toEqual(['BreadcrumbList', 'Service']);
    const service = call.structuredData[1] as Record<string, any>;
    expect(service.name).toBe('Plumbing');
    expect(service.offers.priceSpecification).toMatchObject({
      minPrice: 500,
      maxPrice: 2000,
      priceCurrency: 'ZAR',
    });
    expect(service.areaServed).toEqual(['Rondebosch, Cape Town, Western Cape']);
    expect(service.aggregateRating).toBeUndefined();
    expect((service.provider as Record<string, unknown>).name).toBe('Test Provider Co');
  });

  it('falls back to the provider presence when the service address is unpublished', () => {
    routeContext.service = 'not-a-published-service';
    render(<ProviderServiceDetailPage />);

    expect(screen.getByText(/service not published/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view test provider co/i })).toHaveAttribute(
      'href',
      '/services/provider/test-provider--123',
    );
  });

  it('stays fail-closed when the provider is not publicly published', () => {
    mockProfileData.mockReturnValue(null);
    render(<ProviderServiceDetailPage />);

    expect(screen.getByText(/service page unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse services/i })).toHaveAttribute(
      'href',
      '/services',
    );
  });

  it('fails closed on a malformed provider slug', () => {
    routeContext.slug = 'no-id-suffix';
    mockProfileData.mockReturnValue(makeProfile());
    render(<ProviderServiceDetailPage />);

    expect(screen.getByText(/this service link is not valid/i)).toBeInTheDocument();
  });
});
