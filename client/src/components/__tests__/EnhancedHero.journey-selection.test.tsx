import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { setLocation, searchDiscoveryQuery } = vi.hoisted(() => ({
  setLocation: vi.fn(),
  searchDiscoveryQuery: vi.fn(() => ({ data: [] })),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/', setLocation],
}));

vi.mock('@/components/LocationAutosuggest', () => ({
  LocationAutosuggest: (props: any) => (
    <>
      <input
        ref={props.inputRef}
        aria-describedby={props.inputAriaDescribedBy}
        aria-label="Search by city, suburb, or area"
        onChange={event => props.onChange?.(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter') props.onSubmit?.();
        }}
        placeholder={props.placeholder}
        role="combobox"
      />
      {props.selectedLocations?.map((location: any) => (
        <span key={location.id} data-testid={`selected-location-${location.id}`}>
          {location.name}
        </span>
      ))}
      <button
        type="button"
        data-testid="select-johannesburg"
        onClick={() =>
          props.onSelect?.({
            id: 'city:12',
            name: 'Johannesburg',
            slug: 'johannesburg',
            type: 'city',
            provinceSlug: 'gauteng',
            parentCanonicalLocationId: 'province:1',
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
            id: 'suburb:34',
            name: 'Sandton',
            slug: 'sandton',
            type: 'suburb',
            provinceSlug: 'gauteng',
            citySlug: 'johannesburg',
            parentCanonicalLocationId: 'city:12',
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
            id: 'suburb:35',
            name: 'Rosebank',
            slug: 'rosebank',
            type: 'suburb',
            provinceSlug: 'gauteng',
            citySlug: 'johannesburg',
            parentCanonicalLocationId: 'city:12',
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

vi.mock('@/lib/trpc', () => ({
  trpc: {
    location: {
      searchDiscoverySuggestions: {
        useQuery: searchDiscoveryQuery,
      },
    },
  },
}));

import { EnhancedHero } from '../EnhancedHero';

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

  it('submits sibling locations as one canonical Buy OR intent from the neutral resolver', () => {
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
    expect(screen.getByTestId('selected-location-suburb:34')).toHaveTextContent('Sandton');
    expect(screen.getByTestId('selected-location-suburb:35')).toHaveTextContent('Rosebank');
    expect(screen.getByTestId('homepage-location-intent-buy')).not.toBeDisabled();
    expect(
      screen.getByText('Search both selected areas together. Results can match either area.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('homepage-location-intent-buy'));

    const submittedUrl = new URL(
      String(setLocation.mock.calls.at(-1)?.[0]),
      'https://listify.test',
    );
    expect(submittedUrl.pathname).toBe('/property-for-sale');
    expect(submittedUrl.searchParams.getAll('locationIds')).toEqual(['suburb:34', 'suburb:35']);
    expect(submittedUrl.searchParams.get('locationId')).toBeNull();
  });

  it('resolves a contradictory parent and child to the latest explicit location', () => {
    render(<EnhancedHero />);

    fireEvent.click(screen.getByTestId('select-johannesburg'));
    fireEvent.click(screen.getByTestId('select-sandton'));

    expect(screen.queryByTestId('selected-location-city:12')).not.toBeInTheDocument();
    expect(screen.getByTestId('selected-location-suburb:34')).toHaveTextContent('Sandton');
    expect(
      screen.getByText(
        'Sandton replaces the previous area. Multi-area search combines sibling locations at the same level.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Buy' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Search', exact: true })[0]);

    const submittedUrl = new URL(
      String(setLocation.mock.calls.at(-1)?.[0]),
      'https://listify.test',
    );
    expect(submittedUrl.searchParams.get('locationId')).toBe('suburb:34');
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

  it('routes a single location through the existing Buy contract after Buy is selected', () => {
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
    expect(submittedUrl.pathname).toBe('/property-for-sale');
    expect(submittedUrl.searchParams.get('locationId')).toBe('city:12');
    expect(submittedUrl.searchParams.getAll('locationIds')).toEqual([]);
  });

  it('supports journey-first selection but waits for a canonical location', () => {
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
    expect(setLocation).toHaveBeenCalledWith(expect.stringContaining('locationId=city%3A12'));
  });

  it('exposes the governed bedroom and bathroom filters for Buy', () => {
    render(<EnhancedHero />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Buy' })[0]);

    expect(screen.getByText('Bedrooms')).toBeInTheDocument();
    expect(screen.getByText('Bathrooms')).toBeInTheDocument();
    expect(screen.getByText('Any Bedrooms')).toBeInTheDocument();
    expect(screen.getByText('Any Bathrooms')).toBeInTheDocument();
  });

  it('retains a location when Buy is selected after location-first input', () => {
    const onTabChange = vi.fn();
    render(<EnhancedHero onTabChange={onTabChange} />);

    fireEvent.click(screen.getByTestId('select-johannesburg'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Buy' })[0]);

    expect(onTabChange).toHaveBeenCalledWith('buy');
    expect(screen.getByTestId('selected-location-city:12')).toHaveTextContent('Johannesburg');
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
