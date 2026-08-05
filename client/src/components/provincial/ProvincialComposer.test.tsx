import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  LocationAutosuggest: ({ onSelect, placeholder }: any) => (
    <div>
      <input aria-label="Location search" placeholder={placeholder} />
      <button
        type="button"
        data-testid="select-pretoria"
        onClick={() =>
          onSelect({
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
});
