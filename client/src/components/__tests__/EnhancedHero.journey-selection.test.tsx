import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LAND_VERTICAL_LAUNCH_STATE, isLandPublicDiscoveryAvailable, isLandVerticalAvailable } from '@shared/landLaunchPolicy';

const { setLocation, searchDiscoveryQuery } = vi.hoisted(() => ({
  setLocation: vi.fn(),
  searchDiscoveryQuery: vi.fn(() => ({ data: [] })),
}));

const johannesburgId = 'pl-place-01-21f154cd5d0954c29ec7525f';
const sandtonId = 'pl-place-01-dee61758ef3bda7cd1a258ad';
const rosebankId = 'pl-place-01-c07bb29f37ad926848934844';

vi.mock('wouter', () => ({
  useLocation: () => ['/', setLocation],
}));

vi.mock('@/components/LocationAutosuggest', () => ({
  LocationAutosuggest: (props: any) => (
    <>
      <input
        ref={props.inputRef}
        aria-describedby={props.inputAriaDescribedBy}
        aria-label="Search admitted Places"
        onChange={event => props.onChange?.(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter') props.onSubmit?.();
        }}
        placeholder={props.placeholder}
        role="combobox"
      />
      {props.selectedLocations?.map((location: any) => (
        <span key={location.canonicalPlaceId}>
          <span data-testid={`selected-location-${location.canonicalPlaceId}`}>
            {location.name}
          </span>
          <button
            type="button"
            aria-label={`Remove ${location.name}`}
            onClick={() => props.onRemove?.(props.selectedLocations.indexOf(location))}
          >
            Remove
          </button>
        </span>
      ))}
      <button
        type="button"
        data-testid="select-johannesburg"
        onClick={() =>
          props.onSelect?.({
            canonicalPlaceId: johannesburgId,
            name: 'Johannesburg',
            slug: 'johannesburg',
            type: 'city',
            provinceSlug: 'gauteng',
            canonicalPath: '/gauteng/johannesburg',
          })
        }
      >
        Select Johannesburg
      </button>
      <button
        type="button"
        data-testid="select-sandton"
        onClick={() =>
          props.onSelect?.({
            canonicalPlaceId: sandtonId,
            name: 'Sandton',
            slug: 'sandton',
            type: 'suburb',
            provinceSlug: 'gauteng',
            citySlug: 'johannesburg',
            canonicalPath: '/gauteng/johannesburg/sandton',
            parentCanonicalPlaceId: johannesburgId,
          })
        }
      >
        Select Sandton
      </button>
      <button
        type="button"
        data-testid="select-rosebank"
        onClick={() =>
          props.onSelect?.({
            canonicalPlaceId: rosebankId,
            name: 'Rosebank',
            slug: 'rosebank',
            type: 'suburb',
            provinceSlug: 'gauteng',
            citySlug: 'johannesburg',
            canonicalPath: '/gauteng/johannesburg/rosebank',
            parentCanonicalPlaceId: johannesburgId,
          })
        }
      >
        Select Rosebank
      </button>
      <button
        type="button"
        data-testid="select-invalid-location"
        onClick={() =>
          props.onSelect?.({
            id: 'google-place-123',
            name: 'Unresolved place',
            slug: 'unresolved-place',
            type: 'city',
          })
        }
      >
        Select unresolved place
      </button>
    </>
  ),
}));

vi.mock('@/components/location/CanonicalPlaceSelector', () => ({
  CanonicalPlaceSelector: (props: any) => (
    <button
      type="button"
      data-testid="select-development-place"
      onClick={() =>
        props.onChange?.({
          canonicalPlaceId: johannesburgId,
          label: 'Johannesburg',
          placeType: 'city',
          scope: 'metro_city',
          administrativeContext: 'Gauteng',
          canonicalPath: '/gauteng/johannesburg',
        })
      }
    >
      Select canonical development Place
    </button>
  ),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    location: {
      searchDiscoverySuggestions: {
        useQuery: searchDiscoveryQuery,
      },
      placeSuggestions: {
        useQuery: searchDiscoveryQuery,
      },
    },
  },
}));

