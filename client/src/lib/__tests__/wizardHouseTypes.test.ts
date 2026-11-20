import { describe, expect, it } from 'vitest';
import {
  HOME_TYPES,
  applyAutoNames,
  classificationFor,
  duplicateUnitType,
  houseTypeCard,
  houseTypeProblems,
  homeTypeOf,
  needsUnitOwnership,
  suggestUnitName,
  withReadyNow,
} from '../wizardHouseTypes';
import { normalizeSubmitUnitTypes } from '../developmentSubmitPayload';
import { residentialSaleWorkflow } from '../workflows/residential-sale';
import { rejectionMessage, kindForFloorPlan, floorPlanRejection } from '../wizardMedia';

// Shape of a real estate's house types (sizes, beds, baths) used only as test fixtures.
const mix = [
  { id: 'a', unitSize: 71, bedrooms: 3, bathrooms: 2 },
  { id: 'b', unitSize: 91, bedrooms: 4, bathrooms: 2 },
  { id: 'c', unitSize: 130, bedrooms: 4, bathrooms: 2.5 },
  { id: 'd', unitSize: 130, bedrooms: 4, bathrooms: 3.5 },
];

describe('house type name suggestion', () => {
  it('uses "{size} m² {beds}-bedroom {home type}"', () => {
    expect(suggestUnitName({ ...mix[0], homeType: 'freestanding' }, [])).toBe('71 m² 3-bedroom house');
    expect(suggestUnitName({ ...mix[0], homeType: 'townhouse' }, [])).toBe('71 m² 3-bedroom townhouse');
    expect(suggestUnitName({ ...mix[0], homeType: 'apartment' }, [])).toBe('71 m² 3-bedroom apartment');
    expect(suggestUnitName({ unitSize: 30, bedrooms: 0, bathrooms: 1, homeType: 'apartment' }, [])).toBe('30 m² studio');
  });

  it('is null until size and bedrooms are known', () => {
    expect(suggestUnitName({ unitSize: 0, bedrooms: 3, homeType: 'freestanding' }, [])).toBeNull();
    expect(suggestUnitName({ unitSize: 90, bedrooms: undefined, homeType: 'freestanding' }, [])).toBeNull();
  });

  it('adds the baths suffix only when another type has the same size and beds', () => {
    const others = (id: string) => mix.filter(m => m.id !== id);
    expect(suggestUnitName({ ...mix[1], homeType: 'freestanding' }, others('b'))).toBe('91 m² 4-bedroom house');
    expect(suggestUnitName({ ...mix[2], homeType: 'freestanding' }, others('c'))).toBe(
      '130 m² 4-bedroom house (2.5 baths)',
    );
    expect(suggestUnitName({ ...mix[3], homeType: 'freestanding' }, others('d'))).toBe(
      '130 m² 4-bedroom house (3.5 baths)',
    );
  });

  it('re-suggests auto names for every type once a collision appears, and leaves custom names alone', () => {
    const first = { id: 'c', name: '130 m² 4-bedroom house', nameAuto: true, ...classificationFor('freestanding'), unitSize: 130, bedrooms: 4, bathrooms: 2.5 };
    const second = { id: 'd', name: 'x', nameAuto: true, ...classificationFor('freestanding'), unitSize: 130, bedrooms: 4, bathrooms: 3.5 };
    const custom = { id: 'e', name: 'The Ebony', nameAuto: false, ...classificationFor('freestanding'), unitSize: 130, bedrooms: 4, bathrooms: 1 };
    const out = applyAutoNames([first, second, custom]);
    expect(out[0].name).toBe('130 m² 4-bedroom house (2.5 baths)');
    expect(out[1].name).toBe('130 m² 4-bedroom house (3.5 baths)');
    expect(out[2].name).toBe('The Ebony');
  });
});

