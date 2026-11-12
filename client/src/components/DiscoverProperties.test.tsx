import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('wouter', () => ({ useLocation: () => ['/', vi.fn()] }));
vi.mock('@/components/HomeAreaPicker', () => ({ HomeAreaPicker: () => null }));
vi.mock('@/components/location/CanonicalPlaceSelector', () => ({
  CanonicalPlaceSelector: () => null,
}));

import { DiscoverProperties } from './DiscoverProperties';
import { HomeSearchProvider } from '@/contexts/HomeSearchContext';
import { HOME_BROWSE_CITIES } from '@/lib/cityGuides';

const SALE = [
  'Houses',
  'Apartments',
  'Townhouses',
  'Cluster Homes',
  'Farms',
  'Plots & Land',
  'Offices',
  'Shops',
];

function cardsFor(group: string) {
  return Array.from(document.querySelectorAll<HTMLAnchorElement>(`a[data-card^="${group}:"]`));
}

describe('DiscoverProperties', () => {
  it('shows the sale cards as real links with photos and no Villas', () => {
    const { container } = render(<DiscoverProperties />);

    const cards = cardsFor('sale');
    expect(cards.map(card => card.getAttribute('data-card')?.split(':')[1])).toEqual(SALE);
    expect(container.textContent).not.toContain('Villas');
    for (const card of cards) {
      expect(card.getAttribute('href')).toBeTruthy();
      const img = card.querySelector('img');
      expect(img).not.toBeNull();
      expect(img?.getAttribute('srcset')).toMatch(/\/images\/categories\/.+-\d+\.webp \d+w/);
      expect(img?.getAttribute('loading')).toBe('lazy');
      expect(img?.getAttribute('decoding')).toBe('async');
      expect(img?.getAttribute('width')).toBeTruthy();
      expect(img?.getAttribute('height')).toBeTruthy();
      expect(card.querySelector('svg')).toBeNull();
    }
    expect(screen.getByAltText('Townhouses for sale')).toBeInTheDocument();
    expect(container.innerHTML).not.toContain('unsplash');
  });

  it('links each sale card to the supported destination for its category', () => {
    render(<DiscoverProperties />);
    const hrefs = Object.fromEntries(
      cardsFor('sale').map(card => [card.getAttribute('data-card')?.split(':')[1], card.href]),
    );
    const url = (label: string) => new URL(hrefs[label] as string);

    expect(url('Houses').pathname).toBe('/property-for-sale');
    expect(url('Houses').searchParams.get('propertyType')).toBe('house');
    expect(url('Apartments').searchParams.get('propertyType')).toBe('apartment');
    expect(url('Townhouses').searchParams.get('propertyType')).toBe('townhouse');
    expect(url('Cluster Homes').searchParams.get('propertyType')).toBe('cluster_home');
    expect(url('Farms').searchParams.get('propertyType')).toBe('farm');
    expect(url('Plots & Land').pathname).toBe('/plots-and-land');
    expect(url('Offices').pathname).toBe('/commercial');
    expect(url('Offices').searchParams.get('useTypes')).toBe('office');
    expect(url('Shops').pathname).toBe('/commercial');
    expect(url('Shops').searchParams.get('useTypes')).toBe('retail');
    // No area chosen: national results, no place in the URL.
    expect(url('Houses').searchParams.has('canonicalPlaceId')).toBe(false);
  });

  it('shows rent cards for the rent search and the photo-less developments cards', () => {
    render(<DiscoverProperties />);
    fireEvent.click(screen.getByRole('button', { name: 'Rent' }));
    expect(cardsFor('rent').map(card => card.getAttribute('data-card')?.split(':')[1])).toEqual([
      'Apartments',
      'Houses',
      'Townhouses',
      'Offices',
      'Shops',
    ]);
    expect(screen.getByAltText('Apartments to rent')).toBeInTheDocument();
    const rentHouses = cardsFor('rent').find(card => card.dataset.card === 'rent:Houses');
    expect(new URL(rentHouses!.href).pathname).toBe('/property-to-rent');
    expect(within(rentHouses!).getByText('To rent')).toBeInTheDocument();

    // The segmented control (below 1024px) comes first in the DOM, before the accordion row.
    fireEvent.click(screen.getAllByRole('button', { name: 'New Developments' })[0]);
    const developments = cardsFor('developments');
    expect(developments.map(card => card.dataset.card?.split(':')[1])).toEqual([
      'Ready to Move',
      'New Launch',
      'Affordable Housing',
      'Luxury Projects',
    ]);
    for (const card of developments) expect(card.querySelector('img')).toBeNull();
  });

  it('city pill sets the area on the cards and a second press clears it', () => {
    render(
      <HomeSearchProvider journey="buy" onJourneyChange={() => undefined}>
        <DiscoverProperties />
      </HomeSearchProvider>,
    );
    const capeTown = HOME_BROWSE_CITIES.find(city => city.name === 'Cape Town')!;
    for (const city of HOME_BROWSE_CITIES) {
      expect(screen.getByRole('button', { name: city.name })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    }

    fireEvent.click(screen.getByRole('button', { name: 'Cape Town' }));
    expect(screen.getByRole('button', { name: 'Cape Town' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const houses = cardsFor('sale').find(card => card.dataset.card === 'sale:Houses')!;
    expect(within(houses).getByText('in Cape Town')).toBeInTheDocument();
    expect(new URL(houses.href).searchParams.get('canonicalPlaceId')).toBe(
      capeTown.canonicalPlaceId,
    );
    const offices = cardsFor('sale').find(card => card.dataset.card === 'sale:Offices')!;
    expect(new URL(offices.href).searchParams.get('canonicalPlaceId')).toBe(
      capeTown.canonicalPlaceId,
    );
    expect(screen.getByRole('button', { name: 'Choose or change area' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cape Town' }));
    const cleared = cardsFor('sale').find(card => card.dataset.card === 'sale:Houses')!;
    expect(within(cleared).queryByText('in Cape Town')).toBeNull();
    expect(new URL(cleared.href).searchParams.has('canonicalPlaceId')).toBe(false);
  });

  it('offers the agreed city pills', () => {
    expect(HOME_BROWSE_CITIES.map(city => city.name)).toEqual([
      'Cape Town',
      'Johannesburg',
      'Pretoria',
      'Durban',
      'Bloemfontein',
      'Gqeberha',
      'Polokwane',
      'Kimberley',
      'Mbombela',
      'Mahikeng',
    ]);
    for (const city of HOME_BROWSE_CITIES) {
      expect(city.canonicalPlaceId).toMatch(/^pl-place-01-[0-9a-f]{24}$/);
    }
  });
});
