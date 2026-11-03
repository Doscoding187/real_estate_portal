import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { resolveSearchPlace, discoverPlaces } = vi.hoisted(() => ({
  resolveSearchPlace: vi.fn(),
  discoverPlaces: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    placeAuthority: {
      resolveSearchPlace: { useQuery: resolveSearchPlace },
      discover: { useQuery: discoverPlaces },
    },
  },
}));
vi.mock('wouter', () => ({ Link: ({ children, href }: any) => <a href={href}>{children}</a> }));

import CommercialOffice from './CommercialOffice';

const sandtonId = 'pl-place-01-dee61758ef3bda7cd1a258ad';

describe('Commercial leasing Place authority', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/commercial');
    resolveSearchPlace.mockReset();
    resolveSearchPlace.mockReturnValue({
      data: {
        placeId: sandtonId,
        label: 'Sandton',
        placeType: 'suburb',
        searchScope: 'locality',
        administrativeContext: 'Johannesburg',
        canonicalPath: '/gauteng/johannesburg/sandton',
      },
    });
    discoverPlaces.mockReset();
    discoverPlaces.mockReturnValue({ data: { results: [] }, isLoading: false });
  });

  it('resolves the selected Place by canonicalPlaceId and keeps it in the filter URL', async () => {
    window.history.replaceState(
      {},
      '',
      `/commercial?canonicalPlaceId=${sandtonId}&useTypes=retail&minAreaM2=80`,
    );
    render(<CommercialOffice />);

    expect(screen.getByText(/Commercial search and authoring are waiting for/)).toBeInTheDocument();
    await waitFor(() => {
      expect(resolveSearchPlace).toHaveBeenCalledWith(
        { placeId: sandtonId },
        expect.objectContaining({ enabled: true }),
      );
    });
    await waitFor(() => {
      expect(new URLSearchParams(window.location.search).get('canonicalPlaceId')).toBe(sandtonId);
    });
    expect(screen.getByLabelText('Canonical Place')).toBeInTheDocument();
    expect(screen.getByLabelText('Minimum square metres')).toHaveValue(80);
    expect(screen.getByLabelText('Retail')).toBeChecked();
  });

  it.each(['location=Sandton', 'locationIds=city%3A12', 'city=johannesburg'])(
    'rejects retired geography input: %s',
    retiredQuery => {
      window.history.replaceState({}, '', `/commercial?${retiredQuery}`);
      render(<CommercialOffice />);

      expect(screen.getByRole('alert')).toHaveTextContent('retired text or numeric geography');
      expect(resolveSearchPlace).toHaveBeenCalledWith(
        { placeId: '' },
        expect.objectContaining({ enabled: false }),
      );
    },
  );

  it('rejects a malformed canonicalPlaceId without falling back to its visible name', () => {
    window.history.replaceState({}, '', '/commercial?canonicalPlaceId=city%3A12');
    render(<CommercialOffice />);

    expect(screen.getByRole('alert')).toHaveTextContent('retired text or numeric geography');
    expect(resolveSearchPlace).toHaveBeenCalledWith(
      { placeId: '' },
      expect.objectContaining({ enabled: false }),
    );
  });
});
