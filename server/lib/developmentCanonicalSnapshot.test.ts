import { describe, expect, it } from 'vitest';

import {
  buildDevelopmentCanonicalEditSnapshot,
  stripInactiveCanonicalUnitFields,
} from './developmentCanonicalSnapshot';
import { buildCanonicalStepDataFromDevelopmentSnapshot } from '../../shared/developmentCanonicalSelectors';

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const baseDev = {
  id: 101,
  name: 'Canonical Snapshot Development',
  description: 'A canonical edit snapshot.',
  city: 'Cape Town',
  province: 'Western Cape',
  developmentType: 'residential',
  transactionType: 'for_sale',
  status: 'selling',
  nature: 'new',
  images: '[]',
};

describe('development canonical edit snapshot', () => {
  it('reconstructs keyed workflow step data from the canonical development snapshot', () => {
    const stepData = buildCanonicalStepDataFromDevelopmentSnapshot(
      {
        developmentType: 'residential',
        transactionType: 'for_sale',
        name: 'Shared Step Builder',
        subtitle: 'Shared subtitle',
        status: 'selling',
        nature: 'new',
        ownershipTypes: ['sectional-title'],
        launchDate: '2026-09-01',
        completionDate: '2027-07-31',
        monthlyLevyFrom: 1_250,
        monthlyLevyTo: 1_750,
        ratesFrom: 950,
        ratesTo: 1_200,
        transferCostsIncluded: true,
        amenities: ['Pool'],
        features: ['Solar ready'],
        description: 'Canonical description.',
        tagline: 'Canonical tagline',
        highlights: ['Sea views'],
        location: {
          address: '8 Canonical Lane',
          city: 'Cape Town',
          province: 'Western Cape',
        },
        media: {
          heroImage: { url: 'https://example.com/hero.jpg' },
          photos: [{ url: 'https://example.com/photo.jpg' }],
          videos: [{ url: 'https://example.com/video.mp4' }],
          floorPlans: [{ url: 'https://example.com/floorplan.pdf' }],
          documents: [{ url: 'https://example.com/brochure.pdf' }],
        },
      },
      [{ id: 'unit-1', name: 'Type A' }],
    );

    expect(stepData).toMatchObject({
      configuration: {
        developmentType: 'residential',
        transactionType: 'for_sale',
      },
      identity_market: {
        name: 'Shared Step Builder',
        subtitle: 'Shared subtitle',
        status: 'selling',
        nature: 'new',
        ownershipTypes: ['sectional-title'],
      },
      location: {
        address: '8 Canonical Lane',
        city: 'Cape Town',
        province: 'Western Cape',
      },
      governance_finances: {
        levyRange: { min: 1_250, max: 1_750 },
        rightsAndTaxes: { min: 950, max: 1_200 },
        transferCostsIncluded: true,
      },
      amenities_features: {
        amenities: ['Pool'],
        features: ['Solar ready'],
      },
      marketing_summary: {
        description: 'Canonical description.',
        tagline: 'Canonical tagline',
        keySellingPoints: ['Sea views'],
      },
      development_media: {
        heroImage: { url: 'https://example.com/hero.jpg' },
        photos: [{ url: 'https://example.com/photo.jpg' }],
        videos: [{ url: 'https://example.com/video.mp4' }],
        floorPlans: [{ url: 'https://example.com/floorplan.pdf' }],
        documents: [{ url: 'https://example.com/brochure.pdf' }],
      },
      unit_types: {
        unitTypes: [{ id: 'unit-1', name: 'Type A' }],
      },
    });
  });

  it('keeps sale pricing as canonical unit ownership and strips inactive rent/auction fields', () => {
    const unit = stripInactiveCanonicalUnitFields(
      {
        id: 'sale-unit',
        basePriceFrom: '1500000.00',
        basePriceTo: '1700000.00',
        monthlyRentFrom: '15000.00',
        startingBid: '900000.00',
      },
      'for_sale',
    );

    expect(unit).toMatchObject({
      id: 'sale-unit',
      basePriceFrom: '1500000.00',
      basePriceTo: '1700000.00',
    });
    expect(unit).not.toHaveProperty('monthlyRentFrom');
    expect(unit).not.toHaveProperty('startingBid');
  });

  it('builds a rental edit snapshot with keyed workflow state and canonical step units', () => {
    const snapshot = buildDevelopmentCanonicalEditSnapshot({
      dev: {
        ...baseDev,
        transactionType: 'for_rent',
        propertyTypes: JSON.stringify(['apartment']),
        monthlyRentFrom: '14500.00',
        monthlyRentTo: '18000.00',
      },
      media: {
        heroImage: { url: 'https://example.com/rental.jpg' },
        photos: [{ url: 'https://example.com/rental.jpg' }],
        videos: [],
        documents: [],
      },
      amenities: ['Pool'],
      highlights: ['No transfer duty'],
      features: [],
      unitTypes: [
        {
          id: 'rent-unit',
          name: 'Rental Type',
          monthlyRentFrom: '14500.00',
          monthlyRentTo: '18000.00',
          basePriceFrom: '1500000.00',
          startingBid: '900000.00',
        },
      ],
      parseJson,
    });

    expect(snapshot.workflowId).toBe('residential_rent');
    expect(snapshot.completedSteps).toContain('unit_types');
    expect(snapshot.developmentData).toMatchObject({
      transactionType: 'for_rent',
      propertyTypes: ['apartment'],
      location: {
        city: 'Cape Town',
        province: 'Western Cape',
      },
    });
    expect(snapshot.stepData.unit_types.unitTypes[0]).toMatchObject({
      id: 'rent-unit',
      monthlyRentFrom: '14500.00',
      monthlyRentTo: '18000.00',
    });
    expect(snapshot.stepData.unit_types.unitTypes[0]).not.toHaveProperty('basePriceFrom');
    expect(snapshot.stepData.unit_types.unitTypes[0]).not.toHaveProperty('startingBid');
  });

  it('builds an auction edit snapshot without sale or rental pricing drift', () => {
    const snapshot = buildDevelopmentCanonicalEditSnapshot({
      dev: {
        ...baseDev,
        transactionType: 'auction',
        isPublished: 1,
      },
      media: { photos: [], videos: [], documents: [] },
      amenities: [],
      highlights: [],
      features: [],
      unitTypes: [
        {
          id: 'auction-unit',
          name: 'Auction Type',
          startingBid: '1200000.00',
          reservePrice: '1400000.00',
          basePriceFrom: '2100000.00',
          monthlyRentFrom: '19000.00',
        },
      ],
      parseJson,
    });

    expect(snapshot.workflowId).toBe('residential_auction');
    expect(snapshot.currentStepId).toBe('review_publish');
    expect(snapshot.stepData.unit_types.unitTypes[0]).toMatchObject({
      id: 'auction-unit',
      startingBid: '1200000.00',
      reservePrice: '1400000.00',
    });
    expect(snapshot.stepData.unit_types.unitTypes[0]).not.toHaveProperty('basePriceFrom');
    expect(snapshot.stepData.unit_types.unitTypes[0]).not.toHaveProperty('monthlyRentFrom');
  });

  it('uses persisted backfilled workflow state instead of recomputing progress heuristics', () => {
    const snapshot = buildDevelopmentCanonicalEditSnapshot({
      dev: {
        ...baseDev,
        workflowId: 'residential_sale',
        currentStepId: 'development_media',
        completedSteps: JSON.stringify([
          'configuration',
          'identity_market',
          'location',
          'governance_finances',
          'amenities_features',
          'marketing_summary',
        ]),
        monthlyLevyFrom: null,
        ratesFrom: null,
        transferCostsIncluded: 0,
        description: 'A backfilled row should keep persisted workflow progress.',
      },
      media: { photos: [{ url: 'https://example.com/backfilled.jpg' }], videos: [], documents: [] },
      amenities: [],
      highlights: [],
      features: [],
      unitTypes: [{ id: 'backfilled-unit', name: 'Backfilled Type' }],
      parseJson,
    });

    expect(snapshot.workflowId).toBe('residential_sale');
    expect(snapshot.currentStepId).toBe('development_media');
    expect(snapshot.completedSteps).toEqual([
      'configuration',
      'identity_market',
      'location',
      'governance_finances',
      'amenities_features',
      'marketing_summary',
    ]);
    expect(snapshot.unitTypes[0]).toMatchObject({ id: 'backfilled-unit' });
  });
});
