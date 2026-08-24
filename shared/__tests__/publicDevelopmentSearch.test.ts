import { describe, expect, it } from 'vitest';
import {
  countUnpricedHiddenByPriceFilter,
  filterPublicDevelopmentSearchItems,
  paginatePublicDevelopmentSearchItems,
  projectPublicDevelopmentFacts,
  sortPublicDevelopmentSearchItems,
  type PublicDevelopmentProjectionDevelopment,
  type PublicDevelopmentProjectionUnit,
  type PublicDevelopmentSearchItem,
} from '../publicDevelopmentSearch';

function projectionDevelopment(
  overrides: Partial<PublicDevelopmentProjectionDevelopment> = {},
): PublicDevelopmentProjectionDevelopment {
  return {
    id: 7,
    name: 'Greenstone Ridge',
    slug: 'greenstone-ridge',
    description: null,
    images: [],
    city: 'Johannesburg',
    suburb: 'Greenstone Hill',
    province: 'Gauteng',
    developmentType: 'residential',
    transactionType: 'for_sale',
    status: 'selling',
    nature: 'new',
    completionDate: null,
    createdAt: '2026-08-10T00:00:00.000Z',
    isFeatured: 0,
    rating: null,
    highlights: [],
    canonicalRoute: '/development/greenstone-ridge',
    cataloguePublisherId: 21,
    publisherName: 'Greenstone Homes',
    publisherLogoUrl: null,
    publisherAuthorityKind: 'developer_first_party',
    ...overrides,
  };
}

function projectionUnit(
  overrides: Partial<PublicDevelopmentProjectionUnit> = {},
): PublicDevelopmentProjectionUnit {
  return {
    id: 'unit-2-bed',
    name: '2 Bed Apartment',
    label: '2 Bed Apartment',
    bedrooms: 2,
    bathrooms: 1,
    basePriceFrom: 1299000,
    basePriceTo: 1399000,
    monthlyRentFrom: null,
    monthlyRentTo: null,
    totalUnits: 8,
    availableUnits: 4,
    reservedUnits: 0,
    ...overrides,
  };
}

function development(
  overrides: Partial<PublicDevelopmentSearchItem> = {},
): PublicDevelopmentSearchItem {
  return {
    id: 1,
    name: 'Greenstone Ridge',
    slug: 'greenstone-ridge',
    canonicalRoute: '/development/greenstone-ridge',
    description: 'A published development.',
    images: [],
    city: 'Johannesburg',
    suburb: 'Greenstone Hill',
    province: 'Gauteng',
    developmentType: 'residential',
    transactionType: 'for_sale',
    status: 'selling',
    nature: 'new',
    completionDate: null,
    createdAt: '2026-08-10T00:00:00.000Z',
    isFeatured: false,
    rating: null,
    highlights: [],
    publisher: {
      id: 21,
      name: 'Greenstone Homes',
      logoUrl: null,
      authorityKind: 'developer_first_party',
    },
    priceFrom: 1299000,
    priceTo: 1899000,
    bedroomRange: { min: 2, max: 3 },
    unitTypes: [
      {
        id: 'unit-2-bed',
        label: '2 Bed Apartment',
        bedrooms: 2,
        bathrooms: 1,
        priceFrom: 1299000,
        priceTo: 1399000,
        availableUnits: 4,
        totalUnits: 8,
        availabilityState: 'available',
      },
      {
        id: 'unit-3-bed',
        label: '3 Bed Apartment',
        bedrooms: 3,
        bathrooms: 2,
        priceFrom: 1699000,
        priceTo: 1899000,
        availableUnits: 0,
        totalUnits: 6,
        availabilityState: 'sold_out',
      },
    ],
    unitTypeCount: 2,
    availableUnitTypeCount: 1,
    availableUnits: 4,
    totalUnits: 14,
    availabilityState: 'available',
    ...overrides,
  };
}

