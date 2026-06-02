import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  UnitFloorPlanDialog,
  getUnitFloorPlanPricingContext,
  normalizeUnitFloorPlanTransactionType,
} from './UnitFloorPlanDialog';

const unitFixture = {
  id: 'unit-1',
  name: 'Type A',
  normalizedType: 'Apartment',
  normalizedImage: 'https://example.com/unit-cover.jpg',
  bedrooms: 3,
  bathrooms: 2,
  floorSize: 84,
  landSize: 120,
  parkingType: 'covered',
  parkingBays: 2,
  basePriceFrom: 1299000,
  basePriceTo: 1499000,
  description: 'A well-designed family unit with an open-plan kitchen and dining area.',
  amenities: {
    standard: ['Open-plan kitchen', 'Built-in cupboards'],
    additional: ['Private garden'],
  },
  specifications: {
    builtInFeatures: {
      prepaidElectricity: true,
      solarGeyser: true,
    },
  },
  baseMedia: {
    floorPlans: [{ url: 'https://example.com/floor-plan.jpg' }],
    gallery: [
      { url: 'https://example.com/gallery-1.jpg' },
      { url: 'https://example.com/gallery-2.jpg' },
    ],
  },
};

describe('UnitFloorPlanDialog', () => {
  it('normalizes floor-plan pricing for sale, rent, and auction units', () => {
    expect(normalizeUnitFloorPlanTransactionType('to_rent')).toBe('rent');
    expect(normalizeUnitFloorPlanTransactionType('on-auction')).toBe('auction');
    expect(normalizeUnitFloorPlanTransactionType('development_sale')).toBe('sale');

    expect(getUnitFloorPlanPricingContext(unitFixture)).toMatchObject({
      transactionType: 'sale',
      label: 'Price from',
      from: 1299000,
      to: 1499000,
    });

    expect(
      getUnitFloorPlanPricingContext({
        ...unitFixture,
        transactionType: 'rent',
        monthlyRentFrom: 8750,
        monthlyRentTo: 9500,
        basePriceFrom: 1299000,
      }),
    ).toMatchObject({
      transactionType: 'rent',
      label: 'Monthly rent',
      from: 8750,
      to: 9500,
    });

    expect(
      getUnitFloorPlanPricingContext({
        ...unitFixture,
        transactionType: 'auction',
        startingBid: 850000,
        reservePrice: 980000,
        basePriceFrom: 1299000,
      }),
    ).toMatchObject({
      transactionType: 'auction',
      label: 'Starting bid',
      from: 850000,
      to: 980000,
    });
  });

  it('renders floor plan preview, unit particulars, amenities, and gallery', () => {
    render(
      <UnitFloorPlanDialog
        open
        onOpenChange={() => {}}
        developmentName="Cosmopolitan Projects"
        unit={unitFixture}
        onRequestInformation={() => {}}
        onRequestCallback={() => {}}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Type A')).toBeInTheDocument();
    expect(screen.getByText('Cosmopolitan Projects')).toBeInTheDocument();
    expect(screen.getByText('Conversion Snapshot')).toBeInTheDocument();
    expect(screen.getByText('Price from')).toBeInTheDocument();
    expect(screen.getByText('Unit Details')).toBeInTheDocument();
    expect(screen.getAllByText(/Open-plan kitchen/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Private garden/i)).toBeInTheDocument();
    expect(screen.getByText(/prepaid electricity/i)).toBeInTheDocument();
    expect(screen.getByText('Unit Gallery')).toBeInTheDocument();
    expect(screen.getAllByRole('img').length).toBeGreaterThan(1);
  });

  it('renders rent and auction pricing labels from transaction-specific fields', () => {
    const { rerender } = render(
      <UnitFloorPlanDialog
        open
        onOpenChange={() => {}}
        developmentName="Cosmopolitan Projects"
        unit={{
          ...unitFixture,
          transactionType: 'rent',
          monthlyRentFrom: 8750,
          monthlyRentTo: 9500,
          basePriceFrom: 1299000,
        }}
        onRequestInformation={() => {}}
        onRequestCallback={() => {}}
      />,
    );

    expect(screen.getByText('Monthly rent')).toBeInTheDocument();
    expect(screen.getByText(/R8\.8k/i)).toBeInTheDocument();
    expect(screen.getByText(/up to R9\.5k/i)).toBeInTheDocument();

    rerender(
      <UnitFloorPlanDialog
        open
        onOpenChange={() => {}}
        developmentName="Cosmopolitan Projects"
        unit={{
          ...unitFixture,
          transactionType: 'auction',
          startingBid: 850000,
          reservePrice: 980000,
          basePriceFrom: 1299000,
        }}
        onRequestInformation={() => {}}
        onRequestCallback={() => {}}
      />,
    );

    expect(screen.getByText('Starting bid')).toBeInTheDocument();
    expect(screen.getByText(/R850k/i)).toBeInTheDocument();
    expect(screen.getByText(/up to R980k/i)).toBeInTheDocument();
  });

  it('invokes the request handlers from the conversion dialog actions', () => {
    const onRequestInformation = vi.fn();
    const onRequestCallback = vi.fn();

    render(
      <UnitFloorPlanDialog
        open
        onOpenChange={() => {}}
        developmentName="Cosmopolitan Projects"
        unit={unitFixture}
        onRequestInformation={onRequestInformation}
        onRequestCallback={onRequestCallback}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /request information/i }));
    fireEvent.click(screen.getByRole('button', { name: /request callback/i }));

    expect(onRequestInformation).toHaveBeenCalledWith(unitFixture);
    expect(onRequestCallback).toHaveBeenCalledWith(unitFixture);
  });
});
