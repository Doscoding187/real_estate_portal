import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LAND_VERTICAL_LAUNCH_STATE } from '@shared/landLaunchPolicy';

const { resolveCanonicalUrl, landGuideAreas, propertyGuideAreas, metaControl } = vi.hoisted(() => ({
  resolveCanonicalUrl: vi.fn(),
  landGuideAreas: vi.fn(),
  propertyGuideAreas: vi.fn(),
  metaControl: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    placeAuthority: { resolveCanonicalUrl: { useQuery: resolveCanonicalUrl } },
    landPublic: { guideAreas: { useQuery: landGuideAreas } },
    properties: { guideAreas: { useQuery: propertyGuideAreas } },
  },
}));

vi.mock('@/components/seo/MetaControl', () => ({
  MetaControl: (props: unknown) => {
    metaControl(props);
    return null;
  },
}));

import CanonicalPlacePage from './CanonicalPlacePage';

describe('Canonical Place area guides', () => {
  const launchState = LAND_VERTICAL_LAUNCH_STATE as unknown as { enabled: boolean };
  let originalLaunchState: boolean;

  beforeEach(() => {
    originalLaunchState = launchState.enabled;
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
    landGuideAreas.mockReturnValue({
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
    propertyGuideAreas.mockReturnValue({ data: [], isPending: false, error: null });
  });

  afterEach(() => {
    launchState.enabled = originalLaunchState;
    cleanup();
    vi.clearAllMocks();
  });

  describe('Land area guide', () => {
    beforeEach(() => {
      launchState.enabled = true;
    });

    it('puts inventory-bearing exact localities first and links to each locality search', () => {
      render(<CanonicalPlacePage />);

      expect(screen.getByRole('heading', { name: 'Explore Land in Johannesburg' })).toBeVisible();
      expect(
        screen.getByText('Choose a suburb or locality that interests you to see Land listings in that exact area.'),
      ).toBeVisible();
      const areaList = screen.getByRole('list');
      const links = within(areaList).getAllByRole('link');
      expect(links.map(link => link.textContent)).toEqual([
        'Newclare2 Land listings',
        'Westbury1 Land listing',
      ]);
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
      landGuideAreas.mockReturnValue({ data: [], isPending: false, error: null });

      render(<CanonicalPlacePage />);

      expect(screen.getByRole('status')).toHaveTextContent('No land listed in Johannesburg yet.');
      expect(screen.getByRole('link', { name: 'Search Land in another area' })).toHaveAttribute(
        'href',
        '/plots-and-land',
      );
    });
  });

  describe('Sale and Rent area guide', () => {
    it.each([
      [
        'sale',
        'Explore homes for sale in Johannesburg',
        '/property-for-sale?canonicalPlaceId=pl-place-01-000000000000000000000001',
        '1 home for sale',
      ],
      [
        'rent',
        'Explore rentals in Johannesburg',
        '/property-to-rent?canonicalPlaceId=pl-place-01-000000000000000000000001',
        '1 rental listing',
      ],
    ] as const)(
      'shows only the selected %s inventory mode and links to exact locality search',
      (mode, heading, href, countLabel) => {
        window.history.replaceState({}, '', '/gauteng/johannesburg?mode=' + mode);
        propertyGuideAreas.mockReturnValue({
          data: [
            {
              placeId: 'pl-place-01-000000000000000000000001',
              label: 'Newclare',
              listingCount: 1,
              href,
            },
          ],
          isPending: false,
          error: null,
        });

        render(<CanonicalPlacePage />);

        expect(screen.getByRole('heading', { name: heading })).toBeVisible();
        expect(
          screen.getByRole('link', { name: new RegExp('Newclare.*' + countLabel) }),
        ).toHaveAttribute('href', href);
        expect(propertyGuideAreas).toHaveBeenCalledWith(
          expect.objectContaining({
            canonicalPlaceId: 'pl-place-01-21f154cd5d0954c29ec7525f',
            listingType: mode,
          }),
          expect.objectContaining({ enabled: true }),
        );
        expect(metaControl).toHaveBeenCalledWith(expect.objectContaining({ forceNoIndex: true }));
      },
    );

    it.each([
      [
        'sale',
        'No homes for sale in Johannesburg yet.',
        'Search homes for sale in another area',
        '/property-for-sale',
      ],
      [
        'rent',
        'No rentals in Johannesburg yet.',
        'Search rentals in another area',
        '/property-to-rent',
      ],
    ] as const)('shows a mode-specific empty state for %s', (mode, message, linkName, href) => {
      window.history.replaceState({}, '', '/gauteng/johannesburg?mode=' + mode);

      render(<CanonicalPlacePage />);

      expect(screen.getByRole('status')).toHaveTextContent(message);
      expect(screen.getByRole('link', { name: linkName })).toHaveAttribute('href', href);
    });

    it('keeps broad place pages noindex and asks buyers to choose a mode before listing areas', () => {
      render(<CanonicalPlacePage />);

      expect(screen.getByText(/Choose Sale or Rent/)).toBeVisible();
      expect(screen.getByRole('link', { name: 'Explore homes for sale' })).toHaveAttribute(
        'href',
        '/gauteng/johannesburg?mode=sale',
      );
      expect(screen.getByRole('link', { name: 'Explore rentals' })).toHaveAttribute(
        'href',
        '/gauteng/johannesburg?mode=rent',
      );
      expect(propertyGuideAreas).toHaveBeenCalledWith(
        expect.objectContaining({ listingType: 'sale' }),
        expect.objectContaining({ enabled: false }),
      );
      expect(metaControl).toHaveBeenCalledWith(expect.objectContaining({ forceNoIndex: true }));
    });
  });
});
