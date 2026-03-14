import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UnitFloorPlanDialog } from './UnitFloorPlanDialog';

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
    expect(screen.getByText('Unit Snapshot')).toBeInTheDocument();
    expect(screen.getAllByText(/Open-plan kitchen/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Private garden/i)).toBeInTheDocument();
    expect(screen.getByText(/prepaid electricity/i)).toBeInTheDocument();
    expect(screen.getByText('Unit Gallery')).toBeInTheDocument();
    expect(screen.getAllByRole('img').length).toBeGreaterThan(1);
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
