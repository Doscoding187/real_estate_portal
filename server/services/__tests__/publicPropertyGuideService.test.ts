import { beforeEach, describe, expect, it, vi } from 'vitest';

const PARENT_ID = 'pl-place-01-000000000000000000000001';
const NEWCLARE_ID = 'pl-place-01-000000000000000000000002';
const WESTBURY_ID = 'pl-place-01-000000000000000000000003';

const { getDb, loadProjection, searchInventory } = vi.hoisted(() => ({
  getDb: vi.fn(),
  loadProjection: vi.fn(),
  searchInventory: vi.fn(),
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

function projection(placeIds: string[]) {
  const executions = new Map(
    placeIds.map(placeId => [
      placeId,
      {
        placeId,
        scope: placeId === PARENT_ID ? 'metro_city' : 'locality',
        provincePlaceId: 'pl-place-01-000000000000000000000004',
        cityPlaceId: placeId === PARENT_ID ? PARENT_ID : PARENT_ID,
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
          placeId === PARENT_ID
            ? 'Johannesburg'
            : placeId === NEWCLARE_ID
              ? 'Newclare'
              : 'Westbury',
        placeType: placeId === PARENT_ID ? 'city' : 'suburb',
        scope: placeId === PARENT_ID ? 'metro_city' : 'locality',
        province: 'Gauteng',
        city: 'Johannesburg',
        locality: placeId === PARENT_ID ? '' : placeId === NEWCLARE_ID ? 'Newclare' : 'Westbury',
      },
    ]),
  );
  return { executions, labels };
}

describe('publicPropertyGuideAreas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const query = {
      from: vi.fn(() => query),
      innerJoin: vi.fn(() => query),
      where: vi.fn().mockResolvedValue([{ placeId: NEWCLARE_ID }, { placeId: WESTBURY_ID }]),
    };
    getDb.mockResolvedValue({ select: vi.fn(() => query) });
    loadProjection.mockImplementation(async (_database, options) => projection(options.placeIds));
    searchInventory.mockImplementation(async input => ({
      cards: [],
      total:
        input.listingType === 'sale'
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
});
