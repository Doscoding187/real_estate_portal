import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LAND_CANONICAL_ASSIGNMENT_BLOCKER, LAND_CLASSIFICATION_LABELS, LAND_PUBLIC_CLASSIFICATIONS } from '@shared/land-domain';

const { resolveOne, resolveMany } = vi.hoisted(() => ({
  resolveOne: vi.fn(),
  resolveMany: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    placeAuthority: {
      resolveSearchPlace: { useQuery: resolveOne },
      resolveSearchPlaces: { useQuery: resolveMany },
    },
  },
}));

vi.mock('@/components/location/CanonicalPlaceSelector', () => ({
  CanonicalPlaceSelector: ({ value, label }: { value: { label: string } | null; label: string }) => (
    <div aria-label={label}>{value?.label || 'No Place selected'}</div>
  ),
}));

import PlotsAndLand from './PlotsAndLand';

const place = {
  placeId: 'pl-place-01-000000000000000000000001',
  label: 'Johannesburg',
  placeType: 'metropolitan_municipality',
  searchScope: 'metro_city' as const,
  administrativeContext: 'Gauteng',
  canonicalPath: '/gauteng/johannesburg',
};

describe('Plots & Land canonical geography boundary', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/plots-and-land');
    resolveOne.mockReset().mockReturnValue({ data: null });
    resolveMany.mockReset().mockReturnValue({ data: { results: [] } });
  });

  afterEach(() => cleanup());

  it('drops retired numeric geography while preserving non-geographic filters', () => {
    window.history.replaceState(
      {},
      '',
      '/plots-and-land?locationId=city%3A12&classification=residential_stand&maxPrice=1000000',
    );

    render(<PlotsAndLand />);

    expect(screen.getByRole('combobox', { name: 'Land type' })).toHaveTextContent(
      LAND_CLASSIFICATION_LABELS.residential_stand,
    );
    expect(screen.getByLabelText('Maximum price (R)')).toHaveValue(1_000_000);
    expect(screen.getByRole('alert')).toHaveTextContent('retired city, province, or numeric geography');
    expect(new URLSearchParams(window.location.search).has('locationId')).toBe(false);
    expect(screen.getByRole('button', { name: 'Land search unavailable' })).toBeDisabled();
  });

  it('resolves a canonical Place handoff and explains the missing assignment', () => {
    resolveOne.mockReturnValue({ data: place });
    window.history.replaceState({}, '', `/plots-and-land?canonicalPlaceId=${place.placeId}`);

    render(<PlotsAndLand />);

    expect(resolveOne).toHaveBeenCalledWith(
      { placeId: place.placeId },
      expect.objectContaining({ enabled: true }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(LAND_CANONICAL_ASSIGNMENT_BLOCKER);
  });

  it('rejects unknown public classifications from the URL', () => {
    window.history.replaceState(
      {},
      '',
      `/plots-and-land?canonicalPlaceId=${place.placeId}&classification=not-a-land-type`,
    );

    render(<PlotsAndLand />);

    expect(screen.getByRole('combobox', { name: 'Land type' })).toHaveTextContent('Any land type');
    expect(new URLSearchParams(window.location.search).get('classification')).toBeNull();
  });

  it('exposes only the governed public classifications in the selector', () => {
    render(<PlotsAndLand />);

    fireEvent.click(screen.getByRole('combobox', { name: 'Land type' }));

    expect(screen.getAllByRole('option')).toHaveLength(LAND_PUBLIC_CLASSIFICATIONS.length + 1);
    for (const classification of LAND_PUBLIC_CLASSIFICATIONS) {
      expect(
        screen.getByRole('option', { name: LAND_CLASSIFICATION_LABELS[classification] }),
      ).toBeInTheDocument();
    }
  });
});
