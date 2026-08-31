import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const search = vi.hoisted(() => ({
  fn: vi.fn(() => ({ data: { items: [], total: 0, pageSize: 24 }, isLoading: false })),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    sharedLiving: {
      search: {
        useQuery: (input: unknown) => {
          search.fn(input);
          return search.fn.mock.results.at(-1)?.value ?? { data: null, isLoading: false };
        },
      },
    },
  },
}));

vi.mock('@/components/LocationAutosuggest', () => ({
  LocationAutosuggest: ({ onSelect, selectedLocations }: any) => (
    <div>
      <button
        type="button"
        onClick={() =>
          onSelect({
            id: 'suburb:34',
            canonicalLocationId: 'suburb:34',
            name: 'Sandton',
            slug: 'sandton',
            type: 'suburb',
            parentCanonicalLocationId: 'city:12',
          })
        }
      >
        Choose Sandton
      </button>
      <span>{selectedLocations.map((location: any) => location.name).join(', ')}</span>
    </div>
  ),
}));

vi.mock('wouter', () => ({ Link: ({ children, href }: any) => <a href={href}>{children}</a> }));

import SharedLiving from '../SharedLiving';

describe('SharedLiving discovery', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/shared-living');
    search.fn.mockReset();
    search.fn.mockReturnValue({ data: { items: [], total: 0, pageSize: 24 }, isLoading: false });
  });

  it('renders the independent market facets and passes the selected market to its own contract', () => {
    render(<SharedLiving />);
    const marketSelect = screen.getByRole('combobox', { name: 'Market' });
    fireEvent.click(marketSelect);
    expect(screen.getByRole('option', { name: 'Rooms' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Cottages & Small Places' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Student Living' })).toBeInTheDocument();
    expect(search.fn).toHaveBeenCalledWith(expect.objectContaining({ marketTag: undefined }));
  });

  it('only sends a selected canonical location and restores it from URL state', () => {
    window.history.replaceState(
      {},
      '',
      '/shared-living?market=independent_micro&locationId=suburb:34&minPrice=2000&bathroom=own',
    );
    render(<SharedLiving />);
    expect((screen.getByLabelText('Minimum rent') as HTMLInputElement).value).toBe('2000');
    expect(search.fn).toHaveBeenCalledWith(
      expect.objectContaining({
        marketTag: 'independent_micro',
        locationId: 'suburb:34',
        locationIds: undefined,
        minPrice: 2000,
        bathroom: 'own',
      }),
    );
    expect(search.fn.mock.calls.flat().some((input: any) => 'location' in input)).toBe(false);
  });

  it('turns a catalogue selection into canonical URL and API state', () => {
    render(<SharedLiving />);
    fireEvent.click(screen.getByText('Choose Sandton'));
    expect(search.fn).toHaveBeenLastCalledWith(
      expect.objectContaining({ locationId: 'suburb:34', locationIds: undefined }),
    );
    expect(window.location.search).toContain('locationId=suburb%3A34');
  });

  it('does not widen an unsupported Search Area handoff', () => {
    window.history.replaceState({}, '', '/shared-living?searchAreaId=greater-sandton');
    render(<SharedLiving />);
    expect(screen.getByRole('alert')).toHaveTextContent('Search Areas are not available');
  });

  it('never renders a private street address even if an unsafe payload carried one', () => {
    search.fn.mockReturnValue({
      data: {
        items: [
          {
            placeId: 1,
            spaceId: 2,
            slug: 'probe-room-1',
            href: '/shared-living/probe-room-1',
            label: 'Backyard room',
            accommodationType: 'backyard_room',
            marketTag: 'independent_micro',
            locationDisplay: 'Soweto, Johannesburg',
            rentAmountMinor: 250000,
            rentUnknown: false,
            billsIncluded: { electricity: true, water: false, wifi: false },
            furnishedState: 'unknown',
            bathroomAccess: 'own',
            parkingBays: null,
            rentableAreaM2: 20,
            depositMinor: null,
            availableFrom: null,
            coordinates: null,
            description: '12 Private Road (must never render)',
            placeKind: 'house',
          },
        ],
        total: 1,
        page: 0,
        pageSize: 24,
        hasMore: false,
      },
      isLoading: false,
    });
    render(<SharedLiving />);
    const body = document.body.textContent || '';
    expect(body).toContain('Backyard room');
    expect(body).not.toContain('12 Private Road');
  });
});
