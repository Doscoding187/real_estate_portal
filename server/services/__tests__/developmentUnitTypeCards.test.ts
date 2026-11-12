import { describe, expect, it } from 'vitest';

import {
  developmentUnitTypeCards,
  mixListingsAndUnitTypes,
} from '../developmentUnitTypeCards';
import type { PublicDevelopmentSearchItem } from '../../../shared/publicDevelopmentSearch';

function unit(over: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    label: 'Apartment',
    bedrooms: 2,
    bathrooms: 1,
    priceFrom: 1250000,
    priceTo: 1500000,
    availableUnits: 4,
    totalUnits: 10,
    availabilityState: 'available',
    unitSize: 58,
    ...over,
  };
}

function development(over: Partial<PublicDevelopmentSearchItem> = {}, units: any[] = [unit()]) {
  return {
    id: 7,
    name: 'Oak Gardens',
    slug: 'oak-gardens',
    canonicalRoute: '/development/oak-gardens',
    description: null,
    images: ['https://img/a.jpg', 'https://img/b.jpg'],
    canonicalPlaceId: 'pl-place-01-000000000000000000000001',
    locationLabels: ['Sandton'],
    developmentType: 'residential',
    transactionType: 'for_sale',
    status: 'selling',
    nature: 'new',
    completionDate: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    isFeatured: false,
    rating: null,
    highlights: [],
    publisher: { id: 3, name: 'Acme Dev', logoUrl: null, authorityKind: 'developer_first_party' },
    priceFrom: 1250000,
    priceTo: 1500000,
    bedroomRange: { min: 2, max: 2 },
    unitTypes: units,
    unitTypeCount: units.length,
    availableUnitTypeCount: units.length,
    availableUnits: 4,
    totalUnits: 10,
    availabilityState: 'available',
    ...over,
  } as PublicDevelopmentSearchItem;
}

describe('developmentUnitTypeCards', () => {
  it('maps an available sale unit type to a card with its own title, price, size and link', () => {
    const [card] = developmentUnitTypeCards(development(), { listingType: 'sale' });
    expect(card).toMatchObject({
      kind: 'development',
      id: '7:u1',
      href: '/development/oak-gardens/unit/u1',
      title: '2-bed Apartment',
      price: 1250000,
      bedrooms: 2,
      bathrooms: 1,
      area: 58,
      image: 'https://img/a.jpg',
      developmentId: 7,
      unitTypeId: 'u1',
      development: { id: 7, name: 'Oak Gardens', slug: 'oak-gardens' },
    });
    expect(card.unitType.developmentName).toBe('Oak Gardens');
  });

  it('sends yard size, parking and the unit row structural type when present', () => {
    const item = development({}, [unit({ yardSize: 120, parkingBays: 2, structuralType: 'duplex' })]);
    const [card] = developmentUnitTypeCards(item, { listingType: 'sale' });
    expect(card.unitType).toMatchObject({
      yardSizeM2: 120,
      parking: 2,
      structuralType: 'duplex',
      availableUnits: 4,
    });
  });

  it('sends null for yard, parking and structural type when null, zero or absent', () => {
    const item = development({}, [
      unit({ id: 'n', yardSize: null, parkingBays: 0, structuralType: null }),
      unit({ id: 'a' }),
    ]);
    const cards = developmentUnitTypeCards(item, { listingType: 'sale' });
    for (const card of cards) {
      expect(card.unitType.yardSizeM2).toBeNull();
      expect(card.unitType.parking).toBeNull();
      expect(card.unitType.structuralType).toBeNull();
      expect(card.unitType.availableUnits).toBe(4);
    }
  });

  it('uses the rent price for rent developments and drops sale developments for a rent request', () => {
    const rent = development({ transactionType: 'for_rent' }, [unit({ priceFrom: 9500 })]);
    expect(developmentUnitTypeCards(rent, { listingType: 'rent' })[0].price).toBe(9500);
    expect(developmentUnitTypeCards(rent, { listingType: 'sale' })).toEqual([]);
    expect(developmentUnitTypeCards(development(), { listingType: 'rent' })).toEqual([]);
  });

  it('excludes unit types with no price and unit types that are not available', () => {
    const item = development({}, [
      unit({ id: 'a', priceFrom: null }),
      unit({ id: 'b', priceFrom: 0 }),
      unit({ id: 'c', availabilityState: 'sold_out', availableUnits: 0 }),
      unit({ id: 'd', availabilityState: 'not_stated', availableUnits: null }),
      unit({ id: 'e' }),
    ]);
    expect(developmentUnitTypeCards(item, { listingType: 'sale' }).map(c => c.unitTypeId)).toEqual([
      'e',
    ]);
  });

  it('requires the development image only when requirePhoto is set', () => {
    const noPhoto = development({ images: [] });
    expect(developmentUnitTypeCards(noPhoto, { listingType: 'sale', requirePhoto: true })).toEqual(
      [],
    );
    expect(developmentUnitTypeCards(noPhoto, { listingType: 'sale' })).toHaveLength(1);
    expect(
      developmentUnitTypeCards(development(), { listingType: 'sale', requirePhoto: true }),
    ).toHaveLength(1);
  });
});

const OPTS = { limit: 10, maxPerDevelopment: 2, maxUnitTypesWhenListingsAtLeast6: 4 };
const listings = (n: number) => Array.from({ length: n }, (_, i) => `L${i + 1}`);
const units = (perDev: number, devs: number) =>
  Array.from({ length: devs }, (_, d) =>
    Array.from({ length: perDev }, (_, i) => ({ developmentId: d + 1, tag: `U${d + 1}.${i + 1}` })),
  ).flat();
const tag = (x: any) => (typeof x === 'string' ? x : x.tag);

describe('mixListingsAndUnitTypes', () => {
  it('returns only unit types, up to the limit, when there are no listings', () => {
    const out = mixListingsAndUnitTypes([], units(2, 8), OPTS);
    expect(out).toHaveLength(10);
    expect(out.every(x => typeof x !== 'string')).toBe(true);
  });

  it('allows at most 2 unit types per development', () => {
    const out = mixListingsAndUnitTypes([], units(5, 2), OPTS);
    expect(out.map(tag)).toEqual(['U1.1', 'U1.2', 'U2.1', 'U2.2']);
  });

  it('caps unit types at 4 of 10 when 6 or more listings exist', () => {
    const out = mixListingsAndUnitTypes(listings(12), units(2, 8), OPTS);
    expect(out).toHaveLength(10);
    expect(out.filter(x => typeof x !== 'string')).toHaveLength(4);
    expect(out.filter(x => typeof x === 'string')).toHaveLength(6);
  });

  it('does not apply the 4-cap below 6 listings', () => {
    const out = mixListingsAndUnitTypes(listings(5), units(2, 8), OPTS);
    expect(out).toHaveLength(10);
    expect(out.filter(x => typeof x !== 'string')).toHaveLength(5);
  });

  it('keeps listing order and spreads unit types through the result', () => {
    const out = mixListingsAndUnitTypes(listings(12), units(2, 8), OPTS).map(tag);
    expect(out).toEqual(['L1', 'L2', 'U1.1', 'L3', 'U1.2', 'L4', 'L5', 'U2.1', 'L6', 'U2.2']);
    expect(out.filter(t => t.startsWith('L'))).toEqual(listings(6));
  });

  it('fills from listings when there are too few unit types', () => {
    const out = mixListingsAndUnitTypes(listings(12), units(1, 1), OPTS);
    expect(out).toHaveLength(10);
    expect(out.filter(x => typeof x !== 'string')).toHaveLength(1);
  });
});