describe('public development search projection contract', () => {
  it('projects one publisher-first development with active unit-aware facts', () => {
    const item = projectPublicDevelopmentFacts(projectionDevelopment(), [
      projectionUnit(),
      projectionUnit({
        id: 'unit-3-bed',
        name: '3 Bed Apartment',
        bedrooms: 3,
        totalUnits: 6,
        availableUnits: 0,
      }),
    ]);

    expect(item).toMatchObject({
      id: 7,
      transactionType: 'for_sale',
      priceFrom: 1299000,
      bedroomRange: { min: 2, max: 3 },
      publisher: {
        id: 21,
        name: 'Greenstone Homes',
        authorityKind: 'developer_first_party',
      },
      availabilityState: 'available',
    });
    expect(item?.unitTypes).toHaveLength(2);
    expect(item?.unitTypeCount).toBe(2);
  });

  it('uses rental unit pricing and never falls back to sale pricing', () => {
    const item = projectPublicDevelopmentFacts(
      projectionDevelopment({ transactionType: 'for_rent' }),
      [
        projectionUnit({
          basePriceFrom: 2400000,
          basePriceTo: 2500000,
          monthlyRentFrom: 18000,
          monthlyRentTo: 22000,
        }),
      ],
    );

    expect(item).toMatchObject({
      transactionType: 'for_rent',
      priceFrom: 18000,
      priceTo: 22000,
    });
    expect(item?.unitTypes[0]).toMatchObject({ priceFrom: 18000, priceTo: 22000 });
  });

  it('keeps missing price and inventory explicitly unknown', () => {
    const item = projectPublicDevelopmentFacts(projectionDevelopment(), [
      projectionUnit({
        basePriceFrom: null,
        basePriceTo: null,
        totalUnits: null,
        availableUnits: null,
      }),
    ]);

    expect(item).toMatchObject({
      priceFrom: null,
      priceTo: null,
      availableUnits: null,
      totalUnits: null,
      availabilityState: 'not_stated',
    });
    expect(item?.unitTypes[0]).toMatchObject({
      priceFrom: null,
      priceTo: null,
      availableUnits: null,
      totalUnits: null,
      availabilityState: 'not_stated',
    });
  });

  it('represents known zero inventory as sold out without changing eligibility', () => {
    const item = projectPublicDevelopmentFacts(projectionDevelopment(), [
      projectionUnit({ totalUnits: 8, availableUnits: 0 }),
    ]);

    expect(item?.availabilityState).toBe('sold_out');
    expect(item?.availableUnits).toBe(0);
    expect(item?.unitTypes[0].availabilityState).toBe('sold_out');
  });

  it('preserves reference attribution and fails closed without governed publisher identity', () => {
    const reference = projectPublicDevelopmentFacts(
      projectionDevelopment({
        publisherAuthorityKind: 'platform_reference',
        publisherSourceAttribution: 'Property Listify catalogue',
      }),
      [projectionUnit()],
    );
    const missingPublisher = projectPublicDevelopmentFacts(
      projectionDevelopment({ publisherName: null }),
      [projectionUnit()],
    );
    const unsupportedTransaction = projectPublicDevelopmentFacts(
      projectionDevelopment({ transactionType: 'auction' }),
      [projectionUnit()],
    );

    expect(reference?.publisher).toMatchObject({
      authorityKind: 'platform_reference',
      sourceAttribution: 'Property Listify catalogue',
    });
    expect(missingPublisher).toBeNull();
    expect(unsupportedTransaction).toBeNull();
  });

  it('keeps one development result while active unit types supply facts and filters', () => {
    const items = [development()];

    expect(
      filterPublicDevelopmentSearchItems(items, {
        minPrice: 1200000,
        maxPrice: 1400000,
        minBedrooms: 2,
        availability: 'available',
      }),
    ).toHaveLength(1);
    expect(items[0].unitTypeCount).toBe(2);
    expect(items[0].availableUnitTypeCount).toBe(1);
    expect(items[0].priceFrom).toBe(1299000);
  });

  it('does not match a price or bedroom refinement against missing facts', () => {
    const item = development({ priceFrom: null, bedroomRange: { min: null, max: null }, unitTypes: [] });

    expect(filterPublicDevelopmentSearchItems([item], { minPrice: 1 })).toEqual([]);
    expect(filterPublicDevelopmentSearchItems([item], { minBedrooms: 2 })).toEqual([]);
  });

  it('sorts and paginates on the server-owned result projection', () => {
    const items = [
      development({ id: 1, priceFrom: 2000000, createdAt: '2026-08-01T00:00:00.000Z' }),
      development({ id: 2, priceFrom: 1000000, createdAt: '2026-08-02T00:00:00.000Z' }),
      development({ id: 3, priceFrom: 1500000, createdAt: '2026-08-03T00:00:00.000Z' }),
    ];

    const sorted = sortPublicDevelopmentSearchItems(items, 'price_asc');
    const page = paginatePublicDevelopmentSearchItems(sorted, 1, 1);

    expect(sorted.map(item => item.id)).toEqual([2, 3, 1]);
    expect(page).toMatchObject({ total: 3, page: 1, pageSize: 1, hasMore: true });
    expect(page.items.map(item => item.id)).toEqual([3]);
  });

  it('treats sold-out as a derived availability fact, not publication eligibility', () => {
    const item = development({ availabilityState: 'sold_out', availableUnits: 0 });

    expect(filterPublicDevelopmentSearchItems([item], { availability: 'sold_out' })).toHaveLength(1);
    expect(filterPublicDevelopmentSearchItems([item], { availability: 'available' })).toEqual([]);
  });
});

describe('countUnpricedHiddenByPriceFilter', () => {
  const unpriced = item({ priceFrom: null, priceTo: null });
  const cheap = item({});
  const expensive = item({ priceFrom: 9_000_000 });

  function item(overrides: Partial<PublicDevelopmentSearchItem>): PublicDevelopmentSearchItem {
    return {
      ...projectPublicDevelopmentFacts(
        projectionDevelopment(),
        [projectionUnit()],
      ),
      id: Math.floor(Math.random() * 100000),
      ...overrides,
    } as PublicDevelopmentSearchItem;
  }

  it('is zero when no price filter is active', () => {
    expect(countUnpricedHiddenByPriceFilter([unpriced, cheap], {})).toBe(0);
  });

  it('counts only unpriced items that satisfy every other active filter', () => {
    const filters = { minPrice: 500_000 };
    const count = countUnpricedHiddenByPriceFilter([unpriced, cheap, expensive], filters);
    // expensive fails minPrice independently of being priced.
    expect(count).toBe(1);
  });

  it('returns zero when every item is priced', () => {
    expect(
      countUnpricedHiddenByPriceFilter([cheap, expensive], { maxPrice: 5_000_000 }),
    ).toBe(0);
  });
});
