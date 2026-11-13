import { beforeEach, describe, expect, it, vi } from 'vitest';

const EASTERN_CAPE = 'pl-place-01-9892b872a77f27e90c5cf091';
const FREE_STATE = 'pl-place-01-a5e69690b90509167e54a142';
const GAUTENG = 'pl-place-01-131e3e75ad70424e0f9c869a';
const ADELAIDE_CITY = 'pl-place-01-9023a157002617dd59163b41';
const ALEXANDRIA_CITY = 'pl-place-01-e9129c7e9d9fa8e4797ad7ec';
const BHETANI = 'pl-place-01-f81d8b77e727099400617269';
const CABA = 'pl-place-01-208dda0da302652dba3474f5';
const JOHANNESBURG = 'pl-place-01-21f154cd5d0954c29ec7525f';
const SANDTON = 'pl-place-01-dee61758ef3bda7cd1a258ad';
const UNPUBLISHED = 'pl-place-01-6642bbbfa74e66b321b21e7e';

const { countListings, countDevelopments, loadProjection, guideChildren, getDb } = vi.hoisted(
  () => ({
    countListings: vi.fn(),
    countDevelopments: vi.fn(),
    loadProjection: vi.fn(),
    guideChildren: vi.fn(),
    getDb: vi.fn(),
  }),
);

vi.mock('../../db', () => ({ getDb }));
vi.mock('../propertySearchService', () => ({
  propertySearchService: { countPublicListingsByCanonicalPlace: countListings },
}));
vi.mock('../developmentPlaceAssignmentService', () => ({
  countAcceptedDevelopmentsByPlace: countDevelopments,
}));
vi.mock('../canonicalPlaceSearchService', () => ({
  loadCanonicalPlaceSearchProjection: loadProjection,
}));
vi.mock('../publicPropertyGuideService', () => ({ metroCityGuideLocalityIds: guideChildren }));

import {
  indexablePublishedPlaceUrls,
  placeIndexability,
  publicPlaceInventoryCounts,
  resetPlaceIndexabilityCache,
} from '../placeIndexabilityService';

/** Searchable places and the province each one belongs to. */
const PROVINCE_OF: Record<string, string> = {
  [BHETANI]: EASTERN_CAPE,
  [CABA]: EASTERN_CAPE,
  [ADELAIDE_CITY]: EASTERN_CAPE,
  [ALEXANDRIA_CITY]: EASTERN_CAPE,
};

function setInventory(listings: Record<string, number>, developments: Record<string, number> = {}) {
  countListings.mockResolvedValue(new Map(Object.entries(listings)));
  countDevelopments.mockResolvedValue(new Map(Object.entries(developments)));
}

beforeEach(() => {
  vi.clearAllMocks();
  resetPlaceIndexabilityCache();
  getDb.mockResolvedValue({});
  setInventory({});
  loadProjection.mockImplementation(async (_database, options: { placeIds: string[] }) => {
    const ids = options.placeIds.filter(id => PROVINCE_OF[id]);
    return {
      executions: new Map(ids.map(id => [id, { placeId: id, provincePlaceId: PROVINCE_OF[id] }])),
      labels: new Map(ids.map(id => [id, { label: id }])),
    };
  });
  guideChildren.mockImplementation(async (_database, cityIds: string[]) => {
    return new Map(cityIds.map(id => [id, id === ALEXANDRIA_CITY ? [CABA] : []]));
  });
});

describe('placeIndexability', () => {
  it('treats hand-approved places as indexable with no listings', async () => {
    const result = await placeIndexability([GAUTENG, JOHANNESBURG, SANDTON]);
    expect([...result.values()]).toEqual([true, true, true]);
    expect(countListings).not.toHaveBeenCalled();
  });

  it('keeps a published place with no listings out of the index', async () => {
    const result = await placeIndexability([BHETANI, ADELAIDE_CITY, FREE_STATE]);
    expect(result.get(BHETANI)).toBe(false);
    expect(result.get(ADELAIDE_CITY)).toBe(false);
    expect(result.get(FREE_STATE)).toBe(false);
  });

  it('indexes a locality that has a public listing', async () => {
    setInventory({ [BHETANI]: 1 });
    const result = await placeIndexability([BHETANI, CABA]);
    expect(result.get(BHETANI)).toBe(true);
    expect(result.get(CABA)).toBe(false);
  });

  it('indexes a locality that has only an accepted development', async () => {
    setInventory({}, { [CABA]: 1 });
    expect((await placeIndexability([CABA])).get(CABA)).toBe(true);
  });

  it('indexes a city whose only listing sits in a guide child', async () => {
    setInventory({ [CABA]: 2 });
    const result = await placeIndexability([ALEXANDRIA_CITY, ADELAIDE_CITY]);
    expect(result.get(ALEXANDRIA_CITY)).toBe(true);
    expect(result.get(ADELAIDE_CITY)).toBe(false);
  });

  it('indexes a province when any member has a listing', async () => {
    setInventory({ [BHETANI]: 1 });
    const result = await placeIndexability([EASTERN_CAPE, FREE_STATE]);
    expect(result.get(EASTERN_CAPE)).toBe(true);
    expect(result.get(FREE_STATE)).toBe(false);
  });

  it('never indexes an unpublished place, even with listings', async () => {
    setInventory({ [UNPUBLISHED]: 5 });
    expect((await placeIndexability([UNPUBLISHED])).get(UNPUBLISHED)).toBe(false);
  });

  it('ignores inventory on places that public search cannot resolve', async () => {
    setInventory({ [FREE_STATE]: 3 });
    expect((await placeIndexability([FREE_STATE])).get(FREE_STATE)).toBe(false);
  });
});

describe('inventory aggregate cache', () => {
  it('runs the aggregate once inside the TTL and again after it', async () => {
    setInventory({ [BHETANI]: 1 });
    const start = Date.now();
    await publicPlaceInventoryCounts(start);
    await publicPlaceInventoryCounts(start + 60_000);
    expect(countListings).toHaveBeenCalledTimes(1);
    await publicPlaceInventoryCounts(start + 11 * 60_000);
    expect(countListings).toHaveBeenCalledTimes(2);
  });

  it('lists only indexable published places for the sitemap', async () => {
    setInventory({ [BHETANI]: 1 });
    const paths = (await indexablePublishedPlaceUrls()).map(entry => entry.path);
    expect(paths).toContain('/gauteng/city-of-johannesburg/sandton');
    expect(paths).toContain('/eastern-cape');
    expect(paths).toContain('/eastern-cape/alfred-nzo-district-municipality/bhetani');
    expect(paths).not.toContain('/eastern-cape/alfred-nzo-district-municipality/caba');
    expect(paths).not.toContain('/free-state');
  });
});