describe('home type', () => {
  it('maps onto the existing classification columns', () => {
    expect(HOME_TYPES.map(h => classificationFor(h.id))).toEqual([
      { unitCategory: 'house', unitSubType: 'freestanding-house', structuralType: 'freestanding-house' },
      { unitCategory: 'house', unitSubType: 'townhouse', structuralType: 'townhouse' },
      { unitCategory: 'apartment', unitSubType: 'apartment', structuralType: 'apartment' },
    ]);
  });

  it('reads legacy classification values', () => {
    expect(homeTypeOf({ unitCategory: 'house', unitSubType: 'duplex' })).toBe('townhouse');
    expect(homeTypeOf({ unitCategory: 'house', unitSubType: 'plot-and-plan' })).toBe('freestanding');
    expect(homeTypeOf({ unitCategory: 'apartment', unitSubType: 'penthouse' })).toBe('apartment');
    expect(homeTypeOf({ specifications: { classification: { category: 'house', subType: 'freestanding-house' } } })).toBe('freestanding');
  });
});

describe('house type card', () => {
  const unit = {
    id: 'u1',
    name: '91 m² 4-bedroom house',
    bedrooms: 4,
    bathrooms: 2,
    unitSize: 91,
    priceFrom: 1930000,
    availableUnits: 50,
    ...classificationFor('freestanding'),
    baseMedia: {
      gallery: [{ id: 'p1', url: 'https://img/1.jpg' }, { id: 'p2', url: 'https://img/2.jpg' }],
      floorPlans: [{ id: 'f1', url: 'https://img/f.pdf' }],
    },
  };

  it('shows name, price, facts, For sale, availability and media count', () => {
    const card = houseTypeCard(unit, 'for_sale');
    expect(card.priceText).toBe('R1,930,000');
    expect(card.facts).toBe('4 beds · 2 baths · 91 m² · Freestanding house');
    expect(card.tags).toEqual(['For sale', '50 available']);
    expect(card.mediaText).toBe('2 photos · 1 floor plan');
    expect(card.coverUrl).toBe('https://img/1.jpg');
  });

  it('shows a price range, Ready now, and only gives availability when supplied', () => {
    const ready = houseTypeCard(withReadyNow({ ...unit, priceTo: 2100000 }, true), 'for_sale');
    expect(ready.priceText).toBe('R1,930,000 – R2,100,000');
    expect(ready.tags).toContain('Ready now');
    const unknown = houseTypeCard({ ...unit, availabilityNotProvided: true }, 'for_sale');
    expect(unknown.tags).toEqual(['For sale']);
    const none = houseTypeCard({ ...unit, availableUnits: 0 }, 'for_sale');
    expect(none.tags).toEqual(['For sale']);
  });

  it('takes the sale/rent tag from the development, not the unit, and uses a placeholder without photos', () => {
    const rent = houseTypeCard({ ...unit, monthlyRentFrom: 12000, baseMedia: undefined }, 'for_rent');
    expect(rent.tags[0]).toBe('To rent');
    expect(rent.priceText).toBe('R12,000 / month');
    expect(rent.coverUrl).toBeNull();
    expect(rent.mediaText).toBe('No photos yet');
  });
});

describe('duplicate', () => {
  it('copies with a new id and a "(copy)" suffix, without sharing media arrays', () => {
    const unit: any = {
      id: 'u1',
      name: '71 m² 3-bedroom house',
      nameAuto: true,
      baseMedia: { gallery: [{ id: 'p1', url: 'x' }], floorPlans: [] },
      extras: [{ label: 'Pool', price: 1 }],
    };
    const copy = duplicateUnitType(unit, 'unit-new');
    expect(copy.id).toBe('unit-new');
    expect(copy.id).not.toBe(unit.id);
    expect(copy.name).toBe('71 m² 3-bedroom house (copy)');
    expect(copy.nameAuto).toBe(false);
    expect(copy.baseMedia.gallery).toEqual(unit.baseMedia.gallery);
    expect(copy.baseMedia.gallery).not.toBe(unit.baseMedia.gallery);
    expect(copy.extras[0]).not.toBe(unit.extras[0]);
  });
});

