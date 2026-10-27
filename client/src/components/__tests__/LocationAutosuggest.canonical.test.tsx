import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { usePlaceDiscoveryQuery } = vi.hoisted(() => ({ usePlaceDiscoveryQuery: vi.fn() }));

vi.mock('@/lib/trpc', () => ({
  trpc: { placeAuthority: { discover: { useQuery: usePlaceDiscoveryQuery } } },
}));

import { LocationAutosuggest } from '../LocationAutosuggest';

const johannesburgId = 'pl-place-01-21f154cd5d0954c29ec7525f';
const sandtonId = 'pl-place-01-dee61758ef3bda7cd1a258ad';

const sandtonResult = {
  placeId: sandtonId,
  placeType: 'suburb',
  searchScope: 'locality',
  preferredPublicLabel: 'Sandton',
  matchedName: 'Sandton',
  searchEligible: true,
  canonicalPath: '/gauteng/johannesburg/sandton',
  context: {
    cityPlaceId: johannesburgId,
    provincePlaceId: null,
    administrativeContext: 'Johannesburg',
  },
};

describe('LocationAutosuggest canonical Place discovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlaceDiscoveryQuery.mockReturnValue({
      data: { results: [sandtonResult] },
      isLoading: false,
    });
  });

  it('uses Place Authority discovery and returns canonical identity with its projected path', async () => {
    const onSelect = vi.fn();
    render(
      <LocationAutosuggest
        placeholder="Search a city, town, suburb, or locality"
        onSelect={onSelect}
      />,
    );

    const input = screen.getByPlaceholderText('Search a city, town, suburb, or locality');
    expect(input).not.toBeDisabled();
    fireEvent.change(input, { target: { value: 'San' } });

    await waitFor(() => {
      expect(usePlaceDiscoveryQuery).toHaveBeenLastCalledWith(
        { query: 'San' },
        expect.objectContaining({ enabled: true }),
      );
    });
    fireEvent.click(screen.getByRole('option', { name: /Sandton/ }));

    expect(onSelect).toHaveBeenCalledWith({
      id: sandtonId,
      name: 'Sandton',
      slug: 'sandton',
      type: 'suburb',
      canonicalLocationId: sandtonId,
      provinceSlug: 'gauteng',
      citySlug: 'johannesburg',
      parentCanonicalLocationId: johannesburgId,
      canonicalPath: '/gauteng/johannesburg/sandton',
      selectionTypeLabel: 'suburb',
      selectionContextLabel: 'Johannesburg',
    });
  });

  it('supports keyboard selection of a canonical suggestion', async () => {
    const onSelect = vi.fn();
    render(<LocationAutosuggest onSelect={onSelect} />);

    const input = screen.getByRole('combobox', { name: 'Search admitted places' });
    fireEvent.change(input, { target: { value: 'San' } });
    await waitFor(() =>
      expect(screen.getByRole('option', { name: /Sandton/ })).toBeInTheDocument(),
    );
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: sandtonId,
        canonicalLocationId: sandtonId,
        canonicalPath: '/gauteng/johannesburg/sandton',
      }),
    );
  });

  it('supports a parent input ref and queries no place until the user types', () => {
    const inputRef = createRef<HTMLInputElement>();
    render(<LocationAutosuggest inputRef={inputRef} />);

    const input = screen.getByRole('combobox', { name: 'Search admitted places' });
    expect(inputRef.current).toBe(input);
    expect(usePlaceDiscoveryQuery).toHaveBeenLastCalledWith(
      { query: '' },
      expect.objectContaining({ enabled: false }),
    );

    fireEvent.click(input);
    expect(input).toHaveFocus();
  });

  it('does not treat an empty result as selected geography', async () => {
    usePlaceDiscoveryQuery.mockReturnValue({ data: { results: [] }, isLoading: false });
    const onSelect = vi.fn();
    render(<LocationAutosuggest onSelect={onSelect} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Unlisted place' } });
    await waitFor(async () =>
      expect(await screen.findAllByText('No locations found')).toHaveLength(2),
    );
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('respects an explicit canonical selection limit', () => {
    render(
      <LocationAutosuggest
        selectedLocations={[
          {
            id: sandtonId,
            canonicalLocationId: sandtonId,
            name: 'Sandton',
            slug: 'sandton',
            type: 'suburb',
          },
        ]}
        maxLocations={1}
      />,
    );

    expect(screen.getByPlaceholderText('Place limit reached')).toBeInTheDocument();
  });
});
