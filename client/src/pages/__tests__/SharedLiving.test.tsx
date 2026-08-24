import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const search = vi.hoisted(() => ({ fn: vi.fn(() => ({ data: { items: [], total: 0, pageSize: 24 } })) }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    sharedLiving: {
      search: {
        useQuery: (input: unknown) => {
          search.fn(input);
          const last = search.fn.mock.results.at(-1)?.value;
          return last ?? { data: null };
        },
      },
    },
  },
}));
vi.mock('wouter', () => ({ Link: ({ children, href }: any) => <a href={href}>{children}</a> }));

import SharedLiving from '../SharedLiving';

describe('SharedLiving discovery', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/shared-living');
    search.fn.mockReset();
    search.fn.mockReturnValue({ data: { items: [], total: 0, pageSize: 24 } });
  });

  it('renders the three market facets and passes the selected market to the contract', () => {
    render(<SharedLiving />);
    expect(screen.getByText('Rooms')).toBeInTheDocument();
    expect(screen.getByText('Cottages & Small Places')).toBeInTheDocument();
    expect(screen.getByText('Student Living')).toBeInTheDocument();

    const marketSelect = screen.getByLabelText('Market') as HTMLSelectElement;
    expect(marketSelect.value).toBe('');
    expect(search.fn).toHaveBeenCalledWith(expect.objectContaining({ marketTag: undefined }));
  });

  it('restores filters from the URL so refresh preserves intent', () => {
    window.history.replaceState(
      {},
      '',
      '/shared-living?market=independent_micro&location=sandton&minPrice=2000&bathroom=own',
    );
    render(<SharedLiving />);
    expect((screen.getByLabelText('Area') as HTMLInputElement).value).toBe('sandton');
    expect((screen.getByLabelText('Minimum rent') as HTMLInputElement).value).toBe('2000');
    expect(search.fn).toHaveBeenCalledWith(
      expect.objectContaining({
        marketTag: 'independent_micro',
        location: 'sandton',
        minPrice: 2000,
        bathroom: 'own',
      }),
    );
  });

  it('never renders a private street address even if a payload carried one', () => {
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
    });
    render(<SharedLiving />);
    const body = document.body.textContent || '';
    expect(body).toContain('Backyard room');
    expect(body).not.toContain('12 Private Road');
  });
});