describe('sale house type payload and readiness', () => {
  const sale = {
    id: 'u1',
    name: '91 m² 4-bedroom house',
    bedrooms: 4,
    bathrooms: 2,
    unitSize: 91,
    priceFrom: 1930000,
    priceTo: 2100000,
    ownershipType: 'sectional-title',
    availableUnits: 50,
    totalUnits: 50,
    ...classificationFor('freestanding'),
  };

  it('keeps price from/to, classification, per-unit ownership and Ready now; no rent or auction fields', () => {
    const [unit] = normalizeSubmitUnitTypes([withReadyNow(sale, true)], 'for_sale');
    expect(unit).toMatchObject({
      name: '91 m² 4-bedroom house',
      basePriceFrom: 1930000,
      basePriceTo: 2100000,
      unitCategory: 'house',
      unitSubType: 'freestanding-house',
      structuralType: 'freestanding-house',
      ownershipType: 'sectional-title',
      availableUnits: 50,
    });
    expect(unit.specifications?.readyNow).toBe(true);
    expect(unit.monthlyRentFrom).toBeUndefined();
    expect(unit.startingBid).toBeUndefined();
  });

  it('drops an ownership value the server does not know', () => {
    const [unit] = normalizeSubmitUnitTypes([{ ...sale, ownershipType: 'share-block' }], 'for_sale');
    expect(unit.ownershipType).toBeUndefined();
  });

  it('asks per-unit ownership only when the development ownership varies', () => {
    expect(needsUnitOwnership(['varies'])).toBe(true);
    expect(needsUnitOwnership('varies')).toBe(true);
    expect(needsUnitOwnership(['full-title'])).toBe(false);
    expect(needsUnitOwnership(undefined)).toBe(false);
  });

  it('reports sale problems per house type', () => {
    const opts = { transaction: 'for_sale', unitOwnershipRequired: false };
    expect(houseTypeProblems(sale, opts)).toEqual([]);
    expect(houseTypeProblems({ ...sale, priceFrom: 0 }, opts)).toContain('91 m² 4-bedroom house needs a price from');
    expect(houseTypeProblems({ ...sale, priceTo: 1000 }, opts)[0]).toMatch(/price to cannot be lower/);
    expect(houseTypeProblems({ ...sale, ownershipType: undefined }, { ...opts, unitOwnershipRequired: true })).toEqual([
      '91 m² 4-bedroom house needs an ownership type',
    ]);
  });

  it('gates the House types step: one type required, ownership when it varies', () => {
    const step = residentialSaleWorkflow.steps.find(s => s.id === 'unit_types')!;
    expect(step.validate({ transactionType: 'for_sale', unitTypes: [] } as any).valid).toBe(false);
    expect(step.validate({ transactionType: 'for_sale', unitTypes: [sale] } as any).valid).toBe(true);
    const varies = step.validate({
      transactionType: 'for_sale',
      ownershipTypes: ['varies'],
      unitTypes: [{ ...sale, ownershipType: undefined }],
    } as any);
    expect(varies.valid).toBe(false);
    expect(varies.errors?.[0].message).toMatch(/ownership/);
  });
});

describe('house type uploads reuse the media rules', () => {
  it('rejects oversize photos and spreadsheets as floor plans, accepts PDF plans', () => {
    const big = { name: 'a.jpg', type: 'image/jpeg', size: 15 * 1024 * 1024 + 1 };
    expect(rejectionMessage(big, 'image')).toBe('a.jpg: too large (max 15 MB).');
    const xlsx = { name: 'plan.xlsx', type: 'application/vnd.ms-excel', size: 10 };
    expect(floorPlanRejection(xlsx)).toMatch(/^plan\.xlsx: Spreadsheets stay private/);
    expect(floorPlanRejection({ name: 'p.docx', type: 'application/msword', size: 10 })).toBe(
      'p.docx: floor plans must be a picture (JPG, PNG, WebP) or a PDF.',
    );
    expect(floorPlanRejection({ name: 'p.pdf', type: 'application/pdf', size: 26 * 1024 * 1024 })).toBe(
      'p.pdf: too large (max 25 MB).',
    );
    const pdf = { name: 'plan.pdf', type: 'application/pdf', size: 1024 };
    expect(kindForFloorPlan(pdf)).toBe('pdf');
    expect(rejectionMessage(pdf, kindForFloorPlan(pdf))).toBeNull();
  });
});
