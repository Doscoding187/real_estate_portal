import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocationNode } from '@/types/location';
import { PROVINCIAL_CONFIGS } from '@shared/provincialDiscovery';

const { navigate, useLocationMock, useSearchMock } = vi.hoisted(() => ({
  navigate: vi.fn(),
  useLocationMock: vi.fn(),
  useSearchMock: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: useLocationMock,
  useSearch: useSearchMock,
}));

vi.mock('@/components/LocationAutosuggest', () => ({
  LocationAutosuggest: ({
    onSelect,
    placeholder,
    selectedLocations = [],
    onRemove,
  }: {
    onSelect?: (location: LocationNode) => void;
    placeholder?: string;
    selectedLocations?: LocationNode[];
    onRemove?: (index: number) => void;
  }) => (
    <div>
      {selectedLocations.map((location, index) => (
        <button key={location.id} type="button" onClick={() => onRemove?.(index)}>
          Remove {location.name}
        </button>
      ))}
      <input aria-label="Location search" placeholder={placeholder} />
      <button
        type="button"
        data-testid="select-pretoria"
        onClick={() =>
          onSelect?.({
            id: 'city:2',
            canonicalLocationId: 'city:2',
            name: 'Pretoria',
            slug: 'pretoria',
            type: 'city',
            provinceSlug: 'gauteng',
          })
        }
      >
        Choose Pretoria
      </button>
      <button
        type="button"
        data-testid="select-sandton"
        onClick={() =>
          onSelect?.({
            id: 'suburb:34',
            canonicalLocationId: 'suburb:34',
            name: 'Sandton',
            slug: 'sandton',
            type: 'suburb',
            provinceSlug: 'gauteng',
            citySlug: 'johannesburg',
          })
        }
      >
        Choose Sandton
      </button>
      <button
        type="button"
        data-testid="select-rosebank"
        onClick={() =>
          onSelect?.({
            id: 'suburb:35',
            canonicalLocationId: 'suburb:35',
            name: 'Rosebank',
            slug: 'rosebank',
            type: 'suburb',
            provinceSlug: 'gauteng',
            citySlug: 'johannesburg',
          })
        }
      >
        Choose Rosebank
      </button>
    </div>
  ),
}));

import { ProvincialComposer } from './ProvincialComposer';

const province = {
  id: 1,
  canonicalLocationId: 'province:1',
  name: 'Gauteng',
  slug: 'gauteng',
};

const westernCapeProvince = {
  id: 2,
  canonicalLocationId: 'province:2',
  name: 'Western Cape',
  slug: 'western-cape',
};

describe('ProvincialComposer', () => {
  beforeEach(() => {
    navigate.mockReset();
    useLocationMock.mockReturnValue(['/gauteng', navigate]);
    useSearchMock.mockReturnValue('');
  });

  it('keeps the neutral route neutral and does not activate unavailable journeys', () => {
    render(<ProvincialComposer config={PROVINCIAL_CONFIGS.gauteng} province={province} />);

    expect(screen.queryByTestId('active-journey-state')).not.toBeInTheDocument();
    expect(screen.getByTestId('provincial-primary-cta')).toBeDisabled();
    expect(screen.getByRole('tab', { name: /Buy/i })).not.toBeDisabled();
    expect(screen.getByRole('tab', { name: /Land & plots/i })).toBeDisabled();
    expect(screen.getByRole('tab', { name: /Shared Living/i })).toBeDisabled();
  });

  it('writes Buy intent to the province URL and preserves canonical location selection', () => {
    const { rerender } = render(
      <ProvincialComposer config={PROVINCIAL_CONFIGS.gauteng} province={province} />,
    );

    fireEvent.click(screen.getByRole('tab', { name: /Buy/i }));
    expect(navigate).toHaveBeenCalledWith('/gauteng?journey=buy', { replace: false });

    useSearchMock.mockReturnValue('journey=buy&province=gauteng&city=pretoria&locationId=city%3A2');
    rerender(<ProvincialComposer config={PROVINCIAL_CONFIGS.gauteng} province={province} />);
    expect(screen.getByTestId('active-journey-state')).toHaveTextContent('Buy selected');

    fireEvent.click(screen.getByTestId('provincial-primary-cta'));
    expect(navigate).toHaveBeenLastCalledWith(expect.stringContaining('/property-for-sale?'));
    expect(navigate.mock.calls.at(-1)?.[0]).toContain('locationId=city%3A2');
  });

  it('accepts a canonical precise location without forcing hierarchy navigation', () => {
    render(<ProvincialComposer config={PROVINCIAL_CONFIGS.gauteng} province={province} />);

    fireEvent.click(screen.getByTestId('select-pretoria'));

    expect(navigate).toHaveBeenCalledWith(
      '/gauteng?locationId=city%3A2&province=gauteng&city=pretoria',
      { replace: false },
    );
  });

  it('keeps Rent as Rent and preserves deliberate sibling OR selections', () => {
    useSearchMock.mockReturnValue('journey=rent');
    render(<ProvincialComposer config={PROVINCIAL_CONFIGS.gauteng} province={province} />);

    expect(screen.queryByLabelText(/Lease term/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Furnished/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('select-sandton'));
    fireEvent.click(screen.getByTestId('select-rosebank'));
    fireEvent.click(screen.getByTestId('provincial-primary-cta'));

    const href = navigate.mock.calls.at(-1)?.[0] as string;
    expect(href).toContain('/property-to-rent?');
    expect(href).toContain('locationIds=suburb%3A34');
    expect(href).toContain('locationIds=suburb%3A35');
    expect(href).not.toContain('city=johannesburg');
  });

  it('does not expose an uncanonical market as a neutral destination shortcut', () => {
    useLocationMock.mockReturnValue(['/western-cape', navigate]);

    render(
      <ProvincialComposer
        config={PROVINCIAL_CONFIGS['western-cape']}
        province={westernCapeProvince}
        marketLocations={[
          {
            name: 'Cape Town',
            slug: 'cape-town',
            canonicalLocationId: 'city:4',
          },
        ]}
      />,
    );

    expect(screen.getByRole('button', { name: 'Cape Town' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Stellenbosch' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Stellenbosch' }));
    expect(navigate).not.toHaveBeenCalled();
  });
});
