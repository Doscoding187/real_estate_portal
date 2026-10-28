import { beforeEach, describe, expect, it, vi } from 'vitest';

const PARENT_ID = 'pl-place-01-000000000000000000000001';
const NEWCLARE_ID = 'pl-place-01-000000000000000000000002';
const WESTBURY_ID = 'pl-place-01-000000000000000000000003';
const JOHANNESBURG_ID = 'pl-place-01-21f154cd5d0954c29ec7525f';
const SANDTON_ID = 'pl-place-01-dee61758ef3bda7cd1a258ad';

const { getDb, loadProjection, searchInventory, select } = vi.hoisted(() => ({
  getDb: vi.fn(),
  loadProjection: vi.fn(),
  searchInventory: vi.fn(),
  select: vi.fn(),
}));

vi.mock('../../db', () => ({ getDb }));
vi.mock('../canonicalPlaceSearchService', () => ({
  loadCanonicalPlaceSearchProjection: loadProjection,
}));
vi.mock('../publicSearchService', () => ({
  publicSearchService: { searchInventory },
}));

import { publicSearchService } from '../publicSearchService';
import { publicPropertyGuideAreas } from '../publicPropertyGuideService';

let relationshipRows: { placeId: string }[][] = [];

function projection(placeIds: string[]) {
  const executions = new Map(
    placeIds.map(placeId => [
      placeId,
      {
        placeId,
        scope: placeId === PARENT_ID || placeId === JOHANNESBURG_ID ? 'metro_city' : 'locality',
        provincePlaceId: 'pl-place-01-000000000000000000000004',
        cityPlaceId: placeId === PARENT_ID || placeId === JOHANNESBURG_ID ? placeId : PARENT_ID,
        localityPlaceId: placeId === PARENT_ID ? null : placeId,
        contextAncestorPlaceIds: [],
      },
    ]),
  );
  const labels = new Map(
    placeIds.map(placeId => [
      placeId,
      {
        canonicalPlaceId: placeId,
        label:
          placeId === PARENT_ID || placeId === JOHANNESBURG_ID
            ? 'Johannesburg'
            : placeId === NEWCLARE_ID
              ? 'Newclare'
              : placeId === SANDTON_ID
                ? 'Sandton'
                : 'Westbury',
        placeType: placeId === PARENT_ID || placeId === JOHANNESBURG_ID ? 'city' : 'suburb',
        scope: placeId === PARENT_ID || placeId === JOHANNESBURG_ID ? 'metro_city' : 'locality',
        province: 'Gauteng',
        city: 'Johannesburg',
        locality:
          placeId === PARENT_ID || placeId === JOHANNESBURG_ID
            ? ''
            : placeId === NEWCLARE_ID
              ? 'Newclare'
              : placeId === SANDTON_ID
                ? 'Sandton'
                : 'Westbury',
      },
    ]),
  );
  return { executions, labels };
}

describe('publicPropertyGuideAreas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    relationshipRows = [[{ placeId: NEWCLARE_ID }, { placeId: WESTBURY_ID }]];
    select.mockImplementation(() => {
      const query = {
        from: vi.fn(() => query),
        innerJoin: vi.fn(() => query),
        where: vi.fn().mockImplementation(async () => relationshipRows.shift() ?? []),
      };
      return query;
    });
    getDb.mockResolvedValue({ select });
    loadProjection.mockImplementation(async (_database, options) => projection(options.placeIds));
    searchInventory.mockImplementation(async input => ({
      cards: [],
      total:
        input.canonicalPlaceId === SANDTON_ID
          ? input.listingType === 'sale'
            ? 3
            : 2
          : input.listingType === 'sale'
            ? input.canonicalPlaceId === NEWCLARE_ID
              ? 4
              : 2
            : input.canonicalPlaceId === NEWCLARE_ID
              ? 1
              : 0,
      page: 0,
      pageSize: 1,
      hasMore: false,
      locationState: 'resolved',
      sourceCounts: { manual: 0, development: 0 },
    }));
  });

  it('keeps each guide count equal to exact-place public search for Sale and Rent', async () => {
    for (const mode of ['sale', 'rent'] as const) {
      relationshipRows = [[{ placeId: NEWCLARE_ID }, { placeId: WESTBURY_ID }]];
      const areas = await publicPropertyGuideAreas(PARENT_ID, mode);

      expect(areas.map(area => area.listingCount)).toEqual(mode === 'sale' ? [4, 2] : [1]);
      for (const area of areas) {
        const searchResult = await publicSearchService.searchInventory({
          canonicalPlaceId: area.placeId,
          listingType: mode,
          page: 0,
          pageSize: 1,
        });
        expect(area.listingCount).toBe(searchResult.total);
        expect(area.href).toBe(
          `${mode === 'sale' ? '/property-for-sale' : '/property-to-rent'}?canonicalPlaceId=${area.placeId}`,
        );
      }
    }

    expect(searchInventory).toHaveBeenCalledWith(
      expect.objectContaining({ canonicalPlaceId: NEWCLARE_ID, listingType: 'rent' }),
    );
  });

  it('uses Johannesburg administrative coverage for guide cards without changing exact search scope', async () => {
    relationshipRows = [
      [{ placeId: WESTBURY_ID }],
      [{ placeId: SANDTON_ID }, { placeId: WESTBURY_ID }],
    ];

    const areas = await publicPropertyGuideAreas(JOHANNESBURG_ID, 'sale');

    expect(areas.map(area => [area.placeId, area.listingCount])).toEqual([
      [SANDTON_ID, 3],
      [WESTBURY_ID, 2],
    ]);
    expect(areas.find(area => area.placeId === SANDTON_ID)?.href).toBe(
      `/property-for-sale?canonicalPlaceId=${SANDTON_ID}`,
    );
    expect(searchInventory).toHaveBeenCalledWith(
      expect.objectContaining({ canonicalPlaceId: SANDTON_ID, listingType: 'sale' }),
    );
  });
});
