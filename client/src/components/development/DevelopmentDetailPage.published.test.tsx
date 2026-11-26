import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ListingNavbar', () => ({ ListingNavbar: () => <nav /> }));
vi.mock('@/components/Footer', () => ({ Footer: () => <footer /> }));

import { DevelopmentDetailPage } from './DevelopmentDetailPage';
import { buildPublishedFacts } from '@/lib/publicDevelopmentFacts';
import { sortHouseTypes } from '@/lib/houseTypes';

const unit = (id: string, size: number, beds: number, baths: number, price: number, extra: any = {}) => ({
  id,
  name: `${size} m² ${beds}-bedroom house${extra.suffix ?? ''}`,
  floorSize: size,
  parkingLabel: extra.parkingLabel ?? null,
  publicFacts: { priceFrom: price, availableUnits: 50, bedrooms: beds, bathrooms: baths },
});

// Baltimore-like house types, deliberately out of order, with two 130 m² types.
const units = sortHouseTypes([
  unit('g', 155, 4, 3.5, 2445000),
  unit('d', 130, 4, 3.5, 2195000, { suffix: ' (3.5 baths)', parkingLabel: 'Carport · 2 bays' }),
  unit('a', 71, 3, 2, 1745000),
  unit('c', 130, 4, 2.5, 2195000, { suffix: ' (2.5 baths)' }),
  unit('b', 91, 4, 2, 1930000),
]);

const facts = buildPublishedFacts({
  estateSpecs: JSON.stringify({
    setting: 'estate',
    estateType: 'lifestyle',
    phaseLabel: 'Phase 2',
    salesStage: 'off_plan',
    handoverInPhases: true,
    firstHandoverDate: '2027-03-01',
    hasHOA: true,
    governanceType: 'hoa',
    levyRange: { min: 0, max: 0 },
    rightsAndTaxes: { min: 0, max: 0 },
  }),
  highlights: ['Security estate', 'Full title', 'Controlled access', 'Near schools', 'Pet friendly'],
  status: 'selling',
  completionDate: '2029-12-01',
});

const baseProps: any = {
  name: 'Baltimore Lifestyle Estate',
  location: 'North Riding, Johannesburg',
  description: 'A long description of the estate that is not the tagline.',
  heroSubtitle: 'Freestanding family homes',
  publishedFacts: facts,
  heroImage: 'https://cdn/c.jpg',
  priceFrom: 1745000,
  priceLabel: 'From R1,745,000',
  startingPriceLabel: 'R1,745,000',
  status: 'selling',
  developmentType: 'Residential',
  ownership: 'Full Title',
  amenities: ['Swimming pool'],
  amenityGroups: { security: [], recreation: [], homeFeatures: [], additional: [] },
  galleryImages: Array.from({ length: 8 }, (_, i) => ({ url: `https://cdn/${i}.jpg`, category: 'general', index: i })),
  photoCount: 8,
  videoCount: 0,
  floorPlanCount: 0,
  videoGalleryIndex: 0,
  units,
  developerName: 'Cosmopolitan Projects',
  brochureAvailable: false,
  onDevelopmentLeadRequest: vi.fn(),
  onOpenGallery: vi.fn(),
  onOpenUnit: vi.fn(),
  onEnquireUnit: vi.fn(),
  onRequestFullAssessment: vi.fn(),
  onRequestUpdates: vi.fn(),
  onEnquire: vi.fn(),
};

describe('the public development page shows what was published', () => {
  it('shows the tagline under the name, the real gallery count, and no hard-coded copy', () => {
    render(<DevelopmentDetailPage {...baseProps} />);
    expect(screen.getByText('Freestanding family homes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View gallery \(8\)/ })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Contemporary family homes in a secure/);
  });

  it('shows no tagline line when none was entered', () => {
    render(<DevelopmentDetailPage {...baseProps} heroSubtitle={null} />);
    expect(screen.queryByText('Freestanding family homes')).toBeNull();
    expect(document.body.textContent).not.toMatch(/Contemporary family homes/);
  });

  it('shows the phase, the handover timeline, the estate type and every highlight', () => {
    render(<DevelopmentDetailPage {...baseProps} />);
    expect(screen.getAllByText(/Now Selling · Phase 2/).length).toBeGreaterThan(0);
    expect(screen.getByTestId('hero-timeline').textContent).toBe(
      'First homes handed over from Mar 2027 · final completion Dec 2029',
    );
    expect(screen.getByText('Security estate · Lifestyle estate')).toBeInTheDocument();
    const chips = within(screen.getByTestId('development-highlights')).getAllByRole('listitem');
    expect(chips.map(c => c.textContent)).toEqual([
      'Security estate',
      'Full title',
      'Controlled access',
      'Near schools',
      'Pet friendly',
    ]);
  });

  it('leaves out monthly costs that were not given: pending, never R0', () => {
    render(<DevelopmentDetailPage {...baseProps} />);
    expect(screen.queryByTestId('cost-levy')).toBeNull();
    expect(screen.queryByTestId('cost-rates')).toBeNull();
    expect(screen.getByText('Monthly levy pending')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\bR\s?0(?![\d\s,.]*\d)/);
  });

  it('shows the costs that were given, with the levy type, and adds them to the monthly total', () => {
    const given = buildPublishedFacts({
      estateSpecs: { hasHOA: true, governanceType: 'body_corporate', levyRange: { min: 1500, max: 1500 }, rightsAndTaxes: { min: 2000, max: 2000 } },
      highlights: [],
    });
    render(<DevelopmentDetailPage {...baseProps} publishedFacts={given} />);
    expect(screen.getByText('Body corporate levy')).toBeInTheDocument();
    // \s also matches the non-breaking spaces locale-formatted currency uses.
    expect(screen.getByTestId('cost-levy').textContent).toMatch(/R\s?1\s?500 \(estimate\)/);
    expect(screen.getByTestId('cost-rates').textContent).toMatch(/R\s?2\s?000 \(estimate\)/);
    expect(screen.queryByText('Monthly levy pending')).toBeNull();
    expect(screen.getByTestId('cost-total').textContent).not.toMatch(/levy|rates/);
  });

  it('lists house types cheapest first and never shows two identical chips', () => {
    render(<DevelopmentDetailPage {...baseProps} />);
    expect(units.map((u: any) => u.id)).toEqual(['a', 'b', 'c', 'd', 'g']);
    const selector = screen.getAllByRole('group', { name: 'Select a home type' })[0];
    const labels = within(selector).getAllByRole('button').map(b => b.textContent);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels).toContain('130 m² · 2.5 bath');
    expect(labels).toContain('130 m² · 3.5 bath');
    expect(labels[0]).toBe('71 m²');
  });
});
