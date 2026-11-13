import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { areasQuery, insightsQuery } = vi.hoisted(() => ({
  areasQuery: vi.fn(),
  insightsQuery: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    homeAreas: { getPopularAreasByProvince: { useQuery: areasQuery } },
    homeMarketInsights: { getProvinceInsights: { useQuery: insightsQuery } },
  },
}));

import { ProvincePills } from '@/components/home/ProvincePills';
import { ExploreCities, resetAreasApiDetection } from '@/components/ExploreCities';
import { HomeMarketInsightsSection } from '@/sections/home/HomeMarketInsightsSection';
import {
  HOME_PROVINCE_STORAGE_KEY,
  readStoredHomeProvince,
  useHomeProvinceState,
} from '@/lib/useHomeProvince';

/** The page's wiring: one province state handed to every section, each with its own pills. */
function Page() {
  const [province, setProvince] = useHomeProvinceState();
  return (
    <div>
      <ProvincePills
        selectedProvince={province}
        onProvinceChange={setProvince}
        label="Province for trending"
      />
      <ExploreCities selectedProvince={province} onProvinceChange={setProvince} />
      <HomeMarketInsightsSection selectedProvince={province} onProvinceChange={setProvince} />
      <output data-testid="province">{province}</output>
    </div>
  );
}

function pressed(groupName: string): string | undefined {
  const group = screen.getByRole('group', { name: groupName });
  return (
    within(group)
      .getAllByRole('button')
      .find(button => button.getAttribute('aria-pressed') === 'true')?.textContent ?? undefined
  );
}

describe('one province for the whole homepage', () => {
  beforeEach(() => {
    areasQuery.mockReset();
    insightsQuery.mockReset();
    resetAreasApiDetection();
    window.sessionStorage.clear();
    areasQuery.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null });
    insightsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });
  });

  it('defaults to Gauteng in every section', () => {
    render(<Page />);
    for (const group of [
      'Province for trending',
      'Province for areas',
      'Province for price insights',
    ]) {
      expect(pressed(group)).toBe('Gauteng');
    }
  });

  it.each(['Province for trending', 'Province for areas', 'Province for price insights'])(
    'a choice made in the pills of "%s" updates all sections, is remembered and does not scroll',
    groupName => {
      const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
      render(<Page />);
      fireEvent.click(
        within(screen.getByRole('group', { name: groupName })).getByRole('button', {
          name: 'KwaZulu-Natal',
        }),
      );
      for (const group of [
        'Province for trending',
        'Province for areas',
        'Province for price insights',
      ]) {
        expect(pressed(group)).toBe('KwaZulu-Natal');
      }
      expect(areasQuery.mock.calls.at(-1)?.[0].provincePlaceId).toBe(
        'pl-place-01-153d9daaed02608619c762aa',
      );
      expect(insightsQuery.mock.calls.at(-1)?.[0].provincePlaceId).toBe(
        'pl-place-01-153d9daaed02608619c762aa',
      );
      expect(window.sessionStorage.getItem(HOME_PROVINCE_STORAGE_KEY)).toBe('KwaZulu-Natal');
      expect(scrollTo).not.toHaveBeenCalled();
      scrollTo.mockRestore();
    },
  );

  it('starts from the remembered province, ignores an unknown one and survives blocked storage', () => {
    window.sessionStorage.setItem(HOME_PROVINCE_STORAGE_KEY, 'Limpopo');
    expect(readStoredHomeProvince()).toBe('Limpopo');
    window.sessionStorage.setItem(HOME_PROVINCE_STORAGE_KEY, 'Atlantis');
    expect(readStoredHomeProvince()).toBe('Gauteng');

    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<Page />);
    expect(pressed('Province for areas')).toBe('Gauteng');
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Province for areas' })).getByRole('button', {
        name: 'Free State',
      }),
    );
    expect(pressed('Province for price insights')).toBe('Free State');
    getItem.mockRestore();
    setItem.mockRestore();
  });
});
