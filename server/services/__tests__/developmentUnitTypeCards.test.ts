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

const OPTS = { limit: 10 };
const listings = (n: number) => Array.from({ length: n }, (_, i) => `L${i + 1}`);
const units = (perDev: number, devs: number) =>
  Array.from({ length: devs }, (_, d) =>
    Array.from({ length: perDev }, (_, i) => ({ developmentId: d + 1, tag: `U${d + 1}.${i + 1}` })),
  ).flat();
const tag = (x: any) => (typeof x === 'string' ? x : x.tag);

describe('developmentUnitTypeCards filters (unit facts, not the development range)', () => {
  const item = () =>
    development({}, [
      unit({ id: 'cheap', priceFrom: 900_000, bedrooms: 1, structuralType: 'apartment' }),
      unit({ id: 'mid', priceFrom: 1_500_000, bedrooms: 2, structuralType: 'townhouse' }),
      unit({ id: 'dear', priceFrom: 3_000_000, bedrooms: 3, structuralType: 'freestanding-house' }),
      unit({ id: 'nobeds', priceFrom: 1_600_000, bedrooms: null, structuralType: null }),
    ]);
  const ids = (filters: Parameters<typeof developmentUnitTypeCards>[1]['filters']) =>
    developmentUnitTypeCards(item(), { listingType: 'sale', filters }).map(c => c.unitTypeId);

  it('applies price to each unit type price, so a development range cannot hide or admit a unit', () => {
    expect(ids({ minPrice: 1_400_000, maxPrice: 2_000_000 })).toEqual(['mid', 'nobeds']);
    expect(ids({ maxPrice: 1_000_000 })).toEqual(['cheap']);
  });

  it('applies bedrooms to each unit type and never matches an unrecorded bedroom count', () => {
    expect(ids({ minBedrooms: 2 })).toEqual(['mid', 'dear']);
    expect(ids({ minBedrooms: 1, maxBedrooms: 1 })).toEqual(['cheap']);
  });

  it('matches a property type only through the unit own structural type', () => {
    expect(ids({ propertyType: 'apartment' })).toEqual(['cheap']);
    expect(ids({ propertyType: 'house' })).toEqual(['dear']);
    expect(ids({ propertyType: 'townhouse' })).toEqual(['mid']);
  });

  it('returns every available priced unit when no filter is set', () => {
    expect(ids(undefined)).toEqual(['cheap', 'mid', 'dear', 'nobeds']);
  });
});

describe('mixListingsAndUnitTypes', () => {
  it('returns only unit types, up to the limit, when there are no listings', () => {
    const out = mixListingsAndUnitTypes([], units(2, 8), OPTS);
    expect(out).toHaveLength(10);
    expect(out.every(x => typeof x !== 'string')).toBe(true);
  });

  it('keeps all unit types from one development when they fit in the rail', () => {
    const out = mixListingsAndUnitTypes([], units(5, 2), OPTS);
    expect(out.map(tag)).toEqual([
      'U1.1',
      'U1.2',
      'U1.3',
      'U1.4',
      'U1.5',
      'U2.1',
      'U2.2',
      'U2.3',
      'U2.4',
      'U2.5',
    ]);
  });

  it('allocates the rail proportionally when both sources have more than 10 results', () => {
    const out = mixListingsAndUnitTypes(listings(12), units(2, 8), OPTS);
    expect(out).toHaveLength(10);
    expect(out.filter(x => typeof x !== 'string')).toHaveLength(6);
    expect(out.filter(x => typeof x === 'string')).toHaveLength(4);
  });

  it('includes every eligible card when the combined sources fit the rail', () => {
    const out = mixListingsAndUnitTypes(listings(5), units(1, 5), OPTS);
    expect(out).toHaveLength(10);
    expect(out.filter(x => typeof x === 'string')).toHaveLength(5);
    expect(out.filter(x => typeof x !== 'string')).toHaveLength(5);
  });

  it('keeps listing order and spreads unit types through the result', () => {
    const out = mixListingsAndUnitTypes(listings(12), units(2, 8), OPTS).map(tag);
    expect(out).toHaveLength(10);
    expect(out.filter(t => t.startsWith('L'))).toEqual(listings(4));
    expect(out.filter(t => t.startsWith('U'))).toEqual([
      'U1.1',
      'U1.2',
      'U2.1',
      'U2.2',
      'U3.1',
      'U3.2',
    ]);
  });

  it('fills from listings when there are too few unit types', () => {
    const out = mixListingsAndUnitTypes(listings(12), units(1, 1), OPTS);
    expect(out).toHaveLength(10);
    expect(out.filter(x => typeof x !== 'string')).toHaveLength(1);
  });
});
