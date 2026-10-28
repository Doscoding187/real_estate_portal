import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { resolveCanonicalUrl, guideAreas } = vi.hoisted(() => ({
  resolveCanonicalUrl: vi.fn(),
  guideAreas: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    placeAuthority: { resolveCanonicalUrl: { useQuery: resolveCanonicalUrl } },
    landPublic: { guideAreas: { useQuery: guideAreas } },
  },
}));

vi.mock('@/components/seo/MetaControl', () => ({ MetaControl: () => null }));

import CanonicalPlacePage from './CanonicalPlacePage';

describe('Canonical Place Land area guide', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/gauteng/johannesburg');
    resolveCanonicalUrl.mockReturnValue({
      data: {
        placeId: 'pl-place-01-21f154cd5d0954c29ec7525f',
        path: '/gauteng/johannesburg',
        label: 'Johannesburg',
        placeType: 'city',
        searchScope: 'metro_city',
        provinceName: 'Gauteng',
        provinceSlug: 'gauteng',
        pathContext: null,
        publicationEligible: false,
        verificationStatus: 'provisional',
      },
      isLoading: false,
      error: null,
    });
    guideAreas.mockReturnValue({
      data: [
        {
          placeId: 'pl-place-01-000000000000000000000001',
          label: 'Newclare',
          listingCount: 2,
          href: '/plots-and-land?canonicalPlaceId=pl-place-01-000000000000000000000001',
        },
        {
          placeId: 'pl-place-01-000000000000000000000002',
          label: 'Westbury',
          listingCount: 1,
          href: '/plots-and-land?canonicalPlaceId=pl-place-01-000000000000000000000002',
        },
      ],
      isPending: false,
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('puts inventory-bearing exact localities first and links to each locality search', () => {
    render(<CanonicalPlacePage />);

    expect(screen.getByRole('heading', { name: 'Explore Land in Johannesburg' })).toBeVisible();
    expect(
      screen.getByText('Choose a suburb or locality that interests you to see Land listings in that exact area.'),
    ).toBeVisible();
    const areaList = screen.getByRole('list');
    const links = within(areaList).getAllByRole('link');
    expect(links.map(link => link.textContent)).toEqual(['Newclare2 Land listings', 'Westbury1 Land listing']);
    expect(links[0]).toHaveAttribute(
      'href',
      '/plots-and-land?canonicalPlaceId=pl-place-01-000000000000000000000001',
    );
    expect(links[1]).toHaveAttribute(
      'href',
      '/plots-and-land?canonicalPlaceId=pl-place-01-000000000000000000000002',
    );
  });

  it('shows a clear empty state and Land-search next step when the broad place has no inventory', () => {
    guideAreas.mockReturnValue({ data: [], isPending: false, error: null });

    render(<CanonicalPlacePage />);

    expect(screen.getByRole('status')).toHaveTextContent('No land listed in Johannesburg yet.');
    expect(screen.getByRole('link', { name: 'Search Land in another area' })).toHaveAttribute(
      'href',
      '/plots-and-land',
    );
  });
});
