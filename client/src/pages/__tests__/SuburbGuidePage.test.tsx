import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { getPlaceGuide, metaControl } = vi.hoisted(() => ({
  getPlaceGuide: vi.fn(),
  metaControl: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: { placeAuthority: { getPlaceGuide: { useQuery: getPlaceGuide } } },
}));
vi.mock('@/components/ListingNavbar', () => ({
  ListingNavbar: () => <nav data-testid="site-navbar" />,
}));
vi.mock('@/components/Footer', () => ({ Footer: () => <footer data-testid="site-footer" /> }));
vi.mock('@/components/seo/MetaControl', () => ({
  MetaControl: (props: unknown) => {
    metaControl(props);
    return null;
  },
}));
vi.mock('@/components/location/LocationTrendingFeedSection', () => ({
  LocationTrendingFeedSection: () => null,
}));
vi.mock('@/components/location/NearbyAmenitiesMap', () => ({ NearbyAmenitiesMap: () => null }));
vi.mock('@/components/location/SuburbAgencies', () => ({ SuburbAgencies: () => null }));
vi.mock('@/components/location/SuburbDevelopers', () => ({ SuburbDevelopers: () => null }));
vi.mock('@/components/location/SuburbLocalProfessionals', () => ({
  SuburbLocalProfessionals: () => null,
}));
vi.mock('@/components/location/SuburbListingAlert', () => ({ SuburbListingAlert: () => null }));

import { suburbGuideCoverageFaq, suburbGuideH1, suburbGuideIntro } from '@shared/suburbGuideCopy';
import SuburbGuidePage from '../SuburbGuidePage';

const PLACE_ID = 'pl-place-01-000000000000000000000001';
const resolved = {
  placeId: PLACE_ID,
  path: '/gauteng/johannesburg/linden',
  label: 'Linden',
  placeType: 'suburb',
  searchScope: 'locality',
  provinceName: 'Gauteng',
  provinceSlug: 'gauteng',
  pathContext: null,
  indexable: false,
} as never;

const guide = {
  place: {
    id: PLACE_ID,
    name: 'Linden',
    level: 'locality',
    canonicalPath: '/gauteng/johannesburg/linden',
    city: {
      placeId: 'pl-place-01-000000000000000000000009',
      name: 'Johannesburg',
      canonicalPath: '/gauteng/johannesburg',
    },
    province: { placeId: 'p', name: 'Gauteng', canonicalPath: '/gauteng' },
    centre: { lat: -26.1, lng: 28.0 },
  },
  stats: {
    saleCount: 0,
    rentCount: 0,
    saleMedian: null,
    rentMedian: null,
    salePricePerM2Median: null,
    salePricedSample: 0,
    rentPricedSample: 0,
    salePricePerM2Sample: 0,
    minimumSample: 5,
    typeMix: null,
    asOf: '2026-11-18T08:00:00.000Z',
  },
  neighbourhoods: [
    {
      placeId: 'pl-place-01-000000000000000000000002',
      name: 'Emmarentia',
      canonicalPath: '/gauteng/johannesburg/emmarentia',
      typeLabel: 'Suburb',
      listingCount: 0,
      distanceKm: 2.1,
      coverImageUrl: null,
    },
  ],
  nearbyMarkets: [
    {
      placeId: 'pl-place-01-000000000000000000000003',
      name: 'Parkhurst',
      canonicalPath: '/gauteng/johannesburg/parkhurst',
      levelLabel: 'Nearby suburb',
      distanceKm: 3,
      saleCount: 5,
      rentCount: 0,
      saleMedian: null,
      salePricePerM2Median: null,
      typeMix: null,
      deltas: { saleMedianPct: null, pricePerM2Pct: null },
    },
  ],
};

describe('SuburbGuidePage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the approved sections with the place name, navbar and footer', () => {
    getPlaceGuide.mockReturnValue({ data: guide, isLoading: false, isError: false });
    const { container } = render(
      <SuburbGuidePage place={resolved} indexable={false} fallback={<p>fallback</p>} />,
    );
    expect(screen.getByTestId('site-navbar')).toBeTruthy();
    expect(screen.getByTestId('site-footer')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Explore Linden' })).toBeTruthy();
    const headings = Array.from(container.querySelectorAll('h2')).map(h => h.textContent);
    const order = [
      'Property prices and current supply',
      'Find your perfect Linden neighbourhood',
      'Compare markets near Linden',
      'Where would you like to start?',
      'New developments in Linden',
      'Properties in Linden',
      'Understand the area around Linden',
      'People and projects in Linden',
      'Common questions about Linden',
    ];
    const positions = order.map(text => headings.indexOf(text));
    expect(positions.every(index => index >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(container.textContent).toContain('Linden: 0 for sale · 0 to rent');
    expect(container.textContent).toContain('Not enough data yet');
    expect(container.textContent).not.toContain('Sandton');
    expect(container.textContent).not.toContain('Design preview');
    expect(container.querySelector('img[role="img"]')).toBeNull();
    expect(container.querySelectorAll('.suburb-guide-faqs__item')).toHaveLength(6);
    expect(container.textContent).toContain('How do I get notified about new listings in Linden?');
    // Labels come from the server as given.
    expect(container.textContent).toContain('Nearby suburb');
    expect(container.textContent).toContain('Suburb · No listings yet');
  });

  it('renders the shared static text the prerendered HTML also uses', () => {
    getPlaceGuide.mockReturnValue({ data: guide, isLoading: false, isError: false });
    const { container } = render(
      <SuburbGuidePage place={resolved} indexable fallback={<p>fallback</p>} />,
    );
    const faq = suburbGuideCoverageFaq('Linden');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(suburbGuideH1('Linden'));
    expect(container.textContent).toContain(suburbGuideIntro('Linden'));
    expect(container.textContent).toContain(faq.question);
    expect(container.textContent).toContain(faq.answer);
  });

  it('takes robots from the place-page indexability', () => {
    getPlaceGuide.mockReturnValue({ data: guide, isLoading: false, isError: false });
    render(<SuburbGuidePage place={resolved} indexable={false} fallback={null} />);
    expect(metaControl).toHaveBeenLastCalledWith(expect.objectContaining({ forceNoIndex: true }));
    cleanup();
    render(<SuburbGuidePage place={resolved} indexable fallback={null} />);
    expect(metaControl).toHaveBeenLastCalledWith(expect.objectContaining({ forceNoIndex: false }));
  });

  it('falls back to the plain place page when there is no guide', () => {
    getPlaceGuide.mockReturnValue({ data: null, isLoading: false, isError: false });
    render(<SuburbGuidePage place={resolved} indexable fallback={<p>fallback</p>} />);
    expect(screen.getByText('fallback')).toBeTruthy();
    expect(screen.getByTestId('site-navbar')).toBeTruthy();
  });
});