import { EnhancedHero } from '../EnhancedHero';

const launchState = LAND_VERTICAL_LAUNCH_STATE as unknown as { enabled: boolean };
function withLandLaunchEnabled(run: () => void) {
  const previous = launchState.enabled;
  launchState.enabled = true;
  try {
    run();
  } finally {
    launchState.enabled = previous;
  }
}

describe('EnhancedHero explicit journey selection', () => {
  beforeEach(() => {
    setLocation.mockClear();
  });

  it('starts neutral while keeping location search usable and Search non-submittable', () => {
    render(<EnhancedHero />);

    screen
      .getAllByRole('button', { name: 'Buy' })
      .forEach(button => expect(button).toHaveAttribute('aria-pressed', 'false'));
    screen
      .getAllByRole('button', { name: 'Find an Agent' })
      .forEach(button => expect(button).toHaveAttribute('aria-pressed', 'false'));
    expect(screen.getByRole('combobox')).not.toBeDisabled();
    expect(screen.getByText('Choose how you would like to start.')).toBeInTheDocument();
    screen
      .getAllByRole('button', { name: 'Search', exact: true })
      .forEach(button => expect(button).toBeDisabled());

    fireEvent.submit(screen.getByRole('combobox').closest('form')!);
    expect(setLocation).not.toHaveBeenCalled();
  });

  it('activates Search for a location-first selection without inferring a journey', () => {
    render(<EnhancedHero />);

    fireEvent.click(screen.getByTestId('select-johannesburg'));

    screen
      .getAllByRole('button', { name: 'Search', exact: true })
      .forEach(button => expect(button).not.toBeDisabled());
    expect(setLocation).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole('button', { name: 'Search', exact: true })[0]);

    expect(setLocation).toHaveBeenCalledWith('/gauteng/johannesburg');
  });

  it('uses the same neutral destination for Enter as Search click', () => {
    render(<EnhancedHero />);

    fireEvent.click(screen.getByTestId('select-johannesburg'));
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter', code: 'Enter' });

    expect(setLocation).toHaveBeenCalledWith('/gauteng/johannesburg');
  });

  it('requires one canonical Place before Buy or Rent can leave the neutral resolver', () => {
    render(<EnhancedHero />);

    fireEvent.click(screen.getByTestId('select-sandton'));
    fireEvent.click(screen.getByTestId('select-rosebank'));

    screen
      .getAllByRole('button', { name: 'Search', exact: true })
      .forEach(button => expect(button).not.toBeDisabled());
    expect(
      screen.getByText('What are you looking for in Sandton and Rosebank?'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Search', exact: true })[0]);

    expect(
      screen.getByRole('heading', {
        name: 'What are you looking for in Sandton and Rosebank?',
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId(`selected-location-${sandtonId}`)).toHaveTextContent('Sandton');
    expect(screen.getByTestId(`selected-location-${rosebankId}`)).toHaveTextContent('Rosebank');
    expect(screen.getByTestId('homepage-location-intent-buy')).toBeDisabled();
    expect(
      screen.getByText(
        'Buy and Rent searches use one canonical Place. Remove extra Places to continue.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Rosebank' }));
    expect(screen.getByTestId('homepage-location-intent-buy')).toBeEnabled();
    fireEvent.click(screen.getByTestId('homepage-location-intent-buy'));

    const submittedUrl = new URL(
      String(setLocation.mock.calls.at(-1)?.[0]),
      'https://listify.test',
    );
    expect(submittedUrl.pathname).toBe('/property-for-sale');
    expect(submittedUrl.searchParams.get('canonicalPlaceId')).toBe(sandtonId);
    expect(submittedUrl.searchParams.get('locationIds')).toBeNull();
  });

  it('resolves a contradictory parent and child to the latest explicit location', () => {
    render(<EnhancedHero />);

    fireEvent.click(screen.getByTestId('select-johannesburg'));
    fireEvent.click(screen.getByTestId('select-sandton'));

    expect(screen.queryByTestId(`selected-location-${johannesburgId}`)).not.toBeInTheDocument();
    expect(screen.getByTestId(`selected-location-${sandtonId}`)).toHaveTextContent('Sandton');
    expect(
      screen.getByText(
        'Sandton replaces the previous selection because the places have different scopes or parents.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Buy' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Search', exact: true })[0]);

    const submittedUrl = new URL(
      String(setLocation.mock.calls.at(-1)?.[0]),
      'https://listify.test',
    );
    expect(submittedUrl.searchParams.get('canonicalPlaceId')).toBe(sandtonId);
    expect(submittedUrl.searchParams.getAll('locationIds')).toEqual([]);
  });

  it('rejects an unresolved location identity from activating Search', () => {
    render(<EnhancedHero />);

    fireEvent.click(screen.getByTestId('select-invalid-location'));

    screen
      .getAllByRole('button', { name: 'Search', exact: true })
      .forEach(button => expect(button).toBeDisabled());
    expect(setLocation).not.toHaveBeenCalled();
  });

  it('routes a broad Buy selection to the Sale locality guide', () => {
    render(<EnhancedHero />);

    fireEvent.click(screen.getByTestId('select-johannesburg'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Buy' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Search', exact: true })[0]);

    screen
      .getAllByRole('button', { name: 'Buy' })
      .forEach(button => expect(button).toHaveAttribute('aria-pressed', 'true'));
    const submittedUrl = new URL(
      String(setLocation.mock.calls.at(-1)?.[0]),
      'https://listify.test',
    );
    expect(submittedUrl.pathname).toBe('/gauteng/johannesburg');
    expect(submittedUrl.searchParams.get('mode')).toBe('sale');
    expect(submittedUrl.searchParams.getAll('locationIds')).toEqual([]);
  });

  it('routes a broad Rent selection to the Rent locality guide', () => {
    render(<EnhancedHero activeTab="rent" />);

    fireEvent.click(screen.getByTestId('select-johannesburg'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Search', exact: true })[0]);

    expect(setLocation).toHaveBeenCalledWith('/gauteng/johannesburg?mode=rent');
  });

  it('keeps an exact Rent locality on the existing exact-place search route', () => {
    render(<EnhancedHero activeTab="rent" />);

    fireEvent.click(screen.getByTestId('select-sandton'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Search', exact: true })[0]);

    const submittedUrl = new URL(
      String(setLocation.mock.calls.at(-1)?.[0]),
      'https://listify.test',
    );
    expect(submittedUrl.pathname).toBe('/property-to-rent');
    expect(submittedUrl.searchParams.get('canonicalPlaceId')).toBe(sandtonId);
    expect(submittedUrl.searchParams.get('mode')).toBeNull();
  });

  it('routes an enabled Developments selection to the canonical search URL', () => {
    render(<EnhancedHero activeTab="developments" />);

    fireEvent.click(screen.getByTestId('select-development-place'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Search', exact: true })[0]);

    expect(setLocation).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^/new-developments\\?canonicalPlaceId=${johannesburgId}`)),
    );
  });

  it('submits a canonical location through the Commercial Leasing journey', () => {
    render(<EnhancedHero activeTab="commercial" />);

    fireEvent.click(screen.getByTestId('select-johannesburg'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Search', exact: true })[0]);

    expect(setLocation).toHaveBeenCalledWith(`/commercial?canonicalPlaceId=${johannesburgId}`);
  });

  it('takes a broad Land Place directly to its guide without rolling listings up', () => {
    withLandLaunchEnabled(() => {
      render(<EnhancedHero activeTab="plot_land" />);

      expect(isLandPublicDiscoveryAvailable()).toBe(true);
      expect(isLandVerticalAvailable()).toBe(true);
      expect(screen.getByText('Land type')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('select-johannesburg'));

      expect(setLocation).toHaveBeenCalledWith('/gauteng/johannesburg');
    });
  });

  it('keeps exact locality Land search on its selected Place ID', () => {
    withLandLaunchEnabled(() => {
      render(<EnhancedHero activeTab="plot_land" />);

      fireEvent.click(screen.getByTestId('select-sandton'));
      fireEvent.click(screen.getAllByRole('button', { name: 'Search', exact: true })[0]);

      expect(setLocation).toHaveBeenCalledWith(`/plots-and-land?canonicalPlaceId=${sandtonId}`);
    });
  });

  it('exposes Commercial Office filters that map to tenant decisions', () => {
    render(<EnhancedHero activeTab="commercial" />);

    expect(screen.getByText('Space size')).toBeInTheDocument();
    expect(screen.getByText('Monthly occupancy')).toBeInTheDocument();
    expect(screen.getByText('Availability')).toBeInTheDocument();
    expect(screen.getByText('Parking')).toBeInTheDocument();
    expect(screen.queryByText('Bedrooms')).not.toBeInTheDocument();
    expect(screen.queryByText('Bathrooms')).not.toBeInTheDocument();
  });

  it('routes journey-first broad Buy selection to the Sale locality guide', () => {
    render(<EnhancedHero />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Buy' })[0]);

    screen
      .getAllByRole('button', { name: 'Search', exact: true })
      .forEach(button => expect(button).toBeDisabled());
    expect(setLocation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('select-johannesburg'));

    screen
      .getAllByRole('button', { name: 'Search', exact: true })
      .forEach(button => expect(button).not.toBeDisabled());

    fireEvent.click(screen.getAllByRole('button', { name: 'Search', exact: true })[0]);
    expect(setLocation).toHaveBeenCalledWith('/gauteng/johannesburg?mode=sale');
  });

  it('exposes the governed bedroom and bathroom filters for Buy', () => {
    render(<EnhancedHero />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Buy' })[0]);

    expect(screen.getByText('Bedrooms')).toBeInTheDocument();
    expect(screen.getByText('Bathrooms')).toBeInTheDocument();
    expect(screen.getByText('Any Bedrooms')).toBeInTheDocument();
    expect(screen.getByText('Any Bathrooms')).toBeInTheDocument();
  });

  it('opens both price boundaries together for the Buy price decision', () => {
    render(<EnhancedHero activeTab="buy" />);

    fireEvent.click(screen.getByText('Any price'));

    expect(screen.getByText('Minimum price')).toBeInTheDocument();
    expect(screen.getByText('Maximum price')).toBeInTheDocument();
    expect(screen.getByText('No min')).toBeInTheDocument();
    expect(screen.getByText('No max')).toBeInTheDocument();
  });

  it('retains a location when Buy is selected after location-first input', () => {
    const onTabChange = vi.fn();
    render(<EnhancedHero onTabChange={onTabChange} />);

    fireEvent.click(screen.getByTestId('select-johannesburg'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Buy' })[0]);

    expect(onTabChange).toHaveBeenCalledWith('buy');
    expect(screen.getByTestId(`selected-location-${johannesburgId}`)).toHaveTextContent(
      'Johannesburg',
    );
    screen
      .getAllByRole('button', { name: 'Search', exact: true })
      .forEach(button => expect(button).not.toBeDisabled());
  });

  it('does not expose unsupported lease-term or furnished Rent controls', () => {
    render(<EnhancedHero activeTab="rent" />);

    expect(screen.queryByText('Lease Term')).not.toBeInTheDocument();
    expect(screen.queryByText('Furnished Only')).not.toBeInTheDocument();

    const source = readFileSync(
      path.join(process.cwd(), 'client/src/components/EnhancedHero.tsx'),
      'utf8',
    );
    const rentPanelStart = source.indexOf("{activeTab === 'rent' && (");
    const developmentsPanelStart = source.indexOf("{activeTab === 'developments' && (");
    const rentPanel = source.slice(rentPanelStart, developmentsPanelStart);

    expect(rentPanel).not.toContain('Lease Term');
    expect(rentPanel).not.toContain('Furnished Only');
  });
});
