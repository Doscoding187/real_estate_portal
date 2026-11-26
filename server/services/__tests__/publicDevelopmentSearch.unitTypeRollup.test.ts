import { beforeEach, describe, expect, it, vi } from 'vitest';

const SUBURB = 'pl-place-01-aaaaaaaaaaaaaaaaaaaaaaaa';
const CITY = 'pl-place-01-bbbbbbbbbbbbbbbbbbbbbbbb';
const OTHER_CITY = 'pl-place-01-cccccccccccccccccccccccc';

const developmentRow = {
  id: 7,
  name: 'Baltimore',
  slug: 'baltimore',
  description: null,
  images: [],
  developmentType: 'residential',
  transactionType: 'for_sale',
  status: 'now-selling',
  nature: 'new',
  completionDate: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  isFeatured: 0,
  rating: null,
  highlights: [],
  cataloguePublisherId: 1,
  publisherName: 'Publisher',
  publisherLogoUrl: null,
  publisherAuthorityKind: 'developer_first_party',
};

const unitRow = {
  id: '70',
  developmentId: 7,
  name: 'house',
  label: 'Three bed house',
  bedrooms: 3,
  bathrooms: 2,
  basePriceFrom: 1500000,
  basePriceTo: null,
  monthlyRentFrom: null,
  monthlyRentTo: null,
  totalUnits: 10,
  availableUnits: 4,
  reservedUnits: 0,
  displayOrder: 0,
  unitSize: 120,
  yardSize: null,
  parkingBays: 2,
  structuralType: 'freestanding-house',
  baseMedia: null,
};

const mocks = vi.hoisted(() => ({
  assignedPlaceId: 'pl-place-01-aaaaaaaaaaaaaaaaaaaaaaaa',
  queryResults: [] as unknown[][],
  matched: false,
}));

vi.mock('../../db-connection', () => ({
  getDb: async () => {
    const chain: any = {
      from: () => chain,
      leftJoin: () => chain,
      where: () => chain,
      orderBy: () => chain,
      // The real query filters by the matched development ids; an empty match returns no rows.
      then: (resolve: (rows: unknown[]) => unknown) =>
        resolve(mocks.matched ? (mocks.queryResults.shift() ?? []) : []),
    };
    return { select: () => chain };
  },
}));

vi.mock('../placeLocalityRollupService', () => ({
  developmentSearchPlaceIds: async (_db: unknown, placeId: string) =>
    placeId === CITY ? [CITY, SUBURB] : [placeId],
}));

vi.mock('../publicDevelopmentEligibility', () => ({
  publicDevelopmentEligibilityConditions: () => undefined,
}));

vi.mock('../developmentPlaceAssignmentService', () => ({
  listDevelopmentIdsForCanonicalPlace: async (placeId: string) => {
    mocks.matched = placeId === mocks.assignedPlaceId;
    return mocks.matched ? [7] : [];
  },
  listDevelopmentIdsForCanonicalPlaces: async (placeIds: string[]) => {
    mocks.matched = placeIds.includes(mocks.assignedPlaceId);
    return mocks.matched ? [7] : [];
  },
  listDevelopmentPlaceGeography: async () =>
    new Map([[7, { canonicalPlaceId: SUBURB, locationLabels: ['North Riding'] }]]),
}));

import { PublicDevelopmentSearchService } from '../publicDevelopmentSearchService';
import { developmentUnitTypeCards } from '../developmentUnitTypeCards';

async function unitTypeCardsFor(placeIds: string[]) {
  mocks.queryResults = [[developmentRow], [unitRow]];
  const result = await new PublicDevelopmentSearchService().search({
    canonicalPlaceIds: placeIds,
    transactionType: 'for_sale',
    includeUnitSize: true,
    skipDevelopmentRangeFilters: true,
  });
  return result.items.flatMap(item => developmentUnitTypeCards(item, { listingType: 'sale' }));
}

describe('unit-type cards follow the city rollup', () => {
  beforeEach(() => {
    mocks.queryResults = [];
    mocks.matched = false;
  });

  it('returns the unit types of a suburb development for a city-level search', async () => {
    const cards = await unitTypeCardsFor([CITY]);
    expect(cards.map(card => card.unitType.id)).toEqual(['70']);
    expect(cards[0].href).toBe('/development/baltimore/unit/70');
    expect(cards[0].unitType.priceFrom).toBe(1500000);
  });

  it('does not return them for an unrelated city', async () => {
    expect(await unitTypeCardsFor([OTHER_CITY])).toEqual([]);
  });
});
